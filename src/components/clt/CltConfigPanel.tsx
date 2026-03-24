"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CltLegislacaoConfig, CltContract } from "@/types/finance";
import { calcularINSS, calcularIRRF, calcularFGTS, DEFAULT_CONFIG_2026 } from "@/lib/cltCalc";
import { cn } from "@/lib/utils";
import {
  RotateCcw, ChevronDown, Shield, Landmark,
  Sparkles, Scale
} from "lucide-react";
import { CltCalculationBlock } from "./CltCalculationBlock";

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
  const [showLegislation, setShowLegislation] = useState(false);

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

  const demoData = useMemo(() => {
    const bruto = parseFloat(simBruto) || 0;
    const deps = parseInt(simDeps) || 0;
    const pensao = parseFloat(simPensao) || 0;
    if (bruto <= 0) return null;

    const inss = calcularINSS(bruto, localConfig);
    const irrf = calcularIRRF(bruto, inss.total, deps, pensao, localConfig);
    const fgts = calcularFGTS(bruto, localConfig);
    
    return {
      bruto,
      inss: inss.total,
      baseIR: irrf.baseTributavel,
      impostoBruto: irrf.impostoBruto,
      ajustes: irrf.redutor,
      irrfFinal: irrf.irrfFinal,
      liquido: bruto - inss.total - irrf.irrfFinal,
      fgts,
      dependentes: deps,
      pensao
    };
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
             <h4 className="font-black text-lg tracking-tight">Simulação de Recebimento</h4>
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

          {demoData && (
            <div className="animate-in fade-in duration-500">
              <CltCalculationBlock data={demoData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}