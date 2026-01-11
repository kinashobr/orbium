import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, XCircle, Calculator, RefreshCw } from "lucide-react";
import { ContaCorrente, formatCurrency, TransacaoCompleta } from "@/types/finance";
import { cn } from "@/lib/utils";

interface ReconciliationPanelProps {
  accounts: ContaCorrente[];
  transactions: TransacaoCompleta[];
  onReconcile: (accountId: string, divergenceHandled: boolean) => void;
}

interface ReconciliationResult {
  accountId: string;
  initialBalance: number;
  calculatedFinal: number;
  entradas: number;
  saidas: number;
  transferIn: number;
  transferOut: number;
  resgates: number;
  aplicacoes: number;
  status: 'ok' | 'warning' | 'error';
  divergence: number;
}

export function ReconciliationPanel({ accounts, transactions, onReconcile }: ReconciliationPanelProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [informedInitialBalance, setInformedInitialBalance] = useState('');
  const [informedFinalBalance, setInformedFinalBalance] = useState('');
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleCalculate = () => {
    if (!selectedAccount) return;

    const accountTransactions = transactions.filter(t => t.accountId === selectedAccountId);

    let entradas = 0;
    let saidas = 0;
    let transferIn = 0;
    let transferOut = 0;
    let resgates = 0;
    let aplicacoes = 0;

    accountTransactions.forEach(t => {
      switch (t.operationType) {
        case 'receita':
          entradas += t.amount;
          break;
        case 'despesa':
        case 'pagamento_emprestimo':
          saidas += t.amount;
          break;
        case 'resgate':
          resgates += t.amount;
          break;
        case 'aplicacao':
          aplicacoes += t.amount;
          break;
        case 'transferencia':
          if (t.flow === 'transfer_in') {
            transferIn += t.amount;
          } else {
            transferOut += t.amount;
          }
          break;
      }
    });

    const initialBalance = informedInitialBalance 
      ? parseFloat(informedInitialBalance.replace(',', '.'))
      : selectedAccount.initialBalance;

    const calculatedFinal = initialBalance + entradas - saidas + transferIn - transferOut + resgates - aplicacoes;

    const informedFinal = informedFinalBalance 
      ? parseFloat(informedFinalBalance.replace(',', '.'))
      : calculatedFinal;

    const divergence = Math.abs(calculatedFinal - informedFinal);

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (divergence > 0 && divergence <= 10) {
      status = 'warning';
    } else if (divergence > 10) {
      status = 'error';
    }

    setResult({
      accountId: selectedAccountId,
      initialBalance,
      calculatedFinal,
      entradas,
      saidas,
      transferIn,
      transferOut,
      resgates,
      aplicacoes,
      status,
      divergence
    });
  };

  const handleReconcile = () => {
    if (!result) return;
    onReconcile(result.accountId, result.divergence <= 10);
    setResult(null);
    setInformedInitialBalance('');
    setInformedFinalBalance('');
  };

  const StatusIcon = result?.status === 'ok' 
    ? CheckCircle2 
    : result?.status === 'warning' 
      ? AlertTriangle 
      : XCircle;

  const statusColors = {
    ok: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    error: 'text-destructive bg-destructive/10 border-destructive/20'
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Conciliação Bancária</CardTitle>
        </div>
        <CardDescription>
          Verifique se o saldo calculado corresponde ao extrato bancário
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="account">Conta</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialBalance">Saldo Inicial (Extrato)</Label>
            <Input
              id="initialBalance"
              placeholder={selectedAccount ? formatCurrency(selectedAccount.initialBalance) : '0,00'}
              value={informedInitialBalance}
              onChange={e => setInformedInitialBalance(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finalBalance">Saldo Final (Extrato)</Label>
            <Input
              id="finalBalance"
              placeholder="Informe o saldo do extrato"
              value={informedFinalBalance}
              onChange={e => setInformedFinalBalance(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleCalculate} className="w-full gap-2">
          <RefreshCw className="w-4 h-4" />
          Calcular Conciliação
        </Button>

        {result && (
          <>
            <Separator />

            <div className={cn(
              "p-4 rounded-lg border",
              statusColors[result.status]
            )}>
              <div className="flex items-start gap-3">
                <StatusIcon className="w-5 h-5 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold">
                    {result.status === 'ok' && 'Saldo Conciliado'}
                    {result.status === 'warning' && 'Pequena Divergência'}
                    {result.status === 'error' && 'Divergência Encontrada'}
                  </h4>
                  <p className="text-sm mt-1">
                    {result.status === 'ok' && 'Os valores calculados conferem com o extrato.'}
                    {result.status === 'warning' && `Diferença de ${formatCurrency(result.divergence)} - verifique taxas ou arredondamentos.`}
                    {result.status === 'error' && `Divergência de ${formatCurrency(result.divergence)} - verifique se há lançamentos faltando.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground block">Saldo Inicial</span>
                <span className="font-semibold">{formatCurrency(result.initialBalance)}</span>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <span className="text-success block">+ Entradas</span>
                <span className="font-semibold text-success">{formatCurrency(result.entradas)}</span>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <span className="text-destructive block">- Saídas</span>
                <span className="font-semibold text-destructive">{formatCurrency(result.saidas)}</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground block">Saldo Calculado</span>
                <span className="font-semibold">{formatCurrency(result.calculatedFinal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-primary/10">
                <span className="text-primary block">Transf. Entrada</span>
                <span className="font-semibold">{formatCurrency(result.transferIn)}</span>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <span className="text-primary block">Transf. Saída</span>
                <span className="font-semibold">{formatCurrency(result.transferOut)}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <span className="text-amber-600 block">Resgates</span>
                <span className="font-semibold">{formatCurrency(result.resgates)}</span>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <span className="text-purple-600 block">Aplicações</span>
                <span className="font-semibold">{formatCurrency(result.aplicacoes)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResult(null)}>
                Cancelar
              </Button>
              <Button onClick={handleReconcile} disabled={result.status === 'error'}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como Conciliado
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
