import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Car, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { SeguroVeiculo, Veiculo } from "@/types/finance";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SeguroParcelaSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectParcela: (seguroId: number, parcelaNumero: number, valorDevido: number, dataPagamento: string, valorPago: number) => void;
}

interface ParcelaPendente {
  seguro: SeguroVeiculo;
  veiculo: Veiculo | undefined;
  parcela: SeguroVeiculo['parcelas'][0];
  diasVencimento: number;
}

export function SeguroParcelaSelector({
  open,
  onOpenChange,
  onSelectParcela,
}: SeguroParcelaSelectorProps) {
  const { segurosVeiculo, veiculos } = useFinance();
  const hoje = new Date();
  
  const [selectedItem, setSelectedItem] = useState<ParcelaPendente | null>(null);
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [dataPagamentoInput, setDataPagamentoInput] = useState(hoje.toISOString().split('T')[0]);

  const parcelasPendentes = useMemo<ParcelaPendente[]>(() => {
    const pendentes: ParcelaPendente[] = [];
    
    segurosVeiculo.forEach(seguro => {
      const veiculo = veiculos.find(v => v.id === seguro.veiculoId);
      seguro.parcelas.forEach(parcela => {
        if (!parcela.paga) {
          const venc = new Date(parcela.vencimento);
          const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          pendentes.push({ seguro, veiculo, parcela, diasVencimento: dias });
        }
      });
    });
    
    return pendentes.sort((a, b) => a.diasVencimento - b.diasVencimento);
  }, [segurosVeiculo, veiculos]);

  const handleSelect = (item: ParcelaPendente) => {
    setSelectedItem(item);
    setValorPagoInput(item.parcela.valor.toFixed(2).replace('.', ','));
    setDataPagamentoInput(hoje.toISOString().split('T')[0]);
  };
  
  const handleConfirmPayment = () => {
    if (!selectedItem) return;
    
    const valorPago = parseFloat(valorPagoInput.replace(',', '.')) || 0;
    if (valorPago <= 0) {
      toast.error("Informe um valor pago válido.");
      return;
    }
    
    onSelectParcela(
      selectedItem.seguro.id,
      selectedItem.parcela.numero,
      selectedItem.parcela.valor, // Valor Devido
      dataPagamentoInput,
      valorPago // Valor Pago
    );
    setSelectedItem(null);
    onOpenChange(false);
  };
  
  const diferenca = selectedItem ? (parseFloat(valorPagoInput.replace(',', '.')) || 0) - selectedItem.parcela.valor : 0;
  const isJuros = diferenca > 0;
  const isDesconto = diferenca < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Selecionar Parcela de Seguro
          </DialogTitle>
          <DialogDescription>
            Escolha qual parcela de seguro será paga e informe o valor e data de pagamento.
          </DialogDescription>
        </DialogHeader>

        {parcelasPendentes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="w-8 h-8 mx-auto mb-3 text-success" />
            <p className="font-medium">Nenhuma parcela de seguro pendente.</p>
            <p className="text-sm">Todos os seguros estão em dia.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Seguradora</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor Devido</TableHead>
                    <TableHead className="w-20">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelasPendentes.map((item) => {
                    const vencida = item.diasVencimento < 0;
                    const proximaVencer = item.diasVencimento >= 0 && item.diasVencimento <= 7;
                    
                    return (
                      <TableRow 
                        key={`${item.seguro.id}-${item.parcela.numero}`} 
                        className={cn(
                          "hover:bg-muted/50 cursor-pointer",
                          selectedItem?.parcela.numero === item.parcela.numero && "bg-primary/10"
                        )}
                        onClick={() => handleSelect(item)}
                      >
                        <TableCell className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-muted-foreground" />
                          {item.veiculo?.modelo || "N/A"}
                        </TableCell>
                        <TableCell>{item.seguro.seguradora}</TableCell>
                        <TableCell>
                          {item.parcela.numero}/{item.seguro.numeroParcelas}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {new Date(item.parcela.vencimento).toLocaleDateString("pt-BR")}
                            {vencida && (
                              <Badge variant="destructive" className="text-xs">Vencida</Badge>
                            )}
                            {proximaVencer && (
                              <Badge variant="outline" className="text-xs border-warning text-warning">
                                {item.diasVencimento}d
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(item.parcela.valor)}
                        </TableCell>
                        <TableCell>
                          {selectedItem?.parcela.numero === item.parcela.numero ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Button variant="outline" size="sm" className="h-8 px-3">
                              Selecionar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {selectedItem && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <h4 className="font-semibold text-sm">Detalhes do Pagamento</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Devido</Label>
                    <Input disabled value={formatCurrency(selectedItem.parcela.valor)} className="bg-card" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorPago">Valor Pago *</Label>
                    <Input
                      id="valorPago"
                      type="text"
                      inputMode="decimal"
                      value={valorPagoInput}
                      onChange={(e) => setValorPagoInput(e.target.value)}
                      placeholder={selectedItem.parcela.valor.toFixed(2).replace('.', ',')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataPagamento">Data Pagamento *</Label>
                    <Input
                      id="dataPagamento"
                      type="date"
                      value={dataPagamentoInput}
                      onChange={(e) => setDataPagamentoInput(e.target.value)}
                    />
                  </div>
                </div>
                
                {diferenca !== 0 && (
                  <div className={cn(
                    "p-2 rounded-md text-sm flex items-center gap-2",
                    isJuros ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                  )}>
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {isJuros ? "Juros/Multa por Atraso:" : "Desconto por Adiantamento:"} 
                      <span className="font-bold ml-1">{formatCurrency(Math.abs(diferenca))}</span>
                    </span>
                  </div>
                )}
                
                <Button 
                  onClick={handleConfirmPayment} 
                  className="w-full mt-2"
                  disabled={!valorPagoInput || !dataPagamentoInput}
                >
                  Confirmar Pagamento
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}