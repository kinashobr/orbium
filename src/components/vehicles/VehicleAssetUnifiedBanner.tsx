"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Shield, 
  Fuel, 
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { toast } from "sonner";

interface VehicleAssetUnifiedBannerProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleAssetUnifiedBanner({
  veiculo,
  seguro,
  onUpdateVeiculo,
}: VehicleAssetUnifiedBannerProps) {
  const colors = useChartColors();

  const [showFipeUpdate, setShowFipeUpdate] = useState(false);
  const [fipeInputVal, setFipeInputVal] = useState(veiculo.valorFipe || 0);

  // FIPE Chart Data
  const fipeChartData = useMemo(() => {
    const points = (veiculo.historico || [])
      .filter(h => h.type === "fipe")
      .map(h => ({
        dateFormatted: h.date ? format(parseDateLocal(h.date), "dd/MM/yy") : "N/A",
        valor: h.amount || 0,
      }))
      .sort((a, b) => new Date(a.dateFormatted).getTime() - new Date(b.dateFormatted).getTime());

    const baseVal = veiculo.valorVeiculo || veiculo.valorFipe || 0;
    if (points.length === 0 && baseVal > 0) {
      points.push({ dateFormatted: "Aquisição", valor: baseVal });
      points.push({ dateFormatted: "Hoje", valor: veiculo.valorFipe || baseVal });
    }
    return points;
  }, [veiculo]);

  // FIPE Variation
  const fipeDiff = (veiculo.valorFipe || 0) - (veiculo.valorVeiculo || 0);
  const fipePercent = veiculo.valorVeiculo > 0 ? (fipeDiff / veiculo.valorVeiculo) * 100 : 0;

  // Consumption Data
  const consumption = useMemo(() => {
    let totalLitres = 0;
    let totalFuelSpent = 0;

    (veiculo.historico || []).forEach(h => {
      if (h.meta?.gastoTipo === "combustivel") {
        totalFuelSpent += h.amount || 0;
        if (h.meta.litros) totalLitres += h.meta.litros;
      }
    });

    const avgKmL = totalLitres > 0 ? Number((totalFuelSpent / (totalLitres * 5.8)).toFixed(1)) : (veiculo.tipo === 'moto' ? 28.5 : 12.4);

    return { avgKmL, totalLitres, totalFuelSpent };
  }, [veiculo]);

  const handleSaveFipe = () => {
    if (fipeInputVal <= 0) return;
    const historyItem = {
      id: `vh_fipe_${Date.now()}`,
      type: 'fipe' as const,
      date: format(new Date(), "yyyy-MM-dd"),
      title: 'Atualização FIPE',
      amount: fipeInputVal,
    };
    onUpdateVeiculo(veiculo.id, {
      valorFipe: fipeInputVal,
      historico: [...(veiculo.historico || []), historyItem]
    });
    toast.success("Tabela FIPE atualizada!");
    setShowFipeUpdate(false);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 relative overflow-hidden space-y-6">
      {/* GLOW DE FUNDO */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TÍTULO DO BANNER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-foreground tracking-tight">
              Central Patrimonial do Veículo
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Acompanhamento integrado de cotação FIPE, vigência de seguro e eficiência de consumo.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-xs font-black px-3 py-1 rounded-xl">
          {veiculo.placa || "Sem Placa"}
        </Badge>
      </div>

      {/* GRID INTERNA DOS 3 BLOCOS UNIFICADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* BLOCO 1: COTAÇÃO FIPE */}
        <div className="p-5 rounded-3xl bg-card/80 border border-border/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avaliação FIPE</span>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5",
                fipeDiff >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {fipeDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {fipeDiff >= 0 ? "+" : ""}{fipePercent.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-black text-2xl text-foreground tabular-nums">{formatCurrency(veiculo.valorFipe)}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] font-bold text-primary" onClick={() => setShowFipeUpdate(!showFipeUpdate)}>
                <RefreshCw className="w-3 h-3 mr-1" /> Editar
              </Button>
            </div>

            {showFipeUpdate && (
              <div className="p-3 bg-muted/40 border border-primary/20 rounded-2xl mt-2 space-y-2">
                <Input type="number" value={fipeInputVal} onChange={e => setFipeInputVal(Number(e.target.value))} className="h-8 text-xs font-bold rounded-xl" />
                <Button size="sm" className="w-full h-7 text-[10px] font-black uppercase bg-success text-white rounded-xl" onClick={handleSaveFipe}>
                  Salvar FIPE
                </Button>
              </div>
            )}

            {/* Mini Gráfico */}
            <div className="h-[60px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fipeChartData}>
                  <defs>
                    <linearGradient id="fipeUnifGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="valor" stroke={colors.primary} strokeWidth={2} fill="url(#fipeUnifGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground pt-2 border-t border-border/30 block">
            Compra: <span className="text-foreground">{formatCurrency(veiculo.valorVeiculo)}</span>
          </span>
        </div>

        {/* BLOCO 2: VIGÊNCIA DE SEGURO */}
        <div className="p-5 rounded-3xl bg-card/80 border border-border/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Proteção Veicular</span>
              <Badge className={cn("border-none text-[9px] font-black px-2 py-0.5 rounded-md uppercase", seguro ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                {seguro ? "Ativo" : "Sem Seguro"}
              </Badge>
            </div>

            <span className="font-black text-2xl text-foreground tabular-nums">
              {seguro ? formatCurrency(seguro.valorTotal) : "R$ 0,00"}
            </span>

            <div className="space-y-1 mt-3 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-muted-foreground">Seguradora:</span>
                <span className="text-foreground truncate max-w-[120px]">{seguro?.seguradora || "N/A"}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-muted-foreground">Vigência Até:</span>
                <span className="text-foreground">{seguro?.vigenciaFim ? format(parseDateLocal(seguro.vigenciaFim), "dd/MM/yyyy") : "N/I"}</span>
              </div>
            </div>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground pt-2 border-t border-border/30 block truncate">
            {seguro?.parcelas ? `${seguro.parcelas.filter(p => p.paga).length}/${seguro.parcelas.length} parcelas pagas` : "Consulte a aba de seguros"}
          </span>
        </div>

        {/* BLOCO 3: MÉDIA DE CONSUMO (KM/L) */}
        <div className="p-5 rounded-3xl bg-card/80 border border-border/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Média de Consumo</span>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                ⛽ Autonomia
              </Badge>
            </div>

            <span className="font-black text-2xl text-foreground tabular-nums">
              {consumption.avgKmL} <span className="text-sm font-bold text-muted-foreground">Km/L</span>
            </span>

            <div className="space-y-1 mt-3 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-muted-foreground">Total Litros:</span>
                <span className="text-foreground">{consumption.totalLitres.toFixed(1)} L</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-muted-foreground">Combustível Total:</span>
                <span className="text-foreground">{formatCurrency(consumption.totalFuelSpent)}</span>
              </div>
            </div>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground pt-2 border-t border-border/30 block">
            Média estimada por abastecimento
          </span>
        </div>

      </div>
    </div>
  );
}
