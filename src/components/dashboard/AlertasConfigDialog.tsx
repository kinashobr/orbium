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
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { MetaPersonalizada } from "@/types/finance";
import { MetaPersonalizadaFormModal } from "./MetaPersonalizadaFormModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  "saldo-negativo": { icon: AlertTriangle, color: "text-destructive", descricao: "Alerta quando o saldo líquido ficar abaixo de zero.", unidade: "R$" },
  "dividas-altas": { icon: Scale, color: "text-orange-500", descricao: "Alerta quando as dívidas excederem X% do patrimônio.", unidade: "%" },
  "margem-baixa": { icon: Target, color: "text-primary", descricao: "Alerta quando a margem de economia mensal for menor que X%.", unidade: "%" },
  "comprometimento-renda": { icon: CreditCard, color: "text-destructive", descricao: "Alerta quando as parcelas somarem mais de X% da renda.", unidade: "%" },
  "reserva-insuficiente": { icon: PiggyBank, color: "text-indigo-500", descricao: "Alerta quando a reserva estiver abaixo de X meses.", unidade: "meses" },
  "gasto-categoria": { icon: ShoppingCart, color: "text-pink-500", descricao: "Alerta quando uma categoria variar mais de X%.", unidade: "%" }
};

const META_INFO: Record<string, { icon: any; color: string; descricao: string }> = {
  "meta-receita": { icon: TrendingUp, color: "text-success", descricao: "Objetivo de renda total mensal." },
  "teto-gastos": { icon: TrendingDown, color: "text-destructive", descricao: "Limite máximo de despesas no mês." },
  "meta-investimento": { icon: Rocket, color: "text-indigo-500", descricao: "Valor alvo para novos investimentos." }
};

const COR_BG: Record<string, string> = {
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500',
};

export function AlertasConfigDialog({ open, onOpenChange, config, metas, onSave, initialStartDate, onStartDateChange }: AlertasConfigDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { metasPersonalizadas, addMetaPersonalizada, updateMetaPersonalizada, deleteMetaPersonalizada } = useFinance();
  
  const [localConfig, setLocalConfig] = useState<AlertaConfig[]>(config);
  const [localMetas, setLocalMetas] = useState<MetaConfig[]>(metas);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [activeTab, setActiveTab] = useState("alertas");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaPersonalizada | null>(null);

  useEffect(() => { if (open) { setLocalConfig(config); setLocalMetas(metas || []); setStartDate(initialStartDate); } }, [open, config, metas, initialStartDate]);

  const handleSave = () => { onSave(localConfig, localMetas); onStartDateChange(startDate); onOpenChange(false); };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          hideCloseButton
          fullscreen={isMobile}
          className={cn(
            "p-0 shadow-2xl bg-card flex flex-col",
            !isMobile && "max-w-[32rem] h-[85vh] rounded-[2rem]"
          )}
        >
          <DialogHeader 
            className="px-6 sm:px-8 pt-6 sm:pt-10 pb-4 bg-muted/30 shrink-0 border-b relative"
            style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
          >
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute left-4 top-4 rounded-full h-10 w-10">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}
            
            <div className={cn("flex items-center gap-4 sm:gap-5 mb-6", isMobile && "pl-12")}>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shrink-0">
                <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Configurações</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Performance & Alertas</DialogDescription>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-2xl border">
                <TabsTrigger value="alertas" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card gap-2">
                  <AlertTriangle className="w-4 h-4" /> RISCOS
                </TabsTrigger>
                <TabsTrigger value="metas" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card gap-2">
                  <Trophy className="w-4 h-4" /> METAS
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 sm:px-8">
            <div className="py-6 space-y-8 pb-32 sm:pb-6">
              <Tabs value={activeTab} className="mt-0">
                <TabsContent value="alertas" className="space-y-6 mt-0 focus-visible:outline-none">
                  <div className="p-5 rounded-[2rem] bg-muted/30 border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-primary" /><Label className="font-black text-xs uppercase tracking-widest">Analisar desde</Label></div>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 h-10 rounded-xl border-2 font-bold text-xs" />
                  </div>

                  <div className="space-y-3">
                    {localConfig.map(alerta => {
                      const info = ALERTA_INFO[alerta.id];
                      return (
                        <div key={alerta.id} className={cn("p-4 sm:p-5 rounded-[2rem] border-2 transition-all", alerta.ativo ? "bg-card border-primary/20 shadow-md" : "bg-muted/20 border-transparent opacity-60")}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                {info && <info.icon className={cn("w-5 h-5", alerta.ativo ? info.color : "text-muted-foreground")} />}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <Label className="font-black text-sm truncate block">{alerta.nome}</Label>
                                <p className="text-[10px] font-medium text-muted-foreground leading-tight line-clamp-2">{info?.descricao}</p>
                              </div>
                            </div>
                            <Switch checked={alerta.ativo} onCheckedChange={() => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, ativo: !c.ativo } : c))} />
                          </div>
                          {alerta.ativo && (
                            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Limite:</Label>
                                <div className="relative w-24">
                                  <Input type="number" value={alerta.tolerancia} onChange={e => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, tolerancia: parseFloat(e.target.value) || 0 } : c))} className="h-9 rounded-xl border-2 font-black text-xs pr-6" />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground">{info?.unidade}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground">Push</Label>
                                <Switch checked={alerta.notificarDispositivo} onCheckedChange={() => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, notificarDispositivo: !c.notificarDispositivo } : c))} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="metas" className="space-y-8 mt-0 focus-visible:outline-none">
                  <div className="space-y-3">
                    {localMetas.map(meta => {
                      const info = META_INFO[meta.id];
                      return (
                        <div key={meta.id} className={cn("p-4 sm:p-5 rounded-[2rem] border-2 transition-all", meta.ativo ? "bg-card border-success/20 shadow-md" : "bg-muted/20 border-transparent opacity-60")}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                {info && <info.icon className={cn("w-5 h-5", meta.ativo ? info.color : "text-muted-foreground")} />}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <Label className="font-black text-sm truncate block">{meta.nome}</Label>
                                <p className="text-[10px] font-medium text-muted-foreground leading-tight">{info?.descricao}</p>
                              </div>
                            </div>
                            <Switch checked={meta.ativo} onCheckedChange={() => setLocalMetas(prev => prev.map(m => m.id === meta.id ? { ...m, ativo: !m.ativo } : m))} />
                          </div>
                          {meta.ativo && (
                            <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor Alvo (R$)</Label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/40">R$</span>
                                  <Input type="number" value={meta.valorAlvo} onChange={e => setLocalMetas(prev => prev.map(m => m.id === meta.id ? { ...m, valorAlvo: parseFloat(e.target.value) || 0 } : m))} className="h-11 pl-10 rounded-xl border-2 font-black text-lg" />
                                </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personalizadas</p>
                      <Button variant="outline" size="sm" onClick={() => { setEditingMeta(null); setFormModalOpen(true); }} className="rounded-full h-8 px-4 gap-2 text-[10px] font-black"><Plus className="w-3.5 h-3.5" /> NOVA META</Button>
                    </div>
                    {metasPersonalizadas.map(meta => (
                      <div key={meta.id} className={cn("p-4 rounded-[1.75rem] border-2 transition-all", meta.ativo ? "bg-card border-primary/20 shadow-sm" : "bg-muted/20 border-transparent opacity-60")}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", COR_BG[meta.cor || 'emerald'])}><Target className="w-5 h-5" /></div>
                            <div className="min-w-0"><p className="font-bold text-sm truncate">{meta.nome}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{meta.tipo === 'percentual' ? `${meta.valorAlvo}%` : `R$ ${meta.valorAlvo.toLocaleString()}`} • {meta.periodoAvaliacao}</p></div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { setEditingMeta(meta); setFormModalOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => deleteMetaPersonalizada(meta.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            <Switch checked={meta.ativo} onCheckedChange={() => updateMetaPersonalizada(meta.id, { ativo: !meta.ativo })} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter 
            className={cn(
              "p-6 sm:p-8 bg-muted/10 border-t shrink-0 flex flex-col sm:flex-row gap-3",
              isMobile && "fixed bottom-0 left-0 right-0 bg-card"
            )}
            style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
          >
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-full h-14 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground order-2 sm:order-1"
            >
              FECHAR
            </Button>
            <Button onClick={handleSave} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all order-1 sm:order-2">
              <Save className="w-5 h-5" /> SALVAR CONFIGURAÇÕES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MetaPersonalizadaFormModal open={formModalOpen} onOpenChange={setFormModalOpen} meta={editingMeta} onSave={m => { if (editingMeta) updateMetaPersonalizada(m.id, m); else addMetaPersonalizada(m); setEditingMeta(null); }} />
    </>
  );
}