import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, AlertCircle, Sparkles, Check, ArrowLeft, RefreshCw } from "lucide-react";
import {
  buscarMarcas,
  buscarModelos,
  buscarAnos,
  buscarValorFipe,
  tipoToFipe,
  FipeMarca,
  FipeModelo,
  FipeAno,
  FipeResult
} from "@/services/fipeService";
import { Veiculo, VehicleHistoryItem, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { format } from "date-fns";
import { toast } from "sonner";

interface FipeConsultaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo?: Veiculo;
  onUpdateFipe?: (veiculoId: number, valorFipe: number) => void;
  onUpdateVeiculo?: (id: number, updates: Partial<Veiculo>) => void;
}

const normalizeString = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function findBestFipeMatch<T extends { nome: string }>(items: T[], target: string): T | undefined {
  const normTarget = normalizeString(target);
  if (!normTarget) return undefined;

  const exact = items.find(i => normalizeString(i.nome) === normTarget);
  if (exact) return exact;

  const direct = items.find(
    i => normalizeString(i.nome).includes(normTarget) || normTarget.includes(normalizeString(i.nome))
  );
  if (direct) return direct;

  const targetTokens = normTarget.split(/\s+/).filter(t => t.length >= 2);
  if (targetTokens.length === 0) return undefined;

  let bestItem: T | undefined;
  let bestScore = 0;

  for (const item of items) {
    const normName = normalizeString(item.nome);
    let score = 0;
    for (const token of targetTokens) {
      if (normName.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore > 0 ? bestItem : undefined;
}

function parseFipeCurrency(valStr?: string): number {
  if (!valStr) return 0;
  const cleaned = valStr.replace(/[^\d.,]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

export function FipeConsultaDialog({
  open,
  onOpenChange,
  veiculo,
  onUpdateFipe,
  onUpdateVeiculo,
}: FipeConsultaDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'result'>('select');
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<'carros' | 'motos' | 'caminhoes'>('carros');
  const [marcas, setMarcas] = useState<FipeMarca[]>([]);
  const [modelos, setModelos] = useState<FipeModelo[]>([]);
  const [anos, setAnos] = useState<FipeAno[]>([]);

  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [selectedModelo, setSelectedModelo] = useState<string>('');
  const [selectedAno, setSelectedAno] = useState<string>('');

  const [resultado, setResultado] = useState<FipeResult | null>(null);
  const [valorNumerico, setValorNumerico] = useState<number>(0);

  const veiculoRef = useRef(veiculo);
  veiculoRef.current = veiculo;

  // Body scroll lock for mobile fullscreen
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);

  const loadMarcas = useCallback(async (tipoVeiculo: 'carros' | 'motos' | 'caminhoes') => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarMarcas(tipoVeiculo);
      setMarcas(data);
      return data;
    } catch {
      setError('Não foi possível conectar à Tabela FIPE. Tente novamente em instantes.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModelos = useCallback(async (tipoVeiculo: 'carros' | 'motos' | 'caminhoes', codigoMarca: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarModelos(tipoVeiculo, codigoMarca);
      setModelos(data.modelos);
      return data.modelos;
    } catch {
      setError('Erro ao carregar modelos da Tabela FIPE.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnos = useCallback(async (tipoVeiculo: 'carros' | 'motos' | 'caminhoes', codigoMarca: string, codigoModelo: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarAnos(tipoVeiculo, codigoMarca, codigoModelo);
      setAnos(data);
      return data;
    } catch {
      setError('Erro ao carregar anos do modelo selecionado.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const veiculoId = veiculo?.id;

  useEffect(() => {
    if (!open) {
      setStep('select');
      setError(null);
      setResultado(null);
      setValorNumerico(0);
      setSelectedMarca('');
      setSelectedModelo('');
      setSelectedAno('');
      setMarcas([]);
      setModelos([]);
      setAnos([]);
      return;
    }

    const currentVeh = veiculoRef.current;
    if (currentVeh) {
      const fipeTipo = tipoToFipe(currentVeh.tipo || 'carro');
      setTipo(fipeTipo);

      let cancelled = false;
      const preFill = async () => {
        setLoading(true);
        try {
          const marcaData = await loadMarcas(fipeTipo);
          if (cancelled) return;
          const matchingMarca = currentVeh.marca ? findBestFipeMatch(marcaData, currentVeh.marca) : undefined;
          if (matchingMarca) {
            setSelectedMarca(matchingMarca.codigo);
            const modelosData = await loadModelos(fipeTipo, matchingMarca.codigo);
            if (cancelled) return;
            const matchingModelo = currentVeh.modelo ? findBestFipeMatch(modelosData, currentVeh.modelo) : undefined;
            if (matchingModelo) {
              setSelectedModelo(matchingModelo.codigo.toString());
              const anosData = await loadAnos(fipeTipo, matchingMarca.codigo, matchingModelo.codigo.toString());
              if (cancelled) return;
              const matchingAno = currentVeh.ano
                ? anosData.find(a => a.nome.includes(currentVeh.ano.toString()))
                : undefined;
              if (matchingAno) setSelectedAno(matchingAno.codigo);
            }
          }
        } catch {
          if (!cancelled) setError('Erro ao pré-preencher dados da Tabela FIPE.');
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      preFill();
      return () => {
        cancelled = true;
      };
    } else {
      setTipo('carros');
      loadMarcas('carros');
    }
  }, [open, veiculoId, loadMarcas, loadModelos, loadAnos]);

  const handleTipoChange = (newTipo: 'carros' | 'motos' | 'caminhoes') => {
    setTipo(newTipo);
    setSelectedMarca('');
    setSelectedModelo('');
    setSelectedAno('');
    setModelos([]);
    setAnos([]);
    setResultado(null);
    setStep('select');
    loadMarcas(newTipo);
  };

  const handleMarcaChange = (codigoMarca: string) => {
    setSelectedMarca(codigoMarca);
    setSelectedModelo('');
    setSelectedAno('');
    setModelos([]);
    setAnos([]);
    setResultado(null);
    loadModelos(tipo, codigoMarca);
  };

  const handleModeloChange = (codigoModelo: string) => {
    setSelectedModelo(codigoModelo);
    setSelectedAno('');
    setAnos([]);
    setResultado(null);
    loadAnos(tipo, selectedMarca, codigoModelo);
  };

  const consultarFipe = async () => {
    if (!selectedMarca || !selectedModelo || !selectedAno) return;
    setLoading(true);
    setError(null);
    try {
      const data = await buscarValorFipe(tipo, selectedMarca, selectedModelo, selectedAno);
      setResultado(data);
      const parsed = parseFipeCurrency(data.Valor);
      setValorNumerico(parsed);
      setStep('result');
    } catch {
      setError('Erro ao consultar valor na Tabela FIPE. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFipe = () => {
    const finalValor = valorNumerico > 0 ? valorNumerico : parseFipeCurrency(resultado?.Valor);
    const currentVeh = veiculoRef.current;

    // Fechar o modal imediatamente ao clicar em Aplicar
    onOpenChange(false);

    if (!currentVeh || finalValor <= 0) {
      if (finalValor <= 0) {
        toast.error("Valor da Tabela FIPE inválido.");
      }
      return;
    }

    if (onUpdateVeiculo) {
      const oldValue = currentVeh.valorFipe || 0;
      const existingHistory = Array.isArray(currentVeh.historico) ? currentVeh.historico : [];
      const historyItem: VehicleHistoryItem = {
        id: `vh_fipe_${Date.now()}`,
        type: 'fipe',
        date: format(new Date(), "yyyy-MM-dd"),
        title: resultado?.MesReferencia ? `Cotação FIPE (${resultado.MesReferencia})` : 'Atualização de Tabela FIPE',
        description: `${formatCurrency(oldValue)} → ${formatCurrency(finalValor)}`,
        amount: finalValor,
        meta: {
          oldValue,
          newValue: finalValor,
          ...(resultado ? { codigoFipe: resultado.CodigoFipe, mesReferencia: resultado.MesReferencia } : {}),
        },
      };

      onUpdateVeiculo(currentVeh.id, {
        valorFipe: finalValor,
        historico: [...existingHistory, historyItem],
      });
    } else if (onUpdateFipe) {
      onUpdateFipe(currentVeh.id, finalValor);
    }

    toast.success(`Valor FIPE atualizado para ${formatCurrency(finalValor)}!`);
  };

  const currentFipe = veiculo?.valorFipe || 0;
  const resultDelta = valorNumerico - currentFipe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card dark:bg-[hsl(24_8%_14%)] flex flex-col",
          !isMobile && "max-w-[min(95vw,32rem)] max-h-[90vh] rounded-[2rem]"
        )}
      >
        <DialogHeader
          className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 dark:border-white/5"
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
        >
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-10 w-10 shrink-0">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Atualizar Tabela FIPE</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                {veiculo ? `${veiculo.modelo} • ${veiculo.ano}` : "Consulta Oficial Tabela FIPE"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 scrollbar-material">
          <div className="p-6 sm:p-8 space-y-5 pb-32 sm:pb-8">
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-snug">{error}</span>
              </div>
            )}

            {step === 'select' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tipo de Veículo</Label>
                  <Select value={tipo} onValueChange={(v) => handleTipoChange(v as 'carros' | 'motos' | 'caminhoes')}>
                    <SelectTrigger className="h-11 border-2 rounded-2xl bg-card font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carros" className="font-bold">Carro</SelectItem>
                      <SelectItem value="motos" className="font-bold">Moto</SelectItem>
                      <SelectItem value="caminhoes" className="font-bold">Caminhão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Marca</Label>
                  <Select value={selectedMarca} onValueChange={handleMarcaChange} disabled={marcas.length === 0}>
                    <SelectTrigger className="h-11 border-2 rounded-2xl bg-card font-bold">
                      <SelectValue placeholder={loading && marcas.length === 0 ? "Carregando marcas..." : "Selecione a marca..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {marcas.map(m => <SelectItem key={m.codigo} value={m.codigo} className="font-medium">{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Modelo</Label>
                  <Select value={selectedModelo} onValueChange={handleModeloChange} disabled={!selectedMarca || modelos.length === 0}>
                    <SelectTrigger className="h-11 border-2 rounded-2xl bg-card font-bold">
                      <SelectValue placeholder={!selectedMarca ? "Selecione a marca primeiro" : loading && modelos.length === 0 ? "Carregando modelos..." : "Selecione o modelo..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {modelos.map(m => <SelectItem key={m.codigo} value={m.codigo.toString()} className="font-medium">{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Ano Modelo</Label>
                  <Select value={selectedAno} onValueChange={setSelectedAno} disabled={!selectedModelo || anos.length === 0}>
                    <SelectTrigger className="h-11 border-2 rounded-2xl bg-card font-bold">
                      <SelectValue placeholder={!selectedModelo ? "Selecione o modelo primeiro" : loading && anos.length === 0 ? "Carregando anos..." : "Selecione o ano..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {anos.map(a => <SelectItem key={a.codigo} value={a.codigo} className="font-medium">{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : resultado && (
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                <div className="p-6 rounded-3xl bg-amber-500/5 border-2 border-amber-500/25 relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-4 opacity-10"><Sparkles className="w-16 h-16 text-amber-500" /></div>
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] mb-1.5">
                    Tabela FIPE • {resultado.MesReferencia}
                  </p>
                  <h4 className="text-lg font-black text-foreground leading-tight mb-3">
                    {resultado.Marca} {resultado.Modelo}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div>Ano: <span className="text-foreground">{resultado.AnoModelo}</span></div>
                    <div>Comb.: <span className="text-foreground">{resultado.Combustivel}</span></div>
                    <div className="col-span-2">Código FIPE: <span className="font-mono text-foreground">{resultado.CodigoFipe}</span></div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-amber-500/15 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Valor de Mercado</p>
                      <p className="text-3xl font-black text-foreground tabular-nums">{resultado.Valor}</p>
                    </div>
                    {currentFipe > 0 && resultDelta !== 0 && (
                      <span className={cn(
                        "text-xs font-black px-2.5 py-1 rounded-lg tabular-nums",
                        resultDelta >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      )}>
                        {resultDelta >= 0 ? "+" : ""}{formatCurrency(resultDelta)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter
          className={cn(
            "p-6 sm:p-7 bg-muted/10 dark:bg-black/20 border-t dark:border-white/5 flex gap-3 relative z-20 shrink-0",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {step === 'select' ? (
            <>
              {!isMobile && (
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  Cancelar
                </Button>
              )}
              <Button type="button" onClick={consultarFipe} disabled={loading || !selectedAno} className="flex-1 rounded-full h-11 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs uppercase tracking-wider gap-2 shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Consultar Valor FIPE
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('select')}
                className="rounded-full h-11 px-5 font-black text-[10px] uppercase tracking-widest"
              >
                Alterar
              </Button>
              <Button
                type="button"
                onClick={handleApplyFipe}
                className="flex-1 rounded-full h-11 bg-success hover:bg-success/90 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" /> Aplicar Valor FIPE
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
