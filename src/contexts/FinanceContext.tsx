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
} from "@/types/finance";
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
  contabilizeImportedTransaction: (statementId: string, transactionId: string, data: Partial<ImportedTransaction>) => void;
  uncontabilizeImportedTransaction: (transactionId: string) => void;
  
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

  // Controle de Versão
  lastModified: string;
  
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
const initialLastModified = new Date(0).toISOString();

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
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
  const [lastModified, setLastModified] = useState<string>(() => loadFromStorage(STORAGE_KEYS.LAST_MODIFIED, initialLastModified));

  const updateLastModified = useCallback(() => {
    const now = new Date().toISOString();
    setLastModified(now);
    saveToStorage(STORAGE_KEYS.LAST_MODIFIED, now);
  }, []);

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
          updatedTx.categoryId = rule.categoryId;
          updatedTx.operationType = rule.operationType;
          updatedTx.description = rule.descriptionTemplate;
          updatedTx.isTransfer = rule.operationType === 'transferencia';
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
      const dates = processedTransactions.map(t => parseDateLocal(t.date)).sort((a, b) => a.getTime() - b.getTime());
      const startDate = dates[0] ? format(dates[0], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const endDate = dates[dates.length - 1] ? format(dates[dates.length - 1], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const newStatement: ImportedStatement = {
          id: generateStatementId(), accountId, fileName: file.name, importDate: new Date().toISOString(),
          startDate, endDate, status: 'pending', rawTransactions: processedTransactions,
      };
      setImportedStatements(prev => [...prev, newStatement]);
      return { success: true, message: `${processedTransactions.length} transações carregadas.` };
    } catch (e: any) { return { success: false, message: e.message || "Erro ao processar o arquivo." }; }
  }, [standardizationRules, applyRules]);

  const deleteImportedStatement = useCallback((statementId: string) => {
    setImportedStatements(prev => prev.filter(s => s.id !== statementId));
  }, []);
  
  const updateImportedStatement = useCallback((statementId: string, updates: Partial<ImportedStatement>) => {
    setImportedStatements(prev => prev.map(s => s.id === statementId ? { ...s, ...updates } : s));
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
    const matchingBill = billsTracker.find(b =>
      !b.isPaid &&
      Math.abs(b.expectedAmount - amount) < 2 &&
      isSameMonth(parseDateLocal(b.dueDate), parseDateLocal(transaction.date)) &&
      (b.description.toLowerCase().includes(transaction.description.toLowerCase()) ||
       transaction.description.toLowerCase().includes(b.description.toLowerCase()))
    );

    if (matchingBill) {
      updateBill(matchingBill.id, {
        isPaid: true,
        paymentDate: transaction.date,
        transactionId: links.transferGroupId || transaction.id
      });
      toast.info(`Vínculo automático com conta pendente: "${matchingBill.description}"`);
    }

    // 4. Persistir transações
    setTransacoesV2(prev => [...prev, transaction, ...counterpartTxs]);
    toast.success(counterpartTxs.length > 0 ? "Lançamento de partida dobrada realizado." : "Transação registrada com sucesso.");
  }, [billsTracker, updateBill, veiculos]);
  
  const uncontabilizeImportedTransaction = useCallback((transactionId: string) => {
    setTransacoesV2(prev => prev.filter(t => t.id !== transactionId));
    setImportedStatements(prev => prev.map(s => {
        let updated = false;
        const newRawTransactions = s.rawTransactions.map(t => {
                if (t.contabilizedTransactionId === transactionId) {
		        updated = true;
		        return {
		        	...t,
		        	isContabilized: false,
		        	contabilizedTransactionId: undefined,
		        	categoryId: null,
		        	operationType: null,
		        	description: t.originalDescription,
		        	isTransfer: false,
		        	destinationAccountId: null,
		        	tempInvestmentId: null,
		        	tempLoanId: null,
		        	tempParcelaId: null,
		        	tempVehicleOperation: null,
		        	tempAssetType: undefined,
		        	tempAssetOperation: undefined,
		        	tempAssetId: undefined,
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
  }, [setTransacoesV2]);
  
  const getTransactionsForReview = useCallback((accountId: string, range: DateRange): ImportedTransaction[] => {
    const allRawTransactions: ImportedTransaction[] = [];
    importedStatements.filter(s => s.accountId === accountId).forEach(s => {
        s.rawTransactions.filter(t => !t.isContabilized).forEach(t => allRawTransactions.push(t));
    });
    
    // Identificar se a conta é de cartão de crédito
    const targetAccount = contasMovimento.find(acc => acc.id === accountId);
    const isCreditCardAccount = targetAccount?.accountType === 'cartao_credito';

    if (!range.from || !range.to) return allRawTransactions;
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    
    let filteredTxs = allRawTransactions.filter(t => isWithinInterval(parseDateLocal(t.date), { start: rangeFrom, end: rangeTo }));
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
                potentialBills.push({ key: `loan_${loan.id}_${item.parcela}`, sourceType: 'loan_installment', sourceRef: String(loan.id), parcelaNumber: item.parcela, dueDate: format(dueDate, 'yyyy-MM-dd'), expectedAmount: loan.parcela, description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`, isPaid: transacoesV2.some(t => t.links?.loanId === `loan_${loan.id}` && t.links?.parcelaId === String(item.parcela)), isIncluded: isBillIncluded('loan_installment', String(loan.id), item.parcela) });
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
                futureBills.push({
                    key: `loan_${loan.id}_${item.parcela}`,
                    sourceType: 'loan_installment',
                    sourceRef: String(loan.id),
                    parcelaNumber: item.parcela,
                    dueDate: format(dueDate, 'yyyy-MM-dd'),
                    expectedAmount: loan.parcela,
                    description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`,
                    isPaid: transacoesV2.some(t => t.links?.loanId === `loan_${loan.id}` && t.links?.parcelaId === String(item.parcela)),
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
    const creditCardAccountIds = new Set(
      contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id)
    );
    return transacoesV2.filter(t => {
        const transactionDate = parseDateLocal(t.date);
        return (
          isWithinInterval(transactionDate, { start: monthStart, end: monthEnd }) &&
          (t.flow === 'out' || t.flow === 'transfer_out') &&
          (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo' || t.operationType === 'veiculo' || t.operationType === 'imobilizado' || t.operationType === 'transferencia') &&
          (t.meta.source !== 'import' || t.conciliated) &&
          !trackerTxIds.has(t.id) &&
          t.meta.source !== 'bill_tracker' &&
          !creditCardAccountIds.has(t.accountId)
        );
    }).map(t => ({ id: t.id, type: 'external_paid', dueDate: t.date, paymentDate: t.date, expectedAmount: t.amount, description: t.description, suggestedAccountId: t.accountId, suggestedCategoryId: t.categoryId, sourceType: 'external_expense', isPaid: true, isExcluded: false }));
  }, [billsTracker, transacoesV2, contasMovimento]);

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
      },
      lastModified: lastModified,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  }, [contasMovimento, categoriasV2, transacoesV2, emprestimos, veiculos, segurosVeiculo, objetivos, billsTracker, standardizationRules, importedStatements, revenueForecasts, alertStartDate, imoveis, terrenos, metasPersonalizadas, creditCardConfigs, cltContracts, cltCompetencias, lastModified]);

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
      const newTimestamp = data.lastModified || new Date().toISOString();
      setLastModified(newTimestamp);
      saveToStorage(STORAGE_KEYS.LAST_MODIFIED, newTimestamp);
      return { success: true, message: "Dados importados com sucesso!" };
    } catch (e) { 
      return { success: false, message: "Erro ao importar." }; 
    }
  }, []);

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
    
    return Math.round(rawAmount * 100) / 100;
  }, [creditCardConfigs, transacoesV2]);

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
    
    return Math.round(rawAmount * 100) / 100;
  }, [creditCardConfigs, transacoesV2]);

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
    
    return Math.round(rawAmount * 100) / 100;
  }, [creditCardConfigs, transacoesV2]);

  const getCardCycleTransactions = useCallback((cardId: string, monthDate: Date) => {
    const config = creditCardConfigs.find(c => c.id === cardId);
    if (!config) return [];
    const closingDay = config.closingDay;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const currentClosing = new Date(year, month, Math.min(closingDay, new Date(year, month + 1, 0).getDate()));
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevClosing = new Date(prevYear, prevMonth, Math.min(closingDay, new Date(prevYear, prevMonth + 1, 0).getDate()));
    return transacoesV2
      .filter(t => t.accountId === config.accountId && t.flow === 'out' && parseDateLocal(t.date) > prevClosing && parseDateLocal(t.date) <= currentClosing)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [creditCardConfigs, transacoesV2]);

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
    importedStatements, processStatementFile, deleteImportedStatement, getTransactionsForReview, updateImportedStatement, contabilizeImportedTransaction, uncontabilizeImportedTransaction,
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
    deleteCltContract: (id: string) => setCltContracts(p => p.filter(c => c.id !== id)),
    cltCompetencias,
    addCltCompetencia: (c: CltCompetencia) => setCltCompetencias(p => [...p, c]),
    updateCltCompetencia: (id: string, u: Partial<CltCompetencia>) => setCltCompetencias(p => p.map(c => c.id === id ? { ...c, ...u } : c)),
    deleteCltCompetenciasByContract: (contractId: string) => setCltCompetencias(p => p.filter(c => c.contractId !== contractId)),
    cltLegislacaoConfigs,
    addCltLegislacaoConfig: (c: CltLegislacaoConfig) => setCltLegislacaoConfigs(p => [...p, c]),
    updateCltLegislacaoConfig: (id: string, u: Partial<CltLegislacaoConfig>) => setCltLegislacaoConfigs(p => p.map(c => c.id === id ? { ...c, ...u } : c)),
    deleteCltLegislacaoConfig: (id: string) => setCltLegislacaoConfigs(p => p.filter(c => c.id !== id)),

    lastModified,
    exportData, importData,
  }), [
    emprestimos, veiculos, imoveis, terrenos, segurosVeiculo, objetivos, billsTracker, creditCardConfigs, cltContracts, cltCompetencias, cltLegislacaoConfigs,
    
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
    uncontabilizeImportedTransaction, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, updateCreditCardConfig, updateEmprestimo, updateImovel,
    updateImportedStatement, updateMetaPersonalizada, updateStandardizationRule, updateTerreno
  ]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) throw new Error("useFinance deve ser usado dentro de um FinanceProvider");
  return context;
}