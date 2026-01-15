import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tags, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Repeat, X } from "lucide-react";
import { Categoria, CategoryNature, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CategoryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Categoria[];
  onAddCategory: () => void;
  onEditCategory: (category: Categoria) => void;
  onDeleteCategory: (categoryId: string) => void;
  transactionCountByCategory: Record<string, number>;
}

const getNatureIcon = (nature: CategoryNature) => {
  switch (nature) {
    case 'receita': return <TrendingUp className="w-4 h-4 text-success" />;
    case 'despesa_fixa': return <Repeat className="w-4 h-4 text-primary" />;
    case 'despesa_variavel': return <TrendingDown className="w-4 h-4 text-destructive" />;
    default: return null;
  }
};

const getNatureBadgeColor = (nature: CategoryNature) => {
  switch (nature) {
    case 'receita': return 'bg-success/10 text-success';
    case 'despesa_fixa': return 'bg-primary/10 text-primary';
    case 'despesa_variavel': return 'bg-destructive/10 text-destructive';
    default: return '';
  }
};

export function CategoryListModal({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  transactionCountByCategory
}: CategoryListModalProps) {
  const groupedCategories = {
    receita: categories.filter(c => c.nature === 'receita'),
    despesa_fixa: categories.filter(c => c.nature === 'despesa_fixa'),
    despesa_variavel: categories.filter(c => c.nature === 'despesa_variavel'),
  };

  const handleDelete = (category: Categoria) => {
    const count = transactionCountByCategory[category.id] || 0;
    if (count > 0) {
      toast.error(`Não é possível excluir: ${count} transações usam esta categoria`);
      return;
    }
    if (confirm(`Excluir a categoria "${category.label}"?`)) {
      onDeleteCategory(category.id);
      toast.success("Categoria excluída!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,36rem)] h-[min(90vh,750px)] p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl bg-card dark:bg-[hsl(24_8%_14%)] flex flex-col">
        <DialogHeader className="px-8 pt-8 pb-4 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <Tags className="w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Categorias</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  Classificação do Fluxo
                </DialogDescription>
              </div>
            </div>
            <Button onClick={onAddCategory} size="sm" className="rounded-full h-10 px-5 font-bold gap-2">
              <Plus className="w-4 h-4" /> Nova
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 pb-4">
          <div className="space-y-8 py-6">
            {Object.entries(groupedCategories).map(([nature, list]) => (
              <div key={nature} className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  {getNatureIcon(nature as CategoryNature)}
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {CATEGORY_NATURE_LABELS[nature as CategoryNature]}
                  </h4>
                  <Badge variant="outline" className="ml-auto rounded-lg border-none bg-muted/50 text-[10px] font-bold">
                    {list.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {list.map(cat => (
                    <div key={cat.id} className="flex items-center gap-4 p-4 rounded-[1.75rem] bg-card dark:bg-white/5 border border-border/40 dark:border-white/5 hover:border-primary/30 transition-all group">
                      <div className="text-2xl w-10 h-10 flex items-center justify-center bg-muted/30 dark:bg-white/5 rounded-xl">
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground">{cat.label}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {transactionCountByCategory[cat.id] || 0} lançamentos
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => onEditCategory(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(cat)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-xs font-bold text-muted-foreground/50 text-center py-4 italic">Nenhuma categoria registrada</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/30 dark:bg-black/20 border-t border-border/40 dark:border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-full h-12 font-black text-sm text-muted-foreground hover:text-foreground">
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}