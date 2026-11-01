"use client";

import * as React from "react";
import { Check, ChevronDown, Landmark, PiggyBank, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContaCorrente, OperationType } from "@/types/finance";

interface LoanInfo {
  id: string;
  institution: string;
  parcelas: { numero: number; paga: boolean }[];
}

interface InvestmentInfo {
  id: string;
  name: string;
}

interface LinkSearchSelectorProps {
  operationType: OperationType | null;
  accounts: ContaCorrente[];
  currentAccountId: string;
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  destinationAccountId?: string | null;
  tempInvestmentId?: string | null;
  tempLoanId?: string | null;
  tempParcelaId?: string | null;
  flow?: 'in' | 'out';
  isIncome?: boolean;
  onChange: (updates: {
    destinationAccountId?: string | null;
    tempInvestmentId?: string | null;
    tempLoanId?: string | null;
    tempParcelaId?: string | null;
  }) => void;
  className?: string;
  isCompact?: boolean;
}

export function LinkSearchSelector({
  operationType,
  accounts,
  currentAccountId,
  investments,
  loans,
  destinationAccountId,
  tempInvestmentId,
  tempLoanId,
  tempParcelaId,
  flow,
  isIncome,
  onChange,
  className,
  isCompact = false,
}: LinkSearchSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [openParcela, setOpenParcela] = React.useState(false);

  const isIncoming = flow === 'in' || isIncome === true;

  // Transferência
  if (operationType === 'transferencia') {
    const availableAccounts = accounts.filter(a => a.id !== currentAccountId);
    const selectedAccount = availableAccounts.find(a => a.id === destinationAccountId);
    const transferPlaceholder = isIncoming ? "CONTRAPARTIDA (ORIGEM)..." : "CONTRAPARTIDA (DESTINO)...";
    const searchPlaceholder = isIncoming ? "BUSCAR CONTRAPARTIDA (ORIGEM)..." : "BUSCAR CONTRAPARTIDA (DESTINO)...";
    const selectedLabel = selectedAccount ? `${selectedAccount.name} (${isIncoming ? 'Origem' : 'Destino'})` : transferPlaceholder;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-xl px-2.5 text-[10px] font-black uppercase transition-all duration-200 border border-transparent focus:outline-none",
              selectedAccount
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              isCompact && "h-9",
              className
            )}
          >
            <span className="truncate flex items-center gap-1.5 min-w-0">
              <Landmark className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{selectedLabel}</span>
            </span>
            <ChevronDown className="h-3 w-3 opacity-40 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[210px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command className="bg-card">
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-10 text-[10px] font-black uppercase border-none focus:ring-0"
            />
            <CommandList className="max-h-[240px] overflow-y-auto">
              <CommandEmpty className="py-5 text-[9px] text-center font-black uppercase opacity-40">
                Nenhuma conta
              </CommandEmpty>
              <CommandGroup className="p-1.5 space-y-0.5">
                {availableAccounts.map((acc) => (
                  <CommandItem
                    key={acc.id}
                    value={acc.name}
                    onSelect={() => {
                      onChange({ destinationAccountId: acc.id });
                      setOpen(false);
                    }}
                    className="text-[10px] font-black uppercase flex items-center justify-between py-2 px-2.5 cursor-pointer rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Landmark className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{acc.name}</span>
                    </div>
                    {destinationAccountId === acc.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Aplicação / Resgate
  if (operationType === 'aplicacao' || operationType === 'resgate') {
    const selectedInvest = investments.find(i => i.id === tempInvestmentId);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-xl px-2.5 text-[10px] font-black uppercase transition-all duration-200 border border-transparent focus:outline-none",
              selectedInvest
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              isCompact && "h-9",
              className
            )}
          >
            <span className="truncate flex items-center gap-1.5 min-w-0">
              <PiggyBank className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{selectedInvest ? selectedInvest.name : "INVESTIMENTO..."}</span>
            </span>
            <ChevronDown className="h-3 w-3 opacity-40 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[210px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command className="bg-card">
            <CommandInput
              placeholder="BUSCAR ATIVO..."
              className="h-10 text-[10px] font-black uppercase border-none focus:ring-0"
            />
            <CommandList className="max-h-[240px] overflow-y-auto">
              <CommandEmpty className="py-5 text-[9px] text-center font-black uppercase opacity-40">
                Nenhum investimento
              </CommandEmpty>
              <CommandGroup className="p-1.5 space-y-0.5">
                {investments.map((inv) => (
                  <CommandItem
                    key={inv.id}
                    value={inv.name}
                    onSelect={() => {
                      onChange({ tempInvestmentId: inv.id });
                      setOpen(false);
                    }}
                    className="text-[10px] font-black uppercase flex items-center justify-between py-2 px-2.5 cursor-pointer rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <PiggyBank className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                      <span className="truncate">{inv.name}</span>
                    </div>
                    {tempInvestmentId === inv.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Pagamento de Empréstimo
  if (operationType === 'pagamento_emprestimo') {
    const selectedLoan = loans.find(l => l.id === tempLoanId);
    const availableParcelas = selectedLoan?.parcelas.filter(p => !p.paga) || [];

    return (
      <div className="flex items-center gap-1.5 w-full">
        {/* Contrato */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-8 flex-1 items-center justify-between rounded-xl px-2.5 text-[10px] font-black uppercase transition-all duration-200 border border-transparent focus:outline-none min-w-0",
                selectedLoan
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                isCompact && "h-9",
                className
              )}
            >
              <span className="truncate flex items-center gap-1 min-w-0">
                <CreditCard className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{selectedLoan ? selectedLoan.institution : "CONTRATO..."}</span>
              </span>
              <ChevronDown className="h-3 w-3 opacity-40 shrink-0 ml-1" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[210px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card"
            align="start"
            onWheel={(e) => e.stopPropagation()}
          >
            <Command className="bg-card">
              <CommandInput
                placeholder="BUSCAR CONTRATO..."
                className="h-10 text-[10px] font-black uppercase border-none focus:ring-0"
              />
              <CommandList className="max-h-[240px] overflow-y-auto">
                <CommandEmpty className="py-5 text-[9px] text-center font-black uppercase opacity-40">
                  Nenhum contrato
                </CommandEmpty>
                <CommandGroup className="p-1.5 space-y-0.5">
                  {loans.map((l) => (
                    <CommandItem
                      key={l.id}
                      value={l.institution}
                      onSelect={() => {
                        onChange({ tempLoanId: l.id, tempParcelaId: null });
                        setOpen(false);
                      }}
                      className="text-[10px] font-black uppercase flex items-center justify-between py-2 px-2.5 cursor-pointer rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CreditCard className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                        <span className="truncate">{l.institution}</span>
                      </div>
                      {tempLoanId === l.id && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Parcela */}
        <Popover open={openParcela} onOpenChange={setOpenParcela}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!tempLoanId}
              className={cn(
                "flex h-8 w-14 shrink-0 items-center justify-between rounded-xl px-1.5 text-[10px] font-black uppercase transition-all duration-200 border border-transparent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
                tempParcelaId
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                isCompact && "h-9"
              )}
            >
              <span className="truncate">{tempParcelaId ? `P.${tempParcelaId}` : "PARC."}</span>
              <ChevronDown className="h-3 w-3 opacity-40 shrink-0 ml-0.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[120px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card"
            align="end"
            onWheel={(e) => e.stopPropagation()}
          >
            <Command className="bg-card">
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty className="py-4 text-[9px] text-center font-black uppercase opacity-40">
                  Sem parc.
                </CommandEmpty>
                <CommandGroup className="p-1.5 space-y-0.5">
                  {availableParcelas.map((p) => (
                    <CommandItem
                      key={p.numero}
                      value={String(p.numero)}
                      onSelect={() => {
                        onChange({ tempParcelaId: String(p.numero) });
                        setOpenParcela(false);
                      }}
                      className="text-[10px] font-black uppercase flex items-center justify-between py-1.5 px-2 cursor-pointer rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <span>Parcela {p.numero}</span>
                      {tempParcelaId === String(p.numero) && (
                        <Check className="h-3 w-3 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <span className="text-[10px] font-bold text-muted-foreground opacity-30 italic">
      —
    </span>
  );
}
