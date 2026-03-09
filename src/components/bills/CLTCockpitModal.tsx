import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/contexts/FinanceContext";
import { FutureIncome, formatCurrency } from "@/types/finance";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calculator, Calendar, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";

interface CLTCockpitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CLTCockpitModal({ open, onOpenChange }: CLTCockpitModalProps) {
  const { futureIncomes, updateFutureIncome } = useFinance();
  const [selectedVincule, setSelectedVincule] = useState<string | null>(null);

  const cltIncomes = useMemo(() => futureIncomes.filter(i => i.specificType === 'clt'), [futureIncomes]);
  const vincules = useMemo(() => Array.from(new Set(cltIncomes.map(i => i.vinculeId || 'Sem Vínculo'))), [cltIncomes]);

  const activeVinculeIncomes = useMemo(() => {
    if (!selectedVincule) return [];
    return cltIncomes.filter(i => (i.vinculeId || 'Sem Vínculo') === selectedVincule);
  }, [cltIncomes, selectedVincule]);

  const projection = useMemo(() => {
    if (activeVinculeIncomes.length === 0) return [];
    
    // Simplificação: pega a primeira receita CLT como base para a série
    const baseIncome = activeVinculeIncomes[0];
    const year = getYear(new Date());
    const proj = [];
    
    for (let i = 0; i < 12; i++) {
      proj.push({
        month: i,
        label: format(new Date(year, i, 1), 'MMMM', { locale: ptBR }),
        bruto: baseIncome.grossAmount,
        deducoes: baseIncome.discounts.reduce((acc, d) => acc + d.amount, 0),
        liquido: baseIncome.netExpectedAmount
      });
    }
    
    proj.push({
      month: 12,
      label: '13º Salário',
      bruto: baseIncome.grossAmount,
      deducoes: baseIncome.discounts.reduce((acc, d) => acc + d.amount, 0),
      liquido: baseIncome.netExpectedAmount
    });
    
    return proj;
  }, [activeVinculeIncomes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl dark:bg-[hsl(24_8%_10%)]">
        <DialogHeader className="px-8 pt-8 pb-6 shrink-0 relative bg-primary/5 dark:bg-black/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-primary/10 text-primary">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">Cockpit CLT</DialogTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestão de Vínculos e Projeções</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex gap-6 p-8 pt-2">
          <div className="w-1/4 space-y-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2">Vínculos</h3>
            {vincules.map(v => (
              <Button 
                key={v} 
                variant={selectedVincule === v ? 'default' : 'ghost'}
                className="w-full justify-start rounded-xl font-bold text-xs uppercase tracking-widest"
                onClick={() => setSelectedVincule(v)}
              >
                {v}
              </Button>
            ))}
          </div>
          
          <div className="w-3/4 space-y-6">
            {selectedVincule ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total Bruto</span>
                        <p className="text-lg font-black tabular-nums mt-1">{formatCurrency(projection.reduce((acc, p) => acc + p.bruto, 0))}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                        <span className="text-[8px] font-black text-destructive uppercase tracking-widest">Deduções</span>
                        <p className="text-lg font-black tabular-nums mt-1 text-destructive">{formatCurrency(projection.reduce((acc, p) => acc + p.deducoes, 0))}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
                        <span className="text-[8px] font-black text-success uppercase tracking-widest">Total Líquido</span>
                        <p className="text-lg font-black tabular-nums mt-1 text-success">{formatCurrency(projection.reduce((acc, p) => acc + p.liquido, 0))}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30">
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 font-black uppercase tracking-widest">Mês</th>
                        <th className="text-right p-3 font-black uppercase tracking-widest">Bruto</th>
                        <th className="text-right p-3 font-black uppercase tracking-widest">Deduções</th>
                        <th className="text-right p-3 font-black uppercase tracking-widest">Líquido</th>
                        <th className="text-center p-3 font-black uppercase tracking-widest">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.map((p, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-bold capitalize">{p.label}</td>
                          <td className="text-right p-3 font-medium tabular-nums">{formatCurrency(p.bruto)}</td>
                          <td className="text-right p-3 font-medium text-destructive tabular-nums">{formatCurrency(p.deducoes)}</td>
                          <td className="text-right p-3 font-black tabular-nums">{formatCurrency(p.liquido)}</td>
                          <td className="text-center p-3">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toast.info("Edição de mês específico em breve!")}>
                                  <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
                <Calculator className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Selecione um vínculo CLT</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
