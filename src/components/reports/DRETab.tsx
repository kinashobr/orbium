import React, { useMemo, useCallback, useState } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Calculator, Minus, Plus, 
  Sparkles, Receipt, Zap, PieChart, BarChart3, LineChart, Activity, Gauge, ArrowUpRight, ArrowDownRight, Target, PiggyBank, Award
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ComparisonDateRanges, DateRange, formatCurrency } from "@/types/finance";
import { startOfDay, endOfDay, isWithinInterval, subMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { ptBR } from "date-fns/locale";
import { IndicatorCard } from "./IndicatorCard";
import { DREStatement, DREMode } from "./DREStatement";

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
    receitas: { label: string; value: number; id: string }[];
    despesasFixas: { label: string; value: number; id: string }[];
    despesasVariaveis: { label: string; value: number; id: string }[];
  };
}

interface DREItem {
  label: string;
  value: number;
  type: "header" | "subtotal" | "detail" | "final";
  details?: DREItem[];
  icon?: React.ElementType;
  color?: string;
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
    const cat = categoriasV2.find(c => c.label === label);
    if (cat?.icon) {
      return () => <span className="text-lg leading-none flex items-center justify-center">{cat.icon}</span>;
    }
    return defaultIcon;
  }, [categoriasV2]);

  const finalDate = range1.to || new Date();
  const prevDate = range2.to || subMonths(finalDate, 1);

  // 1. DRE REGIME DE CAIXA: Real desembolso de caixa (data de liquidação)
  const calculateDRECaixa = useCallback((range: DateRange): DREData => {
    const rangeFrom = range.from ? startOfDay(range.from) : undefined;
    const rangeTo = range.to ? endOfDay(range.to) : undefined;
    
    const txs = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() }));
      } catch { return false; }
    });

    const descontosObtidos = txs
      .filter((t) => t.categoryId === 'cat_descontos_obtidos' || categoriesMap.get(t.categoryId || '')?.label === 'Descontos Obtidos')
      .reduce((a, t) => a + t.amount, 0);

    const receitaOperacional = txs
      .filter((t) => t.operationType === 'receita' && t.categoryId !== 'cat_descontos_obtidos' && categoriesMap.get(t.categoryId || '')?.label !== 'Descontos Obtidos')
      .reduce((a, t) => a + t.amount, 0);

    const rendimentos = txs
      .filter((t) => t.operationType === 'rendimento')
      .reduce((a, t) => a + t.amount, 0);

    const receitaTotal = receitaOperacional + rendimentos + descontosObtidos;
    
    const fix = txs
      .filter((t) => categoriesMap.get(t.categoryId || '')?.nature === 'despesa_fixa')
      .reduce((a, t) => a + t.amount, 0);
    const var_ = txs
      .filter((t) => categoriesMap.get(t.categoryId || '')?.nature === 'despesa_variavel')
      .reduce((a, t) => a + t.amount, 0);
    
    let juros = 0;
    txs.filter(t => t.operationType === 'pagamento_emprestimo').forEach(t => {
      const lid = t.links?.loanId?.replace('loan_', '');
      const pid = t.links?.parcelaId;
      if (lid && pid) {
        const s = calculateLoanSchedule(parseInt(lid));
        const item = s.find(i => i.parcela === parseInt(pid));
        if (item) juros += item.juros;
      }
    });

    const despesasOperacionais = fix + var_;
    const resultadoOperacional = receitaOperacional - despesasOperacionais;
    const resultadoFinanceiro = rendimentos + descontosObtidos - juros;
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;
    
    const groupDetails = (
      nature: 'receita' | 'despesa_fixa' | 'despesa_variavel',
      operationType?: 'receita' | 'despesa'
    ) => {
      const filteredTxs = txs.filter((t) => {
        const catNature = categoriesMap.get(t.categoryId || '')?.nature;
        if (catNature !== nature) return false;
        if (operationType && t.operationType !== operationType) return false;
        if (t.categoryId === 'cat_descontos_obtidos') return false;
        return true;
      });
      const grouped = filteredTxs.reduce((acc, t) => {
        const label = categoriesMap.get(t.categoryId || '')?.label || 'Outros';
        acc[label] = (acc[label] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(grouped).map(([label, value]) => ({ label, value, id: label }));
    };

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
        receitas: groupDetails('receita', 'receita'),
        despesasFixas: groupDetails('despesa_fixa'),
        despesasVariaveis: groupDetails('despesa_variavel'),
      },
    };
  }, [transacoesV2, calculateLoanSchedule, categoriesMap]);

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
    // 1) Compras no cartão de crédito na data da compra (fato gerador da despesa)
    // 2) Despesas em contas correntes exceto quitação de cartão para evitar duplicidade
    const operacoesDespesa = txsInInterval.filter(t => {
      if (t.operationType !== 'despesa') return false;
      const descLower = (t.description || '').toLowerCase();
      // Se for pagamento de fatura do cartão feito na conta corrente, excluímos no regime de competência
      // pois as compras originais já constam na conta do cartão na data do fato gerador.
      if (!creditCardAccountIds.has(t.accountId)) {
        if (descLower.includes('fatura') || descLower.includes('pagamento cartão') || descLower.includes('pgto cartao')) {
          return false;
        }
      }
      return true;
    });

    // Agrupamento de despesas operacionais
    const despesasFixasMap: Record<string, number> = {};
    const despesasVariaveisMap: Record<string, number> = {};

    operacoesDespesa.forEach(t => {
      const cat = categoriesMap.get(t.categoryId || '');
      const label = cat?.label || 'Outros';
      if (cat?.nature === 'despesa_fixa') {
        despesasFixasMap[label] = (despesasFixasMap[label] || 0) + t.amount;
      } else {
        despesasVariaveisMap[label] = (despesasVariaveisMap[label] || 0) + t.amount;
      }
    });

    // Adiciona parcelas de compras parceladas do billsTracker que vencerem no período, caso não registradas em txs
    billsTracker
      .filter(b => b.sourceType === 'purchase_installment' && !b.isExcluded && b.expectedAmount > 0)
      .forEach(b => {
        try {
          const d = parseDateLocal(b.dueDate);
          if (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() })) {
            // Se já tem transactionId correspondente nas txs do período, não duplica
            if (b.transactionId && txsInInterval.some(t => t.id === b.transactionId)) return;
            const cat = categoriesMap.get(b.suggestedCategoryId || '');
            const label = cat?.label || b.description || 'Compra Parcelada';
            despesasVariaveisMap[label] = (despesasVariaveisMap[label] || 0) + b.expectedAmount;
          }
        } catch { }
      });

    const fix = Object.values(despesasFixasMap).reduce((a, b) => a + b, 0);
    const var_ = Object.values(despesasVariaveisMap).reduce((a, b) => a + b, 0);

    // Receitas Operacionais por Competência:
    // Salários CLT: trabalho prestado na competência do mês
    const receitasMap: Record<string, number> = {};
    const competenciasMes = cltCompetencias.filter(c => c.mesAno === monthKey);

    if (competenciasMes.length > 0) {
      competenciasMes.forEach(c => {
        const contrato = cltContracts.find(con => con.id === c.contractId);
        const label = contrato ? `Salário (${contrato.empresa})` : 'Salário CLT';
        receitasMap[label] = (receitasMap[label] || 0) + (c.salarioLiquido || c.salarioBruto);
      });
    }

    // Recebíveis de clientes devidos na competência do período
    parcelasRecebiveis.forEach(p => {
      try {
        const d = parseDateLocal(p.dataVencimento);
        if (!rangeFrom || isWithinInterval(d, { start: rangeFrom, end: rangeTo || new Date() })) {
          const valor = p.valorPago || p.valorPrevisto;
          if (valor > 0) {
            receitasMap['Serviços / Clientes'] = (receitasMap['Serviços / Clientes'] || 0) + valor;
          }
        }
      } catch { }
    });

    // Transações normais de receita no período (excluindo salários manuais se a competência CLT já computou)
    txsInInterval
      .filter(t => t.operationType === 'receita' && t.categoryId !== 'cat_descontos_obtidos')
      .forEach(t => {
        const cat = categoriesMap.get(t.categoryId || '');
        const label = cat?.label || 'Outras Receitas';
        const isSalario = label.toLowerCase().includes('salário') || label.toLowerCase().includes('salario');
        if (competenciasMes.length > 0 && isSalario) {
          // Já computado pela competência CLT do holerite
          return;
        }
        receitasMap[label] = (receitasMap[label] || 0) + t.amount;
      });

    const receitaOperacional = Object.values(receitasMap).reduce((a, b) => a + b, 0);

    // Rendimentos auferidos no período
    const rendimentos = txsInInterval
      .filter(t => t.operationType === 'rendimento')
      .reduce((a, t) => a + t.amount, 0);

    // Descontos obtidos
    const descontosObtidos = txsInInterval
      .filter(t => t.categoryId === 'cat_descontos_obtidos' || categoriesMap.get(t.categoryId || '')?.label === 'Descontos Obtidos')
      .reduce((a, t) => a + t.amount, 0);

    // Juros por competência (apropriação da parcela devida no período para cada empréstimo)
    let juros = 0;
    emprestimos.forEach(emp => {
      if (emp.status === 'ativo' && emp.dataInicio) {
        try {
          const schedule = calculateLoanSchedule(emp.id);
          const parcelaItem = schedule.find(item => {
            if (!item.dataVencimento) return false;
            const dv = parseDateLocal(item.dataVencimento);
            return (!rangeFrom || isWithinInterval(dv, { start: rangeFrom, end: rangeTo || new Date() }));
          });
          if (parcelaItem) {
            juros += parcelaItem.juros;
          }
        } catch { }
      }
    });

    // Se não encontrou juros contratuais por cronograma, usa os pagos nas transações
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
        receitas: Object.entries(receitasMap).map(([label, value]) => ({ label, value, id: label })),
        despesasFixas: Object.entries(despesasFixasMap).map(([label, value]) => ({ label, value, id: label })),
        despesasVariaveis: Object.entries(despesasVariaveisMap).map(([label, value]) => ({ label, value, id: label })),
      },
    };
  }, [transacoesV2, billsTracker, cltCompetencias, cltContracts, parcelasRecebiveis, emprestimos, calculateLoanSchedule, categoriesMap, creditCardAccountIds]);

  // 3. DRE ORÇADO: Valores do orçamento e receita prevista com base no histórico e tela recebimentos
  const calculateDREOrcado = useCallback((range: DateRange): DREData => {
    const rangeTo = range.to || new Date();
    const monthKey = format(rangeTo, 'yyyy-MM');

    // 1) Receita Prevista
    const receitasOrcadasMap: Record<string, number> = {};

    // Base A: Tela de Recebimentos - Contratos CLT
    const cltAtivos = cltContracts.filter(c => c.status === 'ativo');
    if (cltAtivos.length > 0) {
      cltAtivos.forEach(c => {
        const comp = cltCompetencias.find(compItem => compItem.contractId === c.id && compItem.mesAno === monthKey);
        const valorLiquido = comp ? comp.salarioLiquido : Math.round(c.salarioBrutoAtual * 0.82);
        receitasOrcadasMap[`Salário Previsto (${c.empresa})`] = (receitasOrcadasMap[`Salário Previsto (${c.empresa})`] || 0) + valorLiquido;
      });
    }

    // Base B: Tela de Recebimentos - Parcelas de Clientes com vencimento no mês
    parcelasRecebiveis
      .filter(p => p.dataVencimento.startsWith(monthKey))
      .forEach(p => {
        const valor = p.valorPrevisto;
        if (valor > 0) {
          receitasOrcadasMap['Contratos de Clientes (Previsto)'] = (receitasOrcadasMap['Contratos de Clientes (Previsto)'] || 0) + valor;
        }
      });

    // Base C: Previsão manual de receita em revenueForecasts
    const manualForecast = revenueForecasts[monthKey] || 0;
    const somaAtualReceitas = Object.values(receitasOrcadasMap).reduce((a, b) => a + b, 0);

    if (manualForecast > somaAtualReceitas) {
      const diferenca = manualForecast - somaAtualReceitas;
      receitasOrcadasMap['Receita Prevista Adicional'] = diferenca;
    } else if (somaAtualReceitas === 0 && manualForecast > 0) {
      receitasOrcadasMap['Receita Prevista (Orçamento)'] = manualForecast;
    }

    // Base D: Histórico recente (média dos últimos 3 meses) se nenhuma receita foi projetada
    if (Object.keys(receitasOrcadasMap).length === 0) {
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
        receitasOrcadasMap['Média Histórica (3 meses)'] = mediaHist;
      }
    }

    const receitaOperacional = Object.values(receitasOrcadasMap).reduce((a, b) => a + b, 0);

    // 2) Despesas Orçadas (Valores do Orçamento)
    const despesasFixasOrcadasMap: Record<string, number> = {};
    const despesasVariaveisOrcadasMap: Record<string, number> = {};

    const snapshot = expenseSnapshots[monthKey];
    if (snapshot && snapshot.categories && snapshot.categories.length > 0) {
      // Usa os dados fechados do Snapshot Orçado
      snapshot.categories.forEach(catItem => {
        const cat = categoriasV2.find(c => c.label.toLowerCase() === catItem.name.toLowerCase());
        const isFixa = cat?.nature === 'despesa_fixa' || catItem.name.toLowerCase().includes('fix') || catItem.name.toLowerCase().includes('aluguel') || catItem.name.toLowerCase().includes('seguro');
        if (isFixa) {
          despesasFixasOrcadasMap[catItem.name] = (despesasFixasOrcadasMap[catItem.name] || 0) + catItem.value;
        } else {
          despesasVariaveisOrcadasMap[catItem.name] = (despesasVariaveisOrcadasMap[catItem.name] || 0) + catItem.value;
        }
      });
    } else {
      // Compila orçamento a partir dos compromissos planejados em billsTracker
      billsTracker
        .filter(b => b.dueDate.startsWith(monthKey) && !b.isExcluded && b.expectedAmount > 0)
        .forEach(b => {
          const cat = categoriesMap.get(b.suggestedCategoryId || '');
          const label = cat?.label || b.description || 'Despesa Planejada';
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

    // Juros orçados conforme cronograma dos empréstimos ativos para a competência
    let juros = 0;
    emprestimos.forEach(emp => {
      if (emp.status === 'ativo' && emp.dataInicio) {
        try {
          const schedule = calculateLoanSchedule(emp.id);
          const parcelaItem = schedule.find(item => item.dataVencimento && item.dataVencimento.startsWith(monthKey));
          if (parcelaItem) {
            juros += parcelaItem.juros;
          }
        } catch { }
      }
    });

    // Rendimentos previstos (média recente)
    const recentMonths = [1, 2].map(m => subMonths(rangeTo, m));
    let rendimentosTotal = 0;
    recentMonths.forEach(d => {
      const hist = transacoesV2.filter(t => {
        try {
          return isWithinInterval(parseDateLocal(t.date), { start: startOfMonth(d), end: endOfMonth(d) }) && t.operationType === 'rendimento';
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
        receitas: Object.entries(receitasOrcadasMap).map(([label, value]) => ({ label, value, id: label })),
        despesasFixas: Object.entries(despesasFixasOrcadasMap).map(([label, value]) => ({ label, value, id: label })),
        despesasVariaveis: Object.entries(despesasVariaveisOrcadasMap).map(([label, value]) => ({ label, value, id: label })),
      },
    };
  }, [cltContracts, cltCompetencias, parcelasRecebiveis, revenueForecasts, expenseSnapshots, billsTracker, emprestimos, calculateLoanSchedule, transacoesV2, categoriasV2, categoriesMap]);

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
        })),
        ...dre1.details.despesasVariaveis.map((d) => ({
          label: d.label,
          value: d.value,
          type: "detail" as const,
          icon: getCategoryIcon(d.label, Activity),
          color: "text-destructive",
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

    const allExpenses = [
        ...dre1.details.despesasFixas.map(d => ({ name: d.label, value: d.value })),
        ...dre1.details.despesasVariaveis.map(d => ({ name: d.label, value: d.value }))
    ];
    
    if (dre1.juros > 0) {
        allExpenses.push({ name: 'Juros e Encargos', value: dre1.juros });
    }

    const filtered = allExpenses
        .filter(d => d.value > 0)
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
            title="Demonstração do Resultado do Período"
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