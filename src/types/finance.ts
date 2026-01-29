// ... manter o início do arquivo exatamente igual até OperationType

// Tipos de Operação no Modal (atualizado com veículos e liberação empréstimo)
export type OperationType = 
  | 'receita' 
  | 'despesa' 
  | 'transferencia' 
  | 'aplicacao' 
  | 'resgate' 
  | 'pagamento_emprestimo'
  | 'pagamento_seguro' // ADICIONADO
  | 'liberacao_emprestimo'
  | 'veiculo'
  | 'rendimento'
  | 'initial_balance';

// NOVO: Labels para OperationType
export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
  aplicacao: 'Aplicação',
  resgate: 'Resgate',
  pagamento_emprestimo: 'Pag. Empréstimo',
  pagamento_seguro: 'Pag. Seguro', // ADICIONADO
  liberacao_emprestimo: 'Liberação Empréstimo',
  veiculo: 'Compra/Venda Veículo',
  rendimento: 'Rendimento',
  initial_balance: 'Saldo Inicial',
};

// ... manter o restante do arquivo exatamente igual (TransactionDomain, FlowType, etc.)

export function getFlowTypeFromOperation(op: OperationType, vehicleOp?: 'compra' | 'venda'): FlowType {
  switch (op) {
    case 'receita':
    case 'resgate':
    case 'liberacao_emprestimo':
    case 'rendimento':
    case 'initial_balance':
      return 'in';
    case 'despesa':
    case 'aplicacao':
    case 'pagamento_emprestimo':
    case 'pagamento_seguro': // ADICIONADO
      return 'out';
    case 'transferencia':
      return 'transfer_out';
    case 'veiculo':
      return vehicleOp === 'venda' ? 'in' : 'out';
    default:
      return 'out';
  }
}

export function getDomainFromOperation(op: OperationType): TransactionDomain {
  switch (op) {
    case 'receita':
    case 'despesa':
    case 'transferencia':
    case 'initial_balance':
      return 'operational';
    case 'aplicacao':
    case 'resgate':
    case 'rendimento':
      return 'investment';
    case 'pagamento_emprestimo':
    case 'liberacao_emprestimo':
      return 'financing';
    case 'pagamento_seguro': // ADICIONADO
    case 'veiculo':
      return 'asset';
    default:
      return 'operational';
  }
}

// ... manter o restante do arquivo