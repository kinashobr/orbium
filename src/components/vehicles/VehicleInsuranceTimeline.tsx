"use client";

import { useMemo } from "react";
import { Veiculo, SeguroVeiculo, formatCurrency } from "@/types/finance";
import { CalendarRange, Check, Clock } from "lucide-react";
import { parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinance } from "@/contexts/FinanceContext";

interface VehicleInsuranceTimelineProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
}

export function VehicleInsuranceTimeline({ veiculo, seguro }: VehicleInsuranceTimelineProps) {
  const { transacoesV2, billsTracker } = useFinance();

  // Helper para verificar se a parcela do seguro foi paga no extrato/transações/billsTracker
  const checkIsParcelPaid = (pNum: number, originalPaidStatus: boolean, txId?: string): boolean => {
    if (originalPaidStatus) return true;
    if (txId && transacoesV2.some(t => t.id === txId)) return true;

    // Buscar transação no extrato que corresponda ao seguro desta parcela/veículo
    const hasMatchingTx = transacoesV2.some(t => {
      const descLower = (t.description || "").toLowerCase();
      const isSeg = descLower.includes("seguro") || t.meta?.obligationType === "seguro";
      const isVeh = t.meta?.assetId === veiculo?.id || t.links?.vehicleTransactionId === String(veiculo?.id);
      
      if (!isSeg && !isVeh) return false;

      const numStr = String(pNum);
      const isParcNum = t.meta?.parcelaNumber === pNum || 
                        descLower.includes(`p${numStr}`) || 
                        descLower.includes(`p0${numStr}`) ||
                        descLower.includes(`parcela ${numStr}`) ||
                        descLower.includes(`parcela 0${numStr}`) ||
                        descLower.includes(`${numStr}/`) ||
                        descLower.includes(` ${numStr}x `);

      return isVeh && isParcNum;
    });

    if (hasMatchingTx) return true;

    // Buscar no contas a pagar / billsTracker
    const hasMatchingBill = billsTracker.some(b => 
      b.sourceType === "insurance_installment" && 
      (b.sourceRef === String(seguro?.id) || b.sourceRef === String(veiculo?.id)) && 
      b.parcelaNumber === pNum && 
      b.isPaid
    );

    return hasMatchingBill;
  };

  // Construir parcelas dos 12 meses
  const timelineData = useMemo(() => {
    const totalVal = seguro?.valorTotal || veiculo?.valorSeguro || 1109.63;
    const numParcelas = seguro?.numeroParcelas || 12;
    const itemVal = totalVal / numParcelas;

    // Se houver parcelas salvas no seguro
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

        const paga = checkIsParcelPaid(p.numero, p.paga, p.transactionId);

        return {
          numero: p.numero,
          paga,
          valor: p.valor || itemVal,
          labelMes,
          subText,
          vencimento: p.vencimento
        };
      });

      // Garantir 12 colunas se tiver menos
      while (items.length < 12) {
        const nextNum = items.length + 1;
        const paga = checkIsParcelPaid(nextNum, false);
        items.push({
          numero: nextNum,
          paga,
          valor: itemVal,
          labelMes: `P${String(nextNum).padStart(2, "0")}`,
          subText: `MÊS ${nextNum}`,
          vencimento: ""
        });
      }

      const totalLiquidado = items.filter(i => i.paga).reduce((acc, curr) => acc + curr.valor, 0);
      const totalRestante = Math.max(0, totalVal - totalLiquidado);

      return {
        items,
        totalVal,
        totalLiquidado,
        totalRestante
      };
    }

    // Default 12 parcelas se não houver apólice com array estático
    const defaultMonths = ["DEZ/25", "JAN/26", "FEV/26", "MAR/26", "ABR/26", "MAI/26", "JUN/26", "JUL/26", "AGO/26", "SET/26", "OUT/26", "NOV/26"];
    const items = defaultMonths.map((m, idx) => {
      const pNum = idx + 1;
      // Verificar se essa parcela foi paga via transação de seguro no extrato
      const isPaidInExtrato = checkIsParcelPaid(pNum, idx < 11);
      return {
        numero: pNum,
        paga: isPaidInExtrato,
        valor: itemVal > 0 ? itemVal : 92.47,
        labelMes: `P${String(pNum).padStart(2, "0")}`,
        subText: m,
        vencimento: idx === 11 ? "10/11/2026" : ""
      };
    });

    const totalLiquidadoDefault = items.filter(i => i.paga).reduce((acc, curr) => acc + curr.valor, 0);
    const totalRestanteDefault = Math.max(0, totalVal - totalLiquidadoDefault);

    return {
      items,
      totalVal,
      totalLiquidado: totalLiquidadoDefault,
      totalRestante: totalRestanteDefault
    };
  }, [seguro, veiculo, transacoesV2, billsTracker]);

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
              Execução orçamentária do seguro anual ({seguro?.seguradora || "Seguradora"} #{seguro?.numeroApolice || "Ativo"})
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

              {/* Hover Popover Tooltip (Ajustado tom de cor de alto contraste) */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-2.5 py-1 rounded-xl bg-card text-foreground font-mono font-bold text-[10px] whitespace-nowrap shadow-lg z-30 border border-border">
                Parcela {item.labelMes} • Venc. {item.vencimento || "Pendente"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
