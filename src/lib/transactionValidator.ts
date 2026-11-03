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

export function isImportedTransactionIncome(
  tx: {
    originalFlow?: 'in' | 'out';
    initialOperationType?: OperationType;
    originalAmount?: number;
    operationType?: OperationType | null;
  },
  accountType?: string
): boolean {
  // Prioridade absoluta: direção bancária original da importação (OFX/CSV)
  // Uma entrada no extrato bancário é SEMPRE uma entrada (+), independente da operação selecionada!
  if (tx.originalFlow === 'in') return true;
  if (tx.originalFlow === 'out') return false;

  if (typeof tx.originalAmount === 'number') {
    return tx.originalAmount >= 0;
  }

  if (tx.initialOperationType === 'receita') return true;
  if (tx.initialOperationType === 'despesa') return false;

  return isTransactionIncome(tx.operationType, accountType);
}

/**
 * Normaliza descrições de lançamentos bancários removendo acentos, pontuações,
 * caracteres separadores (| do CSV, - do OFX) e múltiplos espaços.
 * Totalmente tolerante a null, undefined, números e objetos.
 */
export function normalizeDescriptionForMatch(desc?: any): string {
  if (desc === null || desc === undefined) return '';
  const str = typeof desc === 'string' ? desc : String(desc);
  if (!str.trim()) return '';
  try {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[|/\\_.,:;•\-()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return str.toLowerCase().trim();
  }
}

/**
 * Verifica se duas descrições de transação referem-se ao mesmo evento financeiro,
 * lidando com variações de OFX vs CSV (ex: "Pix|Nome" vs "Pix - Nome - CPF..."),
 * radicais de estabelecimentos e palavras-chave.
 */
export function areDescriptionsCompatible(desc1?: any, desc2?: any): boolean {
  const n1 = normalizeDescriptionForMatch(desc1);
  const n2 = normalizeDescriptionForMatch(desc2);
  if (!n1 || !n2) return false;
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;

  // Extrai palavras com 3 ou mais caracteres ignorando stopwords comuns de transação bancária
  const stopWords = new Set([
    'transferencia', 'transf', 'enviada', 'recebida', 'pelo', 'para', 'pix',
    'ted', 'doc', 'compra', 'debito', 'deb', 'credito', 'cred', 'pagamento',
    'pgto', 'pagto', 'orig', 'com', 'ltda', 'epp', 's/a', 'sa', 'me',
    'banco', 'agencia', 'conta', 'pagamentos', 'chave', 'rdb'
  ]);
  const tokens1 = n1.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));
  const tokens2 = n2.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));

  if (tokens1.length === 0 || tokens2.length === 0) {
    const simpleTokens1 = n1.split(' ').filter(w => w.length >= 3);
    const simpleTokens2 = n2.split(' ').filter(w => w.length >= 3);
    if (simpleTokens1.length === 0 || simpleTokens2.length === 0) return false;
    return simpleTokens1.every(t => simpleTokens2.includes(t)) || simpleTokens2.every(t => simpleTokens1.includes(t));
  }

  // Se compartilha palavras distintivas (nome de beneficiário, estabelecimento, etc.)
  const shared = tokens1.filter(t => tokens2.includes(t));
  if (shared.length >= 2) return true;
  if (shared.some(w => w.length >= 5)) return true;

  return false;
}





