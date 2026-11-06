import React, { useMemo, useCallback, useState } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Calculator, Minus, Plus, 
  Sparkles, Receipt, Zap, PieChart, BarChart3, LineChart, Activity, Gauge, ArrowUpRight, ArrowDownRight, Target, PiggyBank, Award, CreditCard
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ComparisonDateRanges, DateRange, formatCurrency, TransacaoV2, Categoria } from "@/types/finance";
import { startOfDay, endOfDay, isWithinInterval, subMonths, endOfMonth, format, startOfMonth, addMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { ptBR } from "date-fns/locale";
import { IndicatorCard } from "./IndicatorCard";
import { DREStatement, DREMode, DREItem } from "./DREStatement";

export interface DREDetailEntry {
  label: string;
  value: number;
  id: string;
  competencia?: string;
  sublabel?: string;
  details?: { label: string; value: number; competencia?: string }[];
}

// Helpers especializados para apuração da DRE e Resultado Financeiro
function isRendimentoTx(t: { operationType?: string; categoryId?: string | null; description?: string }, cat?: { label?: string; nature?: string }): boolean {
  if (t.operationType === 'rendimento') return true;
  if (t.categoryId === 'cat_rendimentos') return true;
  const catLabel = (cat?.label || '').toLowerCase();
  if (catLabel.includes('rendimento') || catLabel.includes('investimento') || catLabel.includes('dividend') || catLabel.includes('jcp') || catLabel.includes('cdi')) {
    return true;
  }
  const desc = (t.description || '').toLowerCase();
  if (desc.includes('rendimento') || desc.includes('dividend') || desc.includes('juros s/ capital') || desc.includes('remuneração conta') || desc.includes('remuneracao de saldo')) {
    return true;
  }
  return false;
}

function isDescontoTx(t: { categoryId?: string | null; description?: string; operationType?: string; links?: any }, cat?: { label?: string }): boolean {
  if (t.operationType === 'pagamento_emprestimo' || t.links?.loanId) return false;
  if (t.categoryId === 'cat_descontos_obtidos') return true;
  const catLabel = (cat?.label || '').toLowerCase().trim();
  if (catLabel === 'descontos obtidos' || catLabel === 'desconto obtido') return true;
  return false;
}

function isJurosTx(t: { categoryId?: string | null; description?: string; operationType?: string }, cat?: { label?: string }): boolean {
  const catLabel = (cat?.label || '').toLowerCase();
  if (catLabel.includes('juros') || catLabel.includes('encargos')) return true;
  const desc = (t.description || '').toLowerCase();
  if (desc.includes('juros cheque especial') || desc.includes('juros rotativo') || desc.includes('encargos') || desc.includes('juros de mora') || desc.includes('multa/juros')) {
    return true;
  }
  return false;
}

function isFinanciamentoOuEmprestimoTx(t: { operationType?: string; links?: any; description?: string; categoryId?: string | null }, cat?: { label?: string }): boolean {
  if (t.operationType === 'pagamento_emprestimo') return true;
  if (t.links?.loanId) return true;
  const catLabel = (cat?.label || '').toLowerCase();
  if (catLabel.includes('empréstimo') || catLabel.includes('emprestimo') || catLabel.includes('financiamento')) return true;
  const desc = (t.description || '').toLowerCase();
  if (desc.includes('pagamento empréstimo') || desc.includes('pagamento emprestimo') || desc.includes('parcela empréstimo') || desc.includes('parcela emprestimo') || desc.includes('financiamento')) {
    return true;
  }
  return false;
}

interface DREData {
  // Receita Total (operacional + rendimentos financeiros + descontos obtidos)
  rec: number;
  fix: number;
  var: number;
  juros: number;
  rendimentos: number;
  descontosObtidos: number;
  // Resultado Líquido (Resultado Operacional + Resultado Financeiro)
  res: number;
  // Receita Operacional (apenas operationType = 'receita')
  receitaOperacional: number;
  // Resultado Operacional: Receita Operacional - Despesas Operacionais (fixas + variáveis)
  resultadoOperacional: number;
  // Resultado Financeiro: Rendimentos + Descontos Obtidos - Juros
  resultadoFinanceiro: number;
  details: {
    receitas: DREDetailEntry[];
    despesasFixas: DREDetailEntry[];
    despesasVariaveis: DREDetailEntry[];
  };
}

export function DRETab({ dateRanges }: { dateRanges: ComparisonDateRanges }) {
  const { 
    transacoesV2, 
    categoriasV2, 
    contasMovimento,
    billsTracker,
    calculateLoanSchedule,
    emprestimos,
    cltContracts,
    cltCompetencias,
    parcelasRecebiveis,
    revenueForecasts,
    expenseSnapshots,
    creditCardConfigs,
  } = useFinance();

  // Padrão solicitado pelo usuário: iniciar no Regime de Competência
  const [dreMode, setDreMode] = useState<DREMode>("competencia");

  const { range1, range2 } = dateRanges;
  const colors = useChartColors();
  const categoriesMap = useMemo(() => new Map(categoriasV2.map(c => [c.id, c])), [categoriasV2]);

  const creditCardAccountIds = useMemo(() => 
    new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id))
  , [contasMovimento]);

  const getCategoryIcon = useCallback((label: string, defaultIcon: React.ElementType) => {
    // Se for agrupamento de fatura, usa ícone de cartão
    if (label.toLowerCase().startsWith('fatura')) {
      return CreditCard;
    }
    const cat = categoriasV2.find(c => c.label === label);
    if (cat?.icon) {
      return () => <span className="text-lg leading-none flex items-center justify-center">{cat.icon}</span>;
    }
    return defaultIcon;
  }, [categoriasV2]);

  const finalDate = range1.to || new Date();
  const prevDate = range2.to || subMonths(finalDate, 1);

  // 1. DRE REGIME DE CAIXA: Real desembolso de caixa (data de liquidação / pagamento efetivo)
  const calculateDRECaixa = useCallback((range: DateRange): DREData => {
    const rangeFrom = range.from ? startOfDay(range.from) : undefined;
    const rangeTo = range.to ? endOfDay(range.to) : undefined;
    const refDate = rangeTo || new Date();

    // 1) Receitas e Rendimentos no Caixa (efetivo recebimento na conta bancária)
    const txsInInterval = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() }));
      } catch { return false; }
    });

    // Rendimentos no caixa
    const rendimentos = txsInInterval
      .filter(t => isRendimentoTx(t, categoriesMap.get(t.categoryId || '')))
      .reduce((a, t) => a + t.amount, 0);

    // Descontos obtidos no caixa: apenas valores concretos de transações da categoria Descontos Obtidos
    const descontosObtidos = txsInInterval
      .filter(t => isDescontoTx(t, categoriesMap.get(t.categoryId || '')))
      .reduce((a, t) => a + t.amount, 0);

    // Receita Operacional no Caixa (apenas receitas operacionais legítimas)
    const receitaOperacionalTxs = txsInInterval.filter(t => {
      const cat = categoriesMap.get(t.categoryId || '');
      return t.operationType === 'receita' && !isRendimentoTx(t, cat) && !isDescontoTx(t, cat);
    });

    const receitaOperacional = receitaOperacionalTxs.reduce((a, t) => a + t.amount, 0);
    const receitaTotal = receitaOperacional + rendimentos + descontosObtidos;

    const receitasMap: Record<string, { value: number; competencia: string }> = {};
    receitaOperacionalTxs.forEach(t => {
      const label = categoriesMap.get(t.categoryId || '')?.label || t.description || 'Outras Receitas';
      const comp = format(parseDateLocal(t.date), 'MM/yyyy');
      const cur = receitasMap[label] || { value: 0, competencia: comp };
      receitasMap[label] = { value: cur.value + t.amount, competencia: comp };
    });

    // 2) Despesas Diretas (Conta Corrente, PIX, Débito, Dinheiro)
    // Exclui pagamentos de fatura (para usar os itens das faturas pagas), pagamentos de empréstimo e juros
    const directDespesas = txsInInterval.filter(t => {
      if (t.operationType !== 'despesa') return false;
      if (creditCardAccountIds.has(t.accountId)) return false;
      const cat = categoriesMap.get(t.categoryId || '');
      if (isFinanciamentoOuEmprestimoTx(t, cat)) return false;
      if (isJurosTx(t, cat)) return false;
      const descLower = (t.description || '').toLowerCase();
      if (
        descLower.includes('fatura') ||
        descLower.includes('pagamento cartão') ||
        descLower.includes('pgto cartao') ||
        descLower.includes('pagamento de fatura') ||
        descLower.includes('pag fatura') ||
        descLower.includes('liquidacao cartao') ||
        t.meta?.isCardPayment
      ) {
        return false;
      }
      return true;
    });

    // Mapas para acumular Despesas Fixas e Variáveis diretamente pelas Categorias (sem exibir a fatura)
    const allFixMap = new Map<string, { label: string; value: number; competencia: string }>();
    const allVarMap = new Map<string, { label: string; value: number; competencia: string }>();

    // Insere despesas diretas
    directDespesas.forEach(t => {
      const cat = categoriesMap.get(t.categoryId || '');
      let label = cat?.label || t.description || 'Outros';
      if (label.toLowerCase().includes('fatura')) return;
      const isFixa = cat?.nature === 'despesa_fixa';
      const comp = format(parseDateLocal(t.date), 'MM/yyyy');
      const key = `${label}__${comp}`;
      const targetMap = isFixa ? allFixMap : allVarMap;
      const cur = targetMap.get(key) || { label, value: 0, competencia: comp };
      targetMap.set(key, { label, value: cur.value + t.amount, competencia: comp });
    });

    // 3) Despesas de Cartão de Crédito de faturas liquidadas no período:
    // Não exibe agrupamento de fatura: joga os lançamentos diretamente em suas respectivas categorias
    const startRef = rangeFrom || startOfMonth(refDate);
    const endRef = rangeTo || endOfMonth(refDate);
    const cardAccounts = contasMovimento.filter(c => c.accountType === 'cartao_credito');

    cardAccounts.forEach(cardAcc => {
      const config = creditCardConfigs.find(c => c.accountId === cardAcc.id || c.id === cardAcc.id);
      const closingDay = config?.closingDay || 1;
      const dueDay = config?.dueDay || 10;

      let cursor = startOfMonth(startRef);
      const endCursor = endOfMonth(endRef);

      while (cursor <= endCursor) {
        const cycleDate = cursor;
        const cycleMonthKey = format(cycleDate, 'yyyy-MM');
        const daysInMonth = new Date(cycleDate.getFullYear(), cycleDate.getMonth() + 1, 0).getDate();
        const actualDueDay = Math.min(dueDay, daysInMonth);
        const invoiceDueDate = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), actualDueDay);

        const invoiceBill = billsTracker.find(b => 
          (b.id === `invoice_${config?.id}_${cycleMonthKey}` || 
           (b.cardId === (config?.id || cardAcc.id) && b.dueDate.startsWith(cycleMonthKey))) &&
          !b.isExcluded
        );

        let effectivePaymentDate = invoiceDueDate;
        if (invoiceBill?.isPaid && invoiceBill.paymentDate) {
          try {
            effectivePaymentDate = parseDateLocal(invoiceBill.paymentDate);
          } catch {
            effectivePaymentDate = invoiceDueDate;
          }
        } else {
          const paymentTx = transacoesV2.find(t => 
            t.accountId === cardAcc.id && 
            (t.flow === 'in' || t.flow === 'transfer_in' || t.meta?.isCardPayment) &&
            t.date.startsWith(cycleMonthKey)
          );
          if (paymentTx) {
            try {
              effectivePaymentDate = parseDateLocal(paymentTx.date);
            } catch {
              effectivePaymentDate = invoiceDueDate;
            }
          }
        }

        // Se a liquidação da fatura ocorreu no período selecionado:
        if (!rangeFrom || isWithinInterval(effectivePaymentDate, { start: rangeFrom, end: rangeTo || new Date() })) {
          const cycleYear = cycleDate.getFullYear();
          const cycleMonth = cycleDate.getMonth();
          const currentClosing = new Date(cycleYear, cycleMonth, Math.min(closingDay, new Date(cycleYear, cycleMonth + 1, 0).getDate()));
          const prevMonth = cycleMonth === 0 ? 11 : cycleMonth - 1;
          const prevYear = cycleMonth === 0 ? cycleYear - 1 : cycleYear;
          const prevClosing = new Date(prevYear, prevMonth, Math.min(closingDay, new Date(prevYear, prevMonth + 1, 0).getDate()));

          const cycleTxs = transacoesV2.filter(t => 
            t.accountId === cardAcc.id && 
            t.flow === 'out' && 
            (t.operationType === 'despesa' || !t.operationType) &&
            parseDateLocal(t.date) > prevClosing && 
            parseDateLocal(t.date) <= currentClosing
          );

          const pendingCycleBills = billsTracker.filter(b => 
            !b.isPaid && 
            !b.isExcluded && 
            b.sourceType !== 'card_invoice' &&
            b.sourceType !== 'credit_card_invoice' &&
            (b.suggestedAccountId === cardAcc.id || b.cardId === (config?.id || cardAcc.id)) &&
            parseDateLocal(b.dueDate) > prevClosing && 
            parseDateLocal(b.dueDate) <= currentClosing
          );

          cycleTxs.forEach(t => {
            const cat = categoriesMap.get(t.categoryId || '');
            let label = cat?.label || t.description || 'Outros';
            if (label.toLowerCase().includes('fatura')) label = 'Cartão de Crédito';
            const isFixa = cat?.nature === 'despesa_fixa';
            const comp = format(parseDateLocal(t.date), 'MM/yyyy');
            const key = `${label}__${comp}`;
            const targetMap = isFixa ? allFixMap : allVarMap;
            const cur = targetMap.get(key) || { label, value: 0, competencia: comp };
            targetMap.set(key, { label, value: cur.value + t.amount, competencia: comp });
          });

          pendingCycleBills.forEach(b => {
            const cat = categoriesMap.get(b.suggestedCategoryId || '');
            let label = cat?.label || b.description || 'Compra Parcelada';
            if (label.toLowerCase().includes('fatura')) label = 'Cartão de Crédito';
            const isFixa = cat?.nature === 'despesa_fixa' || b.sourceType === 'fixed_expense';
            const comp = format(parseDateLocal(b.dueDate), 'MM/yyyy');
            const key = `${label}__${comp}`;
            const targetMap = isFixa ? allFixMap : allVarMap;
            const cur = targetMap.get(key) || { label, value: 0, competencia: comp };
            targetMap.set(key, { label, value: cur.value + b.expectedAmount, competencia: comp });
          });
        }

        cursor = addMonths(cursor, 1);
      }
    });

    let fixTotal = 0;
    let varTotal = 0;
    const despesasFixasDetails: DREDetailEntry[] = [];
    const despesasVariaveisDetails: DREDetailEntry[] = [];

    allFixMap.forEach((v) => {
      fixTotal += v.value;
      despesasFixasDetails.push({
        label: v.label,
        value: v.value,
        id: `caixa-fix-${v.label}-${v.competencia}`,
        competencia: v.competencia,
      });
    });

    allVarMap.forEach((v) => {
      varTotal += v.value;
      despesasVariaveisDetails.push({
        label: v.label,
        value: v.value,
        id: `caixa-var-${v.label}-${v.competencia}`,
        competencia: v.competencia,
      });
    });

    // 4) Juros e Resultado Financeiro no Método Caixa
    let juros = 0;
    // Juros de parcelas de empréstimo pagas no período
    txsInInterval
      .filter(t => t.operationType === 'pagamento_emprestimo' || t.links?.loanId)
      .forEach(t => {
        const lidStr = t.links?.loanId?.replace('loan_', '');
        const pidStr = t.links?.parcelaId;
        if (lidStr) {
          const loanId = parseInt(lidStr);
          const s = calculateLoanSchedule(loanId);
          if (pidStr) {
            const item = s.find(i => i.parcela === parseInt(pidStr));
            if (item) juros += item.juros;
          } else {
            const item = s.find(i => Math.abs((i.juros + i.amortizacao) - t.amount) < 1) || s[0];
            if (item) juros += item.juros;
          }
        }
      });

    // Também verifica parcelas de empréstimo marcadas como pagas no billsTracker com data de pagamento no período
    billsTracker
      .filter(b => b.sourceType === 'loan_installment' && b.isPaid && b.paymentDate && !b.isExcluded)
      .forEach(b => {
        try {
          const pDate = parseDateLocal(b.paymentDate!);
          if (!rangeFrom || isWithinInterval(pDate, { start: rangeFrom, end: rangeTo || new Date() })) {
            const alreadyInTx = txsInInterval.some(t => 
              t.id === b.transactionId || 
              (t.links?.loanId === `loan_${b.sourceRef}` && t.links?.parcelaId === String(b.parcelaNumber))
            );
            if (!alreadyInTx && b.sourceRef) {
              const s = calculateLoanSchedule(parseInt(b.sourceRef));
              const item = s.find(i => i.parcela === b.parcelaNumber);
              if (item) juros += item.juros;
            }
          }
        } catch { }
      });

    // Juros diretos nas transações do período (cheque especial, encargos rotativo, juros/multas bancárias)
    txsInInterval.forEach(t => {
      const cat = categoriesMap.get(t.categoryId || '');
      if (isJurosTx(t, cat) && t.operationType !== 'pagamento_emprestimo') {
        juros += t.amount;
      }
    });

    const despesasOperacionais = fixTotal + varTotal;
    const resultadoOperacional = receitaOperacional - despesasOperacionais;
    const resultadoFinanceiro = rendimentos + descontosObtidos - juros;
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;

    return {
      rec: receitaTotal,
      fix: fixTotal,
      var: varTotal,
      juros,
      rendimentos,
      descontosObtidos,
      res: resultadoLiquido,
      receitaOperacional,
      resultadoOperacional,
      resultadoFinanceiro,
      details: {
        receitas: Object.entries(receitasMap).map(([label, entry]) => ({ 
          label, 
          value: entry.value, 
          competencia: entry.competencia,
          id: `rec-caixa-${label}` 
        })),
        despesasFixas: despesasFixasDetails,
        despesasVariaveis: despesasVariaveisDetails,
      },
    };
  }, [transacoesV2, calculateLoanSchedule, categoriesMap, creditCardAccountIds, contasMovimento, creditCardConfigs, billsTracker]);

  // 2. DRE REGIME DE COMPETÊNCIA: Valores na data de origem da obrigação / fato gerador
  const calculateDRECompetencia = useCallback((range: DateRange): DREData => {
    const rangeFrom = range.from ? startOfDay(range.from) : undefined;
    const rangeTo = range.to ? endOfDay(range.to) : undefined;
    const monthKey = rangeTo ? format(rangeTo, 'yyyy-MM') : format(new Date(), 'yyyy-MM');

    // Transações no intervalo
    const txsInInterval = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() }));
      } catch { return false; }
    });

    // Despesas de competência:
    // 1) Compras no cartão de crédito na data da compra (fato gerador)
    // 2) Despesas em contas correntes exceto quitação de cartão, pagamentos de empréstimo e juros
    const operacoesDespesa = txsInInterval.filter(t => {
      if (t.operationType !== 'despesa') return false;
      const cat = categoriesMap.get(t.categoryId || '');
      if (isFinanciamentoOuEmprestimoTx(t, cat)) return false;
      if (isJurosTx(t, cat)) return false;
      const descLower = (t.description || '').toLowerCase();
      if (!creditCardAccountIds.has(t.accountId)) {
        if (
          descLower.includes('fatura') ||
          descLower.includes('pagamento cartão') ||
          descLower.includes('pgto cartao') ||
          descLower.includes('pagamento de fatura') ||
          t.meta?.isCardPayment
        ) {
          return false;
        }
      }
      return true;
    });

    const despesasFixasMap: Record<string, { value: number; competencia: string }> = {};
    const despesasVariaveisMap: Record<string, { value: number; competencia: string }> = {};

    operacoesDespesa.forEach(t => {
      const cat = categoriesMap.get(t.categoryId || '');
      const label = cat?.label || t.description || 'Outros';
      const comp = format(parseDateLocal(t.date), 'MM/yyyy');
      const isFixa = cat?.nature === 'despesa_fixa';
      const targetMap = isFixa ? despesasFixasMap : despesasVariaveisMap;
      const cur = targetMap[label] || { value: 0, competencia: comp };
      targetMap[label] = { value: cur.value + t.amount, competencia: comp };
    });

    // Adiciona parcelas de compras parceladas do billsTracker com vencimento no período
    billsTracker
      .filter(b => b.sourceType === 'purchase_installment' && !b.isExcluded && b.expectedAmount > 0)
      .forEach(b => {
        try {
          const d = parseDateLocal(b.dueDate);
          if (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() })) {
            const alreadyExists = txsInInterval.some(t => 
              (b.transactionId && t.id === b.transactionId) ||
              (Math.abs(t.amount - b.expectedAmount) < 0.01 && t.description === b.description)
            );
            if (alreadyExists) return;

            const cat = categoriesMap.get(b.suggestedCategoryId || '');
            const label = cat?.label || b.description || 'Compra Parcelada';
            const comp = format(d, 'MM/yyyy');
            const cur = despesasVariaveisMap[label] || { value: 0, competencia: comp };
            despesasVariaveisMap[label] = { value: cur.value + b.expectedAmount, competencia: comp };
          }
        } catch { }
      });

    const fix = Object.values(despesasFixasMap).reduce((a, b) => a + b.value, 0);
    const var_ = Object.values(despesasVariaveisMap).reduce((a, b) => a + b.value, 0);

    // Receitas Operacionais por Competência
    const receitasCompMap: Record<string, { value: number; competencia: string }> = {};
    const competenciasMes = cltCompetencias.filter(c => c.mesAno === monthKey);

    // Salários CLT: trabalho prestado na competência do mês com badge de competência
    if (competenciasMes.length > 0) {
      competenciasMes.forEach(c => {
        const contrato = cltContracts.find(con => con.id === c.contractId);
        const label = contrato ? `Salário (${contrato.empresa})` : 'Salário CLT';
        const valor = c.salarioLiquido || c.salarioBruto;
        if (valor > 0) {
          let compFormatted = monthKey;
          try {
            compFormatted = format(parseDateLocal(c.mesAno + '-01'), 'MM/yyyy');
          } catch {
            compFormatted = c.mesAno;
          }
          receitasCompMap[label] = {
            value: (receitasCompMap[label]?.value || 0) + valor,
            competencia: compFormatted
          };
        }
      });
    }

    // Recebíveis de clientes devidos na competência do período
    // NOMENCLATURA: Serviços / Contratos (não misturar com Repasses Restritos)
    let totalServicosContratos = 0;
    parcelasRecebiveis.forEach(p => {
      try {
        const d = parseDateLocal(p.dataVencimento);
        if (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() })) {
          const valor = p.valorPago || p.valorPrevisto;
          if (valor > 0) {
            totalServicosContratos += valor;
          }
        }
      } catch { }
    });

    if (totalServicosContratos > 0) {
      receitasCompMap['Serviços / Contratos'] = {
        value: totalServicosContratos,
        competencia: format(rangeTo || new Date(), 'MM/yyyy')
      };
    }

    // Transações normais de receita no período
    txsInInterval
      .filter(t => {
        const cat = categoriesMap.get(t.categoryId || '');
        return t.operationType === 'receita' && !isRendimentoTx(t, cat) && !isDescontoTx(t, cat);
      })
      .forEach(t => {
        const cat = categoriesMap.get(t.categoryId || '');
        const rawLabel = cat?.label || t.description || 'Outras Receitas';
        const labelLower = rawLabel.toLowerCase();

        // Categoria Repasses Restritos: NÃO misturar com Serviços / Contratos e manter separada para não duplicar!
        if (labelLower.includes('repasses restritos') || labelLower.includes('repasse restrito')) {
          const comp = format(parseDateLocal(t.date), 'MM/yyyy');
          const cur = receitasCompMap['Repasses Restritos'] || { value: 0, competencia: comp };
          receitasCompMap['Repasses Restritos'] = {
            value: cur.value + t.amount,
            competencia: comp
          };
          return;
        }

        // Salário: se já computado por competência CLT de holerite, não duplica
        const isSalario = labelLower.includes('salário') || labelLower.includes('salario');
        if (competenciasMes.length > 0 && isSalario) {
          return;
        }
        if (isSalario) {
          const comp = format(parseDateLocal(t.date), 'MM/yyyy');
          const cur = receitasCompMap[rawLabel] || { value: 0, competencia: comp };
          receitasCompMap[rawLabel] = { value: cur.value + t.amount, competencia: comp };
          return;
        }

        // Se transação já estiver vinculada a parcela de recebível, não duplica
        const isLinkedToRecebivel = parcelasRecebiveis.some(p => p.recebimentoGeradoId === t.id);
        if (isLinkedToRecebivel) return;

        // Se já computado em Serviços / Contratos via contratos/parcelas, evita duplicar
        if (totalServicosContratos > 0 && (labelLower.includes('serviço') || labelLower.includes('servico') || labelLower.includes('contrato') || labelLower.includes('cliente'))) {
          return;
        }

        const comp = format(parseDateLocal(t.date), 'MM/yyyy');
        const cur = receitasCompMap[rawLabel] || { value: 0, competencia: comp };
        receitasCompMap[rawLabel] = { value: cur.value + t.amount, competencia: comp };
      });

    const receitaOperacional = Object.values(receitasCompMap).reduce((a, b) => a + b.value, 0);

    // Rendimentos auferidos no período (Resultado Financeiro)
    const rendimentos = txsInInterval
      .filter(t => isRendimentoTx(t, categoriesMap.get(t.categoryId || '')))
      .reduce((a, t) => a + t.amount, 0);

    // Descontos obtidos por competência: apenas valores concretos de transações da categoria Descontos Obtidos
    const descontosObtidos = txsInInterval
      .filter(t => isDescontoTx(t, categoriesMap.get(t.categoryId || '')))
      .reduce((a, t) => a + t.amount, 0);

    // Juros por competência (apropriação da parcela contratual devida no período para cada empréstimo)
    let juros = 0;
    emprestimos.forEach(emp => {
      if (emp.status === 'ativo' && emp.dataInicio) {
        try {
          const schedule = calculateLoanSchedule(emp.id);
          const parcelaItem = schedule.find(item => {
            const dv = getDueDate(emp.dataInicio!, item.parcela);
            return (!rangeFrom || isWithinInterval(dv, { start: rangeFrom, end: rangeTo || new Date() }));
          });
          if (parcelaItem) {
            juros += parcelaItem.juros;
          }
        } catch { }
      }
    });

    if (juros === 0) {
      txsInInterval.filter(t => t.operationType === 'pagamento_emprestimo').forEach(t => {
        const lid = t.links?.loanId?.replace('loan_', '');
        const pid = t.links?.parcelaId;
        if (lid && pid) {
          const s = calculateLoanSchedule(parseInt(lid));
          const item = s.find(i => i.parcela === parseInt(pid));
          if (item) juros += item.juros;
        }
      });
    }

    // Juros bancários diretos (cheque especial, rotativo, etc.)
    txsInInterval.forEach(t => {
      const cat = categoriesMap.get(t.categoryId || '');
      if (isJurosTx(t, cat) && t.operationType !== 'pagamento_emprestimo') {
        juros += t.amount;
      }
    });

    const receitaTotal = receitaOperacional + rendimentos + descontosObtidos;
    const despesasOperacionais = fix + var_;
    const resultadoOperacional = receitaOperacional - despesasOperacionais;
    const resultadoFinanceiro = rendimentos + descontosObtidos - juros;
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;

    return {
      rec: receitaTotal,
      fix,
      var: var_,
      juros,
      rendimentos,
      descontosObtidos,
      res: resultadoLiquido,
      receitaOperacional,
      resultadoOperacional,
      resultadoFinanceiro,
      details: {
        receitas: Object.entries(receitasCompMap).map(([label, entry]) => ({ 
          label, 
          value: entry.value, 
          competencia: entry.competencia,
          id: `comp-rec-${label}` 
        })),
        despesasFixas: Object.entries(despesasFixasMap).map(([label, entry]) => ({ 
          label, 
          value: entry.value, 
          competencia: entry.competencia,
          id: `comp-fix-${label}` 
        })),
        despesasVariaveis: Object.entries(despesasVariaveisMap).map(([label, entry]) => ({ 
          label, 
          value: entry.value, 
          competencia: entry.competencia,
          id: `comp-var-${label}` 
        })),
      },
    };
  }, [transacoesV2, billsTracker, cltCompetencias, cltContracts, parcelasRecebiveis, emprestimos, calculateLoanSchedule, categoriesMap, creditCardAccountIds]);

  // 3. DRE ORÇADO: Valores do orçamento e receita prevista com base no último holerite e tela recebimentos
  const calculateDREOrcado = useCallback((range: DateRange): DREData => {
    const rangeTo = range.to || new Date();
    const monthKey = format(rangeTo, 'yyyy-MM');

    // 1) Receita Prevista Orçada
    const receitasOrcadasList: DREDetailEntry[] = [];

    // Base A: Contratos CLT Ativos - Utiliza o valor líquido da última competência recebida
    const cltAtivos = cltContracts.filter(c => c.status === 'ativo');
    if (cltAtivos.length > 0) {
      cltAtivos.forEach(c => {
        // Encontra as competências do contrato ordenadas da mais recente para a mais antiga
        const comps = cltCompetencias
          .filter(compItem => compItem.contractId === c.id)
          .sort((a, b) => b.mesAno.localeCompare(a.mesAno));

        // Prioriza a última competência recebida/fechada ou com salário líquido apurado
        const lastReceivedComp = comps.find(compItem => 
          (compItem.statusRecebimento === 'recebido' || compItem.status === 'fechado' || !!compItem.dataRecebimento || !!compItem.transactionId) && 
          compItem.salarioLiquido > 0
        ) || comps.find(compItem => compItem.salarioLiquido > 0);

        let valorLiquido = 0;
        let compLabel = format(rangeTo, 'MM/yyyy');

        if (lastReceivedComp && lastReceivedComp.salarioLiquido > 0) {
          valorLiquido = lastReceivedComp.salarioLiquido;
          try {
            compLabel = format(parseDateLocal(lastReceivedComp.mesAno + '-01'), 'MM/yyyy');
          } catch {
            compLabel = lastReceivedComp.mesAno;
          }
        } else {
          valorLiquido = c.salarioBrutoAtual ? Math.round(c.salarioBrutoAtual * 0.82) : 0;
        }

        if (valorLiquido > 0) {
          receitasOrcadasList.push({
            label: `Salário Previsto (${c.empresa})`,
            value: valorLiquido,
            competencia: compLabel,
            id: `orc-salario-${c.id}`
          });
        }
      });
    }

    // Base B: Tela de Recebimentos - Parcelas de Clientes com vencimento no mês (Serviços / Contratos)
    let totalContratosPrevistos = 0;
    parcelasRecebiveis
      .filter(p => p.dataVencimento.startsWith(monthKey))
      .forEach(p => {
        if (p.valorPrevisto > 0) {
          totalContratosPrevistos += p.valorPrevisto;
        }
      });

    if (totalContratosPrevistos > 0) {
      receitasOrcadasList.push({
        label: 'Serviços / Contratos (Previsto)',
        value: totalContratosPrevistos,
        competencia: format(rangeTo, 'MM/yyyy'),
        id: 'orc-contratos-clientes'
      });
    }

    // Se nenhuma receita orçada foi projetada pelas bases acima, usa média histórica
    if (receitasOrcadasList.length === 0) {
      const recentMonths = [1, 2, 3].map(m => subMonths(rangeTo, m));
      let totalHist = 0;
      let countHist = 0;
      recentMonths.forEach(d => {
        const histTxs = transacoesV2.filter(t => {
          try {
            return isWithinInterval(parseDateLocal(t.date), { start: startOfMonth(d), end: endOfMonth(d) }) && t.operationType === 'receita';
          } catch { return false; }
        });
        const rec = histTxs.reduce((a, t) => a + t.amount, 0);
        if (rec > 0) {
          totalHist += rec;
          countHist++;
        }
      });
      const mediaHist = countHist > 0 ? totalHist / countHist : 0;
      if (mediaHist > 0) {
        receitasOrcadasList.push({
          label: 'Média Histórica (3 meses)',
          value: mediaHist,
          competencia: format(rangeTo, 'MM/yyyy'),
          id: 'orc-hist'
        });
      }
    }

    const receitaOperacional = receitasOrcadasList.reduce((a, b) => a + b.value, 0);

    // 2) Despesas Orçadas (Valores do Orçamento)
    // CRÍTICO: Exclui parcelas de financiamento/empréstimo de despesas operacionais (valor total vai para passivo e juros para resultado financeiro)
    const despesasFixasOrcadasMap: Record<string, number> = {};
    const despesasVariaveisOrcadasMap: Record<string, number> = {};

    const snapshot = expenseSnapshots[monthKey];
    if (snapshot && snapshot.categories && snapshot.categories.length > 0) {
      snapshot.categories.forEach(catItem => {
        const nameLower = catItem.name.toLowerCase();
        // Exclui financiamento / empréstimo da despesa operacional
        if (nameLower.includes('empréstimo') || nameLower.includes('emprestimo') || nameLower.includes('financiamento')) {
          return;
        }
        const cat = categoriasV2.find(c => c.label.toLowerCase() === nameLower);
        const isFixa = cat?.nature === 'despesa_fixa' || nameLower.includes('fix') || nameLower.includes('aluguel') || nameLower.includes('seguro');
        if (isFixa) {
          despesasFixasOrcadasMap[catItem.name] = (despesasFixasOrcadasMap[catItem.name] || 0) + catItem.value;
        } else {
          despesasVariaveisOrcadasMap[catItem.name] = (despesasVariaveisOrcadasMap[catItem.name] || 0) + catItem.value;
        }
      });
    } else {
      // Compila orçamento a partir dos compromissos planejados em billsTracker
      // Exclui faturas de cartão e parcelas de empréstimo/financiamento
      billsTracker
        .filter(b => 
          b.dueDate.startsWith(monthKey) && 
          !b.isExcluded && 
          b.expectedAmount > 0 &&
          b.sourceType !== 'credit_card_invoice' &&
          b.sourceType !== 'card_invoice' &&
          b.sourceType !== 'loan_installment' &&
          !b.id.startsWith('invoice_') &&
          !b.id.startsWith('loan_')
        )
        .forEach(b => {
          const cat = categoriesMap.get(b.suggestedCategoryId || '');
          const label = cat?.label || b.description || 'Despesa Planejada';
          const labelLower = label.toLowerCase();
          if (labelLower.includes('empréstimo') || labelLower.includes('emprestimo') || labelLower.includes('financiamento')) {
            return;
          }
          const isFixa = cat?.nature === 'despesa_fixa' || b.sourceType === 'fixed_expense' || b.sourceType === 'insurance_installment';
          if (isFixa) {
            despesasFixasOrcadasMap[label] = (despesasFixasOrcadasMap[label] || 0) + b.expectedAmount;
          } else {
            despesasVariaveisOrcadasMap[label] = (despesasVariaveisOrcadasMap[label] || 0) + b.expectedAmount;
          }
        });
    }

    const fix = Object.values(despesasFixasOrcadasMap).reduce((a, b) => a + b, 0);
    const var_ = Object.values(despesasVariaveisOrcadasMap).reduce((a, b) => a + b, 0);

    // 3) Juros orçados conforme cronograma dos empréstimos ativos para a competência (Resultado Financeiro)
    let juros = 0;
    emprestimos.forEach(emp => {
      if (emp.status === 'ativo' && emp.dataInicio) {
        try {
          const schedule = calculateLoanSchedule(emp.id);
          const parcelaItem = schedule.find(item => {
            const dueDate = getDueDate(emp.dataInicio!, item.parcela);
            return format(dueDate, 'yyyy-MM') === monthKey;
          });
          if (parcelaItem) {
            juros += parcelaItem.juros;
          }
        } catch { }
      }
    });

    if (juros === 0) {
      billsTracker
        .filter(b => b.sourceType === 'loan_installment' && b.dueDate.startsWith(monthKey) && !b.isExcluded)
        .forEach(b => {
          if (b.sourceRef) {
            const schedule = calculateLoanSchedule(parseInt(b.sourceRef));
            const item = schedule.find(i => i.parcela === b.parcelaNumber);
            if (item) juros += item.juros;
          }
        });
    }

    // Rendimentos previstos (média recente)
    const recentMonths = [1, 2].map(m => subMonths(rangeTo, m));
    let rendimentosTotal = 0;
    recentMonths.forEach(d => {
      const hist = transacoesV2.filter(t => {
        try {
          return isWithinInterval(parseDateLocal(t.date), { start: startOfMonth(d), end: endOfMonth(d) }) && isRendimentoTx(t, categoriesMap.get(t.categoryId || ''));
        } catch { return false; }
      });
      rendimentosTotal += hist.reduce((a, t) => a + t.amount, 0);
    });
    const rendimentos = rendimentosTotal > 0 ? rendimentosTotal / recentMonths.length : 0;
    const descontosObtidos = 0;

    const receitaTotal = receitaOperacional + rendimentos + descontosObtidos;
    const despesasOperacionais = fix + var_;
    const resultadoOperacional = receitaOperacional - despesasOperacionais;
    const resultadoFinanceiro = rendimentos + descontosObtidos - juros;
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;

    return {
      rec: receitaTotal,
      fix,
      var: var_,
      juros,
      rendimentos,
      descontosObtidos,
      res: resultadoLiquido,
      receitaOperacional,
      resultadoOperacional,
      resultadoFinanceiro,
      details: {
        receitas: receitasOrcadasList,
        despesasFixas: Object.entries(despesasFixasOrcadasMap).map(([label, value]) => ({ 
          label, 
          value, 
          competencia: format(rangeTo, 'MM/yyyy'),
          id: `orc-fix-${label}` 
        })),
        despesasVariaveis: Object.entries(despesasVariaveisOrcadasMap).map(([label, value]) => ({ 
          label, 
          value, 
          competencia: format(rangeTo, 'MM/yyyy'),
          id: `orc-var-${label}` 
        })),
      },
    };
  }, [cltContracts, cltCompetencias, parcelasRecebiveis, expenseSnapshots, billsTracker, emprestimos, calculateLoanSchedule, transacoesV2, categoriasV2, categoriesMap]);

  // Função despachante que calcula conforme o regime ativo selecionado
  const calculateDRE = useCallback((range: DateRange, mode: DREMode): DREData => {
    if (mode === 'caixa') return calculateDRECaixa(range);
    if (mode === 'orcado') return calculateDREOrcado(range);
    return calculateDRECompetencia(range);
  }, [calculateDRECaixa, calculateDRECompetencia, calculateDREOrcado]);

  // DRE período principal e período anterior vinculados ao dreMode selecionado
  const dre1 = useMemo(() => calculateDRE(range1, dreMode), [calculateDRE, range1, dreMode]);
  const dre2 = useMemo(() => calculateDRE(range2, dreMode), [calculateDRE, range2, dreMode]);

  const variacaoRL = dre2.res !== 0 ? ((dre1.res - dre2.res) / Math.abs(dre2.res)) * 100 : 0;
  
  // Indicadores usam de base o método ativo (por padrão Competência)
  const indicadores = useMemo(() => {
    const { res, rec, fix, var: v, juros, rendimentos } = dre1;
    const totalDespesas = fix + v + juros;
    return {
      margemLiquida: rec > 0 ? (res / rec) * 100 : 0,
      eficienciaOp:
        rec - rendimentos > 0
          ? (((rec - rendimentos) - fix) / (rec - rendimentos)) * 100
          : 0,
      pesoFixos: totalDespesas > 0 ? (fix / totalDespesas) * 100 : 0,
      savingsRate: rec > 0 ? (Math.max(0, res) / rec) * 100 : 0,
      impactoFinanceiro: rec > 0 ? (Math.abs(juros) / rec) * 100 : 0,
      pontoEquilibrio: (fix + v) > 0 ? (fix / (fix + v)) * 100 : 0
    };
  }, [dre1]);
  
  const dreStatementData: DREItem[] = useMemo(() => [
    {
      label: "RECEITA OPERACIONAL",
      value: dre1.receitaOperacional,
      type: "header",
      icon: TrendingUp,
      color: "text-success",
      details: dre1.details.receitas.map((r) => ({
        label: r.label,
        value: r.value,
        type: "detail",
        icon: getCategoryIcon(r.label, TrendingUp),
        color: "text-success",
        competencia: r.competencia,
        sublabel: r.sublabel,
      })),
    },
    {
      label: "DESPESAS OPERACIONAIS",
      value: dre1.fix + dre1.var,
      type: "header",
      icon: TrendingDown,
      color: "text-destructive",
      details: [
        ...dre1.details.despesasFixas.map((d) => ({
          label: d.label,
          value: d.value,
          type: "detail" as const,
          icon: getCategoryIcon(d.label, TrendingDown),
          color: "text-destructive",
          competencia: d.competencia,
          sublabel: d.sublabel,
          details: d.details?.map(sub => ({
            label: sub.label,
            value: sub.value,
            type: "detail" as const,
            color: "text-destructive",
            competencia: sub.competencia,
          })),
        })),
        ...dre1.details.despesasVariaveis.map((d) => ({
          label: d.label,
          value: d.value,
          type: "detail" as const,
          icon: getCategoryIcon(d.label, Activity),
          color: "text-destructive",
          competencia: d.competencia,
          sublabel: d.sublabel,
          details: d.details?.map(sub => ({
            label: sub.label,
            value: sub.value,
            type: "detail" as const,
            color: "text-destructive",
            competencia: sub.competencia,
          })),
        })),
      ],
    },
    {
      label: "RESULTADO OPERACIONAL",
      value: dre1.resultadoOperacional,
      type: "subtotal",
      icon: DollarSign,
      color: dre1.resultadoOperacional >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "RESULTADO FINANCEIRO",
      value: dre1.resultadoFinanceiro,
      type: "header",
      icon: Zap,
      color: dre1.resultadoFinanceiro >= 0 ? "text-success" : "text-destructive",
      details: [
        {
          label: "Rendimentos Financeiros",
          value: dre1.rendimentos,
          type: "detail",
          icon: Sparkles,
          color: "text-success",
        },
        {
          label: "Descontos Obtidos",
          value: dre1.descontosObtidos,
          type: "detail",
          icon: Award,
          color: "text-success",
        },
        {
          label: "Juros e Encargos",
          value: -dre1.juros,
          type: "detail",
          icon: Gauge,
          color: "text-destructive",
        },
      ],
    },
    {
      label: "RESULTADO LÍQUIDO DO PERÍODO",
      value: dre1.res,
      type: "final",
      icon: DollarSign,
      color: dre1.res >= 0 ? "text-success" : "text-destructive",
    },
  ], [dre1, getCategoryIcon]);

  const evolutionData = useMemo(() => {
    const now = new Date();
    const result: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const dre = calculateDRE({ from: startOfMonth(data), to: endOfMonth(data) }, dreMode);
      result.push({ mes: format(data, 'MMM', { locale: ptBR }), receitas: dre.rec, despesas: dre.fix + dre.var + dre.juros, resultado: dre.res });
    }
    return result;
  }, [calculateDRE, dreMode]);

  const compositionData = useMemo(() => {
    const palette = [
      colors.primary, 'hsl(var(--neon-purple))', 'hsl(var(--neon-blue))',
      colors.destructive, 'hsl(var(--neon-pink))', colors.warning,
      colors.success, 'hsl(var(--neon-cyan))', 'hsl(var(--indigo-500))'
    ];

    const categoryTotals = new Map<string, number>();

    const processItem = (d: DREDetailEntry) => {
      if (d.details && d.details.length > 0) {
        d.details.forEach(sub => {
          categoryTotals.set(sub.label, (categoryTotals.get(sub.label) || 0) + sub.value);
        });
      } else {
        // Remove sufixo como (Nubank) ou sufixos de faturas se houver
        const cleanName = d.label.replace(/\s*\([^)]*\)$/, '').trim() || d.label;
        categoryTotals.set(cleanName, (categoryTotals.get(cleanName) || 0) + d.value);
      }
    };

    dre1.details.despesasFixas.forEach(processItem);
    dre1.details.despesasVariaveis.forEach(processItem);
    
    if (dre1.juros > 0) {
      categoryTotals.set('Juros e Encargos', (categoryTotals.get('Juros e Encargos') || 0) + dre1.juros);
    }

    const filtered = Array.from(categoryTotals.entries())
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    if (filtered.length === 0) return [];

    return filtered.map((d, i) => ({ ...d, color: palette[i % palette.length] }));
  }, [dre1, colors]);

  const totalGastos = useMemo(() => dre1.fix + dre1.var + dre1.juros, [dre1]);
  const resultadoLiquidoLabel = useMemo(() => {
    const v = dre1.res;
    return v < 0 ? `-${formatCurrency(Math.abs(v))}` : formatCurrency(v);
  }, [dre1.res]);

  const modeBadgeText = useMemo(() => {
    if (dreMode === 'competencia') return "Regime de Competência (Padrão)";
    if (dreMode === 'caixa') return "Regime de Caixa";
    return "DRE Orçado";
  }, [dreMode]);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <div className={cn(
            "rounded-[40px] p-8 sm:p-10 shadow-soft relative overflow-hidden border-4 h-[400px] flex flex-col justify-center group transition-all duration-700",
            dre1.res >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
          )}>
             <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent"></div>
             <div className="absolute right-0 top-0 opacity-10 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000">
                <Receipt className="w-[300px] h-[300px] text-primary" />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-6 flex-wrap">
                  <Badge className={cn("border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest", dre1.res >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                    {dre1.res >= 0 ? "Superávit Mensal" : "Déficit Mensal"}
                  </Badge>
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted/40">
                    {modeBadgeText}
                  </span>
                </div>
                <h2 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Resultado Líquido do Período</h2>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                   <h3 className={cn("font-display font-extrabold text-5xl sm:text-6xl tracking-tighter leading-none tabular-nums whitespace-nowrap", dre1.res >= 0 ? "text-success" : "text-destructive")}>
                      {resultadoLiquidoLabel}
                   </h3>
                   <Badge className={cn("rounded-xl px-4 py-2 font-black text-xs gap-2 mb-2 w-fit", variacaoRL >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {variacaoRL >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {Math.abs(variacaoRL).toFixed(1)}% evolução
                   </Badge>
                </div>
                <div className="mt-8 flex items-center gap-2">
                   <Sparkles className="w-3.5 h-3.5 text-accent" />
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance Orbium calculada em {format(finalDate, "MM/yyyy")}</span>
                </div>
             </div>
          </div>
        </div>
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <IndicatorCard 
            title="Margem Líq." 
            value={`${indicadores.margemLiquida.toFixed(1)}%`} 
            status={indicadores.margemLiquida >= 20 ? "success" : "warning"}
            icon={DollarSign}
            description="Quanto sobra da sua renda após pagar todas as contas."
            formula="Resultado ÷ Renda × 100"
            formulaValues={`${formatCurrency(dre1.res)} ÷ ${formatCurrency(dre1.rec)} × 100`}
          />
          <IndicatorCard 
            title="Eficiência Op." 
            value={`${indicadores.eficienciaOp.toFixed(1)}%`} 
            status={indicadores.eficienciaOp >= 70 ? "success" : "warning"}
            icon={Zap}
            description="Quanto da sua renda está livre após custos fixos."
            formula="(Renda - Fixos) ÷ Renda × 100"
            formulaValues={`(${formatCurrency(dre1.receitaOperacional)} - ${formatCurrency(dre1.fix)}) ÷ ${formatCurrency(dre1.receitaOperacional)} × 100`}
          />
          <IndicatorCard 
            title="Fixos (%)" 
            value={`${indicadores.pesoFixos.toFixed(1)}%`} 
            status={indicadores.pesoFixos <= 40 ? "success" : "warning"}
            icon={Target}
            description="Quanto dos seus gastos são fixos e difíceis de cortar."
            formula="Fixos ÷ Total Gastos × 100"
            formulaValues={`${formatCurrency(dre1.fix)} ÷ ${formatCurrency(dre1.fix + dre1.var + dre1.juros)} × 100`}
          />
          <IndicatorCard 
            title="Juros (%)" 
            value={`${indicadores.impactoFinanceiro.toFixed(1)}%`} 
            status={indicadores.impactoFinanceiro <= 5 ? "success" : "warning"}
            icon={Gauge}
            description="Impacto dos juros de empréstimos na sua renda."
            formula="Juros ÷ Renda × 100"
            formulaValues={`${formatCurrency(dre1.juros)} ÷ ${formatCurrency(dre1.rec)} × 100`}
          />
          <IndicatorCard 
            title="Fixos vs Var." 
            value={`${indicadores.pontoEquilibrio.toFixed(1)}%`} 
            status={indicadores.pontoEquilibrio <= 50 ? "success" : "warning"}
            icon={Activity}
            description="Proporção entre gastos fixos e variáveis."
            formula="Fixos ÷ (Fixos + Variáveis) × 100"
            formulaValues={`${formatCurrency(dre1.fix)} ÷ (${formatCurrency(dre1.fix)} + ${formatCurrency(dre1.var)}) × 100`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Renda Total</p>
            <p className="text-lg font-black tabular-nums text-success">{formatCurrency(dre1.rec)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Custos Fixos</p>
            <p className="text-lg font-black tabular-nums text-destructive/80">{formatCurrency(dre1.fix)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Custos Variáveis</p>
             <p className="text-lg font-black tabular-nums text-destructive">{formatCurrency(dre1.var)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Resultado Operacional</p>
             <p className="text-lg font-black tabular-nums text-primary">{formatCurrency(dre1.resultadoOperacional)}</p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Resultado Financeiro</p>
             <p className={cn("text-lg font-black tabular-nums", dre1.resultadoFinanceiro >= 0 ? "text-success" : "text-destructive")}>
               {formatCurrency(dre1.resultadoFinanceiro)}
             </p>
         </div>
         <div className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Variação do Período</p>
            <p className={cn("text-lg font-black tabular-nums", dre1.res >= dre2.res ? "text-success" : "text-destructive")}>{formatCurrency(dre1.res - dre2.res)}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-10">
          <DREStatement
            title={`DRE ${format(finalDate, "MM/yyyy")}`}
            data={dreStatementData}
            activeMode={dreMode}
            onModeChange={setDreMode}
            className="mt-2"
          />
        </div>

        <div className="lg:col-span-5 space-y-10 lg:sticky lg:top-24">
          <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="p-2 bg-primary/10 rounded-xl text-primary"><BarChart3 className="w-5 h-5" /></div>
               <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">
                 {dreMode === 'orcado' ? 'Evolução Orçada Histórica' : dreMode === 'competencia' ? 'Resultado Histórico (Competência)' : 'Fluxo de Caixa Histórico'}
               </h4>
            </div>
            <div className="h-[280px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData}>
                     <defs>
                        <linearGradient id="recGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.success} stopOpacity={0.3}/><stop offset="95%" stopColor={colors.success} stopOpacity={0}/></linearGradient>
                        <linearGradient id="despGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.destructive} stopOpacity={0.3}/><stop offset="95%" stopColor={colors.destructive} stopOpacity={0}/></linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                     <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} tickFormatter={v => `R$ ${v/1000}k`} />
                     <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                     <Legend iconType="circle" />
                     <Area type="monotone" dataKey="receitas" name="Receitas" stroke={colors.success} strokeWidth={4} fillOpacity={1} fill="url(#recGradient)" />
                     <Area type="monotone" dataKey="despesas" name="Despesas" stroke={colors.destructive} strokeWidth={4} fillOpacity={1} fill="url(#despGradient)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft flex flex-col">
            <div className="flex items-center gap-3 mb-8 px-2">
               <div className="p-2 bg-accent/10 rounded-xl text-accent"><PieChart className="w-5 h-5" /></div>
               <h4 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Top Gastos por Categoria</h4>
            </div>
            
            <div className="flex-1 min-h-[320px] relative flex flex-col items-center justify-center">
              <div className="w-full h-[280px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie 
                      data={compositionData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="72%" 
                      outerRadius="95%" 
                      paddingAngle={6} 
                      dataKey="value" 
                      stroke="none"
                      cornerRadius={12}
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: 'none', 
                        borderRadius: '16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
                      }}
                      formatter={(v: number) => [formatCurrency(v), "Valor"]}
                    />
                  </RePieChart>
                </ResponsiveContainer>

                {/* Valor Centralizado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Gastos</span>
                  <p className="text-2xl font-black text-foreground tracking-tighter">
                    {formatCurrency(totalGastos)}
                  </p>
                </div>
              </div>

              {/* Legenda customizada em Badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {compositionData.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/40 shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-foreground truncate max-w-[100px]">{item.name}</span>
                    <span className="text-[9px] font-black text-muted-foreground">
                      {totalGastos > 0 ? ((item.value / totalGastos) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}