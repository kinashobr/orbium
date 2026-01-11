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
  Save, Info, Clock, TrendingDown, AlertCircle
} from "lucide-react";
import { Emprestimo } from "@/types/finance";
import { ContaCorrente } from "@/types/finance";
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

  // Auto-calculate parcela when Price method
  const calcularParcelaPrice = () => {
    const valor = Number(formData.valorTotal);
    const taxa = Number(formData.taxaMensal) / 100;
    const n = Number(formData.meses);

    if (valor > 0 && taxa > 0 && n > 0) {
      // Fórmula PRICE: PMT = P * [ i / (1 - (1 + i)^-n) ]
      const parcela = (valor * taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
      setFormData(prev => ({ ...prev, parcela: parcela.toFixed(2) }));
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
        toast.error("Não foi possível calcular a taxa. Verifique se a parcela é suficiente para cobrir o principal.");
      }
    } else {
      toast.warning("Preencha Valor Total, Parcela e Qtd. Parcelas para calcular a taxa.");
    }
  };

  // Calculated values preview
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

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const canSave = 
    formData.contaCorrenteId &&
    Number(formData.valorTotal) > 0 &&
    Number(formData.parcela) > 0 &&
    Number(formData.meses) > 0 &&
    Number(formData.taxaMensal) >= 0;

  const handleSave = () => {
    if (!canSave) return;

    const payload: Partial<Emprestimo> = {
      contaCorrenteId: formData.contaCorrenteId,
      valorTotal: Number(formData.valorTotal),
      parcela: Number(formData.parcela),
      taxaMensal: Number(formData.taxaMensal),
      meses: Number(formData.meses),
      dataInicio: formData.dataInicio,
      observacoes: formData.observacoes,
    };

    if (isPending) {
      // Se for a primeira configuração, define status e parcelas pagas
      payload.status = 'ativo';
      payload.parcelasPagas = 0;
    }
    
    onSave(payload);
    
    // Fecha o modal após salvar
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {isPending && (
        <Alert className="border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Este empréstimo foi liberado e aguarda configuração dos termos do contrato.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 pb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{emprestimo.contrato}</h3>
          <p className="text-sm text-muted-foreground">
            Valor liberado: {formatCurrency(emprestimo.valorTotal)}
          </p>
        </div>
        <Badge variant={isPending ? "outline" : "default"} 
          className={cn(isPending && "border-warning text-warning")}>
          {isPending ? "Pendente" : "Ativo"}
        </Badge>
      </div>

      <Separator />

      {/* Form Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Conta Corrente */}
        <div className="col-span-2">
          <Label className="text-sm font-medium">Conta para Débito das Parcelas *</Label>
          <Select
            value={formData.contaCorrenteId}
            onValueChange={(v) => setFormData(prev => ({ ...prev, contaCorrenteId: v }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione a conta..." />
            </SelectTrigger>
            <SelectContent>
              {contasCorrentes.map((conta) => (
                <SelectItem key={conta.id} value={conta.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{conta.institution || conta.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Conta onde as parcelas serão debitadas mensalmente
          </p>
        </div>

        {/* Valor Total */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            Valor Total (R$) *
          </Label>
          <Input
            type="number"
            step="0.01"
            value={formData.valorTotal}
            onChange={(e) => setFormData(prev => ({ ...prev, valorTotal: e.target.value }))}
            placeholder="50000.00"
            className="mt-1.5"
          />
        </div>

        {/* Quantidade de Parcelas */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Quantidade de Parcelas *
          </Label>
          <Input
            type="number"
            value={formData.meses}
            onChange={(e) => setFormData(prev => ({ ...prev, meses: e.target.value }))}
            placeholder="48"
            className="mt-1.5"
          />
        </div>

        {/* Taxa Mensal */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            Taxa Mensal (%) *
          </Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              type="number"
              step="0.01"
              value={formData.taxaMensal}
              onChange={(e) => setFormData(prev => ({ ...prev, taxaMensal: e.target.value }))}
              placeholder="1.89"
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={calcularTaxa}
              title="Calcular taxa (Price)"
              className="shrink-0"
            >
              <Calculator className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Valor da Parcela */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Valor da Parcela (R$) *
          </Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              type="number"
              step="0.01"
              value={formData.parcela}
              onChange={(e) => setFormData(prev => ({ ...prev, parcela: e.target.value }))}
              placeholder="1250.00"
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={calcularParcelaPrice}
              title="Calcular parcela (Price)"
              className="shrink-0"
            >
              <Calculator className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Data de Início */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Data de Início
          </Label>
          <Input
            type="date"
            value={formData.dataInicio}
            onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
            className="mt-1.5"
          />
        </div>

        {/* Método de Amortização */}
        <div>
          <Label className="text-sm font-medium">Método de Amortização</Label>
          <Select
            value={formData.metodoAmortizacao}
            onValueChange={(v) => setFormData(prev => ({ ...prev, metodoAmortizacao: v }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Price (Parcelas Fixas)</SelectItem>
              <SelectItem value="sac">SAC (Amortização Constante)</SelectItem>
              <SelectItem value="americano">Americano</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Observações */}
        <div className="col-span-2">
          <Label className="text-sm font-medium">Observações</Label>
          <Textarea
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Notas adicionais sobre o empréstimo..."
            className="mt-1.5 h-20 resize-none"
          />
        </div>
      </div>

      {/* Preview dos Cálculos */}
      {preview.valorTotal > 0 && preview.parcela > 0 && preview.meses > 0 && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Resumo do Contrato
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Custo Total</p>
              <p className="font-semibold">{formatCurrency(preview.custoTotal)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Juros Total</p>
              <p className="font-semibold text-warning">{formatCurrency(preview.jurosTotal)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">CET Anual</p>
              <p className={cn(
                "font-semibold",
                preview.cetAnual <= 30 ? "text-success" :
                preview.cetAnual <= 50 ? "text-warning" : "text-destructive"
              )}>
                {preview.cetAnual.toFixed(1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Data Final</p>
              <p className="font-semibold">
                {new Date(new Date(formData.dataInicio).setMonth(
                  new Date(formData.dataInicio).getMonth() + preview.meses
                )).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Progress bar preview */}
          <div className="pt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>0% (início)</span>
              <span>100% (quitado)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-0 bg-gradient-to-r from-primary to-success" />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!canSave} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {isPending ? "Confirmar Configuração" : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}