// ============================================
// Motor de Cálculo CLT - Legislação 2026
// ============================================
// Portaria MPS/MF nº 13/2026 (INSS)
// Lei nº 15.191/2025 (IRRF)
// Lei nº 15.270/2025 (Redutor Adicional IR)
// ============================================

import { 
  VinculoCLT, 
  EventoFerias, 
  EventoRescisao, 
  RescisaoTipo, 
  AvisoPrevioTipo, 
  RegimeFGTS,
  FeriasStatus,
  HistoricoContribuicaoINSS
} from '@/types/clt';
import { CltLegislacaoConfig, TransacaoCompleta } from '@/types/finance';

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
  rendimentoTributavel: number; // Salário Bruto
  baseTributavel: number;       // Bruto - INSS - Deps - Pensão
  deducaoINSS: number;
  deducaoDependentes: number;
  deducaoPensao: number;
  impostoBruto: number;         // Tabela Progressiva sobre baseTributavel
  redutor: number;              // Lei 15.270 sobre rendimentoTributavel (bruto)
  irrfFinal: number;            // max(0, impostoBruto - redutor)
}

// ============================================
// PARÂMETROS LEGAIS 2026
// ============================================

export const LEGISLACAO_2026 = {
  SALARIO_MINIMO: 1621.00,
  TETO_INSS: 8475.55,
  INSS_FAIXAS: [
    { ate: 1621.00, aliquota: 0.075, deducao: 0 },
    { ate: 2902.84, aliquota: 0.09, deducao: 24.32 },
    { ate: 4354.27, aliquota: 0.12, deducao: 111.40 },
    { ate: 8475.55, aliquota: 0.14, deducao: 198.49 },
  ],
  IRRF_FAIXAS: [
    { ate: 2428.80, aliquota: 0, deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
    { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
  ],
  DEDUCAO_DEPENDENTE: 189.59,
  REDUTOR_IRRF_LIMITE_ZERO: 5000.00,
  REDUTOR_IRRF_LIMITE_MAX: 7350.00,
  REDUTOR_IRRF_VALOR_FIXO: 978.62,
  REDUTOR_IRRF_FATOR: 0.133145,
  FGTS_SAQUE_ANIVERSARIO: [
    { ate: 500.00, aliquota: 0.50, parcelaAdicional: 0 },
    { ate: 1000.00, aliquota: 0.40, parcelaAdicional: 50.00 },
    { ate: 5000.00, aliquota: 0.30, parcelaAdicional: 150.00 },
    { ate: 10000.00, aliquota: 0.20, parcelaAdicional: 650.00 },
    { ate: 15000.00, aliquota: 0.15, parcelaAdicional: 1150.00 },
    { ate: 20000.00, aliquota: 0.10, parcelaAdicional: 1900.00 },
    { ate: Infinity, aliquota: 0.05, parcelaAdicional: 2900.00 },
  ],
  SEGURO_DESEMPREGO_PISO: 1621.00,
  SEGURO_DESEMPREGO_TETO: 2518.65,
  SEGURO_DESEMPREGO_FAIXAS: [
    { ate: 2222.17, fator: 0.8 },
    { ate: 3703.99, base: 1777.74, fator: 0.5 },
  ]
};

export const DEFAULT_CONFIG_2026: CltLegislacaoConfig = {
  id: 'leg_2026_default',
  nome: 'Legislação 2026 (Padrão)',
  vigencia: '2026',
  inssFaixas: LEGISLACAO_2026.INSS_FAIXAS.map(f => ({ ate: f.ate, aliquota: f.aliquota })),
  irrfFaixas: LEGISLACAO_2026.IRRF_FAIXAS.map(f => ({ ate: f.ate, aliquota: f.aliquota, deducao: f.deducao })),
  deducaoPorDependente: LEGISLACAO_2026.DEDUCAO_DEPENDENTE,
  descontoSimplificado: 564.80, // Valor padrão de dedução simplificada se aplicável
  fgtsAliquota: 0.08,
  reducaoLimiteZero: LEGISLACAO_2026.REDUTOR_IRRF_LIMITE_ZERO,
  reducaoLimiteMaximo: LEGISLACAO_2026.REDUTOR_IRRF_LIMITE_MAX,
  reducaoValorFixo: LEGISLACAO_2026.REDUTOR_IRRF_VALOR_FIXO,
  reducaoFator: LEGISLACAO_2026.REDUTOR_IRRF_FATOR,
  isDefault: true
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function r2(value: number): number {
  return Number((Math.round(value * 100) / 100).toFixed(2));
}

// ============================================
// MOTORES DE CÁLCULO
// ============================================

/**
 * Calcula INSS CLT 2026 (Progressivo)
 */
export function calcularINSSClt(salarioBruto: number): INSSResult {
  const baseTributavel = Math.min(salarioBruto, LEGISLACAO_2026.TETO_INSS);
  const detalhePorFaixa: INSSFaixaDetalhe[] = [];
  let total = 0;
  let baseAnterior = 0;

  for (let i = 0; i < LEGISLACAO_2026.INSS_FAIXAS.length; i++) {
    const faixa = LEGISLACAO_2026.INSS_FAIXAS[i];
    if (baseTributavel <= baseAnterior) break;

    const baseNestaFaixa = Math.min(baseTributavel, faixa.ate) - baseAnterior;
    const contribuicao = r2(baseNestaFaixa * faixa.aliquota);

    detalhePorFaixa.push({
      faixa: i + 1,
      de: baseAnterior,
      ate: Math.min(baseTributavel, faixa.ate),
      aliquota: faixa.aliquota,
      baseCalculo: baseNestaFaixa,
      contribuicao
    });

    total += contribuicao;
    baseAnterior = faixa.ate;
  }

  return {
    total: r2(total),
    detalhePorFaixa,
    aliquotaEfetiva: salarioBruto > 0 ? r2((total / salarioBruto) * 100) / 100 : 0
  };
}

/**
 * Calcula IRRF Mensal 2026 + Redutor Lei 15.270
 */
export function calcularIRRFMensal(
  baseCalculo: number, 
  dependentes: number = 0,
  pensaoAlimenticia: number = 0
): IRRFResult {
  const deducaoDependentes = r2(dependentes * LEGISLACAO_2026.DEDUCAO_DEPENDENTE);
  const baseTributavel = Math.max(0, baseCalculo - deducaoDependentes - pensaoAlimenticia);

  // 1. Tabela Progressiva
  let impostoBruto = 0;
  for (const faixa of LEGISLACAO_2026.IRRF_FAIXAS) {
    if (baseTributavel <= faixa.ate) {
      impostoBruto = r2(baseTributavel * faixa.aliquota - faixa.deducao);
      break;
    }
  }

  // 2. Redutor Lei 15.270
  let redutor = 0;
  if (baseCalculo <= LEGISLACAO_2026.REDUTOR_IRRF_LIMITE_ZERO) {
    redutor = Math.max(0, impostoBruto); // Zera o imposto
  } else if (baseCalculo <= LEGISLACAO_2026.REDUTOR_IRRF_LIMITE_MAX) {
    const reducaoCalculada = r2(LEGISLACAO_2026.REDUTOR_IRRF_VALOR_FIXO - (LEGISLACAO_2026.REDUTOR_IRRF_FATOR * baseCalculo));
    redutor = Math.max(0, Math.min(reducaoCalculada, impostoBruto));
  }

  return {
    rendimentoTributavel: baseCalculo,
    baseTributavel,
    deducaoINSS: 0, // No IRRF de férias/rescisão, o INSS já foi subtraído da baseCalculo passada
    deducaoDependentes,
    deducaoPensao: pensaoAlimenticia,
    impostoBruto: Math.max(0, impostoBruto),
    redutor,
    irrfFinal: r2(Math.max(0, impostoBruto - redutor))
  };
}

/**
 * Função 3.1 - Férias (planejamento e conferência)
 */
export function calcularFerias(
  salarioBase: number, 
  mediaVariaveis: number, 
  diasGozados: number, 
  diasAbono: number, 
  dependentes: number = 0
) {
  const remuneracaoFerias = r2((salarioBase + mediaVariaveis) / 30 * diasGozados);
  const tercoConstit = r2(remuneracaoFerias / 3);
  const abonoPecuniario = r2((salarioBase + mediaVariaveis) / 30 * diasAbono);
  const tercoAbono = r2(abonoPecuniario / 3);

  const totalBrutoTributavel = remuneracaoFerias + tercoConstit;
  const inss = calcularINSSClt(totalBrutoTributavel);
  const irrf = calcularIRRFMensal(totalBrutoTributavel - inss.total, dependentes);

  const liquidoFeriasEstimado = r2(totalBrutoTributavel - inss.total - irrf.irrfFinal);
  const liquidoAbono = r2(abonoPecuniario + tercoAbono);

  return { 
    liquidoFeriasEstimado, 
    liquidoAbono, 
    tercoConstit,
    brutoTributavel: totalBrutoTributavel,
    inss: inss.total,
    irrf: irrf.irrfFinal
  };
}

/**
 * Função 3.2 - FGTS (decisão sobre saldo informado)
 */
export function calcularSaqueAniversario(saldoInformado: number): number {
  for (const faixa of LEGISLACAO_2026.FGTS_SAQUE_ANIVERSARIO) {
    if (saldoInformado <= faixa.ate) {
      return r2(saldoInformado * faixa.aliquota + faixa.parcelaAdicional);
    }
  }
  return 0;
}

export function calcularMultaFgts(saldoInformado: number, tipoRescisao: RescisaoTipo): number {
  if (tipoRescisao === RescisaoTipo.SEM_JUSTA_CAUSA || tipoRescisao === RescisaoTipo.RESCISAO_INDIRETA) {
    return r2(saldoInformado * 0.40);
  }
  if (tipoRescisao === RescisaoTipo.ACORDO_MUTUO_484A) {
    return r2(saldoInformado * 0.20);
  }
  return 0;
}

/**
 * Função 3.4 - Seguro-desemprego (elegibilidade e valor)
 */
export function calcularParcelaSeguroDesemprego(mediaUltimos3Salarios: number): number {
  if (mediaUltimos3Salarios <= LEGISLACAO_2026.SEGURO_DESEMPREGO_FAIXAS[0].ate) {
    return Math.max(LEGISLACAO_2026.SEGURO_DESEMPREGO_PISO, r2(mediaUltimos3Salarios * 0.8));
  }
  if (mediaUltimos3Salarios <= LEGISLACAO_2026.SEGURO_DESEMPREGO_FAIXAS[1].ate!) {
    const base = LEGISLACAO_2026.SEGURO_DESEMPREGO_FAIXAS[1].base!;
    const fator = LEGISLACAO_2026.SEGURO_DESEMPREGO_FAIXAS[1].fator;
    const excedente = mediaUltimos3Salarios - LEGISLACAO_2026.SEGURO_DESEMPREGO_FAIXAS[0].ate;
    return r2(base + excedente * fator);
  }
  return LEGISLACAO_2026.SEGURO_DESEMPREGO_TETO;
}

/**
 * Função 3.5 - Motor de rescisão (função central do módulo)
 */
export function calcularRescisao(
  vinculo: VinculoCLT, 
  eventoRescisao: EventoRescisao,
  mediaVariaveis: number = 0,
  dependentes: number = 0
) {
  const verbas: Record<string, number> = {};
  const dataDesligamento = new Date(eventoRescisao.data_desligamento);
  const diaDesligamento = dataDesligamento.getDate();
  const mesDesligamento = dataDesligamento.getMonth() + 1;

  // 1. Saldo de Salário
  verbas.saldoSalario = r2(vinculo.salario_base_atual / 30 * diaDesligamento);

  // 2. 13º Proporcional
  // Simplificação: avos = mesDesligamento (se trabalhou > 14 dias no mês)
  const avos13 = diaDesligamento >= 15 ? mesDesligamento : mesDesligamento - 1;
  verbas.decimoTerceiroProporcional = r2((vinculo.salario_base_atual + mediaVariaveis) / 12 * avos13);

  // 3. Férias (Simplificado conforme plano)
  // O plano diz que as férias vencidas/proporcionais são calculadas aqui
  // Supondo que o usuário informe os avos ou que calculemos pela data de admissão
  const dataAdmissao = new Date(vinculo.data_admissao);
  const diffTime = Math.abs(dataDesligamento.getTime() - dataAdmissao.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const anosCompletos = Math.floor(diffDays / 365);
  const mesesProporcionais = Math.floor((diffDays % 365) / 30);
  
  // Férias Proporcionais
  const avosFerias = diaDesligamento >= 15 ? mesesProporcionais + 1 : mesesProporcionais;
  verbas.feriasProporcionais = r2((vinculo.salario_base_atual + mediaVariaveis) / 12 * avosFerias);
  verbas.tercoFeriasProporcionais = r2(verbas.feriasProporcionais / 3);

  // 4. Lógica por Tipo de Rescisao
  let direitoSeguroDesemprego = false;
  
  switch (eventoRescisao.tipo_rescisao) {
    case RescisaoTipo.SEM_JUSTA_CAUSA:
    case RescisaoTipo.RESCISAO_INDIRETA: {
      // Aviso Prévio Lei 12.506/2011: 30d + 3d/ano, máx 90d
      const diasAviso = Math.min(90, 30 + (anosCompletos * 3));
      if (eventoRescisao.aviso_previo === AvisoPrevioTipo.INDENIZADO) {
        verbas.avisoPrevioIndenizado = r2((vinculo.salario_base_atual + mediaVariaveis) / 30 * diasAviso);
      }
      verbas.multaFgts = calcularMultaFgts(eventoRescisao.saldo_fgts_informado, RescisaoTipo.SEM_JUSTA_CAUSA);
      direitoSeguroDesemprego = true;
      break;
    }

    case RescisaoTipo.PEDIDO_DEMISSAO:
      if (eventoRescisao.aviso_previo === AvisoPrevioTipo.NAO_CUMPRIDO_PARCIAL) {
        verbas.descontoAvisoPrevio = -r2(vinculo.salario_base_atual);
      }
      break;

    case RescisaoTipo.JUSTA_CAUSA:
      verbas.feriasProporcionais = 0;
      verbas.tercoFeriasProporcionais = 0;
      verbas.decimoTerceiroProporcional = 0;
      break;

    case RescisaoTipo.ACORDO_MUTUO_484A: {
      const diasAvisoAcordo = Math.min(90, 30 + (anosCompletos * 3)) * 0.5;
      verbas.avisoPrevioIndenizado = r2((vinculo.salario_base_atual + mediaVariaveis) / 30 * diasAvisoAcordo);
      verbas.multaFgts = calcularMultaFgts(eventoRescisao.saldo_fgts_informado, RescisaoTipo.ACORDO_MUTUO_484A);
      verbas.saqueFgtsPermitido = r2(eventoRescisao.saldo_fgts_informado * 0.80);
      break;
    }
  }

  // Tributação (INSS/IRRF incidem sobre verbas REMUNERATÓRIAS)
  const baseTributavelRescisao = verbas.saldoSalario + verbas.decimoTerceiroProporcional;
  const inss = calcularINSSClt(baseTributavelRescisao);
  const irrf = calcularIRRFMensal(baseTributavelRescisao - inss.total, dependentes);

  verbas.inss = -inss.total;
  verbas.irrf = -irrf.irrfFinal;

  const totalLiquido = Object.values(verbas).reduce((acc, val) => acc + val, 0);

  return {
    detalhamento_verbas: verbas,
    total_liquido_estimado: r2(totalLiquido),
    multa_fgts_aplicada: verbas.multaFgts || 0,
    tem_direito_seguro_desemprego: direitoSeguroDesemprego
  };
}

/**
 * Wrapper para calcularIRRFMensal (compatibilidade)
 */
export function calcularIRRF(baseCalculo: number, inssTotal: number, dependentes: number = 0, pensaoAlimenticia: number = 0, _config?: unknown) {
  return calcularIRRFMensal(baseCalculo - inssTotal, dependentes, pensaoAlimenticia);
}

/**
 * Calcula FGTS (compatibilidade)
 */
export function calcularFGTS(salarioBruto: number, _config?: unknown) {
  return r2(salarioBruto * 0.08);
}

/**
 * Calcula INSS (compatibilidade)
 */
export function calcularINSS(salarioBruto: number, _config?: unknown) {
  return calcularINSSClt(salarioBruto);
}

/**
 * Gera competências projetadas para o ano
 */
export function gerarCompetenciasAno(contract: any, _config?: any) {
  const competencias: any[] = [];
  const startMonth = new Date(contract.dataInicioGestao).getMonth() + 1;
  const startYear = new Date(contract.dataInicioGestao).getFullYear();

  for (let i = 0; i < 12; i++) {
    const date = new Date(startYear, startMonth + i - 1, 1);
    const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Normal month
    const inss = calcularINSSClt(contract.salarioBrutoAtual);
    const irrf = calcularIRRFMensal(contract.salarioBrutoAtual - inss.total, contract.dependentes, contract.pensaoAlimenticia);
    
    competencias.push({
      id: `${contract.id}_${mesAno}_normal`,
      contractId: contract.id,
      mesAno,
      tipo: 'normal',
      salarioBruto: contract.salarioBrutoAtual,
      inssTotal: inss.total,
      irrfFinal: irrf.irrfFinal,
      salarioLiquido: r2(contract.salarioBrutoAtual - inss.total - irrf.irrfFinal - contract.pensaoAlimenticia),
      fgts: r2(contract.salarioBrutoAtual * 0.08),
      status: 'pendente',
      dependentes: contract.dependentes,
      deducaoPensao: contract.pensaoAlimenticia,
      baseIR: r2(contract.salarioBrutoAtual - inss.total),
      impostoBruto: irrf.impostoBruto,
      reducaoLei15270: irrf.redutor
    });

    // Handle 13th salary parcels (Simplified)
    if (date.getMonth() + 1 === 11) {
       // 1st installment
       competencias.push({
        id: `${contract.id}_${mesAno}_13_primeira`,
        contractId: contract.id,
        mesAno,
        tipo: '13_primeira',
        salarioBruto: r2(contract.salarioBrutoAtual / 2),
        inssTotal: 0,
        irrfFinal: 0,
        salarioLiquido: r2(contract.salarioBrutoAtual / 2),
        fgts: r2(contract.salarioBrutoAtual / 2 * 0.08),
        status: 'pendente'
      });
    }
    if (date.getMonth() + 1 === 12) {
      // 2nd installment
      const inss13 = calcularINSSClt(contract.salarioBrutoAtual);
      const irrf13 = calcularIRRFMensal(contract.salarioBrutoAtual - inss13.total, contract.dependentes, contract.pensaoAlimenticia);
      
      competencias.push({
        id: `${contract.id}_${mesAno}_13_segunda`,
        contractId: contract.id,
        mesAno,
        tipo: '13_segunda',
        salarioBruto: contract.salarioBrutoAtual,
        inssTotal: inss13.total,
        irrfFinal: irrf13.irrfFinal,
        salarioLiquido: r2(contract.salarioBrutoAtual / 2 - inss13.total - irrf13.irrfFinal),
        fgts: r2(contract.salarioBrutoAtual / 2 * 0.08),
        status: 'pendente'
      });
    }
  }

  return competencias;
}

export interface MatchingTransactionResult {
  transaction: TransacaoCompleta;
  confidence: number;
}

/**
 * Encontra transações de salário que batem com a competência
 */
export function findMatchingSalaryTransactions(
  comp: any, 
  transactions: TransacaoCompleta[],
  _contract?: any
): MatchingTransactionResult[] {
  return transactions
    .filter(t => {
      if (t.operationType !== 'receita') return false;
      
      // Simple heuristic: amount matches liquid or is within 10%
      const diff = Math.abs(t.amount - comp.salarioLiquido);
      const isAmountMatch = diff < 10 || diff / comp.salarioLiquido < 0.1;
      
      // Date proximity (if available)
      // Usually salary is paid near end of month or start of next
      
      return isAmountMatch;
    })
    .map(t => ({
      transaction: t,
      confidence: 0.8
    }));
}
