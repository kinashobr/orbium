"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isSameDay, startOfDay, endOfDay, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { DateRange, ComparisonDateRanges } from "@/types/finance";

interface PeriodSelectorProps {
  onDateRangeChange: (ranges: ComparisonDateRanges) => void;
  initialRanges: ComparisonDateRanges;
  className?: string;
}

const presets = [
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3 meses" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

export function PeriodSelector({
  onDateRangeChange,
  initialRanges,
  className,
}: PeriodSelectorProps) {
  const safeInitialRange1 = initialRanges.range1 || { from: undefined, to: undefined };
  
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(safeInitialRange1);
  const [tempRange, setTempRange] = useState<DateRange>(safeInitialRange1);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  const calculateRangeFromPreset = useCallback((presetId: string): DateRange => {
    const today = new Date();
    
    switch (presetId) {
      case "thisMonth":
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "last3Months":
        const last3Months = subMonths(today, 2);
        return { from: startOfMonth(last3Months), to: endOfMonth(today) };
      case "thisYear":
        return { from: startOfYear(today), to: endOfYear(today) };
      case "all":
        return { from: undefined, to: undefined };
      default:
        return { from: undefined, to: undefined };
    }
  }, []);

  const calculateComparisonRange = useCallback((range1: DateRange): DateRange => {
    if (!range1.from || !range1.to) {
      return { from: undefined, to: undefined };
    }
    
    const isFullMonth = isSameDay(range1.from, startOfMonth(range1.from)) && 
                        isSameDay(range1.to, endOfMonth(range1.to));

    if (isFullMonth) {
      const prevMonth = subMonths(range1.from, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }
    
    const diffInDays = differenceInDays(range1.to, range1.from) + 1;
    const prevTo = subDays(range1.from, 1);
    const prevFrom = subDays(prevTo, diffInDays - 1);
    
    return { from: prevFrom, to: prevTo };
  }, []);

  const getActivePresetId = useCallback((currentRange: DateRange): string => {
    if (!currentRange.from && !currentRange.to) return "all";

    for (const preset of presets) {
      const calculatedRange = calculateRangeFromPreset(preset.id);
        
      if (calculatedRange.from && calculatedRange.to && 
          isSameDay(currentRange.from, calculatedRange.from) && 
          isSameDay(currentRange.to, calculatedRange.to)) {
        return preset.id;
      }
    }
    return "custom";
  }, [calculateRangeFromPreset]);

  useEffect(() => {
    setRange(initialRanges.range1);
    setSelectedPreset(getActivePresetId(initialRanges.range1));
  }, [initialRanges, getActivePresetId]);

  useEffect(() => {
    if (isOpen) {
      setTempRange(range);
    }
  }, [isOpen, range]);

  const handleApply = useCallback((newRange: DateRange) => {
    const finalRange1: DateRange = newRange.from ? normalizeRange(newRange) : { from: undefined, to: undefined };
    const finalRange2 = calculateComparisonRange(finalRange1);
    
    setRange(finalRange1);
    onDateRangeChange({ range1: finalRange1, range2: finalRange2 });
  }, [onDateRangeChange, calculateComparisonRange]);
  
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const newRange = calculateRangeFromPreset(presetId);
    handleApply(newRange);
    setIsOpen(false);
  };

  const handleCalendarApply = () => {
    if (!tempRange.from && !tempRange.to) return;
    const newRange: DateRange = (tempRange.from && tempRange.to && tempRange.from > tempRange.to)
      ? { from: tempRange.to, to: tempRange.from }
      : { from: tempRange.from, to: tempRange.to };

    setSelectedPreset('custom');
    handleApply(newRange);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    handleApply({ from: undefined, to: undefined });
    setSelectedPreset('all');
    setIsOpen(false);
  };

  const normalizeRange = (r: DateRange): DateRange => ({
    from: r.from ? startOfDay(r.from) : undefined,
    to: r.to ? endOfDay(r.to) : undefined,
  });

  const formatDateRange = (r: DateRange | undefined) => {
    if (!r || (!r.from && !r.to)) return "Todo o período";
    if (!r.from || !r.to) return "Selecione...";
    
    const fromDate = r.from as Date;
    const toDate = r.to as Date;

    const fromStr = format(fromDate, "dd MMM", { locale: ptBR });
    const toStr = format(toDate, "dd MMM", { locale: ptBR });

    if (isSameDay(fromDate, toDate)) return format(fromDate, "dd 'de' MMMM", { locale: ptBR });
    return `${fromStr} - ${toStr}`;
  };
  
  const handleCalendarSelect = (newSelection: DateRange | undefined) => {
    if (!newSelection) {
      setTempRange({ from: undefined, to: undefined });
      return;
    }
    const { from, to } = newSelection;
    if (from && tempRange.from && isSameDay(from, tempRange.from) && !to) {
      setTempRange({ from: undefined, to: undefined });
    } else {
      setTempRange(newSelection);
    }
  };

  const displayRange = useMemo(() => formatDateRange(range), [range]);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-auto justify-center text-center h-12 sm:h-10 px-6 sm:px-4 rounded-full border-border/40 bg-card shadow-sm hover:shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-300 group mx-auto sm:mx-0",
            (!range.from && !range.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 sm:mr-2.5 h-4 w-4 sm:h-4 sm:w-4 shrink-0 text-primary transition-transform group-hover:scale-110" />
          <span className="text-sm sm:text-sm font-black tracking-tight truncate capitalize">
            {displayRange}
          </span>
          <ChevronDown className={cn(
            "ml-2 h-4 w-4 opacity-50 shrink-0 transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="p-3 bg-popover text-popover-foreground border-border/40 w-[min(calc(100vw-2rem),20rem)] sm:w-auto shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-[2rem]"
        side="bottom"
        align="center"
        sideOffset={12}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Presets Column */}
          <div className="sm:w-[160px] shrink-0 flex flex-col gap-1 sm:border-r border-border/40 pr-0 sm:pr-3">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/80">Recentes</Label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={cn(
                    "flex items-center w-full px-3 py-2.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-left text-xs sm:text-xs font-black transition-all duration-200",
                    selectedPreset === preset.id 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="truncate">{preset.label}</span>
                  {selectedPreset === preset.id && <Check className="ml-auto w-3 h-3 hidden sm:block" />}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Area */}
          <div className="space-y-4 flex flex-col items-center pt-1 overflow-hidden">
            <Calendar
              mode="range"
              selected={{ from: tempRange.from, to: tempRange.to }}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              locale={ptBR}
              initialFocus
              className="p-0 pointer-events-auto scale-90 sm:scale-100"
              classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-4",
                caption: "relative flex items-center justify-center h-10 mb-4 px-10",
                caption_label: "text-sm font-black text-foreground uppercase tracking-widest",
                nav: "absolute inset-0 flex items-center justify-between px-2 pointer-events-none",
                nav_button: cn(
                  "h-8 w-8 bg-muted rounded-full flex items-center justify-center transition-colors hover:bg-primary/10 hover:text-primary pointer-events-auto z-10"
                ),
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 mb-2",
                head_cell: "text-muted-foreground font-black text-[10px] uppercase tracking-tighter text-center",
                row: "grid grid-cols-7 gap-y-1 w-full",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                day: cn(
                  "h-8 w-8 p-0 font-bold rounded-xl transition-all duration-200 flex items-center justify-center mx-auto hover:bg-primary/10 hover:text-primary"
                ),
                day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary rounded-none",
                day_selected: "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground z-10",
                day_today: "bg-muted/50 text-foreground ring-1 ring-inset ring-border",
                day_outside: "text-muted-foreground/20 opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_start: "rounded-l-xl day-range-start",
                day_range_end: "rounded-r-xl day-range-end",
                day_hidden: "invisible",
              }}
            />
            
            <div className="flex items-center gap-2 w-full pt-4 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-9 px-4 rounded-full text-[10px] sm:text-xs font-bold text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
              >
                Limpar
              </Button>
              <Button 
                onClick={handleCalendarApply} 
                className="flex-1 h-9 rounded-full text-[10px] sm:text-xs font-bold gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-all"
                disabled={!tempRange.from || !tempRange.to}
              >
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}