"use client";

import React, { useState } from 'react';
import { formatCurrency } from "@/types/finance";
import { INSSFaixaDetalhe } from "@/lib/cltCalc";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Calculator } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CltCalculationBlockProps {
  data: {
    bruto: number;
    inss: number;
    inssDetalhe?: INSSFaixaDetalhe[];
    baseIR: number;
    impostoBruto: number;
    ajustes: number;
    irrfFinal: number;
    liquido: number;
    fgts: number;
    dependentes?: number;
    pensao?: number;
  };
  showCharges?: boolean;
}

export function CltCalculationBlock({ data, showCharges = true }: CltCalculationBlockProps) {
  const [showInssDetail, setShowInssDetail] = useState(false);
  const [showIrrfDetail, setShowIrrfDetail] = useState(false);

  return (
    <div className="bg-card border-2 border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-6 sm:p-8 space-y-5">
        
        {/* ENTRADAS - DISCRETO */}
        <div className="flex justify-between items-center opacity-70">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salário Bruto</span>
          <span className="text-sm font-black tabular-nums">{formatCurrency(data.bruto)}</span>
        </div>

        <Separator className="opacity-30" />

        {/* INSS - EXPANSÍVEL */}
        <Collapsible open={showInssDetail} onOpenChange={setShowInssDetail}>
          <div className="flex justify-between items-center group">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showInssDetail && "rotate-180")} />
                INSS Retido
              </button>
            </CollapsibleTrigger>
            <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(data.inss)}</span>
          </div>
          
          <CollapsibleContent className="mt-3 animate-in slide-in-from-top-1 duration-300">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
              {data.inssDetalhe?.map((faixa, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                  <span>Faixa {faixa.faixa} ({(faixa.aliquota * 100).toFixed(1)}%) sobre {formatCurrency(faixa.baseCalculo)}</span>
                  <span className="font-black text-foreground">{formatCurrency(faixa.contribuicao)}</span>
                </div>
              ))}
              {(!data.inssDetalhe || data.inssDetalhe.length === 0) && (
                <p className="text-[9px] text-muted-foreground italic">Detalhamento por faixas indisponível.</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* IRRF - EXPANSÍVEL (SE HOUVER) */}
        <Collapsible open={showIrrfDetail} onOpenChange={setShowIrrfDetail}>
          <div className="flex justify-between items-center">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showIrrfDetail && "rotate-180")} />
                IRRF Calculado
              </button>
            </CollapsibleTrigger>
            <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(data.irrfFinal)}</span>
          </div>
          
          <CollapsibleContent className="mt-3 animate-in slide-in-from-top-1 duration-300">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase text-muted-foreground/60">Base de Cálculo</p>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-muted-foreground">Bruto – INSS – Deps – Pensão</span>
                  <span className="font-black text-primary">{formatCurrency(data.baseIR)}</span>
                </div>
              </div>
              <Separator className="opacity-20" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground/60">Imposto Bruto</p>
                  <p className="text-[10px] font-black">{formatCurrency(data.impostoBruto)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black uppercase text-muted-foreground/60">Ajustes Aplicados</p>
                  <p className="text-[10px] font-black text-emerald-600">-{formatCurrency(data.ajustes)}</p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* DEMAIS DESCONTOS (PENSÃO) */}
        {data.pensao !== undefined && data.pensao > 0 && (
          <div className="flex justify-between items-center opacity-70">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pensão Alimentícia</span>
            <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(data.pensao)}</span>
          </div>
        )}

        {/* ENCARGOS (FGTS) */}
        {showCharges && (
          <div className="flex justify-between items-center opacity-70">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Depósito FGTS</span>
            <span className="text-sm font-bold text-amber-600 tabular-nums">{formatCurrency(data.fgts)}</span>
          </div>
        )}

        {/* RESULTADO - DESTAQUE TOTAL */}
        <div className="pt-4">
          <div className="bg-primary/[0.04] border-2 border-primary/20 rounded-[2rem] p-6 sm:p-8 flex justify-between items-end shadow-lg shadow-primary/5">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Salário Líquido</span>
              <p className="text-4xl sm:text-5xl font-black tabular-nums tracking-tighter text-primary leading-none">
                {formatCurrency(data.liquido)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
              <Calculator className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}