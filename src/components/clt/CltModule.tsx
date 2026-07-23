import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CltContract, formatCurrency } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { CltContractFormModal } from "./CltContractFormModal";
import { CltVacationTab } from "./CltVacationTab";
import { CltResignationTab } from "./CltResignationTab";
import { toast } from "sonner";
import { Plus, Briefcase, TrendingUp, Wallet, ArrowLeft, Settings2, Trash2, Umbrella, FileX, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { VinculoCLT, RegimeFGTS } from "@/types/clt";
import { startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CltModule({ open, onOpenChange }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const {
    cltContracts, addCltContract, updateCltContract, deleteCltContract,
    transacoesV2, categoriasV2, setCategoriasV2
  } = useFinance();

  // Garantir existência da categoria Salário
  useEffect(() => {
    if (open && categoriasV2.length > 0) {
      const exists = categoriasV2.find(c => c?.label?.toLowerCase() === 'salário' || c?.label?.toLowerCase() === 'salario');
      if (!exists) {
        setCategoriasV2(prev => [...prev, {
          id: 'cat_salario_auto',
          label: 'Salário',
          nature: 'receita',
          type: 'income',
          icon: 'Wallet'
        }]);
      }
    }
  }, [open, categoriasV2, setCategoriasV2]);

  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<CltContract | undefined>();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    cltContracts.length === 1 ? cltContracts[0].id : null
  );

  const selectedContract = cltContracts.find(c => c.id === selectedContractId);

  const categoriaSalario = useMemo(() => {
    return categoriasV2.find(c => c?.label?.toLowerCase() === 'salário' || c?.label?.toLowerCase() === 'salario');
  }, [categoriasV2]);

  const transacoesSalariais = useMemo(() => {
    if (!categoriaSalario) return [];
    return transacoesV2
      .filter(t => t.categoryId === categoriaSalario.id && t.flow === 'in')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transacoesV2, categoriaSalario]);

  const kpis = useMemo(() => {
    const now = new Date();
    const startYear = startOfYear(now);
    const endYear = endOfYear(now);

    const transacoesAno = transacoesSalariais.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: startYear, end: endYear });
    });

    const totalAno = transacoesAno.reduce((acc, t) => acc + t.amount, 0);
    return { totalAno, countAno: transacoesAno.length };
  }, [transacoesSalariais]);

  const vinculoClt: VinculoCLT | null = useMemo(() => {
    if (!selectedContract) return null;
    return {
      id: selectedContract.id,
      nome_descritivo: selectedContract.empresa,
      data_admissao: selectedContract.dataAdmissao,
      data_desligamento: null,
      ativo: selectedContract.status === 'ativo',
      salario_base_atual: selectedContract.salarioBrutoAtual,
      regime_fgts: RegimeFGTS.SAQUE_RESCISAO 
    };
  }, [selectedContract]);

  const handleSaveContract = (contract: CltContract) => {
    if (editingContract) {
      updateCltContract(contract.id, contract);
      toast.success("Contrato Assalariado atualizado");
    } else {
      addCltContract(contract);
      setSelectedContractId(contract.id);
      toast.success(`Contrato Assalariado cadastrado! Monitorando categoria de Salário.`);
    }
    setEditingContract(undefined);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent 
          storageKey="clt_main_modal_v4"
          initialWidth={1100} initialHeight={800} minWidth={800} minHeight={600}
          hideCloseButton
          fullscreen={isMobile}
          className="p-0 border-none bg-background overflow-hidden md:rounded-[2.5rem]"
        >
          <div className="flex h-full overflow-hidden">
            
            <div className="w-72 border-r border-border/40 bg-muted/20 flex flex-col hidden md:flex">
              <div className="p-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-6">Contratos Ativos</h3>
                <Button 
                  onClick={() => { setEditingContract(undefined); setShowContractForm(true); }}
                  className="w-full justify-start gap-2.5 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/10 font-bold text-xs"
                >
                  <Plus className="w-4.5 h-4.5" /> NOVO CONTRATO
                </Button>
              </div>

              <ScrollArea className="flex-1 px-4">
                <div className="space-y-2 pb-8">
                  {cltContracts.map(contract => (
                    <button
                      key={contract.id}
                      onClick={() => setSelectedContractId(contract.id)}
                      className={cn(
                        "w-full text-left p-5 rounded-[2rem] transition-all duration-300 relative border",
                        selectedContractId === contract.id 
                          ? "bg-card border-border/60 shadow-sm" 
                          : "border-transparent hover:bg-card/40 text-muted-foreground"
                      )}
                    >
                      <p className="text-[11px] font-black uppercase tracking-tight truncate">{contract.empresa}</p>
                      <p className="text-[10px] font-bold opacity-50 tabular-nums">{formatCurrency(contract.salarioBrutoAtual)}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-6 border-t border-border/10">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Sair do Módulo
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-background">
              <header className="h-20 border-b border-border/40 flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                  <div className="md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedContractId(null)}>
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">{selectedContract?.empresa || 'Contrato Assalariado'}</h2>
                    {selectedContract && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contrato Admitido em {new Date(selectedContract.dataAdmissao).toLocaleDateString()}</p>}
                  </div>
                </div>

                {selectedContract && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => { setEditingContract(selectedContract); setShowContractForm(true); }}>
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Excluir contrato assalariado?")) { deleteCltContract(selectedContract.id); setSelectedContractId(null); } }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </header>

              <ScrollArea className="flex-1">
                {!selectedContractId ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-muted/20 flex items-center justify-center">
                      <Briefcase className="w-9 h-9 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">Contratos Assalariados</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">Selecione ou adicione um contrato para visualizar histórico e projeções.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 sm:p-12 max-w-4xl mx-auto space-y-10">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-60">Total Recebido (Ano)</span>
                        <p className="text-3xl font-black text-emerald-600 tracking-tighter tabular-nums">{formatCurrency(kpis.totalAno)}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/10 p-6 rounded-[2.5rem]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">Lançamentos</span>
                        <p className="text-3xl font-black text-primary tracking-tighter tabular-nums">{kpis.countAno}</p>
                      </div>
                    </div>

                    <Tabs defaultValue="extrato">
                      <TabsList className="bg-muted/40 p-1 rounded-2xl h-11 border border-border/10 mb-8 w-fit">
                        <TabsTrigger value="extrato" className="rounded-xl px-6 h-9 font-black text-[10px] uppercase tracking-widest gap-2">
                          <ReceiptText className="w-3.5 h-3.5" /> Extrato
                        </TabsTrigger>
                        <TabsTrigger value="ferias" className="rounded-xl px-6 h-9 font-black text-[10px] uppercase tracking-widest gap-2">
                          <Umbrella className="w-3.5 h-3.5" /> FÉRIAS
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="extrato" className="animate-in fade-in duration-500">
                        <div className="bg-card rounded-[2.5rem] border border-border/40 overflow-hidden shadow-sm">
                          <table className="w-full text-left">
                            <thead className="bg-muted/20 border-b border-border/40">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transacoesSalariais.length > 0 ? (
                                transacoesSalariais.map(t => (
                                  <tr key={t.id} className="border-b border-border/10 last:border-none hover:bg-muted/5 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold tabular-nums">{new Date(t.date + 'T12:00:00').toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground truncate max-w-[250px]">{t.description}</td>
                                    <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right tabular-nums">{formatCurrency(t.amount)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="px-6 py-20 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic">Sem registros em "Salário"</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      <TabsContent value="ferias" className="animate-in fade-in duration-500">
                        {selectedContract && <CltVacationTab contractId={selectedContract.id} salarioBase={selectedContract.salarioBrutoAtual} dependentes={selectedContract.dependentes} dataAdmissao={selectedContract.dataAdmissao} dataInicioControle={selectedContract.dataInicioControle} />}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </ResizableDialogContent>
      </Dialog>

      <CltContractFormModal open={showContractForm} onOpenChange={setShowContractForm} onSave={handleSaveContract} editingContract={editingContract} />
    </>
  );
}
