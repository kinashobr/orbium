import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { CreditCardConfig, formatCurrency, generateBillId } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Trash2, Pencil, X, Check, DollarSign, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreditCardTabProps {
  currentDate: Date;
}

export function CreditCardTab({ currentDate }: CreditCardTabProps) {
  const {
    creditCardConfigs,
    addCreditCardConfig,
    updateCreditCardConfig,
    deleteCreditCardConfig,
    getInvoiceForCard,
    contasMovimento,
    calculateBalanceUpToDate,
    transacoesV2,
    setBillsTracker,
    billsTracker,
    updateBill,
    addTransacaoV2,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'total' | 'minimo' | 'custom' | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [formData, setFormData] = useState({
    accountId: "",
    limit: "",
    closingDay: "",
    dueDay: "",
    defaultPaymentAccountId: "",
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
    setFormData({ accountId: "", limit: "", closingDay: "", dueDay: "", defaultPaymentAccountId: "" });
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

    const data = {
      accountId: formData.accountId,
      limit,
      closingDay,
      dueDay,
      defaultPaymentAccountId: formData.defaultPaymentAccountId || undefined,
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

  // M3: Invoice payment handler
  const handlePayInvoice = (config: CreditCardConfig, mode: 'total' | 'minimo' | 'custom', invoiceAmount: number) => {
    const paymentAccountId = config.defaultPaymentAccountId;
    const paymentAccount = contasMovimento.find(c => c.id === paymentAccountId);
    
    if (!paymentAccount) {
      toast.error("Configure uma conta de pagamento padrão para este cartão.");
      return;
    }

    let amount = invoiceAmount;
    if (mode === 'minimo') {
      amount = Math.max(invoiceAmount * 0.15, 50); // 15% or minimum R$50
      amount = Math.min(amount, invoiceAmount);
    } else if (mode === 'custom') {
      amount = parseFloat(customAmount.replace(/\./g, "").replace(",", "."));
      if (isNaN(amount) || amount <= 0 || amount > invoiceAmount) {
        toast.error("Valor inválido.");
        return;
      }
    }

    const invoiceId = `invoice_${config.id}_${format(currentDate, 'yyyy-MM')}`;
    const txId = `bill_tx_${invoiceId}`;
    const account = contasMovimento.find(a => a.id === config.accountId);
    const dueDay = Math.min(config.dueDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
    const dueDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay), 'yyyy-MM-dd');

    // Generate transaction
    addTransacaoV2({
      id: txId, date: dueDate, accountId: paymentAccount.id, flow: 'out',
      operationType: 'despesa', domain: 'operational', amount,
      categoryId: null, description: `Pagamento Fatura ${account?.name || 'Cartão'}${mode !== 'total' ? ` (${mode === 'minimo' ? 'Mínimo' : 'Parcial'})` : ''}`,
      links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null },
      conciliated: true, attachments: [],
      meta: { createdBy: 'system', source: 'bill_tracker', createdAt: new Date().toISOString() },
    });

    // Update or create bill tracker entry
    const existingBill = billsTracker.find(b => b.id === invoiceId);
    if (existingBill) {
      updateBill(invoiceId, { 
        isPaid: true, paymentDate: dueDate, transactionId: txId,
        paymentMode: mode, customPaymentAmount: mode !== 'total' ? amount : undefined,
      });
    } else {
      setBillsTracker(prev => [...prev, {
        id: invoiceId, type: 'tracker' as const, description: `Fatura ${account?.name || 'Cartão'}`,
        dueDate, expectedAmount: invoiceAmount, isPaid: true, paymentDate: dueDate, transactionId: txId,
        sourceType: 'card_invoice' as const, sourceRef: config.id, cardId: config.id,
        invoiceCycle: format(currentDate, 'yyyy-MM'), paymentMode: mode,
        customPaymentAmount: mode !== 'total' ? amount : undefined,
        suggestedAccountId: paymentAccountId, suggestedCategoryId: null, isExcluded: false,
      }]);
    }

    toast.success(`Fatura ${mode === 'total' ? 'total' : mode === 'minimo' ? 'mínimo' : 'parcial'} paga: ${formatCurrency(amount)}`);
    setPayingCardId(null);
    setPaymentMode(null);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setCustomAmount("0,00"); return; }
    const val = parseInt(digits) / 100;
    setCustomAmount(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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
        const usedAmount = Math.abs(Math.min(0, calculateBalanceUpToDate(config.accountId, undefined, transacoesV2, contasMovimento)));
        const usagePercent = config.limit > 0 ? (usedAmount / config.limit) * 100 : 0;
        const isPaying = payingCardId === config.id;
        const invoiceId = `invoice_${config.id}_${format(currentDate, 'yyyy-MM')}`;
        const isInvoicePaid = billsTracker.some(b => b.id === invoiceId && b.isPaid);
        const minimumAmount = Math.min(invoiceAmount, Math.max(invoiceAmount * 0.15, 50));

        return (
          <div key={config.id} className="p-4 sm:p-5 rounded-2xl border border-border/40 dark:border-white/10 bg-card dark:bg-white/[0.03] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-sm">{account?.name || 'Cartão'}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    Fecha dia {config.closingDay} · Vence dia {config.dueDay}
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

            {/* Usage bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Usado: {formatCurrency(usedAmount)}</span>
                <span>Limite: {formatCurrency(config.limit)}</span>
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

            {/* Invoice */}
            <div className="p-3 rounded-xl bg-muted/20 dark:bg-white/[0.03] border border-border/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Fatura do Mês</p>
                  <p className="text-lg font-black text-foreground tabular-nums">{formatCurrency(invoiceAmount)}</p>
                </div>
                <div className="text-right">
                  {isInvoicePaid ? (
                    <span className="text-[9px] font-black uppercase tracking-widest text-success bg-success/10 px-2 py-1 rounded-full">✓ Paga</span>
                  ) : invoiceAmount > 0 ? (
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Disponível</p>
                      <p className="text-xs font-black text-foreground">{formatCurrency(Math.max(0, config.limit - usedAmount))}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* M3: Payment action buttons */}
              {invoiceAmount > 0 && !isInvoicePaid && (
                <>
                  {!isPaying ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { setPayingCardId(config.id); setPaymentMode('total'); }}
                        className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5">
                        <DollarSign className="w-3 h-3" /> Total
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => { setPayingCardId(config.id); setPaymentMode('minimo'); }}
                        className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5">
                        <Minus className="w-3 h-3" /> Mínimo
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPayingCardId(config.id); setPaymentMode('custom'); }}
                        className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest">
                        Custom
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      {paymentMode === 'total' && (
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pagar Total</p>
                          <p className="text-xl font-black text-foreground">{formatCurrency(invoiceAmount)}</p>
                        </div>
                      )}
                      {paymentMode === 'minimo' && (
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pagamento Mínimo (15%)</p>
                          <p className="text-xl font-black text-foreground">{formatCurrency(minimumAmount)}</p>
                          <p className="text-[8px] font-bold text-warning mt-1">⚠ Juros serão cobrados sobre o saldo restante</p>
                        </div>
                      )}
                      {paymentMode === 'custom' && (
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor do Pagamento</Label>
                          <Input
                            type="text" inputMode="numeric" placeholder="0,00"
                            value={customAmount} onChange={e => handleCustomAmountChange(e.target.value)}
                            className="h-10 rounded-xl font-black text-center"
                          />
                          <p className="text-[8px] text-muted-foreground text-center">Máx: {formatCurrency(invoiceAmount)}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setPayingCardId(null); setPaymentMode(null); setCustomAmount(""); }}
                          className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest">
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => handlePayInvoice(config, paymentMode!, invoiceAmount)}
                          className="flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5">
                          <Check className="w-3 h-3" /> Confirmar
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Add/Edit Form */}
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
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {paymentAccounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs font-bold">{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-black text-xs uppercase tracking-widest gap-2">
            <Check className="w-4 h-4" /> {editingId ? 'Salvar Alterações' : 'Configurar Cartão'}
          </Button>
        </div>
      )}

      {!showForm && availableCardAccounts.length > 0 && (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full h-12 rounded-xl border-dashed border-2 font-black text-xs uppercase tracking-widest gap-2 text-muted-foreground hover:text-foreground">
          <Plus className="w-4 h-4" /> Configurar Cartão
        </Button>
      )}

      {!showForm && availableCardAccounts.length === 0 && creditCardAccounts.length === 0 && (
        <p className="text-[10px] text-center text-muted-foreground font-bold py-4">
          Cadastre uma conta do tipo "Cartão de Crédito" primeiro em Receitas & Despesas.
        </p>
      )}
    </div>
  );
}