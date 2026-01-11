"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Home, Map, Check, Trash2, DollarSign, Calendar } from "lucide-react";
import { Imovel, Terreno, formatCurrency } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImovelFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'imovel' | 'terreno';
  editingAsset?: Imovel | Terreno;
  onSubmit: (asset: Imovel | Terreno) => void;
  onDelete?: (id: number) => void;
}

const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ImovelFormModal({
  open,
  onOpenChange,
  type,
  editingAsset,
  onSubmit,
  onDelete,
}: ImovelFormModalProps) {
  const isEditing = !!editingAsset;
  const isImovel = type === 'imovel';

  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataAquisicao, setDataAquisicao] = useState(new Date().toISOString().split('T')[0]);
  const [valorAquisicaoInput, setValorAquisicaoInput] = useState("");
  const [valorAvaliacaoInput, setValorAvaliacaoInput] = useState("");
  const [imovelTipo, setImovelTipo] = useState<'casa' | 'apartamento' | 'comercial'>('casa');

  useEffect(() => {
    if (open) {
      if (editingAsset) {
        setDescricao(editingAsset.descricao);
        setEndereco(editingAsset.endereco);
        setDataAquisicao(editingAsset.dataAquisicao);
        setValorAquisicaoInput(formatToBR(editingAsset.valorAquisicao));
        setValorAvaliacaoInput(formatToBR(editingAsset.valorAvaliacao));
        if (isImovel) {
          setImovelTipo((editingAsset as Imovel).tipo || 'casa');
        }
      } else {
        setDescricao("");
        setEndereco("");
        setDataAquisicao(new Date().toISOString().split('T')[0]);
        setValorAquisicaoInput(formatToBR(0));
        setValorAvaliacaoInput(formatToBR(0));
        setImovelTipo('casa');
      }
    }
  }, [open, editingAsset, isImovel]);

  const handleValueChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    setter(cleaned);
  };

  const handleSubmit = () => {
    const valorAquisicao = parseFromBR(valorAquisicaoInput);
    const valorAvaliacao = parseFromBR(valorAvaliacaoInput);

    if (!descricao || !endereco || valorAquisicao <= 0 || valorAvaliacao <= 0) {
      toast.error("Preencha todos os campos obrigatórios com valores válidos.");
      return;
    }

    const baseAsset = {
      id: editingAsset?.id || 0,
      descricao,
      endereco,
      dataAquisicao,
      valorAquisicao,
      valorAvaliacao,
      status: 'ativo' as const,
    };

    let newAsset: Imovel | Terreno;

    if (isImovel) {
      newAsset = {
        ...baseAsset,
        tipo: imovelTipo,
      } as Imovel;
    } else {
      newAsset = baseAsset as Terreno;
    }
    
    onSubmit(newAsset);
    onOpenChange(false);
    toast.success(isEditing ? `${isImovel ? 'Imóvel' : 'Terreno'} atualizado!` : `${isImovel ? 'Imóvel' : 'Terreno'} adicionado!`);
  };

  const handleDelete = () => {
    if (!editingAsset || !onDelete) return;
    if (confirm(`Tem certeza que deseja excluir este ${type}?`)) {
      onDelete(editingAsset.id);
      onOpenChange(false);
      toast.success(`${type} excluído!`);
    }
  };

  const Icon = isImovel ? Home : Map;
  const title = isImovel ? 'Imóvel' : 'Terreno';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,36rem)] p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl bg-background z-[130]">
        <DialogHeader className="px-8 pt-10 pb-6 bg-primary/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                {isEditing ? `Editar ${title}` : `Novo ${title}`}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Registro de Ativo Imobilizado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
          {/* Descrição e Endereço */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Descrição / Nome</Label>
            <Input
              placeholder={`Ex: ${title} de Férias`}
              className="h-12 border-2 rounded-2xl font-bold"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Endereço / Localização</Label>
            <Textarea
              placeholder="Rua, Bairro, Cidade..."
              className="min-h-[80px] border-2 rounded-2xl text-sm"
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
            />
          </div>

          {/* Tipo (Apenas Imóvel) */}
          {isImovel && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Tipo de Imóvel</Label>
              <Select value={imovelTipo} onValueChange={(v) => setImovelTipo(v as 'casa' | 'apartamento' | 'comercial')}>
                <SelectTrigger className="h-12 border-2 rounded-2xl bg-card font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Data de Aquisição */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Data de Aquisição
            </Label>
            <Input
              type="date"
              className="h-12 border-2 rounded-2xl font-bold"
              value={dataAquisicao}
              onChange={e => setDataAquisicao(e.target.value)}
            />
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Valor de Aquisição
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="h-12 border-2 rounded-2xl font-black text-lg"
                value={valorAquisicaoInput}
                onChange={e => handleValueChange(setValorAquisicaoInput, e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Valor de Avaliação Atual
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="h-12 border-2 rounded-2xl font-black text-lg"
                value={valorAvaliacaoInput}
                onChange={e => handleValueChange(setValorAvaliacaoInput, e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-muted/10 border-t flex gap-3">
          {isEditing && onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="rounded-full h-12 px-6 font-bold text-sm mr-auto">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-6 font-bold text-muted-foreground">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20">
            <Check className="w-5 h-5" />
            {isEditing ? "SALVAR" : "ADICIONAR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}