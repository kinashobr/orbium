"use client";

import { useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ArrowLeft
} from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo } from "@/types/finance";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Body scroll lock for mobile fullscreen
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);
  
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
    if (!seguro || !seguro.parcelas) return { status: 'sem_seguro', label: 'Sem Seguro', color: 'destructive' };
    const parcelasPagas = seguro.parcelas.filter(p => p.paga).length;
    const totalParcelas = seguro.numeroParcelas || seguro.parcelas.length;
    const vigenciaFim = seguro.vigenciaFim ? parseDateLocal(seguro.vigenciaFim) : null;
    const hoje = new Date();
    
    if (vigenciaFim && vigenciaFim < hoje) return { status: 'vencido', label: 'Vencido', color: 'destructive' };
    
    const parcelasVencidas = seguro.parcelas.filter(p => !p.paga && p.vencimento && parseDateLocal(p.vencimento) < hoje).length;
    if (parcelasVencidas > 0) return { status: 'atrasado', label: `${parcelasVencidas} parcela(s) atrasada(s)`, color: 'warning' };
    
    return { status: 'em_dia', label: `${parcelasPagas}/${totalParcelas} pagas`, color: 'success' };
  }, [seguro]);

  if (!veiculo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[32rem] max-h-[85vh] rounded-[2rem]"
        )}
      >
        <DialogHeader 
          className="p-6 sm:p-8 shrink-0 bg-muted/20 border-b relative"
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
        >
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="absolute left-4 top-4 rounded-full h-10 w-10" style={isMobile ? { top: 'calc(env(safe-area-inset-top) + 0.5rem)' } : undefined}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          
          <div className={cn("flex items-center justify-between", isMobile && "pl-12")}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl">
                {veiculo.tipo === 'moto' ? <MotorcycleIcon className="w-8 h-8" /> : <Car className="w-8 h-8" />}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">{veiculo.modelo}</DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/50 border-none">{veiculo.marca || 'N/A'}</Badge>
                  <span className="text-[10px] font-bold text-muted-foreground">{veiculo.ano}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1 sm:gap-2">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(veiculo)} className="rounded-full hover:bg-primary/10 text-primary">
                  <Edit className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-muted/30 h-14 border-b rounded-none px-6 sm:px-8 gap-8 justify-start">
            <TabsTrigger value="resumo" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest">RESUMO</TabsTrigger>
            <TabsTrigger value="seguro" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest">SEGURO</TabsTrigger>
            <TabsTrigger value="historico" className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 text-[10px] font-black uppercase tracking-widest">HISTÓRICO</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-6 sm:p-8 space-y-8 pb-12">
              <TabsContent value="resumo" className="mt-0 space-y-8 focus-visible:outline-none animate-in fade-in duration-300">
                <div className="bg-success/5 border-2 border-success/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-success uppercase tracking-[0.2em] mb-1">Avaliação FIPE Atual</p>
                    <p className="text-3xl font-black text-success tabular-nums">{formatCurrency(veiculo.valorFipe || 0)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onUpdateFipe(veiculo)} className="rounded-full h-10 px-5 font-bold gap-2 border-success/30 text-success bg-white/50">
                    <RefreshCw className="w-4 h-4" /> ATUALIZAR
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { l: 'Compra', v: veiculo.dataCompra ? format(parseDateLocal(veiculo.dataCompra), "dd/MM/yyyy") : 'N/A', i: Calendar },
                    { l: 'Posse', v: `${mesesPropriedade} meses`, i: History },
                    { l: 'Valor Compra', v: formatCurrency(veiculo.valorVeiculo || veiculo.valorFipe || 0), i: DollarSign },
                    { l: 'Depreciação', v: `${depreciacaoEstimada.toFixed(1)}%`, i: depreciacaoEstimada > 0 ? TrendingDown : TrendingUp, c: depreciacaoEstimada > 0 ? 'text-destructive' : 'text-success' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-muted/20 border border-border/40">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <item.i className="w-3 h-3 opacity-60" /> {item.l}
                      </p>
                      <p className={cn("text-sm font-black tabular-nums", item.c)}>{item.v}</p>
                    </div>
                  ))}
                </div>

                <div className={cn(
                  "p-5 rounded-[1.75rem] border flex items-center justify-between gap-4",
                  seguroStatus.color === 'success' ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-center gap-4">
                    <Shield className={cn("w-6 h-6", seguroStatus.color === 'success' ? "text-success" : "text-destructive")} />
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Seguro</p>
                      <p className={cn("font-bold text-sm", seguroStatus.color === 'success' ? 'text-success' : 'text-destructive')}>{seguroStatus.label}</p>
                    </div>
                  </div>
                  {seguro && <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-1">{seguro.seguradora}</Badge>}
                </div>
              </TabsContent>

              <TabsContent value="seguro" className="mt-0 space-y-6 focus-visible:outline-none">
                {seguro ? (
                  <div className="space-y-8">
                    <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/40 space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Apólice</p>
                          <p className="font-black text-lg text-foreground">{seguro.numeroApolice || 'N/A'}</p>
                          <p className="text-xs font-bold text-primary uppercase mt-1">{seguro.seguradora}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1 uppercase">VALOR: {formatCurrency(seguro.valorTotal || 0)}</Badge>
                      </div>
                      <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Início</p><p className="font-bold text-sm">{seguro.vigenciaInicio ? format(parseDateLocal(seguro.vigenciaInicio), "dd/MM/yyyy") : 'N/A'}</p></div>
                        <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vigência Fim</p><p className="font-bold text-sm">{seguro.vigenciaFim ? format(parseDateLocal(seguro.vigenciaFim), "dd/MM/yyyy") : 'N/A'}</p></div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Histórico de Parcelas</p>
                      <div className="space-y-2">
                        {seguro.parcelas?.map((p) => {
                          const isOver = !p.paga && p.vencimento && parseDateLocal(p.vencimento) < new Date();
                          return (
                            <div key={p.numero} className={cn("flex items-center justify-between p-4 rounded-2xl border transition-all", p.paga ? "bg-success/[0.03] border-success/20 opacity-70" : isOver ? "bg-destructive/5 border-destructive/20" : "bg-muted/10 border-border/40")}>
                              <div className="flex items-center gap-4">
                                {p.paga ? <CheckCircle2 className="w-5 h-5 text-success" /> : isOver ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <Clock className="w-5 h-5 text-muted-foreground/40" />}
                                <div><p className="font-black text-sm text-foreground">Parcela {p.numero}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">{p.vencimento ? format(parseDateLocal(p.vencimento), "dd 'de' MMMM", { locale: ptBR }) : 'N/A'}</p></div>
                              </div>
                              <span className={cn("font-black text-base tabular-nums", p.paga ? "text-success" : "text-foreground")}>{formatCurrency(p.valor || 0)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-30">
                    <Shield className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">Sem seguro ativo</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historico" className="mt-0 focus-visible:outline-none">
                <div className="py-20 text-center opacity-30">
                  <FileText className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest text-xs">Sem movimentações registradas</p>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <DialogFooter className={cn("p-6 sm:p-8 bg-muted/10 border-t shrink-0", isMobile && "hidden")}>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              FECHAR
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}