"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import {
  Calendar,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { ContaCorrente, Categoria, ImportedTransaction, OperationType, StandardizationRule } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Label } from "@/components/ui/label";
import { CategorySearchSelector } from "@/components/bills/CategorySearchSelector";
import { OperationSearchSelector } from "./OperationSearchSelector";
import { LinkSearchSelector } from "./LinkSearchSelector";
import { isImportedTransactionReady as isRowReady, isTransactionIncome } from "@/lib/transactionValidator";

interface LoanInfo {
  id: string;
  institution: string;
  parcelas: { numero: number; paga: boolean; }[];
}

interface InvestmentInfo {
  id: string;
  name: string;
}

interface TransactionReviewTableProps {
  transactions: ImportedTransaction[];
  accounts: ContaCorrente[];
  accountType?: string;
  currentAccountId: string;
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  standardizationRules: StandardizationRule[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdateTransaction: (id: string, updates: Partial<ImportedTransaction>) => void;
  onCreateRule: (transaction: ImportedTransaction) => void;
  onEditRule: (rule: StandardizationRule) => void;
  onDeleteTransaction: (id: string) => void;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const COLUMN_KEYS = [
  'selection',
  'date_value',
  'description',
  'operation',
  'category',
  'link',
  'actions'
] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  selection: 44,
  date_value: 115,
  description: 250,
  operation: 135,
  category: 155,
  link: 165,
  actions: 80,
};

const COLUMN_LIMITS: Record<ColumnKey, { min: number; max: number }> = {
  selection: { min: 40, max: 55 },
  date_value: { min: 100, max: 160 },
  description: { min: 180, max: 450 },
  operation: { min: 120, max: 200 },
  category: { min: 130, max: 220 },
  link: { min: 140, max: 260 },
  actions: { min: 75, max: 100 },
};

const columnHeaders: { key: ColumnKey; label: string; align?: 'center' | 'right' }[] = [
  { key: 'selection', label: '' },
  { key: 'date_value', label: 'Data & Valor' },
  { key: 'description', label: 'Descrição / Histórico' },
  { key: 'operation', label: 'Operação' },
  { key: 'category', label: 'Categoria' },
  { key: 'link', label: 'Vínculo' },
  { key: 'actions', label: 'Ações', align: 'center' },
];

export function TransactionReviewTable({
  transactions,
  accounts,
  accountType,
  currentAccountId,
  categories,
  investments,
  loans,
  standardizationRules,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateTransaction,
  onCreateRule,
  onEditRule,
  onDeleteTransaction,
}: TransactionReviewTableProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem('revisao_column_widths_v3');
      return saved ? JSON.parse(saved) : INITIAL_WIDTHS;
    } catch {
      return INITIAL_WIDTHS;
    }
  });

  useEffect(() => {
    localStorage.setItem('revisao_column_widths_v3', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent, key: ColumnKey) => {
    e.preventDefault();
    setResizingColumn(key);
    setStartX(e.clientX);
    setStartWidth(columnWidths[key]);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    const deltaX = e.clientX - startX;
    const limits = COLUMN_LIMITS[resizingColumn];
    const newWidth = Math.min(limits.max, Math.max(limits.min, startWidth + deltaX));
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
  }, [resizingColumn, startX, startWidth]);

  const handleMouseUp = useCallback(() => {
    setResizingColumn(null);
  }, []);

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, handleMouseMove, handleMouseUp]);

  const totalWidth = useMemo(
    () => Object.values(columnWidths).reduce((sum, w) => sum + w, 0),
    [columnWidths]
  );

  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id));
  const someSelected = transactions.some((t) => selectedIds.has(t.id)) && !allSelected;

  const getFilteredCategories = (operationType: OperationType | null) => {
    if (!operationType) return categories;
    const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(operationType);
    return categories.filter(c => (isIncome && c.nature === 'receita') || (!isIncome && c.nature !== 'receita'));
  };

  // Estado Vazio (Inbox Zero)
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success mb-3 animate-in zoom-in duration-300">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-foreground">
          Nenhum lançamento pendente a tratar
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Todas as transações deste período foram revisadas e contabilizadas. Você pode alternar para a aba <strong>Contabilizadas</strong> para consultar ou desfazer lançamentos se necessário.
        </p>
      </div>
    );
  }

  // Mobile View
  if (isMobile) {
    return (
      <div className="space-y-4 pb-24">
        {transactions.map((tx) => {
          const isIncome = isTransactionIncome(tx.operationType, accountType);
          const isSelected = selectedIds.has(tx.id);

          const matchedRule = standardizationRules.find(r =>
            tx.originalDescription.toLowerCase().includes(r.pattern.toLowerCase())
          );
          const isStandardized = Boolean(matchedRule) || (tx.description && tx.description !== tx.originalDescription);
          const displayDesc = tx.description || tx.originalDescription;

          return (
            <div
              key={tx.id}
              className={cn(
                "p-4 rounded-2xl border transition-all space-y-3.5 bg-card",
                isSelected ? "border-primary/50 bg-primary/[0.02]" : "border-border/60"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(tx.id)}
                    aria-label={`Selecionar transação ${displayDesc}`}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      <Calendar className="w-3 h-3" /> {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                    </div>
                    <p className={cn("text-lg font-black tabular-nums tracking-tight", isIncome ? "text-success" : "text-destructive")}>
                      {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descrição Unificada */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Descrição</Label>
                  {matchedRule && (
                    <span className="text-[8px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      Regra ativa
                    </span>
                  )}
                </div>
                <EditableCell
                  value={displayDesc}
                  onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })}
                  className="w-full text-xs font-bold h-9 bg-muted/20 rounded-xl px-3 border border-border/20"
                />
                {isStandardized && tx.description !== tx.originalDescription && (
                  <p className="text-[10px] text-muted-foreground/70 font-medium italic truncate mt-0.5" title={`Original: ${tx.originalDescription}`}>
                    Orig: {tx.originalDescription}
                  </p>
                )}
              </div>

              {/* Operação e Categoria */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Operação</Label>
                  <OperationSearchSelector
                    value={tx.operationType}
                    onSelect={(val) => onUpdateTransaction(tx.id, { operationType: val, categoryId: null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Categoria</Label>
                  {['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '') ? (
                    <div className="h-8 flex items-center px-3 rounded-xl bg-muted/20 text-[10px] font-bold text-muted-foreground opacity-50 uppercase">
                      Não requer
                    </div>
                  ) : (
                    <CategorySearchSelector
                      value={tx.categoryId || null}
                      categories={getFilteredCategories(tx.operationType)}
                      onSelect={(val) => onUpdateTransaction(tx.id, { categoryId: val })}
                    />
                  )}
                </div>
              </div>

              {/* Vínculo Padronizado */}
              {['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '') && (
                <div className="space-y-1 p-2.5 rounded-xl bg-muted/15 border border-border/30">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Vincular Registro</Label>
                  <LinkSearchSelector
                    operationType={tx.operationType}
                    accounts={accounts}
                    currentAccountId={currentAccountId}
                    investments={investments}
                    loans={loans}
                    destinationAccountId={tx.destinationAccountId}
                    tempInvestmentId={tx.tempInvestmentId}
                    tempLoanId={tx.tempLoanId}
                    tempParcelaId={tx.tempParcelaId}
                    onChange={(updates) => onUpdateTransaction(tx.id, updates)}
                    isCompact
                  />
                </div>
              )}

              {/* Ações (Apenas ícones) */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                {matchedRule ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditRule(matchedRule)}
                    className="h-8 w-8 rounded-xl text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                    title={`Editar regra: "${matchedRule.pattern}"`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCreateRule(tx)}
                    className="h-8 w-8 rounded-xl text-primary bg-primary/10 hover:bg-primary/20"
                    title="Criar regra"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteTransaction(tx.id)}
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Excluir do extrato"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="w-full">
      <Table style={{ minWidth: `${totalWidth}px` }} className="table-fixed w-full">
        <TableHeader className="bg-card sticky top-0 z-30">
          <TableRow className="hover:bg-transparent border-b border-border/40 h-12">
            {columnHeaders.map((h) => {
              const isActions = h.key === 'actions';
              return (
                <TableHead
                  key={h.key}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider relative border-none bg-card select-none text-muted-foreground",
                    h.key === 'selection' && "pl-4",
                    isActions && "text-center pr-3"
                  )}
                  style={{ width: columnWidths[h.key] }}
                >
                  {h.key === 'selection' ? (
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={onToggleSelectAll}
                        aria-label="Selecionar todas as transações"
                      />
                    </div>
                  ) : (
                    h.label
                  )}

                  {!isActions && h.key !== 'selection' && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 cursor-col-resize hover:bg-primary/40 rounded-full transition-colors z-40"
                      onMouseDown={(e) => handleMouseDown(e, h.key)}
                    />
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isIncome = isTransactionIncome(tx.operationType, accountType);
            const isSelected = selectedIds.has(tx.id);

            const matchedRule = standardizationRules.find(r =>
              tx.originalDescription.toLowerCase().includes(r.pattern.toLowerCase())
            );
            const isStandardized = Boolean(matchedRule) || (tx.description && tx.description !== tx.originalDescription);
            const displayDesc = tx.description || tx.originalDescription;

            return (
              <TableRow
                key={tx.id}
                className={cn(
                  "border-b border-border/30 transition-colors h-16 group bg-card",
                  isSelected ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-muted/20"
                )}
              >
                {/* Seleção Única (Sem Status) */}
                <TableCell className="pl-4 text-center" style={{ width: columnWidths.selection }}>
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(tx.id)}
                      aria-label={`Selecionar ${displayDesc}`}
                    />
                  </div>
                </TableCell>

                {/* Data & Valor */}
                <TableCell className="py-2 pl-2" style={{ width: columnWidths.date_value }}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-muted-foreground uppercase opacity-70 tracking-wider">
                      {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                    </span>
                    <p className={cn("text-sm font-black tabular-nums tracking-tight", isIncome ? "text-success" : "text-destructive")}>
                      {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </TableCell>

                {/* Descrição Unificada */}
                <TableCell className="py-2" style={{ width: columnWidths.description, maxWidth: columnWidths.description }}>
                  <div className="space-y-0.5 pr-2">
                    <EditableCell
                      value={displayDesc}
                      onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })}
                      className="text-xs font-bold h-8 bg-muted/20 hover:bg-muted/40 rounded-xl px-2.5 w-full border-none transition-colors"
                    />
                    {isStandardized && tx.description !== tx.originalDescription && (
                      <p
                        className="text-[10px] text-muted-foreground/70 font-medium italic truncate px-1"
                        title={`Original: ${tx.originalDescription}`}
                      >
                        Orig: {tx.originalDescription}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Operação com busca */}
                <TableCell className="py-2" style={{ width: columnWidths.operation }}>
                  <OperationSearchSelector
                    value={tx.operationType}
                    onSelect={(val) => onUpdateTransaction(tx.id, { operationType: val, categoryId: null })}
                  />
                </TableCell>

                {/* Categoria com busca */}
                <TableCell className="py-2" style={{ width: columnWidths.category }}>
                  {['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '') ? (
                    <div className="h-8 flex items-center px-2.5 rounded-xl bg-muted/20 text-[10px] font-bold text-muted-foreground opacity-40 uppercase">
                      Não requer
                    </div>
                  ) : (
                    <CategorySearchSelector
                      value={tx.categoryId || null}
                      categories={getFilteredCategories(tx.operationType)}
                      onSelect={(val) => onUpdateTransaction(tx.id, { categoryId: val })}
                    />
                  )}
                </TableCell>

                {/* Vínculo Padronizado */}
                <TableCell className="py-2" style={{ width: columnWidths.link }}>
                  <LinkSearchSelector
                    operationType={tx.operationType}
                    accounts={accounts}
                    currentAccountId={currentAccountId}
                    investments={investments}
                    loans={loans}
                    destinationAccountId={tx.destinationAccountId}
                    tempInvestmentId={tx.tempInvestmentId}
                    tempLoanId={tx.tempLoanId}
                    tempParcelaId={tx.tempParcelaId}
                    onChange={(updates) => onUpdateTransaction(tx.id, updates)}
                  />
                </TableCell>

                {/* Ações (Apenas Ícones sem texto) */}
                <TableCell
                  className="pr-3 text-center py-2"
                  style={{ width: columnWidths.actions }}
                >
                  <div className="flex items-center justify-center gap-1">
                    {matchedRule ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditRule(matchedRule)}
                        className="h-8 w-8 rounded-xl text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 shrink-0"
                        title={`Editar regra: "${matchedRule.pattern}"`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCreateRule(tx)}
                        className="h-8 w-8 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 shrink-0"
                        title="Criar regra de padronização"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                      title="Excluir lançamento do extrato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}