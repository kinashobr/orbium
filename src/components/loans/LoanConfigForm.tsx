import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Calendar, Percent, DollarSign, Calculator, 
  Save, Info, Clock, TrendingDown, AlertCircle, Sparkles, Check, X
} from "lucide-react";
import { Emprestimo, ContaCorrente } from "@/types/finance";
import { cn, calculateInterestRate } from "@/lib/utils";
import { toast } from "sonner";

interface LoanConfigFormProps {
  emprestimo: Emprestimo;
  contasCorrentes: ContaCorrente[];
  onSave: (data: Partial<Emprestimo>) => void;
  onCancel: () => void;
}

export function LoanConfigForm({ 
  emprestimo, 
  contasCorrentes,
  onSave, 
  onCancel 
}: LoanConfigFormProps) {
  const [formData, setFormData] = useState({
    contaCorrenteId: emprestimo.contaCorrenteId || '',
    valorTotal: emprestimo.valorTotal?.toString() || '',
    parcela: emprestimo.parcela?.toString() || '',
    taxaMensal: emprestimo.taxaMensal?.toString() || '',
    meses: emprestimo.meses?.toString() || '',
    dataInicio: emprestimo.dataInicio || new Date().toISOString().split('T')[0],
    metodoAmortizacao: 'price',
    observacoes: emprestimo.observacoes || '',
  });

  const isPending = emprestimo.status === 'pendente_config';

  const calcularParcelaPrice = () => {
    const valor = Number(formData.valorTotal);
    const taxa = Number(formData.taxaMensal) / 100;
    const n = Number(formData.meses);

    if (valor > 0 && taxa > 0 && n > 0) {
      const parcela = (valor * taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
      setFormData(prev => ({ ...prev, parcela: parcela.toFixed(2) }));
      toast.success("Parcela calculada via tabela Price.");
    }
  };
  
  const calcularTaxa = () => {
    const principal = Number(formData.valorTotal);
    const payment = Number(formData.parcela);
    const periods = Number(formData.meses);

    if (principal > 0 && payment > 0 && periods > 0) {
      const calculatedRate = calculateInterestRate(principal, payment, periods);
      if (calculatedRate !== null) {
        setFormData(prev => ({ ...prev, taxaMensal: calculatedRate.toFixed(2) }));
        toast.success(`Taxa calculada: ${calculatedRate.toFixed(2)}%`);
      } else {
        toast.error("Erro no cálculo. Verifique os valores informados.");
      }
    }
  };

  const preview = {
    valorTotal: Number(formData.valorTotal) || 0,
    parcela: Number(formData.parcela) || 0,
    meses: Number(formData.meses) || 0,
    taxaMensal: Number(formData.taxaMensal) || 0,
    get custoTotal() { return this.parcela * this.meses; },
    get jurosTotal() { return this.custoTotal - this.valorTotal; },
    get cetAnual() { 
      if (this.valorTotal === 0 || this.meses === 0) return 0;
      return ((this.custoTotal / this.valorTotal - 1) / this.meses) * 12 * 100; 
    },
  };

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const canSave = formData.contaCorrenteId && Number(formData.valorTotal) > 0 && Number(formData.parcela) > 0 && Number(formData.meses) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      contaCorrenteId: formData.contaCorrenteId,
      valorTotal: Number(formData.valorTotal),
      parcela: Number(formData.parcela),
      taxaMensal: Number(formData.taxaMensal),
      meses: Number(formData.meses),
      dataInicio: formData.dataInicio,
      observacoes: formData.observacoes,
      status: isPending ? 'ativo' : emprestimo.status,
      parcelasPagas: isPending ? 0 : emprestimo.parcelasPagas
    });
  };

  return (
    <div className="space-y-10">
      {isPending && (
        <div className="p-5 rounded-[2rem] bg-warning/5 border-2 border-dashed border-warning/20 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0 animate-pulse">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-warning-foreground uppercase tracking-widest leading-tight">Aguardando configuração dos termos para ativação do contrato no sistema.</p>
        </div>
      )}

      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Conta de Débito</Label>
            <Select value={formData.contaCorrenteId} onValueChange={(v) => setFormData(prev => ({ ...prev, contaCorrenteId: v }))}>
              <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold">
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {contasCorrentes.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id} className="font-bold">
                    {conta.institution || conta.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor do Principal</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground/30">R$</span>
              <Input type="number" step="0.01" value={formData.valorTotal} onChange={(e) => setFormData(prev => ({ ...prev, valorTotal: e.target.value }))} className="h-12 pl-12 rounded-2xl border-2 font-black text-lg bg-card" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Quantidade Parcelas</Label>
            <Input type="number" value={formData.meses} onChange={(e) => setFormData(prev => ({ ...prev, meses: e.target.value }))} className="h-12 rounded-2xl border-2 font-black text-lg bg-card" />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor da Parcela</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground/30">R$</span>
                <Input type="number" step="0.01" value={formData.parcela} onChange={(e) => setFormData(prev => ({ ...prev, parcela: e.target.value }))} className="h-12 pl-12 rounded-2xl border-2 font-black text-lg bg-card" />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={calcularParcelaPrice} className="h-12 w-12 rounded-2xl border-2 hover:bg-primary/10 text-primary">
                <Calculator className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Taxa Mensal (%)</Label>
            <div className="flex gap-2">
              <Input type="number" step="0.01" value={formData.taxaMensal} onChange={(e) => setFormData(prev => ({ ...prev, taxaMensal: e.target.value }))} className="h-12 rounded-2xl border-2 font-black text-lg bg-card" />
              <Button type="button" variant="outline" size="icon" onClick={calcularTaxa} className="h-12 w-12 rounded-2xl border-2 hover:bg-primary/10 text-primary">
                <Percent className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Data Início / Contrato</Label>
            <Input type="date" value={formData.dataInicio} onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))} className="h-12 rounded-2xl border-2 font-bold bg-card" />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Sistema Amortização</Label>
            <Select value={formData.metodoAmortizacao} onValueChange={(v) => setFormData(prev => ({ ...prev, metodoAmortizacao: v }))}>
              <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="price" className="font-bold">PRICE (Fixas)</SelectItem><SelectItem value="sac" className="font-bold">SAC (Variáveis)</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Notas e Observações</Label>
          <Textarea value={formData.observacoes} onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))} className="min-h-[100px] border-2 rounded-2xl resize-none font-medium" placeholder="Ex: Contrato assinado via app, possui seguro prestamista..." />
        </div>
      </div>

      {preview.valorTotal > 0 && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-8 border border-white/60 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl text-primary"><Info className="w-5 h-5" /></div>
             <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Resumo Matemático</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Custo Efetivo</p><p className="text-base font-black tabular-nums">{formatCurrency(preview.custoTotal)}</p></div>
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Juros Totais</p><p className="text-base font-black text-destructive tabular-nums">{formatCurrency(preview.jurosTotal)}</p></div>
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">CET Anual Est.</p><p className="text-base font-black text-primary tabular-nums">{preview.cetAnual.toFixed(2)}%</p></div>
            <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Impacto Renda</p><p className="text-base font-black text-warning tabular-nums">12.5%</p></div>
          </div>
        </div>
      )}

      <div className="pt-6 flex flex-col sm:flex-row gap-4 border-t border-border/40">
        <Button variant="ghost" onClick={onCancel} className="rounded-full h-14 sm:h-16 px-10 font-bold text-muted-foreground order-2 sm:order-1">CANCELAR</Button>
        <Button onClick={handleSave} disabled={!canSave} className="flex-1 rounded-full h-14 sm:h-16 bg-primary text-primary-foreground font-black text-base sm:text-lg gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 sm:order-2">
          <Check className="w-5 h-5 sm:w-6 sm:h-6" /> {isPending ? "ATIVAR CONTRATO" : "SALVAR ALTERAÇÕES"}
        </Button>
      </div>
    </div>
  );
}