// =====================================================================
// CLT Payment Engine - Inteligência de Folha, Competências e Prazos CLT
// =====================================================================
// Em conformidade com:
// - Art. 459, § 1º da CLT: pagamento até o 5º dia útil do mês subsequente
// - Portaria MTb nº 3.211/1986 e IN SRT nº 01/1989: Sábado conta como dia útil
// - Lei nº 14.759/2023: Feriado Nacional de 20 de Novembro (Consciência Negra)
// - Lei nº 4.090/1962 e Lei nº 4.749/1965: 13º Salário (1ª parc. até 30/11, 2ª até 20/12)
// =====================================================================

import { TransacaoCompleta, CltContract } from '@/types/finance';
import { HoleriteCompetenciaData } from '@/types/clt';

export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Calcula a data da Páscoa para um determinado ano (Algoritmo Meeus/Jones/Butcher).
 */
export function getPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed (2 = Março, 3 = Abril)
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia, 12, 0, 0);
}

/**
 * Retorna os feriados nacionais brasileiros para o ano fornecido.
 */
export function getFeriadosNacionais(ano: number): Date[] {
  const feriados: Date[] = [
    new Date(ano, 0, 1, 12, 0, 0),   // 01/01 Confraternização Universal
    new Date(ano, 3, 21, 12, 0, 0),  // 21/04 Tiradentes
    new Date(ano, 4, 1, 12, 0, 0),   // 01/05 Dia do Trabalhador
    new Date(ano, 8, 7, 12, 0, 0),   // 07/09 Independência
    new Date(ano, 9, 12, 12, 0, 0),  // 12/10 Nossa Sra. Aparecida
    new Date(ano, 10, 2, 12, 0, 0),  // 02/11 Finados
    new Date(ano, 10, 15, 12, 0, 0), // 15/11 Proclamação da República
    new Date(ano, 10, 20, 12, 0, 0), // 20/11 Consciência Negra (Lei 14.759/2023)
    new Date(ano, 11, 25, 12, 0, 0), // 25/12 Natal
  ];

  // Feriados móveis calculados a partir da Páscoa
  const pascoa = getPascoa(ano);

  // Sexta-feira Santa (2 dias antes da Páscoa)
  const sextaFeiraSanta = new Date(pascoa);
  sextaFeiraSanta.setDate(pascoa.getDate() - 2);
  feriados.push(sextaFeiraSanta);

  // Terça-feira de Carnaval (47 dias antes da Páscoa) - Ponto bancário tradicional
  const carnaval = new Date(pascoa);
  carnaval.setDate(pascoa.getDate() - 47);
  feriados.push(carnaval);

  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);
  feriados.push(corpusChristi);

  return feriados;
}

/**
 * Verifica se uma data é feriado nacional.
 */
export function isFeriadoNacional(data: Date): boolean {
  const feriados = getFeriadosNacionais(data.getFullYear());
  const d = data.getDate();
  const m = data.getMonth();
  const y = data.getFullYear();
  return feriados.some(f => f.getDate() === d && f.getMonth() === m && f.getFullYear() === y);
}

/**
 * Verifica se um dia é útil para fins de pagamento de salário CLT.
 * IMPORTANTE: Pela Portaria MTb nº 3.211/1986 e IN SRT nº 01/1989:
 * - Domingo NÃO é dia útil.
 * - Feriado NÃO é dia útil.
 * - Sábado É dia útil para a contagem do 5º dia útil.
 */
export function isDiaUtilClt(data: Date): boolean {
  const dayOfWeek = data.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0) return false;
  if (isFeriadoNacional(data)) return false;
  return true;
}

/**
 * Retorna o 5º dia útil de um mês e ano específicos.
 * @param ano Ano (ex: 2026)
 * @param mes Mês (0 = Janeiro, 11 = Dezembro)
 */
export function getQuintoDiaUtil(ano: number, mes: number): Date {
  let contadorDiasUteis = 0;
  let diaAtual = 1;

  while (diaAtual <= 31) {
    const data = new Date(ano, mes, diaAtual, 12, 0, 0);
    // Verificar se virou o mês
    if (data.getMonth() !== mes) break;

    if (isDiaUtilClt(data)) {
      contadorDiasUteis++;
      if (contadorDiasUteis === 5) {
        return data;
      }
    }
    diaAtual++;
  }

  // Fallback de segurança se não encontrar
  return new Date(ano, mes, 5, 12, 0, 0);
}

/**
 * Retorna os detalhes da previsão de pagamento para uma dada competência (mês e ano trabalhados).
 * Por lei (Art. 459 da CLT), a competência M é paga no 5º dia útil de M+1.
 * Ex: Competência Outubro/2026 -> paga até o 5º dia útil de Novembro/2026.
 * Ex: Competência Dezembro/2026 -> paga até o 5º dia útil de Janeiro/2027.
 */
export function getPrevisaoPagamentoCompetencia(compAno: number, compMes: number): {
  payDate: Date;
  payYear: number;
  payMonth: number;
  payMonthName: string;
  formattedDate: string;
  displayLabel: string;
} {
  const payMonth = (compMes + 1) % 12;
  const payYear = compMes === 11 ? compAno + 1 : compAno;
  const payDate = getQuintoDiaUtil(payYear, payMonth);

  const dayStr = String(payDate.getDate()).padStart(2, '0');
  const monthStr = String(payMonth + 1).padStart(2, '0');
  const formattedDate = `${dayStr}/${monthStr}/${payYear}`;
  const payMonthName = MESES_NOMES[payMonth];
  const displayLabel = `${dayStr} de ${payMonthName}${payYear !== compAno ? ` de ${payYear}` : ''}`;

  return {
    payDate,
    payYear,
    payMonth,
    payMonthName,
    formattedDate,
    displayLabel
  };
}

/**
 * Identifica a competência de uma transação salarial com base nas regras CLT e dados do holerite.
 */
export function identifyTransactionCompetencia(
  t: TransacaoCompleta,
  cltHolerites?: Record<string, HoleriteCompetenciaData>
): {
  compYear: number;
  compMonth: number; // 0..11, ou -1 se 13º
  is13: boolean;
  label: string;
  isComplemento?: boolean;
} {
  // 1. Se houver holerite salvo explicitando competência
  const holerite = cltHolerites?.[t.id];
  if (holerite?.competencia) {
    const compText = holerite.competencia.toLowerCase();
    if (compText.includes("13") || compText.includes("décimo") || compText.includes("decimo")) {
      const yearMatch = compText.match(/\d{4}/);
      const parsedYear = yearMatch ? parseInt(yearMatch[0]) : new Date(t.date + "T12:00:00").getFullYear();
      return {
        compYear: parsedYear,
        compMonth: -1,
        is13: true,
        label: `13º Salário / ${parsedYear}`
      };
    }

    for (let m = 0; m < 12; m++) {
      if (compText.includes(MESES_NOMES[m].toLowerCase())) {
        const yearMatch = compText.match(/\d{4}/);
        const parsedYear = yearMatch ? parseInt(yearMatch[0]) : new Date(t.date + "T12:00:00").getFullYear();
        return {
          compYear: parsedYear,
          compMonth: m,
          is13: false,
          label: `Competência ${MESES_NOMES[m]} / ${parsedYear}`
        };
      }
    }
  }

  // 2. Extrair data da transação
  const tDate = new Date(t.date + "T12:00:00");
  const tYear = tDate.getFullYear();
  const tMonth = tDate.getMonth();
  const tDay = tDate.getDate();
  const desc = (t.description || "").toLowerCase();

  // 3. Verificar se é 13º Salário (Gratificação Natalina)
  const is13 = desc.includes("13") || desc.includes("décimo") || desc.includes("decimo") || desc.includes("gratificacao") || desc.includes("gratificação");
  if (is13) {
    // Se recebido em janeiro até dia 15 com menção a 13º, refere-se ao 13º do ano anterior (saldo/2ª parcela)
    const compYear = (tMonth === 0 && tDay <= 15) ? tYear - 1 : tYear;
    return {
      compYear,
      compMonth: -1,
      is13: true,
      label: `13º Salário / ${compYear}`
    };
  }

  // 4. Regra padrão CLT para pagamentos mensais
  // Pela CLT, o salário mensal é creditado até o 5º dia útil do mês subsequente (janela 01 a 15 do mês)
  if (tDay <= 15) {
    if (tMonth === 0) {
      // Janeiro dia 1..15 -> refere-se a Dezembro do ano anterior
      return {
        compYear: tYear - 1,
        compMonth: 11,
        is13: false,
        label: `Competência Dezembro / ${tYear - 1}`
      };
    } else {
      return {
        compYear: tYear,
        compMonth: tMonth - 1,
        is13: false,
        label: `Competência ${MESES_NOMES[tMonth - 1]} / ${tYear}`
      };
    }
  }

  // Se creditado entre 25 e o fim do mês, empresa que paga adiantado na própria competência (último dia útil)
  if (tDay >= 25) {
    return {
      compYear: tYear,
      compMonth: tMonth,
      is13: false,
      label: `Competência ${MESES_NOMES[tMonth]} / ${tYear}`
    };
  }

  // Se creditado no meio do mês (16 a 24), geralmente adiantamento (vale) ou acerto/dissídio
  // Se for valor baixo ou ajuste, pode ser complemento da competência anterior
  return {
    compYear: tYear,
    compMonth: tMonth - 1 < 0 ? 11 : tMonth - 1,
    is13: false,
    isComplemento: true,
    label: `Competência ${MESES_NOMES[tMonth - 1 < 0 ? 11 : tMonth - 1]} / ${tMonth - 1 < 0 ? tYear - 1 : tYear}`
  };
}

export interface CltCalendarItem {
  id: string;
  title: string;
  compMonth: number; // 0..11 ou -1 para 13º
  compYear: number;
  dateLabel: string;
  payDueDate: Date;
  amount: number;
  status: "PAGO" | "ATRASADO" | "PREVISTO";
  is13o: boolean;
  transactions: TransacaoCompleta[];
  holeriteSalvo?: HoleriteCompetenciaData;
  isOverdueNotice?: boolean;
}

export interface CltProjectionsResult {
  schedule: CltCalendarItem[];
  nextPaymentStr: string;
  totalReceivedInYear: number;
  totalContractProjected: number;
  totalOverdue: number;
  totalFuture: number;
  overdueCount: number;
}

/**
 * Constrói o cronograma anual com as 13 remunerações da CLT (Jan a Dez + 13º)
 * com resolução precisa de competências, prevenção total de duplicidade e cálculo exato do 5º dia útil.
 */
export function buildCltAnnualSchedule(params: {
  year: number;
  contract: CltContract;
  transacoesSalariais: TransacaoCompleta[];
  cltHolerites: Record<string, HoleriteCompetenciaData>;
  projectedNetSalary: number;
  referenceDate?: Date;
}): CltProjectionsResult {
  const { year, contract, transacoesSalariais, cltHolerites, projectedNetSalary } = params;
  const today = params.referenceDate || new Date();

  // Mapear transações com suas respectivas competências identificadas
  const mappedTxs = transacoesSalariais.map(t => ({
    tx: t,
    comp: identifyTransactionCompetencia(t, cltHolerites)
  }));

  // Set para garantir deduplicação absoluta: cada transação só pode quitar 1 competência
  const claimedTxIds = new Set<string>();

  // 1. Gerar os 12 meses regulares
  const regularMonths: CltCalendarItem[] = MESES_NOMES.map((mName, mIdx) => {
    const compLabel = `${mName} / ${year}`;
    const previsao = getPrevisaoPagamentoCompetencia(year, mIdx);

    // Encontrar transações que pertencem especificamente a esta competência (mIdx) deste ano (year)
    const matchingEntries = mappedTxs.filter(item => {
      if (claimedTxIds.has(item.tx.id)) return false;
      return item.comp.compYear === year && item.comp.compMonth === mIdx && !item.comp.is13;
    });

    let status: "PAGO" | "ATRASADO" | "PREVISTO" = "PREVISTO";
    let amount = projectedNetSalary;
    let dateLabel = `${previsao.displayLabel} (5º dia útil)`;
    const matchingTxs: TransacaoCompleta[] = [];

    if (matchingEntries.length > 0) {
      status = "PAGO";
      amount = matchingEntries.reduce((acc, curr) => acc + curr.tx.amount, 0);
      matchingEntries.forEach(item => {
        claimedTxIds.add(item.tx.id);
        matchingTxs.push(item.tx);
      });

      const primaryTx = matchingEntries[0].tx;
      const primaryDateStr = new Date(primaryTx.date + "T12:00:00").toLocaleDateString("pt-BR");

      if (matchingEntries.length === 1) {
        dateLabel = `Crédito em ${primaryDateStr}`;
      } else {
        dateLabel = `Crédito em ${primaryDateStr} (+${matchingEntries.length - 1} ajuste)`;
      }
    } else {
      // Competência não quitada: verificar se o prazo legal de pagamento já expirou
      // O salário só está em atraso se a data de hoje for estritamente posterior ao 5º dia útil do mês subsequente!
      const isPastDueDate = today > previsao.payDate;
      if (isPastDueDate) {
        status = "ATRASADO";
      } else {
        status = "PREVISTO";
      }
    }

    // Verificar se há holerite salvo para qualquer uma das transações vinculadas
    const holerite = matchingTxs.length > 0 ? cltHolerites[matchingTxs[0].id] : undefined;

    return {
      id: `comp_${year}_${mIdx}`,
      title: `Competência ${compLabel}`,
      compMonth: mIdx,
      compYear: year,
      dateLabel,
      payDueDate: previsao.payDate,
      amount,
      status,
      is13o: false,
      transactions: matchingTxs,
      holeriteSalvo: holerite
    };
  });

  // 2. Gerar o 13º Salário (Gratificação Natalina)
  const decimoMatchingEntries = mappedTxs.filter(item => {
    if (claimedTxIds.has(item.tx.id)) return false;
    return item.comp.compYear === year && item.comp.is13;
  });

  const due13Date = new Date(year, 11, 20, 23, 59, 59); // 20 de Dezembro
  let decimoStatus: "PAGO" | "ATRASADO" | "PREVISTO" = "PREVISTO";
  let decimoAmount = projectedNetSalary;
  let decimoDateLabel = `Previsão: 30 de Novembro e 20 de Dezembro de ${year}`;
  const decimoTxs: TransacaoCompleta[] = [];

  if (decimoMatchingEntries.length > 0) {
    decimoStatus = "PAGO";
    decimoAmount = decimoMatchingEntries.reduce((acc, curr) => acc + curr.tx.amount, 0);
    decimoMatchingEntries.forEach(item => {
      claimedTxIds.add(item.tx.id);
      decimoTxs.push(item.tx);
    });
    const dStr = new Date(decimoMatchingEntries[0].tx.date + "T12:00:00").toLocaleDateString("pt-BR");
    decimoDateLabel = `Crédito em ${dStr}`;
  } else if (today > due13Date) {
    decimoStatus = "ATRASADO";
  }

  const decimoItem: CltCalendarItem = {
    id: `comp_${year}_13o`,
    title: `13º Salário / ${year} (Gratificação Natalina)`,
    compMonth: -1,
    compYear: year,
    dateLabel: decimoDateLabel,
    payDueDate: due13Date,
    amount: decimoAmount,
    status: decimoStatus,
    is13o: true,
    transactions: decimoTxs,
    holeriteSalvo: decimoTxs.length > 0 ? cltHolerites[decimoTxs[0].id] : undefined
  };

  const schedule: CltCalendarItem[] = [...regularMonths, decimoItem];

  // 3. Determinar o Próximo Pagamento Pendente de forma inteligente
  const nextPending = schedule.find(item => item.status !== "PAGO");
  let nextPaymentStr = "Todos quitados em " + year;
  if (nextPending) {
    if (nextPending.is13o) {
      nextPaymentStr = `30 de Novembro (1ª parc. 13º)`;
    } else {
      const previsao = getPrevisaoPagamentoCompetencia(year, nextPending.compMonth);
      nextPaymentStr = `${previsao.displayLabel}`;
    }
  }

  // 4. Métricas consolidadas
  const totalReceivedInYear = schedule
    .filter(i => i.status === "PAGO")
    .reduce((acc, i) => acc + i.amount, 0);

  const totalOverdue = schedule
    .filter(i => i.status === "ATRASADO")
    .reduce((acc, i) => acc + i.amount, 0);

  const totalFuture = schedule
    .filter(i => i.status === "PREVISTO")
    .reduce((acc, i) => acc + i.amount, 0);

  const overdueCount = schedule.filter(i => i.status === "ATRASADO").length;

  let totalContractProjected = projectedNetSalary * 13;
  if (contract.dataAdmissao) {
    const adm = new Date(contract.dataAdmissao + "T12:00:00");
    if (adm.getFullYear() === year) {
      const activeMonths = Math.max(1, 12 - adm.getMonth());
      totalContractProjected = Math.round(projectedNetSalary * (activeMonths + activeMonths / 12));
    }
  }

  return {
    schedule,
    nextPaymentStr,
    totalReceivedInYear,
    totalContractProjected,
    totalOverdue,
    totalFuture,
    overdueCount
  };
}

/**
 * Organiza as transações salariais com identificação de competência e agrupamento para o histórico.
 */
export function organizeSalaryTransactionsHistory(
  transacoesSalariais: TransacaoCompleta[],
  currentYear: number,
  cltHolerites: Record<string, HoleriteCompetenciaData>
) {
  return transacoesSalariais.map(t => {
    const comp = identifyTransactionCompetencia(t, cltHolerites);
    const tDate = new Date(t.date + "T12:00:00");
    const holeriteSalvo = cltHolerites[t.id];
    const isExercícioAnterior = comp.compYear < currentYear;

    return {
      t,
      tDate,
      comp,
      compLabel: comp.label,
      isExercícioAnterior,
      holeriteSalvo,
      formattedDate: tDate.toLocaleDateString("pt-BR")
    };
  });
}

/**
 * Retorna as transações salariais vinculadas a um contrato CLT específico.
 * Se o contrato possuir categoryIds customizados, filtra por eles;
 * caso contrário, busca pela categoria 'Salário' ou descrição salarial.
 */
export function getContractSalaryTransactions(
  contract: CltContract,
  transacoesV2: TransacaoCompleta[],
  categoriasV2?: Array<{ id: string; label: string }>
): TransacaoCompleta[] {
  const catSalario = categoriasV2?.find(c => {
    const l = c.label.toLowerCase();
    return l === 'salário' || l === 'salario';
  });

  return transacoesV2.filter(t => {
    if (t.flow !== 'in' || t.operationType !== 'receita') return false;
    // Excluir parcelas de recebíveis de clientes
    if (t.links?.parcelaId || t.meta?.createdBy === 'recebiveis_module' || t.id.startsWith('tx_parcela_')) return false;

    if (contract.categoryIds && contract.categoryIds.length > 0) {
      return contract.categoryIds.includes(t.categoryId);
    }
    if (catSalario && t.categoryId === catSalario.id) {
      return true;
    }
    const desc = (t.description || '').toLowerCase();
    return desc.includes('salario') || desc.includes('salário') || desc.includes('folha') || desc.includes('holerite');
  });
}

/**
 * Obtém o salário líquido atual e concreto do contrato com base no extrato real e holerites.
 */
export function getContractCurrentNetSalary(
  contract: CltContract,
  transacoesSalariais: TransacaoCompleta[],
  cltHolerites: Record<string, HoleriteCompetenciaData>
): number {
  // 1. Holerite mais recente salvo
  const contractHolerites = Object.values(cltHolerites || {}).filter(h => h.contractId === contract.id);
  if (contractHolerites.length > 0) {
    const sortedHolerites = [...contractHolerites].sort(
      (a, b) => new Date(b.updatedAt || b.competencia || '2000-01-01').getTime() - new Date(a.updatedAt || a.competencia || '2000-01-01').getTime()
    );
    const latest = sortedHolerites[0];
    const gross = (latest.salarioMensal || 0) + (latest.rendimentosExtras || []).reduce((acc, item) => acc + (item.valor || 0), 0);
    const discounts = (latest.inssValor || 0) + (latest.descontosExtras || []).reduce((acc, item) => acc + (item.valor || 0), 0);
    const net = Math.max(0, gross - discounts);
    if (net > 0) return net;
  }

  // 2. Transação salarial mais recente do extrato bancário
  if (transacoesSalariais && transacoesSalariais.length > 0) {
    const sortedTxs = [...transacoesSalariais].sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime());
    if (sortedTxs[0].amount > 0) {
      return sortedTxs[0].amount;
    }
  }

  // 3. Estimativa a partir do salário bruto contratual
  if (contract.salarioBrutoAtual > 0) {
    const inss = Math.min(contract.salarioBrutoAtual * 0.11, 908);
    const irrf = Math.max(0, (contract.salarioBrutoAtual - inss) * 0.15 - 350);
    return Math.max(0, contract.salarioBrutoAtual - inss - irrf);
  }

  return 0;
}

/**
 * Obtém o salário da competência para a DRE em determinado mês/ano a partir de dados concretos do extrato.
 */
export function getContractSalaryForCompetencia(
  contract: CltContract,
  year: number,
  month: number, // 0..11
  transacoesSalariais: TransacaoCompleta[],
  cltHolerites: Record<string, HoleriteCompetenciaData>
): {
  amount: number;
  isRealized: boolean;
  transaction?: TransacaoCompleta;
} {
  // Mapear transações que batem com esta competência específica
  const matching = (transacoesSalariais || []).filter(t => {
    const comp = identifyTransactionCompetencia(t, cltHolerites);
    return comp.compYear === year && comp.compMonth === month && !comp.is13;
  });

  if (matching.length > 0) {
    const totalAmount = matching.reduce((acc, t) => acc + t.amount, 0);
    return {
      amount: totalAmount,
      isRealized: true,
      transaction: matching[0]
    };
  }

  // Se não foi creditada ainda no extrato, projeta com base no salário líquido vigente do contrato
  const currentNet = getContractCurrentNetSalary(contract, transacoesSalariais, cltHolerites);
  return {
    amount: currentNet,
    isRealized: false
  };
}

