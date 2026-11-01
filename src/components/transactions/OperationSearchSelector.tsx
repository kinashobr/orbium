"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  PiggyBank,
  Wallet,
  CreditCard,
  DollarSign,
  Car,
  Coins,
  Building2,
  ChevronDown
} from "lucide-react";
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
import { OperationType } from "@/types/finance";

export interface OperationOption {
  value: OperationType;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export const OPERATION_OPTIONS: OperationOption[] = [
  { value: 'receita', label: 'Receita', color: 'text-success', bgColor: 'bg-success/10 text-success border-success/20', icon: TrendingUp, description: 'Entrada' },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive', bgColor: 'bg-destructive/10 text-destructive border-destructive/20', icon: TrendingDown, description: 'Saída' },
  { value: 'transferencia', label: 'Transferência', color: 'text-primary', bgColor: 'bg-primary/10 text-primary border-primary/20', icon: ArrowLeftRight, description: 'Entre contas' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500', bgColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: PiggyBank, description: 'Investir' },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500', bgColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Wallet, description: 'Resgatar' },
  { value: 'pagamento_emprestimo', label: 'Empréstimo', color: 'text-orange-500', bgColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: CreditCard, description: 'Pagamento' },
  { value: 'liberacao_emprestimo', label: 'Liberação', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: DollarSign, description: 'Financiamento' },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500', bgColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Car, description: 'Ativo' },
  { value: 'imobilizado', label: 'Imobilizado', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: Building2, description: 'Bens Imóveis' },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500', bgColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20', icon: Coins, description: 'Juros' },
];

interface OperationSearchSelectorProps {
  value: OperationType | null | '';
  onSelect: (value: OperationType) => void;
  disabled?: boolean;
  className?: string;
  filterFlow?: 'in' | 'out';
}

export function OperationSearchSelector({
  value,
  onSelect,
  disabled = false,
  className,
  filterFlow,
}: OperationSearchSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const availableOptions = React.useMemo(() => {
    let opts = OPERATION_OPTIONS;
    if (filterFlow === 'in') {
      const allowedIn: OperationType[] = ['receita', 'transferencia', 'resgate', 'rendimento', 'liberacao_emprestimo', 'veiculo', 'imobilizado'];
      opts = opts.filter(o => allowedIn.includes(o.value));
    } else if (filterFlow === 'out') {
      const allowedOut: OperationType[] = ['despesa', 'transferencia', 'pagamento_emprestimo', 'veiculo', 'imobilizado'];
      opts = opts.filter(o => allowedOut.includes(o.value));
    }
    return opts;
  }, [filterFlow]);

  const selectedOp = availableOptions.find((o) => o.value === value) || OPERATION_OPTIONS.find((o) => o.value === value);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const SelectedIcon = selectedOp?.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-xl px-2.5 text-[10px] font-black uppercase transition-all duration-200 border border-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            selectedOp ? selectedOp.bgColor : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            className
          )}
        >
          <span className="truncate flex items-center gap-1.5 min-w-0">
            {selectedOp && SelectedIcon ? (
              <>
                <SelectedIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{selectedOp.label}</span>
              </>
            ) : (
              <span className="opacity-40">TIPO...</span>
            )}
          </span>
          <ChevronDown className="h-3 w-3 opacity-40 shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[210px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card"
        align="start"
        onWheel={handleWheel}
      >
        <Command className="bg-card" onWheel={handleWheel}>
          <CommandInput
            placeholder="BUSCAR OPERAÇÃO..."
            className="h-10 text-[10px] font-black uppercase border-none focus:ring-0"
          />
          <CommandList
            className="max-h-[260px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onWheel={handleWheel}
          >
            <CommandEmpty className="py-5 text-[9px] text-center font-black uppercase opacity-40 tracking-wider">
              Nenhuma operação
            </CommandEmpty>
            <CommandGroup className="p-1.5 space-y-0.5">
              {availableOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    className="text-[10px] font-black uppercase flex items-center justify-between py-2 px-2.5 cursor-pointer rounded-xl hover:bg-muted/50 aria-selected:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div className={cn("p-1 rounded-lg shrink-0", option.bgColor)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
