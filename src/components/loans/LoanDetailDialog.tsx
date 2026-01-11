import { useMemo, useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  BarChart3, 
  Calendar,
  Percent,
  DollarSign,
  Clock,
  TrendingDown,
  Calculator,
  StickyNote,
  Edit,
  Award,
  ArrowRight,
  X,
  Target, // Adicionado Target
} from "lucide-react";
import { Emprestimo } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { LoanConfigForm } from "./LoanConfigForm";
import { InstallmentsTable } from "./InstallmentsTable";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend, // Adicionado Legend
} from "recharts";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";
import { useChartColors } from "@/hooks/useChartColors";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";

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
  
  const targetDate = dateRanges.range1.to;

  const evolucaoData = useMemo(() => {
    if (!emprestimo) return [];
    const schedule = calculateLoanSchedule(emprestimo.id);
    
    const initialPoint = {
      parcela: 0,
      saldo: emprestimo.valorTotal,
      juros: 0,
      amortizacao: 0,
    };
    
    const chartData = schedule.map(item => ({
      parcela: item.parcela,
      saldo: item.saldoDevedor,
      juros: item.juros,
      amortizacao: item.amortizacao,
    }));
    
    return [initialPoint, ...chartData];
  }, [emprestimo, calculateLoanSchedule]);

  const calculos = useMemo(() => {
    if (!emprestimo) return null;

    const parcelasPagas = calculatePaidInstallmentsUpToDate(emprestimo.id, targetDate || new Date());
    const schedule = calculateLoanSchedule(emprestimo.id);
    const parcelasRestantes = emprestimo.meses - parcelasPagas;
    
    const ultimaParcelaPaga = schedule.find(item => item.parcela === parcelasPagas);
    const saldoDevedor = ultimaParcelaPaga ? ultimaParcelaPaga.saldoDevedor : emprestimo.valorTotal;
    
    const jurosPagos = schedule
      .filter(item => item.parcela <= parcelasPagas)
      .reduce((acc, item) => acc + item.juros, 0);
      
    const jurosRestantes = schedule
      .filter(item => item.parcela > parcelasPagas)
      .reduce((acc, item) => acc + item.juros, 0);
      
    const custoTotal = emprestimo.parcela * emprestimo.meses;
    const jurosTotalContrato = custoTotal - emprestimo.valorTotal;
    
    const amortizacaoAcumulada = schedule
      .filter(item => item.parcela <= parcelasPagas)
      .reduce((acc, item) => acc + item.amortizacao, 0);
      
    const progressoFinanceiro = emprestimo.valorTotal > 0 ? (amortizacaoAcumulada / emprestimo.valorTotal) * 100 : 0;
    const economiaQuitacao = jurosRestantes;
    const percentualQuitado = emprestimo.meses > 0 ? (parcelasPagas / emprestimo.meses) * 100 : 0;
    const cetEfetivo = emprestimo.meses > 0 ? ((custoTotal / emprestimo.valorTotal - 1) / emprestimo.meses) * 12 * 100 : 0;
    
    const dataInicioStr = emprestimo.dataInicio || new Date().toISOString().split('T')[0];
    const dataFinal = getDueDate(dataInicioStr, emprestimo.meses);
    const proximaParcela = parcelasPagas < emprestimo.meses 
        ? getDueDate(dataInicioStr, parcelasPagas + 1)
        : null;

    return {
      parcelasPagas,
      parcelasRestantes,
      saldoDevedor,
      custoTotal,
      jurosTotalContrato,
      jurosPagos,
      jurosRestantes,
      percentualQuitado,
      progressoFinanceiro,
      cetEfetivo,
      dataFinal,
      proximaParcela,
      economiaQuitacao,
    };
  }, [emprestimo, calculateLoanSchedule, calculatePaidInstallmentsUpToDate, targetDate]);
  
  if (!emprestimo || !calculos) return null;

  const isPending = emprestimo.status === 'pendente_config';
  const isQuitado = emprestimo.status === 'quitado' || calculos.saldoDevedor <= 0;
  const showConfigForm = isPending || isEditing;

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleSaveConfig = (data: Partial<Emprestimo>) => {
    updateEmprestimo(emprestimo.id, data);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="loan_detail_modal"
        initialWidth={1100}
        initialHeight={850}
        minWidth={800}
        minHeight={600}
        hideCloseButton={true}
        className="bg-card border-border overflow-hidden flex flex-col p-0"
      >
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {emprestimo.contrato}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {isPending ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 animate-pulse">
                      Aguardando Configuração
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {emprestimo.meses} parcelas
                      </Badge>
                      <Badge variant="outline" className={cn(
                        isQuitado ? "bg-success/10 text-success border-success/30" : "bg-info/10 text-info border-info/30"
                      )}>
                        {isQuitado ? "Quitado" : "Em andamento"}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isPending && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-9">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Contrato
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showConfigForm ? (
          <div className="flex-1 overflow-y-auto p-6">
            <LoanConfigForm
              emprestimo={emprestimo}
              contasCorrentes={contasCorrentes}
              onSave={handleSaveConfig}
              onCancel={() => isPending ? onOpenChange(false) : setIsEditing(false)}
            />
          </div>
        ) : (
          <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 bg-muted/20 border-b overflow-x-auto hide-scrollbar-mobile">
              <TabsList className="h-10 sm:h-12 bg-transparent p-0 gap-2 sm:gap-6 min-w-max">
                <TabsTrigger value="geral" className="h-10 sm:h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-xs sm:text-sm whitespace-nowrap">
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="parcelas" className="h-10 sm:h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-xs sm:text-sm whitespace-nowrap">
                  Cronograma
                </TabsTrigger>
                <TabsTrigger value="graficos" className="h-10 sm:h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-xs sm:text-sm whitespace-nowrap">
                  Análise
                </TabsTrigger>
                <TabsTrigger value="observacoes" className="h-10 sm:h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-xs sm:text-sm whitespace-nowrap">
                  Notas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              <TabsContent value="geral" className="mt-0 space-y-4 sm:space-y-6">
                {/* Grid de Indicadores Principais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border shadow-sm">
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Devedor</p>
                    <p className={cn("text-lg sm:text-2xl font-bold mt-1", isQuitado ? "text-success" : "text-destructive")}>
                      {isQuitado ? "R$ 0,00" : formatCurrency(calculos.saldoDevedor)}
                    </p>
                    <div className="hidden sm:flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <TrendingDown className="w-3 h-3" />
                      <span>Principal restante</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border shadow-sm">
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parcela</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 text-warning">
                      {formatCurrency(emprestimo.parcela)}
                    </p>
                    <div className="hidden sm:flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Vence dia {parseDateLocal(emprestimo.dataInicio || "").getDate()}</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border shadow-sm">
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progresso</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 text-primary">
                      {calculos.percentualQuitado.toFixed(0)}%
                    </p>
                    <div className="hidden sm:flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{calculos.parcelasPagas}/{emprestimo.meses}</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border shadow-sm">
                    <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">CET</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 text-info">
                      {calculos.cetEfetivo.toFixed(1)}%
                    </p>
                    <div className="hidden sm:flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Percent className="w-3 h-3" />
                      <span>Taxa anualizada</span>
                    </div>
                  </div>
                </div>

                {/* Painel de Saúde do Empréstimo */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-5 rounded-2xl bg-muted/30 border border-border/50">
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                        <Award className="w-4 h-4 text-primary" />
                        Status de Amortização
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Principal Amortizado</span>
                            <span className="font-bold text-primary">{calculos.progressoFinanceiro.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000 ease-out"
                              style={{ width: `${calculos.progressoFinanceiro}%` }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 pt-2">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Juros Pagos</p>
                            <p className="text-lg font-semibold text-warning">{formatCurrency(calculos.jurosPagos)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Juros a Pagar</p>
                            <p className="text-lg font-semibold text-destructive">{formatCurrency(calculos.jurosRestantes)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-success/5 border border-success/20 flex flex-col justify-between h-full">
                      <div>
                        <h4 className="text-sm font-bold text-success flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4" />
                          Economia Potencial
                        </h4>
                        <p className="text-3xl font-black text-success">
                          {formatCurrency(calculos.economiaQuitacao)}
                        </p>
                        <p className="text-xs text-success/70 mt-2 leading-relaxed">
                          Este é o valor total de juros que você deixará de pagar se quitar o saldo devedor hoje.
                        </p>
                      </div>
                      <Button variant="outline" className="mt-4 border-success/30 text-success hover:bg-success/10 w-full group">
                        Simular Quitação
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Datas e Prazos */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Início do Contrato</p>
                        <p className="font-semibold">{emprestimo.dataInicio ? parseDateLocal(emprestimo.dataInicio).toLocaleDateString("pt-BR") : "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Próximo Vencimento</p>
                        <p className="font-semibold text-primary">
                          {isQuitado ? "—" : calculos.proximaParcela?.toLocaleDateString("pt-BR") || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Target className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Previsão de Término</p>
                        <p className="font-semibold">
                          {isQuitado ? "Quitado" : calculos.dataFinal.toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="parcelas" className="mt-0">
                <InstallmentsTable emprestimo={emprestimo} className="border-none shadow-none p-0 bg-transparent" />
              </TabsContent>

              <TabsContent value="graficos" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                    <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-primary" />
                      Curva de Redução do Saldo Devedor
                    </h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolucaoData}>
                          <defs>
                            <linearGradient id="colorSaldoDetail" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} opacity={0.5} />
                          <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 11 }} label={{ value: 'Parcelas', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: `1px solid ${colors.border}`, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                            formatter={(value: number) => [formatCurrency(value), "Saldo"]}
                          />
                          <Area type="monotone" dataKey="saldo" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorSaldoDetail)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
                    <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      Composição das Parcelas (Juros vs Amortização)
                    </h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolucaoData.slice(1, 25)}>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} opacity={0.5} />
                          <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: `1px solid ${colors.border}`, borderRadius: "12px" }}
                            formatter={(value: number) => [formatCurrency(value)]}
                          />
                          <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                          <Bar dataKey="juros" name="Juros" fill={colors.destructive} stackId="stack" radius={[0, 0, 0, 0]} opacity={0.8} />
                          <Bar dataKey="amortizacao" name="Amortização" fill={colors.success} stackId="stack" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="observacoes" className="mt-0">
                <div className="p-8 rounded-2xl border-2 border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <StickyNote className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold mb-2">Notas do Contrato</h4>
                  <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                    {emprestimo.observacoes || "Nenhuma observação ou detalhe adicional registrado para este contrato."}
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </ResizableDialogContent>
    </Dialog>
  );
}