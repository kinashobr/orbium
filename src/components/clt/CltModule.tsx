import React, { useState, useMemo } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CltContract, CltCompetencia, CltLegislacaoConfig, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { CltContractFormModal } from "./CltContractFormModal";
import { CltCompetenciaCard } from "./CltCompetenciaCard";
import { CltCompetenciaDetailModal } from "./CltCompetenciaDetailModal";
import { CltConfigPanel } from "./CltConfigPanel";
import { gerarCompetenciasAno, DEFAULT_CONFIG_2026 } from "@/lib/cltCalc";
import { toast } from "sonner";
import { Plus, Building2, RefreshCw, Trash2, Briefcase, TrendingUp, Wallet, PiggyBank, CheckCircle2, Sparkles, ArrowLeft, Settings2, ArrowRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CltModule({ open, onOpenChange }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const {
    cltContracts, addCltContract, updateCltContract, deleteCltContract,
    cltCompetencias, addCltCompetencia, updateCltCompetencia, deleteCltCompetenciasByContract,
    cltLegislacaoConfigs, updateCltLegislacaoConfig,
    contasMovimento, addTransacaoV2,
  } = useFinance();

  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<CltContract | undefined>();
  const [selectedCompetencia, setSelectedCompetencia] = useState<CltCompetencia | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    cltContracts.length === 1 ? cltContracts[0].id : null
  );

  const selectedContract = cltContracts.find(c => c.id === selectedContractId);

  const activeLegislacao = useMemo(() => {
    if (selectedContract?.legislacaoConfigId) {
      const found = cltLegislacaoConfigs.find(c => c.id === selectedContract.legislacaoConfigId);
      if (found) return found;
    }
    return cltLegislacaoConfigs.find(c => c.isDefault) || DEFAULT_CONFIG_2026;
  }, [selectedContract, cltLegislacaoConfigs]);

  const competenciasDoContrato = useMemo(() => {
    if (!selectedContractId) return [];
    return cltCompetencias
      .filter(c => c.contractId === selectedContractId)
      .sort((a, b) => {
        const order = { normal: 0, '13_primeira': 1, '13_segunda': 2 };
        const cmp = a.mesAno.localeCompare(b.mesAno);
        return cmp !== 0 ? cmp : order[a.tipo] - order[b.tipo];
      });
  }, [selectedContractId, cltCompetencias]);

  const kpis = useMemo(() => {
    const comps = competenciasDoContrato;
    const brutoAnual = comps.reduce((acc, c) => acc + c.salarioBruto, 0);
    const liquidoAnual = comps.reduce((acc, c) => acc + c.salarioLiquido, 0);
    const totalRecebido = comps.filter(c => c.status === 'recebido').reduce((acc, c) => acc + c.salarioLiquido, 0);
    const recebidosCount = comps.filter(c => c.status === 'recebido').length;
    const totalCount = comps.length;
    const fgtsAcumulado = comps.reduce((acc, c) => acc + c.fgts, 0);
    return { brutoAnual, liquidoAnual, totalRecebido, recebidosCount, totalCount, fgtsAcumulado };
  }, [competenciasDoContrato]);

  const progressPercent = kpis.totalCount > 0 ? (kpis.recebidosCount / kpis.totalCount) * 100 : 0;

  const handleSaveContract = (contract: CltContract) => {
    if (editingContract) {
      updateCltContract(contract.id, contract);
      toast.success("Vínculo atualizado!");
    } else {
      addCltContract(contract);
      setSelectedContractId(contract.id);
      const comps = gerarCompetenciasAno(contract, activeLegislacao);
      comps.forEach(c => {
        c.dependentes = contract.dependentes;
        addCltCompetencia(c);
      });
      toast.success(`Vínculo criado! ${comps.length} recebimentos projetados.`);
    }
    setEditingContract(undefined);
  };

  const handleRegenerarCompetencias = (contractId: string) => {
    const contract = cltContracts.find(c => c.id === contractId);
    if (!contract) return;
    deleteCltCompetenciasByContract(contractId);
    const comps = gerarCompetenciasAno(contract, activeLegislacao);
    comps.forEach(c => {
      c.dependentes = contract.dependentes;
      addCltCompetencia(c);
    });
    toast.success(`${comps.length} recebimentos recalculados.`);
  };

  const handleRegistrarRecebimento = (compId: string, data: string, accountId: string) => {
    const comp = cltCompetencias.find(c => c.id === compId);
    if (!comp) return;

    const txId = `tx_clt_${comp.id}`;
    
    addTransacaoV2({
      id: txId,
      date: data,
      accountId,
      flow: 'in',
      operationType: 'receita',
      domain: 'operational',
      amount: comp.salarioLiquido,
      categoryId: null,
      description: `Recebimento — ${comp.mesAno}${comp.tipo !== 'normal' ? ` (${comp.tipo === '13_primeira' ? '13º 1ª' : '13º 2ª'})` : ''}`,
      links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null },
      conciliated: true,
      attachments: [],
      meta: { createdBy: 'clt_module', source: 'manual', createdAt: new Date().toISOString() },
    });

    updateCltCompetencia(compId, {
      status: 'recebido',
      dataRecebimento: data,
      transactionId: txId,
    });

    toast.success("Recebimento registrado!");
    setSelectedCompetencia(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent 
          storageKey="clt_main_modal_v3"
          initialWidth={1150} initialHeight={850} minWidth={800} minHeight={600}
          hideCloseButton 
          fullscreen={isMobile}
          className={cn(
            "p-0 shadow-2xl flex flex-col bg-background overflow-hidden",
            !isMobile && "rounded-[3rem] border-none"
          )}
        >
          <DialogHeader className={cn(
            "px-6 sm:px-10 pt-5 sm:pt-8 pb-5 sm:pb-6 bg-card shrink-0 border-b border-border/40 relative z-20",
            isMobile && "pt-6 px-6"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter leading-none">Controle de Recebimentos</DialogTitle>
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5 mt-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Inteligência de Receitas
                  </p>
                </div>
              </div>

              {selectedContractId && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-muted/40 rounded-full p-1.5 border border-border/40 shadow-inner">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-card" onClick={() => handleRegenerarCompetencias(selectedContractId)} title="Recalcular Recebimentos">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-card" onClick={() => { setEditingContract(selectedContract); setShowContractForm(true); }} title="Editar Vínculo">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Excluir vínculo e todos os recebimentos associados?")) { deleteCltCompetenciasByContract(selectedContractId); deleteCltContract(selectedContractId); setSelectedContractId(null); toast.success("Vínculo excluído permanentemente"); } }} title="Excluir Vínculo">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!selectedContractId && cltContracts.length > 0 && (
                <Button onClick={() => { setEditingContract(undefined); setShowContractForm(true); }} className="rounded-full h-11 px-8 font-black text-[11px] uppercase tracking-widest gap-2.5 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                  <Plus className="w-4.5 h-4.5" /> Novo Vínculo
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-muted/5 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-6 sm:p-10">
                {!selectedContractId ? (
                  <div className="max-w-5xl mx-auto space-y-6">
                    {cltContracts.length === 0 ? (
                      <div className="py-24 text-center space-y-8 animate-in fade-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-muted/20 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-dashed border-border/60">
                          <Building2 className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black tracking-tight">Nenhum vínculo ativo</h4>
                          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Cadastre seus vínculos de renda para projetar suas entradas automáticas.</p>
                        </div>
                        <Button onClick={() => { setEditingContract(undefined); setShowContractForm(true); }} className="rounded-full h-16 px-12 font-black text-sm uppercase tracking-[0.2em] gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-all">
                          <Plus className="w-6 h-6" /> ADICIONAR VÍNCULO
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {cltContracts.map(contract => (
                          <div
                            key={contract.id}
                            onClick={() => setSelectedContractId(contract.id)}
                            className="group cursor-pointer hover:border-primary/40 transition-all duration-500 bg-card border-border/40 rounded-[2.5rem] shadow-sm hover:shadow-soft-lg hover:-translate-y-1.5 overflow-hidden relative border"
                          >
                             <Briefcase className="absolute -right-4 -bottom-4 w-28 h-28 text-primary opacity-[0.03] dark:opacity-[0.05] -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700" />
                             
                             <div className="p-6 space-y-5 relative z-10">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                      <Building2 className="w-6 h-6" />
                                   </div>
                                   <div className="min-w-0">
                                      <h4 className="text-lg font-black tracking-tight truncate leading-tight">{contract.empresa}</h4>
                                      <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.15em] mt-0.5">
                                        Monitoramento Ativo
                                      </p>
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-1">
                                   <div className="space-y-1">
                                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/60">Bruto Mensal</p>
                                      <p className="text-xl font-black tabular-nums tracking-tighter leading-none">{formatCurrency(contract.salarioBrutoAtual)}</p>
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground mt-1">
                                        <Calendar className="w-3 h-3 text-primary/40" />
                                        {new Date(contract.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </div>
                                   </div>
                                   <div className="space-y-1 text-right">
                                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">Status</p>
                                      <Badge variant="outline" className="bg-success/10 text-success border-none font-black text-[9px] uppercase px-2 h-5 rounded-lg">ATIVO</Badge>
                                   </div>
                                </div>

                                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Projetando</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                                      DETALHES <ArrowRight className="w-3.5 h-3.5" />
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-700">
                    <div className="rounded-[3rem] bg-card border-2 border-border/40 p-8 sm:p-10 shadow-sm relative overflow-hidden border">
                       <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                          <Building2 className="w-48 h-48 rotate-6" />
                       </div>
                       <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 relative z-10">
                          <div className="space-y-4">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-none font-black text-[10px] uppercase tracking-[0.2em] rounded-lg px-3 py-1">VÍNCULO ATUAL</Badge>
                            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none">{selectedContract?.empresa}</h2>
                            <div className="flex flex-wrap gap-x-10 gap-y-4 pt-2">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Valor Bruto Mensal</p>
                                  <p className="font-black text-2xl text-primary tabular-nums tracking-tighter">{formatCurrency(selectedContract!.salarioBrutoAtual)}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Dependentes</p>
                                  <p className="font-black text-2xl text-foreground tabular-nums tracking-tighter">{selectedContract!.dependentes}</p>
                               </div>
                            </div>
                          </div>
                          
                          <div className="bg-muted/30 rounded-[2.5rem] p-7 sm:min-w-[280px] border border-border/40">
                             <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progresso Anual</span>
                                <span className="text-xs font-black text-primary">{Math.round(progressPercent)}%</span>
                             </div>
                             <Progress value={progressPercent} className="h-2 rounded-full bg-muted/40" />
                             <p className="text-[10px] font-bold text-muted-foreground mt-3 uppercase tracking-widest text-center">{kpis.recebidosCount} de {kpis.totalCount} recebimentos</p>
                          </div>
                       </div>
                    </div>

                    <Tabs defaultValue="competencias" className="w-full">
                      <TabsList className="bg-card/50 p-1.5 rounded-2xl border-2 border-border/40 w-full sm:w-fit grid grid-cols-2 h-12 mb-8 shadow-sm">
                        <TabsTrigger value="competencias" className="rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-8">CALENDÁRIO</TabsTrigger>
                        <TabsTrigger value="configuracao" className="rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-8">REGRAS DE CÁLCULO</TabsTrigger>
                      </TabsList>

                      <TabsContent value="competencias" className="space-y-10 animate-in fade-in duration-700">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                          <KpiOrbium icon={<TrendingUp />} label="Bruto Projetado" value={formatCurrency(kpis.brutoAnual)} color="primary" />
                          <KpiOrbium icon={<Wallet />} label="Líquido Estimado" value={formatCurrency(kpis.liquidoAnual)} color="emerald" />
                          <KpiOrbium icon={<CheckCircle2 />} label="Total Recebido" value={formatCurrency(kpis.totalRecebido)} color="emerald" highlight />
                          <KpiOrbium icon={<PiggyBank />} label="FGTS Acumulado" value={formatCurrency(kpis.fgtsAcumulado)} color="amber" />
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-3 px-1">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Recebimentos do Período</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {competenciasDoContrato.map(comp => (
                              <CltCompetenciaCard key={comp.id} competencia={comp} onClick={() => setSelectedCompetencia(comp)} />
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="configuracao" className="animate-in fade-in duration-700">
                        <div className="bg-card rounded-[3rem] border-2 border-border/40 p-8 sm:p-10 shadow-sm">
                          <CltConfigPanel config={activeLegislacao} onUpdateConfig={(cfg) => { updateCltLegislacaoConfig(cfg.id, cfg); toast.success("Parâmetros atualizados"); }} contract={selectedContract} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 sm:px-10 py-5 bg-card border-t border-border/40 shrink-0 relative z-20 flex flex-row justify-end gap-3">
             {selectedContractId && (
               <Button 
                variant="ghost" 
                onClick={() => setSelectedContractId(null)} 
                className="rounded-full h-11 px-8 font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
               >
                 VOLTAR
               </Button>
             )}
             <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="rounded-full h-11 px-8 font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
             >
                FECHAR CONTROLE
             </Button>
          </DialogFooter>
        </ResizableDialogContent>
      </Dialog>

      <CltContractFormModal open={showContractForm} onOpenChange={setShowContractForm} onSave={handleSaveContract} editingContract={editingContract} legislacaoConfig={activeLegislacao} />
      {selectedCompetencia && (
        <CltCompetenciaDetailModal open={!!selectedCompetencia} onOpenChange={() => setSelectedCompetencia(null)} competencia={selectedCompetencia} accounts={contasMovimento} onRegistrarRecebimento={handleRegistrarRecebimento} onUpdateCompetencia={(id, upd) => { updateCltCompetencia(id, upd); toast.success("Competência atualizada"); }} />
      )}
    </>
  );
}

function KpiOrbium({ icon, label, value, color, highlight }: { icon: React.ReactNode; label: string; value: string; color: 'primary' | 'emerald' | 'amber'; highlight?: boolean }) {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
  };

  const borderClasses = {
    primary: "border-primary/20",
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
  };

  return (
    <div className={cn(
      "rounded-[2rem] p-6 sm:p-7 border-2 transition-all duration-300 relative overflow-hidden group shadow-sm",
      highlight ? `bg-${color}-500/[0.03] ${borderClasses[color]} shadow-md` : "bg-card border-border/40 hover:border-primary/30"
    )}>
      <div className={cn("w-11 h-11 rounded-[1.25rem] flex items-center justify-center mb-4 transition-transform group-hover:scale-110", colorClasses[color])}>
        {React.cloneElement(icon as React.ReactElement, { size: 22 })}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-60 mb-1">{label}</p>
      <p className={cn("text-xl sm:text-2xl font-black tabular-nums tracking-tighter leading-none", highlight ? `text-${color}-600 dark:text-${color}-400` : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}