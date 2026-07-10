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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Sparkles, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, DollarSign, Car, Coins, Wallet, CreditCard, AlertCircle, Clock, HelpCircle } from "lucide-react";
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

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const COLUMN_KEYS = ['status', 'date_value', 'original_desc', 'operation', 'category', 'link', 'final_desc', 'actions'] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  status: 40,
  date_value: 130,
  original_desc: 200,
  operation: 140,
  category: 140,
  link: 210,
  final_desc: 270,
  actions: 56,
};

const COLUMN_LIMITS: Record<ColumnKey, { min: number; max: number }> = {
  status: { min: 40, max: 40 },
  date_value: { min: 100, max: 200 },
  original_desc: { min: 120, max: 450 },
  operation: { min: 110, max: 220 },
  category: { min: 110, max: 220 },
  link: { min: 140, max: 350 },
  final_desc: { min: 150, max: 500 },
  actions: { min: 56, max: 56 },
};

const columnHeaders: { key: ColumnKey; label: string; align?: 'center' | 'right' }[] = [
  { key: 'status', label: '' },
  { key: 'date_value', label: 'Data & Valor' },
  { key: 'original_desc', label: 'Descrição Original' },
  { key: 'operation', label: 'Operação' },
  { key: 'category', label: 'Categoria' },
  { key: 'link', label: 'Vínculo' },
  { key: 'final_desc', label: 'Descrição Final' },
  { key: 'actions', label: '', align: 'center' },
];

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
  
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try { 
      const saved = localStorage.getItem('revisao_column_widths'); 
      return saved ? JSON.parse(saved) : INITIAL_WIDTHS; 
    } catch { 
      return INITIAL_WIDTHS; 
    }
  });
  
  useEffect(() => { 
    localStorage.setItem('revisao_column_widths', JSON.stringify(columnWidths)); 
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

  const totalWidth = useMemo(() => Object.values(columnWidths).reduce((sum, w) => sum + w, 0), [columnWidths]);
  
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

  const renderStatusIndicator = (tx: ImportedTransaction, size: "sm" | "md" = "sm") => {
    const ready = isRowReady(tx);
    const dimensions = size === "md" ? "w-8 h-8" : "w-5 h-5";
    const iconSize = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
    
    if (tx.isPotentialDuplicate) {
      return (
        <div 
          className={cn("rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 animate-in zoom-in duration-300", dimensions)} 
          title="Duplicata Potencial Detectada (Revisar se já foi lançada manualmente)"
        >
          <AlertCircle className={iconSize} />
        </div>
      );
    }
    
    if (ready) {
      return (
        <div 
          className={cn("rounded-full bg-success/20 flex items-center justify-center text-success animate-in zoom-in duration-300", dimensions)}
          title="Pronto para importar"
        >
          <CheckCircle2 className={iconSize} />
        </div>
      );
    }
    
    if (!tx.operationType) {
      return (
        <div 
          className={cn("rounded-full bg-destructive/10 flex items-center justify-center text-destructive animate-in zoom-in duration-300", dimensions)}
          title="Pendente: Selecione o tipo de operação"
        >
          <HelpCircle className={iconSize} />
        </div>
      );
    }
    
    if (tx.operationType === 'transferencia' && !tx.destinationAccountId) {
      return (
        <div 
          className={cn("rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 animate-in zoom-in duration-300", dimensions)}
          title="Pendente: Vincule a conta de destino"
        >
          <ArrowLeftRight className={iconSize} />
        </div>
      );
    }
    
    if ((tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !tx.tempInvestmentId) {
      return (
        <div 
          className={cn("rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 animate-in zoom-in duration-300", dimensions)}
          title="Pendente: Vincule o ativo de investimento"
        >
          <PiggyBank className={iconSize} />
        </div>
      );
    }
    
    if (tx.operationType === 'pagamento_emprestimo' && (!tx.tempLoanId || !tx.tempParcelaId)) {
      return (
        <div 
          className={cn("rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 animate-in zoom-in duration-300", dimensions)}
          title="Pendente: Vincule o contrato/parcela de empréstimo"
        >
          <CreditCard className={iconSize} />
        </div>
      );
    }
    
    if (!tx.categoryId && !['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo'].includes(tx.operationType)) {
      return (
        <div 
          className={cn("rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-in zoom-in duration-300", dimensions)}
          title="Pendente: Selecione uma categoria"
        >
          <Clock className={iconSize} />
        </div>
      );
    }
    
    return (
      <div 
        className={cn("rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/30", dimensions)}
        title="Pendente"
      >
        <ChevronRight className={size === "md" ? "w-5 h-5" : "w-3 h-3"} />
      </div>
    );
  };

  const renderVincularSelector = (tx: ImportedTransaction, isCompact = false) => {
    const opType = tx.operationType;
    const isDisabled = tx.isPotentialDuplicate;
    
    if (opType === 'transferencia') {
      return (
        <Select value={tx.destinationAccountId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { destinationAccountId: v })} disabled={isDisabled}>
          <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold", isCompact ? "h-8 text-[10px]" : "h-8 text-xs")}>
            <SelectValue placeholder="Destino..." />
          </SelectTrigger>
          <SelectContent>{accounts.filter(a => a.id !== tx.accountId).map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    
    if (opType === 'aplicacao' || opType === 'resgate') {
      return (
        <Select value={tx.tempInvestmentId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { tempInvestmentId: v })} disabled={isDisabled}>
          <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold", isCompact ? "h-8 text-[10px]" : "h-8 text-xs")}>
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
            <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold flex-1", isCompact ? "h-8 text-[10px]" : "h-8 text-xs")}><SelectValue placeholder="Contrato..." /></SelectTrigger>
            <SelectContent>{loans.map(l => <SelectItem key={l.id} value={l.id} className="text-xs">{l.institution}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tx.tempParcelaId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { tempParcelaId: v })} disabled={isDisabled || !tx.tempLoanId}>
            <SelectTrigger className={cn("rounded-xl border-none bg-muted/30 font-bold w-16", isCompact ? "h-8 text-[10px]" : "h-8 text-xs")}><SelectValue placeholder="P." /></SelectTrigger>
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
                "p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden space-y-4 bg-card",
                tx.isPotentialDuplicate ? "border-success/30 bg-success/5" : "border-border/60"
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
                {renderStatusIndicator(tx, "md")}
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
    <div style={{ minWidth: "100%", width: `${totalWidth}px` }}>
        <Table className="table-fixed">
          <TableHeader className="bg-card sticky top-0 z-30">
            <TableRow className="hover:bg-transparent border-b border-border/40 h-12">
              {columnHeaders.map((h) => {
                const isActions = h.key === 'actions';
                return (
                  <TableHead 
                    key={h.key} 
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wider relative border-none bg-card", 
                      h.key === 'status' && "pl-4",
                      h.key === 'date_value' && "pl-2",
                      isActions && "text-center pr-6 sticky right-0 z-40 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.15)]"
                    )} 
                    style={{ width: columnWidths[h.key] }}
                  >
                    {h.label}
                    {!isActions && h.key !== 'status' && (
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
              const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(tx.operationType || '');
              const ready = isRowReady(tx);
              const opConfig = OPERATION_OPTIONS.find(o => o.value === tx.operationType);

              return (
                <TableRow 
                  key={tx.id} 
                  className="border-b border-border/30 transition-all hover:bg-muted/20 h-16 group bg-card"
                >
                  <TableCell className="pl-4" style={{ width: columnWidths.status }}>
                    {renderStatusIndicator(tx)}
                  </TableCell>

                  <TableCell className="py-2 pl-2" style={{ width: columnWidths.date_value }}>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-muted-foreground uppercase opacity-60 tracking-wider">{parseDateLocal(tx.date).toLocaleDateString("pt-BR")}</span>
                      <p className={cn("text-sm font-black tabular-nums tracking-tight", isIncome ? "text-success" : "text-destructive")}>
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="py-2" style={{ width: columnWidths.original_desc, maxWidth: columnWidths.original_desc }}>
                    <div className="space-y-1 pr-2">
                      <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight break-words" title={tx.originalDescription}>{tx.originalDescription}</p>
                      {tx.isPotentialDuplicate && <Badge className="bg-success text-white border-none text-[8px] font-black px-1 py-0 h-4 uppercase">Duplicata</Badge>}
                    </div>
                  </TableCell>

                  <TableCell className="py-2" style={{ width: columnWidths.operation }}>
                    <Select value={tx.operationType || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { operationType: v as OperationType, categoryId: null })}>
                      <SelectTrigger className={cn("h-8 rounded-xl border-none font-black text-[9px] uppercase tracking-wider", opConfig?.bgColor || "bg-muted/40", opConfig?.color || "text-muted-foreground")}>
                        <SelectValue placeholder="TIPO" />
                      </SelectTrigger>
                      <SelectContent>{OPERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-[10px] font-black uppercase">{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="py-2" style={{ width: columnWidths.category }}>
                    <Select value={tx.categoryId || ''} onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })} disabled={['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo'].includes(tx.operationType || '')}>
                      <SelectTrigger className="h-8 rounded-xl border-none bg-muted/40 font-bold text-[10px] uppercase tracking-wider text-foreground"><SelectValue placeholder="SELECIONE" /></SelectTrigger>
                      <SelectContent className="max-h-60">{getCategoryOptions(tx.operationType).map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold">{c.icon} {c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="py-2" style={{ width: columnWidths.link }}>
                    {renderVincularSelector(tx)}
                  </TableCell>

                  <TableCell className="py-2" style={{ width: columnWidths.final_desc }}>
                    <EditableCell value={tx.description} onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })} className="text-[11px] font-black h-8 bg-muted/20 rounded-xl px-3 w-full border-none transition-colors group-hover:bg-muted/40" />
                  </TableCell>

                  <TableCell 
                    className="pr-6 text-center py-2 sticky right-0 z-20 bg-inherit shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.12)] before:content-[''] before:absolute before:inset-0 before:bg-card before:-z-10" 
                    style={{ width: columnWidths.actions }}
                  >
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