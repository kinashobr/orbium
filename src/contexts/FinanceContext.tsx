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
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format, isWithinInterval } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

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
  updateObjetivo: (id: number, obj: Partial<ObjetivoFinanceiro>) => void;
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
  }) => void;
  getBillsForMonth: (date: Date) => BillTracker[];
  getPotentialFixedBillsForMonth: (date: Date, localBills: BillTracker[]) => PotentialFixedBill[];
  getFutureFixedBills: (referenceDate: Date, localBills: BillTracker[]) => PotentialFixedBill[];
  getOtherPaidExpensesForMonth: (date: Date) => ExternalPaidBill[];
  
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
  updateStandardizationRule: (id: string, updates: Partial<StandardizationRule>) => void; // ADDED
  deleteStandardizationRule: (id: string) => void;
  
  // Imported Statements
  importedStatements: ImportedStatement[];
  processStatementFile: (file: File, accountId: string) => Promise<{ success: boolean; message: string }>;
  deleteImportedStatement: (statementId: string) => void;
  getTransactionsForReview: (accountId: string, range: DateRange) => ImportedTransaction[];
  updateImportedStatement: (statementId: string, updates: Partial<ImportedStatement>) => void;
  uncontabilizeImportedTransaction: (transactionId: string) => void;
  
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
  getValorImoveisTerrenos: (targetDate?: Date) => number; // NOVO
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
  LAST_MODIFIED: "fin_last_modified_v1", // NOVO
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
const initialLastModified = new Date(0).toISOString(); // Ponto de partida

const defaultAlertStartDate = subMonths(new Date(), 6).toISOString().split('T')[0];

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
                from: ranges.range1.from?.toISOString().split('T')[0],
                to: ranges.range1.to?.toISOString().split('T')[0],
            },
            range2: {
                from: ranges.range2.from?.toISOString().split('T')[0],
                to: ranges.range2.to?.toISOString().split('T')[0],
            },
        } as unknown as T;
    }
    localStorage.setItem(key, JSON.stringify(dataToStore));
  } catch (error) {
    console.error(`Erro ao salvar ${key}:`, error);
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>(() => loadFromStorage(STORAGE_KEYS.EMPRESTIMOS, initialEmprestimos));
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => loadFromStorage(STORAGE_KEYS.VEICULOS, initialVeiculos));
  const [imoveis, setImoveis] = useState<Imovel[]>(() => loadFromStorage(STORAGE_KEYS.IMOVEIS, initialImoveis)); // NOVO
  const [terrenos, setTerrenos] = useState<Terreno[]>(() => loadFromStorage(STORAGE_KEYS.TERRENOS, initialTerrenos)); // NOVO
  const [segurosVeiculo, setSegurosVeiculo] = useState<SeguroVeiculo[]>(() => loadFromStorage(STORAGE_KEYS.SEGUROS_VEICULO, initialSegurosVeiculo));
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>(() => loadFromStorage(STORAGE_KEYS.OBJETIVOS, initialObjetivos));
  const [billsTracker, setBillsTracker] = useState<BillTracker[]>(() => loadFromStorage(STORAGE_KEYS.BILLS_TRACKER, initialBillsTracker));
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => loadFromStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, DEFAULT_ACCOUNTS));
  const [categoriasV2, setCategoriasV2] = useState<Categoria[]>(() => loadFromStorage(STORAGE_KEYS.CATEGORIAS_V2, DEFAULT_CATEGORIES));
  const [transacoesV2, setTransacoesV2] = useState<TransacaoCompleta[]>(() => loadFromStorage(STORAGE_KEYS.TRANSACOES_V2, []));
  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(() => loadFromStorage(STORAGE_KEYS.STANDARDIZATION_RULES, initialStandardizationRules));
  const [importedStatements, setImportedStatements] = useState<ImportedStatement[]>(() => loadFromStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, initialImportedStatements));
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(() => loadFromStorage(STORAGE_KEYS.DATE_RANGES, DEFAULT_RANGES));
  const [alertStartDate, setAlertStartDate] = useState<string>(() => loadFromStorage(STORAGE_KEYS.ALERT_START_DATE, defaultAlertStartDate));
  const [revenueForecasts, setRevenueForecasts] = useState<Record<string, number>>(() => loadFromStorage(STORAGE_KEYS.REVENUE_FORECASTS, {}));
  const [metasPersonalizadas, setMetasPersonalizadas] = useState<MetaPersonalizada[]>(() => loadFromStorage(STORAGE_KEYS.METAS_PERSONALIZADAS, initialMetasPersonalizadas));
  const [lastModified, setLastModified] = useState<string>(() => loadFromStorage(STORAGE_KEYS.LAST_MODIFIED, initialLastModified)); // NOVO

  // Função para atualizar o timestamp de última modificação
  const updateLastModified = useCallback(() => {
    const now = new Date().toISOString();
    setLastModified(now);
    saveToStorage(STORAGE_KEYS.LAST_MODIFIED, now);
  }, []);

  // Efeitos para persistência e atualização do timestamp
  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); updateLastModified(); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); updateLastModified(); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.IMOVEIS, imoveis); updateLastModified(); }, [imoveis]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TERRENOS, terrenos); updateLastModified(); }, [terrenos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); updateLastModified(); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); updateLastModified(); }, [objetivos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BILLS_TRACKER, billsTracker); updateLastModified(); }, [billsTracker]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.STANDARDIZATION_RULES, standardizationRules); updateLastModified(); }, [standardizationRules]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, importedStatements); updateLastModified(); }, [importedStatements]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.DATE_RANGES, dateRanges); }, [dateRanges]); // Não altera o lastModified
  useEffect(() => { saveToStorage(STORAGE_KEYS.ALERT_START_DATE, alertStartDate); }, [alertStartDate]); // Não altera o lastModified
  useEffect(() => { saveToStorage(STORAGE_KEYS.REVENUE_FORECASTS, revenueForecasts); }, [revenueForecasts]); // Não altera o lastModified
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); updateLastModified(); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); updateLastModified(); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); updateLastModified(); }, [transacoesV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.METAS_PERSONALIZADAS, metasPersonalizadas); updateLastModified(); }, [metasPersonalizadas]);

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
        accountBalances[account.id] = account.initialBalance; // Use initialBalance from account
    });
    sortedTransactions.forEach(t => {
        const account = contasMovimento.find(a => a.id === t.accountId);
        if (!account) return;
        const dateKey = t.date;
        const isCreditCard = account.accountType === 'cartao_credito';
        let amountChange = 0;
        if (isCreditCard) {
            // CC: Despesa (out) aumenta o saldo devedor (negativo), Receita (in) diminui o saldo devedor (positivo)
            if (t.flow === 'out') amountChange = -t.amount;
            else if (t.flow === 'in') amountChange = t.amount;
        } else {
            // Contas normais: In aumenta, Out diminui
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
    
    // Optimization: Check cache for the exact date
    if (balanceCache.has(`${accountId}_${targetDateStr}`)) {
        return balanceCache.get(`${accountId}_${targetDateStr}`)!;
    }

    // Fallback: Calculate manually if not in cache (should only happen for dates not matching a transaction date)
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
            if (t.flow === 'out') amountChange = -t.amount;
            else if (t.flow === 'in') amountChange = t.amount;
        } else {
            if (t.flow === 'in' || t.flow === 'transfer_in') amountChange = t.amount;
            else amountChange = -t.amount;
        }
        balance += amountChange;
    });

    return balance;
  }, [balanceCache, contasMovimento]);

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
  
  const uncontabilizeImportedTransaction = useCallback((transactionId: string) => {
    setTransacoesV2(prev => prev.filter(t => t.id !== transactionId));
    setImportedStatements(prev => prev.map(s => {
        let updated = false;
        const newRawTransactions = s.rawTransactions.map(t => {
            if (t.contabilizedTransactionId === transactionId) {
                updated = true;
                // Reset fields to allow re-categorization
                return { ...t, isContabilized: false, contabilizedTransactionId: undefined, categoryId: null, operationType: null, description: t.originalDescription, isTransfer: false, destinationAccountId: null, tempInvestmentId: null, tempLoanId: null, tempParcelaId: null, tempVehicleOperation: null };
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
    if (!range.from || !range.to) return allRawTransactions;
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    let filteredTxs = allRawTransactions.filter(t => isWithinInterval(parseDateLocal(t.date), { start: rangeFrom, end: rangeTo }));
    filteredTxs = applyRules(filteredTxs, standardizationRules);
    return filteredTxs.map(importedTx => {
        const isDuplicate = transacoesV2.find(manualTx => 
            manualTx.accountId === importedTx.accountId && Math.abs(manualTx.amount - importedTx.amount) < 0.01 &&
            Math.abs(differenceInDays(parseDateLocal(importedTx.date), parseDateLocal(manualTx.date))) <= 1 &&
            manualTx.operationType !== 'initial_balance'
        );
        if (isDuplicate) return { ...importedTx, isPotentialDuplicate: true, duplicateOfTxId: isDuplicate.id, operationType: isDuplicate.operationType, categoryId: isDuplicate.categoryId, description: isDuplicate.description };
        return importedTx;
    });
  }, [importedStatements, transacoesV2, standardizationRules, applyRules]);

  const addPurchaseInstallments = useCallback((data: any) => {
    const { description, totalAmount, installments, firstDueDate, suggestedAccountId, suggestedCategoryId } = data;
    const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
    const purchaseGroupId = `purchase_${Date.now()}`;
    const newBills: BillTracker[] = [];
    for (let i = 1; i <= installments; i++) {
        const dueDate = getDueDate(firstDueDate, i);
        newBills.push({
            id: generateBillId(), type: 'tracker', description: `${description} (${i}/${installments})`,
            dueDate: format(dueDate, 'yyyy-MM-dd'), expectedAmount: i === installments ? totalAmount - (installmentAmount * (installments - 1)) : installmentAmount,
            isPaid: false, sourceType: 'purchase_installment', sourceRef: purchaseGroupId, parcelaNumber: i, totalInstallments: installments, suggestedAccountId, suggestedCategoryId, isExcluded: false,
        });
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
    const isBillIncluded = (sourceType: BillSourceType, sourceRef: string, parcelaNumber: number) => localBills.some(b => b.sourceType === sourceType && b.sourceRef === sourceRef && b.parcelaNumber === parcelaNumber && !b.isExcluded);
    emprestimos.filter(e => e.status === 'ativo').forEach(loan => {
        if (!loan.dataInicio) return;
        calculateLoanSchedule(loan.id).forEach(item => {
            const dueDate = getDueDate(loan.dataInicio!, item.parcela);
            if (isAfter(dueDate, referenceMonthEnd)) {
                futureBills.push({ key: `loan_${loan.id}_${item.parcela}`, sourceType: 'loan_installment', sourceRef: String(loan.id), parcelaNumber: item.parcela, dueDate: format(dueDate, 'yyyy-MM-dd'), expectedAmount: loan.parcela, description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`, isPaid: false, isIncluded: isBillIncluded('loan_installment', String(loan.id), item.parcela) });
            }
        });
    });
    return futureBills.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [emprestimos, calculateLoanSchedule]);
  
  const getOtherPaidExpensesForMonth = useCallback((date: Date): ExternalPaidBill[] => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const trackerTxIds = new Set(billsTracker.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
    return transacoesV2.filter(t => {
        const transactionDate = parseDateLocal(t.date);
        return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd }) && (t.flow === 'out' || t.flow === 'transfer_out') && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo' || t.operationType === 'veiculo') && (t.meta.source !== 'import' || t.conciliated) && !trackerTxIds.has(t.id) && t.meta.source !== 'bill_tracker';
    }).map(t => ({ id: t.id, type: 'external_paid', dueDate: t.date, paymentDate: t.date, expectedAmount: t.amount, description: t.description, suggestedAccountId: t.accountId, suggestedCategoryId: t.categoryId, sourceType: 'external_expense', isPaid: true, isExcluded: false }));
  }, [billsTracker, transacoesV2]);

  const addEmprestimo = (emprestimo: Omit<Emprestimo, "id">) => {
    const newId = Math.max(0, ...emprestimos.map(e => e.id)) + 1;
    setEmprestimos([...emprestimos, { ...emprestimo, id: newId, status: emprestimo.status || 'ativo', parcelasPagas: 0 }]);
  };

  const updateEmprestimo = (id: number, updates: Partial<Emprestimo>) => {
    setEmprestimos(emprestimos.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addVeiculo = (veiculo: Omit<Veiculo, "id">) => {
    const newId = Math.max(0, ...veiculos.map(v => v.id)) + 1;
    setVeiculos([...veiculos, { ...veiculo, id: newId, status: veiculo.status || 'ativo' }]);
  };
  
  const addImovel = (imovel: Omit<Imovel, "id">) => { // NOVO
    const newId = generateImovelId();
    setImoveis([...imoveis, { ...imovel, id: newId, status: imovel.status || 'ativo' }]);
  };
  
  const updateImovel = (id: number, updates: Partial<Imovel>) => { // NOVO
    setImoveis(imoveis.map(i => i.id === id ? { ...i, ...updates } : i));
  };
  
  const deleteImovel = (id: number) => { // NOVO
    setImoveis(imoveis.filter(i => i.id !== id));
  };
  
  const addTerreno = (terreno: Omit<Terreno, "id">) => { // NOVO
    const newId = generateTerrenoId();
    setTerrenos([...terrenos, { ...terreno, id: newId, status: terreno.status || 'ativo' }]);
  };
  
  const updateTerreno = (id: number, updates: Partial<Terreno>) => { // NOVO
    setTerrenos(terrenos.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  
  const deleteTerreno = (id: number) => { // NOVO
    setTerrenos(terrenos.filter(t => t.id !== id));
  };

  const addTransacaoV2 = (transaction: TransacaoCompleta) => { setTransacoesV2(prev => [...prev, transaction]); };
  
  const addStandardizationRule = useCallback((rule: Omit<StandardizationRule, "id">) => {
    setStandardizationRules(prev => [...prev, { ...rule, id: generateRuleId() }]);
  }, []);

  const updateStandardizationRule = useCallback((id: string, updates: Partial<StandardizationRule>) => {
    setStandardizationRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteStandardizationRule = useCallback((id: string) => {
    setStandardizationRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const getValorImoveisTerrenos = useCallback((targetDate?: Date) => { // NOVO
    const date = targetDate || new Date(9999, 11, 31);
    const imoveisValor = imoveis.filter(i => i.status === 'ativo' && parseDateLocal(i.dataAquisicao) <= date).reduce((acc, i) => acc + i.valorAvaliacao, 0);
    const terrenosValor = terrenos.filter(t => t.status === 'ativo' && parseDateLocal(t.dataAquisicao) <= date).reduce((acc, t) => acc + t.valorAvaliacao, 0);
    return imoveisValor + terrenosValor;
  }, [imoveis, terrenos]);

  const getAtivosTotal = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    const saldoContas = contasMovimento.filter(c => c.accountType !== 'cartao_credito').reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento)), 0);
    return saldoContas + veiculos.filter(v => v.status !== 'vendido' && parseDateLocal(v.dataCompra) <= date).reduce((acc, v) => acc + v.valorFipe, 0) + getSegurosAApropriar(date) + getValorImoveisTerrenos(date); // Adicionado Imóveis/Terrenos
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
    return saldoEmprestimos + saldoCartoes + getSegurosAPagar(date);
  }, [emprestimos, contasMovimento, transacoesV2, calculatePaidInstallmentsUpToDate, calculateLoanSchedule, getSegurosAPagar, calculateBalanceUpToDate]);

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

  const exportData = () => {
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
      },
      lastModified: lastModified, // Incluindo o timestamp local
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
  };

  const importData = async (file: File) => {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      if (data.schemaVersion !== '2.0') {
        return { success: false, message: "Schema incompatível." };
      }
      
      // Removida a checagem restritiva de timestamp para permitir a restauração manual

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
      
      // Atualiza o lastModified local para o valor importado ou agora
      const newTimestamp = data.lastModified || new Date().toISOString();
      setLastModified(newTimestamp);
      saveToStorage(STORAGE_KEYS.LAST_MODIFIED, newTimestamp);

      return { success: true, message: "Dados importados com sucesso!" };
    } catch (e) { 
      console.error("Erro durante a importação:", e);
      return { success: false, message: "Erro ao importar. Verifique se o arquivo está no formato correto." }; 
    }
  };

  const markLoanParcelPaid = useCallback((loanId: number, valorPago: number, dataPagamento: string, parcelaNumber?: number) => {
    setEmprestimos(prevLoans => prevLoans.map(loan => {
      if (loan.id !== loanId) return loan;
      
      const newParcelasPagas = loan.parcelasPagas || 0;
      
      let targetParcelaNumber = parcelaNumber;
      if (!targetParcelaNumber) {
          targetParcelaNumber = newParcelasPagas + 1;
      }
      
      const updatedParcelasPagas = targetParcelaNumber === newParcelasPagas + 1 ? newParcelasPagas + 1 : newParcelasPagas;

      return {
        ...loan,
        parcelasPagas: updatedParcelasPagas,
      };
    }));
  }, [setEmprestimos]);

  const unmarkLoanParcelPaid = useCallback((loanId: number) => {
    setEmprestimos(prevLoans => prevLoans.map(loan => {
      if (loan.id !== loanId) return loan;
      return {
        ...loan,
        parcelasPagas: Math.max(0, (loan.parcelasPagas || 0) - 1),
      };
    }));
  }, [setEmprestimos]);

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
  }, [setSegurosVeiculo]);

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
  }, [setSegurosVeiculo]);

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
        } catch {
          return false;
        }
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesV2]);

  const updateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    setBillsTracker(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBillsTracker(prev => prev.filter(b => b.id !== id));
  }, []);

  // Metas Personalizadas CRUD
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
    
    // Determinar período de análise
    let txsPeriodo = transacoesV2;
    if (meta.periodoAvaliacao === 'mensal') {
      txsPeriodo = transacoesV2.filter(t => isSameMonth(parseDateLocal(t.date), now));
    } else if (meta.periodoAvaliacao === 'trimestral') {
      const threeMonthsAgo = subMonths(now, 3);
      txsPeriodo = transacoesV2.filter(t => {
        const txDate = parseDateLocal(t.date);
        return txDate >= threeMonthsAgo && txDate <= now;
      });
    } else if (meta.periodoAvaliacao === 'anual') {
      txsPeriodo = transacoesV2.filter(t => isSameYear(parseDateLocal(t.date), now));
    }

    // Calcular valor atual baseado na métrica
    switch (meta.metrica) {
      case 'receita':
        valorAtual = txsPeriodo.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
        break;
      case 'despesa':
        valorAtual = txsPeriodo.filter(t => t.flow === 'out').reduce((a, t) => a + t.amount, 0);
        break;
      case 'investimento':
        valorAtual = txsPeriodo.filter(t => t.operationType === 'aplicacao').reduce((a, t) => a + t.amount, 0);
        break;
      case 'saldo':
        valorAtual = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType)).reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, now, transacoesV2, contasMovimento), 0);
        break;
      case 'patrimonio':
        valorAtual = getAtivosTotal(now) - getPassivosTotal(now);
        break;
      case 'categoria_especifica':
        if (meta.categoriaId) {
          valorAtual = txsPeriodo.filter(t => t.categoryId === meta.categoriaId).reduce((a, t) => a + t.amount, 0);
        }
        break;
    }

    // Para economia, calcular percentual
    if (meta.tipo === 'economia') {
      const receitas = txsPeriodo.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((a, t) => a + t.amount, 0);
      const despesas = txsPeriodo.filter(t => t.flow === 'out').reduce((a, t) => a + t.amount, 0);
      valorAtual = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;
    }

    // Calcular percentual de progresso
    let percentual = meta.valorAlvo > 0 ? (valorAtual / meta.valorAlvo) * 100 : 0;
    percentual = Math.min(percentual, 200); // Cap at 200%

    // Determinar status
    let status: 'sucesso' | 'alerta' | 'perigo' | 'neutro' = 'neutro';
    if (meta.logica === 'maior_melhor') {
      if (percentual >= 100) status = 'sucesso';
      else if (percentual >= 70) status = 'alerta';
      else status = 'perigo';
    } else { // menor_melhor
      if (percentual <= 80) status = 'sucesso';
      else if (percentual <= 100) status = 'alerta';
      else status = 'perigo';
    }

    return { valorAtual, percentual, status };
  }, [transacoesV2, contasMovimento, calculateBalanceUpToDate, getAtivosTotal, getPassivosTotal]);

  const value = {
    emprestimos, addEmprestimo, updateEmprestimo, deleteEmprestimo: (id: number) => setEmprestimos(p => p.filter(e => e.id !== id)), getPendingLoans: () => emprestimos.filter(e => e.status === 'pendente_config'), markLoanParcelPaid, unmarkLoanParcelPaid, calculateLoanSchedule, calculateLoanAmortizationAndInterest, calculateLoanPrincipalDueInNextMonths,
    veiculos, addVeiculo, updateVeiculo: (id: number, u: any) => setVeiculos(p => p.map(v => v.id === id ? { ...v, ...u } : v)), deleteVeiculo: (id: number) => setVeiculos(p => p.filter(v => v.id !== id)), getPendingVehicles: () => veiculos.filter(v => v.status === 'pendente_cadastro'),
    imoveis, addImovel, updateImovel, deleteImovel,
    terrenos, addTerreno, updateTerreno, deleteTerreno,
    segurosVeiculo, addSeguroVeiculo: (s: any) => setSegurosVeiculo(p => [...p, { ...s, id: Math.max(0, ...p.map(x => x.id)) + 1 }]), updateSeguroVeiculo: (id: number, s: any) => setSegurosVeiculo(p => p.map(x => x.id === id ? { ...x, ...s } : x)), deleteSeguroVeiculo: (id: number) => setSegurosVeiculo(p => p.filter(x => x.id !== id)), markSeguroParcelPaid, unmarkSeguroParcelPaid,
    objetivos, addObjetivo: (o: any) => setObjetivos(p => [...p, { ...o, id: Math.max(0, ...p.map(x => x.id)) + 1 }]), updateObjetivo: (id: number, o: any) => setObjetivos(p => p.map(x => x.id === id ? { ...x, ...o } : x)), deleteObjetivo: (id: number) => setObjetivos(p => p.filter(x => x.id !== id)),
    billsTracker, setBillsTracker, updateBill, deleteBill, addPurchaseInstallments, getBillsForMonth, getPotentialFixedBillsForMonth, getFutureFixedBills, getOtherPaidExpensesForMonth,
    contasMovimento, setContasMovimento, getContasCorrentesTipo: () => contasMovimento.filter(c => c.accountType === 'corrente'),
    categoriasV2, setCategoriasV2, transacoesV2, setTransacoesV2, addTransacaoV2,
    standardizationRules, addStandardizationRule, updateStandardizationRule, deleteStandardizationRule,
    importedStatements, processStatementFile, deleteImportedStatement, getTransactionsForReview, updateImportedStatement, uncontabilizeImportedTransaction,
    dateRanges, setDateRanges, alertStartDate, setAlertStartDate, revenueForecasts, setMonthlyRevenueForecast: (k: string, v: number) => setRevenueForecasts(p => ({ ...p, [k]: v })), getRevenueForPreviousMonth,
    getTotalReceitas: (m?: string) => transacoesV2.filter(t => (t.operationType === 'receita' || t.operationType === 'rendimento') && (!m || t.date.startsWith(m))).reduce((a, t) => a + t.amount, 0),
    getTotalDespesas: (m?: string) => transacoesV2.filter(t => (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && (!m || t.date.startsWith(m))).reduce((a, t) => a + t.amount, 0),
    getTotalDividas: () => emprestimos.reduce((a, e) => a + e.valorTotal, 0), getCustoVeiculos: () => veiculos.filter(v => v.status !== 'vendido').reduce((a, v) => a + v.valorSeguro, 0), getSaldoAtual: () => contasMovimento.reduce((a, c) => a + calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento), 0),
    getValorFipeTotal, getValorImoveisTerrenos, getSaldoDevedor: (d?: Date) => getLoanPrincipalRemaining(d) + getCreditCardDebt(d), getLoanPrincipalRemaining, getCreditCardDebt, getJurosTotais, getDespesasFixas,
    getPatrimonioLiquido: (d?: Date) => getAtivosTotal(d) - getPassivosTotal(d), getAtivosTotal, getPassivosTotal, getSegurosAApropriar, getSegurosAPagar,
    calculateBalanceUpToDate, calculateTotalInvestmentBalanceAtDate, calculatePaidInstallmentsUpToDate,
    metasPersonalizadas, addMetaPersonalizada, updateMetaPersonalizada, deleteMetaPersonalizada, calcularProgressoMeta,
    lastModified,
    exportData, importData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) throw new Error("useFinance deve ser usado dentro de um FinanceProvider");
  return context;
}