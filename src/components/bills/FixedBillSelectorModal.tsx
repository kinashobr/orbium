import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Check, Building2, Shield, ShoppingCart, Calendar, X } from "lucide-react";
import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery"; // Import useMediaQuery

export interface FixedBillSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'current' | 'future';
  currentDate: Date;
  potentialFixedBills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
}

export function FixedBillSelectorModal({
  open,
  onOpenChange,
  mode,
  potentialFixedBills,
  onToggleFixedBill,
}: FixedBillSelectorModalProps) {
  const isCurrent = mode === 'current';
  const Icon = isCurrent ? Settings : Plus;
  const isMobile = useMediaQuery("(max-width: 768px)"); // Use the hook

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,52rem)] h-[min(90vh,800px)] p-0 overflow-hidden rounded-[2rem] sm:rounded-[3rem] border-none shadow-2xl flex flex-col z-[130] dark:bg-[hsl(24_8%_10%)]">
        <DialogHeader className={cn(
          "px-6 sm:px-8 pt-8 sm:pt-10 pb-6 shrink-0 relative dark:bg-black/30 dark:border-b dark:border-white/5",
          isCurrent ? "bg-primary/5" : "bg-accent/5"
        )}>
          <div className="flex items-center gap-4 sm:gap-5">
            <div className={cn(
              "w-12 h-12 sm:w-16 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center shadow-lg",
              isCurrent ? "bg-primary/10 text-primary shadow-primary/5" : "bg-accent/10 text-accent shadow-accent/5"
            )}>
              <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-3xl font-black tracking-tighter">
                {isCurrent ? "Gerenciar Fixas" : "Adiantar Parcelas"}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {isCurrent ? "Provisionamento do Mês" : "Pagamento Antecipado"}
              </DialogDescription>
            </div>
          </div>
          {!isMobile && ( // Only show on mobile
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 sm:p-8">
          {potentialFixedBills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 sm:py-20 opacity-30">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
              <p className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Nenhuma parcela encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {potentialFixedBills.map((bill) => {
                const isLoan = bill.sourceType === 'loan_installment';
                const isInsurance = bill.sourceType === 'insurance_installment';
                
                return (
                  <button
                    key={bill.key}
                    onClick={() => onToggleFixedBill(bill, !bill.isIncluded)}
                    className={cn(
                      "p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden dark:border-white/10",
                      bill.isIncluded 
                        ? "bg-primary/10 border-primary shadow-lg shadow-primary/5 scale-[1.02]" 
                        : "bg-card border-border/40 hover:border-primary/30 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                        bill.isIncluded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {isLoan ? <Building2 className="w-5 h-5 sm:w-6 sm:h-6" /> :
                         isInsurance ? <Shield className="w-5 h-5 sm:w-6 sm:h-6" /> :
                         <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>
                      {bill.isIncluded && (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground animate-in zoom-in duration-300">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="font-black text-xs sm:text-sm text-foreground leading-tight truncate">
                        {bill.description}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        {format(parseDateLocal(bill.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/20 flex items-end justify-between">
                      <div>
                        <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor</p>
                        <p className={cn(
                          "text-base sm:text-lg font-black",
                          bill.isIncluded ? "text-primary" : "text-foreground"
                        )}>
                          {formatCurrency(bill.expectedAmount)}
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-lg border-none bg-muted/50 text-[8px] sm:text-[9px] font-black px-2 py-0.5">
                        P{bill.parcelaNumber}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-6 sm:p-8 bg-muted/10 dark:bg-black/30 border-t dark:border-white/5 shrink-0">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full h-14 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] font-black text-sm sm:text-base shadow-xl shadow-primary/10"
          >
            CONCLUIR SELEÇÃO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}