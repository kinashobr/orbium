"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, Check, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import { ContaCorrente, AccountType, ACCOUNT_TYPE_LABELS, generateAccountId, AccountTerm, ACCOUNT_TERM_LABELS } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

export function AccountFormModal({ open, onOpenChange, account, onSubmit, onDelete, hasTransactions = false }: AccountFormModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("corrente");
  const [institution, setInstitution] = useState("");
  const [initialBalanceInput, setInitialBalanceInput] = useState("0,00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountTerm, setAccountTerm] = useState<AccountTerm>("curto_prazo");

  const isEditing = !!account;

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
      setInitialBalanceInput((account.initialBalanceValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })); 
      setStartDate(account.startDate || new Date().toISOString().split('T')[0]);
      // Normaliza o prazo da conta ao editar, mantendo regras de negócio
      const isShortTermForced = (account.accountType === 'corrente' || account.accountType === 'cartao_credito');
      if (isShortTermForced) {
        setAccountTerm('curto_prazo');
      } else {
        setAccountTerm(account.accountTerm || 'longo_prazo');
      }
    } else if (open) {
      setName("");
      setAccountType("corrente");
      setInstitution("");
      setInitialBalanceInput("0,00");
      setStartDate(new Date().toISOString().split('T')[0]);
      // Para nova conta, default:
      // - corrente/cartão: curto prazo (forçado mais abaixo)
      // - demais: longo prazo
      setAccountTerm('curto_prazo');
    }
  }, [open, account]);

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setInitialBalanceInput("0,00");
      return;
    }
    const val = parseInt(digits) / 100;
    setInitialBalanceInput(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Nome da conta é obrigatório"); return; }
    const newAccount: ContaCorrente = {
      id: account?.id || generateAccountId(),
      name: name.trim(),
      accountType,
      accountTerm,
      institution: institution.trim() || undefined,
      currency: "BRL",
      initialBalance: 0,
      startDate,
      createdAt: account?.createdAt || new Date().toISOString(),
      meta: account?.meta || {}
    };
    onSubmit(newAccount, parseBrlValue(initialBalanceInput));
    onOpenChange(false);
  };

  const config = ACCOUNT_TYPE_CONFIG[accountType];
  const Icon = config.icon;
  const isShortTermForced = accountType === 'corrente' || accountType === 'cartao_credito';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          // +30% width on desktop (28rem -> ~36.4rem)
          !isMobile && "max-w-[36.4rem] max-h-[80vh] rounded-[2rem]"
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
            <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500", config.bg, config.color)}>
              <Icon size={22} />
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

        {/* Desktop: use native/system scroll; Mobile: keep ScrollArea */}
        {isMobile ? (
          <ScrollArea className="flex-1 px-6 scrollbar-material">
            <div className="py-5 space-y-5 pb-28">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Nome da Conta</Label>
              <Input placeholder="Ex: Principal" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base font-bold rounded-xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Classificação</Label>
                <Select
                  value={accountType}
                  onValueChange={(v) => {
                    const nextType = v as AccountType;
                    setAccountType(nextType);
                    if (nextType === 'corrente' || nextType === 'cartao_credito') {
                      setAccountTerm('curto_prazo');
                    }
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-none p-1">
                    {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
                      <SelectItem key={type} value={type} className="rounded-lg font-bold py-2 text-sm"><div className="flex items-center gap-2"><div className={cn("p-1 rounded-md", ACCOUNT_TYPE_CONFIG[type].bg)}>{React.createElement(ACCOUNT_TYPE_CONFIG[type].icon, { size: 14, className: ACCOUNT_TYPE_CONFIG[type].color })}</div>{ACCOUNT_TYPE_LABELS[type]}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Instituição</Label>
                <Input placeholder="Ex: Nubank" value={institution} onChange={(e) => setInstitution(e.target.value)} className="h-10 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Prazo da Conta</Label>
              {isShortTermForced ? (
                <div className="h-10 flex items-center">
                  <Badge className="rounded-xl px-3 py-1.5 text-[10px] font-black tracking-[0.15em] bg-success/10 text-success border-none">
                    {ACCOUNT_TERM_LABELS['curto_prazo']}
                  </Badge>
                </div>
              ) : (
                <Select value={accountTerm} onValueChange={(v) => setAccountTerm(v as AccountTerm)}>
                  <SelectTrigger className="h-10 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-none p-1">
                    {(Object.keys(ACCOUNT_TERM_LABELS) as AccountTerm[]).map((term) => (
                      <SelectItem key={term} value={term} className="rounded-lg font-bold py-2 text-sm">
                        {ACCOUNT_TERM_LABELS[term]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-4">
               <div className="text-center space-y-1">
                 <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Saldo de Implantação</Label>
                 <div className="relative max-w-[200px] mx-auto">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-primary/20">R$</span>
                    <Input type="text" inputMode="numeric" value={initialBalanceInput} onChange={(e) => handleAmountChange(e.target.value)} className="h-14 text-2xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums" />
                 </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground block text-center">Data de Referência</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl border-none bg-card font-bold text-center shadow-sm max-w-[160px] mx-auto text-sm" />
               </div>
            </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 scrollbar-material">
            <div className="py-5 space-y-5 pb-28">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Nome da Conta</Label>
                <Input placeholder="Ex: Principal" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base font-bold rounded-xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Classificação</Label>
                  <Select
                    value={accountType}
                    onValueChange={(v) => {
                      const nextType = v as AccountType;
                      setAccountType(nextType);
                      if (nextType === 'corrente' || nextType === 'cartao_credito') {
                        setAccountTerm('curto_prazo');
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-none p-1">
                      {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
                        <SelectItem key={type} value={type} className="rounded-lg font-bold py-2 text-sm"><div className="flex items-center gap-2"><div className={cn("p-1 rounded-md", ACCOUNT_TYPE_CONFIG[type].bg)}>{React.createElement(ACCOUNT_TYPE_CONFIG[type].icon, { size: 14, className: ACCOUNT_TYPE_CONFIG[type].color })}</div>{ACCOUNT_TYPE_LABELS[type]}</div></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Instituição</Label>
                  <Input placeholder="Ex: Nubank" value={institution} onChange={(e) => setInstitution(e.target.value)} className="h-10 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Prazo da Conta</Label>
                {isShortTermForced ? (
                  <div className="h-10 flex items-center">
                    <Badge className="rounded-xl px-3 py-1.5 text-[10px] font-black tracking-[0.15em] bg-success/10 text-success border-none">
                      {ACCOUNT_TERM_LABELS['curto_prazo']}
                    </Badge>
                  </div>
                ) : (
                  <Select value={accountTerm} onValueChange={(v) => setAccountTerm(v as AccountTerm)}>
                    <SelectTrigger className="h-10 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-none p-1">
                      {(Object.keys(ACCOUNT_TERM_LABELS) as AccountTerm[]).map((term) => (
                        <SelectItem key={term} value={term} className="rounded-lg font-bold py-2 text-sm">
                          {ACCOUNT_TERM_LABELS[term]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 space-y-4">
                 <div className="text-center space-y-1">
                   <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Saldo de Implantação</Label>
                   <div className="relative max-w-[200px] mx-auto">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-primary/20">R$</span>
                      <Input type="text" inputMode="numeric" value={initialBalanceInput} onChange={(e) => handleAmountChange(e.target.value)} className="h-14 text-2xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums" />
                   </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground block text-center">Data de Referência</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl border-none bg-card font-bold text-center shadow-sm max-w-[160px] mx-auto text-sm" />
                 </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter 
          className={cn(
            "p-4 sm:p-5 bg-muted/10 shrink-0 flex flex-col sm:flex-row gap-3",
            isMobile && "fixed bottom-0 left-0 right-0 border-t bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {isEditing && onDelete && (
            <Button variant="ghost" onClick={() => { if (confirm("Excluir conta?")) { onDelete(account.id); onOpenChange(false); } }} disabled={hasTransactions} className="rounded-full h-11 px-6 font-black text-[9px] uppercase tracking-widest text-destructive hover:bg-destructive/10 sm:mr-auto"><Trash2 size={16} className="mr-2" /> Excluir</Button>
          )}
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-8 font-black text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          )}
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-11 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all order-1 sm:order-2"><Check size={18} /> {isEditing ? "SALVAR" : "CRIAR"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}