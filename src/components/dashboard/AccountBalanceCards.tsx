"use client";

import { useFinance } from "@/contexts/FinanceContext";
import { ContaCorrente, ACCOUNT_TYPE_LABELS, formatCurrency, TransacaoCompleta } from "@/types/finance";
import { Wallet, CreditCard, PiggyBank, Landmark, ArrowRight } from "lucide-react";
import { cn, parseDateLocal, getAccountIcon } from "@/lib/utils";
import { useState, useMemo } from "react";
import { addMonths, format } from "date-fns";
import { motion } from "motion/react";
import { MovimentarContaModal } from "@/components/transactions/MovimentarContaModal";
import { AccountStatementDialog } from "@/components/transactions/AccountStatementDialog";
import { CreditCardSummaryCard } from "./CreditCardSummaryCard";

const AccountIcon = ({ type, name, className }: { type: string; name?: string; className?: string }) => {
  const IconComponent = getAccountIcon(type, name);
  return <IconComponent className={className || "w-7 h-7"} />;
};

const AccountBackgroundIcon = ({ type, name, className }: { type: string; name?: string; className?: string }) => {
  const IconComponent = getAccountIcon(type, name);
  return <IconComponent className={cn("w-40 h-40", className)} />;
};

export const AccountBalanceCards = () => {
  const { 
    contasMovimento, 
    categoriasV2, 
    emprestimos, 
    veiculos, 
    imoveis, 
    terrenos, 
    segurosVeiculo, 
    transacoesV2, 
    setTransacoesV2,
    calculateBalanceUpToDate,
    executeTransaction 
  } = useFinance();
  const [selectedAccount, setSelectedAccount] = useState<ContaCorrente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransacaoCompleta | undefined>(undefined);
  const [isMovimentarOpen, setIsMovimentarOpen] = useState(false);

  const selectedAccountSummary = useMemo(() => {
    if (!selectedAccount) return null;
    
    const accountTxs = transacoesV2.filter(t => t.accountId === selectedAccount.id);
    const initialBalance = selectedAccount.initialBalance || 0;
    
    let totalIn = 0;
    let totalOut = 0;
    accountTxs.forEach(t => {
      if (t.flow === 'in' || t.flow === 'transfer_in') {
        totalIn += t.amount;
      } else {
        totalOut += t.amount;
      }
    });
    
    const currentBalance = calculateBalanceUpToDate(selectedAccount.id, new Date(), transacoesV2, contasMovimento);
    
    return {
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      accountType: selectedAccount.accountType,
      initialBalance,
      currentBalance,
      projectedBalance: currentBalance,
      totalIn,
      totalOut,
      reconciliationStatus: accountTxs.length === 0 || accountTxs.every(t => t.conciliated) ? 'ok' as const : 'warning' as const,
      transactionCount: accountTxs.length
    };
  }, [selectedAccount, transacoesV2, contasMovimento, calculateBalanceUpToDate]);

  const handleTransactionSubmit = (
    t: TransacaoCompleta,
    g?: any,
    newAsset?: { type: 'veiculo' | 'imovel' | 'terreno'; data: any }
  ) => {
    if (editingTransaction) {
      setTransacoesV2(prev => prev.filter(x => x.links?.transferGroupId ? x.links.transferGroupId !== editingTransaction.links?.transferGroupId : x.id !== editingTransaction.id));
    }
    executeTransaction(t, g, newAsset);
    setEditingTransaction(undefined);
    setIsMovimentarOpen(false);
  };

  const activeAccounts = useMemo(() => {
    return contasMovimento.filter(acc => {
      if (acc.hidden) return false;
      if (acc.accountType === 'cartao_credito') return false; // Handled by specialized card
      const balance = calculateBalanceUpToDate(acc.id, new Date(), transacoesV2, contasMovimento);
      return Math.abs(balance) > 0.01; // Only show accounts with balance
    });
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const creditCardAccounts = useMemo(() => {
    return contasMovimento.filter(acc => 
      !acc.hidden && 
      acc.accountType === 'cartao_credito' &&
      Math.abs(calculateBalanceUpToDate(acc.id, new Date(), transacoesV2, contasMovimento)) > 0.01
    );
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const handleAccountClick = (account: ContaCorrente) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Normal Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Saldos Disponíveis</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeAccounts.map((account) => {
            const balance = calculateBalanceUpToDate(account.id, new Date(), transacoesV2, contasMovimento);
            const isNegative = balance < 0;

            return (
              <div
                key={account.id}
                id={`account-card-${account.id}`}
                onClick={() => handleAccountClick(account)}
                className={cn(
                  "group relative overflow-hidden p-5 rounded-[24px] cursor-pointer transition-all duration-300",
                  "bg-card border border-border/80 dark:border-border/40 shadow-soft hover:shadow-soft-lg hover:-translate-y-1"
                )}
              >
                {/* Background Accent Decorative Icon */}
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-amber-950/[0.08] dark:text-white/[0.08] pointer-events-none group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
                  <AccountBackgroundIcon type={account.accountType} name={account.name} />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className="p-3.5 rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                      style={{ 
                        backgroundColor: account.color ? `${account.color}15` : 'hsl(var(--primary) / 0.1)',
                        color: account.color || 'hsl(var(--primary))'
                      }}
                    >
                      <AccountIcon type={account.accountType} name={account.name} />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wider opacity-80">
                        {ACCOUNT_TYPE_LABELS[account.accountType]}
                      </span>
                      <p className="text-base font-black text-foreground mt-0.5">{account.name}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className={cn(
                      "text-2xl sm:text-3xl font-display font-black tracking-tight tabular-nums",
                      isNegative ? "text-destructive" : "text-foreground"
                    )}>
                      {formatCurrency(balance)}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                      <span>Ver movimentações</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Cards Section */}
      {creditCardAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Cartões de Crédito</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {creditCardAccounts.map(account => (
              <CreditCardSummaryCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {selectedAccount && selectedAccountSummary && (
        <AccountStatementDialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedAccount(null);
            }
          }}
          account={selectedAccount}
          accountSummary={selectedAccountSummary}
          transactions={transacoesV2.filter(t => t.accountId === selectedAccount.id)}
          categories={categoriasV2}
          onEditTransaction={(tx) => {
            setEditingTransaction(tx);
            setIsMovimentarOpen(true);
          }}
          onDeleteTransaction={(id) => {
            if (window.confirm("Excluir transação?")) {
              setTransacoesV2(prev => prev.filter(t => t.id !== id));
            }
          }}
          onToggleConciliated={(id, val) => {
            setTransacoesV2(prev => prev.map(t => t.id === id ? { ...t, conciliated: val } : t));
          }}
          onReconcileAll={() => {
            setTransacoesV2(prev => prev.map(t => t.accountId === selectedAccount.id ? { ...t, conciliated: true } : t));
          }}
        />
      )}

      {isMovimentarOpen && (
        <MovimentarContaModal
          open={isMovimentarOpen}
          onOpenChange={(open) => {
            setIsMovimentarOpen(open);
            if (!open) {
              setEditingTransaction(undefined);
            }
          }}
          accounts={contasMovimento}
          categories={categoriasV2}
          investments={contasMovimento
            .filter(c => ['renda_fixa', 'poupanca', 'reserva', 'objetivo'].includes(c.accountType))
            .map(i => ({ id: i.id, name: i.name }))}
          loans={emprestimos
            .filter(e => e.status !== 'pendente_config')
            .map(e => ({
              id: `loan_${e.id}`,
              institution: e.contrato,
              numeroContrato: e.contrato,
              parcelas:
                e.meses > 0
                  ? Array.from({ length: e.meses }, (_, i) => ({
                      numero: i + 1,
                      vencimento: format(addMonths(parseDateLocal(e.dataInicio!), i), 'yyyy-MM-dd'),
                      valor: e.parcela,
                      paga: transacoesV2.some(
                        t => t.links?.loanId === `loan_${e.id}` && t.links?.parcelaId === (i + 1).toString(),
                      ),
                    }))
                  : [],
              valorParcela: e.parcela,
              totalParcelas: e.meses,
            }))}
          segurosVeiculo={segurosVeiculo}
          veiculos={veiculos}
          imoveis={imoveis}
          terrenos={terrenos}
          editingTransaction={editingTransaction}
          onSubmit={handleTransactionSubmit}
        />
      )}
    </div>
  );
};
