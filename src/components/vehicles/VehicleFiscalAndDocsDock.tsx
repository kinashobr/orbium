"use client";

import { useState, useRef } from "react";
import { Veiculo, VehicleDocument, formatCurrency } from "@/types/finance";
import { 
  Building2, 
  CheckCheck, 
  Receipt, 
  FileCheck, 
  FolderArchive, 
  FileText, 
  ShieldAlert, 
  Download, 
  Upload, 
  Plus, 
  Check, 
  Pencil,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VehicleFiscalAndDocsDockProps {
  veiculo: Veiculo;
  onUpdateVeiculo: (id: number, updates: Partial<Veiculo>) => void;
  onToggleDynamicEdit?: () => void;
}

export function VehicleFiscalAndDocsDock({ veiculo, onUpdateVeiculo, onToggleDynamicEdit }: VehicleFiscalAndDocsDockProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tributos
  const ipvaVal = veiculo.ipvaValor || 345.29;
  const ipvaPago = veiculo.ipvaPago !== false;
  const licVal = veiculo.licenciamentoValor || 94.61;
  const licPago = veiculo.licenciamentoPago !== false;

  // Documentos cadastrados no veículo (sem hardcode estático)
  const docsList: VehicleDocument[] = veiculo.documentos || [];

  const handleToggleIpva = () => {
    onUpdateVeiculo(veiculo.id, { ipvaPago: !ipvaPago });
    toast.success(`IPVA marcado como ${!ipvaPago ? "Quitado" : "Pendente"}`);
  };

  const handleToggleLic = () => {
    onUpdateVeiculo(veiculo.id, { licenciamentoPago: !licPago });
    toast.success(`Licenciamento marcado como ${!licPago ? "Quitado" : "Pendente"}`);
  };

  // Direct File Upload handler (without intermediate modal)
  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const cleanFileName = file.name.replace(/\.[^/.]+$/, ""); // Nome do arquivo sem extensão

      const newDoc: VehicleDocument = {
        id: `doc_${Date.now()}`,
        nome: cleanFileName || file.name,
        tipo: file.type.includes("pdf") ? "PDF Digital" : "Imagem / Laudo",
        data: format(new Date(), "yyyy-MM-dd"),
        fileData: dataUrl,
        tamanho: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      };

      onUpdateVeiculo(veiculo.id, {
        documentos: [...docsList, newDoc]
      });

      toast.success("Documento carregado no cofre com sucesso!");
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Inline editing save
  const handleSaveInlineName = (docId: string) => {
    if (!editingDocName.trim()) {
      setEditingDocId(null);
      return;
    }

    const updatedDocs = docsList.map(doc => {
      if (doc.id === docId) {
        return { ...doc, nome: editingDocName.trim() };
      }
      return doc;
    });

    onUpdateVeiculo(veiculo.id, { documentos: updatedDocs });
    setEditingDocId(null);
    setEditingDocName("");
    toast.success("Nome do documento atualizado!");
  };

  // Delete doc
  const handleDeleteDoc = (docId: string) => {
    const updatedDocs = docsList.filter(d => d.id !== docId);
    onUpdateVeiculo(veiculo.id, { documentos: updatedDocs });
    toast.success("Documento removido do cofre.");
  };

  // Download doc
  const handleDownloadDoc = (doc: VehicleDocument) => {
    if (doc.fileData) {
      const link = document.createElement("a");
      link.href = doc.fileData;
      link.download = `${doc.nome}.pdf`;
      link.click();
      toast.success(`Download de ${doc.nome}`);
    } else {
      toast.info(`Download de ${doc.nome}`);
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* SEFAZ & DETRAN STATUS DOCK - COM DUPLO CLIQUE PARA ATIVAR EDIÇÃO DINÂMICA */}
      <div 
        onDoubleClick={() => onToggleDynamicEdit?.()}
        className="lg:col-span-7 flex flex-col justify-between p-6 lg:p-7 rounded-3xl bg-card border border-border/80 shadow-sm gap-4 transition-colors select-none cursor-pointer hover:border-primary/40"
        title="Duplo clique para editar o cadastro fiscal do veículo em tela"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base lg:text-lg text-foreground">Obrigações Tributárias 2026</h3>
              <span className="text-xs font-bold uppercase text-muted-foreground">Status Fazendário de São Paulo / Brasil</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* IPVA Capsule */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleToggleIpva();
            }}
            className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 hover:bg-muted border border-border/50 transition-all cursor-pointer select-none group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-primary shadow-sm border border-border/50">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">IPVA Exercício 2026</span>
                <span className="font-mono text-sm font-black text-foreground">{formatCurrency(ipvaVal)}</span>
              </div>
            </div>

            <span className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono transition-colors",
              ipvaPago ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}>
              {ipvaPago ? <CheckCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {ipvaPago ? "Quitado" : "Pendente"}
            </span>
          </div>

          {/* Licenciamento Capsule */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLic();
            }}
            className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 transition-all cursor-pointer select-none group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-primary shadow-sm border border-border/50">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Licenciamento Anual</span>
                <span className="font-mono text-sm font-black text-foreground">{formatCurrency(licVal)}</span>
              </div>
            </div>

            <span className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono transition-colors",
              licPago ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}>
              {licPago ? <CheckCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {licPago ? "Quitado" : "Pendente"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground italic">
          <span>💡 Clique nos cards para alternar quitação ou duplo clique para editar.</span>
        </div>
      </div>

      {/* COFRE DE DOCUMENTOS (SEM HARDCODE, COM EDIT INLINE & UPLOAD DIRETO) */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 lg:p-7 rounded-3xl bg-card border border-border/80 shadow-sm gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-foreground">
              <FolderArchive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-black text-base lg:text-lg text-foreground">Cofre de Documentos</h3>
              <span className="text-xs font-bold uppercase text-muted-foreground">Certificados & Acesso Rápido</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground font-mono text-xs font-bold">
            {docsList.length} {docsList.length === 1 ? 'Arquivo' : 'Arquivos'}
          </span>
        </div>

        {/* LISTA DE DOCUMENTOS OU PLACEHOLDER DE CONVITE */}
        {docsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-muted/30 border-2 border-dashed border-border/70 my-2">
            <Upload className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <span className="text-xs font-bold text-foreground block">Nenhum documento anexado</span>
            <span className="text-[11px] text-muted-foreground">
              Envie o CRLV-e, Apólice ou Comprovantes no botão abaixo.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
            {docsList.map((doc) => (
              <div 
                key={doc.id}
                className="group flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted border border-border/40 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>

                  {/* EDICAO INLINE DO NOME DO DOCUMENTO */}
                  {editingDocId === doc.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input 
                        value={editingDocName}
                        onChange={e => setEditingDocName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveInlineName(doc.id);
                          if (e.key === "Escape") setEditingDocId(null);
                        }}
                        className="h-7 text-xs font-bold rounded-lg px-2"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        className="w-7 h-7 rounded-lg bg-primary text-primary-foreground shrink-0" 
                        onClick={() => handleSaveInlineName(doc.id)}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => {
                            setEditingDocId(doc.id);
                            setEditingDocName(doc.nome);
                          }}
                          className="text-xs font-bold text-foreground leading-tight truncate hover:underline cursor-pointer"
                          title="Clique para editar o nome"
                        >
                          {doc.nome}
                        </span>
                        <Pencil 
                          onClick={() => {
                            setEditingDocId(doc.id);
                            setEditingDocName(doc.nome);
                          }}
                          className="w-3 h-3 text-muted-foreground/60 hover:text-primary cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium truncate">
                        {doc.tipo} • {doc.tamanho || 'Anexo'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="w-8 h-8 rounded-xl bg-card text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm"
                    title="Baixar Documento"
                    onClick={() => handleDownloadDoc(doc)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="w-8 h-8 rounded-xl bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-sm"
                    title="Remover Documento"
                    onClick={() => handleDeleteDoc(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INPUT DE ARQUIVO DIRETO (SEM MODAL INTERMEDIÁRIO) */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="application/pdf,image/*" 
          className="hidden" 
          onChange={handleDirectFileUpload}
        />

        {/* BOTAO DIRETO DE UPLOAD */}
        <Button 
          variant="outline" 
          className="flex items-center justify-center gap-2 h-11 rounded-2xl text-xs font-bold bg-muted/50 hover:bg-muted border-dashed border-2 hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="w-4 h-4 text-primary" /> Anexar CRLV-e / Apólice / Documento
        </Button>
      </div>

    </section>
  );
}
