"use client";

import * as React from "react";
import { Check, Building2, CreditCard } from "lucide-react";
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

interface AccountSearchSelectorProps {
  value: string | null;
  accounts: ContaCorrente[];
  onSelect: (value: string) => void;
}

export function AccountSearchSelector({
  value,
  accounts,
  onSelect,
}: AccountSearchSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedAccount = accounts.find((a) => a.id === value);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-9 w-full items-center justify-between rounded-xl bg-background/50 px-3 text-[10px] font-black uppercase transition-colors hover:bg-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate flex items-center gap-1.5">
            {selectedAccount ? (
              <>
                {selectedAccount.accountType === 'cartao_credito' ? (
                  <CreditCard className="h-3 w-3 opacity-50" />
                ) : (
                  <Building2 className="h-3 w-3 opacity-50" />
                )}
                <span className="truncate">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="opacity-40">...</span>
            )}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 opacity-30"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[220px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden" 
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
            <CommandGroup className="p-1.5">
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
                      <CreditCard className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    )}
                    <span className="truncate">{account.name}</span>
                  </div>
                  {value === account.id && (
                    <Check className="h-3 w-3 text-primary shrink-0" />
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