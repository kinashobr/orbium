import { 
  ShoppingCart, Car, Home, Briefcase, Heart, 
  Utensils, Plane, Zap, ChevronRight, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, parseDateLocal } from "@/lib/utils";
import { TransacaoCompleta } from "@/types/finance";
import { useNavigate } from "react-router-dom";
import { useFinance } from "@/contexts/FinanceContext";

interface TransacoesRecentesProps {
  transacoes: TransacaoCompleta[];
  limit?: number;
}

const categoriaIcons: Record<string, React.ElementType> = {
  "Alimentação": Utensils,
  "Transporte": Car,
  "Moradia": Home,
  "Lazer": Plane,
  "Saúde": Heart,
  "Salário": Briefcase,
  "Freelance": Zap,
  "Outros": ShoppingCart,
};

export function TransacoesRecentes({ transacoes, limit = 8 }: TransacoesRecentesProps) {
  const navigate = useNavigate();
  const { categoriasV2 } = useFinance();

  const recentTransacoes = [...transacoes]
    .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())
    .slice(0, limit);

  const formatDate = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const getCategoryLabel = (categoryId: string | null) => {
    if (!categoryId) return 'Transferência/Outros';
    return categoriasV2.find(c => c.id === categoryId)?.label || 'Outros';
  };

  const getIcon = (categoryId: string | null) => {
    const label = getCategoryLabel(categoryId);
    return categoriaIcons[label] || DollarSign;
  };

  return (
    <TooltipProvider>
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Últimos Lançamentos</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate("/receitas-despesas")}
          >
            Ver todas <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="space-y-2">
          {recentTransacoes.map((transacao) => {
            const Icon = getIcon(transacao.categoryId);
            const isReceita = transacao.flow === "in" || transacao.flow === "transfer_in";
            const categoryLabel = getCategoryLabel(transacao.categoryId);
            
            return (
              <Tooltip key={transacao.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isReceita ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                          {transacao.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabel} • {formatDate(transacao.date)}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold text-sm",
                      isReceita ? "text-success" : "text-destructive"
                    )}>
                      {isReceita ? "+" : "-"} R$ {transacao.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">{transacao.description}</p>
                    <p>Categoria: {categoryLabel}</p>
                    <p>Data: {parseDateLocal(transacao.date).toLocaleDateString("pt-BR")}</p>
                    <p>Valor: R$ {transacao.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {transacoes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação registrada
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}