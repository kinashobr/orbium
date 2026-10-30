"use client";

import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car, 
  Truck, 
  CheckCircle2, 
  Wrench, 
  Info,
  Shield
} from "lucide-react";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { useFinance } from "@/contexts/FinanceContext";
import { cn } from "@/lib/utils";

// Sub-componentes das 2 Abas (Nova Maquete Ficha & Seguro)
import { VehicleHeroShowcase } from "@/components/vehicles/VehicleHeroShowcase";
import { VehicleAnalyticWidgets } from "@/components/vehicles/VehicleAnalyticWidgets";
import { VehicleInsuranceTimeline } from "@/components/vehicles/VehicleInsuranceTimeline";
import { VehicleFiscalAndDocsDock } from "@/components/vehicles/VehicleFiscalAndDocsDock";

import { VehicleTechnicalCard } from "@/components/vehicles/VehicleTechnicalCard";
import { VehicleMaintenanceBanner } from "@/components/vehicles/VehicleMaintenanceBanner";
import { VehicleAnnualCalendar } from "@/components/vehicles/VehicleAnnualCalendar";
import { VehicleExpensesTypeGrid } from "@/components/vehicles/VehicleExpensesTypeGrid";
import { VehiclePendingAllocations } from "@/components/vehicles/VehiclePendingAllocations";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { veiculos, updateVeiculo, segurosVeiculo } = useFinance();

  const [activeTab, setActiveTab] = useState("visao_geral");

  // Localizar veículo
  const veiculo = useMemo(() => {
    if (!id) return null;
    return veiculos.find(v => String(v.id) === id) || null;
  }, [veiculos, id]);

  // Localizar seguro
  const seguro = useMemo(() => {
    if (!veiculo) return undefined;
    return segurosVeiculo.find(s => s.veiculoId === veiculo.id);
  }, [segurosVeiculo, veiculo]);

  if (!veiculo) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Car className="w-12 h-12 text-muted-foreground" />
          <h2 className="text-xl font-black text-foreground">Veículo não localizado</h2>
          <Button onClick={() => navigate("/veiculos")} className="rounded-2xl font-bold">
            Voltar para Veículos
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          
          {/* HEADER REFINADO E SELETOR DE ABAS COMPACTO REALOCADO NO CANTO SUPERIOR DIREITO */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-black/5 shrink-0",
                veiculo.tipo === 'moto' ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20" :
                veiculo.tipo === 'caminhao' ? "bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-500/20" :
                "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20"
              )}>
                {veiculo.tipo === 'moto' ? <MotorcycleIcon className="w-6 h-6" /> :
                 veiculo.tipo === 'caminhao' ? <Truck className="w-6 h-6" /> :
                 <Car className="w-6 h-6" />}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display font-bold text-2xl sm:text-3xl leading-none tracking-tight">{veiculo.modelo}</h1>
                  {veiculo.placa && (
                    <Badge variant="outline" className="font-mono font-black text-xs bg-muted/80 border-border/80 px-2 py-0.5 rounded-md">
                      {veiculo.placa}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium tracking-wide mt-1 uppercase">
                  {veiculo.marca} • Ano {veiculo.ano} • Ativo Imobilizado
                </p>
              </div>
            </div>

            {/* SELETOR DE ABAS COMPACTO NO CANTO SUPERIOR DIREITO */}
            <div className="flex items-center gap-3 shrink-0">
              <TabsList className="h-11 bg-muted/40 p-1 rounded-full border border-border/40">
                <TabsTrigger 
                  value="visao_geral" 
                  className="rounded-full px-4 text-xs font-black uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all gap-1.5"
                >
                  <Info className="w-3.5 h-3.5" /> Ficha & Seguro
                </TabsTrigger>
                <TabsTrigger 
                  value="manutencao_despesas" 
                  className="rounded-full px-4 text-xs font-black uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" /> Manutenção & Despesas
                </TabsTrigger>
              </TabsList>
            </div>
          </header>

          {/* ABA 1: VISÃO GERAL FICHA & SEGURO (NOVA ARQUITETURA DE DESIGN) */}
          <TabsContent value="visao_geral" className="space-y-6 animate-in fade-in duration-300">
            {/* 1. Hero Stage do Veículo com Foto, Badges e Atalhos de Cópia */}
            <VehicleHeroShowcase veiculo={veiculo} seguro={seguro} onUpdateVeiculo={updateVeiculo} />

            {/* 2. Trio de Widgets Analíticos: Seguro, FIPE e Consumo */}
            <VehicleAnalyticWidgets veiculo={veiculo} seguro={seguro} onUpdateVeiculo={updateVeiculo} />

            {/* 3. Cronograma de 12 Meses da Apólice */}
            <VehicleInsuranceTimeline veiculo={veiculo} seguro={seguro} />

            {/* 4. Doca de Obrigações Fiscais e Cofre de Documentos */}
            <VehicleFiscalAndDocsDock veiculo={veiculo} onUpdateVeiculo={updateVeiculo} />
          </TabsContent>

          {/* ABA 2: MANUTENÇÃO PREVENTIVA, CALENDÁRIO ANUAL & CONTROLE DE DESPESAS */}
          <TabsContent value="manutencao_despesas" className="space-y-8 animate-in fade-in duration-300">
            {/* Cockpit de Manutenção Preventiva & Trocas */}
            <VehicleMaintenanceBanner veiculo={veiculo} onUpdateVeiculo={updateVeiculo} />

            {/* Calendário Anual Interativo dos 12 Meses */}
            <VehicleAnnualCalendar veiculo={veiculo} seguro={seguro} />

            {/* Extrato Pendente de Alocação */}
            <VehiclePendingAllocations veiculo={veiculo} onUpdateVeiculo={updateVeiculo} />

            {/* Tipos de Gasto & Reclassificação Instantânea */}
            <VehicleExpensesTypeGrid veiculo={veiculo} onUpdateVeiculo={updateVeiculo} />
          </TabsContent>

        </Tabs>
      </div>
    </MainLayout>
  );
}
