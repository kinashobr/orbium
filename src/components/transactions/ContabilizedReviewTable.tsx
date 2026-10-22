"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { TransacaoCompleta, Categoria, ContaCorrente } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { isTransactionIncome } from "@/lib/transactionValidator";

interface ContabilizedReviewTableProps {
  transactions: TransacaoCompleta[];
  categories: Categoria[];
  accounts: ContaCorrente[];
  accountType?: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUncontabilize: (transactionId: string) => void;
  loading?: boolean;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function ContabilizedReviewTable({
  transactions,
  categories,
  accounts,
  accountType,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUncontabilize,
  loading = false,
}: ContabilizedReviewTableProps) {
  const categoriesMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id));
  const someSelected = transactions.some((t) => selectedIds.has(t.id)) && !allSelected;

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center text-muted-foreground/60 mb-3">
          <RotateCcw className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Nenhuma transação contabilizada no período</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Os lançamentos conciliados e importados desta conta para o período selecionado aparecerão aqui caso precise revisá-los ou estorná-los.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table className="table-fixed min-w-[760px] w-full">
        <TableHeader className="bg-card sticky top-0 z-20">
          <TableRow className="hover:bg-transparent border-b border-border/40 h-12">
            <TableHead className="w-12 pl-4">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todas as transações contabilizadas"
              />
            </TableHead>
            <TableHead className="w-32 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Data & Valor
            </TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground min-w-[200px]">
              Descrição / Histórico
            </TableHead>
            <TableHead className="w-36 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Operação
            </TableHead>
            <TableHead className="w-40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Categoria
            </TableHead>
            <TableHead className="w-28 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground pr-4">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isSelected = selectedIds.has(tx.id);
            const isIncome = tx.flow === 'in' || tx.flow === 'transfer_in' || isTransactionIncome(tx.operationType, accountType);
            const category = tx.categoryId ? categoriesMap.get(tx.categoryId) : null;
            const originalDesc = (tx.meta as any)?.originalDescription;
            const hasCustomDesc = originalDesc && originalDesc !== tx.description;

            return (
              <TableRow
                key={tx.id}
                className={cn(
                  "border-b border-border/30 transition-colors h-16 group bg-card",
                  isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"
                )}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(tx.id)}
                    aria-label={`Selecionar transação ${tx.description}`}
                  />
                </TableCell>

                <TableCell className="py-2">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-muted-foreground uppercase opacity-70 tracking-wider">
                      {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                    </span>
                    <p
                      className={cn(
                        "text-sm font-black tabular-nums tracking-tight",
                        isIncome ? "text-success" : "text-destructive"
                      )}
                    >
                      {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="py-2">
                  <div className="space-y-0.5 pr-2">
                    <p className="text-xs font-bold text-foreground line-clamp-1">
                      {tx.description}
                    </p>
                    {hasCustomDesc && (
                      <p
                        className="text-[10px] text-muted-foreground/70 font-medium line-clamp-1 italic"
                        title={`Original: ${originalDesc}`}
                      >
                        Orig: {originalDesc}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="py-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                    {tx.operationType}
                  </span>
                </TableCell>

                <TableCell className="py-2">
                  {category ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                      <span className="opacity-70">{category.icon}</span>
                      <span className="truncate">{category.label}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground opacity-50">
                      —
                    </span>
                  )}
                </TableCell>

                <TableCell className="py-2 pr-4 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={loading}
                    onClick={() => onUncontabilize(tx.id)}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Estornar contabilização e retornar para A Tratar"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
