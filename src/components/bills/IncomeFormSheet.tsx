import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  FutureIncome, IncomeSourceType, IncomeFinancialNature,
  INCOME_SOURCE_TYPE_LABELS, INCOME_FINANCIAL_NATURE_LABELS,
  getIncomeSourceDefaults, formatCurrency 
} from "@/types/finance";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
  const cleaned = value.replace(/[^\d,]/g, '');
  const parsed = parseFloat(cleaned.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

const SOURCE_TYPE_GROUPS: { label: string; types: IncomeSourceType[] }[] = [
  { label: "CLT", types: ['clt_salario', 'clt_13', 'clt_ferias', 'clt_plr', 'clt_beneficio', 'clt_adiantamento'] },
  { label: "Autônomo", types: ['autonomo_projeto', 'autonomo_milestone', 'autonomo_comissao', 'autonomo_freelance'] },
  { label: "MEI", types: ['mei_servico', 'mei_venda', 'mei_prolabore', 'mei_lucro'] },
  { label: "Renda Extra", types: ['bico', 'renda_extra', 'informal'] },
  { label: "Financeiro", types: ['emprestimo_pessoal', 'repasse', 'reembolso', 'rateio'] },
  { label: "Outros", types: ['doacao', 'venda_ativo', 'indenizacao', 'outros'] },
];

interface IncomeFormSheetProps {
  editingIncome?: FutureIncome;
  onSave: () => void;
}

export function IncomeFormSheet({ editingIncome, onSave }: IncomeFormSheetProps) {
  const { addFutureIncome, updateFutureIncome, contasMovimento, categoriasV2 } = useFinance();

  const [description, setDescription] = useState(editingIncome?.description || "");
  const [sourceType, setSourceType] = useState<IncomeSourceType>(editingIncome?.sourceType || 'clt_salario');
  const [financialNature, setFinancialNature] = useState<IncomeFinancialNature>(editingIncome?.financialNature || 'receita');
  const [counterparty, setCounterparty] = useState(editingIncome?.counterparty || "");
  const [grossAmount, setGrossAmount] = useState(formatToBR(editingIncome?.grossAmount || 0));
  const [fees, setFees] = useState(formatToBR(editingIncome?.fees || 0));
  const [discounts, setDiscounts] = useState(formatToBR(editingIncome?.discounts || 0));
  const [taxWithheld, setTaxWithheld] = useState(formatToBR(editingIncome?.taxWithheld || 0));
  const [competenceDate, setCompetenceDate] = useState(editingIncome?.competenceDate || format(new Date(), 'yyyy-MM-dd'));
  const [expectedDueDate, setExpectedDueDate] = useState(editingIncome?.expectedDueDate || format(new Date(), 'yyyy-MM-dd'));
  const [confidence, setConfidence] = useState(editingIncome?.confidence || 50);
  const [accountId, setAccountId] = useState(editingIncome?.accountId || "");
  const [categoryId, setCategoryId] = useState(editingIncome?.categoryId || "");
  const [isTaxable, setIsTaxable] = useState(editingIncome?.isTaxable ?? false);
  const [isThirdPartyMoney, setIsThirdPartyMoney] = useState(editingIncome?.isThirdPartyMoney ?? false);
  const [requiresLiabilityTracking, setRequiresLiabilityTracking] = useState(editingIncome?.requiresLiabilityTracking ?? false);
  const [notes, setNotes] = useState(editingIncome?.notes || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const netExpectedAmount = useMemo(() => {
    const g = parseFromBR(grossAmount);
    const f = parseFromBR(fees);
    const d = parseFromBR(discounts);
    const t = parseFromBR(taxWithheld);
    return Math.max(0, g - f - d - t);
  }, [grossAmount, fees, discounts, taxWithheld]);

  const handleSourceTypeChange = useCallback((newType: IncomeSourceType) => {
    setSourceType(newType);
    const defaults = getIncomeSourceDefaults(newType);
    setFinancialNature(defaults.financialNature);
    setConfidence(defaults.confidence);
    setIsTaxable(defaults.isTaxable);
    setIsThirdPartyMoney(defaults.isThirdPartyMoney);
    setRequiresLiabilityTracking(defaults.requiresLiabilityTracking);
  }, []);

  const handleAmountChange = (setter: (v: string) => void) => (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setter("0,00"); return; }
    const val = parseInt(digits) / 100;
    setter(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = () => {
    if (!description.trim()) { toast.error("Informe a descrição."); return; }
    const gross = parseFromBR(grossAmount);
    if (gross <= 0) { toast.error("Informe o valor bruto."); return; }

    const incomeData = {
      description: description.trim(),
      sourceType,
      financialNature,
      counterparty: counterparty.trim() || undefined,
      grossAmount: gross,
      fees: parseFromBR(fees),
      discounts: parseFromBR(discounts),
      taxWithheld: parseFromBR(taxWithheld),
      netExpectedAmount,
      competenceDate,
      expectedDueDate,
      status: (editingIncome?.status || 'previsto') as FutureIncome['status'],
      confidence,
      accountId: accountId || undefined,
      categoryId: categoryId || undefined,
      isTaxable,
      isThirdPartyMoney,
      requiresLiabilityTracking,
      tags: editingIncome?.tags || [],
      notes: notes.trim() || undefined,
    };

    if (editingIncome) {
      updateFutureIncome(editingIncome.id, incomeData);
      toast.success("Receita atualizada!");
    } else {
      addFutureIncome(incomeData);
      toast.success("Receita cadastrada!");
    }
    onSave();
  };

  const incomeCategories = categoriasV2.filter(c => c.nature === 'receita');
  const liquidAccounts = contasMovimento.filter(c => c.accountType !== 'cartao_credito');

  return (
    <ScrollArea className="h-full scrollbar-material">
      <div className="space-y-6 p-1 pb-32">
        {/* Tipo de Receita */}
        <div className="space-y-2">
          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Receita</Label>
          <Select value={sourceType} onValueChange={(v) => handleSourceTypeChange(v as IncomeSourceType)}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_TYPE_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{group.label}</div>
                  {group.types.map(type => (
                    <SelectItem key={type} value={type}>{INCOME_SOURCE_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descrição + Contraparte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Salário Janeiro" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pagador / Cliente</Label>
            <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Ex: Empresa X" className="rounded-xl" />
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* Valores */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valores</Label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[8px] font-bold text-muted-foreground/70">Bruto *</Label>
              <Input value={grossAmount} onChange={e => handleAmountChange(setGrossAmount)(e.target.value)} className="rounded-xl h-9 text-sm font-bold tabular-nums" />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-bold text-muted-foreground/70">Taxas</Label>
              <Input value={fees} onChange={e => handleAmountChange(setFees)(e.target.value)} className="rounded-xl h-9 text-sm tabular-nums" />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-bold text-muted-foreground/70">Descontos</Label>
              <Input value={discounts} onChange={e => handleAmountChange(setDiscounts)(e.target.value)} className="rounded-xl h-9 text-sm tabular-nums" />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px] font-bold text-muted-foreground/70">IR Retido</Label>
              <Input value={taxWithheld} onChange={e => handleAmountChange(setTaxWithheld)(e.target.value)} className="rounded-xl h-9 text-sm tabular-nums" />
            </div>
          </div>
          <div className="p-3 rounded-xl bg-success/5 border border-success/15 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-success/70">Líquido Esperado</span>
            <span className="text-sm font-black text-success tabular-nums">{formatCurrency(netExpectedAmount)}</span>
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Data Competência</Label>
            <Input type="date" value={competenceDate} onChange={e => setCompetenceDate(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Vencimento Previsto *</Label>
            <Input type="date" value={expectedDueDate} onChange={e => setExpectedDueDate(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        {/* Confiança */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Confiança de Recebimento</Label>
            <Badge variant="outline" className={cn(
              "text-[8px] font-black",
              confidence >= 80 ? "text-success border-success/30" : confidence >= 50 ? "text-warning border-warning/30" : "text-destructive border-destructive/30"
            )}>
              {confidence}%
            </Badge>
          </div>
          <input 
            type="range" min="0" max="100" value={confidence} 
            onChange={e => setConfidence(parseInt(e.target.value))}
            className="w-full accent-primary h-1.5"
          />
        </div>

        {/* Conta e Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Conta de Recebimento</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
              <SelectContent>
                {liquidAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {incomeCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced toggle */}
        <Button variant="ghost" className="w-full h-8 text-[9px] font-black uppercase tracking-widest text-muted-foreground gap-1" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Classificação Avançada
        </Button>

        {showAdvanced && (
          <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/30">
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Natureza Financeira</Label>
              <Select value={financialNature} onValueChange={(v) => setFinancialNature(v as IncomeFinancialNature)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INCOME_FINANCIAL_NATURE_LABELS) as IncomeFinancialNature[]).map(key => (
                    <SelectItem key={key} value={key}>{INCOME_FINANCIAL_NATURE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tributável (IR)</Label>
                <Switch checked={isTaxable} onCheckedChange={setIsTaxable} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Dinheiro de Terceiros</Label>
                <Switch checked={isThirdPartyMoney} onCheckedChange={setIsThirdPartyMoney} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gera Passivo (Devolução)</Label>
                <Switch checked={requiresLiabilityTracking} onCheckedChange={setRequiresLiabilityTracking} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." className="rounded-xl min-h-[60px] text-sm" />
            </div>
          </div>
        )}

        {/* Save button */}
        <Button onClick={handleSave} className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2">
          <Save className="w-4 h-4" />
          {editingIncome ? "Atualizar Receita" : "Cadastrar Receita"}
        </Button>
      </div>
    </ScrollArea>
  );
}
