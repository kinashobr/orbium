import { Badge } from "@/components/ui/badge";
import { Building2, Shield, ShoppingCart, Calendar, Check } from "lucide-react";
import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdvanceInstallmentsTabContentProps {
  potentialFixedBills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
}

export function AdvanceInstallmentsTabContent({ potentialFixedBills, onToggleFixedBill }: AdvanceInstallmentsTabContentProps) {
  if (potentialFixedBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 opacity-30">
        <Calendar className="w-12 h-12 mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma parcela futura disponível</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {potentialFixedBills.map((bill) => (
        <button
          key={bill.key}
          onClick={() => onToggleFixedBill(bill, !bill.isIncluded)}
          className={cn(
            "p-4 rounded-2xl border-2 text-left transition-all group relative overflow-hidden dark:border-white/10",
            bill.isIncluded
              ? "bg-accent/10 border-accent shadow-lg shadow-accent/5 scale-[1.02]"
              : "bg-card border-border/40 hover:border-accent/30 hover:bg-muted/20"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
              bill.isIncluded ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            )}>
              {bill.sourceType === 'loan_installment' ? <Building2 className="w-5 h-5" /> :
               bill.sourceType === 'insurance_installment' ? <Shield className="w-5 h-5" /> :
               bill.sourceType === 'purchase_installment' ? <ShoppingCart className="w-5 h-5" /> :
               <Calendar className="w-5 h-5" />}
            </div>
            {bill.isIncluded && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-accent-foreground animate-in zoom-in duration-300">
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="font-black text-xs text-foreground leading-tight truncate">{bill.description}</p>
            <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <Calendar className="w-3 h-3" />
              {format(parseDateLocal(bill.dueDate), "dd 'de' MMMM yyyy", { locale: ptBR })}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/20 flex items-end justify-between">
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Valor</p>
              <p className={cn("text-base font-black", bill.isIncluded ? "text-accent" : "text-foreground")}>
                {formatCurrency(bill.expectedAmount)}
              </p>
            </div>
            <Badge variant="outline" className="rounded-lg border-none bg-muted/50 text-[8px] font-black px-2 py-0.5">
              P{bill.parcelaNumber}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
