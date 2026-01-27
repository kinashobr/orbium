"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, Check, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import { ContaCorrente, AccountType, ACCOUNT_TYPE_LABELS, generateAccountId } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ContaCorrente & { initialBalanceValue?: number };
  onSubmit: (account: ContaCorrente, initialBalanceValue: number) => void;
  onDelete?: (accountId: string) => void;
  hasTransactions?: boolean;
}

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { icon: typeof Building2, color: string, bg: string }> = {
  corrente: { icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
  renda_fixa: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  poupanca: { icon: PiggyBank, color: 'text-pink-600', bg: 'bg-pink-50' },
  cripto: { icon: Bitcoin, color: 'text-warning', bg: 'bg-warning/10' },
  reserva: { icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  objetivo: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
  cartao_credito: { icon: CreditCard, color: 'text-destructive', bg: 'bg-destructive/10' },
};

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string) => {
  const isNegative = value.startsWith('-');
  let cleaned = value.replace('-', '').replace(/\./g, '').replace(',', '.');
  let parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : (isNegative ? -parsed : parsed);
};

export function AccountFormModal({ open, onOpenChange, account, onSubmit, onDelete, hasTransactions = false }: AccountFormModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("corrente");
  const [institution, setInstitution] = useState("");
  const [initialBalanceInput, setInitialBalanceInput] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const isEditing = !!account;

  // Body scroll lock for mobile fullscreen
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);

  useEffect(() => {
    if (open && account) {
      setName(account.name);
      setAccountType(account.accountType || 'corrente');
      setInstitution(account.institution || "");
      setInitialBalanceInput(formatToBR(account.initialBalanceValue ?? 0)); 
      setStartDate(account.startDate || new Date().toISOString().split('T')[0]);
    } else if (open) {
      setName("");
      setAccountType("corrente");
      setInstitution("");
      setInitialBalanceInput(formatToBR(0));
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, account]);

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Nome da conta é obrigatório"); return; }
    const newAccount: ContaCorrente = {
      id: account?.id || generateAccountId(),
      name: name.trim(),
      accountType,
      institution: institution.trim() || undefined,
      currency: "BRL",
      initialBalance: 0,
      startDate,
      createdAt: account?.createdAt || new Date().toISOString(),
      meta: account?.meta || {}
    };
    onSubmit(newAccount, parseFromBR(initialBalanceInput));
    onOpenChange(false);
  };

  const config = ACCOUNT_TYPE_CONFIG[accountType];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[34rem] max-h-[85vh] rounded-[2.5rem]"
        )}
      >
        <DialogHeader 
          className={cn("px-6 sm:px-8 pt-6 sm:pt-10 pb-6 sm:pb-8 bg-muted/30 shrink-0 relative")}
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
        >
          <div className="flex items-center gap-4 sm:gap-5">
            {isMobile && (
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className={cn("w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all duration-500", config.bg, config.color)}>
              <Icon size={28} />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter">
                {isEditing ? "Editar Conta" : "Nova Conta"}
              </DialogTitle>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Configuração Patrimonial
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8">
          <div className="py-8 space-y-10 pb-32">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Nome da Conta</Label>
              <Input placeholder="Ex: Principal" value={name} onChange={(e) => setName(e.target.value)} className="h-14 text-xl font-bold rounded-2xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Classificação</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                  <SelectTrigger className="h-12 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-2xl border-none p-2">
                    {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
                      <SelectItem key={type} value={type} className="rounded-xl font-bold py-3"><div className="flex items-center gap-3"><div className={cn("p-1.5 rounded-lg", ACCOUNT_TYPE_CONFIG[type].bg)}>{React.createElement(ACCOUNT_TYPE_CONFIG[type].icon, { size: 16, className: ACCOUNT_TYPE_CONFIG[type].color })}</div>{ACCOUNT_TYPE_LABELS[type]}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Instituição</Label>
                <Input placeholder="Ex: Nubank" value={institution} onChange={(e) => setInstitution(e.target.value)} className="h-12 rounded-2xl border-none bg-muted/20 font-bold shadow-inner" />
              </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/20 space-y-8">
               <div className="text-center space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Saldo de Implantação</Label>
                 <div className="relative max-w-[240px] mx-auto">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-primary/20">R$</span>
                    <Input type="text" inputMode="decimal" value={initialBalanceInput} onChange={(e) => setInitialBalanceInput(e.target.value.replace(/[^\d,.-]/g, ''))} className="h-20 text-4xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums" />
                 </div>
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block text-center">Data de Referência</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-2xl border-none bg-card font-bold text-center shadow-sm max-w-[180px] mx-auto" />
               </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 shrink-0 flex flex-col sm:flex-row gap-4",
            isMobile && "fixed bottom-0 left-0 right-0 border-t bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {isEditing && onDelete && (
            <Button variant="ghost" onClick={() => { if (confirm("Excluir conta?")) { onDelete(account.id); onOpenChange(false); } }} disabled={hasTransactions} className="rounded-full h-14 px-8 font-black text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10 sm:mr-auto"><Trash2 size={18} className="mr-2" /> Excluir</Button>
          )}
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-14 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          )}
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-14 bg-primary text-primary-foreground font-black text-sm gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all order-1 sm:order-2"><Check size={20} /> {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR CONTA"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}