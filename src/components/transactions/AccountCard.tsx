import { Building2, MoreVertical, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AccountSummary, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  summary: AccountSummary;
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onEdit?: (accountId: string) => void;
  onImport?: (accountId: string) => void;
}

export function AccountCard({ summary, onMovimentar, onViewHistory, onEdit, onImport }: AccountCardProps) {
  const {
    accountId,
    accountName,
    initialBalance,
    currentBalance,
    totalIn,
    totalOut,
    reconciliationStatus,
    transactionCount
  } = summary;

  const statusClasses = {
    ok: "stat-card-positive",
    warning: "stat-card-warning",
    error: "stat-card-negative",
  };

  const statusBadgeColors = {
    ok: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    error: "bg-destructive/20 text-destructive",
  };

  const balanceChange = currentBalance - initialBalance;
  const isPositive = balanceChange >= 0;

  return (
    <Card
      className={cn(
        "glass-card w-[280px] shrink-0 p-3.5 md:p-6 transition-all hover:shadow-md rounded-[1.75rem] border border-border/40 bg-card",
        statusClasses[reconciliationStatus],
      )}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="font-semibold text-[11px] sm:text-sm text-foreground truncate max-w-[150px] sm:max-w-[170px]">
              {accountName}
            </h4>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium",
                statusBadgeColors[reconciliationStatus],
              )}
            >
              {reconciliationStatus === "ok"
                ? "Conciliada"
                : reconciliationStatus === "warning"
                ? "Pendente"
                : "Divergente"}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewHistory(accountId)}>
              Ver Extrato
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMovimentar(accountId)}>
              Movimentar
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(accountId)}>
                Editar Conta
              </DropdownMenuItem>
            )}
            {onImport && (
              <DropdownMenuItem onClick={() => onImport(accountId)}>
                Importar Extrato
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 pt-1 border-t border-border/30">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Saldo Atual</span>
          <span className="text-base sm:text-lg font-extrabold text-foreground leading-tight">
            {formatCurrency(currentBalance)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-muted-foreground">
          <span>Saldo Inicial</span>
          <span>{formatCurrency(initialBalance)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[10px] sm:text-[11px]">
        <div className="flex items-center gap-1 text-success">
          <ArrowUpRight className="w-3 h-3" />
          <span className="font-semibold">{formatCurrency(totalIn)}</span>
        </div>

        <div className="flex items-center gap-1 text-destructive">
          <ArrowDownRight className="w-3 h-3" />
          <span className="font-semibold">{formatCurrency(totalOut)}</span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground font-medium">
          <span>{transactionCount}</span>
          <span className="text-[9px] sm:text-[10px]">transações</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 rounded-full px-4 text-[11px] font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={() => onMovimentar(accountId)}
        >
          Movimentar
        </Button>
      </div>
    </Card>
  );
}