import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/types/finance';
import { calcularRescisao } from '@/lib/cltCalc';
import { 
  VinculoCLT, 
  EventoRescisao, 
  RescisaoTipo, 
  AvisoPrevioTipo,
  FeriasStatus,
  RegimeFGTS
} from '@/types/clt';

import { 
  ShieldAlert,
  Calculator,
  ChevronDown,
  FileSpreadsheet,
  Info,
  CalendarDays,
  Coins,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useFinance } from '@/contexts/FinanceContext';
import { differenceInMonths, parseISO } from 'date-fns';

interface Props {
  contractId: string;
  salarioBase: number;
  dependentes: number;
  dataAdmissao: string;
  mediaVariaveis?: number;
}

const TIPO_LABELS: Record<RescisaoTipo, string> = {
  [RescisaoTipo.SEM_JUSTA_CAUSA]: 'Sem Justa Causa',
  [RescisaoTipo.PEDIDO_DEMISSAO]: 'Pedido de Demissão',
  [RescisaoTipo.JUSTA_CAUSA]: 'Justa Causa',
  [RescisaoTipo.ACORDO_MUTUO_484A]: 'Acordo Mútuo (Art. 484-A)',
  [RescisaoTipo.RESCISAO_INDIRETA]: 'Rescisão Indireta',
  [RescisaoTipo.TERMINO_CONTRATO_EXPERIENCIA]: 'Término de Experiência',
  [RescisaoTipo.APOSENTADORIA]: 'Aposentadoria',
  [RescisaoTipo.MORTE]: 'Morte'
};

export function CltResignationTab({ contractId, salarioBase, dependentes, dataAdmissao, mediaVariaveis = 0 }: Props) {
  const { eventosFerias } = useFinance();
  const [tipoRescisao, setTipoRescisao] = useState<RescisaoTipo>(RescisaoTipo.SEM_JUSTA_CAUSA);
  const [saldoFgts, setSaldoFgts] = useState<number>(0);
  const [dataDesligamento, setDataDesligamento] = useState<string>(new Date().toISOString().split('T')[0]);

  const vinculo = useMemo<VinculoCLT>(() => ({
    id: contractId,
    nome_descritivo: '',
    data_admissao: dataAdmissao,
    data_desligamento: null,
    ativo: true,
    salario_base_atual: salarioBase,
    regime_fgts: RegimeFGTS.SAQUE_RESCISAO
  }), [contractId, dataAdmissao, salarioBase]);

  // Compute completed years and proportional months
  const serviceStats = useMemo(() => {
    const admissao = parseISO(dataAdmissao);
    const desligamento = parseISO(dataDesligamento);
    const diffMeses = Math.max(0, differenceInMonths(desligamento, admissao));
    const anos = Math.floor(diffMeses / 12);
    const meses = diffMeses % 12;
    return { anos, meses, totalMeses: diffMeses };
  }, [dataAdmissao, dataDesligamento]);

  const calculo = useMemo(() => {
    const evento: EventoRescisao = {
      id: 'simulacao',
      vinculo_id: contractId,
      tipo_rescisao: tipoRescisao,
      data_aviso: dataDesligamento,
      data_desligamento: dataDesligamento,
      aviso_previo: AvisoPrevioTipo.INDENIZADO,
      saldo_fgts_informado: saldoFgts,
      detalhamento_verbas: {},
      total_liquido_estimado: 0,
      multa_fgts_aplicada: 0,
      tem_direito_seguro_desemprego: false
    };
    return calcularRescisao(vinculo, evento, mediaVariaveis, dependentes);
  }, [vinculo, contractId, tipoRescisao, saldoFgts, dataDesligamento, mediaVariaveis, dependentes]);

  // Map Brazilian technical labels for each verba
  const verbaLabels: Record<string, string> = {
    saldoSalario: 'Saldo de Salário Proporcional',
    decimoTerceiroProporcional: '13º Salário Proporcional',
    feriasProporcionais: 'Férias Proporcionais',
    tercoFeriasProporcionais: '1/3 Constitucional de Férias',
    avisoPrevioIndenizado: 'Aviso Prévio Indenizado Reajustado',
    descontoAvisoPrevio: 'Aviso Prévio Indenizado Descontado',
    multaFgts: 'Multa Rescisória de FGTS',
    saqueFgtsPermitido: 'Saque de FGTS Liberado (80%)',
    inss: 'Contribuição Previdenciária (INSS)',
    irrf: 'Imposto de Renda Retido na Fonte (IRRF)'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. INPUT PARAMETERS TOP BAR */}
      <Card className="rounded-[2rem] border border-border/40 p-6 bg-card shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Motivo do Desligamento</Label>
            <select 
              value={tipoRescisao} 
              onChange={e => setTipoRescisao(e.target.value as RescisaoTipo)}
              className="w-full h-11 rounded-xl bg-muted/30 border border-border/10 px-3.5 font-bold text-xs outline-none text-foreground focus:ring-1 focus:ring-primary/45 transition-all"
            >
              {Object.entries(TIPO_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="bg-card text-foreground">{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Saldo Acumulado do FGTS (R$)</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50">R$</span>
              <Input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={saldoFgts || ''} 
                onChange={e => setSaldoFgts(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-11 rounded-xl bg-muted/30 border border-border/10 pl-9 font-black text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Data Estimada de Desligamento</Label>
            <Input 
              type="date" 
              value={dataDesligamento} 
              onChange={e => setDataDesligamento(e.target.value)}
              className="h-11 rounded-xl bg-muted/30 border border-border/10 font-bold text-xs"
            />
          </div>
        </div>
      </Card>

      {/* 2. CONSOLIDATED STATEMENT (DEMONSTRATIVO FINANCEIRO DE RESCISÃO) */}
      <Card className="rounded-[2.5rem] border border-border/40 overflow-hidden shadow-soft bg-card">
        
        {/* Paycheck Header */}
        <CardHeader className="bg-muted/15 border-b border-border/30 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black tracking-tight uppercase">Demonstrativo de Rescisão de Contrato</CardTitle>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary" /> Tempo de Serviço: {serviceStats.anos} {serviceStats.anos === 1 ? 'ano' : 'anos'} e {serviceStats.meses} {serviceStats.meses === 1 ? 'mês' : 'meses'} ({serviceStats.totalMeses} meses totais)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest bg-muted/40 px-3 py-1 rounded-full border border-border/20 leading-none">
              Simulação CLT 2026
            </span>
          </div>
        </CardHeader>

        {/* Financial line items Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-muted/20 border-b border-border/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground/80">
                  <th className="px-6 py-3.5 w-16 text-center">Ref</th>
                  <th className="px-6 py-3.5">Descrição da Verba Rescisória</th>
                  <th className="px-6 py-3.5 text-right w-36">Base de Cálculo</th>
                  <th className="px-6 py-3.5 text-right w-36 text-emerald-600">Proventos (+)</th>
                  <th className="px-6 py-3.5 text-right w-36 text-destructive">Descontos (-)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {/* Standard reference lines */}
                {Object.entries(calculo.detalhamento_verbas || {}).map(([verba, valor], idx) => {
                  const isDesconto = valor < 0;
                  const absValor = Math.abs(valor);
                  if (absValor < 0.01) return null;

                  // Determine base calculation labels
                  let baseCalculoStr = formatCurrency(salarioBase);
                  if (verba.includes('decimoTerceiro')) {
                    baseCalculoStr = `${formatCurrency(salarioBase + mediaVariaveis)} / 12`;
                  } else if (verba.includes('feriasProporcionais')) {
                    baseCalculoStr = `${formatCurrency(salarioBase + mediaVariaveis)} / 12`;
                  } else if (verba.includes('terco')) {
                    baseCalculoStr = `1/3 de Férias`;
                  } else if (verba.includes('multaFgts')) {
                    baseCalculoStr = `${formatCurrency(saldoFgts)} x 40%`;
                  } else if (verba.includes('saqueFgts')) {
                    baseCalculoStr = `${formatCurrency(saldoFgts)} x 80%`;
                  } else if (verba === 'inss' || verba === 'irrf') {
                    baseCalculoStr = 'Tributo Prog.';
                  }

                  return (
                    <tr key={verba} className="hover:bg-muted/[0.01] transition-colors text-xs font-semibold">
                      <td className="px-6 py-4 text-center font-mono text-[10px] text-muted-foreground">{String(100 + idx)}</td>
                      <td className="px-6 py-4 text-foreground font-bold">{verbaLabels[verba] || verba}</td>
                      <td className="px-6 py-4 text-right font-mono text-[11px] text-muted-foreground">{baseCalculoStr}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">
                        {!isDesconto ? formatCurrency(absValor) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-destructive font-bold">
                        {isDesconto ? formatCurrency(absValor) : '-'}
                      </td>
                    </tr>
                  );
                })}

                {/* Relatório FGTS / Multa Summary line if applicable */}
                {saldoFgts > 0 && (
                  <tr className="bg-muted/5 font-semibold text-xs border-t border-dashed">
                    <td className="px-6 py-3.5 text-center font-mono text-[10px] text-muted-foreground">FGTS</td>
                    <td className="px-6 py-3.5 text-foreground font-bold">Resumo Fundo de Garantia (FGTS)</td>
                    <td className="px-6 py-3.5 text-right font-mono text-[11px] text-muted-foreground">Saldo Base: {formatCurrency(saldoFgts)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-emerald-600 font-bold">
                      {calculo.multa_fgts_aplicada > 0 ? formatCurrency(calculo.multa_fgts_aplicada) : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right text-muted-foreground/60">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Statement Bottom Summary Banner (Aesthetic Holerite Design) */}
          <div className="bg-muted/15 border-t border-border/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Metodologia de Liquidação</span>
              <p className="text-[11px] text-muted-foreground max-w-md leading-relaxed font-semibold">
                O valor abaixo representa a estimativa líquida a ser paga em conta bancária pelo empregador, já deduzidos INSS e IRRF progressivos sob verbas de caráter salarial.
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4 flex flex-col items-center sm:items-end shrink-0 shadow-sm">
              <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1.5">Saldo Líquido Rescisório</span>
              <p className="text-3xl font-mono font-black text-primary tracking-tighter leading-none">
                {formatCurrency(calculo.total_liquido_estimado)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. ELEGIBILITY & SOCIAL RIGHTS ADVISORY PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seguro desemprego panel */}
        <div className={cn(
          "border rounded-3xl p-5 flex items-start gap-4 shadow-sm transition-all",
          calculo.tem_direito_seguro_desemprego 
            ? "bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-700" 
            : "bg-muted/10 border-border/30 text-muted-foreground"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
            calculo.tem_direito_seguro_desemprego 
              ? "bg-emerald-500/10 border-emerald-500/10 text-emerald-600" 
              : "bg-muted/20 border-border/10 text-muted-foreground/60"
          )}>
            {calculo.tem_direito_seguro_desemprego ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="space-y-1.5 text-xs">
            <span className="text-[9px] font-black uppercase tracking-widest block text-muted-foreground">Seguro-Desemprego</span>
            <p className="font-bold text-foreground">
              {calculo.tem_direito_seguro_desemprego 
                ? "Elegibilidade Ativa" 
                : "Não Elegível"}
            </p>
            <p className="text-muted-foreground leading-relaxed text-[10px] font-semibold">
              {calculo.tem_direito_seguro_desemprego 
                ? "Nesta modalidade de rescisão assistida, você tem direito a requerer o benefício do seguro-desemprego nacional." 
                : "Demissões por justa causa ou pedidos voluntários não contemplam o saque do seguro-desemprego corporativo."}
            </p>
          </div>
        </div>

        {/* FGTS Saque panel */}
        <div className="bg-muted/10 border border-border/30 rounded-3xl p-5 flex items-start gap-4 shadow-sm text-muted-foreground">
          <div className="w-10 h-10 rounded-2xl bg-muted/20 border border-border/10 text-muted-foreground/60 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 text-xs">
            <span className="text-[9px] font-black uppercase tracking-widest block text-muted-foreground">Saque de Fundo de Garantia (FGTS)</span>
            <p className="font-bold text-foreground">
              {tipoRescisao === RescisaoTipo.SEM_JUSTA_CAUSA || tipoRescisao === RescisaoTipo.RESCISAO_INDIRETA || tipoRescisao === RescisaoTipo.ACORDO_MUTUO_484A
                ? "Saque Integral / Multa Liberados" 
                : "Fundo Retido"}
            </p>
            <p className="text-muted-foreground leading-relaxed text-[10px] font-semibold">
              {tipoRescisao === RescisaoTipo.SEM_JUSTA_CAUSA || tipoRescisao === RescisaoTipo.RESCISAO_INDIRETA
                ? `Você está apto a sacar 100% do saldo do FGTS acumulado, mais a multa rescisória de 40% (${formatCurrency(calculo.multa_fgts_aplicada)}).`
                : tipoRescisao === RescisaoTipo.ACORDO_MUTUO_484A
                ? `Em acordo mútuo, o saque do FGTS é limitado a 80%, e a multa rescisória é de 20% (${formatCurrency(calculo.multa_fgts_aplicada)}).`
                : "O saldo de FGTS permanece retido no fundo em casos de demissão por justa causa ou pedido voluntário de demissão."}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
