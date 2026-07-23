import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building2, TrendingUp, TrendingDown, 
  CheckCircle2, AlertTriangle, Download, RefreshCw, X, ArrowRight, ArrowLeft,
  Printer, FileText, FileSpreadsheet
} from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, AccountSummary, 
  formatCurrency, ACCOUNT_TYPE_LABELS, ComparisonDateRanges
} from "@/types/finance";
import { TransactionTable } from "./TransactionTable";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { cn, parseDateLocal, getAccountIcon } from "@/lib/utils";
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from "date-fns";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// --- Export helpers ---

function generatePrintHTML(account: ContaCorrente, transactions: TransacaoCompleta[], summary: { totalIn: number; totalOut: number; initialBalance: number; finalBalance: number }, dateRange: { from?: Date; to?: Date }) {
  const periodStr = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`
    : 'Período completo';

  const rows = transactions.map(t => {
    const date = parseDateLocal(t.date);
    const isOut = t.flow === 'out' || t.flow === 'transfer_out';
    return `<tr>
      <td>${format(date, 'dd/MM/yyyy')}</td>
      <td>${t.description}</td>
      <td style="color:${isOut ? '#dc2626' : '#16a34a'};text-align:right">${isOut ? '-' : '+'}${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${t.categoryId || '-'}</td>
      <td style="text-align:center">${t.conciliated ? '✓' : '—'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Extrato - ${account.name}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:2rem;color:#1a1a1a}
  h1{font-size:1.4rem;margin-bottom:.25rem}
  .meta{color:#666;font-size:.85rem;margin-bottom:1.5rem}
  .summary{display:flex;gap:2rem;margin-bottom:1.5rem;padding:1rem;background:#f5f5f5;border-radius:8px}
  .summary div{text-align:center}
  .summary .label{font-size:.7rem;text-transform:uppercase;color:#888;letter-spacing:.05em}
  .summary .value{font-size:1.1rem;font-weight:700;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:.85rem}
  th{text-align:left;border-bottom:2px solid #e5e5e5;padding:.5rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#888}
  td{padding:.4rem .5rem;border-bottom:1px solid #f0f0f0}
  @media print{body{margin:1rem}button{display:none!important}}
</style></head><body>
<h1>${account.name}</h1>
<p class="meta">${ACCOUNT_TYPE_LABELS[account.accountType]} · ${periodStr} · ${transactions.length} transações</p>
<div class="summary">
  <div><span class="label">Saldo Inicial</span><div class="value">${formatCurrency(summary.initialBalance)}</div></div>
  <div><span class="label">Entradas</span><div class="value" style="color:#16a34a">${formatCurrency(summary.totalIn)}</div></div>
  <div><span class="label">Saídas</span><div class="value" style="color:#dc2626">${formatCurrency(summary.totalOut)}</div></div>
  <div><span class="label">Saldo Final</span><div class="value">${formatCurrency(summary.finalBalance)}</div></div>
</div>
<table><thead><tr><th>Data</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Categoria</th><th style="text-align:center">Conc.</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=()=>window.print()</script>
</body></html>`;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateOFX(account: ContaCorrente, transactions: TransacaoCompleta[], dateRange: { from?: Date; to?: Date }): string {
  const now = new Date();
  const dtServer = format(now, 'yyyyMMddHHmmss');
  const dtStart = dateRange.from ? format(dateRange.from, 'yyyyMMdd') : format(now, 'yyyyMMdd');
  const dtEnd = dateRange.to ? format(dateRange.to, 'yyyyMMdd') : format(now, 'yyyyMMdd');

  const stmtTrns = transactions.map(t => {
    const isOut = t.flow === 'out' || t.flow === 'transfer_out';
    const amount = isOut ? -t.amount : t.amount;
    const dtPosted = format(parseDateLocal(t.date), 'yyyyMMdd') + '120000';
    const trnType = isOut ? 'DEBIT' : 'CREDIT';
    return `<STMTTRN>
<TRNTYPE>${trnType}
<DTPOSTED>${dtPosted}
<TRNAMT>${amount.toFixed(2)}
<FITID>${t.id}
<MEMO>${t.description}
</STMTTRN>`;
  }).join('\n');

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${dtServer}
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0000
<ACCTID>${account.name.replace(/\s/g, '_')}
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtStart}120000
<DTEND>${dtEnd}235959
${stmtTrns}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>${(account.initialBalance || 0).toFixed(2)}
<DTASOF>${dtEnd}235959
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

function generateCSV(transactions: TransacaoCompleta[]): string {
  const header = 'Data;Descrição;Valor;Tipo;Categoria;Conciliado';
  const rows = transactions.map(t => {
    const date = format(parseDateLocal(t.date), 'dd/MM/yyyy');
    const isOut = t.flow === 'out' || t.flow === 'transfer_out';
    const valor = `${isOut ? '-' : ''}${t.amount.toFixed(2).replace('.', ',')}`;
    const tipo = t.flow === 'in' ? 'Entrada' : t.flow === 'out' ? 'Saída' : t.flow === 'transfer_in' ? 'Transf. Entrada' : 'Transf. Saída';
    return `${date};"${t.description}";${valor};${tipo};${t.categoryId || ''};${t.conciliated ? 'Sim' : 'Não'}`;
  });
  return [header, ...rows].join('\n');
}

// --- Component ---

interface AccountStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ContaCorrente;
  accountSummary: AccountSummary;
  transactions: TransacaoCompleta[];
  categories: Categoria[];
  onEditTransaction: (transaction: TransacaoCompleta) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onReconcileAll: () => void;
}

export function AccountStatementDialog({
  open,
  onOpenChange,
  account,
  accountSummary,
  transactions,
  categories,
  onEditTransaction,
  onDeleteTransaction,
  onToggleConciliated,
  onReconcileAll
}: AccountStatementDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  
  // Estado para redimensionamento
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('extrato-dialog-size');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            width: Math.min(2000, Math.max(600, parsed.width)),
            height: Math.min(1200, Math.max(400, parsed.height))
          };
        } catch (e) {
          return { width: 1100, height: 700 };
        }
      }
    }
    return { width: 1100, height: 700 };
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  
  const [localDateRanges, setLocalDateRanges] = useState<ComparisonDateRanges>(() => ({
    range1: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    range2: { from: undefined, to: undefined }
  }));

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
    if (!isMobile && !isTablet) {
      localStorage.setItem('extrato-dialog-size', JSON.stringify(size));
    }
  }, [size, isMobile, isTablet]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile || isTablet) return;
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  }, [size, isMobile, isTablet]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;
    const deltaX = e.clientX - resizeRef.current.startX;
    const deltaY = e.clientY - resizeRef.current.startY;
    const newWidth = Math.min(2000, Math.max(600, resizeRef.current.startWidth + deltaX * 2));
    const newHeight = Math.min(1200, Math.max(400, resizeRef.current.startHeight + deltaY * 2));
    setSize({ width: newWidth, height: newHeight });
  }, [isResizing]);

  const onMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, onMouseMove, onMouseUp]);

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setLocalDateRanges(ranges);
  }, []);

  const filteredTransactions = useMemo(() => {
    const { from, to } = localDateRanges.range1;
    if (!from || !to) return transactions.sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());

    const rangeFrom = startOfDay(from);
    const rangeTo = endOfDay(to);

    return transactions
      .filter(t => {
        const transactionDate = parseDateLocal(t.date);
        return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
      })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
  }, [transactions, localDateRanges.range1]);

  const periodSummary = useMemo(() => {
    const conciliatedCount = filteredTransactions.filter(t => t.conciliated).length;
    const pendingCount = filteredTransactions.length - conciliatedCount;
    
    let totalIn = 0;
    let totalOut = 0;
    
    filteredTransactions.forEach(t => {
      if (t.flow === 'in' || t.flow === 'transfer_in') {
        totalIn += t.amount;
      } else if (t.flow === 'out' || t.flow === 'transfer_out') {
        totalOut += t.amount;
      }
    });
    
    return {
      initialBalance: accountSummary.initialBalance, 
      finalBalance: accountSummary.currentBalance,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      conciliatedCount,
      pendingCount,
    };
  }, [filteredTransactions, accountSummary]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';

  // --- Export handlers ---
  const handlePrint = useCallback(() => {
    const html = generatePrintHTML(account, filteredTransactions, periodSummary, localDateRanges.range1);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, [account, filteredTransactions, periodSummary, localDateRanges.range1]);

  const handleExportOFX = useCallback(() => {
    const ofx = generateOFX(account, filteredTransactions, localDateRanges.range1);
    downloadFile(ofx, `extrato_${account.name.replace(/\s/g, '_')}.ofx`, 'application/x-ofx');
  }, [account, filteredTransactions, localDateRanges.range1]);

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV(filteredTransactions);
    downloadFile(csv, `extrato_${account.name.replace(/\s/g, '_')}.csv`, 'text/csv;charset=utf-8');
  }, [account, filteredTransactions]);

  const dialogStyles = isMobile
    ? {}
    : isTablet
    ? { width: `${Math.min(size.width, window.innerWidth * 0.9)}px`, height: `${Math.min(size.height, window.innerHeight * 0.85)}px`, maxWidth: '90vw', maxHeight: '85vh' }
    : { width: `${size.width}px`, height: `${size.height}px`, maxWidth: '95vw', maxHeight: '95vh' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 overflow-hidden flex flex-col shadow-2xl bg-card",
          !isMobile && "rounded-[2rem]"
        )}
        style={dialogStyles}
      >
        <DialogHeader className={cn(
          "px-4 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6 border-b shrink-0 bg-muted/50 relative",
          isMobile && "pt-4"
        )}>
          {isMobile && (
            <Button variant="ghost" size="icon" className="absolute left-4 top-4 rounded-full h-10 w-10" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          
          <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", isMobile && "pl-12")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shrink-0 text-white shadow-xl shadow-primary/30">
                {(() => {
                  const Icon = getAccountIcon(account.accountType, account.name);
                  return <Icon className="w-5 h-5 sm:w-6 sm:h-6" />;
                })()}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-black tracking-tight truncate">{account.name}</DialogTitle>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-muted/50 border-none h-5">{ACCOUNT_TYPE_LABELS[account.accountType]}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 rounded-full text-xs font-bold gap-2 px-4 border-border/40 bg-card/50">
                    <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                    <Printer className="w-4 h-4" /> Imprimir / PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportOFX} className="gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" /> Exportar OFX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={onReconcileAll} className="h-9 rounded-full text-xs font-bold gap-2 px-4 border-border/40 bg-card/50">
                <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Conciliar Tudo</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 scrollbar-material">
          <div className="p-4 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 bg-muted/20 p-4 rounded-[2rem] border border-border/40">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className={cn("flex items-center gap-2", statusColor)}>
                  {periodSummary.pendingCount === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span className="font-black text-[10px] uppercase tracking-widest">{periodSummary.pendingCount === 0 ? "Em Dia" : `${periodSummary.pendingCount} PENDENTES`}</span>
                </div>
                <Separator orientation="vertical" className="h-4 bg-border/50 hidden sm:block" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">{periodSummary.conciliatedCount}/{filteredTransactions.length} ITENS</span>
              </div>
              <PeriodSelector initialRanges={localDateRanges} onDateRangeChange={handlePeriodChange} className="h-9 rounded-xl bg-card border-none text-[10px] font-black" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { l: 'Inicial', v: periodSummary.initialBalance, c: '' },
                { l: 'Entradas', v: periodSummary.totalIn, c: 'text-success' },
                { l: 'Saídas', v: periodSummary.totalOut, c: 'text-destructive' },
                { l: 'Final', v: periodSummary.finalBalance, c: 'text-primary' }
              ].map((x, i) => (
                <div key={i} className="p-4 rounded-[1.75rem] bg-card border border-border/40 shadow-sm">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{x.l}</p>
                  <p className={cn("text-base font-black tabular-nums", x.c)}>{formatCurrency(x.v)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-border/40 overflow-hidden bg-card shadow-sm">
              <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">Extrato Detalhado</h3>
                </div>
              </div>
              <div className="overflow-x-auto scrollbar-material">
                <div className="min-w-[900px] p-6 pt-2">
                  <TransactionTable
                    transactions={filteredTransactions}
                    accounts={[account]}
                    categories={categories}
                    onEdit={onEditTransaction}
                    onDelete={onDeleteTransaction}
                    onToggleConciliated={onToggleConciliated}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {!isMobile && (
          <DialogFooter className="p-6 bg-muted/10 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          </DialogFooter>
        )}
        
        {!isMobile && !isTablet && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-[100] group"
            onMouseDown={onMouseDown}
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}