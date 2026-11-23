"use client";

import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { initiateGoogleAuth, logoutGoogleDrive } from "@/lib/googleDrive";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Cloud, LogOut } from "lucide-react";
import { AnimatedCloudUpload, AnimatedCloudDownload } from "@/components/ui/CloudSyncIcons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function GoogleDriveSync() {
  const { isConnected, isSyncing, syncAction, lastSync, saveToDrive, loadFromDrive } = useGoogleDrive();
  const isUploading = isSyncing && syncAction === "upload";
  const isDownloading = isSyncing && syncAction === "download";
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
        billsTracker: finance.billsTracker, 
        standardizationRules: finance.standardizationRules, 
        importedStatements: finance.importedStatements, 
        revenueForecasts: finance.revenueForecasts, 
        imoveis: finance.imoveis, 
        terrenos: finance.terrenos,
        creditCardConfigs: finance.creditCardConfigs,
        cltContracts: finance.cltContracts,
        cltCompetencias: finance.cltCompetencias,
        cltLegislacaoConfigs: finance.cltLegislacaoConfigs,
        cltHolerites: finance.cltHolerites,
        vinculosOcupacionais: finance.vinculosOcupacionais,
        recebiveisParcelados: finance.recebiveisParcelados,
        parcelasRecebiveis: finance.parcelasRecebiveis,
        eventosFerias: finance.eventosFerias,
        eventosRescisao: finance.eventosRescisao,
        historicosContribuicaoINSS: finance.historicosContribuicaoINSS,
        ignoredTxIds: finance.ignoredTxIds,
        pluggyConfig: finance.pluggyConfig,
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
          className={cn(
            "flex-1 justify-start h-14 rounded-[1.75rem] border-border/60 gap-3 group active:scale-[0.98] transition-all overflow-hidden",
            isUploading && "border-primary/40 bg-primary/5 disabled:opacity-100"
          )}
        >
          <div className={cn(
            "p-2.5 rounded-xl transition-colors shrink-0",
            isUploading ? "bg-primary/15 text-primary" : "bg-success/10 text-success"
          )}>
            <AnimatedCloudUpload size={20} isAnimating={isUploading} className="w-5 h-5" />
          </div>
          <div className="text-left min-w-0 overflow-hidden">
            <p className="text-sm font-bold truncate">
              {isUploading ? "Sincronizando..." : "Sincronizar"}
            </p>
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
          className={cn(
            "h-14 w-12 rounded-2xl shrink-0 transition-all",
            isDownloading
              ? "text-primary bg-primary/10 border-primary/40 disabled:opacity-100"
              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
          )}
          title="Baixar dados"
        >
          <AnimatedCloudDownload size={20} isAnimating={isDownloading} className="w-5 h-5" />
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