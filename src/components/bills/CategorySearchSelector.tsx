"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
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
import { Categoria } from "@/types/finance";

export interface CategorySearchSelectorProps {
  value: string | null | undefined;
  categories: Categoria[];
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function CategorySearchSelector({
  value,
  categories,
  onSelect,
  placeholder = "CATEGORIZAR...",
  className,
  allowClear = false,
  clearLabel = "-- Sem Categoria --",
  disabled = false,
  size = 'default',
}: CategorySearchSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCategory = categories.find((c) => c.id === value);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const sizeClasses = {
    sm: "h-7 text-[10px] px-2 rounded-lg",
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
            selectedCategory
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-background/60 text-foreground/80 hover:bg-background border-border/40",
            sizeClasses[size],
            className
          )}
        >
          <span className="truncate flex items-center gap-1.5 min-w-0">
            {selectedCategory ? (
              <>
                <span className="text-xs shrink-0 opacity-80">{selectedCategory.icon || '🏷️'}</span>
                <span className="truncate">{selectedCategory.label}</span>
              </>
            ) : (
              <span className="opacity-40 truncate">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-3 w-3 opacity-40 shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[230px] p-0 z-[300] shadow-2xl border-border/40 rounded-2xl overflow-hidden bg-card" 
        align="start"
        onWheel={handleWheel}
      >
        <Command className="bg-card" onWheel={handleWheel}>
          <CommandInput 
            placeholder="BUSCAR CATEGORIA..." 
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
                    onSelect("");
                    setOpen(false);
                  }}
                  className="text-[10px] font-black uppercase flex items-center justify-between py-2 px-3 cursor-pointer rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="truncate">{clearLabel}</span>
                  {(!value || value === "none") && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </CommandItem>
              )}
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.label}
                  onSelect={() => {
                    onSelect(category.id);
                    setOpen(false);
                  }}
                  className="text-[10px] font-black uppercase flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-xl hover:bg-muted/50 aria-selected:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span className="text-xs shrink-0 opacity-80">{category.icon || '🏷️'}</span>
                    <span className="truncate">{category.label}</span>
                  </div>
                  {value === category.id && (
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