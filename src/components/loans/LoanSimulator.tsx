import { useState, useMemo } from "react";
import { Calculator, Sparkles, ArrowRight, TrendingDown, Target, Zap, TrendingUp, ArrowDownRight, Percent, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Emprestimo } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface LoanSimulatorProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanSimulator({ emprestimos, className }: LoanSimulatorProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { calculateLoanSchedule } = useFinance();
  
  const [aumentoParcela, setAumentoParcela] = useState("");
  const [valorQuitacao, setValorQuitacao] = useState("");
  const [novaTaxa, setNovaTaxa] = useState("");
  const [cenarioRefinanciamento, setCenarioRefinanciamento] = useState<'reduzir_parcela' | 'reduzir_prazo'>('reduzir_parcela');

  const totalSaldoDevedor = useMemo(() => {
    return emprestimos.reduce((acc, e) => {
      if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
      const schedule = calculateLoanSchedule(e.id);
      const parcelasPagas = e.parcelasPagas || 0; 
      let saldoDevedor = e.valorTotal;
      if (parcelasPagas > 0) {
          const ultimaParcelaPaga = schedule.find(item => item.parcela === parcelasPagas);
          if (ultimaParcelaPaga) saldoDevedor = ultimaParcelaPaga.saldoDevedor;
      }
      return acc + saldoDevedor;
    }, 0);
  }, [emprestimos, calculateLoanSchedule]);

  const parcelaTotal = useMemo(() => emprestimos.reduce((acc, e) => acc + e.parcela, 0), [emprestimos]);
  
  const mesesRestantes = useMemo(() => {
    if (emprestimos.length === 0) return 0;
    return Math.max(...emprestimos.map(e => {
      const parcelasPagas = e.parcelasPagas || 0;
      return e.meses - parcelasPagas;
    }));
  }, [emprestimos]);

  const taxaMedia = useMemo(() => {
    if (emprestimos.length === 0) return 0;
    const totalPrincipal = emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
    if (totalPrincipal === 0) return 0;
    const taxaPonderada = emprestimos.reduce((acc, e) => acc + (e.taxaMensal * e.valorTotal), 0);
    return taxaPonderada / totalPrincipal;
  }, [emprestimos]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const ResultCard = ({ title, value, badge, subtext, labelSub, icon: Icon }: { title: string, value: string, badge?: string, subtext?: string, labelSub?: string, icon?: any }) => (
    <div className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] bg-success/5 border border-success/20 space-y-6 relative overflow-hidden animate-in zoom-in duration-500 shadow-sm">
        <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
            {Icon ? <Icon className="w-32 h-32 text-success" /> : <Sparkles className="w-32 h-32 text-success" />}
        </div>
        
        <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">{title}</span>
            {badge && <Badge className="bg-success/20 text-success border-none font-black text-[9px] px-3 py-1 rounded-xl uppercase">{badge}</Badge>}
        </div>
        
        <div className="relative z-10">
           <p className="text-4xl sm:text-5xl font-black text-success tracking-tighter tabular-nums leading-none mb-1">{value}</p>
           <p className="text-[10px] font-bold text-success/50 uppercase tracking-widest">Economia Financeira Total</p>
        </div>

        <div className="pt-6 border-t border-success/10 flex justify-between items-end relative z-10">
            <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{labelSub}</p>
                <p className="text-sm sm:text-lg font-black text-foreground uppercase">{subtext}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
               <ChevronRight className="w-5 h-5" />
            </div>
        </div>
    </div>
  );

  const simulacaoAumento = useMemo(() => {
    const aumento = Number(aumentoParcela) || 0;
    if (aumento <= 0 || totalSaldoDevedor <= 0) return null;
    const novaParcela = parcelaTotal + aumento;
    const i = taxaMedia / 100;
    let mesesRestantesCalc = 0, novosMesesRestantes = 0;
    if (i > 0 && parcelaTotal > 0 && novaParcela > 0) {
        const term1 = (totalSaldoDevedor * i) / parcelaTotal;
        mesesRestantesCalc = term1 < 1 ? -Math.log(1 - term1) / Math.log(1 + i) : 999;
        const term2 = (totalSaldoDevedor * i) / novaParcela;
        novosMesesRestantes = term2 < 1 ? -Math.log(1 - term2) / Math.log(1 + i) : 999;
    } else if (i === 0) {
        mesesRestantesCalc = totalSaldoDevedor / parcelaTotal;
        novosMesesRestantes = totalSaldoDevedor / novaParcela;
    }
    return { novaParcela, mesesEconomizados: Math.max(0, mesesRestantesCalc - novosMesesRestantes), jurosEconomizados: Math.max(0, (parcelaTotal * mesesRestantesCalc) - (novaParcela * novosMesesRestantes)) };
  }, [aumentoParcela, parcelaTotal, totalSaldoDevedor, taxaMedia]);

  const simulacaoQuitacao = useMemo(() => {
    const valor = Number(valorQuitacao) || 0;
    if (valor <= 0 || totalSaldoDevedor <= 0) return null;
    let jurosRestantesTotal = 0;
    emprestimos.forEach(e => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return;
        const schedule = calculateLoanSchedule(e.id);
        const parcelasPagas = e.parcelasPagas || 0;
        jurosRestantesTotal += schedule.filter(item => item.parcela > parcelasPagas).reduce((acc, item) => acc + item.juros, 0);
    });
    return { percentualQuitacao: Math.min(100, (valor / totalSaldoDevedor) * 100), saldoRestante: Math.max(0, totalSaldoDevedor - valor), jurosEconomizados: Math.max(0, jurosRestantesTotal * (valor / totalSaldoDevedor)) };
  }, [valorQuitacao, totalSaldoDevedor, calculateLoanSchedule, emprestimos]);

  const simulacaoRefinanciamento = useMemo(() => {
    const novaTaxaNum = Number(novaTaxa) || 0;
    if (novaTaxaNum <= 0 || totalSaldoDevedor <= 0 || novaTaxaNum >= taxaMedia) return null;
    const i = novaTaxaNum / 100;
    const iAtual = taxaMedia / 100;
    const calcularParcela = (p: number, t: number, m: number) => t === 0 ? p / m : p * (t * Math.pow(1 + t, m)) / (Math.pow(1 + t, m) - 1);
    const novaParcelaReduzida = calcularParcela(totalSaldoDevedor, i, mesesRestantes);
    let novosMeses = 0;
    if (i > 0 && parcelaTotal > 0) {
      const term = (totalSaldoDevedor * i) / parcelaTotal;
      if (term < 1) novosMeses = -Math.log(1 - term) / Math.log(1 + i);
    } else if (i === 0) novosMeses = totalSaldoDevedor / parcelaTotal;
    const mesesEconomizados = Math.max(0, mesesRestantes - Math.ceil(novosMeses));
    const calcularJurosTotais = (p: number, t: number, m: number) => (calcularParcela(p, t, m) * m) - p;
    const jurosAtual = calcularJurosTotais(totalSaldoDevedor, iAtual, mesesRestantes);
    return { taxaAtual: taxaMedia, taxaNova: novaTaxaNum, reducaoTaxa: ((taxaMedia - novaTaxaNum) / taxaMedia) * 100, novaParcelaReduzida, economiaParcelaMensal: parcelaTotal - novaParcelaReduzida, economiaJurosCenario1: Math.max(0, jurosAtual - calcularJurosTotais(totalSaldoDevedor, i, mesesRestantes)), mesesEconomizados, novosMeses: Math.ceil(novosMeses), economiaJurosCenario2: Math.max(0, jurosAtual - calcularJurosTotais(totalSaldoDevedor, i, Math.ceil(novosMeses))) };
  }, [novaTaxa, totalSaldoDevedor, taxaMedia, parcelaTotal, mesesRestantes]);

  return (
    <div className={cn("space-y-8 sm:space-y-12", className)}>
      <div className="flex items-center gap-4 px-1">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0">
          <Calculator className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div>
           <h3 className="font-display font-black text-xl sm:text-2xl text-foreground">Simulador</h3>
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Inteligência de Amortização</p>
        </div>
      </div>

      <Tabs defaultValue="aumentar" className="space-y-8 sm:space-y-10">
        <div className="flex justify-center">
          <TabsList className="bg-muted/30 w-full max-w-md grid grid-cols-3 p-1.5 rounded-2xl sm:rounded-[2rem] h-14 sm:h-16 border border-border/40">
            <TabsTrigger value="aumentar" className="rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">Aporte</TabsTrigger>
            <TabsTrigger value="quitar" className="rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">Quitar</TabsTrigger>
            <TabsTrigger value="refinanciar" className="rounded-xl sm:rounded-[1.5rem] text-[9px] sm:text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">Portab.</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="aumentar" className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-3 px-1 text-center sm:text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
               <TrendingUp className="w-3 h-3" /> Aporte Extra Mensal
            </Label>
            <div className="relative group max-w-md mx-auto sm:mx-0">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">R$</span>
               <Input 
                type="number" placeholder="0" value={aumentoParcela} onChange={(e) => setAumentoParcela(e.target.value)} 
                className="h-16 pl-14 pr-6 border-2 border-border/40 rounded-[1.75rem] bg-card font-black text-2xl focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
               />
            </div>
          </div>
          {simulacaoAumento && (
            <ResultCard title="Redução Projetada" value={`R$ ${simulacaoAumento.jurosEconomizados.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} badge={`-${simulacaoAumento.mesesEconomizados.toFixed(0)} MESES`} labelSub="Nova Parcela" subtext={formatCurrency(simulacaoAumento.novaParcela)} icon={TrendingDown} />
          )}
        </TabsContent>

        <TabsContent value="quitar" className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-3 px-1 text-center sm:text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
               <Target className="w-3 h-3" /> Valor para Amortização
            </Label>
            <div className="relative group max-w-md mx-auto sm:mx-0">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">R$</span>
                <Input type="number" placeholder="0" value={valorQuitacao} onChange={(e) => setValorQuitacao(e.target.value)} className="h-16 pl-14 pr-6 border-2 border-border/40 rounded-[1.75rem] bg-card font-black text-2xl focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none" />
            </div>
          </div>
          {simulacaoQuitacao && (
            <ResultCard title="Corte de Juros" value={`R$ ${simulacaoQuitacao.jurosEconomizados.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} badge={`${simulacaoQuitacao.percentualQuitacao.toFixed(0)}% DA DÍVIDA`} labelSub="Saldo Restante" subtext={formatCurrency(simulacaoQuitacao.saldoRestante)} icon={Zap} />
          )}
        </TabsContent>

        <TabsContent value="refinanciar" className="space-y-8 animate-in fade-in duration-500">
          <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/40 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Taxa Atual</p><p className="font-black text-base sm:text-xl text-foreground">{taxaMedia.toFixed(2)}%</p></div>
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Parcela</p><p className="font-black text-base sm:text-xl text-foreground truncate">{formatCurrency(parcelaTotal).split(',')[0]}</p></div>
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Meses</p><p className="font-black text-base sm:text-xl text-foreground">{mesesRestantes}</p></div>
          </div>

          <div className="space-y-3 px-1 text-center sm:text-left">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
               <ArrowDownRight className="w-3 h-3" /> Nova Taxa Mensal (%)
            </Label>
            <div className="relative group max-w-md mx-auto sm:mx-0">
               <Input type="number" step="0.01" placeholder={`Menor que ${taxaMedia.toFixed(2)}`} value={novaTaxa} onChange={(e) => setNovaTaxa(e.target.value)} className="h-16 px-6 border-2 border-border/40 rounded-[1.75rem] bg-card font-black text-2xl focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none" />
               <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">%</span>
            </div>
          </div>

          {simulacaoRefinanciamento && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'reduzir_parcela', l: 'Reduzir Parcela', d: 'Mantém o prazo', i: ArrowDownRight },
                  { id: 'reduzir_prazo', l: 'Reduzir Prazo', d: 'Mantém o valor', i: TrendingUp }
                ].map(opt => (
                  <button key={opt.id} onClick={() => setCenarioRefinanciamento(opt.id as any)} className={cn("p-4 rounded-[2rem] border-2 transition-all text-left group", cenarioRefinanciamento === opt.id ? "border-primary bg-primary/5 shadow-md" : "border-border/40 bg-muted/20")}>
                    <div className="flex items-center gap-2 mb-1">
                      {cenarioRefinanciamento === opt.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Opção</span>
                    </div>
                    <p className="font-black text-sm text-foreground">{opt.l}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5">{opt.d}</p>
                  </button>
                ))}
              </div>
              {cenarioRefinanciamento === 'reduzir_parcela' ? (
                <ResultCard title="Economia Estimada" value={`R$ ${simulacaoRefinanciamento.economiaJurosCenario1.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} badge={`-${simulacaoRefinanciamento.reducaoTaxa.toFixed(0)}% TAXA`} labelSub="Nova Parcela" subtext={formatCurrency(simulacaoRefinanciamento.novaParcelaReduzida)} icon={TrendingDown} />
              ) : (
                <ResultCard title="Economia Estimada" value={`R$ ${simulacaoRefinanciamento.economiaJurosCenario2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} badge={`-${simulacaoRefinanciamento.mesesEconomizados} MESES`} labelSub="Novo Prazo" subtext={`${simulacaoRefinanciamento.novosMeses} meses`} icon={Zap} />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}