"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  FutureIncome, IncomeSettlement, IncomeSettlementMethod, 
  INCOME_SETTLEMENT_METHOD_LABELS, formatCurrency 
} from "@/types/finance";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  DollarSign, Calendar, CreditCard, FileText, Wallet, Check, AlertCircle, 
  ArrowLeft, Sparkles, Zap, Banknote, MoreHorizontal, ArrowLeftRight,
  TrendingDown, Percent, ShieldAlert, Plus, Minus, TrendingUp, Coins, Building2, Car
} from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface IncomeSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: FutureIncome;
  settlements: IncomeSettlement[];
  mode: 'partial' | 'total';
}

const METHOD_OPTIONS: { value: IncomeSettlementMethod; label: string; icon: React.ElementType }[] = [
  { value: 'pix', label: 'PIX', icon: Zap },
  { value: 'ted', label: 'TED/DOC', icon: ArrowLeftRight },
  { value: 'boleto', label: 'Boleto', icon: FileText },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'cartao', label: 'Cartão', icon: CreditCard },
  { value: 'outro', label: 'Outro', icon: MoreHorizontal },
];

const OPERATION_OPTIONS = [
  { value: 'receita', label: 'Receita', icon: Plus, color: 'text-success', bgColor: 'bg-success/10' },
  { value: 'despesa', label: 'Despesa', icon: Minus, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'resgate', label: 'Resgate', icon: TrendingDown, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'liberacao_emprestimo', label: 'Liberação', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'veiculo', label: 'Veículo', icon: Car, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'rendimento', label: 'Rendimento', icon: Coins, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'imobilizado', label: 'Imóvel / Terreno', icon: Building2, color: 'text-primary', bgColor: 'bg-primary/10' },
];

export function IncomeSettlementDialog({ open, onOpenChange, income, settlements, mode }: IncomeSettlementDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { addIncomeSettlement, contasMovimento, transacoesV2, categoriasV2 } = useFinance();

  const totalReceived = useMemo(() => settlements.reduce((acc, s) => acc + s.receivedAmount, 0), [settlements]);
  const remainingAmount = income.netExpectedAmount - totalReceived;

  const [amount, setAmount] = useState("0,00");
  const [receivedDate, setReceivedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState(() => income.accountId || '');
  const [categoryId, setCategoryId] = useState<string | null>(income.categoryId || null);
  const [feesApplied, setFeesApplied] = useState('0,00');
  const [taxWithheldApplied, setTaxWithheldApplied] = useState('0,00');
  const [method, setMethod] = useState<IncomeSettlementMethod | ''>('pix');
  const [generateTransaction, setGenerateTransaction] = useState(true);
  const [linkExistingTransaction, setLinkExistingTransaction] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      const initialAmount = mode === 'total' ? remainingAmount : 0;
      setAmount(initialAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setReceivedDate(format(new Date(), 'yyyy-MM-dd'));
      setAccountId(income.accountId || '');
      setCategoryId(income.categoryId || null);
      setFeesApplied('0,00');
      setTaxWithheldApplied('0,00');
      setMethod('pix');
      setGenerateTransaction(true);
      setLinkExistingTransaction(false);
      setSelectedTransactionId('');
      setNotes('');
    }
  }, [open, mode, remainingAmount, income.accountId, income.categoryId]);

  const handleAmountChange = (value: string, setter: (v: string) => void) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setter("0,00");
      return;
    }
    const val = parseInt(digits) / 100;
    setter(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const availableAccounts = useMemo(() => 
    contasMovimento.filter(c => c.accountType !== 'cartao_credito'), 
    [contasMovimento]
  );

  const availableTransactions = useMemo(() => {
    if (!linkExistingTransaction || !accountId) return [];
    return transacoesV2.filter(t => 
      t.accountId === accountId && 
      t.flow === 'in' && 
      !t.conciliated
    ).slice(0, 20);
  }, [linkExistingTransaction, accountId, transacoesV2]);

  const handleConfirm = () => {
    const parsedAmount = parseBrlValue(amount);
    if (parsedAmount <= 0) { toast.error("Informe um valor válido."); return; }
    if (!accountId) { toast.error("Selecione uma conta de recebimento."); return; }
    if (parsedAmount > remainingAmount + 0.01) { toast.error("Valor excede o saldo aberto."); return; }

    const settlement: Omit<IncomeSettlement, 'id'> = {
      futureIncomeId: income.id,
      receivedAmount: parsedAmount,
      receivedDate,
      competenceMonth: income.competenceDate ? format(parseDateLocal(income.competenceDate), 'yyyy-MM') : undefined,
      accountId,
      feesApplied: parseBrlValue(feesApplied),
      taxWithheldApplied: parseBrlValue(taxWithheldApplied),
      method: method || undefined,
      transactionId: linkExistingTransaction ? selectedTransactionId || undefined : undefined,
      notes: notes || undefined,
    };

    addIncomeSettlement(settlement, { 
      generateTransaction: generateTransaction && !linkExistingTransaction,
      categoryId: categoryId || undefined 
    });
    toast.success(`Recebimento de ${formatCurrency(parsedAmount)} registrado!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[min(95vw,600px)] max-h-[90vh] rounded-[2.5rem] border-none"
        )}
      >
        <DialogHeader className={cn(
          "px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 shrink-0 relative transition-colors duration-500 bg-success/10",
        )} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}>
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center shadow-lg text-success">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tighter">
                {mode === 'total' ? 'Receber Total' : 'Receber Parcial'}
              </DialogTitle>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-2.5 h-2.5 text-success" /> {income.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className={cn("flex-1 scrollbar-material overflow-y-auto", isMobile ? "px-6" : "px-8")}>
          <div className="py-6 space-y-6">
            {/* Amount */}
            <div className="text-center space-y-0.5">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Valor Recebido</Label>
              <div className="relative max-w-[220px] mx-auto group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/20">R$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value, setAmount)}
                  className="h-12 text-2xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums"
                />
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-success/20 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
              </div>
            </div>

            {/* Operation Selector (Standard System) */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Tipo de Operação</Label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {OPERATION_OPTIONS.filter(opt => opt.value === 'receita').map((opt) => (
                  <div
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all cursor-default",
                      "border-success bg-success/10 text-success"
                    )}
                  >
                    <opt.icon size={16} />
                    <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-transparent bg-muted/10 text-muted-foreground opacity-30 grayscale">
                  <Minus size={16} />
                  <span className="text-[10px] font-black uppercase tracking-tight">Despesa</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-transparent bg-muted/10 text-muted-foreground opacity-30 grayscale">
                  <ArrowLeftRight size={16} />
                  <span className="text-[10px] font-black uppercase tracking-tight">Transf.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Conta de Recebimento</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-11 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm">
                    <SelectValue placeholder="Selecionar conta..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl z-[1000]">
                    {availableAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id} className="font-bold text-sm">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{acc.name}</span>
                          <span className="text-[10px] opacity-50">{formatCurrency(acc.initialBalance)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Categoria</Label>
                <Select value={categoryId || ''} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-11 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm">
                    <SelectValue placeholder="Selecionar categoria..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl z-[1000]">
                    {categoriasV2.filter(c => c.nature === 'receita').map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="font-bold text-sm">
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Data do Recebimento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  type="date" 
                  value={receivedDate} 
                  onChange={(e) => setReceivedDate(e.target.value)} 
                  className="h-11 pl-9 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm" 
                />
              </div>
            </div>

            {/* Options */}
            <div className="p-5 rounded-[2rem] bg-success/5 border-2 border-dashed border-success/20 space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-success block text-center">Configurações de Lançamento</Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-success/10">
                  <Checkbox 
                    id="gen-tx" 
                    checked={generateTransaction && !linkExistingTransaction} 
                    onCheckedChange={v => { setGenerateTransaction(!!v); if (v) setLinkExistingTransaction(false); }} 
                    className="rounded-md border-success/30 data-[state=checked]:bg-success data-[state=checked]:border-success"
                  />
                  <label htmlFor="gen-tx" className="text-[10px] font-black uppercase tracking-tight cursor-pointer select-none">Gerar lançamento automático</label>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-success/10">
                  <Checkbox 
                    id="link-tx" 
                    checked={linkExistingTransaction} 
                    onCheckedChange={v => { setLinkExistingTransaction(!!v); if (v) setGenerateTransaction(false); }} 
                    className="rounded-md border-success/30 data-[state=checked]:bg-success data-[state=checked]:border-success"
                  />
                  <label htmlFor="link-tx" className="text-[10px] font-black uppercase tracking-tight cursor-pointer select-none">Vincular transação existente</label>
                </div>
              </div>

              {linkExistingTransaction && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <Label className="text-[9px] font-black uppercase text-success px-1">Selecione a Transação</Label>
                  {availableTransactions.length > 0 ? (
                    <Select value={selectedTransactionId} onValueChange={setSelectedTransactionId}>
                      <SelectTrigger className="h-10 rounded-xl border-none bg-white font-bold shadow-sm text-xs">
                        <SelectValue placeholder="Escolha uma transação..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl z-[1000]">
                        {availableTransactions.map(tx => (
                          <SelectItem key={tx.id} value={tx.id} className="text-xs font-bold">
                            {tx.description} • {formatCurrency(tx.amount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-destructive" />
                      <p className="text-[9px] font-bold text-destructive uppercase">Nenhuma transação pendente encontrada</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Observações</Label>
              <Textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Alguma anotação sobre este recebimento?" 
                className="min-h-[80px] rounded-2xl border-none bg-muted/20 font-medium text-sm resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className={cn(
          "p-6 sm:p-8 bg-muted/10 shrink-0 flex flex-col sm:flex-row gap-2",
          isMobile && "fixed bottom-0 left-0 right-0 border-t bg-card"
        )} style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}>
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-8 font-black text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          )}
          <Button 
            onClick={handleConfirm} 
            className="flex-1 rounded-full h-11 bg-success text-white font-black text-sm gap-2 shadow-xl shadow-success/20 hover:scale-[1.02] transition-all order-1 sm:order-2"
          >
            <Check size={18} /> CONFIRMAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
