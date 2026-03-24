"use client";

import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CltCompetencia, ContaCorrente, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Calculator, AlertTriangle, ChevronDown, Minus,
  FileText, ArrowLeft, Building2, Check, Scale, Info
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  const competencia = compProp as any; // Casting temporário para acessar novos campos 2026
  
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="clt_detail_modal_v2"
        initialWidth={750} initialHeight={850} minWidth={500} minHeight={600}
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col overflow-hidden",
          !isMobile && "rounded-[2.5rem] border-none"
        )}
      >
        <DialogHeader 
          className={cn("px-6 sm:px-8 pt-5 sm:pt-8 pb-5 sm:pb-6 bg-muted/30 shrink-0 relative")}
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
                   {competencia.isManualOverride && (
                    <Badge variant="outline" className="rounded-lg bg-amber-900/10 text-amber-900 border-none font-black text-[10px] uppercase tracking-widest px-2.5 py-1 gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Editado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 sm:px-8 py-2 border-b border-border/40 shrink-0">
            <TabsList className="w-full sm:w-fit grid grid-cols-4 bg-muted/40 h-11 p-1 rounded-2xl">
              <TabsTrigger value="resumo" className="rounded-xl font-black text-[10px] uppercase tracking-widest">RESUMO</TabsTrigger>
              <TabsTrigger value="inss" className="rounded-xl font-black text-[10px] uppercase tracking-widest">INSS</TabsTrigger>
              <TabsTrigger value="irrf" className="rounded-xl font-black text-[10px] uppercase tracking-widest">IRRF</TabsTrigger>
              <TabsTrigger value="receber" className="rounded-xl font-black text-[10px] uppercase tracking-widest">RECEBER</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 sm:px-8 scrollbar-material">
            <div className="py-6 space-y-6 pb-32 sm:pb-8">
              <TabsContent value="resumo" className="mt-0 space-y-6 focus-visible:outline-none">
                <div className="rounded-[2.5rem] bg-card border-2 border-border/40 p-8 space-y-6 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                      <Calculator className="w-32 h-32 rotate-12" />
                   </div>
                   
                   <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Salário Bruto</span>
                        <span className="font-black text-xl tabular-nums">{formatCurrency(competencia.salarioBruto)}</span>
                      </div>
                      
                      <div className="space-y-3 bg-muted/20 rounded-[1.5rem] p-5">
                         <div className="flex justify-between items-center text-destructive">
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Minus className="w-3.5 h-3.5" /> INSS</span>
                            <span className="font-black text-sm tabular-nums">-{formatCurrency(competencia.inssTotal)}</span>
                         </div>
                         <div className="flex justify-between items-center text-destructive">
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Minus className="w-3.5 h-3.5" /> IRRF</span>
                            <span className="font-black text-sm tabular-nums">-{formatCurrency(competencia.irrfFinal)}</span>
                         </div>
                      </div>

                      <Separator className="bg-border/60" />
                      
                      <div className="flex justify-between items-center px-1 pt-2">
                        <div>
                           <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Líquido Final Disponível</p>
                        </div>
                        <span className="font-black text-4xl text-primary tabular-nums tracking-tighter">{formatCurrency(competencia.salarioLiquido)}</span>
                      </div>
                   </div>
                </div>

                {!isRecebido && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between h-14 rounded-2xl border-2 border-dashed border-amber-900/30 font-black text-[10px] uppercase tracking-[0.2em] text-amber-900/70 hover:bg-amber-900/5 transition-all">
                        <div className="flex items-center gap-2.5">
                           <AlertTriangle className="w-4 h-4 text-amber-900" /> Ajustar Manualmente (Divergências)
                        </div>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 p-6 mt-3 rounded-[1.75rem] bg-amber-900/[0.03] border border-amber-900/20 animate-in slide-in-from-top-2 duration-300">
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
                      <Button onClick={handleSaveEdit} className="w-full h-11 rounded-xl bg-amber-900 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-900/20">Aplicar Ajustes</Button>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </TabsContent>

              <TabsContent value="inss" className="mt-0 focus-visible:outline-none">
                 <div className="rounded-[2rem] border-2 border-border/40 bg-card overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b border-border/40 h-12">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Faixa de Cálculo</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Contribuição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competencia.inssDetalhePorFaixa.map((f: any) => (
                        <TableRow key={f.faixa} className="border-b border-border/20 last:border-none h-14">
                          <TableCell className="text-[11px] font-black uppercase text-muted-foreground pl-6">{f.faixa}ª faixa progressiva</TableCell>
                          <TableCell className="text-right font-black tabular-nums text-sm pr-6">{formatCurrency(f.contribuicao)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="bg-blue-600/[0.03] p-6 border-t border-border/40 flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Total Retido INSS</span>
                     <span className="text-2xl font-black text-blue-600 tabular-nums">{formatCurrency(competencia.inssTotal)}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="irrf" className="mt-0 focus-visible:outline-none space-y-6">
                <div className="rounded-[2.5rem] bg-card border-2 border-border/40 p-8 space-y-6 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                      <Scale className="w-32 h-32 rotate-12" />
                   </div>
                   
                   <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rendimento Bruto</span>
                        <span className="font-black text-lg tabular-nums">{formatCurrency(competencia.salarioBruto)}</span>
                      </div>
                      
                      <div className="space-y-3 bg-muted/20 rounded-[1.5rem] p-5">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60"><Minus className="w-3.5 h-3.5" /> INSS Retido</span>
                            <span className="font-black text-sm tabular-nums">-{formatCurrency(competencia.inssTotal)}</span>
                         </div>
                         {competencia.deducaoDependentes > 0 && (
                            <div className="flex justify-between items-center">
                               <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60"><Minus className="w-3.5 h-3.5" /> Dependentes</span>
                               <span className="font-black text-sm tabular-nums">-{formatCurrency(competencia.deducaoDependentes)}</span>
                            </div>
                         )}
                         {competencia.deducaoPensao > 0 && (
                            <div className="flex justify-between items-center">
                               <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60"><Minus className="w-3.5 h-3.5" /> Pensão Alimentícia</span>
                               <span className="font-black text-sm tabular-nums">-{formatCurrency(competencia.deducaoPensao)}</span>
                            </div>
                         )}
                      </div>

                      <div className="flex justify-between items-center px-1 border-t border-border/40 pt-4">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Base Tributável</span>
                        <span className="font-black text-xl tabular-nums text-primary">{formatCurrency(competencia.baseIR)}</span>
                      </div>

                      <div className="flex justify-between items-center px-1 pt-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Imposto Progressivo</span>
                        <span className="font-black text-xl tabular-nums">{formatCurrency(competencia.impostoBruto || 0)}</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                        <div>
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Redutor Lei 15.270
                           </p>
                           <p className="text-[8px] font-bold text-emerald-600/60 uppercase mt-0.5">Calculado sobre bruto: {formatCurrency(competencia.rendimentoTributavel || competencia.salarioBruto)}</p>
                        </div>
                        <span className="font-black text-lg text-emerald-600 tabular-nums">-{formatCurrency(competencia.reducaoLei15270)}</span>
                      </div>

                      <Separator className="bg-border/60" />
                      
                      <div className="flex justify-between items-center px-1 pt-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-destructive">IRRF Retido Final</p>
                        <span className="font-black text-3xl text-destructive tabular-nums tracking-tighter">{formatCurrency(competencia.irrfFinal)}</span>
                      </div>
                   </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-start gap-3">
                   <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                   <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-tight">
                      Atenção: O cálculo de IRRF em folha de pagamento 2026 utiliza exclusivamente o método de deduções legais com a aplicação do redutor da Lei 15.270/2025 para isenção de até 2 salários mínimos.
                   </p>
                </div>
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