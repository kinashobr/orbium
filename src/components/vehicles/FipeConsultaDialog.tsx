import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, AlertCircle, Sparkles, Check, ArrowLeft } from "lucide-react";
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
import { Veiculo } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface FipeConsultaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo?: Veiculo;
  onUpdateFipe?: (veiculoId: number, valorFipe: number) => void;
}

const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function FipeConsultaDialog({ open, onOpenChange, veiculo, onUpdateFipe }: FipeConsultaDialogProps) {
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
    } catch (err) {
      setError('Erro ao carregar marcas');
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
    } catch (err) {
      setError('Erro ao carregar modelos');
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
    } catch (err) {
      setError('Erro ao carregar anos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setStep('select');
      setError(null);
      setResultado(null);
      setValorNumerico(0);
      setSelectedMarca('');
      setSelectedModelo('');
      setSelectedAno('');
      return;
    }

    if (veiculo && veiculo.marca && veiculo.modelo && veiculo.ano) {
      const preFill = async () => {
        setLoading(true);
        try {
          const fipeTipo = tipoToFipe(veiculo.tipo || 'carro');
          setTipo(fipeTipo);
          const marcaData = await loadMarcas(fipeTipo);
          const matchingMarca = marcaData.find(m => normalizeString(m.nome).includes(normalizeString(veiculo.marca!)));
          if (matchingMarca) {
            setSelectedMarca(matchingMarca.codigo);
            const modelosData = await loadModelos(fipeTipo, matchingMarca.codigo);
            const matchingModelo = modelosData.find(m => normalizeString(m.nome).includes(normalizeString(veiculo.modelo!)));
            if (matchingModelo) {
              setSelectedModelo(matchingModelo.codigo.toString());
              const anosData = await loadAnos(fipeTipo, matchingMarca.codigo, matchingModelo.codigo.toString());
              const matchingAno = anosData.find(a => a.nome.includes(veiculo.ano.toString()));
              if (matchingAno) setSelectedAno(matchingAno.codigo);
            }
          }
        } catch (err) {
          setError('Erro ao pré-preencher dados.');
        } finally {
          setLoading(false);
        }
      };
      preFill();
    } else {
      loadMarcas(tipo);
    }
  }, [open, veiculo, loadMarcas, loadModelos, loadAnos]);

  const consultarFipe = async () => {
    if (!selectedMarca || !selectedModelo || !selectedAno) return;
    setLoading(true);
    try {
      const data = await buscarValorFipe(tipo, selectedMarca, selectedModelo, selectedAno);
      setResultado(data);
      const valor = parseFloat(data.Valor.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
      setValorNumerico(valor);
      setStep('result');
    } catch (err) {
      setError('Erro ao consultar valor FIPE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card dark:bg-[hsl(24_8%_14%)] flex flex-col",
          !isMobile && "max-w-[min(95vw,32rem)] rounded-[2rem]"
        )}
      >
        <DialogHeader 
          className="px-6 sm:px-8 pt-6 sm:pt-10 pb-6 bg-muted/50 dark:bg-black/30 shrink-0 border-b border-border/40 dark:border-white/5"
          style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}
        >
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-10 w-10 shrink-0">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/30">
              <Search className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Consulta FIPE</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Inteligência de Mercado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 sm:p-8 space-y-6 pb-32 sm:pb-8">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-tight">{error}</span>
              </div>
            )}
            
            {step === 'select' ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tipo de Veículo</Label>
                  <Select value={tipo} onValueChange={(v: any) => { setTipo(v); loadMarcas(v); }}>
                    <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carros" className="font-bold">Carro</SelectItem>
                      <SelectItem value="motos" className="font-bold">Moto</SelectItem>
                      <SelectItem value="caminhoes" className="font-bold">Caminhão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Marca</Label>
                  <Select value={selectedMarca} onValueChange={(v) => { setSelectedMarca(v); loadModelos(tipo, v); }}>
                    <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {marcas.map(m => <SelectItem key={m.codigo} value={m.codigo} className="font-medium">{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Modelo</Label>
                  <Select value={selectedModelo} onValueChange={(v) => { setSelectedModelo(v); loadAnos(tipo, selectedMarca, v); }}>
                    <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {modelos.map(m => <SelectItem key={m.codigo} value={m.codigo.toString()} className="font-medium">{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Ano Modelo</Label>
                  <Select value={selectedAno} onValueChange={setSelectedAno}>
                    <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {anos.map(a => <SelectItem key={a.codigo} value={a.codigo} className="font-medium">{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : resultado && (
              <div className="space-y-6 animate-in zoom-in duration-300">
                <div className="p-6 rounded-[2rem] bg-primary/5 border-2 border-primary/20 relative overflow-hidden">
                  <div className="absolute right-0 top-0 p-4 opacity-10"><Sparkles className="w-16 h-16 text-primary" /></div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Resultado da Consulta</p>
                  <h4 className="text-xl font-black text-foreground leading-tight mb-4">{resultado.Marca} {resultado.Modelo}</h4>
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <div>Ano: <span className="text-foreground">{resultado.AnoModelo}</span></div>
                    <div>Combustível: <span className="text-foreground">{resultado.Combustivel}</span></div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-primary/10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Valor de Mercado</p>
                    <p className="text-4xl font-black text-primary tabular-nums">{resultado.Valor}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 dark:bg-black/20 border-t dark:border-white/5 flex gap-3",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              FECHAR
            </Button>
          )}
          {step === 'select' ? (
            <Button onClick={consultarFipe} disabled={loading || !selectedAno} className="flex-1 rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              CONSULTAR VALOR
            </Button>
          ) : (
            <Button onClick={() => { if (veiculo && onUpdateFipe) onUpdateFipe(veiculo.id, valorNumerico); onOpenChange(false); }} className="flex-1 rounded-full h-12 bg-success text-white font-black text-sm gap-2 shadow-xl shadow-success/20">
              <Check className="w-5 h-5" /> APLICAR VALOR
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
