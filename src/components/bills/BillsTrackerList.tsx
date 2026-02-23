import { useState, useMemo, useCallback, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  pay: 50,
  due: 110,
  paymentDate: 110,
  description: 250,
  account: 140,
  type: 80,
  category: 180,
  amount: 130,
  actions: 60,
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
  const formatAmount = (v: string) => { const c = v.replace(/[^\d,]/g, ''); const p = c.split(','); return p.length > 2 ? v : c; };
  const parseAmount = (v: string): number => { const p = parseFloat(v.replace('.', '').replace(',', '.')); return isNaN(p) ? 0 : p; };

  const handleAddAdHocBill = () => {
    const amount = parseAmount(newBillData.amount);
    if (!newBillData.description || amount <= 0 || !newBillData.dueDate) return;
    onAddBill({ 
      description: newBillData.description, 
      dueDate: newBillData.dueDate, 
      expectedAmount: amount, 
      sourceType: 'ad_hoc', 
      suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id, 
      suggestedCategoryId: null 
    });
    setNewBillData({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
    setIsNewBillOpen(false); // Fecha ao adicionar
    toast.success("Conta adicionada com sucesso!");
  };
  
  const handleExcludeBill = (bill: BillTracker) => { if (bill.isPaid) return; onUpdateBill(bill.id, { isExcluded: true }); };
  const handleUpdateExpectedAmount = (b: BillTracker, n: number) => { onUpdateBill(b.id, { expectedAmount: n }); };
  const handleUpdateSuggestedAccount = (b: BillTracker, n: string) => { onUpdateBill(b.id, { suggestedAccountId: n }); };
  const handleUpdateSuggestedCategory = (b: BillTracker, n: string) => {
    const s = categoriasV2.find(c => c.id === n);
    let type: BillSourceType = b.sourceType;
    if (s && b.sourceType !== 'purchase_installment') { 
      type = s.nature === 'despesa_fixa' ? 'fixed_expense' : 'variable_expense'; 
    }
    onUpdateBill(b.id, { suggestedCategoryId: n, sourceType: type });
  };
  const handleUpdateDueDate = (b: BillTracker, n: string) => { if (!b.isPaid) onUpdateBill(b.id, { dueDate: n }); };
  
  const handleUpdatePaymentDate = (b: BillTracker, n: string) => {
    if (b.isPaid) {
      onUpdateBill(b.id, { paymentDate: n });
      if (b.transactionId) {
        setTransacoesV2(prev => prev.map(t =>
          (t.id === b.transactionId || (t.links?.transferGroupId && t.links.transferGroupId === b.transactionId))
            ? { ...t, date: n }
            : t
        ));
      }
    }
  };

  const sortedBills = useMemo(() => {
    const tracker = bills.filter(isBillTracker).filter(b => !b.isExcluded);
    const external = bills.filter(isExternalPaidBill);
    const pending = tracker.filter(b => !b.isPaid).sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
    const paid = [...tracker.filter(b => b.isPaid), ...external].sort((a, b) => parseDateLocal(b.paymentDate || b.dueDate).getTime() - parseDateLocal(a.paymentDate || a.dueDate).getTime());
    return [...pending, ...paid];
  }, [bills]);
  
  const formatDate = (dateStr: string) => { const date = parseDateLocal(dateStr); return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); };
  const accountOptions = useMemo(() => contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'cartao_credito').map(a => ({ value: a.id, label: a.name })), [contasMovimento]);
  const expenseCategories = useMemo(() => categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel'), [categoriasV2]);

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden">
      {/* Container do Botão Alinhado à Direita */}
      <div className="px-4 mt-4">
        <Collapsible open={isNewBillOpen} onOpenChange={setIsNewBillOpen}>
          <div className="flex justify-end mb-2">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 rounded-full gap-2 px-3 text-[10px] font-black uppercase tracking-widest transition-all",
                  isNewBillOpen 
                    ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white" 
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                )}
              >
                {isNewBillOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {isNewBillOpen ? 'Fechar' : 'Nova Conta'}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="glass-card p-4 bg-muted/30 dark:bg-white/5 border border-border/40 dark:border-white/5 rounded-2xl overflow-hidden mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_50px] gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Descrição</Label>
                  <Input 
                    value={newBillData.description} 
                    onChange={(e) => setNewBillData(prev => ({ ...prev, description: e.target.value }))} 
                    placeholder="Descrição do lançamento..." 
                    className="h-10 text-sm font-bold rounded-xl" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Valor</Label>
                  <Input 
                    type="text" 
                    inputMode="decimal" 
                    value={newBillData.amount} 
                    onChange={(e) => setNewBillData(prev => ({ ...prev, amount: formatAmount(e.target.value) }))} 
                    placeholder="0,00" 
                    className="h-10 text-sm font-black rounded-xl" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Vencimento</Label>
                  <Input 
                    type="date" 
                    value={newBillData.dueDate} 
                    onChange={(e) => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))} 
                    className="h-10 text-sm font-bold rounded-xl" 
                  />
                </div>
                <Button 
                  onClick={handleAddAdHocBill} 
                  className="h-10 w-full p-0 rounded-xl" 
                  disabled={!newBillData.description || parseAmount(newBillData.amount) <= 0}
                >
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-4">
        <div className="flex-1 overflow-x-auto scrollbar-material border border-border/40 rounded-[2rem] bg-card/50">
          <div className="min-w-max p-4 pt-2">
            <Table style={{ minWidth: `${totalWidth}px` }}>
              <TableHeader className="sticky top-0 bg-card/95 dark:bg-[hsl(24_8%_14%)] backdrop-blur-sm z-10">
                <TableRow className="border-border hover:bg-transparent h-12">
                  {columnHeaders.map((h) => (
                    <TableHead key={h.key} className={cn("text-muted-foreground p-3 text-[10px] font-black uppercase tracking-widest relative", h.align === 'center' && 'text-center', h.align === 'right' && 'text-right')} style={{ width: columnWidths[h.key] }}>
                      {h.label}
                      {h.key !== 'actions' && <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize" onMouseDown={(e) => handleMouseDown(e, h.key)} />}
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
                    <TableRow key={bill.id} className={cn("hover:bg-muted/30 transition-colors h-14 border-b border-border/20", isExt && "opacity-60", isOver && "bg-destructive/[0.03]", isPaid && !isExt && "bg-success/[0.03]")}>
                      <TableCell className="text-center p-2" style={{ width: columnWidths.pay }}>
                        {isExt ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <Checkbox checked={isPaid} onCheckedChange={(c) => onTogglePaid(bill as BillTracker, c as boolean)} className="h-5 w-5 rounded-lg" />}
                      </TableCell>
                      <TableCell className={cn("text-xs font-bold p-3", isOver && "text-destructive")} style={{ width: columnWidths.due }}>
                          {isExt || isPaid ? formatDate(bill.dueDate) : <EditableCell value={bill.dueDate} type="date" onSave={(v) => handleUpdateDueDate(bill as BillTracker, String(v))} className="text-xs h-9 bg-muted/20" />}
                      </TableCell>
                      <TableCell className="text-xs font-bold p-3" style={{ width: columnWidths.paymentDate }}>
                          {isPaid && bill.paymentDate ? (isExt ? formatDate(bill.paymentDate) : <EditableCell value={bill.paymentDate} type="date" onSave={(v) => handleUpdatePaymentDate(bill as BillTracker, String(v))} className="text-xs text-success h-9 bg-success/5" />) : <span className="opacity-20">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate p-3 font-black text-foreground" style={{ width: columnWidths.description }}>{bill.description}</TableCell>
                      <TableCell className="p-3" style={{ width: columnWidths.account }}>
                        {isExt || isPaid ? <span className="text-xs font-bold opacity-80">{contasMovimento.find(a => a.id === bill.suggestedAccountId)?.name || 'N/A'}</span> : 
                        <Select value={bill.suggestedAccountId || ''} onValueChange={(v) => handleUpdateSuggestedAccount(bill as BillTracker, v)}><SelectTrigger className="h-9 text-[10px] font-black uppercase px-3 rounded-xl border-none bg-muted/30"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{accountOptions.map(o => <SelectItem key={o.value} value={o.value} className="text-[10px] font-black uppercase">{o.label}</SelectItem>)}</SelectContent></Select>}
                      </TableCell>
                      <TableCell className="p-2 text-center" style={{ width: columnWidths.type }}>
                        <Badge variant="outline" className={cn("px-2 py-1 text-[9px] font-black uppercase border-none", cfg.color.replace('text-', 'bg-') + '/10', cfg.color)} title={cfg.label}><Icon className="w-4 h-4 mr-1.5" /> {cfg.label.substring(0, 4)}</Badge>
                      </TableCell>
                      <TableCell className="p-3" style={{ width: columnWidths.category }}>
                          {isExt || isPaid ? <span className="text-xs font-bold opacity-70">{cat?.icon} {cat?.label || '—'}</span> :
                          <Select value={bill.suggestedCategoryId || ''} onValueChange={(v) => handleUpdateSuggestedCategory(bill as BillTracker, v)}>
                            <SelectTrigger className={cn(
                              "h-9 text-[10px] font-black uppercase px-3 rounded-xl border-none bg-muted/30",
                              bill.sourceType === 'loan_installment' && !bill.suggestedCategoryId && "opacity-50"
                            )}>
                              <SelectValue placeholder={bill.sourceType === 'loan_installment' ? "Opcional" : "..."} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {expenseCategories.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase">{c.icon} {c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>}
                      </TableCell>
                      <TableCell className={cn("text-right font-black text-sm p-3 tabular-nums", isPaid ? "text-success" : "text-destructive")} style={{ width: columnWidths.amount }}>
                        {!isPaid && !isExt && bill.sourceType !== 'loan_installment' && bill.sourceType !== 'insurance_installment' ? 
                        <EditableCell value={bill.expectedAmount} type="currency" onSave={(v) => handleUpdateExpectedAmount(bill as BillTracker, Number(v))} className="h-9 text-xs text-right font-black bg-muted/20" /> : 
                        formatCurrency(bill.expectedAmount)}
                      </TableCell>
                      <TableCell className="text-center p-2" style={{ width: columnWidths.actions }}>
                        {!isExt && !isPaid && (
                          (bill.sourceType === 'ad_hoc') ? (
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteBill(bill.id)}><Trash2 className="w-4 h-4" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleExcludeBill(bill as BillTracker)}><X className="w-4 h-4" /></Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}