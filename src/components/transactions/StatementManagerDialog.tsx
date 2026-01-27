import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Check, Loader2, Pin, Eye, Trash2, Sparkles, Building2, Calendar, ArrowLeft } from "lucide-react";
import { ImportedStatement } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { parseDateLocal, cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface StatementManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAccountId?: string;
  onStartConsolidatedReview: (accountId: string) => void;
  onManageRules: () => void;
}

export function StatementManagerDialog({ open, onOpenChange, initialAccountId, onStartConsolidatedReview, onManageRules }: StatementManagerDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { 
    contasMovimento,
    importedStatements, 
    processStatementFile, 
    deleteImportedStatement,
  } = useFinance();
  
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId || '');

  const corrienteAccounts = useMemo(() => 
    contasMovimento.filter(a => a.accountType === 'corrente' && !a.hidden),
    [contasMovimento]
  );

  const statementsForAccount = useMemo(() => {
    return importedStatements.filter(s => s.accountId === selectedAccountId);
  }, [importedStatements, selectedAccountId]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.csv') && !fileName.endsWith('.ofx')) {
            setError("Formato inválido. Use .csv ou .ofx.");
            setFile(null);
            return;
        }
        setFile(selectedFile);
        setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedAccountId) {
      toast.error("Selecione a conta destino antes de importar.");
      return;
    }
    if (!file) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await processStatementFile(file, selectedAccountId);
      if (result.success) {
        toast.success(result.message);
        setFile(null);
      } else setError(result.message);
    } catch (e: any) {
      setError(e.message || "Erro no processamento.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[52rem] max-h-[90vh] rounded-[2.5rem]"
        )}
      >
        <DialogHeader className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6 bg-surface-light dark:bg-surface-dark relative">
          {isMobile && (
            <Button variant="ghost" size="icon" className="absolute left-4 top-4 rounded-full h-10 w-10" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          
          <div className={cn("flex items-center gap-4 mb-4", isMobile && "pl-12")}>
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-lg shadow-accent/5">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">Importação</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Alimente sua inteligência
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Conta Alvo</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-12 border-2 rounded-2xl bg-card hover:border-primary/30 transition-all">
                <SelectValue placeholder="Escolha a conta..." />
              </SelectTrigger>
              <SelectContent>
                {corrienteAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span className="font-bold">{a.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-4 sm:pb-8 space-y-6 sm:space-y-8">
            <div 
              className={cn(
                  "p-8 border-3 border-dashed rounded-[2rem] text-center space-y-4 transition-all",
                  isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border/40 bg-muted/20"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
            >
              <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mx-auto shadow-sm">
                <Upload className={cn("w-7 h-7", isDragging ? "text-primary animate-bounce" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="font-black text-foreground">Arraste seu arquivo aqui</p>
                <p className="text-xs text-muted-foreground mt-1">Suporta formatos .CSV e .OFX</p>
              </div>
              
              <Input type="file" accept=".csv,.ofx" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} className="hidden" id="file-upload" />
              <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center rounded-full text-xs font-black uppercase tracking-widest h-10 px-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all">
                {file ? file.name : "Selecionar Arquivo"}
              </Label>
              
              {file && (
                <Button onClick={handleUpload} disabled={loading} className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-dark font-bold text-base gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {loading ? "Processando..." : "Confirmar Importação"}
                </Button>
              )}
            </div>
            
            {selectedAccountId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Histórico ({statementsForAccount.length})</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-primary gap-1" onClick={onManageRules}>
                    <Pin className="w-3 h-3" /> Regras
                  </Button>
                </div>
                
                <div className="space-y-2">
                    {statementsForAccount.map(stmt => {
                        const pending = stmt.rawTransactions.filter(t => !t.isContabilized).length;
                        return (
                            <div key={stmt.id} className="p-4 rounded-2xl bg-card border border-border/40 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-muted/50"><FileText className="w-4 h-4 text-muted-foreground" /></div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-[200px]">{stmt.fileName}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            {format(parseDateLocal(stmt.startDate), 'dd/MM/yy')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={cn("text-[9px] font-black border-none", pending === 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                                        {pending === 0 ? "OK" : `${pending} P`}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10" onClick={() => deleteImportedStatement(stmt.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
              </div>
            )}
        </div>
        
        <DialogFooter className="p-4 sm:p-6 bg-surface-light dark:bg-surface-dark border-t flex flex-col sm:flex-row gap-2 sm:gap-3">
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              FECHAR
            </Button>
          )}
          <Button 
            disabled={statementsForAccount.length === 0 || !selectedAccountId}
            onClick={() => { onOpenChange(false); onStartConsolidatedReview(selectedAccountId); }}
            className="flex-1 rounded-full h-11 bg-neutral-800 text-white dark:bg-white dark:text-black font-bold text-sm gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-black/10 order-1 sm:order-2"
          >
            <Eye className="w-4 h-4" /> Revisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}