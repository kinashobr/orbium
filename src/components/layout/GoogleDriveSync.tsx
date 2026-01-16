"use client";

import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { initiateGoogleAuth, logoutGoogleDrive } from "@/lib/googleDrive";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, CloudSync, RefreshCw, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GoogleDriveSync() {
  const { isConnected, isSyncing, lastSync, saveToDrive } = useGoogleDrive();
  const finance = useFinance();

  const handleSync = () => {
    // Coleta todos os dados do contexto para salvar
    const dataToSave = {
      accounts: finance.contasMovimento,
      categories: finance.categoriasV2,
      transactions: finance.transacoesV2,
      emprestimos: finance.emprestimos,
      veiculos: finance.veiculos,
      segurosVeiculo: finance.segurosVeiculo,
      objetivos: finance.objetivos,
      billsTracker: finance.billsTracker,
      imoveis: finance.imoveis,
      terrenos: finance.terrenos,
    };
    saveToDrive(dataToSave);
  };

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        onClick={initiateGoogleAuth}
        className="w-full justify-start h-14 rounded-[1.75rem] border-dashed border-2 border-border/60 gap-4 group active:scale-[0.98] transition-all"
      >
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          <Cloud className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold">Nuvem (Drive)</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Conectar p/ backup</p>
        </div>
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex-1 justify-start h-14 rounded-[1.75rem] border-border/60 gap-4 group active:scale-[0.98] transition-all overflow-hidden relative"
        >
          <div className={cn(
            "p-2.5 rounded-xl transition-colors",
            isSyncing ? "bg-accent/20 text-accent" : "bg-success/10 text-success"
          )}>
            {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudSync className="w-5 h-5" />}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-bold truncate">Sincronizado</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-tighter truncate">
              {lastSync ? `Última: ${format(new Date(lastSync), "HH:mm 'de' dd/MM", { locale: ptBR })}` : "Pendente"}
            </p>
          </div>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm("Desconectar do Google Drive?")) {
              logoutGoogleDrive();
              window.location.reload();
            }
          }}
          className="h-14 w-12 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}