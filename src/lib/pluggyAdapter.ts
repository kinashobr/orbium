import { 
  ImportedTransaction, 
  ImportedStatement, 
  StandardizationRule, 
  generateStatementId,
  TransacaoCompleta,
  generateTransactionId,
  OperationType,
  FlowType
} from "@/types/finance";
import { PluggyTransaction } from "@/types/pluggy";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

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
  // Pagamentos de fatura ("credit card payment", "pgto fatura", etc.) devem ser entradas/créditos (receita).
  let isDebit = rawAmount < 0 || tx.type === 'DEBIT';
  let operationType: 'despesa' | 'receita' = 'despesa';

  const isCardPayment = lowerDesc.includes('pagamento de fatura') || 
                        lowerDesc.includes('credit card payment') || 
                        lowerDesc.includes('pgto fatura') || 
                        lowerDesc.includes('pagamento de cartao') ||
                        lowerDesc.includes('fatura paga');

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
  const lowerDesc = desc.toLowerCase();

  const isCardPayment = lowerDesc.includes('pagamento de fatura') || 
                        lowerDesc.includes('credit card payment') || 
                        lowerDesc.includes('pgto fatura') || 
                        lowerDesc.includes('pagamento de cartao') ||
                        lowerDesc.includes('fatura paga');

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
