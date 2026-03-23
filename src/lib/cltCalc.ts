// ============================================
// Motor de Cálculo CLT - Legislação 2026
// ============================================
// Portaria MPS/MF nº 13/2026 (INSS)
// Lei nº 15.191/2025 (Desconto Simplificado IR)
// Lei nº 15.270/2025 (Redução Adicional IR)
// ============================================

import type { CltContract, CltCompetencia, CltCompetenciaTipo, CltLegislacaoConfig } from '@/types/finance';

export interface INSSFaixaDetalhe {
  faixa: number;
  de: number;
  ate: number;
  aliquota: number;
  baseCalculo: number;
  contribuicao: number;
}

export interface INSSResult {
  total: number;
  detalhePorFaixa: INSSFaixaDetalhe[];
  aliquotaEfetiva: number;
}

export interface IRRFResult {
  irrfFinal: number;
  metodoEscolhido: 'deducoes_legais' | 'desconto_simplificado';
  baseDeducoes: number;
  baseSimplificado: number;
  irrfDeducoes: number;
  irrfSimplificado: number;
  reducaoLei15270: number;
  diferencaMetodos: number;
  deducaoDependentes: number;
  deducaoPensao: number;
  impostoProgressivoDeducoes: number;
  impostoProgressivoSimplificado: number;
  reducaoDeducoes: number;
  reducaoSimplificado: number;
}

// ============================================
// CONFIGURAÇÃO PADRÃO 2026
// ============================================

export const DEFAULT_CONFIG_2026: CltLegislacaoConfig = {
  id: 'leg_2026_default',
  nome: 'Legislação 2026',
  vigencia: '2026',
  inssFaixas: [
    { ate: 1621.00, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 },
  ],
  irrfFaixas: [
    { ate: 2428.80, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
  ],
  deducaoPorDependente: 189.59,
  descontoSimplificado: 607.20,
  fgtsAliquota: 0.08,
  reducaoLimiteZero: 5000.00,
  reducaoLimiteMaximo: 7350.00,
  reducaoValorFixo: 978.62,
  reducaoFator: 0.133145,
  isDefault: true,
};

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

function r2(value: number): number {
  return Number((Math.round(value * 100) / 100).toFixed(2));
}

export function calcularINSS(salarioBruto: number, config: CltLegislacaoConfig = DEFAULT_CONFIG_2026): INSSResult {
  const detalhePorFaixa: INSSFaixaDetalhe[] = [];
  let total = 0;
  let baseAnterior = 0;

  for (let i = 0; i < config.inssFaixas.length; i++) {
    const faixa = config.inssFaixas[i];
    const de = baseAnterior;
    const ate = faixa.ate;

    if (salarioBruto <= de) break;

    const baseCalculo = r2(Math.min(salarioBruto, ate) - de);
    const contribuicao = r2(baseCalculo * faixa.aliquota);

    detalhePorFaixa.push({
      faixa: i + 1,
      de: r2(de),
      ate: r2(Math.min(salarioBruto, ate)),
      aliquota: faixa.aliquota,
      baseCalculo,
      contribuicao,
    });

    total = r2(total + contribuicao);
    baseAnterior = ate;
  }

  return {
    total,
    detalhePorFaixa,
    aliquotaEfetiva: salarioBruto > 0 ? r2((total / salarioBruto) * 100) / 100 : 0,
  };
}

function calcularImpostoProgressivo(baseTributavel: number, config: CltLegislacaoConfig = DEFAULT_CONFIG_2026): number {
  if (baseTributavel <= 0) return 0;

  for (const faixa of config.irrfFaixas) {
    if (baseTributavel <= faixa.ate) {
      return r2(Math.max(0, baseTributavel * faixa.aliquota - faixa.deducao));
    }
  }
  const ultima = config.irrfFaixas[config.irrfFaixas.length - 1];
  return r2(Math.max(0, baseTributavel * ultima.aliquota - ultima.deducao));
}

function calcularReducaoLei15270(baseTributavel: number, impostoProgressivo: number, config: CltLegislacaoConfig = DEFAULT_CONFIG_2026): number {
  if (baseTributavel <= config.reducaoLimiteZero) {
    return impostoProgressivo;
  }
  if (baseTributavel <= config.reducaoLimiteMaximo) {
    const reducao = r2(config.reducaoValorFixo - config.reducaoFator * baseTributavel);
    return r2(Math.max(0, Math.min(reducao, impostoProgressivo)));
  }
  return 0;
}

export function calcularIRRF(
  salarioBruto: number,
  inss: number,
  dependentes: number,
  pensaoAlimenticia: number = 0,
  config: CltLegislacaoConfig = DEFAULT_CONFIG_2026
): IRRFResult {
  const deducaoDependentes = r2(dependentes * config.deducaoPorDependente);
  const deducaoPensao = r2(pensaoAlimenticia);

  // Método 1: Deduções Legais
  const baseDeducoes = r2(Math.max(0, salarioBruto - inss - deducaoDependentes - deducaoPensao));
  const impostoProgressivoDeducoes = calcularImpostoProgressivo(baseDeducoes, config);
  const reducaoDeducoes = calcularReducaoLei15270(baseDeducoes, impostoProgressivoDeducoes, config);
  const irrfDeducoes = r2(Math.max(0, impostoProgressivoDeducoes - reducaoDeducoes));

  // Método 2: Desconto Simplificado
  const baseSimplificado = r2(Math.max(0, salarioBruto - config.descontoSimplificado));
  const impostoProgressivoSimplificado = calcularImpostoProgressivo(baseSimplificado, config);
  const reducaoSimplificado = calcularReducaoLei15270(baseSimplificado, impostoProgressivoSimplificado, config);
  const irrfSimplificado = r2(Math.max(0, impostoProgressivoSimplificado - reducaoSimplificado));

  const metodoEscolhido: 'deducoes_legais' | 'desconto_simplificado' =
    irrfDeducoes <= irrfSimplificado ? 'deducoes_legais' : 'desconto_simplificado';

  const irrfFinal = metodoEscolhido === 'deducoes_legais' ? irrfDeducoes : irrfSimplificado;
  const reducaoFinal = metodoEscolhido === 'deducoes_legais' ? reducaoDeducoes : reducaoSimplificado;

  return {
    irrfFinal,
    metodoEscolhido,
    baseDeducoes,
    baseSimplificado,
    irrfDeducoes,
    irrfSimplificado,
    reducaoLei15270: reducaoFinal,
    diferencaMetodos: r2(Math.abs(irrfDeducoes - irrfSimplificado)),
    deducaoDependentes,
    deducaoPensao,
    impostoProgressivoDeducoes,
    impostoProgressivoSimplificado,
    reducaoDeducoes,
    reducaoSimplificado,
  };
}

export function calcularFGTS(salarioBruto: number, config: CltLegislacaoConfig = DEFAULT_CONFIG_2026): number {
  return r2(salarioBruto * config.fgtsAliquota);
}

/**
 * Calcula o 5º dia útil do mês seguinte (sábado conta como dia útil).
 */
export function calcularDataRecebimento(mesAno: string): string {
  const [year, month] = mesAno.split('-').map(Number);
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) { nextMonth = 1; nextYear++; }

  const feriadosFixos = [
    `${nextYear}-01-01`, `${nextYear}-04-21`, `${nextYear}-05-01`,
    `${nextYear}-09-07`, `${nextYear}-10-12`, `${nextYear}-11-02`,
    `${nextYear}-11-15`, `${nextYear}-12-25`,
  ];

  let diasUteis = 0;
  let dia = 0;

  while (diasUteis < 5) {
    dia++;
    const date = new Date(nextYear, nextMonth - 1, dia);
    const dayOfWeek = date.getDay();
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    if (dayOfWeek === 0) continue;
    if (feriadosFixos.includes(dateStr)) continue;

    diasUteis++;
  }

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// ============================================
// COMPETÊNCIA
// ============================================

export interface CompetenciaCalcResult {
  salarioBruto: number;
  inss: INSSResult;
  irrf: IRRFResult;
  fgts: number;
  salarioLiquido: number;
}

export function calcularCompetencia(
  contrato: CltContract,
  mesAno: string,
  tipo: CltCompetenciaTipo,
  config: CltLegislacaoConfig = DEFAULT_CONFIG_2026
): CompetenciaCalcResult {
  const salarioBruto = contrato.salarioBrutoAtual;
  const dependentes = contrato.dependentes;
  const pensao = contrato.pensaoAlimenticia || 0;

  if (tipo === '13_primeira') {
    const valor = r2(salarioBruto / 2);
    return {
      salarioBruto: valor,
      inss: { total: 0, detalhePorFaixa: [], aliquotaEfetiva: 0 },
      irrf: {
        irrfFinal: 0, metodoEscolhido: 'deducoes_legais',
        baseDeducoes: 0, baseSimplificado: 0, irrfDeducoes: 0, irrfSimplificado: 0,
        reducaoLei15270: 0, diferencaMetodos: 0, deducaoDependentes: 0, deducaoPensao: 0,
        impostoProgressivoDeducoes: 0, impostoProgressivoSimplificado: 0,
        reducaoDeducoes: 0, reducaoSimplificado: 0,
      },
      fgts: calcularFGTS(valor, config),
      salarioLiquido: valor,
    };
  }

  if (tipo === '13_segunda') {
    const inss = calcularINSS(salarioBruto, config);
    const irrf = calcularIRRF(salarioBruto, inss.total, dependentes, pensao, config);
    const primeiraParc = r2(salarioBruto / 2);
    const liquido = r2(salarioBruto - primeiraParc - inss.total - irrf.irrfFinal);
    return {
      salarioBruto: r2(salarioBruto - primeiraParc),
      inss,
      irrf,
      fgts: calcularFGTS(salarioBruto, config),
      salarioLiquido: liquido,
    };
  }

  // Normal
  const inss = calcularINSS(salarioBruto, config);
  const irrf = calcularIRRF(salarioBruto, inss.total, dependentes, pensao, config);
  const fgts = calcularFGTS(salarioBruto, config);
  const salarioLiquido = r2(salarioBruto - inss.total - irrf.irrfFinal);

  return { salarioBruto, inss, irrf, fgts, salarioLiquido };
}

export function gerarCompetenciasAno(contrato: CltContract, config: CltLegislacaoConfig = DEFAULT_CONFIG_2026): CltCompetencia[] {
  const [anoInicio, mesInicio] = contrato.dataInicioGestao.split('-').map(Number);
  const anoAtual = new Date().getFullYear();
  const ano = Math.max(anoInicio, anoAtual);
  const competencias: CltCompetencia[] = [];

  const startMonth = ano === anoInicio ? mesInicio : 1;

  for (let m = startMonth; m <= 12; m++) {
    const mesAno = `${ano}-${String(m).padStart(2, '0')}`;
    const calc = calcularCompetencia(contrato, mesAno, 'normal', config);
    competencias.push(buildCompetencia(contrato.id, mesAno, 'normal', calc));
  }

  if (startMonth <= 11) {
    const mesAno13_1 = `${ano}-11`;
    const calc13_1 = calcularCompetencia(contrato, mesAno13_1, '13_primeira', config);
    competencias.push(buildCompetencia(contrato.id, mesAno13_1, '13_primeira', calc13_1));
  }

  if (startMonth <= 12) {
    const mesAno13_2 = `${ano}-12`;
    const calc13_2 = calcularCompetencia(contrato, mesAno13_2, '13_segunda', config);
    competencias.push(buildCompetencia(contrato.id, mesAno13_2, '13_segunda', calc13_2));
  }

  return competencias;
}

function buildCompetencia(
  contractId: string,
  mesAno: string,
  tipo: CltCompetenciaTipo,
  calc: CompetenciaCalcResult
): CltCompetencia {
  const id = `comp_${contractId}_${mesAno}_${tipo}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  let dataPrevista: string;
  if (tipo === '13_primeira') {
    dataPrevista = `${mesAno.split('-')[0]}-11-30`;
  } else if (tipo === '13_segunda') {
    dataPrevista = `${mesAno.split('-')[0]}-12-20`;
  } else {
    dataPrevista = calcularDataRecebimento(mesAno);
  }

  return {
    id,
    contractId,
    mesAno,
    tipo,
    salarioBruto: calc.salarioBruto,
    dependentes: 0,
    inssTotal: calc.inss.total,
    inssDetalhePorFaixa: calc.inss.detalhePorFaixa,
    inssAliquotaEfetiva: calc.inss.aliquotaEfetiva,
    baseIR: calc.irrf.metodoEscolhido === 'deducoes_legais' ? calc.irrf.baseDeducoes : calc.irrf.baseSimplificado,
    metodoIR: calc.irrf.metodoEscolhido,
    irrfFinal: calc.irrf.irrfFinal,
    baseDeducoesLegais: calc.irrf.baseDeducoes,
    baseDescontoSimplificado: calc.irrf.baseSimplificado,
    irrfDeducoesLegais: calc.irrf.irrfDeducoes,
    irrfDescontoSimplificado: calc.irrf.irrfSimplificado,
    reducaoLei15270: calc.irrf.reducaoLei15270,
    diferencaMetodos: calc.irrf.diferencaMetodos,
    impostoProgressivoDeducoes: calc.irrf.impostoProgressivoDeducoes,
    impostoProgressivoSimplificado: calc.irrf.impostoProgressivoSimplificado,
    reducaoDeducoes: calc.irrf.reducaoDeducoes,
    reducaoSimplificado: calc.irrf.reducaoSimplificado,
    deducaoDependentes: calc.irrf.deducaoDependentes,
    deducaoPensao: calc.irrf.deducaoPensao,
    fgts: calc.fgts,
    salarioLiquido: calc.salarioLiquido,
    isManualOverride: false,
    status: 'pendente',
    dataPrevistaRecebimento: dataPrevista,
    auditLog: [],
    createdAt: new Date().toISOString(),
  };
}

// Constantes exportadas para UI
export const INSS_FAIXAS = DEFAULT_CONFIG_2026.inssFaixas;
export const IRRF_FAIXAS = DEFAULT_CONFIG_2026.irrfFaixas;
export const CONSTANTES = {
  DEDUCAO_POR_DEPENDENTE: DEFAULT_CONFIG_2026.deducaoPorDependente,
  DESCONTO_SIMPLIFICADO: DEFAULT_CONFIG_2026.descontoSimplificado,
  FGTS_ALIQUOTA: DEFAULT_CONFIG_2026.fgtsAliquota,
  REDUCAO_LIMITE_ZERO: DEFAULT_CONFIG_2026.reducaoLimiteZero,
  REDUCAO_LIMITE_MAXIMO: DEFAULT_CONFIG_2026.reducaoLimiteMaximo,
  REDUCAO_VALOR_FIXO: DEFAULT_CONFIG_2026.reducaoValorFixo,
  REDUCAO_FATOR: DEFAULT_CONFIG_2026.reducaoFator,
};
