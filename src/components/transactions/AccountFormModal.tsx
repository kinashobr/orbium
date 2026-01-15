import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard } from "lucide-react";
import { ContaCorrente, AccountType, ACCOUNT_TYPE_LABELS, generateAccountId, formatCurrency } from "@/types/finance";
import { toast } from "sonner";

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ContaCorrente & { initialBalanceValue?: number }; // Adicionado para receber o valor real
  onSubmit: (account: ContaCorrente, initialBalanceValue: number) => void; // Alterado para passar o valor real
  onDelete?: (accountId: string) => void;
  hasTransactions?: boolean;
}

const ACCOUNT_TYPE_ICONS: Record<AccountType, typeof Building2> = {
  corrente: Building2,
  renda_fixa: TrendingUp,
  poupanca: PiggyBank,
  cripto: Bitcoin,
  reserva: Shield,
  objetivo: Target,
  cartao_credito: CreditCard,
};

// Helper para formatar número para string BR
const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper para converter string BR para float, permitindo sinal negativo e separadores BR
const parseFromBR = (value: string) => {
  const isNegative = value.startsWith('-');
  // Remove o sinal de menos temporariamente
  let cleaned = value.replace('-', '');
  // Remove pontos (milhares) e substitui vírgula (decimal) por ponto
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  
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
  const [initialBalanceInput, setInitialBalanceInput] = useState(""); // Valor do input
  const [currency, setCurrency] = useState("BRL");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const isEditing = !!account;

  useEffect(() => {
    if (open && account) {
      setName(account.name);
      setAccountType(account.accountType || 'corrente');
      setInstitution(account.institution || "");
      // Usa o valor real passado via prop (initialBalanceValue)
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
    if (!startDate) {
      toast.error("Data de início é obrigatória");
      return;
    }

    // Converte a string BR para float
    const parsedBalance = parseFromBR(initialBalanceInput) || 0;

    const newAccount: ContaCorrente = {
      id: account?.id || generateAccountId(),
      name: name.trim(),
      accountType,
      institution: institution.trim() || undefined,
      currency,
      initialBalance: 0, // Saldo inicial da conta é sempre 0, pois será lançado via transação
      startDate,
      color: account?.color || 'hsl(var(--primary))',
      icon: account?.icon || 'building-2',
      createdAt: account?.createdAt || new Date().toISOString(),
      meta: account?.meta || {}
    };

    // Passa a conta e o valor real do saldo inicial para o handler
    onSubmit(newAccount, parsedBalance);
    onOpenChange(false);
    toast.success(isEditing ? "Conta atualizada!" : "Conta criada!");
  };

  const handleDelete = () => {
    if (!account) return;
    
    if (hasTransactions) {
      toast.error("Não é possível excluir uma conta com transações vinculadas");
      return;
    }

    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      onDelete?.(account.id);
      onOpenChange(false);
      toast.success("Conta excluída!");
    }
  };

  const SelectedIcon = ACCOUNT_TYPE_ICONS[accountType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,32rem)] bg-card dark:bg-[hsl(24_8%_14%)] p-0 gap-0 overflow-hidden">
        {/* Header com gradiente sutil */}
        <DialogHeader className="bg-gradient-to-br from-muted/80 to-muted/40 dark:from-black/30 dark:to-black/10 px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-border/50 dark:border-white/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEditing ? "Editar Conta" : "Nova Conta Movimento"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isEditing 
                  ? "Atualize os dados da sua conta" 
                  : "Configure uma nova conta para gerenciar suas movimentações"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body com scroll suave */}
        <div className="px-6 sm:px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-material">
          {/* Nome da Conta - Campo destacado */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nome da Conta *
            </Label>
            <Input
              id="name"
              placeholder="Ex: Conta Corrente Banco X"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base rounded-xl border-border/60 dark:border-white/10 bg-muted/30 dark:bg-white/5 focus:bg-background transition-colors"
            />
          </div>

          {/* Tipo de Conta com Preview do Ícone */}
          <div className="space-y-2">
            <Label htmlFor="accountType" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo de Conta *
            </Label>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <SelectedIcon className="w-5 h-5 text-primary" />
              </div>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                <SelectTrigger className="flex-1 h-12 rounded-xl border-border/60 dark:border-white/10 bg-muted/30 dark:bg-white/5">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => {
                    const Icon = ACCOUNT_TYPE_ICONS[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-primary" />
                          {ACCOUNT_TYPE_LABELS[type]}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instituição */}
          <div className="space-y-2">
            <Label htmlFor="institution" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Instituição
            </Label>
            <Input
              id="institution"
              placeholder="Ex: Banco do Brasil"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="h-12 rounded-xl border-border/60 dark:border-white/10 bg-muted/30 dark:bg-white/5 focus:bg-background transition-colors"
            />
          </div>

          {/* Saldo e Moeda - Grid responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialBalance" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo Inicial
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                <Input
                  id="initialBalance"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={initialBalanceInput}
                  onChange={(e) => handleBalanceChange(e.target.value)}
                  className="h-12 pl-10 rounded-xl border-border/60 dark:border-white/10 bg-muted/30 dark:bg-white/5 focus:bg-background transition-colors font-semibold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Moeda
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-12 rounded-xl border-border/60 dark:border-white/10 bg-muted/30 dark:bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">🇧🇷 BRL - Real</SelectItem>
                  <SelectItem value="USD">🇺🇸 USD - Dólar</SelectItem>
                  <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Data de Início */}
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Data de Início *
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 rounded-xl border-border/60 dark:border-white/10 bg-muted/30 dark:bg-white/5 focus:bg-background transition-colors"
            />
            <p className="text-xs text-muted-foreground pl-1">
              Data em que o saldo inicial foi registrado
            </p>
          </div>
        </div>

        {/* Footer com botões estilizados */}
        <DialogFooter className="px-6 sm:px-8 py-5 bg-muted/30 dark:bg-black/20 border-t border-border/50 dark:border-white/5 flex flex-col-reverse sm:flex-row gap-3">
          {isEditing && onDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={hasTransactions}
              className="sm:mr-auto w-full sm:w-auto h-12 rounded-xl font-semibold"
            >
              Excluir Conta
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto h-12 rounded-xl font-medium border-border/60"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="w-full sm:w-auto h-12 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
          >
            {isEditing ? "Salvar Alterações" : "Criar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}