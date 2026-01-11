"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Target,
  Save,
  CreditCard,
  Repeat,
  Shield,
  Calendar,
  Bell,
  Zap,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ShoppingCart,
  Scale,
  Trophy,
  Rocket,
  Settings2,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { IndicatorManagerModal } from "../reports/IndicatorManagerModal";

export interface AlertaConfig {
  id: string;
  nome: string;
  ativo: boolean;
  tolerancia: number;
  notificarDispositivo: boolean;
}

export interface MetaConfig {
  id: string;
  nome: string;
  ativo: boolean;
  valorAlvo: number;
  tipo: 'receita' | 'gasto' | 'investimento';
}

interface AlertasConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AlertaConfig[];
  metas: MetaConfig[];
  onSave: (config: AlertaConfig[], metas: MetaConfig[]) => void;
  initialStartDate: string;
  onStartDateChange: (date: string) => void;
}

const ALERTA_INFO: Record<string, { icon: any; color: string; descricao: string; unidade: string }> = {
  "saldo-negativo": { icon: AlertTriangle, color: "text-destructive", descricao: "Alerta quando o saldo de liquidez imediata ficar abaixo de zero.", unidade: "R$" },
  "dividas-altas": { icon: Scale, color: "text-orange-500", descricao: "Alerta quando o total de dívidas ultrapassar X% do seu patrimônio líquido.", unidade: "%" },
  "margem-baixa": { icon: Target, color: "text-primary", descricao: "Alerta quando a margem de poupança mensal (sobra) for menor que X%.", unidade: "%" },
  "comprometimento-renda": { icon: CreditCard, color: "text-destructive", descricao: "Alerta quando as parcelas de empréstimos somarem mais de X% da sua renda.", unidade: "%" },
  "reserva-insuficiente": { icon: PiggyBank, color: "text-indigo-500", descricao: "Alerta quando sua reserva estiver abaixo de X meses de custo fixo.", unidade: "meses" },
  "gasto-categoria": { icon: ShoppingCart, color: "text-pink-500", descricao: "Alerta quando uma categoria variar mais de X% vs mês anterior.", unidade: "%" }
};

const META_INFO: Record<string, { icon: any; color: string; descricao: string }> = {
  "meta-receita": { icon: TrendingUp, color: "text-success", descricao: "Objetivo de faturamento/renda total mensal." },
  "teto-gastos": { icon: TrendingDown, color: "text-destructive", descricao: "Limite máximo de despesas totais no mês." },
  "meta-investimento": { icon: Rocket, color: "text-indigo-500", descricao: "Valor alvo para novos aportes em investimentos." }
};

export function AlertasConfigDialog({ 
  open, 
  onOpenChange, 
  config, 
  metas,
  onSave,
  initialStartDate,
  onStartDateChange
}: AlertasConfigDialogProps) {
  const [localConfig, setLocalConfig] = useState<AlertaConfig[]>(config);
  const [localMetas, setLocalMetas] = useState<MetaConfig[]>(metas);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [activeTab, setActiveTab] = useState("alertas");
  const [showIndicatorManager, setShowIndicatorManager] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalConfig(config);
      setLocalMetas(metas || []);
      setStartDate(initialStartDate);
    }
  }, [open, config, metas, initialStartDate]);

  const handleSave = () => {
    onSave(localConfig, localMetas);
    onStartDateChange(startDate);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[min(95vw,42rem)] h-[min(90vh,850px)] p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl flex flex-col bg-background">
          <DialogHeader className="px-8 pt-10 pb-4 bg-primary/5 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                  <Bell className="w-8 h-8" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter">Performance & Alertas</DialogTitle>
                  <DialogDescription className="text-sm font-bold text-muted-foreground flex items-center gap-2 mt-1 uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-accent" />
                    Configuração de Inteligência
                  </DialogDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => setShowIndicatorManager(true)}
              >
                <Settings2 className="w-6 h-6" />
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-2xl border border-border/40">
                <TabsTrigger value="alertas" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Gatilhos de Risco
                </TabsTrigger>
                <TabsTrigger value="metas" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Trophy className="w-3.5 h-3.5 mr-2" /> Metas de Sucesso
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

          <ScrollArea className="flex-1 px-8 py-6">
            <Tabs value={activeTab} className="mt-0">
              <TabsContent value="alertas" className="space-y-8 pb-10 mt-0">
                <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <Label className="font-black text-sm uppercase tracking-widest">Início da Análise</Label>
                  </div>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 h-10 rounded-xl border-2 font-bold text-xs" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {localConfig.map((alerta) => {
                    const info = ALERTA_INFO[alerta.id];
                    return (
                      <div key={alerta.id} className={cn("p-5 rounded-[2rem] border-2 transition-all", alerta.ativo ? "bg-card border-primary/20 shadow-md" : "bg-muted/20 border-transparent opacity-60")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                              {info && <info.icon className={cn("w-6 h-6", alerta.ativo ? info.color : "text-muted-foreground")} />}
                            </div>
                            <div className="space-y-0.5">
                              <Label className="font-black text-sm">{alerta.nome}</Label>
                              <p className="text-[11px] font-medium text-muted-foreground leading-tight">{info?.descricao}</p>
                            </div>
                          </div>
                          <Switch checked={alerta.ativo} onCheckedChange={() => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, ativo: !c.ativo } : c))} />
                        </div>
                        {alerta.ativo && (
                          <div className="mt-6 pt-5 border-t border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite:</Label>
                              <div className="relative w-32">
                                <Input type="number" value={alerta.tolerancia} onChange={(e) => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, tolerancia: parseFloat(e.target.value) || 0 } : c))} className="h-9 rounded-xl border-2 font-black text-sm pr-8" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">{info?.unidade}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-2xl">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notificar Celular</Label>
                              <Switch checked={alerta.notificarDispositivo} onCheckedChange={() => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, notificarDispositivo: !c.notificarDispositivo } : c))} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="metas" className="space-y-8 pb-10 mt-0">
                <div className="grid grid-cols-1 gap-3">
                  {localMetas.map((meta) => {
                    const info = META_INFO[meta.id];
                    return (
                      <div key={meta.id} className={cn("p-5 rounded-[2rem] border-2 transition-all", meta.ativo ? "bg-card border-success/20 shadow-md" : "bg-muted/20 border-transparent opacity-60")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                              {info && <info.icon className={cn("w-6 h-6", meta.ativo ? info.color : "text-muted-foreground")} />}
                            </div>
                            <div className="space-y-0.5">
                              <Label className="font-black text-sm">{meta.nome}</Label>
                              <p className="text-[11px] font-medium text-muted-foreground leading-tight">{info?.descricao}</p>
                            </div>
                          </div>
                          <Switch checked={meta.ativo} onCheckedChange={() => setLocalMetas(prev => prev.map(m => m.id === meta.id ? { ...m, ativo: !m.ativo } : m))} />
                        </div>
                        {meta.ativo && (
                          <div className="mt-6 pt-5 border-t border-border/40 flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor Alvo Mensal (R$)</Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/40">R$</span>
                                <Input type="number" value={meta.valorAlvo} onChange={(e) => setLocalMetas(prev => prev.map(m => m.id === meta.id ? { ...m, valorAlvo: parseFloat(e.target.value) || 0 } : m))} className="h-12 pl-10 rounded-2xl border-2 font-black text-lg" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <Button 
                    variant="outline" 
                    className="h-20 rounded-[2rem] border-dashed border-2 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    onClick={() => setShowIndicatorManager(true)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm">Criar Meta Personalizada</p>
                        <p className="text-[10px] font-medium text-muted-foreground">Defina fórmulas e indicadores próprios</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="p-8 bg-surface-light dark:bg-surface-dark border-t flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-8 font-bold text-muted-foreground">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
              <Save className="w-5 h-5" /> SALVAR CONFIGURAÇÕES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IndicatorManagerModal 
        open={showIndicatorManager}
        onOpenChange={setShowIndicatorManager}
        indicators={[]} // Aqui você passaria os indicadores customizados do estado global
        onSave={(ind) => {
          // Lógica para salvar indicador customizado
          setShowIndicatorManager(false);
        }}
        onDelete={(id) => {
          // Lógica para deletar
        }}
      />
    </>
  );
}