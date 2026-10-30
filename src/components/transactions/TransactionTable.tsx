import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Wallet, CreditCard, Car, Banknote, DollarSign,
  MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, Eye, Info, Receipt,
  Calendar, Tag, ArrowUpDown
} from "lucide-react";
import { TransacaoCompleta, OperationType, formatCurrency, ContaCorrente, Categoria } from "@/types/finance";
import { cn, parseDateLocal, getAccountIcon } from "@/lib/utils";

interface TransactionTableProps {
  transactions: TransacaoCompleta[];
  accounts: ContaCorrente[];
  categories: Categoria[];
  onEdit: (transaction: TransacaoCompleta) => void;
  onDelete: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onViewAttachments?: (transaction: TransacaoCompleta) => void;
}

const OPERATION_ICONS: Record<OperationType, typeof TrendingUp> = {
  receita: TrendingUp,
  despesa: TrendingDown,
  transferencia: ArrowLeftRight,
  aplicacao: PiggyBank,
  resgate: Wallet,
  pagamento_emprestimo: CreditCard,
  liberacao_emprestimo: Banknote,
  veiculo: Car,
  rendimento: DollarSign,
  initial_balance: Info,
  imobilizado: Receipt,
};

const OPERATION_COLORS: Record<OperationType, string> = {
  receita: 'bg-success/15 text-success border-success/20',
  despesa: 'bg-destructive/15 text-destructive border-destructive/20',
  transferencia: 'bg-primary/15 text-primary border-primary/20',
  aplicacao: 'bg-purple-500/15 text-purple-500 border-purple-500/20',
  resgate: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  pagamento_emprestimo: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
  liberacao_emprestimo: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  veiculo: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  rendimento: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20',
  initial_balance: 'bg-muted text-muted-foreground border-border',
  imobilizado: 'bg-primary/15 text-primary border-primary/20',
};

const OPERATION_LABELS: Record<OperationType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
  aplicacao: 'Aplicação',
  resgate: 'Resgate',
  pagamento_emprestimo: 'Pag. Empréstimo',
  liberacao_emprestimo: 'Liberação',
  veiculo: 'Veículo',
  rendimento: 'Rendimento',
  initial_balance: 'Saldo Inicial',
  imobilizado: 'Imobilizado',
};

export function TransactionTable({
  transactions,
  accounts,
  categories,
  onEdit,
  onDelete,
  onToggleConciliated,
  onViewAttachments,
}: TransactionTableProps) {
  const getAccount = (id: string) => accounts.find(a => a.id === id);
  const getAccountName = (id: string) => getAccount(id)?.name || id;
  const getCategory = (id: string | null) => id ? categories.find(c => c.id === id) : null;
  const getCategoryLabel = (id: string | null) => {
    if (!id) return '-';
    const cat = getCategory(id);
    return cat ? `${cat.icon || ''} ${cat.label}` : id;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return dateStr;
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <TooltipProvider>
      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-3">
        {transactions.map((transaction) => {
          const Icon = OPERATION_ICONS[transaction.operationType];
          const acc = getAccount(transaction.accountId);
          const AccIcon = acc ? getAccountIcon(acc.accountType, acc.name) : Wallet;

          return (
            <div 
              key={transaction.id}
              className="bg-card border border-border/40 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">
                    {transaction.description}
                  </p>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground/70" />
                      {formatDate(transaction.date)}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <AccIcon className="w-3 h-3" />
                      {getAccountName(transaction.accountId)}
                    </span>
                    {transaction.categoryId && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-muted-foreground/70" />
                          {getCategoryLabel(transaction.categoryId)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full",
                      transaction.conciliated ? "text-success bg-success/10" : "text-muted-foreground bg-muted/50"
                    )}
                    onClick={() => onToggleConciliated(transaction.id, !transaction.conciliated)}
                  >
                    {transaction.conciliated ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => onEdit(transaction)} className="font-bold text-xs"><Pencil className="w-3.5 h-3.5 mr-2" /> Editar</DropdownMenuItem>
                      {transaction.attachments && transaction.attachments.length > 0 && onViewAttachments && (
                        <DropdownMenuItem onClick={() => onViewAttachments(transaction)} className="font-bold text-xs"><Eye className="w-3.5 h-3.5 mr-2" /> Comprovante</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="text-destructive font-bold text-xs"><Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                <Badge variant="outline" className={cn("gap-1 text-[10px] font-black uppercase border-none", OPERATION_COLORS[transaction.operationType])}>
                  <Icon className="w-3 h-3" />
                  {OPERATION_LABELS[transaction.operationType]}
                </Badge>
                <span className={cn(
                  "font-black text-sm tabular-nums",
                  transaction.flow === 'in' || transaction.flow === 'transfer_in' ? "text-success" : "text-destructive"
                )}>
                  {transaction.flow === 'in' || transaction.flow === 'transfer_in' ? '+' : '-'} {formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Scrollable Table Layout */}
      <div className="hidden md:block overflow-x-auto scrollbar-material">
        <div className="min-w-[920px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent h-10">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[115px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Data</span>
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Descrição
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[150px]">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Conta</span>
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[160px]">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Categoria</span>
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-[140px]">
                  Valor
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-[130px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Tipo</span>
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center w-[60px]">
                  Pg
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const Icon = OPERATION_ICONS[transaction.operationType];
                const isIncome = transaction.flow === 'in' || transaction.flow === 'transfer_in';
                const acc = getAccount(transaction.accountId);
                const AccIcon = acc ? getAccountIcon(acc.accountType, acc.name) : Wallet;
                const cat = getCategory(transaction.categoryId);

                return (
                  <TableRow key={transaction.id} className="border-border hover:bg-muted/30 transition-colors h-14 group">
                    <TableCell className="text-xs font-bold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <span>{formatDate(transaction.date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-bold text-xs text-foreground">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-[11px] font-bold text-muted-foreground truncate">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AccIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{acc?.name || transaction.accountId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-bold text-foreground">
                      {cat ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          {cat.icon ? (
                            <span className="text-xs shrink-0">{cat.icon}</span>
                          ) : (
                            <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{cat.label}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground/50">
                          <Tag className="w-3.5 h-3.5 shrink-0" />
                          <span>-</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={cn("font-black text-xs text-right tabular-nums", isIncome ? "text-success" : "text-destructive")}>
                      {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("gap-1 text-[9px] font-black uppercase border-none px-2 py-0.5", OPERATION_COLORS[transaction.operationType])}>
                        <Icon className="w-3 h-3" /> {OPERATION_LABELS[transaction.operationType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <button 
                        onClick={() => onToggleConciliated(transaction.id, !transaction.conciliated)}
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors",
                          transaction.conciliated ? "text-success bg-success/10" : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted"
                        )}
                        title={transaction.conciliated ? "Conciliado" : "Pendente de conciliação"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors"
                            title="Opções"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                          <DropdownMenuItem onClick={() => onEdit(transaction)} className="font-bold text-xs cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" /> Editar</DropdownMenuItem>
                          {transaction.attachments && transaction.attachments.length > 0 && onViewAttachments && (
                            <DropdownMenuItem onClick={() => onViewAttachments(transaction)} className="font-bold text-xs cursor-pointer"><Eye className="w-3.5 h-3.5 mr-2" /> Comprovante</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="text-destructive font-bold text-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-muted-foreground opacity-50">
                    <Receipt className="w-10 h-10 mx-auto mb-3" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Nenhum lançamento encontrado</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}