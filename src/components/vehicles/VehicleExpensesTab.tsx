"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Fuel, 
  Wrench, 
  Sparkles, 
  Receipt, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  Plus, 
  Check, 
  AlertCircle,
  ArrowRight,
  PlusCircle
} from "lucide-react";
import { formatCurrency, Veiculo, VehicleHistoryItem } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";

interface VehicleExpensesTabProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleExpensesTab({ veiculo, onUpdateVeiculo }: VehicleExpensesTabProps) {
  const { 
    transacoesV2, 
    categoriasV2, 
    setTransacoesV2,
    contasMovimento,
    addTransacaoV2
  } = useFinance();

  // Filtro de categorias selecionadas
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (veiculo.categoriasDespesasIds && veiculo.categoriasDespesasIds.length > 0) {
      return veiculo.categoriasDespesasIds;
    }
    return categoriasV2
      .filter(c => c.nature !== 'receita')
      .filter(c => {
        const lbl = c.label.toLowerCase();
        return lbl.includes('combust') || lbl.includes('veíc') || lbl.includes('veic') || lbl.includes('manuten') || lbl.includes('carro') || lbl.includes('moto');
      })
      .map(c => c.id);
  });

  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Estados para vinculação/alocação inline de transação não categorizada
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [allocType, setAllocType] = useState<'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros'>("manutencao_periodica");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocTitle, setAllocTitle] = useState("");
  const [allocDesc, setAllocDesc] = useState("");

  // Metadados específicos do formulário expansível
  const [fuelLitres, setFuelLitres] = useState("");
  const [fuelPricePerLitre, setFuelPricePerLitre] = useState("");
  const [fuelOdometer, setFuelOdometer] = useState("");
  const [fuelType, setFuelType] = useState<string>("gasolina_comum");

  const [cosmeticProtectionType, setCosmeticProtectionType] = useState("");
  const [cosmeticBrand, setCosmeticBrand] = useState("");

  const [maintPart, setMaintPart] = useState("");
  const [maintKm, setMaintKm] = useState("");
  const [maintEstablishment, setMaintEstablishment] = useState("");

  // Estado para cadastro de lançamento manual direto (sem precisar vir do extrato)
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualType, setManualType] = useState<'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros'>("combustivel");
  const [manualAccountId, setManualAccountId] = useState("");
  const [manualLitres, setManualLitres] = useState("");
  const [manualPricePerLitre, setManualPricePerLitre] = useState("");
  const [manualOdometer, setManualOdometer] = useState("");
  const [manualFuelType, setManualFuelType] = useState<string>("gasolina_comum");

  // Toggle de categoria
  const handleToggleCategory = (catId: string) => {
    const updated = selectedCategories.includes(catId)
      ? selectedCategories.filter(id => id !== catId)
      : [...selectedCategories, catId];

    setSelectedCategories(updated);
    onUpdateVeiculo(veiculo.id, { categoriasDespesasIds: updated });
  };

  // Mapear valores já alocados para o veículo por transação do financeiro
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

  // Transações potenciais pendentes de classificação para este veículo
  const pendingTransactions = useMemo(() => {
    if (!veiculo || !transacoesV2) return [];

    return transacoesV2
      .filter(tx => {
        if (tx.flow !== 'out') return false;

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
        if (descLower.includes('seguro') || descLower.includes('ipva') || descLower.includes('licenciamento')) {
          return false;
        }

        const matchesCategory = tx.categoryId ? selectedCategories.includes(tx.categoryId) : false;
        const matchesPlate = veiculo.placa ? descLower.includes(veiculo.placa.toLowerCase().replace("-", "").trim()) : false;
        const matchesModel = veiculo.modelo ? descLower.includes(veiculo.modelo.toLowerCase().trim()) : false;

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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [veiculo, transacoesV2, selectedCategories, allocatedAmounts, categoriasV2]);

  // Agrupamento das despesas já registradas no histórico
  const despesasAgrupadas = useMemo(() => {
    const grupos: Record<string, { label: string; icon: any; color: string; items: VehicleHistoryItem[]; total: number }> = {
      combustivel: { label: "Combustível", icon: Fuel, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", items: [], total: 0 },
      cosmetico: { label: "Cosméticos & Cuidados", icon: Sparkles, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", items: [], total: 0 },
      manutencao_periodica: { label: "Manutenção Periódica", icon: Wrench, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", items: [], total: 0 },
      outros: { label: "Outros Gastos / Taxas", icon: Receipt, color: "text-slate-500 bg-slate-500/10 border-slate-500/20", items: [], total: 0 },
    };

    if (!veiculo || !veiculo.historico) return grupos;

    veiculo.historico.forEach(item => {
      if (item.type === "fipe") return;

      let tipo = "outros";
      if (item.meta?.gastoTipo) {
        tipo = item.meta.gastoTipo as string;
      } else {
        const text = `${item.title} ${item.description || ""}`.toLowerCase();
        if (text.includes("combust") || text.includes("gasol") || text.includes("abastec") || text.includes("etanol") || text.includes("diesel")) {
          tipo = "combustivel";
        } else if (text.includes("cosmet") || text.includes("protet") || text.includes("cera") || text.includes("limpeza") || text.includes("lavagem")) {
          tipo = "cosmetico";
        } else if (text.includes("oleo") || text.includes("filtro") || text.includes("pneu") || text.includes("freio") || item.type === "manutencao") {
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

  // Handler para selecionar transação pendente do extrato
  const handleSelectPendingTx = (tx: any) => {
    if (expandedTxId === tx.id) {
      setExpandedTxId(null);
      return;
    }

    setExpandedTxId(tx.id);
    setAllocAmount(tx.pendingAmount.toFixed(2));
    setAllocTitle(tx.description);
    setAllocDesc("");

    const text = `${tx.description} ${tx.meta?.notes || ""}`.toLowerCase();
    let detectedType: 'combustivel' | 'cosmetico' | 'manutencao_periodica' | 'outros' = "outros";

    if (text.includes("combust") || text.includes("gasol") || text.includes("abastec") || text.includes("etanol") || text.includes("diesel") || text.includes("posto")) {
      detectedType = "combustivel";
      setAllocTitle("Abastecimento");
    } else if (text.includes("cosmet") || text.includes("protet") || text.includes("cera") || text.includes("limpeza") || text.includes("lavagem")) {
      detectedType = "cosmetico";
    } else if (text.includes("oleo") || text.includes("filtro") || text.includes("pneu") || text.includes("freio") || text.includes("oficina") || text.includes("mecanic")) {
      detectedType = "manutencao_periodica";
    }

    setAllocType(detectedType);
    setFuelLitres("");
    setFuelPricePerLitre("");
    setFuelOdometer("");
    setFuelType("gasolina_comum");
    setCosmeticProtectionType("");
    setCosmeticBrand("");
    setMaintPart("");
    setMaintKm("");
    setMaintEstablishment("");
  };

  // Handler para salvar alocação
  const handleSaveAllocation = (tx: any) => {
    const amount = parseFloat(allocAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Por favor, digite um valor válido.");
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
      meta.odometro = fuelOdometer ? parseFloat(fuelOdometer.replace(",", ".")) : undefined;
      meta.kmAtual = fuelOdometer ? parseFloat(fuelOdometer.replace(",", ".")) : undefined;
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
      id: `vh_alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: allocType === 'manutencao_periodica' ? 'manutencao' : 'despesa',
      date: tx.date,
      title: allocTitle,
      description: allocDesc || undefined,
      amount: amount,
      meta: meta,
    };

    const updatedHistory = [...(veiculo.historico || []), historyItem];
    onUpdateVeiculo(veiculo.id, { historico: updatedHistory });

    toast.success("Lançamento alocado e vinculado com sucesso!");
    setExpandedTxId(null);
  };

  // Handler para criação de lançamento manual direto
  const handleSaveManualEntry = () => {
    const amount = parseFloat(manualAmount.replace(",", "."));
    if (!manualTitle.trim()) {
      toast.error("Informe a descrição do lançamento.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const txId = `tx_veh_manual_${Date.now()}`;
    const accountIdToUse = manualAccountId || (contasMovimento[0]?.id || "default");

    // 1. Criar transação real no financeiro
    const newTx = {
      date: manualDate,
      accountId: accountIdToUse,
      flow: "out" as const,
      operationType: "despesa" as const,
      domain: "asset" as const,
      amount: amount,
      categoryId: selectedCategories[0] || null,
      description: `🚗 ${manualTitle} (${veiculo.modelo})`,
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
      }
    };

    addTransacaoV2(newTx);

    const meta: Record<string, unknown> = {
      transactionId: txId,
      gastoTipo: manualType,
    };

    if (manualType === "combustivel") {
      meta.litros = manualLitres ? parseFloat(manualLitres.replace(",", ".")) : undefined;
      meta.precoLitro = manualPricePerLitre ? parseFloat(manualPricePerLitre.replace(",", ".")) : undefined;
      meta.odometro = manualOdometer ? parseFloat(manualOdometer.replace(",", ".")) : undefined;
      meta.kmAtual = manualOdometer ? parseFloat(manualOdometer.replace(",", ".")) : undefined;
      meta.tipoCombustivel = manualFuelType;
    }

    // 2. Salvar no histórico do veículo
    const historyItem: VehicleHistoryItem = {
      id: `vh_manual_${Date.now()}`,
      type: manualType === 'manutencao_periodica' ? 'manutencao' : 'despesa',
      date: manualDate,
      title: manualTitle,
      amount: amount,
      meta: meta,
    };

    const updatedHistory = [...(veiculo.historico || []), historyItem];
    onUpdateVeiculo(veiculo.id, { historico: updatedHistory });

    toast.success("Lançamento de despesa registrado com sucesso!");
    setShowManualForm(false);
    setManualTitle("");
    setManualAmount("");
    setManualLitres("");
    setManualPricePerLitre("");
    setManualOdometer("");
  };

  // Excluir vínculo de histórico
  const handleDeleteHistoryItem = (itemId: string) => {
    const updatedHistory = (veiculo.historico || []).filter(h => h.id !== itemId);
    onUpdateVeiculo(veiculo.id, { historico: updatedHistory });
    toast.success("Registro removido com sucesso!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SEÇÃO 1: RECONCILIAÇÃO DO EXTRATO (SEM MODAIS) */}
      <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-xl text-foreground">Extrato Pendente de Alocação</h3>
              {pendingTransactions.length > 0 && (
                <Badge className="bg-primary/10 text-primary border-none font-black text-xs px-2.5 py-0.5 rounded-full">
                  {pendingTransactions.length}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Lançamentos das suas contas financeiras que podem pertencer a este veículo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl text-xs font-bold gap-2"
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            >
              <Filter className="w-3.5 h-3.5" /> Filtrar Categorias
            </Button>

            <Button 
              size="sm" 
              className="rounded-xl text-xs font-black gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowManualForm(!showManualForm)}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Novo Lançamento Direto
            </Button>
          </div>
        </div>

        {/* FILTRO DE CATEGORIAS EXPANSÍVEL INLINE */}
        {showCategoryFilter && (
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 mb-6 animate-in fade-in duration-200">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Selecione as categorias monitoradas para busca no extrato:
            </p>
            <div className="flex flex-wrap gap-2">
              {categoriasV2.filter(c => c.nature !== 'receita').map(cat => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-card text-muted-foreground border-border/60 hover:border-border"
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FORMULÁRIO DE LANÇAMENTO DIRETO (SANFONA INLINE) */}
        {showManualForm && (
          <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 mb-6 space-y-4 animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Novo Lançamento Direto no Financeiro</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowManualForm(false)}>Cancelar</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Input placeholder="Ex: Abastecimento Posto X" value={manualTitle} onChange={e => setManualTitle(e.target.value)} className="h-10 rounded-xl font-bold" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor Total (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={manualAmount} onChange={e => setManualAmount(e.target.value)} className="h-10 rounded-xl font-bold tabular-nums" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="h-10 rounded-xl font-bold" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Despesa</Label>
                <Select value={manualType} onValueChange={(v: any) => setManualType(v)}>
                  <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combustivel">⛽ Combustível</SelectItem>
                    <SelectItem value="manutencao_periodica">🔧 Manutenção</SelectItem>
                    <SelectItem value="cosmetico">✨ Cosméticos/Cuidados</SelectItem>
                    <SelectItem value="outros">📝 Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {manualType === 'combustivel' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-card border border-border/40">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Litros (L)</Label>
                  <Input placeholder="Ex: 10" value={manualLitres} onChange={e => setManualLitres(e.target.value)} className="h-9 rounded-lg font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preço por Litro (R$)</Label>
                  <Input placeholder="Ex: 5.00" value={manualPricePerLitre} onChange={e => setManualPricePerLitre(e.target.value)} className="h-9 rounded-lg font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Odômetro Atual (KM)</Label>
                  <Input placeholder="Ex: 10300" value={manualOdometer} onChange={e => setManualOdometer(e.target.value)} className="h-9 rounded-lg font-bold" />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button size="sm" className="rounded-xl font-black uppercase text-xs px-6" onClick={handleSaveManualEntry}>
                Salvar Lançamento
              </Button>
            </div>
          </div>
        )}

        {/* LISTA DE TRANSAÇÕES PENDENTES DE CONCILIAÇÃO */}
        {pendingTransactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border/60 text-center">
            <Check className="w-8 h-8 text-success mx-auto mb-2 opacity-80" />
            <p className="font-bold text-sm text-foreground">Tudo Conciliado!</p>
            <p className="text-xs text-muted-foreground">Não há transações pendentes de alocação no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTransactions.map(tx => {
              const isExpanded = expandedTxId === tx.id;
              return (
                <div 
                  key={tx.id}
                  className={cn(
                    "rounded-2xl border transition-all overflow-hidden",
                    isExpanded ? "bg-card border-primary ring-1 ring-primary/30 shadow-md" : "bg-card border-border/60 hover:border-border"
                  )}
                >
                  <div 
                    onClick={() => handleSelectPendingTx(tx)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{tx.description}</p>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground mt-0.5">
                          <span>Data: {format(parseDateLocal(tx.date), "dd/MM/yyyy")}</span>
                          <span>•</span>
                          <span>Pendência: {formatCurrency(tx.pendingAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="font-black text-base text-foreground tabular-nums">{formatCurrency(tx.amount)}</span>
                      <Button size="sm" variant="ghost" className="rounded-xl text-xs font-bold gap-1">
                        {isExpanded ? "Fechar" : "Categorizar"}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* PAINEL INLINE EXPANSÍVEL (ZERO MODAIS) */}
                  {isExpanded && (
                    <div className="p-6 bg-muted/20 border-t border-border/40 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Gasto</Label>
                          <Select value={allocType} onValueChange={(v: any) => setAllocType(v)}>
                            <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="combustivel">⛽ Combustível</SelectItem>
                              <SelectItem value="manutencao_periodica">🔧 Manutenção Periódica</SelectItem>
                              <SelectItem value="cosmetico">✨ Cosméticos / Cuidados</SelectItem>
                              <SelectItem value="outros">📝 Outros Gastos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título do Item</Label>
                          <Input value={allocTitle} onChange={e => setAllocTitle(e.target.value)} className="h-10 rounded-xl font-bold" />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor a Alocar (R$)</Label>
                          <Input value={allocAmount} onChange={e => setAllocAmount(e.target.value)} className="h-10 rounded-xl font-bold tabular-nums" />
                        </div>
                      </div>

                      {/*Campos específicos por tipo*/}
                      {allocType === 'combustivel' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-card border border-border/40">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Litros</Label>
                            <Input placeholder="Ex: 45.5" value={fuelLitres} onChange={e => setFuelLitres(e.target.value)} className="h-9 rounded-lg font-bold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preço por Litro (R$)</Label>
                            <Input placeholder="Ex: 5.89" value={fuelPricePerLitre} onChange={e => setFuelPricePerLitre(e.target.value)} className="h-9 rounded-lg font-bold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Odômetro (KM)</Label>
                            <Input placeholder="Ex: 10300" value={fuelOdometer} onChange={e => setFuelOdometer(e.target.value)} className="h-9 rounded-lg font-bold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Combustível</Label>
                            <Select value={fuelType} onValueChange={setFuelType}>
                              <SelectTrigger className="h-9 rounded-lg font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gasolina_comum">Gasolina Comum</SelectItem>
                                <SelectItem value="gasolina_aditivada">Gasolina Aditivada</SelectItem>
                                <SelectItem value="etanol">Etanol</SelectItem>
                                <SelectItem value="diesel">Diesel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {allocType === 'manutencao_periodica' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-card border border-border/40">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peça ou Serviço</Label>
                            <Input placeholder="Ex: Troca de óleo / Pastilhas" value={maintPart} onChange={e => setMaintPart(e.target.value)} className="h-9 rounded-lg font-bold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quilometragem (KM)</Label>
                            <Input placeholder="Ex: 45000" value={maintKm} onChange={e => setMaintKm(e.target.value)} className="h-9 rounded-lg font-bold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Oficina / Estabelecimento</Label>
                            <Input placeholder="Ex: Auto Center Silva" value={maintEstablishment} onChange={e => setMaintEstablishment(e.target.value)} className="h-9 rounded-lg font-bold" />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="ghost" className="rounded-xl font-bold" onClick={() => setExpandedTxId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" className="rounded-xl font-black uppercase text-xs px-6 bg-success hover:bg-success/90 text-white" onClick={() => handleSaveAllocation(tx)}>
                          Confirmar Alocação
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 2: HISTÓRICO DE DESPESAS DETALHADAS AGRUPADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(despesasAgrupadas).map(([key, grupo]) => {
          const IconComp = grupo.icon;
          return (
            <div key={key} className="bg-card border border-border/60 rounded-[2.5rem] p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-2xl border", grupo.color)}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-foreground">{grupo.label}</h4>
                    <p className="text-xs text-muted-foreground">{grupo.items.length} registro(s)</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total</span>
                  <span className="font-black text-lg text-foreground tabular-nums">{formatCurrency(grupo.total)}</span>
                </div>
              </div>

              {grupo.items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 font-medium">Nenhum registro nesta categoria.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {grupo.items.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/30 transition-all flex items-center justify-between group">
                      <div>
                        <p className="font-bold text-xs text-foreground">{item.title}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {item.date ? format(parseDateLocal(item.date), "dd/MM/yyyy") : "Data N/A"}
                          {item.meta?.litros ? ` • ${item.meta.litros} L` : ''}
                          {item.meta?.kmAtual ? ` • ${item.meta.kmAtual} KM` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-foreground tabular-nums">{formatCurrency(item.amount)}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={() => handleDeleteHistoryItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
