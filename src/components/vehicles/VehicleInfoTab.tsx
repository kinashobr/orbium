"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Car, Truck, Edit, Check, ChevronDown, ChevronUp, FileText, Info } from "lucide-react";
import { formatCurrency, Veiculo } from "@/types/finance";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface VehicleInfoTabProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleInfoTab({ veiculo, onUpdateVeiculo }: VehicleInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Estados locais para formulário de edição
  const [editModelo, setEditModelo] = useState(veiculo.modelo || "");
  const [editMarca, setEditMarca] = useState(veiculo.marca || "");
  const [editTipo, setEditTipo] = useState<'carro' | 'moto' | 'caminhao'>(veiculo.tipo || "carro");
  const [editAno, setEditAno] = useState(veiculo.ano || new Date().getFullYear());
  const [editDataCompra, setEditDataCompra] = useState(veiculo.dataCompra || "");
  const [editValorVeiculo, setEditValorVeiculo] = useState(veiculo.valorVeiculo || 0);
  const [editPlaca, setEditPlaca] = useState(veiculo.placa || "");
  const [editRenavam, setEditRenavam] = useState(veiculo.renavam || "");
  const [editCrlvDados, setEditCrlvDados] = useState(veiculo.crlvDados || "");

  const handleSave = () => {
    if (!editModelo.trim()) {
      toast.error("O modelo do veículo é obrigatório.");
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

    toast.success("Ficha do veículo atualizada com sucesso!");
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* CARD PRINCIPAL DA FICHA */}
      <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 sm:p-8 shadow-soft">
        <div className="flex items-center justify-between pb-6 border-b border-border/40 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              {veiculo.tipo === 'moto' ? <MotorcycleIcon className="w-8 h-8" /> :
               veiculo.tipo === 'caminhao' ? <Truck className="w-8 h-8" /> :
               <Car className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="font-black text-xl text-foreground">{veiculo.modelo}</h3>
              <p className="text-xs text-muted-foreground font-medium">{veiculo.marca} • Ano {veiculo.ano}</p>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl font-bold text-xs gap-2"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-3.5 h-3.5" />
            {isEditing ? "Fechar Edição" : "Editar Ficha"}
          </Button>
        </div>

        {/* PAINEL SANFONA DE EDIÇÃO INLINE (ZERO MODAIS) */}
        {isEditing ? (
          <div className="p-6 rounded-3xl bg-muted/20 border border-primary/20 space-y-6 mb-8 animate-in slide-in-from-top-3 duration-300">
            <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Edição dos Dados do Veículo</h4>

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
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ano de Fabricação/Modelo</Label>
                <Input type="number" value={editAno} onChange={e => setEditAno(Number(e.target.value))} className="h-11 rounded-2xl font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Placa</Label>
                <Input value={editPlaca} onChange={e => setEditPlaca(e.target.value)} className="h-11 rounded-2xl font-bold uppercase font-mono" />
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
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados Adicionais CRLV / Observações</Label>
                <Textarea value={editCrlvDados} onChange={e => setEditCrlvDados(e.target.value)} rows={3} className="rounded-2xl font-medium" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
              <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl font-black uppercase tracking-wider px-8 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        ) : null}

        {/* VISUALIZAÇÃO DA FICHA TÉCNICA */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Placa</span>
            <span className="font-mono font-black text-lg text-foreground bg-muted/50 px-3 py-1 rounded-xl inline-block border border-border/60">
              {veiculo.placa || "Não informada"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">RENAVAM</span>
            <span className="font-mono font-bold text-base text-foreground block pt-1">
              {veiculo.renavam || "Não informado"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Ano Fabricação/Modelo</span>
            <span className="font-black text-base text-foreground block pt-1">{veiculo.ano}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Tipo</span>
            <span className="font-black text-base text-foreground uppercase block pt-1">{veiculo.tipo || "carro"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Data de Aquisição</span>
            <span className="font-bold text-base text-foreground block pt-1">
              {veiculo.dataCompra ? format(parseDateLocal(veiculo.dataCompra), "dd/MM/yyyy") : "Não informada"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Valor de Aquisição</span>
            <span className="font-black text-base text-foreground block pt-1 tabular-nums">{formatCurrency(veiculo.valorVeiculo)}</span>
          </div>
        </div>

        {veiculo.crlvDados && (
          <div className="mt-8 pt-6 border-t border-border/40">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Informações do Documento / CRLV</span>
            <p className="text-sm font-medium text-foreground bg-muted/20 p-4 rounded-2xl border border-border/30 whitespace-pre-wrap">
              {veiculo.crlvDados}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
