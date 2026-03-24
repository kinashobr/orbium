import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ResizableDialogContent } from "@/components/ui/ResizableDialogContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CltContract, CltLegislacaoConfig, generateCltContractId, formatCurrency } from "@/types/finance";
import { calcularINSS, calcularIRRF, calcularFGTS, DEFAULT_CONFIG_2026 } from "@/lib/cltCalc";
import { Info, Sparkles, Building2, Check, ArrowLeft, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contract: CltContract) => void;
  editingContract?: CltContract;
  legislacaoConfig?: CltLegislacaoConfig;
}

export function CltContractFormModal({ open, onOpenChange, onSave, editingContract, legislacaoConfig }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [empresa, setEmpresa] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [salarioBruto, setSalarioBruto] = useState("");
  const [dependentes, setDependentes] = useState("0");
  const [pensaoAlimenticia, setPensaoAlimenticia] = useState("0");
  const [dataInicioGestao, setDataInicioGestao] = useState("");

  const config = legislacaoConfig || DEFAULT_CONFIG_2026;

  useEffect(() => {
    if (open) {
      if (editingContract) {
        setEmpresa(editingContract.empresa);
        setDataAdmissao(editingContract.dataAdmissao);
        setSalarioBruto(editingContract.salarioBrutoAtual.toString());
        setDependentes(editingContract.dependentes.toString());
        setPensaoAlimenticia(editingContract.pensaoAlimenticia.toString());
        setDataInicioGestao(editingContract.dataInicioGestao);
      } else {
        setEmpresa("");
        setDataAdmissao("");
        setSalarioBruto("");
        setDependentes("0");
        setPensaoAlimenticia("0");
        setDataInicioGestao(new Date().toISOString().split('T')[0]);
      }
    }
  }, [open, editingContract]);

  const preview = useMemo(() => {
    const bruto = parseFloat(salarioBruto);
    if (!bruto || bruto <= 0) return null;
    const deps = parseInt(dependentes) || 0;
    const pensao = parseFloat(pensaoAlimenticia) || 0;
    const inss = calcularINSS(bruto, config);
    const irrf = calcularIRRF(bruto, inss.total, deps, pensao, config);
    const fgts = calcularFGTS(bruto, config);
    const liquido = bruto - inss.total - irrf.irrfFinal;
    return { inss: inss.total, irrf: irrf.irrfFinal, fgts, liquido };
  }, [salarioBruto, dependentes, pensaoAlimenticia, config]);

  const handleSave = () => {
    if (!empresa.trim() || !dataAdmissao || !salarioBruto || !dataInicioGestao) return;

    const contract: CltContract = {
      id: editingContract?.id || generateCltContractId(),
      empresa: empresa.trim(),
      dataAdmissao,
      salarioBrutoAtual: parseFloat(salarioBruto),
      dependentes: parseInt(dependentes) || 0,
      pensaoAlimenticia: parseFloat(pensaoAlimenticia) || 0,
      dataInicioGestao,
      status: editingContract?.status || 'ativo',
      legislacaoConfigId: editingContract?.legislacaoConfigId,
      createdAt: editingContract?.createdAt || new Date().toISOString(),
      auditLog: editingContract?.auditLog || [],
    };

    onSave(contract);
    onOpenChange(false);
  };

  const handleDateChange = (setter: (val: string) => void, val: string) => {
    if (!val) {
      setter(val);
      return;
    }
    const [year] = val.split('-');
    if (year && year.length > 4) return;
    setter(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="clt_contract_modal_v3"
        initialWidth={680} initialHeight={780} minWidth={450} minHeight={600}
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
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/10">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tighter">
                {editingContract ? "Editar Vínculo" : "Novo Vínculo de Recebimento"}
              </DialogTitle>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Vínculo Profissional
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 sm:px-8 scrollbar-material">
          <div className="py-6 space-y-6 pb-32 sm:pb-8">
            <div className="space-y-2 p-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2">Fonte Pagadora / Empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
                <Input placeholder="Nome da fonte pagadora" value={empresa} onChange={e => setEmpresa(e.target.value)} className="h-12 pl-11 text-base font-bold rounded-2xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 p-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2">Data de Início</Label>
                <Input 
                  type="date" 
                  max="9999-12-31"
                  value={dataAdmissao} 
                  onChange={e => handleDateChange(setDataAdmissao, e.target.value)} 
                  className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner text-sm px-4" 
                />
              </div>
              <div className="space-y-2 p-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2">Início do Monitoramento</Label>
                <Input 
                  type="date" 
                  max="9999-12-31"
                  value={dataInicioGestao} 
                  onChange={e => handleDateChange(setDataInicioGestao, e.target.value)} 
                  className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner text-sm px-4" 
                />
              </div>
            </div>

            <Separator className="opacity-40" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2 p-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2">Valor Bruto Mensal</Label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground/40">R$</span>
                   <Input type="number" step="0.01" value={salarioBruto} onChange={e => setSalarioBruto(e.target.value)} placeholder="0,00" className="h-12 pl-10 text-lg font-black rounded-2xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner tabular-nums" />
                </div>
              </div>
              <div className="space-y-2 p-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2">Dependentes</Label>
                <Input type="number" value={dependentes} onChange={e => setDependentes(e.target.value)} className="h-12 text-lg font-black rounded-2xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner text-center" />
              </div>
            </div>

            <div className="space-y-2 p-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2">Deduções / Pensão</Label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground/40">R$</span>
                 <Input type="number" step="0.01" value={pensaoAlimenticia} onChange={e => setPensaoAlimenticia(e.target.value)} placeholder="0,00" className="h-12 pl-10 text-lg font-black rounded-2xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner tabular-nums" />
              </div>
            </div>

            {preview && (
              <div className="rounded-[2rem] bg-primary/[0.03] border-2 border-dashed border-primary/20 p-6 space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Projeção do Sistema (Lei 15.270)</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                   <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Líquido Estimado</span>
                      <p className="text-3xl font-black tabular-nums text-primary leading-none tracking-tighter">{formatCurrency(preview.liquido)}</p>
                   </div>
                   <div className="text-right pb-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">FGTS (DEP.)</span>
                      <span className="font-black text-base tabular-nums">{formatCurrency(preview.fgts)}</span>
                   </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-10 bg-muted/10 shrink-0 flex flex-row justify-end gap-3 border-t border-border/40",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-top) + 0.5rem)' } : undefined}
        >
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-full h-11 px-8 font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          >
            CANCELAR
          </Button>
          <Button onClick={handleSave} className="rounded-full h-11 px-10 bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] gap-2 shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all">
            {editingContract ? "SALVAR" : "CADASTRAR"}
          </Button>
        </DialogFooter>
      </ResizableDialogContent>
    </Dialog>
  );
}