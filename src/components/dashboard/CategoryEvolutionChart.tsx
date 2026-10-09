"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  format,
  eachMonthOfInterval
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { cn, parseDateLocal } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  TrendingDown, 
  Filter, 
  Sparkles, 
  X, 
  Search, 
  SlidersHorizontal,
  RotateCcw
} from "lucide-react";

// Paleta expandida com cores vibrantes e contrastantes
const EXPENSE_PALETTE = [
  "#6366F1", // Indigo
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#84CC16", // Lime
  "#A855F7", // Violet
  "#E11D48", // Rose
  "#0EA5E9", // Sky
  "#D97706", // Dark Amber
  "#059669", // Dark Emerald
  "#7C3AED", // Deep Violet
  "#DB2777", // Deep Pink
  "#2563EB", // Royal Blue
  "#4F46E5", // Deep Indigo
  "#65A30D", // Olive Lime
  "#0891B2", // Deep Cyan
  "#C026D3", // Fuchsia
  "#EA580C", // Deep Orange
  "#475569", // Slate
  "#9333EA", // Bright Purple
  "#16A34A", // Green
  "#0284C7", // Cerulean
  "#B45309", // Bronze
  "#64748B", // Cool Gray
];

const getCategoryColor = (index: number, customColor?: string) => {
  if (customColor && customColor.startsWith("#")) return customColor;
  return EXPENSE_PALETTE[index % EXPENSE_PALETTE.length];
};

export interface ProcessedCategory {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  nature?: string;
  totalInPeriod: number;
  percentageOfTotal: number;
  colorHex: string;
}

export const CategoryEvolutionChart = () => {
  const { transacoesV2, categoriasV2 } = useFinance();
  const [period, setPeriod] = useState("6");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  
  // Lista explícita de categorias selecionadas (por Label) no filtro do Popover
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasUserCustomizedFilter, setHasUserCustomizedFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // NOVO: Categorias tornadas "opacas / ocultadas do cálculo" (Set de labels)
  const [dimmedCategories, setDimmedCategories] = useState<Set<string>>(new Set());

  // Handler para alternar estado opaco/ativo de uma categoria
  const handleToggleDimmed = useCallback((label: string) => {
    setDimmedCategories(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  // Double-click tracker robusto com ref para resposta instantânea e precisa no 2º clique
  const clickTrackerRef = useRef<{ label: string; time: number }>({ label: "", time: 0 });

  const handleCategoryClick = useCallback((label: string) => {
    const now = Date.now();
    const prev = clickTrackerRef.current;
    const diff = now - prev.time;

    // Se o usuário clicou 2 vezes na mesma categoria em um intervalo de até 500ms
    if (prev.label === label && diff <= 500 && diff >= 20) {
      clickTrackerRef.current = { label: "", time: 0 };
      handleToggleDimmed(label);
    } else {
      clickTrackerRef.current = { label, time: now };
    }
  }, [handleToggleDimmed]);

  const handleClearAllDimmed = useCallback(() => {
    setDimmedCategories(new Set());
  }, []);

  // 1. Processamento de dados e todas as categorias ativas no período
  const { 
    chartData, 
    allActiveCategories, 
    totalPeriodExpense 
  } = useMemo(() => {
    const end = new Date();
    const monthsCount = parseInt(period, 10) || 6;
    const start = subMonths(end, monthsCount - 1);
    const months = eachMonthOfInterval({ start, end });

    // Mapear categorias de despesa
    const expenseCategoriesMap = new Map<string, { id: string; label: string; icon?: string; color?: string; nature?: string }>();

    categoriasV2.forEach(cat => {
      const isExpense = cat.nature === 'despesa_fixa' || 
                        cat.nature === 'despesa_variavel' || 
                        cat.nature !== 'receita' || 
                        cat.type === 'expense';
      if (isExpense) {
        expenseCategoriesMap.set(cat.id, {
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          color: (cat as any).color,
          nature: cat.nature
        });
      }
    });

    // Transações com categorias personalizadas
    transacoesV2.forEach(tx => {
      const isExpenseTx = tx.operationType === 'despesa' || 
                          tx.operationType === 'pagamento_emprestimo' || 
                          tx.operationType === 'veiculo' || 
                          tx.flow === 'out';
      if (isExpenseTx && tx.categoryId) {
        if (!expenseCategoriesMap.has(tx.categoryId)) {
          const registered = categoriasV2.find(c => c.id === tx.categoryId || c.label === tx.categoryId);
          if (registered) {
            expenseCategoriesMap.set(registered.id, {
              id: registered.id,
              label: registered.label,
              icon: registered.icon,
              color: (registered as any).color,
              nature: registered.nature
            });
          } else {
            expenseCategoriesMap.set(tx.categoryId, {
              id: tx.categoryId,
              label: tx.categoryId,
              icon: "📦",
              nature: "despesa_variavel"
            });
          }
        }
      }
    });

    const allExpenseCats = Array.from(expenseCategoriesMap.values());

    // Histórico e atividade real
    const catActivity = allExpenseCats.map(cat => {
      const txs = transacoesV2.filter(tx => {
        const matches = tx.categoryId === cat.id || tx.categoryId === cat.label;
        if (!matches) return false;
        if (tx.operationType === 'receita' || tx.operationType === 'rendimento' || tx.operationType === 'liberacao_emprestimo') {
          return false;
        }
        return (tx.amount || 0) > 0;
      });

      if (txs.length === 0) {
        return { cat, txs: [], firstDate: null, lastDate: null, totalInPeriod: 0 };
      }

      const timestamps = txs.map(t => parseDateLocal(t.date).getTime()).sort((a, b) => a - b);
      const firstDate = new Date(timestamps[0]);
      const lastDate = new Date(timestamps[timestamps.length - 1]);

      return { cat, txs, firstDate, lastDate, totalInPeriod: 0 };
    });

    // Apenas categorias com movimentação no período visível
    const startOfPeriod = startOfMonth(start);
    const endOfPeriod = endOfMonth(end);

    const activeInPeriod = catActivity.filter(item => {
      if (!item.firstDate || !item.lastDate) return false;
      return item.txs.some(tx => {
        const d = parseDateLocal(tx.date);
        return d >= startOfPeriod && d <= endOfPeriod;
      });
    });

    let grandTotal = 0;
    const categoryMonthlyTotals = new Map<string, number[]>();

    activeInPeriod.forEach(item => {
      const { cat, txs } = item;
      const totals = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        return txs
          .filter(tx => {
            const d = parseDateLocal(tx.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce((acc, tx) => acc + (tx.amount || 0), 0);
      });
      categoryMonthlyTotals.set(cat.id, totals);
    });

    const data = months.map((month, monthIndex) => {
      const monthKey = format(month, "MMM/yy", { locale: ptBR });
      const point: Record<string, string | number | null> = { name: monthKey };

      activeInPeriod.forEach(item => {
        const { cat } = item;
        const totals = categoryMonthlyTotals.get(cat.id) || [];
        const currentMonthTotal = totals[monthIndex] || 0;

        if (currentMonthTotal > 0) {
          point[cat.label] = currentMonthTotal;
          item.totalInPeriod += currentMonthTotal;
          grandTotal += currentMonthTotal;
        } else {
          let prevMonthTotal = 0;
          if (monthIndex > 0) {
            prevMonthTotal = totals[monthIndex - 1] || 0;
          } else {
            const prevMonthStart = startOfMonth(subMonths(start, 1));
            const prevMonthEnd = endOfMonth(subMonths(start, 1));
            prevMonthTotal = item.txs
              .filter(tx => {
                const d = parseDateLocal(tx.date);
                return d >= prevMonthStart && d <= prevMonthEnd;
              })
              .reduce((acc, tx) => acc + (tx.amount || 0), 0);
          }

          if (prevMonthTotal > 0) {
            point[cat.label] = 0;
          } else {
            point[cat.label] = null;
          }
        }
      });

      return point;
    });

    // Ordenar todas as categorias com movimentação pelo maior valor total no período
    const sortedCats = activeInPeriod
      .sort((a, b) => b.totalInPeriod - a.totalInPeriod);

    // Mapeamento estável de cores por categoria
    const colorMap = new Map<string, string>();
    sortedCats.forEach((item, index) => {
      const colorHex = getCategoryColor(index, item.cat.color);
      colorMap.set(item.cat.id, colorHex);
      colorMap.set(item.cat.label, colorHex);
    });

    const processedCategories: ProcessedCategory[] = sortedCats.map((item, index) => {
      const colorHex = colorMap.get(item.cat.id) || getCategoryColor(index, item.cat.color);
      return {
        id: item.cat.id,
        label: item.cat.label,
        icon: item.cat.icon,
        nature: item.cat.nature,
        color: item.cat.color,
        totalInPeriod: item.totalInPeriod,
        percentageOfTotal: grandTotal > 0 ? (item.totalInPeriod / grandTotal) * 100 : 0,
        colorHex
      };
    });

    return { 
      chartData: data, 
      allActiveCategories: processedCategories,
      totalPeriodExpense: grandTotal
    };
  }, [transacoesV2, categoriasV2, period]);

  // 2. Inicialização padrão: TODAS as categorias visíveis por padrão
  useEffect(() => {
    if (allActiveCategories.length === 0) {
      setSelectedCategories([]);
      return;
    }

    if (!hasUserCustomizedFilter) {
      // Por padrão, TODAS as categorias do período ficam visíveis e selecionadas
      setSelectedCategories(allActiveCategories.map(c => c.label));
    } else {
      setSelectedCategories(prev => {
        const valid = prev.filter(label => allActiveCategories.some(c => c.label === label));
        if (valid.length === 0 && allActiveCategories.length > 0) {
          return allActiveCategories.map(c => c.label);
        }
        return valid;
      });
    }
  }, [allActiveCategories, hasUserCustomizedFilter]);

  // Categorias visíveis conforme filtro do Popover
  const visibleCategories = useMemo(() => {
    return allActiveCategories.filter(cat => selectedCategories.includes(cat.label));
  }, [allActiveCategories, selectedCategories]);

  // Categorias ativas no cálculo (Visíveis + NÃO Opacas)
  const activeCalculatedCategories = useMemo(() => {
    return visibleCategories.filter(cat => !dimmedCategories.has(cat.label));
  }, [visibleCategories, dimmedCategories]);

  // Total recalculado considerando APENAS categorias ativas no cálculo
  const calculatedTotalPeriodExpense = useMemo(() => {
    return activeCalculatedCategories.reduce((acc, cat) => acc + cat.totalInPeriod, 0);
  }, [activeCalculatedCategories]);

  // Média mensal recalculada
  const monthsCount = parseInt(period, 10) || 6;
  const calculatedAverageMonthly = useMemo(() => {
    return monthsCount > 0 ? calculatedTotalPeriodExpense / monthsCount : 0;
  }, [calculatedTotalPeriodExpense, monthsCount]);

  // Escala dinâmica Y-Axis baseada apenas nas categorias ativas no cálculo
  const maxYValue = useMemo(() => {
    if (activeCalculatedCategories.length === 0) return 'auto';
    
    let max = 0;
    chartData.forEach(point => {
      activeCalculatedCategories.forEach(cat => {
        const val = point[cat.label];
        if (typeof val === 'number' && val > max) {
          max = val;
        }
      });
    });
    
    return max > 0 ? Math.ceil(max * 1.1) : 'auto';
  }, [chartData, activeCalculatedCategories]);

  // Categorias filtradas pela barra de busca no popover
  const searchFilteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return allActiveCategories;
    const term = searchTerm.toLowerCase();
    return allActiveCategories.filter(cat => 
      cat.label.toLowerCase().includes(term) ||
      (cat.nature && cat.nature.toLowerCase().includes(term))
    );
  }, [allActiveCategories, searchTerm]);

  // Handlers para seleção no Popover
  const handleToggleCategory = (label: string) => {
    setHasUserCustomizedFilter(true);
    setSelectedCategories(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  const handleSelectAll = () => {
    setHasUserCustomizedFilter(true);
    setSelectedCategories(allActiveCategories.map(c => c.label));
  };

  const handleClearAll = () => {
    setHasUserCustomizedFilter(true);
    setSelectedCategories([]);
  };

  const handleSelectTop = (count: number) => {
    setHasUserCustomizedFilter(true);
    setSelectedCategories(allActiveCategories.slice(0, count).map(c => c.label));
  };

  const handleIsolateCategory = (label: string) => {
    setHasUserCustomizedFilter(true);
    setSelectedCategories([label]);
  };

  const handleResetFilter = () => {
    setHasUserCustomizedFilter(false);
    setSelectedCategories(allActiveCategories.map(c => c.label));
  };

  const isAllSelected = allActiveCategories.length > 0 && selectedCategories.length === allActiveCategories.length;
  const isTop5Active = allActiveCategories.length > 5 && 
    selectedCategories.length === 5 && 
    allActiveCategories.slice(0, 5).every(c => selectedCategories.includes(c.label));

  // Custom Tooltip com recalculo dinâmico excluindo categorias opacas
  const CustomTooltip = ({ 
    active, 
    payload, 
    label 
  }: { 
    active?: boolean; 
    payload?: Array<{ 
      name: string; 
      value: number | null | undefined; 
      color: string;
      dataKey: string;
    }>; 
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const validEntries = payload
      .filter(entry => entry.value !== null && entry.value !== undefined && typeof entry.value === 'number' && entry.value > 0)
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

    // Separar entre ativas no cálculo e opacas/fora do cálculo
    const nonDimmedEntries = validEntries.filter(entry => !dimmedCategories.has(entry.name));
    const dimmedEntries = validEntries.filter(entry => dimmedCategories.has(entry.name));

    // Total do mês recalculado APENAS com categorias ativas
    const monthTotalActive = nonDimmedEntries.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    // Linha selecionada / hover individual
    if (hoveredCategory) {
      const specificEntry = payload.find(
        entry => entry.name === hoveredCategory || entry.dataKey === hoveredCategory
      );

      const isNumeric = specificEntry && 
        specificEntry.value !== null && 
        specificEntry.value !== undefined && 
        typeof specificEntry.value === 'number';

      const hasPositiveValue = isNumeric && (specificEntry.value as number) > 0;
      const catObj = allActiveCategories.find(c => c.label === hoveredCategory);
      const catColor = catObj?.colorHex || specificEntry?.color || "#6366F1";
      const isCategoryDimmed = dimmedCategories.has(hoveredCategory);

      return (
        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-xl border border-border space-y-2 min-w-[240px] max-w-[340px] animate-in fade-in zoom-in-95 duration-150 z-50">
          <div className="flex items-center justify-between border-b border-border/20 pb-1.5 gap-2">
            <span className="text-xs font-black text-foreground uppercase tracking-widest">{label}</span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
              isCategoryDimmed 
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-primary/10 text-primary border-primary/20"
            )}>
              {isCategoryDimmed ? "Opaca (Fora do Cálculo)" : "Destaque"}
            </span>
          </div>

          {hasPositiveValue ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: catColor, opacity: isCategoryDimmed ? 0.3 : 1 }} 
                />
                <span className={cn(
                  "text-sm font-black truncate",
                  isCategoryDimmed ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {catObj?.icon ? `${catObj.icon} ` : ''}{hoveredCategory}
                </span>
              </div>
              <div className={cn(
                "text-2xl font-display font-black tabular-nums pt-0.5",
                isCategoryDimmed ? "text-muted-foreground/60" : "text-foreground"
              )}>
                {formatCurrency(Number(specificEntry?.value))}
              </div>

              {isCategoryDimmed ? (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 mt-1">
                  ⚠️ Ocultada dos cálculos. Dê 2 cliques para reativar no gráfico.
                </p>
              ) : monthTotalActive > 0 && (
                <p className="text-xs font-semibold text-muted-foreground pt-0.5">
                  Representa <strong className="text-foreground">{((Number(specificEntry?.value) / monthTotalActive) * 100).toFixed(1)}%</strong> do total ativo em {label} ({formatCurrency(monthTotalActive)})
                </p>
              )}
            </div>
          ) : (
            <div className="pt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: catColor, opacity: isCategoryDimmed ? 0.3 : 1 }} 
                />
                <span className="font-bold text-foreground truncate">
                  {catObj?.icon ? `${catObj.icon} ` : ''}{hoveredCategory}
                </span>
              </div>
              <p className="text-xs italic text-muted-foreground">Sem movimentação neste mês.</p>
            </div>
          )}
        </div>
      );
    }

    const isMultiColumn = validEntries.length > 6;

    return (
      <div className={cn(
        "bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-xl border border-border space-y-2.5 pointer-events-none transition-all duration-150 z-50",
        isMultiColumn ? "min-w-[360px] max-w-[500px]" : "min-w-[260px] max-w-[360px]"
      )}>
        <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-1 gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-foreground uppercase tracking-widest">{label}</p>
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-muted/40">
              {nonDimmedEntries.length} {nonDimmedEntries.length === 1 ? 'ativa' : 'ativas'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block leading-none">Total Ativo:</span>
            <strong className="text-sm font-black text-foreground">{formatCurrency(monthTotalActive)}</strong>
          </div>
        </div>

        {nonDimmedEntries.length === 0 && dimmedEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">Nenhuma despesa nesta data.</p>
        ) : (
          <div className="space-y-2">
            {/* Lista de Categorias Ativas no Cálculo */}
            {nonDimmedEntries.length > 0 && (
              <div className={cn(
                isMultiColumn 
                  ? "grid grid-cols-2 gap-x-4 gap-y-2" 
                  : "space-y-1.5"
              )}>
                {nonDimmedEntries.map((entry, index) => {
                  const perc = monthTotalActive > 0 ? (Number(entry.value) / monthTotalActive) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center justify-between gap-2 text-xs py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: entry.color }} 
                        />
                        <span className="text-xs font-bold text-foreground truncate" title={entry.name}>
                          {entry.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {perc.toFixed(0)}%
                        </span>
                        <span className="font-black text-foreground tabular-nums text-xs">
                          {formatCurrency(Number(entry.value))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lista de Categorias Opacas / Ocultadas do Cálculo */}
            {dimmedEntries.length > 0 && (
              <div className="pt-2 border-t border-border/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                  Opacas / Fora do Cálculo ({dimmedEntries.length}):
                </span>
                {dimmedEntries.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 text-[11px] opacity-50 py-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: entry.color }} 
                      />
                      <span className="line-through text-muted-foreground truncate" title={entry.name}>
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-semibold text-muted-foreground tabular-nums">
                      {formatCurrency(Number(entry.value))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header com Controles e Botão de Filtro Dinâmico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Evolução das Despesas
            </h3>
            {allActiveCategories.length > 0 && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors px-2 py-0.5",
                  selectedCategories.length < allActiveCategories.length
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground border-border/40 bg-muted/20"
                )}
              >
                {selectedCategories.length === allActiveCategories.length ? (
                  `Todas (${allActiveCategories.length})`
                ) : (
                  `${selectedCategories.length} de ${allActiveCategories.length} exibidas`
                )}
              </Badge>
            )}
            {dimmedCategories.size > 0 && (
              <button
                type="button"
                onClick={handleClearAllDimmed}
                className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                title="Restaurar todas as categorias para o cálculo e cor normal"
              >
                <RotateCcw className="w-3 h-3" />
                {dimmedCategories.size} opaca(s) · Restaurar
              </button>
            )}
          </div>
        </div>

        {/* Barra de Ações: Filtro Dinâmico + Seletor de Período */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap max-w-full">
          {/* Botão de Filtro Dinâmico de Categorias */}
          {allActiveCategories.length > 0 && (
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <button 
                  className={cn(
                    "h-9 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 border shadow-xs max-w-full",
                    selectedCategories.length < allActiveCategories.length
                      ? "bg-primary text-primary-foreground border-primary shadow-sm hover:brightness-110"
                      : "bg-surface-light dark:bg-surface-dark text-foreground border-border/40 hover:border-primary/40 hover:text-primary"
                  )}
                  title="Filtrar categorias para visualização no gráfico"
                >
                  <Filter className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Filtrar Categorias</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none shrink-0",
                    selectedCategories.length < allActiveCategories.length
                      ? "bg-black/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {selectedCategories.length}/{allActiveCategories.length}
                  </span>
                </button>
              </PopoverTrigger>

              <PopoverContent 
                className="w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] p-0 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border shadow-2xl overflow-hidden z-[100]" 
                align="end"
                sideOffset={8}
                collisionPadding={16}
              >
                {/* Header do Popover Sem Translucidez */}
                <div className="p-3.5 border-b border-border/40 bg-muted/30">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-black text-xs sm:text-sm text-foreground tracking-tight truncate">Filtrar Despesas</h4>
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                          {selectedCategories.length} de {allActiveCategories.length} selecionadas
                        </p>
                      </div>
                    </div>

                    {selectedCategories.length !== allActiveCategories.length && (
                      <button 
                        onClick={handleResetFilter}
                        className="text-[11px] font-bold text-primary hover:bg-primary/10 border border-primary/25 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg transition-all shrink-0"
                        title="Restaurar todas as categorias"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Todas
                      </button>
                    )}
                  </div>

                  {/* Campo de Busca Rápida */}
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por categoria..."
                      className="h-8 pl-8 pr-7 text-xs bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl w-full"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Chips de Atalho / Presets */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border/20 overflow-x-auto no-scrollbar w-full">
                    {allActiveCategories.length > 5 && (
                      <button
                        onClick={() => handleSelectTop(5)}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer border",
                          isTop5Active 
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs" 
                            : "bg-surface-light dark:bg-surface-dark text-muted-foreground hover:text-foreground border-border/40 hover:bg-muted/40"
                        )}
                      >
                        <Sparkles className="w-3 h-3" />
                        Top 5
                      </button>
                    )}

                    {allActiveCategories.length > 3 && (
                      <button
                        onClick={() => handleSelectTop(3)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider transition-all bg-surface-light dark:bg-surface-dark text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40 shrink-0 cursor-pointer"
                      >
                        Top 3
                      </button>
                    )}

                    <button
                      onClick={handleSelectAll}
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider transition-all shrink-0 cursor-pointer border",
                        isAllSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                          : "bg-surface-light dark:bg-surface-dark text-muted-foreground hover:text-foreground border-border/40 hover:bg-muted/40"
                      )}
                    >
                      Todas
                    </button>

                    <button
                      onClick={handleClearAll}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider transition-all bg-surface-light dark:bg-surface-dark text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40 shrink-0 cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Lista de Categorias Simplificada */}
                <ScrollArea className="h-72 sm:h-80 p-2.5 w-full">
                  {searchFilteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                      <Search className="w-6 h-6 mb-2 opacity-30" />
                      <p className="text-xs font-semibold text-foreground">Nenhuma categoria encontrada</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Tente buscar por outro termo</p>
                    </div>
                  ) : (
                    <div className="space-y-1 w-full min-w-0">
                      {searchFilteredCategories.map((cat) => {
                        const isChecked = selectedCategories.includes(cat.label);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleToggleCategory(cat.label)}
                            onMouseEnter={() => setHoveredCategory(cat.label)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className={cn(
                              "group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer select-none border w-full min-w-0 overflow-hidden",
                              isChecked
                                ? "bg-primary/10 dark:bg-primary/20 border-primary/30 shadow-2xs"
                                : "bg-muted/10 hover:bg-muted/30 border-border/30 hover:border-border/70"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <Checkbox 
                                checked={isChecked} 
                                onCheckedChange={() => handleToggleCategory(cat.label)}
                                className={cn(
                                  "h-4 w-4 rounded-md transition-all shrink-0",
                                  isChecked 
                                    ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                                    : "border-border/80 hover:border-primary/60 bg-background"
                                )}
                              />

                              <div 
                                className={cn(
                                  "w-3 h-3 rounded-full shrink-0 transition-transform duration-200 border border-white/20",
                                  isChecked ? "ring-2 ring-primary/20 scale-105" : "opacity-70"
                                )}
                                style={{ backgroundColor: cat.colorHex }} 
                              />

                              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                {cat.icon && <span className="text-xs shrink-0">{cat.icon}</span>}
                                <span 
                                  className={cn(
                                    "text-xs truncate min-w-0 flex-1 block",
                                    isChecked ? "text-foreground font-black" : "text-foreground/80 group-hover:text-foreground font-bold"
                                  )}
                                  title={cat.label}
                                >
                                  {cat.label}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIsolateCategory(cat.label);
                                }}
                                className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-background hover:bg-primary hover:text-white border border-border/60 hover:border-primary text-muted-foreground transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                                title="Visualizar apenas esta categoria"
                              >
                                Só esta
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <ScrollBar orientation="vertical" className="w-2 p-0.5" />
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}

          {/* Seletor de Período */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[135px] sm:w-[145px] h-9 text-xs font-black uppercase tracking-widest bg-surface-light dark:bg-surface-dark border-border/40 rounded-xl">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3" className="text-xs font-bold uppercase tracking-widest">Últimos 3 meses</SelectItem>
              <SelectItem value="6" className="text-xs font-bold uppercase tracking-widest">Últimos 6 meses</SelectItem>
              <SelectItem value="12" className="text-xs font-bold uppercase tracking-widest">Últimos 12 meses</SelectItem>
              <SelectItem value="24" className="text-xs font-bold uppercase tracking-widest">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Container Principal do Gráfico */}
      <div className="relative overflow-hidden bg-surface-light dark:bg-surface-dark rounded-[32px] p-6 shadow-soft border border-white/60 dark:border-white/5">
        <div className="relative z-10 h-[420px] w-full">
          {allActiveCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-muted/10 flex items-center justify-center border border-dashed border-border/40">
                <TrendingDown className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Nenhuma despesa encontrada no período</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  As categorias cadastradas e suas evoluções aparecerão automaticamente conforme houver movimentações financeiras.
                </p>
              </div>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Filter className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Nenhuma categoria selecionada no filtro</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Selecione uma ou mais categorias no botão de filtro acima para visualizar a linha de evolução no gráfico.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleSelectTop(5)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Exibir Top 5 Maiores
                </button>
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 rounded-xl bg-surface-light dark:bg-surface-dark text-foreground border border-border/50 text-xs font-black uppercase tracking-wider hover:bg-muted/40 transition-all cursor-pointer"
                >
                  Exibir Todas
                </button>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={{ top: 15, right: 30, left: 20, bottom: 15 }}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  domain={[0, maxYValue]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Linhas interativas com duplo clique (2 cliques) para alternar opacidade/cálculo */}
                {visibleCategories.map((cat) => {
                  const color = cat.colorHex;
                  const isDimmed = dimmedCategories.has(cat.label);
                  const isHovered = hoveredCategory === cat.label;
                  const isOtherHovered = hoveredCategory && !isHovered;

                  const strokeOpacity = isDimmed ? 0.15 : (isOtherHovered ? 0.25 : 1);
                  const strokeWidth = isHovered ? 3.5 : (isDimmed ? 1.5 : 2.5);
                  const strokeDasharray = isDimmed ? "4 4" : undefined;

                  return (
                    <Line 
                      key={cat.id}
                      type="monotone" 
                      dataKey={cat.label} 
                      name={cat.label}
                      connectNulls={false}
                      stroke={color} 
                      strokeWidth={strokeWidth} 
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={strokeDasharray}
                      onClick={() => handleCategoryClick(cat.label)}
                      onMouseEnter={() => setHoveredCategory(cat.label)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className="cursor-pointer"
                      dot={{
                        r: isHovered ? 5 : (isDimmed ? 2.5 : 3.5),
                        strokeWidth: isDimmed ? 1 : 2,
                        fill: "hsl(var(--card))",
                        stroke: color,
                        opacity: strokeOpacity,
                        onClick: () => handleCategoryClick(cat.label),
                        className: "cursor-pointer"
                      }}
                      activeDot={{ 
                        r: isDimmed ? 4 : 6.5, 
                        strokeWidth: 2.5,
                        fill: color,
                        stroke: "hsl(var(--background))",
                        opacity: isDimmed ? 0.4 : 1,
                        onClick: () => handleCategoryClick(cat.label),
                        onMouseEnter: () => setHoveredCategory(cat.label),
                        className: "cursor-pointer"
                      }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
