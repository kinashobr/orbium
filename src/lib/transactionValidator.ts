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

export function isImportedTransactionReady(tx: {
  isPotentialDuplicate?: boolean;
  operationType?: OperationType | null;
  categoryId?: string | null;
  destinationAccountId?: string | null;
  accountId?: string;
  tempInvestmentId?: string | null;
  tempLoanId?: string | null;
  tempParcelaId?: string | null;
  tempVehicleOperation?: string | null;
  tempAssetOperation?: string | null;
}): boolean {
  if (tx.isPotentialDuplicate) return false;
  if (!tx.operationType) return false;

  switch (tx.operationType) {
    case 'receita':
    case 'despesa':
    case 'rendimento':
      return Boolean(tx.categoryId);
    case 'transferencia':
      return Boolean(tx.destinationAccountId && tx.destinationAccountId !== tx.accountId);
    case 'aplicacao':
    case 'resgate':
      return Boolean(tx.tempInvestmentId);
    case 'pagamento_emprestimo':
      return Boolean(tx.tempLoanId && tx.tempParcelaId);
    case 'liberacao_emprestimo':
      return true;
    case 'veiculo':
      return Boolean(tx.tempVehicleOperation || tx.tempAssetOperation || tx.categoryId);
    default:
      return Boolean(tx.categoryId);
  }
}

export function isTransactionIncome(
  operationType: OperationType | null | undefined,
  accountType?: string
): boolean {
  if (!operationType) return false;
  const isInvestment = ['renda_fixa', 'poupanca', 'cripto', 'reserva', 'objetivo'].includes(accountType || '');
  if (isInvestment) {
    // Para conta de investimento: Aplicação é ENTRADA de saldo (+), Resgate é SAÍDA (-)
    return ['aplicacao', 'rendimento', 'receita'].includes(operationType);
  }
  // Para conta corrente e demais: Resgate é ENTRADA (+), Aplicação é SAÍDA (-)
  return ['receita', 'rendimento', 'liberacao_emprestimo', 'resgate'].includes(operationType);
}


