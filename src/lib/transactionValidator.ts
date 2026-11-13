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

export interface VehicleMatchCandidate {
  id: number;
  modelo: string;
  marca?: string;
  placa?: string;
  status?: string;
  statusSeguro?: string;
}

export interface InsurancePolicyCandidate {
  id: number;
  veiculoId: number;
  status?: string;
  parcelas?: { paga: boolean; valor: number }[];
}

const INSURANCE_MATCH_STOPWORDS = new Set([
  'seguro', 'apolice', 'parcela', 'parc', 'auto', 'veiculo', 'veicular',
  'moto', 'carro', 'caminhao', 'pagamento', 'pagto', 'pgto', 'novo', 'nova',
  'renovacao', 'mensal', 'anual', 'corretora', 'porto', 'azul', 'tokio',
  'allianz', 'bradesco', 'mapfre', 'suhai', 'hdi', 'liberty', 'yelum',
  'itau', 'santander', 'caixa', 'bb', 'pix', 'ted', 'doc', 'boleto',
  'debito', 'credito', 'compra', 'de', 'da', 'do', 'dos', 'das', 'para',
  'com', 'sem', 'em', 'na', 'no', 'por', 'via', 'ref'
]);

function normalizeTextTokens(val?: string | null): string {
  if (!val) return '';
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAlphaNum(val?: string | null): string {
  if (!val) return '';
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function extractModelTokens(text?: string | null): string[] {
  const norm = normalizeTextTokens(text);
  if (!norm) return [];
  const rawWords = norm.split(' ').filter(Boolean);
  const tokens = new Set<string>();
  for (const w of rawWords) {
    if (w.length >= 2 && !INSURANCE_MATCH_STOPWORDS.has(w)) {
      tokens.add(w);
    }
    // Quebrar códigos alfanuméricos como "cb500x" ou "fz25" em partes ("cb", "500", "x", "fz", "25")
    const parts = w.match(/[a-z]+|\d+/g) || [];
    for (const p of parts) {
      if (p.length >= 2 && !INSURANCE_MATCH_STOPWORDS.has(p)) {
        tokens.add(p);
      }
    }
  }
  return Array.from(tokens);
}

/**
 * Encontra o veículo correspondente a um lançamento de seguro por:
 * 1) ID explícito (explicitVehicleId)
 * 2) Placa completa normalizada (ignorando hífen/espaços)
 * 3) Nome completo do modelo
 * 4) Nomenclatura parcial do modelo/marca (ex: "Fazer", "CB 500", "Titan 160")
 * 5) Fallback inteligente (único veículo ativo, ou seguro compatível, ou primeiro ativo)
 */
export function matchVehicleForInsurance<T extends VehicleMatchCandidate>(
  description: string | undefined | null,
  veiculos: T[],
  segurosVeiculo?: InsurancePolicyCandidate[],
  explicitVehicleId?: number | null,
  amount?: number
): T | undefined {
  if (!veiculos || veiculos.length === 0) return undefined;

  if (explicitVehicleId !== undefined && explicitVehicleId !== null) {
    const explicit = veiculos.find(v => v.id === Number(explicitVehicleId));
    if (explicit) return explicit;
  }

  const activeVehs = veiculos.filter(v => v.status !== 'vendido');
  const pool = activeVehs.length > 0 ? activeVehs : veiculos;

  const descText = normalizeTextTokens(description);
  const descAlpha = normalizeAlphaNum(description);

  // 1. Match por placa completa (normalizada sem hífen/espaço)
  if (descAlpha.length >= 4) {
    const plateMatch = pool.find(v => {
      const plateAlpha = normalizeAlphaNum(v.placa);
      return plateAlpha.length >= 4 && descAlpha.includes(plateAlpha);
    });
    if (plateMatch) return plateMatch;
  }

  // 2. Match por modelo completo
  if (descText.length >= 2) {
    const fullModelMatch = pool.find(v => {
      const mText = normalizeTextTokens(v.modelo);
      const mAlpha = normalizeAlphaNum(v.modelo);
      return (mText.length >= 2 && descText.includes(mText)) || (mAlpha.length >= 3 && descAlpha.includes(mAlpha));
    });
    if (fullModelMatch) return fullModelMatch;
  }

  // 3. Match parcial por tokens do modelo / marca
  const descTokens = extractModelTokens(description);
  if (descTokens.length > 0) {
    let bestVehicle: T | undefined;
    let bestScore = 0;
    let tiedTop = false;

    for (const v of pool) {
      const modelTokens = extractModelTokens(v.modelo);
      const brandTokens = extractModelTokens(v.marca);
      const modelAlpha = normalizeAlphaNum(v.modelo);
      let score = 0;

      for (const dt of descTokens) {
        if (modelTokens.includes(dt)) {
          score += dt.length >= 3 ? 10 : 6;
          continue;
        }
        if (dt.length >= 4 && modelTokens.some(mt => mt.length >= 4 && (mt.includes(dt) || dt.includes(mt)))) {
          score += 7;
          continue;
        }
        if (dt.length >= 4 && modelAlpha.includes(dt)) {
          score += 6;
          continue;
        }
        if (brandTokens.includes(dt)) {
          score += 3;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestVehicle = v;
        tiedTop = false;
      } else if (score > 0 && score === bestScore) {
        tiedTop = true;
      }
    }

    if (bestVehicle && bestScore >= 3 && !tiedTop) {
      return bestVehicle;
    }
  }

  // 4. Fallback para veículo único ativo
  if (pool.length === 1) {
    return pool[0];
  }

  // 5. Fallback inteligente para múltiplos veículos com descrição genérica/aleatória
  if (segurosVeiculo && segurosVeiculo.length > 0) {
    const isActivePolicy = (v: InsuranceVehicleCandidate, s: InsurancePolicyCandidate) =>
      v.statusSeguro !== 'sem_seguro' &&
      s.veiculoId === v.id &&
      (s.status === 'ativo' || s.status === 'pendente_config') &&
      (!v.seguroAtivoId || s.id === v.seguroAtivoId);

    // 5a. Se houver valor informado, verificar apólice com parcela pendente de valor próximo
    if (typeof amount === 'number' && amount > 0) {
      const amountMatchedVeh = pool.find(v =>
        segurosVeiculo.some(s =>
          isActivePolicy(v, s) &&
          s.parcelas?.some(p => !p.paga && Math.abs((p.valor || 0) - amount) <= Math.max(20, amount * 0.1))
        )
      );
      if (amountMatchedVeh) return amountMatchedVeh;
    }

    // 5b. Veículo com seguro ativo/pendente que possua parcela em aberto
    const vehWithUnpaid = pool.find(v =>
      segurosVeiculo.some(s =>
        isActivePolicy(v, s) &&
        s.parcelas?.some(p => !p.paga)
      )
    );
    if (vehWithUnpaid) return vehWithUnpaid;

    // 5c. Veículo sem seguro ativo ou com apólice já quitada (provável novo seguro / renovação)
    const vehWithoutUnpaidSeg = pool.find(v =>
      v.statusSeguro === 'sem_seguro' ||
      !segurosVeiculo.some(s =>
        s.veiculoId === v.id &&
        (s.status === 'ativo' || s.status === 'pendente_config') &&
        s.parcelas?.some(p => !p.paga)
      )
    );
    if (vehWithoutUnpaidSeg) return vehWithoutUnpaidSeg;
  }

  return pool[0];
}






