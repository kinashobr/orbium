"use client";

import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { initiateGoogleAuth, logoutGoogleDrive } from "@/lib/googleDrive";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Cloud, RefreshCw, LogOut, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function GoogleDriveSync() {
  const { isConnected, isSyncing, lastSync, saveToDrive, loadFromDrive } = useGoogleDrive();
  const finance = useFinance();

  const handleSync = () => {
    const dataToSave = {
      schemaVersion: "2.0", 
      exportedAt: new Date().toISOString(), 
      data: { 
        accounts: finance.contasMovimento, 
        categories: finance.categoriasV2, 
        transactions: finance.transacoesV2, 
        emprestimos: finance.emprestimos, 
        veiculos: finance.veiculos, 
        segurosVeiculo: finance.segurosVeiculo, 
        objetivos: finance.objetivos, 
        billsTracker: finance.billsTracker, 
        standardizationRules: finance.standardizationRules, 
        importedStatements: finance.importedStatements, 
        revenueForecasts: finance.revenueForecasts, 
        alertStartDate: finance.alertStartDate, 
        imoveis: finance.imoveis, 
        terrenos: finance.terrenos,
        metasPersonalizadas: finance.metasPersonalizadas,
      },
      lastModified: finance.lastModified,
    };
    saveToDrive(dataToSave);
  };
  
  const handleLoad = async () => {
    await loadFromDrive();
  };

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        onClick={initiateGoogleAuth}
        className="w-full justify-start h-14 rounded-[1.75rem] border-dashed border-2 border-border/60 gap-3 group active:scale-[0.98] transition-all"
      >
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
          <Cloud className="w-5 h-5" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-sm font-bold truncate">Nuvem (Drive)</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest truncate">Conectar p/ backup</p>
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
          className="flex-1 justify-start h-14 rounded-[1.75rem] border-border/60 gap-3 group active:scale-[0.98] transition-all overflow-hidden"
        >
          <div className={cn(
            "p-2.5 rounded-xl transition-colors shrink-0",
            isSyncing ? "bg-accent/20 text-accent" : "bg-success/10 text-success"
          )}>
            {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
          </div>
          <div className="text-left min-w-0 overflow-hidden">
            <p className="text-sm font-bold truncate">Sincronizar</p>
            <p className="text-[9px] text-muted-foreground uppercase font-black whitespace-nowrap">
              {lastSync ? `Última: ${lastSync}` : "Pendente"}
            </p>
          </div>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleLoad}
          disabled={isSyncing}
          className="h-14 w-12 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0"
          title="Baixar dados"
        >
          <Download className="w-5 h-5" />
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
          className="h-14 w-12 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0"
          title="Desconectar"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}