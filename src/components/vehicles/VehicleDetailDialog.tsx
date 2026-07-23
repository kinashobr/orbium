"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Car,
  Shield,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Edit,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  FileText,
  ArrowLeft,
  Copy,
  Plus,
  Wrench,
  Check,
  CreditCard,
  Trash2,
  Lock,
  Search,
  ExternalLink,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo, TransacaoCompleta, VehicleHistoryItem } from "@/types/finance";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, differenceInMonths, isValid, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Helper function to calculate realistic Brazilian IPVA and Licenciamento estimations based on the license plate
export const getEstimatedIpvaAndDueDate = (placa: string, tipo: 'carro' | 'moto' | 'caminhao', valorFipe: number, anoAtual: number = new Date().getFullYear()) => {
  if (!placa) return { valorIpva: 0, vencimentoIpva: "", valorLicenciamento: 0, vencimentoLicenciamento: "" };
  
  const cleanedPlaca = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleanedPlaca.length < 5) return { valorIpva: 0, vencimentoIpva: "", valorLicenciamento: 0, vencimentoLicenciamento: "" };
  
  const lastChar = cleanedPlaca.charAt(cleanedPlaca.length - 1);
  const lastDigit = parseInt(lastChar, 10);
  
  // IPVA rates standard reference (e.g. SP/RJ/MG): 4% for cars, 2% for bikes, 1.5% for trucks
  let rate = 0.04;
  if (tipo === 'moto') rate = 0.02;
  else if (tipo === 'caminhao') rate = 0.015;
  
  const valorIpva = Math.round(valorFipe * rate * 100) / 100;
  
  // IPVA Vencimento (Jan to Oct according to last digit)
  // 1: Jan, 2: Feb, 3: Mar, 4: Apr, 5: May, 6: Jun, 7: Jul, 8: Aug, 9: Sep, 0: Oct
  let ipvaMonth = 1;
  if (!isNaN(lastDigit)) {
    if (lastDigit === 0) ipvaMonth = 10;
    else ipvaMonth = lastDigit;
  }
  const vencimentoIpva = `${anoAtual}-${String(ipvaMonth).padStart(2, '0')}-15`;

  // Standard licensing fee reference (around R$ 160.00)
  const valorLicenciamento = 160.00;
  
  // Licensing Vencimento (Jul to Dec according to last digit)
  // 1 & 2: Jul, 3 & 4: Aug, 5 & 6: Sep, 7 & 8: Oct, 9: Nov, 0: Dec
  let licMonth = 7;
  if (!isNaN(lastDigit)) {
    if (lastDigit === 1 || lastDigit === 2) licMonth = 7;
    else if (lastDigit === 3 || lastDigit === 4) licMonth = 8;
    else if (lastDigit === 5 || lastDigit === 6) licMonth = 9;
    else if (lastDigit === 7 || lastDigit === 8) licMonth = 10;
    else if (lastDigit === 9) licMonth = 11;
    else if (lastDigit === 0) licMonth = 12;
  }
  const vencimentoLicenciamento = `${anoAtual}-${String(licMonth).padStart(2, '0')}-31`;

  return { valorIpva, vencimentoIpva, valorLicenciamento, vencimentoLicenciamento };
};

interface VehicleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  seguro: SeguroVeiculo | undefined;
  onUpdateFipe: (veiculo: Veiculo) => void;
  onUpdateVeiculo?: (id: number, updates: Partial<Veiculo>) => void;
  onEdit?: (veiculo: Veiculo) => void;
}

export function VehicleDetailDialog({
  open,
  onOpenChange,
  veiculo,
  seguro: initialSeguro,
  onUpdateFipe,
  onUpdateVeiculo,
  onEdit,
}: VehicleDetailDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Acessar dados financeiros reais via context
  const {
    contasMovimento,
    categoriasV2,
    setCategoriasV2,
    transacoesV2,
    setTransacoesV2,
    addTransacaoV2,
    segurosVeiculo,
    addSeguroVeiculo,
    updateSeguroVeiculo,
    updateVeiculo: contextUpdateVeiculo,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid,
    veiculos,
  } = useFinance();

  const handleUpdateVeiculo = onUpdateVeiculo || contextUpdateVeiculo;

  // Estados locais para controle de edição do cadastro completo do veículo
  const [isEditing, setIsEditing] = useState(false);
  const [editModelo, setEditModelo] = useState("");
  const [editMarca, setEditMarca] = useState("");
  const [editTipo, setEditTipo] = useState<'carro' | 'moto' | 'caminhao'>("carro");
  const [editAno, setEditAno] = useState(2020);
  const [editDataCompra, setEditDataCompra] = useState("");
  const [editValorVeiculo, setEditValorVeiculo] = useState(0);
  const [editValorFipe, setEditValorFipe] = useState(0);
  const [editPlaca, setEditPlaca] = useState("");
  const [editRenavam, setEditRenavam] = useState("");
  const [editCrlvDados, setEditCrlvDados] = useState("");

  // Estados locais para obrigações (IPVA & Licenciamento)
  const [editIpvaValor, setEditIpvaValor] = useState(0);
  const [editIpvaVencimento, setEditIpvaVencimento] = useState("");
  const [editLicenciamentoValor, setEditLicenciamentoValor] = useState(0);
  const [editLicenciamentoVencimento, setEditLicenciamentoVencimento] = useState("");

  // Seguro local vinculado ao veículo
  const currentSeguro = useMemo(() => {
    if (!veiculo) return undefined;
    return segurosVeiculo.find(s => s.veiculoId === veiculo.id) || initialSeguro;
  }, [veiculo, segurosVeiculo, initialSeguro]);

  // 1. Histórico de Pontos de FIPE para o Gráfico de Evolução
  const fipePoints = useMemo(() => {
    if (!veiculo || !veiculo.historico) return [];
    
    const points = veiculo.historico
      .filter(h => h.type === "fipe")
      .map(h => ({
        date: h.date,
        dateFormatted: h.date ? format(parseDateLocal(h.date), "dd/MM/yyyy") : "N/A",
        valor: h.amount || 0,
      }));
      
    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [veiculo]);

  const fipeChartData = useMemo(() => {
    if (!veiculo) return [];
    const points = [...fipePoints];
    
    // Sempre adicionar o valor de compra/FIPE original no início se não houver pontos ou como base
    const baseValue = veiculo.valorVeiculo || veiculo.valorFipe || 0;
    const baseDate = veiculo.dataCompra || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 ano atrás
    
    if (points.length === 0 && baseValue > 0) {
      points.push({
        date: baseDate,
        dateFormatted: format(parseDateLocal(baseDate), "dd/MM/yyyy"),
        valor: baseValue,
      });
      // Adicionar o ponto atual
      points.push({
        date: new Date().toISOString(),
        dateFormatted: format(new Date(), "dd/MM/yyyy"),
        valor: veiculo.valorFipe || baseValue,
      });
    } else if (points.length > 0) {
      // Se tiver pontos, colocar o valor de compra no começo se for anterior
      const firstPointDate = new Date(points[0].date);
      const buyDate = new Date(baseDate);
      if (buyDate < firstPointDate && baseValue > 0) {
        points.unshift({
          date: baseDate,
          dateFormatted: format(parseDateLocal(baseDate), "dd/MM/yyyy"),
          valor: baseValue,
        });
      }
    }
    return points;
  }, [fipePoints, veiculo]);

  // Variação da FIPE em percentual e absoluto
  const fipeVariation = useMemo(() => {
    if (!veiculo) return { diff: 0, percent: 0, isUp: true };
    const initialVal = veiculo.valorVeiculo || veiculo.valorFipe || 0;
    const currentVal = veiculo.valorFipe || 0;
    const diff = currentVal - initialVal;
    const percent = initialVal > 0 ? (diff / initialVal) * 100 : 0;
    return {
      diff,
      percent,
      isUp: diff >= 0,
    };
  }, [veiculo]);

  // 2. Histórico e Gasto de Seguros ao longo do tempo
  const segurosDoVeiculo = useMemo(() => {
    if (!veiculo) return [];
    return segurosVeiculo.filter(s => s.veiculoId === veiculo.id);
  }, [segurosVeiculo, veiculo]);

  const totalSeguroContratado = useMemo(() => {
    return segurosDoVeiculo.reduce((acc, s) => acc + (s.valorTotal || 0), 0);
  }, [segurosDoVeiculo]);

  const totalSeguroEfetivamentePago = useMemo(() => {
    return segurosDoVeiculo.reduce((acc, s) => {
      const pagas = (s.parcelas || []).filter(p => p.paga).reduce((pAcc, p) => pAcc + (p.valor || 0), 0);
      return acc + pagas;
    }, 0);
  }, [segurosDoVeiculo]);

  const parcelasSeguroStats = useMemo(() => {
    let pagas = 0;
    let totais = 0;
    segurosDoVeiculo.forEach(s => {
      pagas += (s.parcelas || []).filter(p => p.paga).length;
      totais += (s.parcelas || []).length;
    });
    return { pagas, totais };
  }, [segurosDoVeiculo]);

  // 3. Processamento e Agrupamento das Despesas / Gastos por Categoria
  const despesasAgrupadas = useMemo(() => {
    const grupos: Record<string, { label: string; icon: string; color: string; items: VehicleHistoryItem[]; total: number }> = {
      combustivel: { label: "Combustível", icon: "⛽", color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/30", items: [], total: 0 },
      cosmetico: { label: "Cosméticos & Acessórios", icon: "🛡️", color: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/30", items: [], total: 0 },
      manutencao_periodica: { label: "Manutenções Periódicas", icon: "🔧", color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/30", items: [], total: 0 },
      outros: { label: "Outros Gastos / Taxas", icon: "📝", color: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-900/30", items: [], total: 0 },
    };

    if (!veiculo || !veiculo.historico) return grupos;

    veiculo.historico.forEach(item => {
      if (item.type === "fipe") return;

      let tipo = "outros";
      if (item.meta?.gastoTipo) {
        tipo = item.meta.gastoTipo as string;
      } else {
        const text = `${item.title} ${item.description || ""}`.toLowerCase();
        if (text.includes("combust") || text.includes("gasol") || text.includes("abastec") || text.includes("etanol") || text.includes("diesel") || text.includes("posto")) {
          tipo = "combustivel";
        } else if (text.includes("cosmet") || text.includes("protet") || text.includes("carter") || text.includes("estetic") || text.includes("cera") || text.includes("limpeza") || text.includes("lavagem") || text.includes("capa") || text.includes("acessori")) {
          tipo = "cosmetico";
        } else if (text.includes("oleo") || text.includes("óleo") || text.includes("filtro") || text.includes("pneu") || text.includes("relação") || text.includes("relacao") || text.includes("pastilha") || text.includes("freio") || text.includes("vela") || text.includes("bateria") || text.includes("alinhamento") || item.type === "manutencao") {
          tipo = "manutencao_periodica";
        }
      }

      if (grupos[tipo]) {
        grupos[tipo].items.push(item);
        grupos[tipo].total += item.amount || 0;
      } else {
        grupos.outros.items.push(item);
        grupos.outros.total += item.amount || 0;
      }
    });

    Object.keys(grupos).forEach(key => {
      grupos[key].items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return grupos;
  }, [veiculo]);

  // Estado para cadastro de Novo Seguro
  const [showInsForm, setShowInsForm] = useState(false);
  const [insApolice, setInsApolice] = useState("");
  const [insSeguradora, setInsSeguradora] = useState("");
  const [insInicio, setInsInicio] = useState("");
  const [insFim, setInsFim] = useState("");
  const [insValor, setInsValor] = useState(0);
  const [insParcelas, setInsParcelas] = useState(1);

  // Categorias de busca selecionadas (persiste por veículo)
  const [selectedSearchCategories, setSelectedSearchCategories] = useState<string[]>([]);
  const [showSearchCategories, setShowSearchCategories] = useState(false);

  useEffect(() => {
    if (veiculo) {
      if (veiculo.categoriasDespesasIds && veiculo.categoriasDespesasIds.length > 0) {
        // Garantir que não carregamos categorias excluídas (seguro, imposto, taxa, ipva, licenciamento)
        const filtered = veiculo.categoriasDespesasIds.filter(id => {
          const cat = categoriasV2.find(c => c.id === id);
          if (!cat) return true;
          const lbl = cat.label.toLowerCase();
          return !(lbl.includes('seguro') || lbl.includes('imposto') || lbl.includes('taxa') || lbl.includes('ipva') || lbl.includes('licenciamento'));
        });
        setSelectedSearchCategories(filtered);
      } else {
        // Inicializar com padrões inteligentes baseados em termos comuns de gastos de veículos (exceto seguros/impostos/taxas)
        const defaults = categoriasV2
          .filter(c => c.nature !== 'receita')
          .filter(c => {
            const lbl = c.label.toLowerCase();
            const isSeguroOrTaxa = lbl.includes('seguro') || lbl.includes('imposto') || lbl.includes('taxa') || lbl.includes('ipva') || lbl.includes('licenciamento');
            if (isSeguroOrTaxa) return false;
            return lbl.includes('combust') || 
                   lbl.includes('veíc') || 
                   lbl.includes('veic') || 
                   lbl.includes('manuten') || 
                   lbl.includes('carro') || 
                   lbl.includes('moto') || 
                   lbl.includes('peça') ||
                   lbl.includes('peca') ||
                   lbl.includes('oficina') ||
                   lbl.includes('transp');
          })
          .map(c => c.id);
        setSelectedSearchCategories(defaults);
      }
    }
  }, [veiculo, categoriasV2]);

  const handleToggleSearchCategory = (catId: string) => {
    if (!veiculo) return;
    const isSelected = selectedSearchCategories.includes(catId);
    const updated = isSelected 
      ? selectedSearchCategories.filter(id => id !== catId)
      : [...selectedSearchCategories, catId];
    
    setSelectedSearchCategories(updated);
    handleUpdateVeiculo(veiculo.id, { categoriasDespesasIds: updated });
  };

  // Estados para controle de vinculação / enriquecimento em formato "abre e fecha"
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [allocType, setAllocType] = useState<'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros'>("manutencao_periodica");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocTitle, setAllocTitle] = useState("");
  const [allocDesc, setAllocDesc] = useState("");

  // Metadados adicionais
  const [fuelLitres, setFuelLitres] = useState("");
  const [fuelPricePerLitre, setFuelPricePerLitre] = useState("");
  const [fuelType, setFuelType] = useState<string>("gasolina_comum");

  const [cosmeticProtectionType, setCosmeticProtectionType] = useState("");
  const [cosmeticBrand, setCosmeticBrand] = useState("");

  const [maintPart, setMaintPart] = useState("");
  const [maintKm, setMaintKm] = useState("");
  const [maintEstablishment, setMaintEstablishment] = useState("");

  // Calcular valores já alocados do veículo por transação do financeiro
  const allocatedAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    if (!veiculo || !veiculo.historico) return map;
    
    veiculo.historico.forEach(h => {
      if (h.meta?.transactionId) {
        const txId = String(h.meta.transactionId);
        map[txId] = (map[txId] || 0) + (h.amount || 0);
      }
    });
    return map;
  }, [veiculo]);

  // Transações potenciais pendentes de classificação para o veículo
  const pendingTransactions = useMemo(() => {
    if (!veiculo || !transacoesV2) return [];
    
    return transacoesV2
      .filter(tx => {
        const isExpense = tx.flow === 'out';
        if (!isExpense) return false;

        // Não mostrar lançamentos de "seguro" e "impostos e taxas"
        if (tx.categoryId) {
          const cat = categoriasV2.find(c => c.id === tx.categoryId);
          if (cat) {
            const lbl = cat.label.toLowerCase();
            if (lbl.includes('seguro') || lbl.includes('imposto') || lbl.includes('taxa') || lbl.includes('ipva') || lbl.includes('licenciamento')) {
              return false;
            }
          }
        }

        const descLower = (tx.description || "").toLowerCase();
        
        // Evitar falsos positivos com seguros e impostos na busca descritiva
        if (descLower.includes('seguro') || descLower.includes('ipva') || descLower.includes('licenciamento') || descLower.includes('dpvat')) {
          return false;
        }

        const matchesCategory = tx.categoryId ? selectedSearchCategories.includes(tx.categoryId) : false;
        
        const matchesPlate = veiculo.placa 
          ? descLower.includes(veiculo.placa.toLowerCase().replace("-", "").trim()) || descLower.includes(veiculo.placa.toLowerCase().trim())
          : false;
        const matchesModel = veiculo.modelo 
          ? descLower.includes(veiculo.modelo.toLowerCase().trim())
          : false;

        return matchesCategory || matchesPlate || matchesModel;
      })
      .map(tx => {
        const allocated = allocatedAmounts[tx.id] || 0;
        const pendingAmount = Math.max(0, tx.amount - allocated);
        return {
          ...tx,
          allocatedAmount: allocated,
          pendingAmount: Number(pendingAmount.toFixed(2)),
        };
      })
      .filter(tx => tx.pendingAmount > 0.01)
      .sort((a, b) => {
        const catA = categoriasV2.find(c => c.id === a.categoryId)?.label || "Sem Categoria";
        const catB = categoriasV2.find(c => c.id === b.categoryId)?.label || "Sem Categoria";
        const comp = catA.localeCompare(catB, 'pt-BR');
        if (comp !== 0) return comp;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [veiculo, transacoesV2, selectedSearchCategories, allocatedAmounts, categoriasV2]);

  const handleSelectPendingTx = (tx: any) => {
    if (expandedTxId === tx.id) {
      setExpandedTxId(null);
      return;
    }

    setExpandedTxId(tx.id);
    
    // Auto-preenchimento inteligente
    setAllocAmount(tx.pendingAmount.toFixed(2).replace(".", ","));
    setAllocTitle(tx.description);
    setAllocDesc("");
    
    const text = `${tx.description} ${tx.meta?.notes || ""}`.toLowerCase();
    let detectedType: 'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros' = "outros";
    
    if (text.includes("combust") || text.includes("gasol") || text.includes("abastec") || text.includes("etanol") || text.includes("diesel") || text.includes("posto")) {
      detectedType = "combustivel";
      setAllocTitle("Abastecimento");
    } else if (text.includes("cosmet") || text.includes("protet") || text.includes("carter") || text.includes("estetic") || text.includes("cera") || text.includes("limpeza") || text.includes("lavagem") || text.includes("capa") || text.includes("acessori")) {
      detectedType = "cosmetico";
    } else if (text.includes("oleo") || text.includes("óleo") || text.includes("filtro") || text.includes("pneu") || text.includes("relação") || text.includes("relacao") || text.includes("pastilha") || text.includes("freio") || text.includes("vela") || text.includes("bateria") || text.includes("alinhamento") || text.includes("oficina") || text.includes("mecanic") || text.includes("manuten")) {
      detectedType = "manutencao_periodica";
    }
    
    setAllocType(detectedType);
    
    // Resetar campos específicos
    setFuelLitres("");
    setFuelPricePerLitre("");
    setFuelType("gasolina_comum");
    setCosmeticProtectionType("");
    setCosmeticBrand("");
    setMaintPart("");
    setMaintKm("");
    setMaintEstablishment("");
  };

  const handleSaveAllocation = (tx: any) => {
    const amount = parseFloat(allocAmount.replace(/\./g, "").replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Por favor, digite um valor válido.");
      return;
    }
    
    if (amount > tx.pendingAmount + 0.01) {
      toast.error(`O valor alocado (R$ ${amount.toFixed(2)}) não pode ser maior que o valor pendente (R$ ${tx.pendingAmount.toFixed(2)}).`);
      return;
    }

    if (!allocTitle.trim()) {
      toast.error("Por favor, informe o título do item.");
      return;
    }

    const meta: Record<string, unknown> = {
      transactionId: tx.id,
      gastoTipo: allocType,
      accountId: tx.accountId,
      categoryId: tx.categoryId,
    };

    if (allocType === "combustivel") {
      meta.litros = fuelLitres ? parseFloat(fuelLitres.replace(",", ".")) : undefined;
      meta.precoLitro = fuelPricePerLitre ? parseFloat(fuelPricePerLitre.replace(",", ".")) : undefined;
      meta.tipoCombustivel = fuelType;
    } else if (allocType === "cosmetico") {
      meta.protecaoTipo = cosmeticProtectionType || undefined;
      meta.marca = cosmeticBrand || undefined;
    } else if (allocType === "manutencao_periodica") {
      meta.pecaServico = maintPart || undefined;
      meta.kmAtual = maintKm ? parseInt(maintKm, 10) : undefined;
      meta.estabelecimento = maintEstablishment || undefined;
    }

    const historyItem: VehicleHistoryItem = {
      id: `vh_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: allocType === 'manutencao_periodica' ? 'manutencao' : 'despesa',
      date: tx.date,
      title: allocTitle,
      description: allocDesc || undefined,
      amount: amount,
      meta: meta,
    };

    const updatedHistory = [...(veiculo.historico || []), historyItem];
    handleUpdateVeiculo(veiculo.id, { historico: updatedHistory });
    
    toast.success("Lançamento vinculado e categorizado com sucesso!");
    setExpandedTxId(null);
  };

  // Estado para controle de expansão dos grupos de despesas
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    combustivel: true,
    cosmetico: true,
    manutencao_periodica: true,
    outros: false,
  });

  // Estado para Pagamento de Obrigações (IPVA / Licenciamento)
  const [payObligationType, setPayObligationType] = useState<'ipva' | 'licenciamento' | null>(null);
  const [payAccountId, setPayAccountId] = useState("");
  const [payCategoryId, setPayCategoryId] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payAmount, setPayAmount] = useState(0);

  // Verificar se existe a categoria 'Impostos e Taxas'
  const impostosCategory = useMemo(() => {
    return categoriasV2.find(c => {
      const name = c.label.toLowerCase();
      return name === 'impostos e taxas' || 
             name === 'impostos & taxas' || 
             name === 'impostos' || 
             name === 'taxas e impostos';
    });
  }, [categoriasV2]);

  // Função para criar a categoria automaticamente se o usuário desejar
  const handleCreateImpostosCategory = () => {
    const newCat = {
      id: `cat_impostos_${Date.now()}`,
      label: 'Impostos e Taxas',
      icon: '🧾',
      nature: 'despesa_variavel' as const,
      type: 'expense' as const
    };
    setCategoriasV2(prev => [...prev, newCat]);
    setPayCategoryId(newCat.id);
    toast.success("Categoria 'Impostos e Taxas' cadastrada com sucesso e selecionada!");
  };

  // Efeito para preencher automaticamente a categoria 'Impostos e Taxas' se encontrada ao abrir o pagamento de IPVA/Licenciamento
  useEffect(() => {
    if (payObligationType) {
      if (impostosCategory) {
        setPayCategoryId(impostosCategory.id);
      } else {
        // Fallback default
        const defaultCat = categoriasV2.find(c => 
          c.label.toLowerCase().includes('veículo') || 
          c.label.toLowerCase().includes('veiculo') ||
          c.label.toLowerCase().includes('manutenção') ||
          c.label.toLowerCase().includes('combustível')
        ) || categoriasV2[0];
        if (defaultCat) {
          setPayCategoryId(defaultCat.id);
        }
      }
    }
  }, [payObligationType, impostosCategory, categoriasV2]);

  // Verificar se há transações de IPVA ou Licenciamento já lançadas no fluxo para o veículo atual
  const existingIpvaTx = useMemo(() => {
    if (!veiculo || !transacoesV2) return null;
    const plateClean = veiculo.placa ? veiculo.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const modelClean = veiculo.modelo ? veiculo.modelo.toLowerCase().trim() : "";
    const listVeiculos = veiculos || [];
    
    return transacoesV2.find(t => {
      if (t.flow !== "out") return false;
      
      const desc = (t.description || "").toUpperCase();
      const hasIpvaText = desc.includes("IPVA");
      if (!hasIpvaText) return false;
      
      // 1. Verificação por metadados diretos do veículo
      const matchesAsset = t.meta?.assetType === "veiculo" && String(t.meta?.assetId) === String(veiculo.id);
      if (matchesAsset) return true;
      
      // 2. Verificação por texto (placa ou modelo + IPVA)
      const descCleaned = desc.replace(/[^A-Z0-9]/g, "");
      const matchesPlate = plateClean && descCleaned.includes(plateClean);
      const matchesModel = modelClean && desc.toLowerCase().includes(modelClean);
      
      if (matchesPlate || matchesModel) {
        return true;
      }
      
      // 3. Verificar se menciona outro veículo especificamente
      const otherVehicles = listVeiculos.filter(v => v.id !== veiculo.id);
      const mentionsOtherVehicle = otherVehicles.some(ov => {
        const ovPlate = ov.placa ? ov.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        const ovModel = ov.modelo ? ov.modelo.toLowerCase().trim() : "";
        const ovPlateMatch = ovPlate && descCleaned.includes(ovPlate);
        const ovModelMatch = ovModel && desc.toLowerCase().includes(ovModel);
        return ovPlateMatch || ovModelMatch;
      });
      
      if (mentionsOtherVehicle) {
        return false;
      }
      
      // 4. Se não menciona nenhum outro veículo, e a descrição tem "IPVA", é um match genérico aceitável
      return true;
    });
  }, [veiculo, transacoesV2, veiculos]);

  const existingLicTx = useMemo(() => {
    if (!veiculo || !transacoesV2) return null;
    const plateClean = veiculo.placa ? veiculo.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const modelClean = veiculo.modelo ? veiculo.modelo.toLowerCase().trim() : "";
    const listVeiculos = veiculos || [];
    
    return transacoesV2.find(t => {
      if (t.flow !== "out") return false;
      
      const desc = (t.description || "").toUpperCase();
      const hasLicText = desc.includes("LICENCIAMENTO") || desc.includes("LICENCIAR") || desc.includes("LICENC");
      if (!hasLicText) return false;
      
      // 1. Verificação por metadados diretos do veículo
      const matchesAsset = t.meta?.assetType === "veiculo" && String(t.meta?.assetId) === String(veiculo.id);
      if (matchesAsset) return true;
      
      // 2. Verificação por texto (placa ou modelo + Licenciamento)
      const descCleaned = desc.replace(/[^A-Z0-9]/g, "");
      const matchesPlate = plateClean && descCleaned.includes(plateClean);
      const matchesModel = modelClean && desc.toLowerCase().includes(modelClean);
      
      if (matchesPlate || matchesModel) {
        return true;
      }
      
      // 3. Verificar se menciona outro veículo especificamente
      const otherVehicles = listVeiculos.filter(v => v.id !== veiculo.id);
      const mentionsOtherVehicle = otherVehicles.some(ov => {
        const ovPlate = ov.placa ? ov.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        const ovModel = ov.modelo ? ov.modelo.toLowerCase().trim() : "";
        const ovPlateMatch = ovPlate && descCleaned.includes(ovPlate);
        const ovModelMatch = ovModel && desc.toLowerCase().includes(ovModel);
        return ovPlateMatch || ovModelMatch;
      });
      
      if (mentionsOtherVehicle) {
        return false;
      }
      
      // 4. Se não menciona nenhum outro veículo, e a descrição tem "LICENCIAMENTO", é um match genérico aceitável
      return true;
    });
  }, [veiculo, transacoesV2, veiculos]);

  // Verificar se há lançamentos automáticos durante a edição com os inputs do formulário
  const editIpvaTxFound = useMemo(() => {
    if (!editPlaca && !editModelo) return null;
    const plateClean = editPlaca ? editPlaca.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const modelClean = editModelo ? editModelo.toLowerCase().trim() : "";
    const listVeiculos = veiculos || [];
    
    return transacoesV2.find(t => {
      if (t.flow !== "out") return false;
      const desc = (t.description || "").toUpperCase();
      const hasIpvaText = desc.includes("IPVA");
      if (!hasIpvaText) return false;
      
      const descCleaned = desc.replace(/[^A-Z0-9]/g, "");
      const matchesPlate = plateClean && descCleaned.includes(plateClean);
      const matchesModel = modelClean && desc.toLowerCase().includes(modelClean);
      
      if (matchesPlate || matchesModel) {
        return true;
      }
      
      // Se não houver correspondência estrita com este carro, mas também não mencionar outro carro
      const otherVehicles = listVeiculos.filter(v => {
        if (veiculo) return v.id !== veiculo.id;
        return true;
      });
      const mentionsOtherVehicle = otherVehicles.some(ov => {
        const ovPlate = ov.placa ? ov.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        const ovModel = ov.modelo ? ov.modelo.toLowerCase().trim() : "";
        const ovPlateMatch = ovPlate && descCleaned.includes(ovPlate);
        const ovModelMatch = ovModel && desc.toLowerCase().includes(ovModel);
        return ovPlateMatch || ovModelMatch;
      });
      
      if (mentionsOtherVehicle) return false;
      
      return true;
    });
  }, [editPlaca, editModelo, transacoesV2, veiculos, veiculo]);

  const editLicTxFound = useMemo(() => {
    if (!editPlaca && !editModelo) return null;
    const plateClean = editPlaca ? editPlaca.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const modelClean = editModelo ? editModelo.toLowerCase().trim() : "";
    const listVeiculos = veiculos || [];
    
    return transacoesV2.find(t => {
      if (t.flow !== "out") return false;
      const desc = (t.description || "").toUpperCase();
      const hasLicText = desc.includes("LICENCIAMENTO") || desc.includes("LICENCIAR") || desc.includes("LICENC");
      if (!hasLicText) return false;
      
      const descCleaned = desc.replace(/[^A-Z0-9]/g, "");
      const matchesPlate = plateClean && descCleaned.includes(plateClean);
      const matchesModel = modelClean && desc.toLowerCase().includes(modelClean);
      
      if (matchesPlate || matchesModel) {
        return true;
      }
      
      // Se não houver correspondência estrita com este carro, mas também não mencionar outro carro
      const otherVehicles = listVeiculos.filter(v => {
        if (veiculo) return v.id !== veiculo.id;
        return true;
      });
      const mentionsOtherVehicle = otherVehicles.some(ov => {
        const ovPlate = ov.placa ? ov.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
        const ovModel = ov.modelo ? ov.modelo.toLowerCase().trim() : "";
        const ovPlateMatch = ovPlate && descCleaned.includes(ovPlate);
        const ovModelMatch = ovModel && desc.toLowerCase().includes(ovModel);
        return ovPlateMatch || ovModelMatch;
      });
      
      if (mentionsOtherVehicle) return false;
      
      return true;
    });
  }, [editPlaca, editModelo, transacoesV2, veiculos, veiculo]);

  // Sincronização automática: se detectar transação no fluxo de caixa, atualiza o status do veículo
  useEffect(() => {
    if (!veiculo) return;
    
    const updates: Partial<typeof veiculo> = {};
    const listVeiculos = veiculos || [];
    const isSingleVehicle = listVeiculos.length <= 1;
    
    if (existingIpvaTx && !veiculo.ipvaPago) {
      const desc = (existingIpvaTx.description || "").toUpperCase();
      const descCleaned = desc.replace(/[^A-Z0-9]/g, "");
      const plateClean = veiculo.placa ? veiculo.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      const modelClean = veiculo.modelo ? veiculo.modelo.toLowerCase().trim() : "";
      
      const isStrictMatch = 
        (existingIpvaTx.meta?.assetType === "veiculo" && String(existingIpvaTx.meta?.assetId) === String(veiculo.id)) ||
        (plateClean && descCleaned.includes(plateClean)) ||
        (modelClean && desc.toLowerCase().includes(modelClean));
        
      if (isStrictMatch || isSingleVehicle) {
        updates.ipvaPago = true;
        if (!veiculo.ipvaValor) updates.ipvaValor = existingIpvaTx.amount;
        if (!veiculo.ipvaVencimento) updates.ipvaVencimento = existingIpvaTx.date;
        if (!veiculo.ipvaContaId) updates.ipvaContaId = existingIpvaTx.accountId;
        if (!veiculo.ipvaCategoriaId) updates.ipvaCategoriaId = existingIpvaTx.categoryId || undefined;
      }
    }
    
    if (existingLicTx && !veiculo.licenciamentoPago) {
      const desc = (existingLicTx.description || "").toUpperCase();
      const descCleaned = desc.replace(/[^A-Z0-9]/g, "");
      const plateClean = veiculo.placa ? veiculo.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      const modelClean = veiculo.modelo ? veiculo.modelo.toLowerCase().trim() : "";
      
      const isStrictMatch = 
        (existingLicTx.meta?.assetType === "veiculo" && String(existingLicTx.meta?.assetId) === String(veiculo.id)) ||
        (plateClean && descCleaned.includes(plateClean)) ||
        (modelClean && desc.toLowerCase().includes(modelClean));
        
      if (isStrictMatch || isSingleVehicle) {
        updates.licenciamentoPago = true;
        if (!veiculo.licenciamentoValor) updates.licenciamentoValor = existingLicTx.amount;
        if (!veiculo.licenciamentoVencimento) updates.licenciamentoVencimento = existingLicTx.date;
        if (!veiculo.licenciamentoContaId) updates.licenciamentoContaId = existingLicTx.accountId;
        if (!veiculo.licenciamentoCategoriaId) updates.licenciamentoCategoriaId = existingLicTx.categoryId || undefined;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      handleUpdateVeiculo(veiculo.id, updates);
      toast.success(`Pagamento de ${updates.ipvaPago ? "IPVA" : ""}${updates.ipvaPago && updates.licenciamentoPago ? " e " : ""}${updates.licenciamentoPago ? "Licenciamento" : ""} reconciliado automaticamente com o fluxo de caixa!`);
    }
  }, [veiculo, existingIpvaTx, existingLicTx, handleUpdateVeiculo, veiculos]);

  const initialSize = useMemo(() => {
    if (typeof window === "undefined") return { width: 1100, height: 820 };
    return {
      width: Math.max(900, Math.round(window.innerWidth * 0.7)),
      height: Math.max(650, Math.round(window.innerHeight * 0.82)),
    };
  }, []);

  const ContentComponent = isMobile ? DialogContent : ResizableDialogContent;
  const contentProps = isMobile
    ? {
        hideCloseButton: true,
        fullscreen: true,
      }
    : {
        storageKey: "vehicle_detail_dialog_size_v1",
        initialWidth: initialSize.width,
        initialHeight: initialSize.height,
        minWidth: 900,
        minHeight: 650,
        hideCloseButton: true,
      };

  // Inicializar estados de edição quando o veículo muda
  useEffect(() => {
    if (veiculo) {
      setEditModelo(veiculo.modelo || "");
      setEditMarca(veiculo.marca || "");
      setEditTipo(veiculo.tipo || "carro");
      setEditAno(veiculo.ano || new Date().getFullYear());
      setEditDataCompra(veiculo.dataCompra || "");
      setEditValorVeiculo(veiculo.valorVeiculo || 0);
      setEditValorFipe(veiculo.valorFipe || 0);
      setEditPlaca(veiculo.placa || "");
      setEditRenavam(veiculo.renavam || "");
      setEditCrlvDados(veiculo.crlvDados || "");

      setEditIpvaValor(veiculo.ipvaValor || 0);
      setEditIpvaVencimento(veiculo.ipvaVencimento || "");
      setEditLicenciamentoValor(veiculo.licenciamentoValor || 0);
      setEditLicenciamentoVencimento(veiculo.licenciamentoVencimento || "");
      
      setIsEditing(false);
      setShowInsForm(false);
      setPayObligationType(null);
    }
  }, [veiculo]);

  // Carregar conta e categoria padrão de despesa de veículos
  useEffect(() => {
    if (contasMovimento.length > 0 && !payAccountId) {
      const firstAcc = contasMovimento.find(c => !c.hidden && c.accountType === 'corrente') || contasMovimento[0];
      setPayAccountId(firstAcc.id);
    }
    if (categoriasV2.length > 0 && !payCategoryId) {
      const defaultCat = categoriasV2.find(c => 
        c.label.toLowerCase().includes('veículo') || 
        c.label.toLowerCase().includes('veiculo') ||
        c.label.toLowerCase().includes('manutenção') ||
        c.label.toLowerCase().includes('combustível')
      ) || categoriasV2[0];
      setPayCategoryId(defaultCat.id);
    }
  }, [contasMovimento, categoriasV2, payAccountId, payCategoryId]);

  const mesesPropriedade = useMemo(() => {
    if (!veiculo?.dataCompra) return 0;
    try {
      return differenceInMonths(new Date(), parseDateLocal(veiculo.dataCompra));
    } catch {
      return 0;
    }
  }, [veiculo?.dataCompra]);

  const depreciacaoEstimada = useMemo(() => {
    if (!veiculo) return 0;
    const valorCompra = veiculo.valorVeiculo || veiculo.valorFipe || 0;
    const valorAtual = veiculo.valorFipe || 0;
    if (valorCompra === 0) return 0;
    return ((valorCompra - valorAtual) / valorCompra) * 100;
  }, [veiculo]);

  const seguroStatus = useMemo(() => {
    if (!currentSeguro || !currentSeguro.parcelas) {
      return { status: 'sem_seguro', label: 'Sem Seguro Ativo', color: 'destructive' };
    }
    const parcelasPagas = currentSeguro.parcelas.filter(p => p.paga).length;
    const totalParcelas = currentSeguro.numeroParcelas || currentSeguro.parcelas.length;
    const vigenciaFim = currentSeguro.vigenciaFim ? parseDateLocal(currentSeguro.vigenciaFim) : null;
    const hoje = new Date();
    
    if (vigenciaFim && vigenciaFim < hoje) {
      return { status: 'vencido', label: 'Vigência Expirada', color: 'destructive' };
    }
    
    const parcelasVencidas = currentSeguro.parcelas.filter(
      p => !p.paga && p.vencimento && parseDateLocal(p.vencimento) < hoje
    ).length;
    
    if (parcelasVencidas > 0) {
      return { status: 'atrasado', label: `${parcelasVencidas} parcela(s) em atraso`, color: 'warning' };
    }
    
    return { status: 'em_dia', label: `Seguro Ativo • ${parcelasPagas}/${totalParcelas} pagas`, color: 'success' };
  }, [currentSeguro]);

  if (!veiculo) return null;

  // Handler para Salvar as Alterações Completas
  const handleSaveCadastro = () => {
    if (!editModelo.trim()) {
      toast.error("O modelo do veículo é obrigatório");
      return;
    }

    handleUpdateVeiculo(veiculo.id, {
      modelo: editModelo,
      marca: editMarca,
      tipo: editTipo,
      ano: Number(editAno),
      dataCompra: editDataCompra,
      valorVeiculo: Number(editValorVeiculo),
      valorFipe: Number(editValorFipe),
      placa: editPlaca.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      renavam: editRenavam.replace(/\D/g, ""),
      crlvDados: editCrlvDados,
      ipvaValor: Number(editIpvaValor),
      ipvaVencimento: editIpvaVencimento,
      licenciamentoValor: Number(editLicenciamentoValor),
      licenciamentoVencimento: editLicenciamentoVencimento,
    });

    toast.success("Cadastro do veículo atualizado com sucesso!");
    setIsEditing(false);
  };

  // Handler para Cadastrar Seguro
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
    
    // Atualizar no veículo o valor do seguro
    handleUpdateVeiculo(veiculo.id, {
      valorSeguro: totalSeg,
      vencimentoSeguro: insFim,
      parcelaSeguro: parseFloat(valorParcela.toFixed(2)),
    });

    toast.success("Seguro cadastrado com sucesso!");
    setShowInsForm(false);
  };

  // Excluir item de histórico e liberar transação vinculada do ledger
  const handleDeleteHistoryItem = (itemId: string) => {
    if (!veiculo) return;
    const item = veiculo.historico?.find(h => h.id === itemId);
    if (!item) return;

    if (item.meta?.transactionId) {
      const txId = item.meta.transactionId as string;
      if (txId.startsWith("tx_veh_")) {
        // Excluir a transação do ledger se ela foi criada pelo sistema de despesas antigas direto do modal
        setTransacoesV2(prev => prev.filter(t => t.id !== txId));
      }
    }

    const updatedHistory = (veiculo.historico || []).filter(h => h.id !== itemId);
    handleUpdateVeiculo(veiculo.id, { historico: updatedHistory });
    toast.success("Vínculo excluído! O lançamento voltou a ficar disponível para categorização.");
  };

  // Handler para Registrar Pagamento de Obrigação (IPVA ou Licenciamento)
  const handlePayObligation = () => {
    if (!payAccountId) {
      toast.error("Selecione a conta para pagamento");
      return;
    }

    const label = payObligationType === 'ipva' ? "IPVA" : "Licenciamento";
    const transID = `tx_obl_${Date.now()}`;
    const descReal = `🚦 Pgto ${label}: ${veiculo.modelo}`;

    // 1. Criar transação real
    const newTx: Omit<TransacaoCompleta, "id"> = {
      date: payDate,
      accountId: payAccountId,
      flow: "out",
      operationType: "despesa",
      domain: "asset",
      amount: payAmount,
      categoryId: payCategoryId || null,
      description: descReal,
      links: {
        investmentId: null,
        loanId: null,
        transferGroupId: null,
        parcelaId: null,
        vehicleTransactionId: null,
      },
      conciliated: true,
      attachments: [],
      meta: {
        createdBy: "gabrielschimtez@gmail.com",
        source: "manual",
        createdAt: new Date().toISOString(),
        assetType: "veiculo",
        assetId: veiculo.id,
      },
    };

    addTransacaoV2({ ...newTx, id: transID });

    // 2. Registrar no veículo
    const historyItem: VehicleHistoryItem = {
      id: `vh_obl_${Date.now()}`,
      type: "despesa",
      date: payDate,
      title: `Obrigação • ${label} Pago`,
      description: `Pago via conta: ${contasMovimento.find(c => c.id === payAccountId)?.name || "N/A"}`,
      amount: payAmount,
      meta: {
        transactionId: transID,
        obligationType: payObligationType,
      }
    };

    const updatedHistory = [...(veiculo.historico || []), historyItem];
    
    if (payObligationType === 'ipva') {
      handleUpdateVeiculo(veiculo.id, {
        ipvaPago: true,
        ipvaContaId: payAccountId,
        ipvaCategoriaId: payCategoryId,
        historico: updatedHistory
      });
    } else {
      handleUpdateVeiculo(veiculo.id, {
        licenciamentoPago: true,
        licenciamentoContaId: payAccountId,
        licenciamentoCategoriaId: payCategoryId,
        historico: updatedHistory
      });
    }

    toast.success(`${label} registrado como pago! Transação criada na conta.`);
    setPayObligationType(null);
  };

  // Handler para marcar parcela de seguro como paga direto pelo modal
  const handlePayInsuranceParcel = (parcelaNumero: number, valor: number, vencimento: string) => {
    if (currentSeguro) {
      const transID = `tx_seg_${Date.now()}`;
      const descReal = `🛡️ Parcela Seguro ${parcelaNumero}/${currentSeguro.numeroParcelas} - ${veiculo.modelo}`;

      // Encontrar ou default de conta e categoria
      const accountId = payAccountId || contasMovimento[0]?.id;
      const categoryId = payCategoryId || categoriasV2.find(c => c.id === 'cat_seguro')?.id || null;

      // 1. Criar transação
      const newTx: TransacaoCompleta = {
        id: transID,
        date: format(new Date(), "yyyy-MM-dd"),
        accountId: accountId,
        flow: "out",
        operationType: "despesa",
        domain: "asset",
        amount: valor,
        categoryId: categoryId,
        description: descReal,
        links: {
          investmentId: null,
          loanId: null,
          transferGroupId: null,
          parcelaId: null,
          vehicleTransactionId: null,
        },
        conciliated: true,
        attachments: [],
        meta: {
          createdBy: "gabrielschimtez@gmail.com",
          source: "manual",
          createdAt: new Date().toISOString(),
          assetType: "veiculo",
          assetId: veiculo.id,
        },
      };

      addTransacaoV2(newTx);

      // 2. Atualizar seguro
      markSeguroParcelPaid(currentSeguro.id, parcelaNumero, transID);

      // 3. Adicionar ao histórico do veículo
      const historyItem: VehicleHistoryItem = {
        id: `vh_seg_pay_${Date.now()}`,
        type: "despesa",
        date: format(new Date(), "yyyy-MM-dd"),
        title: `Seguro • Parcela ${parcelaNumero} Paga`,
        description: `Vencimento original: ${format(parseDateLocal(vencimento), "dd/MM/yyyy")}`,
        amount: valor,
        meta: {
          transactionId: transID,
          seguroId: currentSeguro.id,
          parcelaNumero
        }
      };

      const updatedHistory = [...(veiculo.historico || []), historyItem];
      handleUpdateVeiculo(veiculo.id, { historico: updatedHistory });

      toast.success(`Parcela ${parcelaNumero} paga com sucesso! Transação lançada.`);
    }
  };

  // Handler para desmarcar parcela de seguro como paga
  const handleUnpayInsuranceParcel = (parcelaNumero: number) => {
    if (currentSeguro) {
      unmarkSeguroParcelPaid(currentSeguro.id, parcelaNumero);
      toast.success(`Pagamento da parcela ${parcelaNumero} cancelado.`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ContentComponent
        {...contentProps}
        className={cn(
          "p-0 shadow-2xl bg-gradient-to-b from-card to-background flex flex-col transition-all duration-300",
          !isMobile && "rounded-[2.5rem]"
        )}
      >
        <DialogTitle className="sr-only">
          {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : "Detalhes do Veículo"}
        </DialogTitle>

        {/* TOP BAR COMPACTA E MINIMALISTA */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b bg-card/50 shrink-0 select-none gap-4"
          style={isMobile ? { paddingTop: "calc(env(safe-area-inset-top) + 1rem)" } : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0",
              veiculo.tipo === 'moto' 
                ? "bg-gradient-to-tr from-orange-500 to-red-600"
                : "bg-gradient-to-tr from-blue-500 to-indigo-600"
            )}>
              {veiculo.tipo === 'moto' ? (
                <MotorcycleIcon className="w-12 h-12" />
              ) : (
                <Car className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black tracking-tight text-foreground truncate">
                  {veiculo.modelo}
                </span>
                <Badge className={cn(
                  "font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md",
                  veiculo.tipo === 'moto' 
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" 
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                )}>
                  {veiculo.tipo === 'moto' ? "MOTO" : veiculo.tipo === 'caminhao' ? "CAMINHÃO" : "CARRO"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-muted-foreground truncate">
                <span className="uppercase">{veiculo.marca || "N/A"}</span>
                <span className="opacity-40">•</span>
                <span>Ano {veiculo.ano}</span>
                {veiculo.placa && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[9px] text-foreground font-black tracking-wider">{veiculo.placa}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={isEditing ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-full h-8 px-4 font-black text-[10px] gap-1.5"
            >
              {isEditing ? (
                <>CANCELAR</>
              ) : (
                <>
                  <Edit className="w-3.5 h-3.5" /> EDITAR
                </>
              )}
            </Button>
            
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* CORPO DE TABS */}
        <Tabs defaultValue="resumo" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-muted/10 h-12 border-b rounded-none px-6 sm:px-8 gap-6 justify-start">
            <TabsTrigger value="resumo" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest">
              RESUMO COCKPIT
            </TabsTrigger>
            <TabsTrigger value="seguro" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest">
              SEGURO DETALHADO
            </TabsTrigger>
            <TabsTrigger value="despesas" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest">
              OBRIGAÇÕES & DESPESAS
            </TabsTrigger>
            <TabsTrigger value="editar" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest hidden">
              EDITAR
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 scrollbar-material">
            <div className="p-6 sm:p-8 space-y-8 pb-12">
              
              {/* TELA DE EDICÃO EM OVERLAY OU INTEGRADA SE EM MODO EDIÇÃO */}
              {isEditing ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-muted/10 border-2 border-dashed border-muted p-6 rounded-[2rem] space-y-6">
                    <h3 className="font-black text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                      <Edit className="w-4 h-4" /> EDITAR DADOS COMPLETOS DO BEM
                    </h3>

                    {/* DADOS BÁSICOS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modelo</Label>
                        <Input value={editModelo} onChange={e => setEditModelo(e.target.value)} placeholder="Ex: Hornet CB 600F" className="h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Marca</Label>
                        <Input value={editMarca} onChange={e => setEditMarca(e.target.value)} placeholder="Ex: Honda" className="h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Veículo</Label>
                        <Select value={editTipo} onValueChange={(v: 'carro' | 'moto' | 'caminhao') => setEditTipo(v)}>
                          <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="carro" className="font-bold">Carro</SelectItem>
                            <SelectItem value="moto" className="font-bold">Moto</SelectItem>
                            <SelectItem value="caminhao" className="font-bold">Caminhão</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* MAIS DETALHES CADASTRAIS */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ano Modelo</Label>
                        <Input type="number" value={editAno} onChange={e => setEditAno(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Compra</Label>
                        <Input type="date" value={editDataCompra} onChange={e => setEditDataCompra(e.target.value)} className="h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Compra (R$)</Label>
                        <Input type="number" value={editValorVeiculo} onChange={e => setEditValorVeiculo(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor FIPE Manual (R$)</Label>
                        <Input type="number" value={editValorFipe} onChange={e => setEditValorFipe(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                      </div>
                    </div>

                    {/* PLACA, RENAVAM, CRLV */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">Placa <span className="text-[9px] text-primary">(Mercosul/Antiga)</span></Label>
                        <Input value={editPlaca} onChange={e => setEditPlaca(e.target.value)} placeholder="Ex: ABC1D23" className="h-11 rounded-xl font-mono font-black uppercase tracking-widest" maxLength={8} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">RENAVAM</Label>
                        <Input value={editRenavam} onChange={e => setEditRenavam(e.target.value)} placeholder="Ex: 12345678901" className="h-11 rounded-xl font-mono font-bold" maxLength={11} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chassi / Dados CRLV</Label>
                        <Input value={editCrlvDados} onChange={e => setEditCrlvDados(e.target.value)} placeholder="Ex: Chassi, Código de Segurança..." className="h-11 rounded-xl font-bold" />
                      </div>
                    </div>

                    {/* CONFIGURAÇÕES DE IPVA / LICENCIAMENTO */}
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                          IPVA & Licenciamento Anual
                        </h4>
                        {editPlaca && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const est = getEstimatedIpvaAndDueDate(editPlaca, editTipo, editValorFipe || editValorVeiculo || 0);
                              setEditIpvaValor(est.valorIpva);
                              setEditIpvaVencimento(est.vencimentoIpva);
                              setEditLicenciamentoValor(est.valorLicenciamento);
                              setEditLicenciamentoVencimento(est.vencimentoLicenciamento);
                              toast.success("Estimativa de IPVA & Licenciamento gerada e preenchida com sucesso!");
                            }}
                            className="h-8 rounded-full text-[10px] font-black uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5 gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-primary" /> Estimar pela Placa
                          </Button>
                        )}
                      </div>
                      
                      {(editIpvaTxFound || editLicTxFound) && (
                        <div className="p-3.5 bg-success/10 border border-success/20 rounded-2xl space-y-2 animate-in fade-in duration-300">
                          <p className="text-[10px] font-black text-success uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-success" /> Lançamentos de Pagamento Detectados no Fluxo de Caixa
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                            {editIpvaTxFound && (
                              <div className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded-xl border border-success/10">
                                <div>
                                  <span className="font-bold text-foreground block">IPVA Pago: {formatCurrency(editIpvaTxFound.amount)}</span>
                                  <span>Data: {format(parseDateLocal(editIpvaTxFound.date), "dd/MM/yyyy")}</span>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditIpvaValor(editIpvaTxFound.amount);
                                    setEditIpvaVencimento(editIpvaTxFound.date);
                                    toast.success("Dados do IPVA real aplicados!");
                                  }}
                                  className="h-7 text-[9px] font-black uppercase text-success hover:bg-success/10 rounded-lg border border-success/20 px-2"
                                >
                                  Aplicar
                                </Button>
                              </div>
                            )}
                            {editLicTxFound && (
                              <div className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded-xl border border-success/10">
                                <div>
                                  <span className="font-bold text-foreground block">Licenciamento: {formatCurrency(editLicTxFound.amount)}</span>
                                  <span>Data: {format(parseDateLocal(editLicTxFound.date), "dd/MM/yyyy")}</span>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditLicenciamentoValor(editLicTxFound.amount);
                                    setEditLicenciamentoVencimento(editLicTxFound.date);
                                    toast.success("Dados de licenciamento real aplicados!");
                                  }}
                                  className="h-7 text-[9px] font-black uppercase text-success hover:bg-success/10 rounded-lg border border-success/20 px-2"
                                >
                                  Aplicar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">IPVA Valor (R$)</Label>
                          <Input type="number" value={editIpvaValor} onChange={e => setEditIpvaValor(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">IPVA Vencimento</Label>
                          <Input type="date" value={editIpvaVencimento} onChange={e => setEditIpvaVencimento(e.target.value)} className="h-11 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Licenciamento Valor (R$)</Label>
                          <Input type="number" value={editLicenciamentoValor} onChange={e => setEditLicenciamentoValor(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Licenciamento Vencimento</Label>
                          <Input type="date" value={editLicenciamentoVencimento} onChange={e => setEditLicenciamentoVencimento(e.target.value)} className="h-11 rounded-xl font-bold" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <Button variant="ghost" onClick={() => setIsEditing(false)} className="rounded-full h-11 px-6 font-bold uppercase text-[10px] tracking-widest">
                        DESPREZAR
                      </Button>
                      <Button onClick={handleSaveCadastro} className="rounded-full h-11 px-8 font-black uppercase text-xs bg-success text-white hover:bg-success/90">
                        SALVAR ALTERAÇÕES
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* TAB RESUMO COCKPIT */}
                  <TabsContent value="resumo" className="mt-0 space-y-8 focus-visible:outline-none animate-in fade-in duration-300">
                    
                    {/* VISUAL DASHBOARD COCKPIT MOTO/CARRO */}
                    <div className="rounded-[2.5rem] p-6 sm:p-8 bg-card border border-border/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      {/* Left accent color bar */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-2",
                        veiculo.tipo === 'moto' ? "bg-orange-500" : "bg-blue-500"
                      )} />

                      <div className="space-y-4 text-center md:text-left pl-2">
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Avaliação FIPE Atual</p>
                          <p className={cn(
                            "text-4xl sm:text-5xl font-black tabular-nums tracking-tighter leading-none",
                            veiculo.tipo === 'moto' ? "text-orange-500" : "text-blue-500"
                          )}>
                            {formatCurrency(veiculo.valorFipe || 0)}
                          </p>
                        </div>

                        {/* Comparativo FIPE x Compra */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-bold text-muted-foreground">
                          <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl">
                            <DollarSign className="w-3.5 h-3.5 opacity-60 text-muted-foreground" />
                            <span>Compra: {formatCurrency(veiculo.valorVeiculo || veiculo.valorFipe || 0)}</span>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 font-black px-3 py-1.5 rounded-xl",
                            depreciacaoEstimada > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                          )}>
                            {depreciacaoEstimada > 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                            <span>{depreciacaoEstimada > 0 ? 'Depreciação:' : 'Valorização:'} {Math.abs(depreciacaoEstimada).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 pr-2">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => onUpdateFipe(veiculo)}
                          className={cn(
                            "rounded-full h-12 px-6 font-black text-xs gap-2 border-2",
                            veiculo.tipo === 'moto' 
                              ? "border-orange-500/30 text-orange-500 hover:bg-orange-500/10" 
                              : "border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                          )}
                        >
                          <RefreshCw className="w-4 h-4" /> ATUALIZAR VIA FIPE
                        </Button>
                      </div>
                    </div>

                    {/* DADOS COMPLETOS DO CADASTRO (PLACA MERCOSUL, RENAVAM, ETC) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Bloco Documentos (Placa, Renavam, CRLV) */}
                      <div className="md:col-span-7 bg-muted/10 border rounded-[2rem] p-6 space-y-5">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-4 h-4" /> DADOS CADASTRAIS DO DOCUMENTO
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                          
                          {/* Placa Mercosul visual */}
                          <div className="sm:col-span-5 flex justify-center sm:justify-start">
                            {veiculo.placa ? (
                              <div
                                onClick={() => copyToClipboard(veiculo.placa || "", "Placa")}
                                className="inline-flex flex-col border-2 border-blue-600 rounded-xl bg-white text-black font-sans uppercase tracking-wider text-center shadow-lg w-40 h-14 select-none overflow-hidden font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all"
                              >
                                <div className="bg-blue-600 text-[7px] text-white py-1 leading-none px-2 flex justify-between items-center font-bold">
                                  <span>BRASIL</span>
                                  <div className="w-3 h-2 bg-yellow-400 rounded-sm" />
                                </div>
                                <div className="flex-1 flex items-center justify-center text-lg font-black tracking-widest py-0.5 px-2 font-mono">
                                  {veiculo.placa}
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl h-14 px-4 flex items-center justify-center text-xs text-muted-foreground font-bold bg-muted/5 w-40">
                                Sem placa cadastrada
                              </div>
                            )}
                          </div>

                          {/* Renavam e CRLV */}
                          <div className="sm:col-span-7 space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">RENAVAM</p>
                                <p className="font-mono text-xs font-bold text-foreground truncate mt-0.5">
                                  {veiculo.renavam || "Não registrado"}
                                </p>
                              </div>
                              {veiculo.renavam && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => copyToClipboard(veiculo.renavam || "", "RENAVAM")}>
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40">
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Chassi / CRLV</p>
                                <p className="font-mono text-xs font-bold text-foreground truncate mt-0.5">
                                  {veiculo.crlvDados || "Não registrado"}
                                </p>
                              </div>
                              {veiculo.crlvDados && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => copyToClipboard(veiculo.crlvDados || "", "Chassi / CRLV")}>
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bloco Seguro & Vigência Resumido */}
                      <div className="md:col-span-5 bg-muted/10 border rounded-[2rem] p-6 flex flex-col justify-between gap-5">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4" /> STATUS DA PROTEÇÃO
                          </h4>

                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                              seguroStatus.color === 'success' ? "bg-success/10 text-success" : 
                              seguroStatus.color === 'warning' ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                            )}>
                              <Shield className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-black text-sm text-foreground">{seguroStatus.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {currentSeguro ? (
                                  <>Seguradora: <span className="font-bold text-foreground">{currentSeguro.seguradora}</span></>
                                ) : (
                                  "Nenhuma apólice vinculada"
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {currentSeguro && (
                          <div className="pt-4 border-t grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Apólice nº</p>
                              <p className="font-bold text-foreground truncate mt-0.5">{currentSeguro.numeroApolice || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Fim</p>
                              <p className="font-bold text-foreground mt-0.5">
                                {currentSeguro.vigenciaFim ? format(parseDateLocal(currentSeguro.vigenciaFim), "dd/MM/yyyy") : "N/A"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RESUMO DAS OBRIGAÇÕES ANUAIS (IPVA & LICENCIAMENTO) */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">
                        OBRIGAÇÕES ANUAIS VEICULARES
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Card IPVA */}
                        <div className="p-5 rounded-[2rem] border bg-card flex flex-col justify-between gap-4 shadow-sm hover:shadow-soft transition-all">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <Badge className={cn(
                                "border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5",
                                veiculo.ipvaPago ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                              )}>
                                {veiculo.ipvaPago ? "PAGO" : "PENDENTE"}
                              </Badge>
                              <p className="text-lg font-black mt-2">IPVA Anual</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                {veiculo.ipvaValor ? "Valor Cadastrado" : "Sugestão p/ Placa"}
                              </p>
                              <p className="font-black text-xl text-foreground tabular-nums">
                                {veiculo.ipvaValor 
                                  ? formatCurrency(veiculo.ipvaValor) 
                                  : veiculo.placa 
                                    ? formatCurrency(getEstimatedIpvaAndDueDate(veiculo.placa, veiculo.tipo || 'carro', veiculo.valorFipe || 0).valorIpva)
                                    : "Não cadastrado"
                                }
                              </p>
                            </div>
                          </div>

                          {!veiculo.ipvaPago && existingIpvaTx && (
                            <div className="p-3 bg-success/10 border border-success/20 rounded-2xl space-y-1.5 animate-in fade-in duration-300">
                              <p className="text-[10px] font-black text-success uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-success" /> Lançamento de IPVA Detectado
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-tight">
                                Foi encontrado um pagamento de <strong className="text-foreground">{formatCurrency(existingIpvaTx.amount)}</strong> em <strong className="text-foreground">{format(parseDateLocal(existingIpvaTx.date), "dd/MM/yyyy")}</strong> no fluxo de caixa.
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  handleUpdateVeiculo(veiculo.id, {
                                    ipvaPago: true,
                                    ipvaValor: existingIpvaTx.amount,
                                    ipvaVencimento: existingIpvaTx.date,
                                    ipvaContaId: existingIpvaTx.accountId,
                                    ipvaCategoriaId: existingIpvaTx.categoryId || undefined,
                                  });
                                  toast.success("IPVA conciliado e marcado como pago com sucesso!");
                                }}
                                className="h-7 w-full rounded-full text-[9px] font-black uppercase text-success border-success/30 hover:bg-success/10"
                              >
                                Vincular Lançamento
                              </Button>
                            </div>
                          )}

                          {veiculo.ipvaPago && existingIpvaTx && (
                            <div className="text-[10px] text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/20 italic leading-tight flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-success shrink-0" />
                              <span>Sincronizado automaticamente com lançamento de <strong>{formatCurrency(existingIpvaTx.amount)}</strong> em {format(parseDateLocal(existingIpvaTx.date), "dd/MM/yyyy")}.</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t text-xs">
                            <div>
                              <span className="text-muted-foreground font-bold">Vencimento:</span>{" "}
                              <span className="font-bold">
                                {veiculo.ipvaVencimento 
                                  ? format(parseDateLocal(veiculo.ipvaVencimento), "dd/MM/yyyy") 
                                  : veiculo.placa 
                                    ? format(parseDateLocal(getEstimatedIpvaAndDueDate(veiculo.placa, veiculo.tipo || 'carro', veiculo.valorFipe || 0).vencimentoIpva), "dd/MM/yyyy") + " (Estimado)"
                                    : "Não definido"
                                }
                              </span>
                            </div>
                            {!veiculo.ipvaPago && veiculo.ipvaValor ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPayObligationType('ipva');
                                  setPayAmount(veiculo.ipvaValor || 0);
                                }}
                                className="rounded-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-wider h-8"
                              >
                                PAGAR AGORA
                              </Button>
                            ) : !veiculo.ipvaValor && veiculo.placa ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const est = getEstimatedIpvaAndDueDate(veiculo.placa || "", veiculo.tipo || 'carro', veiculo.valorFipe || 0);
                                  handleUpdateVeiculo(veiculo.id, {
                                    ipvaValor: est.valorIpva,
                                    ipvaVencimento: est.vencimentoIpva
                                  });
                                  toast.success("Estimativa de IPVA aplicada com sucesso!");
                                }}
                                className="h-8 rounded-full text-[10px] font-black uppercase text-primary border border-primary/20 hover:bg-primary/5 px-3 gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Aplicar
                              </Button>
                            ) : veiculo.ipvaPago ? (
                              <Badge variant="outline" className="text-success border-success/20 bg-success/5 text-[9px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success" /> CONCLUÍDO
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        {/* Card Licenciamento */}
                        <div className="p-5 rounded-[2rem] border bg-card flex flex-col justify-between gap-4 shadow-sm hover:shadow-soft transition-all">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <Badge className={cn(
                                "border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5",
                                veiculo.licenciamentoPago ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                              )}>
                                {veiculo.licenciamentoPago ? "PAGO" : "PENDENTE"}
                              </Badge>
                              <p className="text-lg font-black mt-2">Licenciamento</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                {veiculo.licenciamentoValor ? "Valor Cadastrado" : "Sugestão p/ Placa"}
                              </p>
                              <p className="font-black text-xl text-foreground tabular-nums">
                                {veiculo.licenciamentoValor 
                                  ? formatCurrency(veiculo.licenciamentoValor) 
                                  : veiculo.placa 
                                    ? formatCurrency(getEstimatedIpvaAndDueDate(veiculo.placa, veiculo.tipo || 'carro', veiculo.valorFipe || 0).valorLicenciamento)
                                    : "Não cadastrado"
                                }
                              </p>
                            </div>
                          </div>

                          {!veiculo.licenciamentoPago && existingLicTx && (
                            <div className="p-3 bg-success/10 border border-success/20 rounded-2xl space-y-1.5 animate-in fade-in duration-300">
                              <p className="text-[10px] font-black text-success uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-success" /> Lançamento de Licenciamento Detectado
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-tight">
                                Foi encontrado um pagamento de <strong className="text-foreground">{formatCurrency(existingLicTx.amount)}</strong> em <strong className="text-foreground">{format(parseDateLocal(existingLicTx.date), "dd/MM/yyyy")}</strong> no fluxo de caixa.
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  handleUpdateVeiculo(veiculo.id, {
                                    licenciamentoPago: true,
                                    licenciamentoValor: existingLicTx.amount,
                                    licenciamentoVencimento: existingLicTx.date,
                                    licenciamentoContaId: existingLicTx.accountId,
                                    licenciamentoCategoriaId: existingLicTx.categoryId || undefined,
                                  });
                                  toast.success("Licenciamento conciliado e marcado como pago com sucesso!");
                                }}
                                className="h-7 w-full rounded-full text-[9px] font-black uppercase text-success border-success/30 hover:bg-success/10"
                              >
                                Vincular Lançamento
                              </Button>
                            </div>
                          )}

                          {veiculo.licenciamentoPago && existingLicTx && (
                            <div className="text-[10px] text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/20 italic leading-tight flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-success shrink-0" />
                              <span>Sincronizado automaticamente com lançamento de <strong>{formatCurrency(existingLicTx.amount)}</strong> em {format(parseDateLocal(existingLicTx.date), "dd/MM/yyyy")}.</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t text-xs">
                            <div>
                              <span className="text-muted-foreground font-bold">Vencimento:</span>{" "}
                              <span className="font-bold">
                                {veiculo.licenciamentoVencimento 
                                  ? format(parseDateLocal(veiculo.licenciamentoVencimento), "dd/MM/yyyy") 
                                  : veiculo.placa 
                                    ? format(parseDateLocal(getEstimatedIpvaAndDueDate(veiculo.placa, veiculo.tipo || 'carro', veiculo.valorFipe || 0).vencimentoLicenciamento), "dd/MM/yyyy") + " (Estimado)"
                                    : "Não definido"
                                }
                              </span>
                            </div>
                            {!veiculo.licenciamentoPago && veiculo.licenciamentoValor ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPayObligationType('licenciamento');
                                  setPayAmount(veiculo.licenciamentoValor || 0);
                                }}
                                className="rounded-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-wider h-8"
                              >
                                PAGAR AGORA
                              </Button>
                            ) : !veiculo.licenciamentoValor && veiculo.placa ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const est = getEstimatedIpvaAndDueDate(veiculo.placa || "", veiculo.tipo || 'carro', veiculo.valorFipe || 0);
                                  handleUpdateVeiculo(veiculo.id, {
                                    licenciamentoValor: est.valorLicenciamento,
                                    licenciamentoVencimento: est.vencimentoLicenciamento
                                  });
                                  toast.success("Estimativa de licenciamento aplicada com sucesso!");
                                }}
                                className="h-8 rounded-full text-[10px] font-black uppercase text-primary border border-primary/20 hover:bg-primary/5 px-3 gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Aplicar
                              </Button>
                            ) : veiculo.licenciamentoPago ? (
                              <Badge variant="outline" className="text-success border-success/20 bg-success/5 text-[9px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success" /> CONCLUÍDO
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* MODAL / SOBREPOSIÇÃO DE PAGAMENTO DE OBRIGAÇÕES */}
                    {payObligationType && (
                      <div className="p-6 bg-muted/10 border-2 border-dashed rounded-[2rem] space-y-4 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> REGISTRAR PAGAMENTO DE {payObligationType.toUpperCase()}
                          </h4>
                          <Button variant="ghost" size="sm" onClick={() => setPayObligationType(null)} className="h-8 rounded-full text-muted-foreground">
                            CANCELAR
                          </Button>
                        </div>

                        {!impostosCategory && (
                          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                            <div className="space-y-0.5">
                              <p className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5" /> Categoria "Impostos e Taxas" Recomendada
                              </p>
                              <p className="text-[11px] text-muted-foreground font-medium">
                                Recomendamos registrar este pagamento na categoria <strong className="text-foreground">"Impostos e Taxas"</strong> para uma organização financeira mais precisa.
                              </p>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handleCreateImpostosCategory}
                              className="rounded-full h-8 text-[10px] font-black uppercase text-amber-600 border-amber-600/20 hover:bg-amber-500/10 dark:text-amber-400 dark:border-amber-400/20 dark:hover:bg-amber-500/10 shrink-0"
                            >
                              Criar Categoria Agora
                            </Button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Conta para Débito</Label>
                            <Select value={payAccountId} onValueChange={setPayAccountId}>
                              <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {contasMovimento.filter(c => !c.hidden).map(c => (
                                  <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Categoria Financeira</Label>
                            <Select value={payCategoryId} onValueChange={setPayCategoryId}>
                              <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categoriasV2.filter(c => c.nature !== 'receita').map(c => (
                                  <SelectItem key={c.id} value={c.id} className="font-semibold">{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Data do Pagamento</Label>
                            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="h-10 rounded-xl font-bold" />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Valor Pago (R$)</Label>
                            <Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} className="h-10 rounded-xl font-bold" />
                            <p className="text-[9px] font-semibold text-muted-foreground italic mt-1 leading-tight">
                              *O valor pago real pode diferir do valor estimado.
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button onClick={handlePayObligation} className="rounded-full bg-success hover:bg-success/90 text-white font-black text-xs px-6 h-10">
                            EFETUAR PAGAMENTO FINANCEIRO REAL
                          </Button>
                        </div>
                      </div>
                    )}

                  </TabsContent>

                  {/* TAB SEGURO COMPLETO */}
                  <TabsContent value="seguro" className="mt-0 space-y-6 focus-visible:outline-none animate-in fade-in duration-300">
                    
                    {!currentSeguro && !showInsForm ? (
                      <div className="py-16 text-center border-2 border-dashed rounded-[2.5rem] p-8 space-y-4">
                        <Shield className="w-16 h-16 mx-auto opacity-20 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="font-black uppercase tracking-widest text-sm text-foreground">Sem seguro ativo cadastrado</p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Cadastre a apólice de seguro do seu veículo para monitorar parcelas, vigência e vencimentos de forma centralizada.
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setInsSeguradora("");
                            setInsApolice("");
                            setInsValor(0);
                            setInsParcelas(1);
                            setInsInicio(format(new Date(), "yyyy-MM-dd"));
                            setInsFim(format(addMonths(new Date(), 12), "yyyy-MM-dd"));
                            setShowInsForm(true);
                          }}
                          className="rounded-full bg-primary hover:bg-primary-dark font-black text-xs uppercase px-6"
                        >
                          <Plus className="w-4 h-4 mr-1" /> CADASTRAR APÓLICE
                        </Button>
                      </div>
                    ) : showInsForm ? (
                      <div className="p-6 bg-muted/10 border-2 border-dashed rounded-[2rem] space-y-6">
                        <h4 className="font-black text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                          <Shield className="w-4 h-4" /> CADASTRAR NOVO SEGURO ATIVO
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Seguradora</Label>
                            <Input value={insSeguradora} onChange={e => setInsSeguradora(e.target.value)} placeholder="Ex: Porto Seguro" className="h-11 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Nº Apólice</Label>
                            <Input value={insApolice} onChange={e => setInsApolice(e.target.value)} placeholder="Ex: 123456789" className="h-11 rounded-xl font-mono font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor Total do Seguro (R$)</Label>
                            <Input type="number" value={insValor} onChange={e => setInsValor(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Vigência Início</Label>
                            <Input type="date" value={insInicio} onChange={e => setInsInicio(e.target.value)} className="h-11 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Vigência Fim</Label>
                            <Input type="date" value={insFim} onChange={e => setInsFim(e.target.value)} className="h-11 rounded-xl font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Número de Parcelas</Label>
                            <Input type="number" min={1} max={12} value={insParcelas} onChange={e => setInsParcelas(Number(e.target.value))} className="h-11 rounded-xl font-bold" />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <Button variant="ghost" onClick={() => setShowInsForm(false)} className="rounded-full h-11 px-6 font-bold uppercase text-[10px] tracking-widest">
                            CANCELAR
                          </Button>
                          <Button onClick={handleSaveInsurance} className="rounded-full bg-success text-white hover:bg-success/90 font-black text-xs px-8 h-11 uppercase">
                            SALVAR APÓLICE E CONTRATO
                          </Button>
                        </div>
                      </div>
                    ) : (
                      currentSeguro && (
                        <div className="space-y-6">
                          
                          {/* Resumo da apólice ativa */}
                          <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/40 space-y-6 relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
                              <Shield className="w-32 h-32 text-primary" />
                            </div>

                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Apólice nº {currentSeguro.numeroApolice || "N/A"}</p>
                                <p className="font-black text-2xl text-foreground truncate">{currentSeguro.seguradora}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor Total Contrato</p>
                                <p className="font-black text-2xl text-primary tabular-nums">{formatCurrency(currentSeguro.valorTotal || 0)}</p>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-border/40 grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Início</p>
                                <p className="font-bold text-sm mt-0.5">
                                  {currentSeguro.vigenciaInicio ? format(parseDateLocal(currentSeguro.vigenciaInicio), "dd/MM/yyyy") : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Fim</p>
                                <p className="font-bold text-sm mt-0.5">
                                  {currentSeguro.vigenciaFim ? format(parseDateLocal(currentSeguro.vigenciaFim), "dd/MM/yyyy") : "N/A"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Parcelas</p>
                                <p className="font-bold text-sm mt-0.5">
                                  {currentSeguro.numeroParcelas}x de {formatCurrency(currentSeguro.valorTotal / currentSeguro.numeroParcelas)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Listagem interativa de parcelas */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">
                              CRONOGRAMA DE PAGAMENTO DO SEGURO
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {currentSeguro.parcelas?.map((p) => {
                                const isOverdue = !p.paga && p.vencimento && parseDateLocal(p.vencimento) < new Date();

                                return (
                                  <div
                                    key={p.numero}
                                    className={cn(
                                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                      p.paga
                                        ? "bg-success/[0.03] border-success/20 opacity-70"
                                        : isOverdue
                                          ? "bg-destructive/5 border-destructive/20"
                                          : "bg-muted/10 border-border/40"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      {p.paga ? (
                                        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                                      ) : isOverdue ? (
                                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 animate-pulse" />
                                      ) : (
                                        <Clock className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-black text-sm text-foreground">Parcela {p.numero}/{currentSeguro.numeroParcelas}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                          {p.vencimento
                                            ? format(parseDateLocal(p.vencimento), "dd 'de' MMMM", { locale: ptBR })
                                            : "N/A"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className={cn("font-black text-sm tabular-nums", p.paga ? "text-success" : "text-foreground")}>
                                        {formatCurrency(p.valor || 0)}
                                      </span>

                                      {p.paga ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleUnpayInsuranceParcel(p.numero)}
                                          className="h-8 text-destructive text-[9px] font-black uppercase hover:bg-destructive/10 rounded-full"
                                        >
                                          DESFAZER
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() => handlePayInsuranceParcel(p.numero, p.valor, p.vencimento)}
                                          className="h-8 bg-success hover:bg-success/90 text-white text-[9px] font-black uppercase rounded-full px-3"
                                        >
                                          PAGAR
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      )
                    )}

                  </TabsContent>

                  {/* TAB DESPESAS & MANUTENÇÕES */}
                  <TabsContent value="despesas" className="mt-0 space-y-8 focus-visible:outline-none animate-in fade-in duration-300 pb-12">
                    
                    {/* CARDS SUPERIORES: FIPE E SEGURO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* CARD EVOLUÇÃO FIPE */}
                      <div className="p-6 bg-card border rounded-[2rem] hover:shadow-soft transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <RefreshCw className="w-4 h-4 text-primary" /> EVOLUÇÃO DA FIPE
                            </span>
                            <span className={cn(
                              "text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1",
                              fipeVariation.isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}>
                              {fipeVariation.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              {fipeVariation.isUp ? "+" : ""}{fipeVariation.percent.toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="font-black text-2xl tracking-tight text-foreground">{formatCurrency(veiculo.valorFipe || 0)}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">FIPE ATUAL</span>
                          </div>

                          <p className="text-xs text-muted-foreground mb-4">
                            Valor inicial de compra: <span className="font-bold text-foreground">{formatCurrency(veiculo.valorVeiculo || veiculo.valorFipe || 0)}</span>.
                            Diferença absoluta de <span className={cn("font-bold", fipeVariation.isUp ? "text-success" : "text-destructive")}>{formatCurrency(Math.abs(fipeVariation.diff))}</span>.
                          </p>

                          {/* Gráfico Recharts de Evolução FIPE */}
                          <div className="h-[140px] w-full mt-2 mb-4 bg-muted/5 rounded-xl border border-dashed flex items-center justify-center p-2">
                            {fipeChartData.length > 1 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={fipeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                                  <XAxis dataKey="dateFormatted" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="currentColor" opacity={0.3} />
                                  <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="currentColor" opacity={0.3} domain={['auto', 'auto']} />
                                  <Tooltip 
                                    contentStyle={{ background: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                                    labelStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'hsl(var(--primary))' }}
                                    formatter={(value) => [formatCurrency(Number(value)), 'Valor FIPE']}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="valor" 
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                                    activeDot={{ r: 6 }} 
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="text-center p-4 space-y-1">
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Histórico de FIPE</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Atualize o valor da tabela FIPE do veículo para começar a desenhar o gráfico de valorização.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button 
                          onClick={() => onUpdateFipe(veiculo)}
                          className="w-full rounded-full h-10 border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mt-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> ATUALIZAR TABELA FIPE
                        </Button>
                      </div>

                      {/* CARD GASTOS COM SEGURO */}
                      <div className="p-6 bg-card border rounded-[2rem] hover:shadow-soft transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <Shield className="w-4 h-4 text-primary" /> HISTÓRICO DE SEGUROS
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                              {parcelasSeguroStats.pagas}/{parcelasSeguroStats.totais} PARCELAS PAGAS
                            </span>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="font-black text-2xl tracking-tight text-foreground">{formatCurrency(totalSeguroEfetivamentePago)}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">EFETIVAMENTE PAGO</span>
                          </div>

                          <p className="text-xs text-muted-foreground mb-4">
                            Total contratado histórico em apólices de seguro: <span className="font-bold text-foreground">{formatCurrency(totalSeguroContratado)}</span>.
                          </p>

                          <div className="p-4 rounded-2xl bg-muted/10 border space-y-3 mb-4">
                            {currentSeguro ? (
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Seguro Ativo</p>
                                <p className="font-black text-sm text-foreground truncate">{currentSeguro.seguradora}</p>
                                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1 pt-1 border-t border-border/40">
                                  <span>Apólice: <strong className="text-foreground">{currentSeguro.numeroApolice || "N/A"}</strong></span>
                                  <span>Total: <strong className="text-foreground">{formatCurrency(currentSeguro.valorTotal)}</strong></span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <p className="text-xs font-bold text-muted-foreground">Sem apólice de seguro ativa cadastrada.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {currentSeguro ? (
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button 
                              variant="outline"
                              onClick={() => {
                                const tabsList = document.querySelectorAll('[role="tab"]');
                                const seguroTab = Array.from(tabsList).find(t => t.textContent?.toLowerCase().includes("seguro")) as HTMLButtonElement | undefined;
                                if (seguroTab) seguroTab.click();
                              }}
                              className="rounded-full h-10 text-[10px] font-black uppercase tracking-widest"
                            >
                              VER APÓLICE
                            </Button>
                            <Button 
                              onClick={() => {
                                const tabsList = document.querySelectorAll('[role="tab"]');
                                const seguroTab = Array.from(tabsList).find(t => t.textContent?.toLowerCase().includes("seguro")) as HTMLButtonElement | undefined;
                                if (seguroTab) seguroTab.click();
                              }}
                              className="rounded-full h-10 bg-success hover:bg-success/90 text-white text-[10px] font-black uppercase tracking-widest"
                            >
                              PAGAR PARCELA
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => {
                              const tabsList = document.querySelectorAll('[role="tab"]');
                              const seguroTab = Array.from(tabsList).find(t => t.textContent?.toLowerCase().includes("seguro")) as HTMLButtonElement | undefined;
                              if (seguroTab) seguroTab.click();
                            }}
                            className="w-full rounded-full h-10 bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest mt-2"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> CADASTRAR APÓLICE DE SEGURO
                          </Button>
                        )}
                      </div>

                    </div>

                    {/* SELEÇÃO DE CATEGORIAS DO LEDGER PARA BUSCA AUTOMÁTICA */}
                    <div className="p-6 bg-card border border-border/60 rounded-[2rem] hover:shadow-soft transition-all space-y-4">
                      <div 
                        onClick={() => setShowSearchCategories(!showSearchCategories)}
                        className="flex items-center justify-between cursor-pointer select-none gap-4"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                            <Search className="w-4 h-4 text-primary shrink-0" /> CATEGORIAS DE DESPESA PARA MONITORAMENTO
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Selecione quais categorias do seu fluxo de caixa devem ser monitoradas para puxar lançamentos para este veículo.
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                          {showSearchCategories ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>

                      {showSearchCategories && (
                        <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                          {categoriasV2
                            .filter(c => c.nature !== 'receita')
                            .filter(cat => {
                              const lbl = cat.label.toLowerCase();
                              return !(lbl.includes('seguro') || lbl.includes('imposto') || lbl.includes('taxa') || lbl.includes('ipva') || lbl.includes('licenciamento'));
                            })
                            .map((cat) => {
                              const isSelected = selectedSearchCategories.includes(cat.id);
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => handleToggleSearchCategory(cat.id)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 flex items-center gap-1.5",
                                    isSelected 
                                      ? "bg-primary/10 text-primary border-primary" 
                                      : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/80"
                                  )}
                                >
                                  <span className="text-xs">{cat.icon || "💸"}</span>
                                  <span>{cat.label}</span>
                                  {isSelected ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  ) : null}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* LANÇAMENTOS DO FLUXO DE CAIXA PENDENTES DE VINCULAÇÃO */}
                    <div className="p-6 bg-muted/10 border border-border/50 rounded-[2rem] space-y-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" /> LANÇAMENTOS DO FLUXO DE CAIXA PARA ORGANIZAR ({pendingTransactions.length})
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Abaixo estão as despesas registradas no financeiro geral. Clique em qualquer lançamento para dar destino e enriquecer as informações da moto/carro.
                        </p>
                      </div>

                      {pendingTransactions.length > 0 ? (
                        <div className="space-y-3">
                          {pendingTransactions.map((tx) => {
                            const isExpanded = expandedTxId === tx.id;
                            const cat = categoriasV2.find(c => c.id === tx.categoryId);

                            return (
                              <div 
                                key={tx.id} 
                                className={cn(
                                  "border rounded-2xl overflow-hidden transition-all duration-200 bg-card",
                                  isExpanded ? "border-primary shadow-soft scale-[1.01]" : "border-border/60 hover:border-primary/40"
                                )}
                              >
                                {/* CABEÇALHO DA TRANSAÇÃO */}
                                <div 
                                  onClick={() => handleSelectPendingTx(tx)}
                                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 select-none"
                                >
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wider tabular-nums">
                                        {format(parseDateLocal(tx.date), "dd/MM/yyyy")}
                                      </span>
                                      {cat && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                                          {cat.icon || "🏷️"} {cat.label}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-bold text-sm text-foreground truncate">{tx.description}</p>
                                    {tx.meta?.notes && (
                                      <p className="text-[11px] text-muted-foreground italic truncate">Obs: {tx.meta.notes as string}</p>
                                    )}
                                  </div>

                                  <div className="text-right shrink-0 flex items-center gap-2">
                                    <div>
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase">PENDENTE</p>
                                      <p className="font-black text-sm tabular-nums text-foreground">
                                        {formatCurrency(tx.pendingAmount)}
                                      </p>
                                      {tx.allocatedAmount > 0 && (
                                        <p className="text-[9px] font-bold text-success">
                                          Parcial de {formatCurrency(tx.allocatedAmount)} vinculado
                                        </p>
                                      )}
                                    </div>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-all">
                                      {isExpanded ? "▲" : "▼"}
                                    </div>
                                  </div>
                                </div>

                                {/* FORMULÁRIO DE ENRIQUECIMENTO "ABRE E FECHA" */}
                                {isExpanded && (
                                  <div className="p-5 border-t border-border/40 bg-muted/5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* TIPO DE GASTO DO VEÍCULO */}
                                      <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Classificar como</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                          {[
                                            { id: "combustivel", label: "Combustível", icon: "⛽" },
                                            { id: "cosmetico", label: "Estética & Prot.", icon: "🛡️" },
                                            { id: "manutencao_periodica", label: "Manutenção", icon: "🔧" },
                                            { id: "outros", label: "Outros Gastos", icon: "📝" }
                                          ].map((g) => (
                                            <button
                                              key={g.id}
                                              type="button"
                                              onClick={() => {
                                                setAllocType(g.id as any);
                                                if (g.id === "combustivel") setAllocTitle("Abastecimento");
                                              }}
                                              className={cn(
                                                "p-2.5 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5",
                                                allocType === g.id 
                                                  ? "bg-primary/10 border-primary text-primary" 
                                                  : "bg-card hover:bg-muted"
                                              )}
                                            >
                                              <span>{g.icon}</span>
                                              <span>{g.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* DIVIDIR VALOR / VALOR DO ITEM */}
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between items-baseline">
                                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Valor deste Item</Label>
                                          <span className="text-[9px] text-muted-foreground font-semibold">
                                            Original: <strong className="text-foreground">{formatCurrency(tx.amount)}</strong>
                                          </span>
                                        </div>
                                        <Input 
                                          value={allocAmount} 
                                          onChange={e => {
                                            const rawVal = e.target.value;
                                            setAllocAmount(rawVal);
                                            const val = parseFloat(rawVal.replace(/\./g, "").replace(",", "."));
                                            const l = parseFloat(fuelLitres.replace(",", "."));
                                            const p = parseFloat(fuelPricePerLitre.replace(",", "."));
                                            if (val > 0) {
                                              if (l > 0) {
                                                setFuelPricePerLitre((val / l).toFixed(2).replace(".", ","));
                                              } else if (p > 0) {
                                                setFuelLitres((val / p).toFixed(2).replace(".", ","));
                                              }
                                            }
                                          }} 
                                          placeholder="0,00"
                                          className="h-10 rounded-xl font-bold font-mono text-sm"
                                        />
                                        <p className="text-[9px] text-muted-foreground leading-snug">
                                          💡 Para desmembrar (split), altere para um valor menor. O saldo restante (R$ {(tx.pendingAmount - (parseFloat(allocAmount.replace(/\./g, "").replace(",", ".")) || 0)).toFixed(2).replace(".", ",")}) continuará pendente.
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* TÍTULO / ITEM */}
                                      <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Título do Item / Descrição Curta</Label>
                                        <Input 
                                          value={allocTitle} 
                                          onChange={e => setAllocTitle(e.target.value)} 
                                          placeholder="Ex: Gasolina Aditivada, Pastilha de Freio, etc."
                                          className="h-10 rounded-xl font-semibold"
                                        />
                                      </div>

                                      {/* OBSERVAÇÕES / DETALHES GERAIS */}
                                      <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Observações Adicionais</Label>
                                        <Input 
                                          value={allocDesc} 
                                          onChange={e => setAllocDesc(e.target.value)} 
                                          placeholder="Ex: KM da troca, Posto, etc."
                                          className="h-10 rounded-xl font-medium text-xs"
                                        />
                                      </div>
                                    </div>

                                    {/* CAMPOS DINÂMICOS ESPECÍFICOS */}
                                    {allocType === "combustivel" && (
                                      <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-200/40 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-amber-800">Litros Abastecidos</Label>
                                          <Input 
                                            value={fuelLitres} 
                                            onChange={e => {
                                              setFuelLitres(e.target.value);
                                              // Auto calcular preço por litro se tiver valor
                                              const l = parseFloat(e.target.value.replace(",", "."));
                                              const val = parseFloat(allocAmount.replace(/\./g, "").replace(",", "."));
                                              if (l > 0 && val > 0) {
                                                setFuelPricePerLitre((val / l).toFixed(2).replace(".", ","));
                                              }
                                            }} 
                                            placeholder="Ex: 12,5" 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-amber-800">Preço por Litro (R$)</Label>
                                          <Input 
                                            value={fuelPricePerLitre} 
                                            onChange={e => {
                                              setFuelPricePerLitre(e.target.value);
                                              // Auto calcular litros abastecidos se tiver valor
                                              const p = parseFloat(e.target.value.replace(",", "."));
                                              const val = parseFloat(allocAmount.replace(/\./g, "").replace(",", "."));
                                              if (p > 0 && val > 0) {
                                                setFuelLitres((val / p).toFixed(2).replace(".", ","));
                                              }
                                            }} 
                                            placeholder="Ex: 5,89" 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-amber-800">Tipo de Combustível</Label>
                                          <Select value={fuelType} onValueChange={setFuelType}>
                                            <SelectTrigger className="h-9 rounded-lg font-bold text-xs bg-card">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="gasolina_comum">Gasolina Comum</SelectItem>
                                              <SelectItem value="gasolina_aditivada">Gasolina Aditivada</SelectItem>
                                              <SelectItem value="etanol">Etanol</SelectItem>
                                              <SelectItem value="diesel">Diesel</SelectItem>
                                              <SelectItem value="gnv">GNV</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    )}

                                    {allocType === "cosmetico" && (
                                      <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-200/40 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-purple-800">Tipo de Proteção / Acessório</Label>
                                          <Input 
                                            value={cosmeticProtectionType} 
                                            onChange={e => setCosmeticProtectionType(e.target.value)} 
                                            placeholder="Ex: Protetor de Cárter, Capa Protetora" 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-purple-800">Marca / Modelo do Produto</Label>
                                          <Input 
                                            value={cosmeticBrand} 
                                            onChange={e => setCosmeticBrand(e.target.value)} 
                                            placeholder="Ex: Coyote, Givi, etc." 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {allocType === "manutencao_periodica" && (
                                      <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-200/40 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-blue-800">Peça / Serviço Trocado</Label>
                                          <Input 
                                            value={maintPart} 
                                            onChange={e => setMaintPart(e.target.value)} 
                                            placeholder="Ex: Óleo Mobil 10w30, Filtro" 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-blue-800">Quilometragem Atual (KM)</Label>
                                          <Input 
                                            value={maintKm} 
                                            onChange={e => setMaintKm(e.target.value)} 
                                            placeholder="Ex: 12500" 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[9px] font-black uppercase text-blue-800">Oficina / Estabelecimento</Label>
                                          <Input 
                                            value={maintEstablishment} 
                                            onChange={e => setMaintEstablishment(e.target.value)} 
                                            placeholder="Ex: Moto Mecânica do Toninho" 
                                            className="h-9 rounded-lg font-bold text-xs bg-card"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-1">
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setExpandedTxId(null)}
                                        className="rounded-full text-[10px] font-black uppercase tracking-wider h-9"
                                      >
                                        Cancelar
                                      </Button>
                                      <Button 
                                        onClick={() => handleSaveAllocation(tx)}
                                        className="rounded-full bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-wider h-9 px-5 flex items-center gap-1.5"
                                      >
                                        <Check className="w-4 h-4" /> Categorizar e Vincular
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 bg-card border border-dashed rounded-3xl text-center opacity-40 max-w-lg mx-auto">
                          <p className="text-xl">🙌</p>
                          <p className="text-xs font-black uppercase tracking-wider mt-2">Nenhuma despesa pendente</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                            Tudo organizado! Lançamentos futuros feitos na tela de contas a pagar com as categorias monitoradas aparecerão aqui automaticamente.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* LISTAGEM AGRUPADA POR TIPO COM TOTAIS */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" /> HISTÓRICO DE GASTOS DO VEÍCULO AGRUPADO
                      </h4>

                      <div className="space-y-3">
                        {[
                          { id: "combustivel", label: "Gastos com Combustível", icon: "⛽", color: "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:border-amber-950/30" },
                          { id: "cosmetico", label: "Estética & Acessórios de Proteção", icon: "🛡️", color: "bg-purple-500/5 border-purple-500/20 text-purple-600 dark:border-purple-950/30" },
                          { id: "manutencao_periodica", label: "Manutenções Periódicas", icon: "🔧", color: "bg-blue-500/5 border-blue-500/20 text-blue-600 dark:border-blue-950/30" },
                          { id: "outros", label: "Outros Gastos & Taxas", icon: "📝", color: "bg-slate-500/5 border-slate-500/20 text-slate-600 dark:border-slate-950/30" }
                        ].map((grupoDef) => {
                          const gp = despesasAgrupadas[grupoDef.id] || { label: grupoDef.label, icon: grupoDef.icon, items: [], total: 0 };
                          const isExpanded = expandedGroups[grupoDef.id];
                          const hasItems = gp.items.length > 0;

                          return (
                            <div key={grupoDef.id} className="rounded-3xl border border-border/50 bg-card overflow-hidden hover:shadow-soft transition-all duration-200">
                              
                              {/* CABEÇALHO DO GRUPO */}
                              <div 
                                onClick={() => setExpandedGroups(prev => ({ ...prev, [grupoDef.id]: !prev[grupoDef.id] }))}
                                className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-muted/30 transition-all duration-150"
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm border", gp.total > 0 ? grupoDef.color : "bg-muted text-muted-foreground border-border/40")}>
                                    {grupoDef.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-black text-sm text-foreground tracking-tight">{grupoDef.label}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                                      {gp.items.length === 1 ? "1 lançamento" : `${gp.items.length} lançamentos`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                  <div className="text-right">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">TOTAL ACUMULADO</p>
                                    <p className={cn("font-black text-lg tabular-nums leading-none", gp.total > 0 ? "text-foreground" : "text-muted-foreground/50")}>
                                      {formatCurrency(gp.total)}
                                    </p>
                                  </div>
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted shrink-0 text-muted-foreground transition-all">
                                    {isExpanded ? (
                                      <span className="font-black text-xs">▲</span>
                                    ) : (
                                      <span className="font-black text-xs">▼</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* LISTAGEM EXPANDIDA DO GRUPO */}
                              {isExpanded && (
                                <div className="border-t border-border/40 bg-muted/5 animate-in fade-in slide-in-from-top-1 duration-150">
                                  {hasItems ? (
                                    <div className="divide-y divide-border/30">
                                      {gp.items.map((item) => (
                                        <div key={item.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-all">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                              <p className="font-bold text-sm text-foreground">{item.title}</p>
                                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest tabular-nums">
                                                {item.date ? format(parseDateLocal(item.date), "dd/MM/yyyy") : "N/A"}
                                              </span>
                                            </div>
                                            {item.description && (
                                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed italic">
                                                {item.description}
                                              </p>
                                            )}

                                            {/* Exibição enriquecida dos metadados específicos de cada tipo de gasto */}
                                            {item.meta && (
                                              <div className="flex flex-wrap gap-1.5 mt-2">
                                                {item.meta.gastoTipo === "combustivel" && (
                                                  <>
                                                    {item.meta.litros && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/5 text-amber-600 border-amber-200">
                                                        ⛽ {item.meta.litros} Litros
                                                      </Badge>
                                                    )}
                                                    {item.meta.precoLitro && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/5 text-amber-600 border-amber-200">
                                                        💸 {formatCurrency(Number(item.meta.precoLitro))}/L
                                                      </Badge>
                                                    )}
                                                    {item.meta.tipoCombustivel && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/5 text-amber-600 border-amber-200 capitalize">
                                                        🎯 {String(item.meta.tipoCombustivel).replace("_", " ")}
                                                      </Badge>
                                                    )}
                                                  </>
                                                )}
                                                {item.meta.gastoTipo === "cosmetico" && (
                                                  <>
                                                    {item.meta.protecaoTipo && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/5 text-purple-600 border-purple-200">
                                                        🛡️ {String(item.meta.protecaoTipo)}
                                                      </Badge>
                                                    )}
                                                    {item.meta.marca && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/5 text-purple-600 border-purple-200">
                                                        🏷️ {String(item.meta.marca)}
                                                      </Badge>
                                                    )}
                                                  </>
                                                )}
                                                {item.meta.gastoTipo === "manutencao_periodica" && (
                                                  <>
                                                    {item.meta.pecaServico && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/5 text-blue-600 border-blue-200">
                                                        🔧 {String(item.meta.pecaServico)}
                                                      </Badge>
                                                    )}
                                                    {item.meta.kmAtual && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/5 text-blue-600 border-blue-200">
                                                        🛣️ {Number(item.meta.kmAtual).toLocaleString('pt-BR')} KM
                                                      </Badge>
                                                    )}
                                                    {item.meta.estabelecimento && (
                                                      <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/5 text-blue-600 border-blue-200">
                                                        🏢 {String(item.meta.estabelecimento)}
                                                      </Badge>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-3 shrink-0">
                                            <span className="font-black text-sm tabular-nums text-foreground">
                                              {formatCurrency(item.amount || 0)}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteHistoryItem(item.id);
                                              }}
                                              className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                              title="Excluir lançamento"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-8 text-center opacity-30">
                                      <p className="text-xs font-black uppercase tracking-widest">Nenhum gasto registrado neste grupo</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </TabsContent>
                </>
              )}

            </div>
          </ScrollArea>

          <DialogFooter className={cn("p-6 sm:p-8 bg-muted/10 border-t shrink-0 flex gap-3", isMobile && "hidden")}>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-full h-12 font-black text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              FECHAR PAINEL
            </Button>
          </DialogFooter>
        </Tabs>
      </ContentComponent>
    </Dialog>
  );
}
