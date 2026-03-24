"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CltLegislacaoConfig, CltContract, formatCurrency } from "@/types/finance";
import { calcularINSS, calcularIRRF, calcularFGTS, DEFAULT_CONFIG_2026 } from "@/lib/cltCalc";
import { cn } from "@/lib/utils";
import {
  RotateCcw, AlertTriangle, ChevronDown, Shield, Landmark,
  Calculator, CheckCircle2, Minus, PiggyBank, Sparkles,
  Scale
} from "lucide-react";

interface Props {
  config: CltLegislacaoConfig;
  onUpdateConfig: (config: CltLegislacaoConfig) => void;
  contract?: CltContract;
}

export function CltConfigPanel({ config, onUpdateConfig, contract }: Props) {
  const [localConfig, setLocalConfig] = useState<CltLegislacaoConfig>({ ...config });
  const [simBruto, setSimBruto] = useState(contract?.salarioBrutoAtual?.toString() || "5000");
  const [simDeps, setSimDeps] = useState(contract?.dependentes?.toString() || "0");
  const [simPensao, setSimPensao] = useState(contract?.pensaoAlimenticia?.toString() || "0");
  const [showInss, setShowInss] = useState(true);
  const [showIrrf, setShowIrrf] = useState(true);
  const [showConstants, setShowConstants] = useState(false);
  const [showLegislation, setShowLegislation] = useState(false);

  const isModified = JSON.stringify(localConfig) !== JSON.stringify(DEFAULT_CONFIG_2026);

  const formatInputDisplay = (val: number) => {
    if (val === Infinity) return "∞";
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDisplayChange = (currentValue: string) => {
    const digits = currentValue.replace(/\D/g, "");
    if (!digits) return "0,00";
    const val = parseInt(digits) / 100;
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseInputValue = (displayValue: string) => {
    const cleaned = displayValue.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const demo = useMemo(() => {
    const bruto = parseFloat(simBruto) || 0;
    const deps = parseInt(simDeps) || 0;
    const pensao = parseFloat(simPensao) || 0;
    if (bruto <= 0) return null;

    const inss = calcularINSS(bruto, localConfig);
    const irrf = calcularIRRF(bruto, inss.total, deps, pensao, localConfig);
    const fgts = calcularFGTS(bruto, localConfig);
    const liquido = bruto - inss.total - irrf.irrfFinal;

    return { bruto, inss, irrf, fgts, liquido };
  }, [simBruto, simDeps, simPensao, localConfig]);

  const handleInssChange = (index: number, field: 'ate' | 'aliquota', displayValue: string) => {
    const numericValue = parseInputValue(displayValue);
    const updated = { ...localConfig };
    updated.inssFaixas = [...updated.inssFaixas];
    updated.inssFaixas[index] = { 
      ...updated.inssFaixas[index], 
      [field]: field === 'aliquota' ? numericValue / 100 : numericValue 
    };
    setLocalConfig(updated);
  };

  const handleIrrfChange = (index: number, field: 'ate' | 'aliquota' | 'deducao', displayValue: string) => {
    const numericValue = parseInputValue(displayValue);
    const updated = { ...localConfig };
    updated.irrfFaixas = [...updated.irrfFaixas];
    updated.irrfFaixas[index] = {
      ...updated.irrfFaixas[index],
      [field]: field === 'aliquota' ? numericValue / 100 : numericValue,
    };
    setLocalConfig(updated);
  };

  const handleConstantChange = (key: keyof CltLegislacaoConfig, displayValue: string, isPercentage?: boolean) => {
    const numericValue = parseInputValue(displayValue);
    setLocalConfig(prev => ({ 
      ...prev, 
      [key]: isPercentage ? numericValue / 100 : numericValue 
    }));
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-xl tracking-tight">Parâmetros de Cálculo</h3>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Configuração: {localConfig.nome} • {localConfig.vigencia}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLegislation(!showLegislation)}
            className="gap-2 text-[10px] font-black uppercase tracking-widest h-8 rounded-lg border-primary/20 text-primary"
          >
            [ LEGISLAÇÃO ]
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLocalConfig({ ...DEFAULT_CONFIG_2026, id: localConfig.id, nome: localConfig.nome, isDefault: false })} className="gap-2 text-[10px] font-black uppercase tracking-widest h-8 rounded-lg">
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão
          </Button>
        </div>
      </div>

      {showLegislation && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-primary">Detalhamento Normativo</p>
              <p className="text-[9px] font-medium text-muted-foreground leading-relaxed">
                As regras aplicadas seguem a Portaria MPS/MF nº 13/2026 para INSS e a Lei nº 15.191/2025 para IRRF, 
                incluindo os ajustes de progressividade da Lei nº 15.270/2025.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <Collapsible open={showInss} onOpenChange={setShowInss} className="rounded-2xl border-2 border-border/40 bg-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-12 px-5 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                   <Shield className="w-4.5 h-4.5 text-blue-600" />
                   <span className="font-black text-[11px] uppercase tracking-[0.15em]">Tabela INSS</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showInss && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-8">Faixa</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-8">Até (R$)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-8 text-right">Alíquota (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localConfig.inssFaixas.map((f, i) => (
                    <TableRow key={i} className="border-border/30 h-10">
                      <TableCell className="text-[11px] font-bold">{i + 1}ª</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputDisplay(f.ate)}
                          onChange={e => handleInssChange(i, 'ate', handleDisplayChange(e.target.value))}
                          className="h-8 text-xs w-32 bg-card border-none shadow-inner rounded-lg font-black text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={(f.aliquota * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                          onChange={e => handleInssChange(i, 'aliquota', handleDisplayChange(e.target.value))}
                          className="h-8 text-xs w-20 bg-card border-none shadow-inner rounded-lg font-black text-center ml-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showIrrf} onOpenChange={setShowIrrf} className="rounded-2xl border-2 border-border/40 bg-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-12 px-5 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                   <Landmark className="w-4.5 h-4.5 text-red-600" />
                   <span className="font-black text-[11px] uppercase tracking-[0.15em]">Tabela IRRF</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showIrrf && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-8 pl-4">Até (R$)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-8 text-center">Alíq. (%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-8 text-right pr-4">Parcela a Deduzir (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localConfig.irrfFaixas.map((f, i) => (
                    <TableRow key={i} className="border-border/30 h-10">
                      <TableCell className="pl-2">
                        {f.ate === Infinity ? (
                          <div className="h-8 flex items-center justify-center w-36 bg-card/50 rounded-lg font-black text-[10px] uppercase">FAIXA MÁXIMA</div>
                        ) : (
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatInputDisplay(f.ate)}
                            onChange={e => handleIrrfChange(i, 'ate', handleDisplayChange(e.target.value))}
                            className="h-8 text-xs w-36 bg-card border-none shadow-inner rounded-lg font-black text-right"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={(f.aliquota * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}
                          onChange={e => handleIrrfChange(i, 'aliquota', handleDisplayChange(e.target.value))}
                          className="h-8 text-xs w-20 bg-card border-none shadow-inner rounded-lg font-black text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right pr-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputDisplay(f.deducao)}
                          onChange={e => handleIrrfChange(i, 'deducao', handleDisplayChange(e.target.value))}
                          className="h-8 text-xs w-32 bg-card border-none shadow-inner rounded-lg font-black text-right ml-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={() => onUpdateConfig(localConfig)} className="w-full h-12 rounded-2xl bg-primary font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
             ATUALIZAR PARÂMETROS
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1 mb-2">
             <Sparkles className="w-5 h-5 text-primary" />
             <h4 className="font-black text-lg tracking-tight">Memória de Cálculo</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Salário Bruto</Label>
              <Input type="number" step="0.01" value={simBruto} onChange={e => setSimBruto(e.target.value)} className="h-10 rounded-xl border-none bg-muted/20 font-black shadow-inner px-4" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Dependentes</Label>
              <Input type="number" min="0" value={simDeps} onChange={e => setSimDeps(e.target.value)} className="h-10 rounded-xl border-none bg-muted/20 font-black shadow-inner text-center" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Pensão (R$)</Label>
              <Input type="number" step="0.01" min="0" value={simPensao} onChange={e => setSimPensao(e.target.value)} className="h-10 rounded-xl border-none bg-muted/20 font-black shadow-inner text-center" />
            </div>
          </div>

          {demo && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <StepCard num={1} title="Entrada">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground">Salário Bruto</span>
                  <p className="font-black text-xl tabular-nums tracking-tighter text-foreground">{formatCurrency(demo.bruto)}</p>
                </div>
              </StepCard>

              <StepCard num={2} title="Descontos">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-muted-foreground">INSS Retido</span>
                  <span className="font-black text-sm text-destructive">-{formatCurrency(demo.inss.total)}</span>
                </div>
              </StepCard>

              <StepCard num={3} title="Base de Cálculo do IRRF">
                <div className="text-[10px] font-bold p-3 rounded-xl bg-card/50 border border-border/40">
                  <p className="text-muted-foreground leading-tight">Salário Bruto – INSS – Dependentes – Pensão</p>
                  <p className="text-primary font-black text-sm mt-1">{formatCurrency(demo.irrf.baseTributavel)}</p>
                </div>
              </StepCard>

              <StepCard num={4} title="IRRF Calculado">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aplicação da Tabela Progressiva</span>
                   <span className="font-black text-sm text-destructive">{formatCurrency(demo.irrf.impostoBruto)}</span>
                </div>
              </StepCard>

              <StepCard num={5} title="Ajustes Aplicados">
                <div className="flex justify-between items-center text-emerald-600">
                   <span className="text-[10px] font-black uppercase tracking-widest">Desconto Simplificado / Parcela a Deduzir</span>
                   <span className="font-black text-sm tabular-nums">-{formatCurrency(demo.irrf.redutor)}</span>
                </div>
              </StepCard>

              <StepCard num={6} title="Resultado" highlight>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">IRRF Devido</span>
                    <span className="font-black text-base text-destructive tabular-nums">{formatCurrency(demo.irrf.irrfFinal)}</span>
                  </div>
                  <Separator className="bg-primary/20" />
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Salário Líquido</span>
                        <p className="text-4xl font-black tabular-nums tracking-tighter text-primary leading-none">{formatCurrency(demo.liquido)}</p>
                    </div>
                  </div>
                </div>
              </StepCard>

              <StepCard num={7} title="Encargos">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">FGTS</span>
                   <span className="font-black text-sm text-amber-600 tabular-nums">{formatCurrency(demo.fgts)}</span>
                </div>
              </StepCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ num, title, children, highlight }: { num: number; title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-[2rem] border-2 p-6 space-y-3 transition-all duration-500",
      highlight ? "bg-primary/[0.03] border-primary/30 shadow-lg shadow-primary/5" : "bg-muted/10 border-border/30"
    )}>
      <div className="flex items-center gap-3">
        <span className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black transition-colors shadow-sm",
          highlight ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
        )}>{num}</span>
        <span className={cn("text-[11px] font-black uppercase tracking-[0.2em]", highlight ? "text-primary" : "text-muted-foreground")}>{title}</span>
      </div>
      {children}
    </div>
  );
}