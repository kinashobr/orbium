"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo } from "@/types/finance";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VehicleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: Veiculo | null;
  seguro: SeguroVeiculo | undefined;
  onUpdateFipe: (veiculo: Veiculo) => void;
  onEdit?: (veiculo: Veiculo) => void;
}

export function VehicleDetailDialog({
  open,
  onOpenChange,
  veiculo,
  seguro,
  onUpdateFipe,
  onEdit,
}: VehicleDetailDialogProps) {
  if (!veiculo) return null;

  const mesesPropriedade = useMemo(() => {
    return differenceInMonths(new Date(), parseDateLocal(veiculo.dataCompra));
  }, [veiculo.dataCompra]);

  // Calcular depreciação estimada (aproximação baseada em FIPE)
  const depreciacaoEstimada = useMemo(() => {
    const valorCompra = veiculo.valorVeiculo || veiculo.valorFipe;
    const valorAtual = veiculo.valorFipe;
    if (valorCompra === 0) return 0;
    return ((valorCompra - valorAtual) / valorCompra) * 100;
  }, [veiculo.valorVeiculo, veiculo.valorFipe]);

  // Status do seguro
  const seguroStatus = useMemo(() => {
    if (!seguro) return { status: 'sem_seguro', label: 'Sem Seguro', color: 'destructive' };
    
    const parcelasPagas = seguro.parcelas.filter(p => p.paga).length;
    const totalParcelas = seguro.numeroParcelas;
    const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
    const hoje = new Date();
    
    if (vigenciaFim < hoje) {
      return { status: 'vencido', label: 'Vencido', color: 'destructive' };
    }
    
    const parcelasVencidas = seguro.parcelas.filter(
      p => !p.paga && parseDateLocal(p.vencimento) < hoje
    ).length;
    
    if (parcelasVencidas > 0) {
      return { status: 'atrasado', label: `${parcelasVencidas} parcela(s) atrasada(s)`, color: 'warning' };
    }
    
    return { 
      status: 'em_dia', 
      label: `${parcelasPagas}/${totalParcelas} pagas`, 
      color: 'success' 
    };
  }, [seguro]);

  const proximaParcela = useMemo(() => {
    if (!seguro) return null;
    return seguro.parcelas.find(p => !p.paga);
  }, [seguro]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden border-0 shadow-2xl dark:bg-[hsl(24_8%_14%)]">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/5 dark:to-transparent p-8 pb-6">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                  {veiculo.tipo === 'moto' ? <MotorcycleIcon className="w-8 h-8" /> : <Car className="w-8 h-8" />}
                </div>
                <div>
                  <DialogTitle className="font-display font-black text-2xl text-foreground">
                    {veiculo.modelo}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase">
                      {veiculo.marca}
                    </Badge>
                    <span className="text-xs font-bold text-muted-foreground">
                      {veiculo.ano}
                    </span>
                    {veiculo.tipo && (
                      <Badge variant="secondary" className="text-[10px] font-black uppercase">
                        {veiculo.tipo}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(veiculo)}
                    className="rounded-full hover:bg-primary/10"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Conteúdo com Tabs */}
        <Tabs defaultValue="resumo" className="px-8 pb-8">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/30 p-1 rounded-2xl mb-6">
            <TabsTrigger 
              value="resumo" 
              className="rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow"
            >
              Resumo
            </TabsTrigger>
            <TabsTrigger 
              value="seguro" 
              className="rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow"
            >
              Seguro
            </TabsTrigger>
            <TabsTrigger 
              value="historico" 
              className="rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tab Resumo */}
          <TabsContent value="resumo" className="space-y-6 animate-in fade-in duration-300">
            {/* Valor FIPE */}
            <div className="bg-gradient-to-br from-success/5 to-transparent rounded-2xl p-6 border border-success/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Avaliação FIPE Atual
                  </p>
                  <p className="font-display font-black text-3xl text-success tabular-nums">
                    {formatCurrency(veiculo.valorFipe)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateFipe(veiculo)}
                  className="rounded-full gap-2 h-10 px-4 font-bold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Grid de informações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Data de Compra
                </p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary opacity-60" />
                  <span className="font-bold text-foreground">
                    {format(parseDateLocal(veiculo.dataCompra), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Tempo de Posse
                </p>
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary opacity-60" />
                  <span className="font-bold text-foreground">
                    {mesesPropriedade} meses
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Valor de Compra
                </p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary opacity-60" />
                  <span className="font-bold text-foreground">
                    {formatCurrency(veiculo.valorVeiculo || veiculo.valorFipe)}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Depreciação Estimada
                </p>
                <div className="flex items-center gap-2">
                  {depreciacaoEstimada > 0 ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-success" />
                  )}
                  <span className={cn(
                    "font-bold",
                    depreciacaoEstimada > 0 ? "text-destructive" : "text-success"
                  )}>
                    {depreciacaoEstimada.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Status Seguro Resumo */}
            <div className={cn(
              "rounded-xl p-4 flex items-center justify-between",
              seguroStatus.status === 'sem_seguro' ? "bg-destructive/5 border border-destructive/20" :
              seguroStatus.status === 'vencido' ? "bg-destructive/5 border border-destructive/20" :
              seguroStatus.status === 'atrasado' ? "bg-warning/5 border border-warning/20" :
              "bg-success/5 border border-success/20"
            )}>
              <div className="flex items-center gap-3">
                <Shield className={cn(
                  "w-5 h-5",
                  seguroStatus.color === 'destructive' ? "text-destructive" :
                  seguroStatus.color === 'warning' ? "text-warning" : "text-success"
                )} />
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Status do Seguro
                  </p>
                  <p className={cn(
                    "font-bold text-sm",
                    seguroStatus.color === 'destructive' ? "text-destructive" :
                    seguroStatus.color === 'warning' ? "text-warning" : "text-success"
                  )}>
                    {seguroStatus.label}
                  </p>
                </div>
              </div>
              {seguro && (
                <Badge variant="outline" className="text-xs font-bold">
                  {seguro.seguradora}
                </Badge>
              )}
            </div>
          </TabsContent>

          {/* Tab Seguro */}
          <TabsContent value="seguro" className="space-y-6 animate-in fade-in duration-300">
            {seguro ? (
              <>
                {/* Info do Seguro */}
                <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Seguradora
                      </p>
                      <p className="font-bold text-lg text-foreground">{seguro.seguradora}</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-xs">
                      Apólice: {seguro.numeroApolice}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Vigência
                      </p>
                      <p className="font-bold text-sm text-foreground">
                        {format(parseDateLocal(seguro.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })} - {format(parseDateLocal(seguro.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Valor Total
                      </p>
                      <p className="font-bold text-sm text-foreground">
                        {formatCurrency(seguro.valorTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Próxima Parcela */}
                {proximaParcela && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                      Próxima Parcela
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-warning" />
                        <div>
                          <p className="font-bold text-foreground">
                            Parcela {proximaParcela.numero}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {format(parseDateLocal(proximaParcela.vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <p className="font-black text-lg text-warning tabular-nums">
                        {formatCurrency(proximaParcela.valor)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de Parcelas */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                    Histórico de Parcelas
                  </p>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                    {seguro.parcelas.map((p) => {
                      const isOverdue = !p.paga && parseDateLocal(p.vencimento) < new Date();
                      
                      return (
                        <div
                          key={p.numero}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                            p.paga ? "bg-success/5 border-success/20" :
                            isOverdue ? "bg-destructive/5 border-destructive/20" :
                            "bg-muted/30 border-border/40"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {p.paga ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : isOverdue ? (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-bold text-sm">Parcela {p.numero}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">
                              {format(parseDateLocal(p.vencimento), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <span className={cn(
                              "font-bold text-sm tabular-nums",
                              p.paga ? "text-success" : "text-foreground"
                            )}>
                              {formatCurrency(p.valor)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">
                  Nenhum seguro cadastrado para este veículo
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Cadastre um seguro na aba de Seguros para acompanhar as parcelas.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab Histórico */}
          <TabsContent value="historico" className="space-y-6 animate-in fade-in duration-300">
            <div className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-black uppercase tracking-widest text-xs text-muted-foreground">
                Histórico FIPE em desenvolvimento
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Em breve você poderá acompanhar a evolução do valor FIPE do seu veículo ao longo do tempo.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
