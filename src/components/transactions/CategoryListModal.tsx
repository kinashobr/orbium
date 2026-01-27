import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tags, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Repeat, ArrowLeft, X } from "lucide-react";
import { Categoria, CategoryNature, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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

export function CategoryListModal({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  transactionCountByCategory
}: CategoryListModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
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
  
  const groupedCategories = {
    receita: categories.filter(c => c.nature === 'receita'),
    despesa_fixa: categories.filter(c => c.nature === 'despesa_fixa'),
    despesa_variavel: categories.filter(c => c.nature === 'despesa_variavel'),
  };

  const handleDelete = (category: Categoria) => {
    const count = transactionCountByCategory[category.id] || 0;
    if (count > 0) {
      toast.error(`A categoria "${category.label}" está em uso por ${count} transações.`);
      return;
    }
    if (confirm(`Excluir a categoria "${category.label}"?`)) {
      onDeleteCategory(category.id);
      toast.success("Categoria removida.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[26rem] h-[80vh] rounded-[2rem]"
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

            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl">
              <Tags className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Categorias</DialogTitle>
              <DialogDescription className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Classificação do Fluxo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 sm:px-8">
          <div className="space-y-8 py-6 pb-32 sm:pb-6">
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
                    <div key={cat.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-all group">
                      <div className="text-2xl w-10 h-10 flex items-center justify-center bg-muted/30 rounded-xl">
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground">{cat.label}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {transactionCountByCategory[cat.id] || 0} lançamentos
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted/50 hover:bg-primary/10 text-primary" onClick={() => onEditCategory(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted/50 hover:bg-destructive/10 text-destructive" onClick={() => handleDelete(cat)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 border-t flex flex-col sm:flex-row gap-3",
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
          <Button onClick={onAddCategory} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 order-1 sm:order-2">
            <Plus className="w-5 h-5" /> NOVA CATEGORIA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}