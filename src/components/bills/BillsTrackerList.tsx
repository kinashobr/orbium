import { useState, useMemo, useCallback, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Trash2, Check, Clock, AlertTriangle, DollarSign, Building2, 
  Shield, Repeat, Info, X, TrendingDown, CheckCircle2, ShoppingCart, 
  CreditCard, ChevronDown, ChevronUp 
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, BillSourceType, formatCurrency, CATEGORY_NATURE_LABELS, BillDisplayItem, ExternalPaidBill } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { EditableCell } from "../EditableCell";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategorySearchSelector } from "./CategorySearchSelector";
import { AccountSearchSelector } from "./AccountSearchSelector";

interface BillsTrackerListProps {
  bills: BillDisplayItem[];
  onUpdateBill: (id: string, updates: Partial<BillTracker>) => void;
  onDeleteBill: (id: string) => void;
  onAddBill: (bill: Omit<BillTracker, "id" | "isPaid" | "type">) => void;
  onTogglePaid: (bill: BillTracker, isChecked: boolean) => void;
  currentDate: Date;
}

const SOURCE_CONFIG: Record<BillSourceType | 'external_expense', { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Fixa' },
  variable_expense: { icon: DollarSign, color: 'text-warning', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa' },
  purchase_installment: { icon: ShoppingCart, color: 'text-pink-500', label: 'Parcela' },
  card_invoice: { icon: CreditCard, color: 'text-violet-500', label: 'Fatura' },
  external_expense: { icon: CheckCircle2, color: 'text-success', label: 'Extrato' },
};

const COLUMN_KEYS = ['pay', 'due', 'paymentDate', 'description', 'account', 'type', 'category', 'amount', 'actions'] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  pay: 45,
  due: 100,
  paymentDate: 100,
  description: 200,
  account: 120,
  type: 75,
  category: 140,
  amount: 110,
  actions: 50,
};

const columnHeaders: { key: ColumnKey, label: string, align?: 'center' | 'right' }[] = [
  { key: 'pay', label: 'Pg', align: 'center' },
  { key: 'due', label: 'Vencto' },
  { key: 'paymentDate', label: 'Pgto' },
  { key: 'description', label: 'Descrição' },
  { key: 'account', label: 'Conta' },
  { key: 'type', label: 'Tipo' },
  { key: 'category', label: 'Categoria' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'actions', label: '', align: 'center' },
];

const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => bill.type === 'tracker';
const isExternalPaidBill = (bill: BillDisplayItem): bill is ExternalPaidBill => bill.type === 'external_paid';

export function BillsTrackerList({
  bills,
  onUpdateBill,
  onDeleteBill,
  onAddBill,
  onTogglePaid,
  currentDate,
}: BillsTrackerListProps) {
  const { categoriasV2, contasMovimento, setBillsTracker, setTransacoesV2 } = useFinance();
  const [newBillData, setNewBillData] = useState({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try { 
      const saved = localStorage.getItem('bills_column_widths'); 
      return saved ? JSON.parse(saved) : INITIAL_WIDTHS; 
    } catch { 
      return INITIAL_WIDTHS; 
    }
  });
  
  useEffect(() => { 
    localStorage.setItem('bills_column_widths', JSON.stringify(columnWidths)); 
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
    const newWidth = Math.max(30, startWidth + deltaX); 
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
  const formatAmountInput = (v: string) => { 
    const digits = v.replace(/\D/g, "");
    if (!digits) return "";
    const val = parseInt(digits) / 100;
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const parseAmount = (v: string): number => { const p = parseFloat(v.replace(/\./g, '').replace(',', '.')); return isNaN(p) ? 0 : p; };

  const handleAddAdHocBill = () => {
    const amount = parseAmount(newBillData.amount);
    if (!newBillData.description || amount <= 0 || !newBillData.dueDate) return;
    onAddBill({ description: newBillData.description, dueDate: newBillData.dueDate, expectedAmount: amount, sourceType: 'ad_hoc', suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id, suggestedCategoryId: null });
    setNewBillData({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
    setIsNewBillOpen(false);
    toast.success("Conta adicionada com sucesso!");
  };
  
  const handleExcludeBill = (bill: BillTracker) => { if (bill.isPaid) return; onUpdateBill(bill.id, { isExcluded: true }); };
  const handleUpdateExpectedAmount = (b: BillTracker, n: number) => { onUpdateBill(b.id, { expectedAmount: n }); };
  const handleUpdateSuggestedAccount = (b: BillTracker, n: string) => { onUpdateBill(b.id, { suggestedAccountId: n }); };
  
  const handleUpdateSuggestedCategory = (id: string, categoryId: string) => {
    const s = categoriasV2.find(c => c.id === categoryId);
    const bill = bills.find(b => b.id === id) as BillTracker;
    if (!bill) return;

    let type: BillSourceType = bill.sourceType;
    const isFlexibleType = ['ad_hoc', 'fixed_expense', 'variable_expense'].includes(bill.sourceType);
    if (s && isFlexibleType) { type = s.nature === 'despesa_fixa' ? 'fixed_expense' : 'variable_expense'; }
    onUpdateBill(id, { suggestedCategoryId: categoryId, sourceType: type });
  };
  
  const [advanceDialog, setAdvanceDialog] = useState<{ bill: BillTracker; newDate: string; daysDiff: number } | null>(null);

  const handleUpdateDueDate = (b: BillTracker, n: string) => {
    if (b.isPaid) return;
    const isInstallment = b.sourceType === 'loan_installment' || b.sourceType === 'insurance_installment';
    if (isInstallment) {
      const oldDate = parseDateLocal(b.dueDate);
      const newDate = parseDateLocal(n);
      const daysDiff = Math.round((oldDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0) {
        setAdvanceDialog({ bill: b, newDate: n, daysDiff });
        return;
      }
    }
    onUpdateBill(b.id, { dueDate: n });
  };

  const handleConfirmAdvance = (advanceAll: boolean) => {
    if (!advanceDialog) return;
    const { bill, newDate, daysDiff } = advanceDialog;
    onUpdateBill(bill.id, { dueDate: newDate });
    if (advanceAll && bill.sourceRef) {
      setBillsTracker(prev => prev.map(b => {
        if (b.sourceType === bill.sourceType && b.sourceRef === bill.sourceRef && b.parcelaNumber && bill.parcelaNumber && b.parcelaNumber > bill.parcelaNumber && !b.isPaid) {
          const oldDue = parseDateLocal(b.dueDate);
          const shifted = new Date(oldDue.getTime() - daysDiff * 24 * 60 * 60 * 1000);
          return { ...b, dueDate: format(shifted, 'yyyy-MM-dd') };
        }
        return b;
      }));
      toast.success(`Parcelas subsequentes antecipadas em ${daysDiff} dias.`);
    }
    setAdvanceDialog(null);
  };
  const handleUpdatePaymentDate = (b: BillTracker, n: string) => { if (b.isPaid) { onUpdateBill(b.id, { paymentDate: n }); if (b.transactionId) { setTransacoesV2(prev => prev.map(t => (t.id === b.transactionId || (t.links?.transferGroupId && t.links.transferGroupId === b.transactionId)) ? { ...t, date: n } : t)); } } };

  const sortedBills = useMemo(() => {
    const tracker = bills.filter(isBillTracker).filter(b => !b.isExcluded);
    const external = bills.filter(isExternalPaidBill);
    const pending = tracker.filter(b => !b.isPaid).sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
    const paid = [...tracker.filter(b => b.isPaid), ...external].sort((a, b) => parseDateLocal(b.paymentDate || b.dueDate).getTime() - parseDateLocal(a.paymentDate || a.dueDate).getTime());
    return [...pending, ...paid];
  }, [bills]);
  
  const formatDate = (dateStr: string) => { const date = parseDateLocal(dateStr); return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); };
  const accountOptions = useMemo(() => contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'cartao_credito'), [contasMovimento]);
  const expenseCategories = useMemo(() => categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel'), [categoriasV2]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-4 pt-1 relative h-full">
      <Collapsible open={isNewBillOpen} onOpenChange={setIsNewBillOpen} className="shrink-0 w-full">
        <div className="flex justify-end pr-6 -mb-1 relative z-20">
          <CollapsibleTrigger asChild>
            <button className={cn("p-1.5 transition-all duration-300 rounded-md group text-muted-foreground/30 hover:text-primary hover:bg-primary/10", isNewBillOpen && "rotate-180 text-destructive/50 hover:text-destructive hover:bg-destructive/10")} title={isNewBillOpen ? "Fechar" : "Nova Conta"}>
              <ChevronDown className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="overflow-hidden">
          <div className="mb-4 mt-1 p-5 bg-gradient-to-r from-primary/[0.12] to-primary/[0.04] border border-primary/30 dark:border-primary/20 rounded-[2rem] animate-in fade-in slide-in-from-top-1 duration-500 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
              <Plus className="w-24 h-24 rotate-12" />
            </div>
            
            <div className="flex flex-col md:flex-row gap-5 items-end relative z-10">
              <div className="flex-[4] w-full space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 px-1">Descrição</Label>
                <Input 
                  value={newBillData.description} 
                  onChange={(e) => setNewBillData(prev => ({ ...prev, description: e.target.value }))} 
                  placeholder="Ex: Manutenção Escritório" 
                  className="h-11 text-xs font-bold rounded-xl border-primary/20 bg-card/80 focus:bg-card focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40" 
                />
              </div>
              <div className="flex-[1.5] w-full space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 px-1">Valor</Label>
                <Input 
                  type="text" 
                  inputMode="decimal" 
                  value={newBillData.amount} 
                  onChange={(e) => setNewBillData(prev => ({ ...prev, amount: formatAmountInput(e.target.value) }))} 
                  placeholder="0,00" 
                  className="h-11 text-xs font-black rounded-xl border-primary/20 bg-card/80 focus:bg-card focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40 text-right" 
                />
              </div>
              <div className="flex-[1.5] w-full space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 px-1">Vencimento</Label>
                <Input 
                  type="date" 
                  value={newBillData.dueDate} 
                  onChange={(e) => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))} 
                  className="h-11 text-xs font-bold rounded-xl border-primary/20 bg-card/80 focus:bg-card focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" 
                />
              </div>
              <Button 
                onClick={handleAddAdHocBill} 
                className="h-11 px-8 shrink-0 rounded-xl shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-[0.2em] gap-2 bg-primary hover:bg-primary/90 transition-all active:scale-95" 
                disabled={!newBillData.description || parseAmount(newBillData.amount) <= 0}
              >
                <Plus className="w-4 h-4" /> LANÇAR
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex-1 flex flex-col min-h-0 bg-card/50 border border-border/40 rounded-[2rem] overflow-hidden shadow-inner">
        <div className="flex-1 overflow-auto scrollbar-material">
          <div className="p-4 pt-2" style={{ minWidth: `${totalWidth + 32}px` }}>
            <Table className="table-fixed border-separate border-spacing-y-1.5">
              <TableHeader className="relative z-10">
                <TableRow className="border-none hover:bg-transparent h-12">
                  {columnHeaders.map((h) => (
                    <TableHead key={h.key} className={cn("sticky top-0 bg-card/95 backdrop-blur-md text-muted-foreground px-4 py-3 text-[10px] font-black uppercase tracking-widest relative border-none shadow-sm z-20", h.align === 'center' && 'text-center', h.align === 'right' && 'text-right')} style={{ width: columnWidths[h.key] }}>
                      {h.label}
                      {h.key !== 'actions' && <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 cursor-col-resize hover:bg-primary/40 rounded-full transition-colors" onMouseDown={(e) => handleMouseDown(e, h.key)} />}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBills.map((bill) => {
                  const isExt = isExternalPaidBill(bill);
                  const cfg = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
                  const Icon = cfg.icon;
                  const isOver = parseDateLocal(bill.dueDate) < currentDate && !bill.isPaid;
                  const isPaid = bill.isPaid;
                  const cat = expenseCategories.find(c => c.id === bill.suggestedCategoryId);
                  return (
                    <TableRow
                      key={bill.id}
                      className={cn(
                        "group transition-all duration-200 h-12 border-none rounded-xl",
                        isExt && "opacity-60",
                        isOver && "bg-destructive/[0.04] hover:bg-destructive/[0.08]",
                        isPaid && !isExt && "bg-success/[0.04] hover:bg-success/[0.08]",
                        !isPaid && !isOver && "bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      <TableCell className="text-center px-4 py-1 first:rounded-l-xl" style={{ width: columnWidths.pay }}>
                        {isExt ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <Checkbox checked={isPaid} onCheckedChange={(c) => onTogglePaid(bill as BillTracker, c as boolean)} className="h-5 w-5 rounded-lg border-2" />}
                      </TableCell>
                      
                      <TableCell className={cn("text-xs font-bold px-4 py-1", isOver && "text-destructive")} style={{ width: columnWidths.due }}>
                        {isExt || isPaid ? (
                          <div className="h-8 flex items-center px-3">{formatDate(bill.dueDate)}</div>
                        ) : (
                          <EditableCell 
                            value={bill.dueDate} 
                            type="date" 
                            onSave={(v) => handleUpdateDueDate(bill as BillTracker, String(v))} 
                            className="text-xs h-8 bg-background/50 border-none shadow-none hover:bg-background rounded-xl px-3" 
                          />
                        )}
                      </TableCell>
                      
                      <TableCell className="text-xs font-bold px-4 py-1" style={{ width: columnWidths.paymentDate }}>
                        {isPaid && bill.paymentDate ? (
                          isExt ? (
                            <div className="h-8 flex items-center px-3">{formatDate(bill.paymentDate)}</div>
                          ) : (
                            <EditableCell 
                              value={bill.paymentDate} 
                              type="date" 
                              onSave={(v) => handleUpdatePaymentDate(bill as BillTracker, String(v))} 
                              className="text-xs text-success h-8 bg-success/10 border-none shadow-none hover:bg-success/20 rounded-xl px-3 font-black" 
                            />
                          )
                        ) : <div className="h-8 flex items-center px-3 opacity-20">—</div>}
                      </TableCell>
                      
                      <TableCell className="text-xs px-4 py-1 font-black text-foreground" style={{ width: columnWidths.description }}>
                        <div className="w-full">
                          {isExt || isPaid ? (
                            <div className="h-8 flex items-center px-3 truncate">{bill.description}</div>
                          ) : (
                            <EditableCell 
                              value={bill.description} 
                              type="text" 
                              onSave={(v) => onUpdateBill(bill.id, { description: String(v) })} 
                              className="text-xs h-8 font-black bg-background/50 border-none shadow-none hover:bg-background rounded-xl px-3 w-full truncate" 
                            />
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-4 py-1" style={{ width: columnWidths.account }}>
                        {isExt || isPaid ? (
                          <div className="h-8 flex items-center px-3 text-xs font-bold opacity-80 truncate">
                            {contasMovimento.find(a => a.id === bill.suggestedAccountId)?.name || 'N/A'}
                          </div>
                        ) : (
                          <AccountSearchSelector
                            value={bill.suggestedAccountId}
                            accounts={accountOptions}
                            onSelect={(v) => handleUpdateSuggestedAccount(bill as BillTracker, v)}
                          />
                        )}
                      </TableCell>
                      
                      <TableCell className="px-4 py-1 text-center" style={{ width: columnWidths.type }}>
                        <div className="h-8 flex items-center justify-center">
                          <Badge variant="outline" className={cn("px-2 py-1 text-[9px] font-black uppercase border-none", cfg.color.replace('text-', 'bg-') + '/10', cfg.color)}>
                            <Icon className="w-3.5 h-3.5 mr-1" /> {cfg.label.substring(0, 4)}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-4 py-1" style={{ width: columnWidths.category }}>
                        <div className="h-8 flex items-center">
                          {bill.sourceType === 'card_invoice' ? (
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-none bg-violet-500/10 text-violet-500 px-3" title="Fatura consolida todas as compras do ciclo"><CreditCard className="w-3 h-3 mr-1" />Fatura</Badge>
                          ) : bill.sourceType === 'loan_installment' ? (
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-none bg-orange-500/10 text-orange-500 px-3"><Building2 className="w-3 h-3 mr-1" />Financiam.</Badge>
                          ) : bill.sourceType === 'insurance_installment' ? (
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-none bg-blue-500/10 text-blue-500 px-3"><Shield className="w-3 h-3 mr-1" />Seguro</Badge>
                          ) : isExt || isPaid ? (
                            <div className="text-xs font-bold opacity-70 flex items-center gap-1.5 px-3">{cat?.icon} {cat?.label || '—'}</div>
                          ) : (
                            <CategorySearchSelector
                              value={bill.suggestedCategoryId}
                              categories={expenseCategories}
                              onSelect={(v) => handleUpdateSuggestedCategory(bill.id, v)}
                            />
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className={cn("text-right font-black text-xs px-4 py-1 tabular-nums", isPaid ? "text-success" : "text-destructive")} style={{ width: columnWidths.amount }}>
                        {!isPaid && !isExt && bill.sourceType !== 'loan_installment' && bill.sourceType !== 'insurance_installment' ? (
                          <EditableCell 
                            value={bill.expectedAmount} 
                            type="currency" 
                            onSave={(v) => handleUpdateExpectedAmount(bill as BillTracker, Number(v))} 
                            className="h-8 text-xs text-right font-black bg-background/50 border-none shadow-none hover:bg-background rounded-xl px-3" 
                          />
                        ) : (
                          <div className="h-8 flex items-center justify-end px-3">{formatCurrency(bill.expectedAmount)}</div>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-center px-4 py-1 last:rounded-r-xl" style={{ width: columnWidths.actions }}>
                        <div className="h-8 flex items-center justify-center">
                          {!isExt && !isPaid && (
                            bill.sourceType === 'ad_hoc' ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => onDeleteBill(bill.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => handleExcludeBill(bill as BillTracker)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={!!advanceDialog} onOpenChange={(open) => !open && setAdvanceDialog(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Antecipar parcelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você antecipou o vencimento em <strong>{advanceDialog?.daysDiff} dias</strong>. Deseja antecipar as próximas parcelas deste mesmo compromisso também?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmAdvance(false)} className="rounded-xl">Apenas esta</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmAdvance(true)} className="rounded-xl">Antecipar todas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}