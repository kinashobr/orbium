"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Fuel, Wrench, Shield, FileText, Info } from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VehicleAnnualCalendarProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
}

export function VehicleAnnualCalendar({ veiculo, seguro }: VehicleAnnualCalendarProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Mapear todos os eventos e gastos do ano
  const yearEvents = useMemo(() => {
    const map = new Map<string, Array<{ id: string; title: string; type: string; amount: number; date: Date; icon: string; color: string }>>();

    const addEvent = (d: Date, item: { id: string; title: string; type: string; amount: number; date: Date; icon: string; color: string }) => {
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    };

    // 1. Histórico de despesas e manutenções do veículo
    (veiculo.historico || []).forEach(h => {
      if (h.type === "fipe" || !h.date) return;
      try {
        const d = parseDateLocal(h.date);
        if (d.getFullYear() === selectedYear) {
          const type = h.meta?.gastoTipo || (h.type === 'manutencao' ? 'manutencao_periodica' : 'outros');
          let icon = "📝";
          let color = "bg-slate-500 text-white";
          if (type === 'combustivel') { icon = "⛽"; color = "bg-amber-500 text-white"; }
          else if (type === 'manutencao_periodica') { icon = "🔧"; color = "bg-blue-500 text-white"; }
          else if (type === 'cosmetico') { icon = "✨"; color = "bg-purple-500 text-white"; }

          addEvent(d, {
            id: h.id,
            title: h.title,
            type: String(type),
            amount: h.amount || 0,
            date: d,
            icon,
            color
          });
        }
      } catch (e) {}
    });

    // 2. Parcelas do Seguro
    if (seguro?.parcelas) {
      seguro.parcelas.forEach(p => {
        if (!p.vencimento) return;
        try {
          const d = parseDateLocal(p.vencimento);
          if (d.getFullYear() === selectedYear) {
            addEvent(d, {
              id: `seg_${p.numero}`,
              title: `Seguro: Parcela ${p.numero}/${seguro.numeroParcelas || seguro.parcelas.length}`,
              type: "seguro",
              amount: p.valor || 0,
              date: d,
              icon: "🛡️",
              color: p.paga ? "bg-success text-white" : "bg-warning text-black"
            });
          }
        } catch (e) {}
      });
    }

    // 3. Vencimento IPVA
    if (veiculo.ipvaVencimento) {
      try {
        const d = parseDateLocal(veiculo.ipvaVencimento);
        if (d.getFullYear() === selectedYear) {
          addEvent(d, {
            id: "ipva_event",
            title: `IPVA ${veiculo.ipvaPago ? '(Quitado)' : '(Vencimento)'}`,
            type: "ipva",
            amount: veiculo.ipvaValor || 0,
            date: d,
            icon: "🧾",
            color: veiculo.ipvaPago ? "bg-success text-white" : "bg-destructive text-white"
          });
        }
      } catch (e) {}
    }

    // 4. Vencimento Licenciamento
    if (veiculo.licenciamentoVencimento) {
      try {
        const d = parseDateLocal(veiculo.licenciamentoVencimento);
        if (d.getFullYear() === selectedYear) {
          addEvent(d, {
            id: "lic_event",
            title: `Licenciamento ${veiculo.licenciamentoPago ? '(Quitado)' : '(Vencimento)'}`,
            type: "licenciamento",
            amount: veiculo.licenciamentoValor || 0,
            date: d,
            icon: "📄",
            color: veiculo.licenciamentoPago ? "bg-success text-white" : "bg-destructive text-white"
          });
        }
      } catch (e) {}
    }

    return map;
  }, [veiculo, seguro, selectedYear]);

  // Lista dos 12 meses do ano selecionado
  const months = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    return eachMonthOfInterval({ start, end });
  }, [selectedYear]);

  // Total anual de gastos no calendário
  const yearTotal = useMemo(() => {
    let total = 0;
    yearEvents.forEach(events => {
      events.forEach(e => total += e.amount);
    });
    return total;
  }, [yearEvents]);

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-6">
      {/* HEADER DO CALENDÁRIO ANUAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-foreground tracking-tight">
              Calendário Anual de Manutenções & Custos
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Passe o mouse ou toque nos dias destacados para visualizar os lançamentos do dia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Total Acumulado {selectedYear}</span>
            <span className="font-black text-lg text-foreground tabular-nums">{formatCurrency(yearTotal)}</span>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-2xl border border-border/40">
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-xl" onClick={() => setSelectedYear(prev => prev - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-black text-sm px-3 tabular-nums text-foreground">{selectedYear}</span>
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-xl" onClick={() => setSelectedYear(prev => prev + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* LEGENDA RÁPIDA */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Combustível</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Manutenção</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Cosméticos</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> Seguro / Imposto Quitado</div>
      </div>

      {/* GRID DE 12 MESES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {months.map(monthDate => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

          return (
            <div key={monthDate.toISOString()} className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-wider text-foreground">
                  {format(monthDate, "MMMM", { locale: ptBR })}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {format(monthDate, "yyyy")}
                </span>
              </div>

              {/* Dias da Semana (D, S, T, Q, Q, S, S) */}
              <div className="grid grid-cols-7 text-center text-[9px] font-black text-muted-foreground opacity-60">
                <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
              </div>

              {/* Grid dos Dias do Mês */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Offset do primeiro dia da semana */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-full h-6" />
                ))}

                {days.map(day => {
                  const key = format(day, "yyyy-MM-dd");
                  const events = yearEvents.get(key);
                  const hasEvents = events && events.length > 0;
                  const primaryEvent = hasEvents ? events[0] : null;

                  return (
                    <div key={key} className="relative flex items-center justify-center">
                      {hasEvents ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={cn(
                              "w-6 h-6 rounded-lg font-bold text-[10px] flex items-center justify-center transition-all hover:scale-110 shadow-sm",
                              primaryEvent?.color || "bg-primary text-primary-foreground"
                            )}>
                              {day.getDate()}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 rounded-2xl border border-border/80 shadow-xl bg-card/95 backdrop-blur-md">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                <span className="font-black text-xs text-foreground">
                                  {format(day, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                </span>
                                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold">
                                  {events.length} evento(s)
                                </Badge>
                              </div>

                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {events.map(e => (
                                  <div key={e.id} className="p-2 rounded-xl bg-muted/30 text-xs space-y-1">
                                    <div className="flex items-center justify-between font-bold">
                                      <span className="flex items-center gap-1.5 text-foreground">
                                        <span>{e.icon}</span>
                                        <span className="truncate max-w-[120px]">{e.title}</span>
                                      </span>
                                      <span className="font-black tabular-nums text-foreground">{formatCurrency(e.amount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="w-6 h-6 rounded-lg font-medium text-[10px] text-muted-foreground flex items-center justify-center">
                          {day.getDate()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
