"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  RefreshCw, 
  Calendar, 
  Check, 
  Search,
  LineChart as LineChartIcon
} from "lucide-react";
import { formatCurrency, Veiculo } from "@/types/finance";
import { parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useChartColors } from "@/hooks/useChartColors";

interface VehicleFipeTabProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleFipeTab({ veiculo, onUpdateVeiculo }: VehicleFipeTabProps) {
  const colors = useChartColors();

  // Estados para atualização manual da FIPE inline
  const [showFipeForm, setShowFipeForm] = useState(false);
  const [newFipeValue, setNewFipeValue] = useState(veiculo.valorFipe || 0);
  const [newFipeDate, setNewFipeDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Gráfico de pontos FIPE
  const fipeChartData = useMemo(() => {
    if (!veiculo) return [];
    
    const points = (veiculo.historico || [])
      .filter(h => h.type === "fipe")
      .map(h => ({
        date: h.date,
        dateFormatted: h.date ? format(parseDateLocal(h.date), "dd/MM/yyyy") : "N/A",
        valor: h.amount || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const baseValue = veiculo.valorVeiculo || veiculo.valorFipe || 0;
    const baseDate = veiculo.dataCompra || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    if (points.length === 0 && baseValue > 0) {
      points.push({
        date: baseDate,
        dateFormatted: format(parseDateLocal(baseDate), "dd/MM/yyyy"),
        valor: baseValue,
      });
      points.push({
        date: new Date().toISOString(),
        dateFormatted: format(new Date(), "dd/MM/yyyy"),
        valor: veiculo.valorFipe || baseValue,
      });
    }

    return points;
  }, [veiculo]);

  // Variação percentual
  const variation = useMemo(() => {
    const initialVal = veiculo.valorVeiculo || veiculo.valorFipe || 0;
    const currentVal = veiculo.valorFipe || 0;
    const diff = currentVal - initialVal;
    const percent = initialVal > 0 ? (diff / initialVal) * 100 : 0;
    return { diff, percent, isUp: diff >= 0 };
  }, [veiculo]);

  // Handler para salvar novo valor de FIPE manual
  const handleSaveFipe = () => {
    if (newFipeValue <= 0) {
      toast.error("Informe um valor de FIPE válido.");
      return;
    }

    const oldValue = veiculo.valorFipe || 0;
    const historyItem = {
      id: `vh_fipe_${Date.now()}`,
      type: 'fipe' as const,
      date: newFipeDate,
      title: 'Atualização FIPE',
      description: `${formatCurrency(oldValue)} → ${formatCurrency(newFipeValue)}`,
      amount: newFipeValue,
      meta: { oldValue, newValue: newFipeValue }
    };

    const updatedHistory = [...(veiculo.historico || []), historyItem];
    onUpdateVeiculo(veiculo.id, {
      valorFipe: newFipeValue,
      historico: updatedHistory
    });

    toast.success(`Tabela FIPE atualizada para ${formatCurrency(newFipeValue)}!`);
    setShowFipeForm(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER DE VALORIZAÇÃO FIPE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 shadow-soft space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avaliação FIPE Atual</p>
          <p className="font-black text-3xl sm:text-4xl text-success tabular-nums">{formatCurrency(veiculo.valorFipe)}</p>
          <p className="text-[11px] font-bold text-muted-foreground">Última atualização registrada</p>
        </div>

        <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 shadow-soft space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor de Aquisição</p>
          <p className="font-black text-3xl sm:text-4xl text-foreground tabular-nums">{formatCurrency(veiculo.valorVeiculo)}</p>
          <p className="text-[11px] font-bold text-muted-foreground">
            Data: {veiculo.dataCompra ? format(parseDateLocal(veiculo.dataCompra), "dd/MM/yyyy") : "Não informada"}
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 shadow-soft space-y-2 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Variação de Mercado</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "font-black text-2xl tabular-nums flex items-center gap-1",
                variation.isUp ? "text-success" : "text-destructive"
              )}>
                {variation.isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {variation.isUp ? "+" : ""}{variation.percent.toFixed(1)}%
              </span>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                ({formatCurrency(variation.diff)})
              </span>
            </div>
          </div>

          <Button 
            size="sm" 
            className="w-full rounded-xl font-black uppercase text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-4"
            onClick={() => setShowFipeForm(!showFipeForm)}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar Valor FIPE
          </Button>
        </div>
      </div>

      {/* PAINEL DE ATUALIZAÇÃO INLINE (ZERO MODAIS) */}
      {showFipeForm && (
        <div className="p-6 sm:p-8 bg-card border border-primary/30 rounded-[2.5rem] shadow-soft space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-foreground">Atualizar Cotação FIPE</h3>
              <p className="text-xs text-muted-foreground">Insira o novo valor avaliado pela Tabela FIPE para registrar o ponto no gráfico.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Novo Valor FIPE (R$)</Label>
              <Input 
                type="number" 
                step="100" 
                value={newFipeValue} 
                onChange={e => setNewFipeValue(Number(e.target.value))} 
                className="h-11 rounded-2xl font-bold tabular-nums" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data da Cotação</Label>
              <Input 
                type="date" 
                value={newFipeDate} 
                onChange={e => setNewFipeDate(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setShowFipeForm(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl font-black uppercase tracking-wider px-8 bg-success hover:bg-success/90 text-white" onClick={handleSaveFipe}>
              Salvar Nova Avaliação
            </Button>
          </div>
        </div>
      )}

      {/* GRÁFICO DE EVOLUÇÃO FIPE */}
      <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 sm:p-8 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <LineChartIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-foreground">Evolução do Valor de Mercado</h3>
              <p className="text-xs text-muted-foreground">Histórico de pontos FIPE registrados ao longo do tempo.</p>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fipeChartData}>
              <defs>
                <linearGradient id="colorFipe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="dateFormatted" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#888888" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} 
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(Number(value)), "Valor FIPE"]}
                contentStyle={{ 
                  borderRadius: '16px', 
                  backgroundColor: '#1e293b', 
                  borderColor: '#334155', 
                  color: '#f8fafc', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                }}
                itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="valor" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorFipe)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
