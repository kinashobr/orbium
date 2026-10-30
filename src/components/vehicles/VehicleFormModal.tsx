"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Car, Truck, Check, Pencil, DollarSign, Calendar, ArrowLeft } from "lucide-react";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { Veiculo } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  veiculoToEdit?: Veiculo | null;
}

export function VehicleFormModal({ isOpen, onClose, veiculoToEdit }: VehicleFormModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { updateVeiculo, addVeiculo } = useFinance();
  const isEditing = !!veiculoToEdit;

  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState<'carro' | 'moto' | 'caminhao'>('carro');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split('T')[0]);
  const [valorVeiculoInput, setValorVeiculoInput] = useState("0,00");
  const [valorFipeInput, setValorFipeInput] = useState("0,00");
  const [placa, setPlaca] = useState("");
  const [renavam, setRenavam] = useState("");

  const [ipvaValorInput, setIpvaValorInput] = useState("0,00");
  const [ipvaVencimento, setIpvaVencimento] = useState("");
  const [licenciaValorInput, setLicenciaValorInput] = useState("0,00");
  const [licenciaVencimento, setLicenciaVencimento] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (veiculoToEdit) {
        setModelo(veiculoToEdit.modelo || "");
        setMarca(veiculoToEdit.marca || "");
        setTipo(veiculoToEdit.tipo || "carro");
        setAno(veiculoToEdit.ano || new Date().getFullYear());
        setDataCompra(veiculoToEdit.dataCompra || new Date().toISOString().split('T')[0]);
        setValorVeiculoInput((veiculoToEdit.valorVeiculo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        setValorFipeInput((veiculoToEdit.valorFipe || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        setPlaca(veiculoToEdit.placa || "");
        setRenavam(veiculoToEdit.renavam || "");

        setIpvaValorInput((veiculoToEdit.ipvaValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        setIpvaVencimento(veiculoToEdit.ipvaVencimento || "");
        setLicenciaValorInput((veiculoToEdit.licenciamentoValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        setLicenciaVencimento(veiculoToEdit.licenciamentoVencimento || "");
      } else {
        setModelo("");
        setMarca("");
        setTipo("carro");
        setAno(new Date().getFullYear());
        setDataCompra(new Date().toISOString().split('T')[0]);
        setValorVeiculoInput("0,00");
        setValorFipeInput("0,00");
        setPlaca("");
        setRenavam("");
        setIpvaValorInput("0,00");
        setIpvaVencimento("");
        setLicenciaValorInput("0,00");
        setLicenciaVencimento("");
      }
    }
  }, [isOpen, veiculoToEdit]);

  const handleAmountChange = (setter: (v: string) => void, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setter("0,00");
      return;
    }
    const val = parseInt(digits) / 100;
    setter(val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = () => {
    if (!modelo.trim()) {
      toast.error("O modelo do veículo é obrigatório.");
      return;
    }

    const valorVeiculo = parseBrlValue(valorVeiculoInput);
    const valorFipe = parseBrlValue(valorFipeInput);
    const ipvaValor = parseBrlValue(ipvaValorInput);
    const licenciamentoValor = parseBrlValue(licenciaValorInput);

    const vehicleData = {
      modelo: modelo.trim(),
      marca: marca.trim(),
      tipo,
      ano: Number(ano),
      dataCompra,
      valorVeiculo,
      valorFipe,
      placa: placa.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      renavam: renavam.replace(/\D/g, ""),
      ipvaValor,
      ipvaVencimento,
      licenciamentoValor,
      licenciamentoVencimento,
    };

    if (isEditing && veiculoToEdit) {
      updateVeiculo(veiculoToEdit.id, vehicleData);
      toast.success("Cadastro do veículo atualizado!");
    } else {
      addVeiculo({
        ...vehicleData,
        valorSeguro: 0,
        vencimentoSeguro: "",
        parcelaSeguro: 0,
        status: "ativo"
      });
      toast.success("Veículo cadastrado!");
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col z-[130]",
          !isMobile && "w-[min(95vw,38rem)] max-h-[90vh] rounded-[2rem] border border-border"
        )}
      >
        <DialogHeader className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 bg-muted/40 shrink-0 border-b border-border/60">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 shrink-0">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {tipo === 'moto' ? <MotorcycleIcon className="w-6 h-6" /> :
               tipo === 'caminhao' ? <Truck className="w-6 h-6" /> :
               <Car className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {isEditing ? "Editar Cadastro do Veículo" : "Novo Veículo"}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                Atualize as informações cadastrais, tributárias e valores de mercado do bem.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 sm:p-8 space-y-5">
            {/* Tipo de Veículo */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Tipo de Veículo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as 'carro' | 'moto' | 'caminhao')}>
                <SelectTrigger className="h-11 rounded-xl bg-card font-bold border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro / Passeio</SelectItem>
                  <SelectItem value="moto">Motocicleta</SelectItem>
                  <SelectItem value="caminhao">Caminhão / Utilitário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modelo e Marca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Modelo *</Label>
                <Input
                  placeholder="Ex: Hunter 350cc"
                  className="h-11 rounded-xl font-bold border-border"
                  value={modelo}
                  onChange={e => setModelo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Marca / Fabricante</Label>
                <Input
                  placeholder="Ex: Royal Enfield"
                  className="h-11 rounded-xl font-bold border-border"
                  value={marca}
                  onChange={e => setMarca(e.target.value)}
                />
              </div>
            </div>

            {/* Placa e RENAVAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Placa Mercosul</Label>
                <Input
                  placeholder="Ex: RHY7B73"
                  className="h-11 rounded-xl font-mono font-bold uppercase border-border"
                  value={placa}
                  onChange={e => setPlaca(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">RENAVAM</Label>
                <Input
                  placeholder="Ex: 01298342810"
                  className="h-11 rounded-xl font-mono font-bold border-border"
                  value={renavam}
                  onChange={e => setRenavam(e.target.value)}
                />
              </div>
            </div>

            {/* Ano e Data de Aquisição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Ano Fab. / Modelo</Label>
                <Input
                  type="number"
                  className="h-11 rounded-xl font-bold border-border"
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Data de Aquisição
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl font-bold border-border"
                  value={dataCompra}
                  onChange={e => setDataCompra(e.target.value)}
                />
              </div>
            </div>

            {/* Valores de Aquisição e FIPE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" /> Valor de Aquisição (R$)
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="h-11 rounded-xl font-black text-base border-border"
                  value={valorVeiculoInput}
                  onChange={e => handleAmountChange(setValorVeiculoInput, e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Valor FIPE Atual (R$)
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="h-11 rounded-xl font-black text-base border-border"
                  value={valorFipeInput}
                  onChange={e => handleAmountChange(setValorFipeInput, e.target.value)}
                />
              </div>
            </div>

            {/* Valores de IPVA e Licenciamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">IPVA Anual (R$)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="h-11 rounded-xl font-bold border-border"
                  value={ipvaValorInput}
                  onChange={e => handleAmountChange(setIpvaValorInput, e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Licenciamento (R$)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="h-11 rounded-xl font-bold border-border"
                  value={licenciaValorInput}
                  onChange={e => handleAmountChange(setLicenciaValorInput, e.target.value)}
                />
              </div>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="p-6 sm:p-8 bg-muted/20 border-t border-border flex flex-row justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-11 px-5 font-bold text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="rounded-xl h-11 px-6 bg-primary text-primary-foreground font-bold text-xs gap-2">
            <Check className="w-4 h-4" />
            {isEditing ? "Salvar Alterações" : "Cadastrar Veículo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
