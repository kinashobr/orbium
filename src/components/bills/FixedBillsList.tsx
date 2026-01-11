import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Calendar } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";

export interface FixedBillsListProps {
  bills: PotentialFixedBill[];
  onToggle: (bill: PotentialFixedBill, isChecked: boolean) => void;
  emptyMessage?: string;
}

export function FixedBillsList({ bills, onToggle, emptyMessage }: FixedBillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
        {emptyMessage || "Nenhuma conta encontrada."}
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-3">
      {bills.map((bill) => {
        const isLoan = bill.sourceType === 'loan_installment';
        const Icon = isLoan ? Building2 : Shield;
        
        return (
          <div
            key={bill.key}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2 transition-colors",
              bill.isIncluded 
                ? "bg-primary/5 border-primary/30" 
                : "bg-background border-input hover:border-primary/20"
            )}
          >
            <div className="flex items-center gap-4">
              <Checkbox
                id={bill.key}
                checked={bill.isIncluded}
                onCheckedChange={(checked) => onToggle(bill, checked as boolean)}
                disabled={bill.isPaid}
                className="w-5 h-5 rounded-md"
              />
              
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isLoan ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div>
                  <label htmlFor={bill.key} className="font-semibold text-sm cursor-pointer block">
                    {bill.description}
                  </label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Vence em {formatDate(bill.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-base">{formatCurrency(bill.expectedAmount)}</div>
              {bill.isPaid ? (
                <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 py-0 h-4">
                  Pago
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                  Pendente
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}