"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Edit,
  Award,
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  Zap,
  LayoutGrid,
  Sparkles,
  Info
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    const amortizacaoAcumulada = schedule.filter(item => item.parcela <= parcelasPagas).reduce((acc, item) => acc + item.amortizacao, 0);
    const progressoFinanceiro = emprestimo.valorTotal > 0 ? (amortizacaoAcumulada / emprestimo.valorTotal) * 100 : 0;
    const percentualQuitado = emprestimo.meses > 0 ? (parcelasPagas / emprestimo.meses) * 100 : 0;
    const dataFinal = getDueDate(emprestimo.dataInicio || new Date().toISOString(), emprestimo.meses);
    return { parcelasPagas, parcelasRestantes, saldoDevedor, jurosPagos, jurosRestantes, percentualQuitado, progressoFinanceiro, dataFinal, economiaQuitacao: jurosRestantes };
  }, [emprestimo, calculateLoanSchedule, calculatePaidInstallmentsUpToDate, targetDate]);
  
  if (!emprestimo || !calculos) return null;

  const isPending = emprestimo.status === 'pendente_config';
  const isQuitado = calculos.saldoDevedor <= 0;
  const showConfigForm = isPending || isEditing;

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const renderContent = () => (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showConfigForm ? (
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          <div className="max-w-2xl mx-auto">
            <LoanConfigForm
              emprestimo={emprestimo} contasCorrentes={contasCorrentes}
              onSave={(data) => { updateEmprestimo(emprestimo.id, data); setIsEditing(false); }}
              onCancel={() => isPending ? onOpenChange(false) : setIsEditing(false)}
            />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-muted/30 h-14 border-b rounded-none px-6 sm:px-10 gap-8 justify-start shrink-0 overflow-x-auto no-scrollbar">
            <TabsTrigger value="geral" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest gap-2">
              <LayoutGrid className="w-4 h-4" /> GERAL
            </TabsTrigger>
            <TabsTrigger value="parcelas" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest gap-2">
              <Clock className="w-4 h-4" /> CRONOGRAMA
            </TabsTrigger>
            <TabsTrigger value="analise" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest gap-2">
              <BarChart3 className="w-4 h-4" /> EVOLUÇÃO
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-6 sm:p-10 space-y-10 pb-16">
              <TabsContent value="geral" className="mt-0 space-y-10 focus-visible:outline-none">
                {/* Cards de Resumo Principal */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Dívida Atual', value: formatCurrency(calculos.saldoDevedor), color: isQuitado ? 'text-success' : 'text-destructive', icon: TrendingDown },
                    { label: 'Parcela Mensal', value: formatCurrency(emprestimo.parcela), color: 'text-foreground', icon: Calendar },
                    { label: 'Quitado', value: `${calculos.percentualQuitado.toFixed(0)}%`, color: 'text-primary', icon: Award },
                    { label: 'Término em', value: format(calculos.dataFinal, 'MMM/yy', { locale: ptBR }).toUpperCase(), color: 'text-foreground', icon: Target }
                  ].map((item, idx) => (
                    <div key={idx} className="p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-white/60 dark:border-white/5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <item.icon className="w-3.5 h-3.5 opacity-60" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <p className={cn("text-lg font-black tabular-nums", item.color)}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Banner de Quitação */}
                <div className="p-8 sm:p-10 rounded-[3rem] bg-success/[0.03] border-4 border-success/10 flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 opacity-5 scale-150 translate-x-10 -translate-y-10 group-hover:rotate-6 transition-transform duration-1000">
                    <Zap className="w-[200px] h-[200px] text-success" />
                  </div>
                  <div className="relative z-10 space-y-3 text-center sm:text-left">
                    <div className="flex items-center gap-3 justify-center sm:justify-start">
                      <div className="p-2 bg-success/20 rounded-xl text-success shadow-sm">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black text-success uppercase tracking-[0.2em]">Oportunidade de Amortização</h4>
                    </div>
                    <p className="text-4xl sm:text-5xl font-black text-success tracking-tighter tabular-nums leading-none">
                      {formatCurrency(calculos.economiaQuitacao)}
                    </p>
                    <p className="text-xs font-bold text-success/60 max-w-sm">Economia estimada em juros se o saldo devedor for liquidado no período atual.</p>
                  </div>
                  <Button className="rounded-full h-14 sm:h-16 px-8 sm:px-12 font-black text-xs sm:text-sm gap-3 shadow-2xl shadow-success/20 w-full sm:w-auto hover:scale-105 active:scale-95 transition-all">
                    SIMULAR QUITAÇÃO <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Barra de Progresso Financeiro */}
                <div className="space-y-5 px-2">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Evolução do Principal</h4>
                      <p className="text-sm font-bold">{calculos.parcelasPagas} de {emprestimo.meses} parcelas pagas</p>
                    </div>
                    <span className="text-3xl font-black text-primary tracking-tighter">{calculos.progressoFinanceiro.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 bg-muted/40 rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-border/40">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-1000 ease-out shadow-sm" 
                      style={{ width: `${calculos.progressoFinanceiro}%` }} 
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parcelas" className="mt-0 focus-visible:outline-none">
                <div className="px-1">
                   <InstallmentsTable emprestimo={emprestimo} className="bg-transparent border-none p-0 shadow-none" />
                </div>
              </TabsContent>

              <TabsContent value="analise" className="mt-0 space-y-12 focus-visible:outline-none">
                <div className="space-y-8">
                  <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary"><TrendingDown className="w-5 h-5" /></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Curva de Desalavancagem</h4>
                  </div>
                  <div className="h-[300px] w-full bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 border border-white/40 dark:border-white/5 shadow-soft">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolucaoData}>
                        <defs>
                          <linearGradient id="loanGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.3} />
                        <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{fill: colors.mutedForeground, fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: colors.mutedForeground, fontSize: 10}} tickFormatter={v => `R$ ${v/1000}k`} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} formatter={(v: number) => [formatCurrency(v), "Saldo"]} />
                        <Area type="monotone" dataKey="saldo" stroke={colors.primary} strokeWidth={4} fillOpacity={1} fill="url(#loanGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-success/10 rounded-xl text-success"><Calculator className="w-5 h-5" /></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Proporção Capital vs Juros</h4>
                  </div>
                  <div className="h-[300px] w-full bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 border border-white/40 dark:border-white/5 shadow-soft">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evolucaoData.slice(1, 25)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.3} />
                        <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{fill: colors.mutedForeground, fontSize: 10}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} formatter={(v: number) => [formatCurrency(v)]} />
                        <Legend verticalAlign="top" align="right" iconType="circle" />
                        <Bar dataKey="juros" name="Juros" fill={colors.destructive} stackId="a" opacity={0.7} />
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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isMobile ? (
        <DialogContent hideCloseButton fullscreen className="p-0 flex flex-col bg-background z-[150]">
          <header className="px-6 pt-6 pb-4 border-b shrink-0 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-10 w-10">
                  <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h2 className="text-xl font-black tracking-tight truncate max-w-[200px]">{emprestimo.contrato}</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Detalhes do Contrato</p>
                </div>
              </div>
              {!isPending && !isEditing && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="rounded-full bg-primary/10 text-primary h-10 w-10">
                  <Edit className="w-5 h-5" />
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {renderContent()}
          </main>
          {/* Footer removido no mobile - ArrowLeft no header já fecha */}
        </DialogContent>
      ) : (
        <ResizableDialogContent
          storageKey="loan_detail_modal_v4"
          initialWidth={1000} initialHeight={850} minWidth={900} minHeight={700} hideCloseButton={true}
          className="bg-background shadow-2xl p-0 overflow-hidden flex flex-col rounded-[2rem]"
        >
          <div className="modal-viewport">
            <DialogHeader className="p-8 sm:p-10 shrink-0 bg-surface-light dark:bg-surface-dark border-b relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black tracking-tighter leading-tight">{emprestimo.contrato}</DialogTitle>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge className={cn("text-[10px] font-black uppercase px-3 py-1 rounded-lg border-none", isQuitado ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                        {isQuitado ? "CONTRATO QUITADO" : "CONTRATO EM ANDAMENTO"}
                      </Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent" /> Inteligência Orbium
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isPending && !isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-full h-11 px-6 font-bold gap-2 border-border/40 hover:bg-primary/10 hover:text-primary transition-all">
                      <Edit className="w-4 h-4" /> Editar Termos
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
              {renderContent()}
            </div>

            {!showConfigForm && (
              <DialogFooter className="p-6 bg-muted/10 border-t shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  FECHAR
                </Button>
              </DialogFooter>
            )}
          </div>
        </ResizableDialogContent>
      )}
    </Dialog>
  );
}