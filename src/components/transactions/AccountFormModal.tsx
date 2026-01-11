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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,28rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {isEditing ? "Editar Conta" : "Nova Conta Movimento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize os dados da conta" 
              : "Adicione uma nova conta para controlar suas movimentações"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              placeholder="Ex: Conta Corrente Banco X"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Tipo de Conta *</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[])
                  .map((type) => {
                  const Icon = ACCOUNT_TYPE_ICONS[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {ACCOUNT_TYPE_LABELS[type]}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Instituição</Label>
            <Input
              id="institution"
              placeholder="Ex: Banco do Brasil"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Saldo Inicial</Label>
              <Input
                id="initialBalance"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={initialBalanceInput}
                onChange={(e) => handleBalanceChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Data de Início */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início (Saldo Inicial) *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Data em que o saldo inicial foi registrado.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isEditing && onDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={hasTransactions}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Salvar" : "Criar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}