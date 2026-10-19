import { 
  ImportedTransaction, 
  ImportedStatement, 
  StandardizationRule, 
  generateStatementId,
  TransacaoCompleta,
  generateTransactionId,
  OperationType,
  FlowType,
  BillTracker
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
  let operationType: 'despesa' | 'receita' = 'despesa';

  const isCardPayment = isCardInvoicePayment(desc);

  if (isCreditCard) {
    if (isCardPayment) {
      // Pagamento de fatura é entrada/crédito na ótica do cartão (diminui a dívida)
      operationType = 'receita';
      isDebit = false;
    } else {
      // Compras normais no cartão na Pluggy vêm positivas (+), mas no Orbium são despesas (saídas)
      // Se vier negativo, também é despesa.
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
    categoryId: null,
    operationType,
    description: desc,
    isTransfer: isLikelyTransfer || isCardPayment,
    destinationAccountId: null,
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
  itemId: string
): TransacaoCompleta {
  let rawAmount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
  const desc = (tx.description || "Compra no Cartão").trim();

  const isCardPayment = isCardInvoicePayment(desc);

  const operationType: OperationType = isCardPayment ? 'receita' : 'despesa';
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

/**
 * Localiza se já existe um compromisso cadastrado no billsTracker para a descrição e conta especificadas.
 */
export function findMatchingCommitment(
  cleanDescription: string,
  accountId: string,
  bills: BillTracker[]
): BillTracker[] {
  const normClean = cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normClean) return [];

  return bills.filter(b => {
    if (b.isExcluded) return false;
    const matchesAccount = !b.suggestedAccountId || b.suggestedAccountId === accountId || b.cardId === accountId;
    if (!matchesAccount) return false;
    const normBillDesc = b.description.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normBillDesc.includes(normClean) || normClean.includes(normBillDesc);
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
  existingBills: BillTracker[]
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

    const normKey = `${parsed.cleanDescription.toLowerCase().replace(/[^a-z0-9]/g, '')}_${parsed.totalInstallments}`;

    // Se já existe compromisso cadastrado para esse estabelecimento no billsTracker, pula
    const matchingBills = findMatchingCommitment(parsed.cleanDescription, targetAccountId, existingBills);
    if (matchingBills.length > 0) continue;

    const rawAmt = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0');
    const cleanAmt = Math.abs(rawAmt);

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
