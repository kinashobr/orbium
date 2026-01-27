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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Sparkles, AlertCircle, Info, ChevronRight, ArrowRight, Tag, Wallet, CreditCard, PieChart } from "lucide-react";
import { ContaCorrente, Categoria, ImportedTransaction, OperationType } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Label } from "@/components/ui/label";

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
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  onUpdateTransaction: (id: string, updates: Partial<ImportedTransaction>) => void;
  onCreateRule: (transaction: ImportedTransaction) => void;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; color: string; bgColor: string; icon: any }[] = [
  { value: 'receita', label: 'Receita', color: 'text-success', bgColor: 'bg-success/10', icon: TrendingUp },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive', bgColor: 'bg-destructive/10', icon: TrendingDown },
  { value: 'transferencia', label: 'Transf.', color: 'text-primary', bgColor: 'bg-primary/10', icon: ArrowLeftRight },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: PiggyBank },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Wallet },
  { value: 'pagamento_emprestimo', label: 'Empréstimo', color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: CreditCard },
  { value: 'liberacao_emprestimo', label: 'Liberação', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: DollarSign },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Car },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500', bgColor: 'bg-teal-500/10', icon: Coins },
];

import { TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, DollarSign, Car, Coins } from "lucide-react";

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
    if (!operationType) return categories;
    const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(operationType);
    return categories.filter(c => (isIncome && c.nature === 'receita') || (!isIncome && c.nature !== 'receita'));
  };

  const isRowReady = (tx: ImportedTransaction) => {
    if (tx.isPotentialDuplicate) return true;
    const basicCat = !!tx.categoryId;
    const isTransf = tx.operationType === 'transferencia' && !!tx.destinationAccountId;
    const isInvest = (tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId;
    const isLoan = tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId && !!tx.tempParcelaId;
    const isLiberation = tx.operationType === 'liberacao_emprestimo';
    return basicCat || isTransf || isInvest || isLoan || isLiberation;
  };

  const renderVincularSelector = (tx: ImportedTransaction, isCompact = false) => {
    const opType = tx.operationType;
    const isDisabled = tx.isPotentialDuplicate;
    
    if (opType === 'transferencia') {
      return (
        <Select value={tx.destinationAccountId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { destinationAccountId: v })} disabled={isDisabled}>
          <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold", isCompact ? "h-8 text-[10px]" : "h-9 text-xs")}>
            <SelectValue placeholder="Destino..." />
          </SelectTrigger>
          <SelectContent>{accounts.filter(a => a.id !== tx.accountId).map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    
    if (opType === 'aplicacao' || opType === 'resgate') {
      return (
        <Select value={tx.tempInvestmentId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { tempInvestmentId: v })} disabled={isDisabled}>
          <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold", isCompact ? "h-8 text-[10px]" : "h-9 text-xs")}>
            <SelectValue placeholder="Ativo..." />
          </SelectTrigger>
          <SelectContent>{investments.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    
    if (opType === 'pagamento_emprestimo') {
      const selectedLoan = loans.find(l => l.id === tx.tempLoanId);
      return (
        <div className="flex gap-2">
          <Select value={tx.tempLoanId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { tempLoanId: v, tempParcelaId: null })} disabled={isDisabled}>
            <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold flex-1", isCompact ? "h-8 text-[10px]" : "h-9 text-xs")}><SelectValue placeholder="Contrato..." /></SelectTrigger>
            <SelectContent>{loans.map(l => <SelectItem key={l.id} value={l.id} className="text-xs">{l.institution}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tx.tempParcelaId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { tempParcelaId: v })} disabled={isDisabled || !tx.tempLoanId}>
            <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold w-16", isCompact ? "h-8 text-[10px]" : "h-9 text-xs")}><SelectValue placeholder="P." /></SelectTrigger>
            <SelectContent>{selectedLoan?.parcelas.filter(p => !p.paga).map(p => <SelectItem key={p.numero} value={String(p.numero)} className="text-xs">P. {p.numero}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      );
    }
    
    return null;
  };

  if (isMobile) {
    return (
      <div className="space-y-4 pb-24">
        {transactions.map((tx) => {
          const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(tx.operationType || '') || (tx.operationType === 'veiculo' && tx.amount > 0);
          const ready = isRowReady(tx);
          const opConfig = OPERATION_OPTIONS.find(o => o.value === tx.operationType);

          return (
            <div 
              key={tx.id} 
              className={cn(
                "p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden space-y-4",
                tx.isPotentialDuplicate ? "bg-success/5 border-success/30" : 
                ready ? "bg-card border-success/20" : "bg-card border-border/60"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <Calendar className="w-3 h-3" /> {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                  </div>
                  <p className={cn("text-xl font-black tabular-nums tracking-tight", isIncome ? "text-success" : "text-destructive")}>
                    {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                  </p>
                </div>
                {ready && !tx.isPotentialDuplicate && (
                   <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success">
                      <CheckCircle2 className="w-5 h-5" />
                   </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Descrição Original</p>
                <p className="text-xs font-bold text-foreground line-clamp-1">{tx.originalDescription}</p>
                {tx.isPotentialDuplicate && <Badge className="bg-success text-white border-none text-[8px] font-black h-4 uppercase px-1.5">Duplicata Detectada</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Operação</Label>
                  <Select value={tx.operationType || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { operationType: v as OperationType, categoryId: null })}>
                    <SelectTrigger className={cn("h-10 rounded-xl border-none font-black text-[10px] uppercase", opConfig?.bgColor || "bg-muted/40", opConfig?.color || "text-muted-foreground")}>
                      <SelectValue placeholder="TIPO" />
                    </SelectTrigger>
                    <SelectContent>{OPERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-[10px] font-black uppercase tracking-widest">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground">Categoria</Label>
                  <Select value={tx.categoryId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })} disabled={['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '')}>
                    <SelectTrigger className="h-10 rounded-xl border-none bg-muted/40 font-bold text-[10px] uppercase tracking-widest text-foreground"><SelectValue placeholder="SELECIONE" /></SelectTrigger>
                    <SelectContent className="max-h-60">{getCategoryOptions(tx.operationType).map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold">{c.icon} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '') && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Vincular Registro</Label>
                  {renderVincularSelector(tx, true)}
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-border/40">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Nome Final do Lançamento</Label>
                <div className="flex gap-2">
                  <EditableCell value={tx.description} onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })} className="flex-1 text-xs font-black h-10 bg-muted/20 rounded-xl px-3" />
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-primary/10 text-primary" onClick={() => onCreateRule(tx)} disabled={!ready}>
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full min-w-[1000px]">
      <Table>
        <TableHeader className="bg-card sticky top-0 z-30">
          <TableRow className="hover:bg-transparent border-b border-border/40 h-12">
            <TableHead className="w-8"></TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] pl-2 w-[140px]">Data & Valor</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] w-[200px]">Descrição Original</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] w-[180px]">Operação</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] w-[180px]">Categoria</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] w-[220px]">Vínculo</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Descrição Final</TableHead>
            <TableHead className="w-12 text-center pr-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(tx.operationType || '');
            const ready = isRowReady(tx);
            const opConfig = OPERATION_OPTIONS.find(o => o.value === tx.operationType);

            return (
              <TableRow 
                key={tx.id} 
                className={cn(
                  "border-b border-border/30 transition-all hover:bg-muted/20 h-16 group",
                  tx.isPotentialDuplicate ? "bg-success/[0.08]" : 
                  ready ? "bg-card" : "bg-warning/[0.03]"
                )}
              >
                <TableCell className="pl-4">
                  {ready ? (
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center text-success animate-in zoom-in duration-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/30">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </TableCell>

                <TableCell className="py-2 pl-2">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">{parseDateLocal(tx.date).toLocaleDateString("pt-BR")}</span>
                    <p className={cn("text-sm font-black tabular-nums tracking-tight", isIncome ? "text-success" : "text-destructive")}>
                      {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="max-w-[200px] py-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight" title={tx.originalDescription}>{tx.originalDescription}</p>
                    {tx.isPotentialDuplicate && <Badge className="bg-success text-white border-none text-[8px] font-black px-1 py-0 h-4 uppercase">Duplicata</Badge>}
                  </div>
                </TableCell>

                <TableCell className="py-2">
                  <Select value={tx.operationType || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { operationType: v as OperationType, categoryId: null })}>
                    <SelectTrigger className={cn("h-8 rounded-xl border-none font-black text-[9px] uppercase tracking-widest", opConfig?.bgColor || "bg-muted/40", opConfig?.color || "text-muted-foreground")}>
                      <SelectValue placeholder="TIPO" />
                    </SelectTrigger>
                    <SelectContent>{OPERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-[10px] font-black uppercase">{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="py-2">
                  <Select value={tx.categoryId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })} disabled={['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '')}>
                    <SelectTrigger className="h-8 rounded-xl border-none bg-muted/40 font-bold text-[10px] uppercase tracking-widest text-foreground"><SelectValue placeholder="SELECIONE" /></SelectTrigger>
                    <SelectContent className="max-h-60">{getCategoryOptions(tx.operationType).map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold">{c.icon} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="py-2">
                  {renderVincularSelector(tx)}
                </TableCell>

                <TableCell className="py-2">
                  <EditableCell value={tx.description} onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })} className="text-[11px] font-black h-8 bg-muted/20 rounded-xl px-3 w-full border-none transition-colors group-hover:bg-muted/40" />
                </TableCell>

                <TableCell className="pr-6 text-right py-2">
                   <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => onCreateRule(tx)} disabled={!ready} title="Criar Regra">
                      <Sparkles className="w-4 h-4" />
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