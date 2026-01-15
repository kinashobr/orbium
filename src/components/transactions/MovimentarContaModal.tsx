"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ArrowLeftRight, TrendingUp, TrendingDown, CreditCard, DollarSign, Car, Coins, FileText, Check, ArrowLeft, X } from "lucide-react";
import { ContaCorrente, Categoria, AccountType, generateTransactionId, generateTransferGroupId, OperationType, TransacaoCompleta, getFlowTypeFromOperation, getDomainFromOperation, InvestmentInfo, SeguroVeiculo, Veiculo, OPERATION_TYPE_LABELS } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas: {
    numero: number;
    vencimento: string;
    valor: number;
    paga: boolean;
    transactionId?: string;
  }[];
  valorParcela: number;
  totalParcelas: number;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  segurosVeiculo: SeguroVeiculo[];
  veiculos: Veiculo[];
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => void;
  editingTransaction?: TransacaoCompleta;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { value: 'receita', label: 'Receita', icon: Plus, color: 'text-success', bgColor: 'bg-success/10' },
  { value: 'despesa', label: 'Despesa', icon: Minus, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'resgate', label: 'Resgate', icon: TrendingDown, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'liberacao_emprestimo', label: 'Liberação', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'veiculo', label: 'Veículo', icon: Car, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'rendimento', label: 'Rendimento', icon: Coins, color: 'text-primary', bgColor: 'bg-primary/10' },
];

const getAvailableOperationTypes = (accountType: AccountType): OperationType[] => {
  switch (accountType) {
    case 'corrente':
      return ['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento'];
    case 'cartao_credito':
      return ['despesa', 'transferencia'];
    case 'renda_fixa':
    case 'poupanca':
    case 'reserva':
    case 'objetivo':
    case 'cripto':
      return ['aplicacao', 'resgate', 'rendimento'];
    default:
      return ['receita', 'despesa'];
  }
};

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

export function MovimentarContaModal({
  open,
  onOpenChange,
  accounts,
  categories,
  investments,
  loans,
  segurosVeiculo,
  veiculos,
  selectedAccountId,
  onSubmit,
  editingTransaction,
}: MovimentarContaModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [operationType, setOperationType] = useState<OperationType | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [tempInvestmentId, setTempInvestmentId] = useState<string | null>(null);
  const [tempLoanId, setTempLoanId] = useState<string | null>(null);
  const [tempParcelaId, setTempParcelaId] = useState<string | null>(null);
  const [tempVehicleOperation, setTempVehicleOperation] = useState<'compra' | 'venda' | null>(null);
  const [tempSeguroId, setTempSeguroId] = useState<string | null>(null);
  const [tempSeguroParcelaId, setTempSeguroParcelaId] = useState<string | null>(null);

  const isEditing = !!editingTransaction;
  const selectedAccount = accounts.find(a => a.id === accountId);
  const availableOperations = selectedAccount ? getAvailableOperationTypes(selectedAccount.accountType) : [];
  
  const isTransfer = operationType === 'transferencia';
  const isInvestmentFlow = operationType === 'aplicacao' || operationType === 'resgate';
  const isLoanPayment = operationType === 'pagamento_emprestimo';
  const isVehicleOp = operationType === 'veiculo';
  
  const isInsurancePayment = useMemo(() => {
    if (operationType !== 'despesa') return false;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.label.toLowerCase().includes('seguro');
  }, [operationType, categoryId, categories]);

  const availableCategories = useMemo(() => {
    if (!operationType || isTransfer) return [];
    const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(operationType);
    return categories.filter(c => (isIncome && c.nature === 'receita') || (!isIncome && c.nature !== 'receita'));
  }, [operationType, categories, isTransfer]);

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setAccountId(editingTransaction.accountId);
        setDate(editingTransaction.date);
        setAmount(formatToBR(editingTransaction.amount));
        setOperationType(editingTransaction.operationType);
        setCategoryId(editingTransaction.categoryId);
        setDescription(editingTransaction.description);
        setTempInvestmentId(editingTransaction.links?.investmentId || null);
        setTempLoanId(editingTransaction.links?.loanId || null);
        setTempParcelaId(editingTransaction.links?.parcelaId || null);
        setTempVehicleOperation(editingTransaction.meta?.vehicleOperation || null);
      } else {
        setAccountId(selectedAccountId || accounts[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setAmount("");
        setOperationType(availableOperations[0] || null);
        setCategoryId(null);
        setDescription("");
        setDestinationAccountId(null);
        setTempInvestmentId(null);
        setTempLoanId(null);
        setTempParcelaId(null);
        setTempVehicleOperation(null);
        setTempSeguroId(null);
        setTempSeguroParcelaId(null);
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts, availableOperations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFromBR(amount);
    if (!accountId || !date || parsedAmount <= 0 || !operationType) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (isTransfer && !destinationAccountId) {
      toast.error("Selecione a conta de destino.");
      return;
    }

    const baseTx: TransacaoCompleta = {
      id: editingTransaction?.id || generateTransactionId(),
      date,
      accountId,
      flow: getFlowTypeFromOperation(operationType, tempVehicleOperation || undefined),
      operationType,
      domain: getDomainFromOperation(operationType),
      amount: parsedAmount,
      categoryId,
      description: description.trim() || OPERATION_TYPE_LABELS[operationType],
      links: {
        investmentId: isInvestmentFlow ? tempInvestmentId : null,
        loanId: isLoanPayment ? tempLoanId : null,
        transferGroupId: editingTransaction?.links?.transferGroupId || null,
        parcelaId: isLoanPayment ? tempParcelaId : null,
        vehicleTransactionId: isInsurancePayment && tempSeguroId && tempSeguroParcelaId ? `${tempSeguroId}_${tempSeguroParcelaId}` : null,
      } as any,
      conciliated: false,
      attachments: [],
      meta: { 
        createdBy: 'user', 
        source: 'manual', 
        createdAt: new Date().toISOString(),
        vehicleOperation: isVehicleOp ? tempVehicleOperation || undefined : undefined
      }
    };

    let transferGroup;
    if (isTransfer && destinationAccountId) {
      transferGroup = {
        id: editingTransaction?.links?.transferGroupId || generateTransferGroupId(),
        fromAccountId: accountId,
        toAccountId: destinationAccountId,
        amount: parsedAmount,
        date,
        description: baseTx.description
      };
    }
    
    onSubmit(baseTx, transferGroup);
    onOpenChange(false);
  };

  const selectedOpConfig = OPERATION_OPTIONS.find(op => op.value === operationType);
  const headerBg = selectedOpConfig?.bgColor || "bg-muted";
  const headerIconColor = selectedOpConfig?.color || "text-foreground";
  const HeaderIcon = selectedOpConfig?.icon || DollarSign;

  const selectedLoan = loans.find(l => l.id === tempLoanId);
  const availableLoanInstallments = selectedLoan ? selectedLoan.parcelas.filter(p => !p.paga) : [];
  
  const selectedSeguro = segurosVeiculo.find(s => String(s.id) === tempSeguroId);
  const availableSeguroParcelas = selectedSeguro ? selectedSeguro.parcelas.filter(p => !p.paga) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden border-none shadow-2xl bg-card",
        isMobile ? "fixed inset-0 max-w-full h-full rounded-none" : "max-w-[32rem] rounded-[2.5rem]"
      )}>
        <DialogHeader className={cn(
          "px-6 sm:px-8 pt-6 sm:pt-10 pb-6 shrink-0 transition-colors duration-500 relative",
          headerBg
        )}>
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="absolute left-4 top-4 rounded-full h-10 w-10"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          
          <div className={cn("flex items-center gap-4 sm:gap-5", isMobile && "pl-12")}>
            <div className={cn("w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shadow-lg bg-card", headerIconColor)}>
              <HeaderIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {isEditing ? "Editar Registro" : "Nova Movimentação"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                {selectedAccount?.name || "Registro Financeiro"}
              </DialogDescription>
            </div>
          </div>

          {!isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Valor em destaque no mobile */}
                <div className="space-y-2 text-center sm:text-left">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor do Lançamento</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/30">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
                      className="h-16 sm:h-20 pl-12 text-3xl sm:text-4xl font-black border-2 rounded-3xl bg-muted/20"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tipo de Operação</Label>
                    <Select value={operationType || ''} onValueChange={(v) => setOperationType(v as OperationType)}>
                      <SelectTrigger className="h-12 border-2 rounded-2xl bg-card hover:border-primary/30 transition-all font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOperations.map(op => {
                          const opt = OPERATION_OPTIONS.find(o => o.value === op);
                          return opt && (
                            <SelectItem key={op} value={op} className="font-bold">
                              <span className={cn("flex items-center gap-2", opt.color)}>{opt.label}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Data</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 border-2 rounded-2xl bg-card font-bold" />
                  </div>
                </div>

                {isTransfer ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Conta de Destino</Label>
                    <Select value={destinationAccountId || ''} onValueChange={setDestinationAccountId}>
                      <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold">
                        <SelectValue placeholder="Selecione a conta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.id !== accountId && !a.hidden).map(a => (
                          <SelectItem key={a.id} value={a.id} className="font-bold">{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : isInvestmentFlow ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Ativo Financeiro</Label>
                    <Select value={tempInvestmentId || ''} onValueChange={setTempInvestmentId}>
                      <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold">
                        <SelectValue placeholder="Selecione o ativo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {investments.map(i => (
                          <SelectItem key={i.id} value={i.id} className="font-bold">{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Categoria</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                      <SelectTrigger className="h-12 border-2 rounded-2xl bg-card hover:border-primary/30 font-bold">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {availableCategories.map(c => (
                          <SelectItem key={c.id} value={c.id} className="font-bold">
                            {c.icon} {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isLoanPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-[2rem] bg-warning/5 border-2 border-dashed border-warning/20">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-warning-foreground uppercase tracking-widest">Contrato</Label>
                      <Select value={tempLoanId || ''} onValueChange={v => { setTempLoanId(v); setTempParcelaId(null); }}>
                        <SelectTrigger className="h-10 border-2 rounded-xl bg-card"><SelectValue placeholder="Escolha..." /></SelectTrigger>
                        <SelectContent>{loans.map(l => <SelectItem key={l.id} value={l.id}>{l.institution}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black text-warning-foreground uppercase tracking-widest">Parcela</Label>
                      <Select value={tempParcelaId || ''} onValueChange={setTempParcelaId} disabled={!tempLoanId}>
                        <SelectTrigger className="h-10 border-2 rounded-xl bg-card"><SelectValue placeholder="P..." /></SelectTrigger>
                        <SelectContent>{availableLoanInstallments.map(p => <SelectItem key={p.numero} value={String(p.numero)}>Parcela {p.numero}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Descrição</Label>
                <div className="relative">
                    <FileText className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-24 p-4 pl-12 border-2 rounded-[1.5rem] bg-card focus:border-primary/50 transition-all resize-none font-medium text-sm"
                        placeholder="Descreva este lançamento..."
                    />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className={cn(
            "p-6 sm:p-8 bg-muted/10 border-t",
            isMobile && "sticky bottom-0"
          )}>
            <Button onClick={handleSubmit} className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-primary text-primary-foreground font-black text-base sm:text-lg gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Check className="w-5 h-5 sm:w-6 sm:h-6" />
              {isEditing ? "SALVAR ALTERAÇÕES" : "CONFIRMAR REGISTRO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}