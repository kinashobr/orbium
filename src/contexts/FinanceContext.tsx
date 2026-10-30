"use client";

import { createContext, useContext, useState, useEffect, useCallback, Dispatch, SetStateAction, ReactNode, useMemo } from "react";
import {
	Categoria, TransacaoCompleta,
	DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
	ContaCorrente,
	FinanceExportV2,
	Emprestimo,
	Veiculo,
	SeguroVeiculo,
	ObjetivoFinanceiro,
	AccountType,
	DateRange,
	ComparisonDateRanges,
	generateAccountId,
	generateTransactionId,
	BillTracker,
	generateBillId,
	StandardizationRule,
	generateRuleId,
	ImportedStatement,
	ImportedTransaction,
	generateStatementId,
	OperationType,
	getFlowTypeFromOperation,
	 OPERATION_TYPE_LABELS,
	BillSourceType,
	TransactionLinks,
	PotentialFixedBill,
	ExternalPaidBill,
	BillDisplayItem,
	Imovel,
	Terreno,
	generateImovelId,
	generateTerrenoId,
	MetaPersonalizada,
	MetaProgresso,
	AccountTerm,
	CreditCardConfig,
	generateCreditCardConfigId,
  getDomainFromOperation,
  generateTransferGroupId,
  formatCurrency,
  CltContract,
  CltCompetencia,
  CltLegislacaoConfig,
  MonthlyExpenseSnapshot,
  RecebivelParcelado,
  ParcelaRecebivel,
  VinculoOcupacional,
  EventoFerias,
  EventoRescisao,
  HistoricoContribuicaoINSS,
} from "@/types/finance";
import { HoleriteCompetenciaData } from "@/types/clt";
import { PluggyConfig, PluggySyncPayload, DetectedCardInstallment } from "@/types/pluggy";
import { 
  convertPluggyToTransacaoCompleta, 
  isCreditCardTransactionDuplicate, 
  isPluggyTransactionAlreadyHandled,
  buildPluggyImportedStatement,
  isCardInvoicePayment,
  parseInstallmentPattern,
  findMatchingCommitment,
  isFutureTransaction,
  groupDetectedInstallments,
  isInvoicePaymentAlreadyInChecking,
  predictTransactionCategory
} from "@/lib/pluggyAdapter";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format, isWithinInterval } from "date-fns";
import { parseDateLocal, formatDateLocal, cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================
// FUNÇÕES AUXILIARES PARA DATAS
// ============================================

const calculateDefaultRange = (): DateRange => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
};

const calculateComparisonRange = (range1: DateRange): DateRange => {
    if (!range1.from || !range1.to) {
        return { from: undefined, to: undefined };
    }
    const diffInDays = differenceInDays(range1.to, range1.from) + 1;
    const prevTo = subDays(range1.from, 1);
    const prevFrom = subDays(prevTo, diffInDays - 1);
    return { from: prevFrom, to: prevTo };
};

const DEFAULT_RANGES: ComparisonDateRanges = {
    range1: calculateDefaultRange(),
    range2: calculateComparisonRange(calculateDefaultRange()),
};

const defaultAlertStartDate = formatDateLocal(subDays(new Date(), 30))!;

export const getDueDate = (startDateStr: string, installmentNumber: number): Date => {
  const startDate = parseDateLocal(startDateStr);
  const dueDate = new Date(startDate);
  
  // Adjustment: If installmentNumber = 1, add 0 months.
  dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);
  
  return dueDate;
};

// Helper function to parse stored date range strings back to Date objects
const parseDateRanges = (storedRanges: any): ComparisonDateRanges => {
    const parseDate = (dateStr: string | undefined) => dateStr ? parseDateLocal(dateStr) : undefined;
    return {
        range1: {
            from: parseDate(storedRanges.range1.from),
            to: parseDate(storedRanges.range1.to),
        },
        range2: {
            from: parseDate(storedRanges.range2.from),
            to: parseDate(storedRanges.range2.to),
        },
    };
};

// ============================================
// FUNÇÕES DE PARSING
// ============================================

const normalizeAmount = (amountStr: string): number => {
    let cleaned = amountStr.trim();
    const isNegative = cleaned.startsWith('-');
    
    if (isNegative) {
        cleaned = cleaned.substring(1);
    }
    
    cleaned = cleaned.replace(/[^\d,]/g, '');

    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            const lastPart = parts.pop();
            cleaned = parts.join('') + '.' + lastPart;
        }
    }
    
    const parsed = parseFloat(cleaned);
    
    return isNegative ? -parsed : parsed;
};

const normalizeOfxDate = (dateStr: string): string => {
    if (dateStr.length >= 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
};

const parseCSV = (content: string, accountId: string): ImportedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const separator = lines[0].includes('\t') ? '\t' : ',';
    
    const header = lines[0].toLowerCase();
    const cols = header.split(separator);
    
    const normalizeHeader = (h: string) => h.normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();
    
    const dataIndex = cols.findIndex(h => normalizeHeader(h).includes('data'));
    const valorIndex = cols.findIndex(h => normalizeHeader(h).includes('valor'));
    const descIndex = cols.findIndex(h => normalizeHeader(h).includes('descri'));

    if (dataIndex === -1 || valorIndex === -1 || descIndex === -1) {
        throw new Error(`CSV inválido. Colunas 'Data', 'Valor' e 'Descrição' são obrigatógrias.`);
    }

    const transactions: ImportedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
        const lineCols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (lineCols.length > Math.max(dataIndex, valorIndex, descIndex)) {
            const dateStr = lineCols[dataIndex];
            const amountStr = lineCols[valorIndex];
            const originalDescription = lineCols[descIndex];
            
            if (!dateStr || !amountStr || !originalDescription) continue;

            const amount = normalizeAmount(amountStr);
            
            let normalizedDate = dateStr;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            } else if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
            } else {
                normalizedDate = normalizeOfxDate(dateStr);
            }
            
            if (normalizedDate.length < 10 || isNaN(parseDateLocal(normalizedDate).getTime())) {
                continue;
            }

            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType: amount < 0 ? 'despesa' : 'receita',
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                tempInvestmentId: null,
                tempLoanId: null,
                tempParcelaId: null,
                tempVehicleOperation: null,
                sourceType: 'csv',
                isContabilized: false,
                contabilizedTransactionId: undefined,
                isPotentialDuplicate: false,
                duplicateOfTxId: undefined,
            });
        }
    }
    return transactions;
};

const parseOFX = (content: string, accountId: string): ImportedTransaction[] => {
    const transactions: ImportedTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const stmtTrnBlock = match[1];
        
        const dtPostedMatch = stmtTrnBlock.match(/<DTPOSTED>(\d+)/);
        const trnAmtMatch = stmtTrnBlock.match(/<TRNAMT>([\d.-]+)/);
        const memoMatch = stmtTrnBlock.match(/<MEMO>([\s\S]*?)</);

        if (dtPostedMatch && trnAmtMatch && memoMatch) {
            const dateStr = dtPostedMatch[1];
            const amount = parseFloat(trnAmtMatch[1]);
            const originalDescription = memoMatch[1].trim();
            
            if (isNaN(amount)) continue;

            const normalizedDate = normalizeOfxDate(dateStr);
            
            const operationType: OperationType = amount < 0 ? 'despesa' : 'receita';

            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType,
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                tempInvestmentId: null,
                tempLoanId: null,
                tempParcelaId: null,
                tempVehicleOperation: null,
                sourceType: 'ofx',
                isContabilized: false,
                contabilizedTransactionId: undefined,
                isPotentialDuplicate: false,
                duplicateOfTxId: undefined,
            });
        }
    }
    return transactions;
};

// ============================================
// INTERFACE DO CONTEXTO
// ============================================

export interface AmortizationItem {
    parcela: number;
    juros: number;
    amortizacao: number;
    saldoDevedor: number;
}

interface FinanceContextType {
  // Empréstimos
  emprestimos: Emprestimo[];
  addEmprestimo: (emprestimo: Omit<Emprestimo, "id">) => void;
  updateEmprestimo: (id: number, emprestimo: Partial<Emprestimo>) => void;
  deleteEmprestimo: (id: number) => void;
  getPendingLoans: () => Emprestimo[];
  markLoanParcelPaid: (loanId: number, valorPago: number, dataPagamento: string, parcelaNumber?: number) => void;
  unmarkLoanParcelPaid: (loanId: number) => void;
  calculateLoanSchedule: (loanId: number) => AmortizationItem[];
  calculateLoanAmortizationAndInterest: (loanId: number, parcelaNumber: number) => AmortizationItem | null;
  calculateLoanPrincipalDueInNextMonths: (targetDate: Date, months: number) => number; 
  
  // Veículos
  veiculos: Veiculo[];
  addVeiculo: (veiculo: Omit<Veiculo, "id">) => void;
  updateVeiculo: (id: number, veiculo: Partial<Veiculo>) => void;
  deleteVeiculo: (id: number) => void;
  getPendingVehicles: () => Veiculo[];
  
  // Imóveis
  imoveis: Imovel[];
  addImovel: (imovel: Omit<Imovel, "id">) => void;
  updateImovel: (id: number, imovel: Partial<Imovel>) => void;
  deleteImovel: (id: number) => void;
  
  // Terrenos
  terrenos: Terreno[];
  addTerreno: (terreno: Omit<Terreno, "id">) => void;
  updateTerreno: (id: number, terreno: Partial<Terreno>) => void;
  deleteTerreno: (id: number) => void;
  
  // Seguros de Veículo
  segurosVeiculo: SeguroVeiculo[];
  addSeguroVeiculo: (seguro: Omit<SeguroVeiculo, "id">) => void;
  updateSeguroVeiculo: (id: number, seguro: Partial<SeguroVeiculo>) => void;
  deleteSeguroVeiculo: (id: number) => void;
  markSeguroParcelPaid: (seguroId: number, parcelaNumero: number, transactionId: string) => void;
  unmarkSeguroParcelPaid: (seguroId: number, parcelaNumero: number) => void;
  
  // Objetivos Financeiros
  objetivos: ObjetivoFinanceiro[];
  addObjetivo: (obj: Omit<ObjetivoFinanceiro, "id">) => void;
  updateObjetivo: (id: number, o: Partial<ObjetivoFinanceiro>) => void;
  deleteObjetivo: (id: number) => void;

  // Bill Tracker
  billsTracker: BillTracker[];
  setBillsTracker: Dispatch<SetStateAction<BillTracker[]>>;
  updateBill: (id: string, updates: Partial<BillTracker>) => void;
  deleteBill: (id: string) => void;
  addPurchaseInstallments: (data: {
    description: string;
    totalAmount: number;
    installments: number;
    firstDueDate: string;
    suggestedAccountId?: string;
    suggestedCategoryId?: string;
    isRecurring?: boolean;
  }) => void;
  getBillsForMonth: (date: Date) => BillTracker[];
  getPotentialFixedBillsForMonth: (date: Date, localBills: BillTracker[]) => PotentialFixedBill[];
  getFutureFixedBills: (referenceDate: Date, localBills: BillTracker[]) => PotentialFixedBill[];
  getOtherPaidExpensesForMonth: (date: Date) => ExternalPaidBill[];
  autoPopulateFixedBills: (date: Date) => void;
  
  // Snapshots de Despesas (Orçado)
  expenseSnapshots: Record<string, MonthlyExpenseSnapshot>;
  saveExpenseSnapshot: (snapshot: MonthlyExpenseSnapshot) => void;
  deleteExpenseSnapshot: (monthKey: string) => void;
  getExpenseSnapshot: (monthKey: string) => MonthlyExpenseSnapshot | undefined;
  
  // Credit Card Configs
  creditCardConfigs: CreditCardConfig[];
  addCreditCardConfig: (config: Omit<CreditCardConfig, 'id'>) => void;
  updateCreditCardConfig: (id: string, updates: Partial<CreditCardConfig>) => void;
  deleteCreditCardConfig: (id: string) => void;
  getInvoiceForCard: (cardId: string, monthDate: Date) => number;
  generateInvoiceBills: (monthDate: Date) => BillTracker[];
  getCardCurrentCycleUsage: (cardId: string, referenceDate?: Date) => number;
  getNextCycleBalance: (cardId: string, referenceDate?: Date) => number;
  getCardCycleTransactions: (cardId: string, monthDate: Date) => TransacaoCompleta[];
  
  
  
  // Contas Movimento
  contasMovimento: ContaCorrente[];
  setContasMovimento: Dispatch<SetStateAction<ContaCorrente[]>>;
  getContasCorrentesTipo: () => ContaCorrente[];
  
  // Categorias V2
  categoriasV2: Categoria[];
  setCategoriasV2: Dispatch<SetStateAction<Categoria[]>>;
  
  // Transações V2
  transacoesV2: TransacaoCompleta[];
  setTransacoesV2: Dispatch<SetStateAction<TransacaoCompleta[]>>;
  addTransacaoV2: (transaction: TransacaoCompleta) => void;
  
  // Standardization Rules
  standardizationRules: StandardizationRule[];
  addStandardizationRule: (rule: Omit<StandardizationRule, "id">) => void;
  updateStandardizationRule: (id: string, updates: Partial<StandardizationRule>) => void;
  deleteStandardizationRule: (id: string) => void;
  
  // Imported Statements
  importedStatements: ImportedStatement[];
  processStatementFile: (file: File, accountId: string) => Promise<{ success: boolean; message: string }>;
  deleteImportedStatement: (statementId: string) => void;
  getTransactionsForReview: (accountId: string, range: DateRange) => ImportedTransaction[];
  updateImportedStatement: (statementId: string, updates: Partial<ImportedStatement>) => void;
  deleteImportedTransaction: (transactionId: string) => void;
  updateImportedTransactionDraft: (transactionId: string, updates: Partial<ImportedTransaction>) => void;
  contabilizeImportedTransaction: (statementId: string, transactionId: string, data: Partial<ImportedTransaction>) => void;
  uncontabilizeImportedTransaction: (transactionId: string) => void;
  uncontabilizeTransactionsBatch: (transactionIds: string[]) => void;
  
  // Execução de Transação Unificada
  executeTransaction: (
    transaction: TransacaoCompleta,
    transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string },
    newAsset?: { type: 'veiculo' | 'imovel' | 'terreno'; data: any }
  ) => void;

  // Data Filtering
  dateRanges: ComparisonDateRanges;
  setDateRanges: Dispatch<SetStateAction<ComparisonDateRanges>>;
  
  // Alert Filtering
  alertStartDate: string;
  setAlertStartDate: Dispatch<SetStateAction<string>>;
  
  // Revenue Forecast
  revenueForecasts: Record<string, number>;
  setMonthlyRevenueForecast: (monthKey: string, value: number) => void;
  getRevenueForPreviousMonth: (date: Date) => number;
  
  // Cálculos principais
  getTotalReceitas: (mes?: string) => number;
  getTotalDespesas: (mes?: string) => number;
  getTotalDividas: () => number;
  getCustoVeiculos: () => number;
  getSaldoAtual: () => number;
  
  // Cálculos avançados para relatórios
  getValorFipeTotal: (targetDate?: Date) => number;
  getValorImoveisTerrenos: (targetDate?: Date) => number;
  getSaldoDevedor: (targetDate?: Date) => number;
  getLoanPrincipalRemaining: (targetDate?: Date) => number;
  getCreditCardDebt: (targetDate?: Date) => number;
  getJurosTotais: () => number;
  getDespesasFixas: () => number;
  getPatrimonioLiquido: (targetDate?: Date) => number;
  getAtivosTotal: (targetDate?: Date) => number;
  getPassivosTotal: (targetDate?: Date) => number;
  
  // Seguros Accrual
  getSegurosAApropriar: (targetDate?: Date) => number;
  getSegurosAPagar: (targetDate?: Date) => number;
  
  calculateBalanceUpToDate: (accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]) => number;
  calculateTotalInvestmentBalanceAtDate: (date: Date | undefined) => number;
  calculatePaidInstallmentsUpToDate: (loanId: number, targetDate: Date) => number; 

  // Metas Personalizadas
  metasPersonalizadas: MetaPersonalizada[];
  addMetaPersonalizada: (meta: MetaPersonalizada) => void;
  updateMetaPersonalizada: (id: string, updates: Partial<MetaPersonalizada>) => void;
  deleteMetaPersonalizada: (id: string) => void;
  calcularProgressoMeta: (meta: MetaPersonalizada) => MetaProgresso;

  // CLT
  cltContracts: CltContract[];
  addCltContract: (contract: CltContract) => void;
  updateCltContract: (id: string, contract: Partial<CltContract>) => void;
  deleteCltContract: (id: string) => void;
  cltCompetencias: CltCompetencia[];
  addCltCompetencia: (comp: CltCompetencia) => void;
  updateCltCompetencia: (id: string, updates: Partial<CltCompetencia>) => void;
  deleteCltCompetenciasByContract: (contractId: string) => void;
  cltLegislacaoConfigs: CltLegislacaoConfig[];
  addCltLegislacaoConfig: (config: CltLegislacaoConfig) => void;
  updateCltLegislacaoConfig: (id: string, updates: Partial<CltLegislacaoConfig>) => void;
  deleteCltLegislacaoConfig: (id: string) => void;
  cltHolerites: Record<string, HoleriteCompetenciaData>;
  saveCltHolerite: (holerite: HoleriteCompetenciaData) => void;
  deleteCltHolerite: (id: string) => void;

  // Vínculos Ocupacionais (Novas Entidades)
  vinculosOcupacionais: VinculoOcupacional[];
  addVinculoOcupacional: (vinculo: VinculoOcupacional) => void;
  updateVinculoOcupacional: (id: string, updates: Partial<VinculoOcupacional>) => void;
  deleteVinculoOcupacional: (id: string) => void;

  // Recebíveis Parcelados de Clientes
  recebiveisParcelados: RecebivelParcelado[];
  addRecebivelParcelado: (recebivel: RecebivelParcelado) => void;
  updateRecebivelParcelado: (id: string, updates: Partial<RecebivelParcelado>) => void;
  deleteRecebivelParcelado: (id: string) => void;
  
  // Parcelas dos Recebíveis
  parcelasRecebiveis: ParcelaRecebivel[];
  setParcelasRecebiveis: Dispatch<SetStateAction<ParcelaRecebivel[]>>;
  updateParcelaRecebivel: (id: string, updates: Partial<ParcelaRecebivel>) => void;
  confirmarPagamentoParcela: (id: string, dataPagamento: string, valorPago: number, contaId: string) => void;
  estornarPagamentoParcela: (id: string) => void;

  // Férias, Rescisões e Histórico Previdenciário
  eventosFerias: EventoFerias[];
  addEventoFerias: (ferias: EventoFerias) => void;
  updateEventoFerias: (id: string, updates: Partial<EventoFerias>) => void;
  deleteEventoFerias: (id: string) => void;

  eventosRescisao: EventoRescisao[];
  addEventoRescisao: (rescisao: EventoRescisao) => void;
  updateEventoRescisao: (id: string, updates: Partial<EventoRescisao>) => void;
  deleteEventoRescisao: (id: string) => void;

  historicosContribuicaoINSS: HistoricoContribuicaoINSS[];
  addHistoricoContribuicao: (historico: HistoricoContribuicaoINSS) => void;
  updateHistoricoContribuicao: (id: string, updates: Partial<HistoricoContribuicaoINSS>) => void;
  deleteHistoricoContribuicao: (id: string) => void;

  // Lançamentos Ignorados de Recebimento
  ignoredTxIds: string[];
  setIgnoredTxIds: Dispatch<SetStateAction<string[]>>;

  // Controle de Versão
  lastModified: string;
  
  // Pluggy Open Finance (Módulo de Integração)
  pluggyConfig: PluggyConfig;
  updatePluggyConfig: (updates: Partial<PluggyConfig>) => void;
  pluggyLastPayload: PluggySyncPayload | null;
  setPluggyLastPayload: Dispatch<SetStateAction<PluggySyncPayload | null>>;
  syncPluggyData: (overrideItemId?: string) => Promise<{
    success: boolean;
    message: string;
    cardCount?: number;
    statementCount?: number;
    logs?: string[];
    payload?: PluggySyncPayload;
    detectedInstallments?: DetectedCardInstallment[];
  }>;
  isSyncingPluggy: boolean;
  undoPluggyCardTransactions: (targetAccountId?: string) => {
    count: number;
    restoredDescriptions: Record<string, string>;
    restoredCategories: Record<string, string>;
  };
  generateCheckingStatementsFromPluggy: (targetPluggyAccountId?: string) => {
    success: boolean;
    statementCount: number;
    message: string;
    logs: string[];
  };
  commitPluggyTransactions: (
    targetAccountId?: string,
    categoryOverrides?: Record<string, string>,
    descriptionOverrides?: Record<string, string>
  ) => {
    success: boolean;
    count: number;
    message: string;
    logs: string[];
  };

  // Exportação e Importação
  exportData: () => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  SEGUROS_VEICULO: "neon_finance_seguros_veiculo",
  OBJETIVOS: "neon_finance_objetivos",
  BILLS_TRACKER: "neon_finance_bills_tracker",
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
  STANDARDIZATION_RULES: "fin_standardization_rules_v1",
  IMPORTED_STATEMENTS: "fin_imported_statements_v1",
  DATE_RANGES: "fin_date_ranges_v1",
  ALERT_START_DATE: "fin_alert_start_date_v1",
  REVENUE_FORECASTS: "fin_revenue_forecasts_v1",
  IMOVEIS: "neon_finance_imoveis",
  TERRENOS: "neon_finance_terrenos",
  METAS_PERSONALIZADAS: "fin_metas_personalizadas_v1",
  CREDIT_CARD_CONFIGS: "fin_credit_card_configs_v1",
  CLT_CONTRACTS: "fin_clt_contracts_v1",
  CLT_COMPETENCIAS: "fin_clt_competencias_v1",
  CLT_HOLERITES: "fin_clt_holerites_v1",
  EXPENSE_SNAPSHOTS: "fin_expense_snapshots_v1",
  PLUGGY_CONFIG: "orbium_pluggy_config_v1",
  PLUGGY_LAST_PAYLOAD: "orbium_pluggy_last_payload_v1",
  LAST_MODIFIED: "fin_last_modified_v1",
};

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];
const initialBillsTracker: BillTracker[] = [];
const initialStandardizationRules: StandardizationRule[] = [];
const initialImportedStatements: ImportedStatement[] = [];
const initialImoveis: Imovel[] = [];
const initialTerrenos: Terreno[] = [];
const initialMetasPersonalizadas: MetaPersonalizada[] = [];
const initialCreditCardConfigs: CreditCardConfig[] = [];
const initialPluggyConfig: PluggyConfig = {
  itemId: "",
  linkedAccounts: {},
  linkedCards: {},
  linkedInvestments: {},
  lastSyncAt: undefined,
};
const initialLastModified = new Date(0).toISOString();

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed === null || parsed === undefined) {
        return defaultValue;
      }
      if (key === STORAGE_KEYS.DATE_RANGES) {
          return parseDateRanges(parsed) as unknown as T;
      }
      return parsed;
    }
  } catch (error) {
    console.error(`Erro ao carregar ${key}:`, error);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    let dataToStore = data;
    if (key === STORAGE_KEYS.DATE_RANGES) {
        const ranges = data as unknown as ComparisonDateRanges;
        dataToStore = {
            range1: {
                from: formatDateLocal(ranges.range1.from),
                to: formatDateLocal(ranges.range1.to),
            },
            range2: {
                from: formatDateLocal(ranges.range2.from),
                to: formatDateLocal(ranges.range2.to),
            },
        } as unknown as T;
    }
    localStorage.setItem(key, JSON.stringify(dataToStore));
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error);
  }
}

function normalizeAccountTerm(account: ContaCorrente): ContaCorrente {
  if (account.accountTerm) return account;
  const isShortTermForced = account.accountType === "corrente" || account.accountType === "cartao_credito";
  const inferredTerm: AccountTerm = isShortTermForced ? "curto_prazo" : "longo_prazo";
  return { ...account, accountTerm: inferredTerm };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>(() => loadFromStorage(STORAGE_KEYS.EMPRESTIMOS, initialEmprestimos));
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => loadFromStorage(STORAGE_KEYS.VEICULOS, initialVeiculos));
  const [imoveis, setImoveis] = useState<Imovel[]>(() => loadFromStorage(STORAGE_KEYS.IMOVEIS, initialImoveis));
  const [terrenos, setTerrenos] = useState<Terreno[]>(() => loadFromStorage(STORAGE_KEYS.TERRENOS, initialTerrenos));
  const [segurosVeiculo, setSegurosVeiculo] = useState<SeguroVeiculo[]>(() => loadFromStorage(STORAGE_KEYS.SEGUROS_VEICULO, initialSegurosVeiculo));
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>(() => loadFromStorage(STORAGE_KEYS.OBJETIVOS, initialObjetivos));
  const [billsTracker, setBillsTracker] = useState<BillTracker[]>(() => loadFromStorage(STORAGE_KEYS.BILLS_TRACKER, initialBillsTracker));
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, DEFAULT_ACCOUNTS).map(normalizeAccountTerm);
    
    // Garantir existência de contas ocultas para o sistema de partidas dobradas
    const hiddenAccounts: ContaCorrente[] = [
      {
        id: 'acc_system_bens',
        name: 'Sistema de Bens',
        accountType: 'objetivo',
        accountTerm: 'longo_prazo',
        currency: 'BRL',
        initialBalance: 0,
        createdAt: new Date(0).toISOString(),
        meta: { system: true },
        hidden: true
      },
      {
        id: 'acc_system_financiamento',
        name: 'Sistema de Financiamentos',
        accountType: 'objetivo',
        accountTerm: 'longo_prazo',
        currency: 'BRL',
        initialBalance: 0,
        createdAt: new Date(0).toISOString(),
        meta: { system: true },
        hidden: true
      }
    ];

    let updated = [...loaded];
    hiddenAccounts.forEach(ha => {
      if (!updated.find(a => a.id === ha.id)) {
        updated.push(ha);
      }
    });
    
    return updated;
  });
  const [categoriasV2, setCategoriasV2] = useState<Categoria[]>(() => loadFromStorage(STORAGE_KEYS.CATEGORIAS_V2, DEFAULT_CATEGORIES));
  const [transacoesV2, setTransacoesV2] = useState<TransacaoCompleta[]>(() => loadFromStorage(STORAGE_KEYS.TRANSACOES_V2, []));
  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(() => loadFromStorage(STORAGE_KEYS.STANDARDIZATION_RULES, initialStandardizationRules));
  const [importedStatements, setImportedStatements] = useState<ImportedStatement[]>(() => loadFromStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, initialImportedStatements));
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(() => loadFromStorage(STORAGE_KEYS.DATE_RANGES, DEFAULT_RANGES));
  const [alertStartDate, setAlertStartDate] = useState<string>(() => loadFromStorage(STORAGE_KEYS.ALERT_START_DATE, defaultAlertStartDate));
  const [revenueForecasts, setRevenueForecasts] = useState<Record<string, number>>(() => loadFromStorage(STORAGE_KEYS.REVENUE_FORECASTS, {}));
  const [metasPersonalizadas, setMetasPersonalizadas] = useState<MetaPersonalizada[]>(() => loadFromStorage(STORAGE_KEYS.METAS_PERSONALIZADAS, initialMetasPersonalizadas));
  const [creditCardConfigs, setCreditCardConfigs] = useState<CreditCardConfig[]>(() => loadFromStorage(STORAGE_KEYS.CREDIT_CARD_CONFIGS, initialCreditCardConfigs));
  const [cltContracts, setCltContracts] = useState<CltContract[]>(() => loadFromStorage(STORAGE_KEYS.CLT_CONTRACTS, []));
  const [cltCompetencias, setCltCompetencias] = useState<CltCompetencia[]>(() => loadFromStorage(STORAGE_KEYS.CLT_COMPETENCIAS, []));
  const [cltLegislacaoConfigs, setCltLegislacaoConfigs] = useState<CltLegislacaoConfig[]>(() => loadFromStorage('fin_clt_legislacao_v1', []));
  const [cltHolerites, setCltHolerites] = useState<Record<string, HoleriteCompetenciaData>>(() => loadFromStorage(STORAGE_KEYS.CLT_HOLERITES, {}));

  const saveCltHolerite = useCallback((holerite: HoleriteCompetenciaData) => {
    setCltHolerites(prev => ({
      ...prev,
      [holerite.id]: holerite
    }));
  }, []);

  const deleteCltHolerite = useCallback((id: string) => {
    setCltHolerites(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Expense Snapshots State (Orçado Congelado por Mês)
  const [expenseSnapshots, setExpenseSnapshots] = useState<Record<string, MonthlyExpenseSnapshot>>(() => loadFromStorage(STORAGE_KEYS.EXPENSE_SNAPSHOTS, {}));

  const saveExpenseSnapshot = useCallback((snapshot: MonthlyExpenseSnapshot) => {
    setExpenseSnapshots(prev => ({
      ...prev,
      [snapshot.monthKey]: snapshot
    }));
  }, []);

  const deleteExpenseSnapshot = useCallback((monthKey: string) => {
    setExpenseSnapshots(prev => {
      const next = { ...prev };
      delete next[monthKey];
      return next;
    });
  }, []);

  const getExpenseSnapshot = useCallback((monthKey: string): MonthlyExpenseSnapshot | undefined => {
    return expenseSnapshots[monthKey];
  }, [expenseSnapshots]);

  const [lastModified, setLastModified] = useState<string>(() => loadFromStorage(STORAGE_KEYS.LAST_MODIFIED, initialLastModified));

  // Vínculos Ocupacionais e Outros Recebimentos (Novos Estados)
  const [vinculosOcupacionais, setVinculosOcupacionais] = useState<VinculoOcupacional[]>(() => loadFromStorage("fin_vinculos_ocupacionais_v1", []));
  const [recebiveisParcelados, setRecebiveisParcelados] = useState<RecebivelParcelado[]>(() => loadFromStorage("fin_recebiveis_parcelados_v1", []));
  const [parcelasRecebiveis, setParcelasRecebiveis] = useState<ParcelaRecebivel[]>(() => loadFromStorage("fin_parcelas_recebiveis_v1", []));
  const [eventosFerias, setEventosFerias] = useState<EventoFerias[]>(() => loadFromStorage("fin_eventos_ferias_v1", []));
  const [eventosRescisao, setEventosRescisao] = useState<EventoRescisao[]>(() => loadFromStorage("fin_eventos_rescisao_v1", []));
  const [historicosContribuicaoINSS, setHistoricosContribuicaoINSS] = useState<HistoricoContribuicaoINSS[]>(() => loadFromStorage("fin_historicos_contribuicao_inss_v1", []));
  const [ignoredTxIds, setIgnoredTxIds] = useState<string[]>(() => loadFromStorage("ignored_recebiveis_tx_ids", []));
  const [pluggyConfig, setPluggyConfig] = useState<PluggyConfig>(() => loadFromStorage(STORAGE_KEYS.PLUGGY_CONFIG, initialPluggyConfig));
  const [pluggyLastPayload, setPluggyLastPayloadState] = useState<PluggySyncPayload | null>(() => loadFromStorage<PluggySyncPayload | null>(STORAGE_KEYS.PLUGGY_LAST_PAYLOAD, null));
  const [isSyncingPluggy, setIsSyncingPluggy] = useState(false);

  const setPluggyLastPayload = useCallback((payloadOrUpdater: SetStateAction<PluggySyncPayload | null>) => {
    setPluggyLastPayloadState(prev => {
      const next = typeof payloadOrUpdater === 'function' ? (payloadOrUpdater as any)(prev) : payloadOrUpdater;
      saveToStorage(STORAGE_KEYS.PLUGGY_LAST_PAYLOAD, next);
      return next;
    });
  }, []);

  const updateLastModified = useCallback(() => {
    const now = new Date().toISOString();
    setLastModified(now);
    saveToStorage(STORAGE_KEYS.LAST_MODIFIED, now);
  }, []);

  const updatePluggyConfig = useCallback((updates: Partial<PluggyConfig>) => {
    setPluggyConfig(prev => {
      const next = { ...prev, ...updates };
      saveToStorage(STORAGE_KEYS.PLUGGY_CONFIG, next);
      return next;
    });
    updateLastModified();
  }, [updateLastModified]);

  // 1. Definição básica de updaters de estado para evitar erros de referência circular/ordem
  const addTransacaoV2 = useCallback((transaction: TransacaoCompleta) => {
    const counterpartTxs: TransacaoCompleta[] = [];
    const { operationType, flow, amount, accountId, date, description, links, meta } = transaction;

    // Lógica de Partida Dobrada (Double-Entry)
    if (links.transferGroupId) {
      let targetAccountId = '';
      let counterFlow: any = 'transfer_in';
      let counterDomain = transaction.domain;
      let counterMeta = { ...meta, notes: `Contrapartida automática de ${OPERATION_TYPE_LABELS[operationType]}` };

      switch (operationType) {
        case 'transferencia':
          break;

        case 'aplicacao':
          targetAccountId = links.investmentId || '';
          counterFlow = 'transfer_in';
          counterDomain = 'investment';
          break;

        case 'resgate':
          targetAccountId = links.investmentId || '';
          counterFlow = 'transfer_out';
          counterDomain = 'investment';
          break;

        case 'liberacao_emprestimo':
          targetAccountId = 'acc_system_financiamento';
          counterFlow = 'out'; // Saída do sistema de financiamento (aumento de passivo)
          counterDomain = 'financing';
          // Adiciona metadado para notificação de configuração pendente
          transaction.meta = { ...transaction.meta, pendingLoanConfig: true };
          break;

        case 'veiculo':
        case 'imobilizado':
          targetAccountId = 'acc_system_bens';
          // Se for compra (flow out na conta real), é entrada no sistema de bens
          counterFlow = flow === 'out' ? 'in' : 'out';
          counterDomain = 'asset';
          break;
      }

      if (targetAccountId && targetAccountId !== accountId) {
        // Verifica se a contrapartida já não existe (para evitar duplicidade em transferências que chamam addTransacao duas vezes)
        // Mas para operações de sistema (bens/financiamento), sempre criamos.
        const isSystemAccount = targetAccountId.startsWith('acc_system_');
        
        if (isSystemAccount) {
          counterpartTxs.push({
            ...transaction,
            id: generateTransactionId(),
            accountId: targetAccountId,
            flow: counterFlow,
            domain: counterDomain,
            meta: counterMeta as any,
          });
        }
      }
    }

    setTransacoesV2(prev => [...prev, transaction, ...counterpartTxs]);
  }, []);

  const updateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    setBillsTracker(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBillsTracker(prev => prev.filter(b => b.id !== id));
  }, []);

  // Higienização de integridade de dados na inicialização
  useEffect(() => {
    const validAccountIds = new Set(contasMovimento.map(a => a.id));
    const invalidConfigs = creditCardConfigs.filter(cfg => !validAccountIds.has(cfg.accountId));
    
    if (invalidConfigs.length > 0) {
      console.warn("Limpando configurações de cartões órfãos:", invalidConfigs.length);
      setCreditCardConfigs(prev => prev.filter(cfg => validAccountIds.has(cfg.accountId)));
      toast.error(`${invalidConfigs.length} configuração(ões) de cartão inválidas foram removidas.`);
    }
  }, [contasMovimento, creditCardConfigs]);

  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); updateLastModified(); }, [emprestimos, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); updateLastModified(); }, [veiculos, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.IMOVEIS, imoveis); updateLastModified(); }, [imoveis, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TERRENOS, terrenos); updateLastModified(); }, [terrenos, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); updateLastModified(); }, [segurosVeiculo, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); updateLastModified(); }, [objetivos, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BILLS_TRACKER, billsTracker); updateLastModified(); }, [billsTracker, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.STANDARDIZATION_RULES, standardizationRules); updateLastModified(); }, [standardizationRules, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, importedStatements); updateLastModified(); }, [importedStatements, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.DATE_RANGES, dateRanges); }, [dateRanges]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ALERT_START_DATE, alertStartDate); }, [alertStartDate]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.REVENUE_FORECASTS, revenueForecasts); }, [revenueForecasts]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); updateLastModified(); }, [contasMovimento, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); updateLastModified(); }, [categoriasV2, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); updateLastModified(); }, [transacoesV2, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.METAS_PERSONALIZADAS, metasPersonalizadas); updateLastModified(); }, [metasPersonalizadas, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CREDIT_CARD_CONFIGS, creditCardConfigs); updateLastModified(); }, [creditCardConfigs, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CLT_CONTRACTS, cltContracts); updateLastModified(); }, [cltContracts, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CLT_COMPETENCIAS, cltCompetencias); updateLastModified(); }, [cltCompetencias, updateLastModified]);
  useEffect(() => { saveToStorage('fin_clt_legislacao_v1', cltLegislacaoConfigs); updateLastModified(); }, [cltLegislacaoConfigs, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CLT_HOLERITES, cltHolerites); updateLastModified(); }, [cltHolerites, updateLastModified]);

  // Persistência dos Novos Estados de Recebimentos
  useEffect(() => { saveToStorage("fin_vinculos_ocupacionais_v1", vinculosOcupacionais); updateLastModified(); }, [vinculosOcupacionais, updateLastModified]);
  useEffect(() => { saveToStorage("fin_recebiveis_parcelados_v1", recebiveisParcelados); updateLastModified(); }, [recebiveisParcelados, updateLastModified]);
  useEffect(() => { saveToStorage("fin_parcelas_recebiveis_v1", parcelasRecebiveis); updateLastModified(); }, [parcelasRecebiveis, updateLastModified]);
  useEffect(() => { saveToStorage("fin_eventos_ferias_v1", eventosFerias); updateLastModified(); }, [eventosFerias, updateLastModified]);
  useEffect(() => { saveToStorage("fin_eventos_rescisao_v1", eventosRescisao); updateLastModified(); }, [eventosRescisao, updateLastModified]);
  useEffect(() => { saveToStorage("fin_historicos_contribuicao_inss_v1", historicosContribuicaoINSS); updateLastModified(); }, [historicosContribuicaoINSS, updateLastModified]);
  useEffect(() => { saveToStorage("ignored_recebiveis_tx_ids", ignoredTxIds); updateLastModified(); }, [ignoredTxIds, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.EXPENSE_SNAPSHOTS, expenseSnapshots); updateLastModified(); }, [expenseSnapshots, updateLastModified]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PLUGGY_CONFIG, pluggyConfig); updateLastModified(); }, [pluggyConfig, updateLastModified]);


  const balanceCache = useMemo(() => {
    const cache = new Map<string, number>();
    const sortedTransactions = [...transacoesV2].sort((a, b) => {
        const dateA = parseDateLocal(a.date).getTime();
        const dateB = parseDateLocal(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
    });
    const accountBalances: Record<string, number> = {};
    contasMovimento.forEach(account => {
        accountBalances[account.id] = account.initialBalance;
    });
    sortedTransactions.forEach(t => {
        const account = contasMovimento.find(a => a.id === t.accountId);
        if (!account) return;
        const dateKey = t.date;
        const isCreditCard = account.accountType === 'cartao_credito';
        let amountChange = 0;
        if (isCreditCard) {
            if (t.flow === 'out' || t.flow === 'transfer_out') amountChange = -t.amount;
            else if (t.flow === 'in' || t.flow === 'transfer_in') amountChange = t.amount;
        } else {
            if (t.flow === 'in' || t.flow === 'transfer_in') amountChange = t.amount;
            else amountChange = -t.amount;
        }
        accountBalances[t.accountId] = (accountBalances[t.accountId] || 0) + amountChange;
        cache.set(`${t.accountId}_${dateKey}`, accountBalances[t.accountId]);
    });
    return cache;
  }, [transacoesV2, contasMovimento]);

  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    const targetDate = date || new Date(9999, 11, 31);
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    
    if (balanceCache.has(`${accountId}_${targetDateStr}`)) {
        return balanceCache.get(`${accountId}_${targetDateStr}`)!;
    }

    let balance = account.initialBalance;
    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseDateLocal(t.date) <= targetDate)
        .sort((a, b) => {
            const dateA = parseDateLocal(a.date).getTime();
            const dateB = parseDateLocal(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.id.localeCompare(b.id);
        });

    const isCreditCard = account.accountType === 'cartao_credito';

    transactionsBeforeDate.forEach(t => {
        let amountChange = 0;
        if (isCreditCard) {
            if (t.flow === 'out' || t.flow === 'transfer_out') amountChange = -t.amount;
            else if (t.flow === 'in' || t.flow === 'transfer_in') amountChange = t.amount;
        } else {
            if (t.flow === 'in' || t.flow === 'transfer_in') amountChange = t.amount;
            else amountChange = -t.amount;
        }
        balance += amountChange;
    });

    return balance;
  }, [balanceCache]);

  const calculateTotalInvestmentBalanceAtDate = useCallback((date: Date | undefined): number => {
    const targetDate = date || new Date(9999, 11, 31);
    const investmentAccountIds = contasMovimento
      .filter(c => ['renda_fixa', 'poupanca', 'cripto', 'reserva', 'objetivo'].includes(c.accountType))
      .map(c => c.id);
    return investmentAccountIds.reduce((acc, accountId) => {
        const balance = calculateBalanceUpToDate(accountId, targetDate, transacoesV2, contasMovimento);
        return acc + Math.max(0, balance);
    }, 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const calculatePaidInstallmentsUpToDate = useCallback((loanId: number, targetDate: Date): number => {
    const loanPayments = transacoesV2.filter(t => 
      t.operationType === 'pagamento_emprestimo' && t.links?.loanId === `loan_${loanId}` && parseDateLocal(t.date) <= targetDate
    );
    const paidParcelas = new Set<string>();
    loanPayments.forEach(p => { if (p.links?.parcelaId) paidParcelas.add(p.links.parcelaId); });
    return paidParcelas.size || loanPayments.length;
  }, [transacoesV2]);
  
  const calculateLoanSchedule = useCallback((loanId: number): AmortizationItem[] => {
    const loan = emprestimos.find(e => e.id === loanId);
    if (!loan || loan.meses === 0 || loan.taxaMensal === 0) return [];
    const taxa = loan.taxaMensal / 100;
    const parcelaFixaCents = Math.round(loan.parcela * 100);
    let saldoDevedorCents = Math.round(loan.valorTotal * 100);
    const schedule: AmortizationItem[] = [];
    for (let i = 1; i <= loan.meses; i++) {
      if (saldoDevedorCents <= 0) {
        schedule.push({ parcela: i, juros: 0, amortizacao: 0, saldoDevedor: 0 });
        continue;
      }
      const jurosCents = Math.round(saldoDevedorCents * taxa);
      let amortizacaoCents = i === loan.meses ? saldoDevedorCents : parcelaFixaCents - jurosCents;
      const novoSaldoDevedorCents = Math.max(0, saldoDevedorCents - amortizacaoCents);
      schedule.push({
        parcela: i,
        juros: Math.max(0, jurosCents / 100),
        amortizacao: amortizacaoCents / 100,
        saldoDevedor: novoSaldoDevedorCents / 100,
      });
      saldoDevedorCents = novoSaldoDevedorCents;
    }
    return schedule;
  }, [emprestimos]);
  
  const calculateLoanAmortizationAndInterest = useCallback((loanId: number, parcelaNumber: number): AmortizationItem | null => {
      return calculateLoanSchedule(loanId).find(item => item.parcela === parcelaNumber) || null;
  }, [calculateLoanSchedule]);
  
  const calculateLoanPrincipalDueInNextMonths = useCallback((targetDate: Date, months: number): number => {
    const lookaheadDate = addMonths(targetDate, months);
    return emprestimos.reduce((acc, e) => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
        let principalDue = 0;
        const paidUpToDate = calculatePaidInstallmentsUpToDate(e.id, targetDate);
        calculateLoanSchedule(e.id).forEach(item => {
            const dueDate = getDueDate(e.dataInicio!, item.parcela);
            if (item.parcela > paidUpToDate && (isBefore(dueDate, lookaheadDate) || isSameDay(dueDate, lookaheadDate))) {
                principalDue += item.amortizacao;
            }
        });
        return acc + principalDue;
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  const getSegurosAApropriar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    return segurosVeiculo.reduce((acc, seguro) => {
        try {
            const vigenciaInicio = parseDateLocal(seguro.vigenciaInicio);
            const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
            if (isAfter(vigenciaInicio, date) || isBefore(vigenciaFim, date)) return acc;
            const totalDays = differenceInDays(vigenciaFim, vigenciaInicio) + 1;
            if (totalDays <= 0) return acc;
            const dailyAccrual = seguro.valorTotal / totalDays;
            const daysConsumed = differenceInDays(date, vigenciaInicio) + 1;
            const accruedExpense = Math.min(seguro.valorTotal, dailyAccrual * daysConsumed);
            return acc + Math.max(0, seguro.valorTotal - accruedExpense);
        } catch { return acc; }
    }, 0);
  }, [segurosVeiculo]);

  const getSegurosAPagar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    return segurosVeiculo.reduce((acc, seguro) => {
        let totalPaid = 0;
        seguro.parcelas.forEach(parcela => {
            if (parcela.paga && parcela.transactionId) {
                const paymentTx = transacoesV2.find(t => t.id === parcela.transactionId);
                if (paymentTx && parseDateLocal(paymentTx.date) <= date) totalPaid += paymentTx.amount; 
            }
        });
        return acc + Math.max(0, seguro.valorTotal - totalPaid);
    }, 0); 
  }, [segurosVeiculo, transacoesV2]);

  const applyRules = useCallback((transactions: ImportedTransaction[], rules: StandardizationRule[]): ImportedTransaction[] => {
    return transactions.map(tx => {
      let updatedTx = { ...tx };
      const originalDesc = tx.originalDescription.toLowerCase();
      for (const rule of rules) {
        if (originalDesc.includes(rule.pattern.toLowerCase())) {
          if (!updatedTx.description || updatedTx.description === updatedTx.originalDescription) {
            updatedTx.description = rule.descriptionTemplate;
          }
          if (!updatedTx.categoryId) {
            updatedTx.categoryId = rule.categoryId;
          }
          if (!updatedTx.operationType || updatedTx.operationType === 'receita' || updatedTx.operationType === 'despesa') {
            updatedTx.operationType = rule.operationType;
            updatedTx.isTransfer = rule.operationType === 'transferencia';
          }
          break;
        }
      }
      return updatedTx;
    });
  }, []);

  const processStatementFile = useCallback(async (file: File, accountId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const content = await file.text();
      let rawTransactions: ImportedTransaction[] = content.toLowerCase().includes('<ofx>') 
        ? parseOFX(content, accountId) 
        : parseCSV(content, accountId);
      if (rawTransactions.length === 0) return { success: false, message: "Nenhuma transação válida encontrada." };
      
      const processedTransactions = applyRules(rawTransactions, standardizationRules);
      
      // Deduplicar: não reimportar transações que já existem nos extratos desta conta
      const existingTxKeys = new Set<string>();
      importedStatements
        .filter(s => s.accountId === accountId)
        .forEach(s => {
          s.rawTransactions.forEach(t => {
            const key = `${t.date}_${t.amount.toFixed(2)}_${t.originalDescription.trim().toLowerCase()}`;
            existingTxKeys.add(key);
          });
        });

      const newTransactionsOnly = processedTransactions.filter(t => {
        const key = `${t.date}_${t.amount.toFixed(2)}_${t.originalDescription.trim().toLowerCase()}`;
        return !existingTxKeys.has(key);
      });

      if (newTransactionsOnly.length === 0) {
        return { success: false, message: "Este arquivo (ou todas as suas transações) já foi importado anteriormente." };
      }

      const dates = newTransactionsOnly.map(t => parseDateLocal(t.date)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0] ? format(dates[0], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const endDate = dates[dates.length - 1] ? format(dates[dates.length - 1], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const newStatement: ImportedStatement = {
          id: generateStatementId(), accountId, fileName: file.name, importDate: new Date().toISOString(),
          startDate, endDate, status: 'pending', rawTransactions: newTransactionsOnly,
      };
      setImportedStatements(prev => [...prev, newStatement]);
      const ignoredCount = processedTransactions.length - newTransactionsOnly.length;
      return { 
        success: true, 
        message: `${newTransactionsOnly.length} transações carregadas${ignoredCount > 0 ? ` (${ignoredCount} duplicadas ignoradas)` : ''}.` 
      };
    } catch (e: any) { return { success: false, message: e.message || "Erro ao processar o arquivo." }; }
  }, [standardizationRules, applyRules, importedStatements]);

  const deleteImportedStatement = useCallback((statementId: string) => {
    setImportedStatements(prev => prev.filter(s => s.id !== statementId));
  }, []);
  
  const updateImportedStatement = useCallback((statementId: string, updates: Partial<ImportedStatement>) => {
    setImportedStatements(prev => prev.map(s => s.id === statementId ? { ...s, ...updates } : s));
  }, []);

  const deleteImportedTransaction = useCallback((transactionId: string) => {
    setImportedStatements(prev => prev.map(s => {
      const filtered = s.rawTransactions.filter(t => t.id !== transactionId);
      if (filtered.length !== s.rawTransactions.length) {
        const pendingCount = filtered.filter(t => !t.isContabilized).length;
        return {
          ...s,
          rawTransactions: filtered,
          status: filtered.length === 0 ? 'complete' : (pendingCount === 0 ? 'complete' : 'partial')
        };
      }
      return s;
    }).filter(s => s.rawTransactions.length > 0));
  }, []);

  const updateImportedTransactionDraft = useCallback((transactionId: string, updates: Partial<ImportedTransaction>) => {
    setImportedStatements(prev => prev.map(s => {
      const idx = s.rawTransactions.findIndex(t => t.id === transactionId);
      if (idx !== -1) {
        const updatedRaw = [...s.rawTransactions];
        updatedRaw[idx] = { ...updatedRaw[idx], ...updates };
        return { ...s, rawTransactions: updatedRaw };
      }
      return s;
    }));
  }, []);

  const executeTransaction = useCallback((
    transaction: TransacaoCompleta,
    transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string },
    newAsset?: { type: 'veiculo' | 'imovel' | 'terreno'; data: any }
  ) => {
    const { operationType, flow, amount, accountId, links, meta } = transaction;
    const counterpartTxs: TransacaoCompleta[] = [];

    // 1. Lógica de Partida Dobrada (Double-Entry) para contas de sistema ou transferências
    if (links.transferGroupId && transferGroup) {
      let targetAccountId = transferGroup.toAccountId;
      let counterFlow: any = 'transfer_in';
      let counterDomain = transaction.domain;
      let counterMeta = { ...meta, notes: `Contrapartida automática de ${OPERATION_TYPE_LABELS[operationType]}` };

      switch (operationType) {
        case 'transferencia':
          // Já vem com targetAccountId correto do modal/importação
          break;

        case 'aplicacao':
          targetAccountId = links.investmentId || '';
          counterFlow = 'transfer_in';
          counterDomain = 'investment';
          break;

        case 'resgate':
          targetAccountId = links.investmentId || '';
          counterFlow = 'transfer_out';
          counterDomain = 'investment';
          break;

        case 'liberacao_emprestimo':
          targetAccountId = 'acc_system_financiamento';
          counterFlow = 'out'; // Saída do sistema de financiamento (aumento de passivo)
          counterDomain = 'financing';
          
          // Criar o empréstimo pendente automaticamente
          const newLoan: Omit<Emprestimo, "id"> = {
            contrato: transaction.description || "Novo Emprestimo",
            parcela: 0,
            meses: 0,
            taxaMensal: 0,
            valorTotal: transaction.amount,
            contaCorrenteId: transaction.accountId,
            dataInicio: transaction.date,
            status: 'pendente_config',
            liberacaoTransactionId: transaction.id,
            parcelasPagas: 0
          };
          
          const nextLoanId = Math.max(0, ...emprestimos.map(e => e.id)) + 1;
          setEmprestimos(prev => [...prev, { ...newLoan, id: nextLoanId }]);
          
          transaction.meta = { ...transaction.meta, pendingLoanConfig: true };
          break;

        case 'veiculo':
        case 'imobilizado':
          targetAccountId = 'acc_system_bens';
          counterFlow = flow === 'out' ? 'in' : 'out';
          counterDomain = 'asset';
          break;
      }

      if (targetAccountId && targetAccountId !== accountId) {
        counterpartTxs.push({
          ...transaction,
          id: generateTransactionId(),
          accountId: targetAccountId,
          flow: counterFlow,
          domain: counterDomain,
          meta: counterMeta as any,
        });
      }
    }

    // 2. Criação de Novos Ativos (Veículos, Imóveis, Terrenos)
    if (newAsset) {
      if (newAsset.type === 'veiculo') {
        const newId = Math.max(0, ...veiculos.map(v => v.id)) + 1;
        setVeiculos(prev => [...prev, {
          ...newAsset.data,
          id: newId,
          dataCompra: transaction.date,
          valorVeiculo: transaction.amount,
          valorSeguro: 0,
          vencimentoSeguro: transaction.date,
          parcelaSeguro: 0,
          valorFipe: transaction.amount,
          compraTransactionId: transaction.id,
          status: 'ativo'
        }]);
      } else if (newAsset.type === 'imovel') {
        const newId = generateImovelId();
        setImoveis(prev => [...prev, {
          ...newAsset.data,
          id: newId,
          dataAquisicao: transaction.date,
          valorAquisicao: transaction.amount,
          valorAvaliacao: transaction.amount,
          compraTransactionId: transaction.id,
          status: 'ativo'
        }]);
      } else if (newAsset.type === 'terreno') {
        const newId = generateTerrenoId();
        setTerrenos(prev => [...prev, {
          ...newAsset.data,
          id: newId,
          dataAquisicao: transaction.date,
          valorAquisicao: transaction.amount,
          valorAvaliacao: transaction.amount,
          compraTransactionId: transaction.id,
          status: 'ativo'
        }]);
      }
    }

    // 3. Vínculo com BillTracker
    const loanIdStr = links.loanId ? links.loanId.replace('loan_', '') : null;
    const parcelaNum = links.parcelaId ? parseInt(links.parcelaId) : null;

    const matchingBill = billsTracker.find(b =>
      (loanIdStr && parcelaNum && b.sourceType === 'loan_installment' && b.sourceRef === loanIdStr && b.parcelaNumber === parcelaNum) ||
      (!b.isPaid &&
       Math.abs(b.expectedAmount - amount) < 2 &&
       isSameMonth(parseDateLocal(b.dueDate), parseDateLocal(transaction.date)) &&
       (b.description.toLowerCase().includes(transaction.description.toLowerCase()) ||
        transaction.description.toLowerCase().includes(b.description.toLowerCase())))
    );

    if (matchingBill) {
      updateBill(matchingBill.id, {
        isPaid: true,
        paymentDate: transaction.date,
        transactionId: links.transferGroupId || transaction.id,
        expectedAmount: transaction.amount,
        discountAmount: meta?.discountAmount ? Number(meta.discountAmount) : undefined
      });
      toast.info(`Vínculo automático com conta pendente: "${matchingBill.description}"`);
    }

    // 4. Persistir transações
    setTransacoesV2(prev => [...prev, transaction, ...counterpartTxs]);
    toast.success(counterpartTxs.length > 0 ? "Lançamento de partida dobrada realizado." : "Transação registrada com sucesso.");
  }, [billsTracker, updateBill, veiculos]);
  
  const uncontabilizeImportedTransaction = useCallback((transactionId: string) => {
    const targetTx = transacoesV2.find(t => t.id === transactionId);
    const transferGroupId = targetTx?.links?.transferGroupId;

    setTransacoesV2(prev => prev.filter(t => {
      if (t.id === transactionId) return false;
      if (transferGroupId && t.links?.transferGroupId === transferGroupId) return false;
      return true;
    }));

    setImportedStatements(prev => prev.map(s => {
      let updated = false;
      const newRawTransactions = s.rawTransactions.map(t => {
        if (t.contabilizedTransactionId === transactionId) {
          updated = true;
          return {
            ...t,
            isContabilized: false,
            contabilizedTransactionId: undefined,
          };
        }
        return t;
      });
      if (updated) {
        const pendingCount = newRawTransactions.filter(t => !t.isContabilized).length;
        return { ...s, rawTransactions: newRawTransactions, status: pendingCount === 0 ? 'complete' : 'partial' };
      }
      return s;
    }));
  }, [transacoesV2, setTransacoesV2]);

  const uncontabilizeTransactionsBatch = useCallback((transactionIds: string[]) => {
    if (!transactionIds.length) return;
    const idSet = new Set(transactionIds);
    const transferGroupIdsToRemove = new Set<string>();

    transacoesV2.forEach(t => {
      if (idSet.has(t.id) && t.links?.transferGroupId) {
        transferGroupIdsToRemove.add(t.links.transferGroupId);
      }
    });

    setTransacoesV2(prev => prev.filter(t => {
      if (idSet.has(t.id)) return false;
      if (t.links?.transferGroupId && transferGroupIdsToRemove.has(t.links.transferGroupId)) return false;
      return true;
    }));

    setImportedStatements(prev => prev.map(s => {
      let updated = false;
      const newRawTransactions = s.rawTransactions.map(t => {
        if (t.contabilizedTransactionId && idSet.has(t.contabilizedTransactionId)) {
          updated = true;
          return {
            ...t,
            isContabilized: false,
            contabilizedTransactionId: undefined,
          };
        }
        return t;
      });
      if (updated) {
        const pendingCount = newRawTransactions.filter(t => !t.isContabilized).length;
        return { ...s, rawTransactions: newRawTransactions, status: pendingCount === 0 ? 'complete' : 'partial' };
      }
      return s;
    }));
  }, [transacoesV2, setTransacoesV2]);
  
  const getTransactionsForReview = useCallback((accountId: string, range: DateRange): ImportedTransaction[] => {
    const allRawTransactions: ImportedTransaction[] = [];
    const seenRawKeys = new Set<string>();
    importedStatements.filter(s => s.accountId === accountId).forEach(s => {
        s.rawTransactions.filter(t => !t.isContabilized).forEach(t => {
          const key = `${t.accountId}_${t.date}_${t.amount.toFixed(2)}_${t.originalDescription.trim().toLowerCase()}`;
          if (!seenRawKeys.has(key)) {
            seenRawKeys.add(key);
            allRawTransactions.push(t);
          }
        });
    });
    
    // Identificar se a conta é de cartão de crédito
    const targetAccount = contasMovimento.find(acc => acc.id === accountId);
    const isCreditCardAccount = targetAccount?.accountType === 'cartao_credito';

    const hasRange = Boolean(range && range.from && range.to);
    let filteredTxs = hasRange
      ? allRawTransactions.filter(t => isWithinInterval(parseDateLocal(t.date), { start: startOfDay(range.from!), end: endOfDay(range.to!) }))
      : allRawTransactions;

    filteredTxs = applyRules(filteredTxs, standardizationRules);
    
    return filteredTxs.map(importedTx => {
        // Melhora na detecção de duplicidade
        const isDuplicate = transacoesV2.find(manualTx => 
            manualTx.accountId === importedTx.accountId && Math.abs(manualTx.amount - importedTx.amount) < 0.01 &&
            Math.abs(differenceInDays(parseDateLocal(importedTx.date), parseDateLocal(manualTx.date))) <= 2 &&
            manualTx.operationType !== 'initial_balance'
        );

        let finalTx = { ...importedTx };
        
        if (isDuplicate) {
            finalTx = { 
                ...finalTx, 
                isPotentialDuplicate: true, 
                duplicateOfTxId: isDuplicate.id, 
                operationType: isDuplicate.operationType, 
                categoryId: isDuplicate.categoryId, 
                description: isDuplicate.description 
            };
        }

        // Sugestão inteligente para entradas em conta de cartão
        if (isCreditCardAccount && (importedTx.operationType === 'receita' || importedTx.amount > 0)) {
            // Entradas em cartão são quase sempre pagamentos de fatura (transferências)
            finalTx.operationType = 'transferencia';
            finalTx.isTransfer = true;
            // Tenta sugerir a conta corrente padrão do cartão como origem se possível
            const cardConfig = creditCardConfigs.find(c => c.accountId === accountId);
            if (cardConfig?.defaultPaymentAccountId) {
                finalTx.destinationAccountId = cardConfig.defaultPaymentAccountId;
            }
        }

        // Sugestão inteligente para pagamentos de fatura detectados em conta CORRENTE
        const descLower = importedTx.originalDescription.toLowerCase();
        const keywords = ['fatura', 'cartao', 'itaucard', 'nubank', 'santander', 'pagamento', 'liquidacao'];
        
        if (!isCreditCardAccount && importedTx.amount > 0 && importedTx.operationType === 'despesa') {
            const hasKeyword = keywords.some(k => descLower.includes(k));
            if (hasKeyword) {
                // Tenta encontrar qual cartão está sendo pago baseando-se no nome da conta ou instituição
                const cardAccount = contasMovimento.find(acc => 
                    acc.accountType === 'cartao_credito' && 
                    (descLower.includes(acc.name.toLowerCase()) || (acc.institution && descLower.includes(acc.institution.toLowerCase())))
                );
                
                if (cardAccount) {
                    finalTx.operationType = 'transferencia';
                    finalTx.isTransfer = true;
                    finalTx.destinationAccountId = cardAccount.id;
                    finalTx.description = `Pagamento Fatura ${cardAccount.name}`;
                }
            }
        }

        return finalTx;
    });
  }, [importedStatements, transacoesV2, standardizationRules, applyRules, contasMovimento, creditCardConfigs]);

  const contabilizeImportedTransaction = useCallback((statementId: string, transactionId: string, data: Partial<ImportedTransaction>) => {
    const statement = importedStatements.find(s => s.id === statementId);
    if (!statement) return;

    const importedTx = statement.rawTransactions.find(t => t.id === transactionId);
    if (!importedTx) return;

    const finalTx: ImportedTransaction = { ...importedTx, ...data };
    const domain = finalTx.operationType ? getDomainFromOperation(finalTx.operationType) : 'operational';
    const flow = finalTx.operationType ? getFlowTypeFromOperation(finalTx.operationType, finalTx.tempAssetOperation) : 'out';

    const transactionIdV2 = generateTransactionId();
    const transferGroupId = (finalTx.isTransfer || finalTx.operationType === 'aplicacao' || finalTx.operationType === 'resgate' || finalTx.operationType === 'liberacao_emprestimo' || finalTx.operationType === 'veiculo' || finalTx.operationType === 'imobilizado') ? generateTransferGroupId() : null;

    const newTx: TransacaoCompleta = {
      id: transactionIdV2,
      date: finalTx.date,
      accountId: finalTx.accountId,
      flow: flow,
      operationType: finalTx.operationType || 'despesa',
      domain: domain,
      amount: finalTx.amount,
      categoryId: finalTx.categoryId,
      description: finalTx.description,
      links: {
        investmentId: finalTx.tempInvestmentId,
        loanId: finalTx.tempLoanId,
        transferGroupId: transferGroupId,
        parcelaId: finalTx.tempParcelaId,
        vehicleTransactionId: null,
      },
      conciliated: true,
      attachments: [],
      meta: {
        createdBy: 'system',
        source: 'import',
        createdAt: new Date().toISOString(),
        originalDescription: finalTx.originalDescription,
        assetType: finalTx.tempAssetType,
        assetId: finalTx.tempAssetId,
        assetOperation: finalTx.tempAssetOperation,
      }
    };

    const transferGroup = transferGroupId ? {
      id: transferGroupId,
      fromAccountId: finalTx.accountId,
      toAccountId: finalTx.isTransfer ? (finalTx.destinationAccountId || '') : (finalTx.tempInvestmentId || ''),
      amount: finalTx.amount,
      date: finalTx.date,
      description: finalTx.description
    } : undefined;

    // Usa a nova função unificada
    executeTransaction(newTx, transferGroup);

    // Atualizar o estado do extrato importado
    setImportedStatements(prev => prev.map(s => {
      if (s.id === statementId) {
        const updatedRaw = s.rawTransactions.map(t => {
          if (t.id === transactionId) {
            return { ...t, ...data, isContabilized: true, contabilizedTransactionId: transactionIdV2 };
          }
          return t;
        });
        const allDone = updatedRaw.every(t => t.isContabilized);
        return { ...s, rawTransactions: updatedRaw, status: allDone ? 'complete' : 'partial' };
      }
      return s;
    }));
  }, [importedStatements, executeTransaction]);

  const addPurchaseInstallments = useCallback((data: any) => {
    const { description, totalAmount, installments, firstDueDate, suggestedAccountId, suggestedCategoryId, isRecurring } = data;
    const installmentAmount = isRecurring ? totalAmount : Math.round((totalAmount / installments) * 100) / 100;
    const purchaseGroupId = `purchase_${Date.now()}`;
    const newBills: BillTracker[] = [];
    for (let i = 1; i <= installments; i++) {
        const dueDate = getDueDate(firstDueDate, i);
        newBills.push({
            id: generateBillId(), type: 'tracker', description: isRecurring ? `${description} (${i}/${installments})` : `${description} (${i}/${installments})`,
            dueDate: format(dueDate, 'yyyy-MM-dd'), expectedAmount: isRecurring ? installmentAmount : (i === installments ? totalAmount - (installmentAmount * (installments - 1)) : installmentAmount),
            isPaid: false, sourceType: 'purchase_installment', sourceRef: purchaseGroupId, parcelaNumber: i, totalInstallments: installments, suggestedAccountId, suggestedCategoryId, isExcluded: false,
            isRecurring: !!isRecurring,
        } as any);
    }
    setBillsTracker(prev => [...prev, ...newBills]);
  }, [setBillsTracker]);

  const getBillsForMonth = useCallback((date: Date): BillTracker[] => {
    return billsTracker.filter(bill => {
        const billDueDate = parseDateLocal(bill.dueDate);
        const isSameMonthDate = isSameMonth(billDueDate, date);
        let isPaidInMonth = bill.isPaid && bill.paymentDate && isSameMonth(parseDateLocal(bill.paymentDate), date);
        return (isSameMonthDate || isPaidInMonth) && (!bill.isExcluded || bill.isPaid);
    }).sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [billsTracker]);
  
  const getPotentialFixedBillsForMonth = useCallback((date: Date, localBills: BillTracker[]): PotentialFixedBill[] => {
    const potentialBills: PotentialFixedBill[] = [];
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const isBillIncluded = (sourceType: BillSourceType, sourceRef: string, parcelaNumber: number) => localBills.some(b => b.sourceType === sourceType && b.sourceRef === sourceRef && b.parcelaNumber === parcelaNumber && !b.isExcluded);
    emprestimos.filter(e => e.status === 'ativo').forEach(loan => {
        if (!loan.dataInicio) return;
        calculateLoanSchedule(loan.id).forEach(item => {
            const dueDate = getDueDate(loan.dataInicio!, item.parcela);
            if (isWithinInterval(dueDate, { start: monthStart, end: monthEnd })) {
                const matchingTx = transacoesV2.find(t => t.operationType === 'pagamento_emprestimo' && t.links?.loanId === `loan_${loan.id}` && t.links?.parcelaId === String(item.parcela));
                const expectedAmount = matchingTx ? matchingTx.amount : loan.parcela;
                potentialBills.push({
                    key: `loan_${loan.id}_${item.parcela}`,
                    sourceType: 'loan_installment',
                    sourceRef: String(loan.id),
                    parcelaNumber: item.parcela,
                    dueDate: format(dueDate, 'yyyy-MM-dd'),
                    expectedAmount,
                    description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`,
                    isPaid: !!matchingTx,
                    isIncluded: isBillIncluded('loan_installment', String(loan.id), item.parcela)
                });
            }
        });
    });
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(parcela => {
            const dueDate = parseDateLocal(parcela.vencimento);
            if (isWithinInterval(dueDate, { start: monthStart, end: monthEnd })) {
                potentialBills.push({ key: `ins_${seguro.id}_${parcela.numero}`, sourceType: 'insurance_installment', sourceRef: String(seguro.id), parcelaNumber: parcela.numero, dueDate: parcela.vencimento, expectedAmount: parcela.valor, description: `Seguro ${seguro.numeroApolice} - P${parcela.numero}/${seguro.numeroParcelas}`, isPaid: transacoesV2.some(t => t.links?.vehicleTransactionId === `${seguro.id}_${parcela.numero}`), isIncluded: isBillIncluded('insurance_installment', String(seguro.id), parcela.numero) });
            }
        });
    });
    return potentialBills.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [emprestimos, segurosVeiculo, transacoesV2, calculateLoanSchedule]);
  
  const getFutureFixedBills = useCallback((referenceDate: Date, localBills: BillTracker[]): PotentialFixedBill[] => {
    const futureBills: PotentialFixedBill[] = [];
    const referenceMonthEnd = endOfMonth(referenceDate);
    
    const isAlreadyInTracker = (sourceType: BillSourceType, sourceRef: string, parcelaNumber: number) =>
      billsTracker.some(b => b.sourceType === sourceType && b.sourceRef === sourceRef && b.parcelaNumber === parcelaNumber && !b.isExcluded);

    emprestimos.filter(e => e.status === 'ativo').forEach(loan => {
        if (!loan.dataInicio) return;
        calculateLoanSchedule(loan.id).forEach(item => {
            const dueDate = getDueDate(loan.dataInicio!, item.parcela);
            if (isAfter(dueDate, referenceMonthEnd)) {
                const matchingTx = transacoesV2.find(t => t.operationType === 'pagamento_emprestimo' && t.links?.loanId === `loan_${loan.id}` && t.links?.parcelaId === String(item.parcela));
                const expectedAmount = matchingTx ? matchingTx.amount : loan.parcela;
                futureBills.push({
                    key: `loan_${loan.id}_${item.parcela}`,
                    sourceType: 'loan_installment',
                    sourceRef: String(loan.id),
                    parcelaNumber: item.parcela,
                    dueDate: format(dueDate, 'yyyy-MM-dd'),
                    expectedAmount,
                    description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`,
                    isPaid: !!matchingTx,
                    isIncluded: isAlreadyInTracker('loan_installment', String(loan.id), item.parcela)
                });
            }
        });
    });

    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(parcela => {
            const dueDate = parseDateLocal(parcela.vencimento);
            if (isAfter(dueDate, referenceMonthEnd)) {
                futureBills.push({
                    key: `ins_${seguro.id}_${parcela.numero}`,
                    sourceType: 'insurance_installment',
                    sourceRef: String(seguro.id),
                    parcelaNumber: parcela.numero,
                    dueDate: parcela.vencimento,
                    expectedAmount: parcela.valor,
                    description: `Seguro ${seguro.numeroApolice} - P${parcela.numero}/${seguro.numeroParcelas}`,
                    isPaid: transacoesV2.some(t => t.links?.vehicleTransactionId === `${seguro.id}_${parcela.numero}`),
                    isIncluded: isAlreadyInTracker('insurance_installment', String(seguro.id), parcela.numero)
                });
            }
        });
    });

    billsTracker.filter(b => b.sourceType === 'purchase_installment' && !b.isExcluded).forEach(bill => {
        const dueDate = parseDateLocal(bill.dueDate);
        if (isAfter(dueDate, referenceMonthEnd)) {
            futureBills.push({
                key: `purchase_${bill.sourceRef}_${bill.parcelaNumber}`,
                sourceType: 'purchase_installment',
                sourceRef: bill.sourceRef!,
                parcelaNumber: bill.parcelaNumber!,
                dueDate: bill.dueDate,
                expectedAmount: bill.expectedAmount,
                description: bill.description,
                isPaid: bill.isPaid,
                isIncluded: false,
            });
        }
    });

    return futureBills.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [emprestimos, segurosVeiculo, billsTracker, transacoesV2, calculateLoanSchedule]);
  
  const getOtherPaidExpensesForMonth = useCallback((date: Date): ExternalPaidBill[] => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const trackerTxIds = new Set(billsTracker.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
    
    // Identificar transferências de pagamento de fatura registradas no billsTracker
    const cardInvoiceTransferIds = new Set<string>();
    billsTracker.forEach(b => {
      if (b.sourceType === 'card_invoice' && b.transactionId) {
        cardInvoiceTransferIds.add(b.transactionId);
      }
    });

    return transacoesV2.filter(t => {
        const transactionDate = parseDateLocal(t.date);
        return (
          isWithinInterval(transactionDate, { start: monthStart, end: monthEnd }) &&
          (t.flow === 'out' || t.flow === 'transfer_out') &&
          (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo' || t.operationType === 'veiculo' || t.operationType === 'imobilizado') &&
          (t.meta?.source !== 'import' || t.conciliated) &&
          !trackerTxIds.has(t.id) &&
          (!t.links?.transferGroupId || !trackerTxIds.has(t.links.transferGroupId)) &&
          (!t.links?.transferGroupId || !cardInvoiceTransferIds.has(t.links.transferGroupId)) &&
          t.meta?.source !== 'bill_tracker' &&
          !t.meta?.isCardPayment
        );
    }).map(t => ({ 
      id: t.id, 
      type: 'external_paid', 
      dueDate: t.date, 
      paymentDate: t.date, 
      expectedAmount: t.amount, 
      description: t.description, 
      suggestedAccountId: t.accountId, 
      suggestedCategoryId: t.categoryId, 
      sourceType: 'external_expense', 
      isPaid: true, 
      isExcluded: false 
    }));
  }, [billsTracker, transacoesV2]);

  const autoPopulateFixedBills = useCallback((date: Date) => {
    const currentBills = getBillsForMonth(date);
    const potential = getPotentialFixedBillsForMonth(date, currentBills);
    
    const toAdd: BillTracker[] = [];
    potential.forEach(pb => {
      if (pb.isIncluded || pb.isPaid) return;
      const wasExcluded = billsTracker.some(b =>
        b.sourceType === pb.sourceType && b.sourceRef === pb.sourceRef && b.parcelaNumber === pb.parcelaNumber && b.isExcluded
      );
      if (wasExcluded) return;
      
      let suggestedCategoryId: string | null = null;
      if (pb.sourceType === 'loan_installment') {
        suggestedCategoryId = categoriasV2.find(c => 
          c.label.toLowerCase().includes('empréstimo') || c.label.toLowerCase().includes('emprestimo') || c.label.toLowerCase().includes('financiamento')
        )?.id || null;
      } else if (pb.sourceType === 'insurance_installment') {
        suggestedCategoryId = categoriasV2.find(c => 
          c.label.toLowerCase().includes('seguro')
        )?.id || null;
      }
      
      toAdd.push({
        id: generateBillId(),
        type: 'tracker',
        description: pb.description,
        dueDate: pb.dueDate,
        expectedAmount: pb.expectedAmount,
        sourceType: pb.sourceType,
        sourceRef: pb.sourceRef,
        parcelaNumber: pb.parcelaNumber,
        isPaid: false,
        isExcluded: false,
        suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
        suggestedCategoryId,
      });
    });
    
    if (toAdd.length > 0) {
      setBillsTracker(prev => [...prev, ...toAdd]);
    }
  }, [getBillsForMonth, getPotentialFixedBillsForMonth, billsTracker, contasMovimento, categoriasV2]);

  const addEmprestimo = useCallback((emprestimo: Omit<Emprestimo, "id">) => {
    const newId = Math.max(0, ...emprestimos.map(e => e.id)) + 1;
    setEmprestimos(prev => [...prev, { ...emprestimo, id: newId, status: emprestimo.status || 'ativo', parcelasPagas: 0 }]);
  }, [emprestimos]);

  const updateEmprestimo = useCallback((id: number, updates: Partial<Emprestimo>) => {
    setEmprestimos(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addVeiculo = useCallback((veiculo: Omit<Veiculo, "id">) => {
    const newId = Math.max(0, ...veiculos.map(v => v.id)) + 1;
    setVeiculos(prev => [...prev, { ...veiculo, id: newId, status: veiculo.status || 'ativo' }]);
  }, [veiculos]);
  
  const addImovel = useCallback((imovel: Omit<Imovel, "id">) => {
    const newId = generateImovelId();
    setImoveis(prev => [...prev, { ...imovel, id: newId, status: imovel.status || 'ativo' }]);
  }, []);
  
  const updateImovel = useCallback((id: number, updates: Partial<Imovel>) => {
    setImoveis(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);
  
  const deleteImovel = useCallback((id: number) => {
    setImoveis(prev => prev.filter(i => i.id !== id));
  }, []);
  
  const addTerreno = useCallback((terreno: Omit<Terreno, "id">) => {
    const newId = generateTerrenoId();
    setTerrenos(prev => [...prev, { ...terreno, id: newId, status: terreno.status || 'ativo' }]);
  }, []);
  
  const updateTerreno = useCallback((id: number, updates: Partial<Terreno>) => {
    setTerrenos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);
  
  const deleteTerreno = useCallback((id: number) => {
    setTerrenos(prev => prev.filter(t => t.id !== id));
  }, []);

  const addStandardizationRule = useCallback((rule: Omit<StandardizationRule, "id">) => {
    setStandardizationRules(prev => [...prev, { ...rule, id: generateRuleId() }]);
  }, []);

  const updateStandardizationRule = useCallback((id: string, updates: Partial<StandardizationRule>) => {
    setStandardizationRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteStandardizationRule = useCallback((id: string) => {
    setStandardizationRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const getValorImoveisTerrenos = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    const imoveisValor = imoveis.filter(i => i.status === 'ativo' && parseDateLocal(i.dataAquisicao) <= date).reduce((acc, i) => acc + i.valorAvaliacao, 0);
    const terrenosValor = terrenos.filter(t => t.status === 'ativo' && parseDateLocal(t.dataAquisicao) <= date).reduce((acc, t) => acc + t.valorAvaliacao, 0);
    return imoveisValor + terrenosValor;
  }, [imoveis, terrenos]);

  const getAtivosTotal = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    const saldoContas = contasMovimento.filter(c => c.accountType !== 'cartao_credito').reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);
    return saldoContas + veiculos.filter(v => v.status !== 'vendido' && parseDateLocal(v.dataCompra) <= date).reduce((acc, v) => acc + v.valorFipe, 0) + getSegurosAApropriar(date) + getValorImoveisTerrenos(date);
  }, [contasMovimento, transacoesV2, veiculos, calculateBalanceUpToDate, getSegurosAApropriar, getValorImoveisTerrenos]);

  const getPassivosTotal = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    const saldoEmprestimos = emprestimos.reduce((acc, e) => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
        const paid = calculatePaidInstallmentsUpToDate(e.id, date);
        const schedule = calculateLoanSchedule(e.id);
        const lastPaid = schedule.find(item => item.parcela === paid);
        return acc + (lastPaid ? lastPaid.saldoDevedor : e.valorTotal);
    }, 0);
    const saldoCartoes = contasMovimento.filter(c => c.accountType === 'cartao_credito').reduce((acc, c) => acc + Math.abs(Math.min(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento))), 0);
    // Compras parceladas pendentes (excluindo despesas recorrentes)
    const comprasParceladas = billsTracker
      .filter(b => {
        if (b.sourceType !== 'purchase_installment' || b.isExcluded || (b as any).isRecurring) return false;
        
        // Verificar se a compra já havia sido feita na data de referência (com base no timestamp da sourceRef se existir)
        if (b.sourceRef && b.sourceRef.startsWith('purchase_')) {
          const timestampStr = b.sourceRef.split('_')[1];
          if (timestampStr) {
            const ts = parseInt(timestampStr, 10);
            if (!isNaN(ts) && ts > date.getTime()) return false;
          }
        }
        
        // Verificar se a parcela ainda não estava paga na data de referência
        if (!b.isPaid) return true;
        if (b.paymentDate) {
          try {
            const pDate = parseDateLocal(b.paymentDate);
            return pDate.getTime() > date.getTime();
          } catch {
            return false;
          }
        }
        return false;
      })
      .reduce((a, b) => a + b.expectedAmount, 0);
    return saldoEmprestimos + saldoCartoes + getSegurosAPagar(date) + comprasParceladas;
  }, [emprestimos, contasMovimento, transacoesV2, billsTracker, calculatePaidInstallmentsUpToDate, calculateLoanSchedule, getSegurosAPagar, calculateBalanceUpToDate]);

  const getLoanPrincipalRemaining = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    return emprestimos.reduce((a, e) => { 
        if (e.status === 'quitado' || e.status === 'pendente_config') return a; 
        const paid = calculatePaidInstallmentsUpToDate(e.id, date); 
        const s = calculateLoanSchedule(e.id); 
        const lp = s.find(x => x.parcela === paid); 
        return a + (lp ? lp.saldoDevedor : e.valorTotal); 
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  const exportData = useCallback(() => {
    const data = { 
      schemaVersion: "2.0", 
      exportedAt: new Date().toISOString(), 
      data: { 
        accounts: contasMovimento, 
        categories: categoriasV2, 
        transactions: transacoesV2, 
        emprestimos, 
        veiculos, 
        segurosVeiculo, 
        objetivos, 
        billsTracker, 
        standardizationRules, 
        importedStatements, 
        revenueForecasts, 
        alertStartDate, 
        imoveis, 
        terrenos,
        metasPersonalizadas,
        creditCardConfigs,
        cltContracts,
        cltCompetencias,
        cltLegislacaoConfigs,
        cltHolerites,
        vinculosOcupacionais,
        recebiveisParcelados,
        parcelasRecebiveis,
        eventosFerias,
        eventosRescisao,
        historicosContribuicaoINSS,
        ignoredTxIds,
        expenseSnapshots,
        pluggyConfig,
        pluggyLastPayload,
      },
      lastModified: lastModified,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  }, [
    contasMovimento, categoriasV2, transacoesV2, emprestimos, veiculos, segurosVeiculo, objetivos, billsTracker, 
    standardizationRules, importedStatements, revenueForecasts, alertStartDate, imoveis, terrenos, metasPersonalizadas, 
    creditCardConfigs, cltContracts, cltCompetencias, cltLegislacaoConfigs, cltHolerites, vinculosOcupacionais, recebiveisParcelados, 
    parcelasRecebiveis, eventosFerias, eventosRescisao, historicosContribuicaoINSS, ignoredTxIds, expenseSnapshots, pluggyConfig, pluggyLastPayload, lastModified
  ]);

  const importData = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      if (data.schemaVersion !== '2.0') return { success: false, message: "Schema incompatível." };
      if (data.data.accounts) setContasMovimento(data.data.accounts);
      if (data.data.categories) setCategoriasV2(data.data.categories);
      if (data.data.transactions) setTransacoesV2(data.data.transactions);
      if (data.data.emprestimos) setEmprestimos(data.data.emprestimos);
      if (data.data.veiculos) setVeiculos(data.data.veiculos);
      if (data.data.segurosVeiculo) setSegurosVeiculo(data.data.segurosVeiculo);
      if (data.data.objetivos) setObjetivos(data.data.objetivos);
      if (data.data.billsTracker) setBillsTracker(data.data.billsTracker);
      if (data.data.standardizationRules) setStandardizationRules(data.data.standardizationRules);
      if (data.data.importedStatements) setImportedStatements(data.data.importedStatements);
      if (data.data.revenueForecasts) setRevenueForecasts(data.data.revenueForecasts);
      if (data.data.alertStartDate) setAlertStartDate(data.data.alertStartDate);
      if (data.data.imoveis) setImoveis(data.data.imoveis);
      if (data.data.terrenos) setTerrenos(data.data.terrenos);
      if (data.data.metasPersonalizadas) setMetasPersonalizadas(data.data.metasPersonalizadas);
      if (data.data.creditCardConfigs) setCreditCardConfigs(data.data.creditCardConfigs);
      if (data.data.cltContracts) setCltContracts(data.data.cltContracts);
      if (data.data.cltCompetencias) setCltCompetencias(data.data.cltCompetencias);
      if (data.data.cltLegislacaoConfigs) setCltLegislacaoConfigs(data.data.cltLegislacaoConfigs);
      if (data.data.cltHolerites) setCltHolerites(data.data.cltHolerites);
      if (data.data.expenseSnapshots) setExpenseSnapshots(data.data.expenseSnapshots);
      if (data.data.vinculosOcupacionais) setVinculosOcupacionais(data.data.vinculosOcupacionais);
      if (data.data.recebiveisParcelados) setRecebiveisParcelados(data.data.recebiveisParcelados);
      
      // Sanitização de parcelas importadas para evitar parcelas órfãs sem recebível pai
      if (data.data.parcelasRecebiveis) {
        const validRecIds = new Set((data.data.recebiveisParcelados || recebiveisParcelados).map((r: RecebivelParcelado) => r.id));
        const cleanParcelas = (data.data.parcelasRecebiveis as ParcelaRecebivel[]).filter(p => validRecIds.has(p.recebivelId));
        setParcelasRecebiveis(cleanParcelas);
      }
      
      if (data.data.eventosFerias) setEventosFerias(data.data.eventosFerias);
      if (data.data.eventosRescisao) setEventosRescisao(data.data.eventosRescisao);
      if (data.data.historicosContribuicaoINSS) setHistoricosContribuicaoINSS(data.data.historicosContribuicaoINSS);
      if (data.data.ignoredTxIds) setIgnoredTxIds(data.data.ignoredTxIds);
      if (data.data.pluggyConfig) {
        setPluggyConfig(data.data.pluggyConfig);
        saveToStorage(STORAGE_KEYS.PLUGGY_CONFIG, data.data.pluggyConfig);
        if (data.data.pluggyConfig.assignedCategories) {
          try { localStorage.setItem('open_finance_assigned_categories', JSON.stringify(data.data.pluggyConfig.assignedCategories)); } catch {}
        }
        if (data.data.pluggyConfig.assignedDescriptions) {
          try { localStorage.setItem('open_finance_assigned_descriptions', JSON.stringify(data.data.pluggyConfig.assignedDescriptions)); } catch {}
        }
      }
      if (data.data.pluggyLastPayload) {
        setPluggyLastPayload(data.data.pluggyLastPayload);
        saveToStorage(STORAGE_KEYS.PLUGGY_LAST_PAYLOAD, data.data.pluggyLastPayload);
      }
      
      const newTimestamp = data.lastModified || new Date().toISOString();
      setLastModified(newTimestamp);
      saveToStorage(STORAGE_KEYS.LAST_MODIFIED, newTimestamp);
      return { success: true, message: "Dados importados com sucesso!" };
    } catch (e) { 
      return { success: false, message: "Erro ao importar." }; 
    }
  }, [recebiveisParcelados, setPluggyLastPayload]);

  const syncPluggyData = useCallback(async (overrideItemId?: string): Promise<{
    success: boolean;
    message: string;
    cardCount?: number;
    statementCount?: number;
    logs?: string[];
    payload?: PluggySyncPayload;
    detectedInstallments?: DetectedCardInstallment[];
  }> => {
    let targetItemIds: string[] = [];
    if (overrideItemId && overrideItemId.trim()) {
      targetItemIds = overrideItemId.split(',').map(s => s.trim()).filter(Boolean);
    } else if (pluggyConfig?.itemIds && pluggyConfig.itemIds.length > 0) {
      targetItemIds = pluggyConfig.itemIds.filter(Boolean);
    } else if (pluggyConfig?.itemId) {
      targetItemIds = [pluggyConfig.itemId.trim()];
    }

    if (targetItemIds.length === 0) {
      return {
        success: false,
        message: "Nenhum ITEM_ID configurado para o Open Finance. Acesse a tela de Open Finance para cadastrar suas conexões.",
        logs: [`[${new Date().toLocaleTimeString()}] [AVISO] Nenhum ITEM_ID informado para sincronização.`]
      };
    }

    setIsSyncingPluggy(true);
    const syncLogs: string[] = [
      `[${new Date().toLocaleTimeString()}] Iniciando sincronização do Open Finance para ${targetItemIds.length} conexão(ões)...`
    ];

    const combinedAccounts: PluggyAccount[] = [];
    const combinedBills: any[] = [];
    const combinedInvestments: any[] = [];
    const combinedTransactions: Record<string, PluggyTransaction[]> = {};
    let combinedIdentity: PluggyIdentity | null = null;

    let successfulSyncs = 0;

    for (const itemId of targetItemIds) {
      const itemLabel = pluggyConfig?.itemLabels?.[itemId] || itemId.substring(0, 8);
      syncLogs.push(`[${new Date().toLocaleTimeString()}] Buscando dados da conexão "${itemLabel}" (${itemId.substring(0, 8)}...)...`);

      try {
        const response = await fetch('/api/pluggy/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        });

        const payload: PluggySyncPayload = await response.json();
        if (payload.logs && Array.isArray(payload.logs)) {
          syncLogs.push(...payload.logs);
        }

        if (!response.ok || (payload as any).error) {
          const errMsg = (payload as any).error || `Erro HTTP ${response.status}`;
          syncLogs.push(`[${new Date().toLocaleTimeString()}] [ERRO] Falha ao sincronizar Item ID "${itemId.substring(0, 8)}...": ${errMsg}`);
          continue;
        }

        successfulSyncs++;
        if (!combinedIdentity && payload.identity) {
          combinedIdentity = payload.identity;
        }

        if (payload.accounts && Array.isArray(payload.accounts)) {
          payload.accounts.forEach(acc => {
            if (!combinedAccounts.some(a => a.id === acc.id)) {
              combinedAccounts.push(acc);
            }
          });
        }

        if (payload.bills && Array.isArray(payload.bills)) {
          combinedBills.push(...payload.bills);
        }

        if (payload.investments && Array.isArray(payload.investments)) {
          combinedInvestments.push(...payload.investments);
        }

        if (payload.transactions && typeof payload.transactions === 'object') {
          Object.entries(payload.transactions).forEach(([accId, txs]) => {
            combinedTransactions[accId] = txs;
          });
        }
      } catch (err: any) {
        syncLogs.push(`[${new Date().toLocaleTimeString()}] [ERRO] Conexão ${itemId.substring(0, 8)}...: ${err.message || 'Falha na requisição'}`);
      }
    }

    if (successfulSyncs === 0) {
      setIsSyncingPluggy(false);
      return {
        success: false,
        message: "Não foi possível sincronizar nenhuma das conexões Open Finance configuradas.",
        logs: syncLogs,
      };
    }

    const combinedPayload: PluggySyncPayload = {
      identity: combinedIdentity,
      accounts: combinedAccounts,
      bills: combinedBills,
      investments: combinedInvestments,
      transactions: combinedTransactions,
      isSandboxOrDemo: false,
      logs: syncLogs,
    };

    setPluggyLastPayload(combinedPayload);
    saveToStorage(STORAGE_KEYS.PLUGGY_LAST_PAYLOAD, combinedPayload);

    const primaryItemId = targetItemIds[0] || pluggyConfig?.itemId || "";
    const updatedConfig: PluggyConfig = {
      ...(pluggyConfig || initialPluggyConfig),
      itemId: primaryItemId,
      itemIds: targetItemIds,
      lastSyncAt: new Date().toISOString(),
    };
    setPluggyConfig(updatedConfig);
    saveToStorage(STORAGE_KEYS.PLUGGY_CONFIG, updatedConfig);
    updateLastModified();

    // Identifica se há compras parceladas novas para notificação no banner
    const allDetectedInstallments: DetectedCardInstallment[] = [];
    for (const pluggyAcc of combinedAccounts) {
      const orbiumAccountId = pluggyConfig?.linkedAccounts?.[pluggyAcc.id];
      if (!orbiumAccountId) continue;
      const orbiumAccount = contasMovimento.find(a => a.id === orbiumAccountId);
      const isCredit = pluggyAcc.type === 'CREDIT' || orbiumAccount?.accountType === 'cartao_credito';
      if (isCredit) {
        const accountTxs = combinedTransactions[pluggyAcc.id] || [];
        const detectedForAcc = groupDetectedInstallments(accountTxs, orbiumAccountId, billsTracker, creditCardConfigs);
        allDetectedInstallments.push(...detectedForAcc);
      }
    }

    const totalTxsFound = Object.values(combinedTransactions).reduce((sum, list) => sum + list.length, 0);
    const summaryMsg = `Sincronização concluída com sucesso! (${successfulSyncs}/${targetItemIds.length} conexões, ${combinedAccounts.length} contas e ${totalTxsFound} movimentações obtidas).`;
    syncLogs.push(`[${new Date().toLocaleTimeString()}] [SUCESSO] ${summaryMsg}`);

    setIsSyncingPluggy(false);
    return {
      success: true,
      message: summaryMsg,
      logs: syncLogs,
      payload: combinedPayload,
      detectedInstallments: allDetectedInstallments,
    };
  }, [pluggyConfig, contasMovimento, billsTracker, creditCardConfigs, setPluggyLastPayload, updateLastModified]);

  const generateCheckingStatementsFromPluggy = useCallback((targetPluggyAccountId?: string): {
    success: boolean;
    statementCount: number;
    message: string;
    logs: string[];
  } => {
    const logs: string[] = [];
    const payload = pluggyLastPayload;
    if (!payload || !payload.accounts || payload.accounts.length === 0) {
      return {
        success: false,
        statementCount: 0,
        message: "Nenhum dado sincronizado da Pluggy disponível. Clique em Sincronizar primeiro.",
        logs: [`[${new Date().toLocaleTimeString()}] [AVISO] Tentativa de gerar extrato sem dados da Pluggy.`]
      };
    }

    let updatedStatements = [...importedStatements];
    let createdCount = 0;
    const txsByAccount = payload.transactions || {};

    for (const pluggyAcc of payload.accounts) {
      if (targetPluggyAccountId && targetPluggyAccountId !== 'all' && pluggyAcc.id !== targetPluggyAccountId) {
        continue;
      }

      const orbiumAccountId = pluggyConfig?.linkedAccounts?.[pluggyAcc.id];
      if (!orbiumAccountId) continue;

      const orbiumAccount = contasMovimento.find(a => a.id === orbiumAccountId);
      const isCredit = pluggyAcc.type === 'CREDIT' || orbiumAccount?.accountType === 'cartao_credito';
      // Gera extrato exclusivamente para contas correntes
      if (isCredit) continue;

      const accountTxs = txsByAccount[pluggyAcc.id] || [];
      if (accountTxs.length === 0) continue;

      const statement = buildPluggyImportedStatement(
        accountTxs,
        orbiumAccountId,
        orbiumAccount?.name || pluggyAcc.name,
        standardizationRules,
        false
      );

      const existingStmtIdx = updatedStatements.findIndex(
        s => s.accountId === orbiumAccountId && s.fileName.startsWith("Pluggy API") && s.status === 'pending'
      );

      if (existingStmtIdx >= 0) {
        updatedStatements[existingStmtIdx] = statement;
      } else {
        updatedStatements.push(statement);
      }
      createdCount++;
      logs.push(`[${new Date().toLocaleTimeString()}] Extrato de conta corrente gerado para "${orbiumAccount?.name || pluggyAcc.name}" (${accountTxs.length} transações).`);
    }

    if (createdCount > 0) {
      setImportedStatements(updatedStatements);
      saveToStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, updatedStatements);
      updateLastModified();
      return {
        success: true,
        statementCount: createdCount,
        message: `${createdCount} extrato(s) de conta corrente disponibilizado(s) com sucesso na Revisão de Extrato!`,
        logs
      };
    } else {
      return {
        success: false,
        statementCount: 0,
        message: "Nenhuma conta corrente vinculada com movimentações encontrada para gerar extrato.",
        logs: [`[${new Date().toLocaleTimeString()}] Nenhuma conta corrente elegível encontrada.`]
      };
    }
  }, [pluggyLastPayload, pluggyConfig, contasMovimento, importedStatements, standardizationRules, updateLastModified]);

  const commitPluggyTransactions = useCallback((
    targetAccountId?: string,
    categoryOverrides?: Record<string, string>,
    descriptionOverrides?: Record<string, string>
  ): {
    success: boolean;
    count: number;
    message: string;
    logs: string[];
  } => {
    const logs: string[] = [];
    const payload = pluggyLastPayload;
    if (!payload || !payload.accounts) {
      return {
        success: false,
        count: 0,
        message: "Nenhum dado sincronizado da Pluggy para lançar. Sincronize primeiro.",
        logs: [`[${new Date().toLocaleTimeString()}] [AVISO] Tentativa de lançar sem dados da Pluggy.`]
      };
    }

    const txsByAccount = payload.transactions || {};
    const newTransactions: TransacaoCompleta[] = [];
    let launchedCount = 0;
    let skippedDuplicatesCount = 0;
    const targetItemId = pluggyConfig?.itemId || "";

    for (const pluggyAcc of payload.accounts) {
      if (targetAccountId && targetAccountId !== 'all' && pluggyAcc.id !== targetAccountId) {
        continue;
      }

      const orbiumAccountId = pluggyConfig?.linkedAccounts?.[pluggyAcc.id];
      if (!orbiumAccountId) continue;

      const orbiumAccount = contasMovimento.find(a => a.id === orbiumAccountId);
      const isCredit = pluggyAcc.type === 'CREDIT' || orbiumAccount?.accountType === 'cartao_credito';
      const accountTxs = txsByAccount[pluggyAcc.id] || [];

      if (isCredit) {
        for (const tx of accountTxs) {
          const isCardPayment = isCardInvoicePayment(tx.description);
          const parsed = parseInstallmentPattern(tx.description);
          const rawAmt = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
          const cleanAmt = Math.abs(rawAmt);

          // 1. Verificação com isPluggyTransactionAlreadyHandled (garante que itens já tratados ou compromissos não sejam lançados)
          const isAlreadyHandled = isPluggyTransactionAlreadyHandled(
            tx,
            pluggyAcc.id,
            orbiumAccountId,
            isCredit,
            [...transacoesV2, ...newTransactions],
            importedStatements,
            billsTracker,
            creditCardConfigs
          );

          if (isAlreadyHandled) {
            skippedDuplicatesCount++;
            continue;
          }

          // 2. Verificação rigorosa contra duplicidade no cartão de crédito
          const isDuplicate = isCreditCardTransactionDuplicate(
            tx, 
            orbiumAccountId, 
            [...transacoesV2, ...newTransactions],
            importedStatements,
            billsTracker,
            creditCardConfigs
          );

          if (isDuplicate) {
            skippedDuplicatesCount++;
            continue;
          }

          let dateFormatted = format(new Date(), 'yyyy-MM-dd');
          if (tx.date) {
            try {
              const parsedDate = parseDateLocal(tx.date.substring(0, 10));
              dateFormatted = format(parsedDate, 'yyyy-MM-dd');
            } catch {
              dateFormatted = tx.date.substring(0, 10);
            }
          }

          if (isCardPayment) {
            // Pagamento de fatura:
            const cardConfig = creditCardConfigs.find(c => c.accountId === orbiumAccountId || c.id === orbiumAccountId);
            const defaultPaymentAccountId = cardConfig?.defaultPaymentAccountId;
            const paymentAccount = defaultPaymentAccountId 
              ? contasMovimento.find(c => c.id === defaultPaymentAccountId)
              : undefined;

            const transferGroupId = generateTransferGroupId();

            const paymentOverrideDesc = descriptionOverrides?.[tx.id] || 
              descriptionOverrides?.[`pay_${pluggyAcc.id}_${tx.id}`] ||
              descriptionOverrides?.[`pay_${tx.id}`];

            const finalPaymentDesc = paymentOverrideDesc || tx.description || 'Pagamento de Fatura';

            // Lançamento no Cartão de Crédito (Amortização da dívida / Entrada de transferência)
            const cardTx: TransacaoCompleta = {
              id: generateTransactionId(),
              date: dateFormatted,
              accountId: orbiumAccountId,
              flow: 'in',
              operationType: 'transferencia',
              domain: 'operational',
              amount: cleanAmt,
              categoryId: null,
              description: finalPaymentDesc,
              links: {
                investmentId: null,
                loanId: null,
                transferGroupId,
                parcelaId: null,
                vehicleTransactionId: null,
                pluggyTransactionId: tx.id,
                pluggyItemId: targetItemId,
              },
              conciliated: true,
              attachments: [],
              meta: {
                source: 'pluggy_open_finance',
                isCardPayment: true,
                pluggyTransactionId: tx.id,
                pluggyAccountId: pluggyAcc.id,
                pluggyItemId: targetItemId,
                originalAmount: tx.amount,
                createdAt: new Date().toISOString(),
              }
            };
            newTransactions.push(cardTx);
            launchedCount++;

            // Proteção ANTI-DUPLICAÇÃO no pagamento de fatura:
            if (paymentAccount) {
              const alreadyInChecking = isInvoicePaymentAlreadyInChecking(
                paymentAccount.id,
                cleanAmt,
                dateFormatted,
                [...transacoesV2, ...newTransactions]
              );

              if (alreadyInChecking) {
                logs.push(
                  `[PAGAMENTO FATURA] O débito de R$ ${cleanAmt.toFixed(2)} já existe na conta corrente "${paymentAccount.name}" ("${alreadyInChecking.description}"). Duplicação evitada com sucesso!`
                );
              } else {
                const checkingTx: TransacaoCompleta = {
                  id: generateTransactionId(),
                  date: dateFormatted,
                  accountId: paymentAccount.id,
                  flow: 'transfer_out',
                  operationType: 'transferencia',
                  domain: 'operational',
                  amount: cleanAmt,
                  categoryId: null,
                  description: `Pagamento de Fatura — ${orbiumAccount?.name || 'Cartão'}`,
                  links: {
                    investmentId: null,
                    loanId: null,
                    transferGroupId,
                    parcelaId: null,
                    vehicleTransactionId: null,
                    pluggyTransactionId: tx.id,
                    pluggyItemId: targetItemId,
                  },
                  conciliated: true,
                  attachments: [],
                  meta: {
                    source: 'pluggy_open_finance',
                    isCardPayment: true,
                    pluggyTransactionId: tx.id,
                    pluggyAccountId: pluggyAcc.id,
                    pluggyItemId: targetItemId,
                    originalAmount: tx.amount,
                    createdAt: new Date().toISOString(),
                  }
                };
                newTransactions.push(checkingTx);
              }
            }

            // Atualiza fatura no billsTracker se houver pendente
            setBillsTracker(prevBills => prevBills.map(b => {
              if (
                b.sourceType === 'card_invoice' && 
                !b.isPaid && 
                (b.sourceRef === cardConfig?.id || b.cardId === cardConfig?.id || b.suggestedAccountId === orbiumAccountId) &&
                Math.abs(b.expectedAmount - cleanAmt) < 5
              ) {
                return {
                  ...b,
                  isPaid: true,
                  paymentDate: dateFormatted,
                  transactionId: transferGroupId,
                };
              }
              return b;
            }));

          } else {
            // Despesa comum no cartão de crédito ou parcela
            const installmentGroupKey = `${pluggyAcc.id}_${parsed.cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '')}_${parsed.totalInstallments}_${Math.round(cleanAmt)}`;
            
            const overrideCat = categoryOverrides?.[tx.id] || 
              (parsed.isInstallment ? categoryOverrides?.[installmentGroupKey] : undefined);
            
            const overrideDesc = descriptionOverrides?.[tx.id] || 
              (parsed.isInstallment ? descriptionOverrides?.[installmentGroupKey] : undefined);
            
            const finalDescription = overrideDesc || tx.description || 'Compra no Cartão';

            const finalCatId = overrideCat || predictTransactionCategory(
              finalDescription,
              'despesa',
              transacoesV2,
              standardizationRules,
              orbiumAccountId
            );

            const cardTx: TransacaoCompleta = {
              id: generateTransactionId(),
              date: dateFormatted,
              accountId: orbiumAccountId,
              flow: 'out',
              operationType: 'despesa',
              domain: 'operational',
              amount: cleanAmt,
              categoryId: finalCatId,
              description: finalDescription,
              links: {
                investmentId: null,
                loanId: null,
                transferGroupId: null,
                parcelaId: null,
                vehicleTransactionId: null,
                pluggyTransactionId: tx.id,
                pluggyItemId: targetItemId,
              },
              conciliated: true,
              attachments: [],
              meta: {
                source: 'pluggy_open_finance',
                isCardPayment: false,
                pluggyTransactionId: tx.id,
                pluggyAccountId: pluggyAcc.id,
                pluggyItemId: targetItemId,
                originalAmount: tx.amount,
                originalDescription: tx.description,
                userCustomDescription: overrideDesc || (finalDescription !== tx.description ? finalDescription : undefined),
                itemKey: parsed.isInstallment ? installmentGroupKey : tx.id,
                createdAt: new Date().toISOString(),
              }
            };
            newTransactions.push(cardTx);
            launchedCount++;
          }
        }
      }
    }

    if (newTransactions.length > 0) {
      setTransacoesV2(prev => [...prev, ...newTransactions]);
      updateLastModified();
      const msg = `${launchedCount} transação(ões) lançada(s) com sucesso no sistema!${skippedDuplicatesCount > 0 ? ` (${skippedDuplicatesCount} duplicadas ignoradas)` : ''}`;
      logs.push(`[${new Date().toLocaleTimeString()}] [SUCESSO] ${msg}`);
      return {
        success: true,
        count: launchedCount,
        message: msg,
        logs
      };
    } else {
      const msg = skippedDuplicatesCount > 0 
        ? "Todas as transações já foram lançadas anteriormente (nenhuma duplicidade gerada)."
        : "Nenhuma transação nova encontrada para lançar.";
      logs.push(`[${new Date().toLocaleTimeString()}] [INFO] ${msg}`);
      return {
        success: true,
        count: 0,
        message: msg,
        logs
      };
    }
  }, [pluggyLastPayload, pluggyConfig, contasMovimento, transacoesV2, creditCardConfigs, standardizationRules, importedStatements, billsTracker, setBillsTracker, updateLastModified]);

  const undoPluggyCardTransactions = useCallback((targetAccountId?: string): {
    count: number;
    restoredDescriptions: Record<string, string>;
    restoredCategories: Record<string, string>;
  } => {
    const toRemoveIds = new Set<string>();
    const transferGroupIdsToRemove = new Set<string>();
    const restoredDescriptions: Record<string, string> = {};
    const restoredCategories: Record<string, string> = {};

    // Mapeamento bidirecional Pluggy ID <-> Orbium ID
    const mappedOrbiumId = (targetAccountId && pluggyConfig?.linkedAccounts?.[targetAccountId])
      ? pluggyConfig.linkedAccounts[targetAccountId]
      : null;

    let mappedPluggyId: string | null = null;
    if (targetAccountId && pluggyConfig?.linkedAccounts) {
      const entry = Object.entries(pluggyConfig.linkedAccounts).find(([pId, oId]) => oId === targetAccountId);
      if (entry) mappedPluggyId = entry[0];
    }

    // 1. Identificar transações lançadas pela integração Open Finance no cartão
    transacoesV2.forEach(t => {
      const isFromPluggy = t.meta?.source === 'pluggy_open_finance' || !!t.links?.pluggyTransactionId || !!t.meta?.pluggyTransactionId;
      if (!isFromPluggy) return;

      const acc = contasMovimento.find(c => c.id === t.accountId);
      const isCardAcc = acc?.accountType === 'cartao_credito';

      // Match da conta: aceita targetAccountId tanto sendo ID Orbium quanto ID Pluggy
      const matchesTarget = !targetAccountId || targetAccountId === 'all' ||
        t.accountId === targetAccountId ||
        (mappedOrbiumId && t.accountId === mappedOrbiumId) ||
        (t.meta?.pluggyAccountId && (t.meta.pluggyAccountId === targetAccountId || t.meta.pluggyAccountId === mappedPluggyId));

      if (matchesTarget && (isCardAcc || t.meta?.isCardPayment)) {
        toRemoveIds.add(t.id);
        if (t.links?.transferGroupId) {
          transferGroupIdsToRemove.add(t.links.transferGroupId);
        }

        // Salvar descrições personalizadas e categorias para restaurar na interface do Open Finance
        const pTxId = t.links?.pluggyTransactionId || t.meta?.pluggyTransactionId;
        const itemKey = (t.meta as any)?.itemKey || pTxId;
        const customDesc = (t.meta as any)?.userCustomDescription || t.description;

        if (pTxId && customDesc) {
          restoredDescriptions[pTxId] = customDesc;
        }
        if (itemKey && customDesc) {
          restoredDescriptions[itemKey] = customDesc;
        }
        if (pTxId && t.categoryId) {
          restoredCategories[pTxId] = t.categoryId;
        }
        if (itemKey && t.categoryId) {
          restoredCategories[itemKey] = t.categoryId;
        }
      }
    });

    // 2. Se houver transferências pareadas (ex: débito de pagamento de fatura em conta corrente), remove o par
    if (transferGroupIdsToRemove.size > 0) {
      transacoesV2.forEach(t => {
        if (t.links?.transferGroupId && transferGroupIdsToRemove.has(t.links.transferGroupId)) {
          toRemoveIds.add(t.id);
        }
      });
    }

    if (toRemoveIds.size > 0) {
      setTransacoesV2(prev => prev.filter(t => !toRemoveIds.has(t.id)));
      updateLastModified();
    }

    return {
      count: toRemoveIds.size,
      restoredDescriptions,
      restoredCategories,
    };
  }, [transacoesV2, contasMovimento, pluggyConfig, updateLastModified]);

  const markLoanParcelPaid = useCallback((loanId: number, valorPago: number, dataPagamento: string, parcelaNumber?: number) => {
    setEmprestimos(prevLoans => prevLoans.map(loan => {
      if (loan.id !== loanId) return loan;
      const newParcelasPagas = loan.parcelasPagas || 0;
      let targetParcelaNumber = parcelaNumber;
      if (!targetParcelaNumber) targetParcelaNumber = newParcelasPagas + 1;
      const updatedParcelasPagas = targetParcelaNumber === newParcelasPagas + 1 ? newParcelasPagas + 1 : newParcelasPagas;
      return { ...loan, parcelasPagas: updatedParcelasPagas };
    }));
  }, []);

  const unmarkLoanParcelPaid = useCallback((loanId: number) => {
    setEmprestimos(prevLoans => prevLoans.map(loan => {
      if (loan.id !== loanId) return loan;
      return { ...loan, parcelasPagas: Math.max(0, (loan.parcelasPagas || 0) - 1) };
    }));
  }, []);

  const markSeguroParcelPaid = useCallback((seguroId: number, parcelaNumero: number, transactionId: string) => {
    setSegurosVeiculo(prevSeguros => prevSeguros.map(seguro => {
      if (seguro.id !== seguroId) return seguro;
      return {
        ...seguro,
        parcelas: seguro.parcelas.map(parcela => 
          parcela.numero === parcelaNumero 
            ? { ...parcela, paga: true, transactionId } 
            : parcela
        ),
      };
    }));
  }, []);

  const unmarkSeguroParcelPaid = useCallback((seguroId: number, parcelaNumero: number) => {
    setSegurosVeiculo(prevSeguros => prevSeguros.map(seguro => {
      if (seguro.id !== seguroId) return seguro;
      return {
        ...seguro,
        parcelas: seguro.parcelas.map(parcela => 
          parcela.numero === parcelaNumero 
            ? { ...parcela, paga: false, transactionId: undefined } 
            : parcela
        ),
      };
    }));
  }, []);

  const getValorFipeTotal = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    return veiculos.filter(v => v.status === 'ativo' && parseDateLocal(v.dataCompra) <= date).reduce((acc, v) => acc + v.valorFipe, 0);
  }, [veiculos]);

  const getCreditCardDebt = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    return contasMovimento.filter(c => c.accountType === 'cartao_credito').reduce((acc, c) => acc + Math.abs(Math.min(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento))), 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const getJurosTotais = useCallback(() => {
    return emprestimos.reduce((acc, e) => acc + (e.parcela * e.meses - e.valorTotal), 0);
  }, [emprestimos]);

  const getDespesasFixas = useCallback(() => {
    const fixedCategoryIds = new Set(categoriasV2.filter(c => c.nature === 'despesa_fixa').map(c => c.id));
    return transacoesV2.filter(t => t.categoryId && fixedCategoryIds.has(t.categoryId)).reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesV2, categoriasV2]);

  const getRevenueForPreviousMonth = useCallback((date: Date): number => {
    const prevMonth = subMonths(date, 1);
    const start = startOfMonth(prevMonth);
    const end = endOfMonth(prevMonth);
    return transacoesV2
      .filter(t => {
        try {
          const txDate = parseDateLocal(t.date);
          return isWithinInterval(txDate, { start, end }) && (t.operationType === 'receita' || t.operationType === 'rendimento');
        } catch { return false; }
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesV2]);

  const addMetaPersonalizada = useCallback((meta: MetaPersonalizada) => {
    setMetasPersonalizadas(prev => [...prev, meta]);
  }, []);

  const updateMetaPersonalizada = useCallback((id: string, updates: Partial<MetaPersonalizada>) => {
    setMetasPersonalizadas(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteMetaPersonalizada = useCallback((id: string) => {
    setMetasPersonalizadas(prev => prev.filter(m => m.id !== id));
  }, []);

  const calcularProgressoMeta = useCallback((meta: MetaPersonalizada): MetaProgresso => {
    const now = new Date();
    let valorAtual = 0;
    let txsPeriodo = transacoesV2;
    if (meta.periodoAvaliacao === 'mensal') txsPeriodo = transacoesV2.filter(t => isSameMonth(parseDateLocal(t.date), now));
    else if (meta.periodoAvaliacao === 'trimestral') {
      const threeMonthsAgo = subMonths(now, 3);
      txsPeriodo = transacoesV2.filter(t => { const txDate = parseDateLocal(t.date); return txDate >= threeMonthsAgo && txDate <= now; });
    } else if (meta.periodoAvaliacao === 'anual') txsPeriodo = transacoesV2.filter(t => isSameYear(parseDateLocal(t.date), now));

    switch (meta.metrica) {
      case 'receita': valorAtual = txsPeriodo.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0); break;
      case 'despesa': valorAtual = txsPeriodo.filter(t => t.flow === 'out').reduce((a, t) => a + t.amount, 0); break;
      case 'investimento': valorAtual = txsPeriodo.filter(t => t.operationType === 'aplicacao').reduce((a, t) => a + t.amount, 0); break;
      case 'saldo': valorAtual = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType)).reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, now, transacoesV2, contasMovimento), 0); break;
      case 'patrimonio': valorAtual = getAtivosTotal(now) - getPassivosTotal(now); break;
      case 'categoria_especifica': if (meta.categoriaId) valorAtual = txsPeriodo.filter(t => t.categoryId === meta.categoriaId).reduce((a, t) => a + t.amount, 0); break;
      case 'reserva_emergencia': {
        const reserva = contasMovimento.filter(c => c.accountType === 'reserva').reduce((a, c) => a + Math.max(0, calculateBalanceUpToDate(c.id, now, transacoesV2, contasMovimento)), 0);
        const threeMonthsAgo = subMonths(now, 3);
        const gastos3m = transacoesV2.filter(t => { try { const d = parseDateLocal(t.date); return d >= threeMonthsAgo && d <= now && t.flow === 'out'; } catch { return false; } }).reduce((acc, t) => acc + t.amount, 0);
        const gastoMensalMedio = gastos3m / 3;
        valorAtual = reserva / gastoMensalMedio;
        break;
      }
    }

    if (meta.tipo === 'economia') {
      const receitas = txsPeriodo.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
      const despesas = txsPeriodo.filter(t => t.flow === 'out').reduce((a, t) => a + t.amount, 0);
      valorAtual = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
    }

    let percentual = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) * 100 : 0;
    percentual = Math.min(percentual, 200);
    let status: 'sucesso' | 'alerta' | 'perigo' | 'neutro' = 'neutro';
    if (meta.logica === 'maior_melhor') {
      if (percentual >= 100) status = 'sucesso';
      else if (percentual >= 70) status = 'alerta';
      else status = 'perigo';
    } else {
      if (percentual <= 80) status = 'sucesso';
      else if (percentual <= 100) status = 'alerta';
      else status = 'perigo';
    }
    return { valorAtual, percentual, status };
  }, [transacoesV2, contasMovimento, calculateBalanceUpToDate, getAtivosTotal, getPassivosTotal]);

  const addCreditCardConfig = useCallback((config: Omit<CreditCardConfig, 'id'>) => {
    setCreditCardConfigs(prev => [...prev, { ...config, id: generateCreditCardConfigId() }]);
  }, []);

  const updateCreditCardConfig = useCallback((id: string, updates: Partial<BillTracker>) => {
    setCreditCardConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCreditCardConfig = useCallback((id: string) => {
    setCreditCardConfigs(prev => prev.filter(c => c.id !== id));
  }, []);

  const getInvoiceForCard = useCallback((cardId: string, monthDate: Date): number => {
    const config = creditCardConfigs.find(c => c.id === cardId);
    if (!config) return 0;
    const closingDay = config.closingDay;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const currentClosing = new Date(year, month, Math.min(closingDay, new Date(year, month + 1, 0).getDate()));
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevClosing = new Date(prevYear, prevMonth, Math.min(closingDay, new Date(prevYear, prevMonth + 1, 0).getDate()));
    
    const rawAmount = transacoesV2
      .filter(t => t.accountId === config.accountId && t.flow === 'out' && parseDateLocal(t.date) > prevClosing && parseDateLocal(t.date) <= currentClosing)
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingAmount = billsTracker
      .filter(b => 
        !b.isPaid && 
        !b.isExcluded && 
        b.sourceType !== 'card_invoice' &&
        (b.suggestedAccountId === config.accountId || b.cardId === config.id) &&
        parseDateLocal(b.dueDate) > prevClosing && 
        parseDateLocal(b.dueDate) <= currentClosing
      )
      .reduce((acc, b) => acc + (b.expectedAmount || 0), 0);
    
    return Math.round((rawAmount + pendingAmount) * 100) / 100;
  }, [creditCardConfigs, transacoesV2, billsTracker]);

  const getCardCurrentCycleUsage = useCallback((cardId: string, referenceDate?: Date): number => {
    const config = creditCardConfigs.find(c => c.id === cardId);
    if (!config) return 0;
    const today = referenceDate || new Date();
    const closingDay = config.closingDay;
    const thisMonthClosing = new Date(today.getFullYear(), today.getMonth(), Math.min(closingDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()));
    const lastClosing = today > thisMonthClosing ? thisMonthClosing : new Date(today.getFullYear(), today.getMonth() - 1, Math.min(closingDay, new Date(today.getFullYear(), today.getMonth(), 0).getDate()));
    
    const rawAmount = transacoesV2
      .filter(t => t.accountId === config.accountId && t.flow === 'out' && parseDateLocal(t.date) > lastClosing && parseDateLocal(t.date) <= today)
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingAmount = billsTracker
      .filter(b => 
        !b.isPaid && 
        !b.isExcluded && 
        b.sourceType !== 'card_invoice' &&
        (b.suggestedAccountId === config.accountId || b.cardId === config.id)
      )
      .reduce((acc, b) => acc + (b.expectedAmount || 0), 0);
    
    return Math.round((rawAmount + pendingAmount) * 100) / 100;
  }, [creditCardConfigs, transacoesV2, billsTracker]);

  const getNextCycleBalance = useCallback((cardId: string, referenceDate?: Date): number => {
    const config = creditCardConfigs.find(c => c.id === cardId);
    if (!config) return 0;
    const today = referenceDate || new Date();
    const closingDay = config.closingDay;
    const thisMonthClosing = new Date(today.getFullYear(), today.getMonth(), Math.min(closingDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()));
    const cycleStart = today > thisMonthClosing ? thisMonthClosing : new Date(today.getFullYear(), today.getMonth() - 1, Math.min(closingDay, new Date(today.getFullYear(), today.getMonth(), 0).getDate()));
    const cycleEnd = today > thisMonthClosing ? new Date(today.getFullYear(), today.getMonth() + 1, Math.min(closingDay, new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate())) : thisMonthClosing;
    
    const rawAmount = transacoesV2
      .filter(t => t.accountId === config.accountId && t.flow === 'out' && parseDateLocal(t.date) > cycleStart && parseDateLocal(t.date) <= cycleEnd && parseDateLocal(t.date) > today)
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingAmount = billsTracker
      .filter(b => 
        !b.isPaid && 
        !b.isExcluded && 
        b.sourceType !== 'card_invoice' &&
        (b.suggestedAccountId === config.accountId || b.cardId === config.id) &&
        parseDateLocal(b.dueDate) > cycleStart && 
        parseDateLocal(b.dueDate) <= cycleEnd && 
        parseDateLocal(b.dueDate) > today
      )
      .reduce((acc, b) => acc + (b.expectedAmount || 0), 0);
    
    return Math.round((rawAmount + pendingAmount) * 100) / 100;
  }, [creditCardConfigs, transacoesV2, billsTracker]);

  const getCardCycleTransactions = useCallback((cardId: string, monthDate: Date): TransacaoCompleta[] => {
    const config = creditCardConfigs.find(c => c.id === cardId);
    if (!config) return [];
    const closingDay = config.closingDay;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const currentClosing = new Date(year, month, Math.min(closingDay, new Date(year, month + 1, 0).getDate()));
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevClosing = new Date(prevYear, prevMonth, Math.min(closingDay, new Date(prevYear, prevMonth + 1, 0).getDate()));
    
    const realTxs = transacoesV2
      .filter(t => t.accountId === config.accountId && t.flow === 'out' && parseDateLocal(t.date) > prevClosing && parseDateLocal(t.date) <= currentClosing);

    const pendingBills = billsTracker
      .filter(b => 
        !b.isPaid && 
        !b.isExcluded && 
        b.sourceType !== 'card_invoice' &&
        (b.suggestedAccountId === config.accountId || b.cardId === config.id) &&
        parseDateLocal(b.dueDate) > prevClosing && 
        parseDateLocal(b.dueDate) <= currentClosing
      )
      .map(b => ({
        id: b.id,
        date: b.dueDate,
        accountId: config.accountId,
        flow: 'out' as const,
        operationType: 'despesa' as const,
        domain: 'operational' as const,
        amount: b.expectedAmount,
        categoryId: b.suggestedCategoryId || null,
        description: b.description + " (Agendado)",
        links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null },
        conciliated: false,
        attachments: [],
        meta: { createdBy: 'system', source: 'bill_tracker' as const, createdAt: b.dueDate }
      }));

    return [...realTxs, ...pendingBills].sort((a, b) => a.date.localeCompare(b.date));
  }, [creditCardConfigs, transacoesV2, billsTracker]);

  const generateInvoiceBills = useCallback((monthDate: Date): BillTracker[] => {
    return creditCardConfigs.map(config => {
      const account = contasMovimento.find(a => a.id === config.accountId);
      if (!account) return null;

      const invoiceAmount = getInvoiceForCard(config.id, monthDate);
      if (invoiceAmount <= 0) return null;
      
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const dueDay = Math.min(config.dueDay, new Date(year, month + 1, 0).getDate());
      const dueDateStr = format(new Date(year, month, dueDay), 'yyyy-MM-dd');
      const invoiceCycleKey = format(monthDate, 'yyyy-MM');
      
      const existingInTracker = billsTracker.find(b => b.sourceRef === config.id && b.invoiceCycle === invoiceCycleKey);
      if (existingInTracker?.isExcluded) return null;

      const prevMonthDate = subMonths(monthDate, 1);
      const inflowsToCard = transacoesV2.filter(t => 
        t.accountId === config.accountId && 
        (t.flow === 'in' || t.flow === 'transfer_in') &&
        (isSameMonth(parseDateLocal(t.date), monthDate) || isSameMonth(parseDateLocal(t.date), prevMonthDate)) &&
        Math.abs(t.amount - invoiceAmount) < 2
      );

      let isPaid = existingInTracker?.isPaid || false;
      let paymentDate = existingInTracker?.paymentDate;
      let transactionId = existingInTracker?.transactionId;

      if (inflowsToCard.length > 0) {
        const match = inflowsToCard.sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())[0];
        isPaid = true; 
        paymentDate = match.date; 
        transactionId = match.links?.transferGroupId || match.id;
      }

      return { 
        id: existingInTracker?.id || `invoice_${config.id}_${invoiceCycleKey}`, 
        type: 'tracker' as const, 
        description: `Fatura ${account.name}`, 
        dueDate: dueDateStr, 
        expectedAmount: Math.round(invoiceAmount * 100) / 100, 
        isPaid, 
        paymentDate, 
        transactionId, 
        sourceType: 'card_invoice' as const, 
        sourceRef: config.id, 
        cardId: config.id, 
        invoiceCycle: invoiceCycleKey, 
        suggestedAccountId: config.defaultPaymentAccountId, 
        suggestedCategoryId: null, 
        isExcluded: false 
      };
    }).filter(Boolean) as BillTracker[];
  }, [creditCardConfigs, getInvoiceForCard, contasMovimento, billsTracker, transacoesV2]);

  // Vínculos Ocupacionais CRUD
  const addVinculoOcupacional = useCallback((v: VinculoOcupacional) => {
    setVinculosOcupacionais(p => [...p, v]);
  }, []);
  const updateVinculoOcupacional = useCallback((id: string, u: Partial<VinculoOcupacional>) => {
    setVinculosOcupacionais(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);
  const deleteVinculoOcupacional = useCallback((id: string) => {
    setVinculosOcupacionais(p => p.filter(x => x.id !== id));
    setRecebiveisParcelados(prevRecs => {
      const recsToRemove = new Set(prevRecs.filter(r => r.vinculoId === id).map(r => r.id));
      if (recsToRemove.size > 0) {
        setParcelasRecebiveis(prevParcs => prevParcs.filter(parc => !recsToRemove.has(parc.recebivelId)));
      }
      return prevRecs.filter(r => r.vinculoId !== id);
    });
    setEventosFerias(p => p.filter(f => f.vinculoId !== id));
    setEventosRescisao(p => p.filter(r => r.vinculoId !== id));
    setHistoricosContribuicaoINSS(p => p.filter(h => h.vinculoId !== id));
  }, []);

  // Recebíveis Parcelados CRUD
  const addRecebivelParcelado = useCallback((r: RecebivelParcelado) => {
    setRecebiveisParcelados(p => [...p, r]);
  }, []);
  const updateRecebivelParcelado = useCallback((id: string, u: Partial<RecebivelParcelado>) => {
    setRecebiveisParcelados(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);
  const deleteRecebivelParcelado = useCallback((id: string) => {
    setRecebiveisParcelados(p => p.filter(x => x.id !== id));
    setParcelasRecebiveis(p => p.filter(x => x.recebivelId !== id));
  }, []);

  // Parcelas Recebíveis CRUD
  const updateParcelaRecebivel = useCallback((id: string, u: Partial<ParcelaRecebivel>) => {
    setParcelasRecebiveis(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);

  const confirmarPagamentoParcela = useCallback((id: string, dataPagamento: string, valorPago: number, contaId: string) => {
    setParcelasRecebiveis(prev => prev.map(p => {
      if (p.id === id) {
        const matchingRecebivel = recebiveisParcelados.find(r => r.id === p.recebivelId);
        const txId = `tx_parcela_${p.id}`;
        
        // Criar transação correspondente
        const newTx: TransacaoCompleta = {
          id: txId,
          date: dataPagamento,
          accountId: contaId,
          flow: 'in',
          operationType: 'receita',
          domain: 'operational',
          amount: valorPago,
          categoryId: 'cat_salario', // Categoria de receita padrão
          description: `Recebível — ${matchingRecebivel?.cliente || 'Cliente'} (Parc. ${p.numeroParcela})`,
          links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: p.id, vehicleTransactionId: null },
          conciliated: true,
          attachments: [],
          meta: { createdBy: 'recebiveis_module', source: 'manual', createdAt: new Date().toISOString() },
        };

        // Adiciona a transação nas contas
        setTransacoesV2(txs => [...txs, newTx]);

        return {
          ...p,
          status: 'PAGO' as const,
          dataPagamento,
          valorPago,
          recebimentoGeradoId: txId
        };
      }
      return p;
    }));
    toast.success("Pagamento da parcela confirmado com sucesso!");
  }, [recebiveisParcelados]);

  const estornarPagamentoParcela = useCallback((id: string) => {
    setParcelasRecebiveis(prev => prev.map(p => {
      if (p.id === id) {
        if (p.recebimentoGeradoId) {
          setTransacoesV2(txs => txs.filter(t => t.id !== p.recebimentoGeradoId));
        }
        return {
          ...p,
          status: 'A_VENCER' as const,
          dataPagamento: null,
          valorPago: null,
          recebimentoGeradoId: null
        };
      }
      return p;
    }));
    toast.info("Pagamento da parcela estornado com sucesso.");
  }, []);

  // Férias CRUD
  const addEventoFerias = useCallback((f: EventoFerias) => {
    setEventosFerias(p => [...p, f]);
  }, []);
  const updateEventoFerias = useCallback((id: string, u: Partial<EventoFerias>) => {
    setEventosFerias(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);
  const deleteEventoFerias = useCallback((id: string) => {
    setEventosFerias(p => p.filter(x => x.id !== id));
  }, []);

  // Rescisões CRUD
  const addEventoRescisao = useCallback((r: EventoRescisao) => {
    setEventosRescisao(p => [...p, r]);
  }, []);
  const updateEventoRescisao = useCallback((id: string, u: Partial<EventoRescisao>) => {
    setEventosRescisao(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);
  const deleteEventoRescisao = useCallback((id: string) => {
    setEventosRescisao(p => p.filter(x => x.id !== id));
  }, []);

  // Histórico Contribuição INSS CRUD
  const addHistoricoContribuicao = useCallback((h: HistoricoContribuicaoINSS) => {
    setHistoricosContribuicaoINSS(p => [...p, h]);
  }, []);
  const updateHistoricoContribuicao = useCallback((id: string, u: Partial<HistoricoContribuicaoINSS>) => {
    setHistoricosContribuicaoINSS(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  }, []);
  const deleteHistoricoContribuicao = useCallback((id: string) => {
    setHistoricosContribuicaoINSS(p => p.filter(x => x.id !== id));
  }, []);

  const value = useMemo(() => ({
    emprestimos, addEmprestimo, updateEmprestimo, deleteEmprestimo: (id: number) => setEmprestimos(p => p.filter(e => e.id !== id)), getPendingLoans: () => emprestimos.filter(e => e.status === 'pendente_config'), markLoanParcelPaid, unmarkLoanParcelPaid, calculateLoanSchedule, calculateLoanAmortizationAndInterest, calculateLoanPrincipalDueInNextMonths,
    veiculos, addVeiculo, updateVeiculo: (id: number, u: any) => setVeiculos(p => p.map(v => v.id === id ? { ...v, ...u } : v)), deleteVeiculo: (id: number) => setVeiculos(p => p.filter(v => v.id !== id)), getPendingVehicles: () => veiculos.filter(v => v.status === 'pendente_cadastro'),
    imoveis, addImovel, updateImovel, deleteImovel,
    terrenos, addTerreno, updateTerreno, deleteTerreno,
    segurosVeiculo, addSeguroVeiculo: (s: any) => setSegurosVeiculo(p => [...p, { ...s, id: Math.max(0, ...p.map(x => x.id)) + 1 }]), updateSeguroVeiculo: (id: number, s: any) => setSegurosVeiculo(p => p.map(x => x.id === id ? { ...x, ...s } : x)), deleteSeguroVeiculo: (id: number) => setSegurosVeiculo(p => p.filter(x => x.id !== id)), markSeguroParcelPaid, unmarkSeguroParcelPaid,
    objetivos, addObjetivo: (o: any) => setObjetivos(p => [...p, { ...o, id: Math.max(0, ...p.map(x => x.id)) + 1 }]), updateObjetivo: (id: number, o: any) => setObjetivos(p => p.map(x => x.id === id ? { ...x, ...o } : x)), deleteObjetivo: (id: number) => setObjetivos(p => p.filter(x => x.id !== id)),
    billsTracker, setBillsTracker, updateBill, deleteBill, addPurchaseInstallments, getBillsForMonth, getPotentialFixedBillsForMonth, getFutureFixedBills, getOtherPaidExpensesForMonth, autoPopulateFixedBills,
    creditCardConfigs, addCreditCardConfig, updateCreditCardConfig, deleteCreditCardConfig, getInvoiceForCard, generateInvoiceBills, getCardCurrentCycleUsage, getNextCycleBalance, getCardCycleTransactions,
    contasMovimento, setContasMovimento, getContasCorrentesTipo: () => contasMovimento.filter(c => c.accountType === 'corrente'),
    categoriasV2, setCategoriasV2, transacoesV2, setTransacoesV2, addTransacaoV2,
    standardizationRules, addStandardizationRule, updateStandardizationRule, deleteStandardizationRule,
    importedStatements, processStatementFile, deleteImportedStatement, getTransactionsForReview, updateImportedStatement, contabilizeImportedTransaction, uncontabilizeImportedTransaction, deleteImportedTransaction, updateImportedTransactionDraft, uncontabilizeTransactionsBatch,
    executeTransaction,
    dateRanges, setDateRanges, alertStartDate, setAlertStartDate, revenueForecasts, setMonthlyRevenueForecast: (k: string, v: number) => setRevenueForecasts(p => ({ ...p, [k]: v })), getRevenueForPreviousMonth,
    getTotalReceitas: (m?: string) => transacoesV2.filter(t => (t.operationType === 'receita' || t.operationType === 'rendimento') && (!m || t.date.startsWith(m))).reduce((a, t) => a + t.amount, 0),
    getTotalDespesas: (m?: string) => transacoesV2.filter(t => (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && (!m || t.date.startsWith(m))).reduce((a, t) => a + t.amount, 0),
    getTotalDividas: () => emprestimos.reduce((a, e) => a + e.valorTotal, 0), getCustoVeiculos: () => veiculos.filter(v => v.status !== 'vendido').reduce((a, v) => a + v.valorSeguro, 0), getSaldoAtual: () => contasMovimento.reduce((a, c) => a + calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento), 0),
    getValorFipeTotal, getValorImoveisTerrenos, getSaldoDevedor: (d?: Date) => getLoanPrincipalRemaining(d) + getCreditCardDebt(d), getLoanPrincipalRemaining, getCreditCardDebt, getJurosTotais, getDespesasFixas,
    getPatrimonioLiquido: (d?: Date) => getAtivosTotal(d) - getPassivosTotal(d), getAtivosTotal, getPassivosTotal, getSegurosAApropriar, getSegurosAPagar,
    calculateBalanceUpToDate, calculateTotalInvestmentBalanceAtDate, calculatePaidInstallmentsUpToDate,
    metasPersonalizadas, addMetaPersonalizada, updateMetaPersonalizada, deleteMetaPersonalizada, calcularProgressoMeta,
    
    cltContracts,
    addCltContract: (c: CltContract) => setCltContracts(p => [...p, c]),
    updateCltContract: (id: string, u: Partial<CltContract>) => setCltContracts(p => p.map(c => c.id === id ? { ...c, ...u } : c)),
    deleteCltContract: (id: string) => {
      setCltContracts(p => p.filter(c => c.id !== id));
      setCltCompetencias(p => p.filter(c => c.contractId !== id));
      setCltHolerites(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (k.startsWith(`${id}_`)) delete next[k];
        });
        return next;
      });
    },
    cltCompetencias,
    addCltCompetencia: (c: CltCompetencia) => setCltCompetencias(p => [...p, c]),
    updateCltCompetencia: (id: string, u: Partial<CltCompetencia>) => setCltCompetencias(p => p.map(c => c.id === id ? { ...c, ...u } : c)),
    deleteCltCompetenciasByContract: (contractId: string) => setCltCompetencias(p => p.filter(c => c.contractId !== contractId)),
    cltLegislacaoConfigs,
    addCltLegislacaoConfig: (c: CltLegislacaoConfig) => setCltLegislacaoConfigs(p => [...p, c]),
    updateCltLegislacaoConfig: (id: string, u: Partial<CltLegislacaoConfig>) => setCltLegislacaoConfigs(p => p.map(c => c.id === id ? { ...c, ...u } : c)),
    deleteCltLegislacaoConfig: (id: string) => setCltLegislacaoConfigs(p => p.filter(c => c.id !== id)),
    cltHolerites,
    saveCltHolerite,
    deleteCltHolerite,

    // Vínculos Ocupacionais adicionais
    vinculosOcupacionais,
    addVinculoOcupacional,
    updateVinculoOcupacional,
    deleteVinculoOcupacional,

    // Recebíveis parcelados de clientes
    recebiveisParcelados,
    addRecebivelParcelado,
    updateRecebivelParcelado,
    deleteRecebivelParcelado,

    // Parcelas dos recebíveis
    parcelasRecebiveis,
    setParcelasRecebiveis,
    updateParcelaRecebivel,
    confirmarPagamentoParcela,
    estornarPagamentoParcela,

    // Férias, Rescisões e Previdência
    eventosFerias,
    addEventoFerias,
    updateEventoFerias,
    deleteEventoFerias,
    
    eventosRescisao,
    addEventoRescisao,
    updateEventoRescisao,
    deleteEventoRescisao,

    historicosContribuicaoINSS,
    addHistoricoContribuicao,
    updateHistoricoContribuicao,
    deleteHistoricoContribuicao,

    ignoredTxIds,
    setIgnoredTxIds,

    // Expense Snapshots
    expenseSnapshots,
    saveExpenseSnapshot,
    deleteExpenseSnapshot,
    getExpenseSnapshot,

    // Pluggy Open Finance
    pluggyConfig,
    updatePluggyConfig,
    pluggyLastPayload,
    setPluggyLastPayload,
    syncPluggyData,
    isSyncingPluggy,
    undoPluggyCardTransactions,
    generateCheckingStatementsFromPluggy,
    commitPluggyTransactions,

    lastModified,
    exportData, importData,
  }), [
    emprestimos, veiculos, imoveis, terrenos, segurosVeiculo, objetivos, billsTracker, creditCardConfigs, cltContracts, cltCompetencias, cltLegislacaoConfigs,
    vinculosOcupacionais, recebiveisParcelados, parcelasRecebiveis, eventosFerias, eventosRescisao, historicosContribuicaoINSS, ignoredTxIds, setIgnoredTxIds,
    expenseSnapshots, saveExpenseSnapshot, deleteExpenseSnapshot, getExpenseSnapshot,
    pluggyConfig, updatePluggyConfig, pluggyLastPayload, setPluggyLastPayload, syncPluggyData, isSyncingPluggy, undoPluggyCardTransactions,
    generateCheckingStatementsFromPluggy, commitPluggyTransactions,
    cltHolerites, saveCltHolerite, deleteCltHolerite, addTransacaoV2, calculateTotalInvestmentBalanceAtDate,
    addVinculoOcupacional, updateVinculoOcupacional, deleteVinculoOcupacional,
    addRecebivelParcelado, updateRecebivelParcelado, deleteRecebivelParcelado,
    updateParcelaRecebivel, confirmarPagamentoParcela, estornarPagamentoParcela,
    addEventoFerias, updateEventoFerias, deleteEventoFerias,
    addEventoRescisao, updateEventoRescisao, deleteEventoRescisao,
    addHistoricoContribuicao, updateHistoricoContribuicao, deleteHistoricoContribuicao,
    
    contasMovimento, categoriasV2, transacoesV2, standardizationRules, importedStatements, dateRanges, 
    alertStartDate, revenueForecasts, lastModified, getAtivosTotal, getPassivosTotal, calculateBalanceUpToDate,
    calculatePaidInstallmentsUpToDate, calculateLoanSchedule, getSegurosAApropriar, getSegurosAPagar,
    processStatementFile, getTransactionsForReview, getBillsForMonth, getPotentialFixedBillsForMonth,
    getFutureFixedBills, getOtherPaidExpensesForMonth, getInvoiceForCard, generateInvoiceBills,
    getCardCurrentCycleUsage, getNextCycleBalance, getCardCycleTransactions, autoPopulateFixedBills,
    getValorFipeTotal, getValorImoveisTerrenos, getLoanPrincipalRemaining, getCreditCardDebt, getJurosTotais,
    getDespesasFixas, getRevenueForPreviousMonth, calcularProgressoMeta, contabilizeImportedTransaction,
    executeTransaction, updateBill, deleteBill, exportData, importData,
    addCreditCardConfig, addEmprestimo, addImovel, addMetaPersonalizada, addPurchaseInstallments, addStandardizationRule, addTerreno, addVeiculo,
    calculateLoanAmortizationAndInterest, calculateLoanPrincipalDueInNextMonths, deleteCreditCardConfig, deleteImovel, deleteImportedStatement,
    deleteMetaPersonalizada, deleteStandardizationRule, deleteTerreno, markLoanParcelPaid, markSeguroParcelPaid, metasPersonalizadas,
    uncontabilizeImportedTransaction, deleteImportedTransaction, updateImportedTransactionDraft, uncontabilizeTransactionsBatch, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, updateCreditCardConfig, updateEmprestimo, updateImovel,
    updateImportedStatement, updateMetaPersonalizada, updateStandardizationRule, updateTerreno
  ]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) throw new Error("useFinance deve ser usado dentro de um FinanceProvider");
  return context;
}