import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pin, Trash2, Pencil, Search, Sparkles, Plus, ArrowLeft } from "lucide-react";
import { StandardizationRule, Categoria } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StandardizationRuleFormModal } from "./StandardizationRuleFormModal";
import { useFinance } from "@/contexts/FinanceContext";
import { Badge } from "@/components/ui/badge";
import { STANDARDIZABLE_OPERATIONS } from "./StandardizationRuleFormModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface StandardizationRuleManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: StandardizationRule[];
  onDeleteRule: (id: string) => void;
  categories: Categoria[];
  onCloseAndReturn?: () => void;
}

export function StandardizationRuleManagerModal({
  open,
  onOpenChange,
  rules,
  onDeleteRule,
  categories,
  onCloseAndReturn,
}: StandardizationRuleManagerModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { addStandardizationRule, updateStandardizationRule } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRule, setEditingRule] = useState<StandardizationRule | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => 
      r.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.descriptionTemplate.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);

  const handleDelete = (rule: StandardizationRule) => {
    if (window.confirm(`Excluir regra para "${rule.pattern}"?`)) {
      onDeleteRule(rule.id);
      toast.success("Regra removida.");
    }
  };

  const handleEdit = (rule: StandardizationRule) => {
    setEditingRule(rule);
    setShowFormModal(true);
  };

  const handleSaveRule = (data: Omit<StandardizationRule, "id">, ruleId?: string) => {
    if (ruleId) {
      updateStandardizationRule(ruleId, data);
      toast.success("Regra atualizada!");
    } else {
      addStandardizationRule(data);
      toast.success("Regra criada!");
    }
    setEditingRule(null);
  };

  const handleAddNew = () => {
    setEditingRule(null);
    setShowFormModal(true);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          hideCloseButton 
          fullscreen={isMobile}
          className={cn(
            "p-0 shadow-2xl bg-card flex flex-col z-[110]",
            !isMobile && "max-w-[min(95vw,56rem)] h-[min(90vh,800px)] rounded-[2.5rem]"
          )}
        >
          <DialogHeader className={cn(
            "px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 bg-surface-light dark:bg-surface-dark shrink-0 relative",
            isMobile && "pt-4"
          )}>
            {isMobile && (
              <Button variant="ghost" size="icon" className="absolute left-4 top-4 rounded-full h-10 w-10 z-10" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}
            
            <div className={cn(
              "flex flex-col gap-4",
              isMobile && "pl-12"
            )}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 flex-shrink-0">
                  <Pin className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight break-words">
                    Regras de Padronização
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5 sm:mt-1">
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent flex-shrink-0" />
                    Automação inteligente
                  </DialogDescription>
                </div>
              </div>
              
              <Button onClick={handleAddNew} className="rounded-full gap-2 px-4 sm:px-6 font-bold shadow-lg shadow-primary/10 w-full sm:w-auto h-11">
                <Plus className="w-4 h-4" /> Nova Regra
              </Button>
            </div>

            <div className="relative group mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar padrão..."
                className="w-full h-11 sm:h-12 pl-11 sm:pl-12 pr-4 bg-muted/50 border-2 border-transparent focus:border-primary/30 rounded-xl sm:rounded-2xl text-sm font-medium transition-all outline-none"
              />
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 sm:px-8 pb-8 overflow-x-hidden">
            <div className="space-y-3 max-w-full py-4">
              {filteredRules.map((rule) => {
                const category = rule.categoryId ? categoriesMap.get(rule.categoryId) : null;
                const operationConfig = STANDARDIZABLE_OPERATIONS.find(op => op.value === rule.operationType);
                
                return (
                  <div 
                    key={rule.id} 
                    className="p-4 rounded-3xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-4 max-w-full"
                  >
                    <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-black uppercase tracking-wider py-0 px-2 rounded-lg flex-shrink-0",
                          operationConfig?.color.replace('text-', 'bg-') + '/10',
                          operationConfig?.color
                        )}>
                          {operationConfig?.label || 'N/A'}
                        </Badge>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest break-words max-w-full" title={rule.pattern}>
                          Padrão: "{truncateText(rule.pattern, 70)}"
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
                        <p className="font-bold text-base text-foreground break-words max-w-full">
                          {rule.descriptionTemplate}
                        </p>
                        {category && (
                          <span className="text-[11px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg flex items-center gap-1 flex-shrink-0 w-fit mt-1 sm:mt-0">
                            {category.icon} {category.label}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0 self-start sm:self-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
                        onClick={() => handleEdit(rule)}
                        title="Editar regra"
                      >
                        <Pencil className="w-4.5 h-4.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                        onClick={() => handleDelete(rule)}
                        title="Excluir regra"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {filteredRules.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center opacity-30">
                  <Search className="w-12 h-12 mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Nenhuma regra encontrada</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className={cn("p-4 bg-muted/10 border-t shrink-0", isMobile && "hidden")}>
             <Button variant="ghost" onClick={() => { onOpenChange(false); onCloseAndReturn?.(); }} className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                FECHAR
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StandardizationRuleFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        initialRule={editingRule}
        categories={categories}
        onSave={handleSaveRule}
      />
    </>
  );
}