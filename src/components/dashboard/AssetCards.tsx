"use client";

import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency, Veiculo, Imovel, Terreno } from "@/types/finance";
import { 
  Car, 
  Home, 
  Map as MapIcon, 
  ShieldCheck, 
  ShieldAlert,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle
} from "lucide-react";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { cn } from "@/lib/utils";
import { parseISO, format, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { VehicleDetailDialog } from "@/components/vehicles/VehicleDetailDialog";
import { ImovelFormModal } from "@/components/vehicles/ImovelFormModal";

export const AssetCards = () => {
  const { veiculos, imoveis, terrenos, segurosVeiculo, updateVeiculo, deleteImovel, deleteTerreno, saveImovel, saveTerreno } = useFinance();
  
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  
  const [showImovelModal, setShowImovelModal] = useState(false);
  const [imovelModalType, setImovelModalType] = useState<'imovel' | 'terreno'>('imovel');
  const [editingImovel, setEditingImovel] = useState<Imovel | Terreno | null>(null);

  const handleViewVehicle = (v: Veiculo) => {
    setSelectedVehicle(v);
    setShowVehicleDetail(true);
  };

  const handleViewImovel = (type: 'imovel' | 'terreno', item: Imovel | Terreno) => {
    setImovelModalType(type);
    setEditingImovel(item);
    setShowImovelModal(true);
  };

  const getVehicleInsurance = (vehicleId: number) => {
    return segurosVeiculo.find(s => s.veiculoId === vehicleId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Bens e Ativos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Veículos */}
        {veiculos.map(veiculo => {
          const seguro = getVehicleInsurance(veiculo.id);
          const isSeguroVencido = seguro && isAfter(new Date(), parseISO(seguro.vigenciaFim));

          // Calcular diferença entre FIPE e Valor de Aquisição
          const diff = (veiculo.valorFipe || 0) - (veiculo.valorVeiculo || 0);
          const percentDiff = veiculo.valorVeiculo > 0 ? (diff / veiculo.valorVeiculo) * 100 : 0;

          // Processar IPVA Real
          const ipvaVencido = veiculo.ipvaVencimento && !veiculo.ipvaPago && isAfter(new Date(), parseISO(veiculo.ipvaVencimento));
          const formattedIpvaDate = veiculo.ipvaVencimento ? format(parseISO(veiculo.ipvaVencimento), 'dd/MM/yy') : null;

          // Processar Licenciamento Real
          const licVencido = veiculo.licenciamentoVencimento && !veiculo.licenciamentoPago && isAfter(new Date(), parseISO(veiculo.licenciamentoVencimento));
          const formattedLicDate = veiculo.licenciamentoVencimento ? format(parseISO(veiculo.licenciamentoVencimento), 'dd/MM/yy') : null;

          return (
            <div 
              key={`veh-${veiculo.id}`}
              onClick={() => handleViewVehicle(veiculo)}
              className="bg-card rounded-[32px] p-6 border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer"
            >
              {/* Marca D'água Decorativa de Fundo (Modo Claro: Marrom Sutil, Modo Escuro: Sutil) */}
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-amber-950/[0.08] dark:text-white/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
                {veiculo.tipo === 'moto' ? (
                  <MotorcycleIcon className="w-56 h-56" />
                ) : veiculo.tipo === 'caminhao' ? (
                  <Truck className="w-56 h-56" />
                ) : (
                  <Car className="w-56 h-56" />
                )}
              </div>

              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className={cn(
                  "p-1 rounded-2xl transition-all duration-500 shadow-sm ring-1 ring-black/5 dark:ring-white/5",
                  veiculo.tipo === 'moto' 
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white" 
                    : veiculo.tipo === 'caminhao'
                      ? "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white"
                )}>
                  {veiculo.tipo === 'moto' ? (
                    <MotorcycleIcon className="w-16 h-16" />
                  ) : veiculo.tipo === 'caminhao' ? (
                    <Truck className="w-8 h-8" />
                  ) : (
                    <Car className="w-8 h-8" />
                  )}
                </div>
                <div className="text-right min-w-0">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "border-none text-[9px] font-black uppercase px-2.5 py-0.5",
                      veiculo.tipo === 'moto' 
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400" 
                        : veiculo.tipo === 'caminhao'
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                    )}
                  >
                    {veiculo.tipo === 'moto' ? "Moto" : veiculo.tipo === 'caminhao' ? "Caminhão" : "Carro"}
                  </Badge>
                  <p className="text-lg font-black text-foreground mt-1.5 truncate max-w-[200px]" title={veiculo.modelo}>
                    {veiculo.modelo}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                    {veiculo.marca || "N/A"} • Ano {veiculo.ano}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 pt-2 relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Valor FIPE</p>
                  <p className="text-xl sm:text-2xl font-black text-success tabular-nums">{formatCurrency(veiculo.valorFipe)}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Aquisição</p>
                  <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{formatCurrency(veiculo.valorVeiculo)}</p>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold mt-1 bg-muted/50 dark:bg-muted/20 px-3 py-1 rounded-full w-fit">
                    {diff >= 0 ? (
                      <span className="text-success flex items-center"><TrendingUp className="w-4 h-4 mr-0.5" /> +{percentDiff.toFixed(1)}%</span>
                    ) : (
                      <span className="text-destructive flex items-center"><TrendingDown className="w-4 h-4 mr-0.5" /> {percentDiff.toFixed(1)}%</span>
                    )}
                    <span className="text-muted-foreground font-medium">Valorização residual</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 border-t border-border/60 relative z-10">
                {/* IPVA */}
                <div className="flex flex-col items-center justify-between p-2.5 rounded-[18px] bg-muted/40 dark:bg-muted/10 text-center min-w-0">
                  <span className="text-muted-foreground flex flex-col items-center gap-1 font-bold text-[10px] uppercase tracking-wider">
                    {veiculo.ipvaPago ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : ipvaVencido ? (
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-warning shrink-0" />
                    )}
                    IPVA
                  </span>
                  <span className={cn(
                    "font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-2.5 w-full text-center truncate",
                    veiculo.ipvaPago 
                      ? "bg-success/15 text-success dark:bg-success/10" 
                      : ipvaVencido 
                        ? "bg-destructive/15 text-destructive dark:bg-destructive/10" 
                        : "bg-warning/15 text-warning dark:bg-warning/10"
                  )} title={veiculo.ipvaPago ? "Pago" : ipvaVencido ? "Atrasado" : formattedIpvaDate ? `Vence ${formattedIpvaDate}` : "Pendente"}>
                    {veiculo.ipvaPago 
                      ? "Pago" 
                      : ipvaVencido 
                        ? "Atrasado" 
                        : formattedIpvaDate 
                          ? formattedIpvaDate 
                          : "Pendente"}
                  </span>
                </div>

                {/* LICENCIAMENTO */}
                <div className="flex flex-col items-center justify-between p-2.5 rounded-[18px] bg-muted/40 dark:bg-muted/10 text-center min-w-0">
                  <span className="text-muted-foreground flex flex-col items-center gap-1 font-bold text-[10px] uppercase tracking-wider">
                    {veiculo.licenciamentoPago ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : licVencido ? (
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-warning shrink-0" />
                    )}
                    Licenc.
                  </span>
                  <span className={cn(
                    "font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-2.5 w-full text-center truncate",
                    veiculo.licenciamentoPago 
                      ? "bg-success/15 text-success dark:bg-success/10" 
                      : licVencido 
                        ? "bg-destructive/15 text-destructive dark:bg-destructive/10" 
                        : "bg-warning/15 text-warning dark:bg-warning/10"
                  )} title={veiculo.licenciamentoPago ? "Pago" : licVencido ? "Atrasado" : formattedLicDate ? `Vence ${formattedLicDate}` : "Pendente"}>
                    {veiculo.licenciamentoPago 
                      ? "Pago" 
                      : licVencido 
                        ? "Atrasado" 
                        : formattedLicDate 
                          ? formattedLicDate 
                          : "Pendente"}
                  </span>
                </div>

                {/* SEGURO */}
                <div className="flex flex-col items-center justify-between p-2.5 rounded-[18px] bg-muted/40 dark:bg-muted/10 text-center min-w-0">
                  <span className="text-muted-foreground flex flex-col items-center gap-1 font-bold text-[10px] uppercase tracking-wider">
                    {seguro ? (
                      isSeguroVencido 
                        ? <ShieldAlert className="w-4 h-4 text-destructive shrink-0" /> 
                        : <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    Seguro
                  </span>
                  <span className={cn(
                    "font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-2.5 w-full text-center truncate",
                    seguro 
                      ? (isSeguroVencido ? "bg-destructive/15 text-destructive dark:bg-destructive/10" : "bg-success/15 text-success dark:bg-success/10") 
                      : "bg-muted text-muted-foreground"
                  )} title={seguro ? (isSeguroVencido ? "Vencido" : `Até ${format(parseISO(seguro.vigenciaFim), 'dd/MM/yy')}`) : "Não possui"}>
                    {seguro 
                      ? (isSeguroVencido ? "Vencido" : format(parseISO(seguro.vigenciaFim), 'dd/MM/yy')) 
                      : "Não tem"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Imóveis */}
        {imoveis.map(imovel => (
          <div 
            key={`imm-${imovel.id}`}
            onClick={() => handleViewImovel('imovel', imovel)}
            className="bg-card rounded-[32px] p-6 border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer"
          >
            {/* Background Accent Decorative Icon (Modo Claro: Marrom Sutil, Modo Escuro: Sutil) */}
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-amber-950/[0.08] dark:text-amber-500/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
              <Home className="w-56 h-56" />
            </div>

            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="p-4 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                <Home className="w-8 h-8" />
              </div>
              <div className="text-right min-w-0">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-none text-[9px] font-black uppercase px-2.5 py-0.5">Imóvel</Badge>
                <p className="text-lg font-black text-foreground mt-1.5 truncate max-w-[200px]" title={imovel.descricao}>{imovel.descricao}</p>
                <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">{imovel.tipo}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pt-2 relative z-10">
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Avaliação</p>
                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">{formatCurrency(imovel.valorAvaliacao)}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Aquisição</p>
                <p className="text-base sm:text-lg font-bold text-muted-foreground tabular-nums">{formatCurrency(imovel.valorAquisicao)}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60 relative z-10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> IPTU
                </span>
                <span className="font-bold text-xs px-2.5 py-1 rounded-md bg-success/15 text-success dark:bg-success/10 uppercase tracking-wider">OK</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-5 h-5 text-success shrink-0" /> Seguro Incêndio
                </span>
                <span className="font-bold text-xs px-2.5 py-1 rounded-md bg-success/15 text-success dark:bg-success/10 uppercase tracking-wider">Ativo</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <Landmark className="w-5 h-5 text-primary shrink-0" /> Situação
                </span>
                <span className="font-bold text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary dark:bg-primary/10 uppercase tracking-wider">Quitado</span>
              </div>
            </div>
          </div>
        ))}

        {/* Terrenos */}
        {terrenos.map(terreno => (
          <div 
            key={`ter-${terreno.id}`}
            onClick={() => handleViewImovel('terreno', terreno)}
            className="bg-card rounded-[32px] p-6 border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer"
          >
            {/* Background Accent Decorative Icon (Modo Claro: Marrom Sutil, Modo Escuro: Sutil) */}
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-amber-950/[0.08] dark:text-green-500/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
              <MapIcon className="w-56 h-56" />
            </div>

            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="p-4 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 group-hover:bg-green-500 group-hover:text-white transition-all duration-500">
                <MapIcon className="w-8 h-8" />
              </div>
              <div className="text-right min-w-0">
                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400 border-none text-[9px] font-black uppercase px-2.5 py-0.5">Terreno</Badge>
                <p className="text-lg font-black text-foreground mt-1.5 truncate max-w-[200px]" title={terreno.descricao}>{terreno.descricao}</p>
                <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">Rural / Urbano</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pt-2 relative z-10">
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Avaliação</p>
                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">{formatCurrency(terreno.valorAvaliacao)}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Aquisição</p>
                <p className="text-base sm:text-lg font-bold text-muted-foreground tabular-nums">{formatCurrency(terreno.valorAquisicao)}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60 relative z-10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> ITR / IPTU
                </span>
                <span className="font-bold text-xs px-2.5 py-1 rounded-md bg-success/15 text-success dark:bg-success/10 uppercase tracking-wider">OK</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <Landmark className="w-5 h-5 text-primary shrink-0" /> Situação
                </span>
                <span className="font-bold text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary dark:bg-primary/10 uppercase tracking-wider">Escriturado</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <VehicleDetailDialog
        open={showVehicleDetail}
        onOpenChange={setShowVehicleDetail}
        veiculo={selectedVehicle}
        onUpdateVeiculo={updateVeiculo}
      />
      
      <ImovelFormModal
        open={showImovelModal}
        onOpenChange={setShowImovelModal}
        type={imovelModalType}
        editingAsset={editingImovel}
        onSubmit={imovelModalType === 'imovel' ? saveImovel : saveTerreno}
        onDelete={imovelModalType === 'imovel' ? deleteImovel : deleteTerreno}
      />
    </div>
  );
};
