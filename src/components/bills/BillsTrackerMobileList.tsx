import { useMemo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { BillDisplayItem, BillSourceType, BillTracker, ExternalPaidBill, formatCurrency } from "@/types/finance";
import {
  Building2,
  Shield,
  Repeat,
  DollarSign,
  Info,
  ShoppingCart,
  CheckCircle2,
  CreditCard,
  Trash2,
  X,
  Pencil,
} from "lucide-react";
import { EditableCell } from "../EditableCell";
import { differenceInCalendarDays, startOfDay } from "date-fns";

interface BillsTrackerMobileListProps {
  bills: BillDisplayItem[];
  onUpdateBill: (id: string, updates: Partial<BillTracker>) => void;
  onDeleteBill: (id: string) => void;
  onAddBill: (bill: Omit<BillTracker, "id" | "isPaid" | "type">) => void;
  onTogglePaid: (bill: BillTracker, isChecked: boolean) => void;
  currentDate: Date;
}

const SOURCE_CONFIG_MOBILE: Record<
  BillSourceType | "external_expense",
  { icon: React.ElementType; color: string; label: string }
> = {
  loan_installment: { icon: Building2, color: "text-orange-500", label: "Empréstimo" },
  insurance_installment: { icon: Shield, color: "text-blue-500", label: "Seguro" },
  fixed_expense: { icon: Repeat, color: "text-purple-500", label: "Fixa" },
  variable_expense: { icon: DollarSign, color: "text-warning", label: "Variável" },
  ad_hoc: { icon: Info, color: "text-primary", label: "Avulsa" },
  purchase_installment: { icon: ShoppingCart, color: "text-pink-500", label: "Parcela" },
  card_invoice: { icon: CreditCard, color: "text-violet-500", label: "Fatura" },
  external_expense: { icon: CheckCircle2, color: "text-success", label: "Extrato" },
};

const isExternalPaidBill = (bill: BillDisplayItem): bill is ExternalPaidBill => bill.type === "external_paid";
const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => bill.type === "tracker";

const formatDateLabel = (dateStr: string) => {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export function BillsTrackerMobileList({
  bills,
  onTogglePaid,
  onDeleteBill,
  onUpdateBill,
}: BillsTrackerMobileListProps) {
  const { contasMovimento, categoriasV2 } = useFinance();
  const todayMid = startOfDay(new Date());

  const handleExcludeBill = useCallback((bill: BillTracker) => {
    if (bill.isPaid) return;
    onUpdateBill(bill.id, { isExcluded: true });
  }, [onUpdateBill]);

  const sections = useMemo(() => {
    const result: Record<
      "overdue" | "today" | "upcoming" | "paid",
      BillDisplayItem[]
    > = {
      overdue: [],
      today: [],
      upcoming: [],
      paid: [],
    };

    const sorted = [...bills].sort(
      (a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime()
    );

    sorted.forEach((bill) => {
      const isPaid = bill.isPaid || isExternalPaidBill(bill);
      const due = parseDateLocal(bill.dueDate);
      const dueMid = startOfDay(due);
      const diffDays = differenceInCalendarDays(dueMid, todayMid);

      if (isPaid) {
        result.paid.push(bill);
        return;
      }

      if (diffDays < 0) {
        result.overdue.push(bill);
      } else if (diffDays === 0) {
        result.today.push(bill);
      } else {
        result.upcoming.push(bill);
      }
    });

    return result;
  }, [bills, todayMid]);

  const renderSection = (
    key: keyof typeof sections,
    label: string,
    accentClass: string,
  ) => {
    const items = sections[key];
    if (!items.length) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className={cn("text-[11px] font-black uppercase tracking-[0.2em]", accentClass)}>
            {label}
          </p>
          <Badge variant="outline" className="text-[10px] font-bold border-none bg-muted/50 text-muted-foreground px-2 h-5">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>

        <div className="grid gap-3">
          {items.map((bill) => {
            const cfg = SOURCE_CONFIG_MOBILE[bill.sourceType] || SOURCE_CONFIG_MOBILE.ad_hoc;
            const Icon = cfg.icon;
            const isExt = isExternalPaidBill(bill);
            const isPaid = bill.isPaid || isExt;
            const cat = categoriasV2.find(c => c.id === bill.suggestedCategoryId);
            const account = contasMovimento.find(a => a.id === bill.suggestedAccountId);

            return (
              <div
                key={bill.id}
                className={cn(
                  "relative group rounded-[1.5rem] border p-4 flex gap-4 items-center transition-all duration-300",
                  isPaid ? "bg-success/[0.03] border-success/10 opacity-80" :
                  key === 'overdue' ? "bg-destructive/[0.03] border-destructive/10 shadow-sm" :
                  "bg-card border-border/40 shadow-sm active:scale-[0.98]"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors",
                  isPaid ? "bg-success/15 text-success" :
                  key === 'overdue' ? "bg-destructive/15 text-destructive" :
                  "bg-muted/80 text-muted-foreground"
                )}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate flex-1">
                      {!isPaid && !isExt && isBillTracker(bill) ? (
                        <EditableCell
                          value={bill.description}
                          type="text"
                          onSave={(v) => onUpdateBill(bill.id, { description: String(v) })}
                          className="text-sm font-black bg-transparent border-none p-0 h-auto focus-visible:ring-0 truncate"
                        />
                      ) : (
                        <p className="text-sm font-black text-foreground truncate">
                          {bill.description}
                        </p>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm font-black tabular-nums shrink-0",
                      isPaid ? "text-success" : key === 'overdue' ? "text-destructive" : "text-foreground"
                    )}>
                      {formatCurrency(bill.expectedAmount)}
                    </p>
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60">
                      {cat && <span className="flex items-center gap-1">{cat.icon} {cat.label}</span>}
                      {account && (
                        <>
                          <span className="opacity-30">•</span>
                          <span className="truncate max-w-[80px]">{account.name}</span>
                        </>
                      )}
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase px-1.5 h-4 border-none",
                      isPaid ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground/60"
                    )}>
                      {isPaid ? "Pago " : "Vence "}
                      {formatDateLabel(bill.paymentDate || bill.dueDate)}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center pl-2 border-l border-border/10 shrink-0">
                  {isExt ? (
                    <CheckCircle2 className="w-6 h-6 text-success/40" />
                  ) : (
                    <Checkbox
                      className="h-6 w-6 rounded-lg border-2 data-[state=checked]:bg-success data-[state=checked]:border-success"
                      checked={bill.isPaid}
                      onCheckedChange={(checked) =>
                        onTogglePaid(bill as BillTracker, checked as boolean)
                      }
                    />
                  )}
                  {!isPaid && !isExt && isBillTracker(bill) && (
                    <div className="absolute -top-1 -right-1 flex gap-1">
                       {(bill.sourceType === 'ad_hoc') ? (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 rounded-full shadow-md bg-background hover:bg-destructive hover:text-white transition-all scale-0 group-hover:scale-100"
                          onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 rounded-full shadow-md bg-background hover:bg-destructive hover:text-white transition-all scale-0 group-hover:scale-100"
                          onClick={(e) => { e.stopPropagation(); handleExcludeBill(bill); }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto space-y-10 pb-32 no-scrollbar px-1">
      {renderSection("overdue", "Vencidos", "text-destructive")}
      {renderSection("today", "Hoje", "text-primary")}
      {renderSection("upcoming", "Próximos", "text-muted-foreground")}
      {renderSection("paid", "Concluídos", "text-success")}
      
      {bills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <CalendarCheck className="w-10 h-10" />
          </div>
          <p className="font-black uppercase tracking-[0.2em] text-[10px]">Nenhuma conta este mês</p>
        </div>
      )}
    </div>
  );
}

import { CalendarCheck } from "lucide-react";