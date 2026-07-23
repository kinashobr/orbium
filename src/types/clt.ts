/**
 * CLT Module Types - Refactoring Plan 2026
 */

export enum RegimeFGTS {
  SAQUE_RESCISAO = 'SAQUE_RESCISAO',
  SAQUE_ANIVERSARIO = 'SAQUE_ANIVERSARIO'
}

export enum FeriasStatus {
  AQUISITIVO_EM_CURSO = 'AQUISITIVO_EM_CURSO',
  DISPONIVEL = 'DISPONIVEL',
  AGENDADA = 'AGENDADA',
  GOZADA = 'GOZADA',
  VENCIDA_EM_DOBRO = 'VENCIDA_EM_DOBRO'
}

export enum RescisaoTipo {
  SEM_JUSTA_CAUSA = 'SEM_JUSTA_CAUSA',
  PEDIDO_DEMISSAO = 'PEDIDO_DEMISSAO',
  JUSTA_CAUSA = 'JUSTA_CAUSA',
  ACORDO_MUTUO_484A = 'ACORDO_MUTUO_484A',
  RESCISAO_INDIRETA = 'RESCISAO_INDIRETA',
  TERMINO_CONTRATO_EXPERIENCIA = 'TERMINO_CONTRATO_EXPERIENCIA',
  APOSENTADORIA = 'APOSENTADORIA',
  MORTE = 'MORTE'
}

export enum AvisoPrevioTipo {
  INDENIZADO = 'INDENIZADO',
  TRABALHADO = 'TRABALHADO',
  DISPENSADO = 'DISPENSADO',
  NAO_CUMPRIDO_PARCIAL = 'NAO_CUMPRIDO_PARCIAL'
}

export enum TipoContribuinteINSS {
  EMPREGADO = 'EMPREGADO',
  CONTRIB_INDIVIDUAL_20 = 'CONTRIB_INDIVIDUAL_20',
  CONTRIB_INDIVIDUAL_11 = 'CONTRIB_INDIVIDUAL_11',
  MEI_5 = 'MEI_5',
  FACULTATIVO = 'FACULTATIVO'
}

export enum OrigemHistoricoINSS {
  IMPORTADO_CNIS = 'IMPORTADO_CNIS',
  LANCAMENTO_MANUAL = 'LANCAMENTO_MANUAL',
  SISTEMA = 'SISTEMA'
}

export interface VinculoCLT {
  id: string;
  nome_descritivo: string;
  data_admissao: string; // ISO date
  data_desligamento: string | null;
  ativo: boolean;
  salario_base_atual: number;
  regime_fgts: RegimeFGTS;
}

export interface EventoFerias {
  id: string;
  vinculo_id: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  periodo_concessivo_limite: string;
  dias_gozados: number;
  dias_abono_pecuniario: number;
  data_inicio_gozo: string | null;
  faltas_injustificadas_periodo: number;
  status: FeriasStatus;
}

export interface EventoRescisao {
  id: string;
  vinculo_id: string;
  tipo_rescisao: RescisaoTipo;
  data_aviso: string;
  data_desligamento: string;
  aviso_previo: AvisoPrevioTipo;
  saldo_fgts_informado: number;
  // Saídas calculadas
  detalhamento_verbas: Record<string, number>;
  total_liquido_estimado: number;
  multa_fgts_aplicada: number;
  tem_direito_seguro_desemprego: boolean;
}

export interface HistoricoContribuicaoINSS {
  id: string;
  vinculo_id: string | null;
  competencia: string; // YYYY-MM
  salario_contribuicao: number;
  tipo_contribuinte: TipoContribuinteINSS;
  conta_para_tempo_contribuicao: boolean;
  origem: OrigemHistoricoINSS;
}

export interface ParametroLegislativoCLT {
  id: string;
  ano_competencia: number;
  chave: string; // "TABELA_INSS_CLT", "TABELA_IRRF", "REDUTOR_IRRF", etc.
  valor_json: unknown;
  fonte_normativa: string;
  validado_manualmente: boolean;
}

export interface HoleriteItem {
  id: string;
  descricao: string;
  valor: number;
  aliquota?: number;
}

export interface HoleriteCompetenciaData {
  id: string; // transactionId or `${contractId}_${competenciaKey}`
  contractId: string;
  competencia: string; // YYYY-MM or label
  salarioMensal: number;
  rendimentosExtras: HoleriteItem[];
  inssValor: number;
  inssAliquota?: number;
  descontosExtras: HoleriteItem[];
  updatedAt: string;
}

