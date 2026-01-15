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
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { MetaPersonalizada } from "@/types/finance";
import { MetaPersonalizadaFormModal } from "./MetaPersonalizadaFormModal";

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

const COR_BG: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
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
  const { metasPersonalizadas, addMetaPersonalizada, updateMetaPersonalizada, deleteMetaPersonalizada } = useFinance();
  
  const [localConfig, setLocalConfig] = useState<AlertaConfig[]>(config);
  const [localMetas, setLocalMetas] = useState<MetaConfig[]>(metas);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [activeTab, setActiveTab] = useState("alertas");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaPersonalizada | null>(null);

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

  const handleSaveMeta = (meta: MetaPersonalizada) => {
    if (editingMeta) {
      updateMetaPersonalizada(meta.id, meta);
    } else {
      addMetaPersonalizada(meta);
    }
    setEditingMeta(null);
  };

  const handleEditMeta = (meta: MetaPersonalizada) => {
    setEditingMeta(meta);
    setFormModalOpen(true);
  };

  const handleDeleteMeta = (id: string) => {
    deleteMetaPersonalizada(id);
  };

  const handleToggleMeta = (id: string) => {
    const meta = metasPersonalizadas.find(m => m.id === id);
    if (meta) {
      updateMetaPersonalizada(id, { ativo: !meta.ativo });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[min(95vw,42rem)] h-[min(90vh,850px)] p-0 overflow-hidden rounded-[2rem] sm:rounded-[3rem] border-none shadow-2xl flex flex-col bg-card dark:bg-[hsl(24_8%_14%)]">
          <DialogHeader className="px-4 sm:px-8 pt-6 sm:pt-10 pb-4 bg-muted/30 dark:bg-black/30 shrink-0 border-b border-border/40 dark:border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 shrink-0">
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl sm:text-3xl font-black tracking-tighter truncate">Performance & Alertas</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm font-bold text-muted-foreground flex items-center gap-2 mt-1 uppercase tracking-wider">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-accent shrink-0" />
                    <span className="truncate">Monitoramento Financeiro</span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 sm:h-12 bg-muted/50 p-1 rounded-xl sm:rounded-2xl border border-border/40">
                <TabsTrigger value="alertas" className="rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 sm:gap-2 px-2 sm:px-4">
                  <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Gatilhos de</span> Risco
                </TabsTrigger>
                <TabsTrigger value="metas" className="rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 sm:gap-2 px-2 sm:px-4">
                  <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Metas <span className="hidden sm:inline">de Sucesso</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogHeader>

            <ScrollArea className="flex-1 px-4 sm:px-8 py-6">
              <Tabs value={activeTab} className="mt-0">
                <TabsContent value="alertas" className="space-y-8 pb-10 mt-0">
                  <div className="p-4 sm:p-6 rounded-[2rem] bg-muted/30 border border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <Label className="font-black text-sm uppercase tracking-widest">Início da Análise</Label>
                    </div>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-40 h-10 rounded-xl border-2 font-bold text-xs" />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {localConfig.map((alerta) => {
                      const info = ALERTA_INFO[alerta.id];
                      return (
                        <div key={alerta.id} className={cn("p-4 sm:p-5 rounded-[2rem] border-2 transition-all", alerta.ativo ? "bg-card border-primary/20 shadow-md" : "bg-muted/20 border-transparent opacity-60")}>
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center shrink-0">
                                {info && <info.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", alerta.ativo ? info.color : "text-muted-foreground")} />}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <Label className="font-black text-sm truncate block">{alerta.nome}</Label>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-tight line-clamp-2">{info?.descricao}</p>
                              </div>
                            </div>
                            <Switch checked={alerta.ativo} onCheckedChange={() => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, ativo: !c.ativo } : c))} />
                          </div>
                          {alerta.ativo && (
                            <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite:</Label>
                                <div className="relative w-28 sm:w-32">
                                  <Input type="number" value={alerta.tolerancia} onChange={(e) => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, tolerancia: parseFloat(e.target.value) || 0 } : c))} className="h-9 rounded-xl border-2 font-black text-sm pr-8" />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">{info?.unidade}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-muted/50 px-3 sm:px-4 py-2 rounded-2xl">
                                <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notificar</Label>
                                <Switch checked={alerta.notificarDispositivo} onCheckedChange={() => setLocalConfig(prev => prev.map(c => c.id === alerta.id ? { ...c, notificarDispositivo: !c.notificarDispositivo } : c))} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="metas" className="space-y-6 pb-10 mt-0">
                  {/* Metas Padrão */}
                  <div className="grid grid-cols-1 gap-3">
                    {localMetas.map((meta) => {
                      const info = META_INFO[meta.id];
                      return (
                        <div key={meta.id} className={cn("p-4 sm:p-5 rounded-[2rem] border-2 transition-all", meta.ativo ? "bg-card border-success/20 shadow-md" : "bg-muted/20 border-transparent opacity-60")}>
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center shrink-0">
                                {info && <info.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", meta.ativo ? info.color : "text-muted-foreground")} />}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <Label className="font-black text-sm truncate block">{meta.nome}</Label>
                                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-tight">{info?.descricao}</p>
                              </div>
                            </div>
                            <Switch checked={meta.ativo} onCheckedChange={() => setLocalMetas(prev => prev.map(m => m.id === meta.id ? { ...m, ativo: !m.ativo } : m))} />
                          </div>
                          {meta.ativo && (
                            <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-border/40 flex items-center gap-4">
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
                  </div>
                  
                  {/* Metas Personalizadas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Metas Personalizadas</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setEditingMeta(null); setFormModalOpen(true); }}
                        className="rounded-full h-8 px-4 gap-2 text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nova Meta
                      </Button>
                    </div>

                    {metasPersonalizadas.length === 0 ? (
                      <div className="p-5 rounded-[2rem] border-2 border-dashed border-border/40 bg-muted/20 text-center">
                        <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-bold text-muted-foreground">Nenhuma meta personalizada</p>
                        <p className="text-[10px] text-muted-foreground/70">Crie metas customizadas para acompanhar seus objetivos</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {metasPersonalizadas.map((meta) => (
                          <div 
                            key={meta.id} 
                            className={cn(
                              "p-4 rounded-2xl border-2 transition-all",
                              meta.ativo ? "bg-card border-primary/20 shadow-sm" : "bg-muted/20 border-transparent opacity-60"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", COR_BG[meta.cor || 'emerald'])}>
                                  <Target className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm truncate">{meta.nome}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {meta.tipo === 'percentual' || meta.tipo === 'economia' ? `${meta.valorAlvo}%` : `R$ ${meta.valorAlvo.toLocaleString('pt-BR')}`} • {meta.periodoAvaliacao}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEditMeta(meta)}>
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteMeta(meta.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                <Switch checked={meta.ativo} onCheckedChange={() => handleToggleMeta(meta.id)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>

            <DialogFooter className="p-4 sm:p-8 bg-surface-light dark:bg-surface-dark border-t flex flex-col-reverse sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-8 font-bold text-muted-foreground w-full sm:w-auto">Cancelar</Button>
              <Button onClick={handleSave} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                <Save className="w-5 h-5" /> <span className="hidden sm:inline">SALVAR</span> CONFIGURAÇÕES
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MetaPersonalizadaFormModal 
          open={formModalOpen} 
          onOpenChange={setFormModalOpen} 
          meta={editingMeta} 
          onSave={handleSaveMeta} 
        />
    </>
  );
}
