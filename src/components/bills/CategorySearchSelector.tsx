"use client";

import * as React from "react";
import { Check } from "lucide-react";
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

interface CategorySearchSelectorProps {
  value: string | null;
  categories: Categoria[];
  onSelect: (value: string) => void;
}

export function CategorySearchSelector({
  value,
  categories,
  onSelect,
}: CategorySearchSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCategory = categories.find((c) => c.id === value);

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
            {selectedCategory ? (
              <>
                <span className="text-sm opacity-70">{selectedCategory.icon}</span>
                <span className="truncate">{selectedCategory.label}</span>
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
            placeholder="BUSCAR..." 
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
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0 opacity-70">{category.icon}</span>
                    <span className="truncate">{category.label}</span>
                  </div>
                  {value === category.id && (
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