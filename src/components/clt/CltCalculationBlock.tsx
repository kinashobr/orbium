"use client";

import React from 'react';
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface CltCalculationBlockProps {
  data: {
    bruto: number;
    inss: number;
    baseIR: number;
    impostoBruto: number;
    ajustes: number; // Redutor / Parcela a deduzir
    irrfFinal: number;
    liquido: number;
    fgts: number;
    dependentes?: number;
    pensao?: number;
  };
  showCharges?: boolean;
}

export function CltCalculationBlock({ data, showCharges = true }: CltCalculationBlockProps) {
  return (
    <div className="bg-card border-2 border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-6 sm:p-8 space-y-6">
        
        {/* 1. ENTRADAS */}
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">1. Entradas</p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">Salário Bruto</span>
            <span className="text-lg font-black tabular-nums">{formatCurrency(data.bruto)}</span>
          </div>
          {(data.dependentes !== undefined || data.pensao !== undefined) && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex justify-between items-center opacity-60">
                <span className="text-[11px] font-bold">Dependentes</span>
                <span className="text-[11px] font-black">{data.dependentes || 0}</span>
              </div>
              <div className="flex justify-between items-center opacity-60">
                <span className="text-[11px] font-bold">Pensão</span>
                <span className="text-[11px] font-black">{formatCurrency(data.pensao || 0)}</span>
              </div>
            </div>
          )}
        </section>

        <Separator className="opacity-40" />

        {/* 2. DESCONTOS */}
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">2. Descontos</p>
          <div className="flex justify-between items-center text-destructive">
            <span className="text-sm font-bold">INSS Retido</span>
            <span className="text-sm font-black tabular-nums">-{formatCurrency(data.inss)}</span>
          </div>
        </section>

        <Separator className="opacity-40" />

        {/* 3. BASE DE CÁLCULO */}
        <section className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">3. Base de Cálculo do IRRF</p>
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-primary">Valor Base</span>
              <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none opacity-60">Salário Bruto – INSS – Dependentes – Pensão</p>
            </div>
            <span className="text-lg font-black tabular-nums text-primary">{formatCurrency(data.baseIR)}</span>
          </div>
        </section>

        <Separator className="opacity-40" />

        {/* 4 & 5. CÁLCULO E AJUSTES */}
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">4. IRRF Calculado</p>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-muted-foreground italic">Aplicação da tabela progressiva</span>
              <span className="text-sm font-black tabular-nums">{formatCurrency(data.impostoBruto)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">5. Ajustes Aplicados</p>
            <div className="flex justify-between items-center text-emerald-600">
              <span className="text-[11px] font-bold">Parcela a Deduzir / Desconto Simplificado</span>
              <span className="text-sm font-black tabular-nums">-{formatCurrency(data.ajustes)}</span>
            </div>
          </div>
        </section>

        {/* 6. RESULTADO (DESTAQUE) */}
        <section className="bg-primary/[0.03] border-2 border-primary/20 rounded-3xl p-6 mt-4 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-60">6. Resultado</p>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-destructive">IRRF Devido</span>
            <span className="text-base font-black text-destructive tabular-nums">{formatCurrency(data.irrfFinal)}</span>
          </div>
          <Separator className="bg-primary/10" />
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-[0.1em] text-primary">Salário Líquido</span>
              <p className="text-4xl font-black tabular-nums text-primary leading-none tracking-tighter">
                {formatCurrency(data.liquido)}
              </p>
            </div>
          </div>
        </section>

        {/* 7. ENCARGOS */}
        {showCharges && (
          <section className="pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mb-3">7. Encargos</p>
            <div className="flex justify-between items-center opacity-80">
              <span className="text-[11px] font-bold">FGTS (Depositado pela Empresa)</span>
              <span className="text-sm font-black text-amber-600 tabular-nums">{formatCurrency(data.fgts)}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}