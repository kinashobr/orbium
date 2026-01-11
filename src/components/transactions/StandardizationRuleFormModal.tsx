"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pin, Save, AlertCircle, Check, X } from "lucide-react";
import { StandardizationRule, ImportedTransaction, Categoria, OperationType, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StandardizationRuleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTransaction?: ImportedTransaction | null;
  initialRule?: StandardizationRule | null; // Adicionado para edição
  categories: Categoria[];
  onSave: (rule: Omit<StandardizationRule, "id">, ruleId?: string) => void;
}

export const STANDARDIZABLE_OPERATIONS: { value: OperationType; label: string; color: string }[] = [
  { value: 'receita', label: 'Receita', color: 'text-success' },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', color: 'text-orange-500' },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo', color: 'text-emerald-500' },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500' },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500' },
];

export function StandardizationRuleFormModal({
  open,
  onOpenChange,
  initialTransaction,
  initialRule,
  categories,
  onSave,
}: StandardizationRuleFormModalProps) {
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<OperationType | ''>('');
  const [descriptionTemplate, setDescriptionTemplate] = useState("");

  const NON_CATEGORY_OPERATIONS: OperationType[] = [
    'transferencia', 
    'aplicacao', 
    'resgate', 
    'pagamento_emprestimo', 
    'liberacao_emprestimo', 
    'veiculo'
  ];
  
  const categoryRequired = operationType && !NON_CATEGORY_OPERATIONS.includes(operationType as OperationType);

  useEffect(() => {
    if (open) {
      if (initialRule) {
        setPattern(initialRule.pattern);
        setOperationType(initialRule.operationType);
        setCategoryId(initialRule.categoryId);
        setDescriptionTemplate(initialRule.descriptionTemplate);
      } else if (initialTransaction) {
        setPattern(initialTransaction.originalDescription);
        setOperationType(initialTransaction.operationType || "");
        setDescriptionTemplate(initialTransaction.description);
        setCategoryId(initialTransaction.categoryId || null);
        if (initialTransaction.operationType && NON_CATEGORY_OPERATIONS.includes(initialTransaction.operationType)) {
            setCategoryId(null);
        }
      }
    } else {
      setPattern("");
      setCategoryId(null);
      setOperationType("");
      setDescriptionTemplate("");
    }
  }, [open, initialTransaction, initialRule]);

  const getCategoryOptions = useMemo(() => {
    if (!operationType || !categoryRequired) return categories; 
    const isIncome = ['receita', 'rendimento', 'liberacao_emprestimo'].includes(operationType);
    return categories.filter(c => (isIncome && c.nature === 'receita') || (!isIncome && c.nature !== 'receita'));
  }, [categories, operationType, categoryRequired]);

  const handleSubmit = () => {
    if (!pattern.trim() || !operationType || !descriptionTemplate.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (categoryRequired && !categoryId) {
        toast.error("A categoria é obrigatória para esta operação.");
        return;
    }
    
    onSave({
      pattern: pattern.trim(),
      categoryId: categoryRequired ? categoryId : null,
      operationType: operationType as OperationType,
      descriptionTemplate: descriptionTemplate.trim(),
    }, initialRule?.id);
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2.5rem] z-[110]"> {/* Adicionado z-[110] */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-primary/10">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Pin className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold">
                {initialRule ? 'Editar Regra' : 'Nova Regra de Padronização'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Automatize a categorização de transações importadas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Padrão de Busca *</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Ex: PAGAMENTO CARTAO"
              className="h-12 border-2 rounded-xl text-sm"
            />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Busca parcial na descrição original do extrato.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operação *</Label>
              <Select
                value={operationType}
                onValueChange={(v) => {
                    setOperationType(v as OperationType);
                    if (NON_CATEGORY_OPERATIONS.includes(v as OperationType)) setCategoryId(null);
                }}
              >
                <SelectTrigger className="h-12 border-2 rounded-xl">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {STANDARDIZABLE_OPERATIONS.map(op => (
                    <SelectItem key={op.value} value={op.value}>
                      <span className={cn("flex items-center gap-2", op.color)}>{op.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria {categoryRequired ? '*' : ''}</Label>
              <Select
                value={categoryId || ''}
                onValueChange={setCategoryId}
                disabled={!categoryRequired}
              >
                <SelectTrigger className="h-12 border-2 rounded-xl">
                  <SelectValue placeholder={categoryRequired ? "Selecione..." : "Não aplicável"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getCategoryOptions.map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs font-medium">
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Padronizada *</Label>
            <Input
              value={descriptionTemplate}
              onChange={(e) => setDescriptionTemplate(e.target.value)}
              placeholder="Ex: Pagamento Fatura Cartão"
              className="h-12 border-2 rounded-xl text-sm"
            />
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/20 border-t flex gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-6 font-bold">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="rounded-full h-11 px-8 font-bold gap-2">
            <Check className="w-4 h-4" />
            {initialRule ? 'Atualizar Regra' : 'Salvar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}