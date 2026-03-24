"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CltCompetencia, ContaCorrente } from "@/types/finance";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, ChevronDown,
  FileText, ArrowLeft, Building2, Check
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CltCalculationBlock } from "./CltCalculationBlock";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competencia: CltCompetencia;
  accounts: ContaCorrente[];
  onRegistrarRecebimento: (compId: string, data: string, accountId: string) => void;
  onUpdateCompetencia: (compId: string, updates: Partial<CltCompetencia>) => void;
}

const TIPO_LABELS: Record<string, string> = {
  normal: 'Salário Mensal',
  '13_primeira': '13º Salário — 1ª Parcela',
  '13_segunda': '13º Salário — 2ª Parcela',
};

export function CltCompetenciaDetailModal({ open, onOpenChange, competencia: compProp, accounts, onRegistrarRecebimento, onUpdateCompetencia }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const competencia = compProp as any;
  
  const [dataRecebimento, setDataRecebimento] = useState(competencia.dataRecebimento || new Date().toISOString().split('T')[0]);
  const [contaRecebimento, setContaRecebimento] = useState(competencia.transactionId ? "" : (accounts.find(a => a.accountType === 'corrente')?.id || ""));
  const [editValues, setEditValues] = useState({
    salarioLiquido: competencia.salarioLiquido.toString(),
    inssTotal: competencia.inssTotal.toString(),
    irrfFinal: (competencia.irrfFinal || 0).toString(),
  });

  const contasRecebiveis = accounts.filter(a => a.accountType === 'corrente' || a.accountType === 'poupanca');
  const isRecebido = competencia.status === 'recebido';

  const handleRegistrar = () => {
    if (!contaRecebimento || !dataRecebimento) return;
    onRegistrarRecebimento(competencia.id, dataRecebimento, contaRecebimento);
  };

  const handleSaveEdit = () => {
    const updates: Partial<CltCompetencia> = { isManualOverride: true };
    updates.salarioLiquido = parseFloat(editValues.salarioLiquido);
    updates.inssTotal = parseFloat(editValues.inssTotal);
    updates.irrfFinal = parseFloat(editValues.irrfFinal);
    onUpdateCompetencia(competencia.id, updates);
  };

  const calculationData = {
    bruto: competencia.salarioBruto,
    inss: competencia.inssTotal,
    baseIR: competencia.baseIR,
    impostoBruto: competencia.impostoBruto || 0,
    ajustes: competencia.reducaoLei15270,
    irrfFinal: competencia.irrfFinal,
    liquido: competencia.salarioLiquido,
    fgts: competencia.fgts,
    dependentes: competencia.dependentes,
    pensao: competencia.deducaoPensao
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="clt_detail_modal_v3"
        initialWidth={750} initialHeight={850} minWidth={500} minHeight={600}
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col overflow-hidden",
          !isMobile && "rounded-[2.5rem] border-none"
        )}
      >
        <DialogHeader 
          className={cn("px-6 sm:px-8 pt-5 sm:pt-8 pb-5 bg-muted/30 shrink-0 relative")}
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' } : undefined}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => onOpenChange(false)}>
                  <ArrowLeft className="w-6 h-6" />
                </Button>
              )}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tighter">
                  {TIPO_LABELS[competencia.tipo]}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                   <Badge variant="outline" className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest rounded-lg px-2.5 py-1">{competencia.mesAno}</Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 sm:px-8 py-2 border-b border-border/40 shrink-0">
            <TabsList className="w-full sm:w-fit grid grid-cols-2 bg-muted/40 h-11 p-1 rounded-2xl">
              <TabsTrigger value="detalhes" className="rounded-xl font-black text-[10px] uppercase tracking-widest">DEMONSTRATIVO</TabsTrigger>
              <TabsTrigger value="receber" className="rounded-xl font-black text-[10px] uppercase tracking-widest">RECEBIMENTO</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 sm:px-8 scrollbar-material">
            <div className="py-6 space-y-6 pb-32 sm:pb-8">
              <TabsContent value="detalhes" className="mt-0 space-y-6 focus-visible:outline-none">
                
                <div className="animate-in fade-in duration-500">
                  <CltCalculationBlock data={calculationData} />
                </div>

                {!isRecebido && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between h-12 rounded-2xl border-2 border-dashed border-border/60 font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/10">
                        <div className="flex items-center gap-2.5">
                           <AlertTriangle className="w-4 h-4" /> Ajuste Manual de Divergências
                        </div>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 p-6 mt-3 rounded-[1.75rem] bg-muted/20 border border-border/40 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase px-1 text-muted-foreground">INSS</Label>
                          <Input type="number" step="0.01" value={editValues.inssTotal} onChange={e => setEditValues(v => ({ ...v, inssTotal: e.target.value }))} className="h-10 rounded-xl border-none bg-card shadow-inner font-bold text-sm text-center" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase px-1 text-muted-foreground">IRRF</Label>
                          <Input type="number" step="0.01" value={editValues.irrfFinal} onChange={e => setEditValues(v => ({ ...v, irrfFinal: e.target.value }))} className="h-10 rounded-xl border-none bg-card shadow-inner font-bold text-sm text-center" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase px-1 text-muted-foreground">Líquido</Label>
                          <Input type="number" step="0.01" value={editValues.salarioLiquido} onChange={e => setEditValues(v => ({ ...v, salarioLiquido: e.target.value }))} className="h-10 rounded-xl border-none bg-card shadow-inner font-bold text-sm text-center" />
                        </div>
                      </div>
                      <Button onClick={handleSaveEdit} className="w-full h-11 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Salvar Ajustes</Button>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </TabsContent>

              <TabsContent value="receber" className="mt-0 focus-visible:outline-none">
                <div className="rounded-[2.25rem] bg-card border-2 border-border/40 p-8 space-y-6 shadow-sm">
                   {!isRecebido ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                       <div className="flex items-center gap-3 mb-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          <h4 className="text-lg font-black tracking-tight">Registro no Fluxo de Caixa</h4>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase px-2 text-muted-foreground tracking-widest">Data do Depósito</Label>
                            <Input type="date" value={dataRecebimento} onChange={e => setDataRecebimento(e.target.value)} className="h-12 rounded-2xl border-none bg-muted/20 font-bold shadow-inner px-4 text-base" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase px-2 text-muted-foreground tracking-widest">Conta Destino</Label>
                            <select
                              value={contaRecebimento}
                              onChange={e => setContaRecebimento(e.target.value)}
                              className="flex h-12 w-full rounded-2xl border-none bg-muted/20 px-4 font-bold text-base shadow-inner outline-none appearance-none"
                            >
                              <option value="">Selecione a conta...</option>
                              {contasRecebiveis.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                       </div>
                       <Button onClick={handleRegistrar} disabled={!contaRecebimento || !dataRecebimento} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-[0.15em] gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all">
                          <CheckCircle2 className="w-5 h-5" /> Confirmar Recebimento
                       </Button>
                    </div>
                   ) : (
                    <div className="bg-emerald-500/[0.03] border-2 border-emerald-500/20 rounded-[2rem] p-10 flex flex-col items-center text-center space-y-4">
                       <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                          <Check className="w-8 h-8" />
                       </div>
                       <div>
                          <h4 className="text-2xl font-black tracking-tight text-emerald-700">Lançamento Efetivado</h4>
                          <p className="text-[11px] font-bold text-emerald-600/60 mt-1.5 uppercase tracking-[0.2em]">
                            Depósito em {competencia.dataRecebimento && new Date(competencia.dataRecebimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                       </div>
                    </div>
                   )}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 sm:px-10 py-5 bg-card border-t border-border/40 shrink-0 relative z-20 flex flex-row justify-end gap-3">
           <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-8 font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
              FECHAR DETALHES
           </Button>
        </DialogFooter>
      </ResizableDialogContent>
    </Dialog>
  );
}