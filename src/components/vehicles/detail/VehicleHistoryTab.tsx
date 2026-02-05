"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import {
  Categoria,
  TransacaoCompleta,
  Veiculo,
  VehicleHistoryItem,
  VehicleHistoryType,
  formatCurrency,
} from "@/types/finance";
import { format, isValid, parseISO } from "date-fns";
import { ArrowLeft, DollarSign, FileText, History, RefreshCw, Tags, Wrench } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type HistoryFilter = VehicleHistoryType | "all";

function parseHistoryDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const d = value.includes("T") ? parseISO(value) : parseDateLocal(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function generateHistoryId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function categoryLabelById(categories: Categoria[], id: string | null) {
  if (!id) return null;
  return categories.find((c) => c.id === id)?.label ?? null;
}

export function VehicleHistoryTab({
  veiculo,
  onUpdateVeiculo,
}: {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}) {
  const { categoriasV2, transacoesV2 } = useFinance();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [openCategories, setOpenCategories] = useState(false);
  const [openMaintenance, setOpenMaintenance] = useState(false);

  // --- despesas: categorias selecionadas ---
  const selectedCategoryIds = veiculo.categoriasDespesasIds || [];

  const categoriesSorted = useMemo(() => {
    return [...categoriasV2]
      .filter((c) => c.nature !== "receita")
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoriasV2]);

  const selectedTxToImport = useMemo(() => {
    if (selectedCategoryIds.length === 0) return [];
    const categoryIdSet = new Set(selectedCategoryIds);

    // Dedupe: não re-importar transações já presentes no histórico
    const alreadyImportedTxIds = new Set(
      (veiculo.historico || [])
        .map((h) => (h.meta as any)?.transactionId)
        .filter((x): x is string => typeof x === "string" && x.length > 0),
    );

    return transacoesV2
      .filter((t) => t.flow === "out")
      .filter((t) => !!t.categoryId && categoryIdSet.has(t.categoryId))
      .filter((t) => !alreadyImportedTxIds.has(t.id))
      .sort((a, b) => {
        const da = parseHistoryDate(a.date)?.getTime() ?? 0;
        const db = parseHistoryDate(b.date)?.getTime() ?? 0;
        return db - da;
      });
  }, [selectedCategoryIds, transacoesV2, veiculo.historico]);

  const handleToggleCategory = (categoryId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selectedCategoryIds, categoryId]))
      : selectedCategoryIds.filter((id) => id !== categoryId);
    onUpdateVeiculo(veiculo.id, { categoriasDespesasIds: next });
  };

  const handleImportExpenses = () => {
    if (selectedCategoryIds.length === 0) return;

    const toHistory = (tx: TransacaoCompleta): VehicleHistoryItem => {
      const catLabel = categoryLabelById(categoriasV2, tx.categoryId);
      return {
        id: generateHistoryId("vh_exp"),
        type: "despesa",
        date: tx.date, // YYYY-MM-DD (aceito pelo parser)
        title: catLabel ? `Despesa • ${catLabel}` : "Despesa",
        description: tx.description,
        amount: tx.amount,
        meta: {
          transactionId: tx.id,
          categoryId: tx.categoryId,
          accountId: tx.accountId,
        },
      };
    };

    const imported = selectedTxToImport.map(toHistory);
    const historico = [...(veiculo.historico || []), ...imported];
    onUpdateVeiculo(veiculo.id, { historico });
  };

  // --- manutenção manual (form simples) ---
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceService, setMaintenanceService] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [maintenancePlace, setMaintenancePlace] = useState("");

  const canSaveMaintenance =
    !!maintenanceService.trim() &&
    !!maintenanceDate.trim() &&
    (() => {
      try {
        const d = parseDateLocal(maintenanceDate);
        return isValid(d);
      } catch {
        return false;
      }
    })();

  const handleSaveMaintenance = () => {
    if (!canSaveMaintenance) return;

    const costNumber = Number(
      maintenanceCost
        .trim()
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^0-9.]/g, ""),
    );

    const item: VehicleHistoryItem = {
      id: generateHistoryId("vh_maint"),
      type: "manutencao",
      date: maintenanceDate, // YYYY-MM-DD
      title: `Manutenção • ${maintenanceService.trim()}`,
      description: [maintenancePlace.trim() ? `Local: ${maintenancePlace.trim()}` : null]
        .filter(Boolean)
        .join(" • "),
      amount: Number.isFinite(costNumber) && costNumber > 0 ? costNumber : undefined,
      meta: {
        service: maintenanceService.trim(),
        place: maintenancePlace.trim() || undefined,
      },
    };

    const historico = [...(veiculo.historico || []), item];
    onUpdateVeiculo(veiculo.id, { historico });

    setOpenMaintenance(false);
    setMaintenanceDate("");
    setMaintenanceService("");
    setMaintenanceCost("");
    setMaintenancePlace("");
  };

  const filteredHistory = useMemo(() => {
    const base = [...(veiculo.historico || [])];
    const byType = filter === "all" ? base : base.filter((h) => h.type === filter);
    return byType
      .sort((a, b) => {
        const da = parseHistoryDate(a.date)?.getTime() ?? 0;
        const db = parseHistoryDate(b.date)?.getTime() ?? 0;
        return db - da;
      })
      .map((h) => {
        const Icon = h.type === "fipe" ? RefreshCw : h.type === "despesa" ? DollarSign : Wrench;
        const d = parseHistoryDate(h.date);
        return { ...h, Icon, _date: d };
      });
  }, [filter, veiculo.historico]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timeline do Bem</p>
          <p className="text-xs text-muted-foreground">FIPE • Despesas • Manutenções</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/40 border-none">
            {filteredHistory.length} evento(s)
          </Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenCategories(true)}
            className="rounded-full h-10 px-4 font-black text-[10px] uppercase tracking-widest"
          >
            <Tags className="h-4 w-4" />
            Categorias
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImportExpenses}
            disabled={selectedCategoryIds.length === 0 || selectedTxToImport.length === 0}
            className="rounded-full h-10 px-4 font-black text-[10px] uppercase tracking-widest"
            title={
              selectedCategoryIds.length === 0
                ? "Selecione categorias para importar"
                : selectedTxToImport.length === 0
                  ? "Nada novo para importar"
                  : "Importar despesas"
            }
          >
            Importar ({selectedTxToImport.length})
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenMaintenance(true)}
            className="rounded-full h-10 px-4 font-black text-[10px] uppercase tracking-widest"
          >
            <Wrench className="h-4 w-4" />
            Manutenção
          </Button>
        </div>
      </div>

      <Separator className="opacity-40" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtrar</p>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => setFilter((v as HistoryFilter) || "all")}
          className="justify-start sm:justify-end"
        >
          <ToggleGroupItem value="all" aria-label="Mostrar todos">
            <History className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="fipe" aria-label="Somente FIPE">
            <RefreshCw className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="despesa" aria-label="Somente despesas">
            <DollarSign className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="manutencao" aria-label="Somente manutenções">
            <Wrench className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((h) => {
            const Icon = (h as any).Icon as typeof RefreshCw;
            const d = (h as any)._date as Date | null;

            return (
              <div key={h.id} className="p-4 rounded-2xl border border-border/40 bg-muted/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{h.title}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {d ? format(d, "dd/MM/yyyy") : "Data inválida"}
                      </p>
                      {h.description && (
                        <p className="text-xs text-muted-foreground mt-2 leading-snug">{h.description}</p>
                      )}
                    </div>
                  </div>
                  {typeof h.amount === "number" && (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor</p>
                      <p className="font-black tabular-nums">{formatCurrency(h.amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center opacity-30">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p className="font-black uppercase tracking-widest text-xs">Sem movimentações registradas</p>
        </div>
      )}

      {/* Dialog: categorias (layout reaproveitado do modal do app) */}
      <Dialog open={openCategories} onOpenChange={setOpenCategories}>
        <DialogContent
          hideCloseButton
          fullscreen={isMobile}
          className={cn(
            "p-0 shadow-2xl bg-card flex flex-col",
            !isMobile && "max-w-[36.4rem] h-[80vh] rounded-[2rem]",
          )}
        >
          <DialogHeader
            className="px-6 sm:px-8 pt-6 sm:pt-10 pb-6 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 relative"
            style={isMobile ? { paddingTop: "calc(env(safe-area-inset-top) + 1rem)" } : undefined}
          >
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpenCategories(false)}
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
              )}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl">
                <Tags className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Categorias</DialogTitle>
                <DialogDescription className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  Despesas do Veículo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 sm:px-8 scrollbar-material">
            <div className="space-y-4 py-6 pb-32 sm:pb-6">
              <p className="text-xs text-muted-foreground">
                Selecione as categorias para importar automaticamente as despesas (somente transações de saída).
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {categoriesSorted.map((c) => {
                  const checked = selectedCategoryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-all cursor-pointer",
                        checked && "border-primary/30 bg-primary/5",
                      )}
                    >
                      <Checkbox checked={checked} onCheckedChange={(v) => handleToggleCategory(c.id, v === true)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{c.label}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">{c.nature.replace("_", " ")}</p>
                      </div>
                      {checked && (
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1 uppercase">
                          ATIVA
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter
            className={cn(
              "p-6 sm:p-8 bg-muted/10 border-t flex flex-col sm:flex-row gap-3",
              isMobile && "fixed bottom-0 left-0 right-0 bg-card",
            )}
            style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" } : undefined}
          >
            {!isMobile && (
              <Button
                variant="ghost"
                onClick={() => setOpenCategories(false)}
                className="rounded-full h-12 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto"
              >
                FECHAR
              </Button>
            )}
            <Button
              onClick={() => setOpenCategories(false)}
              className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: manutenção (padrão do sistema) */}
      <Dialog open={openMaintenance} onOpenChange={setOpenMaintenance}>
        <DialogContent
          hideCloseButton
          fullscreen={isMobile}
          className={cn(
            "p-0 shadow-2xl bg-card flex flex-col",
            !isMobile && "max-w-[36.4rem] max-h-[90vh] rounded-[2rem]",
          )}
        >
          <DialogHeader
            className="px-6 sm:px-8 pt-6 sm:pt-10 pb-6 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 relative"
            style={isMobile ? { paddingTop: "calc(env(safe-area-inset-top) + 1rem)" } : undefined}
          >
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpenMaintenance(false)}
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
              )}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
                <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Registrar Manutenção</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  Log Manual
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isMobile ? (
            <ScrollArea className="flex-1 scrollbar-material">
              <div className="p-6 sm:p-8 space-y-6 pb-32 sm:pb-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Data</Label>
                  <Input
                    value={maintenanceDate}
                    onChange={(e) => setMaintenanceDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="h-12 rounded-2xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Serviço</Label>
                  <Input
                    value={maintenanceService}
                    onChange={(e) => setMaintenanceService(e.target.value)}
                    placeholder="Ex.: Troca de óleo"
                    className="h-12 rounded-2xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Custo (opcional)</Label>
                    <Input
                      value={maintenanceCost}
                      onChange={(e) => setMaintenanceCost(e.target.value)}
                      placeholder="0,00"
                      className="h-12 rounded-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Local (opcional)</Label>
                    <Input
                      value={maintenancePlace}
                      onChange={(e) => setMaintenancePlace(e.target.value)}
                      placeholder="Ex.: Oficina X"
                      className="h-12 rounded-2xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-material">
              <div className="p-6 sm:p-8 space-y-6 pb-32 sm:pb-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Data</Label>
                  <Input
                    value={maintenanceDate}
                    onChange={(e) => setMaintenanceDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="h-12 rounded-2xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Serviço</Label>
                  <Input
                    value={maintenanceService}
                    onChange={(e) => setMaintenanceService(e.target.value)}
                    placeholder="Ex.: Troca de óleo"
                    className="h-12 rounded-2xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Custo (opcional)</Label>
                    <Input
                      value={maintenanceCost}
                      onChange={(e) => setMaintenanceCost(e.target.value)}
                      placeholder="0,00"
                      className="h-12 rounded-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Local (opcional)</Label>
                    <Input
                      value={maintenancePlace}
                      onChange={(e) => setMaintenancePlace(e.target.value)}
                      placeholder="Ex.: Oficina X"
                      className="h-12 rounded-2xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter
            className={cn(
              "p-6 sm:p-8 bg-muted/10 dark:bg-black/20 border-t dark:border-white/5 shrink-0 flex flex-col-reverse sm:flex-row gap-3",
              isMobile && "fixed bottom-0 left-0 right-0 bg-card",
            )}
            style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" } : undefined}
          >
            {!isMobile && (
              <Button
                variant="ghost"
                onClick={() => setOpenMaintenance(false)}
                className="rounded-full h-12 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto"
              >
                FECHAR
              </Button>
            )}
            <Button
              onClick={handleSaveMaintenance}
              disabled={!canSaveMaintenance}
              className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20"
            >
              SALVAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
