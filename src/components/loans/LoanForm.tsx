import { useState } from "react";
import { Plus, Building2, Calculator, Check } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ContaCorrente } from "@/types/finance";
import { calculateInterestRate } from "@/lib/utils";

interface LoanFormData {
  contrato: string;
  contaCorrenteId: string;
  valorTotal: string;
  parcela: string;
  taxaMensal: string;
  meses: string;
  dataInicio: string;
  metodoAmortizacao: string;
  observacoes: string;
}

interface LoanFormProps {
  onSubmit: (data: {
    contrato: string;
    parcela: number;
    meses: number;
    taxaMensal: number;
    valorTotal: number;
    contaCorrenteId?: string;
    dataInicio: string;
  }) => void;
  contasCorrentes?: ContaCorrente[];
  className?: string;
}

export function LoanForm({ onSubmit, contasCorrentes = [], className }: LoanFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>({
    contrato: "",
    contaCorrenteId: "",
    valorTotal: "0,00",
    parcela: "0,00",
    taxaMensal: "",
    meses: "",
    dataInicio: new Date().toISOString().split('T')[0],
    metodoAmortizacao: "price",
    observacoes: "",
  });

  const handleAmountChange = (key: 'valorTotal' | 'parcela', value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setFormData(prev => ({ ...prev, [key]: "0,00" }));
      return;
    }
    const val = parseInt(digits) / 100;
    setFormData(prev => ({ ...prev, [key]: val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
  };

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorTotal = parseBrlValue(formData.valorTotal);
    const parcela = parseBrlValue(formData.parcela);

    if (!formData.contrato || parcela <= 0 || !formData.meses || !formData.taxaMensal || valorTotal <= 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios com valores válidos",
        variant: "destructive",
      });
      return;
    }

    if (!formData.contaCorrenteId) {
      toast({
        title: "Conta obrigatória",
        description: "Selecione a conta corrente vinculada ao empréstimo",
        variant: "destructive",
      });
      return;
    }

    const contaSelecionada = contasCorrentes.find(c => c.id === formData.contaCorrenteId);
    const contratoCompleto = contaSelecionada 
      ? `${contaSelecionada.institution || contaSelecionada.name} - ${formData.contrato}`
      : formData.contrato;

    onSubmit({
      contrato: contratoCompleto,
      parcela: parcela,
      meses: Number(formData.meses),
      taxaMensal: Number(formData.taxaMensal),
      valorTotal: valorTotal,
      contaCorrenteId: formData.contaCorrenteId,
      dataInicio: formData.dataInicio || new Date().toISOString().split('T')[0],
    });

    setFormData({
      contrato: "",
      contaCorrenteId: "",
      valorTotal: "0,00",
      parcela: "0,00",
      taxaMensal: "",
      meses: "",
      dataInicio: new Date().toISOString().split('T')[0],
      metodoAmortizacao: "price",
      observacoes: "",
    });

    setOpen(false);

    toast({
      title: "Empréstimo adicionado",
      description: "O empréstimo foi cadastrado com sucesso",
    });
  };

  const calcularParcela = () => {
    const valor = parseBrlValue(formData.valorTotal);
    const taxa = Number(formData.taxaMensal) / 100;
    const n = Number(formData.meses);

    if (valor > 0 && taxa > 0 && n > 0) {
      const parcela = (valor * taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
      setFormData(prev => ({ ...prev, parcela: parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }));
    }
  };
  
  const calcularTaxa = () => {
    const principal = parseBrlValue(formData.valorTotal);
    const payment = parseBrlValue(formData.parcela);
    const periods = Number(formData.meses);

    if (principal > 0 && payment > 0 && periods > 0) {
      const calculatedRate = calculateInterestRate(principal, payment, periods);
      
      if (calculatedRate !== null) {
        setFormData(prev => ({ ...prev, taxaMensal: calculatedRate.toFixed(2) }));
        toast({
          title: "Taxa calculada",
          description: `Taxa mensal: ${calculatedRate.toFixed(2)}%`,
        });
      } else {
        toast({
          title: "Erro no cálculo",
          description: "Não foi possível calcular a taxa. Verifique os valores.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn("bg-neon-gradient hover:opacity-90", className)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Empréstimo
        </Button>
      </DialogTrigger>
      <DialogContent 
        hideCloseButton
        className="max-w-[min(95vw,600px)] p-0 overflow-hidden flex flex-col rounded-[2.5rem] bg-card border-border"
      >
        <DialogHeader className="px-8 pt-10 pb-6 border-b shrink-0 bg-muted/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight">Novo Empréstimo</span>
          </DialogTitle>
        </DialogHeader>

        <form id="loan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Banco / Instituição *</Label>
              <Select
                value={formData.contaCorrenteId}
                onValueChange={(v) => setFormData(prev => ({ ...prev, contaCorrenteId: v }))}
              >
                <SelectTrigger className="h-12 border-2 rounded-xl bg-card font-bold">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasCorrentes.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id} className="font-medium">
                      {conta.institution || conta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Nome do Contrato *</Label>
              <Input
                value={formData.contrato}
                onChange={(e) => setFormData(prev => ({ ...prev, contrato: e.target.value }))}
                placeholder="Ex: Pessoal, Veículo"
                className="h-12 border-2 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor Total (R$) *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.valorTotal}
                onChange={(e) => handleAmountChange('valorTotal', e.target.value)}
                placeholder="0,00"
                className="h-12 border-2 rounded-xl font-black text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Valor da Parcela (R$) *</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formData.parcela}
                  onChange={(e) => handleAmountChange('parcela', e.target.value)}
                  placeholder="0,00"
                  className="h-12 border-2 rounded-xl font-black text-lg"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={calcularParcela}
                  className="shrink-0 h-12 w-12 rounded-xl border-2 hover:bg-primary/10 text-primary"
                >
                  <Calculator className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Taxa Mensal (%) *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.taxaMensal}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxaMensal: e.target.value }))}
                  placeholder="0.00"
                  className="h-12 border-2 rounded-xl font-bold"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={calcularTaxa}
                  className="shrink-0 h-12 w-12 rounded-xl border-2 hover:bg-primary/10 text-primary"
                >
                  <Calculator className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Qtd. Parcelas *</Label>
              <Input
                type="number"
                value={formData.meses}
                onChange={(e) => setFormData(prev => ({ ...prev, meses: e.target.value }))}
                placeholder="48"
                className="h-12 border-2 rounded-xl font-black text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Data Início</Label>
              <Input
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="h-12 border-2 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Notas Adicionais</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="..."
              className="h-24 border-2 rounded-xl resize-none font-medium"
            />
          </div>
        </form>

        <DialogFooter className="p-6 bg-muted/10 border-t flex flex-col sm:flex-row gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="rounded-full h-14 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground order-2 sm:order-1"
          >
            FECHAR
          </Button>
          <Button 
            form="loan-form"
            type="submit" 
            className="flex-1 rounded-full h-14 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 order-1 sm:order-2"
          >
            <Check className="w-5 h-5" /> CADASTRAR CONTRATO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}