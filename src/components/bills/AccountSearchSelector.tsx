"use client";

import * as React from "react";
import { Check, Building2, CreditCard, ChevronDown } from "lucide-react";
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
import { ContaCorrente } from "@/types/finance";

export interface AccountSearchSelectorProps {
  value: string | null | undefined;
  accounts: ContaCorrente[];
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function AccountSearchSelector({
  value,
  accounts,
  onSelect,
  placeholder = "SELECIONE...",
  className,
  allowClear = false,
  clearLabel = "-- Não vinculada --",
  disabled = false,
  size = 'default',
}: AccountSearchSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedAccount = accounts.find((a) => a.id === value);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const sizeClasses = {
    sm: "h-8 text-[10px] px-2.5 rounded-xl",
    default: "h-9 text-[10px] px-3 rounded-xl",
    lg: "h-11 text-xs px-4 rounded-2xl border-2 bg-card hover:border-primary/30",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between font-black uppercase transition-all duration-200 border border-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            selectedAccount
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-background/60 text-foreground/80 hover:bg-background border-border/40",
            sizeClasses[size],
            className
          )}
        >
          <span className="truncate flex items-center gap-2 min-w-0">
            {selectedAccount ? (
              <>
                {selectedAccount.accountType === 'cartao_credito' ? (
                  <CreditCard className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span className="truncate">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="opacity-40 truncate">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-40 shrink-0 ml-1.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[240px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card" 
        align="start"
        onWheel={handleWheel}
      >
        <Command className="bg-card" onWheel={handleWheel}>
          <CommandInput 
            placeholder="BUSCAR CONTA..." 
            className="h-10 text-[10px] font-black uppercase border-none focus:ring-0" 
          />
          <CommandList 
            className="max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onWheel={handleWheel}
          >
            <CommandEmpty className="py-6 text-[9px] text-center font-black uppercase opacity-30 tracking-widest">
              Não encontrado
            </CommandEmpty>
            <CommandGroup className="p-1.5 space-y-0.5">
              {allowClear && (
                <CommandItem
                  value={clearLabel}
                  onSelect={() => {
                    onSelect("none");
                    setOpen(false);
                  }}
                  className="text-[10px] font-black uppercase flex items-center justify-between py-2 px-3 cursor-pointer rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="truncate">{clearLabel}</span>
                  {(!value || value === "none") && (
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  )}
                </CommandItem>
              )}
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.name}
                  onSelect={() => {
                    onSelect(account.id);
                    setOpen(false);
                  }}
                  className="text-[10px] font-black uppercase flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-xl hover:bg-muted/50 aria-selected:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    {account.accountType === 'cartao_credito' ? (
                      <CreditCard className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <span className="truncate">{account.name}</span>
                  </div>
                  {value === account.id && (
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