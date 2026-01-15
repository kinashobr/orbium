import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, Check, X, Sparkles } from "lucide-react";
import { ContaCorrente, AccountType, ACCOUNT_TYPE_LABELS, generateAccountId, formatCurrency } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ContaCorrente & { initialBalanceValue?: number };
  onSubmit: (account: ContaCorrente, initialBalanceValue: number) => void;
  onDelete?: (accountId: string) => void;
  hasTransactions?: boolean;
}

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { icon: typeof Building2, color: string, bg: string }> = {
  corrente: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  renda_fixa: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  poupanca: { icon: PiggyBank, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  cripto: { icon: Bitcoin, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  reserva: { icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  objetivo: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  cartao_credito: { icon: CreditCard, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseFromBR = (value: string) => {
  const isNegative = value.startsWith('-');
  let cleaned = value.replace('-', '').replace(/\./g, '').replace(',', '.');
  let parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return isNegative ? -parsed : parsed;
};

export function AccountFormModal({
  open,
  onOpenChange,
  account,
  onSubmit,
  onDelete,
  hasTransactions = false
}: AccountFormModalProps) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("corrente");
  const [institution, setInstitution] = useState("");
  const [initialBalanceInput, setInitialBalanceInput] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const isEditing = !!account;

  useEffect(() => {
    if (open && account) {
      setName(account.name);
      setAccountType(account.accountType || 'corrente');
      setInstitution(account.institution || "");
      setInitialBalanceInput(formatToBR(account.initialBalanceValue ?? 0)); 
      setCurrency(account.currency);
      setStartDate(account.startDate || new Date().toISOString().split('T')[0]);
    } else if (open) {
      setName("");
      setAccountType("corrente");
      setInstitution("");
      setInitialBalanceInput(formatToBR(0));
      setCurrency("BRL");
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, account]);

  const handleBalanceChange = (value: string) => {
    let cleanedValue = value.replace(/[^\d,.-]/g, '');
    if (cleanedValue.startsWith('-')) {
      cleanedValue = '-' + cleanedValue.substring(1).replace(/-/g, '');
    } else {
      cleanedValue = cleanedValue.replace(/-/g, '');
    }
    setInitialBalanceInput(cleanedValue);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Nome da conta é obrigatório");
      return;
    }
    const parsedBalance = parseFromBR(initialBalanceInput) || 0;
    const newAccount: ContaCorrente = {
      id: account?.id || generateAccountId(),
      name: name.trim(),
      accountType,
      institution: institution.trim() || undefined,
      currency,
      initialBalance: 0,
      startDate,
      createdAt: account?.createdAt || new Date().toISOString(),
      meta: account?.meta || {}
    };
    onSubmit(newAccount, parsedBalance);
    onOpenChange(false);
  };

  const config = ACCOUNT_TYPE_CONFIG[accountType];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,34rem)] p-0 overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl bg-card flex flex-col z-[130]">
        <DialogHeader className="px-8 pt-10 pb-6 bg-muted/30 shrink-0 border-b border-border/40 relative">
          <div className="flex items-center gap-5">
            <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all duration-500", config.bg, config.color)}>
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {isEditing ? "Editar Conta" : "Nova Conta"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Configuração Patrimonial
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute right-6 top-6 rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8">
          <div className="py-8 space-y-8 pb-12">
            {/* Campo Principal: Nome */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome de Identificação</Label>
              <Input
                placeholder="Ex: Conta Corrente Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 text-lg font-bold rounded-2xl border-2 bg-muted/20 focus:bg-card transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Tipo de Conta */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Classificação</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                  <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => {
                      const itemConfig = ACCOUNT_TYPE_CONFIG[type];
                      const ItemIcon = itemConfig.icon;
                      return (
                        <SelectItem key={type} value={type} className="font-bold">
                          <span className="flex items-center gap-2.5">
                            <ItemIcon className={cn("w-4 h-4", itemConfig.color)} />
                            {ACCOUNT_TYPE_LABELS[type]}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Instituição */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Instituição</Label>
                <Input
                  placeholder="Ex: Nubank, Itaú..."
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="h-12 border-2 rounded-2xl bg-card font-bold"
                />
              </div>
            </div>

            {/* Saldo Inicial e Data */}
            <div className="p-6 rounded-[2rem] bg-muted/30 border-2 border-dashed border-border/60 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Saldo Atual</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/30">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={initialBalanceInput}
                      onChange={(e) => handleBalanceChange(e.target.value)}
                      className="h-14 pl-12 rounded-2xl border-2 font-black text-xl bg-card"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Desde</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-14 rounded-2xl border-2 font-bold bg-card"
                  />
                </div>
              </div>
              <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-tight opacity-60 px-4">
                O saldo será registrado como um lançamento de implantação na data selecionada.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/10 border-t flex flex-col-reverse sm:flex-row gap-3 shrink-0">
          {isEditing && onDelete && (
            <Button 
              variant="ghost" 
              onClick={() => { if (confirm("Excluir conta?")) { onDelete(account.id); onOpenChange(false); } }}
              disabled={hasTransactions}
              className="sm:mr-auto rounded-full h-12 px-6 font-bold text-destructive hover:bg-destructive/10"
            >
              Excluir
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-full h-12 px-6 font-bold text-muted-foreground"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Check className="w-5 h-5" />
            {isEditing ? "SALVAR ALTERAÇÕES" : "CRIAR CONTA MOVIMENTO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}