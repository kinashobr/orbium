"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Car, 
  Truck, 
  Copy, 
  Edit, 
  Check, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from "lucide-react";
import { formatCurrency, Veiculo } from "@/types/finance";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { getEstimatedIpvaAndDueDate } from "./VehicleDetailDialog";

interface VehicleTechnicalCardProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleTechnicalCard({ veiculo, onUpdateVeiculo }: VehicleTechnicalCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Estados locais para edição
  const [editModelo, setEditModelo] = useState(veiculo.modelo || "");
  const [editMarca, setEditMarca] = useState(veiculo.marca || "");
  const [editTipo, setEditTipo] = useState<'carro' | 'moto' | 'caminhao'>(veiculo.tipo || "carro");
  const [editAno, setEditAno] = useState(veiculo.ano || new Date().getFullYear());
  const [editDataCompra, setEditDataCompra] = useState(veiculo.dataCompra || "");
  const [editValorVeiculo, setEditValorVeiculo] = useState(veiculo.valorVeiculo || 0);
  const [editPlaca, setEditPlaca] = useState(veiculo.placa || "");
  const [editRenavam, setEditRenavam] = useState(veiculo.renavam || "");
  const [editCrlvDados, setEditCrlvDados] = useState(veiculo.crlvDados || "");

  // Copiar dados individuais para a área de transferência
  const handleCopy = (text: string, label: string) => {
    if (!text) {
      toast.error(`${label} não informado(a) para cópia.`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado(a) para a área de transferência!`);
  };

  // Estimativas fiscais de IPVA e Licenciamento
  const estimated = getEstimatedIpvaAndDueDate(veiculo.placa || "", veiculo.tipo || 'carro', veiculo.valorFipe || 0);
  const ipvaVal = veiculo.ipvaValor || estimated.valorIpva;
  const licVal = veiculo.licenciamentoValor || estimated.valorLicenciamento;

  const handleSaveCadastro = () => {
    if (!editModelo.trim()) {
      toast.error("O modelo é obrigatório.");
      return;
    }

    onUpdateVeiculo(veiculo.id, {
      modelo: editModelo,
      marca: editMarca,
      tipo: editTipo,
      ano: Number(editAno),
      dataCompra: editDataCompra,
      valorVeiculo: Number(editValorVeiculo),
      placa: editPlaca.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      renavam: editRenavam.replace(/\D/g, ""),
      crlvDados: editCrlvDados,
    });

    toast.success("Ficha técnica do veículo atualizada!");
    setIsEditing(false);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 sm:p-8 shadow-soft border border-white/60 dark:border-white/5 space-y-6">
      {/* HEADER DA FICHA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            {veiculo.tipo === 'moto' ? <MotorcycleIcon className="w-8 h-8" /> :
             veiculo.tipo === 'caminhao' ? <Truck className="w-8 h-8" /> :
             <Car className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-foreground">Ficha Técnica & Documentação</h3>
            <p className="text-xs text-muted-foreground font-medium">Especificações cadastrais do veículo e controle fiscal do IPVA / Licenciamento.</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl font-bold text-xs gap-2"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit className="w-3.5 h-3.5" />
          {isEditing ? "Fechar Edição" : "Editar Cadastro"}
        </Button>
      </div>

      {/* PAINEL SANFONA DE EDIÇÃO INLINE (ZERO MODAIS) */}
      {isEditing && (
        <div className="p-6 rounded-3xl bg-muted/20 border border-primary/20 space-y-6 animate-in slide-in-from-top-3 duration-300">
          <h4 className="font-black text-xs uppercase tracking-wider text-primary">Alterar Cadastro do Veículo</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modelo</Label>
              <Input value={editModelo} onChange={e => setEditModelo(e.target.value)} className="h-11 rounded-2xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Marca / Fabricante</Label>
              <Input value={editMarca} onChange={e => setEditMarca(e.target.value)} className="h-11 rounded-2xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Veículo</Label>
              <Select value={editTipo} onValueChange={(v: any) => setEditTipo(v)}>
                <SelectTrigger className="h-11 rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="caminhao">Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ano Fabricação/Modelo</Label>
              <Input type="number" value={editAno} onChange={e => setEditAno(Number(e.target.value))} className="h-11 rounded-2xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Placa</Label>
              <Input value={editPlaca} onChange={e => setEditPlaca(e.target.value)} className="h-11 rounded-2xl font-bold font-mono uppercase" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RENAVAM</Label>
              <Input value={editRenavam} onChange={e => setEditRenavam(e.target.value)} className="h-11 rounded-2xl font-bold font-mono" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data da Compra</Label>
              <Input type="date" value={editDataCompra} onChange={e => setEditDataCompra(e.target.value)} className="h-11 rounded-2xl font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor de Aquisição (R$)</Label>
              <Input type="number" step="100" value={editValorVeiculo} onChange={e => setEditValorVeiculo(Number(e.target.value))} className="h-11 rounded-2xl font-bold tabular-nums" />
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações CRLV / Notas</Label>
              <Textarea value={editCrlvDados} onChange={e => setEditCrlvDados(e.target.value)} rows={3} className="rounded-2xl font-medium" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl font-black uppercase tracking-wider px-8 bg-primary text-primary-foreground" onClick={handleSaveCadastro}>
              Salvar Cadastro
            </Button>
          </div>
        </div>
      )}

      {/* DADOS EXPRESSIVOS COM BOTÕES PARA COPIAR DADOS INDIVIDUAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* PLACA */}
        <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Placa</span>
            <span className="font-mono font-black text-xl text-foreground mt-1 block">
              {veiculo.placa || "Não informada"}
            </span>
          </div>
          {veiculo.placa && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 rounded-xl text-xs font-bold gap-1 mt-2" 
              onClick={() => handleCopy(veiculo.placa || "", "Placa")}
            >
              <Copy className="w-3 h-3" /> Copiar Placa
            </Button>
          )}
        </div>

        {/* RENAVAM */}
        <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">RENAVAM</span>
            <span className="font-mono font-bold text-base text-foreground mt-1 block truncate">
              {veiculo.renavam || "Não informado"}
            </span>
          </div>
          {veiculo.renavam && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 rounded-xl text-xs font-bold gap-1 mt-2" 
              onClick={() => handleCopy(veiculo.renavam || "", "RENAVAM")}
            >
              <Copy className="w-3 h-3" /> Copiar RENAVAM
            </Button>
          )}
        </div>

        {/* ANO E TIPO */}
        <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Ano & Categoria</span>
            <span className="font-black text-lg text-foreground mt-1 block">
              Ano {veiculo.ano} • <span className="uppercase text-xs">{veiculo.tipo || 'Carro'}</span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">Fabricante: {veiculo.marca || "N/I"}</span>
        </div>

        {/* DATA E VALOR COMPRA */}
        <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Aquisição</span>
            <span className="font-black text-lg text-foreground mt-1 block tabular-nums">
              {formatCurrency(veiculo.valorVeiculo)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            Data: {veiculo.dataCompra ? format(parseDateLocal(veiculo.dataCompra), "dd/MM/yyyy") : "N/I"}
          </span>
        </div>

      </div>

      {/* TABELA / CONTROLE INTERATIVO DE IPVA E LICENCIAMENTO */}
      <div className="pt-6 border-t border-border/40 space-y-4">
        <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Controle de IPVA & Licenciamento Anual</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* IPVA */}
          <div className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-foreground">IPVA {new Date().getFullYear()}</span>
                <Badge className={cn("border-none text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase", veiculo.ipvaPago ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                  {veiculo.ipvaPago ? "Quitado" : "Pendente"}
                </Badge>
              </div>
              <p className="text-xs font-bold text-muted-foreground tabular-nums">
                Valor Exigido: {formatCurrency(ipvaVal)}
              </p>
            </div>

            <Button 
              size="sm" 
              variant={veiculo.ipvaPago ? "outline" : "default"} 
              className={cn("rounded-xl text-xs font-black uppercase px-4", veiculo.ipvaPago && "text-success border-success/30")}
              onClick={() => {
                onUpdateVeiculo(veiculo.id, { ipvaPago: !veiculo.ipvaPago });
                toast.success(`IPVA marcado como ${!veiculo.ipvaPago ? 'PAGO' : 'PENDENTE'}!`);
              }}
            >
              {veiculo.ipvaPago ? "Alternar p/ Pendente" : "Confirmar Quitação"}
            </Button>
          </div>

          {/* LICENCIAMENTO */}
          <div className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-foreground">Licenciamento DETRAN</span>
                <Badge className={cn("border-none text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase", veiculo.licenciamentoPago ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                  {veiculo.licenciamentoPago ? "Quitado" : "Pendente"}
                </Badge>
              </div>
              <p className="text-xs font-bold text-muted-foreground tabular-nums">
                Taxa Anual: {formatCurrency(licVal)}
              </p>
            </div>

            <Button 
              size="sm" 
              variant={veiculo.licenciamentoPago ? "outline" : "default"} 
              className={cn("rounded-xl text-xs font-black uppercase px-4", veiculo.licenciamentoPago && "text-success border-success/30")}
              onClick={() => {
                onUpdateVeiculo(veiculo.id, { licenciamentoPago: !veiculo.licenciamentoPago });
                toast.success(`Licenciamento marcado como ${!veiculo.licenciamentoPago ? 'PAGO' : 'PENDENTE'}!`);
              }}
            >
              {veiculo.licenciamentoPago ? "Alternar p/ Pendente" : "Confirmar Quitação"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
