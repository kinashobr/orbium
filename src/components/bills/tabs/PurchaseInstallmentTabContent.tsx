import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDueDate } from "@/lib/utils";

interface PurchaseInstallmentTabContentProps {
  currentDate: Date;
  onClose: () => void;
}

export function PurchaseInstallmentTabContent({ currentDate, onClose }: PurchaseInstallmentTabContentProps) {
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
    const amount = parseInt(digits) / 100;
    const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData(prev => ({ ...prev, totalAmount: formatted }));
  };

  const parseBrlValue = (value: string) => parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSubmit = () => {
    const amount = parseBrlValue(formData.totalAmount);
    const installmentsCount = parseInt(formData.installments);
    if (!formData.description || amount <= 0 || isNaN(installmentsCount) || installmentsCount <= 0) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    addPurchaseInstallments({
      description: formData.description,
      totalAmount: amount,
      installments: installmentsCount,
      firstDueDate: formData.firstDueDate,
      suggestedAccountId: formData.accountId || undefined,
      suggestedCategoryId: formData.categoryId || undefined,
    });
    toast.success(`${installmentsCount} parcelas geradas com sucesso!`);
    setFormData({ description: "", totalAmount: "0,00", installments: "12", firstDueDate: format(new Date(), 'yyyy-MM-dd'), accountId: "", categoryId: "" });
    onClose();
  };

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
    <div className="space-y-6">
      {/* Amount */}
      <div className="text-center space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Valor Total da Compra</Label>
        <div className="relative max-w-xs mx-auto">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/30">R$</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            value={formData.totalAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-16 text-3xl sm:text-4xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0"
          />
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent mt-1"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descrição</Label>
            <Input placeholder="Ex: iPhone 15 Pro" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="h-10 rounded-xl font-bold border-2 dark:bg-white/5 dark:border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Parcelas</Label>
              <Input type="number" min="1" value={formData.installments} onChange={e => setFormData(p => ({ ...p, installments: e.target.value }))} className="h-10 rounded-xl font-black text-lg border-2 dark:bg-white/5 dark:border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">1º Vencimento</Label>
              <Input type="date" value={formData.firstDueDate} onChange={e => setFormData(p => ({ ...p, firstDueDate: e.target.value }))} className="h-10 rounded-xl font-bold border-2 dark:bg-white/5 dark:border-white/10" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Conta de Débito</Label>
            <Select value={formData.accountId} onValueChange={v => setFormData(p => ({ ...p, accountId: v }))}>
              <SelectTrigger className="h-10 rounded-xl font-bold border-2 dark:bg-white/5 dark:border-white/10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="z-[210]">{availableAccounts.map(a => <SelectItem key={a.id} value={a.id} className="font-medium">{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Categoria</Label>
            <Select value={formData.categoryId} onValueChange={v => setFormData(p => ({ ...p, categoryId: v }))}>
              <SelectTrigger className="h-10 rounded-xl font-bold border-2 dark:bg-white/5 dark:border-white/10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="z-[210]">{expenseCategories.map(c => <SelectItem key={c.id} value={c.id} className="font-medium">{c.icon} {c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {installmentPreview > 0 && (
        <div className="p-4 rounded-2xl bg-muted/30 dark:bg-white/5 border border-border/40 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center text-primary shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor por Parcela</p>
              <p className="text-lg font-black text-foreground">{formatCurrency(installmentPreview)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Término</p>
            <p className="text-xs font-bold text-foreground">{endDateLabel}</p>
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!formData.description || parseBrlValue(formData.totalAmount) <= 0} className="w-full h-12 rounded-xl font-black text-sm gap-2 shadow-xl shadow-primary/20">
        GERAR {formData.installments} PARCELAS <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
