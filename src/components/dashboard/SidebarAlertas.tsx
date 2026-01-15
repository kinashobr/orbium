"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Bell, 
  TrendingDown, 
  CreditCard, 
  Target,
  Settings2,
  X,
  PiggyBank,
  ShoppingCart,
  Scale,
  TrendingUp,
  Rocket,
  Sparkles,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { AlertasConfigDialog, AlertaConfig, MetaConfig } from "./AlertasConfigDialog";
import { isAfter, isSameDay, startOfDay } from "date-fns";
import { toast } from "sonner";

interface Alerta {
  id: string;
  tipo: "warning" | "danger" | "info" | "success" | "goal";
  titulo: string;
  descricao: string;
  rota?: string;
  percentual?: number;
}

const ICONS: Record<string, any> = {
  "saldo-negativo": AlertTriangle,
  "dividas-altas": Scale,
  "margem-baixa": Target,
  "comprometimento-renda": CreditCard,
  "reserva-insuficiente": PiggyBank,
  "gasto-categoria": ShoppingCart,
  "meta-receita": TrendingUp,
  "teto-gastos": TrendingDown,
  "meta-investimento": Rocket,
  "target": Target,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "piggy-bank": PiggyBank,
  "wallet": Wallet,
  "sparkles": Sparkles,
};

// Constantes movidas para export abaixo da função

const COR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
};

export const DEFAULT_ALERTS: AlertaConfig[] = [
  { id: "saldo-negativo", nome: "Saldo Negativo", ativo: true, tolerancia: 0, notificarDispositivo: true },
  { id: "dividas-altas", nome: "Dívidas Altas", ativo: true, tolerancia: 40, notificarDispositivo: false },
  { id: "margem-baixa", nome: "Margem Baixa", ativo: true, tolerancia: 15, notificarDispositivo: true },
  { id: "comprometimento-renda", nome: "Comprometimento Renda", ativo: true, tolerancia: 30, notificarDispositivo: true },
  { id: "reserva-insuficiente", nome: "Reserva Insuficiente", ativo: true, tolerancia: 6, notificarDispositivo: true },
  { id: "gasto-categoria", nome: "Variação de Gastos", ativo: true, tolerancia: 30, notificarDispositivo: false },
];

export const DEFAULT_METAS: MetaConfig[] = [
  { id: "meta-receita", nome: "Meta de Receita", ativo: false, valorAlvo: 0, tipo: 'receita' },
  { id: "teto-gastos", nome: "Teto de Gastos", ativo: false, valorAlvo: 0, tipo: 'gasto' },
  { id: "meta-investimento", nome: "Meta de Investimento", ativo: false, valorAlvo: 0, tipo: 'investimento' },
];

export function SidebarAlertas({ collapsed = false, onConfigOpen }: { collapsed?: boolean; onConfigOpen?: () => void }) {
  const navigate = useNavigate();
  const { 
    transacoesV2, contasMovimento, getSaldoDevedor, 
    alertStartDate, setAlertStartDate, calculateBalanceUpToDate, getPatrimonioLiquido,
    metasPersonalizadas, calcularProgressoMeta
  } = useFinance();
  
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => JSON.parse(localStorage.getItem("alertas-config-v3") || JSON.stringify(DEFAULT_ALERTS)));
  const [metasConfig, setMetasConfig] = useState<MetaConfig[]>(() => JSON.parse(localStorage.getItem("metas-config-v3") || JSON.stringify(DEFAULT_METAS)));
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const metricas = useMemo(() => {
    const now = new Date();
    const parsedStart = startOfDay(parseDateLocal(alertStartDate));
    const txsMes = transacoesV2.filter(t => {
      const txDate = parseDateLocal(t.date);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const receitasMes = txsMes.filter(t => t.operationType === "receita" || t.operationType === "rendimento").reduce((a, t) => a + t.amount, 0);
    const despesasMes = txsMes.filter(t => t.flow === "out").reduce((a, t) => a + t.amount, 0);
    const investimentosMes = txsMes.filter(t => t.operationType === "aplicacao").reduce((a, t) => a + t.amount, 0);

    const saldoLiq = contasMovimento.filter(c => ['corrente', 'poupanca', 'reserva'].includes(c.accountType)).reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, now, transacoesV2, contasMovimento), 0);
    const pl = getPatrimonioLiquido(now);
    const divida = getSaldoDevedor(now);

    return { saldoLiq, debtRatio: pl > 0 ? (divida/pl)*100 : 0, receitasMes, despesasMes, investimentosMes };
  }, [transacoesV2, contasMovimento, alertStartDate, calculateBalanceUpToDate, getPatrimonioLiquido, getSaldoDevedor]);

  const itensExibicao = useMemo(() => {
    const items: Alerta[] = [];
    
    // Processar Alertas
    const aMap = new Map(alertasConfig.map(c => [c.id, c]));
    if (aMap.get("saldo-negativo")?.ativo && metricas.saldoLiq < aMap.get("saldo-negativo")!.tolerancia) 
      items.push({ id: "saldo-negativo", tipo: "danger", titulo: "Saldo Crítico", descricao: `Disponível: R$ ${metricas.saldoLiq.toLocaleString('pt-BR')}`, rota: "/receitas-despesas" });
    
    // Processar Metas Padrão
    metasConfig.filter(m => m.ativo).forEach(m => {
      if (m.id === "meta-receita") {
        const progresso = m.valorAlvo > 0 ? (metricas.receitasMes / m.valorAlvo) * 100 : 0;
        items.push({ id: m.id, tipo: "goal", titulo: "Meta de Receita", descricao: `${progresso.toFixed(0)}% atingido (R$ ${metricas.receitasMes.toLocaleString('pt-BR')})`, rota: "/receitas-despesas", percentual: progresso });
      }
      if (m.id === "teto-gastos") {
        const progresso = m.valorAlvo > 0 ? (metricas.despesasMes / m.valorAlvo) * 100 : 0;
        items.push({ id: m.id, tipo: progresso > 90 ? "warning" : "goal", titulo: "Teto de Gastos", descricao: `${progresso.toFixed(0)}% do limite utilizado`, rota: "/receitas-despesas", percentual: progresso });
      }
      if (m.id === "meta-investimento") {
        const progresso = m.valorAlvo > 0 ? (metricas.investimentosMes / m.valorAlvo) * 100 : 0;
        items.push({ id: m.id, tipo: "goal", titulo: "Meta de Investimento", descricao: `${progresso.toFixed(0)}% atingido (R$ ${metricas.investimentosMes.toLocaleString('pt-BR')})`, rota: "/investimentos", percentual: progresso });
      }
    });

    // Processar Metas Personalizadas
    metasPersonalizadas.filter(m => m.ativo).forEach(meta => {
      const progresso = calcularProgressoMeta(meta);
      const valorFormatado = meta.tipo === 'percentual' || meta.tipo === 'economia' 
        ? `${progresso.valorAtual.toFixed(1)}%`
        : `R$ ${progresso.valorAtual.toLocaleString('pt-BR')}`;
      
      items.push({
        id: meta.id,
        tipo: progresso.status === 'sucesso' ? 'success' : progresso.status === 'alerta' ? 'warning' : progresso.status === 'perigo' ? 'danger' : 'goal',
        titulo: meta.nome,
        descricao: `${progresso.percentual.toFixed(0)}% • ${valorFormatado}`,
        rota: "/",
        percentual: progresso.percentual,
      });
    });

    return items.filter(i => !dismissed.has(i.id));
  }, [metricas, alertasConfig, metasConfig, dismissed, metasPersonalizadas, calcularProgressoMeta]);

  const handleSave = (newAlerts: AlertaConfig[], newMetas: MetaConfig[]) => {
    setAlertasConfig(newAlerts);
    setMetasConfig(newMetas);
    localStorage.setItem("alertas-config-v3", JSON.stringify(newAlerts));
    localStorage.setItem("metas-config-v3", JSON.stringify(newMetas));
    toast.success("Configurações atualizadas!");
  };

  return (
    <div className="px-2">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-foreground">Central</p>
          {itensExibicao.length > 0 && <Badge variant="destructive" className="h-5 px-2 text-[10px] font-black rounded-full">{itensExibicao.length}</Badge>}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onConfigOpen?.()}><Settings2 className="w-4 h-4 text-muted-foreground" /></Button>
      </div>

      <ScrollArea className="max-h-80">
        <div className="space-y-2.5 pb-2">
          {itensExibicao.map((item) => {
            const meta = metasPersonalizadas.find(m => m.id === item.id);
            const Icon = meta ? (ICONS[meta.icone || 'target'] || Target) : (ICONS[item.id] || Bell);
            const corBg = meta?.cor ? COR_CLASSES[meta.cor] : null;
            
            return (
              <div key={item.id} className={cn("flex items-start gap-3 p-3 rounded-2xl text-xs border cursor-pointer transition-all hover:scale-[1.02]", 
                item.tipo === "danger" ? "bg-destructive/5 border-destructive/20 text-destructive" : 
                item.tipo === "success" ? "bg-success/5 border-success/20 text-success" :
                item.tipo === "goal" ? "bg-primary/5 border-primary/20 text-primary" : "bg-warning/5 border-warning/20 text-warning")}
                onClick={() => navigate(item.rota || "/")}
              >
                <div className={cn("p-2 rounded-xl shadow-sm", corBg ? `${corBg} text-white` : "bg-background/50")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase tracking-tight">{item.titulo}</p>
                  <p className="text-[10px] font-bold opacity-70 truncate">{item.descricao}</p>
                  {item.percentual !== undefined && (
                    <div className="mt-1.5 h-1.5 bg-background/50 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", 
                          item.tipo === 'success' ? 'bg-success' : 
                          item.tipo === 'warning' ? 'bg-warning' : 
                          item.tipo === 'danger' ? 'bg-destructive' : 'bg-primary'
                        )} 
                        style={{ width: `${Math.min(item.percentual, 100)}%` }} 
                      />
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); setDismissed(prev => new Set([...prev, item.id])); }}><X className="w-3 h-3" /></Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
