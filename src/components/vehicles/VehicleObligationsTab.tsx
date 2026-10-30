"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  FileText,
  Sparkles,
  Check,
  Building2
} from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo, TransacaoCompleta } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { getEstimatedIpvaAndDueDate } from "./VehicleDetailDialog";

interface VehicleObligationsTabProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleObligationsTab({
  veiculo,
  seguro,
  onUpdateVeiculo
}: VehicleObligationsTabProps) {
  const {
    contasMovimento,
    categoriasV2,
    setCategoriasV2,
    transacoesV2,
    addTransacaoV2,
    addSeguroVeiculo,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid
  } = useFinance();

  // Acordeões abertos/fechados (Zero Modais)
  const [openSection, setOpenSection] = useState<'ipva' | 'licenciamento' | 'seguro' | null>(null);

  // Estados para Pagamento de IPVA
  const [ipvaAccountId, setIpvaAccountId] = useState("");
  const [ipvaCategoryId, setIpvaCategoryId] = useState("");
  const [ipvaDate, setIpvaDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [ipvaAmount, setIpvaAmount] = useState(veiculo.ipvaValor || 0);

  // Estados para Pagamento de Licenciamento
  const [licAccountId, setLicAccountId] = useState("");
  const [licCategoryId, setLicCategoryId] = useState("");
  const [licDate, setLicDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [licAmount, setLicAmount] = useState(veiculo.licenciamentoValor || 160);

  // Estados para Cadastro de Novo Seguro
  const [insApolice, setInsApolice] = useState("");
  const [insSeguradora, setInsSeguradora] = useState("");
  const [insInicio, setInsInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [insFim, setInsFim] = useState(format(new Date(Date.now() + 365*24*60*60*1000), "yyyy-MM-dd"));
  const [insValor, setInsValor] = useState(veiculo.valorSeguro || 0);
  const [insParcelas, setInsParcelas] = useState(1);

  // Estimativas automáticas FIPE para IPVA / Licenciamento se não preenchidos
  const estimated = useMemo(() => {
    return getEstimatedIpvaAndDueDate(
      veiculo.placa || "", 
      veiculo.tipo || 'carro', 
      veiculo.valorFipe || 0
    );
  }, [veiculo.placa, veiculo.tipo, veiculo.valorFipe]);

  // Categoria de Impostos e Taxas
  const impostosCategory = useMemo(() => {
    return categoriasV2.find(c => {
      const name = c.label.toLowerCase();
      return name.includes('imposto') || name.includes('taxa') || name.includes('ipva') || name.includes('licenciamento');
    });
  }, [categoriasV2]);

  // Sincronizar dados padrão quando o veículo muda ou abas abrem
  useEffect(() => {
    if (contasMovimento.length > 0) {
      const defaultAcc = contasMovimento.find(c => !c.hidden && c.accountType === 'corrente')?.id || contasMovimento[0].id;
      if (!ipvaAccountId) setIpvaAccountId(defaultAcc);
      if (!licAccountId) setLicAccountId(defaultAcc);
    }
    if (impostosCategory) {
      if (!ipvaCategoryId) setIpvaCategoryId(impostosCategory.id);
      if (!licCategoryId) setLicCategoryId(impostosCategory.id);
    } else if (categoriasV2.length > 0) {
      const firstExpenseCat = categoriasV2.find(c => c.nature !== 'receita')?.id || categoriasV2[0].id;
      if (!ipvaCategoryId) setIpvaCategoryId(firstExpenseCat);
      if (!licCategoryId) setLicCategoryId(firstExpenseCat);
    }
  }, [contasMovimento, categoriasV2, impostosCategory, ipvaAccountId, licAccountId, ipvaCategoryId, licCategoryId]);

  const handleCreateImpostosCategory = () => {
    const newCat = {
      id: `cat_impostos_${Date.now()}`,
      label: 'Impostos e Taxas',
      icon: '🧾',
      nature: 'despesa_variavel' as const,
      type: 'expense' as const
    };
    setCategoriasV2(prev => [...prev, newCat]);
    setIpvaCategoryId(newCat.id);
    setLicCategoryId(newCat.id);
    toast.success("Categoria 'Impostos e Taxas' criada e selecionada com sucesso!");
  };

  // Status de IPVA
  const ipvaVencimento = veiculo.ipvaVencimento || estimated.vencimentoIpva;
  const ipvaValorFinal = veiculo.ipvaValor || estimated.valorIpva;
  const isIpvaVencido = !veiculo.ipvaPago && ipvaVencimento && parseDateLocal(ipvaVencimento).getTime() < new Date().getTime();

  // Status de Licenciamento
  const licVencimento = veiculo.licenciamentoVencimento || estimated.vencimentoLicenciamento;
  const licValorFinal = veiculo.licenciamentoValor || estimated.valorLicenciamento;
  const isLicVencido = !veiculo.licenciamentoPago && licVencimento && parseDateLocal(licVencimento).getTime() < new Date().getTime();

  // Status de Seguro
  const isSeguroExpirado = seguro && parseDateLocal(seguro.vigenciaFim).getTime() < new Date().getTime();

  // Handler para Pagamento de IPVA
  const handlePayIpva = () => {
    if (!ipvaAccountId) {
      toast.error("Selecione a conta para pagamento do IPVA.");
      return;
    }

    const newTx: Omit<TransacaoCompleta, "id"> = {
      date: ipvaDate,
      accountId: ipvaAccountId,
      flow: "out",
      operationType: "despesa",
      domain: "asset",
      amount: Number(ipvaAmount) || ipvaValorFinal,
      categoryId: ipvaCategoryId || null,
      description: `🚦 Pgto IPVA: ${veiculo.modelo} (${veiculo.placa || 'Sem placa'})`,
      links: {
        investmentId: null,
        loanId: null,
        transferGroupId: null,
        parcelaId: null,
        vehicleTransactionId: null,
      },
      conciliated: true,
      meta: {
        assetType: "veiculo",
        assetId: veiculo.id,
        obligationType: "ipva",
      }
    };

    addTransacaoV2(newTx);

    onUpdateVeiculo(veiculo.id, {
      ipvaPago: true,
      ipvaValor: Number(ipvaAmount) || ipvaValorFinal,
      ipvaVencimento: ipvaDate,
      ipvaContaId: ipvaAccountId,
      ipvaCategoriaId: ipvaCategoryId
    });

    toast.success("Pagamento de IPVA registrado e reconciliado no fluxo de caixa!");
    setOpenSection(null);
  };

  // Handler para Pagamento de Licenciamento
  const handlePayLicenciamento = () => {
    if (!licAccountId) {
      toast.error("Selecione a conta para pagamento do Licenciamento.");
      return;
    }

    const newTx: Omit<TransacaoCompleta, "id"> = {
      date: licDate,
      accountId: licAccountId,
      flow: "out",
      operationType: "despesa",
      domain: "asset",
      amount: Number(licAmount) || licValorFinal,
      categoryId: licCategoryId || null,
      description: `📄 Pgto Licenciamento: ${veiculo.modelo} (${veiculo.placa || 'Sem placa'})`,
      links: {
        investmentId: null,
        loanId: null,
        transferGroupId: null,
        parcelaId: null,
        vehicleTransactionId: null,
      },
      conciliated: true,
      meta: {
        assetType: "veiculo",
        assetId: veiculo.id,
        obligationType: "licenciamento",
      }
    };

    addTransacaoV2(newTx);

    onUpdateVeiculo(veiculo.id, {
      licenciamentoPago: true,
      licenciamentoValor: Number(licAmount) || licValorFinal,
      licenciamentoVencimento: licDate,
      licenciamentoContaId: licAccountId,
      licenciamentoCategoriaId: licCategoryId
    });

    toast.success("Pagamento de Licenciamento registrado no fluxo de caixa!");
    setOpenSection(null);
  };

  // Handler para Cadastro de Seguro
  const handleSaveInsurance = () => {
    if (!insSeguradora.trim()) {
      toast.error("Informe a seguradora");
      return;
    }
    if (!insInicio || !insFim) {
      toast.error("Informe as datas de vigência");
      return;
    }

    const totalSeg = Number(insValor) || 0;
    const nParc = Number(insParcelas) || 1;
    const valorParcela = totalSeg / nParc;

    const parcelas = [];
    const baseDate = parseDateLocal(insInicio);

    for (let i = 1; i <= nParc; i++) {
      const venc = new Date(baseDate);
      venc.setMonth(venc.getMonth() + (i - 1));
      parcelas.push({
        numero: i,
        vencimento: format(venc, "yyyy-MM-dd"),
        valor: parseFloat(valorParcela.toFixed(2)),
        paga: false,
      });
    }

    const newSeguro = {
      veiculoId: veiculo.id,
      numeroApolice: insApolice,
      seguradora: insSeguradora,
      vigenciaInicio: insInicio,
      vigenciaFim: insFim,
      valorTotal: totalSeg,
      numeroParcelas: nParc,
      meiaParcela: false,
      parcelas,
    };

    addSeguroVeiculo(newSeguro);

    onUpdateVeiculo(veiculo.id, {
      valorSeguro: totalSeg,
      vencimentoSeguro: insFim,
      parcelaSeguro: parseFloat(valorParcela.toFixed(2)),
    });

    toast.success("Apolice de seguro cadastrada com sucesso!");
    setOpenSection(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Calendário de Vencimentos em Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD IPVA */}
        <div className={cn(
          "rounded-[2rem] p-6 border transition-all relative overflow-hidden flex flex-col justify-between",
          veiculo.ipvaPago ? "bg-success/[0.03] border-success/30" :
          isIpvaVencido ? "bg-destructive/[0.03] border-destructive/30" :
          "bg-card border-border/60 hover:border-primary/40 shadow-sm"
        )}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                  veiculo.ipvaPago ? "bg-success/15 text-success" :
                  isIpvaVencido ? "bg-destructive/15 text-destructive" :
                  "bg-warning/15 text-warning"
                )}>
                  {veiculo.ipvaPago ? <CheckCircle2 className="w-5 h-5" /> :
                   isIpvaVencido ? <AlertTriangle className="w-5 h-5" /> :
                   <Calendar className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base text-foreground">IPVA {new Date().getFullYear()}</h3>
                  <p className="text-xs text-muted-foreground font-medium">Imposto Sobre Veículos</p>
                </div>
              </div>

              <Badge className={cn(
                "border-none font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider",
                veiculo.ipvaPago ? "bg-success/15 text-success" :
                isIpvaVencido ? "bg-destructive/15 text-destructive" :
                "bg-warning/15 text-warning"
              )}>
                {veiculo.ipvaPago ? "Quitado" : isIpvaVencido ? "Em Atraso" : "Pendente"}
              </Badge>
            </div>

            <div className="space-y-3 my-6">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Valor Estimado/Real:</span>
                <span className="font-black text-xl text-foreground tabular-nums">
                  {formatCurrency(ipvaValorFinal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase tracking-widest">Vencimento:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {ipvaVencimento ? format(parseDateLocal(ipvaVencimento), "dd/MM/yyyy") : "Não definido"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40">
            {veiculo.ipvaPago ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full rounded-xl text-xs font-bold text-success border-success/30 bg-success/5 hover:bg-success/10"
                onClick={() => onUpdateVeiculo(veiculo.id, { ipvaPago: false })}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" /> Reabrir e Marcar como Pendente
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="w-full rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                onClick={() => setOpenSection(openSection === 'ipva' ? null : 'ipva')}
              >
                {openSection === 'ipva' ? "Fechar Form" : "Registrar Pagamento IPVA"}
                {openSection === 'ipva' ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* CARD LICENCIAMENTO */}
        <div className={cn(
          "rounded-[2rem] p-6 border transition-all relative overflow-hidden flex flex-col justify-between",
          veiculo.licenciamentoPago ? "bg-success/[0.03] border-success/30" :
          isLicVencido ? "bg-destructive/[0.03] border-destructive/30" :
          "bg-card border-border/60 hover:border-primary/40 shadow-sm"
        )}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                  veiculo.licenciamentoPago ? "bg-success/15 text-success" :
                  isLicVencido ? "bg-destructive/15 text-destructive" :
                  "bg-warning/15 text-warning"
                )}>
                  {veiculo.licenciamentoPago ? <CheckCircle2 className="w-5 h-5" /> :
                   isLicVencido ? <AlertTriangle className="w-5 h-5" /> :
                   <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base text-foreground">Licenciamento Anual</h3>
                  <p className="text-xs text-muted-foreground font-medium">Taxa DETRAN / CRLV</p>
                </div>
              </div>

              <Badge className={cn(
                "border-none font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider",
                veiculo.licenciamentoPago ? "bg-success/15 text-success" :
                isLicVencido ? "bg-destructive/15 text-destructive" :
                "bg-warning/15 text-warning"
              )}>
                {veiculo.licenciamentoPago ? "Quitado" : isLicVencido ? "Em Atraso" : "Pendente"}
              </Badge>
            </div>

            <div className="space-y-3 my-6">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Taxa de Licenciamento:</span>
                <span className="font-black text-xl text-foreground tabular-nums">
                  {formatCurrency(licValorFinal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase tracking-widest">Vencimento Exigido:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {licVencimento ? format(parseDateLocal(licVencimento), "dd/MM/yyyy") : "Não definido"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40">
            {veiculo.licenciamentoPago ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full rounded-xl text-xs font-bold text-success border-success/30 bg-success/5 hover:bg-success/10"
                onClick={() => onUpdateVeiculo(veiculo.id, { licenciamentoPago: false })}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" /> Reabrir e Marcar como Pendente
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="w-full rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                onClick={() => setOpenSection(openSection === 'licenciamento' ? null : 'licenciamento')}
              >
                {openSection === 'licenciamento' ? "Fechar Form" : "Registrar Licenciamento"}
                {openSection === 'licenciamento' ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* CARD SEGURO */}
        <div className={cn(
          "rounded-[2rem] p-6 border transition-all relative overflow-hidden flex flex-col justify-between",
          seguro && !isSeguroExpirado ? "bg-success/[0.03] border-success/30" :
          isSeguroExpirado ? "bg-destructive/[0.03] border-destructive/30" :
          "bg-card border-border/60 hover:border-primary/40 shadow-sm"
        )}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                  seguro && !isSeguroExpirado ? "bg-success/15 text-success" :
                  isSeguroExpirado ? "bg-destructive/15 text-destructive" :
                  "bg-muted text-muted-foreground"
                )}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-foreground">Seguro Auto / Moto</h3>
                  <p className="text-xs text-muted-foreground font-medium">{seguro?.seguradora || "Proteção veicular"}</p>
                </div>
              </div>

              <Badge className={cn(
                "border-none font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider",
                seguro && !isSeguroExpirado ? "bg-success/15 text-success" :
                isSeguroExpirado ? "bg-destructive/15 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>
                {seguro && !isSeguroExpirado ? "Protegido" : isSeguroExpirado ? "Expirado" : "Sem Seguro"}
              </Badge>
            </div>

            <div className="space-y-3 my-6">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Valor Apólice Anual:</span>
                <span className="font-black text-xl text-foreground tabular-nums">
                  {seguro ? formatCurrency(seguro.valorTotal) : "R$ 0,00"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase tracking-widest">Vigência Até:</span>
                <span className="font-bold text-foreground tabular-nums">
                  {seguro?.vigenciaFim ? format(parseDateLocal(seguro.vigenciaFim), "dd/MM/yyyy") : "Sem apólice"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40">
            <Button 
              size="sm" 
              variant={seguro ? "outline" : "default"}
              className="w-full rounded-xl text-xs font-black uppercase tracking-wider shadow-sm"
              onClick={() => setOpenSection(openSection === 'seguro' ? null : 'seguro')}
            >
              {seguro ? (openSection === 'seguro' ? "Fechar Formulario" : "Nova Apólice / Renovar") : "Cadastrar Apólice"}
              {openSection === 'seguro' ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </div>

      </div>

      {/* FORMULÁRIO ACCORDION INLINE (ZERO MODAIS) */}
      
      {/* 1. SEÇÃO SANFONA IPVA */}
      {openSection === 'ipva' && (
        <div className="bg-card border border-primary/30 rounded-[2.5rem] p-6 sm:p-8 shadow-soft animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-foreground">Registrar Pagamento de IPVA</h3>
              <p className="text-xs text-muted-foreground">O valor será debitado da conta escolhida e reconciliado no extrato financeiro.</p>
            </div>
          </div>

          {!impostosCategory && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Nenhuma categoria para impostos fiscais encontrada. Deseja criar "Impostos e Taxas"?</span>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl font-bold bg-background text-foreground" onClick={handleCreateImpostosCategory}>
                Criar Categoria Agora
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor Pago (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={ipvaAmount} 
                onChange={e => setIpvaAmount(Number(e.target.value))} 
                className="h-11 rounded-2xl font-bold tabular-nums" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data do Pagamento</Label>
              <Input 
                type="date" 
                value={ipvaDate} 
                onChange={e => setIpvaDate(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conta para Débito</Label>
              <Select value={ipvaAccountId} onValueChange={setIpvaAccountId}>
                <SelectTrigger className="h-11 rounded-2xl font-bold">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasMovimento.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria Financeira</Label>
              <Select value={ipvaCategoryId} onValueChange={setIpvaCategoryId}>
                <SelectTrigger className="h-11 rounded-2xl font-bold">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasV2.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/40">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setOpenSection(null)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl font-black uppercase tracking-wider px-8 bg-success hover:bg-success/90 text-white" onClick={handlePayIpva}>
              Confirmar Pagamento do IPVA
            </Button>
          </div>
        </div>
      )}

      {/* 2. SEÇÃO SANFONA LICENCIAMENTO */}
      {openSection === 'licenciamento' && (
        <div className="bg-card border border-primary/30 rounded-[2.5rem] p-6 sm:p-8 shadow-soft animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-foreground">Registrar Licenciamento Anual DETRAN</h3>
              <p className="text-xs text-muted-foreground">Confirme a quitação da taxa do CRLV para atualizar a documentação do veículo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taxa Paga (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={licAmount} 
                onChange={e => setLicAmount(Number(e.target.value))} 
                className="h-11 rounded-2xl font-bold tabular-nums" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data de Pagamento</Label>
              <Input 
                type="date" 
                value={licDate} 
                onChange={e => setLicDate(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conta para Débito</Label>
              <Select value={licAccountId} onValueChange={setLicAccountId}>
                <SelectTrigger className="h-11 rounded-2xl font-bold">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasMovimento.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria Financeira</Label>
              <Select value={licCategoryId} onValueChange={setLicCategoryId}>
                <SelectTrigger className="h-11 rounded-2xl font-bold">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasV2.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/40">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setOpenSection(null)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl font-black uppercase tracking-wider px-8 bg-success hover:bg-success/90 text-white" onClick={handlePayLicenciamento}>
              Confirmar Quitação Licenciamento
            </Button>
          </div>
        </div>
      )}

      {/* 3. SEÇÃO SANFONA SEGURO */}
      {openSection === 'seguro' && (
        <div className="bg-card border border-primary/30 rounded-[2.5rem] p-6 sm:p-8 shadow-soft animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-foreground">Cadastrar Nova Apólice de Seguro</h3>
              <p className="text-xs text-muted-foreground">As parcelas serão geradas automaticamente na linha do tempo de obrigações.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seguradora / Corretora</Label>
              <Input 
                placeholder="Ex: Porto Seguro, Azul, Tokiomarine" 
                value={insSeguradora} 
                onChange={e => setInsSeguradora(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Número da Apólice</Label>
              <Input 
                placeholder="Ex: 01.031.942/0" 
                value={insApolice} 
                onChange={e => setInsApolice(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor Total do Prêmio (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={insValor} 
                onChange={e => setInsValor(Number(e.target.value))} 
                className="h-11 rounded-2xl font-bold tabular-nums" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vigência Início</Label>
              <Input 
                type="date" 
                value={insInicio} 
                onChange={e => setInsInicio(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vigência Fim</Label>
              <Input 
                type="date" 
                value={insFim} 
                onChange={e => setInsFim(e.target.value)} 
                className="h-11 rounded-2xl font-bold" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantidade de Parcelas</Label>
              <Select value={String(insParcelas)} onValueChange={v => setInsParcelas(Number(v))}>
                <SelectTrigger className="h-11 rounded-2xl font-bold">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}x {insValor > 0 ? `(R$ ${(insValor/n).toFixed(2)})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/40">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setOpenSection(null)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl font-black uppercase tracking-wider px-8 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSaveInsurance}>
              Salvar Apólice de Seguro
            </Button>
          </div>
        </div>
      )}

      {/* DETALHAMENTO DAS PARCELAS DE SEGURO ATIVO */}
      {seguro && seguro.parcelas && seguro.parcelas.length > 0 && (
        <div className="bg-card border border-border/60 rounded-[2.5rem] p-8 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-foreground">Parcelamento do Seguro ({seguro.seguradora})</h3>
                <p className="text-xs text-muted-foreground">Clique nas parcelas para alternar o status de quitação.</p>
              </div>
            </div>

            <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-1 rounded-xl">
              Apólice: {seguro.numeroApolice || "S/N"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {seguro.parcelas.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  if (p.paga) {
                    unmarkSeguroParcelPaid(seguro.veiculoId, p.numero);
                    toast.info(`Parcela ${p.numero} desmarcada.`);
                  } else {
                    markSeguroParcelPaid(seguro.veiculoId, p.numero);
                    toast.success(`Parcela ${p.numero} marcada como PAGA!`);
                  }
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                  p.paga 
                    ? "bg-success/10 border-success/30 text-success hover:bg-success/15" 
                    : "bg-muted/30 border-border/60 hover:border-primary/40 text-foreground"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs uppercase tracking-wider">Parcela {p.numero}</span>
                    {p.paga && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                    Venc: {format(parseDateLocal(p.vencimento), "dd/MM/yyyy")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-sm tabular-nums">{formatCurrency(p.valor)}</p>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-1",
                    p.paga ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                  )}>
                    {p.paga ? "PAGA" : "PENDENTE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
