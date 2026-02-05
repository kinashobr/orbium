"use client";

import { Badge } from "@/components/ui/badge";
import { cn, parseDateLocal } from "@/lib/utils";
import { formatCurrency, SeguroVeiculo } from "@/types/finance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VehicleInsuranceTab({
  seguro,
  isMobile,
}: {
  seguro: SeguroVeiculo | undefined;
  isMobile: boolean;
}) {
  if (!seguro) {
    return (
      <div className="py-20 text-center opacity-30">
        <div className="mx-auto mb-4 h-16 w-16 rounded-3xl bg-muted/30" />
        <p className="font-black uppercase tracking-widest text-xs">Sem seguro ativo</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Card da Apólice */}
      <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/40 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Apólice</p>
            <p className="font-black text-lg text-foreground truncate">{seguro.numeroApolice || "N/A"}</p>
            <p className="text-xs font-bold text-primary uppercase mt-1 truncate">{seguro.seguradora}</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1 uppercase shrink-0">
            VALOR: {formatCurrency(seguro.valorTotal || 0)}
          </Badge>
        </div>

        <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Início</p>
            <p className="font-bold text-sm">
              {seguro.vigenciaInicio ? format(parseDateLocal(seguro.vigenciaInicio), "dd/MM/yyyy") : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Fim</p>
            <p className="font-bold text-sm">
              {seguro.vigenciaFim ? format(parseDateLocal(seguro.vigenciaFim), "dd/MM/yyyy") : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Histórico de Parcelas */}
      <div className="space-y-4">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">
          Histórico de Parcelas
        </p>

        <ScrollArea className="max-h-[280px] w-full scrollbar-material" aria-label="Lista de parcelas do seguro">
          <div className="space-y-2 pr-3">
            {seguro.parcelas?.map((p) => {
              const isOver =
                !p.paga && p.vencimento && parseDateLocal(p.vencimento) < new Date();

              return (
                <div
                  key={p.numero}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                    p.paga
                      ? "bg-success/[0.03] border-success/20 opacity-70"
                      : isOver
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-muted/10 border-border/40",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {p.paga ? (
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    ) : isOver ? (
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-sm text-foreground">Parcela {p.numero}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {p.vencimento
                          ? format(parseDateLocal(p.vencimento), "dd 'de' MMMM", { locale: ptBR })
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <span className={cn("font-black text-base tabular-nums shrink-0 ml-3", p.paga ? "text-success" : "text-foreground")}>
                    {formatCurrency(p.valor || 0)}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}