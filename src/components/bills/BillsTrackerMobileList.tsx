import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
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
  external_expense: { icon: CheckCircle2, color: "text-success", label: "Extrato" },
};

const isExternalPaidBill = (bill: BillDisplayItem): bill is ExternalPaidBill => bill.type === "external_paid";

const formatDateLabel = (dateStr: string) => {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export function BillsTrackerMobileList({
  bills,
  onTogglePaid,
}: BillsTrackerMobileListProps) {
  const { contasMovimento, categoriasV2 } = useFinance();
  const todayMid = startOfDay(new Date());

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
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className={cn("text-[10px] font-black uppercase tracking-[0.15em]", accentClass)}>
            {label}
          </p>
          <span className="text-[10px] font-bold text-muted-foreground/50">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <div className="space-y-2.5">
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
                  "rounded-2xl border p-3.5 flex gap-4 items-center transition-all",
                  isPaid ? "bg-success/[0.02] border-success/20 opacity-75" : 
                  key === 'overdue' ? "bg-destructive/[0.02] border-destructive/20 shadow-sm" : 
                  "bg-card border-border/60 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                  isPaid ? "bg-success/10 text-success" : "bg-muted/80 text-muted-foreground"
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-foreground truncate">
                    {bill.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/70 truncate">
                    {cat && <span>{cat.icon} {cat.label}</span>}
                    {account && (
                      <>
                        <span className="opacity-30">•</span>
                        <span className="truncate">{account.name}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                    {isPaid ? "Pago em " : "Vence "}
                    {formatDateLabel(bill.paymentDate || bill.dueDate)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between gap-2 self-stretch">
                  <p className={cn(
                    "text-sm font-black tabular-nums",
                    isPaid ? "text-success" : key === 'overdue' ? "text-destructive" : "text-foreground"
                  )}>
                    {formatCurrency(bill.expectedAmount)}
                  </p>

                  {isExt ? (
                    <CheckCircle2 className="w-5 h-5 text-success/40" />
                  ) : (
                    <Checkbox
                      className="h-5 w-5 rounded-lg border-2"
                      checked={bill.isPaid}
                      onCheckedChange={(checked) =>
                        onTogglePaid(bill as BillTracker, checked as boolean)
                      }
                    />
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
    <div className="h-full overflow-y-auto space-y-8 pb-24 no-scrollbar">
      {renderSection("overdue", "Vencidos", "text-destructive")}
      {renderSection("today", "Hoje", "text-primary")}
      {renderSection("upcoming", "Próximos", "text-muted-foreground")}
      {renderSection("paid", "Concluídos", "text-success")}
      
      {bills.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
          <CalendarCheck className="w-16 h-16 mb-4" />
          <p className="font-black uppercase tracking-widest text-xs">Nenhuma conta para este mês</p>
        </div>
      )}
    </div>
  );
}

import { CalendarCheck } from "lucide-react";