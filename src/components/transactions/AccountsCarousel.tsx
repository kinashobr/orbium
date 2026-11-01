import { useRef, useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSummary } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { SortableAccountCard } from "./SortableAccountCard";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragStartEvent 
} from "@dnd-kit/core";
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

  const isDndActiveRef = useRef(false);
  const [, setIsDndActive] = useState(false);

  const visibleContasMovimento = useMemo(() => contasMovimento.filter(c => !c.hidden), [contasMovimento]);
  const orderedSummaries = useMemo(() => visibleContasMovimento.map(account => accounts.find(s => s.accountId === account.id)).filter((s): s is AccountSummary => !!s), [visibleContasMovimento, accounts]);
  const accountIds = useMemo(() => visibleContasMovimento.map(a => a.id), [visibleContasMovimento]);

  // Sensores otimizados para Mouse e Touch
  // Long-press de 250ms ativa a troca de posição (DND)
  // Arraste rápido antes de 250ms ativa a rolagem da barra (Grab Scroll)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 250, // Segurar o botão do mouse por 250ms ativa o DND
        tolerance: 5, // Se mover mais de 5px durante os 250ms, desativa DND para permitir rolagem
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Segurar o toque por 250ms ativa DND
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDndActiveRef.current = true;
    setIsDndActive(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    isDndActiveRef.current = false;
    setIsDndActive(false);

    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const visibleAccounts = contasMovimento.filter(c => !c.hidden);
      const oldIndex = visibleAccounts.findIndex(c => c.id === active.id);
      const newIndex = visibleAccounts.findIndex(c => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newVisibleOrder = arrayMove(visibleAccounts, oldIndex, newIndex);
        
        let visibleIdx = 0;
        const newFullOrder = contasMovimento.map(account => {
          if (account.hidden) return account;
          return newVisibleOrder[visibleIdx++];
        });

        setContasMovimento(newFullOrder);
      }
    }
  }, [contasMovimento, setContasMovimento]);

  const momentumRef = useRef<number | null>(null);

  const handleDragCancel = useCallback(() => {
    isDndActiveRef.current = false;
    setIsDndActive(false);
  }, []);

  // Lógica de Grab-to-Scroll dinâmico e fluido usando Mouse
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    // Cancela qualquer inércia anterior ao clicar
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    const target = e.target as HTMLElement;
    // Ignora apenas elementos interativos reais (botões, menus, links, inputs)
    // NOTA: NÃO incluir [role="button"] porque o dnd-kit adiciona role="button" ao wrapper do card
    if (target.closest('button, [role="menuitem"], a, input, select')) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const startX = e.pageX;
    const initialScrollLeft = container.scrollLeft;
    let isDraggingScroll = false;

    let lastPageX = e.pageX;
    let lastTime = performance.now();
    let velocity = 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Se a reordenação (dnd-kit) ativou pelo long-press de 250ms, não executa scroll
      if (isDndActiveRef.current) return;

      const dx = moveEvent.pageX - startX;
      if (Math.abs(dx) > 4) {
        if (!isDraggingScroll) {
          isDraggingScroll = true;
          document.body.style.userSelect = "none";
          container.style.cursor = "grabbing";
        }
        moveEvent.preventDefault();
        container.scrollLeft = initialScrollLeft - dx;

        // Calcular velocidade em tempo real para inércia fluida
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 8) {
          velocity = (moveEvent.pageX - lastPageX) / dt;
          lastPageX = moveEvent.pageX;
          lastTime = now;
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      document.body.style.userSelect = "";
      if (container) {
        container.style.cursor = "";
      }

      if (isDraggingScroll) {
        // Se soltou com velocidade (flick), aplica inércia suave e dinâmica
        if (Math.abs(velocity) > 0.15 && !isDndActiveRef.current) {
          let currentSpeed = velocity * 15;
          const friction = 0.93;
          const animateMomentum = () => {
            if (!scrollContainerRef.current || Math.abs(currentSpeed) < 0.4) {
              momentumRef.current = null;
              return;
            }
            scrollContainerRef.current.scrollLeft -= currentSpeed;
            currentSpeed *= friction;
            momentumRef.current = requestAnimationFrame(animateMomentum);
          };
          momentumRef.current = requestAnimationFrame(animateMomentum);
        }

        const preventClickAfterDrag = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener("click", preventClickAfterDrag, true);
        };
        window.addEventListener("click", preventClickAfterDrag, true);
        setTimeout(() => {
          window.removeEventListener("click", preventClickAfterDrag, true);
        }, 50);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
  };

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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel}
        modifiers={[restrictToHorizontalAxis]}
      >
        <SortableContext items={accountIds} strategy={horizontalListSortingStrategy}>
          <div 
            ref={scrollContainerRef} 
            onMouseDown={handleMouseDown}
            onDragStart={(e) => e.preventDefault()}
            className="flex gap-4 pb-4 overflow-x-auto touch-pan-x px-1 scrollbar-material max-md:[&::-webkit-scrollbar]:h-1 cursor-grab"
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