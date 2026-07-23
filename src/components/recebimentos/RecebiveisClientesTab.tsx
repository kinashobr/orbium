import React, { useState, useMemo, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { 
  formatCurrency, 
  RecebivelParcelado, 
  ParcelaRecebivel, 
  RecebivelNatureza, 
  RecebivelRetencao, 
  ParcelaStatus, 
  CltContract, 
  generateCltContractId 
} from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Plus, Trash2, CheckCircle2, ChevronRight, Landmark, Calendar,
  DollarSign, FileText, Scale, Receipt, Sparkles, X, RotateCcw,
  Link2, AlertTriangle, Edit, Layers, TrendingUp,
  Eye, EyeOff, Briefcase, ReceiptText, Umbrella, FileX, CalendarDays, Clock, Check
} from "lucide-react";
import { toast } from "sonner";
import { addMonths, format, parseISO, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CltVacationTab } from "@/components/clt/CltVacationTab";
import { CltResignationTab } from "@/components/clt/CltResignationTab";
import { CltHoleriteEditor } from "@/components/clt/CltHoleriteEditor";

const CATEGORIA_LABELS: Record<RecebivelNatureza, string> = {
  CONSULTORIA: "Consultoria de Projetos",
  PERICIA_JUDICIAL: "Serviços Especiais",
  IRPF: "Declarações e Taxas",
  ASSESSORIA_CONTABIL: "Assessoria Contratual",
  SERVICO_EVENTUAL: "Serviço Eventual",
  OUTRO: "Outros Serviços / Vendas"
};

const DEDUCAO_LABELS: Record<RecebivelRetencao, string> = {
  SEM_RETENCAO: "Sem Deduções / Impostos",
  RETENCAO_PJ_11_INSS: "Dedução Estimada (Previdenciário)",
  RETENCAO_IRRF_RPA: "Retenção Estimada de Impostos",
  AMBAS: "Deduções Completas"
};

// Gráfico Radial Personalizado para Pendentes e Recebidos
function ContractRadialChart({
  totalRecebido, 
  totalPendente, 
  totalContratado, 
}: { 
  totalRecebido: number; 
  totalPendente: number; 
  totalContratado: number; 
}) {
  const percentReceived = totalContratado > 0 ? Math.min(100, Math.max(0, (totalRecebido / totalContratado) * 100)) : 0;
  const percentPending = totalContratado > 0 ? Math.min(100 - percentReceived, Math.max(0, (totalPendente / totalContratado) * 100)) : 0;
  
  const size = 76;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffsetReceived = circumference - (percentReceived / 100) * circumference;
  const strokeDashoffsetPending = circumference - ((percentReceived + percentPending) / 100) * circumference;

  return (
    <div className="bg-background border border-border/40 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm h-full min-h-[76px]">
      <div className="flex flex-col justify-center space-y-1">
        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">
          Execução
        </span>
        <div className="flex items-center gap-2.5 pt-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Recebido
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> Pendente
          </div>
        </div>
      </div>

      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          {/* Track background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-muted/15"
          />
          {/* Pending portion arc (amber) */}
          {percentPending > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffsetPending}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          )}
          {/* Received portion arc (emerald) */}
          {percentReceived > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffsetReceived}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-black text-foreground font-mono leading-none">
            {Math.round(percentReceived)}%
          </span>
          <span className="text-[7px] font-black uppercase text-muted-foreground leading-none mt-0.5 tracking-wider">
            Quitado
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecebiveisClientesTab() {
  const {
    recebiveisParcelados = [], addRecebivelParcelado, updateRecebivelParcelado, deleteRecebivelParcelado,
    parcelasRecebiveis = [], setParcelasRecebiveis, confirmarPagamentoParcela,
    contasMovimento = [], transacoesV2 = [], setTransacoesV2,
    ignoredTxIds = [], setIgnoredTxIds,
    cltContracts = [], addCltContract, updateCltContract, deleteCltContract, categoriasV2 = [], setCategoriasV2,
    cltHolerites = {},
  } = useFinance();

  // Accordion expanded contract ID
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [expandedHoleriteTxId, setExpandedHoleriteTxId] = useState<string | null>(null);

  // Form States (Inline adding/editing)
  const [isAdding, setIsAdding] = useState(false);
  const [addingType, setAddingType] = useState<"recebivel" | "clt">("recebivel");
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  
  // Recebivel form fields
  const [cliente, setCliente] = useState("");
  const [natureza, setNatureza] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [numParcelas, setNumParcelas] = useState("1");
  const [dataContratacao, setDataContratacao] = useState(new Date().toISOString().split("T")[0]);
  const [observacoes, setObservacoes] = useState("");
  const [vinculoId, setVinculoId] = useState("");

  // CLT form fields
  const [cltEmpresa, setCltEmpresa] = useState("");
  const [cltAdmissao, setCltAdmissao] = useState(new Date().toISOString().split("T")[0]);
  const [cltDataInicioControle, setCltDataInicioControle] = useState("");

  // Inline confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);

  // Inline Payment Options inside installments
  const [receivingParcelId, setReceivingParcelId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [destinationAccount, setDestinationAccount] = useState("");

  // Selected bank transaction for linkage
  const [selectedTxId, setSelectedTxId] = useState<string>("");
  const [selectedParcelIds, setSelectedParcelIds] = useState<Record<string, boolean>>({});
  const [allocatedAmounts, setAllocatedAmounts] = useState<Record<string, string>>({});

  const [receiveMode, setReceiveMode] = useState<"link" | "manual">("link");
  const [selectedTxForParcel, setSelectedTxForParcel] = useState<string>("");
  const [linkAmountForParcel, setLinkAmountForParcel] = useState<string>("");

  const [showIgnored, setShowIgnored] = useState(false);

  const handleIgnoreTx = (txId: string) => {
    const updated = [...ignoredTxIds, txId];
    setIgnoredTxIds(updated);
    toast.success("Lançamento bancário ocultado/ignorado.");
  };

  const handleUnignoreTx = (txId: string) => {
    const updated = ignoredTxIds.filter(id => id !== txId);
    setIgnoredTxIds(updated);
    toast.success("Lançamento restaurado com sucesso.");
  };

  const isEditingAndHasPaidParcels = useMemo(() => {
    if (!editingContractId) return false;
    return parcelasRecebiveis
      .filter(p => p.recebivelId === editingContractId)
      .some(p => p.status === "PAGO");
  }, [editingContractId, parcelasRecebiveis]);

  const handleStartEdit = (rec: RecebivelParcelado) => {
    setEditingContractId(rec.id);
    setAddingType("recebivel");
    setCliente(rec.cliente);
    setNatureza(rec.naturezaServico || "");
    setValorTotal(rec.valorTotal.toString());
    setNumParcelas(rec.numeroParcelas.toString());
    setDataContratacao(rec.dataContratacao);
    setObservacoes(rec.observacoes || "");
    setVinculoId(rec.vinculoId === "standalone" ? "" : rec.vinculoId || "");
    setIsAdding(true);
    setConfirmDeleteId(null);
  };

  const handleStartEditClt = (clt: CltContract) => {
    setEditingContractId(clt.id);
    setAddingType("clt");
    setCltEmpresa(clt.empresa);
    setCltAdmissao(clt.dataAdmissao);
    setCltDataInicioControle(clt.dataInicioControle || clt.dataAdmissao);
    setIsAdding(true);
    setConfirmDeleteId(null);
  };

  const handleCancelForm = () => {
    setEditingContractId(null);
    setAddingType("recebivel");
    setCliente("");
    setNatureza("");
    setValorTotal("");
    setNumParcelas("1");
    setDataContratacao(new Date().toISOString().split("T")[0]);
    setObservacoes("");
    setVinculoId("");
    
    setCltEmpresa("");
    setCltAdmissao(new Date().toISOString().split("T")[0]);
    setCltDataInicioControle("");
    setIsAdding(false);
  };

  // Get candidate transactions
  const candidateTransactions = useMemo(() => {
    const catSalario = categoriasV2.find(c => c?.label?.toLowerCase() === 'salário' || c?.label?.toLowerCase() === 'salario');
    return transacoesV2.filter(t => {
      if (t.flow !== "in" || t.operationType !== "receita") return false;
      if (t.accountId.startsWith("acc_system_")) return false;
      if (catSalario && t.categoryId === catSalario.id) return false;

      const acc = contasMovimento.find(a => a.id === t.accountId);
      if (!acc || acc.accountType !== "corrente") return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transacoesV2, contasMovimento, categoriasV2]);

  const getLinkedAmountForTx = useCallback((txId: string) => {
    return parcelasRecebiveis
      .filter(p => p.recebimentoGeradoId === txId)
      .reduce((acc, p) => acc + (p.valorPago || 0), 0);
  }, [parcelasRecebiveis]);

  const unlinkedReceipts = useMemo(() => {
    return candidateTransactions.map(tx => {
      const linkedAmount = getLinkedAmountForTx(tx.id);
      const remainingAmount = Math.max(0, tx.amount - linkedAmount);
      return {
        ...tx,
        linkedAmount,
        remainingAmount
      };
    }).filter(tx => tx.remainingAmount > 0.01 && !ignoredTxIds.includes(tx.id));
  }, [candidateTransactions, getLinkedAmountForTx, ignoredTxIds]);

  const allContracts = useMemo(() => {
    return [
      ...recebiveisParcelados.map(r => ({ type: 'recebivel' as const, id: r.id, data: r })),
      ...cltContracts.map(c => ({ type: 'clt' as const, id: c.id, data: c }))
    ];
  }, [recebiveisParcelados, cltContracts]);

  const ignoredReceipts = useMemo(() => {
    return candidateTransactions.map(tx => {
      const linkedAmount = getLinkedAmountForTx(tx.id);
      const remainingAmount = Math.max(0, tx.amount - linkedAmount);
      return {
        ...tx,
        linkedAmount,
        remainingAmount
      };
    }).filter(tx => ignoredTxIds.includes(tx.id));
  }, [candidateTransactions, getLinkedAmountForTx, ignoredTxIds]);

  // Overall page KPIs - Includes both PJ (Recebíveis) and CLT (Assalariados) contracts
  const pageKpis = useMemo(() => {
    // 1. PJ (Recebíveis)
    const totalPjContratado = recebiveisParcelados.reduce((acc, r) => acc + r.valorTotal, 0);
    const totalPjRecebido = parcelasRecebiveis
      .filter(p => p.status === "PAGO")
      .reduce((acc, p) => acc + (p.valorPago || 0), 0);
    
    const vencidasPj = parcelasRecebiveis.filter(p => {
      if (p.status === "PAGO") return false;
      const dueDate = new Date(p.dataVencimento + "T12:00:00");
      return dueDate < new Date();
    });
    const totalPjVencido = vencidasPj.reduce((acc, p) => acc + p.valorPrevisto, 0);

    const aVencerPj = parcelasRecebiveis.filter(p => {
      if (p.status === "PAGO") return false;
      const dueDate = new Date(p.dataVencimento + "T12:00:00");
      return dueDate >= new Date();
    });
    const totalPjSaldoFuturo = aVencerPj.reduce((acc, p) => acc + p.valorPrevisto, 0);

    // 2. CLT (Assalariados)
    const catSalario = categoriasV2.find(c => {
      const lbl = c?.label?.toLowerCase() || "";
      return lbl.includes("salário") || lbl.includes("salario") || lbl.includes("holerite");
    });

    let totalCltRecebido = 0;
    let totalCltContratado = 0;
    let totalCltSaldoFuturo = 0;
    let totalCltVencido = 0;
    let cltAtrasadasCount = 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthsRemainingInYear = Math.max(1, 12 - currentMonth);

    cltContracts.forEach(clt => {
      const emp = clt.empresa.toLowerCase();
      const txSalariais = transacoesV2.filter(t => {
        if (t.flow !== 'in' || t.operationType !== 'receita') return false;
        if (catSalario && t.categoryId === catSalario.id) return true;
        const desc = t.description?.toLowerCase() || "";
        return desc.includes("salario") || desc.includes("salário") || desc.includes("folha") || desc.includes("holerite") || (emp && desc.includes(emp));
      });

      const cltRec = txSalariais.reduce((acc, t) => acc + t.amount, 0);
      totalCltRecebido += cltRec;

      // Determine projected net salary
      const contractHolerites = Object.values(cltHolerites).filter(h => h.contractId === clt.id);
      const latestHolerite = contractHolerites.length > 0
        ? [...contractHolerites].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        : null;

      let netSalary = 0;
      if (latestHolerite) {
        const gross = (latestHolerite.salarioMensal || 0) + (latestHolerite.rendimentosExtras || []).reduce((acc, item) => acc + (item.valor || 0), 0);
        const discounts = (latestHolerite.inssValor || 0) + (latestHolerite.descontosExtras || []).reduce((acc, item) => acc + (item.valor || 0), 0);
        netSalary = Math.max(0, gross - discounts);
      }
      if (netSalary === 0 && txSalariais.length > 0) {
        const sorted = [...txSalariais].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        netSalary = sorted[0].amount;
      }
      if (netSalary === 0 && clt.salarioBrutoAtual > 0) {
        const inss = Math.min(clt.salarioBrutoAtual * 0.11, 908);
        const irrf = Math.max(0, (clt.salarioBrutoAtual - inss) * 0.15 - 350);
        netSalary = Math.max(0, clt.salarioBrutoAtual - inss - irrf);
      }

      // Annualized contract projection
      const annualCltVal = (clt.salarioBrutoAtual > 0 ? clt.salarioBrutoAtual : netSalary) * 12;
      totalCltContratado += annualCltVal;

      // Future salary balance for remaining months of year
      const cltFuture = netSalary * monthsRemainingInYear;
      totalCltSaldoFuturo += cltFuture;

      // Check if current month salary is past due (5th day) and not received
      if (today.getDate() > 5) {
        const currentMonthTx = txSalariais.find(t => {
          const d = new Date(t.date + "T12:00:00");
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        if (!currentMonthTx && netSalary > 0) {
          totalCltVencido += netSalary;
          cltAtrasadasCount += 1;
        }
      }
    });

    const totalContratado = totalPjContratado + totalCltContratado;
    const totalRecebido = totalPjRecebido + totalCltRecebido;
    const totalSaldoFuturo = totalPjSaldoFuturo + totalCltSaldoFuturo;
    const totalVencido = totalPjVencido + totalCltVencido;
    const totalPendente = totalSaldoFuturo + totalVencido;
    const totalAtrasadas = vencidasPj.length + cltAtrasadasCount;

    return {
      totalContratado,
      totalRecebido,
      totalPendente,
      totalVencido,
      totalSaldoFuturo,
      totalAtrasadas,
      totalPjCount: recebiveisParcelados.length,
      totalCltCount: cltContracts.length,
      totalContractsCount: recebiveisParcelados.length + cltContracts.length,
      totalPjContratado,
      totalPjRecebido,
      totalPjSaldoFuturo,
      totalPjVencido,
      totalCltContratado,
      totalCltRecebido,
      totalCltSaldoFuturo,
      totalCltVencido,
      totalPjAtrasadasCount: vencidasPj.length,
      totalCltAtrasadasCount: cltAtrasadasCount
    };
  }, [recebiveisParcelados, parcelasRecebiveis, cltContracts, transacoesV2, categoriasV2, cltHolerites]);

  // Save or edit contract
  const handleSaveRecebivel = (e: React.FormEvent) => {
    e.preventDefault();

    if (addingType === "clt") {
      if (!cltEmpresa.trim()) {
        toast.error("Preencha a empresa / fonte pagadora.");
        return;
      }
      
      const cltId = editingContractId || generateCltContractId();
      
      const contract: CltContract = {
        id: cltId,
        empresa: cltEmpresa.trim(),
        dataAdmissao: cltAdmissao || new Date().toISOString().split('T')[0],
        salarioBrutoAtual: 0,
        dependentes: 0,
        pensaoAlimenticia: 0,
        dataInicioGestao: new Date().toISOString().split('T')[0],
        dataInicioControle: cltDataInicioControle || cltAdmissao,
        status: 'ativo',
        createdAt: new Date().toISOString(),
        auditLog: []
      };
      
      if (editingContractId) {
        updateCltContract(contract.id, contract);
        toast.success("Contrato Assalariado atualizado!");
      } else {
        addCltContract(contract);
        toast.success("Contrato Assalariado cadastrado!");
        const exists = categoriasV2.some(c => c?.label?.toLowerCase() === 'salário' || c?.label?.toLowerCase() === 'salario');
        if (!exists) {
          setCategoriasV2(prev => [...prev, {
            id: `cat_salario_${Date.now()}`,
            label: "Salário",
            nature: 'receita',
            type: 'income',
            icon: "Briefcase"
          }]);
        }
      }
      handleCancelForm();
      return;
    }

    if (!cliente.trim() || !valorTotal || !numParcelas) {
      toast.error("Por favor, preencha as informações obrigatórias.");
      return;
    }

    const valorContrato = parseFloat(valorTotal);
    const parcelasCount = parseInt(numParcelas);

    if (isNaN(valorContrato) || valorContrato <= 0) {
      toast.error("Valor total do contrato inválido.");
      return;
    }
    if (isNaN(parcelasCount) || parcelasCount <= 0) {
      toast.error("Número de parcelas inválido.");
      return;
    }

    if (editingContractId) {
      const originalContract = recebiveisParcelados.find(r => r.id === editingContractId);
      if (!originalContract) {
        toast.error("Contrato original não encontrado.");
        return;
      }

      const valorContratoMudou = originalContract.valorTotal !== valorContrato;
      const numParcelasMudou = originalContract.numeroParcelas !== parcelasCount;

      if (isEditingAndHasPaidParcels && (valorContratoMudou || numParcelasMudou)) {
        toast.error("Não é possível alterar o valor total ou número de parcelas porque este contrato já possui parcelas pagas.");
        return;
      }

      const catText = natureza.trim() || "Geral";
      const updatedRecebivel: RecebivelParcelado = {
        ...originalContract,
        cliente: cliente.trim(),
        naturezaServico: catText as RecebivelNatureza,
        valorTotal: valorContrato,
        numeroParcelas: parcelasCount,
        dataContratacao,
        formaRetencao: "SEM_RETENCAO",
        observacoes: observacoes.trim(),
        vinculoId: vinculoId || "standalone"
      };

      updateRecebivelParcelado(editingContractId, updatedRecebivel);

      if (valorContratoMudou || numParcelasMudou || originalContract.dataContratacao !== dataContratacao) {
        setParcelasRecebiveis(prev => prev.filter(p => p.recebivelId !== editingContractId));

        const parcelasGeradas: ParcelaRecebivel[] = [];
        const valorParcelaBase = Math.round((valorContrato / parcelasCount) * 100) / 100;
        const diferencaAjuste = Math.round((valorContrato - (valorParcelaBase * parcelasCount)) * 100) / 100;

        const dtBase = parseISO(dataContratacao);

        for (let i = 1; i <= parcelasCount; i++) {
          const valorPrevisto = i === parcelasCount ? (valorParcelaBase + diferencaAjuste) : valorParcelaBase;
          const dataVencimento = format(addMonths(dtBase, i), "yyyy-MM-dd");

          parcelasGeradas.push({
            id: `par_${editingContractId}_${i}_${Math.random().toString(36).substring(2, 5)}`,
            recebivelId: editingContractId,
            numeroParcela: i,
            valorPrevisto,
            dataVencimento,
            dataPagamento: null,
            valorPago: null,
            status: "A_VENCER",
            jurosMoraAplicado: null,
            recebimentoGeradoId: null
          });
        }

        setParcelasRecebiveis(prev => [...prev, ...parcelasGeradas]);
      }

      toast.success("Recebimento atualizado com sucesso!");
      handleCancelForm();
    } else {
      const catText = natureza.trim() || "Geral";
      const recebivelId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const novoRecebivel: RecebivelParcelado = {
        id: recebivelId,
        cliente: cliente.trim(),
        naturezaServico: catText as RecebivelNatureza,
        valorTotal: valorContrato,
        numeroParcelas: parcelasCount,
        dataContratacao,
        formaRetencao: "SEM_RETENCAO",
        observacoes: observacoes.trim(),
        vinculoId: vinculoId || "standalone"
      };

      const parcelasGeradas: ParcelaRecebivel[] = [];
      const valorParcelaBase = Math.round((valorContrato / parcelasCount) * 100) / 100;
      const diferencaAjuste = Math.round((valorContrato - (valorParcelaBase * parcelasCount)) * 100) / 100;

      const dtBase = parseISO(dataContratacao);

      for (let i = 1; i <= parcelasCount; i++) {
        const valorPrevisto = i === parcelasCount ? (valorParcelaBase + diferencaAjuste) : valorParcelaBase;
        const dataVencimento = format(addMonths(dtBase, i), "yyyy-MM-dd");

        parcelasGeradas.push({
          id: `par_${recebivelId}_${i}_${Math.random().toString(36).substring(2, 5)}`,
          recebivelId,
          numeroParcela: i,
          valorPrevisto,
          dataVencimento,
          dataPagamento: null,
          valorPago: null,
          status: "A_VENCER",
          jurosMoraAplicado: null,
          recebimentoGeradoId: null
        });
      }

      addRecebivelParcelado(novoRecebivel);
      setParcelasRecebiveis(prev => [...prev, ...parcelasGeradas]);

      toast.success(`Recebimento ${cliente} criado com sucesso!`);
      handleCancelForm();
    }
  };

  // Delete contract
  const handleDeleteContract = (id: string, type: "recebivel" | "clt") => {
    if (type === "recebivel") {
      deleteRecebivelParcelado(id);
      toast.success("Recebimento e parcelas removidos.");
    } else {
      deleteCltContract(id);
      toast.success("Contrato Assalariado excluído.");
    }
    setConfirmDeleteId(null);
    if (expandedContractId === id) {
      setExpandedContractId(null);
    }
  };

  // Reconcile/Link inline form handlers
  const handleOpenLinkingForm = (txId: string, preSelectParcelId?: string) => {
    setSelectedTxId(txId);
    const currentlyLinked = parcelasRecebiveis.filter(p => p.recebimentoGeradoId === txId);

    const parcelIds: Record<string, boolean> = {};
    const amounts: Record<string, string> = {};

    currentlyLinked.forEach(p => {
      parcelIds[p.id] = true;
      amounts[p.id] = p.valorPago?.toString() || p.valorPrevisto.toString();
    });

    if (preSelectParcelId && !parcelIds[preSelectParcelId]) {
      parcelIds[preSelectParcelId] = true;
      const targetParcel = parcelasRecebiveis.find(p => p.id === preSelectParcelId);
      if (targetParcel) {
        amounts[preSelectParcelId] = targetParcel.valorPrevisto.toString();
      }
    }

    setSelectedParcelIds(parcelIds);
    setAllocatedAmounts(amounts);
  };

  const handleSaveLinks = () => {
    if (!selectedTxId) return;
    const tx = transacoesV2.find(t => t.id === selectedTxId);
    if (!tx) return;

    let sumAllocated = 0;
    const updates: Record<string, { status: ParcelaStatus, valorPago: number | null, dataPagamento: string | null, recebimentoGeradoId: string | null }> = {};

    parcelasRecebiveis.forEach(parcel => {
      const isChecked = selectedParcelIds[parcel.id];
      if (isChecked) {
        const valStr = allocatedAmounts[parcel.id] || "";
        const val = parseFloat(valStr) || parcel.valorPrevisto;
        sumAllocated += val;

        updates[parcel.id] = {
          status: "PAGO",
          valorPago: val,
          dataPagamento: tx.date,
          recebimentoGeradoId: tx.id
        };
      } else if (parcel.recebimentoGeradoId === tx.id) {
        updates[parcel.id] = {
          status: "A_VENCER",
          valorPago: null,
          dataPagamento: null,
          recebimentoGeradoId: null
        };
      }
    });

    if (sumAllocated > tx.amount + 0.01) {
      toast.error(`O valor total alocado (${formatCurrency(sumAllocated)}) excede o valor do lançamento (${formatCurrency(tx.amount)}).`);
      return;
    }

    setParcelasRecebiveis(prev => prev.map(p => {
      if (updates[p.id]) {
        return {
          ...p,
          ...updates[p.id]
        };
      }
      return p;
    }));

    toast.success("Vínculos de recebimento atualizados!");
    setSelectedTxId("");
  };

  // Revert/Unlink payment
  const handleConfirmUnlinkParcel = (parcel: ParcelaRecebivel) => {
    const txId = parcel.recebimentoGeradoId;
    const isGeneratedByModule = txId ? (txId.startsWith("tx_parcela_") || txId.startsWith("tx_clt_")) : false;

    if (txId && isGeneratedByModule) {
      setTransacoesV2(prev => prev.filter(t => t.id !== txId));
    }

    setParcelasRecebiveis(prev => prev.map(p => 
      p.id === parcel.id 
        ? { ...p, status: "A_VENCER", dataPagamento: null, valorPago: null, recebimentoGeradoId: null }
        : p
    ));

    toast.success("Recebimento estornado com sucesso!");
    setConfirmUnlinkId(null);
  };

  // Manual payment or linkage of individual installment
  const handleOpenReceiveForm = (parcel: ParcelaRecebivel) => {
    setReceivingParcelId(parcel.id);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    const firstAccount = contasMovimento.find(a => a.accountType === "corrente")?.id || "";
    setDestinationAccount(firstAccount);

    const contract = recebiveisParcelados.find(r => r.id === parcel.recebivelId);
    if (contract && unlinkedReceipts.length > 0) {
      setSelectedTxForParcel(unlinkedReceipts[0].id);
      setLinkAmountForParcel(Math.min(parcel.valorPrevisto, unlinkedReceipts[0].remainingAmount).toString());
      setReceiveMode("link");
    } else {
      setReceiveMode("manual");
    }
  };

  const handleConfirmReceiveManual = (parcel: ParcelaRecebivel) => {
    if (!destinationAccount) {
      toast.error("Selecione a conta de destino para o depósito.");
      return;
    }
    confirmarPagamentoParcela(parcel.id, paymentDate, parcel.valorPrevisto, destinationAccount);
    setReceivingParcelId(null);
    toast.success("Lançamento manual registrado!");
  };

  const handleConfirmLinkForParcel = (parcel: ParcelaRecebivel) => {
    if (!selectedTxForParcel) {
      toast.error("Por favor, selecione uma transação de recebimento.");
      return;
    }

    const tx = transacoesV2.find(t => t.id === selectedTxForParcel);
    if (!tx) return;

    const amountToLink = parseFloat(linkAmountForParcel) || parcel.valorPrevisto;

    const currentlyLinked = parcelasRecebiveis
      .filter(p => p.recebimentoGeradoId === tx.id && p.id !== parcel.id)
      .reduce((acc, p) => acc + (p.valorPago || 0), 0);
    const remaining = tx.amount - currentlyLinked;

    if (amountToLink > remaining + 0.01) {
      toast.error(`O valor selecionado (${formatCurrency(amountToLink)}) excede o saldo disponível nesta transação (${formatCurrency(remaining)}).`);
      return;
    }

    setParcelasRecebiveis(prev => prev.map(p => {
      if (p.id === parcel.id) {
        return {
          ...p,
          status: "PAGO",
          dataPagamento: tx.date,
          valorPago: amountToLink,
          recebimentoGeradoId: tx.id
        };
      }
      return p;
    }));

    setReceivingParcelId(null);
    setSelectedTxForParcel("");
    setLinkAmountForParcel("");
    toast.success("Parcela vinculada e marcada como PAGA!");
  };

  // Recharts Donut data for top header
  const chartData = useMemo(() => {
    return [
      { name: "Recebido", value: pageKpis.totalRecebido, color: "#10b981" },
      { name: "Saldo Futuro", value: pageKpis.totalSaldoFuturo, color: "#3b82f6" },
      { name: "Em Atraso", value: pageKpis.totalVencido, color: "#ef4444" }
    ].filter(d => d.value > 0);
  }, [pageKpis]);

  const hasChartData = chartData.length > 0;

  return (
    <div className="space-y-8 animate-fade-in text-foreground">
      
      {/* ========================================== */}
      {/* 1. TOP HEADER BANNER (UNIFIED DASHBOARD)   */}
      {/* ========================================== */}
      <div className="bg-card rounded-[1.25rem] border border-border/40 p-5 px-6 shadow-sm w-full animate-fade-in shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left Part: KPIs Grid */}
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full py-0.5">
              
              {/* Total de Recebimentos */}
              <div className="flex flex-col justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground leading-none">Total de Recebimentos</span>
                  <p className="text-[22px] font-black text-foreground font-mono tracking-tight leading-none mt-2">
                    {formatCurrency(pageKpis.totalContratado)}
                  </p>
                  <div className="mt-2.5 space-y-1 border-t border-border/10 pt-2 text-[10px] font-medium text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Recebimento Avulso:</span>
                      <span className="font-mono font-bold text-foreground">{formatCurrency(pageKpis.totalPjContratado)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Contrato Assalariado:</span>
                      <span className="font-mono font-bold text-foreground">{formatCurrency(pageKpis.totalCltContratado)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Recebido */}
              <div className="flex flex-col justify-between sm:border-l border-border/20 sm:pl-6">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">Recebido</span>
                  <p className="text-[22px] font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none mt-2">
                    {formatCurrency(pageKpis.totalRecebido)}
                  </p>
                  <div className="mt-2.5 space-y-1 border-t border-border/10 pt-2 text-[10px] font-medium text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Recebimento Avulso:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pageKpis.totalPjRecebido)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Contrato Assalariado:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pageKpis.totalCltRecebido)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Valores a Receber */}
              <div className="flex flex-col justify-between lg:border-l border-border/20 lg:pl-6">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wider text-primary leading-none">Valores a Receber</span>
                  <p className="text-[22px] font-black text-primary font-mono tracking-tight leading-none mt-2">
                    {formatCurrency(pageKpis.totalSaldoFuturo)}
                  </p>
                  <div className="mt-2.5 space-y-1 border-t border-border/10 pt-2 text-[10px] font-medium text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Recebimento Avulso:</span>
                      <span className="font-mono font-bold text-primary">{formatCurrency(pageKpis.totalPjSaldoFuturo)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Contrato Assalariado:</span>
                      <span className="font-mono font-bold text-primary">{formatCurrency(pageKpis.totalCltSaldoFuturo)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Atrasado */}
              <div className="flex flex-col justify-between lg:border-l border-border/20 lg:pl-6">
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[11px] font-black uppercase tracking-wider leading-none",
                    pageKpis.totalAtrasadas > 0 ? "text-destructive" : "text-muted-foreground"
                  )}>Atrasado</span>
                  <p className={cn(
                    "text-[22px] font-black font-mono tracking-tight leading-none mt-2",
                    pageKpis.totalAtrasadas > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {formatCurrency(pageKpis.totalVencido)}
                  </p>
                  <div className="mt-2.5 space-y-1 border-t border-border/10 pt-2 text-[10px] font-medium text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Recebimento Avulso:</span>
                      <span className={cn("font-mono font-bold", pageKpis.totalPjVencido > 0 ? "text-destructive" : "text-muted-foreground")}>
                        {formatCurrency(pageKpis.totalPjVencido)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Contrato Assalariado:</span>
                      <span className={cn("font-mono font-bold", pageKpis.totalCltVencido > 0 ? "text-destructive" : "text-muted-foreground")}>
                        {formatCurrency(pageKpis.totalCltVencido)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Part: Composition Donut Chart with Nomenclatures */}
          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6 flex flex-col sm:flex-row items-center justify-between gap-4 h-full min-h-[90px]">
            <div className="flex flex-col justify-center space-y-2 w-full sm:w-auto">
              <div>
                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-wider leading-none block">Composição do Fluxo</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1 block">Total a Receber</span>
                <span className="text-base font-black text-foreground font-mono tracking-tight leading-none mt-1 block">
                  {formatCurrency(pageKpis.totalPendente)}
                </span>
              </div>

              {/* Nomenclaturas e Legenda do Gráfico */}
              <div className="space-y-1 pt-0.5 text-[10px] font-bold">
                <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    Recebido
                  </span>
                  <span className="font-mono tabular-nums">{formatCurrency(pageKpis.totalRecebido)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    Saldo Futuro
                  </span>
                  <span className="font-mono tabular-nums">{formatCurrency(pageKpis.totalSaldoFuturo)}</span>
                </div>
                {pageKpis.totalVencido > 0 && (
                  <div className="flex items-center justify-between gap-3 text-destructive">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                      Em Atraso
                    </span>
                    <span className="font-mono tabular-nums">{formatCurrency(pageKpis.totalVencido)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-[85px] w-[85px] relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hasChartData ? chartData : [{ name: "Sem Dados", value: 1, color: "#cbd5e1" }]}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={hasChartData ? 3 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {(hasChartData ? chartData : [{ name: "Sem Dados", value: 1, color: "#e2e8f0" }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xs font-black text-foreground font-mono leading-none">
                  {pageKpis.totalContratado > 0 ? `${Math.round((pageKpis.totalRecebido / pageKpis.totalContratado) * 100)}%` : '0%'}
                </span>
                <span className="text-[7px] font-black uppercase text-muted-foreground leading-none mt-0.5 tracking-wider">
                  Quitado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* ========================================== */}
      {/* 2. MAIN INTERFACE PANEL                     */}
      {/* ========================================== */}
      <div className="space-y-6">
        
        {/* Section Sub-Header / Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground">Gestão de Recebimentos e Rendas</h3>
            <p className="text-sm text-muted-foreground">Clique no card do recebimento para visualizar o cronograma e interagir com as parcelas.</p>
          </div>
          {!isAdding && !selectedTxId && (
            <Button 
              onClick={() => setIsAdding(true)}
              className="rounded-full bg-primary hover:bg-primary-dark text-white font-bold text-sm px-6 gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Recebimento
            </Button>
          )}
        </div>

        {/* Inline Action Containers */}
        {selectedTxId ? (
          // Reconcile/Link Form
          <Card className="rounded-[2rem] border-2 border-primary/40 bg-card p-6 space-y-6 shadow-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                <h4 className="text-base font-black tracking-tight text-foreground">Reconciliação e Vinculação de Recebimento</h4>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedTxId("")}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {(() => {
              const tx = transacoesV2.find(t => t.id === selectedTxId);
              if (!tx) return null;
              const acc = contasMovimento.find(a => a.id === tx.accountId);

              let currentAllocationSum = 0;
              parcelasRecebiveis.forEach(p => {
                if (selectedParcelIds[p.id]) {
                  const valStr = allocatedAmounts[p.id] || "";
                  const val = parseFloat(valStr) || p.valorPrevisto;
                  currentAllocationSum += val;
                }
              });

              const remainingAmount = tx.amount - currentAllocationSum;
              const isOverAllocated = remainingAmount < -0.01;

              return (
                <div className="space-y-6 text-sm">
                  {/* Selected bank transaction header */}
                  <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Conta</span>
                      <span className="font-bold text-foreground text-sm">{acc?.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Data Lançamento</span>
                      <span className="font-bold text-foreground text-sm">{new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Valor Total</span>
                      <span className="font-mono font-black text-foreground text-sm">{formatCurrency(tx.amount)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Valor Restante</span>
                      <span className={cn(
                        "font-mono font-black text-sm",
                        isOverAllocated ? "text-destructive" : remainingAmount < 0.05 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-black text-foreground uppercase block">
                      Selecione as Parcelas de Recebimentos a serem Pagas
                    </Label>

                    <div className="border border-border/40 rounded-2xl max-h-[250px] overflow-y-auto p-3 bg-muted/5 space-y-3">
                      {parcelasRecebiveis
                        .filter(p => p.status !== "PAGO" || p.recebimentoGeradoId === tx.id)
                        .sort((a, b) => {
                          const clientA = recebiveisParcelados.find(r => r.id === a.recebivelId)?.cliente || "";
                          const clientB = recebiveisParcelados.find(r => r.id === b.recebivelId)?.cliente || "";
                          if (clientA !== clientB) return clientA.localeCompare(clientB);
                          return a.dataVencimento.localeCompare(b.dataVencimento);
                        })
                        .map(p => {
                          const rec = recebiveisParcelados.find(r => r.id === p.recebivelId);
                          const isChecked = !!selectedParcelIds[p.id];
                          const isLate = p.status !== "PAGO" && new Date(p.dataVencimento + "T12:00:00") < new Date();

                          return (
                            <div 
                              key={p.id} 
                              className={cn(
                                "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors",
                                isChecked 
                                  ? "bg-emerald-500/[0.02] border-emerald-500/20" 
                                  : "bg-background border-border/30 hover:border-border/60"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`chk-${p.id}`}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedParcelIds(prev => ({ ...prev, [p.id]: checked }));
                                    if (checked && !allocatedAmounts[p.id]) {
                                      setAllocatedAmounts(prev => ({
                                        ...prev,
                                        [p.id]: Math.min(p.valorPrevisto, Math.max(0, remainingAmount)).toString()
                                      }));
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary shrink-0"
                                />
                                <label htmlFor={`chk-${p.id}`} className="cursor-pointer min-w-0">
                                  <div className="font-bold text-sm text-foreground truncate max-w-[200px]">
                                    {rec?.cliente || "Recebimento Excluído"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold mt-1">
                                    <span>Parcela {p.numeroParcela}/{rec?.numeroParcelas}</span>
                                    <span>•</span>
                                    <span>Venc: {new Date(p.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                                    {isLate && <Badge className="bg-destructive/10 text-destructive border-none font-bold text-xs px-2 py-0.5 rounded-full">Atrasada</Badge>}
                                  </div>
                                </label>
                              </div>

                              <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
                                <div className="text-left sm:text-right">
                                  <span className="text-xs font-bold text-muted-foreground uppercase block">Previsto</span>
                                  <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(p.valorPrevisto)}</span>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-muted-foreground uppercase block text-right">Valor Pago</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={!isChecked}
                                    placeholder={p.valorPrevisto.toString()}
                                    value={allocatedAmounts[p.id] || ""}
                                    onChange={(e) => {
                                      setAllocatedAmounts(prev => ({
                                        ...prev,
                                        [p.id]: e.target.value
                                      }));
                                    }}
                                    className="h-8 w-24 text-sm font-bold px-3 text-right bg-muted/20 border-border/40 rounded-lg disabled:opacity-40"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {parcelasRecebiveis.filter(p => p.status !== "PAGO" || p.recebimentoGeradoId === tx.id).length === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-6 font-semibold">Nenhuma parcela em aberto para reconciliar.</p>
                      )}
                    </div>
                  </div>

                  {isOverAllocated && (
                    <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/10 text-destructive rounded-xl p-3 text-sm font-semibold">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      O total alocado excede o valor da transação em {formatCurrency(Math.abs(remainingAmount))}.
                    </div>
                  )}

                  <div className="flex items-center gap-3 justify-end border-t border-border/30 pt-4">
                    <Button variant="outline" className="rounded-xl px-5 text-sm font-bold" onClick={() => setSelectedTxId("")}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveLinks} className="rounded-xl bg-primary text-white text-sm font-bold px-6">
                      Salvar Vinculação
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
        ) : (
          // Default Grid of Contracts + Sidebar
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Side: Recebimentos Cards List (Styled exactly like CreditCardSummaryCard) */}
            <div className="space-y-4 lg:col-span-8">
              {allContracts.length === 0 ? (
                <Card className="rounded-[2rem] border border-border/40 p-12 text-center space-y-4 shadow-sm bg-card">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <div>
                    <h4 className="text-base font-black">Nenhum recebimento cadastrado</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                      Crie um recebimento avulso ou contrato assalariado para controlar e planejar seus recebimentos.
                    </p>
                  </div>
                  <div className="flex gap-3 items-center justify-center">
                    <Button onClick={() => { setAddingType("recebivel"); setIsAdding(true); }} className="rounded-xl font-bold text-xs px-5 py-2">
                      Cadastrar Recebimento Avulso
                    </Button>
                    <Button onClick={() => { setAddingType("clt"); setIsAdding(true); }} variant="secondary" className="rounded-xl font-bold text-xs px-5 py-2">
                      Cadastrar Contrato Assalariado
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {allContracts.map(contractObj => {
                    const isClt = contractObj.type === 'clt';
                    const contractId = contractObj.id;
                    const isExpanded = expandedContractId === contractId;

                    if (isClt) {
                      const clt = contractObj.data;
                      const isConfirmingDelete = confirmDeleteId === clt.id;
                      
                      const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

                      // Encontrar transações de salário para calcular projeção baseada no último recebimento
                      const categoriaSalario = categoriasV2.find(c => {
                        const lbl = c?.label?.toLowerCase() || "";
                        return lbl.includes("salário") || lbl.includes("salario") || lbl.includes("holerite");
                      });

                      const transacoesSalariais = transacoesV2
                        .filter(t => {
                          if (t.flow !== 'in' || t.operationType !== 'receita') return false;
                          if (categoriaSalario && t.categoryId === categoriaSalario.id) return true;
                          const desc = t.description?.toLowerCase() || "";
                          const emp = clt.empresa.toLowerCase();
                          return desc.includes("salario") || desc.includes("salário") || desc.includes("folha") || desc.includes("holerite") || (emp && desc.includes(emp));
                        })
                        .sort((a, b) => new Date(b.date + "T12:00:00").getTime() - new Date(a.date + "T12:00:00").getTime());

                      const lastTx = transacoesSalariais[0]; // Último recebimento real

                      // Verificar se há holerite cadastrado para refinar a projeção
                      const latestTxHolerite = lastTx ? cltHolerites[lastTx.id] : null;
                      const contractHolerites = Object.values(cltHolerites).filter(h => h.contractId === clt.id);
                      const latestHolerite = latestTxHolerite || (contractHolerites.length > 0
                        ? [...contractHolerites].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
                        : null);

                      let projectedNetSalary = 0;
                      let projectionSourceLabel = "";
                      let isRefinedByHolerite = false;

                      if (latestHolerite) {
                        const gross = (latestHolerite.salarioMensal || 0) + (latestHolerite.rendimentosExtras || []).reduce((acc, item) => acc + (item.valor || 0), 0);
                        const discounts = (latestHolerite.inssValor || 0) + (latestHolerite.descontosExtras || []).reduce((acc, item) => acc + (item.valor || 0), 0);
                        const holeriteNet = gross - discounts;

                        if (holeriteNet > 0) {
                          projectedNetSalary = holeriteNet;
                          isRefinedByHolerite = true;
                          projectionSourceLabel = `Holerite (${latestHolerite.competencia || 'Última Competência'})`;
                        }
                      }

                      if (projectedNetSalary === 0 && lastTx) {
                        projectedNetSalary = lastTx.amount;
                        const lastTxDateStr = new Date(lastTx.date + "T12:00:00").toLocaleDateString("pt-BR");
                        projectionSourceLabel = `Último Lançamento (${lastTxDateStr})`;
                      }

                      if (projectedNetSalary === 0) {
                        if (clt.salarioBrutoAtual > 0) {
                          const inss = Math.min(clt.salarioBrutoAtual * 0.11, 908);
                          const irrf = Math.max(0, (clt.salarioBrutoAtual - inss) * 0.15 - 350);
                          projectedNetSalary = clt.salarioBrutoAtual - inss - irrf;
                          projectionSourceLabel = "Salário Bruto";
                        } else {
                          projectedNetSalary = 0;
                          projectionSourceLabel = "Aguardando 1º Recebimento";
                        }
                      }

                      const nextMonthDate = addMonths(new Date(), 1);
                      const nextMonthName = monthNames[nextMonthDate.getMonth()];
                      const nextPaydayStr = `05 de ${nextMonthName.charAt(0).toUpperCase() + nextMonthName.slice(1)}`;

                      const upcomingPayments = Array.from({ length: 3 }).map((_, idx) => {
                        const mDate = addMonths(new Date(), idx);
                        const mName = monthNames[mDate.getMonth()];
                        const label = mName.charAt(0).toUpperCase() + mName.slice(1);
                        const year = mDate.getFullYear();
                        return {
                          title: `Competência ${label} / ${year}`,
                          dateLabel: `05 de ${label}`,
                          amount: projectedNetSalary,
                          status: "PREVISTO" as const
                        };
                      });

                      return (
                        <div 
                          key={clt.id}
                          className={cn(
                            "bg-card rounded-[32px] border transition-all duration-300 overflow-hidden relative group animate-fade-in",
                            isExpanded ? "border-emerald-500/60 shadow-soft-lg ring-1 ring-emerald-500/10" : "border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg",
                            isConfirmingDelete ? "border-destructive bg-destructive/[0.01]" : ""
                          )}
                        >
                          {/* Decorative Background Icon */}
                          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-emerald-600/[0.08] dark:text-emerald-400/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
                            <Briefcase className="w-56 h-56" />
                          </div>

                          {isConfirmingDelete ? (
                            <div className="p-6 space-y-4 animate-in fade-in duration-200 relative z-10">
                              <div className="flex items-start gap-2.5 text-destructive">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                  <h4 className="font-bold text-sm text-foreground">Excluir Contrato Assalariado?</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                                    Esta ação apagará permanentemente o contrato da empresa {clt.empresa}.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end pt-2 border-t border-border/20">
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-xs font-bold rounded-lg"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  type="button"
                                  variant="destructive" 
                                  size="sm" 
                                  className="h-8 text-xs font-bold rounded-lg px-4"
                                  onClick={() => { handleDeleteContract(clt.id, 'clt'); setConfirmDeleteId(null); }}
                                >
                                  Sim, Excluir
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Collapsible open={isExpanded} onOpenChange={() => setExpandedContractId(isExpanded ? null : clt.id)}>
                              <CollapsibleTrigger asChild>
                                <div className="p-6 cursor-pointer hover:bg-muted/5 transition-colors space-y-4 relative z-10">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="p-4 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-emerald-500/15 text-emerald-600 shrink-0">
                                        <Briefcase className="w-8 h-8" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-80">
                                            Contrato Assalariado
                                          </span>
                                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                                            CLT Ativo
                                          </Badge>
                                        </div>
                                        <h4 className="text-xl font-black text-foreground mt-0.5">{clt.empresa}</h4>
                                      </div>
                                    </div>

                                    <div className="text-right flex items-center gap-4">
                                      <div>
                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wider opacity-85">Líquido Estimado</p>
                                        <p className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight tabular-nums">
                                          {formatCurrency(projectedNetSalary)}
                                        </p>
                                      </div>
                                      <div className={cn(
                                        "p-2 rounded-full bg-muted/10 text-muted-foreground transition-transform duration-300",
                                        isExpanded && "rotate-90"
                                      )}>
                                        <ChevronRight className="w-6 h-6" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* CLT Specs Footer visible when closed - 4 colunas em harmonia com cards PJ */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Admissão</p>
                                      <p className="text-sm font-bold text-foreground">
                                        {new Date(clt.dataAdmissao + "T12:00:00").toLocaleDateString("pt-BR")}
                                      </p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Próx. Pagamento</p>
                                      <p className="text-sm font-bold text-emerald-600">
                                        {nextPaydayStr}
                                      </p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Base Projeção</p>
                                      <p className="text-sm font-extrabold text-emerald-600 font-mono tabular-nums">
                                        {formatCurrency(projectedNetSalary)}
                                      </p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Último Crédito</p>
                                      <p className="text-sm font-extrabold text-emerald-600 font-mono tabular-nums">
                                        {lastTx ? formatCurrency(lastTx.amount) : "Sem Registro"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="px-6 pb-6 pt-2 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
                                  <Tabs defaultValue="detalhes" className="w-full">
                                    <TabsList className="bg-muted/60 p-1 rounded-xl h-10 border border-border/10 mb-5 w-full sm:w-auto flex flex-row flex-wrap sm:flex-nowrap gap-1">
                                      <TabsTrigger value="detalhes" className="rounded-lg px-3.5 h-8 font-black text-[9px] uppercase tracking-wider gap-1.5 flex-1 sm:flex-initial">
                                        <TrendingUp className="w-3.5 h-3.5" /> Projeções
                                      </TabsTrigger>
                                      <TabsTrigger value="historico" className="rounded-lg px-3.5 h-8 font-black text-[9px] uppercase tracking-wider gap-1.5 flex-1 sm:flex-initial">
                                        <ReceiptText className="w-3.5 h-3.5" /> Competências
                                      </TabsTrigger>
                                      <TabsTrigger value="ferias" className="rounded-lg px-3.5 h-8 font-black text-[9px] uppercase tracking-wider gap-1.5 flex-1 sm:flex-initial">
                                        <Umbrella className="w-3.5 h-3.5" /> Férias
                                      </TabsTrigger>
                                      <TabsTrigger value="rescisao" className="hidden rounded-lg px-3.5 h-8 font-black text-[9px] uppercase tracking-wider gap-1.5 flex-1 sm:flex-initial">
                                        <FileX className="w-3.5 h-3.5" /> Rescisão
                                      </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="detalhes" className="space-y-4 animate-in fade-in duration-300">
                                      <div className="bg-muted/10 border border-border/40 p-4 rounded-2xl space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/30">
                                          <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            <h5 className="font-black text-xs uppercase tracking-wider text-foreground">
                                              Próximas Projeções de Recebimento ({upcomingPayments.length})
                                            </h5>
                                          </div>
                                          <Badge className="bg-emerald-500/15 text-emerald-600 border-none font-bold text-[9px] uppercase px-2.5 py-0.5">
                                            Projeção Mensal
                                          </Badge>
                                        </div>

                                        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin-custom">
                                          {upcomingPayments.map((p, pIdx) => (
                                            <div key={pIdx} className="bg-background border border-border/30 hover:border-border/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold transition-all shadow-sm">
                                              <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                                                  <CalendarDays className="w-4.5 h-4.5" />
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-foreground leading-none">{p.title}</p>
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase py-0.5">
                                                      Salário Mensal
                                                    </Badge>
                                                  </div>
                                                  <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">
                                                    Previsão de Crédito: {p.dateLabel}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-border/10 pt-2 sm:pt-0">
                                                <div className="text-right">
                                                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
                                                    Líquido Estimado
                                                  </span>
                                                  <span className="font-mono text-sm sm:text-base font-black text-emerald-600 tabular-nums">
                                                    {formatCurrency(p.amount)}
                                                  </span>
                                                </div>
                                                <Badge className="bg-emerald-500/15 text-emerald-600 border-none text-[9px] font-black uppercase px-2.5 py-1">
                                                  Projetado
                                                </Badge>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TabsContent>

                                    <TabsContent value="historico" className="space-y-4 animate-in fade-in duration-300">
                                      <div className="bg-muted/10 border border-border/40 p-4 rounded-2xl space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/30">
                                          <div className="flex items-center gap-2">
                                            <ReceiptText className="w-4 h-4 text-emerald-500" />
                                            <h5 className="font-black text-xs uppercase tracking-wider text-foreground">
                                              Competências Pagas e Holerites ({transacoesSalariais.length})
                                            </h5>
                                          </div>
                                          <Badge className="bg-emerald-500/15 text-emerald-600 border-none font-bold text-[9px] uppercase px-2.5 py-0.5">
                                            Histórico Registrado
                                          </Badge>
                                        </div>

                                        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin-custom">
                                          {transacoesSalariais.length === 0 ? (
                                            <div className="text-center py-8 text-xs font-semibold text-muted-foreground italic">
                                              Nenhum lançamento de salário registrado para este contrato.
                                            </div>
                                          ) : (
                                            transacoesSalariais.map(t => {
                                              const monthNamesArr = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                                              const tDate = new Date(t.date + 'T12:00:00');
                                              const compDate = addMonths(tDate, -1);
                                              const compMonthName = monthNamesArr[compDate.getMonth()] || 'competência';
                                              const compYear = compDate.getFullYear();
                                              const compLabel = `Competência ${compMonthName.charAt(0).toUpperCase() + compMonthName.slice(1)} / ${compYear}`;
                                              const holeriteSalvo = cltHolerites[t.id];
                                              const isOpen = expandedHoleriteTxId === t.id;

                                              return (
                                                <div key={t.id} className="space-y-2">
                                                  <div className={cn(
                                                    "bg-background border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold transition-all shadow-sm",
                                                    isOpen ? "ring-2 ring-primary border-primary" : "border-border/30 hover:border-border/60"
                                                  )}>
                                                    <div className="flex items-center gap-3">
                                                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                                                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                                                      </div>
                                                      <div>
                                                        <div className="flex items-center gap-2">
                                                          <p className="font-bold text-sm text-foreground leading-none">{compLabel}</p>
                                                          {holeriteSalvo ? (
                                                            <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase py-0.5">
                                                              Holerite Salvo
                                                            </Badge>
                                                          ) : (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase py-0.5">
                                                              Extrato
                                                            </Badge>
                                                          )}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-bold mt-1 block">
                                                          Crédito em {tDate.toLocaleDateString('pt-BR')}
                                                        </span>
                                                      </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-border/10 pt-2 sm:pt-0">
                                                      <div className="text-right">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
                                                          Valor Recebido
                                                        </span>
                                                        <span className="font-mono text-sm sm:text-base font-black text-emerald-600 tabular-nums">
                                                          {formatCurrency(t.amount)}
                                                        </span>
                                                      </div>

                                                      <Badge className="bg-emerald-500/15 text-emerald-600 border-none text-[8px] font-black uppercase leading-none py-1.5 px-2">
                                                        Quitado
                                                      </Badge>

                                                      <Button
                                                        type="button"
                                                        variant={isOpen ? "secondary" : "outline"}
                                                        size="sm"
                                                        onClick={() => setExpandedHoleriteTxId(isOpen ? null : t.id)}
                                                        className="h-8 text-[10px] font-black uppercase rounded-lg gap-1.5 px-3 shrink-0"
                                                      >
                                                        <Receipt className="w-3.5 h-3.5 text-primary" />
                                                        {isOpen ? "Fechar" : holeriteSalvo ? "Ver Holerite" : "Holerite"}
                                                      </Button>
                                                    </div>
                                                  </div>

                                                  {/* Seção não-modal expansível do Holerite */}
                                                  {isOpen && (
                                                    <div className="pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                      <CltHoleriteEditor
                                                        contractId={clt.id}
                                                        competenciaId={t.id}
                                                        competenciaLabel={compLabel}
                                                        defaultSalario={t.amount}
                                                        onClose={() => setExpandedHoleriteTxId(null)}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    </TabsContent>

                                    <TabsContent value="ferias" className="animate-in fade-in duration-300">
                                      <div className="p-1">
                                        <CltVacationTab 
                                          contractId={clt.id}
                                          salarioBase={clt.salarioBrutoAtual}
                                          dependentes={clt.dependentes}
                                          dataAdmissao={clt.dataAdmissao}
                                        />
                                      </div>
                                    </TabsContent>

                                    <TabsContent value="rescisao" className="hidden">
                                      <div className="p-1">
                                        <CltResignationTab
                                          contractId={clt.id}
                                          salarioBase={clt.salarioBrutoAtual}
                                          dependentes={clt.dependentes}
                                          dataAdmissao={clt.dataAdmissao}
                                        />
                                      </div>
                                    </TabsContent>
                                  </Tabs>

                                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/15 items-center justify-between">
                                    <div className="flex gap-2">
                                      <Button 
                                        type="button"
                                        variant="ghost" 
                                        size="sm"
                                        className="rounded-xl text-xs font-bold gap-1 text-primary hover:bg-primary/5"
                                        onClick={() => handleStartEditClt(clt)}
                                      >
                                        <Edit className="w-3.5 h-3.5" /> Editar
                                      </Button>
                                      <Button 
                                        type="button"
                                        variant="ghost" 
                                        size="sm"
                                        className="rounded-xl text-xs font-bold gap-1 text-destructive hover:bg-destructive/5"
                                        onClick={() => setConfirmDeleteId(clt.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      );
                    }

                    // CLIENT PJ CONTRACTS
                    const rec = contractObj.data;
                    const parcelsOfRec = parcelasRecebiveis.filter(p => p.recebivelId === rec.id);
                    const paidParcels = parcelsOfRec.filter(p => p.status === "PAGO");
                    const unpaidParcels = parcelsOfRec.filter(p => p.status !== "PAGO").sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
                    
                    const totalRecebido = paidParcels.reduce((a, b) => a + (b.valorPago || 0), 0);
                    const totalPendente = unpaidParcels.reduce((a, b) => a + b.valorPrevisto, 0);
                    const vencidas = unpaidParcels.filter(p => new Date(p.dataVencimento + "T12:00:00") < new Date());
                    const totalVencido = vencidas.reduce((a, b) => a + b.valorPrevisto, 0);
                    
                    const paidParcelsCount = paidParcels.length;
                    const isConfirmingDelete = confirmDeleteId === rec.id;

                    return (
                      <div 
                        key={rec.id}
                        className={cn(
                          "bg-card rounded-[32px] border transition-all duration-300 overflow-hidden relative group animate-fade-in",
                          isExpanded ? "border-primary/60 shadow-soft-lg ring-1 ring-primary/10" : "border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg",
                          isConfirmingDelete ? "border-destructive bg-destructive/[0.01]" : ""
                        )}
                      >
                        {/* Decorative Background Icon */}
                        <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-primary/[0.08] dark:text-white/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
                          <Receipt className="w-56 h-56" />
                        </div>

                        {isConfirmingDelete ? (
                          <div className="p-6 space-y-4 animate-in fade-in duration-200 relative z-10">
                            <div className="flex items-start gap-2.5 text-destructive">
                              <AlertTriangle className="w-5 h-5 shrink-0" />
                              <div>
                                <h4 className="font-bold text-sm text-foreground">Excluir Recebimento?</h4>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                                  Todas as parcelas em aberto vinculadas ao recebimento {rec.cliente} serão removidas permanentemente.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-2 border-t border-border/20">
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs font-bold rounded-lg"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                type="button"
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-xs font-bold rounded-lg px-4"
                                onClick={() => { handleDeleteContract(rec.id, 'recebivel'); setConfirmDeleteId(null); }}
                              >
                                Sim, Excluir
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Collapsible open={isExpanded} onOpenChange={() => setExpandedContractId(isExpanded ? null : rec.id)}>
                            <CollapsibleTrigger asChild>
                              <div className="p-6 cursor-pointer hover:bg-muted/5 transition-colors space-y-4 relative z-10">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-primary/10 text-primary shrink-0">
                                      <Receipt className="w-8 h-8" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-80">
                                          Recebimento Avulso
                                        </span>
                                        <Badge className="bg-primary/10 text-primary border-none font-bold text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                                          {CATEGORIA_LABELS[rec.naturezaServico as RecebivelNatureza] || rec.naturezaServico || "Serviços"}
                                        </Badge>
                                      </div>
                                      <h4 className="text-xl font-black text-foreground mt-0.5">{rec.cliente}</h4>
                                    </div>
                                  </div>

                                  <div className="text-right flex items-center gap-4">
                                    <div>
                                      <p className="text-xs font-black text-muted-foreground uppercase tracking-wider opacity-85">Valor Total</p>
                                      <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                                        {formatCurrency(rec.valorTotal)}
                                      </p>
                                    </div>
                                    <div className={cn(
                                      "p-2 rounded-full bg-muted/10 text-muted-foreground transition-transform duration-300",
                                      isExpanded && "rotate-90"
                                    )}>
                                      <ChevronRight className="w-6 h-6" />
                                    </div>
                                  </div>
                                </div>

                                {/* Contract Specs Footer visible when closed */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
                                  <div className="space-y-0.5">
                                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Contratado em</p>
                                    <p className="text-sm font-bold text-foreground">
                                      {new Date(rec.dataContratacao + "T12:00:00").toLocaleDateString("pt-BR")}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Quitação</p>
                                    <p className="text-sm font-bold text-primary">
                                      {paidParcelsCount} de {rec.numeroParcelas} parcelas
                                    </p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Já Recebido</p>
                                    <p className="text-sm font-extrabold text-emerald-600 tabular-nums">
                                      {formatCurrency(totalRecebido)}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-80">Saldo Pendente</p>
                                    <p className={cn(
                                      "text-sm font-extrabold tabular-nums",
                                      totalVencido > 0 ? "text-destructive" : "text-foreground"
                                    )}>
                                      {formatCurrency(totalPendente)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="px-6 pb-6 pt-2 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
                                <Tabs defaultValue="pendentes" className="w-full">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                    <TabsList className="bg-muted/60 p-1 rounded-xl h-10 border border-border/10 w-full sm:w-auto flex flex-row flex-wrap sm:flex-nowrap gap-1">
                                      <TabsTrigger value="pendentes" className="rounded-lg px-3.5 h-8 font-black text-[9px] uppercase tracking-wider gap-1.5 flex-1 sm:flex-initial">
                                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Pendentes ({unpaidParcels.length})
                                      </TabsTrigger>
                                      <TabsTrigger value="recebidos" className="rounded-lg px-3.5 h-8 font-black text-[9px] uppercase tracking-wider gap-1.5 flex-1 sm:flex-initial">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Recebidos ({paidParcels.length})
                                      </TabsTrigger>
                                    </TabsList>

                                    <div className="w-full sm:w-auto sm:max-w-xs">
                                      <ContractRadialChart 
                                        totalRecebido={totalRecebido} 
                                        totalPendente={totalPendente} 
                                        totalContratado={rec.valorTotal} 
                                      />
                                    </div>
                                  </div>

                                  <TabsContent value="pendentes" className="space-y-4 animate-in fade-in duration-300">
                                    <div className="bg-muted/10 border border-border/40 p-4 rounded-2xl space-y-3">
                                      <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-amber-500" />
                                          <h5 className="font-black text-xs uppercase tracking-wider text-foreground">
                                            Parcelas Pendentes ({unpaidParcels.length})
                                          </h5>
                                        </div>
                                        <Badge className="bg-amber-500/15 text-amber-600 border-none font-bold text-[9px]">
                                          A Receber
                                        </Badge>
                                      </div>

                                      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin-custom">
                                        {unpaidParcels.length > 0 ? (
                                          unpaidParcels.map((parcel) => {
                                            const isLate = new Date(parcel.dataVencimento + "T12:00:00") < new Date();
                                            const isReceiving = receivingParcelId === parcel.id;

                                            return (
                                              <div 
                                                key={parcel.id} 
                                                className={cn(
                                                  "bg-background border rounded-xl p-3 space-y-2.5 transition-all",
                                                  isLate ? "border-destructive/30 bg-destructive/[0.01]" : "border-border/30 hover:border-border/60",
                                                  isReceiving ? "ring-2 ring-primary border-primary" : ""
                                                )}
                                              >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                  <div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-xs text-foreground">
                                                        Parcela {parcel.numeroParcela}/{rec.numeroParcelas}
                                                      </span>
                                                      {isLate ? (
                                                        <Badge className="bg-destructive/15 text-destructive border-none text-[8px] font-black uppercase py-0.5">
                                                          Atrasada
                                                        </Badge>
                                                      ) : (
                                                        <Badge className="bg-muted text-muted-foreground border-none text-[8px] font-black uppercase py-0.5">
                                                          A Vencer
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">
                                                      Vencimento: {new Date(parcel.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                                    <span className="font-mono text-sm font-black text-foreground">
                                                      {formatCurrency(parcel.valorPrevisto)}
                                                    </span>
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      onClick={() => {
                                                        if (isReceiving) setReceivingParcelId(null);
                                                        else handleOpenReceiveForm(parcel);
                                                      }}
                                                      className="rounded-lg h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-3 gap-1"
                                                    >
                                                      <Check className="w-3 h-3" /> Receber
                                                    </Button>
                                                  </div>
                                                </div>

                                                {/* INLINE RECEIVE / LINK FORM */}
                                                {isReceiving && (
                                                  <div className="pt-3 border-t border-border/30 space-y-3 bg-muted/20 p-3 rounded-lg text-xs animate-in fade-in duration-200">
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-black text-[10px] uppercase tracking-wider text-foreground">Confirmar Recebimento da Parcela</span>
                                                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" onClick={() => setReceivingParcelId(null)}>
                                                        <X className="w-3 h-3" />
                                                      </Button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg">
                                                      <button
                                                        type="button"
                                                        onClick={() => setReceiveMode("link")}
                                                        className={cn("py-1 text-[10px] font-bold rounded transition-all", receiveMode === "link" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                                                      >
                                                        Vincular a Extrato
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => setReceiveMode("manual")}
                                                        className={cn("py-1 text-[10px] font-bold rounded transition-all", receiveMode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                                                      >
                                                        Lançamento Manual
                                                      </button>
                                                    </div>

                                                    {receiveMode === "link" ? (
                                                      <div className="space-y-2">
                                                        {unlinkedReceipts.length > 0 ? (
                                                          <>
                                                            <div className="space-y-1">
                                                              <Label className="text-[9px] font-black uppercase text-muted-foreground">Selecione o Lançamento Bancário</Label>
                                                              <select
                                                                value={selectedTxForParcel}
                                                                onChange={e => setSelectedTxForParcel(e.target.value)}
                                                                className="w-full h-8 rounded-lg border border-border/60 bg-background px-2 text-xs font-bold"
                                                              >
                                                                {unlinkedReceipts.map(t => (
                                                                  <option key={t.id} value={t.id}>
                                                                    {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")} - {t.description} ({formatCurrency(t.remainingAmount)})
                                                                  </option>
                                                                ))}
                                                              </select>
                                                            </div>

                                                            <div className="flex justify-end gap-2 pt-1">
                                                              <Button size="sm" variant="ghost" onClick={() => setReceivingParcelId(null)} className="h-7 text-[10px] font-bold">Cancelar</Button>
                                                              <Button size="sm" onClick={() => handleConfirmLinkForParcel(parcel)} className="h-7 bg-emerald-600 text-white font-bold text-[10px]">
                                                                Confirmar Vínculo
                                                              </Button>
                                                            </div>
                                                          </>
                                                        ) : (
                                                          <div className="text-center py-2 text-[10px] text-muted-foreground italic">
                                                            Nenhum depósito bancário livre encontrado. Escolha Lançamento Manual.
                                                          </div>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      <div className="space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                          <div>
                                                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Data Recebimento</Label>
                                                            <Input
                                                              type="date"
                                                              value={paymentDate}
                                                              onChange={e => setPaymentDate(e.target.value)}
                                                              className="h-8 text-xs font-bold bg-background"
                                                            />
                                                          </div>
                                                          <div>
                                                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Conta de Destino</Label>
                                                            <select
                                                              value={destinationAccount}
                                                              onChange={e => setDestinationAccount(e.target.value)}
                                                              className="w-full h-8 rounded-lg border border-border/60 bg-background px-2 text-xs font-bold"
                                                            >
                                                              {contasMovimento.map(acc => (
                                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                              ))}
                                                            </select>
                                                          </div>
                                                        </div>

                                                        <div className="flex justify-end gap-2 pt-1">
                                                          <Button size="sm" variant="ghost" onClick={() => setReceivingParcelId(null)} className="h-7 text-[10px] font-bold">Cancelar</Button>
                                                          <Button size="sm" onClick={() => handleConfirmReceiveManual(parcel)} className="h-7 bg-emerald-600 text-white font-bold text-[10px]">
                                                            Confirmar Pagamento
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="text-center py-6 text-xs text-muted-foreground font-semibold italic">
                                            🎉 Nenhuma parcela pendente. Contrato 100% quitado!
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="recebidos" className="space-y-4 animate-in fade-in duration-300">
                                    <div className="bg-muted/10 border border-border/40 p-4 rounded-2xl space-y-3">
                                      <div className="flex items-center justify-between pb-2 border-b border-border/30">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                          <h5 className="font-black text-xs uppercase tracking-wider text-foreground">
                                            Parcelas Liquidadas ({paidParcels.length})
                                          </h5>
                                        </div>
                                        <Badge className="bg-emerald-500/15 text-emerald-600 border-none font-bold text-[9px]">
                                          Recebido
                                        </Badge>
                                      </div>

                                      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin-custom">
                                        {paidParcels.length > 0 ? (
                                          paidParcels.map((parcel) => {
                                            const isConfirmingUnlink = confirmUnlinkId === parcel.id;

                                            return (
                                              <div 
                                                key={parcel.id} 
                                                className="bg-background border border-border/30 rounded-xl p-3 space-y-2 hover:border-border/60 transition-all"
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-xs text-foreground">
                                                        Parcela {parcel.numeroParcela}/{rec.numeroParcelas}
                                                      </span>
                                                      <Badge className="bg-emerald-500/15 text-emerald-600 border-none text-[8px] font-black uppercase py-0.5">
                                                        Pago
                                                      </Badge>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">
                                                      Recebido em: {parcel.dataPagamento ? new Date(parcel.dataPagamento + "T12:00:00").toLocaleDateString("pt-BR") : "N/D"}
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-3">
                                                    <span className="font-mono text-sm font-black text-emerald-600">
                                                      {formatCurrency(parcel.valorPago || parcel.valorPrevisto)}
                                                    </span>
                                                    {isConfirmingUnlink ? (
                                                      <div className="flex items-center gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => setConfirmUnlinkId(null)} className="h-6 text-[9px] font-bold px-2">
                                                          Não
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleConfirmUnlinkParcel(parcel)} className="h-6 text-[9px] font-bold px-2">
                                                          Estornar
                                                        </Button>
                                                      </div>
                                                    ) : (
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setConfirmUnlinkId(parcel.id)}
                                                        className="rounded-lg h-7 text-muted-foreground hover:text-destructive text-[10px] font-bold px-2 gap-1"
                                                      >
                                                        <RotateCcw className="w-3 h-3" /> Estornar
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="text-center py-6 text-xs text-muted-foreground font-semibold italic">
                                            Nenhuma parcela liquidada até o momento.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>

                                {/* Contract Notes & Footer Actions */}
                                {rec.observacoes && (
                                  <div className="bg-muted/20 border border-border/30 rounded-xl p-3 text-xs font-medium text-muted-foreground flex gap-2">
                                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold text-foreground block mb-0.5">Notas do Recebimento</span>
                                      {rec.observacoes}
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-3 border-t border-border/15 items-center justify-between">
                                  <div className="flex gap-2">
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      size="sm"
                                      className="rounded-xl text-xs font-bold gap-1 text-primary hover:bg-primary/5"
                                      onClick={() => handleStartEdit(rec)}
                                    >
                                      <Edit className="w-3.5 h-3.5" /> Editar
                                    </Button>
                                    <Button 
                                      type="button"
                                      variant="ghost" 
                                      size="sm"
                                      className="rounded-xl text-xs font-bold gap-1 text-destructive hover:bg-destructive/5"
                                      onClick={() => setConfirmDeleteId(rec.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                                    </Button>
                                  </div>
                                </div>

                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Side: Add/Edit Contract or Bank Deposits Sidebar */}
            <div className="lg:col-span-4">
              {isAdding ? (
                <Card className="rounded-[2rem] border border-primary/30 p-5 space-y-5 bg-card shadow-md animate-in slide-in-from-right duration-300">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      {addingType === 'clt' ? <Briefcase className="w-5 h-5 text-emerald-500" /> : <Receipt className="w-5 h-5 text-primary" />}
                      <h3 className="font-display font-black text-sm tracking-tight text-foreground">
                        {addingType === 'clt' 
                          ? (editingContractId ? "Editar Contrato Assalariado" : "Cadastrar Contrato Assalariado")
                          : (editingContractId ? "Editar Recebimento Avulso" : "Cadastrar Novo Recebimento Avulso")}
                      </h3>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-muted-foreground hover:bg-muted" onClick={handleCancelForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {!editingContractId && (
                    <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => setAddingType('recebivel')} 
                        className={cn("py-1.5 text-xs font-bold rounded-lg transition-all", addingType === 'recebivel' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/75")}
                      >
                        Recebimento Avulso
                      </button>
                      <button 
                        type="button"
                        onClick={() => setAddingType('clt')} 
                        className={cn("py-1.5 text-xs font-bold rounded-lg transition-all", addingType === 'clt' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/75")}
                      >
                        Contrato Assalariado
                      </button>
                    </div>
                  )}

                  {addingType === 'clt' ? (
                    <form onSubmit={handleSaveRecebivel} className="space-y-4 text-xs font-semibold">
                      <div className="space-y-3.5">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Empresa / Fonte Pagadora *</Label>
                          <Input 
                            value={cltEmpresa} 
                            onChange={e => setCltEmpresa(e.target.value)} 
                            placeholder="Ex: Google Brasil, Banco Itaú" 
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Data de Admissão *</Label>
                          <Input 
                            type="date" 
                            value={cltAdmissao} 
                            onChange={e => setCltAdmissao(e.target.value)} 
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Início do Controle no Sistema *</Label>
                          <Input 
                            type="date" 
                            value={cltDataInicioControle} 
                            onChange={e => setCltDataInicioControle(e.target.value)} 
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold" 
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-border/15 justify-end">
                        <Button type="button" variant="ghost" onClick={handleCancelForm} className="rounded-xl font-bold h-9 text-xs">Cancelar</Button>
                        <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 h-9 text-xs">
                          {editingContractId ? "Salvar Alterações" : "Confirmar Contrato"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSaveRecebivel} className="space-y-4 text-xs font-semibold">
                      {isEditingAndHasPaidParcels && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-xl text-[10px] leading-relaxed font-bold flex gap-1.5">
                          <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                          <span>Recebimento Travado. Parcelas já pagas impedem alterações de valor e número de parcelas.</span>
                        </div>
                      )}

                      <div className="space-y-3.5">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Identificação do Recebimento *</Label>
                          <Input 
                            value={cliente} 
                            onChange={e => setCliente(e.target.value)} 
                            placeholder="Ex: Orbium Group, Tribunal de Justiça" 
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Categoria do Recebimento</Label>
                          <Input 
                            value={natureza} 
                            onChange={e => setNatureza(e.target.value)} 
                            placeholder="Digite a categoria do serviço (ex: Consultoria, Perícia, etc.)" 
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Valor Total do Recebimento *</Label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50">R$</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={valorTotal} 
                              onChange={e => setValorTotal(e.target.value)} 
                              disabled={isEditingAndHasPaidParcels}
                              placeholder="0.00" 
                              className="h-10 pl-8 rounded-xl border-border/60 bg-muted/20 text-xs font-black disabled:opacity-50" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Número de Parcelas *</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={numParcelas} 
                            onChange={e => setNumParcelas(e.target.value)} 
                            disabled={isEditingAndHasPaidParcels}
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold text-center disabled:opacity-50" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Início dos Vencimentos</Label>
                          <Input 
                            type="date" 
                            value={dataContratacao} 
                            onChange={e => setDataContratacao(e.target.value)} 
                            disabled={isEditingAndHasPaidParcels}
                            className="h-10 rounded-xl border-border/60 bg-muted/20 text-xs font-bold disabled:opacity-50" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Observações</Label>
                          <textarea 
                            value={observacoes} 
                            onChange={e => setObservacoes(e.target.value)} 
                            placeholder="Notas do recebimento..."
                            rows={2}
                            className="flex w-full rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold outline-none text-foreground" 
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-border/15 justify-end">
                        <Button type="button" variant="ghost" onClick={handleCancelForm} className="rounded-xl font-bold h-9 text-xs">Cancelar</Button>
                        <Button type="submit" className="rounded-xl bg-primary text-white font-black px-5 h-9 text-xs">
                          {editingContractId ? "Salvar Alterações" : "Confirmar Recebimento"}
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              ) : (
                <Card className="rounded-[1.8rem] border border-border/40 p-5 space-y-4 shadow-sm bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4.5 h-4.5 text-emerald-500" />
                      <span className="text-sm font-black uppercase tracking-wider text-muted-foreground">Lançamentos Bancários</span>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-xs rounded-full px-2.5 py-0.5">
                      {unlinkedReceipts.length} em aberto
                    </Badge>
                  </div>

                  {unlinkedReceipts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40 p-4">
                      <Landmark className="w-10 h-10 mx-auto opacity-20 mb-2" />
                      <p className="text-xs font-bold text-muted-foreground leading-normal">Tudo reconciliado!</p>
                      <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                        Receitas operacionais lançadas via extrato bancário aparecem aqui para vincular a recebimentos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin-custom">
                      {unlinkedReceipts.map(tx => {
                        const acc = contasMovimento.find(a => a.id === tx.accountId);
                        return (
                          <div 
                            key={tx.id} 
                            className="border border-border/30 rounded-xl p-3 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] border-emerald-500/10 transition-colors space-y-2.5"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-1 min-w-0">
                                <h5 className="font-bold text-xs text-foreground truncate leading-tight" title={tx.description}>
                                  {tx.description}
                                </h5>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                                  <span>{new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                                  <span>•</span>
                                  <span className="truncate">{acc?.name || "Conta"}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-black text-emerald-600 block leading-none">
                                  {formatCurrency(tx.amount)}
                                </span>
                                {tx.linkedAmount > 0 && (
                                  <span className="text-[10px] font-semibold text-muted-foreground block mt-1">Saldo: {formatCurrency(tx.remainingAmount)}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenLinkingForm(tx.id)}
                                className="flex-1 h-8 rounded-lg border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 text-xs font-bold gap-1.5"
                              >
                                <Link2 className="w-3.5 h-3.5" /> Vincular
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleIgnoreTx(tx.id)}
                                title="Ignorar este lançamento"
                                className="h-8 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/5 text-xs font-bold px-2.5 gap-1 shrink-0"
                              >
                                <EyeOff className="w-3.5 h-3.5" /> Ignorar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {ignoredTxIds.length > 0 && (
                    <div className="pt-2.5 border-t border-border/20">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowIgnored(!showIgnored)}
                        className="w-full text-center h-8 text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
                      >
                        {showIgnored ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Ocultar Ignorados ({ignoredTxIds.length})
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Ver Ignorados ({ignoredTxIds.length})
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {showIgnored && ignoredReceipts.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-dashed border-border/20">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Lançamentos Ignorados ({ignoredReceipts.length})</span>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin-custom">
                        {ignoredReceipts.map(tx => {
                          const acc = contasMovimento.find(a => a.id === tx.accountId);
                          return (
                            <div 
                              key={tx.id} 
                              className="border border-dashed border-border/30 rounded-xl p-2.5 bg-muted/5 opacity-75 hover:opacity-100 transition-all space-y-2"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 min-w-0">
                                  <h5 className="font-bold text-[11px] text-foreground truncate leading-tight" title={tx.description}>
                                    {tx.description}
                                  </h5>
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                                    <span>{new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                                    <span>•</span>
                                    <span className="truncate">{acc?.name || "Conta"}</span>
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-black text-muted-foreground shrink-0">
                                  {formatCurrency(tx.amount)}
                                </span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUnignoreTx(tx.id)}
                                className="w-full h-7 rounded-lg text-[10px] font-bold gap-1 text-primary hover:bg-primary/5 p-0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Restaurar para Reconciliação
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
