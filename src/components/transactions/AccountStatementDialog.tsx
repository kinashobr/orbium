import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  TrendingUp, TrendingDown, 
  CheckCircle2, AlertTriangle, Download, RefreshCw, X, ArrowRight, ArrowLeft,
  Printer, FileText, FileSpreadsheet, Search, Landmark, Wallet, Plus
} from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, AccountSummary, 
  formatCurrency, ACCOUNT_TYPE_LABELS, ComparisonDateRanges
} from "@/types/finance";
import { TransactionTable } from "./TransactionTable";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { cn, parseDateLocal, getAccountIcon } from "@/lib/utils";
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useFinance } from "@/contexts/FinanceContext";

// --- Export helpers ---

function generatePrintHTML(
  account: ContaCorrente, 
  transactions: TransacaoCompleta[], 
  summary: { 
    totalIn: number; 
    totalOut: number; 
    initialBalance: number; 
    finalBalance: number;
    inCount?: number;
    outCount?: number;
    conciliatedCount?: number;
    pendingCount?: number;
    netChange?: number;
  }, 
  dateRange: { from?: Date; to?: Date },
  categories: Categoria[] = []
) {
  const periodStr = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'dd/MM/yyyy')} até ${format(dateRange.to, 'dd/MM/yyyy')}`
    : 'Período completo';

  const issueDateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm");

  const opLabels: Record<string, string> = {
    receita: 'Receita',
    despesa: 'Despesa',
    transferencia: 'Transferência',
    aplicacao: 'Aplicação',
    resgate: 'Resgate',
    pagamento_emprestimo: 'Pag. Empréstimo',
    liberacao_emprestimo: 'Liberação Empréstimo',
    veiculo: 'Veículo',
    rendimento: 'Rendimento',
    initial_balance: 'Saldo Inicial',
    imobilizado: 'Imobilizado',
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return '—';
    const cat = categories.find(c => c.id === id);
    return cat ? `${cat.icon ? cat.icon + ' ' : ''}${cat.label}` : id;
  };

  const rows = transactions.map((t) => {
    const date = parseDateLocal(t.date);
    const isOut = t.flow === 'out' || t.flow === 'transfer_out';
    const valorFormatted = `${isOut ? '-' : '+'} R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const op = opLabels[t.operationType] || t.operationType;
    const cat = getCategoryName(t.categoryId);

    return `<tr>
      <td style="font-weight:600;color:#475569;white-space:nowrap">${format(date, 'dd/MM/yyyy')}</td>
      <td style="font-weight:600;color:#0f172a;max-width:280px">${t.description}</td>
      <td style="color:#334155">${cat}</td>
      <td style="color:#64748b;font-size:11px"><span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-weight:700">${op}</span></td>
      <td class="val-cell ${isOut ? 'val-out' : 'val-in'}">${valorFormatted}</td>
      <td style="text-align:center">
        ${t.conciliated 
          ? '<span class="status-pill status-conciliated">✓ Sim</span>' 
          : '<span class="status-pill status-pending">Pendente</span>'}
      </td>
    </tr>`;
  }).join('');

  const netChange = summary.netChange ?? (summary.totalIn - summary.totalOut);
  const netSign = netChange >= 0 ? '+' : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Extrato Bancário - ${account.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    .report-container {
      max-width: 1040px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      padding: 36px 40px;
    }

    .no-print-bar {
      max-width: 1040px;
      margin: 0 auto 16px auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 12px 20px;
      border-radius: 14px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .no-print-bar .title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-bar .actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #0f172a;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1e293b;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f1f5f9;
      margin-bottom: 24px;
    }
    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #4f46e5;
      background: #eef2ff;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    .account-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-gray {
      background: #f1f5f9;
      color: #475569;
    }
    .badge-primary {
      background: #eef2ff;
      color: #4338ca;
    }

    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .meta-box strong {
      color: #0f172a;
      font-weight: 700;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px;
      background: #ffffff;
    }
    .kpi-card.initial {
      background: #f8fafc;
      border-color: #e2e8f0;
    }
    .kpi-card.inflows {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .kpi-card.outflows {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .kpi-card.final {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-card.inflows .kpi-label { color: #166534; }
    .kpi-card.outflows .kpi-label { color: #9f1239; }
    .kpi-card.final .kpi-label { color: #0f172a; }
    .kpi-value {
      font-size: 17px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -0.02em;
    }
    .kpi-card.initial .kpi-value { color: #0f172a; }
    .kpi-card.inflows .kpi-value { color: #16a34a; }
    .kpi-card.outflows .kpi-value { color: #e11d48; }
    .kpi-card.final .kpi-value { color: #0f172a; }
    .kpi-sub {
      font-size: 9px;
      font-weight: 600;
      color: #94a3b8;
      margin-top: 4px;
    }
    .kpi-card.inflows .kpi-sub { color: #15803d; }
    .kpi-card.outflows .kpi-sub { color: #be123c; }

    .table-container {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .table-header-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #334155;
      padding: 12px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .val-cell {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      font-weight: 700;
      white-space: nowrap;
    }
    .val-in { color: #16a34a; }
    .val-out { color: #e11d48; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 9.5px;
      font-weight: 700;
    }
    .status-conciliated {
      background: #ecfdf5;
      color: #059669;
    }
    .status-pending {
      background: #fffbeb;
      color: #b45309;
    }

    .report-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: #94a3b8;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      th {
        background: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .kpi-card {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .badge, .status-pill, .brand-tag {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="title">
      <span>🖨️ Pré-visualização do Relatório</span>
    </div>
    <div class="actions">
      <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
      <button class="btn btn-primary" onclick="window.print()">Imprimir / Salvar PDF</button>
    </div>
  </div>

  <div class="report-container">
    <div class="header">
      <div>
        <div class="brand-tag">Orbium Finance • Extrato Bancário</div>
        <h1 class="account-title">${account.name}</h1>
        <div class="badges-row">
          <span class="badge badge-gray">${ACCOUNT_TYPE_LABELS[account.accountType]}</span>
          ${account.institution ? `<span class="badge badge-primary">${account.institution}</span>` : ''}
          <span class="badge ${summary.pendingCount === 0 ? 'badge-success' : 'badge-warning'}">
            ${summary.pendingCount === 0 ? '✓ Conciliação em Dia' : `${summary.pendingCount} Pendente(s)`}
          </span>
        </div>
      </div>
      <div class="meta-box">
        <div><strong>Período:</strong> ${periodStr}</div>
        <div><strong>Lançamentos:</strong> ${transactions.length} itens</div>
        <div><strong>Emissão:</strong> ${issueDateStr}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="kpi-card initial">
        <div class="kpi-label">Saldo Inicial</div>
        <div class="kpi-value">${formatCurrency(summary.initialBalance)}</div>
        <div class="kpi-sub">Posição anterior</div>
      </div>
      <div class="kpi-card inflows">
        <div class="kpi-label">Entradas (+)</div>
        <div class="kpi-value">+ ${formatCurrency(summary.totalIn)}</div>
        <div class="kpi-sub">${summary.inCount ?? transactions.filter(t => t.flow === 'in' || t.flow === 'transfer_in').length} lançamento(s)</div>
      </div>
      <div class="kpi-card outflows">
        <div class="kpi-label">Saídas (-)</div>
        <div class="kpi-value">- ${formatCurrency(summary.totalOut)}</div>
        <div class="kpi-sub">${summary.outCount ?? transactions.filter(t => t.flow === 'out' || t.flow === 'transfer_out').length} lançamento(s)</div>
      </div>
      <div class="kpi-card final">
        <div class="kpi-label">Saldo Final</div>
        <div class="kpi-value">${formatCurrency(summary.finalBalance)}</div>
        <div class="kpi-sub">Resultado: ${netSign}${formatCurrency(netChange)}</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header-title">
        <span>Demonstrativo Detalhado de Lançamentos</span>
        <span style="font-size:10px;font-weight:600;color:#64748b">${transactions.length} transações registradas</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:90px">Data</th>
            <th>Descrição</th>
            <th style="width:160px">Categoria</th>
            <th style="width:110px">Operação</th>
            <th style="width:130px;text-align:right">Valor</th>
            <th style="width:85px;text-align:center">Conc.</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8">Nenhum lançamento encontrado no período.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <span>Orbium Finance • Documento de Controle e Gestão Financeira</span>
      <span>Gerado automaticamente em ${issueDateStr}</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
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

function generateOFX(
  account: ContaCorrente, 
  transactions: TransacaoCompleta[], 
  dateRange: { from?: Date; to?: Date },
  ledgerBalance: number
): string {
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
<BALAMT>${ledgerBalance.toFixed(2)}
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
  accountSummary?: AccountSummary;
  transactions?: TransacaoCompleta[];
  categories: Categoria[];
  onEditTransaction: (transaction: TransacaoCompleta) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onReconcileAll: () => void;
  onNewTransaction?: () => void;
}

export function AccountStatementDialog({
  open,
  onOpenChange,
  account,
  transactions: propTransactions,
  categories,
  onEditTransaction,
  onDeleteTransaction,
  onToggleConciliated,
  onReconcileAll,
  onNewTransaction
}: AccountStatementDialogProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { 
    contasMovimento, 
    transacoesV2, 
    calculateBalanceUpToDate,
    dateRanges 
  } = useFinance();

  // Estado local do seletor de período do modal (inicia sincronizado com o período atual da aplicação)
  const [localDateRanges, setLocalDateRanges] = useState<ComparisonDateRanges>(() => ({
    range1: dateRanges?.range1?.from && dateRanges?.range1?.to
      ? { from: dateRanges.range1.from, to: dateRanges.range1.to }
      : { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    range2: { from: undefined, to: undefined }
  }));

  // Filtro de busca textual
  const [searchQuery, setSearchQuery] = useState("");

  // Ao abrir o modal, inicializa com o período corrente da aplicação
  useEffect(() => {
    if (open) {
      setLocalDateRanges({
        range1: dateRanges?.range1?.from && dateRanges?.range1?.to
          ? { from: dateRanges.range1.from, to: dateRanges.range1.to }
          : { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
        range2: { from: undefined, to: undefined }
      });
      setSearchQuery("");
    }
  }, [open, dateRanges?.range1]);

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

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setLocalDateRanges(ranges);
  }, []);

  // Intervalo do período selecionado NO MODAL
  const fromDate = useMemo(() => 
    localDateRanges.range1.from ? startOfDay(localDateRanges.range1.from) : undefined,
    [localDateRanges.range1.from]
  );
  const toDate = useMemo(() => 
    localDateRanges.range1.to ? endOfDay(localDateRanges.range1.to) : undefined,
    [localDateRanges.range1.to]
  );

  // 1. Saldo Inicial calculado dinamicamente para o primeiro dia do período do modal
  const initialBalance = useMemo(() => {
    if (!fromDate) {
      return account.initialBalance || 0;
    }
    const dayBeforeFrom = subDays(fromDate, 1);
    return calculateBalanceUpToDate(account.id, dayBeforeFrom, transacoesV2, contasMovimento);
  }, [account.id, account.initialBalance, fromDate, calculateBalanceUpToDate, transacoesV2, contasMovimento]);

  // Todas as transações desta conta
  const allAccountTransactions = useMemo(() => {
    const list = propTransactions && propTransactions.length > 0 
      ? propTransactions 
      : transacoesV2.filter(t => t.accountId === account.id);
    
    return list
      .filter(t => t.accountId === account.id)
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
  }, [propTransactions, transacoesV2, account.id]);

  // Transações estritamente dentro do período selecionado NO MODAL
  const periodTransactions = useMemo(() => {
    if (!fromDate || !toDate) {
      return allAccountTransactions;
    }

    return allAccountTransactions.filter(t => {
      const transactionDate = parseDateLocal(t.date);
      return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
    });
  }, [allAccountTransactions, fromDate, toDate]);

  // Totalizadores calculados baseados ESTRITAMENTE no período selecionado no modal
  const periodSummary = useMemo(() => {
    const conciliatedCount = periodTransactions.filter(t => t.conciliated).length;
    const pendingCount = periodTransactions.length - conciliatedCount;
    
    let totalIn = 0;
    let totalOut = 0;
    let inCount = 0;
    let outCount = 0;
    const isCreditCard = account.accountType === 'cartao_credito';
    
    periodTransactions.forEach(t => {
      if (isCreditCard) {
        if (t.operationType === 'despesa' || t.flow === 'out' || t.flow === 'transfer_out') {
          totalOut += t.amount;
          outCount++;
        } else if (t.operationType === 'transferencia' || t.flow === 'in' || t.flow === 'transfer_in') {
          totalIn += t.amount;
          inCount++;
        }
      } else {
        if (t.flow === 'in' || t.flow === 'transfer_in') {
          totalIn += t.amount;
          inCount++;
        } else if (t.flow === 'out' || t.flow === 'transfer_out') {
          totalOut += t.amount;
          outCount++;
        }
      }
    });

    const netChange = totalIn - totalOut;
    const finalBalance = initialBalance + netChange;
    
    return {
      initialBalance, 
      finalBalance,
      totalIn,
      totalOut,
      netChange,
      inCount,
      outCount,
      conciliatedCount,
      pendingCount,
      totalCount: periodTransactions.length,
    };
  }, [periodTransactions, initialBalance, account.accountType]);

  // Transações filtradas por termo de busca
  const displayedTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return periodTransactions;
    }

    const q = searchQuery.toLowerCase().trim();
    return periodTransactions.filter(t => {
      const descMatch = t.description?.toLowerCase().includes(q);
      const catMatch = t.categoryId?.toLowerCase().includes(q);
      const amountMatch = t.amount.toString().includes(q) || formatCurrency(t.amount).toLowerCase().includes(q);
      return descMatch || catMatch || amountMatch;
    });
  }, [periodTransactions, searchQuery]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';
  const IconComponent = getAccountIcon(account.accountType, account.name);

  const handlePrint = useCallback(() => {
    const listToPrint = searchQuery.trim() ? displayedTransactions : periodTransactions;
    const html = generatePrintHTML(account, listToPrint, periodSummary, localDateRanges.range1, categories);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, [account, displayedTransactions, periodTransactions, periodSummary, localDateRanges.range1, categories, searchQuery]);

  const handleExportOFX = useCallback(() => {
    const ofx = generateOFX(account, periodTransactions, localDateRanges.range1, periodSummary.finalBalance);
    downloadFile(ofx, `extrato_${account.name.replace(/\s/g, '_')}.ofx`, 'application/x-ofx');
  }, [account, periodTransactions, localDateRanges.range1, periodSummary.finalBalance]);

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV(periodTransactions);
    downloadFile(csv, `extrato_${account.name.replace(/\s/g, '_')}.csv`, 'text/csv;charset=utf-8');
  }, [account, periodTransactions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl flex flex-col overflow-hidden bg-background border border-border/40",
          !isMobile && "max-w-[min(96vw,1200px)] h-[min(92vh,900px)] rounded-[2rem]"
        )}
      >
        {/* Header Principal Padronizado (sem botão X de fechar conforme solicitado) */}
        <DialogHeader className={cn(
          "px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-border/40 shrink-0 bg-card/70 backdrop-blur-sm relative",
          isMobile && "pt-4 px-4"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Lado Esquerdo: Ícone da Conta, Título e Badges */}
            <div className="flex items-center gap-4">
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-10 w-10 shrink-0 bg-muted/40" 
                  onClick={() => onOpenChange(false)}
                >
                  <ArrowLeft className="h-6 w-6" />
                </Button>
              )}

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shrink-0 text-white shadow-xl shadow-primary/25 ring-4 ring-primary/10">
                <IconComponent className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight truncate">
                    {account.name}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-muted/60 border-border/40 px-2 py-0.5">
                    {ACCOUNT_TYPE_LABELS[account.accountType]}
                  </Badge>
                  {account.institution && (
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20 px-2 py-0.5">
                      {account.institution}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <div className={cn("flex items-center gap-1.5 font-bold", statusColor)}>
                    {periodSummary.pendingCount === 0 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    )}
                    <span>
                      {periodSummary.pendingCount === 0 
                        ? "Conciliação em Dia" 
                        : `${periodSummary.pendingCount} pendente${periodSummary.pendingCount > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <span className="text-border">•</span>
                  <span>{periodSummary.conciliatedCount} de {periodSummary.totalCount} itens conciliados</span>
                </div>
              </div>
            </div>

            {/* Lado Direito: Ações Principais (Exportar, Conciliar, Nova Movimentação) */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end sm:self-auto">
              {onNewTransaction && (
                <Button 
                  size="sm" 
                  onClick={onNewTransaction}
                  className="h-9 sm:h-10 rounded-xl text-xs font-bold gap-2 px-3.5 bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.02] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Movimentação</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 sm:h-10 rounded-xl text-xs font-bold gap-2 px-3.5 border-border/40 bg-card/60 shadow-sm hover:bg-muted/50"
                  >
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <span>Exportar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-xl w-48">
                  <DropdownMenuItem onClick={handlePrint} className="gap-2.5 cursor-pointer py-2 font-medium">
                    <Printer className="w-4 h-4 text-primary" /> Imprimir / PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportOFX} className="gap-2.5 cursor-pointer py-2 font-medium">
                    <FileText className="w-4 h-4 text-blue-500" /> Exportar OFX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV} className="gap-2.5 cursor-pointer py-2 font-medium">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReconcileAll} 
                disabled={periodSummary.pendingCount === 0}
                className="h-9 sm:h-10 rounded-xl text-xs font-bold gap-2 px-3.5 border-border/40 bg-card/60 shadow-sm hover:bg-muted/50 disabled:opacity-50"
                title="Marcar todos os lançamentos como conciliados"
              >
                <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Conciliar Tudo</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Extrato */}
        <ScrollArea className="flex-1 scrollbar-material">
          <div className="p-4 sm:p-8 space-y-6">

            {/* Linha com Período + Totalizadores (Saldo Inicial, Entradas, Saídas, Saldo Final) ao lado do Pesquisar */}
            <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-card border border-border/40 shadow-sm">
              {/* Seletor de Período do Modal */}
              <div className="flex items-center gap-2 shrink-0">
                <PeriodSelector
                  initialRanges={localDateRanges}
                  onDateRangeChange={handlePeriodChange}
                  className="h-10 text-xs rounded-xl font-bold bg-muted/40 border-border/40 shadow-none hover:bg-muted/60"
                />
              </div>

              {/* Totalizadores e Campo de Busca na mesma linha */}
              <div className="flex items-center gap-2 flex-wrap flex-1 justify-start 2xl:justify-end">
                {/* 1. Saldo Inicial */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/40 shrink-0">
                  <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Saldo Inicial</span>
                    <span className="text-xs font-black tabular-nums text-foreground mt-0.5">
                      {formatCurrency(periodSummary.initialBalance)}
                    </span>
                  </div>
                </div>

                {/* 2. Entradas */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Entradas</span>
                    <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                      +{formatCurrency(periodSummary.totalIn)}
                    </span>
                  </div>
                </div>

                {/* 3. Saídas */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">Saídas</span>
                    <span className="text-xs font-black tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                      -{formatCurrency(periodSummary.totalOut)}
                    </span>
                  </div>
                </div>

                {/* 4. Saldo Final */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] font-black uppercase tracking-wider text-primary">Saldo Final</span>
                    <span className="text-xs font-black tabular-nums text-foreground mt-0.5">
                      {formatCurrency(periodSummary.finalBalance)}
                    </span>
                  </div>
                </div>

                {/* Botão/Campo Pesquisar (continua no mesmo lugar na ponta) */}
                <div className="relative min-w-[180px] max-w-[240px] flex-1 sm:flex-initial shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar no extrato..."
                    className="h-10 pl-9 pr-8 text-xs rounded-xl bg-card border-border/40 shadow-none font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Container da Tabela com visual alinhado à Revisão de Extrato */}
            <div className="rounded-[2rem] border border-border/40 overflow-hidden bg-card shadow-sm flex flex-col">
              <div className="px-6 py-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                    Lançamentos do Extrato
                  </h3>
                  <span className="text-xs text-muted-foreground font-bold">
                    ({displayedTransactions.length} de {periodTransactions.length})
                  </span>
                </div>

                {searchQuery && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-muted/50 w-fit">
                    Filtrado por termo: &quot;{searchQuery}&quot;
                  </Badge>
                )}
              </div>

              <div className="p-4 sm:p-6">
                <TransactionTable
                  transactions={displayedTransactions}
                  accounts={contasMovimento.length > 0 ? contasMovimento : [account]}
                  categories={categories}
                  onEdit={onEditTransaction}
                  onDelete={onDeleteTransaction}
                  onToggleConciliated={onToggleConciliated}
                />
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Rodapé Padronizado */}
        {!isMobile && (
          <DialogFooter className="px-8 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between shrink-0">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <span className="font-bold text-foreground">{periodSummary.conciliatedCount}</span> de{" "}
              <span className="font-bold text-foreground">{periodSummary.totalCount}</span> lançamentos conciliados no período
              {periodSummary.pendingCount > 0 && (
                <span className="text-warning font-bold">
                  ({periodSummary.pendingCount} pendente{periodSummary.pendingCount > 1 ? 's' : ''})
                </span>
              )}
            </div>

            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="rounded-xl px-8 h-10 font-bold text-xs hover:bg-muted/60"
            >
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}