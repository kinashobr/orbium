"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Veiculo, SeguroVeiculo, formatCurrency } from "@/types/finance";
import { 
  AlertTriangle,
  CalendarRange, 
  Check, 
  Clock, 
  History, 
  Pencil,
  Shield, 
  ShieldAlert,
  Trash2
} from "lucide-react";
import { parseDateLocal, cn } from "@/lib/utils";
import { format, differenceInDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface VehicleInsuranceTimelineProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
}

export function VehicleInsuranceTimeline({ veiculo, seguro }: VehicleInsuranceTimelineProps) {
  const { 
    segurosVeiculo, 
    markSeguroParcelPaid, 
    unmarkSeguroParcelPaid, 
    configurePendingSeguro,
    deleteSeguroVeiculo,
    transacoesV2, 
    billsTracker 
  } = useFinance();

  // Controle de exibição do histórico dinâmico minimalista via ícone de relógio
  const [showHistory, setShowHistory] = useState(false);

  // Controle da tela dinâmica inline de configuração da apólice (sem modal)
  const [showConfigSection, setShowConfigSection] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInitialTx, setDeleteInitialTx] = useState(false);
  const [formSeguradora, setFormSeguradora] = useState("");
  const [formNumeroApolice, setFormNumeroApolice] = useState("");
  const [formVigenciaInicio, setFormVigenciaInicio] = useState("");
  const [formVigenciaFim, setFormVigenciaFim] = useState("");
  const [formValorTotal, setFormValorTotal] = useState("");
  const [formNumeroParcelas, setFormNumeroParcelas] = useState(1);

  // Apólice a considerar (a atual recebida ou a mais recente do veículo caso não esteja ativa)
  const activeOrLastSeguro = useMemo(() => {
    if (seguro) return seguro;
    const vehicleSeguros = segurosVeiculo.filter(s => s.veiculoId === veiculo.id);
    if (vehicleSeguros.length > 0) {
      return vehicleSeguros[vehicleSeguros.length - 1];
    }
    return undefined;
  }, [seguro, segurosVeiculo, veiculo.id]);

  // Histórico salvo de apólices anteriores do veículo
  const historicoSeguros = useMemo(() => {
    return segurosVeiculo
      .filter(s => s.veiculoId === veiculo.id && s.id !== activeOrLastSeguro?.id)
      .sort((a, b) => {
        try {
          return parseDateLocal(b.vigenciaFim).getTime() - parseDateLocal(a.vigenciaFim).getTime();
        } catch {
          return b.id - a.id;
        }
      });
  }, [segurosVeiculo, veiculo.id, activeOrLastSeguro?.id]);

  // Helper para verificar se a parcela do seguro foi paga (estrito, sem matching impreciso)
  const checkIsParcelPaid = useCallback((pNum: number, originalPaidStatus: boolean, txId?: string, seguroRefId?: number): boolean => {
    if (originalPaidStatus) return true;
    if (txId && transacoesV2.some(t => t.id === txId)) return true;

    const targetSeguroId = seguroRefId || activeOrLastSeguro?.id;
    if (!targetSeguroId) return false;

    // Buscar transação no extrato explicitamente vinculada a esta parcela e seguro
    const hasMatchingTx = transacoesV2.some(t => t.links?.vehicleTransactionId === `${targetSeguroId}_${pNum}`);
    if (hasMatchingTx) return true;

    // Buscar no contas a pagar / billsTracker explicitamente vinculado
    const hasMatchingBill = billsTracker.some(b => 
      b.sourceType === "insurance_installment" && 
      b.sourceRef === String(targetSeguroId) && 
      b.parcelaNumber === pNum && 
      b.isPaid
    );

    return hasMatchingBill;
  }, [activeOrLastSeguro?.id, transacoesV2, billsTracker]);

  // Dados do Cronograma de Parcelas
  const timelineData = useMemo(() => {
    if (!activeOrLastSeguro || !activeOrLastSeguro.parcelas || activeOrLastSeguro.parcelas.length === 0) {
      return {
        items: [],
        totalVal: 0,
        totalLiquidado: 0,
        totalRestante: 0,
        isFullyPaid: false,
      };
    }

    const items = activeOrLastSeguro.parcelas.map((p) => {
      let labelMes = `P${String(p.numero).padStart(2, "0")}`;
      let subText = "PENDENTE";
      let isOverdue = false;
      if (p.vencimento) {
        try {
          const dateObj = parseDateLocal(p.vencimento);
          subText = format(dateObj, "MMM/yy", { locale: ptBR }).toUpperCase();
          isOverdue = !p.paga && dateObj.getTime() < new Date().getTime();
        } catch {
          subText = `VENC ${p.numero}`;
        }
      }

      const paga = checkIsParcelPaid(p.numero, p.paga, p.transactionId, activeOrLastSeguro.id);

      return {
        numero: p.numero,
        paga,
        isOverdue,
        valor: p.valor || (activeOrLastSeguro.valorTotal / activeOrLastSeguro.numeroParcelas),
        labelMes,
        subText,
        vencimento: p.vencimento
      };
    });

    const totalVal = activeOrLastSeguro.valorTotal || items.reduce((acc, curr) => acc + curr.valor, 0);
    const totalLiquidado = items.filter(i => i.paga).reduce((acc, curr) => acc + curr.valor, 0);
    const totalRestante = Math.max(0, totalVal - totalLiquidado);
    const isFullyPaid = items.length > 0 && items.every(i => i.paga);

    return {
      items,
      totalVal,
      totalLiquidado,
      totalRestante,
      isFullyPaid
    };
  }, [activeOrLastSeguro, checkIsParcelPaid]);

  // Validação concreta de vigência e status do seguro
  const { 
    vigenciaFimFormatted, 
    isExpiringSoon, 
    isAutoSemSeguro 
  } = useMemo(() => {
    if (!activeOrLastSeguro?.vigenciaFim) {
      return {
        vigenciaFimFormatted: "Não informada",
        isExpiringSoon: false,
        isAutoSemSeguro: !activeOrLastSeguro
      };
    }

    try {
      const fimDate = parseDateLocal(activeOrLastSeguro.vigenciaFim);
      const hoje = new Date();
      const expired = isAfter(hoje, fimDate);
      const remaining = differenceInDays(fimDate, hoje);
      const expiringSoon = !expired && remaining <= 30;

      // Dado concreto: pagou tudo E acabou vigência = automaticamente sem seguro
      const autoSemSeguro = expired && timelineData.isFullyPaid;

      return {
        vigenciaFimFormatted: format(fimDate, "dd/MM/yyyy"),
        isExpiringSoon: expiringSoon,
        isAutoSemSeguro: autoSemSeguro
      };
    } catch {
      return {
        vigenciaFimFormatted: activeOrLastSeguro.vigenciaFim,
        isExpiringSoon: false,
        isAutoSemSeguro: false
      };
    }
  }, [activeOrLastSeguro, timelineData.isFullyPaid]);

  // Sincroniza formulário ao abrir a tela dinâmica de configuração
  useEffect(() => {
    if (showConfigSection && activeOrLastSeguro) {
      setFormSeguradora(activeOrLastSeguro.seguradora === "A definir" ? "" : (activeOrLastSeguro.seguradora || ""));
      setFormNumeroApolice(activeOrLastSeguro.numeroApolice || "");
      setFormVigenciaInicio(activeOrLastSeguro.vigenciaInicio || format(new Date(), "yyyy-MM-dd"));
      setFormVigenciaFim(activeOrLastSeguro.vigenciaFim || "");
      setFormValorTotal(activeOrLastSeguro.valorTotal ? activeOrLastSeguro.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
      setFormNumeroParcelas(activeOrLastSeguro.numeroParcelas || 1);
    }
  }, [showConfigSection, activeOrLastSeguro]);

  const handleSaveConfig = () => {
    if (!activeOrLastSeguro) return;

    const cleanValStr = formValorTotal.replace(/\./g, "").replace(",", ".");
    const parsedVal = parseFloat(cleanValStr) || activeOrLastSeguro.valorTotal;

    if (parsedVal <= 0) {
      toast.error("Informe um valor total válido para o seguro.");
      return;
    }

    const nParc = Math.max(1, formNumeroParcelas);

    let fim = formVigenciaFim;
    if (!fim && formVigenciaInicio) {
      try {
        const baseD = parseDateLocal(formVigenciaInicio);
        baseD.setFullYear(baseD.getFullYear() + 1);
        fim = format(baseD, "yyyy-MM-dd");
      } catch {
        fim = formVigenciaInicio;
      }
    }

    configurePendingSeguro(activeOrLastSeguro.id, {
      seguradora: formSeguradora.trim() || "Seguradora",
      numeroApolice: formNumeroApolice.trim(),
      vigenciaInicio: formVigenciaInicio || activeOrLastSeguro.vigenciaInicio,
      vigenciaFim: fim || activeOrLastSeguro.vigenciaFim,
      valorTotal: parsedVal,
      numeroParcelas: nParc
    });

    toast.success("Seguro configurado com sucesso! O cronograma foi atualizado.");
    setShowConfigSection(false);
  };

  // Handler para alternar quitação de parcela
  const handleToggleParcela = (pNum: number, currentPaid: boolean) => {
    if (!activeOrLastSeguro) return;
    if (currentPaid) {
      unmarkSeguroParcelPaid(activeOrLastSeguro.id, pNum);
      toast.info(`Parcela ${pNum} marcada como pendente.`);
    } else {
      markSeguroParcelPaid(activeOrLastSeguro.id, pNum);
      toast.success(`Parcela ${pNum} quitada com sucesso!`);
    }
  };

  return (
    <div className="flex flex-col p-6 rounded-3xl bg-card border border-border/80 shadow-sm gap-6">
      
      {/* CABEÇALHO ALINHADO EM NÍVEL ÚNICO COM O TÍTULO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CalendarRange className="w-5 h-5" />
          </div>
          <h2 className="font-display font-black text-lg text-foreground leading-none">
            Cronograma de Parcelamento da Apólice
          </h2>
        </div>

        {/* MINICARDS (PRÊMIO, RESTANTE, VIGÊNCIA ATÉ) + HISTÓRICO (APENAS ÍCONE) NO NÍVEL DO TÍTULO */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prêmio */}
          <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Prêmio</span>
            <span className="font-mono text-xs font-black text-foreground">
              {formatCurrency(timelineData.totalVal)}
            </span>
          </div>

          {/* Restante */}
          <div className={cn(
            "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
            timelineData.totalRestante > 0 
              ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
              : "bg-success/10 border-success/20 text-success"
          )}>
            <span className="text-[9px] font-bold uppercase">
              {timelineData.totalRestante > 0 ? "Restante" : "Status"}
            </span>
            <span className="font-mono text-xs font-black">
              {timelineData.totalRestante > 0 ? formatCurrency(timelineData.totalRestante) : "Quitado"}
            </span>
          </div>

          {/* Vigência até */}
          {activeOrLastSeguro && (
            <div className={cn(
              "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
              isAutoSemSeguro 
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : isExpiringSoon 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                  : "bg-success/10 border-success/20 text-success"
            )}>
              <Clock className="w-3 h-3 shrink-0" />
              <span className="text-[9px] font-bold uppercase">
                {isAutoSemSeguro 
                  ? `Vigência Expirada (${vigenciaFimFormatted})` 
                  : `Vigência até ${vigenciaFimFormatted}`}
              </span>
            </div>
          )}

          {/* Histórico (apenas ícone) */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(prev => !prev)}
            className={cn(
              "h-8 w-8 rounded-xl border-border/70 hover:bg-muted transition-all relative shrink-0",
              showHistory && "bg-muted text-primary border-primary/40 shadow-inner"
            )}
            title="Ver histórico salvo de apólices anteriores"
          >
            <History className="w-4 h-4" />
            {historicoSeguros.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-[8px] font-mono font-bold text-primary-foreground flex items-center justify-center">
                {historicoSeguros.length}
              </span>
            )}
          </Button>

          {/* Configurar / Editar Apólice (apenas ícone de lápis) */}
          {activeOrLastSeguro && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowConfigSection(prev => !prev)}
              className={cn(
                "h-8 w-8 rounded-xl border-border/70 hover:bg-muted transition-all relative shrink-0",
                showConfigSection && "bg-muted text-primary border-primary/40 shadow-inner",
                activeOrLastSeguro.status === 'pendente_config' && "border-amber-500 text-amber-600 bg-amber-500/10 shadow-sm animate-pulse"
              )}
              title="Configurar / Editar dados e parcelas da apólice"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* TELA DINÂMICA QUE ABRE PARA BAIXO: RESUMO SIMPLES MINIMALISTA DO HISTÓRICO */}
      {showHistory && (
        <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60 animate-in slide-in-from-top-2 duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                Histórico Salvo de Apólices Anteriores
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {historicoSeguros.length === 0 ? "Nenhum histórico anterior arquivado" : `${historicoSeguros.length} apólice(s) registrada(s)`}
            </span>
          </div>

          {historicoSeguros.length > 0 ? (
            <div className="divide-y divide-border/50">
              {historicoSeguros.map((h) => {
                const dtInicio = h.vigenciaInicio ? format(parseDateLocal(h.vigenciaInicio), "dd/MM/yyyy") : "N/I";
                const dtFim = h.vigenciaFim ? format(parseDateLocal(h.vigenciaFim), "dd/MM/yyyy") : "N/I";
                const pagas = (h.parcelas || []).filter(p => p.paga).length;
                const totalP = h.numeroParcelas || (h.parcelas || []).length;
                const quitada = totalP > 0 && pagas >= totalP;

                return (
                  <div key={h.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">{h.seguradora}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">Apólice #{h.numeroApolice || "S/N"}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          Vigência: {dtInicio} até {dtFim}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-black text-foreground block">{formatCurrency(h.valorTotal)}</span>
                        <span className="text-[10px] text-muted-foreground block">{h.numeroParcelas}x parcelas</span>
                      </div>
                      <Badge className={cn("text-[9px] font-bold uppercase", quitada ? "bg-success/15 text-success border border-success/20" : "bg-muted text-muted-foreground")}>
                        {quitada ? "Quitada & Finalizada" : `${pagas}/${totalP} Pagas`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 text-center font-medium">
              Nenhuma apólice anterior arquivada para este veículo.
            </p>
          )}
        </div>
      )}

      {/* CASO CONCRETO: QUANDO A VIGÊNCIA ACABOU E TUDO FOI PAGO, ESTÁ AUTOMATICAMENTE SEM SEGURO */}
      {isAutoSemSeguro && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs">
          <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-foreground">
            A vigência da apólice finalizou em <strong>{vigenciaFimFormatted}</strong> e todas as parcelas foram liquidadas. O veículo está atualmente <strong>sem seguro ativo</strong>.
          </span>
        </div>
      )}

      {/* BANNER DE AVISO DE PENDÊNCIA COM BOTÃO DE CONFIGURAÇÃO/EDIÇÃO */}
      {activeOrLastSeguro?.status === 'pendente_config' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm">Configuração de Seguro Pendente</div>
              <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Lançamento financeiro de {formatCurrency(timelineData.totalLiquidado || activeOrLastSeguro.valorTotal)} registrado. Complete a seguradora, vigência e parcelas para atualizar o cronograma.
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowConfigSection(prev => !prev)}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm shrink-0 gap-1.5 self-start sm:self-auto"
          >
            <Pencil className="w-3.5 h-3.5" />
            {showConfigSection ? "Ocultar Painel" : "Configurar Seguro"}
          </Button>
        </div>
      )}

      {/* TELA DINÂMICA QUE ABRE PARA BAIXO: CONFIGURAÇÃO / EDIÇÃO DA APÓLICE (SEM MODAL) */}
      {showConfigSection && activeOrLastSeguro && (
        <div className="p-5 sm:p-6 rounded-2xl bg-muted/25 border border-border/70 animate-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-black text-sm text-foreground">
                  Configurar Apólice de Seguro
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Defina os dados da apólice e o número de parcelas para atualizar o cronograma dinamicamente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Seguradora
              </Label>
              <Input 
                placeholder="Ex: Porto Seguro, Azul, Tokio Marine, Bradesco..."
                value={formSeguradora}
                onChange={(e) => setFormSeguradora(e.target.value)}
                className="h-10 rounded-xl text-sm font-bold bg-background border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Número da Apólice
              </Label>
              <Input 
                placeholder="Ex: 531.002.99"
                value={formNumeroApolice}
                onChange={(e) => setFormNumeroApolice(e.target.value)}
                className="h-10 rounded-xl text-sm font-bold bg-background border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Qtd. de Parcelas
              </Label>
              <Input 
                type="number"
                min={1}
                max={12}
                value={formNumeroParcelas}
                onChange={(e) => setFormNumeroParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 rounded-xl text-sm font-bold bg-background border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Início da Vigência
              </Label>
              <Input 
                type="date"
                value={formVigenciaInicio}
                onChange={(e) => setFormVigenciaInicio(e.target.value)}
                className="h-10 rounded-xl text-sm font-bold bg-background border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Fim da Vigência
              </Label>
              <Input 
                type="date"
                value={formVigenciaFim}
                onChange={(e) => setFormVigenciaFim(e.target.value)}
                className="h-10 rounded-xl text-sm font-bold bg-background border-border/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Valor Total do Seguro (Prêmio)
              </Label>
              <Input 
                placeholder="0,00"
                value={formValorTotal}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  if (!digits) {
                    setFormValorTotal("0,00");
                    return;
                  }
                  const val = parseInt(digits) / 100;
                  setFormValorTotal(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }}
                className="h-10 rounded-xl text-sm font-black font-mono bg-background border-border/70"
              />
            </div>
          </div>

          {/* Bloco de Confirmação de Exclusão / Cancelamento */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-xs space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 text-destructive font-black uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Confirmar cancelamento e exclusão do seguro</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Ao confirmar, a apólice será cancelada no veículo e as parcelas futuras pendentes serão excluídas do Contas a Pagar. O histórico de pagamentos passados é preservado.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-foreground font-bold pt-1">
                <input 
                  type="checkbox" 
                  checked={deleteInitialTx} 
                  onChange={(e) => setDeleteInitialTx(e.target.checked)}
                  className="rounded border-border text-destructive focus:ring-destructive w-4 h-4 accent-destructive"
                />
                <span>Excluir também a transação financeira de lançamento no extrato bancário</span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl font-bold h-8 text-xs"
                >
                  Voltar
                </Button>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteSeguroVeiculo(activeOrLastSeguro.id, deleteInitialTx);
                    setShowConfigSection(false);
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-xl font-bold h-8 text-xs gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          )}

          {/* Resumo dinâmico dos valores e ações */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">1ª Parcela (Lançada / Liquidada):</span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(activeOrLastSeguro?.parcelas?.[0]?.valor || 0)}
              </span>
            </div>
            {formNumeroParcelas > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Demais parcelas ({formNumeroParcelas - 1}x automáticas):</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(
                    Math.max(
                      0, 
                      ((parseFloat(formValorTotal.replace(/\./g, "").replace(",", ".")) || activeOrLastSeguro?.valorTotal || 0) - (activeOrLastSeguro?.parcelas?.[0]?.valor || 0)) / (formNumeroParcelas - 1)
                    )
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {!showDeleteConfirm && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl font-bold h-9 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir / Cancelar Seguro
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowConfigSection(false);
                  setShowDeleteConfirm(false);
                }}
                className="rounded-xl font-bold h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSaveConfig}
                className="rounded-xl font-bold h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                Salvar Configuração
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENTED INTERACTIVE STEP RIBBON: TODAS AS PARCELAS EM UMA ÚNICA LINHA */}
      {timelineData.items.length > 0 ? (
        <div className="w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted">
          <div 
            className="grid gap-2 sm:gap-2.5 items-stretch min-w-[760px] lg:min-w-full"
            style={{
              gridTemplateColumns: `repeat(${timelineData.items.length}, minmax(0, 1fr))`
            }}
          >
            {timelineData.items.map((item) => (
              <div
                key={item.numero}
                onClick={() => handleToggleParcela(item.numero, item.paga)}
                className={cn(
                  "group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none text-center h-full",
                  item.paga 
                    ? "bg-success/5 hover:bg-success/10 border-success/30 text-success" :
                  item.isOverdue 
                    ? "bg-destructive/5 hover:bg-destructive/10 border-destructive/30 text-destructive" :
                    "bg-card hover:bg-muted/50 border-border/60 hover:border-primary/40 text-foreground"
                )}
              >
                <div className={cn(
                  "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-sm mb-1.5 transition-transform group-hover:scale-110 shrink-0",
                  item.paga ? "bg-success text-white" :
                  item.isOverdue ? "bg-destructive text-white" :
                  "bg-amber-500 text-white"
                )}>
                  {item.paga ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Clock className="w-3.5 h-3.5" />}
                </div>

                <span className="font-mono text-xs font-black text-foreground">{item.labelMes}</span>
                <span className={cn(
                  "font-mono text-[11px] sm:text-xs font-black mt-0.5 tracking-tighter whitespace-nowrap",
                  item.paga ? "text-success" : "text-foreground"
                )}>
                  {formatCurrency(item.valor)}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase whitespace-nowrap">
                  {item.subText}
                </span>

                <Badge className={cn(
                  "border-none text-[8px] font-black uppercase tracking-wider mt-1.5 px-1.5 py-0.5 whitespace-nowrap",
                  item.paga ? "bg-success/20 text-success" :
                  item.isOverdue ? "bg-destructive/20 text-destructive" :
                  "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                  {item.paga ? "Paga" : item.isOverdue ? "Vencida" : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-muted/15 border border-dashed border-border/70 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm text-foreground">Veículo sem parcelamento de seguro cadastrado</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-0.5">
              Nenhuma apólice ou parcelamento registrado para este veículo.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
