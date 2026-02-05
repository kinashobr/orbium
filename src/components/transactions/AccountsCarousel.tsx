import { useRef, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSummary } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { SortableAccountCard } from "./SortableAccountCard";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, TouchSensor } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

interface AccountsCarouselProps {
  accounts: AccountSummary[];
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onAddAccount?: () => void;
  onEditAccount?: (accountId: string) => void;
  onImportAccount?: (accountId: string) => void;
  showHeader?: boolean;
}

export function AccountsCarousel({
  accounts,
  onMovimentar,
  onViewHistory,
  onAddAccount,
  onEditAccount,
  onImportAccount,
  showHeader = true
}: AccountsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { contasMovimento, setContasMovimento } = useFinance();

  const visibleContasMovimento = useMemo(() => contasMovimento.filter(c => !c.hidden), [contasMovimento]);
  const orderedSummaries = useMemo(() => visibleContasMovimento.map(account => accounts.find(s => s.accountId === account.id)).filter((s): s is AccountSummary => !!s), [visibleContasMovimento, accounts]);
  const accountIds = useMemo(() => visibleContasMovimento.map(a => a.id), [visibleContasMovimento]);

  // Configuração refinada dos sensores
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Permite um pequeno movimento antes de travar como drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // Delay de 300ms para ativar o drag (Long Press)
        tolerance: 5, // Tolerância de movimento durante o pressionamento
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const visibleIds = contasMovimento.filter(c => !c.hidden).map(c => c.id);
      const oldIndex = visibleIds.indexOf(active.id as string);
      const newIndex = visibleIds.indexOf(over?.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const visibleAccounts = contasMovimento.filter(c => !c.hidden);
        const newVisibleOrder = arrayMove(visibleAccounts, oldIndex, newIndex);
        
        const newFullOrder = contasMovimento.map(account => {
          const newIndexInVisible = newVisibleOrder.findIndex(v => v.id === account.id);
          if (newIndexInVisible !== -1) {
            return newVisibleOrder[newIndexInVisible];
          }
          return account;
        });

        setContasMovimento(newFullOrder);
      }
    }
  }, [contasMovimento, setContasMovimento]);

  return (
    <div className="relative group/carousel">
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base md:text-lg font-semibold text-foreground">Contas Movimento</h3>
          <div className="flex items-center gap-2">
            {onAddAccount && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-medium"
                onClick={onAddAccount}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nova conta
              </Button>
            )}
          </div>
        </div>
      )}


      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd} 
        modifiers={[restrictToHorizontalAxis]}
      >
        <SortableContext items={accountIds} strategy={horizontalListSortingStrategy}>
          <div 
            ref={scrollContainerRef} 
            className="flex gap-4 pb-4 overflow-x-auto scroll-smooth touch-pan-x px-1 scrollbar-material max-md:[&::-webkit-scrollbar]:h-1"
          >
            {orderedSummaries.map(summary => (
              <SortableAccountCard 
                key={summary.accountId} 
                summary={summary} 
                onMovimentar={onMovimentar} 
                onViewHistory={onViewHistory} 
                onEdit={onEditAccount} 
                onImport={onImportAccount} 
              />
            ))}
 
            {orderedSummaries.length === 0 && (
              <div className="w-[280px] p-6 md:p-8 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/30">
                <p className="text-sm font-medium">Nenhuma conta cadastrada</p>
                {onAddAccount && (
                  <Button variant="outline" size="sm" onClick={onAddAccount} className="rounded-full">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Conta
                  </Button>
                )}
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Mobile Navigation Dots/Indicator */}
      <div className="flex md:hidden justify-center gap-1.5 mt-2">
        {orderedSummaries.slice(0, 5).map((_, idx) => (
          <div 
            key={idx} 
            className="w-1.5 h-1.5 rounded-full bg-border transition-colors"
          />
        ))}
        {orderedSummaries.length > 5 && (
          <span className="text-[10px] text-muted-foreground ml-1">+{orderedSummaries.length - 5}</span>
        )}
      </div>
    </div>
  );
}