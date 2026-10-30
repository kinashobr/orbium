"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wrench, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Zap,
  Gauge,
  Plus
} from "lucide-react";
import { formatCurrency, Veiculo, VehicleHistoryItem } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, addMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface VehicleMaintenanceBannerProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleMaintenanceBanner({ veiculo, onUpdateVeiculo }: VehicleMaintenanceBannerProps) {
  const [showQuickServiceForm, setShowQuickServiceForm] = useState(false);
  const [serviceItemKey, setServiceItemKey] = useState<string>("oleo");
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDate, setServiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [serviceKm, setServiceKm] = useState("");
  const [serviceCost, setServiceCost] = useState("");

  // Manutenções preventivas do veículo/moto
  const maintenanceItems = useMemo(() => {
    const isMoto = veiculo.tipo === 'moto';

    const defaultItems = [
      {
        key: "oleo",
        label: "Óleo & Filtro de Óleo",
        intervalKm: isMoto ? 5000 : 10000,
        intervalMonths: 6,
        icon: "🛢️",
      },
      {
        key: "filtro_ar",
        label: "Filtro de Ar & Elemento",
        intervalKm: isMoto ? 10000 : 20000,
        intervalMonths: 12,
        icon: "💨",
      },
      {
        key: "vela",
        label: "Vela de Ignição",
        intervalKm: isMoto ? 12000 : 30000,
        intervalMonths: 12,
        icon: "⚡",
      },
      {
        key: isMoto ? "relacao" : "correia",
        label: isMoto ? "Kit Relação (Corrente/Sprocket)" : "Correia Dentada / Acessórios",
        intervalKm: isMoto ? 15000 : 50000,
        intervalMonths: 24,
        icon: isMoto ? "⚙️" : "🔧",
      },
      {
        key: "freios",
        label: "Pastilhas & Fluido de Freio",
        intervalKm: isMoto ? 10000 : 25000,
        intervalMonths: 12,
        icon: "🛑",
      },
    ];

    // Buscar histórico de manutenções registradas para cada item
    return defaultItems.map(item => {
      const historyMatch = (veiculo.historico || [])
        .filter(h => {
          if (h.type === "fipe") return false;
          const text = `${h.title} ${h.description || ""} ${h.meta?.pecaServico || ""}`.toLowerCase();
          if (item.key === "oleo") return text.includes("óleo") || text.includes("oleo") || text.includes("filtro de óleo");
          if (item.key === "filtro_ar") return text.includes("filtro de ar") || text.includes("filtro ar");
          if (item.key === "vela") return text.includes("vela");
          if (item.key === "relacao") return text.includes("relação") || text.includes("relacao") || text.includes("corrente") || text.includes("pinhão");
          if (item.key === "correia") return text.includes("correia") || text.includes("tensor");
          if (item.key === "freios") return text.includes("freio") || text.includes("pastilha") || text.includes("fluido");
          return false;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastRecord = historyMatch[0];
      const lastDate = lastRecord?.date ? parseDateLocal(lastRecord.date) : null;
      const nextEstDate = lastDate ? addMonths(lastDate, item.intervalMonths) : addMonths(new Date(), 3);

      const daysRemaining = nextEstDate ? differenceInDays(nextEstDate, new Date()) : 90;
      const isDue = daysRemaining <= 0;
      const isWarning = daysRemaining > 0 && daysRemaining <= 30;

      return {
        ...item,
        lastRecord,
        lastDate,
        nextEstDate,
        daysRemaining,
        isDue,
        isWarning,
      };
    });
  }, [veiculo]);

  // Handler para salvar revisão rápida de item
  const handleSaveQuickService = () => {
    if (!serviceDate) {
      toast.error("Informe a data da manutenção.");
      return;
    }

    const itemObj = maintenanceItems.find(i => i.key === serviceItemKey);
    const itemLabel = itemObj?.label || "Manutenção Preventiva";
    const titleToUse = serviceTitle.trim() || `Revisão: ${itemLabel}`;
    const costNum = parseFloat(serviceCost.replace(",", ".")) || 0;
    const kmNum = parseInt(serviceKm, 10) || undefined;

    const historyItem: VehicleHistoryItem = {
      id: `vh_maint_${Date.now()}`,
      type: "manutencao",
      date: serviceDate,
      title: titleToUse,
      amount: costNum,
      meta: {
        pecaServico: itemLabel,
        kmAtual: kmNum,
        gastoTipo: "manutencao_periodica"
      }
    };

    const updatedHistory = [...(veiculo.historico || []), historyItem];
    onUpdateVeiculo(veiculo.id, { historico: updatedHistory });

    toast.success(`Manutenção de ${itemLabel} registrada no histórico!`);
    setShowQuickServiceForm(false);
    setServiceTitle("");
    setServiceCost("");
    setServiceKm("");
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-6 relative overflow-hidden">
      {/* Glow de Fundo */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-foreground tracking-tight">
              Manutenção Preventiva & Trocas
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Controle de vida útil dos componentes de {veiculo.modelo} ({veiculo.tipo === 'moto' ? 'Motocicleta' : 'Automóvel'}).
            </p>
          </div>
        </div>

        <Button 
          size="sm" 
          className="rounded-2xl font-black text-xs uppercase tracking-wider gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          onClick={() => setShowQuickServiceForm(!showQuickServiceForm)}
        >
          <Plus className="w-4 h-4" /> Registrar Troca / Revisão
        </Button>
      </div>

      {/* FORMULÁRIO RÁPIDO DE REVISÃO PREVENTIVA (INLINE) */}
      {showQuickServiceForm && (
        <div className="p-6 rounded-3xl bg-muted/30 border border-primary/20 space-y-4 animate-in slide-in-from-top-3 duration-300 relative z-10">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Nova Manutenção Preventiva
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowQuickServiceForm(false)}>Cancelar</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Componente</Label>
              <Select value={serviceItemKey} onValueChange={setServiceItemKey}>
                <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {maintenanceItems.map(i => (
                    <SelectItem key={i.key} value={i.key}>{i.icon} {i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição Personalizada</Label>
              <Input placeholder="Ex: Motul 10W50 + Filtro Original" value={serviceTitle} onChange={e => setServiceTitle(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data do Serviço</Label>
              <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Odômetro (KM Atual)</Label>
              <Input type="number" placeholder="Ex: 8500" value={serviceKm} onChange={e => setServiceKm(e.target.value)} className="h-10 rounded-xl font-bold tabular-nums" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="w-48">
              <Input placeholder="Valor gasto (R$)" value={serviceCost} onChange={e => setServiceCost(e.target.value)} className="h-10 rounded-xl font-bold tabular-nums" />
            </div>
            <Button size="sm" className="rounded-xl font-black uppercase text-xs px-6 bg-success hover:bg-success/90 text-white" onClick={handleSaveQuickService}>
              Confirmar Registro
            </Button>
          </div>
        </div>
      )}

      {/* BANNER DOS COMPONENTES DE MANUTENÇÃO PREVENTIVA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
        {maintenanceItems.map(item => (
          <div 
            key={item.key}
            className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col justify-between group",
              item.isDue ? "bg-destructive/10 border-destructive/30 text-destructive" :
              item.isWarning ? "bg-warning/10 border-warning/30 text-warning" :
              "bg-card/80 border-border/60 hover:border-border text-foreground"
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{item.icon}</span>
                <Badge className={cn(
                  "border-none text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                  item.isDue ? "bg-destructive text-white" :
                  item.isWarning ? "bg-warning text-black" :
                  "bg-success/15 text-success"
                )}>
                  {item.isDue ? "Revisar Já" : item.isWarning ? "Próximo" : "Em dia"}
                </Badge>
              </div>

              <h4 className="font-black text-xs leading-snug text-foreground mb-1">{item.label}</h4>

              <p className="text-[10px] font-bold text-muted-foreground">
                Última: <span className="text-foreground">{item.lastDate ? format(item.lastDate, "dd/MM/yy") : "Não reg."}</span>
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[10px]">
              <span className="font-bold text-muted-foreground">Est. Próxima:</span>
              <span className="font-black tabular-nums">
                {item.nextEstDate ? format(item.nextEstDate, "MMM/yy", { locale: ptBR }).toUpperCase() : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
