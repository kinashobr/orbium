"use client";

import { useState, useMemo, useImperativeHandle, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { useFinance } from "@/contexts/FinanceContext";
import { cn } from "@/lib/utils";
import { Repeat, Info } from "lucide-react";

export interface RecurringExpenseRef {
  submit: () => void;
}

interface RecurringExpenseTabContentProps {
  currentDate: Date;
  onClose: () => void;
}

export const RecurringExpenseTabContent = forwardRef<RecurringExpenseRef, RecurringExpenseTabContentProps>(({ currentDate, onClose }, ref) => {
  const { contasMovimento, categoriasV2, addPurchaseInstallments } = useFinance();
  
  const [formData, setFormData] = useState({
    description: "",
    totalAmount: "0,00",
    months: "12",
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
    if (!digits) {
      setFormData(prev => ({ ...prev, totalAmount: "0,00" }));
      return;
    }
    const amount = parseInt(digits) / 100;
    const formatted = amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setFormData(prev => ({ ...prev, totalAmount: formatted }));
  };

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = () => {
    const amount = parseBrlValue(formData.totalAmount);
    const monthsCount = parseInt(formData.months);
    if (!formData.description || amount <= 0 || isNaN(monthsCount) || monthsCount <= 0) {
      toast.error("Preencha os campos obrigatórios corretamente.");
      return;
    }
    addPurchaseInstallments({
      description: formData.description,
      totalAmount: amount,
      installments: monthsCount,
      firstDueDate: formData.firstDueDate,
      suggestedAccountId: formData.accountId || undefined,
      suggestedCategoryId: formData.categoryId || undefined,
      isRecurring: true,
    });
    toast.success(`Despesa recorrente registrada por ${monthsCount} meses!`);
    onClose();
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Descrição da Despesa</Label>
        <Input
          placeholder="Ex: Netflix, Academia, Aluguel..."
          value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          className="h-12 border-2 rounded-2xl font-bold bg-muted/20 focus:bg-card transition-all border-transparent focus:border-primary/30"
        />
      </div>

      <div className="text-center space-y-1 py-2">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Valor Fixo Mensal</Label>
        <div className="relative max-w-[240px] mx-auto group">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/20">R$</span>
          <Input
            type="text"
            inputMode="numeric"
            value={formData.totalAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-14 text-3xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums"
          />
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-50 group-focus-within:scale-x-100 transition-transform duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Duração (Meses)</Label>
          <Input
            type="number"
            min="1"
            value={formData.months}
            onChange={e => setFormData(p => ({ ...p, months: e.target.value }))}
            className="h-11 border-2 rounded-2xl font-black text-center bg-muted/20 border-transparent focus:border-primary/30"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Próximo Vencimento</Label>
          <Input
            type="date"
            value={formData.firstDueDate}
            onChange={e => setFormData(p => ({ ...p, firstDueDate: e.target.value }))}
            className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner px-4"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Conta de Débito</Label>
          <Select value={formData.accountId} onValueChange={(v) => setFormData(p => ({ ...p, accountId: v }))}>
            <SelectTrigger className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent className="z-[210] rounded-xl shadow-2xl border-none p-1">
              {availableAccounts.map(a => <SelectItem key={a.id} value={a.id} className="rounded-lg font-bold py-2 text-sm">{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Categoria</Label>
          <Select value={formData.categoryId} onValueChange={(v) => setFormData(p => ({ ...p, categoryId: v }))}>
            <SelectTrigger className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent className="z-[210] rounded-xl shadow-2xl border-none p-1">
              {expenseCategories.map(c => <SelectItem key={c.id} value={c.id} className="rounded-lg font-bold py-2 text-sm">{c.icon} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-3">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[10px] font-medium text-muted-foreground leading-tight">
          A despesa será replicada mensalmente na data informada, ajudando na sua projeção de caixa.
        </p>
      </div>
    </div>
  );
});