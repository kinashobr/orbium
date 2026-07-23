import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/types/finance';
import { calcularFerias } from '@/lib/cltCalc';
import { 
  Umbrella, Sparkles, Trash2, CalendarDays, History, Info, 
  ChevronLeft, ChevronRight, Check, X, AlertTriangle, Calendar, PlusCircle, Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinance } from '@/contexts/FinanceContext';
import { EventoFerias, FeriasStatus } from '@/types/clt';
import { 
  addDays, 
  addYears,
  differenceInDays,
  format,
  isAfter,
  isSameDay,
  parseISO
} from 'date-fns';
import { toast } from 'sonner';

interface Props {
  contractId: string;
  salarioBase: number;
  dependentes: number;
  dataAdmissao: string;
  dataInicioControle?: string;
}

export function CltVacationTab({ contractId, salarioBase, dependentes, dataAdmissao, dataInicioControle }: Props) {
  const { eventosFerias, addEventoFerias, deleteEventoFerias, cltHolerites = {} } = useFinance();

  // Filter holerites for this contract
  const contractHolerites = useMemo(() => {
    return Object.values(cltHolerites).filter(h => h && h.contractId === contractId);
  }, [cltHolerites, contractId]);

  const hasHoleriteData = contractHolerites.length > 0;

  const holeriteStats = useMemo(() => {
    if (!hasHoleriteData) {
      return {
        hasHolerite: false,
        salarioBaseMedio: salarioBase,
        mediaAdicionais: 0,
        mediaDescontos: 0,
        salarioBaseCalculo: salarioBase,
        totalCompetencias: 0
      };
    }

    let totalBase = 0;
    let totalAdic = 0;
    let totalDesc = 0;

    contractHolerites.forEach(h => {
      const base = h.salarioMensal || 0;
      const add = (h.rendimentosExtras || []).reduce((s, r) => s + (r.valor || 0), 0);
      const desc = (h.inssValor || 0) + (h.descontosExtras || []).reduce((s, d) => s + (d.valor || 0), 0);

      totalBase += base;
      totalAdic += add;
      totalDesc += desc;
    });

    const count = contractHolerites.length;
    const salarioBaseMedio = count > 0 ? totalBase / count : salarioBase;
    const mediaAdicionais = count > 0 ? totalAdic / count : 0;
    const mediaDescontos = count > 0 ? totalDesc / count : 0;
    const salarioBaseCalculo = salarioBaseMedio + mediaAdicionais;

    return {
      hasHolerite: true,
      salarioBaseMedio,
      mediaAdicionais,
      mediaDescontos,
      salarioBaseCalculo,
      totalCompetencias: count
    };
  }, [contractHolerites, hasHoleriteData, salarioBase]);

  const effectiveSalarioBase = holeriteStats.salarioBaseCalculo;

  const [isEditing, setIsEditing] = useState(false);

  // Active periods count state (default to 1, can be expanded up to 3)
  const [activePeriods, setActivePeriods] = useState<number>(1);

  // Form states for 3 periods of vacation to distribute exactly 30 days
  const [start1, setStart1] = useState("");
  const [end1, setEnd1] = useState("");
  const [days1, setDays1] = useState(0);

  const [start2, setStart2] = useState("");
  const [end2, setEnd2] = useState("");
  const [days2, setDays2] = useState(0);

  const [start3, setStart3] = useState("");
  const [end3, setEnd3] = useState("");
  const [days3, setDays3] = useState(0);

  const [abonoDays, setAbonoDays] = useState(0);
  const [activePeriodSelection, setActivePeriodSelection] = useState<1 | 2 | 3>(1);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const applyPreset = (presetType: '30segidos' | '20e10' | '15e15' | 'venda10_20' | '14e8e8') => {
    // Determine a reference starting date: first Monday of next month
    const today = new Date();
    let refDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    while (refDate.getDay() !== 1) {
      refDate = addDays(refDate, 1);
    }
    const startStr = format(refDate, 'yyyy-MM-dd');

    if (presetType === '30segidos') {
      setActivePeriods(1);
      setActivePeriodSelection(1);
      setStart1(startStr);
      setEnd1(format(addDays(refDate, 29), 'yyyy-MM-dd'));
      setDays1(30);
      setAbonoDays(0);

      setStart2(""); setEnd2(""); setDays2(0);
      setStart3(""); setEnd3(""); setDays3(0);
    } else if (presetType === '20e10') {
      setActivePeriods(2);
      setActivePeriodSelection(1);
      setStart1(startStr);
      setEnd1(format(addDays(refDate, 19), 'yyyy-MM-dd'));
      setDays1(20);

      const refDate2 = addDays(refDate, 40);
      const startStr2 = format(refDate2, 'yyyy-MM-dd');
      setStart2(startStr2);
      setEnd2(format(addDays(refDate2, 9), 'yyyy-MM-dd'));
      setDays2(10);
      setAbonoDays(0);

      setStart3(""); setEnd3(""); setDays3(0);
    } else if (presetType === '15e15') {
      setActivePeriods(2);
      setActivePeriodSelection(1);
      setStart1(startStr);
      setEnd1(format(addDays(refDate, 14), 'yyyy-MM-dd'));
      setDays1(15);

      const refDate2 = addDays(refDate, 35);
      const startStr2 = format(refDate2, 'yyyy-MM-dd');
      setStart2(startStr2);
      setEnd2(format(addDays(refDate2, 14), 'yyyy-MM-dd'));
      setDays2(15);
      setAbonoDays(0);

      setStart3(""); setEnd3(""); setDays3(0);
    } else if (presetType === 'venda10_20') {
      setActivePeriods(1);
      setActivePeriodSelection(1);
      setStart1(startStr);
      setEnd1(format(addDays(refDate, 19), 'yyyy-MM-dd'));
      setDays1(20);
      setAbonoDays(10);

      setStart2(""); setEnd2(""); setDays2(0);
      setStart3(""); setEnd3(""); setDays3(0);
    } else if (presetType === '14e8e8') {
      setActivePeriods(3);
      setActivePeriodSelection(1);
      setStart1(startStr);
      setEnd1(format(addDays(refDate, 13), 'yyyy-MM-dd'));
      setDays1(14);

      const refDate2 = addDays(refDate, 30);
      const startStr2 = format(refDate2, 'yyyy-MM-dd');
      setStart2(startStr2);
      setEnd2(format(addDays(refDate2, 7), 'yyyy-MM-dd'));
      setDays2(8);

      const refDate3 = addDays(refDate, 45);
      const startStr3 = format(refDate3, 'yyyy-MM-dd');
      setStart3(startStr3);
      setEnd3(format(addDays(refDate3, 7), 'yyyy-MM-dd'));
      setDays3(8);
      setAbonoDays(0);
    }
    toast.success("Sugestão de divisão preenchida! Ajuste as datas nos campos de período.");
  };

  const [hasLoadedContract, setHasLoadedContract] = useState<string | null>(null);

  // Filter vacations for this contract
  const minhasFerias = useMemo(() => {
    return (eventosFerias || [])
      .filter(f => f.vinculo_id === contractId)
      .sort((a, b) => new Date(a.data_inicio_gozo || '').getTime() - new Date(b.data_inicio_gozo || '').getTime());
  }, [eventosFerias, contractId]);

  // Load existing planned vacations into our form inputs
  useEffect(() => {
    if (hasLoadedContract === contractId) return;

    const scheduled = minhasFerias.filter(f => f.status === FeriasStatus.AGENDADA);
    if (scheduled.length > 0) {
      const sorted = [...scheduled];
      if (sorted[0]) {
        setStart1(sorted[0].data_inicio_gozo || "");
        setDays1(sorted[0].dias_gozados);
        try {
          const start = parseISO(sorted[0].data_inicio_gozo || "");
          if (!isNaN(start.getTime())) {
            setEnd1(format(addDays(start, sorted[0].dias_gozados - 1), 'yyyy-MM-dd'));
          }
        } catch (e) {}
        setAbonoDays(sorted[0].dias_abono_pecuniario || 0);
      }
      if (sorted[1]) {
        setStart2(sorted[1].data_inicio_gozo || "");
        setDays2(sorted[1].dias_gozados);
        try {
          const start = parseISO(sorted[1].data_inicio_gozo || "");
          if (!isNaN(start.getTime())) {
            setEnd2(format(addDays(start, sorted[1].dias_gozados - 1), 'yyyy-MM-dd'));
          }
        } catch (e) {}
        setActivePeriods(2);
      }
      if (sorted[2]) {
        setStart3(sorted[2].data_inicio_gozo || "");
        setDays3(sorted[2].dias_gozados);
        try {
          const start = parseISO(sorted[2].data_inicio_gozo || "");
          if (!isNaN(start.getTime())) {
            setEnd3(format(addDays(start, sorted[2].dias_gozados - 1), 'yyyy-MM-dd'));
          }
        } catch (e) {}
        setActivePeriods(3);
      }
    } else {
      setStart1(""); setEnd1(""); setDays1(0);
      setStart2(""); setEnd2(""); setDays2(0);
      setStart3(""); setEnd3(""); setDays3(0);
      setAbonoDays(0);
      setActivePeriods(1);
    }
    setHasLoadedContract(contractId);
  }, [contractId, minhasFerias, hasLoadedContract]);

  // Unified calculations for the 3 periods combined
  const unifiedCalculation = useMemo(() => {
    const p1 = (days1 > 0 && activePeriods >= 1) ? calcularFerias(effectiveSalarioBase, 0, days1, abonoDays, dependentes) : null;
    const p2 = (days2 > 0 && activePeriods >= 2) ? calcularFerias(effectiveSalarioBase, 0, days2, 0, dependentes) : null;
    const p3 = (days3 > 0 && activePeriods >= 3) ? calcularFerias(effectiveSalarioBase, 0, days3, 0, dependentes) : null;

    let totalLiquido = 0;
    let totalTerco = 0;
    let totalAbono = 0;
    let totalInss = 0;
    let totalIrrf = 0;
    let totalBruto = 0;

    if (p1) {
      totalLiquido += p1.liquidoFeriasEstimado;
      totalTerco += p1.tercoConstit;
      totalAbono += p1.liquidoAbono;
      totalInss += p1.inss;
      totalIrrf += p1.irrf;
      totalBruto += p1.brutoTributavel;
    }
    if (p2) {
      totalLiquido += p2.liquidoFeriasEstimado;
      totalTerco += p2.tercoConstit;
      totalInss += p2.inss;
      totalIrrf += p2.irrf;
      totalBruto += p2.brutoTributavel;
    }
    if (p3) {
      totalLiquido += p3.liquidoFeriasEstimado;
      totalTerco += p3.tercoConstit;
      totalInss += p3.inss;
      totalIrrf += p3.irrf;
      totalBruto += p3.brutoTributavel;
    }

    return {
      liquidoFeriasEstimado: totalLiquido,
      liquidoAbono: totalAbono,
      tercoConstit: totalTerco,
      inss: totalInss,
      irrf: totalIrrf,
      brutoTributavel: totalBruto
    };
  }, [effectiveSalarioBase, days1, days2, days3, abonoDays, dependentes, activePeriods]);

  // Synchronous updater for a vacation period with autofill start/end/days
  const updatePeriod = (
    periodNum: 1 | 2 | 3,
    fields: { start?: string; end?: string; days?: number }
  ) => {
    let s = fields.start !== undefined ? fields.start : (periodNum === 1 ? start1 : periodNum === 2 ? start2 : start3);
    let e = fields.end !== undefined ? fields.end : (periodNum === 1 ? end1 : periodNum === 2 ? end2 : end3);
    let d = fields.days !== undefined ? fields.days : (periodNum === 1 ? days1 : periodNum === 2 ? days2 : days3);

    if (fields.start !== undefined) {
      if (s) {
        if (d > 0) {
          try {
            const parsedStart = parseISO(s);
            if (!isNaN(parsedStart.getTime())) {
              e = format(addDays(parsedStart, d - 1), 'yyyy-MM-dd');
            }
          } catch (err) {}
        } else if (e) {
          try {
            const parsedStart = parseISO(s);
            const parsedEnd = parseISO(e);
            if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
              d = differenceInDays(parsedEnd, parsedStart) + 1;
              if (d < 0) d = 0;
            }
          } catch (err) {}
        }
      }
    } else if (fields.end !== undefined) {
      if (e && s) {
        try {
          const parsedStart = parseISO(s);
          const parsedEnd = parseISO(e);
          if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
            d = differenceInDays(parsedEnd, parsedStart) + 1;
            if (d < 0) d = 0;
          }
        } catch (err) {}
      }
    } else if (fields.days !== undefined) {
      if (d >= 0 && s) {
        try {
          const parsedStart = parseISO(s);
          if (!isNaN(parsedStart.getTime())) {
            e = format(addDays(parsedStart, d - 1), 'yyyy-MM-dd');
          }
        } catch (err) {}
      }
    }

    if (periodNum === 1) {
      setStart1(s); setEnd1(e); setDays1(d);
    } else if (periodNum === 2) {
      setStart2(s); setEnd2(e); setDays2(d);
    } else if (periodNum === 3) {
      setStart3(s); setEnd3(e); setDays3(d);
    }
  };

  // Remove a period and clear its values
  const removePeriod = (periodNum: 2 | 3) => {
    if (periodNum === 2) {
      setStart2(""); setEnd2(""); setDays2(0);
      if (activePeriodSelection === 2) setActivePeriodSelection(1);
    } else if (periodNum === 3) {
      setStart3(""); setEnd3(""); setDays3(0);
      if (activePeriodSelection === 3) setActivePeriodSelection(1);
    }
    setActivePeriods(prev => Math.max(1, prev - 1));
    toast.info(`Período ${periodNum} removido.`);
  };

  const addPeriod = () => {
    if (activePeriods < 3) {
      const next = (activePeriods + 1) as 1 | 2 | 3;
      setActivePeriods(next);
      setActivePeriodSelection(next);
      toast.info(`Período ${next} adicionado. Ative-o para selecionar datas no calendário.`);
    }
  };

  // Sum of allocated days
  const totalAllocatedDays = useMemo(() => {
    const p1 = activePeriods >= 1 ? days1 : 0;
    const p2 = activePeriods >= 2 ? days2 : 0;
    const p3 = activePeriods >= 3 ? days3 : 0;
    return p1 + p2 + p3 + abonoDays;
  }, [days1, days2, days3, abonoDays, activePeriods]);

  // Validation warnings on dynamic planning
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (totalAllocatedDays !== 30) {
      warnings.push(`O plano deve totalizar exatamente 30 dias de destino (Atualmente: ${totalAllocatedDays} dias).`);
    }
    if (abonoDays > 10) {
      warnings.push("CLT: O abono pecuniário (venda) é limitado a no máximo 10 dias.");
    }

    const validatePeriod = (num: number, s: string, d: number) => {
      if (d === 0) return;
      if (d < 5) {
        warnings.push(`CLT Período ${num}: Nenhum período pode ser menor que 5 dias.`);
      }
      if (s) {
        try {
          const parsedStart = parseISO(s);
          const dayOfWeek = parsedStart.getDay();
          if (dayOfWeek === 5) {
            warnings.push(`CLT Período ${num}: Não deve iniciar na sexta-feira.`);
          } else if (dayOfWeek === 6) {
            warnings.push(`CLT Período ${num}: Não deve iniciar no sábado.`);
          } else if (dayOfWeek === 0) {
            warnings.push(`CLT Período ${num}: Não deve iniciar no domingo.`);
          }
        } catch (e) {}
      }
    };

    if (activePeriods >= 1) validatePeriod(1, start1, days1);
    if (activePeriods >= 2) validatePeriod(2, start2, days2);
    if (activePeriods >= 3) validatePeriod(3, start3, days3);

    const activeEnjoymentPeriods = [
      activePeriods >= 1 ? days1 : 0,
      activePeriods >= 2 ? days2 : 0,
      activePeriods >= 3 ? days3 : 0
    ].filter(d => d > 0);

    if (activeEnjoymentPeriods.length > 1) {
      const hasLargePeriod = activeEnjoymentPeriods.some(d => d >= 14);
      if (!hasLargePeriod) {
        warnings.push("CLT: Quando fracionado, pelo menos um dos períodos deve ter no mínimo 14 dias de gozo.");
      }
    }

    return warnings;
  }, [days1, days2, days3, abonoDays, start1, start2, start3, activePeriods, totalAllocatedDays]);

  // Clear current inputs
  const handleClear = () => {
    setStart1(""); setEnd1(""); setDays1(0);
    setStart2(""); setEnd2(""); setDays2(0);
    setStart3(""); setEnd3(""); setDays3(0);
    setAbonoDays(0);
    setActivePeriods(1);
    setActivePeriodSelection(1);
    toast.info("Planejamento limpo.");
  };

  // Save the full 30-day destination in a single call
  const handleSavePlan = () => {
    if (totalAllocatedDays !== 30) {
      toast.error(`A soma total do planejamento deve ser de exatamente 30 dias (Atual: ${totalAllocatedDays} dias).`);
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    // Simulated API/calculation delay for pristine user feedback animation
    setTimeout(() => {
      // Delete existing scheduled vacations to prevent duplicates
      const scheduledToDelete = minhasFerias.filter(f => f.status === FeriasStatus.AGENDADA);
      scheduledToDelete.forEach(f => deleteEventoFerias(f.id));

      const admissaoDate = parseISO(dataAdmissao);

      if (days1 > 0 && activePeriods >= 1) {
        addEventoFerias({
          id: `fer_${Date.now()}_1`,
          vinculo_id: contractId,
          periodo_aquisitivo_inicio: format(admissaoDate, 'yyyy-MM-dd'),
          periodo_aquisitivo_fim: format(addYears(admissaoDate, 1), 'yyyy-MM-dd'),
          periodo_concessive_limite: format(addYears(admissaoDate, 2), 'yyyy-MM-dd') as any,
          dias_gozados: days1,
          dias_abono_pecuniario: abonoDays,
          data_inicio_gozo: start1,
          faltas_injustificadas_periodo: 0,
          status: FeriasStatus.AGENDADA
        });
      }

      if (days2 > 0 && activePeriods >= 2) {
        addEventoFerias({
          id: `fer_${Date.now()}_2`,
          vinculo_id: contractId,
          periodo_aquisitivo_inicio: format(admissaoDate, 'yyyy-MM-dd'),
          periodo_aquisitivo_fim: format(addYears(admissaoDate, 1), 'yyyy-MM-dd'),
          periodo_concessive_limite: format(addYears(admissaoDate, 2), 'yyyy-MM-dd') as any,
          dias_gozados: days2,
          dias_abono_pecuniario: 0,
          data_inicio_gozo: start2,
          faltas_injustificadas_periodo: 0,
          status: FeriasStatus.AGENDADA
        });
      }

      if (days3 > 0 && activePeriods >= 3) {
        addEventoFerias({
          id: `fer_${Date.now()}_3`,
          vinculo_id: contractId,
          periodo_aquisitivo_inicio: format(admissaoDate, 'yyyy-MM-dd'),
          periodo_aquisitivo_fim: format(addYears(admissaoDate, 1), 'yyyy-MM-dd'),
          periodo_concessive_limite: format(addYears(admissaoDate, 2), 'yyyy-MM-dd') as any,
          dias_gozados: days3,
          dias_abono_pecuniario: 0,
          data_inicio_gozo: start3,
          faltas_injustificadas_periodo: 0,
          status: FeriasStatus.AGENDADA
        });
      }

      setIsSaving(false);
      setSaveSuccess(true);
      setIsEditing(false); // Flip to summary view after saving
      toast.success("Plano de férias (30 dias) salvo com sucesso!");

      // Reset success state after a few seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1000);
  };

  const hasScheduledPlan = useMemo(() => {
    return minhasFerias.some(f => f.status === FeriasStatus.AGENDADA);
  }, [minhasFerias]);

  const showEditForm = !hasScheduledPlan || isEditing;

  const formatDateBr = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  if (!showEditForm) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        
        {/* 1. Balanço Superior de Férias */}
        <Card className="rounded-[2rem] border border-border/30 p-4 sm:p-5 bg-card shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Umbrella className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground">Planejamento Consolidado de Férias</h3>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-snug">
                Seu plano de férias de 30 dias para este contrato está consolidado e ativo.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                ✓ Plano Ativo
              </Badge>
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-8 px-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/10 transition-all active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar Plano
              </Button>
            </div>
          </div>
        </Card>

        {/* Resumo Útil das Férias Planejadas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Períodos - Left (7 Columns) */}
          <div className="lg:col-span-7 space-y-3">
            <Card className="rounded-[2rem] border border-border/30 p-4 sm:p-5 bg-card shadow-md space-y-4">
              <h4 className="font-display font-black text-[11px] text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/20 pb-2">
                <Calendar className="w-4.5 h-4.5 text-primary" /> Períodos Planejados
              </h4>

              <div className="space-y-3">
                {/* Period 1 */}
                {days1 > 0 && (
                  <div className="p-3.5 rounded-xl border border-border/30 bg-muted/5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary block">Período 1</span>
                      <span className="text-xs font-black text-foreground block">
                        {formatDateBr(start1)} até {formatDateBr(end1)}
                      </span>
                    </div>
                    <div className="text-right bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-xl">
                      <span className="text-xs font-mono font-black text-primary">{days1} dias</span>
                    </div>
                  </div>
                )}

                {/* Period 2 */}
                {days2 > 0 && activePeriods >= 2 && (
                  <div className="p-3.5 rounded-xl border border-border/30 bg-muted/5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">Período 2</span>
                      <span className="text-xs font-black text-foreground block">
                        {formatDateBr(start2)} até {formatDateBr(end2)}
                      </span>
                    </div>
                    <div className="text-right bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-xl">
                      <span className="text-xs font-mono font-black text-amber-600">{days2} dias</span>
                    </div>
                  </div>
                )}

                {/* Period 3 */}
                {days3 > 0 && activePeriods >= 3 && (
                  <div className="p-3.5 rounded-xl border border-border/30 bg-muted/5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Período 3</span>
                      <span className="text-xs font-black text-foreground block">
                        {formatDateBr(start3)} até {formatDateBr(end3)}
                      </span>
                    </div>
                    <div className="text-right bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded-xl">
                      <span className="text-xs font-mono font-black text-indigo-600">{days3} dias</span>
                    </div>
                  </div>
                )}

                {/* Abono Pecuniário (Venda) */}
                {abonoDays > 0 && (
                  <div className="p-3.5 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block">Abono Pecuniário (Venda de Férias)</span>
                      <span className="text-[10px] font-bold text-muted-foreground block">Conversão de dias de férias em abono financeiro</span>
                    </div>
                    <div className="text-right bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-xl">
                      <span className="text-xs font-mono font-black text-emerald-600">{abonoDays} dias vendidos</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Consolidação Financeira - Right (5 Columns) */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="rounded-[2rem] border border-border/30 p-4 sm:p-5 bg-card shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-border/20 pb-2">
                <h4 className="font-display font-black text-[11px] text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4.5 h-4.5 text-primary" /> Consolidação Financeira
                </h4>
                {hasHoleriteData ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-none font-extrabold text-[8px] uppercase px-2 py-0.5">
                    Com Holerites ({holeriteStats.totalCompetencias})
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-600 border-none font-extrabold text-[8px] uppercase px-2 py-0.5">
                    Modo Simplificado
                  </Badge>
                )}
              </div>

              {/* Day Distribution Bar */}
              <div className="space-y-1 bg-muted/10 p-2.5 rounded-xl border border-border/10">
                <span className="text-[8px] font-black uppercase text-muted-foreground block text-center mb-1">
                  Distribuição dos 30 Dias de Direito
                </span>
                <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden flex">
                  {days1 > 0 && <div className="h-full bg-primary" style={{ width: `${(days1 / 30) * 100}%` }} />}
                  {days2 > 0 && activePeriods >= 2 && <div className="h-full bg-amber-500" style={{ width: `${(days2 / 30) * 100}%` }} />}
                  {days3 > 0 && activePeriods >= 3 && <div className="h-full bg-indigo-500" style={{ width: `${(days3 / 30) * 100}%` }} />}
                  {abonoDays > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(abonoDays / 30) * 100}%` }} />}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[8px] font-extrabold uppercase text-muted-foreground justify-center pt-1.5">
                  {days1 > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> P1: {days1}d</span>}
                  {days2 > 0 && activePeriods >= 2 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> P2: {days2}d</span>}
                  {days3 > 0 && activePeriods >= 3 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> P3: {days3}d</span>}
                  {abonoDays > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Venda: {abonoDays}d</span>}
                </div>
              </div>

              {/* Composition Breakdown or Simplified Notice */}
              {hasHoleriteData ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1.5 text-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Base Média de Cálculo dos Holerites
                  </span>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-[10px] font-medium">Salário Base Médio:</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(holeriteStats.salarioBaseMedio)}</span>
                  </div>
                  {holeriteStats.mediaAdicionais > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="text-[10px] font-medium">Média Adicionais (H.E., Quinquênio, Bônus):</span>
                      <span className="font-mono font-bold">+ {formatCurrency(holeriteStats.mediaAdicionais)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-foreground font-bold pt-1 border-t border-emerald-500/15">
                    <span className="text-[10px] font-black uppercase">Base Total de Cálculo de Férias:</span>
                    <span className="font-mono font-bold text-primary">{formatCurrency(holeriteStats.salarioBaseCalculo)}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  <strong>Modo Simplificado:</strong> Cálculo baseado unicamente no salário contratual de <strong>{formatCurrency(salarioBase)}</strong>. Para incluir médias exatas de horas extras e adicionais, preencha os holerites na aba "Competências".
                </div>
              )}

              {/* Financial values */}
              <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-muted-foreground uppercase text-[9px]">Líquido Gozo</span>
                  <span className="text-foreground font-mono font-black">{formatCurrency(unifiedCalculation.liquidoFeriasEstimado)}</span>
                </div>
                {abonoDays > 0 && (
                  <div className="flex justify-between items-center font-bold text-emerald-600">
                    <span className="uppercase text-[9px]">Líquido Venda (Abono)</span>
                    <span className="font-mono font-black">{formatCurrency(unifiedCalculation.liquidoAbono)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold pt-1.5 border-t border-dashed border-border/10">
                  <span className="text-muted-foreground uppercase text-[9px]">1/3 Constitucional</span>
                  <span className="text-foreground font-mono">{formatCurrency(unifiedCalculation.tercoConstit)}</span>
                </div>
                <div className="flex justify-between items-center font-black text-xs pt-1.5 border-t border-border/20 text-primary">
                  <span className="uppercase text-[9px]">Líquido Estimado Total</span>
                  <span className="font-mono font-black text-sm">{formatCurrency(unifiedCalculation.liquidoFeriasEstimado + unifiedCalculation.liquidoAbono)}</span>
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="p-3 bg-muted/10 rounded-xl border border-border/10 text-[9px] font-bold text-muted-foreground uppercase leading-snug flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>Cálculo atualizado com {dependentes} dependente(s) cadastrado(s).</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Info Notice */}
        <div className="bg-muted/10 border border-border/40 p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 animate-pulse">
            <Info className="w-4.5 h-4.5" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed tracking-wide">
            A CLT permite parcelar suas férias em até 3 vezes se houver acordo. Os cálculos exatos de 1/3, impostos e abono são recalculados ao salvar o planejamento consolidado de 30 dias.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* 1. Balanço Superior de Férias */}
      <Card className="rounded-[2rem] border border-border/30 p-4 sm:p-5 bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Umbrella className="w-5 h-5 text-primary" />
              <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground">Planejamento Consolidado de Férias</h3>
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-snug">
              Selecione seus períodos e abono. Os 30 dias de direito devem receber destino em uma única chamada.
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
            <span className="text-[8px] font-black uppercase tracking-widest text-primary block">Direito Anual</span>
            <span className="text-xs font-black text-amber-600 font-mono">30 Dias</span>
          </div>
        </div>
      </Card>

      {/* 2. Quadro Ultra Compacto & Radial Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Quadro de Digitação Ultra Compacto (Lado Esquerdo - 7 Colunas) */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="rounded-[2rem] border border-border/30 p-4 sm:p-5 bg-card shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-border/20 pb-2">
              <h4 className="font-display font-black text-[11px] text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-primary" /> Períodos de Gozo
              </h4>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleClear}
                className="h-6 text-[8px] font-bold uppercase rounded-lg border-destructive/20 text-destructive hover:bg-destructive/5 px-2"
              >
                Limpar Tudo
              </Button>
            </div>

            {/* Quick Presets CLT Integration */}
            <div className="bg-muted/5 border border-border/20 rounded-xl p-3 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Sugestões de Divisão Rápida (Presets CLT)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: '30segidos', label: '30 dias corridos' },
                  { id: 'venda10_20', label: '20 dias + 10d abono' },
                  { id: '15e15', label: '2x 15 dias' },
                  { id: '20e10', label: '20 + 10 dias' },
                  { id: '14e8e8', label: '3x (14 + 8 + 8)' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as any)}
                    className="px-2.5 py-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/40 border border-border/30 rounded-lg text-[9px] font-bold text-foreground transition-all duration-200 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {/* Period 1 - Always Visible */}
              <div className="p-3 rounded-xl border border-border/10 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Período 1 {days1 > 0 && `(${days1} Dias)`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-muted-foreground block uppercase">Data Início</span>
                    <Input 
                      type="date"
                      value={start1}
                      onChange={(e) => updatePeriod(1, { start: e.target.value })}
                      className="h-7.5 rounded-lg text-xs px-2"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-muted-foreground block uppercase">Data Fim</span>
                    <Input 
                      type="date"
                      value={end1}
                      onChange={(e) => updatePeriod(1, { end: e.target.value })}
                      className="h-7.5 rounded-lg text-xs px-2"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-muted-foreground block uppercase">Dias Gozo</span>
                    <Input 
                      type="number"
                      min={0}
                      max={30}
                      value={days1 || ""}
                      onChange={(e) => updatePeriod(1, { days: Number(e.target.value) || 0 })}
                      placeholder="Ex: 15"
                      className="h-7.5 rounded-lg text-xs font-mono font-bold px-2"
                    />
                  </div>
                </div>
              </div>

              {/* Period 2 - Hidden unless activePeriods >= 2 */}
              {activePeriods >= 2 && (
                <div className="p-3 rounded-xl border border-border/10 bg-muted/10 space-y-2 relative animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                      Período 2 {days2 > 0 && `(${days2} Dias)`}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removePeriod(2)}
                      className="h-6 w-6 rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <span className="sr-only">Remover</span>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground block uppercase">Data Início</span>
                      <Input 
                        type="date"
                        value={start2}
                        onChange={(e) => updatePeriod(2, { start: e.target.value })}
                        className="h-7.5 rounded-lg text-xs px-2"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground block uppercase">Data Fim</span>
                      <Input 
                        type="date"
                        value={end2}
                        onChange={(e) => updatePeriod(2, { end: e.target.value })}
                        className="h-7.5 rounded-lg text-xs px-2"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground block uppercase">Dias Gozo</span>
                      <Input 
                        type="number"
                        min={0}
                        max={30}
                        value={days2 || ""}
                        onChange={(e) => updatePeriod(2, { days: Number(e.target.value) || 0 })}
                        placeholder="Ex: 10"
                        className="h-7.5 rounded-lg text-xs font-mono font-bold px-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Period 3 - Hidden unless activePeriods === 3 */}
              {activePeriods === 3 && (
                <div className="p-3 rounded-xl border border-border/10 bg-muted/10 space-y-2 relative animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                      Período 3 {days3 > 0 && `(${days3} Dias)`}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removePeriod(3)}
                      className="h-6 w-6 rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <span className="sr-only">Remover</span>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground block uppercase">Data Início</span>
                      <Input 
                        type="date"
                        value={start3}
                        onChange={(e) => updatePeriod(3, { start: e.target.value })}
                        className="h-7.5 rounded-lg text-xs px-2"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground block uppercase">Data Fim</span>
                      <Input 
                        type="date"
                        value={end3}
                        onChange={(e) => updatePeriod(3, { end: e.target.value })}
                        className="h-7.5 rounded-lg text-xs px-2"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground block uppercase">Dias Gozo</span>
                      <Input 
                        type="number"
                        min={0}
                        max={30}
                        value={days3 || ""}
                        onChange={(e) => updatePeriod(3, { days: Number(e.target.value) || 0 })}
                        placeholder="Ex: 5"
                        className="h-7.5 rounded-lg text-xs font-mono font-bold px-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Add Period Trigger */}
              {activePeriods < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPeriod}
                  className="w-full h-8 border-dashed border-primary/30 text-primary hover:bg-primary/5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-xl"
                >
                  <PlusCircle className="w-4 h-4 text-primary" /> Adicionar Período de Férias
                </Button>
              )}

              {/* Abono Pecuniário (Venda de Dias) */}
              <div className="p-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.01] space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                  Abono Pecuniário (Venda de Dias de Férias)
                </span>
                <div className="grid grid-cols-1 gap-1">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-muted-foreground block uppercase">Dias para Vender (Máximo de 10 dias)</span>
                    <Input 
                      type="number"
                      min={0}
                      max={10}
                      value={abonoDays || ""}
                      onChange={(e) => setAbonoDays(Number(e.target.value) || 0)}
                      placeholder="Ex: 10"
                      className="h-7.5 rounded-lg text-xs font-mono font-bold text-emerald-600 px-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quadro Radial e Resumo Técnico (Lado Direito - 5 Colunas) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="rounded-[2rem] border border-border/30 p-4 sm:p-5 bg-card shadow-md space-y-4 flex flex-col justify-between">
            
            <div className="space-y-3">
              <h4 className="font-display font-black text-[11px] text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/20 pb-2">
                <History className="w-4.5 h-4.5 text-primary" /> Alocação Atual dos 30 Dias
              </h4>

              {/* HIGH EMPHASIS RADIAL CHART & CONTADOR DE DIAS */}
              <div className="relative flex flex-col items-center justify-center py-2 animate-in zoom-in duration-300">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Modern SVG Radial Indicator */}
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background track */}
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      className="stroke-muted/25 fill-none"
                      strokeWidth="10"
                    />
                    {/* Foreground progress path */}
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      className={cn(
                        "fill-none transition-all duration-700 ease-out",
                        totalAllocatedDays === 30 
                          ? "stroke-emerald-500" 
                          : totalAllocatedDays > 30 
                            ? "stroke-destructive" 
                            : "stroke-primary"
                      )}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 58}
                      strokeDashoffset={2 * Math.PI * 58 * (1 - Math.min(30, totalAllocatedDays) / 30)}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Inside Center: Dynamic High-Impact Day Count */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={cn(
                      "text-4.5xl font-black font-mono tracking-tight leading-none leading-none scale-105",
                      totalAllocatedDays === 30 ? "text-emerald-500" : totalAllocatedDays > 30 ? "text-destructive" : "text-primary"
                    )}>
                      {totalAllocatedDays}
                    </span>
                    <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mt-1 block">
                      de 30 dias
                    </span>
                  </div>
                </div>

                {/* Micro badge indicator */}
                <div className="mt-3">
                  <Badge className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                    totalAllocatedDays === 30 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : totalAllocatedDays > 30 
                        ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse" 
                        : "bg-primary/10 text-primary border-primary/20"
                  )}>
                    {totalAllocatedDays === 30 ? "✓ Completo (30/30)" : totalAllocatedDays > 30 ? "Excesso de Dias!" : "Pendente de Destino"}
                  </Badge>
                </div>
              </div>

              {/* Miniature Horizontal Segment Indicator */}
              <div className="space-y-1 bg-muted/10 p-2.5 rounded-xl border border-border/10">
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden flex">
                  {days1 > 0 && activePeriods >= 1 && <div className="h-full bg-primary" style={{ width: `${(days1 / 30) * 100}%` }} />}
                  {days2 > 0 && activePeriods >= 2 && <div className="h-full bg-amber-500" style={{ width: `${(days2 / 30) * 100}%` }} />}
                  {days3 > 0 && activePeriods >= 3 && <div className="h-full bg-indigo-500" style={{ width: `${(days3 / 30) * 100}%` }} />}
                  {abonoDays > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(abonoDays / 30) * 100}%` }} />}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[8px] font-extrabold uppercase text-muted-foreground justify-center pt-0.5">
                  {days1 > 0 && activePeriods >= 1 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> P1: {days1}d</span>}
                  {days2 > 0 && activePeriods >= 2 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> P2: {days2}d</span>}
                  {days3 > 0 && activePeriods >= 3 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> P3: {days3}d</span>}
                  {abonoDays > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Venda: {abonoDays}d</span>}
                </div>
              </div>

              {/* Warnings Alert inside side column */}
              {validationWarnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 space-y-0.5 text-[9px] text-amber-700 font-bold leading-tight">
                  <div className="font-black uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> Restrições CLT:
                  </div>
                  {validationWarnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-amber-500 shrink-0">•</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Compact Projeção Financeira */}
              <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-muted-foreground uppercase text-[9px]">Líquido Gozo</span>
                  <span className="text-foreground font-mono font-black">{formatCurrency(unifiedCalculation.liquidoFeriasEstimado)}</span>
                </div>
                {abonoDays > 0 && (
                  <div className="flex justify-between items-center font-bold text-emerald-600">
                    <span className="uppercase text-[9px]">Líquido Venda (Abono)</span>
                    <span className="font-mono font-black">{formatCurrency(unifiedCalculation.liquidoAbono)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold pt-1.5 border-t border-dashed border-border/10">
                  <span className="text-muted-foreground uppercase text-[9px]">1/3 Constitucional</span>
                  <span className="text-foreground font-mono">{formatCurrency(unifiedCalculation.tercoConstit)}</span>
                </div>
                <div className="flex justify-between items-center font-black text-xs pt-1.5 border-t border-border/20 text-primary">
                  <span className="uppercase text-[9px]">Líquido Estimado</span>
                  <span className="font-mono">{formatCurrency(unifiedCalculation.liquidoFeriasEstimado + unifiedCalculation.liquidoAbono)}</span>
                </div>
              </div>
            </div>

            <Button 
              type="button" 
              onClick={handleSavePlan}
              disabled={validationWarnings.length > 0 || isSaving}
              className={cn(
                "w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider mt-2 transition-all duration-300 relative overflow-hidden shadow-lg",
                saveSuccess 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 scale-[1.02]" 
                  : "bg-primary text-white hover:bg-primary/90 shadow-primary/20 active:scale-[0.98]"
              )}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando Cálculos...
                </span>
              ) : saveSuccess ? (
                <span className="flex items-center justify-center gap-1.5 animate-in zoom-in duration-300">
                  <Check className="w-4.5 h-4.5 stroke-[3]" />
                  Plano Salvo com Sucesso!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Salvar Plano Consolidado (30 dias)
                </span>
              )}
            </Button>
          </Card>
        </div>
      </div>

      {/* 3. CALENDÁRIO ANUAL INTERATIVO - REMOVIDO */}
      {activePeriodSelection === 999 && (
      <Card className="rounded-[2rem] border border-border/40 p-4 shadow-md bg-card">
        <CardHeader className="p-0 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-black tracking-tight flex items-center gap-1.5">
              <CalendarDays className="w-4.5 h-4.5 text-primary" /> Planejador Anual Interativo (Compactado)
            </CardTitle>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Selecione o início de um período clicando em um dia, e em seguida selecione o fim.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between">
            <div className="flex items-center gap-1.5 border border-border/60 rounded-full px-2 py-0.5 bg-muted/10">
              <Button 
                type="button"
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full"
                onClick={() => setCurrentYear(prev => prev - 1)}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-[11px] font-black font-mono px-0.5">{currentYear}</span>
              <Button 
                type="button"
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full"
                onClick={() => setCurrentYear(prev => prev + 1)}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCalendar(prev => !prev)}
              className="rounded-lg text-[8px] font-black uppercase h-7 px-2.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              {showCalendar ? "Ocultar Calendário" : "Mostrar Calendário"}
            </Button>
          </div>
        </CardHeader>
        
        {showCalendar && (
          <CardContent className="p-0 pt-2.5 border-t border-border/20 space-y-3">
            {/* Quick Divisões Presets like PeriodSelector */}
            <div className="bg-muted/5 border border-border/20 rounded-xl p-3 space-y-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Sugestões de Divisão Rápida (Presets CLT)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: '30segidos', label: '30 dias corridos' },
                  { id: 'venda10_20', label: '20 dias + 10d abono' },
                  { id: '15e15', label: '2x 15 dias' },
                  { id: '20e10', label: '20 + 10 dias' },
                  { id: '14e8e8', label: '3x (14 + 8 + 8)' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as any)}
                    className="px-2.5 py-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/40 border border-border/30 rounded-lg text-[9px] font-bold text-foreground transition-all duration-200"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time sync highlight banner */}
            <div className="mb-3 bg-primary/[0.02] border border-primary/10 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-[9px]">
              <span className="font-bold text-muted-foreground">
                Clique nos dias para definir as datas para o <span className="text-primary font-black">Período {activePeriodSelection}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/30" /> Gozada
                </span>
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded bg-primary text-primary-foreground" /> Período 1
                </span>
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 text-white" /> Período 2
                </span>
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-600 text-white" /> Período 3
                </span>
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded bg-primary/20 border border-primary/40 animate-pulse" /> Preview
                </span>
              </div>
            </div>

            {/* Grid of 12 Months - Reduced sizing by ~50% */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {monthNames.map((monthName, m) => {
                const weeks = weeksOfMonths[m] || [];
                return (
                  <Card key={m} className="border border-border/40 rounded-xl p-2.5 bg-gradient-to-b from-card to-muted/[0.01] shadow-none">
                    {/* Month Heading (LARGER font size as requested) */}
                    <h4 className="text-xs sm:text-sm font-black uppercase text-foreground tracking-wider mb-1.5 text-center border-b border-border/10 pb-1">
                      {monthName}
                    </h4>
                    <div className="grid grid-cols-8 gap-0.5 text-center items-center">
                      <div className="text-[7px] font-black text-muted-foreground/30 uppercase">W</div>
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                        <div key={idx} className="text-[8px] font-extrabold text-muted-foreground/60 uppercase">{day}</div>
                      ))}
                      
                      {weeks.map((week, wIdx) => {
                        const validWeekDays = week.filter((d): d is string => d !== null);
                        const isWeekSelected = validWeekDays.length > 0 && validWeekDays.every(d => selectedDays.includes(d));
                        
                        return (
                          <React.Fragment key={wIdx}>
                            {/* Week button - Compacted */}
                            <button
                              type="button"
                              onClick={() => handleWeekClick(week)}
                              className={cn(
                                "w-3.5 h-3.5 rounded-full mx-auto text-[7px] font-black flex items-center justify-center transition-all",
                                isWeekSelected 
                                  ? "bg-primary text-white" 
                                  : "bg-muted/45 text-muted-foreground/50 hover:bg-primary/20 hover:text-primary"
                              )}
                            >
                              +
                            </button>
                            
                            {/* 7 Days - Compacted to h-5 w-5 for ~50% size reduction */}
                            {week.map((dateStr, dIdx) => {
                              if (!dateStr) return <div key={dIdx} />;
                              
                              const dayObj = new Date(dateStr + "T12:00:00");
                              const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;
                              
                              const savedVac = getVacationForDate(dateStr);
                              const isTaken = savedVac?.status === FeriasStatus.GOZADA;
                              const isScheduled = savedVac?.status === FeriasStatus.AGENDADA;

                              const state = dateStates[dateStr];
                              const hasState = !!state;
                              const isPreview = state?.isPreview;
                              const periodNum = state?.period;
                              const isStart = state?.isStart;
                              const isEnd = state?.isEnd;

                              // Custom background class based on period & preview state
                              let customBgClass = "";
                              if (hasState) {
                                if (isPreview) {
                                  if (periodNum === 1) customBgClass = "bg-primary/20 text-primary border border-primary/30 animate-pulse";
                                  else if (periodNum === 2) customBgClass = "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse";
                                  else if (periodNum === 3) customBgClass = "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 animate-pulse";
                                } else {
                                  if (periodNum === 1) {
                                    customBgClass = cn(
                                      "bg-primary text-primary-foreground font-black shadow-sm",
                                      isStart && "rounded-l-md",
                                      isEnd && "rounded-r-md"
                                    );
                                  } else if (periodNum === 2) {
                                    customBgClass = cn(
                                      "bg-amber-500 text-white font-black shadow-sm",
                                      isStart && "rounded-l-md",
                                      isEnd && "rounded-r-md"
                                    );
                                  } else if (periodNum === 3) {
                                    customBgClass = cn(
                                      "bg-indigo-600 text-white font-black shadow-sm",
                                      isStart && "rounded-l-md",
                                      isEnd && "rounded-r-md"
                                    );
                                  }
                                }
                              }
                              
                              return (
                                <button
                                  key={dIdx}
                                  type="button"
                                  onClick={() => handleDayClick(dateStr)}
                                  onMouseEnter={() => setHoveredDate(dateStr)}
                                  onMouseLeave={() => setHoveredDate(null)}
                                  className={cn(
                                    "h-5 w-5 text-[9px] font-bold rounded mx-auto flex items-center justify-center transition-all relative border border-transparent",
                                    isTaken && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black",
                                    !hasState && isScheduled && "bg-primary/10 text-primary border-primary/20 font-black",
                                    customBgClass,
                                    !isTaken && (!hasState && !isScheduled) && (isWeekend ? "text-muted-foreground/40 hover:bg-muted/30" : "text-foreground hover:bg-muted/50")
                                  )}
                                >
                                  {dayObj.getDate()}
                                  {(isTaken || isScheduled) && (
                                    <span className={cn(
                                      "absolute bottom-0.5 w-0.5 h-0.5 rounded-full",
                                      isTaken ? "bg-emerald-500" : "bg-primary"
                                    )} />
                                  )}
                                </button>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {/* Info Notice */}
      <div className="bg-muted/10 border border-border/40 p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 animate-pulse">
          <Info className="w-4.5 h-4.5" />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed tracking-wide">
          A CLT permite parcelar suas férias em até 3 vezes se houver acordo. Os cálculos exatos de 1/3, impostos e abono são recalculados ao salvar o planejamento consolidado de 30 dias.
        </p>
      </div>

    </div>
  );
}
