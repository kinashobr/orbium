import { useState, useMemo } from "react";
import { Calculator, RefreshCw, Sparkles, ArrowRight, TrendingDown, Target, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Emprestimo } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "@/components/ui/badge";

interface LoanSimulatorProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanSimulator({ emprestimos, className }: LoanSimulatorProps) {
  const { calculateLoanSchedule } = useFinance();
  
  const [aumentoParcela, setAumentoParcela] = useState("");
  const [valorQuitacao, setValorQuitacao] = useState("");
  const [novaTaxa, setNovaTaxa] = useState("");

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

  const taxaMedia = useMemo(() => {
    if (emprestimos.length === 0) return 0;
    const totalPrincipal = emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
    if (totalPrincipal === 0) return 0;
    const taxaPonderada = emprestimos.reduce((acc, e) => acc + (e.taxaMensal * e.valorTotal), 0);
    return taxaPonderada / totalPrincipal;
  }, [emprestimos]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const ResultCard = ({ title, value, badge, subtext, labelSub, icon: Icon }: { title: string, value: string, badge?: string, subtext?: string, labelSub?: string, icon?: any }) => (
    <div className="p-8 rounded-[2.5rem] bg-success/5 border border-success/20 space-y-6 relative overflow-hidden animate-in zoom-in duration-500 shadow-sm">
        <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
            {Icon ? <Icon className="w-32 h-32 text-success" /> : <Sparkles className="w-32 h-32 text-success" />}
        </div>
        
        <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">{title}</span>
            {badge && <Badge className="bg-success/20 text-success border-none font-black text-[10px] px-3 py-1 rounded-lg">{badge}</Badge>}
        </div>
        
        <div className="relative z-10">
           <p className="text-5xl font-black text-success tracking-tighter tabular-nums leading-none mb-1">{value}</p>
           <p className="text-[10px] font-bold text-success/50 uppercase tracking-widest">Economia Financeira Total</p>
        </div>

        <div className="pt-6 border-t border-success/10 flex justify-between items-end relative z-10">
            <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{labelSub}</p>
                <p className="text-base font-black text-foreground uppercase">{subtext}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
               <ArrowRight className="w-5 h-5" />
            </div>
        </div>
    </div>
  );

  const simulacaoAumento = useMemo(() => {
    const aumento = Number(aumentoParcela) || 0;
    if (aumento <= 0 || totalSaldoDevedor <= 0) return null;
    const novaParcela = parcelaTotal + aumento;
    const i = taxaMedia / 100;
    let mesesRestantes = 0, novosMesesRestantes = 0;
    if (i > 0 && parcelaTotal > 0 && novaParcela > 0) {
        const term1 = (totalSaldoDevedor * i) / parcelaTotal;
        mesesRestantes = term1 < 1 ? -Math.log(1 - term1) / Math.log(1 + i) : 999;
        const term2 = (totalSaldoDevedor * i) / novaParcela;
        novosMesesRestantes = term2 < 1 ? -Math.log(1 - term2) / Math.log(1 + i) : 999;
    } else if (i === 0) {
        mesesRestantes = totalSaldoDevedor / parcelaTotal;
        novosMesesRestantes = totalSaldoDevedor / novaParcela;
    }
    return { novaParcela, mesesEconomizados: Math.max(0, mesesRestantes - novosMesesRestantes), jurosEconomizados: Math.max(0, (parcelaTotal * mesesRestantes) - (novaParcela * novosMesesRestantes)) };
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

  return (
    <div className={cn("space-y-10", className)}>
      <div className="flex items-center gap-4 px-1">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
           <h3 className="font-display font-bold text-2xl text-foreground">Laboratório de Crédito</h3>
           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Simulações de Amortização</p>
        </div>
      </div>

      <Tabs defaultValue="aumentar" className="space-y-10">
        <TabsList className="bg-muted/30 w-full grid grid-cols-3 p-1.5 rounded-[2rem] h-16 border border-border/40">
          <TabsTrigger value="aumentar" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">Aporte</TabsTrigger>
          <TabsTrigger value="quitar" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">Quitar</TabsTrigger>
          <TabsTrigger value="refinanciar" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all">Troca</TabsTrigger>
        </TabsList>

        <TabsContent value="aumentar" className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-3 px-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <TrendingUp className="w-3 h-3" /> Aporte Extra Mensal
            </Label>
            <div className="relative group">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">R$</span>
               <Input 
                type="number" 
                placeholder="0" 
                value={aumentoParcela} 
                onChange={(e) => setAumentoParcela(e.target.value)} 
                className="h-16 pl-14 pr-6 border-2 border-border/40 rounded-[1.75rem] bg-card font-black text-2xl focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
               />
            </div>
          </div>
          {simulacaoAumento && (
            <ResultCard 
                title="Redução Projetada" 
                value={`R$ ${simulacaoAumento.jurosEconomizados.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} 
                badge={`-${simulacaoAumento.mesesEconomizados.toFixed(0)} MESES`}
                labelSub="Nova Parcela"
                subtext={formatCurrency(simulacaoAumento.novaParcela)}
                icon={TrendingDown}
            />
          )}
        </TabsContent>

        <TabsContent value="quitar" className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-3 px-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Target className="w-3 h-3" /> Valor para Amortização
            </Label>
            <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">R$</span>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={valorQuitacao} 
                  onChange={(e) => setValorQuitacao(e.target.value)} 
                  className="h-16 pl-14 pr-6 border-2 border-border/40 rounded-[1.75rem] bg-card font-black text-2xl focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                />
            </div>
          </div>
          {simulacaoQuitacao && (
            <ResultCard 
                title="Corte de Juros" 
                value={`R$ ${simulacaoQuitacao.jurosEconomizados.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} 
                badge={`${simulacaoQuitacao.percentualQuitacao.toFixed(0)}% DA DÍVIDA`}
                labelSub="Saldo Restante"
                subtext={formatCurrency(simulacaoQuitacao.saldoRestante)}
                icon={Zap}
            />
          )}
        </TabsContent>

        <TabsContent value="refinanciar" className="space-y-8 animate-in fade-in duration-500">
          <div className="p-10 rounded-[2.5rem] bg-muted/20 border-2 border-dashed border-border/60 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                <RefreshCw className="w-8 h-8" />
             </div>
             <p className="font-bold text-foreground">Funcionalidade em Desenvolvimento</p>
             <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">Em breve você poderá simular a portabilidade da sua dívida para taxas menores.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}