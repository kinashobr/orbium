"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, Map, Check, Trash2, DollarSign, Calendar, ArrowLeft } from "lucide-react";
import { Imovel, Terreno } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isEditing = !!editingAsset;
  const isImovel = type === 'imovel';

  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataAquisicao, setDataAquisicao] = useState(new Date().toISOString().split('T')[0]);
  const [valorAquisicaoInput, setValorAquisicaoInput] = useState("");
  const [valorAvaliacaoInput, setValorAvaliacaoInput] = useState("");
  const [imovelTipo, setImovelTipo] = useState<'casa' | 'apartamento' | 'comercial'>('casa');

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
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card dark:bg-[hsl(24_8%_14%)] flex flex-col z-[130]",
          !isMobile && "max-w-[min(95vw,36rem)] rounded-[2rem]"
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
              <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
                {isEditing ? `Editar ${title}` : `Novo ${title}`}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                Registro de Ativo Imobilizado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 sm:p-8 space-y-6 pb-32 sm:pb-8">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 dark:bg-black/30 border-t dark:border-white/5 flex flex-col-reverse sm:flex-row gap-3",
            isMobile && "fixed bottom-0 left-0 right-0 bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {isEditing && onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="rounded-full h-12 px-6 font-bold text-sm sm:mr-auto w-full sm:w-auto">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          )}
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-12 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-full sm:w-auto">
              FECHAR
            </Button>
          )}
          <Button onClick={handleSubmit} className="rounded-full h-12 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 w-full sm:w-auto">
            <Check className="w-5 h-5" />
            {isEditing ? "SALVAR" : "ADICIONAR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
