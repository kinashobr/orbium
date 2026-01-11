import { useState, useMemo, useCallback, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check, Clock, AlertTriangle, DollarSign, Building2, Shield, Repeat, Info, X, TrendingDown, CheckCircle2, ShoppingCart } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, BillSourceType, formatCurrency, CATEGORY_NATURE_LABELS, BillDisplayItem, ExternalPaidBill } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { EditableCell } from "../EditableCell";

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
  external_expense: { icon: CheckCircle2, color: 'text-success', label: 'Extrato' },
};

const COLUMN_KEYS = ['pay', 'due', 'paymentDate', 'description', 'account', 'type', 'category', 'amount', 'actions'] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  pay: 40,
  due: 90,
  paymentDate: 90,
  description: 200,
  account: 120,
  type: 70,
  category: 160,
  amount: 100,
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
  const { categoriasV2, contasMovimento, setBillsTracker } = useFinance();
  const [newBillData, setNewBillData] = useState({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try { const saved = localStorage.getItem('bills_column_widths'); return saved ? JSON.parse(saved) : INITIAL_WIDTHS; } catch { return INITIAL_WIDTHS; }
  });
  
  useEffect(() => { localStorage.setItem('bills_column_widths', JSON.stringify(columnWidths)); }, [columnWidths]);
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent, key: ColumnKey) => { e.preventDefault(); setResizingColumn(key); setStartX(e.clientX); setStartWidth(columnWidths[key]); };
  const handleMouseMove = useCallback((e: MouseEvent) => { if (!resizingColumn) return; const deltaX = e.clientX - startX; const newWidth = Math.max(30, startWidth + deltaX); setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth })); }, [resizingColumn, startX, startWidth]);
  const handleMouseUp = useCallback(() => { setResizingColumn(null); }, []);
  useEffect(() => {
    if (resizingColumn) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'col-resize'; } 
    else { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'default'; }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'default'; };
  }, [resizingColumn, handleMouseMove, handleMouseUp]);
  
  const totalWidth = useMemo(() => Object.values(columnWidths).reduce((sum, w) => sum + w, 0), [columnWidths]);
  const formatAmount = (v: string) => { const c = v.replace(/[^\d,]/g, ''); const p = c.split(','); return p.length > 2 ? v : c; };
  const parseAmount = (v: string): number => { const p = parseFloat(v.replace('.', '').replace(',', '.')); return isNaN(p) ? 0 : p; };

  const handleAddAdHocBill = () => {
    const amount = parseAmount(newBillData.amount);
    if (!newBillData.description || amount <= 0 || !newBillData.dueDate) return;
    onAddBill({ description: newBillData.description, dueDate: newBillData.dueDate, expectedAmount: amount, sourceType: 'ad_hoc', suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id, suggestedCategoryId: null });
    setNewBillData({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
  };
  
  const handleExcludeBill = (bill: BillTracker) => { if (bill.isPaid) return; onUpdateBill(bill.id, { isExcluded: true }); };
  const handleDeletePurchaseGroup = (ref: string) => { setBillsTracker(prev => prev.filter(b => b.sourceRef !== ref || b.isPaid)); };
  const handleUpdateExpectedAmount = (b: BillTracker, n: number) => { onUpdateBill(b.id, { expectedAmount: n }); };
  const handleUpdateSuggestedAccount = (b: BillTracker, n: string) => { onUpdateBill(b.id, { suggestedAccountId: n }); };
  const handleUpdateSuggestedCategory = (b: BillTracker, n: string) => {
    const s = categoriasV2.find(c => c.id === n);
    let type: BillSourceType = b.sourceType;
    if (s && b.sourceType !== 'purchase_installment') { type = s.nature === 'despesa_fixa' ? 'fixed_expense' : 'variable_expense'; }
    onUpdateBill(b.id, { suggestedCategoryId: n, sourceType: type });
  };
  const handleUpdateDueDate = (b: BillTracker, n: string) => { if (!b.isPaid) onUpdateBill(b.id, { dueDate: n }); };
  const handleUpdatePaymentDate = (b: BillTracker, n: string) => { if (b.isPaid) onUpdateBill(b.id, { paymentDate: n }); };

  const sortedBills = useMemo(() => {
    const tracker = bills.filter(isBillTracker).filter(b => !b.isExcluded);
    const external = bills.filter(isExternalPaidBill);
    const pending = tracker.filter(b => !b.isPaid).sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
    const paid = [...tracker.filter(b => b.isPaid), ...external].sort((a, b) => parseDateLocal(b.paymentDate || b.dueDate).getTime() - parseDateLocal(a.paymentDate || a.dueDate).getTime());
    return [...pending, ...paid];
  }, [bills]);
  
  const totalPending = useMemo(() => {
    const creditIds = new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id));
    return sortedBills.reduce((acc, b) => (!b.isPaid || (b.suggestedAccountId && creditIds.has(b.suggestedAccountId))) ? acc + b.expectedAmount : acc, 0);
  }, [sortedBills, contasMovimento]);

  const formatDate = (dateStr: string) => { const date = parseDateLocal(dateStr); return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); };
  const accountOptions = useMemo(() => contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'cartao_credito').map(a => ({ value: a.id, label: a.name })), [contasMovimento]);
  const expenseCategories = useMemo(() => categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel'), [categoriasV2]);

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden">
      <div className="glass-card p-2 shrink-0 bg-muted/30">
        <div className="grid grid-cols-[1fr_100px_110px_40px] gap-2 items-end">
          <div className="space-y-0.5">
            <Label className="cq-text-xs text-muted-foreground opacity-70">Nova Conta</Label>
            <Input value={newBillData.description} onChange={(e) => setNewBillData(prev => ({ ...prev, description: e.target.value }))} placeholder="Descrição..." className="h-8 cq-text-xs rounded-lg" />
          </div>
          <div className="space-y-0.5">
            <Label className="cq-text-xs text-muted-foreground opacity-70">Valor</Label>
            <Input type="text" inputMode="decimal" value={newBillData.amount} onChange={(e) => setNewBillData(prev => ({ ...prev, amount: formatAmount(e.target.value) }))} placeholder="0,00" className="h-8 cq-text-xs rounded-lg" />
          </div>
          <div className="space-y-0.5">
            <Label className="cq-text-xs text-muted-foreground opacity-70">Vencimento</Label>
            <Input type="date" value={newBillData.dueDate} onChange={(e) => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))} className="h-8 cq-text-xs rounded-lg" />
          </div>
          <Button onClick={handleAddAdHocBill} className="h-8 w-full p-0" disabled={!newBillData.description || parseAmount(newBillData.amount) <= 0}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="glass-card flex-1 flex flex-col min-h-0 border-t-0 rounded-t-none">
        <div className="rounded-lg overflow-y-auto flex-1 scrollbar-thin">
          <Table style={{ minWidth: `${totalWidth}px` }}>
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
              <TableRow className="border-border hover:bg-transparent h-10">
                {columnHeaders.map((h) => (
                  <TableHead key={h.key} className={cn("text-muted-foreground p-2 cq-text-xs font-bold uppercase tracking-tight relative", h.align === 'center' && 'text-center', h.align === 'right' && 'text-right')} style={{ width: columnWidths[h.key] }}>
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
                  <TableRow key={bill.id} className={cn("hover:bg-muted/30 transition-colors h-10 border-b border-border/50", isExt && "opacity-60", isOver && "bg-destructive/5", isPaid && !isExt && "bg-success/5")}>
                    <TableCell className="text-center p-1" style={{ width: columnWidths.pay }}>
                      {isExt ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" /> : <Checkbox checked={isPaid} onCheckedChange={(c) => onTogglePaid(bill as BillTracker, c as boolean)} className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className={cn("cq-text-xs font-medium p-2", isOver && "text-destructive")} style={{ width: columnWidths.due }}>
                        {isExt || isPaid ? formatDate(bill.dueDate) : <EditableCell value={bill.dueDate} type="date" onSave={(v) => handleUpdateDueDate(bill as BillTracker, String(v))} className="cq-text-xs h-7" />}
                    </TableCell>
                    <TableCell className="cq-text-xs p-2" style={{ width: columnWidths.paymentDate }}>
                        {isPaid && bill.paymentDate ? (isExt ? formatDate(bill.paymentDate) : <EditableCell value={bill.paymentDate} type="date" onSave={(v) => handleUpdatePaymentDate(bill as BillTracker, String(v))} className="cq-text-xs text-success h-7" />) : <span className="opacity-30">—</span>}
                    </TableCell>
                    <TableCell className="cq-text-xs max-w-[200px] truncate p-2 font-medium" style={{ width: columnWidths.description }}>{bill.description}</TableCell>
                    <TableCell className="p-2" style={{ width: columnWidths.account }}>
                      {isExt || isPaid ? <span className="cq-text-xs opacity-80">{contasMovimento.find(a => a.id === bill.suggestedAccountId)?.name || 'N/A'}</span> : 
                      <Select value={bill.suggestedAccountId || ''} onValueChange={(v) => handleUpdateSuggestedAccount(bill as BillTracker, v)}><SelectTrigger className="h-7 cq-text-xs px-2"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{accountOptions.map(o => <SelectItem key={o.value} value={o.value} className="cq-text-xs">{o.label}</SelectItem>)}</SelectContent></Select>}
                    </TableCell>
                    <TableCell className="p-1" style={{ width: columnWidths.type }}>
                      <Badge variant="outline" className={cn("px-1.5 py-0 cq-text-xs border-0", cfg.color)} title={cfg.label}><Icon className="w-3.5 h-3.5" /></Badge>
                    </TableCell>
                    <TableCell className="p-2" style={{ width: columnWidths.category }}>
                        {isExt || isPaid ? <span className="cq-text-xs opacity-70">{cat?.icon} {cat?.label || '—'}</span> : 
                        <Select value={bill.suggestedCategoryId || ''} onValueChange={(v) => handleUpdateSuggestedCategory(bill as BillTracker, v)}><SelectTrigger className="h-7 cq-text-xs px-2"><SelectValue placeholder="..." /></SelectTrigger><SelectContent className="max-h-48">{expenseCategories.map(c => <SelectItem key={c.id} value={c.id} className="cq-text-xs">{c.icon} {c.label}</SelectItem>)}</SelectContent></Select>}
                    </TableCell>
                    <TableCell className={cn("text-right font-bold cq-text-xs p-2", isPaid ? "text-success" : "text-destructive")} style={{ width: columnWidths.amount }}>
                      {!isPaid && !isExt && bill.sourceType !== 'loan_installment' && bill.sourceType !== 'insurance_installment' ? 
                      <EditableCell value={bill.expectedAmount} type="currency" onSave={(v) => handleUpdateExpectedAmount(bill as BillTracker, Number(v))} className="h-7 cq-text-xs text-right" /> : 
                      formatCurrency(bill.expectedAmount)}
                    </TableCell>
                    <TableCell className="text-center p-1" style={{ width: columnWidths.actions }}>
                      {!isExt && !isPaid && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleExcludeBill(bill as BillTracker)}><X className="w-3.5 h-3.5" /></Button>
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
  );
}