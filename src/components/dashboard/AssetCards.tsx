"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency, Veiculo, Imovel, Terreno } from "@/types/finance";
import { 
  Car, 
  Home, 
  Map as MapIcon, 
  ShieldCheck, 
  ShieldAlert,
  Calendar,
  Landmark,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle,
  Clock
} from "lucide-react";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, isAfter, startOfDay, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ImovelFormModal } from "@/components/vehicles/ImovelFormModal";

export const AssetCards = () => {
  const navigate = useNavigate();
  const { 
    veiculos, 
    imoveis, 
    terrenos, 
    segurosVeiculo,
    transacoesV2,
    billsTracker,
    deleteImovel, 
    deleteTerreno, 
    addImovel, 
    updateImovel, 
    addTerreno, 
    updateTerreno 
  } = useFinance();
  
  const [showImovelModal, setShowImovelModal] = useState(false);
  const [imovelModalType, setImovelModalType] = useState<'imovel' | 'terreno'>('imovel');
  const [editingImovel, setEditingImovel] = useState<Imovel | Terreno | null>(null);

  const activeVeiculos = useMemo(
    () => veiculos.filter(v => v.status !== 'vendido' && v.status !== 'pendente_cadastro'),
    [veiculos]
  );

  const activeImoveis = useMemo(
    () => imoveis.filter(i => i.status !== 'vendido'),
    [imoveis]
  );

  const activeTerrenos = useMemo(
    () => terrenos.filter(t => t.status !== 'vendido'),
    [terrenos]
  );

  const handleSaveImovelOrTerreno = (data: Partial<Imovel | Terreno>) => {
    if (imovelModalType === 'imovel') {
      if (editingImovel) {
        updateImovel(editingImovel.id, data as Partial<Imovel>);
      } else {
        addImovel(data as Omit<Imovel, "id">);
      }
    } else {
      if (editingImovel) {
        updateTerreno(editingImovel.id, data as Partial<Terreno>);
      } else {
        addTerreno(data as Omit<Terreno, "id">);
      }
    }
  };

  const handleViewVehicle = (v: Veiculo) => {
    navigate(`/veiculos/${v.id}`);
  };

  const handleViewImovel = (type: 'imovel' | 'terreno', item: Imovel | Terreno) => {
    setImovelModalType(type);
    setEditingImovel(item);
    setShowImovelModal(true);
  };

  const getActiveVehicleInsurance = (veiculo: Veiculo) => {
    if (veiculo.statusSeguro === 'sem_seguro') return undefined;
    if (veiculo.seguroAtivoId) {
      const found = segurosVeiculo.find(s => s.id === veiculo.seguroAtivoId);
      if (found && found.status !== 'historico' && found.status !== 'cancelado') {
        return found;
      }
    }
    const candidates = segurosVeiculo.filter(
      s => s.veiculoId === veiculo.id && s.status !== 'historico' && s.status !== 'cancelado'
    );
    return candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
  };

  const todayStart = startOfDay(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Bens e Ativos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Veículos */}
        {activeVeiculos.map(veiculo => {
          const seguro = getActiveVehicleInsurance(veiculo);

          let seguroFimDate: Date | null = null;
          if (seguro?.vigenciaFim) {
            const parsed = parseDateLocal(seguro.vigenciaFim);
            if (!isNaN(parsed.getTime())) seguroFimDate = parsed;
          }

          const isSeguroPendenteConfig = seguro?.status === 'pendente_config';
          const isSeguroVencido = !!seguroFimDate && isAfter(todayStart, seguroFimDate);
          const seguroDaysRemaining = seguroFimDate ? differenceInDays(seguroFimDate, todayStart) : null;
          const isSeguroExpiringSoon = !isSeguroVencido && seguroDaysRemaining !== null && seguroDaysRemaining <= 30;

          const seguroPaidCount = seguro?.parcelas?.filter(p =>
            p.paga ||
            (p.transactionId && transacoesV2.some(t => t.id === p.transactionId)) ||
            transacoesV2.some(t => t.links?.vehicleTransactionId === `${seguro.id}_${p.numero}`) ||
            billsTracker.some(b =>
              b.sourceType === 'insurance_installment' &&
              b.sourceRef === String(seguro.id) &&
              b.parcelaNumber === p.numero &&
              b.isPaid
            )
          ).length || 0;
          const seguroTotalCount = seguro?.parcelas?.length || seguro?.numeroParcelas || 0;

          // Valores FIPE e Aquisição
          const valorFipe = veiculo.valorFipe || 0;
          const valorCompra = veiculo.valorVeiculo || 0;

          // Sincronização de IPVA com extrato (mesma regra de VehicleFiscalAndDocsDock e VehicleHeroShowcase)
          const ipvaTx = transacoesV2.find(t =>
            (t.meta?.assetId === veiculo.id || t.links?.vehicleTransactionId === String(veiculo.id)) &&
            (t.meta?.obligationType === 'ipva' || t.description.toLowerCase().includes('ipva'))
          );
          const ipvaPago = !!ipvaTx || veiculo.ipvaPago !== false;
          const ipvaDueDate = veiculo.ipvaVencimento ? parseDateLocal(veiculo.ipvaVencimento) : null;
          const hasValidIpvaDue = !!ipvaDueDate && !isNaN(ipvaDueDate.getTime());
          const ipvaVencido = !ipvaPago && hasValidIpvaDue && isAfter(todayStart, ipvaDueDate!);
          const formattedIpvaDate = hasValidIpvaDue ? format(ipvaDueDate!, 'dd/MM/yy') : null;
          const ipvaPaidDate = ipvaTx?.date ? parseDateLocal(ipvaTx.date) : ipvaDueDate;
          const formattedIpvaPaidDate = ipvaPaidDate && !isNaN(ipvaPaidDate.getTime()) ? format(ipvaPaidDate, 'dd/MM/yy') : null;

          // Sincronização de Licenciamento com extrato (mesma regra de VehicleFiscalAndDocsDock e VehicleHeroShowcase)
          const licTx = transacoesV2.find(t =>
            (t.meta?.assetId === veiculo.id || t.links?.vehicleTransactionId === String(veiculo.id)) &&
            (t.meta?.obligationType === 'licenciamento' || t.description.toLowerCase().includes('licenciamento'))
          );
          const licPago = !!licTx || veiculo.licenciamentoPago !== false;
          const licDueDate = veiculo.licenciamentoVencimento ? parseDateLocal(veiculo.licenciamentoVencimento) : null;
          const hasValidLicDue = !!licDueDate && !isNaN(licDueDate.getTime());
          const licVencido = !licPago && hasValidLicDue && isAfter(todayStart, licDueDate!);
          const formattedLicDate = hasValidLicDue ? format(licDueDate!, 'dd/MM/yy') : null;
          const licPaidDate = licTx?.date ? parseDateLocal(licTx.date) : licDueDate;
          const formattedLicPaidDate = licPaidDate && !isNaN(licPaidDate.getTime()) ? format(licPaidDate, 'dd/MM/yy') : null;

          const seguroTooltip = !seguro
            ? "Sem seguro ativo"
            : isSeguroPendenteConfig
              ? `${seguro.seguradora || "Seguradora"} • Configuração pendente`
              : isSeguroVencido
                ? `${seguro.seguradora || "Seguro"} • Expirado em ${format(seguroFimDate!, 'dd/MM/yyyy')}`
                : `${seguro.seguradora || "Seguro"}${seguroFimDate ? ` • Vigência até ${format(seguroFimDate, 'dd/MM/yyyy')}` : ""}${seguroTotalCount > 0 ? ` (${seguroPaidCount}/${seguroTotalCount} pagas)` : ""}`;

          return (
            <div 
              key={`veh-${veiculo.id}`}
              onClick={() => handleViewVehicle(veiculo)}
              className="bg-card rounded-[32px] p-6 border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer flex flex-col justify-between"
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

              <div>
                <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-sm ring-1 ring-black/5 dark:ring-white/5",
                    veiculo.tipo === 'moto' 
                      ? "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white" 
                      : veiculo.tipo === 'caminhao'
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white"
                        : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white"
                  )}>
                    {veiculo.tipo === 'moto' ? (
                      <MotorcycleIcon className="w-12 h-12" />
                    ) : veiculo.tipo === 'caminhao' ? (
                      <Truck className="w-8 h-8" />
                    ) : (
                      <Car className="w-8 h-8" />
                    )}
                  </div>

                  <div className="text-right min-w-0 flex-1">
                    <p className="text-lg font-black text-foreground truncate" title={veiculo.modelo}>
                      {veiculo.modelo}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-wider truncate">
                      {veiculo.marca || "N/A"} • Ano {veiculo.ano}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 pt-2 relative z-10">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Valor FIPE</p>
                    <p className="text-xl sm:text-2xl font-black text-success tabular-nums">{formatCurrency(valorFipe)}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-70">Aquisição</p>
                    <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{formatCurrency(valorCompra)}</p>
                  </div>

                  {seguro && !isSeguroPendenteConfig && seguroTotalCount > 0 && (
                    <div className="col-span-2">
                      <span
                        className="inline-block text-[10px] font-bold text-muted-foreground mt-1 bg-muted/40 dark:bg-muted/15 px-2.5 py-1 rounded-full truncate max-w-full"
                        title={`${seguro.seguradora} • ${seguroPaidCount}/${seguroTotalCount} parcelas pagas`}
                      >
                        {seguro.seguradora} ({seguroPaidCount}/{seguroTotalCount})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 border-t border-border/60 relative z-10">
                {/* IPVA */}
                <div className="flex flex-col items-center justify-between p-2.5 rounded-[18px] bg-muted/40 dark:bg-muted/10 text-center min-w-0">
                  <span className="text-muted-foreground flex flex-col items-center gap-1 font-bold text-[10px] uppercase tracking-wider">
                    {ipvaPago ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : ipvaVencido ? (
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-warning shrink-0" />
                    )}
                    IPVA
                  </span>
                  <span
                    className={cn(
                      "font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-2.5 w-full text-center truncate",
                      ipvaPago 
                        ? "bg-success/15 text-success dark:bg-success/10" 
                        : ipvaVencido 
                          ? "bg-destructive/15 text-destructive dark:bg-destructive/10" 
                          : "bg-warning/15 text-warning dark:bg-warning/10"
                    )}
                    title={
                      ipvaPago
                        ? `Quitado${formattedIpvaPaidDate ? ` (${formattedIpvaPaidDate})` : ""}${veiculo.ipvaValor ? ` • ${formatCurrency(veiculo.ipvaValor)}` : ""}`
                        : ipvaVencido
                          ? `Atrasado (venceu ${formattedIpvaDate})`
                          : formattedIpvaDate
                            ? `Vence ${formattedIpvaDate}`
                            : "Pendente"
                    }
                  >
                    {ipvaPago 
                      ? "Quitado" 
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
                    {licPago ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : licVencido ? (
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-warning shrink-0" />
                    )}
                    Licenc.
                  </span>
                  <span
                    className={cn(
                      "font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-2.5 w-full text-center truncate",
                      licPago 
                        ? "bg-success/15 text-success dark:bg-success/10" 
                        : licVencido 
                          ? "bg-destructive/15 text-destructive dark:bg-destructive/10" 
                          : "bg-warning/15 text-warning dark:bg-warning/10"
                    )}
                    title={
                      licPago
                        ? `Quitado${formattedLicPaidDate ? ` (${formattedLicPaidDate})` : ""}${veiculo.licenciamentoValor ? ` • ${formatCurrency(veiculo.licenciamentoValor)}` : ""}`
                        : licVencido
                          ? `Atrasado (venceu ${formattedLicDate})`
                          : formattedLicDate
                            ? `Vence ${formattedLicDate}`
                            : "Pendente"
                    }
                  >
                    {licPago 
                      ? "Quitado" 
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
                      isSeguroPendenteConfig ? (
                        <Clock className="w-4 h-4 text-warning shrink-0" />
                      ) : isSeguroVencido ? (
                        <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
                      ) : isSeguroExpiringSoon ? (
                        <ShieldAlert className="w-4 h-4 text-warning shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                      )
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    Seguro
                  </span>
                  <span
                    className={cn(
                      "font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-2.5 w-full text-center truncate",
                      seguro 
                        ? isSeguroPendenteConfig
                          ? "bg-warning/15 text-warning dark:bg-warning/10"
                          : isSeguroVencido 
                            ? "bg-destructive/15 text-destructive dark:bg-destructive/10" 
                            : isSeguroExpiringSoon
                              ? "bg-warning/15 text-warning dark:bg-warning/10"
                              : "bg-success/15 text-success dark:bg-success/10" 
                        : "bg-muted text-muted-foreground"
                    )}
                    title={seguroTooltip}
                  >
                    {seguro 
                      ? isSeguroPendenteConfig
                        ? "Configurar"
                        : isSeguroVencido 
                          ? "Expirado" 
                          : seguroFimDate 
                            ? format(seguroFimDate, 'dd/MM/yy')
                            : "Ativo"
                      : "Sem Seguro"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Imóveis */}
        {activeImoveis.map(imovel => (
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
        {activeTerrenos.map(terreno => (
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

      <ImovelFormModal
        open={showImovelModal}
        onOpenChange={setShowImovelModal}
        type={imovelModalType}
        editingAsset={editingImovel}
        onSubmit={handleSaveImovelOrTerreno}
        onDelete={imovelModalType === 'imovel' ? deleteImovel : deleteTerreno}
      />
    </div>
  );
};
