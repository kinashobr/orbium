"use client";

import { useState, useMemo, useImperativeHandle, forwardRef } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ShoppingCart, Info } from "lucide-react";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDueDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface PurchaseInstallmentRef {
  submit: () => void;
}

interface PurchaseInstallmentTabContentProps {
  currentDate: Date;
  onClose: () => void;
}

export const PurchaseInstallmentTabContent = forwardRef<PurchaseInstallmentRef, PurchaseInstallmentTabContentProps>(({ currentDate, onClose }, ref) => {
  const { contasMovimento, categoriasV2, addPurchaseInstallments } = useFinance();

  const [formData, setFormData] = useState({
    description: "",
    totalAmount: "0,00",
    installments: "12",
    firstDueDate: format(currentDate, 'yyyy-MM-dd'),
    accountId: "",
    categoryId: "",
  });

  const availableAccounts = useMemo(() =>
    contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'cartao_credito'),
    [contasMovimento]
  );

  const expenseCategories = useMemo(() =>
    categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel'),
    [categoriasV2]
  );

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setFormData(prev => ({ ...prev, totalAmount: "0,00" })); return; }
    const val = parseInt(digits) / 100;
    setFormData(prev => ({ ...prev, totalAmount: val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
  };

  const parseBrlValue = (value: string) => parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSubmit = () => {
    const amount = parseBrlValue(formData.totalAmount);
    const installmentsCount = parseInt(formData.installments);
    if (!formData.description || amount <= 0 || isNaN(installmentsCount) || installmentsCount <= 0) {
      toast.error("Preencha os campos obrigatórios corretamente.");
      return;
    }
    addPurchaseInstallments({
      description: formData.description,
      totalAmount: amount,
      installments: installmentsCount,
      firstDueDate: formData.firstDueDate,
      suggestedAccountId: formData.accountId || undefined,
      suggestedCategoryId: formData.categoryId || undefined,
      isRecurring: false,
    });
    toast.success(`${installmentsCount} parcelas geradas com sucesso!`);
    onClose();
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  const installmentPreview = useMemo(() => {
    const amount = parseBrlValue(formData.totalAmount);
    const count = parseInt(formData.installments) || 1;
    return amount / count;
  }, [formData.totalAmount, formData.installments]);

  const endDateLabel = useMemo(() => {
    const due = getDueDate(formData.firstDueDate, parseInt(formData.installments) || 1);
    if (!isValid(due)) return "—";
    return format(due, "MMMM yyyy", { locale: ptBR });
  }, [formData.firstDueDate, formData.installments]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Descrição da Compra</Label>
        <Input
          placeholder="Ex: iPhone 15 Pro, Notebook..."
          value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          className="h-8 border rounded-xl text-xs font-bold bg-muted/20 focus:bg-card transition-all border-transparent focus:border-primary/30"
        />
      </div>

      <div className="text-center space-y-0.5 py-1">
        <Label className="text-[8px] font-black uppercase tracking-widest text-primary/60">Valor Total do Bem</Label>
        <div className="relative max-w-[180px] mx-auto group">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/30">R$</span>
          <Input
            type="text"
            inputMode="numeric"
            value={formData.totalAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-9 text-xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums"
          />
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-50 group-focus-within:scale-x-100 transition-transform duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Nº Parcelas</Label>
          <Input
            type="number"
            min="1"
            value={formData.installments}
            onChange={e => setFormData(p => ({ ...p, installments: e.target.value }))}
            className="h-8 border rounded-xl text-xs font-black text-center bg-muted/20 border-transparent focus:border-primary/30"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">1º Vencimento</Label>
          <Input
            type="date"
            value={formData.firstDueDate}
            onChange={e => setFormData(p => ({ ...p, firstDueDate: e.target.value }))}
            className="h-8 rounded-xl border-none bg-muted/20 text-xs font-bold shadow-inner px-3"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Conta de Débito</Label>
          <Select value={formData.accountId} onValueChange={v => setFormData(p => ({ ...p, accountId: v }))}>
            <SelectTrigger className="h-8 rounded-xl border-none bg-muted/20 text-xs font-bold shadow-inner px-3"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent className="z-[210] rounded-lg shadow-xl border-none p-1">
              {availableAccounts.map(a => <SelectItem key={a.id} value={a.id} className="rounded-md font-bold py-1 text-xs">{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Categoria</Label>
          <Select value={formData.categoryId} onValueChange={v => setFormData(p => ({ ...p, categoryId: v }))}>
            <SelectTrigger className="h-8 rounded-xl border-none bg-muted/20 text-xs font-bold shadow-inner px-3"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent className="z-[210] rounded-lg shadow-xl border-none p-1">
              {expenseCategories.map(c => <SelectItem key={c.id} value={c.id} className="rounded-md font-bold py-1 text-xs">{c.icon} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {installmentPreview > 0 && (
        <div className="p-2.5 rounded-xl bg-primary/[0.03] border border-dashed border-primary/20 flex items-center justify-between animate-in fade-in zoom-in duration-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center text-primary shadow-sm shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Parcelas de</p>
              <p className="text-sm font-black text-foreground tabular-nums tracking-tight leading-none">{formatCurrency(installmentPreview)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[7.5px] font-black uppercase tracking-widest text-muted-foreground">Término em</p>
            <p className="text-[10px] font-bold text-foreground capitalize leading-none">{endDateLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
});