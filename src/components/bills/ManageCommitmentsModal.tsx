import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, ArrowLeft, CreditCard, Package, Plus, ShoppingCart, Repeat, Sparkles, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

import { CommitmentsTabContent } from "./tabs/CommitmentsTabContent";
import { CreditCardTab } from "./CreditCardTab";
import { PurchaseInstallmentTabContent, PurchaseInstallmentRef } from "./tabs/PurchaseInstallmentTabContent";
import { RecurringExpenseTabContent, RecurringExpenseRef } from "./tabs/RecurringExpenseTabContent";

interface ManageCommitmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

export function ManageCommitmentsModal({ open, onOpenChange, currentDate }: ManageCommitmentsModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const purchaseRef = useRef<PurchaseInstallmentRef>(null);
  const recurringRef = useRef<RecurringExpenseRef>(null);

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobile, open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          fullscreen={isMobile}
          className={cn(
            "p-0 shadow-2xl flex flex-col dark:bg-[hsl(24_8%_10%)]",
            !isMobile && "max-w-[min(95vw,60rem)] h-[min(90vh,850px)] rounded-[2rem]"
          )}
        >
          <DialogHeader
            className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 shrink-0 relative dark:bg-black/30 dark:border-b dark:border-white/5 bg-primary/5"
            style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-5">
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-10 w-10 shrink-0">
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                )}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-primary/10 text-primary shadow-primary/5">
                  <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter">
                    Gerenciar Compromissos
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                    Compromissos · Cartões
                  </DialogDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowPurchaseModal(true)} 
                  size="sm" 
                  className="rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest gap-1.5 h-10 px-4"
                >
                  <Plus className="w-3 h-3" />
                  Compra Parcelada
                </Button>
                <Button 
                  onClick={() => setShowRecurringModal(true)} 
                  size="sm" 
                  className="rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest gap-1.5 h-10 px-4"
                >
                  <Plus className="w-3 h-3" />
                  Despesa Recorrente
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="compromissos" className="flex-1 flex flex-col min-h-0">
            <div className="px-4 sm:px-8 pt-2 shrink-0">
              <TabsList className="w-full grid grid-cols-2 h-10">
                <TabsTrigger value="compromissos" className="text-[10px] sm:text-xs font-black uppercase tracking-wider gap-1.5 px-1 sm:px-3">
                  <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Compromissos</span>
                  <span className="sm:hidden">Comp</span>
                </TabsTrigger>
                <TabsTrigger value="cartoes" className="text-[10px] sm:text-xs font-black uppercase tracking-wider gap-1.5 px-1 sm:px-3">
                  <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Cartões</span>
                  <span className="sm:hidden">Cart</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 scrollbar-material">
              <div className="p-4 sm:p-8 pb-32 sm:pb-8">
                <TabsContent value="compromissos" className="mt-0">
                  <CommitmentsTabContent currentDate={currentDate} />
                </TabsContent>
                <TabsContent value="cartoes" className="mt-0">
                  <CreditCardTab currentDate={currentDate} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter
            className={cn(
              "p-4 sm:p-6 bg-muted/10 dark:bg-black/30 border-t dark:border-white/5 shrink-0",
              isMobile && "fixed bottom-0 left-0 right-0 bg-card"
            )}
            style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
          >
            {!isMobile && (
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-12 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/10"
              >
                FECHAR
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compra Parcelada Modal - Design Orbium (Sized down by 50%) */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent 
          hideCloseButton 
          fullscreen={isMobile}
          className={cn(
            "p-0 overflow-hidden flex flex-col shadow-2xl bg-card border-none z-[120]",
            !isMobile && "max-w-[24rem] max-h-[90vh] rounded-[2rem]"
          )}
        >
          <DialogHeader className={cn(
            "p-3 sm:p-4 bg-gradient-to-br from-primary to-primary-dark text-white border-none shrink-0 relative",
            isMobile && "pt-8"
          )}>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setShowPurchaseModal(false)} className="absolute left-3 top-3 rounded-full h-8 w-8 text-white/70 hover:text-white">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-md shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black tracking-tight leading-none">Nova Compra Parcelada</DialogTitle>
                <p className="text-[7.5px] font-bold text-white/60 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Provisionamento Inteligente
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-4 pb-20 sm:pb-4">
              <PurchaseInstallmentTabContent ref={purchaseRef} currentDate={currentDate} onClose={() => setShowPurchaseModal(false)} />
            </div>
          </ScrollArea>

          <DialogFooter className={cn(
            "p-3 sm:p-4 pt-1 bg-card flex flex-col sm:flex-row gap-2 border-t border-border/10",
            isMobile && "fixed bottom-0 left-0 right-0 p-3"
          )}>
            {!isMobile && (
              <Button 
                variant="ghost" 
                onClick={() => setShowPurchaseModal(false)} 
                className="rounded-xl h-8 px-4 font-black text-[8px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                CANCELAR
              </Button>
            )}
            <Button 
              className="flex-1 h-8 sm:h-9 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.15em] shadow-md shadow-primary/10 gap-1.5 hover:scale-[1.02] transition-transform" 
              onClick={() => purchaseRef.current?.submit()}
            >
              CRIAR PARCELAMENTO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Despesa Recorrente Modal - Design Orbium (Sized down by 50%) */}
      <Dialog open={showRecurringModal} onOpenChange={setShowRecurringModal}>
        <DialogContent 
          hideCloseButton 
          fullscreen={isMobile}
          className={cn(
            "p-0 overflow-hidden flex flex-col shadow-2xl bg-card border-none z-[120]",
            !isMobile && "max-w-[24rem] max-h-[90vh] rounded-[2rem]"
          )}
        >
          <DialogHeader className={cn(
            "p-3 sm:p-4 bg-gradient-to-br from-primary to-primary-dark text-white border-none shrink-0 relative",
            isMobile && "pt-8"
          )}>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setShowRecurringModal(false)} className="absolute left-3 top-3 rounded-full h-8 w-8 text-white/70 hover:text-white">
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-md shrink-0">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black tracking-tight leading-none">Nova Despesa Recorrente</DialogTitle>
                <p className="text-[7.5px] font-bold text-white/60 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Valor Fixo Mensal
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-4 pb-20 sm:pb-4">
              <RecurringExpenseTabContent ref={recurringRef} currentDate={currentDate} onClose={() => setShowRecurringModal(false)} />
            </div>
          </ScrollArea>

          <DialogFooter className={cn(
            "p-3 sm:p-4 pt-1 bg-card flex flex-col sm:flex-row gap-2 border-t border-border/10",
            isMobile && "fixed bottom-0 left-0 right-0 p-3"
          )}>
            {!isMobile && (
              <Button 
                variant="ghost" 
                onClick={() => setShowRecurringModal(false)} 
                className="rounded-xl h-8 px-4 font-black text-[8px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                CANCELAR
              </Button>
            )}
            <Button 
              className="flex-1 h-8 sm:h-9 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.15em] shadow-md shadow-primary/10 gap-1.5 hover:scale-[1.02] transition-transform" 
              onClick={() => recurringRef.current?.submit()}
            >
              CADASTRAR RECORRÊNCIA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}