"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car, 
  Shield, 
  AlertTriangle, 
  DollarSign, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  ArrowRight,
  Sparkles,
  LayoutGrid,
  TrendingUp,
  History,
  Zap,
  ShieldCheck,
  Calendar,
  TrendingDown, 
  RefreshCw, 
  PieChart, 
  Home,
  Map,
  Plus,
  Info,
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { cn, parseDateLocal } from "@/lib/utils";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { FipeConsultaDialog } from "@/components/vehicles/FipeConsultaDialog";
import { ImovelFormModal } from "@/components/vehicles/ImovelFormModal";
import { VehicleDetailDialog } from "@/components/vehicles/VehicleDetailDialog";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { formatCurrency, Veiculo, SeguroVeiculo, Imovel, Terreno } from "@/types/finance";
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { format, differenceInDays } from "date-fns"; 
import { ptBR } from "date-fns/locale"; 
import { toast } from "sonner";

interface VehicleInsight {
  tipo: 'info' | 'alerta' | 'sucesso';
  mensagem: string;
  icone: 'depreciation' | 'insurance' | 'payment';
}

const BensImobilizados = () => {
  const { 
    veiculos, 
    deleteVeiculo, 
    getPendingVehicles,
    segurosVeiculo,
    getValorFipeTotal,
    getValorImoveisTerrenos, // NOVO
    imoveis, // NOVO
    terrenos, // NOVO
    addImovel, // NOVO
    updateImovel, // NOVO
    deleteImovel, // NOVO
    addTerreno, // NOVO
    updateTerreno, // NOVO
    deleteTerreno, // NOVO
    dateRanges,
    setDateRanges
  } = useFinance();
  
  const colors = useChartColors();
  const [activeTab, setActiveTab] = useState("veiculos");
  const [showFipeDialog, setShowFipeDialog] = useState(false);
  const [selectedVeiculoForFipe, setSelectedVeiculoForFipe] = useState<Veiculo | undefined>();
  
  // Estados para Imóveis/Terrenos
  const [showImovelModal, setShowImovelModal] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | Terreno | undefined>(undefined);
  const [imovelModalType, setImovelModalType] = useState<'imovel' | 'terreno'>('imovel');
  
  // Estado para modal de detalhes do veículo
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);

  const pendingVehicles = getPendingVehicles();
  const totalFipe = getValorFipeTotal(dateRanges.range1.to);
  const totalImoveisTerrenos = getValorImoveisTerrenos(dateRanges.range1.to);
  const patrimonioImobilizadoTotal = totalFipe + totalImoveisTerrenos;

  // --- Dados para Gráficos ---
  const distributionData = useMemo(() => {
    const data = [
      { name: 'Veículos', value: totalFipe, color: colors.primary },
      { name: 'Imóveis', value: imoveis.reduce((acc, i) => acc + i.valorAvaliacao, 0), color: colors.success },
      { name: 'Terrenos', value: terrenos.reduce((acc, t) => acc + t.valorAvaliacao, 0), color: colors.accent },
    ].filter(d => d.value > 0);
    
    return data;
  }, [totalFipe, imoveis, terrenos, colors]);

  const insuranceTimeline = useMemo(() => {
    return segurosVeiculo.flatMap(s => 
      s.parcelas.map(p => ({
        ...p,
        seguradora: s.seguradora,
        veiculo: veiculos.find(v => v.id === s.veiculoId)?.modelo || "N/A"
      }))
    ).sort((a, b) => parseDateLocal(a.vencimento).getTime() - parseDateLocal(b.vencimento).getTime());
  }, [segurosVeiculo, veiculos]);

  const handleOpenFipe = (v?: Veiculo) => {
    setSelectedVeiculoForFipe(v);
    setShowFipeDialog(true);
  };
  
  const handleViewDetails = (veiculo: Veiculo) => {
    setSelectedVehicle(veiculo);
    setShowVehicleDetail(true);
  };
  
  // Função para obter insights dinâmicos dos veículos
  const getVehicleInsights = useMemo((): VehicleInsight[] => {
    const insights: VehicleInsight[] = [];
    const hoje = new Date();
    
    // 1. Verificar veículos sem seguro
    const veiculosAtivos = veiculos.filter(v => v.status === 'ativo');
    const veiculosSemSeguro = veiculosAtivos.filter(
      v => !segurosVeiculo.some(s => s.veiculoId === v.id)
    );
    
    if (veiculosSemSeguro.length > 0) {
      insights.push({
        tipo: 'alerta',
        mensagem: `${veiculosSemSeguro.length} veículo(s) sem seguro cadastrado: ${veiculosSemSeguro.map(v => v.modelo).join(', ')}.`,
        icone: 'insurance'
      });
    } else if (veiculosAtivos.length > 0) {
      insights.push({
        tipo: 'sucesso',
        mensagem: 'Todos os veículos possuem seguro cadastrado.',
        icone: 'insurance'
      });
    }
    
    // 2. Verificar parcelas de seguro vencidas ou próximas do vencimento
    const parcelasProximas: { veiculo: string; dias: number; valor: number }[] = [];
    const parcelasVencidas: { veiculo: string; valor: number }[] = [];
    
    segurosVeiculo.forEach(s => {
      const veiculo = veiculos.find(v => v.id === s.veiculoId);
      if (!veiculo) return;
      
      s.parcelas.forEach(p => {
        if (p.paga) return;
        
        const vencimento = parseDateLocal(p.vencimento);
        const diasAteVencimento = differenceInDays(vencimento, hoje);
        
        if (diasAteVencimento < 0) {
          parcelasVencidas.push({ veiculo: veiculo.modelo, valor: p.valor });
        } else if (diasAteVencimento <= 7) {
          parcelasProximas.push({ veiculo: veiculo.modelo, dias: diasAteVencimento, valor: p.valor });
        }
      });
    });
    
    if (parcelasVencidas.length > 0) {
      insights.push({
        tipo: 'alerta',
        mensagem: `${parcelasVencidas.length} parcela(s) de seguro vencida(s). Regularize para manter a cobertura.`,
        icone: 'payment'
      });
    }
    
    if (parcelasProximas.length > 0) {
      const totalValor = parcelasProximas.reduce((acc, p) => acc + p.valor, 0);
      insights.push({
        tipo: 'info',
        mensagem: `${parcelasProximas.length} parcela(s) de seguro vencendo em até 7 dias. Total: ${formatCurrency(totalValor)}.`,
        icone: 'payment'
      });
    }
    
    // 3. Calcular depreciação média da frota (estimativa)
    if (veiculosAtivos.length > 0) {
      const totalCompra = veiculosAtivos.reduce((acc, v) => acc + (v.valorVeiculo || v.valorFipe), 0);
      const totalAtual = veiculosAtivos.reduce((acc, v) => acc + v.valorFipe, 0);
      
      if (totalCompra > 0) {
        const depreciacaoPercent = ((totalCompra - totalAtual) / totalCompra) * 100;
        
        if (depreciacaoPercent > 0) {
          insights.push({
            tipo: 'info',
            mensagem: `Sua frota acumulou ${depreciacaoPercent.toFixed(1)}% de depreciação desde a compra.`,
            icone: 'depreciation'
          });
        } else if (depreciacaoPercent < 0) {
          insights.push({
            tipo: 'sucesso',
            mensagem: `Sua frota valorizou ${Math.abs(depreciacaoPercent).toFixed(1)}% desde a compra!`,
            icone: 'depreciation'
          });
        }
      }
    }
    
    // Se não houver insights, adicionar mensagem padrão
    if (insights.length === 0) {
      insights.push({
        tipo: 'info',
        mensagem: 'Cadastre veículos e seguros para receber insights personalizados.',
        icone: 'insurance'
      });
    }
    
    return insights;
  }, [veiculos, segurosVeiculo]);
  
  // Insights para imóveis
  const getImovelInsights = useMemo((): VehicleInsight[] => {
    const insights: VehicleInsight[] = [];
    
    const imoveisAtivos = imoveis.filter(i => i.status === 'ativo');
    const terrenosAtivos = terrenos.filter(t => t.status === 'ativo');
    
    // Calcular valorização/desvalorização
    if (imoveisAtivos.length > 0) {
      const totalAquisicao = imoveisAtivos.reduce((acc, i) => acc + i.valorAquisicao, 0);
      const totalAvaliacao = imoveisAtivos.reduce((acc, i) => acc + i.valorAvaliacao, 0);
      
      if (totalAquisicao > 0) {
        const variacaoPercent = ((totalAvaliacao - totalAquisicao) / totalAquisicao) * 100;
        
        if (variacaoPercent >= 0) {
          insights.push({
            tipo: 'sucesso',
            mensagem: `Seus imóveis valorizaram ${variacaoPercent.toFixed(1)}% desde a aquisição.`,
            icone: 'depreciation'
          });
        } else {
          insights.push({
            tipo: 'info',
            mensagem: `A avaliação dos seus imóveis está ${Math.abs(variacaoPercent).toFixed(1)}% abaixo do valor de aquisição.`,
            icone: 'depreciation'
          });
        }
      }
    }
    
    // Info sobre terrenos
    if (terrenosAtivos.length > 0) {
      insights.push({
        tipo: 'sucesso',
        mensagem: `${terrenosAtivos.length} terreno(s) registrado(s), potencial para construção ou valorização.`,
        icone: 'insurance'
      });
    }
    
    if (insights.length === 0) {
      insights.push({
        tipo: 'info',
        mensagem: 'Cadastre imóveis e terrenos para receber insights personalizados.',
        icone: 'insurance'
      });
    }
    
    return insights;
  }, [imoveis, terrenos]);
  
  const handleOpenImovelModal = (type: 'imovel' | 'terreno', asset?: Imovel | Terreno) => {
    setImovelModalType(type);
    setEditingImovel(asset);
    setShowImovelModal(true);
  };
  
  const handleSaveImovel = (asset: Imovel | Terreno) => {
    if (asset.id) {
      if (imovelModalType === 'imovel') updateImovel(asset.id, asset as Imovel);
      else updateTerreno(asset.id, asset as Terreno);
    } else {
      if (imovelModalType === 'imovel') addImovel(asset as Omit<Imovel, 'id'>);
      else addTerreno(asset as Omit<Terreno, 'id'>);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-10 pb-12">
        {/* Header Expressivo */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/10">
              <Home className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl leading-none tracking-tight">Bens Imobilizados</h1>
              <p className="text-sm text-muted-foreground font-bold tracking-widest mt-1 uppercase opacity-60">Gestão Patrimonial Imobilizada</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={setDateRanges}
              className="h-11 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm px-6 font-bold"
            />
          </div>
        </header>

        {/* Hero Section: Valor da Frota */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 h-[400px] flex flex-col justify-between group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-50"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 shadow-sm">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Avaliação Total Imobilizada</span>
                    <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest mt-0.5">Veículos, Imóveis e Terrenos</p>
                  </div>
                </div>
                
                <h2 className="font-display font-extrabold text-6xl sm:text-7xl text-foreground tracking-tighter leading-none tabular-nums">
                  {formatCurrency(patrimonioImobilizadoTotal)}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <Badge variant="outline" className="bg-success/10 text-success border-none px-4 py-1.5 rounded-xl font-black text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" /> PATRIMÔNIO ATIVO
                  </Badge>
                  <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                    <History className="w-4 h-4 opacity-40" />
                    <span>Última atualização em {format(new Date(), "MMMM yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex justify-end">
                 <div className="p-4 rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Veículos / Imóveis</p>
                       <p className="font-black text-lg text-foreground leading-none">{veiculos.length} / {imoveis.length + terrenos.length} Ativos</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                       <LayoutGrid className="w-5 h-5" />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Cockpit Lateral */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-[190px] hover:-translate-y-1 transition-transform cursor-help">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-primary shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <Badge className="bg-warning/10 text-warning border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase">Manutenção</Badge>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Custo Mensal Médio</p>
                <p className="font-display font-black text-3xl text-foreground tabular-nums">R$ 850,00</p>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-[32px] p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-[184px] hover:-translate-y-1 transition-transform cursor-help">
               <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-success shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <Badge className="bg-success/10 text-success border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase">Proteção</Badge>
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Cobertura Total</p>
                <p className="font-display font-black text-3xl text-foreground tabular-nums">100% Frota</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas de Cadastro Pendente */}
        {pendingVehicles.length > 0 && (
          <div className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-2 px-1">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-warning">Ações Necessárias</p>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {pendingVehicles.map(v => (
                  <div key={v.id} className="min-w-[320px] p-6 rounded-[2rem] border-2 border-dashed border-warning/30 bg-warning/5 flex items-center justify-between group hover:bg-warning/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-warning/20 flex items-center justify-center text-warning">
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground leading-tight">Configurar {v.modelo}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Comprado em {parseDateLocal(v.dataCompra).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="rounded-full bg-warning/20 text-warning group-hover:scale-110 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Navegação de Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          <div className="flex justify-center">
            <TabsList className="grid w-full grid-cols-3 h-14 bg-muted/30 p-1.5 rounded-[2rem] border border-border/40 max-w-xl">
              <TabsTrigger value="veiculos" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all gap-2">
                <Car className="w-4 h-4" /> Veículos
              </TabsTrigger>
              <TabsTrigger value="imoveis" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all gap-2">
                <Home className="w-4 h-4" /> Imóveis
              </TabsTrigger>
              <TabsTrigger value="seguros" className="rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-lg transition-all gap-2">
                <Shield className="w-4 h-4" /> Seguros
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="veiculos" className="space-y-10 animate-in fade-in duration-500">
            {/* Grid de Veículos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {veiculos.filter(v => v.status === 'ativo').map((v) => {
                const seguro = segurosVeiculo.find(s => s.veiculoId === v.id);
                const parcelasPagas = seguro?.parcelas.filter(p => p.paga).length || 0;
                const totalParcelas = seguro?.numeroParcelas || 0;
                const progress = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0;

                return (
                  <div 
                    key={v.id}
                    onClick={() => handleViewDetails(v)} 
                    className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                        {v.tipo === 'moto' ? <MotorcycleIcon className="w-32 h-32" /> : <Car className="w-32 h-32" />}
                    </div>

                    <div className="flex items-start justify-between mb-10 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                          {v.tipo === 'moto' ? <MotorcycleIcon className="w-7 h-7" /> : <Car className="w-7 h-7" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-lg text-foreground leading-tight tracking-tight">{v.modelo}</p>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none px-2 py-0.5">{v.marca}</Badge>
                             <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{v.ano}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteVeiculo(v.id); }} className="h-10 w-10 rounded-full text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avaliação FIPE</p>
                           <p className="font-black text-2xl text-success tabular-nums">{formatCurrency(v.valorFipe)}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleOpenFipe(v); }}
                          className="h-8 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 text-primary"
                        >
                          Atualizar <RefreshCw className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                      
                      {seguro && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Seguro: {seguro.seguradora}</p>
                            <p className="text-[10px] font-black text-primary">{parcelasPagas}/{totalParcelas}</p>
                          </div>
                          <div className="h-2 bg-muted/50 rounded-full overflow-hidden p-0.5">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ativo</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                        DETALHES <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Seção de Análise da Frota */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-[48px] p-10 shadow-soft border border-white/60 dark:border-white/5">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-2xl text-foreground">Composição Patrimonial</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Distribuição de Valor por Veículo</p>
                  </div>
                </div>
                
                <div className="h-[300px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={distributionData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        formatter={(v: number) => [formatCurrency(v), "Valor"]}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  {/* Texto central do gráfico radial */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total</span>
                    <span className="text-2xl font-black text-foreground">{formatCurrency(patrimonioImobilizadoTotal)}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">{distributionData.length} categorias</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-foreground">Insights</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inteligência Orbium</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {getVehicleInsights.map((insight, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-4 rounded-2xl flex gap-3 border",
                        insight.tipo === 'alerta' ? "bg-warning/5 border-warning/10" :
                        insight.tipo === 'sucesso' ? "bg-success/5 border-success/10" :
                        "bg-primary/5 border-primary/10"
                      )}
                    >
                      {insight.icone === 'depreciation' ? (
                        insight.tipo === 'sucesso' ? (
                          <TrendingUp className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-primary shrink-0" />
                        )
                      ) : insight.icone === 'insurance' ? (
                        insight.tipo === 'sucesso' ? (
                          <ShieldCheck className="w-5 h-5 text-success shrink-0" />
                        ) : insight.tipo === 'alerta' ? (
                          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                        ) : (
                          <Info className="w-5 h-5 text-primary shrink-0" />
                        )
                      ) : (
                        insight.tipo === 'alerta' ? (
                          <Clock className="w-5 h-5 text-warning shrink-0" />
                        ) : (
                          <DollarSign className="w-5 h-5 text-primary shrink-0" />
                        )
                      )}
                      <p className={cn(
                        "text-[11px] font-bold leading-tight uppercase",
                        insight.tipo === 'alerta' ? "text-warning-foreground" :
                        insight.tipo === 'sucesso' ? "text-success" :
                        "text-primary"
                      )}>
                        {insight.mensagem}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="imoveis" className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-2">
                <h3 className="font-display font-black text-2xl text-foreground">Imóveis e Terrenos</h3>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => handleOpenImovelModal('terreno')}
                        className="h-10 rounded-full gap-2 px-5 font-bold border-border/40 bg-card/50 backdrop-blur-sm"
                    >
                        <Map className="w-4 h-4" /> Novo Terreno
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleOpenImovelModal('imovel')}
                        className="h-10 rounded-full gap-2 px-5 font-bold border-border/40 bg-card/50 backdrop-blur-sm"
                    >
                        <Home className="w-4 h-4" /> Novo Imóvel
                    </Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {imoveis.filter(i => i.status === 'ativo').map(i => (
                    <div 
                        key={i.id}
                        onClick={() => handleOpenImovelModal('imovel', i)}
                        className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                            <Home className="w-32 h-32" />
                        </div>
                        <div className="flex items-start justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-[1.25rem] bg-success/10 flex items-center justify-center text-success group-hover:scale-110 group-hover:bg-success group-hover:text-white transition-all duration-500">
                                    <Home className="w-7 h-7" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-lg text-foreground leading-tight tracking-tight">{i.descricao}</p>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none px-2 py-0.5">{i.tipo}</Badge>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteImovel(i.id); }} className="h-10 w-10 rounded-full text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avaliação Atual</p>
                            <p className="font-black text-3xl text-success tabular-nums">{formatCurrency(i.valorAvaliacao)}</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ativo</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                                DETALHES <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                ))}
                
                {terrenos.filter(t => t.status === 'ativo').map(t => (
                    <div 
                        key={t.id}
                        onClick={() => handleOpenImovelModal('terreno', t)}
                        className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
                            <Map className="w-32 h-32" />
                        </div>
                        <div className="flex items-start justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-[1.25rem] bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-500">
                                    <Map className="w-7 h-7" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-lg text-foreground leading-tight tracking-tight">{t.descricao}</p>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none px-2 py-0.5">Terreno</Badge>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteTerreno(t.id); }} className="h-10 w-10 rounded-full text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avaliação Atual</p>
                            <p className="font-black text-3xl text-success tabular-nums">{formatCurrency(t.valorAvaliacao)}</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ativo</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                                DETALHES <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                ))}
                
                {imoveis.length === 0 && terrenos.length === 0 && (
                    <div className="lg:col-span-3 py-20 text-center opacity-30">
                        <Home className="w-16 h-16 mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Nenhum imóvel ou terreno registrado</p>
                    </div>
                )}
            </div>
            
            {/* Gráfico de Composição Imóveis/Terrenos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-[48px] p-10 shadow-soft border border-white/60 dark:border-white/5">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-2xl text-foreground">Composição Imobilizada</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Distribuição de Valor por Classe</p>
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={distributionData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        formatter={(v: number) => [formatCurrency(v), "Valor"]}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-surface-light dark:bg-surface-dark rounded-[40px] p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-foreground">Insights</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Imóveis</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {getImovelInsights.map((insight, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-4 rounded-2xl flex gap-3 border",
                        insight.tipo === 'alerta' ? "bg-warning/5 border-warning/10" :
                        insight.tipo === 'sucesso' ? "bg-success/5 border-success/10" :
                        "bg-primary/5 border-primary/10"
                      )}
                    >
                      {insight.icone === 'depreciation' ? (
                        insight.tipo === 'sucesso' ? (
                          <TrendingUp className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-primary shrink-0" />
                        )
                      ) : (
                        insight.tipo === 'sucesso' ? (
                          <ShieldCheck className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <Info className="w-5 h-5 text-primary shrink-0" />
                        )
                      )}
                      <p className={cn(
                        "text-[11px] font-bold leading-tight uppercase",
                        insight.tipo === 'alerta' ? "text-warning-foreground" :
                        insight.tipo === 'sucesso' ? "text-success" :
                        "text-primary"
                      )}>
                        {insight.mensagem}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seguros" className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft">
              <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 shadow-sm">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-2xl text-foreground">Cronograma de Proteção</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Parcelas e Vencimentos</p>
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-6 py-1.5 font-black text-xs uppercase tracking-widest bg-muted/50 text-muted-foreground">
                  {insuranceTimeline.length} LANÇAMENTOS
                </Badge>
              </div>

              <div className="space-y-4">
                {insuranceTimeline.map((p, idx) => {
                  const isOverdue = !p.paga && parseDateLocal(p.vencimento) < new Date();
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] border transition-all group",
                        p.paga ? "bg-success/[0.02] border-success/20 opacity-70" : 
                        isOverdue ? "bg-destructive/[0.02] border-destructive/20" : 
                        "bg-card border-border/40 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                          p.paga ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-sm text-foreground">{p.seguradora}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <Car className="w-3 h-3" /> {p.veiculo} • Parcela {p.numero}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-8 mt-4 sm:mt-0">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Vencimento</p>
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <Calendar className="w-3.5 h-3.5 opacity-40" />
                            {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        
                        <div className="text-right min-w-[100px]">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Valor</p>
                          <p className={cn("font-black text-lg tabular-nums", p.paga ? "text-success" : "text-foreground")}>
                            {formatCurrency(p.valor)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge className={cn(
                            "text-[9px] font-black border-none px-3 py-1 rounded-lg uppercase tracking-widest",
                            p.paga ? "bg-success/10 text-success" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                          )}>
                            {p.paga ? "Paga" : isOverdue ? "Vencida" : "Pendente"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {insuranceTimeline.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                    <Shield className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">Nenhum seguro registrado</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <FipeConsultaDialog 
        open={showFipeDialog} 
        onOpenChange={setShowFipeDialog} 
        veiculo={selectedVeiculoForFipe}
      />
      
      <ImovelFormModal
        open={showImovelModal}
        onOpenChange={setShowImovelModal}
        type={imovelModalType}
        editingAsset={editingImovel}
        onSubmit={handleSaveImovel}
        onDelete={imovelModalType === 'imovel' ? deleteImovel : deleteTerreno}
      />
      
      <VehicleDetailDialog
        open={showVehicleDetail}
        onOpenChange={setShowVehicleDetail}
        veiculo={selectedVehicle}
        seguro={selectedVehicle ? segurosVeiculo.find(s => s.veiculoId === selectedVehicle.id) : undefined}
        onUpdateFipe={handleOpenFipe}
      />
    </MainLayout>
  );
};

export default BensImobilizados;