import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, TrendingUp, TrendingDown, Repeat, Check, Sparkles } from "lucide-react";
import { Categoria, CategoryNature, CATEGORY_NATURE_LABELS, generateCategoryId, getCategoryTypeFromNature } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Categoria;
  onSubmit: (category: Categoria) => void;
  onDelete?: (categoryId: string) => void;
  hasTransactions?: boolean;
}

const EMOJI_BY_CATEGORY = {
  receita: ["💰", "💳", "🏦", "📈", "💼", "🧑‍💻", "🎯", "🛠️", "📝"],
  despesa_fixa: ["🏠", "💊", "🛏️", "🔌", "📱", "🚗", "🧾", "🐶", "🍼", "🎓", "🛡️", "🏋️"],
  despesa_variavel: ["🍽️", "🍕", "☕", "🎮", "🎬", "🎧", "🎨", "🎥", "✈️", "⛽", "🛒", "👕", "📚", "🎁", "📦", "💸"]
};

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  onSubmit,
  onDelete,
  hasTransactions = false
}: CategoryFormModalProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [nature, setNature] = useState<CategoryNature>("despesa_variavel");

  const isEditing = !!category;

  useEffect(() => {
    if (open && category) {
      setLabel(category.label);
      setIcon(category.icon || "📦");
      setNature(category.nature || "despesa_variavel");
    } else if (open) {
      setLabel("");
      setIcon("📦");
      setNature("despesa_variavel");
    }
  }, [open, category]);

  const handleSubmit = () => {
    if (!label.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const newCategory: Categoria = {
      id: category?.id || generateCategoryId(),
      label: label.trim(),
      icon,
      nature,
      type: getCategoryTypeFromNature(nature)
    };

    onSubmit(newCategory);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,28rem)] p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl bg-background z-[130]">
        <DialogHeader className="px-8 pt-8 pb-6 bg-primary/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {isEditing ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Defina o Padrão Visual
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome da Categoria</Label>
            <Input
              placeholder="Ex: Alimentação"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-12 border-2 rounded-2xl bg-card font-bold"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Natureza do Fluxo</Label>
            <RadioGroup value={nature} onValueChange={(v) => setNature(v as CategoryNature)} className="grid grid-cols-1 gap-2">
              {[
                { id: 'receita', label: 'Receita', icon: TrendingUp, color: 'text-success', bg: 'bg-success/5' },
                { id: 'despesa_fixa', label: 'Despesa Fixa', icon: Repeat, color: 'text-primary', bg: 'bg-primary/5' },
                { id: 'despesa_variavel', label: 'Despesa Variável', icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/5' }
              ].map(opt => (
                <Label key={opt.id} className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                  nature === opt.id ? "border-primary bg-primary/5" : "border-border/40 bg-card hover:border-primary/30"
                )}>
                  <RadioGroupItem value={opt.id} className="sr-only" />
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", nature === opt.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <span className={cn("font-black text-sm uppercase tracking-wider", nature === opt.id ? "text-primary" : "text-muted-foreground")}>
                    {opt.label}
                  </span>
                  {nature === opt.id && <Check className="ml-auto w-5 h-5 text-primary" />}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Ícone (Emoji)</Label>
            <div className="p-4 rounded-3xl bg-muted/20 border border-border/40 grid grid-cols-6 gap-2">
              {(EMOJI_BY_CATEGORY[nature] || EMOJI_BY_CATEGORY.despesa_variavel).map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center text-xl rounded-xl transition-all",
                    icon === emoji ? "bg-primary shadow-lg scale-110" : "hover:bg-card"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-muted/10 border-t flex gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-6 font-bold text-muted-foreground">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Check className="w-5 h-5" />
            {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR CATEGORIA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}