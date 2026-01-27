"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ArrowLeftRight, TrendingUp, TrendingDown, CreditCard, DollarSign, Car, Coins, FileText, Check, Sparkles, ArrowLeft } from "lucide-react";
import { ContaCorrente, Categoria, generateTransactionId, generateTransferGroupId, OperationType, TransacaoCompleta, getFlowTypeFromOperation, getDomainFromOperation, InvestmentInfo, OPERATION_TYPE_LABELS } from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas: { numero: number; vencimento: string; valor: number; paga: boolean; }[];
  valorParcela: number;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  segurosVeiculo: any[];
  veiculos: any[];
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => void;
  editingTransaction?: TransacaoCompleta;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; icon: any; color: string; bgColor: string }[] = [
  { value: 'receita', label: 'Receita', icon: Plus, color: 'text-success', bgColor: 'bg-success/10' },
  { value: 'despesa', label: 'Despesa', icon: Minus, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'resgate', label: 'Resgate', icon: TrendingDown, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'liberacao_emprestimo', label: 'Liberação', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'veiculo', label: 'Veículo', icon: Car, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'rendimento', label: 'Rendimento', icon: Coins, color: 'text-primary', bgColor: 'bg-primary/10' },
];

const parseFromBR = (v: string): number => {
    const cleaned = v.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

export function MovimentarContaModal({ open, onOpenChange, accounts, categories, investments, loans, selectedAccountId, onSubmit, editingTransaction }: MovimentarContaModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [operationType, setOperationType] = useState<OperationType | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);

  const isEditing = !!editingTransaction;

  // Body scroll lock for mobile fullscreen
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, open]);

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setAccountId(editingTransaction.accountId); setDate(editingTransaction.date); setAmount(editingTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        setOperationType(editingTransaction.operationType); setCategoryId(editingTransaction.categoryId); setDescription(editingTransaction.description);
      } else {
        setAccountId(selectedAccountId || accounts[0]?.id || ''); setDate(new Date().toISOString().split('T')[0]); setAmount("");
        setOperationType('despesa'); setCategoryId(null); setDescription(""); setDestinationAccountId(null);
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFromBR(amount);
    if (!accountId || !date || parsedAmount <= 0 || !operationType) { toast.error("Preencha os campos obrigatórios"); return; }
    
    const baseTx: TransacaoCompleta = {
      id: editingTransaction?.id || generateTransactionId(), date, accountId, flow: getFlowTypeFromOperation(operationType), operationType, domain: getDomainFromOperation(operationType), amount: parsedAmount, categoryId, description: description.trim() || OPERATION_TYPE_LABELS[operationType], links: { investmentId: null, loanId: null, transferGroupId: editingTransaction?.links?.transferGroupId || null, parcelaId: null, vehicleTransactionId: null }, conciliated: false, attachments: [], meta: { createdBy: 'user', source: 'manual', createdAt: new Date().toISOString() }
    };

    let transferGroup;
    if (operationType === 'transferencia' && destinationAccountId) {
      transferGroup = { id: editingTransaction?.links?.transferGroupId || generateTransferGroupId(), fromAccountId: accountId, toAccountId: destinationAccountId, amount: parsedAmount, date, description: baseTx.description };
    }
    
    onSubmit(baseTx, transferGroup);
    onOpenChange(false);
  };

  const op = OPERATION_OPTIONS.find(o => o.value === operationType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[34rem] max-h-[90vh] rounded-[2.5rem]"
        )}
      >
        <DialogHeader className={cn(
          "px-6 sm:px-8 pt-6 sm:pt-10 pb-6 sm:pb-8 shrink-0 relative transition-colors duration-500", 
          op?.bgColor || "bg-muted/30",
          isMobile && "pt-4"
        )} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}>
          <div className="flex items-center gap-4 sm:gap-5">
            {isMobile && (
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className={cn("w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] bg-card flex items-center justify-center shadow-xl transition-transform duration-500", op?.color)}>
              {op ? <op.icon size={28} /> : <DollarSign size={28} />}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter">{isEditing ? "Editar Registro" : "Novo Lançamento"}</DialogTitle>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mt-1"><Sparkles className="w-3.5 h-3.5 text-primary" /> Inteligência Orbium</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 sm:px-8">
          <div className="py-6 sm:py-8 space-y-8 sm:space-y-10 pb-32 sm:pb-8">
            <div className="text-center space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Valor do Lançamento</Label>
              <div className="relative max-w-[280px] mx-auto group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-black text-muted-foreground/20">R$</span>
                <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))} className="h-16 sm:h-20 text-4xl sm:text-5xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums" placeholder="0,00" />
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
               <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Operação</Label>
                 <Select value={operationType || ''} onValueChange={(v) => setOperationType(v as OperationType)}>
                   <SelectTrigger className="h-12 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-2xl shadow-2xl border-none p-2">
                     {OPERATION_OPTIONS.map(o => (
                       <SelectItem key={o.value} value={o.value} className="rounded-xl font-bold py-3"><div className="flex items-center gap-3"><div className={cn("p-1.5 rounded-lg", o.bgColor)}>{React.createElement(o.icon, { size: 16, className: o.color })}</div>{o.label}</div></SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Data</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-2xl border-none bg-muted/20 font-bold shadow-inner" />
               </div>
            </div>

            <div className="space-y-3">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Conta de Origem</Label>
               <Select value={accountId} onValueChange={setAccountId}>
                 <SelectTrigger className="h-12 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue /></SelectTrigger>
                 <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {accounts.map(a => <SelectItem key={a.id} value={a.id} className="font-bold">{a.name}</SelectItem>)}
                 </SelectContent>
               </Select>
            </div>

            {operationType === 'transferencia' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-1">Conta de Destino</Label>
                <Select value={destinationAccountId || ''} onValueChange={setDestinationAccountId}>
                  <SelectTrigger className="h-12 rounded-2xl border-2 border-primary/20 bg-primary/5 font-bold"><SelectValue placeholder="Selecione o destino..." /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                     {accounts.filter(a => a.id !== accountId).map(a => <SelectItem key={a.id} value={a.id} className="font-bold">{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Descrição</Label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-24 p-4 pl-12 rounded-[1.5rem] border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner resize-none font-medium text-sm" placeholder="Opcional..." />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter 
          className={cn(
            "p-6 sm:p-8 bg-muted/10 shrink-0 flex flex-col sm:flex-row gap-4",
            isMobile && "fixed bottom-0 left-0 right-0 border-t bg-card"
          )}
          style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
        >
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-14 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          )}
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-14 bg-primary text-primary-foreground font-black text-sm gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all order-1 sm:order-2"><Check size={20} /> {isEditing ? "SALVAR ALTERAÇÕES" : "CONFIRMAR REGISTRO"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}