"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { ContaCorrente, formatCurrency } from "@/types/finance";
import { CreditCard, ChevronRight, ReceiptText } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { useMemo, useState } from "react";
import { format, isSameMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const CreditCardSummaryCard = ({ account }: { account: ContaCorrente }) => {
  const { 
    transacoesV2, 
    calculateBalanceUpToDate, 
    contasMovimento, 
    billsTracker,
    creditCardConfigs,
    getCardCurrentCycleUsage,
    getCardCycleTransactions,
    getInvoiceForCard
  } = useFinance();
  
  const [isOpen, setIsOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const balance = calculateBalanceUpToDate(account.id, now, transacoesV2, contasMovimento);

  const config = useMemo(() => {
    return creditCardConfigs.find(cfg => cfg.accountId === account.id);
  }, [creditCardConfigs, account.id]);

  const activeInvoiceDate = useMemo(() => {
    if (!config) return now;

    let checkDate = now;
    for (let i = 0; i < 6; i++) {
      const cycleKey = format(checkDate, 'yyyy-MM');
      const bill = billsTracker.find(b => 
        b.sourceType === 'card_invoice' && 
        (b.sourceRef === config.id || b.cardId === config.id) && 
        b.invoiceCycle === cycleKey
      );
      if (bill?.isPaid) {
        checkDate = addMonths(checkDate, 1);
        continue;
      }

      const invoiceAmt = getInvoiceForCard(config.id, checkDate);
      const prevMonthDate = subMonths(checkDate, 1);
      const inflowsToCard = transacoesV2.filter(t => 
        t.accountId === config.accountId && 
        (t.flow === 'in' || t.flow === 'transfer_in') &&
        (isSameMonth(parseDateLocal(t.date), checkDate) || isSameMonth(parseDateLocal(t.date), prevMonthDate)) &&
        invoiceAmt > 0 && Math.abs(t.amount - invoiceAmt) < 2
      );

      if (inflowsToCard.length > 0) {
        checkDate = addMonths(checkDate, 1);
        continue;
      }

      return checkDate;
    }
    return checkDate;
  }, [config, now, billsTracker, getInvoiceForCard, transacoesV2]);

  const isCurrentInvoicePaid = !isSameMonth(activeInvoiceDate, now);

  const cycleDates = useMemo(() => {
    if (!config) return null;
    const closingDay = config.closingDay;
    const year = activeInvoiceDate.getFullYear();
    const month = activeInvoiceDate.getMonth();
    const currentClosing = new Date(year, month, Math.min(closingDay, new Date(year, month + 1, 0).getDate()));
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevClosing = new Date(prevYear, prevMonth, Math.min(closingDay, new Date(prevYear, prevMonth + 1, 0).getDate()));
    const dueDay = Math.min(config.dueDay, new Date(year, month + 1, 0).getDate());
    const dueDate = new Date(year, month, dueDay);
    return { from: prevClosing, to: currentClosing, due: dueDate };
  }, [config, activeInvoiceDate]);

  const invoiceItems = useMemo(() => {
    if (config && cycleDates) {
      return getCardCycleTransactions(config.id, activeInvoiceDate).map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        isPlanned: (tx.meta as any)?.source === 'bill_tracker' || tx.description.endsWith(' (Agendado)')
      })).sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
    } else {
      const targetMonth = subMonths(activeInvoiceDate, 1);
      
      const realTransactions = transacoesV2
        .filter(tx => tx.accountId === account.id && isSameMonth(parseDateLocal(tx.date), targetMonth))
        .map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          date: tx.date,
          isPlanned: false
        }));

      const plannedBills = billsTracker
        .filter(bill => 
          bill.suggestedAccountId === account.id && 
          isSameMonth(parseDateLocal(bill.dueDate), targetMonth) &&
          !bill.isPaid
        )
        .map(bill => ({
          id: bill.id,
          description: bill.description,
          amount: bill.expectedAmount,
          date: bill.dueDate,
          isPlanned: true
        }));

      return [...realTransactions, ...plannedBills]
        .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
    }
  }, [config, cycleDates, getCardCycleTransactions, activeInvoiceDate, billsTracker, account.id, transacoesV2]);

  const displayedBalance = useMemo(() => {
    if (config) {
      return getInvoiceForCard(config.id, activeInvoiceDate);
    }
    return invoiceItems.reduce((acc, item) => acc + item.amount, 0);
  }, [config, getInvoiceForCard, activeInvoiceDate, invoiceItems]);

  const cycleUsage = useMemo(() => {
    return config ? getCardCurrentCycleUsage(config.id) : Math.abs(balance);
  }, [config, getCardCurrentCycleUsage, balance]);

  const limitLivre = useMemo(() => {
    return config ? Math.max(0, config.limit - cycleUsage) : 0;
  }, [config, cycleUsage]);

  if (!config && Math.abs(balance) < 0.01 && displayedBalance < 0.01) return null;

  return (
    <div className="bg-card rounded-[32px] border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden group animate-fade-in relative">
      {/* Ícone Decorativo de Fundo */}
      <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-amber-950/[0.08] dark:text-white/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
        <CreditCard className="w-56 h-56" />
      </div>

      <input type="checkbox" id="cc-dummy" className="hidden" />

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-6 cursor-pointer hover:bg-muted/5 transition-colors space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="p-4 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 mx-auto"
                  style={{ 
                    backgroundColor: `${account.color}15`,
                    color: account.color || 'hsl(var(--primary))'
                  }}
                >
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-80">
                    Cartão de Crédito
                  </span>
                  <h4 className="text-xl font-black text-foreground">{account.name}</h4>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <div className="flex items-center justify-end gap-1.5">
                    {isCurrentInvoicePaid && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        Atual Paga
                      </span>
                    )}
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider opacity-85">
                      {isCurrentInvoicePaid ? "Próxima Fatura" : "Fatura Atual"}
                    </p>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-destructive tabular-nums">
                    {formatCurrency(displayedBalance)}
                  </p>
                </div>
                <div className={cn(
                  "p-2 rounded-full bg-muted/10 text-muted-foreground transition-transform duration-300",
                  isOpen && "rotate-90"
                )}>
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Credit Card Specs & Limits Header Info */}
            <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 gap-y-3 pt-3 border-t border-border/60">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80 truncate">Fechamento</p>
                <p className="text-sm font-bold text-foreground">
                  {cycleDates ? format(cycleDates.to, "dd/MM") : "Não def."}
                </p>
              </div>
              
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80 truncate">Vencimento</p>
                <p className="text-sm font-bold text-destructive">
                  {cycleDates ? format(cycleDates.due, "dd/MM") : "Não def."}
                </p>
              </div>
              
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80 truncate">Limite Total</p>
                <p className="text-sm font-extrabold text-foreground tabular-nums truncate">
                  {config ? formatCurrency(config.limit) : "Não def."}
                </p>
              </div>
              
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80 truncate">Livre / Usado</p>
                <div className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0">
                  <span className="text-success shrink-0">{formatCurrency(limitLivre)}</span>
                  <span className="text-muted-foreground/50 shrink-0 font-normal">/</span>
                  <span className="text-destructive shrink-0">{formatCurrency(cycleUsage)}</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-6 pb-6 pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
            <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2 mb-2">
              <ReceiptText className="w-4 h-4" /> Itens da Fatura de {format(activeInvoiceDate, 'MMMM', { locale: ptBR })}
            </div>
            
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
              {invoiceItems.length > 0 ? invoiceItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 group/item">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                       "w-2 h-2 rounded-full transition-colors",
                       item.isPlanned ? "bg-amber-400/60 group-hover/item:bg-amber-400" : "bg-destructive/60 group-hover/item:bg-destructive"
                    )} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{item.description}</p>
                        {item.isPlanned && (
                          <span className="text-[9px] font-black uppercase tracking-tighter text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">Previsto</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">{format(parseDateLocal(item.date), 'dd/MM')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-foreground tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-center py-4 text-muted-foreground font-medium italic">Nenhum lançamento identificado nesta fatura.</p>
              )}
            </div>
            
            <div className="pt-4 border-t border-border/40 flex justify-between items-center">
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-bold uppercase tracking-widest">
                Limite Utilizado
              </Badge>
              <span className="text-xs font-bold text-muted-foreground">
                Vence em {cycleDates ? format(cycleDates.due, "dd/MM") : "Não def."}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
