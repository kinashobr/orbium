import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  BookmarkCheck, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  ChevronDown, 
  Pencil 
} from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  BillDisplayItem, 
  Categoria, 
  ExpenseSnapshotItem, 
  MonthlyExpenseSnapshot,
  formatCurrency,
  generateBillId
} from "@/types/finance";
import { buildSnapshotFromBills, buildSnapshotFromItems } from "@/lib/expenseSnapshotHelper";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BudgetPopoverProps {
  currentDate: Date;
  combinedBills: BillDisplayItem[];
  hasSnapshot: boolean;
  monthSnapshot?: MonthlyExpenseSnapshot;
}

// Inline Currency Editor Component
interface InlineAmountProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

function InlineAmount({ value, onChange, className }: InlineAmountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [rawText, setRawText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const formattedDisplay = useMemo(() => {
    return (value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [value]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setRawText(value ? String(value).replace(".", ",") : "");
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    const cleaned = rawText.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    const validAmount = isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100;
    if (validAmount !== value) {
      onChange(validAmount);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("relative flex items-center w-24 shrink-0", className)}>
        <span className="absolute left-1.5 text-[10px] text-muted-foreground font-semibold pointer-events-none select-none">
          R$
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="h-7 w-full pl-6 pr-1.5 text-right text-xs font-semibold bg-background border border-primary/50 rounded-md outline-none ring-1 ring-primary/20"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      className={cn(
        "h-7 w-24 px-1.5 text-right text-xs font-semibold rounded-md border border-transparent hover:border-border/60 hover:bg-muted/40 transition-colors flex items-center justify-end truncate shrink-0",
        className
      )}
      title="Clique para editar valor"
    >
      <span className="text-[10px] text-muted-foreground mr-1 font-normal">R$</span>
      <span className="truncate">{formattedDisplay}</span>
    </button>
  );
}

export function BudgetPopover({
  currentDate,
  combinedBills,
  hasSnapshot,
  monthSnapshot,
}: BudgetPopoverProps) {
  const {
    categoriasV2,
    saveExpenseSnapshot,
    revenueForecasts,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
  } = useFinance();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ExpenseSnapshotItem[]>([]);
  const [revenue, setRevenue] = useState<number>(0);
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [revenueRawText, setRevenueRawText] = useState("");

  const monthKey = useMemo(() => format(currentDate, "yyyy-MM"), [currentDate]);
  const monthName = useMemo(() => format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }), [currentDate]);

  // Sync state on popover open
  useEffect(() => {
    if (!open) return;

    if (monthSnapshot?.items && monthSnapshot.items.length > 0) {
      setItems(monthSnapshot.items.map((it) => ({ ...it })));
      const snapRevenue = monthSnapshot.totalRevenue ?? revenueForecasts[monthKey] ?? getRevenueForPreviousMonth(currentDate);
      setRevenue(snapRevenue);
    } else {
      const fresh = buildSnapshotFromBills(currentDate, combinedBills, categoriasV2, monthSnapshot?.createdAt);
      setItems(fresh.items || []);
      const initRevenue = revenueForecasts[monthKey] || getRevenueForPreviousMonth(currentDate) || 0;
      setRevenue(initRevenue);
    }
  }, [open, monthSnapshot, currentDate, combinedBills, categoriasV2, revenueForecasts, monthKey, getRevenueForPreviousMonth]);

  // Category map for fast lookup
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Categoria>();
    categoriasV2.forEach((c) => map.set(c.id, c));
    return map;
  }, [categoriasV2]);

  // Check if a category is revenue
  const isRevenueCategory = useCallback((catId?: string | null) => {
    if (!catId) return false;
    const cat = categoriesMap.get(catId);
    return cat?.nature === "receita";
  }, [categoriesMap]);

  // Calculations for discrete header totals
  const { totalDespesa, totalReceita, saldo } = useMemo(() => {
    let despesaSum = 0;
    let revenueItemsSum = 0;

    items.forEach((item) => {
      const amt = Number(item.expectedAmount) || 0;
      if (isRevenueCategory(item.categoryId)) {
        revenueItemsSum += amt;
      } else {
        despesaSum += amt;
      }
    });

    // If there are revenue items, add them to total revenue; otherwise use revenue forecast
    const finalRevenue = revenueItemsSum > 0 ? revenue + revenueItemsSum : revenue;
    const finalSaldo = finalRevenue - despesaSum;

    return {
      totalDespesa: despesaSum,
      totalReceita: finalRevenue,
      saldo: finalSaldo,
    };
  }, [items, revenue, isRevenueCategory]);

  // Update item fields inline
  const handleUpdateItem = (id: string, updates: Partial<ExpenseSnapshotItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          if (updates.categoryId !== undefined) {
            const cat = updates.categoryId ? categoriesMap.get(updates.categoryId) : undefined;
            updated.categoryName = cat?.label || "Outros";
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Inline add new item
  const handleAddItem = () => {
    const newItem: ExpenseSnapshotItem = {
      id: generateBillId(),
      description: "",
      expectedAmount: 0,
      categoryName: "Outros",
      categoryId: null,
      dueDate: `${monthKey}-01`,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Reset from current month bills
  const handleResetFromBills = () => {
    const fresh = buildSnapshotFromBills(currentDate, combinedBills, categoriasV2, monthSnapshot?.createdAt);
    setItems(fresh.items || []);
    toast.info("Itens recarregados com base nas contas cadastradas do mês.");
  };

  // Revenue inline edit commit
  const handleCommitRevenue = () => {
    setIsEditingRevenue(false);
    const cleaned = revenueRawText.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    const valid = isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100;
    setRevenue(valid);
  };

  // Save budget
  const handleSaveBudget = () => {
    const validItems = items.filter((it) => it.description.trim() !== "" || it.expectedAmount > 0);
    const snapshot = buildSnapshotFromItems(
      currentDate,
      validItems,
      categoriasV2,
      totalReceita,
      monthSnapshot?.createdAt
    );

    saveExpenseSnapshot(snapshot);
    if (totalReceita > 0) {
      setMonthlyRevenueForecast(monthKey, totalReceita);
    }

    toast.success(
      hasSnapshot
        ? `Orçamento de ${monthName} atualizado com sucesso!`
        : `Orçamento de ${monthName} fixado com sucesso!`
    );
    setOpen(false);
  };

  const getCategoryBadgeClass = (category?: Categoria) => {
    if (!category) {
      return "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70";
    }
    switch (category.nature) {
      case "receita":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20";
      case "despesa_fixa":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20";
      case "despesa_variavel":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-full gap-2 px-4 border-border/40 bg-card/50 backdrop-blur-sm text-xs font-bold hover:bg-muted/40 transition-colors shadow-sm"
          title={
            hasSnapshot
              ? `Orçamento fixado em ${format(new Date(monthSnapshot!.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. Clique para atualizar.`
              : "Fixar ou ajustar orçamento com as contas do mês"
          }
        >
          <BookmarkCheck className="w-4 h-4 text-primary" />
          <span>{hasSnapshot ? "Atualizar Orçamento" : "Fixar Orçamento"}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[360px] sm:w-[480px] max-w-[95vw] p-3 sm:p-4 rounded-2xl shadow-2xl border-border/50 bg-card text-card-foreground z-[120]"
      >
        {/* Minimalist Header with Discrete Totals (sem títulos ou descrições prolixas) */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 dark:bg-muted/20 rounded-xl text-xs border border-border/40 mb-3">
          {/* Receita Discreta */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Receita
            </span>
            {isEditingRevenue ? (
              <input
                type="text"
                inputMode="decimal"
                value={revenueRawText}
                onChange={(e) => setRevenueRawText(e.target.value)}
                onBlur={handleCommitRevenue}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitRevenue();
                  if (e.key === "Escape") setIsEditingRevenue(false);
                }}
                className="w-20 h-6 px-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-background border border-primary/40 rounded outline-none"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditingRevenue(true);
                  setRevenueRawText(revenue ? String(revenue).replace(".", ",") : "");
                }}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 truncate text-xs"
                title="Editar previsão de receita"
              >
                <span>{formatCurrency(totalReceita)}</span>
                <Pencil className="w-2.5 h-2.5 opacity-40 hover:opacity-100 shrink-0" />
              </button>
            )}
          </div>

          <div className="h-3 w-px bg-border/60 mx-1 shrink-0" />

          {/* Despesa Discreta */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Despesa
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 truncate">
              {formatCurrency(totalDespesa)}
            </span>
          </div>

          <div className="h-3 w-px bg-border/60 mx-1 shrink-0" />

          {/* Saldo Discreto */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Saldo
            </span>
            <span
              className={cn(
                "font-bold truncate",
                saldo >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {formatCurrency(saldo)}
            </span>
          </div>
        </div>

        {/* Items List with Inline Edit */}
        <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1 py-0.5">
          {items.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum item no orçamento. Adicione abaixo.
            </div>
          ) : (
            items.map((item) => {
              const selectedCategory = item.categoryId ? categoriesMap.get(item.categoryId) : undefined;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  {/* Nomenclatura inline */}
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                    placeholder="Nome do item..."
                    className="h-7 text-xs font-medium bg-muted/20 hover:bg-muted/50 focus:bg-background border border-transparent focus:border-primary/40 rounded-md px-2 flex-1 min-w-[100px] outline-none transition-colors truncate focus:text-clip"
                  />

                  {/* Seleção da Categoria inline */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "h-7 px-2 text-[11px] font-medium rounded-md flex items-center gap-1 max-w-[125px] shrink-0 border transition-colors truncate",
                          getCategoryBadgeClass(selectedCategory)
                        )}
                        title={selectedCategory ? selectedCategory.label : "Selecionar categoria"}
                      >
                        <span className="shrink-0 text-xs">{selectedCategory?.icon || "🏷️"}</span>
                        <span className="truncate">{selectedCategory?.label || "Sem cat."}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-56 p-1 z-[150] shadow-xl max-h-[260px] overflow-y-auto rounded-xl"
                    >
                      <DropdownMenuItem
                        onSelect={() => handleUpdateItem(item.id, { categoryId: null, categoryName: "Outros" })}
                        className="text-xs cursor-pointer rounded-lg flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">-- Sem Categoria --</span>
                        {!item.categoryId && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {categoriasV2.map((cat) => (
                        <DropdownMenuItem
                          key={cat.id}
                          onSelect={() => handleUpdateItem(item.id, { categoryId: cat.id, categoryName: cat.label })}
                          className="text-xs cursor-pointer rounded-lg flex items-center justify-between py-1.5"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>{cat.icon || "🏷️"}</span>
                            <span className="truncate">{cat.label}</span>
                          </div>
                          {item.categoryId === cat.id && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Valor inline */}
                  <InlineAmount
                    value={item.expectedAmount}
                    onChange={(val) => handleUpdateItem(item.id, { expectedAmount: val })}
                  />

                  {/* Excluir item */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Remover item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Botão inline para Adicionar Novo Item */}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-semibold text-primary/90 hover:text-primary hover:bg-primary/5 border border-dashed border-primary/30 rounded-lg transition-colors mt-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar item</span>
        </button>

        {/* Minimalist Footer Bar */}
        <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-border/40">
          <button
            type="button"
            onClick={handleResetFromBills}
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            title="Recarregar do extrato de despesas cadastradas no mês"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Recarregar contas</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-7 text-xs px-2.5 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBudget}
              className="h-7 text-xs px-3.5 rounded-lg font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Orçamento</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
