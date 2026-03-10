import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { CreditCardConfig, formatCurrency, TransacaoCompleta, BillTracker, generateTransactionId } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard, Plus, Trash2, Pencil, X, Check, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, Info, Banknote, Receipt, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isSameMonth, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateLocal } from "@/lib/utils";
import {
  calculateMinimumPayment,
  calculateRevolvingImpact,
  generateInstallmentOptions,
  formatMonthlyRate,
} from "@/lib/creditCardCalc";

interface CreditCardTabProps {
  currentDate: Date;
}

// ─── Sub-componente: Breakdown de Transações ───────────────────────────────
function TransactionBreakdown({ transactions }: { transactions: TransacaoCompleta[] }) {
  if (transactions.length === 0) return (
    <p className="text-[9px] text-muted-foreground text-center py-3 opacity-50 uppercase tracking-widest font-bold">
      Nenhuma transação no ciclo
    </p>
  );
  return (
    <div className="space-y-1">
      {transactions.map(tx => (
        <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-foreground/80 truncate">{tx.description}</p>
            <p className="text-[8px] text-muted-foreground font-medium">
              {format(parseDateLocal(tx.date), "dd MMM", { locale: ptBR }).toUpperCase()}
            </p>
          </div>
          <p className="text-[10px] font-black text-foreground tabular-nums ml-3">{formatCurrency(tx.amount)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Sub-componente: Alternativas de Pagamento ─────────────────────────────
function PaymentOptions({
  config, invoiceAmount, onPay, onCancel,
}: {
  config: CreditCardConfig;
  invoiceAmount: number;
  onPay: (mode: 'total' | 'minimo' | 'custom', amount: number) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<'total' | 'minimo' | 'custom' | 'parcela' | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedMonths, setSelectedMonths] = useState(3);

  const minResult = calculateMinimumPayment(invoiceAmount, config.minimumPaymentPercent);
  const revolvingImpact = calculateRevolvingImpact(
    minResult.remainingBalance,
    config.interestRateMonthly || 0
  );
  const installmentOptions = generateInstallmentOptions(
    invoiceAmount,
    config.installmentRateMonthly || 0,
    [3, 6, 12]
  );
  const hasRates = (config.interestRateMonthly || 0) > 0 || (config.installmentRateMonthly || 0) > 0;

  const handleCustomAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setCustomAmount(""); return; }
    const val = parseInt(digits) / 100;
    setCustomAmount(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const confirm = () => {
    if (selected === 'total') {
      onPay('total', invoiceAmount);
    } else if (selected === 'minimo') {
      onPay('minimo', minResult.minimumAmount);
    } else if (selected === 'custom') {
      const parsed = parseFloat(customAmount.replace(/\./g, "").replace(",", "."));
      if (isNaN(parsed) || parsed <= 0 || parsed > invoiceAmount) {
        toast.error("Valor inválido.");
        return;
      }
      onPay('custom', parsed);
    } else if (selected === 'parcela') {
      // Registra como pagamento custom com valor da primeira parcela (informativo)
      const plan = installmentOptions.find(p => p.months === selectedMonths);
      if (plan) {
        toast.info(`Simulação: ${plan.months}x de ${formatCurrency(plan.monthlyPayment)}. Registre manualmente cada parcela.`);
        onCancel();
      }
    }
  };

  return (
    <div className="space-y-2 mt-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-2">
        Alternativas de Pagamento
      </p>

      {/* Opção 1: Pagar Total */}
      <button
        onClick={() => setSelected('total')}
        className={cn(
          "w-full text-left p-3 rounded-xl border-2 transition-all",
          selected === 'total'
            ? "border-primary bg-primary/5"
            : "border-border/30 bg-muted/10 hover:border-primary/40"
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
            selected === 'total' ? "border-primary bg-primary" : "border-muted-foreground/40"
          )}>
            {selected === 'total' && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-foreground">Pagar Total</p>
              <p className="text-sm font-black text-primary tabular-nums">{formatCurrency(invoiceAmount)}</p>
            </div>
            <p className="text-[8px] text-success font-bold mt-0.5">✓ Sem juros · Melhor escolha</p>
          </div>
        </div>
      </button>

      {/* Opção 2: Pagamento Mínimo */}
      <button
        onClick={() => setSelected('minimo')}
        className={cn(
          "w-full text-left p-3 rounded-xl border-2 transition-all",
          selected === 'minimo'
            ? "border-warning bg-warning/5"
            : "border-border/30 bg-muted/10 hover:border-warning/40"
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
            selected === 'minimo' ? "border-warning bg-warning" : "border-muted-foreground/40"
          )}>
            {selected === 'minimo' && <Check className="w-2.5 h-2.5 text-warning-foreground" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-foreground">Pagamento Mínimo</p>
              <p className="text-sm font-black text-warning tabular-nums">{formatCurrency(minResult.minimumAmount)}</p>
            </div>
            <div className="mt-1 space-y-0.5">
              <p className="text-[8px] text-muted-foreground font-bold">
                Saldo restante: {formatCurrency(minResult.remainingBalance)}
              </p>
              {config.interestRateMonthly && config.interestRateMonthly > 0 ? (
                <>
                  <p className="text-[8px] text-warning font-bold">
                    ⚠ Juros rotativos ({formatMonthlyRate(config.interestRateMonthly)}/mês): +{formatCurrency(revolvingImpact.interest)}
                  </p>
                  <p className="text-[8px] text-destructive font-black">
                    Próxima fatura estimada: ~{formatCurrency(revolvingImpact.nextMonthEstimate + minResult.minimumAmount)}
                  </p>
                </>
              ) : (
                <p className="text-[8px] text-warning font-bold">⚠ Saldo restante entra em juros rotativos</p>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Opção 3: Parcelar Fatura */}
      {hasRates && (config.installmentRateMonthly || 0) > 0 && (
        <button
          onClick={() => setSelected('parcela')}
          className={cn(
            "w-full text-left p-3 rounded-xl border-2 transition-all",
            selected === 'parcela'
              ? "border-primary/60 bg-primary/5"
              : "border-border/30 bg-muted/10 hover:border-primary/20"
          )}
        >
          <div className="flex items-start gap-2.5">
            <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
              selected === 'parcela' ? "border-primary bg-primary" : "border-muted-foreground/40"
            )}>
              {selected === 'parcela' && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-foreground mb-1.5">Parcelar Fatura (Simulação)</p>
              <div className="space-y-1">
                {installmentOptions.map(plan => (
                  <button
                    key={plan.months}
                    onClick={(e) => { e.stopPropagation(); setSelected('parcela'); setSelectedMonths(plan.months); }}
                    className={cn(
                      "w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg border text-left transition-all",
                      selectedMonths === plan.months && selected === 'parcela'
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/20 hover:border-primary/30"
                    )}
                  >
                    <span className="text-[9px] font-black text-foreground">
                      {plan.months}x de {formatCurrency(plan.monthlyPayment)}
                    </span>
                    <span className="text-[8px] text-muted-foreground font-bold">
                      Total {formatCurrency(plan.totalAmount)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[7px] text-muted-foreground font-bold mt-1 opacity-60">
                Taxa: {formatMonthlyRate(config.installmentRateMonthly || 0)}/mês · Informativo apenas
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Opção 4: Valor Customizado */}
      <button
        onClick={() => setSelected('custom')}
        className={cn(
          "w-full text-left p-3 rounded-xl border-2 transition-all",
          selected === 'custom'
            ? "border-primary/60 bg-primary/5"
            : "border-border/30 bg-muted/10 hover:border-primary/20"
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
            selected === 'custom' ? "border-primary bg-primary" : "border-muted-foreground/40"
          )}>
            {selected === 'custom' && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-foreground">Valor Personalizado</p>
            {selected === 'custom' && (
              <div className="mt-2" onClick={e => e.stopPropagation()}>
                <Input
                  type="text" inputMode="numeric" placeholder="0,00"
                  value={customAmount}
                  onChange={e => handleCustomAmountChange(e.target.value)}
                  className="h-9 rounded-xl font-black text-center text-sm"
                />
                <p className="text-[8px] text-muted-foreground text-center mt-1">
                  Máx: {formatCurrency(invoiceAmount)}
                </p>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Aviso sobre atraso */}
      <div className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/10">
        <div className="flex gap-2 items-start">
          <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
          <p className="text-[8px] text-destructive font-bold leading-tight">
            Nunca pague menos que o mínimo. Multa, juros e risco de negativação.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}
          className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest">
          Cancelar
        </Button>
        <Button size="sm" onClick={confirm} disabled={!selected}
          className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5">
          <Check className="w-3 h-3" /> Confirmar
        </Button>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────
export function CreditCardTab({ currentDate }: CreditCardTabProps) {
  const {
    creditCardConfigs,
    addCreditCardConfig,
    updateCreditCardConfig,
    deleteCreditCardConfig,
    getInvoiceForCard,
    getCardCurrentCycleUsage,
    getNextCycleBalance,
    getCardCycleTransactions,
    contasMovimento,
    setBillsTracker,
    billsTracker,
    updateBill,
    addTransacaoV2,
    transacoesV2,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const [expandedPaymentRates, setExpandedPaymentRates] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    accountId: "",
    limit: "",
    closingDay: "",
    dueDay: "",
    defaultPaymentAccountId: "",
    interestRateMonthly: "",
    installmentRateMonthly: "",
    minimumPaymentPercent: "",
  });

  const creditCardAccounts = useMemo(() =>
    contasMovimento.filter(c => c.accountType === 'cartao_credito'),
    [contasMovimento]
  );

  const paymentAccounts = useMemo(() =>
    contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'poupanca'),
    [contasMovimento]
  );

  const configuredAccountIds = useMemo(() =>
    new Set(creditCardConfigs.map(c => c.accountId)),
    [creditCardConfigs]
  );

  const availableCardAccounts = useMemo(() =>
    creditCardAccounts.filter(a => !configuredAccountIds.has(a.id) || (editingId && creditCardConfigs.find(c => c.id === editingId)?.accountId === a.id)),
    [creditCardAccounts, configuredAccountIds, editingId, creditCardConfigs]
  );

  const resetForm = () => {
    setFormData({ accountId: "", limit: "", closingDay: "", dueDay: "", defaultPaymentAccountId: "", interestRateMonthly: "", installmentRateMonthly: "", minimumPaymentPercent: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (config: CreditCardConfig) => {
    setFormData({
      accountId: config.accountId,
      limit: String(config.limit),
      closingDay: String(config.closingDay),
      dueDay: String(config.dueDay),
      defaultPaymentAccountId: config.defaultPaymentAccountId || "",
      interestRateMonthly: config.interestRateMonthly ? String(config.interestRateMonthly * 100) : "",
      installmentRateMonthly: config.installmentRateMonthly ? String(config.installmentRateMonthly * 100) : "",
      minimumPaymentPercent: config.minimumPaymentPercent ? String(config.minimumPaymentPercent * 100) : "",
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    const limit = parseFloat(formData.limit);
    const closingDay = parseInt(formData.closingDay);
    const dueDay = parseInt(formData.dueDay);

    if (!formData.accountId || isNaN(limit) || limit <= 0 || isNaN(closingDay) || closingDay < 1 || closingDay > 31 || isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    const parseRate = (val: string) => {
      const num = parseFloat(val.replace(",", "."));
      return isNaN(num) || num <= 0 ? undefined : num / 100;
    };

    const data = {
      accountId: formData.accountId,
      limit,
      closingDay,
      dueDay,
      defaultPaymentAccountId: formData.defaultPaymentAccountId || undefined,
      interestRateMonthly: parseRate(formData.interestRateMonthly),
      installmentRateMonthly: parseRate(formData.installmentRateMonthly),
      minimumPaymentPercent: parseRate(formData.minimumPaymentPercent),
    };

    if (editingId) {
      updateCreditCardConfig(editingId, data);
      toast.success("Cartão atualizado.");
    } else {
      addCreditCardConfig(data);
      toast.success("Cartão configurado!");
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCreditCardConfig(id);
    toast.info("Configuração removida.");
  };

  const handlePayInvoice = (config: CreditCardConfig, mode: 'total' | 'minimo' | 'custom', amount: number) => {
    const cardAccount = contasMovimento.find(c => c.id === config.accountId);
    if (!cardAccount) {
      toast.error("Conta do cartão não encontrada.");
      return;
    }

    const invoiceCycleKey = format(currentDate, 'yyyy-MM');
    const invoiceId = `invoice_${config.id}_${invoiceCycleKey}`;
    
    // PRE-CHECK: Verificar se já existe uma transação de entrada na conta do cartão com valor similar (+- 2 reais) e data próxima (+- 3 dias)
    const dueDay = Math.min(config.dueDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
    const dueDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
    const dueDateStr = format(dueDateObj, 'yyyy-MM-dd');
    
    const existingInflow = transacoesV2.find(t => 
      t.accountId === config.accountId && 
      (t.flow === 'in' || t.flow === 'transfer_in') &&
      Math.abs(t.amount - amount) < 2 &&
      Math.abs(differenceInDays(parseDateLocal(t.date), dueDateObj)) <= 3
    );

    if (existingInflow) {
      // Já existe um lançamento compatível. Apenas vinculamos o BillTracker a ele para evitar duplicidade.
      const invoiceAmount = getInvoiceForCard(config.id, currentDate);
      const cardName = cardAccount?.name || 'Cartão';
      
      updateBill(invoiceId, {
        isPaid: true,
        paymentDate: existingInflow.date,
        transactionId: existingInflow.links?.transferGroupId || existingInflow.id,
        paymentMode: mode,
        customPaymentAmount: mode !== 'total' ? amount : undefined,
        isExcluded: false,
      });
      
      toast.success(`Pagamento detectado e vinculado: ${formatCurrency(existingInflow.amount)}. Nenhuma nova transação foi criada.`);
      setPayingCardId(null);
      return;
    }

    // Se não existir, procede com o lançamento normal
    const paymentAccount = contasMovimento.find(c => c.id === config.defaultPaymentAccountId);
    if (!paymentAccount) {
      toast.error("Configure uma conta de pagamento padrão para este cartão.");
      return;
    }

    const transferGroupId = `invoice_transfer_${invoiceId}_${Date.now()}`;
    const invoiceAmount = getInvoiceForCard(config.id, currentDate);
    const cardName = cardAccount?.name || 'Cartão';
    const modeSuffix = mode !== 'total' ? ` (${mode === 'minimo' ? 'Mínimo' : 'Parcial'})` : '';
    const description = `Pagamento Fatura ${cardName}${modeSuffix}`;

    // Transação de Saída (Conta Corrente)
    addTransacaoV2({
      id: generateTransactionId(),
      date: dueDateStr,
      accountId: paymentAccount.id,
      flow: 'transfer_out',
      operationType: 'transferencia',
      domain: 'operational',
      amount,
      categoryId: null,
      description,
      links: { investmentId: null, loanId: null, transferGroupId, parcelaId: null, vehicleTransactionId: null },
      conciliated: true,
      attachments: [],
      meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() },
    });

    // Transação de Entrada (Cartão de Crédito)
    addTransacaoV2({
      id: generateTransactionId(),
      date: dueDateStr,
      accountId: cardAccount.id,
      flow: 'transfer_in',
      operationType: 'transferencia',
      domain: 'operational',
      amount,
      categoryId: null,
      description,
      links: { investmentId: null, loanId: null, transferGroupId, parcelaId: null, vehicleTransactionId: null },
      conciliated: true,
      attachments: [],
      meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() },
    });

    const existingBill = billsTracker.find(b => b.id === invoiceId);
    if (existingBill) {
      updateBill(invoiceId, {
        isPaid: true, paymentDate: dueDateStr, transactionId: transferGroupId,
        paymentMode: mode, customPaymentAmount: mode !== 'total' ? amount : undefined,
        isExcluded: false,
      });
    } else {
      setBillsTracker(prev => [...prev, {
        id: invoiceId, type: 'tracker' as const,
        description: `Fatura ${cardName}`,
        dueDate: dueDateStr, expectedAmount: invoiceAmount, isPaid: true,
        paymentDate: dueDateStr, transactionId: transferGroupId,
        sourceType: 'card_invoice' as const, sourceRef: config.id, cardId: config.id,
        invoiceCycle: invoiceCycleKey, paymentMode: mode,
        customPaymentAmount: mode !== 'total' ? amount : undefined,
        suggestedAccountId: config.defaultPaymentAccountId, suggestedCategoryId: null, isExcluded: false,
      }]);
    }

    toast.success(`Fatura paga via transferência: ${formatCurrency(amount)}`);
    setPayingCardId(null);
  };

  // Helper function to calculate difference in days
  const differenceInDays = (d1: Date, d2: Date) => {
    return Math.abs(Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const toggleTransactions = (id: string) => {
    setExpandedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleRates = (id: string) => {
    setExpandedPaymentRates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Calcular ciclo de faturamento para exibição
  const getCycleDates = (config: CreditCardConfig, monthDate: Date) => {
    const closingDay = config.closingDay;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const currentClosing = new Date(year, month, Math.min(closingDay, new Date(year, month + 1, 0).getDate()));
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevClosing = new Date(prevYear, prevMonth, Math.min(closingDay, new Date(prevYear, prevMonth + 1, 0).getDate()));
    const dueDay = Math.min(config.dueDay, new Date(year, month + 1, 0).getDate());
    const dueDate = new Date(year, month, dueDay);
    return { from: prevClosing, to: currentClosing, due: dueDate };
  };

  return (
    <div className="space-y-4">
      {creditCardConfigs.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 opacity-30">
          <CreditCard className="w-12 h-12 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest">Nenhum cartão configurado</p>
        </div>
      )}

      {creditCardConfigs.map(config => {
        const account = contasMovimento.find(a => a.id === config.accountId);
        const invoiceAmount = getInvoiceForCard(config.id, currentDate);
        const cycleUsage = getCardCurrentCycleUsage(config.id);
        const nextCycle = getNextCycleBalance(config.id);
        const cycleTransactions = getCardCycleTransactions(config.id, currentDate);
        const usagePercent = config.limit > 0 ? (cycleUsage / config.limit) * 100 : 0;
        const isPaying = payingCardId === config.id;
        const invoiceId = `invoice_${config.id}_${format(currentDate, 'yyyy-MM')}`;
        const isInvoicePaid = billsTracker.some(b => b.id === invoiceId && b.isPaid);
        const cycleDates = getCycleDates(config, currentDate);
        const isExpTx = expandedTransactions.has(config.id);
        const isExpRates = expandedPaymentRates.has(config.id);
        const paymentAccount = contasMovimento.find(a => a.id === config.defaultPaymentAccountId);

        return (
          <div key={config.id} className="rounded-2xl border border-border/40 dark:border-white/10 bg-card dark:bg-white/[0.03] overflow-hidden">
            
            {/* ─── Cabeçalho do Cartão ─────────────────────────── */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{account?.name || 'Cartão'}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                      Fecha {format(cycleDates.to, "dd MMM", { locale: ptBR }).toUpperCase()} · Vence {format(cycleDates.due, "dd MMM", { locale: ptBR }).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(config)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={() => handleDelete(config.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Período vigente */}
              <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                Período: {format(cycleDates.from, "dd MMM", { locale: ptBR }).toUpperCase()} → {format(cycleDates.to, "dd MMM", { locale: ptBR }).toUpperCase()}
              </div>

              {/* Fatura + Disponível */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/20 dark:bg-white/[0.03]">
                  <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Fatura</p>
                  <p className="text-lg font-black tabular-nums text-foreground leading-none">{formatCurrency(invoiceAmount)}</p>
                  {isInvoicePaid && (
                    <span className="text-[7px] font-black text-success uppercase tracking-widest">✓ Paga</span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-muted/20 dark:bg-white/[0.03]">
                  <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Disponível</p>
                  <p className="text-lg font-black tabular-nums text-foreground leading-none">
                    {formatCurrency(Math.max(0, config.limit - cycleUsage))}
                  </p>
                  <p className="text-[7px] font-bold text-muted-foreground">de {formatCurrency(config.limit)}</p>
                </div>
              </div>

              {/* Barra de uso */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                  <span className="text-muted-foreground">Usado no ciclo: {formatCurrency(cycleUsage)}</span>
                  <span className={cn(
                    usagePercent > 80 ? "text-destructive" : usagePercent > 50 ? "text-warning" : "text-muted-foreground"
                  )}>
                    {Math.round(Math.min(100, usagePercent))}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-warning" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  />
                </div>
              </div>

              {/* Próxima fatura em aberto */}
              {nextCycle > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary">Próxima fatura (em aberto)</p>
                  </div>
                  <p className="text-[10px] font-black text-primary tabular-nums">{formatCurrency(nextCycle)}</p>
                </div>
              )}

              {/* Conta de pagamento */}
              {paymentAccount && (
                <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-bold">
                  <Banknote className="w-3 h-3" />
                  Pagar via: <span className="text-foreground font-black">{paymentAccount.name}</span>
                </div>
              )}
            </div>

            {/* ─── Breakdown de Transações ─────────────────────── */}
            <button
              onClick={() => toggleTransactions(config.id)}
              className="w-full px-4 sm:px-5 py-2.5 flex items-center justify-between border-t border-border/20 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Transações do Ciclo ({cycleTransactions.length})
                </span>
              </div>
              {isExpTx ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {isExpTx && (
              <div className="px-4 sm:px-5 pb-4 border-t border-border/10 bg-muted/5">
                <div className="pt-3">
                  <TransactionBreakdown transactions={cycleTransactions} />
                  {cycleTransactions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/20 flex justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total de compras</p>
                      <p className="text-[9px] font-black text-foreground tabular-nums">{formatCurrency(invoiceAmount)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Área de Pagamento ───────────────────────────── */}
            {invoiceAmount > 0 && !isInvoicePaid && (
              <div className="px-4 sm:px-5 pb-4 border-t border-border/20 bg-muted/5">
                {!isPaying ? (
                  <div className="pt-3">
                    <Button
                      onClick={() => setPayingCardId(config.id)}
                      className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                    >
                      <Banknote className="w-4 h-4" /> Opções de Pagamento
                    </Button>
                  </div>
                ) : (
                  <div className="pt-3">
                    <PaymentOptions
                      config={config}
                      invoiceAmount={invoiceAmount}
                      onPay={(mode, amount) => handlePayInvoice(config, mode, amount)}
                      onCancel={() => setPayingCardId(null)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ─── Taxas Configuradas ──────────────────────────── */}
            {(config.interestRateMonthly || config.installmentRateMonthly) && (
              <>
                <button
                  onClick={() => toggleRates(config.id)}
                  className="w-full px-4 sm:px-5 py-2 flex items-center justify-between border-t border-border/20 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Encargos</span>
                  </div>
                  {isExpRates ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>
                {isExpRates && (
                  <div className="px-4 sm:px-5 pb-3 bg-muted/5 border-t border-border/10 space-y-1.5 pt-2.5">
                    {config.interestRateMonthly && (
                      <div className="flex justify-between">
                        <p className="text-[8px] text-muted-foreground font-bold">Juros rotativos</p>
                        <p className="text-[8px] font-black text-warning">{formatMonthlyRate(config.interestRateMonthly)}/mês</p>
                      </div>
                    )}
                    {config.installmentRateMonthly && (
                      <div className="flex justify-between">
                        <p className="text-[8px] text-muted-foreground font-bold">Parcelamento</p>
                        <p className="text-[8px] font-black text-primary">{formatMonthlyRate(config.installmentRateMonthly)}/mês</p>
                      </div>
                    )}
                    {config.minimumPaymentPercent && (
                      <div className="flex justify-between">
                        <p className="text-[8px] text-muted-foreground font-bold">Pagamento mínimo</p>
                        <p className="text-[8px] font-black text-foreground">{(config.minimumPaymentPercent * 100).toFixed(0)}%</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Botão Adicionar */}
      {!showForm && (
        <Button
          variant="outline" onClick={() => setShowForm(true)}
          className="w-full h-10 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 border-dashed"
        >
          <Plus className="w-4 h-4" /> Adicionar Cartão
        </Button>
      )}

      {/* ─── Formulário ─────────────────────────────────────── */}
      {showForm && (
        <div className="p-4 sm:p-5 rounded-2xl border-2 border-primary/20 bg-primary/[0.02] space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest">{editingId ? 'Editar Cartão' : 'Novo Cartão'}</p>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Conta do Cartão</Label>
              <Select value={formData.accountId} onValueChange={v => setFormData(p => ({ ...p, accountId: v }))}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {availableCardAccounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs font-bold">{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Limite (R$)</Label>
              <Input type="number" value={formData.limit} onChange={e => setFormData(p => ({ ...p, limit: e.target.value }))} placeholder="10000" className="h-10 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Dia Fechamento</Label>
              <Input type="number" min="1" max="31" value={formData.closingDay} onChange={e => setFormData(p => ({ ...p, closingDay: e.target.value }))} placeholder="15" className="h-10 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Dia Vencimento</Label>
              <Input type="number" min="1" max="31" value={formData.dueDay} onChange={e => setFormData(p => ({ ...p, dueDay: e.target.value }))} placeholder="22" className="h-10 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Conta de Pagamento Padrão</Label>
              <Select value={formData.defaultPaymentAccountId} onValueChange={v => setFormData(p => ({ ...p, defaultPaymentAccountId: v }))}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="Selecione conta..." /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {paymentAccounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs font-bold">{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Taxas Financeiras (opcional) */}
          <div className="border-t border-border/20 pt-3 space-y-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3 h-3" /> Taxas Financeiras (opcional — para simulações)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rotativo (%/mês)</Label>
                <Input type="text" value={formData.interestRateMonthly} onChange={e => setFormData(p => ({ ...p, interestRateMonthly: e.target.value }))} placeholder="16,1" className="h-10 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Parcelamento (%/mês)</Label>
                <Input type="text" value={formData.installmentRateMonthly} onChange={e => setFormData(p => ({ ...p, installmentRateMonthly: e.target.value }))} placeholder="12,86" className="h-10 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mínimo (%)</Label>
                <Input type="text" value={formData.minimumPaymentPercent} onChange={e => setFormData(p => ({ ...p, minimumPaymentPercent: e.target.value }))} placeholder="15" className="h-10 rounded-xl text-xs font-bold" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetForm} className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5">
              <Check className="w-3.5 h-3.5" /> {editingId ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}