"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ArrowLeftRight, TrendingUp, TrendingDown, CreditCard, DollarSign, Car, Coins, FileText, Check, Sparkles, ArrowLeft, Shield } from "lucide-react";
import { 
  ContaCorrente, 
  Categoria, 
  generateTransactionId, 
  generateTransferGroupId, 
  OperationType, 
  TransacaoCompleta, 
  getFlowTypeFromOperation, 
  getDomainFromOperation, 
  InvestmentInfo, 
  OPERATION_TYPE_LABELS,
  TransactionLinks,
  TransactionMeta,
  SeguroVeiculo
} from "@/types/finance";
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
  segurosVeiculo: SeguroVeiculo[];
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
    const cleaned = v.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

const formatToBR = (v: number): string => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function MovimentarContaModal({ open, onOpenChange, accounts, categories, investments, loans, segurosVeiculo, veiculos, selectedAccountId, onSubmit, editingTransaction }: MovimentarContaModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [operationType, setOperationType] = useState<OperationType | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [tempInvestmentId, setTempInvestmentId] = useState<string | null>(null);
  const [tempLoanId, setTempLoanId] = useState<string | null>(null);
  const [tempParcelaId, setTempParcelaId] = useState<string | null>(null);
  const [tempVehicleOperation, setTempVehicleOperation] = useState<'compra' | 'venda' | null>(null);
  const [tempVehicleId, setTempVehicleId] = useState<string | null>(null);

  // Estados para Vínculo de Seguro
  const [tempSeguroId, setTempSeguroId] = useState<string | null>(null);
  const [tempSeguroParcelaId, setTempSeguroParcelaId] = useState<string | null>(null);

  const isEditing = !!editingTransaction;

  const isSeguroCategory = useMemo(() => {
    if (!categoryId || operationType !== 'despesa') return false;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.label.toLowerCase().includes('seguro');
  }, [categoryId, operationType, categories]);

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setAccountId(editingTransaction.accountId); 
        setDate(editingTransaction.date); 
        setAmount(formatToBR(editingTransaction.amount));
        setOperationType(editingTransaction.operationType); 
        setCategoryId(editingTransaction.categoryId); 
        setDescription(editingTransaction.description);
        
        if (editingTransaction.operationType === 'transferencia') {
            setDestinationAccountId(editingTransaction.links.transferGroupId ? "shared" : null); 
        }
        setTempInvestmentId(editingTransaction.links.investmentId);
        setTempLoanId(editingTransaction.links.loanId);
        setTempParcelaId(editingTransaction.links.parcelaId);
        setTempVehicleOperation(editingTransaction.meta.vehicleOperation || null);
        setTempVehicleId(editingTransaction.links.vehicleTransactionId ? editingTransaction.links.vehicleTransactionId.split('_')[0] : null);

        // Carregar vínculo de seguro se existir
        if (editingTransaction.links.vehicleTransactionId && editingTransaction.operationType === 'despesa') {
            const [sId, pNum] = editingTransaction.links.vehicleTransactionId.split('_');
            setTempSeguroId(sId);
            setTempSeguroParcelaId(pNum);
        }
      } else {
        setAccountId(selectedAccountId || accounts[0]?.id || ''); 
        setDate(new Date().toISOString().split('T')[0]); 
        setAmount(formatToBR(0));
        setOperationType('despesa'); 
        setCategoryId(null); 
        setDescription(""); 
        setDestinationAccountId(null);
        setTempInvestmentId(null);
        setTempLoanId(null);
        setTempParcelaId(null);
        setTempVehicleOperation(null);
        setTempVehicleId(null);
        setTempSeguroId(null);
        setTempSeguroParcelaId(null);
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts]);

  const handleAmountChange = (value: string) => {
    let cleaned = value.replace(/[^\d,.]/g, '');
    const parts = cleaned.split(/[,.]/);
    if (parts.length > 2) {
        const decimalPart = parts.pop();
        cleaned = parts.join('') + ',' + decimalPart;
    } else if (cleaned.includes('.')) {
        cleaned = cleaned.replace('.', ',');
    }
    setAmount(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFromBR(amount);
    
    if (!accountId || !date || parsedAmount <= 0 || !operationType) { toast.error("Preencha os campos obrigatórios."); return; }
    
    if (operationType === 'transferencia' && !destinationAccountId) { toast.error("Selecione a conta de destino."); return; }
    if ((operationType === 'aplicacao' || operationType === 'resgate') && !tempInvestmentId) { toast.error("Selecione o ativo de investimento."); return; }
    if (operationType === 'pagamento_emprestimo' && (!tempLoanId || !tempParcelaId)) { toast.error("Selecione o contrato e a parcela."); return; }
    if (operationType === 'veiculo' && (!tempVehicleId || !tempVehicleOperation)) { toast.error("Selecione o veículo e a operação."); return; }
    
    // Validação de Seguro se a categoria for Seguro
    if (isSeguroCategory && (!tempSeguroId || !tempSeguroParcelaId)) {
        toast.error("Vincule este pagamento a uma parcela de seguro em aberto.");
        return;
    }

    const requiresCategory = ['receita', 'despesa', 'rendimento'].includes(operationType);
    if (requiresCategory && !categoryId) { toast.error("A categoria é obrigatória para esta operação."); return; }

    // Determinar vehicleTransactionId baseado no tipo (Operação Veículo ou Categoria Seguro)
    let vehicleTransactionId = null;
    if (operationType === 'veiculo' && tempVehicleId) {
        vehicleTransactionId = `${tempVehicleId}_${tempVehicleOperation}`;
    } else if (isSeguroCategory && tempSeguroId) {
        vehicleTransactionId = `${tempSeguroId}_${tempSeguroParcelaId}`;
    }

    const links: TransactionLinks = { 
        investmentId: tempInvestmentId, 
        loanId: tempLoanId, 
        transferGroupId: editingTransaction?.links?.transferGroupId || null, 
        parcelaId: tempParcelaId, 
        vehicleTransactionId,
    };
    
    const meta: Partial<TransactionMeta> = {
        vehicleOperation: operationType === 'veiculo' ? tempVehicleOperation || undefined : undefined,
    };

    const baseTx: TransacaoCompleta = {
      id: editingTransaction?.id || generateTransactionId(), 
      date, 
      accountId, 
      flow: getFlowTypeFromOperation(operationType, tempVehicleOperation || undefined), 
      operationType, 
      domain: getDomainFromOperation(operationType), 
      amount: parsedAmount, 
      categoryId: categoryId, 
      description: description.trim() || OPERATION_TYPE_LABELS[operationType], 
      links, 
      conciliated: false, 
      attachments: [], 
      meta: { createdBy: 'user', source: 'manual', createdAt: new Date().toISOString(), ...meta } as TransactionMeta
    };

    let transferGroup;
    const isInterAccountMovement = operationType === 'transferencia' || operationType === 'aplicacao' || operationType === 'resgate';
    const targetAccountId = operationType === 'transferencia' ? destinationAccountId : tempInvestmentId;

    if (isInterAccountMovement && targetAccountId) {
      transferGroup = { 
        id: editingTransaction?.links?.transferGroupId || generateTransferGroupId(), 
        fromAccountId: accountId, 
        toAccountId: targetAccountId, 
        amount: parsedAmount, 
        date, 
        description: baseTx.description 
      };
    }
    
    onSubmit(baseTx, transferGroup);
    onOpenChange(false);
  };

  const op = OPERATION_OPTIONS.find(o => o.value === operationType);
  const showVincularSection = ['aplicacao', 'resgate', 'pagamento_emprestimo', 'veiculo'].includes(operationType || '') || isSeguroCategory;
  const currentLoan = useMemo(() => loans.find(l => l.id === tempLoanId), [loans, tempLoanId]);
  const currentSeguro = useMemo(() => segurosVeiculo.find(s => s.id === Number(tempSeguroId)), [segurosVeiculo, tempSeguroId]);

  const handleOperationChange = (v: OperationType) => {
    setOperationType(v);
    setDestinationAccountId(null);
    setTempInvestmentId(null);
    setTempLoanId(null);
    setTempParcelaId(null);
    setTempVehicleOperation(null);
    setTempVehicleId(null);
    setTempSeguroId(null);
    setTempSeguroParcelaId(null);
    setCategoryId(null);
    if (!description) {
        if (v === 'pagamento_emprestimo') setDescription('Pagamento Parcela Empréstimo');
        if (v === 'aplicacao') setDescription('Aplicação Financeira');
        if (v === 'resgate') setDescription('Resgate de Investimento');
    }
  };

  const handleSeguroChange = (v: string) => {
    setTempSeguroId(v);
    setTempSeguroParcelaId(null);
    const s = segurosVeiculo.find(x => x.id === Number(v));
    if (s) {
        const vModel = veiculos.find(v => v.id === s.veiculoId)?.modelo;
        setDescription(`Pagamento Seguro - ${vModel || s.seguradora}`);
        // Se houver parcelas, sugerir a primeira não paga
        const firstUnpaid = s.parcelas.find(p => !p.paga);
        if (firstUnpaid) {
            setTempSeguroParcelaId(String(firstUnpaid.numero));
            setAmount(formatToBR(firstUnpaid.valor));
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[36rem] max-h-[92vh] rounded-[2rem]"
        )}
      >
        <DialogHeader className={cn(
          "px-6 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-4 shrink-0 relative transition-colors duration-500",
          op?.bgColor || "bg-muted/30"
        )} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}>
          <div className="flex items-center gap-4 sm:gap-5">
            {isMobile && (
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
            <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-[1.5rem] bg-card flex items-center justify-center shadow-xl transition-transform duration-500", op?.color)}>
              {op ? <op.icon size={24} /> : <DollarSign size={24} />}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter">
                {isEditing ? "Editar Registro" : "Novo Lançamento"}
              </DialogTitle>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mt-0.5"><Sparkles className="w-3 h-3 text-primary" /> Inteligência Orbium</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 sm:px-8">
          <div className="py-4 sm:py-5 space-y-6 pb-32 sm:pb-6">
            <div className="text-center space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Valor do Lançamento</Label>
              <div className="relative max-w-[280px] mx-auto group">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-black text-muted-foreground/20">R$</span>
                <Input 
                  type="text" 
                  inputMode="decimal" 
                  value={amount} 
                  onChange={(e) => handleAmountChange(e.target.value)} 
                  onBlur={() => setAmount(formatToBR(parseFromBR(amount)))}
                  className="h-14 sm:h-16 text-3xl sm:text-4xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums" 
                />
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Operação</Label>
                 <Select value={operationType || ''} onValueChange={handleOperationChange}>
                   <SelectTrigger className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-2xl shadow-2xl border-none p-2">
                     {OPERATION_OPTIONS.map(o => (
                       <SelectItem key={o.value} value={o.value} className="rounded-xl font-bold py-3">
                         <div className="flex items-center gap-3"><div className={cn("p-1.5 rounded-lg", o.bgColor)}>{React.createElement(o.icon, { size: 16, className: o.color })}</div>{o.label}</div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Data</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner" />
               </div>
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                   {operationType === 'transferencia' ? 'Conta de Saída' : 'Conta do Registro'}
               </Label>
               <Select value={accountId} onValueChange={setAccountId}>
                 <SelectTrigger className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner"><SelectValue /></SelectTrigger>
                 <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {accounts.map(a => <SelectItem key={a.id} value={a.id} className="font-bold">{a.name}</SelectItem>)}
                 </SelectContent>
               </Select>
            </div>

            {operationType === 'transferencia' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary px-1">Conta de Destino</Label>
                <Select value={destinationAccountId || ''} onValueChange={setDestinationAccountId}>
                  <SelectTrigger className="h-11 rounded-2xl border-2 border-primary/20 bg-primary/5 font-bold"><SelectValue placeholder="Selecione o destino..." /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                     {accounts.filter(a => a.id !== accountId).map(a => <SelectItem key={a.id} value={a.id} className="font-bold">{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Categoria</Label>
              <Select value={categoryId || ''} onValueChange={setCategoryId} disabled={operationType === 'transferencia' || (showVincularSection && !isSeguroCategory)}>
                <SelectTrigger className="h-11 rounded-2xl border-none bg-muted/20 font-bold shadow-inner">
                    <SelectValue placeholder={operationType === 'transferencia' ? 'Automática' : 'Selecione...'} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl max-h-64">
                  {categories.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.icon} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {showVincularSection && (
                <div className="space-y-4 p-5 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 animate-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block text-center">Vínculo Obrigatório</Label>
                    
                    {operationType === 'pagamento_emprestimo' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Contrato</Label>
                                <Select value={tempLoanId || ''} onValueChange={(v) => { setTempLoanId(v); setTempParcelaId(null); }}>
                                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>{loans.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">{l.institution}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Parcela</Label>
                                <Select value={tempParcelaId || ''} onValueChange={setTempParcelaId} disabled={!currentLoan}>
                                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                                    <SelectContent>{currentLoan?.parcelas.filter(p => !p.paga).map(p => <SelectItem key={p.numero} value={String(p.numero)} className="font-bold">P. {p.numero} ({formatToBR(p.valor)})</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    
                    {isSeguroCategory && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Seguro/Veículo</Label>
                                <Select value={tempSeguroId || ''} onValueChange={handleSeguroChange}>
                                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione o seguro..." /></SelectTrigger>
                                    <SelectContent>
                                        {segurosVeiculo.map(s => {
                                            const v = veiculos.find(x => x.id === s.veiculoId);
                                            return <SelectItem key={s.id} value={String(s.id)} className="font-bold">{v?.modelo || s.seguradora}</SelectItem>;
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Parcela em Aberto</Label>
                                <Select value={tempSeguroParcelaId || ''} onValueChange={setTempSeguroParcelaId} disabled={!currentSeguro}>
                                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                                    <SelectContent>
                                        {currentSeguro?.parcelas.filter(p => !p.paga).map(p => (
                                            <SelectItem key={p.numero} value={String(p.numero)} className="font-bold">P. {p.numero} ({formatToBR(p.valor)})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    
                    {(operationType === 'aplicacao' || operationType === 'resgate') && (
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">
                                {operationType === 'aplicacao' ? 'Conta de Investimento (Destino)' : 'Conta de Investimento (Origem)'}
                            </Label>
                            <Select value={tempInvestmentId || ''} onValueChange={setTempInvestmentId}>
                                <SelectTrigger className="h-11 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione o ativo..." /></SelectTrigger>
                                <SelectContent>{investments.map(i => <SelectItem key={i.id} value={i.id} className="font-bold">{i.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                    
                    {operationType === 'veiculo' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Veículo</Label>
                                <Select value={tempVehicleId || ''} onValueChange={setTempVehicleId}>
                                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>{veiculos.map(v => <SelectItem key={v.id} value={String(v.id)} className="font-bold">{v.modelo}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Operação</Label>
                                <Select value={tempVehicleOperation || ''} onValueChange={(v) => setTempVehicleOperation(v as 'compra' | 'venda')}>
                                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="compra" className="font-bold">Compra</SelectItem>
                                        <SelectItem value="venda" className="font-bold">Venda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Descrição do Registro</Label>
              <div className="relative">
                <FileText className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full h-24 p-3 pl-12 rounded-[1.5rem] border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner resize-none font-medium text-sm" 
                  placeholder="Ex: Compra supermercado, Aporte Selic..." 
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className={cn(
          "p-4 sm:p-8 bg-muted/10 shrink-0 flex flex-col sm:flex-row gap-3",
          isMobile && "fixed bottom-0 left-0 right-0 border-t bg-card"
        )} style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}>
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-14 px-10 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          )}
          <Button onClick={handleSubmit} className="flex-1 rounded-full h-14 bg-primary text-primary-foreground font-black text-sm gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all order-1 sm:order-2">
            <Check size={20} /> {isEditing ? "SALVAR ALTERAÇÕES" : "CONFIRMAR REGISTRO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}