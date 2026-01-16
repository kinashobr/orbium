"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pin, ArrowLeftRight, TrendingUp, TrendingDown, AlertCircle, Check, PiggyBank, CreditCard, Car, Info, Sparkles, Calendar } from "lucide-react";
import { ContaCorrente, Categoria, ImportedTransaction, OperationType, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas: {
    numero: number;
    vencimento: string;
    valor: number;
    paga: boolean;
    transactionId?: string;
  }[];
  valorParcela: number;
  totalParcelas: number;
}

interface InvestmentInfo {
  id: string;
  name: string;
}

interface TransactionReviewTableProps {
  transactions: ImportedTransaction[];
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  onUpdateTransaction: (id: string, updates: Partial<ImportedTransaction>) => void;
  onCreateRule: (transaction: ImportedTransaction) => void;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; color: string; bgColor: string }[] = [
  { value: 'receita', label: 'Receita', color: 'text-success', bgColor: 'bg-success/10' },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { value: 'transferencia', label: 'Transferência', color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { value: 'liberacao_emprestimo', label: 'Liberação', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
];

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function TransactionReviewTable({
  transactions,
  accounts,
  categories,
  investments,
  loans,
  onUpdateTransaction,
  onCreateRule,
}: TransactionReviewTableProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  
  const getCategoryOptions = (operationType: OperationType | null) => {
    if (!operationType || operationType === 'transferencia' || operationType === 'initial_balance') return categories;
    const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(operationType);
    return categories.filter(c => (isIncome && c.nature === 'receita') || (!isIncome && c.nature !== 'receita'));
  };
  
  const availableDestinationAccounts = useMemo(() => accounts.filter(a => !a.hidden), [accounts]);
  const activeLoans = useMemo(() => loans.filter(l => !l.id.includes('pending')), [loans]);

  const renderVincularSelector = (tx: ImportedTransaction) => {
    const opType = tx.operationType;
    const isDisabled = tx.isPotentialDuplicate;
    
    if (opType === 'transferencia') {
      const destinationOptions = availableDestinationAccounts.filter(a => a.id !== tx.accountId);
      return (
        <Select
          value={tx.destinationAccountId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { destinationAccountId: v })}
          disabled={isDisabled}
        >
          <SelectTrigger className="h-9 rounded-xl border-none bg-muted/50 text-xs font-bold">
            <SelectValue placeholder="Conta Destino..." />
          </SelectTrigger>
          <SelectContent>
            {destinationOptions.map(a => (
              <SelectItem key={a.id} value={a.id} className="text-xs font-medium">{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (opType === 'aplicacao' || opType === 'resgate') {
      return (
        <Select
          value={tx.tempInvestmentId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempInvestmentId: v })}
          disabled={isDisabled}
        >
          <SelectTrigger className="h-9 rounded-xl border-none bg-muted/50 text-xs font-bold">
            <SelectValue placeholder="Investimento..." />
          </SelectTrigger>
          <SelectContent>
            {investments.map(i => (
              <SelectItem key={i.id} value={i.id} className="text-xs font-medium">{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (opType === 'pagamento_emprestimo') {
      const selectedLoan = activeLoans.find(l => l.id === tx.tempLoanId);
      const availableInstallments = selectedLoan ? selectedLoan.parcelas.filter(p => !p.paga) : [];

      return (
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={tx.tempLoanId || ''}
            onValueChange={(v) => onUpdateTransaction(tx.id, { tempLoanId: v, tempParcelaId: null })}
            disabled={isDisabled}
          >
            <SelectTrigger className="h-9 rounded-xl border-none bg-muted/50 text-xs font-bold flex-1">
              <SelectValue placeholder="Contrato..." />
            </SelectTrigger>
            <SelectContent>
              {activeLoans.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-xs font-medium">{l.institution}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={tx.tempParcelaId || ''}
            onValueChange={(v) => onUpdateTransaction(tx.id, { tempParcelaId: v })}
            disabled={isDisabled || !tx.tempLoanId}
          >
            <SelectTrigger className="h-9 rounded-xl border-none bg-muted/50 text-xs font-bold w-full sm:w-24">
              <SelectValue placeholder="P..." />
            </SelectTrigger>
            <SelectContent>
              {availableInstallments.map(p => (
                <SelectItem key={p.numero} value={String(p.numero)} className="text-xs font-medium">P. {p.numero}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    return <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">—</span>;
  };

  if (isMobile) {
    return (
      <div className="space-y-4 p-4">
        {transactions.map((tx) => {
          const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(tx.operationType || '') || (tx.operationType === 'veiculo' && tx.amount > 0);
          const opConfig = OPERATION_OPTIONS.find(o => o.value === tx.operationType);
          const isCategorized = 
                (tx.operationType === 'transferencia' && !!tx.destinationAccountId) ||
                ((tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId) ||
                (tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId && !!tx.tempParcelaId) ||
                (tx.operationType === 'veiculo' && !!tx.tempVehicleOperation) ||
                (!!tx.categoryId) ||
                tx.operationType === 'liberacao_emprestimo';

          return (
            <div 
              key={tx.id} 
              className={cn(
                "p-5 rounded-[2rem] border-2 transition-all space-y-4",
                !isCategorized && !tx.isPotentialDuplicate ? "bg-warning/[0.03] border-warning/20" : "bg-card border-border/40",
                tx.isPotentialDuplicate && "bg-success/[0.03] border-success/20"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase">
                    <Calendar className="w-3 h-3" />
                    {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                  </div>
                  <p className={cn("text-xl font-black tabular-nums", isIncome ? "text-success" : "text-destructive")}>
                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-muted/50" onClick={() => onCreateRule(tx)} disabled={!isCategorized || tx.isPotentialDuplicate}>
                  <Sparkles className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Original</p>
                <p className="text-xs font-bold text-foreground line-clamp-1">{tx.originalDescription}</p>
                {tx.isPotentialDuplicate && (
                  <Badge className="bg-success/10 text-success border-none text-[9px] font-black">DUPLICATA</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Operação</Label>
                  <Select value={tx.operationType || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { operationType: v as OperationType, categoryId: null })}>
                    <SelectTrigger className={cn("h-9 rounded-xl border-none text-[10px] font-black uppercase", opConfig?.bgColor || "bg-muted", opConfig?.color || "text-muted-foreground")}>
                      <SelectValue placeholder="TIPO" />
                    </SelectTrigger>
                    <SelectContent>{OPERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-[10px] font-black uppercase">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Categoria</Label>
                  <Select value={tx.categoryId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })} disabled={['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '')}>
                    <SelectTrigger className="h-9 rounded-xl border-none bg-muted/50 text-[10px] font-bold"><SelectValue placeholder="CAT" /></SelectTrigger>
                    <SelectContent>{getCategoryOptions(tx.operationType).map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.icon} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '') && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Vínculo</Label>
                  {renderVincularSelector(tx)}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Descrição Final</Label>
                <EditableCell value={tx.description} onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })} className="text-xs font-bold h-10 bg-muted/30 rounded-xl px-3 w-full" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader className="bg-muted/30 sticky top-0 z-20">
          <TableRow className="hover:bg-transparent border-none h-12">
            <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Data & Valor</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Descrição Original</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Classificação</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Vínculo</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Descrição Final</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center pr-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(tx.operationType || '') || (tx.operationType === 'veiculo' && tx.amount > 0);
            const category = tx.categoryId ? categoriesMap.get(tx.categoryId) : null;
            const opConfig = OPERATION_OPTIONS.find(o => o.value === tx.operationType);
            
            const isCategorized = 
                (tx.operationType === 'transferencia' && !!tx.destinationAccountId) ||
                ((tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId) ||
                (tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId && !!tx.tempParcelaId) ||
                (tx.operationType === 'veiculo' && !!tx.tempVehicleOperation) ||
                (!!tx.categoryId) ||
                tx.operationType === 'liberacao_emprestimo';

            return (
              <TableRow 
                key={tx.id} 
                className={cn(
                  "group border-b border-border/40 transition-all hover:bg-muted/20 h-20",
                  !isCategorized && !tx.isPotentialDuplicate && "bg-warning/[0.02]",
                  tx.isPotentialDuplicate && "bg-success/[0.02]"
                )}
              >
                <TableCell className="pl-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                      <Calendar className="w-3 h-3" />
                      {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                    </div>
                    <p className={cn(
                      "text-lg font-black tracking-tight font-display",
                      isIncome ? "text-success" : "text-destructive"
                    )}>
                      {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="max-w-[200px]">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground truncate" title={tx.originalDescription}>
                      {tx.originalDescription}
                    </p>
                    {tx.isPotentialDuplicate && (
                      <Badge variant="outline" className="bg-success/10 text-success border-none text-[9px] font-black px-1.5 py-0">
                        <Check className="w-2.5 h-2.5 mr-1" /> DUPLICATA
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-2 w-[180px]">
                    <Select
                      value={tx.operationType || ''}
                      onValueChange={(v) => onUpdateTransaction(tx.id, { 
                        operationType: v as OperationType, 
                        isTransfer: v === 'transferencia',
                        categoryId: null,
                        destinationAccountId: null,
                        tempInvestmentId: null,
                        tempLoanId: null,
                        tempParcelaId: null,
                      })}
                      disabled={tx.isPotentialDuplicate}
                    >
                      <SelectTrigger className={cn(
                        "h-8 rounded-lg border-none text-[10px] font-black uppercase tracking-widest px-2",
                        opConfig?.bgColor || "bg-muted",
                        opConfig?.color || "text-muted-foreground"
                      )}>
                        <SelectValue placeholder="TIPO..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATION_OPTIONS.map(op => (
                          <SelectItem key={op.value} value={op.value} className="text-[10px] font-black uppercase tracking-widest">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={tx.categoryId || ''}
                      onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })}
                      disabled={tx.isPotentialDuplicate || ['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'veiculo'].includes(tx.operationType || '')}
                    >
                      <SelectTrigger className="h-8 rounded-lg border-none bg-muted/50 text-[11px] font-bold px-2">
                        <SelectValue placeholder="CATEGORIA..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoryOptions(tx.operationType).map(cat => (
                          <SelectItem key={cat.id} value={cat.id} className="text-xs font-medium">
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>

                <TableCell className="w-[220px]">
                  {renderVincularSelector(tx)}
                </TableCell>

                <TableCell>
                  <EditableCell
                    value={tx.description}
                    onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })}
                    className="text-xs font-bold h-9 bg-muted/30 rounded-xl px-3 border-none hover:bg-muted/50 transition-colors"
                    disabled={tx.isPotentialDuplicate}
                  />
                </TableCell>

                <TableCell className="text-center pr-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={() => onCreateRule(tx)}
                    disabled={!isCategorized || tx.isPotentialDuplicate}
                    title="Criar regra inteligente"
                  >
                    <Sparkles className="w-5 h-5" />
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