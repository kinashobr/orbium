"use client";

import { useState, useRef } from "react";
import { Veiculo, SeguroVeiculo, formatCurrency } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MotorcycleIcon } from "@/components/ui/MotorcycleIcon";
import { 
  Car, 
  Truck, 
  Copy, 
  Check, 
  Gauge, 
  FileCheck, 
  ShieldCheck, 
  Upload, 
  CreditCard,
  FileText,
  Pencil,
  CheckCheck,
  ShieldAlert,
  X,
  Receipt,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { cn, parseDateLocal } from "@/lib/utils";

interface VehicleHeroShowcaseProps {
  veiculo: Veiculo;
  seguro?: SeguroVeiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
}

export function VehicleHeroShowcase({ veiculo, seguro, onUpdateVeiculo }: VehicleHeroShowcaseProps) {
  const [copiedPlaca, setCopiedPlaca] = useState(false);
  const [copiedRenavam, setCopiedRenavam] = useState(false);
  
  // Controle da Seção de Edição Dinâmica do Cadastro em Tela (substitui tela antiga e modais)
  const [isEditingDynamic, setIsEditingDynamic] = useState(false);
  
  // Controle de Foto do Veículo
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [photoInputUrl, setPhotoInputUrl] = useState(veiculo.fotoUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form de Edição Dinâmica do Cadastro Completo do Veículo
  const [editModelo, setEditModelo] = useState(veiculo.modelo || "");
  const [editMarca, setEditMarca] = useState(veiculo.marca || "");
  const [editTipo, setEditTipo] = useState<'carro' | 'moto' | 'caminhao'>(veiculo.tipo || "carro");
  const [editAno, setEditAno] = useState(veiculo.ano || new Date().getFullYear());
  const [editDataCompra, setEditDataCompra] = useState(veiculo.dataCompra || "");
  const [editValorVeiculo, setEditValorVeiculo] = useState(veiculo.valorVeiculo || 0);
  const [editValorFipe, setEditValorFipe] = useState(veiculo.valorFipe || 0);
  const [editPlaca, setEditPlaca] = useState(veiculo.placa || "");
  const [editRenavam, setEditRenavam] = useState(veiculo.renavam || "");
  const [editCrlvDados, setEditCrlvDados] = useState(veiculo.crlvDados || "");

  // Gestor de Controle de IPVA & Licenciamento Anual
  const [editIpvaValor, setEditIpvaValor] = useState(veiculo.ipvaValor || 345.29);
  const [editIpvaVencimento, setEditIpvaVencimento] = useState(veiculo.ipvaVencimento || "");
  const [editIpvaPago, setEditIpvaPago] = useState(veiculo.ipvaPago !== false);

  const [editLicenciamentoValor, setEditLicenciamentoValor] = useState(veiculo.licenciamentoValor || 94.61);
  const [editLicenciamentoVencimento, setEditLicenciamentoVencimento] = useState(veiculo.licenciamentoVencimento || "");
  const [editLicenciamentoPago, setEditLicenciamentoPago] = useState(veiculo.licenciamentoPago !== false);

  const handleCopy = (text: string, type: "placa" | "renavam") => {
    if (!text) {
      toast.error(`Nenhum dado registrado para ${type === "placa" ? "Placa" : "RENAVAM"}`);
      return;
    }
    navigator.clipboard.writeText(text);
    if (type === "placa") {
      setCopiedPlaca(true);
      setTimeout(() => setCopiedPlaca(false), 2000);
      toast.success("Placa copiada para a área de transferência!");
    } else {
      setCopiedRenavam(true);
      setTimeout(() => setCopiedRenavam(false), 2000);
      toast.success("RENAVAM copiado para a área de transferência!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpdateVeiculo(veiculo.id, { fotoUrl: dataUrl });
      toast.success("Foto do veículo atualizada com sucesso!");
      setShowPhotoSection(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoUrl = () => {
    onUpdateVeiculo(veiculo.id, { fotoUrl: photoInputUrl.trim() || undefined });
    toast.success("Foto do veículo atualizada com sucesso!");
    setShowPhotoSection(false);
  };

  const handleSaveDynamicEdit = () => {
    if (!editModelo.trim()) {
      toast.error("O modelo do veículo é obrigatório.");
      return;
    }

    onUpdateVeiculo(veiculo.id, {
      modelo: editModelo.trim(),
      marca: editMarca.trim(),
      tipo: editTipo,
      ano: Number(editAno),
      dataCompra: editDataCompra,
      valorVeiculo: Number(editValorVeiculo),
      valorFipe: Number(editValorFipe),
      placa: editPlaca.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      renavam: editRenavam.replace(/\D/g, ""),
      crlvDados: editCrlvDados,
      ipvaValor: Number(editIpvaValor),
      ipvaVencimento: editIpvaVencimento,
      ipvaPago: editIpvaPago,
      licenciamentoValor: Number(editLicenciamentoValor),
      licenciamentoVencimento: editLicenciamentoVencimento,
      licenciamentoPago: editLicenciamentoPago
    });

    toast.success("Cadastro e controle de IPVA/Licenciamento atualizados!");
    setIsEditingDynamic(false);
  };

  // Seguro Restante calculado dinamicamente
  const seguroRestanteText = (() => {
    const dateStr = seguro?.vigenciaFim || veiculo.vencimentoSeguro;
    if (!dateStr) return "Sem Seguro";
    try {
      const endDate = parseDateLocal(dateStr);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) return "Vencido";
      if (diffDays <= 30) return `${diffDays} Dias`;
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'Mês' : 'Meses'}`;
    } catch {
      return "Sem Seguro";
    }
  })();

  return (
    <div className="space-y-4">
      {/* CARD PRINCIPAL DA TELA */}
      <section className="relative w-full rounded-3xl bg-card border border-border/80 shadow-sm overflow-hidden p-6 lg:p-8">
        
        {/* APENAS ÍCONE DE EDITAR CADASTRO NO CANTO SUPERIOR DIREITO (SEM TEXTO) */}
        <div className="absolute top-6 right-6 z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-9 h-9 rounded-2xl bg-muted/50 hover:bg-muted border border-border/60 transition-colors shadow-sm"
            title="Editar Cadastro do Veículo e Controle de Tributos"
            onClick={() => setIsEditingDynamic(!isEditingDynamic)}
          >
            {isEditingDynamic ? <X className="w-4 h-4 text-muted-foreground" /> : <Pencil className="w-4 h-4 text-primary" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 relative z-10">
          
          {/* LADO ESQUERDO: IDENTIFICAÇÃO & MÉTRICAS */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            <div>
              <h1 className="font-display font-black text-3xl lg:text-4xl text-foreground tracking-tight leading-none mb-1.5">
                {veiculo.modelo}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {veiculo.marca || "Marca"} • Ano Fab./Mod. {veiculo.ano}/{veiculo.ano}
              </p>
            </div>

            {/* PÍLULAS DE PLACA & RENAVAM (ÍCONE DE PLACA E FOLHA DE IMPOSTO) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Placa com Ícone de Placa/Cartão */}
              <div 
                onClick={() => handleCopy(veiculo.placa || "", "placa")}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 transition-all cursor-pointer select-none"
              >
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Placa Mercosul</span>
                  <span className="font-mono text-xs font-black tracking-wider text-foreground">
                    {veiculo.placa || "NÃO INF."}
                  </span>
                </div>
                {copiedPlaca ? (
                  <Check className="w-3.5 h-3.5 text-primary ml-1" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-1" />
                )}
              </div>

              {/* RENAVAM com Ícone de Folha de Imposto */}
              <div 
                onClick={() => handleCopy(veiculo.renavam || "", "renavam")}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 transition-all cursor-pointer select-none"
              >
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">RENAVAM</span>
                  <span className="font-mono text-xs font-black tracking-wider text-foreground">
                    {veiculo.renavam || "NÃO INF."}
                  </span>
                </div>
                {copiedRenavam ? (
                  <Check className="w-3.5 h-3.5 text-primary ml-1" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors ml-1" />
                )}
              </div>
            </div>

            {/* MECHANICAL & STATUS METRICS DOCK (IPVA E LICENCIAMENTO COM BADGES QUITADO/PENDENTE DENTRO DO CARD) */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/30 border border-border/60">
              {/* IPVA */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-wider">IPVA</span>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-tight w-max",
                  veiculo.ipvaPago !== false ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}>
                  {veiculo.ipvaPago !== false ? <CheckCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {veiculo.ipvaPago !== false ? "Quitado" : "Pendente"}
                </span>
              </div>

              {/* LICENCIAMENTO */}
              <div className="flex flex-col border-x border-border/40 px-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Licenciamento</span>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-tight w-max",
                  veiculo.licenciamentoPago !== false ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                )}>
                  {veiculo.licenciamentoPago !== false ? <CheckCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {veiculo.licenciamentoPago !== false ? "Quitado" : "Pendente"}
                </span>
              </div>

              {/* SEGURO RESTANTE */}
              <div className="flex flex-col pl-1">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider truncate">Seguro Restante</span>
                </div>
                <span className="text-xs font-black text-foreground tracking-tight truncate">
                  {seguroRestanteText}
                </span>
              </div>
            </div>

          </div>

          {/* LADO DIREITO: FOTO DO VEÍCULO COM DUPLO CLIQUE PARA ATIVAR SEÇÃO DE FOTO */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[260px] lg:min-h-[300px]">
            <div 
              onDoubleClick={() => setShowPhotoSection(!showPhotoSection)}
              className="relative group cursor-pointer w-full flex items-center justify-center rounded-3xl p-4 hover:bg-accent/20 transition-colors select-none"
              title="Duplo clique para alterar foto"
            >
              {veiculo.fotoUrl ? (
                <img 
                  src={veiculo.fotoUrl} 
                  alt={veiculo.modelo}
                  className="max-h-[280px] w-auto object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-muted/40 border-2 border-dashed border-border/80 hover:border-primary/50 transition-all text-center w-full max-w-md h-[220px]">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    {veiculo.tipo === 'moto' ? <MotorcycleIcon className="w-8 h-8" /> :
                     veiculo.tipo === 'caminhao' ? <Truck className="w-8 h-8" /> :
                     <Car className="w-8 h-8" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Nenhuma foto cadastrada</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PAINEL DINÂMICO PARA SELEÇÃO / ALTERAÇÃO DE FOTO (INLINE) */}
      {showPhotoSection && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h4 className="text-sm font-black text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Alterar Foto do Veículo
            </h4>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => setShowPhotoSection(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold mb-2 block">Enviar Imagem Local</Label>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                className="w-full h-10 rounded-xl border-dashed gap-2 text-xs font-bold"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 text-primary" /> Selecionar do Computador
              </Button>
            </div>

            <div>
              <Label className="text-xs font-bold mb-2 block">Link da Foto (URL)</Label>
              <div className="flex gap-2">
                <Input 
                  value={photoInputUrl}
                  onChange={e => setPhotoInputUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="h-10 text-xs rounded-xl"
                />
                <Button onClick={handleSavePhotoUrl} className="h-10 rounded-xl text-xs font-bold px-4">
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL DE EDIÇÃO DINÂMICA DE CADASTRO COMPLETO + GESTOR DE CONTROLE DE IPVA & LICENCIAMENTO ANUAL (INLINE) */}
      {isEditingDynamic && (
        <div className="p-6 lg:p-8 rounded-3xl bg-card border border-border shadow-md space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h3 className="font-display font-black text-lg text-foreground flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" /> Edição Dinâmica do Cadastro & Controle de Tributos
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Altere os dados cadastrais e o controle de IPVA / Licenciamento Anual diretamente em tela.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0" onClick={() => setIsEditingDynamic(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* DADOS CADASTRAIS DO VEÍCULO */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-primary tracking-wider">1. Especificações do Veículo</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Modelo</Label>
                <Input 
                  value={editModelo}
                  onChange={e => setEditModelo(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Marca / Fabricante</Label>
                <Input 
                  value={editMarca}
                  onChange={e => setEditMarca(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Veículo</Label>
                <Select value={editTipo} onValueChange={v => setEditTipo(v as 'carro' | 'moto' | 'caminhao')}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Motocicleta</SelectItem>
                    <SelectItem value="caminhao">Caminhão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Placa Mercosul</Label>
                <Input 
                  value={editPlaca}
                  onChange={e => setEditPlaca(e.target.value)}
                  className="h-10 text-xs font-mono font-bold uppercase rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">RENAVAM</Label>
                <Input 
                  value={editRenavam}
                  onChange={e => setEditRenavam(e.target.value)}
                  className="h-10 text-xs font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ano Fabricação/Modelo</Label>
                <Input 
                  type="number"
                  value={editAno}
                  onChange={e => setEditAno(Number(e.target.value))}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Valor da Compra (R$)</Label>
                <Input 
                  type="number"
                  value={editValorVeiculo}
                  onChange={e => setEditValorVeiculo(Number(e.target.value))}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Valor FIPE Atual (R$)</Label>
                <Input 
                  type="number"
                  value={editValorFipe}
                  onChange={e => setEditValorFipe(Number(e.target.value))}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data da Aquisição</Label>
                <Input 
                  type="date"
                  value={editDataCompra}
                  onChange={e => setEditDataCompra(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* GESTOR DE CONTROLE DE IPVA & LICENCIAMENTO ANUAL (INCORPORADO NA EDIÇÃO DINÂMICA) */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <h4 className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 2. Gestor de Controle de IPVA & Licenciamento Anual
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Controle de IPVA */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase flex items-center gap-1.5 text-foreground">
                    <Receipt className="w-4 h-4 text-primary" /> IPVA Exercício
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className={cn(
                      "h-7 text-[10px] font-black uppercase rounded-lg px-2.5",
                      editIpvaPago ? "text-primary border-primary/30" : "text-amber-600 border-amber-500/30"
                    )}
                    onClick={() => setEditIpvaPago(!editIpvaPago)}
                  >
                    {editIpvaPago ? "Marcar Pendente" : "Marcar Quitado"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Valor do IPVA (R$)</Label>
                    <Input 
                      type="number"
                      value={editIpvaValor}
                      onChange={e => setEditIpvaValor(Number(e.target.value))}
                      className="h-9 text-xs font-bold rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Vencimento</Label>
                    <Input 
                      type="date"
                      value={editIpvaVencimento}
                      onChange={e => setEditIpvaVencimento(e.target.value)}
                      className="h-9 text-xs font-bold rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Controle de Licenciamento */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase flex items-center gap-1.5 text-foreground">
                    <FileCheck className="w-4 h-4 text-primary" /> Licenciamento DETRAN
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className={cn(
                      "h-7 text-[10px] font-black uppercase rounded-lg px-2.5",
                      editLicenciamentoPago ? "text-primary border-primary/30" : "text-amber-600 border-amber-500/30"
                    )}
                    onClick={() => setEditLicenciamentoPago(!editLicenciamentoPago)}
                  >
                    {editLicenciamentoPago ? "Marcar Pendente" : "Marcar Quitado"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Taxa Licenciamento (R$)</Label>
                    <Input 
                      type="number"
                      value={editLicenciamentoValor}
                      onChange={e => setEditLicenciamentoValor(Number(e.target.value))}
                      className="h-9 text-xs font-bold rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Vencimento</Label>
                    <Input 
                      type="date"
                      value={editLicenciamentoVencimento}
                      onChange={e => setEditLicenciamentoVencimento(e.target.value)}
                      className="h-9 text-xs font-bold rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observações adicionais CRLV / Notas */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <Label className="text-xs font-bold">Observações do CRLV / Notas</Label>
            <Textarea 
              value={editCrlvDados} 
              onChange={e => setEditCrlvDados(e.target.value)} 
              rows={2} 
              className="text-xs rounded-xl font-medium" 
              placeholder="Anotações adicionais do documento..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant="ghost" onClick={() => setIsEditingDynamic(false)} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSaveDynamicEdit} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2 px-6">
              <Check className="w-4 h-4" /> Salvar Alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
