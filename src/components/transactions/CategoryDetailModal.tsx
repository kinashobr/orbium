import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
      <DialogContent 
        hideCloseButton
        className="max-w-[min(95vw,48rem)] max-h-[min(90vh,800px)] p-0 overflow-hidden flex flex-col rounded-[2rem] shadow-2xl bg-card border-border"
      >
        <DialogHeader className="px-8 pt-10 pb-6 border-b shrink-0 bg-muted/50">
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight">{categoriaLabel}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted p-1 px-2 rounded-lg">
              {percentual.toFixed(1)}% DO TOTAL
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-destructive/[0.03] border border-destructive/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Acumulado</p>
              <p className="text-xl font-black text-destructive tabular-nums">{formatCurrency(totalCategoria)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Transações</p>
              <p className="text-xl font-black text-foreground tabular-nums">{transacoesCategoria.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Variação Mensal</p>
              <div className="flex items-center gap-1.5">
                {variacao >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
                <p className={cn("text-xl font-black tabular-nums", variacao >= 0 ? "text-destructive" : "text-success")}>
                  {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="p-6 rounded-[2rem] bg-card border border-border/40 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-6">Evolução Histórica (6 meses)</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "16px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Gasto"]}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="rounded-[2rem] border border-border/40 overflow-hidden bg-card">
            <div className="px-6 py-4 bg-muted/20 border-b border-border/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Últimos Lançamentos</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableBody>
                  {transacoesCategoria.slice(0, 10).map((t) => (
                    <TableRow key={t.id} className="border-border/40 hover:bg-muted/30">
                      <TableCell className="text-[10px] font-bold uppercase text-muted-foreground pl-6 whitespace-nowrap">
                        {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground">{t.description}</TableCell>
                      <TableCell className="text-sm text-right font-black text-destructive pr-6 whitespace-nowrap tabular-nums">
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {transacoesCategoria.length > 10 && (
              <div className="p-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/10 border-t border-border/40">
                + {transacoesCategoria.length - 10} transações não listadas
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="w-full rounded-full h-12 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};