"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ChevronDown, ChevronUp, CheckCircle2, CreditCard, Plus, Calendar } from "lucide-react";
import { formatCurrency, Veiculo, SeguroVeiculo } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";

interface VehicleInsuranceDetailedCardProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleInsuranceDetailedCard({ veiculo, seguro, onUpdateVeiculo }: VehicleInsuranceDetailedCardProps) {
  const { addSeguroVeiculo, markSeguroParcelPaid, unmarkSeguroParcelPaid } = useFinance();

  const [showAccordion, setShowAccordion] = useState(false);
  const [seguradoraInput, setSeguradoraInput] = useState("");
  const [apoliceInput, setApoliceInput] = useState("");
  const [valorInput, setValorInput] = useState(0);
  const [parcelasInput, setParcelasInput] = useState(1);
  const [inicioInput, setInicioInput] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fimInput, setFimInput] = useState(format(new Date(Date.now() + 365*24*60*60*1000), "yyyy-MM-dd"));

  const handleSaveSeguro = () => {
    if (!seguradoraInput.trim() || valorInput <= 0) {
      toast.error("Informe a seguradora e o valor total.");
      return;
    }

    const nParc = parcelasInput || 1;
    const valParc = valorInput / nParc;
    const parcelas = [];
    const baseDate = parseDateLocal(inicioInput);

    for (let i = 1; i <= nParc; i++) {
      const venc = new Date(baseDate);
      venc.setMonth(venc.getMonth() + (i - 1));
      parcelas.push({
        numero: i,
        vencimento: format(venc, "yyyy-MM-dd"),
        valor: parseFloat(valParc.toFixed(2)),
        paga: false,
      });
    }

    addSeguroVeiculo({
      veiculoId: veiculo.id,
      numeroApolice: apoliceInput,
      seguradora: seguradoraInput,
      vigenciaInicio: inicioInput,
      vigenciaFim: fimInput,
      valorTotal: valorInput,
      numeroParcelas: nParc,
      parcelas,
    });

    onUpdateVeiculo(veiculo.id, { valorSeguro: valorInput, vencimentoSeguro: fimInput });
    toast.success("Apólice de seguro salva com sucesso!");
    setShowAccordion(false);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-6">
      {/* HEADER DO CARD DE SEGURO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-foreground">Gestão Detalhada do Seguro</h3>
            <p className="text-xs text-muted-foreground font-medium">Controle de apólice, vigência de cobertura e quitação de parcelas.</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl font-bold text-xs gap-2"
          onClick={() => setShowAccordion(!showAccordion)}
        >
          {showAccordion ? "Fechar Formulário" : "Nova Apólice / Renovar"}
          {showAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* FORMULÁRIO SANFONA EXPANSÍVEL (ZERO MODAIS) */}
      {showAccordion && (
        <div className="p-6 rounded-3xl bg-muted/20 border border-primary/20 space-y-4 animate-in slide-in-from-top-3 duration-300">
          <h4 className="font-black text-xs uppercase tracking-wider text-primary">Cadastrar Apólice de Seguro</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seguradora</Label>
              <Input placeholder="Ex: Porto Seguro / Azul" value={seguradoraInput} onChange={e => setSeguradoraInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nº Apólice</Label>
              <Input placeholder="Ex: 01.031.942/0" value={apoliceInput} onChange={e => setApoliceInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor Total Prêmio (R$)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={valorInput || ''} onChange={e => setValorInput(Number(e.target.value))} className="h-10 rounded-xl font-bold tabular-nums" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantidade Parcelas</Label>
              <Input type="number" value={parcelasInput} onChange={e => setParcelasInput(Number(e.target.value))} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vigência Início</Label>
              <Input type="date" value={inicioInput} onChange={e => setInicioInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vigência Fim</Label>
              <Input type="date" value={fimInput} onChange={e => setFimInput(e.target.value)} className="h-10 rounded-xl font-bold" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" className="rounded-xl font-black uppercase text-xs px-6 bg-primary text-primary-foreground" onClick={handleSaveSeguro}>
              Salvar Apólice
            </Button>
          </div>
        </div>
      )}

      {/* DADOS DA APÓLICE ATIVA */}
      {seguro ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-card border border-border/50 text-xs">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Seguradora</span>
              <span className="font-black text-sm text-foreground">{seguro.seguradora}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Apólice</span>
              <span className="font-mono font-bold text-xs text-foreground">{seguro.numeroApolice || "S/N"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Prêmio Total</span>
              <span className="font-black text-sm text-foreground tabular-nums">{formatCurrency(seguro.valorTotal)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Vigência Fim</span>
              <span className="font-bold text-xs text-foreground">{seguro.vigenciaFim ? format(parseDateLocal(seguro.vigenciaFim), "dd/MM/yyyy") : "N/I"}</span>
            </div>
          </div>

          {/* PARCELAS DO SEGURO */}
          {seguro.parcelas && seguro.parcelas.length > 0 && (
            <div className="space-y-3">
              <h5 className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Parcelamento do Seguro (Clique para alternar quitação):
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {seguro.parcelas.map(p => (
                  <div
                    key={p.numero}
                    onClick={() => {
                      if (p.paga) {
                        unmarkSeguroParcelPaid(seguro.veiculoId, p.numero);
                        toast.info(`Parcela ${p.numero} desmarcada.`);
                      } else {
                        markSeguroParcelPaid(seguro.veiculoId, p.numero);
                        toast.success(`Parcela ${p.numero} quitada!`);
                      }
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs group hover:scale-[1.02]",
                      p.paga ? "bg-success/10 border-success/30 text-success" : "bg-card border-border/60 hover:border-primary/40 text-foreground"
                    )}
                  >
                    <div>
                      <span className="font-black text-xs block">Parcela {p.numero}</span>
                      <span className="text-[10px] font-medium text-muted-foreground block mt-0.5">
                        {p.vencimento ? format(parseDateLocal(p.vencimento), "dd/MM/yyyy") : "S/D"}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm tabular-nums block">{formatCurrency(p.valor)}</span>
                      <Badge className={cn("border-none text-[8px] font-black uppercase tracking-wider mt-0.5", p.paga ? "bg-success text-white" : "bg-muted text-muted-foreground")}>
                        {p.paga ? "PAGA" : "PENDENTE"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border/60 text-center text-xs text-muted-foreground font-medium">
          Nenhuma apólice de seguro cadastrada no momento. Clique no botão acima para registrar.
        </div>
      )}
    </div>
  );
}
