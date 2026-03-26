import { TransacaoCompleta, OperationType } from "@/types/finance";

export function validateTransaction(tx: TransacaoCompleta): { valid: boolean; message?: string } {
  // 1. Validação de Valor
  if (tx.amount <= 0) {
    return { valid: false, message: "O valor da transação deve ser maior que zero." };
  }

  // 2. Validação de Partidas Dobradas (Origem/Destino)
  if (tx.operationType === 'transferencia') {
    if (!tx.links.transferGroupId) {
      return { valid: false, message: "Transferências exigem um grupo de transferência." };
    }
  }

  // 3. Validação de Ativos
  if (tx.operationType === 'veiculo' || tx.operationType === 'imobilizado') {
    if (!tx.meta.assetType || !tx.meta.assetOperation) {
      return { valid: false, message: "Operações de ativos exigem tipo e operação definidos." };
    }
  }

  // 4. Validação de Empréstimos
  if (tx.operationType === 'pagamento_emprestimo') {
    if (!tx.links.loanId || !tx.links.parcelaId) {
      return { valid: false, message: "Pagamentos de empréstimo exigem contrato e parcela." };
    }
  }

  return { valid: true };
}
