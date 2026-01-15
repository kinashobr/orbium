"use client";

import { cn } from "@/lib/utils";
import { formatCurrency, ContaCorrente, AccountType, ACCOUNT_TYPE_LABELS } from "@/types/finance";
import { Building2, Car, Shield, CreditCard, Banknote, History, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AccountItem {
  id: string;
  name: string;
  accountType: AccountType;
  saldo: number;
}

interface BalanceSheetListProps {
  title: string;
  totalValue: number;
  items: {
    label: string;
    value: number;
    percent: number;
    type: 'circulante' | 'nao_circulante' | 'patrimonio';
    details?: {
      id: string;
      name: string;
      typeLabel: string;
      value: number;
      percent: number;
      icon: React.ElementType;
    }[];
  }[];
  isAsset: boolean;
  plValue?: number;
}

const getIconForType = (type: string): React.ElementType => {
    switch (type) {
        case 'corrente':
        case 'poupanca':
        case 'reserva':
            return Building2;
        case 'renda_fixa':
        case 'cripto':
        case 'objetivo':
            return Shield;
        case 'imobilizado':
            return Car;
        case 'seguros_apropriar':
            return Shield;
        case 'cartoes':
            return CreditCard;
        case 'emprestimos_curto':
            return Banknote;
        case 'emprestimos_longo':
            return History;
        case 'seguros_pagar':
            return Shield;
        default:
            return Scale;
    }
};

export function BalanceSheetList({ title, totalValue, items, isAsset, plValue }: BalanceSheetListProps) {
  const totalPassivo = items.filter(i => i.type !== 'patrimonio').reduce((acc, i) => acc + i.value, 0);
  const totalPassivoPL = totalValue; // No lado do passivo, o total é Passivo + PL

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-2xl", isAsset ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {isAsset ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-display font-black text-2xl uppercase tracking-tight">{title}</h3>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest", isAsset ? "text-success/60" : "text-destructive/60")}>
              {isAsset ? "Bens e direitos" : "Obrigações e capital próprio"}
            </p>
          </div>
        </div>
        <p className={cn("text-3xl font-black tracking-tighter tabular-nums", isAsset ? "text-success" : "text-destructive")}>
          {formatCurrency(totalValue)}
        </p>
      </div>

      <div className="glass-card p-0"> {/* Aplicando glass-card e removendo padding interno */}
        <div className="rounded-2xl overflow-hidden">
          <table className="w-full table-auto">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground p-3 w-1/2">Conta</th>
                <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground p-3 w-1/4">Valor</th>
                <th className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground p-3 w-1/4">%</th>
              </tr>
            </thead>
            <tbody>
              {items.map((section, index) => (
                <React.Fragment key={index}>
                  <tr className={cn(
                    "border-t border-border/40",
                    section.type === 'circulante' ? "bg-muted/20" : section.type === 'nao_circulante' ? "bg-muted/10" : "bg-transparent"
                  )}>
                    <td colSpan={3} className="p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {section.type === 'circulante' ? (isAsset ? 'ATIVO CIRCULANTE (Alta Liquidez)' : 'PASSIVO CIRCULANTE (Curto Prazo)') :
                         section.type === 'nao_circulante' ? (isAsset ? 'ATIVO NÃO CIRCULANTE (Longo Prazo / Imobilizado)' : 'PASSIVO NÃO CIRCULANTE (Longo Prazo)') :
                         'PATRIMÔNIO LÍQUIDO'}
                      </p>
                    </td>
                  </tr>
                  
                  {section.details?.map((detail, dIndex) => (
                    <tr key={dIndex} className="border-b border-border/20 last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground">
                            <detail.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{detail.name}</p>
                            <p className="text-[10px] text-muted-foreground">{detail.typeLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right text-sm font-bold tabular-nums">{formatCurrency(detail.value)}</td>
                      <td className="text-right text-sm font-bold tabular-nums text-muted-foreground">{isNaN(detail.percent) || !isFinite(detail.percent) ? "0.0" : detail.percent.toFixed(1)}%</td>
                    </tr>
                  ))}

                  {/* Subtotal */}
                  <tr className={cn(
                    "font-black",
                    section.type === 'patrimonio' ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground"
                  )}>
                    <td className="p-3 text-sm uppercase tracking-tight">{section.type === 'patrimonio' ? 'Capital Próprio (Ativos - Passivos)' : `Subtotal ${section.type === 'circulante' ? 'Circulante' : 'Longo Prazo'}`}</td>
                    <td className="text-right p-3 text-sm tabular-nums">{formatCurrency(section.value)}</td>
                    <td className="text-right p-3 text-sm tabular-nums">{isNaN(section.percent) || !isFinite(section.percent) ? "0.0" : section.percent.toFixed(1)}%</td>
                  </tr>
                </React.Fragment>
              ))}
              
              {/* Total Geral */}
              <tr className={cn(
                "font-black text-base",
                isAsset ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              )}>
                <td className="p-3 uppercase tracking-tight">{isAsset ? 'TOTAL DO ATIVO' : 'TOTAL DO PASSIVO'}</td>
                <td className="text-right p-3 tabular-nums">{formatCurrency(totalPassivo)}</td>
                <td className="text-right p-3 tabular-nums">{totalPassivoPL > 0 ? ((totalPassivo / totalPassivoPL) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
              
              {/* Total Passivo + PL (Apenas no lado do Passivo) */}
              {!isAsset && plValue !== undefined && (
                <tr className="font-black text-base bg-primary/20 text-primary">
                  <td className="p-3 uppercase tracking-tight">TOTAL PASSIVO + PL</td>
                  <td className="text-right p-3 tabular-nums">{formatCurrency(totalPassivoPL)}</td>
                  <td className="text-right p-3 tabular-nums">100.0%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React from 'react';