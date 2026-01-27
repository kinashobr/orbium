import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TrendingUp, TrendingDown, Repeat, Check, Sparkles, ArrowLeft } from "lucide-react";
import { Categoria, CategoryNature, generateCategoryId, getCategoryTypeFromNature } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [nature, setNature] = useState<CategoryNature>("despesa_variavel");

  const isEditing = !!category;

  // Body scroll lock for mobile fullscreen
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);

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
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[28rem] max-h-[90vh] rounded-[2rem]"
        )}
      >
        <DialogHeader 
          className="px-6 sm:px-8 pt-6 sm:pt-10 pb-6 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 relative"
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
        >
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="rounded-full h-10 w-10 shrink-0"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}

            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {isEditing ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Defina o Padrão Visual
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 sm:p-8 space-y-8 pb-32 sm:pb-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome da Categoria</Label>
              <Input
                placeholder="Ex: Alimentação"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-12 border-2 dark:border-white/10 rounded-2xl bg-card dark:bg-white/5 font-bold"
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
              <div className="p-4 rounded-3xl bg-muted/20 dark:bg-white/5 border border-border/40 dark:border-white/5 grid grid-cols-5 sm:grid-cols-6 gap-2">
                {(EMOJI_BY_CATEGORY[nature] || EMOJI_BY_CATEGORY.despesa_variavel).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      "w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center text-xl rounded-xl transition-all active:scale-95",
                      icon === emoji ? "bg-primary shadow-lg scale-110" : "hover:bg-card active:bg-card"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 dark:bg-black/20 border-t dark:border-white/5 shrink-0 flex flex-col-reverse sm:flex-row gap-3",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto">
              FECHAR
            </Button>
          )}
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Check className="w-5 h-5" />
            {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR CATEGORIA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}