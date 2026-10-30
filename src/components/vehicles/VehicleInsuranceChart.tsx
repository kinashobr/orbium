"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ChevronDown, ChevronUp, CheckCircle2, CreditCard, Plus, Calendar, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface VehicleInsuranceChartProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleInsuranceChart({ veiculo, seguro, onUpdateVeiculo }: VehicleInsuranceChartProps) {
  const { addSeguroVeiculo, markSeguroParcelPaid, unmarkSeguroParcelPaid } = useFinance();

  const [showAccordion, setShowAccordion] = useState(false);
  const [seguradoraInput, setSeguradoraInput] = useState("");
  const [apoliceInput, setApoliceInput] = useState("");
  const [valorInput, setValorInput] = useState(0);
  const [parcelasInput, setParcelasInput] = useState(1);
  const [inicioInput, setInicioInput] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fimInput, setFimInput] = useState(format(new Date(Date.now() + 365*24*60*60*1000), "yyyy-MM-dd"));

  // Dados para o Gráfico Evolutivo de Parcelas
  const chartData = useMemo(() => {
    if (!seguro?.parcelas || seguro.parcelas.length === 0) return [];

    return seguro.parcelas.map(p => {
      const isPaid = p.paga;
      const isOverdue = !isPaid && p.vencimento && parseDateLocal(p.vencimento) < new Date();

      return {
        numero: `P${p.numero}`,
        parcelaNum: p.numero,
        valor: p.valor || 0,
        vencimento: p.vencimento ? format(parseDateLocal(p.vencimento), "dd/MM/yy") : "S/D",
        status: isPaid ? "Quitada" : isOverdue ? "Atrasada" : "Pendente",
        isPaid,
        isOverdue,
        color: isPaid ? "#16A34A" : isOverdue ? "#DC2626" : "#F59E0B",
      };
    });
  }, [seguro]);

  // Estatísticas do Seguro
  const stats = useMemo(() => {
    if (!seguro?.parcelas) return { totalPaid: 0, totalPending: 0, paidCount: 0, totalCount: 0 };
    const paidCount = seguro.parcelas.filter(p => p.paga).length;
    const totalCount = seguro.parcelas.length;
    const totalPaid = seguro.parcelas.filter(p => p.paga).reduce((acc, p) => acc + (p.valor || 0), 0);
    const totalPending = (seguro.valorTotal || 0) - totalPaid;

    return { totalPaid, totalPending, paidCount, totalCount };
  }, [seguro]);

  const handleSaveSeguro = () => {
    if (!seguradoraInput.trim() || valorInput <= 0) {
      toast.error("Informe a seguradora e o valor total.");
      return;
    }

    const nParc = parcelasInput || 1;
    const valParc = valorInput / nParc;
    const parcelas = [];
    const baseDate = parseDateLocal(inicioInput);

    for (let i = 1; i <= nParc; i++) {
      const venc = new Date(baseDate);
      venc.setMonth(venc.getMonth() + (i - 1));
      parcelas.push({
        numero: i,
        vencimento: format(venc, "yyyy-MM-dd"),
        valor: parseFloat(valParc.toFixed(2)),
        paga: false,
      });
    }

    addSeguroVeiculo({
      veiculoId: veiculo.id,
      numeroApolice: apoliceInput,
      seguradora: seguradoraInput,
      vigenciaInicio: inicioInput,
      vigenciaFim: fimInput,
      valorTotal: valorInput,
      numeroParcelas: nParc,
      parcelas,
    });

    onUpdateVeiculo(veiculo.id, { valorSeguro: valorInput, vencimentoSeguro: fimInput });
    toast.success("Apólice de seguro salva com sucesso!");
    setShowAccordion(false);
  };

  // Custom Tooltip do Gráfico de Seguro
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-slate-900/95 text-white border border-white/10 rounded-2xl shadow-xl backdrop-blur-md text-xs space-y-1">
          <p className="font-black text-xs text-primary flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> Parcela #{data.parcelaNum}
          </p>
          <div className="flex justify-between gap-4 font-bold">
            <span className="text-slate-400">Valor:</span>
            <span className="text-white tabular-nums">{formatCurrency(data.valor)}</span>
          </div>
          <div className="flex justify-between gap-4 font-bold">
            <span className="text-slate-400">Vencimento:</span>
            <span className="text-white">{data.vencimento}</span>
          </div>
          <div className="flex justify-between gap-4 font-bold pt-1 border-t border-white/10">
            <span className="text-slate-400">Status:</span>
            <span className={cn(
              data.isPaid ? "text-emerald-400 font-black" : data.isOverdue ? "text-rose-400 font-black" : "text-amber-400 font-black"
            )}>
              {data.status}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 italic pt-1">Clique na barra para alterar o status</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-6 relative overflow-hidden">
      {/* ÍCONE DE FUNDO WATERMARK */}
      <Shield className="absolute -right-6 -bottom-6 w-56 h-56 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 pointer-events-none" />

      {/* HEADER DO CARD DE SEGURO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-foreground tracking-tight">
              Evolução & Parcelamento do Seguro
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Passe o mouse ou toque nas barras do gráfico para consultar os valores e vencimentos por parcela.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {seguro && (
            <Badge variant="outline" className="font-mono text-xs font-black px-3 py-1 rounded-xl">
              Apólice: {seguro.numeroApolice || "S/N"}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl font-bold text-xs gap-1"
            onClick={() => setShowAccordion(!showAccordion)}
          >
            {showAccordion ? "Fechar Form" : "Nova Apólice"}
            {showAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* FORMULÁRIO SANFONA EXPANSÍVEL (ZERO MODAIS) */}
      {showAccordion && (
        <div className="p-6 rounded-3xl bg-muted/30 border border-primary/20 space-y-4 animate-in slide-in-from-top-3 duration-300 relative z-10">
          <h4 className="font-black text-xs uppercase tracking-wider text-primary">Cadastrar Apólice de Seguro</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seguradora</Label>
              <Input placeholder="Ex: Porto Seguro / Azul" value={seguradoraInput} onChange={e => setSeguradoraInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nº Apólice</Label>
              <Input placeholder="Ex: 01.031.942/0" value={apoliceInput} onChange={e => setApoliceInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor Total Prêmio (R$)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={valorInput || ''} onChange={e => setValorInput(Number(e.target.value))} className="h-10 rounded-xl font-bold tabular-nums" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantidade Parcelas</Label>
              <Input type="number" value={parcelasInput} onChange={e => setParcelasInput(Number(e.target.value))} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vigência Início</Label>
              <Input type="date" value={inicioInput} onChange={e => setInicioInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vigência Fim</Label>
              <Input type="date" value={fimInput} onChange={e => setFimInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" className="rounded-xl font-black uppercase text-xs px-6 bg-primary text-primary-foreground" onClick={handleSaveSeguro}>
              Salvar Apólice
            </Button>
          </div>
        </div>
      )}

      {/* DADOS E GRÁFICO DO SEGURO */}
      {seguro ? (
        <div className="space-y-6 relative z-10">
          {/* MINI KPI STRIP DO SEGURO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Seguradora</span>
              <span className="font-black text-sm text-foreground truncate block mt-0.5">{seguro.seguradora}</span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Prêmio Anual</span>
              <span className="font-black text-sm text-foreground tabular-nums block mt-0.5">{formatCurrency(seguro.valorTotal)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Quitado</span>
              <span className="font-black text-sm text-success tabular-nums block mt-0.5">{formatCurrency(stats.totalPaid)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Progresso</span>
              <span className="font-black text-sm text-foreground tabular-nums block mt-0.5">{stats.paidCount}/{stats.totalCount} Parcelas</span>
            </div>
          </div>

          {/* GRÁFICO INTERATIVO DE BARRAS RECHARTS DE PARCELAS */}
          {chartData.length > 0 && (
            <div className="p-4 rounded-3xl bg-card border border-border/50 space-y-2">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Gráfico do Parcelamento (Passe o mouse na barra)
                </span>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-success"><span className="w-2 h-2 rounded-full bg-success" /> Quitada</span>
                  <span className="flex items-center gap-1 text-warning"><span className="w-2 h-2 rounded-full bg-warning" /> Pendente</span>
                </div>
              </div>

              <div className="h-[180px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="numero" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="valor" 
                      radius={[8, 8, 0, 0]} 
                      onClick={(entry) => {
                        if (!seguro) return;
                        if (entry.isPaid) {
                          unmarkSeguroParcelPaid(seguro.veiculoId, entry.parcelaNum);
                          toast.info(`Parcela ${entry.parcelaNum} desmarcada.`);
                        } else {
                          markSeguroParcelPaid(seguro.veiculoId, entry.parcelaNum);
                          toast.success(`Parcela ${entry.parcelaNum} marcada como PAGA!`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* LISTA COMPACTA DE PARCELAS PARA CLIQUE RÁPIDO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {seguro.parcelas.map(p => (
              <div 
                key={p.numero}
                onClick={() => {
                  if (p.paga) unmarkSeguroParcelPaid(seguro.veiculoId, p.numero);
                  else markSeguroParcelPaid(seguro.veiculoId, p.numero);
                }}
                className={cn(
                  "p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.02]",
                  p.paga ? "bg-success/10 border-success/30 text-success" : "bg-card border-border/60 hover:border-primary/40 text-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs">P#{p.numero}</span>
                  {p.paga && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                </div>
                <span className="font-black text-xs tabular-nums mt-1">{formatCurrency(p.valor)}</span>
                <span className="text-[9px] font-medium text-muted-foreground mt-0.5 block">
                  {p.vencimento ? format(parseDateLocal(p.vencimento), "dd/MM/yy") : "S/D"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border/60 text-center text-xs text-muted-foreground font-medium relative z-10">
          Nenhuma apólice de seguro cadastrada. Clique no botão acima para registrar o parcelamento.
        </div>
      )}
    </div>
  );
}
