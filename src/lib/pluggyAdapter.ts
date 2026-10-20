import { 
  ImportedTransaction, 
  ImportedStatement, 
  StandardizationRule, 
  generateStatementId,
  TransacaoCompleta,
  generateTransactionId,
  OperationType,
  FlowType,
  BillTracker,
  CreditCardConfig
} from "@/types/finance";
import { PluggyTransaction, DetectedCardInstallment } from "@/types/pluggy";
import { format, isAfter, endOfMonth } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

/**
 * Verifica se a descrição da transação de cartão refere-se a um pagamento de fatura / crédito de fatura.
 */
export function isCardInvoicePayment(description?: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase().trim();
  return lower.includes('pagamento de fatura') || 
         lower.includes('credit card payment') || 
         lower.includes('pgto fatura') || 
         lower.includes('pagamento de cartao') ||
         lower.includes('fatura paga') ||
         lower.includes('pagamento recebido') ||
         lower.includes('pgto recebido') ||
         lower.includes('pagamento efetuado') ||
         lower.includes('credito fatura');
}

export interface ParsedInstallmentInfo {
  isInstallment: boolean;
  cleanDescription: string;
  currentInstallment: number;
  totalInstallments: number;
}

/**
 * Detecta padrões de parcelamento em compras no cartão (ex: 'On Fitness 3/6', 'Mapfre*Pcl11de12', 'Loja 2 de 10').
 */
export function parseInstallmentPattern(description?: string): ParsedInstallmentInfo {
  if (!description) {
    return { isInstallment: false, cleanDescription: '', currentInstallment: 1, totalInstallments: 1 };
  }
  const desc = description.trim();

  // Pattern 1: Pcl 11 de 12 ou Pcl11de12 ou Pcl 11/12 ou Parcela 11 de 12 (ex: Mapfre*Pcl11de12)
  const pclMatch = desc.match(/(?:[*\s-]|^)(?:pcl|parcela)\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\b/i);
  if (pclMatch) {
    const cur = parseInt(pclMatch[1], 10);
    const tot = parseInt(pclMatch[2], 10);
    if (!isNaN(cur) && !isNaN(tot) && tot > 1) {
      const clean = desc.replace(pclMatch[0], '').replace(/[*\s-]+$/, '').replace(/^[*\s-]+/, '').trim();
      return {
        isInstallment: true,
        cleanDescription: clean || desc,
        currentInstallment: cur,
        totalInstallments: tot,
      };
    }
  }

  // Pattern 2: 6/6, 3/6, 1/3 (ex: On Fitness 6/6, Manual Saude Brasil 1/3)
  const slashMatch = desc.match(/(?:[*\s-]|^)(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  if (slashMatch) {
    const cur = parseInt(slashMatch[1], 10);
    const tot = parseInt(slashMatch[2], 10);
    if (!isNaN(cur) && !isNaN(tot) && tot > 1 && cur <= tot + 5) {
      const clean = desc.replace(slashMatch[0], '').replace(/[*\s-]+$/, '').replace(/^[*\s-]+/, '').trim();
      return {
        isInstallment: true,
        cleanDescription: clean || desc,
        currentInstallment: cur,
        totalInstallments: tot,
      };
    }
  }

  // Pattern 3: 1 de 12, 2 de 6
  const deMatch = desc.match(/(?:[*\s-]|^)(\d{1,2})\s+de\s+(\d{1,2})\b/i);
  if (deMatch) {
    const cur = parseInt(deMatch[1], 10);
    const tot = parseInt(deMatch[2], 10);
    if (!isNaN(cur) && !isNaN(tot) && tot > 1 && cur <= tot + 5) {
      const clean = desc.replace(deMatch[0], '').replace(/[*\s-]+$/, '').replace(/^[*\s-]+/, '').trim();
      return {
        isInstallment: true,
        cleanDescription: clean || desc,
        currentInstallment: cur,
        totalInstallments: tot,
      };
    }
  }

  return { isInstallment: false, cleanDescription: desc, currentInstallment: 1, totalInstallments: 1 };
}

/**
 * Converte uma transação da API Pluggy no formato ImportedTransaction (padrão OFX/partidas dobradas do Orbium).
 * Mantém valores absolutos para o montante, tipando 'receita' ou 'despesa' conforme fluxo contábil.
 */
export function convertPluggyTransactionToOrbium(
  tx: PluggyTransaction,
  targetAccountId: string,
  index: number = 0,
  isCreditCard: boolean = false
): ImportedTransaction {
  let rawAmount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
  const desc = (tx.description || "Transação sem descrição").trim();
  const lowerDesc = desc.toLowerCase();

  // Tratamento específico para Cartão de Crédito na API Pluggy:
  // Na Pluggy, compras no cartão costumam vir positivas (+), mas no Orbium (partidas dobradas) são saídas (despesas).
  // Pagamentos de fatura ("credit card payment", "pgto fatura", "pagamento recebido", etc.) devem ser entradas/créditos (receita).
  let isDebit = rawAmount < 0 || tx.type === 'DEBIT';
  let operationType: OperationType = 'despesa';

  const isCardPayment = isCardInvoicePayment(desc);

  if (isCreditCard) {
    if (isCardPayment) {
      // Pagamento de fatura deve ser transferência (amortização de dívida), NUNCA receita!
      operationType = 'transferencia';
      isDebit = false;
    } else {
      // Compras normais no cartão na Pluggy vêm positivas (+), mas no Orbium são despesas (saídas)
      operationType = 'despesa';
      isDebit = true;
    }
  } else {
    operationType = isDebit ? 'despesa' : 'receita';
  }

  const cleanAmount = Math.abs(rawAmount);
  
  // Normaliza data para YYYY-MM-DD
  let dateFormatted = format(new Date(), 'yyyy-MM-dd');
  if (tx.date) {
    try {
      const parsed = parseDateLocal(tx.date.substring(0, 10));
      dateFormatted = format(parsed, 'yyyy-MM-dd');
    } catch {
      dateFormatted = tx.date.substring(0, 10);
    }
  }

  const isLikelyTransfer = lowerDesc.includes('pix transf') || lowerDesc.includes('ted ') || lowerDesc.includes('doc ') || lowerDesc.includes('transferencia');

  return {
    id: `pluggy_${tx.id || `temp_${Date.now()}_${index}`}`,
    date: dateFormatted,
    amount: cleanAmount,
    originalDescription: desc,
    accountId: targetAccountId,
    categoryId: null, // Pagamento de fatura e transferências não possuem categoria de despesa/receita
    operationType,
    description: desc,
    isTransfer: isLikelyTransfer || isCardPayment,
    destinationAccountId: isCardPayment ? targetAccountId : null,
    tempInvestmentId: null,
    tempLoanId: null,
    tempParcelaId: null,
    tempVehicleOperation: null,
    sourceType: 'ofx', // Compatível com o motor OFX do sistema
    isContabilized: false,
    isPotentialDuplicate: false,
  };
}

/**
 * Converte uma transação de Cartão de Crédito da Pluggy diretamente em uma TransacaoCompleta
 * pronta para ser lançada automaticamente no Orbium.
 */
export function convertPluggyToTransacaoCompleta(
  tx: PluggyTransaction,
  targetAccountId: string,
  itemId: string,
  transferGroupId?: string
): TransacaoCompleta {
  let rawAmount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
  const desc = (tx.description || "Compra no Cartão").trim();

  const isCardPayment = isCardInvoicePayment(desc);

  // Pagamento de fatura deve ser do tipo 'transferencia' (entre contas), não 'receita'
  const operationType: OperationType = isCardPayment ? 'transferencia' : 'despesa';
  const flow: FlowType = isCardPayment ? 'in' : 'out';
  const cleanAmount = Math.abs(rawAmount);

  let dateFormatted = format(new Date(), 'yyyy-MM-dd');
  if (tx.date) {
    try {
      const parsed = parseDateLocal(tx.date.substring(0, 10));
      dateFormatted = format(parsed, 'yyyy-MM-dd');
    } catch {
      dateFormatted = tx.date.substring(0, 10);
    }
  }

  return {
    id: generateTransactionId(),
    date: dateFormatted,
    accountId: targetAccountId,
    flow,
    operationType,
    domain: 'operational',
    amount: cleanAmount,
    categoryId: null,
    description: desc,
    links: {
      pluggyTransactionId: tx.id,
      pluggyItemId: itemId,
      transferGroupId: transferGroupId || null,
    },
    conciliated: true,
    attachments: [],
    meta: {
      source: 'pluggy_open_finance',
      pluggyTransactionId: tx.id,
      pluggyItemId: itemId,
      originalAmount: rawAmount,
      isCardPayment,
    }
  };
}

/**
 * Verifica com rigor se a transação do cartão já existe no sistema para evitar duplicações em múltiplas atualizações.
 */
export function isCreditCardTransactionDuplicate(
  tx: PluggyTransaction,
  targetAccountId: string,
  existingTxs: TransacaoCompleta[]
): boolean {
  let rawAmount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
  const cleanAmount = Math.abs(rawAmount);
  let txDate = format(new Date(), 'yyyy-MM-dd');
  if (tx.date) {
    try {
      const parsed = parseDateLocal(tx.date.substring(0, 10));
      txDate = format(parsed, 'yyyy-MM-dd');
    } catch {
      txDate = tx.date.substring(0, 10);
    }
  }
  const cleanDesc = (tx.description || "").trim().toLowerCase();

  return existingTxs.some(existing => {
    // 1. Verificação por ID único da Pluggy
    if (existing.meta?.pluggyTransactionId && existing.meta.pluggyTransactionId === tx.id) {
      return true;
    }
    if (existing.links?.pluggyTransactionId && existing.links.pluggyTransactionId === tx.id) {
      return true;
    }
    // 2. Verificação composta: mesma conta + data + valor com tolerância de 1 centavo + descrição
    if (existing.accountId === targetAccountId) {
      const sameAmount = Math.abs(existing.amount - cleanAmount) < 0.01;
      const sameDate = existing.date === txDate;
      const sameDesc = existing.description.trim().toLowerCase() === cleanDesc;
      if (sameAmount && sameDate && sameDesc) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Atribui automaticamente categorias com base nas regras de padronização ativas
 * e no histórico de transações já cadastradas no sistema (transacoesV2).
 */
export function predictTransactionCategory(
  description: string,
  operationType: OperationType = 'despesa',
  existingTxs: TransacaoCompleta[] = [],
  rules: StandardizationRule[] = [],
  accountId?: string
): string | null {
  if (!description) return null;
  const descTrim = description.trim();
  const descLower = descTrim.toLowerCase();

  // 1. Regras de padronização configuradas pelo usuário
  for (const rule of rules) {
    if (rule.targetAccountId && accountId && rule.targetAccountId !== accountId) continue;
    try {
      const regex = new RegExp(rule.matchCriteria, 'i');
      if (regex.test(descTrim) && rule.assignedCategoryId) {
        return rule.assignedCategoryId;
      }
    } catch {
      // ignore
    }
  }

  // 2. Histórico de transações cadastradas no sistema
  // 2.1. Match exato ou quase exato de descrição
  const exactMatches = existingTxs.filter(t => 
    t.categoryId && 
    t.description && 
    t.description.trim().toLowerCase() === descLower
  );
  if (exactMatches.length > 0) {
    const categoryCounts: Record<string, number> = {};
    exactMatches.forEach(t => {
      if (t.categoryId) {
        categoryCounts[t.categoryId] = (categoryCounts[t.categoryId] || 0) + 1;
      }
    });
    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) return sorted[0][0];
  }

  // 2.2. Match por radical do estabelecimento (remove números de parcelas como 3/6, caracteres especiais)
  const cleanedDesc = descLower
    .replace(/\b\d{1,2}\s*[/de]+\s*\d{1,2}\b/g, '')
    .replace(/(?:pcl|parcela)\s*\d+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  
  const tokens = cleanedDesc
    .split(/\s+/)
    .filter(w => w.length >= 3 && !['ltda', 'sao', 'brasil', 'com', 'pagamento', 'fatura', 'cartao', 'pix', 'de'].includes(w));

  if (tokens.length > 0) {
    const categoryScores: Record<string, number> = {};
    existingTxs.forEach(t => {
      if (!t.categoryId || !t.description) return;
      const histLower = t.description.toLowerCase();
      let matches = 0;
      tokens.forEach(tok => {
        if (histLower.includes(tok)) matches++;
      });
      if (matches > 0 && t.categoryId) {
        categoryScores[t.categoryId] = (categoryScores[t.categoryId] || 0) + matches;
      }
    });

    const sortedScores = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    if (sortedScores[0] && sortedScores[0][1] >= 1) {
      return sortedScores[0][0];
    }
  }

  return null;
}

/**
 * Verifica se um pagamento de fatura já foi contabilizado na conta corrente de pagamento
 * para evitar duplicar a saída do banco.
 */
export function isInvoicePaymentAlreadyInChecking(
  paymentAccountId: string,
  amount: number,
  invoiceDate: string,
  existingTxs: TransacaoCompleta[]
): TransacaoCompleta | undefined {
  return existingTxs.find(t => {
    if (t.accountId !== paymentAccountId) return false;
    if (t.flow !== 'out' && t.flow !== 'transfer_out') return false;
    const sameAmount = Math.abs(t.amount - amount) < 1.00;
    if (!sameAmount) return false;

    try {
      const tDate = parseDateLocal(t.date.substring(0, 10));
      const targetDate = parseDateLocal(invoiceDate.substring(0, 10));
      const diffDays = Math.abs((tDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const descLower = (t.description || '').toLowerCase();
        const isInvoiceKeyword = descLower.includes('fatura') || 
                                 descLower.includes('cartao') || 
                                 descLower.includes('itau') || 
                                 descLower.includes('nubank') || 
                                 descLower.includes('santander') || 
                                 descLower.includes('bradesco') || 
                                 descLower.includes('inter') || 
                                 descLower.includes('pagamento');
        if (isInvoiceKeyword || diffDays <= 1) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });
}

export interface GroupedDisplayTransaction {
  key: string;
  isInstallmentGroup: boolean;
  displayDescription: string;
  originalDescription: string;
  accountName?: string;
  pluggyAccId: string;
  date: string;
  dates: string[];
  totalInstallments: number;
  currentInstallments: number[];
  installmentAmount: number;
  totalAmount: number;
  isExpense: boolean;
  isCardPayment: boolean;
  txIds: string[];
  rawTxs: PluggyTransaction[];
  suggestedCategoryId: string | null;
}

/**
 * Agrupa transações para exibição compacta no card de Transações:
 * Agrupa compras parceladas do mesmo estabelecimento e quantidade total de parcelas.
 */
export function groupTransactionsForDisplay(
  items: { tx: PluggyTransaction; pluggyAccId: string }[],
  availableAccounts: { id: string; name?: string; type?: string }[],
  existingTxs: TransacaoCompleta[] = [],
  rules: StandardizationRule[] = []
): GroupedDisplayTransaction[] {
  const result: GroupedDisplayTransaction[] = [];
  const installmentGroups: Record<string, GroupedDisplayTransaction> = {};

  for (const { tx, pluggyAccId } of items) {
    const rawAmt = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
    const cleanAmt = Math.abs(rawAmt);
    const desc = (tx.description || "Transação").trim();
    const isCardPayment = isCardInvoicePayment(desc);
    const acc = availableAccounts.find(a => a.id === pluggyAccId);
    const isCredit = acc?.type === 'CREDIT';
    const isExpense = isCredit ? !isCardPayment : rawAmt < 0;
    const dateStr = tx.date ? tx.date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd');
    const parsed = parseInstallmentPattern(desc);

    const suggestedCat = predictTransactionCategory(
      desc,
      isExpense ? 'despesa' : (isCardPayment ? 'transferencia' : 'receita'),
      existingTxs,
      rules,
      pluggyAccId
    );

    // Se for compra parcelada (ex: 3/6, Pcl 2 de 10) e não for pagamento de fatura
    if (parsed.isInstallment && parsed.totalInstallments > 1 && !isCardPayment) {
      const groupKey = `${pluggyAccId}_${parsed.cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '')}_${parsed.totalInstallments}_${Math.round(cleanAmt)}`;
      
      if (!installmentGroups[groupKey]) {
        const totalAmount = Math.round(cleanAmt * parsed.totalInstallments * 100) / 100;
        const newGroup: GroupedDisplayTransaction = {
          key: groupKey,
          isInstallmentGroup: true,
          displayDescription: parsed.cleanDescription,
          originalDescription: desc,
          accountName: acc?.name || "Conta",
          pluggyAccId,
          date: dateStr,
          dates: [dateStr],
          totalInstallments: parsed.totalInstallments,
          currentInstallments: [parsed.currentInstallment],
          installmentAmount: cleanAmt,
          totalAmount,
          isExpense: true,
          isCardPayment: false,
          txIds: [tx.id],
          rawTxs: [tx],
          suggestedCategoryId: suggestedCat
        };
        installmentGroups[groupKey] = newGroup;
        result.push(newGroup);
      } else {
        const group = installmentGroups[groupKey];
        if (!group.currentInstallments.includes(parsed.currentInstallment)) {
          group.currentInstallments.push(parsed.currentInstallment);
        }
        if (!group.dates.includes(dateStr)) {
          group.dates.push(dateStr);
        }
        group.txIds.push(tx.id);
        group.rawTxs.push(tx);
        if (dateStr > group.date) {
          group.date = dateStr;
        }
      }
    } else {
      // Transação avulsa comum ou pagamento de fatura
      result.push({
        key: tx.id || `tx_${Math.random()}`,
        isInstallmentGroup: false,
        displayDescription: desc,
        originalDescription: desc,
        accountName: acc?.name || "Conta",
        pluggyAccId,
        date: dateStr,
        dates: [dateStr],
        totalInstallments: 1,
        currentInstallments: [1],
        installmentAmount: cleanAmt,
        totalAmount: cleanAmt,
        isExpense,
        isCardPayment,
        txIds: [tx.id],
        rawTxs: [tx],
        suggestedCategoryId: suggestedCat
      });
    }
  }

  return result.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/**
 * Empacota uma lista de transações da Pluggy em um ImportedStatement completo,
 * permitindo que seja revisado ou arquivado no mesmo padrão que um extrato OFX tradicional.
 */
export function buildPluggyImportedStatement(
  transactions: PluggyTransaction[],
  targetAccountId: string,
  accountName?: string,
  rules: StandardizationRule[] = [],
  isCreditCard: boolean = false
): ImportedStatement {
  const rawList = transactions.map((t, idx) => 
    convertPluggyTransactionToOrbium(t, targetAccountId, idx, isCreditCard)
  );

  // Aplica regras de padronização se fornecidas
  const processedList = rules.length > 0 ? applyPluggyStandardizationRules(rawList, rules) : rawList;

  const dates = processedList.map(t => parseDateLocal(t.date)).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0] ? format(dates[0], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const endDate = dates[dates.length - 1] ? format(dates[dates.length - 1], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  return {
    id: generateStatementId(),
    accountId: targetAccountId,
    fileName: `Pluggy API - ${accountName || 'Conta'} (${format(new Date(), 'dd/MM/yyyy')})`,
    importDate: new Date().toISOString(),
    startDate,
    endDate,
    status: 'pending',
    rawTransactions: processedList,
  };
}

/**
 * Aplica regras de regex / padronização existentes do Orbium nas transações da Pluggy.
 */
function applyPluggyStandardizationRules(
  transactions: ImportedTransaction[],
  rules: StandardizationRule[]
): ImportedTransaction[] {
  return transactions.map(tx => {
    let modified = { ...tx };
    for (const rule of rules) {
      if (rule.targetAccountId && rule.targetAccountId !== tx.accountId) continue;
      try {
        const regex = new RegExp(rule.matchCriteria, 'i');
        if (regex.test(tx.originalDescription)) {
          if (rule.assignedCategoryId) modified.categoryId = rule.assignedCategoryId;
          if (rule.assignedOperationType) modified.operationType = rule.assignedOperationType;
          if (rule.standardizedDescription) {
            modified.description = tx.originalDescription.replace(regex, rule.standardizedDescription);
          }
          break;
        }
      } catch (err) {
        console.warn(`[PluggyAdapter] Falha na regra ${rule.id}:`, err);
      }
    }
    return modified;
  });
}

export interface MatchingCommitmentOptions {
  cleanDescription?: string;
  accountId: string;
  bills: BillTracker[];
  creditCardConfigs?: CreditCardConfig[];
  installmentAmount?: number;
  totalInstallments?: number;
  currentInstallment?: number;
  transactionDate?: string;
}

/**
 * Verifica se a conta do compromisso no billsTracker é compatível com o cartão de crédito da transação.
 */
export function isAccountCompatible(
  b: BillTracker,
  accountId?: string,
  creditCardConfigs?: CreditCardConfig[]
): boolean {
  if (!accountId) return true;
  // Se o compromisso não vinculou conta específica, é compatível com qualquer conta
  if (!b.suggestedAccountId && !b.cardId) return true;

  // Vínculo direto de conta
  if (b.suggestedAccountId === accountId) return true;

  // Vínculo via configuração de Cartão de Crédito
  if (creditCardConfigs && creditCardConfigs.length > 0) {
    const cardConfig = creditCardConfigs.find(c => c.accountId === accountId || c.id === accountId);
    if (cardConfig) {
      if (b.cardId === cardConfig.id) return true;
      if (b.suggestedAccountId === cardConfig.accountId) return true;
      // Compatível se o usuário definiu a Conta de Pagamento Padrão como débito
      if (b.suggestedAccountId === cardConfig.defaultPaymentAccountId) return true;
    }
    if (b.cardId) {
      const billCard = creditCardConfigs.find(c => c.id === b.cardId);
      if (billCard && billCard.accountId === accountId) return true;
    }
  }

  // Compras parceladas (purchase_installment): frequentemente cadastradas na conta corrente onde a fatura é debitada.
  // Permitimos compatibilidade para validação da assinatura financeira (mesmo valor e número de parcelas).
  if (b.sourceType === 'purchase_installment') {
    return true;
  }

  return false;
}

/**
 * Localiza se já existe um compromisso cadastrado no billsTracker para a descrição,
 * valor e número de parcelas especificados (mesmo com nomenclatura personalizada pelo usuário).
 */
export function findMatchingCommitment(
  cleanDescriptionOrOptions: string | MatchingCommitmentOptions,
  accountIdArg?: string,
  billsArg?: BillTracker[]
): BillTracker[] {
  let cleanDescription = '';
  let accountId = '';
  let bills: BillTracker[] = [];
  let creditCardConfigs: CreditCardConfig[] | undefined;
  let installmentAmount: number | undefined;
  let totalInstallments: number | undefined;
  let currentInstallment: number | undefined;
  let transactionDate: string | undefined;

  if (typeof cleanDescriptionOrOptions === 'object') {
    cleanDescription = cleanDescriptionOrOptions.cleanDescription || '';
    accountId = cleanDescriptionOrOptions.accountId || '';
    bills = cleanDescriptionOrOptions.bills || [];
    creditCardConfigs = cleanDescriptionOrOptions.creditCardConfigs;
    installmentAmount = cleanDescriptionOrOptions.installmentAmount;
    totalInstallments = cleanDescriptionOrOptions.totalInstallments;
    currentInstallment = cleanDescriptionOrOptions.currentInstallment;
    transactionDate = cleanDescriptionOrOptions.transactionDate;
  } else {
    cleanDescription = cleanDescriptionOrOptions || '';
    accountId = accountIdArg || '';
    bills = billsArg || [];
  }

  const normClean = cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '');

  return bills.filter(b => {
    if (b.isExcluded) return false;
    
    // Verifica compatibilidade de conta (cartão ou conta de débito da fatura)
    if (!isAccountCompatible(b, accountId, creditCardConfigs)) return false;

    // 1. Text description match (se o nome bater total ou parcialmente)
    if (normClean) {
      const normBillDesc = b.description.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normBillDesc.includes(normClean) || normClean.includes(normBillDesc)) {
        return true;
      }
    }

    // 2. Financial & Installments match:
    // O usuário personalizou o nome (ex: cadastrou 'Academia' e no banco veio 'On Fitness 3/6' com R$ 129,90)
    if (installmentAmount && installmentAmount > 0) {
      const amountDiff = Math.abs((b.expectedAmount || 0) - installmentAmount);
      const isSameAmount = amountDiff < 0.05;

      if (isSameAmount) {
        // Extração de parcelas da descrição do compromisso (ex: "Academia (1/6)" ou "Pcl 1 de 6")
        const slashMatch = b.description.match(/(?:[*\s(-]|^)(\d{1,2})\s*[/de]+\s*(\d{1,2})\b/i);
        const bCur = b.parcelaNumber || (slashMatch ? parseInt(slashMatch[1], 10) : undefined);
        const bTotal = b.totalInstallments || (slashMatch ? parseInt(slashMatch[2], 10) : undefined);

        // Se ambos informam o total de parcelas e coincidem (ex: 6 parcelas de R$ 129,90)
        if (totalInstallments && bTotal && totalInstallments === bTotal) {
          return true;
        }

        // Se o grupo do compromisso no billsTracker possui o mesmo número total de parcelas
        if (totalInstallments && b.sourceRef) {
          const groupCount = bills.filter(x => x.sourceRef === b.sourceRef && !x.isExcluded).length;
          if (groupCount === totalInstallments) {
            return true;
          }
        }

        // Se coincidir o número da parcela (ex: parcela 3)
        if (currentInstallment && bCur && currentInstallment === bCur) {
          return true;
        }

        // Se a data de vencimento estiver no mesmo mês/ano da transação
        if (transactionDate && b.dueDate) {
          try {
            const bDate = parseDateLocal(b.dueDate.substring(0, 10));
            const tDate = parseDateLocal(transactionDate.substring(0, 10));
            if (bDate.getFullYear() === tDate.getFullYear() && bDate.getMonth() === tDate.getMonth()) {
              return true;
            }
          } catch {
            // ignore
          }
        }

        // Se for compra parcelada (purchase_installment) com o mesmo valor de parcela
        if (b.sourceType === 'purchase_installment') {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Verifica se uma transação pertence a um mês futuro em relação à data de referência (mês atual).
 */
export function isFutureTransaction(txDateStr: string, referenceDate: Date = new Date()): boolean {
  try {
    const txDate = parseDateLocal(txDateStr.substring(0, 10));
    const currentMonthEnd = endOfMonth(referenceDate);
    return isAfter(txDate, currentMonthEnd);
  } catch {
    return false;
  }
}

/**
 * Agrupa transações com padrão de parcelamento de cartão de crédito e identifica compras que
 * ainda NÃO estão cadastradas no Gerenciar Compromissos (billsTracker).
 */
export function groupDetectedInstallments(
  transactions: PluggyTransaction[],
  targetAccountId: string,
  existingBills: BillTracker[],
  creditCardConfigs?: CreditCardConfig[]
): DetectedCardInstallment[] {
  const groups: Record<string, {
    cleanDesc: string;
    origDesc: string;
    totalInstallments: number;
    amount: number;
    dates: { instNum: number; dateStr: string }[];
    txId: string;
  }> = {};

  for (const tx of transactions) {
    if (isCardInvoicePayment(tx.description)) continue;

    const parsed = parseInstallmentPattern(tx.description);
    if (!parsed.isInstallment || parsed.totalInstallments <= 1) continue;

    const rawAmt = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
    const cleanAmt = Math.abs(rawAmt);

    // Se já existe compromisso cadastrado para esse parcelamento no billsTracker, pula
    const matchingBills = findMatchingCommitment({
      cleanDescription: parsed.cleanDescription,
      accountId: targetAccountId,
      bills: existingBills,
      creditCardConfigs,
      installmentAmount: cleanAmt,
      totalInstallments: parsed.totalInstallments,
      currentInstallment: parsed.currentInstallment,
      transactionDate: tx.date
    });
    if (matchingBills.length > 0) continue;

    const normKey = `${parsed.cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '')}_${parsed.totalInstallments}`;

    if (!groups[normKey]) {
      groups[normKey] = {
        cleanDesc: parsed.cleanDescription,
        origDesc: tx.description,
        totalInstallments: parsed.totalInstallments,
        amount: cleanAmt,
        dates: [],
        txId: tx.id,
      };
    }

    groups[normKey].dates.push({
      instNum: parsed.currentInstallment,
      dateStr: tx.date ? tx.date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd')
    });
  }

  const result: DetectedCardInstallment[] = [];

  for (const [key, g] of Object.entries(groups)) {
    // Verificação robusta a nível de grupo: existe compromisso nessa conta com mesmo valor e parcelas?
    const existsByFinancial = existingBills.some(b => {
      if (b.isExcluded) return false;
      if (!isAccountCompatible(b, targetAccountId, creditCardConfigs)) return false;

      const sameAmount = Math.abs((b.expectedAmount || 0) - g.amount) < 0.05;
      if (!sameAmount) return false;

      // Extrai número total de parcelas do compromisso
      const slashMatch = b.description.match(/(?:[*\s(-]|^)(\d{1,2})\s*[/de]+\s*(\d{1,2})\b/i);
      const bTotal = b.totalInstallments || (slashMatch ? parseInt(slashMatch[2], 10) : undefined);

      if (bTotal && bTotal === g.totalInstallments) return true;

      // Se o grupo no billsTracker tiver a mesma quantidade de parcelas
      if (b.sourceRef) {
        const groupCount = existingBills.filter(x => x.sourceRef === b.sourceRef && !x.isExcluded).length;
        if (groupCount === g.totalInstallments) return true;
      }

      // Se for uma compra parcelada registrada com o mesmo valor unitário
      if (b.sourceType === 'purchase_installment') {
        return true;
      }

      return false;
    });

    if (existsByFinancial) continue;

    // Ordena as datas para estimar a primeira parcela
    g.dates.sort((a, b) => a.instNum - b.instNum);
    const firstRecorded = g.dates[0];
    let estimatedFirstDue = firstRecorded?.dateStr || format(new Date(), 'yyyy-MM-dd');

    // Se o primeiro registro for por exemplo parcela 3, recua 2 meses para achar a 1ª
    if (firstRecorded && firstRecorded.instNum > 1) {
      try {
        const parsed = parseDateLocal(firstRecorded.dateStr);
        parsed.setMonth(parsed.getMonth() - (firstRecorded.instNum - 1));
        estimatedFirstDue = format(parsed, 'yyyy-MM-dd');
      } catch {
        // mantém
      }
    }

    const totalAmount = Math.round(g.amount * g.totalInstallments * 100) / 100;

    result.push({
      id: `detected_inst_${key}`,
      cleanDescription: g.cleanDesc,
      originalDescription: g.origDesc,
      currentInstallment: firstRecorded?.instNum || 1,
      totalInstallments: g.totalInstallments,
      installmentAmount: g.amount,
      totalAmount,
      firstDueDate: estimatedFirstDue,
      targetAccountId,
      transactionDate: firstRecorded?.dateStr || format(new Date(), 'yyyy-MM-dd'),
      pluggyTransactionId: g.txId,
    });
  }

  return result;
}
