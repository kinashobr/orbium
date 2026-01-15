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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Percent,
  DollarSign,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  MetaPersonalizada, 
  MetaTipo, 
  MetaMetrica, 
  MetaPeriodo, 
  MetaLogica,
  generateMetaId 
} from "@/types/finance";

interface MetaPersonalizadaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: MetaPersonalizada | null;
  onSave: (meta: MetaPersonalizada) => void;
}

const TIPO_OPTIONS: { value: MetaTipo; label: string; icon: any; descricao: string }[] = [
  { value: 'valor_fixo', label: 'Valor Fixo', icon: DollarSign, descricao: 'Meta de atingir um valor específico' },
  { value: 'percentual', label: 'Percentual', icon: Percent, descricao: 'Meta baseada em percentual' },
  { value: 'economia', label: 'Economia', icon: PiggyBank, descricao: 'Percentual de economia sobre receita' },
  { value: 'categoria', label: 'Por Categoria', icon: BarChart3, descricao: 'Meta vinculada a uma categoria específica' },
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
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
];

const LOGICA_OPTIONS: { value: MetaLogica; label: string; icon: any; descricao: string }[] = [
  { value: 'maior_melhor', label: 'Maior é Melhor', icon: ArrowUpRight, descricao: 'Exemplo: Receita, Investimentos' },
  { value: 'menor_melhor', label: 'Menor é Melhor', icon: ArrowDownRight, descricao: 'Exemplo: Despesas, Gastos' },
];

const COR_OPTIONS = [
  { value: 'emerald', bg: 'bg-emerald-500' },
  { value: 'blue', bg: 'bg-blue-500' },
  { value: 'violet', bg: 'bg-violet-500' },
  { value: 'amber', bg: 'bg-amber-500' },
  { value: 'rose', bg: 'bg-rose-500' },
  { value: 'cyan', bg: 'bg-cyan-500' },
];

const ICONE_OPTIONS = [
  { value: 'target', icon: Target },
  { value: 'trending-up', icon: TrendingUp },
  { value: 'trending-down', icon: TrendingDown },
  { value: 'piggy-bank', icon: PiggyBank },
  { value: 'wallet', icon: Wallet },
  { value: 'sparkles', icon: Sparkles },
];

const DEFAULT_FORM_DATA: Partial<MetaPersonalizada> = {
  nome: '',
  descricao: '',
  tipo: 'valor_fixo',
  metrica: 'receita',
  valorAlvo: 0,
  categoriaId: undefined,
  periodoAvaliacao: 'mensal',
  logica: 'maior_melhor',
  cor: 'emerald',
  icone: 'target',
};

export function MetaPersonalizadaFormModal({ 
  open, 
  onOpenChange, 
  meta, 
  onSave 
}: MetaPersonalizadaFormModalProps) {
  const { categoriasV2 } = useFinance();
  const [formData, setFormData] = useState<Partial<MetaPersonalizada>>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (meta) {
        setFormData(meta);
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setErrors({});
    }
  }, [open, meta]);

  const handleTipoChange = (tipo: MetaTipo) => {
    const metricasDisponiveis = METRICA_OPTIONS.filter(m => m.tipos.includes(tipo));
    const novaMetrica = metricasDisponiveis.length > 0 ? metricasDisponiveis[0].value : 'receita';
    
    setFormData(prev => ({ 
      ...prev, 
      tipo,
      metrica: novaMetrica,
      categoriaId: tipo === 'categoria' ? prev.categoriaId : undefined,
    }));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nome?.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!formData.valorAlvo || formData.valorAlvo <= 0) {
      newErrors.valorAlvo = 'Valor alvo deve ser maior que zero';
    }
    if (formData.tipo === 'categoria' && !formData.categoriaId) {
      newErrors.categoriaId = 'Selecione uma categoria';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const metaCompleta: MetaPersonalizada = {
      id: meta?.id || generateMetaId(),
      nome: formData.nome!,
      descricao: formData.descricao,
      tipo: formData.tipo!,
      metrica: formData.metrica!,
      valorAlvo: formData.valorAlvo!,
      categoriaId: formData.categoriaId,
      periodoAvaliacao: formData.periodoAvaliacao!,
      logica: formData.logica!,
      ativo: meta?.ativo ?? true,
      criadoEm: meta?.criadoEm || new Date().toISOString(),
      cor: formData.cor,
      icone: formData.icone,
    };

    onSave(metaCompleta);
    onOpenChange(false);
  };

  const metricasDisponiveis = METRICA_OPTIONS.filter(m => m.tipos.includes(formData.tipo || 'valor_fixo'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,36rem)] max-h-[90vh] p-0 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl flex flex-col bg-card">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-8 pb-3 sm:pb-4 bg-gradient-to-br from-muted/80 to-muted/40 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Target className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black tracking-tight">
                {meta ? 'Editar Meta' : 'Nova Meta Personalizada'}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Configure sua meta financeira
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-5 sm:space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                Nome da Meta *
              </Label>
              <Input
                value={formData.nome || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Economizar 20% da renda"
                className={cn("h-11 sm:h-12 rounded-xl border-2 font-semibold", errors.nome && "border-destructive")}
              />
              {errors.nome && <p className="text-[10px] text-destructive font-bold">{errors.nome}</p>}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                Descrição (opcional)
              </Label>
              <Textarea
                value={formData.descricao || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o objetivo desta meta..."
                className="min-h-[70px] sm:min-h-[80px] rounded-xl border-2 text-sm resize-none"
              />
            </div>

            {/* Tipo de Meta */}
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                Tipo de Meta
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {TIPO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTipoChange(opt.value)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      formData.tipo === opt.value 
                        ? "border-primary bg-primary/5 shadow-md" 
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <opt.icon className={cn("w-4 h-4", formData.tipo === opt.value ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{opt.descricao}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Métrica */}
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                Métrica
              </Label>
              <Select
                value={formData.metrica}
                onValueChange={(v) => setFormData(prev => ({ ...prev, metrica: v as MetaMetrica }))}
              >
                <SelectTrigger className="h-11 sm:h-12 rounded-xl border-2">
                  <SelectValue placeholder="Selecione a métrica" />
                </SelectTrigger>
                <SelectContent>
                  {metricasDisponiveis.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria (se tipo = categoria) */}
            {formData.tipo === 'categoria' && (
              <div className="space-y-2">
                <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Categoria *
                </Label>
                <Select
                  value={formData.categoriaId || ''}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoriaId: v }))}
                >
                  <SelectTrigger className={cn("h-11 sm:h-12 rounded-xl border-2", errors.categoriaId && "border-destructive")}>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasV2.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span> {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoriaId && <p className="text-[10px] text-destructive font-bold">{errors.categoriaId}</p>}
              </div>
            )}

            {/* Valor Alvo */}
            <div className="space-y-2">
              <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                Valor Alvo *
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground/50">
                  {formData.tipo === 'percentual' || formData.tipo === 'economia' ? '%' : 'R$'}
                </span>
                <Input
                  type="number"
                  value={formData.valorAlvo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, valorAlvo: parseFloat(e.target.value) || 0 }))}
                  className={cn("h-11 sm:h-12 pl-10 rounded-xl border-2 font-bold text-lg", errors.valorAlvo && "border-destructive")}
                  placeholder="0"
                />
              </div>
              {errors.valorAlvo && <p className="text-[10px] text-destructive font-bold">{errors.valorAlvo}</p>}
            </div>

            {/* Período e Lógica */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Período
                </Label>
                <Select
                  value={formData.periodoAvaliacao}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, periodoAvaliacao: v as MetaPeriodo }))}
                >
                  <SelectTrigger className="h-11 sm:h-12 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODO_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Lógica
                </Label>
                <Select
                  value={formData.logica}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, logica: v as MetaLogica }))}
                >
                  <SelectTrigger className="h-11 sm:h-12 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGICA_OPTIONS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        <span className="flex items-center gap-2">
                          <l.icon className="w-3 h-3" /> {l.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cor e Ícone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Cor
                </Label>
                <div className="flex gap-2">
                  {COR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cor: c.value }))}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all",
                        c.bg,
                        formData.cor === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Ícone
                </Label>
                <div className="flex gap-2">
                  {ICONE_OPTIONS.map((i) => (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icone: i.value }))}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all",
                        formData.icone === i.value 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border/50 text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <i.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 bg-muted/30 border-t flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-full h-11 sm:h-12 px-6 sm:px-8 font-bold text-muted-foreground w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1 rounded-full h-11 sm:h-12 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" /> 
            {meta ? 'SALVAR ALTERAÇÕES' : 'CRIAR META'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
