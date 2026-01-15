"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Trash2, Pencil, Plus, Check, X, Settings2, Sparkles, LayoutGrid } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomIndicator {
  id: string;
  name: string;
  format: string;
  formula: string;
  goal: number;
  alert: number;
  logic: "higher" | "lower";
  description: string;
}

interface IndicatorManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicators: CustomIndicator[];
  onSave: (indicator: CustomIndicator) => void;
  onDelete: (id: string) => void;
}

export function IndicatorManagerModal({ 
  open, 
  onOpenChange, 
  indicators, 
  onSave, 
  onDelete 
}: IndicatorManagerModalProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<CustomIndicator, "id">>({
    name: "",
    format: "percent",
    formula: "",
    goal: 0,
    alert: 0,
    logic: "higher",
    description: ""
  });

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      name: "",
      format: "percent",
      formula: "",
      goal: 0,
      alert: 0,
      logic: "higher",
      description: ""
    });
    setView("form");
  };

  const handleEdit = (indicator: CustomIndicator) => {
    setEditingId(indicator.id);
    setFormData({
      name: indicator.name,
      format: indicator.format,
      formula: indicator.formula,
      goal: indicator.goal,
      alert: indicator.alert,
      logic: indicator.logic,
      description: indicator.description
    });
    setView("form");
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.formula) {
      toast.error("Nome e fórmula são obrigatórios.");
      return;
    }
    
    onSave({
      id: editingId || `ind_${Date.now()}`,
      ...formData
    });
    
    setView("list");
    toast.success(editingId ? "Indicador atualizado!" : "Indicador criado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,36rem)] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-card dark:bg-[hsl(24_8%_14%)]">
        <DialogHeader className="px-8 pt-8 pb-6 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <Settings2 className="w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {view === "list" ? "Configurar Indicadores" : editingId ? "Editar Indicador" : "Novo Indicador"}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  {view === "list" ? "Personalize sua análise" : "Defina sua métrica personalizada"}
                </DialogDescription>
              </div>
            </div>
            {view === "list" && (
              <Button onClick={handleAddNew} size="sm" className="rounded-full h-10 px-5 font-bold gap-2">
                <Plus className="w-4 h-4" /> Criar
              </Button>
            )}
          </div>
        </DialogHeader>

        {view === "list" ? (
          <ScrollArea className="flex-1 px-8 pb-4 h-[400px]">
            <div className="space-y-3 py-6">
              {indicators.map(ind => (
                <div key={ind.id} className="flex items-center gap-4 p-4 rounded-[1.75rem] bg-card border border-border/40 hover:border-primary/30 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{ind.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{ind.formula}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(ind)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(ind.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {indicators.length === 0 && (
                <div className="py-12 text-center opacity-40">
                  <Sparkles className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum indicador personalizado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-8 space-y-6 max-h-[500px] overflow-y-auto no-scrollbar">
            {/* Seção de Ajuda */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">💡 Como criar fórmulas</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div><span className="font-mono text-primary">RENDA</span> = Total de entradas</div>
                <div><span className="font-mono text-primary">GASTOS</span> = Total de saídas</div>
                <div><span className="font-mono text-primary">SOBRA</span> = Renda - Gastos</div>
                <div><span className="font-mono text-primary">BENS</span> = Total de ativos</div>
                <div><span className="font-mono text-primary">DIVIDAS</span> = Total de passivos</div>
                <div><span className="font-mono text-primary">CAPITAL</span> = Bens - Dívidas</div>
                <div><span className="font-mono text-primary">FIXOS</span> = Despesas fixas</div>
                <div><span className="font-mono text-primary">VARIAVEIS</span> = Despesas variáveis</div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">Operações: + (somar), - (subtrair), * (multiplicar), / (dividir)</p>
              <p className="text-[9px] text-primary font-medium mt-1">Exemplo: (SOBRA / RENDA) * 100 = Taxa de Economia</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome do Indicador</Label>
              <Input 
                placeholder="Ex: Taxa de Economia" 
                className="h-12 border-2 rounded-2xl font-bold"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Formato</Label>
                <Select value={formData.format} onValueChange={v => setFormData(p => ({ ...p, format: v }))}>
                  <SelectTrigger className="h-12 border-2 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="currency">Moeda (R$)</SelectItem>
                    <SelectItem value="number">Decimal (x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Lógica</Label>
                <Select value={formData.logic} onValueChange={v => setFormData(p => ({ ...p, logic: v as any }))}>
                  <SelectTrigger className="h-12 border-2 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher">Maior é melhor</SelectItem>
                    <SelectItem value="lower">Menor é melhor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Fórmula</Label>
              <div className="relative">
                <Calculator className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                <Textarea 
                  placeholder="Ex: (SOBRA / RENDA) * 100" 
                  className="min-h-[80px] pl-12 border-2 rounded-2xl font-mono text-sm pt-4"
                  value={formData.formula}
                  onChange={e => setFormData(p => ({ ...p, formula: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Meta (Verde)</Label>
                <Input 
                  type="number" 
                  className="h-12 border-2 rounded-2xl font-black"
                  value={formData.goal}
                  onChange={e => setFormData(p => ({ ...p, goal: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Alerta (Amarelo)</Label>
                <Input 
                  type="number" 
                  className="h-12 border-2 rounded-2xl font-black"
                  value={formData.alert}
                  onChange={e => setFormData(p => ({ ...p, alert: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-8 bg-muted/10 dark:bg-black/20 border-t dark:border-white/5 flex gap-3">
          {view === "form" ? (
            <>
              <Button variant="ghost" onClick={() => setView("list")} className="rounded-full h-12 px-6 font-bold text-muted-foreground">
                Voltar
              </Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20">
                <Check className="w-5 h-5" /> SALVAR
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-full h-12 font-black text-sm text-muted-foreground hover:text-foreground">
              FECHAR
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}