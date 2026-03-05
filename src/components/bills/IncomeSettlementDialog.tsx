"use client";

import { useState, useMemo } from "react";
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
import { DollarSign, Calendar, CreditCard, FileText } from "lucide-react";

interface IncomeSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: FutureIncome;
  settlements: IncomeSettlement[];
  mode: 'partial' | 'total';
}

export function IncomeSettlementDialog({ open, onOpenChange, income, settlements, mode }: IncomeSettlementDialogProps) {
  const { addIncomeSettlement, contasMovimento, transacoesV2 } = useFinance();

  const totalReceived = useMemo(() => settlements.reduce((acc, s) => acc + s.receivedAmount, 0), [settlements]);
  const remainingAmount = income.netExpectedAmount - totalReceived;

  const [amount, setAmount] = useState(() => mode === 'total' ? remainingAmount.toFixed(2) : '');
  const [receivedDate, setReceivedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState(() => income.accountId || '');
  const [feesApplied, setFeesApplied] = useState('0');
  const [taxWithheldApplied, setTaxWithheldApplied] = useState('0');
  const [method, setMethod] = useState<IncomeSettlementMethod | ''>('pix');
  const [generateTransaction, setGenerateTransaction] = useState(true);
  const [linkExistingTransaction, setLinkExistingTransaction] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [notes, setNotes] = useState('');

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
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) { toast.error("Informe um valor válido."); return; }
    if (!accountId) { toast.error("Selecione uma conta de recebimento."); return; }
    if (parsedAmount > remainingAmount + 0.01) { toast.error("Valor excede o saldo aberto."); return; }

    const settlement: Omit<IncomeSettlement, 'id'> = {
      futureIncomeId: income.id,
      receivedAmount: parsedAmount,
      receivedDate,
      accountId,
      feesApplied: parseFloat(feesApplied.replace(',', '.')) || 0,
      taxWithheldApplied: parseFloat(taxWithheldApplied.replace(',', '.')) || 0,
      method: method || undefined,
      transactionId: linkExistingTransaction ? selectedTransactionId || undefined : undefined,
      notes: notes || undefined,
    };

    addIncomeSettlement(settlement, { generateTransaction: generateTransaction && !linkExistingTransaction });
    toast.success(`Recebimento de ${formatCurrency(parsedAmount)} registrado!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl z-[140]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            {mode === 'total' ? 'Receber Total' : 'Receber Parcial'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{income.description}</p>
          <p className="text-[10px] font-bold text-muted-foreground">
            Saldo aberto: <span className="text-warning">{formatCurrency(remainingAmount)}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="pl-9 font-bold" 
                placeholder="0,00" 
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Data de Recebimento
            </Label>
            <Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Conta de Recebimento
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
              <SelectContent className="z-[150]">
                {availableAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Method */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Método</Label>
            <Select value={method} onValueChange={v => setMethod(v as IncomeSettlementMethod)}>
              <SelectTrigger><SelectValue placeholder="Meio de recebimento" /></SelectTrigger>
              <SelectContent className="z-[150]">
                {Object.entries(INCOME_SETTLEMENT_METHOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fees & Tax */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taxas</Label>
              <Input value={feesApplied} onChange={e => setFeesApplied(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">IR Retido</Label>
              <Input value={taxWithheldApplied} onChange={e => setTaxWithheldApplied(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="gen-tx" 
                checked={generateTransaction && !linkExistingTransaction} 
                onCheckedChange={v => { setGenerateTransaction(!!v); if (v) setLinkExistingTransaction(false); }} 
              />
              <label htmlFor="gen-tx" className="text-xs font-bold cursor-pointer">Gerar lançamento automaticamente</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="link-tx" 
                checked={linkExistingTransaction} 
                onCheckedChange={v => { setLinkExistingTransaction(!!v); if (v) setGenerateTransaction(false); }} 
              />
              <label htmlFor="link-tx" className="text-xs font-bold cursor-pointer">Vincular a transação existente</label>
            </div>
          </div>

          {linkExistingTransaction && availableTransactions.length > 0 && (
            <Select value={selectedTransactionId} onValueChange={setSelectedTransactionId}>
              <SelectTrigger><SelectValue placeholder="Selecionar transação" /></SelectTrigger>
              <SelectContent className="z-[150]">
                {availableTransactions.map(tx => (
                  <SelectItem key={tx.id} value={tx.id}>
                    {tx.description} - {formatCurrency(tx.amount)} ({tx.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Observações
            </Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-success text-success-foreground hover:bg-success/90 font-black">
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
