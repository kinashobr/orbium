import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Wallet, CreditCard, Car, Banknote, DollarSign,
  MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, Paperclip, Eye, Info
} from "lucide-react";
import { TransacaoCompleta, OperationType, formatCurrency, ContaCorrente, Categoria } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";

interface TransactionTableProps {
  transactions: TransacaoCompleta[];
  accounts: ContaCorrente[];
  categories: Categoria[];
  onEdit: (transaction: TransacaoCompleta) => void;
  onDelete: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onViewAttachments?: (transaction: TransacaoCompleta) => void;
  // Removido: selectedIds?: string[];
  // Removido: onSelectChange?: (ids: string[]) => void;
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
};

const OPERATION_COLORS: Record<OperationType, string> = {
  receita: 'bg-success/20 text-success',
  despesa: 'bg-destructive/20 text-destructive',
  transferencia: 'bg-primary/20 text-primary',
  aplicacao: 'bg-purple-500/20 text-purple-500',
  resgate: 'bg-amber-500/20 text-amber-500',
  pagamento_emprestimo: 'bg-orange-500/20 text-orange-500',
  liberacao_emprestimo: 'bg-emerald-500/20 text-emerald-500',
  veiculo: 'bg-blue-500/20 text-blue-500',
  rendimento: 'bg-teal-500/20 text-teal-500',
  initial_balance: 'bg-muted/50 text-muted-foreground',
};

const OPERATION_LABELS: Record<OperationType, string> = {
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
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;
  const getCategoryLabel = (id: string | null) => {
    if (!id) return '-';
    const cat = categories.find(c => c.id === id);
    return cat ? `${cat.icon || ''} ${cat.label}` : id;
  };

  const formatDate = (dateStr: string) => {
    // Usa parseDateLocal para garantir que a data seja interpretada localmente
    if (!dateStr || dateStr.length < 10) return dateStr;
    const date = parseDateLocal(dateStr);
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const hasLinks = (t: TransacaoCompleta) => 
    t.links.investmentId || t.links.loanId || t.links.transferGroupId;

  // Removido: handleSelectAll e handleSelectOne

  // Removido: allSelected

  return (
    <>
      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-3">
        {transactions.map((transaction) => {
          const Icon = OPERATION_ICONS[transaction.operationType];
          return (
            <div 
              key={transaction.id}
              className="glass-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(transaction.date)} • {getAccountName(transaction.accountId)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onToggleConciliated(transaction.id, !transaction.conciliated)}
                  >
                    {transaction.conciliated ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => onEdit(transaction)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {transaction.attachments.length > 0 && onViewAttachments && (
                        <DropdownMenuItem onClick={() => onViewAttachments(transaction)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Comprovante
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(transaction.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <Badge className={cn("gap-1 text-xs", OPERATION_COLORS[transaction.operationType])}>
                  <Icon className="w-3 h-3" />
                  {OPERATION_LABELS[transaction.operationType]}
                </Badge>
                <span className={cn(
                  "font-bold text-sm",
                  transaction.flow === 'in' || transaction.flow === 'transfer_in' 
                    ? "text-success" 
                    : "text-destructive"
                )}>
                  {transaction.flow === 'in' || transaction.flow === 'transfer_in' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              
              {(getCategoryLabel(transaction.categoryId) !== '-' || hasLinks(transaction)) && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>{getCategoryLabel(transaction.categoryId)}</span>
                  <div className="flex items-center gap-1">
                    {transaction.links.investmentId && (
                      <Badge variant="outline" className="text-xs px-1">
                        <PiggyBank className="w-3 h-3" />
                      </Badge>
                    )}
                    {transaction.links.loanId && (
                      <Badge variant="outline" className="text-xs px-1">
                        <CreditCard className="w-3 h-3" />
                      </Badge>
                    )}
                    {transaction.links.transferGroupId && (
                      <Badge variant="outline" className="text-xs px-1">
                        <ArrowLeftRight className="w-3 h-3" />
                      </Badge>
                    )}
                    {transaction.attachments.length > 0 && (
                      <Badge variant="outline" className="text-xs px-1">
                        <Paperclip className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {transactions.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        )}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-muted-foreground">Conta</TableHead>
                <TableHead className="text-muted-foreground">Categoria</TableHead>
                <TableHead className="text-muted-foreground">Valor</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Vínculos</TableHead>
                <TableHead className="text-muted-foreground text-center">Conciliado</TableHead>
                <TableHead className="text-muted-foreground w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const Icon = OPERATION_ICONS[transaction.operationType];
            // Removido: isSelected

            return (
              <TableRow 
                key={transaction.id} 
                className={cn(
                  "border-border hover:bg-muted/30 transition-colors",
                  // Removido: isSelected && "bg-primary/5"
                )}
              >
                {/* Removido: Célula de Checkbox */}
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {transaction.description}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {getAccountName(transaction.accountId)}
                </TableCell>
                <TableCell>
                  {getCategoryLabel(transaction.categoryId)}
                </TableCell>
                <TableCell className={cn(
                  "font-medium whitespace-nowrap",
                  transaction.flow === 'in' || transaction.flow === 'transfer_in' 
                    ? "text-success" 
                    : "text-destructive"
                )}>
                  {transaction.flow === 'in' || transaction.flow === 'transfer_in' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1 text-xs", OPERATION_COLORS[transaction.operationType])}>
                    <Icon className="w-3 h-3" />
                    {OPERATION_LABELS[transaction.operationType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <div className="flex items-center gap-1">
                      {transaction.links.investmentId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs px-1">
                              <PiggyBank className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Vinculado a Investimento</TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.links.loanId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs px-1">
                              <CreditCard className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Vinculado a Empréstimo</TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.links.transferGroupId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs px-1">
                              <ArrowLeftRight className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Transferência</TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.attachments.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => onViewAttachments?.(transaction)}
                            >
                              <Paperclip className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver anexos ({transaction.attachments.length})</TooltipContent>
                        </Tooltip>
                      )}
                      {!hasLinks(transaction) && transaction.attachments.length === 0 && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onToggleConciliated(transaction.id, !transaction.conciliated)}
                  >
                    {transaction.conciliated ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(transaction)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {transaction.attachments.length > 0 && onViewAttachments && (
                        <DropdownMenuItem onClick={() => onViewAttachments(transaction)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Comprovante
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(transaction.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell 
                colSpan={9} 
                className="text-center py-10 text-muted-foreground"
              >
                Nenhuma transação encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
        </div>
      </div>
    </>
  );
}