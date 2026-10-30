"use client";

import { useMemo } from "react";
import { Veiculo, SeguroVeiculo, formatCurrency } from "@/types/finance";
import { CalendarRange, Check, Clock } from "lucide-react";
import { parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VehicleInsuranceTimelineProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
}

export function VehicleInsuranceTimeline({ seguro }: VehicleInsuranceTimelineProps) {
  // Construir parcelas dos 12 meses
  const timelineData = useMemo(() => {
    const totalVal = seguro?.valorTotal || 1109.63;
    const numParcelas = seguro?.numeroParcelas || 12;
    const itemVal = totalVal / numParcelas;

    // Se houver parcelas salvas
    if (seguro && seguro.parcelas && seguro.parcelas.length > 0) {
      const items = seguro.parcelas.map((p) => {
        let labelMes = `P${String(p.numero).padStart(2, "0")}`;
        let subText = "PENDENTE";
        if (p.vencimento) {
          try {
            const dateObj = parseDateLocal(p.vencimento);
            subText = format(dateObj, "MMM/yy", { locale: ptBR }).toUpperCase();
          } catch {
            subText = `VENC ${p.numero}`;
          }
        }
        return {
          numero: p.numero,
          paga: p.paga,
          valor: p.valor || itemVal,
          labelMes,
          subText,
          vencimento: p.vencimento
        };
      });

      // Garantir 12 colunas se tiver menos
      while (items.length < 12) {
        const nextNum = items.length + 1;
        items.push({
          numero: nextNum,
          paga: false,
          valor: itemVal,
          labelMes: `P${String(nextNum).padStart(2, "0")}`,
          subText: `MÊS ${nextNum}`,
          vencimento: ""
        });
      }

      const totalLiquidado = items.filter(i => i.paga).reduce((acc, curr) => acc + curr.valor, 0);
      const totalRestante = totalVal - totalLiquidado;

      return {
        items,
        totalVal,
        totalLiquidado,
        totalRestante
      };
    }

    // Default 12 parcelas da maquete se não houver seguro ativo registrado
    const defaultMonths = ["DEZ/25", "JAN/26", "FEV/26", "MAR/26", "ABR/26", "MAI/26", "JUN/26", "JUL/26", "AGO/26", "SET/26", "OUT/26", "10/NOV"];
    const items = defaultMonths.map((m, idx) => ({
      numero: idx + 1,
      paga: idx < 11, // P12 é a única pendente
      valor: 92.47,
      labelMes: `P${String(idx + 1).padStart(2, "0")}`,
      subText: m,
      vencimento: idx === 11 ? "10/11/2026" : ""
    }));

    const totalValDefault = 1109.63;
    const totalLiquidadoDefault = 11 * 92.47;
    const totalRestanteDefault = 92.47;

    return {
      items,
      totalVal: totalValDefault,
      totalLiquidado: totalLiquidadoDefault,
      totalRestante: totalRestanteDefault
    };
  }, [seguro]);

  return (
    <section className="flex flex-col p-6 lg:p-8 rounded-3xl bg-card border border-border/60 shadow-sm gap-5">
      {/* HEADER DO CRONOGRAMA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-foreground leading-none">
              Cronograma de Parcelamento da Apólice
            </h2>
            <span className="text-xs text-muted-foreground font-medium mt-1 block">
              Execução orçamentária do seguro anual ({seguro?.seguradora || "Mapfre"} #{seguro?.numeroApolice || "050051"})
            </span>
          </div>
        </div>

        {/* SUMMARY BADGES DOCK */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border/50 flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
            <span className="font-mono text-xs font-black text-foreground">
              {formatCurrency(timelineData.totalVal)}
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
            <span className="text-[10px] font-bold text-primary uppercase">Liquidado</span>
            <span className="font-mono text-xs font-black text-primary">
              {formatCurrency(timelineData.totalLiquidado)}
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Restante</span>
            <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(timelineData.totalRestante)}
            </span>
          </div>
        </div>
      </div>

      {/* SEGMENTED INTERACTIVE STEP RIBBON (P01 - P12) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 pt-2">
        {timelineData.items.map((item) => {
          if (item.paga) {
            return (
              <div 
                key={item.numero}
                className="group relative flex flex-col items-center justify-between p-2.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 transition-all select-none"
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm mb-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span className="font-mono text-xs font-black text-foreground">{item.labelMes}</span>
                <span className="font-mono text-xs sm:text-sm font-black text-primary">{formatCurrency(item.valor)}</span>
                <span className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">{item.subText}</span>
              </div>
            );
          }

          // Parcela Pendente
          return (
            <div 
              key={item.numero}
              className="group relative flex flex-col items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-sm select-none"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm mb-1.5 animate-bounce">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-black text-foreground">{item.labelMes}</span>
              <span className="font-mono text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(item.valor)}
              </span>
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase mt-1">
                {item.subText}
              </span>

              {/* Hover Popover Tooltip */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-2.5 py-1 rounded-xl bg-popover text-popover-foreground text-[10px] font-mono font-bold whitespace-nowrap shadow-md z-30 border border-border">
                Última Parcela • Venc. {item.vencimento || "10/11/2026"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
