"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Calculator, Target, Info, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface CustomIndicatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (indicator: any) => void;
}

export function CustomIndicatorModal({ open, onOpenChange, onSave }: CustomIndicatorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    format: "percent",
    formula: "",
    goal: "0",
    alert: "0",
    logic: "higher",
    description: ""
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.formula) {
      toast.error("Nome e fórmula são obrigatórios.");
      return;
    }
    onSave(formData);
    onOpenChange(false);
    toast.success("Indicador criado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,32rem)] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-card dark:bg-[hsl(24_8%_14%)]">
        <DialogHeader className="px-8 pt-8 pb-6 bg-muted/50 dark:bg-black/30 border-b border-border/40 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
              <Plus className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">Criar Novo Indicador</DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground mt-1 leading-relaxed">
                Crie suas próprias fórmulas matemáticas usando as variáveis do sistema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome do Indicador</Label>
            <Input 
              placeholder="Ex: Margem de Economia" 
              className="h-12 border-2 dark:border-white/10 rounded-2xl font-bold bg-muted/30 dark:bg-white/5"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Como exibir o resultado</Label>
            <Select value={formData.format} onValueChange={v => setFormData(p => ({ ...p, format: v }))}>
              <SelectTrigger className="h-12 border-2 dark:border-white/10 rounded-2xl font-bold bg-muted/30 dark:bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentual (%)</SelectItem>
                <SelectItem value="currency">Moeda (R$)</SelectItem>
                <SelectItem value="number">Número Decimal (x)</SelectItem>
                <SelectItem value="days">Dias / Meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fórmula do Indicador</Label>
              <button className="text-[9px] font-black text-primary hover:underline">VER VARIÁVEIS</button>
            </div>
            <div className="relative">
              <Calculator className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
              <Textarea 
                placeholder="Ex: (LUCRO / RECEITAS) * 100" 
                className="min-h-[100px] pl-12 border-2 dark:border-white/10 rounded-2xl font-mono text-sm pt-4 bg-muted/30 dark:bg-white/5"
                value={formData.formula}
                onChange={e => setFormData(p => ({ ...p, formula: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Meta (Saudável)</Label>
              <Input 
                type="number" 
                className="h-12 border-2 dark:border-white/10 rounded-2xl font-black bg-muted/30 dark:bg-white/5"
                value={formData.goal}
                onChange={e => setFormData(p => ({ ...p, goal: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Alerta (Atenção)</Label>
              <Input 
                type="number" 
                className="h-12 border-2 dark:border-white/10 rounded-2xl font-black bg-muted/30 dark:bg-white/5"
                value={formData.alert}
                onChange={e => setFormData(p => ({ ...p, alert: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Lógica da Cor</Label>
            <Select value={formData.logic} onValueChange={v => setFormData(p => ({ ...p, logic: v }))}>
              <SelectTrigger className="h-12 border-2 dark:border-white/10 rounded-2xl font-bold bg-muted/30 dark:bg-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="higher">Quanto maior, melhor</SelectItem>
                <SelectItem value="lower">Quanto menor, melhor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">O que este indicador explica?</Label>
            <Textarea 
              placeholder="Descreva brevemente o que este número representa para você..." 
              className="min-h-[80px] border-2 dark:border-white/10 rounded-2xl text-sm bg-muted/30 dark:bg-white/5"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="p-8 bg-muted/10 dark:bg-black/20 border-t dark:border-white/5 flex gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-6 font-bold text-muted-foreground">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20">
            <Check className="w-5 h-5" />
            CRIAR INDICADOR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}