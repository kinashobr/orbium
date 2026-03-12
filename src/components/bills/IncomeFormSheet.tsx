import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Calculator, Plus, Trash2, Info, Sparkles, CalendarPlus } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { CategoryFormModal } from "@/components/transactions/CategoryFormModal";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  FutureIncome, IncomeDiscount, IncomeLayoutMode, IncomeSpecificType,
  formatCurrency, generateCategoryId
} from "@/types/finance";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
  const cleaned = value.replace(/[^\d,]/g, '');
  const parsed = parseFloat(cleaned.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

interface IncomeFormSheetProps {
  editingIncome?: FutureIncome;
  onSave: () => void;
}

export function IncomeFormSheet({ editingIncome, onSave }: IncomeFormSheetProps) {
  const { addFutureIncome, updateFutureIncome, contasMovimento, categoriasV2, setCategoriasV2 } = useFinance();

  // Layout & Template State
  const [layoutMode, setLayoutMode] = useState<IncomeLayoutMode>(editingIncome?.layoutMode || 'basic');
  const [specificType, setSpecificType] = useState<IncomeSpecificType>(editingIncome?.specificType || 'generic');

  // Core Fields
  const [description, setDescription] = useState(editingIncome?.description || "");
  const [counterparty, setCounterparty] = useState(editingIncome?.counterparty || "");
  const [categoryId, setCategoryId] = useState(editingIncome?.categoryId || "");
  const [accountId, setAccountId] = useState(editingIncome?.accountId || "");
  const [competenceDate, setCompetenceDate] = useState(editingIncome?.competenceDate || format(new Date(), 'yyyy-MM-dd'));
  const [expectedReceiptDate, setExpectedReceiptDate] = useState(editingIncome?.expectedReceiptDate || format(new Date(), 'yyyy-MM-dd'));

  // Specialized Fields
  const [provisionMonths, setProvisionMonths] = useState(0);
  const [loanAdjustmentIndex, setLoanAdjustmentIndex] = useState(editingIncome?.loanAdjustmentIndex || "");
  const [editMode, setEditMode] = useState<'series' | 'instance'>(editingIncome?.recurrenceRule ? 'instance' : 'series');
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [categoryToCreate, setCategoryToCreate] = useState<string | null>(null);

  // Value Fields
  const [grossAmount, setGrossAmount] = useState(formatToBR(editingIncome?.grossAmount || 0));
  const [netExpectedAmountInput, setNetExpectedAmountInput] = useState(formatToBR(editingIncome?.netExpectedAmount || 0));
  const [discounts, setDiscounts] = useState<IncomeDiscount[]>(editingIncome?.discounts || []);

  // Loan Specific
  const [interestRate, setInterestRate] = useState("0");

  // Identify template based on category
  useEffect(() => {
    if (!categoryId) return;
    const cat = categoriasV2.find(c => c.id === categoryId);
    if (!cat) return;

    const label = cat.label.toLowerCase();
    if (label.includes('clt') || label.includes('salário') || label.includes('salario')) {
      setSpecificType('clt');
      if (discounts.length === 0 && !editingIncome) {
        setDiscounts([
          { label: 'INSS', amount: 0 },
          { label: 'FGTS', amount: 0 },
          { label: 'IRRF', amount: 0 },
          { label: 'Convênio', amount: 0 },
        ]);
      }
    } else if (label.includes('13º') || label.includes('décimo') || label.includes('decimo')) {
      setSpecificType('clt'); // Use CLT template for 13º
      // Inheritance logic: try to find a CLT income to copy discounts
      if (discounts.length === 0 && !editingIncome) {
        // This is a simplified inheritance, in a real app we'd search the state
        setDiscounts([
          { label: 'IRRF 13º', amount: 0 },
          { label: 'INSS 13º', amount: 0 },
        ]);
      }
    } else if (label.includes('venda') || label.includes('cliente') || label.includes('lojinha')) {
      setSpecificType('sales');
    } else if (label.includes('empréstimo') || label.includes('emprestimo')) {
      setSpecificType('loan');
    } else if (label.includes('freelance') || label.includes('bico') || label.includes('comissão') || label.includes('extra')) {
      setSpecificType('freelance');
    } else {
      setSpecificType('generic');
    }
  }, [categoryId, categoriasV2, editingIncome, discounts.length]);

  const netExpectedAmount = useMemo(() => {
    if (layoutMode === 'basic') {
      return parseFromBR(netExpectedAmountInput);
    }
    const g = parseFromBR(grossAmount);
    const d = discounts.reduce((acc, curr) => acc + curr.amount, 0);
    return Math.max(0, g - d);
  }, [layoutMode, netExpectedAmountInput, grossAmount, discounts]);

  const handleAmountChange = (setter: (v: string) => void) => (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setter("0,00"); return; }
    const val = parseInt(digits) / 100;
    setter(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleDiscountChange = (index: number, amountStr: string) => {
    const digits = amountStr.replace(/\D/g, "");
    const val = digits ? parseInt(digits) / 100 : 0;
    const newDiscounts = [...discounts];
    newDiscounts[index] = { ...newDiscounts[index], amount: val };
    setDiscounts(newDiscounts);
  };

  const addDiscountField = () => {
    setDiscounts([...discounts, { label: 'Novo Desconto', amount: 0 }]);
  };

  const removeDiscountField = (index: number) => {
    setDiscounts(discounts.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!description.trim()) { toast.error("Informe a descrição."); return; }
    if (!categoryId) { toast.error("Selecione uma categoria."); return; }

    const gross = layoutMode === 'advanced' ? parseFromBR(grossAmount) : netExpectedAmount;
    const competenceKey = format(parseISO(competenceDate), 'yyyy-MM');
    
    const incomeData: Partial<FutureIncome> = {
      description: description.trim(),
      categoryId,
      counterparty: counterparty.trim() || undefined,
      grossAmount: gross,
      fees: 0,
      discounts: layoutMode === 'advanced' ? discounts : [],
      taxWithheld: 0,
      netExpectedAmount,
      competenceDate,
      expectedReceiptDate,
      status: (editingIncome?.status || 'previsto') as FutureIncome['status'],
      layoutMode,
      specificType,
      accountId: accountId || undefined,
      tags: editingIncome?.tags || [],
      loanAdjustmentIndex: specificType === 'loan' ? loanAdjustmentIndex : undefined,
    };

    if (editingIncome) {
      if (editMode === 'instance' && editingIncome.recurrenceRule) {
        // Save as override
        const updatedOverrides = { ...(editingIncome.overrides || {}) };
        updatedOverrides[competenceKey] = {
          netExpectedAmount,
          grossAmount: gross,
          expectedReceiptDate,
          discounts: layoutMode === 'advanced' ? discounts : undefined,
        };
        updateFutureIncome(editingIncome.id, { overrides: updatedOverrides });
        toast.success("Alteração salva apenas para este mês!");
      } else {
        updateFutureIncome(editingIncome.id, incomeData);
        toast.success("Série de receita atualizada!");
      }
    } else {
      const newIncome = addFutureIncome(incomeData as Omit<FutureIncome, 'id' | 'createdAt' | 'updatedAt'>);
      
      // Provisioning logic
      if (specificType === 'clt' && layoutMode === 'advanced') {
        // Auto-provision until end of year + 13th
        const currentMonth = parseISO(competenceDate).getMonth();
        const year = parseISO(competenceDate).getFullYear();
        let provCount = 0;
        
        // Months
        for (let i = currentMonth + 1; i < 12; i++) {
          const nextCompetence = format(new Date(year, i, 1), 'yyyy-MM-dd');
          const nextReceipt = format(addMonths(parseISO(expectedReceiptDate), i - currentMonth), 'yyyy-MM-dd');
          addFutureIncome({
            ...incomeData,
            competenceDate: nextCompetence,
            expectedReceiptDate: nextReceipt,
            isProvisioned: true,
            parentIncomeId: newIncome?.id
          } as Omit<FutureIncome, 'id' | 'createdAt' | 'updatedAt'>);
          provCount++;
        }
        
        // 13th salary
        const nextCompetence13 = format(new Date(year, 11, 1), 'yyyy-MM-dd'); // December
        const nextReceipt13 = format(new Date(year, 11, 20), 'yyyy-MM-dd'); // Usually paid by Dec 20
        addFutureIncome({
          ...incomeData,
          description: `13º Salário - ${description.trim()}`,
          competenceDate: nextCompetence13,
          expectedReceiptDate: nextReceipt13,
          isProvisioned: true,
          parentIncomeId: newIncome?.id
        } as Omit<FutureIncome, 'id' | 'createdAt' | 'updatedAt'>);
        provCount++;
        
        toast.success(`Receita cadastrada e provisionada até o fim do ano (incluindo 13º)!`);
      } else if (provisionMonths > 0 && newIncome) {
        for (let i = 1; i <= provisionMonths; i++) {
          const nextCompetence = format(addMonths(parseISO(competenceDate), i), 'yyyy-MM-dd');
          const nextReceipt = format(addMonths(parseISO(expectedReceiptDate), i), 'yyyy-MM-dd');
          addFutureIncome({
            ...incomeData,
            competenceDate: nextCompetence,
            expectedReceiptDate: nextReceipt,
            isProvisioned: true,
            parentIncomeId: newIncome.id
          } as Omit<FutureIncome, 'id' | 'createdAt' | 'updatedAt'>);
        }
        toast.success(`Receita cadastrada e provisionada por ${provisionMonths} meses!`);
      } else {
        toast.success("Receita cadastrada!");
      }
    }
    onSave();
  };

  const incomeCategories = categoriasV2.filter(c => c.nature === 'receita');
  const liquidAccounts = contasMovimento.filter(c => c.accountType !== 'cartao_credito');

  const suggestedCategories = [
    { label: 'Salário', icon: '💰' },
    { label: 'Freelance', icon: '👨‍💻' },
    { label: 'Vendas', icon: '🛍️' },
    { label: 'Empréstimo', icon: '🤝' },
    { label: 'Rendimentos', icon: '📈' },
  ];

  const handleCreateCategory = (label?: string) => {
    setCategoryToCreate(label || null);
    setIsCreateCategoryDialogOpen(true);
  };

  // Calculate projection for CLT
  const cltProjection = useMemo(() => {
    if (specificType !== 'clt' || layoutMode !== 'advanced') return [];
    const currentMonth = parseISO(competenceDate).getMonth();
    const year = parseISO(competenceDate).getFullYear();
    const proj = [];
    
    for (let i = currentMonth; i < 12; i++) {
      proj.push({
        label: format(new Date(year, i, 1), 'MMMM', { locale: ptBR }),
        amount: netExpectedAmount
      });
    }
    
    proj.push({
      label: '13º Salário',
      amount: netExpectedAmount
    });
    
    return proj;
  }, [specificType, layoutMode, competenceDate, netExpectedAmount]);

  return (
    <ScrollArea className="h-full scrollbar-material">
      <div className="space-y-6 p-1 pb-32">
        
        {/* Layout Switcher & Edit Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Modo de Lançamento</span>
              <span className="text-[9px] text-muted-foreground">
                {layoutMode === 'basic' ? 'Simplificado (apenas líquido)' : 'Avançado (bruto e descontos)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-[9px] font-bold", layoutMode === 'basic' ? "text-primary" : "text-muted-foreground")}>Básico</span>
              <Switch 
                checked={layoutMode === 'advanced'} 
                onCheckedChange={(checked) => setLayoutMode(checked ? 'advanced' : 'basic')} 
              />
              <span className={cn("text-[9px] font-bold", layoutMode === 'advanced' ? "text-primary" : "text-muted-foreground")}>Avançado</span>
            </div>
          </div>

          {editingIncome?.recurrenceRule && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Escopo da Edição</span>
                <span className="text-[9px] text-amber-600/70">Esta é uma receita recorrente</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant={editMode === 'instance' ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 text-[8px] uppercase font-bold"
                  onClick={() => setEditMode('instance')}
                >
                  Apenas este mês
                </Button>
                <Button 
                  variant={editMode === 'series' ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 text-[8px] uppercase font-bold"
                  onClick={() => setEditMode('series')}
                >
                  Toda a série
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dialog para Nova Categoria */}
        <CategoryFormModal 
          open={isCreateCategoryDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateCategoryDialogOpen(open);
            if (!open) setCategoryToCreate(null);
          }}
          defaultNature="receita"
          defaultLabel={categoryToCreate || ""}
          onSubmit={(newCat) => {
            setCategoriasV2(prev => [...prev, newCat]);
            setCategoryId(newCat.id);
            toast.success(`Categoria "${newCat.label}" criada!`);
            setIsCreateCategoryDialogOpen(false);
            setCategoryToCreate(null);
          }}
        />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Categoria *</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 text-[8px] font-black uppercase text-primary"
                onClick={() => setIsCreateCategoryDialogOpen(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> Nova Categoria
              </Button>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40">
                <SelectValue placeholder="Selecione a categoria para aplicar o template" />
              </SelectTrigger>
              <SelectContent className="z-[150]">
                {incomeCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sugestões de Categoria */}
          {!categoryId && (
            <div className="flex flex-wrap gap-2">
              {suggestedCategories.map(sug => (
                <Badge 
                  key={sug.label} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors py-1.5 px-3 rounded-lg border-dashed"
                  onClick={() => {
                    const existing = incomeCategories.find(c => c.label === sug.label);
                    if (existing) {
                      setCategoryId(existing.id);
                    } else {
                      setCategoryToCreate(sug.label);
                      setIsCreateCategoryDialogOpen(true);
                    }
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
                  <span className="text-[10px] font-bold">{sug.label}</span>
                </Badge>
              ))}
            </div>
          )}

          {specificType !== 'generic' && (
            <div className="flex items-center gap-1.5 px-1">
              <Info className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-bold text-primary/70 uppercase">Template {specificType.toUpperCase()} Ativado</span>
            </div>
          )}
        </div>

        {/* Descrição + Contraparte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Salário Janeiro" className="rounded-xl h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {specificType === 'sales' ? 'Cliente' : specificType === 'loan' ? 'Beneficiário' : 'Pagador'}
            </Label>
            <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Nome da pessoa ou empresa" className="rounded-xl h-11" />
          </div>
        </div>

        {/* Datas e Conta (Movidos para cima) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Data Competência</Label>
            <Input type="date" value={competenceDate} onChange={e => setCompetenceDate(e.target.value)} className="rounded-xl h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Recebimento Previsto *</Label>
            <Input type="date" value={expectedReceiptDate} onChange={e => setExpectedReceiptDate(e.target.value)} className="rounded-xl h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Conta de Recebimento</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
              <SelectContent className="z-[150]">
                {liquidAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* Valores Dinâmicos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valores</Label>
          </div>

          {layoutMode === 'basic' ? (
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor Líquido *</Label>
              <Input 
                value={netExpectedAmountInput} 
                onChange={e => handleAmountChange(setNetExpectedAmountInput)(e.target.value)} 
                className="rounded-xl h-12 text-lg font-black tabular-nums bg-primary/5 border-primary/20 text-primary" 
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valor Bruto *</Label>
                  <Input 
                    value={grossAmount} 
                    onChange={e => handleAmountChange(setGrossAmount)(e.target.value)} 
                    className="rounded-xl h-11 text-base font-bold tabular-nums" 
                  />
                </div>
                {specificType === 'loan' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Taxa de Juros (%)</Label>
                      <Input 
                        type="number"
                        value={interestRate} 
                        onChange={e => setInterestRate(e.target.value)} 
                        className="rounded-xl h-11" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Índice Reajuste</Label>
                      <Select value={loanAdjustmentIndex} onValueChange={setLoanAdjustmentIndex}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="igpm">IGP-M</SelectItem>
                          <SelectItem value="ipca">IPCA</SelectItem>
                          <SelectItem value="selic">SELIC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Descontos e Projeção */}
              <div className={cn("grid gap-4", specificType === 'clt' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                {/* Lado Esquerdo: Descontos */}
                <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/30 h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descontos & Deduções</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase" onClick={addDiscountField}>
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {discounts.map((discount, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input 
                          value={discount.label} 
                          onChange={e => {
                            const next = [...discounts];
                            next[idx].label = e.target.value;
                            setDiscounts(next);
                          }}
                          className="h-9 rounded-lg text-xs"
                          placeholder="Nome do desconto"
                        />
                        <Input 
                          value={formatToBR(discount.amount)} 
                          onChange={e => handleDiscountChange(idx, e.target.value)}
                          className="h-9 rounded-lg text-xs w-32 text-right tabular-nums"
                        />
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/50 hover:text-destructive" onClick={() => removeDiscountField(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {discounts.length === 0 && (
                      <div className="text-center py-4 text-[10px] text-muted-foreground italic">Nenhum desconto aplicado</div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Projeção (Apenas CLT) */}
                {specificType === 'clt' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarPlus className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">Projeção Ano Corrente</span>
                    </div>
                    <div className="space-y-1.5">
                      {cltProjection.map((proj, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                          <span className="text-[10px] font-bold text-muted-foreground capitalize">{proj.label}</span>
                          <span className="text-[10px] font-black tabular-nums">{formatCurrency(proj.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 mt-2 border-t border-primary/20">
                      <p className="text-[8px] text-primary/70 leading-tight">
                        Ao salvar, as receitas serão automaticamente provisionadas até o fim do ano, incluindo o 13º salário.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Provisionamento (Somente para novos lançamentos NÃO-CLT) */}
              {!editingIncome && specificType !== 'clt' && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="provision" 
                      checked={provisionMonths > 0} 
                      onCheckedChange={(checked) => setProvisionMonths(checked ? 6 : 0)} 
                    />
                    <Label htmlFor="provision" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                      Provisionar para meses seguintes
                    </Label>
                  </div>
                  {provisionMonths > 0 && (
                    <div className="flex items-center gap-3 pl-6">
                      <span className="text-[9px] font-bold text-muted-foreground">Repetir por:</span>
                      <div className="flex gap-1">
                        {[3, 6, 12, 24].map(m => (
                          <Button 
                            key={m}
                            variant={provisionMonths === m ? 'default' : 'outline'} 
                            size="sm" 
                            className="h-6 px-2 text-[8px] font-bold"
                            onClick={() => setProvisionMonths(m)}
                          >
                            {m} meses
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-success/5 border border-success/15 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-success/70">Líquido Calculado</span>
                <span className="text-lg font-black text-success tabular-nums">{formatCurrency(netExpectedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest gap-2 shadow-lg shadow-primary/20">
          <Save className="w-5 h-5" />
          {editingIncome ? "Atualizar Receita" : "Cadastrar Receita"}
        </Button>
      </div>
    </ScrollArea>
  );
}

