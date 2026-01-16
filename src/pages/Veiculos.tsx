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
  LineChart,
  Building2
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
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip, 
} from "recharts";
import { useChartColors } from "@/hooks/useChartColors";
import { format, subMonths, endOfMonth } from "date-fns"; 
import { ptBR } from "date-fns/locale"; 
import { toast } from "sonner";

const BensImobilizados = () => {
  const { 
    veiculos, 
    deleteVeiculo, 
    getPendingVehicles,
    segurosVeiculo,
    getValorFipeTotal,
    getValorImoveisTerrenos,
    imoveis,
    terrenos,
    addImovel,
    updateImovel,
    deleteImovel,
    addTerreno,
    updateTerreno,
    deleteTerreno,
    dateRanges,
    setDateRanges
  } = useFinance();
  
  const colors = useChartColors();
  const [activeTab, setActiveTab] = useState("veiculos");
  const [showFipeDialog, setShowFipeDialog] = useState(false);
  const [selectedVeiculoForFipe, setSelectedVeiculoForFipe] = useState<Veiculo | undefined>();
  
  const [showImovelModal, setShowImovelModal] = useState(false);
  const [editingImovel, setEditingImovel] = useState<Imovel | Terreno | undefined>(undefined);
  const [imovelModalType, setImovelModalType] = useState<'imovel' | 'terreno'>('imovel');
  
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);

  const totalFipe = getValorFipeTotal(dateRanges.range1.to);
  const totalImoveisTerrenos = getValorImoveisTerrenos(dateRanges.range1.to);
  const patrimonioImobilizadoTotal = totalFipe + totalImoveisTerrenos;

  const evolutionData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = endOfMonth(subMonths(new Date(), i));
      const val = getValorFipeTotal(date) + getValorImoveisTerrenos(date);
      result.push({ mes: format(date, 'MMM', { locale: ptBR }).toUpperCase(), valor: val });
    }
    return result;
  }, [getValorFipeTotal, getValorImoveisTerrenos]);

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
              <Building2 className="w-7 h-7" />
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 animate-fade-in-up">
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[40px] p-6 sm:p-8 lg:p-10 shadow-soft relative overflow-hidden border border-white/60 dark:border-white/5 min-h-[350px] sm:h-[420px] flex flex-col justify-between group transition-all hover:shadow-soft-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-50"></div>
              
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.07] group-hover:scale-110 transition-transform duration-1000">
                <Home className="w-64 h-64 text-blue-600" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[150px] sm:h-[180px] pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 250">
                  <defs>
                    <linearGradient id="colorBens" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity="0.4"/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <AreaChart data={evolutionData}>
                    <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={5} fillOpacity={1} fill="url(#colorBens)" />
                  </AreaChart>
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 shadow-sm ring-1 ring-blue-500/20">
                    <LineChart className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">Avaliação Total</span>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Ativos Imobilizados</p>
                  </div>
                </div>
                
                <h2 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-foreground tracking-tighter leading-none mt-4 tabular-nums">
                  {formatCurrency(patrimonioImobilizadoTotal)}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <Badge variant="outline" className="bg-success/10 text-success border-none px-4 py-1.5 rounded-xl font-black text-xs shadow-sm">
                    <TrendingUp className="w-3 h-3 mr-1" /> PATRIMÔNIO ATIVO
                  </Badge>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Atualizado via FIPE
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex justify-end">
                 <div className="p-4 rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/5 flex items-center gap-4 group/card hover:scale-105 transition-transform">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Veículos / Imóveis</p>
                       <p className="font-black text-lg text-foreground leading-none">{veiculos.length} / {imoveis.length + terrenos.length} Ativos</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm group-hover/card:bg-blue-600 group-hover/card:text-white transition-all">
                       <LayoutGrid className="w-6 h-6" />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:flex lg:flex-col gap-6">
            {/* Card Manutenção */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-auto min-h-[160px] xl:h-[200px] hover:shadow-soft-lg hover:-translate-y-1 transition-all group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                <Zap className="w-32 h-32 text-orange-600" />
              </div>
              <div className="flex items-start justify-between relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <Badge className="bg-warning/10 text-warning border-none font-black text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-widest">Manutenção</Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Custo Mensal Médio</p>
                <p className="font-display font-black text-xl lg:text-3xl text-foreground tabular-nums">R$ 850,00</p>
              </div>
            </div>

            {/* Card Proteção */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-6 lg:p-8 shadow-soft border border-white/60 dark:border-white/5 flex flex-col justify-between h-auto min-h-[160px] xl:h-[194px] hover:shadow-soft-lg hover:-translate-y-1 transition-all group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                <ShieldCheck className="w-32 h-32 text-green-600" />
              </div>
              <div className="flex items-start justify-between relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-success shadow-sm group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <Badge className="bg-success/10 text-success border-none font-black text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-widest">Proteção</Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1">Cobertura Total</p>
                <p className="font-display font-black text-xl lg:text-3xl text-foreground tabular-nums">100% Frota</p>
              </div>
            </div>
          </div>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {veiculos.filter(v => v.status === 'ativo').map((v, index) => (
                <div 
                  key={v.id}
                  onClick={() => handleViewDetails(v)} 
                  className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-soft-lg hover:-translate-y-2 group relative overflow-hidden cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${(index + 3) * 100}ms` }}
                >
                  {/* Ícone Decorativo de Fundo */}
                  {v.tipo === 'moto' ? (
                    <MotorcycleIcon className="absolute -right-6 -bottom-6 w-32 h-32 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
                  ) : (
                    <Car className="absolute -right-6 -bottom-6 w-32 h-32 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
                  )}

                  <div className="flex items-start justify-between mb-10 relative z-10">
                    <div className="flex items-center gap-5">
                      <div className={cn("w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500")}>
                        {v.tipo === 'moto' ? <MotorcycleIcon className="w-7 h-7" /> : <Car className="w-7 h-7" />}
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-lg text-foreground leading-tight tracking-tight">{v.modelo}</p>
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none px-2 py-0.5">{v.marca}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avaliação FIPE</p>
                    <p className="font-black text-3xl text-success tabular-nums">{formatCurrency(v.valorFipe)}</p>
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
            </div>
          </TabsContent>
          
          <TabsContent value="imoveis" className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {imoveis.filter(i => i.status === 'ativo').map((i, idx) => (
                    <div 
                        key={i.id}
                        onClick={() => handleOpenImovelModal('imovel', i)}
                        className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-soft-lg hover:-translate-y-2 group relative overflow-hidden cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <Home className="absolute -right-6 -bottom-6 w-32 h-32 text-success opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
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
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avaliação Atual</p>
                            <p className="font-black text-3xl text-success tabular-nums">{formatCurrency(i.valorAvaliacao)}</p>
                        </div>
                    </div>
                ))}
                
                {terrenos.filter(t => t.status === 'ativo').map((t, idx) => (
                    <div 
                        key={t.id}
                        onClick={() => handleOpenImovelModal('terreno', t)}
                        className="bg-card hover:bg-muted/20 transition-all duration-500 rounded-[2.5rem] p-8 border border-border/40 shadow-sm hover:shadow-soft-lg hover:-translate-y-2 group relative overflow-hidden cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: `${(idx + imoveis.length) * 100}ms` }}
                    >
                        <Map className="absolute -right-6 -bottom-6 w-32 h-32 text-accent opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
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
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avaliação Atual</p>
                            <p className="font-black text-3xl text-success tabular-nums">{formatCurrency(t.valorAvaliacao)}</p>
                        </div>
                    </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="seguros" className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-surface-light dark:bg-surface-dark rounded-[3rem] p-8 border border-white/60 dark:border-white/5 shadow-soft">
              <div className="space-y-4">
                {insuranceTimeline.map((p, idx) => {
                  const isOverdue = !p.paga && parseDateLocal(p.vencimento) < new Date();
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] border transition-all group animate-fade-in-up",
                        p.paga ? "bg-success/[0.02] border-success/20 opacity-70" : 
                        isOverdue ? "bg-destructive/[0.02] border-destructive/20" : 
                        "bg-card border-border/40 hover:shadow-soft hover:-translate-y-1"
                      )}
                      style={{ animationDelay: `${idx * 100}ms` }}
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
                          <p className="font-bold text-sm tabular-nums">{format(parseDateLocal(p.vencimento), "dd/MM/yyyy")}</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Valor</p>
                          <p className={cn("font-black text-lg tabular-nums", p.paga ? "text-success" : "text-foreground")}>
                            {formatCurrency(p.valor)}
                          </p>
                        </div>
                        <Badge className={cn(
                          "text-[9px] font-black border-none px-3 py-1 rounded-lg uppercase tracking-widest",
                          p.paga ? "bg-success/10 text-success" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                        )}>
                          {p.paga ? "Paga" : isOverdue ? "Vencida" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
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