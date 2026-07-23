import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/types/finance';
import { HoleriteCompetenciaData, HoleriteItem } from '@/types/clt';
import { useFinance } from '@/contexts/FinanceContext';
import { Plus, Trash2, Save, Receipt, Calculator, Percent, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  contractId: string;
  competenciaId: string; // unique ID or `${contractId}_${competenciaKey}`
  competenciaLabel: string;
  defaultSalario?: number;
  onClose?: () => void;
}

export function CltHoleriteEditor({
  contractId,
  competenciaId,
  competenciaLabel,
  defaultSalario = 0,
  onClose
}: Props) {
  const { cltHolerites = {}, saveCltHolerite, deleteCltHolerite } = useFinance();

  const existingData = cltHolerites[competenciaId];

  const [salarioMensal, setSalarioMensal] = useState<string>(
    existingData ? String(existingData.salarioMensal) : defaultSalario ? String(defaultSalario) : ""
  );

  const [rendimentosExtras, setRendimentosExtras] = useState<HoleriteItem[]>(
    existingData?.rendimentosExtras || []
  );

  const [inssValor, setInssValor] = useState<string>(
    existingData ? String(existingData.inssValor) : ""
  );

  const [inssAliquota, setInssAliquota] = useState<string>(
    existingData && existingData.inssAliquota !== undefined ? String(existingData.inssAliquota) : ""
  );

  const [descontosExtras, setDescontosExtras] = useState<HoleriteItem[]>(
    existingData?.descontosExtras || []
  );

  useEffect(() => {
    if (existingData) {
      setSalarioMensal(String(existingData.salarioMensal));
      setRendimentosExtras(existingData.rendimentosExtras || []);
      setInssValor(String(existingData.inssValor));
      setInssAliquota(existingData.inssAliquota !== undefined ? String(existingData.inssAliquota) : "");
      setDescontosExtras(existingData.descontosExtras || []);
    }
  }, [competenciaId, existingData]);

  // Handlers for Rendimentos Extras
  const handleAddRendimento = () => {
    setRendimentosExtras(prev => [
      ...prev,
      { id: `re_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, descricao: "", valor: 0 }
    ]);
  };

  const handleUpdateRendimento = (id: string, field: 'descricao' | 'valor', value: string) => {
    setRendimentosExtras(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'valor') {
        const num = parseFloat(value.replace(",", "."));
        return { ...item, valor: isNaN(num) ? 0 : num };
      }
      return { ...item, descricao: value };
    }));
  };

  const handleRemoveRendimento = (id: string) => {
    setRendimentosExtras(prev => prev.filter(item => item.id !== id));
  };

  // Handlers for Descontos Extras
  const handleAddDesconto = () => {
    setDescontosExtras(prev => [
      ...prev,
      { id: `de_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, descricao: "", valor: 0, aliquota: undefined }
    ]);
  };

  const handleUpdateDesconto = (id: string, field: 'descricao' | 'valor' | 'aliquota', value: string) => {
    setDescontosExtras(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'valor') {
        const num = parseFloat(value.replace(",", "."));
        return { ...item, valor: isNaN(num) ? 0 : num };
      }
      if (field === 'aliquota') {
        const num = parseFloat(value.replace(",", "."));
        return { ...item, aliquota: isNaN(num) ? undefined : num };
      }
      return { ...item, descricao: value };
    }));
  };

  const handleRemoveDesconto = (id: string) => {
    setDescontosExtras(prev => prev.filter(item => item.id !== id));
  };

  // Real-time calculation of totals
  const numSalarioMensal = parseFloat(salarioMensal.replace(",", ".")) || 0;
  const totalRendimentosExtras = rendimentosExtras.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalBrutoRealTime = numSalarioMensal + totalRendimentosExtras;

  const numInssValor = parseFloat(inssValor.replace(",", ".")) || 0;
  const totalDescontosExtras = descontosExtras.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalDescontosRealTime = numInssValor + totalDescontosExtras;

  const saldoLiquidoRealTime = totalBrutoRealTime - totalDescontosRealTime;

  // Auto-calculate INSS suggestion if empty or requested
  const handleSuggestInss = () => {
    if (numSalarioMensal <= 0) return;
    // Standard 2026 progressive INSS approximation for quick fill
    let estimatedInss = 0;
    const base = totalBrutoRealTime;
    if (base <= 1518.00) {
      estimatedInss = base * 0.075;
    } else if (base <= 2793.88) {
      estimatedInss = 1518.00 * 0.075 + (base - 1518.00) * 0.09;
    } else if (base <= 4190.83) {
      estimatedInss = 1518.00 * 0.075 + (2793.88 - 1518.00) * 0.09 + (base - 2793.88) * 0.12;
    } else if (base <= 8157.41) {
      estimatedInss = 1518.00 * 0.075 + (2793.88 - 1518.00) * 0.09 + (4190.83 - 2793.88) * 0.12 + (base - 4190.83) * 0.14;
    } else {
      estimatedInss = 1050.89; // Ceiling
    }
    setInssValor(estimatedInss.toFixed(2));
    const effectiveAliq = (estimatedInss / base) * 100;
    setInssAliquota(effectiveAliq.toFixed(2));
    toast.info("INSS estimado preenchido com base nas tabelas vigentes.");
  };

  const handleSave = () => {
    if (numSalarioMensal <= 0 && rendimentosExtras.length === 0) {
      toast.error("Informe ao menos o valor do salário mensal ou um rendimento.");
      return;
    }

    const payload: HoleriteCompetenciaData = {
      id: competenciaId,
      contractId,
      competencia: competenciaLabel,
      salarioMensal: numSalarioMensal,
      rendimentosExtras: rendimentosExtras.filter(r => r.descricao.trim() !== "" || r.valor > 0),
      inssValor: numInssValor,
      inssAliquota: parseFloat(inssAliquota.replace(",", ".")) || undefined,
      descontosExtras: descontosExtras.filter(d => d.descricao.trim() !== "" || d.valor > 0),
      updatedAt: new Date().toISOString()
    };

    saveCltHolerite(payload);
    toast.success(`Holerite de ${competenciaLabel} salvo com sucesso!`);
    if (onClose) onClose();
  };

  const handleDelete = () => {
    deleteCltHolerite(competenciaId);
    toast.success("Dados do holerite removidos.");
    if (onClose) onClose();
  };

  return (
    <Card className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-inner space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">
              Detalhamento de Holerite ({competenciaLabel})
            </h4>
            <p className="text-[10px] text-muted-foreground font-medium">
              Preenchimento opcional para apuração exata do holerite e médias das férias.
            </p>
          </div>
        </div>
        {onClose && (
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* SEÇÃO 1: RENDIMENTOS (ENTRADAS BRUTAS) */}
        <div className="space-y-3 bg-muted/15 p-3.5 rounded-xl border border-border/30">
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Rendimentos (Composição Bruta)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRendimento}
              className="h-7 text-[9px] font-extrabold uppercase rounded-lg border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-2.5 gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Rendimento
            </Button>
          </div>

          {/* Salário Mensal Padrão */}
          <div className="space-y-1">
            <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              Salário Mensal / Base *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/60">R$</span>
              <Input
                type="number"
                step="0.01"
                value={salarioMensal}
                onChange={e => setSalarioMensal(e.target.value)}
                placeholder="0.00"
                className="h-9 pl-8 rounded-xl border-border/60 bg-background text-xs font-black"
              />
            </div>
          </div>

          {/* Adicionais / Rendimentos Extras */}
          {rendimentosExtras.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/15">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Outros Rendimentos</span>
              {rendimentosExtras.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={item.descricao}
                    onChange={e => handleUpdateRendimento(item.id, 'descricao', e.target.value)}
                    placeholder="Ex: Quinquênio, Horas Extras, Bônus..."
                    className="h-8 text-xs font-bold rounded-lg border-border/60 bg-background flex-1"
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.valor || ""}
                      onChange={e => handleUpdateRendimento(item.id, 'valor', e.target.value)}
                      placeholder="0.00"
                      className="h-8 pl-7 text-xs font-black rounded-lg border-border/60 bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRendimento(item.id)}
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-border/20 text-xs font-bold">
            <span className="text-muted-foreground uppercase text-[9px]">Total Rendimentos Brutos:</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalBrutoRealTime)}
            </span>
          </div>
        </div>

        {/* SEÇÃO 2: DESCONTOS */}
        <div className="space-y-3 bg-muted/15 p-3.5 rounded-xl border border-border/30">
          <div className="flex items-center justify-between border-b border-border/20 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Descontos e Deduções
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDesconto}
              className="h-7 text-[9px] font-extrabold uppercase rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2.5 gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Desconto
            </Button>
          </div>

          {/* INSS Padrão */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                Desconto INSS
              </Label>
              <button
                type="button"
                onClick={handleSuggestInss}
                className="text-[9px] font-bold text-primary hover:underline"
              >
                Sugerir tabela INSS
              </button>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/60">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={inssValor}
                  onChange={e => setInssValor(e.target.value)}
                  placeholder="0.00"
                  className="h-9 pl-8 rounded-xl border-border/60 bg-background text-xs font-black"
                />
              </div>
              <div className="col-span-4 relative">
                <Input
                  type="number"
                  step="0.01"
                  value={inssAliquota}
                  onChange={e => setInssAliquota(e.target.value)}
                  placeholder="%"
                  className="h-9 pr-6 rounded-xl border-border/60 bg-background text-xs font-bold"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/60">%</span>
              </div>
            </div>
          </div>

          {/* Outros Descontos Extras */}
          {descontosExtras.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/15">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block">Outros Descontos</span>
              {descontosExtras.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={item.descricao}
                    onChange={e => handleUpdateDesconto(item.id, 'descricao', e.target.value)}
                    placeholder="Ex: IRRF, VT, VR, Plano Saúde, Faltas..."
                    className="h-8 text-xs font-bold rounded-lg border-border/60 bg-background flex-1"
                  />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.valor || ""}
                      onChange={e => handleUpdateDesconto(item.id, 'valor', e.target.value)}
                      placeholder="0.00"
                      className="h-8 pl-7 text-xs font-black rounded-lg border-border/60 bg-background"
                    />
                  </div>
                  <div className="relative w-16 shrink-0">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.aliquota !== undefined ? item.aliquota : ""}
                      onChange={e => handleUpdateDesconto(item.id, 'aliquota', e.target.value)}
                      placeholder="%"
                      className="h-8 pr-5 text-xs font-bold rounded-lg border-border/60 bg-background"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/60">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDesconto(item.id)}
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-border/20 text-xs font-bold">
            <span className="text-muted-foreground uppercase text-[9px]">Total Descontos:</span>
            <span className="font-mono font-black text-rose-600 dark:text-rose-400">
              - {formatCurrency(totalDescontosRealTime)}
            </span>
          </div>
        </div>

      </div>

      {/* BANNER DO SALDO LÍQUIDO EM TEMPO REAL */}
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-0.5 text-center sm:text-left w-full sm:w-auto">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Saldo Líquido do Holerite (Tempo Real)
            </span>
            <Badge className="bg-primary/15 text-primary border-none text-[8px] font-black uppercase py-0.5">
              Live
            </Badge>
          </div>
          <div className="flex items-baseline justify-center sm:justify-start gap-3">
            <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(saldoLiquidoRealTime)}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              ({formatCurrency(totalBrutoRealTime)} bruto - {formatCurrency(totalDescontosRealTime)} descontos)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {existingData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-4 gap-1.5 shadow-md"
          >
            <Save className="w-4 h-4" /> Salvar Holerite
          </Button>
        </div>
      </div>

    </Card>
  );
}
