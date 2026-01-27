"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, TrendingUp, TrendingDown, PiggyBank, Percent, DollarSign, Wallet, BarChart3, ArrowUpRight, ArrowDownRight, Save, Sparkles, ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { MetaPersonalizada, MetaTipo, MetaMetrica, MetaPeriodo, MetaLogica, generateMetaId } from "@/types/finance";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toast } from "sonner";

interface MetaPersonalizadaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: MetaPersonalizada | null;
  onSave: (meta: MetaPersonalizada) => void;
}

const TIPO_OPTIONS: { value: MetaTipo; label: string; icon: any; descricao: string }[] = [
  { value: 'valor_fixo', label: 'Valor Fixo', icon: DollarSign, descricao: 'Atingir valor' },
  { value: 'percentual', label: 'Percentual', icon: Percent, descricao: 'Taxa sobre métrica' },
  { value: 'economia', label: 'Economia', icon: PiggyBank, descricao: '% sobre receita' },
  { value: 'categoria', label: 'Categoria', icon: BarChart3, descricao: 'Gastos específicos' },
];

const METRICA_OPTIONS: { value: MetaMetrica; label: string; tipos: MetaTipo[] }[] = [
  { value: 'receita', label: 'Receita Total', tipos: ['valor_fixo', 'percentual'] },
  { value: 'despesa', label: 'Despesa Total', tipos: ['valor_fixo', 'percentual'] },
  { value: 'investimento', label: 'Investimentos', tipos: ['valor_fixo', 'percentual'] },
  { value: 'saldo', label: 'Saldo Disponível', tipos: ['valor_fixo'] },
  { value: 'patrimonio', label: 'Patrimônio Líquido', tipos: ['valor_fixo', 'percentual'] },
  { value: 'categoria_especifica', label: 'Categoria Específica', tipos: ['categoria'] },
];

const PERIODO_OPTIONS: { value: MetaPeriodo; label: string }[] = [
  { value: 'mensal', label: 'Mensal' }, { value: 'trimestral', label: 'Trimestral' }, { value: 'anual', label: 'Anual' },
];

const LOGICA_OPTIONS: { value: MetaLogica; label: string; icon: any; descricao: string }[] = [
  { value: 'maior_melhor', label: 'Maior é Melhor', icon: ArrowUpRight, descricao: 'Ex: Receitas' },
  { value: 'menor_melhor', label: 'Menor é Melhor', icon: ArrowDownRight, descricao: 'Ex: Despesas' },
];

const DEFAULT_FORM_DATA: Partial<MetaPersonalizada> = {
  nome: '', descricao: '', tipo: 'valor_fixo', metrica: 'receita', valorAlvo: 0, periodoAvaliacao: 'mensal', logica: 'maior_melhor', cor: 'emerald', icone: 'target',
};

export function MetaPersonalizadaFormModal({ open, onOpenChange, meta, onSave }: MetaPersonalizadaFormModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { categoriasV2 } = useFinance();
  const [formData, setFormData] = useState<Partial<MetaPersonalizada>>(DEFAULT_FORM_DATA);

  useEffect(() => { if (open) { setFormData(meta || DEFAULT_FORM_DATA); } }, [open, meta]);

  const handleTipoChange = (tipo: MetaTipo) => {
    const metrics = METRICA_OPTIONS.filter(m => m.tipos.includes(tipo));
    setFormData(prev => ({ ...prev, tipo, metrica: metrics[0]?.value || 'receita', categoriaId: tipo === 'categoria' ? prev.categoriaId : undefined }));
  };

  const handleSubmit = () => {
    if (!formData.nome?.trim() || !formData.valorAlvo || formData.valorAlvo <= 0) {
      toast.error("Preencha o nome e um valor alvo válido."); return;
    }
    const metaCompleta: MetaPersonalizada = { id: meta?.id || generateMetaId(), nome: formData.nome!, descricao: formData.descricao, tipo: formData.tipo!, metrica: formData.metrica!, valorAlvo: formData.valorAlvo!, categoriaId: formData.categoriaId, periodoAvaliacao: formData.periodoAvaliacao!, logica: formData.logica!, ativo: meta?.ativo ?? true, criadoEm: meta?.criadoEm || new Date().toISOString(), cor: formData.cor, icone: formData.icone };
    onSave(metaCompleta); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[26rem] h-[85vh] rounded-[2rem]"
        )}
      >
        <DialogHeader 
          className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 bg-muted/30 shrink-0 border-b relative"
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
        >
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute left-4 top-4 rounded-full h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div className={cn("flex items-center gap-4", isMobile && "pl-12")}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shrink-0"><Target className="w-6 h-6" /></div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">{meta ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Defina seu objetivo</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 sm:px-8">
          <div className="py-6 space-y-6 pb-32 sm:pb-6">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome da Meta</Label><Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Economizar 20%" className="h-12 rounded-2xl border-2 font-bold" /></div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Estrutura da Meta</Label>
              <div className="grid grid-cols-2 gap-2">
                {TIPO_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => handleTipoChange(opt.value)} className={cn("p-4 rounded-2xl border-2 text-left transition-all", formData.tipo === opt.value ? "border-primary bg-primary/5 shadow-md" : "border-border/40 hover:border-primary/30")}>
                    <opt.icon className={cn("w-5 h-5 mb-2", formData.tipo === opt.value ? "text-primary" : "text-muted-foreground")} />
                    <p className="font-black text-xs">{opt.label}</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">{opt.descricao}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Métrica Base</Label>
              <Select value={formData.metrica} onValueChange={v => setFormData(p => ({ ...p, metrica: v as MetaMetrica }))}>
                <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>{METRICA_OPTIONS.filter(m => m.tipos.includes(formData.tipo || 'valor_fixo')).map(m => <SelectItem key={m.value} value={m.value} className="font-bold">{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor Alvo</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">{formData.tipo === 'percentual' || formData.tipo === 'economia' ? '%' : 'R$'}</span>
                <Input type="number" value={formData.valorAlvo} onChange={e => setFormData(p => ({ ...p, valorAlvo: Number(e.target.value) }))} className="h-14 pl-12 rounded-2xl border-2 font-black text-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Período</Label>
                <Select value={formData.periodoAvaliacao} onValueChange={v => setFormData(p => ({ ...p, periodoAvaliacao: v as MetaPeriodo }))}>
                  <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODO_OPTIONS.map(p => <SelectItem key={p.value} value={p.value} className="font-bold">{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Lógica</Label>
                <Select value={formData.logica} onValueChange={v => setFormData(p => ({ ...p, logica: v as MetaLogica }))}>
                  <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{LOGICA_OPTIONS.map(l => <SelectItem key={l.value} value={l.value} className="font-bold">{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 border-t shrink-0 flex flex-col sm:flex-row gap-3",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {!isMobile && (
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-full h-14 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto"
            >
              FECHAR
            </Button>
          )}
          <Button onClick={handleSubmit} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 order-1 sm:order-2 w-full sm:w-auto">
            <Save className="w-5 h-5" /> {meta ? 'SALVAR META' : 'CRIAR META'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}