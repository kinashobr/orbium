"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { MetaPersonalizada } from "@/types/finance";
import { MetaPersonalizadaFormModal } from "@/components/dashboard/MetaPersonalizadaFormModal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Pencil, Plus, Target, Trash2, ArrowLeft } from "lucide-react";

interface ObjectivesConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObjectivesConfigDialog({ open, onOpenChange }: ObjectivesConfigDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { metasPersonalizadas, addMetaPersonalizada, updateMetaPersonalizada, deleteMetaPersonalizada } = useFinance();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaPersonalizada | null>(null);

  const metasObjetivos = useMemo(
    () => metasPersonalizadas.filter((m) => ["investimento", "patrimonio", "saldo"].includes(m.metrica)),
    [metasPersonalizadas],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          fullscreen={isMobile}
          className={cn("p-0 shadow-2xl bg-card flex flex-col", !isMobile && "max-w-[34rem] h-[85vh] rounded-[2rem]")}
        >
          <DialogHeader
            className={cn(
              "px-6 sm:px-8 pt-6 sm:pt-10 pb-4 bg-muted/30 shrink-0 border-b relative",
              isMobile && "px-4 pt-4 pb-3",
            )}
            style={isMobile ? { paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" } : undefined}
          >
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="absolute left-2 top-2 rounded-full h-8 w-8"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            <div className={cn("flex items-center justify-between gap-4", isMobile && "pl-8")}> 
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="font-black tracking-tight text-xl sm:text-2xl">Objetivos</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                    Configuração de metas de investimentos
                  </DialogDescription>
                </div>
              </div>

              <Button
                onClick={() => {
                  setEditingMeta(null);
                  setFormOpen(true);
                }}
                size="sm"
                className="rounded-full h-10 px-5 font-bold gap-2"
              >
                <Plus className="w-4 h-4" /> Criar
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className={cn("flex-1 scrollbar-material", isMobile ? "px-4" : "px-6 sm:px-8")}> 
            <div className="py-5 sm:py-7 space-y-3 pb-24">
              {metasObjetivos.map((meta) => (
                <div
                  key={meta.id}
                  className={cn(
                    "rounded-[1.5rem] sm:rounded-[2rem] border border-border/40 bg-card/60 backdrop-blur-sm",
                    "p-4 sm:p-5 flex items-center justify-between gap-3",
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm sm:text-base truncate">{meta.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-none bg-muted/40 text-muted-foreground text-[9px] font-black uppercase tracking-widest">
                          {meta.metrica}
                        </Badge>
                        <Badge variant="outline" className="border-none bg-muted/40 text-muted-foreground text-[9px] font-black uppercase tracking-widest">
                          {meta.periodoAvaliacao}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("rounded-full", isMobile ? "h-7 w-7" : "h-9 w-9")}
                      onClick={() => {
                        setEditingMeta(meta);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className={cn(isMobile ? "w-3 h-3" : "w-4 h-4")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("rounded-full text-destructive", isMobile ? "h-7 w-7" : "h-9 w-9")}
                      onClick={() => deleteMetaPersonalizada(meta.id)}
                    >
                      <Trash2 className={cn(isMobile ? "w-3 h-3" : "w-4 h-4")} />
                    </Button>
                    <div className="ml-1">
                      <Switch
                        checked={meta.ativo}
                        onCheckedChange={() => updateMetaPersonalizada(meta.id, { ativo: !meta.ativo })}
                        className={cn(isMobile && "scale-[0.65] origin-right")}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {metasObjetivos.length === 0 && (
                <div className="py-10 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                    <Target className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Nenhum objetivo configurado</p>
                  <p className="mt-2 text-xs text-muted-foreground">Crie uma meta de investimento/patrimônio/saldo para acompanhar aqui.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <MetaPersonalizadaFormModal
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingMeta(null);
        }}
        meta={editingMeta}
        onSave={(m) => {
          if (editingMeta) updateMetaPersonalizada(m.id, m);
          else addMetaPersonalizada(m);
          setEditingMeta(null);
        }}
      />
    </>
  );
}
