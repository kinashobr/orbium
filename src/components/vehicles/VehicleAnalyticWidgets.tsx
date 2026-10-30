"use client";

import { useMemo, useState } from "react";
import { Veiculo, SeguroVeiculo, formatCurrency } from "@/types/finance";
import { 
  ShieldCheck, 
  TrendingUp, 
  Fuel, 
  CheckCircle2, 
  RefreshCw,
  BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

interface VehicleAnalyticWidgetsProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleAnalyticWidgets({
  veiculo,
  seguro,
  onUpdateVeiculo,
}: VehicleAnalyticWidgetsProps) {
  const [showFipeModal, setShowFipeModal] = useState(false);
  const [fipeInputVal, setFipeInputVal] = useState(veiculo.valorFipe || 0);

  // Estado para Tooltip Estável do Gráfico FIPE (Zero Jitter)
  const [hoveredFipeIndex, setHoveredFipeIndex] = useState<number | null>(null);

  // WIDGET A: SEGURO (Métricas e Radial SVG Gauge)
  const insuranceMetrics = useMemo(() => {
    if (!seguro || !seguro.parcelas || seguro.parcelas.length === 0) {
      return {
        percentPaid: 91.6,
        paidCount: 11,
        totalCount: 12,
        valorTotal: seguro?.valorTotal || 1109.63,
        seguradora: seguro?.seguradora || "Mapfre Auto Exclusivo",
        vigencia: "Vig. Nov/26"
      };
    }
    const totalCount = seguro.parcelas.length;
    const paidCount = seguro.parcelas.filter(p => p.paga).length;
    const percentPaid = Number(((paidCount / totalCount) * 100).toFixed(1));
    const endYear = seguro.vigenciaFim ? seguro.vigenciaFim.slice(0, 7) : "Nov/26";

    return {
      percentPaid,
      paidCount,
      totalCount,
      valorTotal: seguro.valorTotal,
      seguradora: seguro.seguradora || "Seguradora",
      vigencia: `Vig. ${endYear}`
    };
  }, [seguro]);

  // SVG Radial calculation
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * (insuranceMetrics.percentPaid / 100));

  // WIDGET B: HISTÓRICO FIPE COM PONTOS PARA TOOLTIP AO PASSAR O MOUSE
  const fipeHistoryData = useMemo(() => {
    const rawFipeHistory = (veiculo.historico || [])
      .filter(h => h.type === "fipe")
      .map(h => ({
        date: h.date ? format(new Date(h.date), "MM/yy") : "Anterior",
        valor: h.amount || 0
      }));

    if (rawFipeHistory.length > 0) {
      return rawFipeHistory;
    }

    const compra = veiculo.valorVeiculo || 21000;
    const fipeAtual = veiculo.valorFipe || 19689;

    return [
      { date: "Compra", valor: compra },
      { date: "Jan/26", valor: Math.round(compra * 0.98) },
      { date: "Mai/26", valor: Math.round(compra * 0.96) },
      { date: "Set/26", valor: Math.round(compra * 0.94) },
      { date: "Atual", valor: fipeAtual }
    ];
  }, [veiculo]);

  // WIDGET C: CONSUMO DE COMBUSTÍVEL (Pega dados reais com odômetro e litros do histórico)
  const fuelMetrics = useMemo(() => {
    let totalFuelSpent = 0;
    
    // Extrai todos os abastecimentos do histórico
    const fuelEntries: {
      date: string;
      title: string;
      amount: number;
      litros: number;
      odometro?: number;
      tipoCombustivel?: string;
    }[] = [];

    (veiculo.historico || []).forEach(h => {
      const titleLower = (h.title || "").toLowerCase();
      const isFuel = h.type === "despesa" && (
        h.meta?.gastoTipo === "combustivel" || 
        titleLower.includes("combustivel") || 
        titleLower.includes("gasolina") || 
        titleLower.includes("abastec") ||
        titleLower.includes("etanol") ||
        titleLower.includes("diesel")
      );

      if (isFuel) {
        const amount = h.amount || 0;
        let litros = typeof h.meta?.litros === "number" ? h.meta.litros : parseFloat(String(h.meta?.litros || 0));
        if (!litros || isNaN(litros)) {
          litros = Number((amount / 5.8).toFixed(1));
        }

        let odometroVal = typeof h.meta?.odometro === "number" ? h.meta.odometro : 
                          typeof h.meta?.kmAtual === "number" ? h.meta.kmAtual : 
                          parseFloat(String(h.meta?.odometro || h.meta?.kmAtual || 0));
        const odometro = (!isNaN(odometroVal) && odometroVal > 0) ? odometroVal : undefined;

        fuelEntries.push({
          date: h.date,
          title: h.title,
          amount,
          litros,
          odometro,
          tipoCombustivel: (h.meta?.tipoCombustivel as string) || "Gasolina"
        });

        totalFuelSpent += amount;
      }
    });

    // Ordenar por odômetro ou data crescente
    fuelEntries.sort((a, b) => {
      if (a.odometro && b.odometro) return a.odometro - b.odometro;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Calcular segmentos de rodagem entre abastecimentos consecutivos
    const segments: {
      date: string;
      litros: number;
      amount: number;
      odometro: number;
      deltaKm?: number;
      kmL: number;
      custoKm?: number;
    }[] = [];

    let lastKnownOdometer = fuelEntries.filter(e => e.odometro !== undefined).slice(-1)[0]?.odometro;
    let totalTrackedKm = 0;
    let totalTrackedLitres = 0;

    for (let i = 0; i < fuelEntries.length; i++) {
      const entry = fuelEntries[i];
      const prevEntry = i > 0 ? fuelEntries[i - 1] : null;

      let deltaKm: number | undefined;
      let kmL: number;
      let custoKm: number | undefined;

      if (entry.odometro && prevEntry && prevEntry.odometro && entry.odometro > prevEntry.odometro) {
        deltaKm = entry.odometro - prevEntry.odometro;
        if (entry.litros > 0) {
          kmL = Number((deltaKm / entry.litros).toFixed(1));
        } else {
          kmL = veiculo.tipo === 'moto' ? 31.2 : 12.8;
        }
        if (deltaKm > 0 && entry.amount > 0) {
          custoKm = Number((entry.amount / deltaKm).toFixed(2));
        }
        totalTrackedKm += deltaKm;
        totalTrackedLitres += entry.litros;
      } else {
        kmL = veiculo.tipo === 'moto' ? 31.2 : 12.8;
      }

      segments.push({
        date: entry.date ? format(parseDateLocal(entry.date), "dd/MM") : `Abast. ${i + 1}`,
        litros: entry.litros,
        amount: entry.amount,
        odometro: entry.odometro || 0,
        deltaKm,
        kmL,
        custoKm
      });
    }

    // Média geral de km/L
    let avgKmL: number;
    if (totalTrackedKm > 0 && totalTrackedLitres > 0) {
      avgKmL = Number((totalTrackedKm / totalTrackedLitres).toFixed(1));
    } else if (segments.length > 0) {
      const validKmLs = segments.map(s => s.kmL).filter(v => v > 0);
      avgKmL = validKmLs.length > 0 
        ? Number((validKmLs.reduce((a, b) => a + b, 0) / validKmLs.length).toFixed(1))
        : (veiculo.tipo === 'moto' ? 31.2 : 12.8);
    } else {
      avgKmL = veiculo.tipo === 'moto' ? 31.2 : 12.8;
    }

    // Histórico de pontos para o gráfico de barras
    let historyKmLPoints = segments.map(s => ({
      date: s.date,
      kmL: s.kmL,
      litros: s.litros,
      amount: s.amount,
      odometro: s.odometro,
      deltaKm: s.deltaKm,
      custoKm: s.custoKm
    }));

    if (historyKmLPoints.length === 0) {
      historyKmLPoints = [
        { date: "Abast. 1", kmL: Number((avgKmL * 0.92).toFixed(1)), litros: 10, amount: 50, odometro: 10000, deltaKm: undefined, custoKm: undefined },
        { date: "Abast. 2", kmL: Number((avgKmL * 0.98).toFixed(1)), litros: 11, amount: 57.2, odometro: 10300, deltaKm: 300, custoKm: 0.19 },
        { date: "Atual", kmL: avgKmL, litros: 12, amount: 62, odometro: 10620, deltaKm: 320, custoKm: 0.19 }
      ];
    }

    const validCustos = historyKmLPoints.map(p => p.custoKm).filter((c): c is number => c !== undefined && c > 0);
    const avgCustoKm = validCustos.length > 0 
      ? Number((validCustos.reduce((a, b) => a + b, 0) / validCustos.length).toFixed(2)) 
      : Number((5.8 / avgKmL).toFixed(2));

    return {
      avgKmL,
      lastKnownOdometer: lastKnownOdometer || 0,
      totalTrackedKm,
      avgCustoKm,
      historyKmLPoints,
      fuelCount: fuelEntries.length
    };
  }, [veiculo]);

  const handleSaveFipe = () => {
    if (!fipeInputVal || fipeInputVal <= 0) {
      toast.error("Informe um valor válido da tabela FIPE.");
      return;
    }

    const historyItem = {
      id: `vh_fipe_${Date.now()}`,
      type: "fipe" as const,
      date: format(new Date(), "yyyy-MM-dd"),
      title: "Atualização de Tabela FIPE",
      amount: fipeInputVal
    };

    onUpdateVeiculo(veiculo.id, {
      valorFipe: fipeInputVal,
      historico: [...(veiculo.historico || []), historyItem]
    });

    toast.success("Valor da Tabela FIPE atualizado com sucesso!");
    setShowFipeModal(false);
  };

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WIDGET A: SEGURO (Métricas e Radial SVG Gauge) */}
        <div className="flex flex-col justify-between p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-display font-bold text-sm text-foreground block leading-tight">
                  Apólice Seguro
                </span>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {insuranceMetrics.seguradora}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono text-[11px] font-bold">
              {insuranceMetrics.vigencia}
            </span>
          </div>

          {/* Anel Radial SVG de Medição */}
          <div className="flex items-center justify-center my-3 relative">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
              <circle 
                className="text-muted/30" 
                cx="60" 
                cy="60" 
                fill="transparent" 
                r={radius} 
                stroke="currentColor" 
                strokeWidth="10" 
              />
              <circle 
                className="text-primary transition-all duration-1000 ease-out" 
                cx="60" 
                cy="60" 
                fill="transparent" 
                r={radius} 
                stroke="currentColor" 
                strokeDasharray={circumference} 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round" 
                strokeWidth="10" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display font-black text-2xl text-foreground leading-none">
                {insuranceMetrics.percentPaid}%
              </span>
              <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                {insuranceMetrics.paidCount} / {insuranceMetrics.totalCount} Pagas
              </span>
            </div>
          </div>

          {/* Rodapé Micro Data */}
          <div className="flex items-center justify-between bg-muted/40 px-3.5 py-2.5 rounded-2xl border border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Prêmio Anual</span>
              <span className="text-xs font-black text-foreground">{formatCurrency(insuranceMetrics.valorTotal)}</span>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">
                {insuranceMetrics.totalCount - insuranceMetrics.paidCount} Parcela Restante
              </span>
            </div>
          </div>
        </div>

        {/* WIDGET B: FIPE SPARKLINE - CORRIGIDO ESPAÇO EXTRA ENTRE TÍTULO E VALOR */}
        <div className="flex flex-col justify-start gap-2 p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-foreground leading-tight">
                  Avaliação FIPE
                </span>
                
                {/* BOTÃO APENAS ÍCONE REDUZIDO DE ATUALIZAR FIPE */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-6 h-6 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Atualizar Valor FIPE"
                  onClick={() => {
                    setFipeInputVal(veiculo.valorFipe || 19689);
                    setShowFipeModal(true);
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Tooltip Header Pill Estilizado */}
            {hoveredFipeIndex !== null && (
              <span className="text-[11px] font-mono font-bold bg-amber-500 text-amber-950 dark:text-zinc-950 px-2.5 py-0.5 rounded-full shadow-sm animate-in fade-in duration-150">
                {fipeHistoryData[hoveredFipeIndex].date}: {formatCurrency(fipeHistoryData[hoveredFipeIndex].valor)}
              </span>
            )}
          </div>

          {/* Valor Principal FIPE & Preço de Compra - FLUXO COMPACTO SEM ESPAÇO EXTRA */}
          <div className="flex flex-col">
            <div className="flex items-baseline justify-between">
              <span className="font-display font-black text-2xl text-foreground">
                {formatCurrency(veiculo.valorFipe || 19689)}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Valor Compra: <strong className="text-foreground">{formatCurrency(veiculo.valorVeiculo || 21000)}</strong>
            </span>

            {/* Gráfico Sparkline FIPE Ajustado */}
            <div className="h-28 w-full relative mt-3">
              {(() => {
                const values = fipeHistoryData.map(d => d.valor);
                const minV = Math.min(...values);
                const maxV = Math.max(...values);
                const range = maxV - minV || 1;
                const width = 320;
                const height = 100;
                const padX = 16;
                const padYTop = 16;
                const padYBottom = 16;
                const usableW = width - padX * 2;
                const usableH = height - padYTop - padYBottom;

                const points = fipeHistoryData.map((d, i) => {
                  const x = padX + (i / (fipeHistoryData.length - 1)) * usableW;
                  const y = padYTop + (1 - (d.valor - minV) / range) * usableH;
                  return { x, y, val: d.valor, date: d.date };
                });

                // Path D para linha curva suavizada
                let dPath = `M ${points[0].x},${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                  const curr = points[i];
                  const next = points[i + 1];
                  const mx = (curr.x + next.x) / 2;
                  dPath += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
                }

                const areaPath = `${dPath} L ${points[points.length - 1].x},${height - 4} L ${points[0].x},${height - 4} Z`;

                return (
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                    <defs>
                      <linearGradient id="fipeWidgetGradFixed" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Area */}
                    <path d={areaPath} fill="url(#fipeWidgetGradFixed)" />

                    {/* Stroke Curve */}
                    <path d={dPath} fill="none" stroke="rgb(245, 158, 11)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Interactive Circles */}
                    {points.map((pt, i) => {
                      const isHovered = hoveredFipeIndex === i;
                      return (
                        <g key={i}>
                          {/* Invisible hover target */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="12"
                            fill="transparent"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setHoveredFipeIndex(i)}
                            onMouseLeave={() => setHoveredFipeIndex(null)}
                          />
                          
                          {/* Visible Node Circle */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : 3.5}
                            className={isHovered ? "fill-amber-500 stroke-card" : "fill-card stroke-amber-500"}
                            strokeWidth="2"
                            style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                            onMouseEnter={() => setHoveredFipeIndex(i)}
                            onMouseLeave={() => setHoveredFipeIndex(null)}
                          />

                          {/* Floating Tooltip Bubble on Hover */}
                          {isHovered && (
                            <g className="animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                              <rect
                                x={Math.min(Math.max(pt.x - 48, 4), width - 100)}
                                y={Math.max(pt.y - 32, 2)}
                                width="96"
                                height="22"
                                rx="6"
                                className="fill-zinc-900 dark:fill-zinc-100 stroke-border"
                              />
                              <text
                                x={Math.min(Math.max(pt.x, 52), width - 52)}
                                y={Math.max(pt.y - 18, 16)}
                                textAnchor="middle"
                                className="fill-zinc-100 dark:fill-zinc-900 font-mono font-bold text-[10px]"
                              >
                                {pt.date}: {formatCurrency(pt.val)}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>

        {/* WIDGET C: CONSUMO DE COMBUSTÍVEL - CORRIGIDO ESPAÇO EXTRA E INTEGRADO ODÔMETRO/RODAGEM */}
        <div className="flex flex-col justify-start gap-2 p-6 rounded-3xl bg-card border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="font-display font-bold text-sm text-foreground block leading-tight">
                  Consumo & Rodagem
                </span>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Eficiência Média & KM</span>
              </div>
            </div>
          </div>

          {/* Conteúdo compacto de Consumo & Rodagem */}
          <div className="flex flex-col">
            <div className="flex items-baseline justify-between">
              <span className="font-display font-black text-2xl text-foreground">
                {fuelMetrics.avgKmL} <span className="text-xs font-bold text-muted-foreground">km/l</span>
              </span>
              <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                {(100 / fuelMetrics.avgKmL).toFixed(1)} L/100km
              </span>
            </div>

            {/* Badges do Odômetro & Rodagem */}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {fuelMetrics.lastKnownOdometer > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                  🚗 Odômetro: <strong className="text-foreground">{fuelMetrics.lastKnownOdometer.toLocaleString('pt-BR')} KM</strong>
                </span>
              )}
              {fuelMetrics.totalTrackedKm > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  ⚡ +{fuelMetrics.totalTrackedKm.toLocaleString('pt-BR')} KM rodados
                </span>
              )}
              {fuelMetrics.avgCustoKm > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                  💸 R$ {fuelMetrics.avgCustoKm.toFixed(2)}/KM
                </span>
              )}
            </div>

            {/* GRÁFICO DE BARRAS DE HISTÓRICO DE CONSUMO COM ODÔMETRO */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-primary" /> Histórico Abastecimentos
                </span>
                <span className="font-mono text-[9px]">km/l</span>
              </div>

              {/* Gráfico de Barras de Consumo */}
              <div className="h-20 w-full flex items-end justify-between gap-1.5 pt-2 pb-1 px-1.5 bg-muted/20 rounded-2xl border border-border/40">
                {fuelMetrics.historyKmLPoints.map((pt, idx) => {
                  const maxKmL = Math.max(...fuelMetrics.historyKmLPoints.map(p => p.kmL)) || 40;
                  const heightPercent = Math.min(100, Math.max(30, (pt.kmL / (maxKmL * 1.15)) * 100));
                  
                  return (
                    <div key={idx} className="flex-1 h-full flex flex-col items-center justify-end gap-1 group relative">
                      {/* Tooltip Hover no card */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-[9px] font-mono font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-20 shadow-md">
                        {pt.date}: {pt.kmL} km/l {pt.odometro ? `• ${pt.odometro.toLocaleString('pt-BR')} KM` : ''} {pt.litros ? `• ${pt.litros}L` : ''}
                      </div>

                      {/* Valor Numérico do Consumo Acima da Barra */}
                      <span className="text-[10px] font-mono font-extrabold text-primary group-hover:scale-110 transition-transform">
                        {pt.kmL.toFixed(1)}
                      </span>

                      {/* Barra de Consumo */}
                      <div className="w-full max-w-[28px] bg-primary/20 group-hover:bg-primary/30 rounded-t-lg transition-all flex items-end overflow-hidden" style={{ height: `${heightPercent}%` }}>
                        <div className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t-lg transition-all" style={{ height: "85%" }} />
                      </div>

                      {/* Rótulo de Data do Abastecimento */}
                      <span className="text-[9px] font-mono font-bold text-muted-foreground truncate w-full text-center">
                        {pt.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* MODAL ATUALIZAR FIPE */}
      <Dialog open={showFipeModal} onOpenChange={setShowFipeModal}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" /> Atualizar Tabela FIPE
            </DialogTitle>
            <DialogDescription>
              Informe o novo valor de mercado do veículo obtido na consulta oficial da FIPE.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Novo Valor FIPE (R$)</Label>
              <Input 
                type="number"
                value={fipeInputVal}
                onChange={e => setFipeInputVal(Number(e.target.value))}
                className="rounded-xl text-xs font-bold h-11 text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFipeModal(false)} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSaveFipe} className="rounded-xl text-xs font-bold bg-amber-500 text-amber-950 hover:bg-amber-600">
              Salvar Novo Valor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
