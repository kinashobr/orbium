"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  BarChart3, 
  Calendar,
  Percent,
  Clock,
  TrendingDown,
  Calculator,
  StickyNote,
  Edit,
  Award,
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  Zap,
  LayoutGrid
} from "lucide-react";
import { Emprestimo } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { LoanConfigForm } from "./LoanConfigForm";
import { InstallmentsTable } from "./InstallmentsTable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";
import { useChartColors } from "@/hooks/useChartColors";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LoanDetailDialogProps {
  emprestimo: Emprestimo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoanDetailDialog({ emprestimo, open, onOpenChange }: LoanDetailDialogProps) {
  const { 
    updateEmprestimo, 
    getContasCorrentesTipo, 
    calculateLoanSchedule, 
    calculatePaidInstallmentsUpToDate,
    dateRanges,
  } = useFinance();
  const [isEditing, setIsEditing] = useState(false);
  const contasCorrentes = getContasCorrentesTipo();
  const colors = useChartColors(); 
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const targetDate = dateRanges.range1.to;

  const evolucaoData = useMemo(() => {
    if (!emprestimo) return [];
    const schedule = calculateLoanSchedule(emprestimo.id);
    const initialPoint = { parcela: 0, saldo: emprestimo.valorTotal, juros: 0, amortizacao: 0 };
    const chartData = schedule.map(item => ({ parcela: item.parcela, saldo: item.saldoDevedor, juros: item.juros, amortizacao: item.amortizacao }));
    return [initialPoint, ...chartData];
  }, [emprestimo, calculateLoanSchedule]);

  const calculos = useMemo(() => {
    if (!emprestimo) return null;
    const parcelasPagas = calculatePaidInstallmentsUpToDate(emprestimo.id, targetDate || new Date());
    const schedule = calculateLoanSchedule(emprestimo.id);
    const parcelasRestantes = emprestimo.meses - parcelasPagas;
    const ultimaParcelaPaga = schedule.find(item => item.parcela === parcelasPagas);
    const saldoDevedor = ultimaParcelaPaga ? ultimaParcelaPaga.saldoDevedor : emprestimo.valorTotal;
    const jurosPagos = schedule.filter(item => item.parcela <= parcelasPagas).reduce((acc, item) => acc + item.juros, 0);
    const jurosRestantes = schedule.filter(item => item.parcela > parcelasPagas).reduce((acc, item) => acc + item.juros, 0);
    const custoTotal = emprestimo.parcela * emprestimo.meses;
    const amortizacaoAcumulada = schedule.filter(item => item.parcela <= parcelasPagas).reduce((acc, item) => acc + item.amortizacao, 0);
    const progressoFinanceiro = emprestimo.valorTotal > 0 ? (amortizacaoAcumulada / emprestimo.valorTotal) * 100 : 0;
    const percentualQuitado = emprestimo.meses > 0 ? (parcelasPagas / emprestimo.meses) * 100 : 0;
    const dataInicioStr = emprestimo.dataInicio || new Date().toISOString().split('T')[0];
    const dataFinal = getDueDate(dataInicioStr, emprestimo.meses);
    return { parcelasPagas, parcelasRestantes, saldoDevedor, custoTotal, jurosPagos, jurosRestantes, percentualQuitado, progressoFinanceiro, dataFinal, economiaQuitacao: jurosRestantes };
  }, [emprestimo, calculateLoanSchedule, calculatePaidInstallmentsUpToDate, targetDate]);
  
  if (!emprestimo || !calculos) return null;

  const isPending = emprestimo.status === 'pendente_config';
  const isQuitado = calculos.saldoDevedor <= 0;
  const showConfigForm = isPending || isEditing;

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent
        storageKey="loan_detail_modal_v3"
        initialWidth={900} initialHeight={750} minWidth={800} minHeight={600} hideCloseButton={true}
        className={cn(
          "bg-card border-none shadow-2xl p-0 overflow-hidden flex flex-col",
          isMobile && "fixed inset-0 max-w-full h-full rounded-none"
        )}
      >
        <DialogHeader className="p-6 sm:p-8 shrink-0 bg-muted/20 border-b relative">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute left-4 top-4 rounded-full h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className={cn("flex items-center justify-between", isMobile && "pl-12")}>
            <div className="flex items-center gap-4">
              <div className="p-3 sm:p-4 rounded-[1.25rem] bg-primary/10 text-primary shadow-inner"><Building2 className="w-6 h-6 sm:w-8 sm:h-8" /></div>
              <div className="space-y-1">
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">{emprestimo.contrato}</DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border-none", isQuitado ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                    {isQuitado ? "QUITADO" : "CONTRATO ATIVO"}
                  </Badge>
                </div>
              </div>
            </div>
            {!isPending && !isEditing && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="rounded-full bg-primary/10 text-primary hover:bg-primary/20"><Edit className="w-5 h-5" /></Button>
            )}
            {!isMobile && (
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full"><X className="w-5 h-5" /></Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {showConfigForm ? (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <LoanConfigForm
                emprestimo={emprestimo} contasCorrentes={contasCorrentes}
                onSave={(data) => { updateEmprestimo(emprestimo.id, data); setIsEditing(false); }}
                onCancel={() => isPending ? onOpenChange(false) : setIsEditing(false)}
              />
            </div>
          ) : (
            <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-muted/30 h-14 border-b rounded-none px-6 sm:px-8 gap-8 overflow-x-auto no-scrollbar justify-start">
                <TabsTrigger value="geral" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest gap-2">
                  <LayoutGrid className="w-4 h-4" /> Geral
                </TabsTrigger>
                <TabsTrigger value="parcelas" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest gap-2">
                  <Clock className="w-4 h-4" /> Parcelas
                </TabsTrigger>
                <TabsTrigger value="analise" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest gap-2">
                  <BarChart3 className="w-4 h-4" /> Análise
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="p-6 sm:p-8 space-y-8 pb-12">
                  <TabsContent value="geral" className="mt-0 space-y-8 focus-visible:outline-none">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { l: 'Saldo Devedor', v: formatCurrency(calculos.saldoDevedor), c: isQuitado ? 'text-success' : 'text-destructive', i: TrendingDown },
                        { l: 'Parcela Mensal', v: formatCurrency(emprestimo.parcela), c: 'text-warning', i: Calendar },
                        { l: 'Progresso', v: `${calculos.percentualQuitado.toFixed(0)}%`, c: 'text-primary', i: Award },
                        { l: 'Venc. Final', v: calculos.dataFinal.toLocaleDateString('pt-BR'), c: 'text-foreground', i: Target }
                      ].map((item, idx) => (
                        <div key={idx} className="p-4 sm:p-5 rounded-[1.75rem] bg-muted/20 border border-border/40 shadow-sm">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <item.i className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{item.l}</span>
                          </div>
                          <p className={cn("text-base sm:text-lg font-black tabular-nums", item.c)}>{item.v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-br from-success/10 to-transparent border border-success/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="space-y-2 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <Zap className="w-5 h-5 text-success" />
                          <h4 className="text-sm font-black text-success uppercase tracking-widest">Economia com Quitação</h4>
                        </div>
                        <p className="text-4xl sm:text-5xl font-black text-success tracking-tighter tabular-nums leading-none">{formatCurrency(calculos.economiaQuitacao)}</p>
                        <p className="text-xs font-bold text-success/60 max-w-[280px]">Total de juros futuros que você economiza ao liquidar o saldo devedor hoje.</p>
                      </div>
                      <Button className="rounded-full h-12 sm:h-14 px-8 font-black text-xs gap-2 shadow-xl shadow-success/20 w-full sm:w-auto">SIMULAR QUITAÇÃO <ArrowRight className="w-4 h-4" /></Button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end px-1">
                        <div>
                          <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Status de Amortização</h4>
                          <p className="text-xs text-muted-foreground font-bold">{calculos.parcelasPagas} de {emprestimo.meses} parcelas pagas</p>
                        </div>
                        <span className="text-2xl font-black text-primary">{calculos.progressoFinanceiro.toFixed(1)}%</span>
                      </div>
                      <div className="h-4 bg-muted/50 rounded-full overflow-hidden p-1 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-1000 ease-out" style={{ width: `${calculos.progressoFinanceiro}%` }} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="parcelas" className="mt-0 focus-visible:outline-none">
                    <InstallmentsTable emprestimo={emprestimo} className="border-none shadow-none p-0 bg-transparent" />
                  </TabsContent>

                  <TabsContent value="analise" className="mt-0 space-y-10 focus-visible:outline-none">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Curva de Amortização</h4>
                      <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={evolucaoData}>
                            <defs><linearGradient id="loanGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/><stop offset="95%" stopColor={colors.primary} stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.3} />
                            <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{fill: colors.mutedForeground, fontSize: 10, fontWeight: 'bold'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: colors.mutedForeground, fontSize: 10}} tickFormatter={v => `R$${v/1000}k`} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} formatter={(v: number) => [formatCurrency(v), "Saldo"]} />
                            <Area type="monotone" dataKey="saldo" stroke={colors.primary} strokeWidth={4} fillOpacity={1} fill="url(#loanGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Calculator className="w-4 h-4" /> Composição das Parcelas</h4>
                      <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={evolucaoData.slice(1, 25)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.3} />
                            <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{fill: colors.mutedForeground, fontSize: 10}} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} formatter={(v: number) => [formatCurrency(v)]} />
                            <Legend verticalAlign="top" align="right" iconType="circle" />
                            <Bar dataKey="juros" name="Juros" fill={colors.destructive} stackId="a" radius={[0, 0, 0, 0]} opacity={0.7} />
                            <Bar dataKey="amortizacao" name="Principal" fill={colors.success} stackId="a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </div>
      </ResizableDialogContent>
    </Dialog>
  );
}