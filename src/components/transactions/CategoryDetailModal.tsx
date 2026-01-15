import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransacaoCompleta } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { parseISO } from "date-fns";

interface CategoryDetailModalProps {
  categoryId: string;
  transacoes: TransacaoCompleta[];
  totalCategoria: number;
  percentual: number;
  children: React.ReactNode;
}

export const CategoryDetailModal = ({ 
  categoryId, 
  transacoes, 
  totalCategoria, 
  percentual,
  children 
}: CategoryDetailModalProps) => {
  const [open, setOpen] = useState(false);
  const { categoriasV2 } = useFinance();
  
  const categoriaLabel = useMemo(() => 
    categoriasV2.find(c => c.id === categoryId)?.label || 'Categoria Desconhecida',
    [categoryId, categoriasV2]
  );

  const transacoesCategoria = useMemo(() => 
    transacoes
      .filter(t => t.categoryId === categoryId && (t.operationType === "despesa" || t.operationType === "pagamento_emprestimo"))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
    [transacoes, categoryId]
  );

  // Agrupar por mês
  const { chartData, variacao } = useMemo(() => {
    const gastosPorMes: Record<string, number> = {};
    transacoesCategoria.forEach(t => {
      const mes = t.date.substring(0, 7); // YYYY-MM
      gastosPorMes[mes] = (gastosPorMes[mes] || 0) + t.amount;
    });

    const valores = Object.entries(gastosPorMes).sort(([a], [b]) => a.localeCompare(b));
    const ultimoMes = valores[valores.length - 1]?.[1] || 0;
    const penultimoMes = valores[valores.length - 2]?.[1] || 0;
    const variacao = penultimoMes > 0 ? ((ultimoMes - penultimoMes) / penultimoMes) * 100 : 0;

    const chartData = valores
      .slice(-6)
      .map(([mes, valor]) => {
        const [year, month] = mes.split("-");
        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return {
          mes: meses[parseInt(month) - 1],
          valor,
        };
      });
      
    return { chartData, variacao };
  }, [transacoesCategoria]);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[min(95vw,48rem)] max-h-[min(80vh,700px)] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{categoriaLabel}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {percentual.toFixed(1)}% do total
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalCategoria)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">Transações</p>
              <p className="text-lg font-bold text-foreground">{transacoesCategoria.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground">Variação Mensal</p>
              <div className="flex items-center gap-1">
                {variacao >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
                <p className={cn("text-lg font-bold", variacao >= 0 ? "text-destructive" : "text-success")}>
                  {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm font-medium mb-3">Evolução Mensal</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "hsl(220, 20%, 8%)", 
                        border: "1px solid hsl(220, 20%, 18%)", 
                        borderRadius: "8px" 
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Valor"]}
                    />
                    <Bar dataKey="valor" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground whitespace-nowrap">Data</TableHead>
                    <TableHead className="text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-muted-foreground text-right whitespace-nowrap">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesCategoria.slice(0, 10).map((t) => (
                    <TableRow key={t.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{t.description}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-destructive whitespace-nowrap">
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {transacoesCategoria.length > 10 && (
              <div className="p-2 text-center text-sm text-muted-foreground border-t border-border">
                + {transacoesCategoria.length - 10} transações
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};