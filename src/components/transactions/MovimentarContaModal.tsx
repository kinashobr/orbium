import React, { useReducer, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ArrowLeftRight, TrendingUp, TrendingDown, CreditCard, DollarSign, Car, Coins, FileText, Check, Sparkles, ArrowLeft, Building2 } from "lucide-react";
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
  SeguroVeiculo,
  Imovel,
  Terreno,
  Veiculo,
  getAllowedOperations,
} from "@/types/finance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateTransaction } from "@/lib/transactionValidator";
import { formReducer, initialState } from "./MovimentarContaModalReducer";

interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas: { numero: number; vencimento: string; valor: number; paga: boolean; }[];
  valorParcela: number;
}

interface NewVehicleData {
  modelo: string;
  tipo: 'carro' | 'moto' | 'caminhao';
  marca?: string;
  ano: number;
}

interface NewImovelData {
  descricao: string;
  tipo: 'casa' | 'apartamento' | 'comercial';
  endereco: string;
}

interface NewTerrenoData {
  descricao: string;
  endereco: string;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  segurosVeiculo: SeguroVeiculo[];
  veiculos: Veiculo[];
  imoveis: Imovel[];
  terrenos: Terreno[];
  selectedAccountId?: string;
  onSubmit: (
    transaction: TransacaoCompleta, 
    transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string },
    newAsset?: { type: 'veiculo' | 'imovel' | 'terreno'; data: NewVehicleData | NewImovelData | NewTerrenoData }
  ) => void;
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
  { value: 'imobilizado', label: 'Imóvel / Terreno', icon: Building2, color: 'text-primary', bgColor: 'bg-primary/10' },
];

export function MovimentarContaModal({ open, onOpenChange, accounts, categories, investments, loans, segurosVeiculo, veiculos, imoveis, terrenos, selectedAccountId, onSubmit, editingTransaction }: MovimentarContaModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [state, dispatch] = useReducer(formReducer, initialState);

  const isEditing = !!editingTransaction;

  const isSeguroCategory = useMemo(() => {
    if (!state.categoryId || state.operationType !== 'despesa') return false;
    const cat = categories.find(c => c.id === state.categoryId);
    return cat?.label.toLowerCase().includes('seguro');
  }, [state.categoryId, state.operationType, categories]);

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      dispatch({ type: 'SET_FIELD', field: 'amount', value: "0,00" });
      return;
    }
    const val = parseInt(digits) / 100;
    dispatch({ type: 'SET_FIELD', field: 'amount', value: val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) });
  };

  const parseBrlValue = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        dispatch({ type: 'RESET', payload: {
            accountId: editingTransaction.accountId,
            date: editingTransaction.date,
            amount: editingTransaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            operationType: editingTransaction.operationType,
            categoryId: editingTransaction.categoryId,
            description: editingTransaction.description,
            destinationAccountId: editingTransaction.operationType === 'transferencia' && editingTransaction.links.transferGroupId ? "shared" : null,
            tempInvestmentId: editingTransaction.links.investmentId,
            tempLoanId: editingTransaction.links.loanId,
            tempParcelaId: editingTransaction.links.parcelaId,
            tempVehicleOperation: editingTransaction.operationType === 'veiculo' ? editingTransaction.meta.vehicleOperation || null : null,
            tempVehicleId: editingTransaction.meta.assetId ? String(editingTransaction.meta.assetId) : null,
            tempSeguroId: editingTransaction.links.vehicleTransactionId && editingTransaction.operationType === 'despesa' ? editingTransaction.links.vehicleTransactionId.split('_')[0] : null,
            tempSeguroParcelaId: editingTransaction.links.vehicleTransactionId && editingTransaction.operationType === 'despesa' ? editingTransaction.links.vehicleTransactionId.split('_')[1] : null,
            tempAssetType: editingTransaction.operationType === 'imobilizado' && (editingTransaction.meta.assetType === 'imovel' || editingTransaction.meta.assetType === 'terreno') ? editingTransaction.meta.assetType : null,
            tempAssetId: editingTransaction.meta.assetId ? String(editingTransaction.meta.assetId) : null,
            tempAssetOperation: editingTransaction.operationType === 'imobilizado' ? editingTransaction.meta.assetOperation || null : null,
        }});
      } else {
        dispatch({ type: 'RESET', payload: {
            accountId: selectedAccountId || accounts[0]?.id || '',
            date: new Date().toISOString().split('T')[0],
            operationType: 'despesa',
        }});
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts]);

  const selectedAccount = useMemo(() => accounts.find(a => a.id === state.accountId), [accounts, state.accountId]);
  const allowedOperations = useMemo(() => selectedAccount ? getAllowedOperations(selectedAccount.accountType) : OPERATION_OPTIONS.map(o => o.value), [selectedAccount]);
  const filteredOperationOptions = useMemo(() => OPERATION_OPTIONS.filter(o => allowedOperations.includes(o.value)), [allowedOperations]);

  useEffect(() => {
    if (state.operationType && !allowedOperations.includes(state.operationType)) {
      dispatch({ type: 'SET_OPERATION', operationType: allowedOperations[0] || 'despesa' });
    }
  }, [state.accountId, allowedOperations, state.operationType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseBrlValue(state.amount);
    
    if (!state.accountId || !state.date || parsedAmount <= 0 || !state.operationType) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    
    if (!allowedOperations.includes(state.operationType)) {
      toast.error("Operação não permitida para esta conta.");
      return;
    }
    
    if (state.operationType === 'transferencia' && !state.destinationAccountId) {
      toast.error("Selecione a conta de destino.");
      return;
    }
    if ((state.operationType === 'aplicacao' || state.operationType === 'resgate') && !state.tempInvestmentId) { 
      toast.error("Selecione o ativo de investimento."); 
      return; 
    }
    if (state.operationType === 'pagamento_emprestimo' && (!state.tempLoanId || !state.tempParcelaId)) { 
      toast.error("Selecione o contrato e a parcela."); 
      return; 
    }
    
    if (state.operationType === 'veiculo') {
      if (!state.tempVehicleOperation) {
        toast.error("Selecione a operação (Compra ou Venda).");
        return;
      }
      if (state.tempVehicleOperation === 'compra') {
        if (!state.newVehicleData.modelo.trim()) {
          toast.error("Informe o modelo do veículo.");
          return;
        }
      } else {
        if (!state.tempVehicleId) {
          toast.error("Selecione o veículo a ser vendido.");
          return;
        }
        const veiculo = veiculos.find(v => v.id === Number(state.tempVehicleId));
        if (veiculo && veiculo.status === 'vendido') {
          toast.error("Este veículo já foi vendido.");
          return;
        }
      }
    }

    if (state.operationType === 'imobilizado') {
      if (!state.tempAssetType) {
        toast.error("Selecione o tipo de bem (Imóvel ou Terreno).");
        return;
      }
      if (!state.tempAssetOperation) {
        toast.error("Selecione a operação (Compra ou Venda).");
        return;
      }
      if (state.tempAssetOperation === 'compra') {
        if (state.tempAssetType === 'imovel' && !state.newImovelData.descricao.trim()) {
          toast.error("Informe a descrição do imóvel.");
          return;
        }
        if (state.tempAssetType === 'terreno' && !state.newTerrenoData.descricao.trim()) {
          toast.error("Informe a descrição do terreno.");
          return;
        }
      } else {
        if (!state.tempAssetId) {
          toast.error("Selecione o bem a ser vendido.");
          return;
        }
        const asset = state.tempAssetType === 'imovel' 
          ? imoveis.find(i => i.id === Number(state.tempAssetId))
          : terrenos.find(t => t.id === Number(state.tempAssetId));
        if (asset && asset.status === 'vendido') {
          toast.error("Este bem já foi vendido.");
          return;
        }
      }
    }
    
    if (isSeguroCategory && (!state.tempSeguroId || !state.tempSeguroParcelaId)) {
        toast.error("Vincule este pagamento a uma parcela de seguro em aberto.");
        return;
    }

    const requiresCategory = ['receita', 'despesa', 'rendimento'].includes(state.operationType);
    if (requiresCategory && !state.categoryId) { 
      toast.error("A categoria é obrigatória para esta operação."); 
      return; 
    }

    let vehicleTransactionId = null;
    if (isSeguroCategory && state.tempSeguroId) {
        vehicleTransactionId = `${state.tempSeguroId}_${state.tempSeguroParcelaId}`;
    }

    let finalAssetId: number | undefined = undefined;
    let finalAssetType: 'veiculo' | 'imovel' | 'terreno' | undefined = undefined;
    let finalAssetOperation: 'compra' | 'venda' | undefined = undefined;

    if (state.operationType === 'veiculo') {
      finalAssetType = 'veiculo';
      finalAssetOperation = state.tempVehicleOperation || undefined;
      if (state.tempVehicleOperation === 'venda' && state.tempVehicleId) {
        finalAssetId = Number(state.tempVehicleId);
      }
    } else if (state.operationType === 'imobilizado') {
      finalAssetType = state.tempAssetType || undefined;
      finalAssetOperation = state.tempAssetOperation || undefined;
      if (state.tempAssetOperation === 'venda' && state.tempAssetId) {
        finalAssetId = Number(state.tempAssetId);
      }
    }

    const links: TransactionLinks = { 
        investmentId: state.tempInvestmentId, 
        loanId: state.tempLoanId, 
        transferGroupId: editingTransaction?.links?.transferGroupId || null, 
        parcelaId: state.tempParcelaId, 
        vehicleTransactionId,
    };
    
    const meta: Partial<TransactionMeta> = {
        vehicleOperation: state.operationType === 'veiculo' ? state.tempVehicleOperation || undefined : undefined,
        assetType: finalAssetType,
        assetId: finalAssetId,
        assetOperation: finalAssetOperation,
    };

    const baseTx: TransacaoCompleta = {
      id: editingTransaction?.id || generateTransactionId(),
      date: state.date,
      accountId: state.accountId,
      flow: getFlowTypeFromOperation(state.operationType, finalAssetOperation),
      operationType: state.operationType,
      domain: getDomainFromOperation(state.operationType),
      amount: parsedAmount,
      categoryId: state.categoryId,
      description: state.description.trim() || OPERATION_TYPE_LABELS[state.operationType],
      links,
      conciliated: false,
      attachments: [],
      meta: { createdBy: 'user', source: 'manual', createdAt: new Date().toISOString(), ...meta } as TransactionMeta
    };

    const validation = validateTransaction(baseTx);
    if (!validation.valid) {
      toast.error(validation.message || "Erro na validação contábil.");
      return;
    }

    let transferGroup;

    const isInterAccountMovement = state.operationType === 'transferencia' || state.operationType === 'aplicacao' || state.operationType === 'resgate';
    const isDoubleEntrySystem = ['liberacao_emprestimo', 'veiculo', 'imobilizado'].includes(state.operationType);
    const targetAccountId = state.operationType === 'transferencia' ? state.destinationAccountId : state.tempInvestmentId;

    if ((isInterAccountMovement && targetAccountId) || isDoubleEntrySystem) {
      transferGroup = {
        id: editingTransaction?.links?.transferGroupId || generateTransferGroupId(),
        fromAccountId: state.accountId,
        toAccountId: targetAccountId || '', // Será tratado pelo FinanceContext para contas de sistema
        amount: parsedAmount,
        date: state.date,
        description: baseTx.description
      };
      
      // Atualiza o link na transação base
      baseTx.links.transferGroupId = transferGroup.id;
    }

    let newAssetPayload: { type: 'veiculo' | 'imovel' | 'terreno'; data: NewVehicleData | NewImovelData | NewTerrenoData } | undefined;
    
    if (state.operationType === 'veiculo' && state.tempVehicleOperation === 'compra') {
      newAssetPayload = { type: 'veiculo', data: state.newVehicleData };
    } else if (state.operationType === 'imobilizado' && state.tempAssetOperation === 'compra' && state.tempAssetType) {
      if (state.tempAssetType === 'imovel') {
        newAssetPayload = { type: 'imovel', data: state.newImovelData };
      } else {
        newAssetPayload = { type: 'terreno', data: state.newTerrenoData };
      }
    }
    
    onSubmit(baseTx, transferGroup, newAssetPayload);
    onOpenChange(false);
  };

  const op = OPERATION_OPTIONS.find(o => o.value === state.operationType);
  const showVincularSection = ['aplicacao', 'resgate', 'pagamento_emprestimo', 'veiculo', 'imobilizado'].includes(state.operationType || '') || isSeguroCategory;
  const hideCategory = ['transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'imobilizado'].includes(state.operationType || '');
  
  const currentLoan = useMemo(() => loans.find(l => l.id === state.tempLoanId), [loans, state.tempLoanId]);
  const currentSeguro = useMemo(() => segurosVeiculo.find(s => s.id === Number(state.tempSeguroId)), [segurosVeiculo, state.tempSeguroId]);

  const activeVehicles = useMemo(() => veiculos.filter(v => v.status !== 'vendido'), [veiculos]);
  const activeImoveis = useMemo(() => imoveis.filter(i => i.status !== 'vendido'), [imoveis]);
  const activeTerrenos = useMemo(() => terrenos.filter(t => t.status !== 'vendido'), [terrenos]);

  const handleOperationChange = (v: OperationType) => {
    dispatch({ type: 'SET_OPERATION', operationType: v });
    if (!state.description) {
        if (v === 'pagamento_emprestimo') dispatch({ type: 'SET_FIELD', field: 'description', value: 'Pagamento Parcela Empréstimo' });
        if (v === 'aplicacao') dispatch({ type: 'SET_FIELD', field: 'description', value: 'Aplicação Financeira' });
        if (v === 'resgate') dispatch({ type: 'SET_FIELD', field: 'description', value: 'Resgate de Investimento' });
        if (v === 'veiculo') dispatch({ type: 'SET_FIELD', field: 'description', value: 'Operação Veículo' });
        if (v === 'imobilizado') dispatch({ type: 'SET_FIELD', field: 'description', value: 'Operação Imóvel/Terreno' });
    }
  };

  const handleSeguroChange = (v: string) => {
    dispatch({ type: 'SET_FIELD', field: 'tempSeguroId', value: v });
    dispatch({ type: 'SET_FIELD', field: 'tempSeguroParcelaId', value: null });
    const s = segurosVeiculo.find(x => x.id === Number(v));
    if (s) {
        const vModel = veiculos.find(v => v.id === s.veiculoId)?.modelo;
        dispatch({ type: 'SET_FIELD', field: 'description', value: `Pagamento Seguro - ${vModel || s.seguradora}` });
        const firstUnpaid = s.parcelas.find(p => !p.paga);
        if (firstUnpaid) {
            dispatch({ type: 'SET_FIELD', field: 'tempSeguroParcelaId', value: String(firstUnpaid.numero) });
            dispatch({ type: 'SET_FIELD', field: 'amount', value: firstUnpaid.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) });
        }
    }
  };

  const handleVehicleOperationChange = (v: 'compra' | 'venda') => {
    dispatch({ type: 'SET_FIELD', field: 'tempVehicleOperation', value: v });
    dispatch({ type: 'SET_FIELD', field: 'tempVehicleId', value: null });
    dispatch({ type: 'SET_FIELD', field: 'newVehicleData', value: { modelo: '', tipo: 'carro', marca: '', ano: new Date().getFullYear() } });
    dispatch({ type: 'SET_FIELD', field: 'description', value: v === 'compra' ? 'Compra de Veículo' : 'Venda de Veículo' });
  };

  const handleAssetOperationChange = (v: 'compra' | 'venda') => {
    dispatch({ type: 'SET_FIELD', field: 'tempAssetOperation', value: v });
    dispatch({ type: 'SET_FIELD', field: 'tempAssetId', value: null });
    dispatch({ type: 'SET_FIELD', field: 'newImovelData', value: { descricao: '', tipo: 'casa', endereco: '' } });
    dispatch({ type: 'SET_FIELD', field: 'newTerrenoData', value: { descricao: '', endereco: '' } });
    const tipoLabel = state.tempAssetType === 'imovel' ? 'Imóvel' : 'Terreno';
    dispatch({ type: 'SET_FIELD', field: 'description', value: v === 'compra' ? `Compra de ${tipoLabel}` : `Venda de ${tipoLabel}` });
  };

  const formBody = (
    <form id="movimentar-form" onSubmit={handleSubmit} className="py-3 space-y-4 pb-28 sm:pb-4">
      <div className="text-center space-y-0.5">
        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Valor do Lançamento</Label>
        <div className="relative max-w-[220px] mx-auto group">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/20">R$</span>
          <Input
            type="text"
            inputMode="numeric"
            value={state.amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="h-12 text-2xl font-black text-center border-none bg-transparent focus-visible:ring-0 p-0 tabular-nums"
          />
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Operação</Label>
          <Select value={state.operationType || ''} onValueChange={handleOperationChange}>
            <SelectTrigger className="h-9 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl shadow-2xl border-none p-1">
              {filteredOperationOptions.map(o => (
                <SelectItem key={o.value} value={o.value} className="rounded-lg font-bold py-2 text-sm">
                  <div className="flex items-center gap-2"><div className={cn("p-1 rounded-md", o.bgColor)}>{React.createElement(o.icon, { size: 14, className: o.color })}</div>{o.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Data</Label>
          <Input type="date" value={state.date} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'date', value: e.target.value })} className="h-9 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">
          {state.operationType === 'transferencia' ? 'Conta de Saída' : 'Conta do Registro'}
        </Label>
        <Select value={state.accountId} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'accountId', value: v })}>
          <SelectTrigger className="h-9 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-2xl">
            {accounts.map(a => <SelectItem key={a.id} value={a.id} className="font-bold text-sm">{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {state.operationType === 'transferencia' && (
        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
          <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-primary px-1">Conta de Destino</Label>
          <Select value={state.destinationAccountId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'destinationAccountId', value: v })}>
            <SelectTrigger className="h-9 rounded-xl border-2 border-primary/20 bg-primary/5 font-bold text-sm"><SelectValue placeholder="Selecione o destino..." /></SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl">
              {accounts.filter(a => a.id !== state.accountId).map(a => <SelectItem key={a.id} value={a.id} className="font-bold text-sm">{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {!hideCategory && (
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Categoria</Label>
          <Select value={state.categoryId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'categoryId', value: v })}>
            <SelectTrigger className="h-9 rounded-xl border-none bg-muted/20 font-bold shadow-inner text-sm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-2xl max-h-56">
              {categories.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-sm">{c.icon} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {showVincularSection && (
        <div className="space-y-4 p-5 rounded-[2rem] bg-primary/5 border-2 border-dashed border-primary/20 animate-in slide-in-from-top-2 duration-300">
          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block text-center">Vínculo Obrigatório</Label>

          {state.operationType === 'pagamento_emprestimo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Contrato</Label>
                <Select value={state.tempLoanId || ''} onValueChange={(v) => { dispatch({ type: 'SET_FIELD', field: 'tempLoanId', value: v }); dispatch({ type: 'SET_FIELD', field: 'tempParcelaId', value: null }); }}>
                  <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{loans.map(l => <SelectItem key={l.id} value={l.id} className="font-bold">{l.institution}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Parcela</Label>
                <Select value={state.tempParcelaId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'tempParcelaId', value: v })} disabled={!currentLoan}>
                  <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>{currentLoan?.parcelas.filter(p => !p.paga).map(p => <SelectItem key={p.numero} value={String(p.numero)} className="font-bold">P. {p.numero} ({p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isSeguroCategory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Seguro/Veículo</Label>
                <Select value={state.tempSeguroId || ''} onValueChange={handleSeguroChange}>
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
                <Select value={state.tempSeguroParcelaId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'tempSeguroParcelaId', value: v })} disabled={!currentSeguro}>
                  <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {currentSeguro?.parcelas.filter(p => !p.paga).map(p => (
                      <SelectItem key={p.numero} value={String(p.numero)} className="font-bold">P. {p.numero} ({p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {state.operationType === 'imobilizado' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Tipo de Bem</Label>
                  <Select
                    value={state.tempAssetType || ''}
                    onValueChange={v => {
                      dispatch({ type: 'SET_FIELD', field: 'tempAssetType', value: v as 'imovel' | 'terreno' });
                      dispatch({ type: 'SET_FIELD', field: 'tempAssetId', value: null });
                      dispatch({ type: 'SET_FIELD', field: 'tempAssetOperation', value: null });
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm">
                      <SelectValue placeholder="Imóvel ou Terreno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imovel" className="font-bold">Imóvel</SelectItem>
                      <SelectItem value="terreno" className="font-bold">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Operação</Label>
                  <Select
                    value={state.tempAssetOperation || ''}
                    onValueChange={v => handleAssetOperationChange(v as 'compra' | 'venda')}
                    disabled={!state.tempAssetType}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm">
                      <SelectValue placeholder="Compra ou Venda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra" className="font-bold">Compra</SelectItem>
                      <SelectItem value="venda" className="font-bold">Venda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {state.tempAssetType && state.tempAssetOperation === 'venda' && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Selecione o Bem</Label>
                  <Select value={state.tempAssetId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'tempAssetId', value: v })}>
                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(state.tempAssetType === 'imovel' ? activeImoveis : activeTerrenos).map(a => (
                        <SelectItem key={a.id} value={String(a.id)} className="font-bold">
                          {a.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {state.tempAssetType && state.tempAssetOperation === 'compra' && (
                <div className="space-y-3 p-3 rounded-xl bg-card/50">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground block text-center">Dados do Novo Bem</Label>
                  {state.tempAssetType === 'imovel' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Descrição</Label>
                        <Input
                          value={state.newImovelData.descricao}
                          onChange={e => dispatch({ type: 'SET_FIELD', field: 'newImovelData', value: { ...state.newImovelData, descricao: e.target.value } })}
                          placeholder="Ex: Apartamento Centro"
                          className="h-9 rounded-lg text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground">Tipo</Label>
                          <Select value={state.newImovelData.tipo} onValueChange={v => dispatch({ type: 'SET_FIELD', field: 'newImovelData', value: { ...state.newImovelData, tipo: v as any } })}>
                            <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="casa">Casa</SelectItem>
                              <SelectItem value="apartamento">Apartamento</SelectItem>
                              <SelectItem value="comercial">Comercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground">Endereço</Label>
                          <Input
                            value={state.newImovelData.endereco}
                            onChange={e => dispatch({ type: 'SET_FIELD', field: 'newImovelData', value: { ...state.newImovelData, endereco: e.target.value } })}
                            placeholder="Cidade/Bairro"
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Descrição</Label>
                        <Input
                          value={state.newTerrenoData.descricao}
                          onChange={e => dispatch({ type: 'SET_FIELD', field: 'newTerrenoData', value: { ...state.newTerrenoData, descricao: e.target.value } })}
                          placeholder="Ex: Lote Condomínio X"
                          className="h-9 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground">Endereço</Label>
                        <Input
                          value={state.newTerrenoData.endereco}
                          onChange={e => dispatch({ type: 'SET_FIELD', field: 'newTerrenoData', value: { ...state.newTerrenoData, endereco: e.target.value } })}
                          placeholder="Cidade/Bairro"
                          className="h-9 rounded-lg text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {(state.operationType === 'aplicacao' || state.operationType === 'resgate') && (
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">
                {state.operationType === 'aplicacao' ? 'Conta de Investimento (Destino)' : 'Conta de Investimento (Origem)'}
              </Label>
              <Select value={state.tempInvestmentId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'tempInvestmentId', value: v })}>
                <SelectTrigger className="h-11 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione o ativo..." /></SelectTrigger>
                <SelectContent>{investments.map(i => <SelectItem key={i.id} value={i.id} className="font-bold">{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {state.operationType === 'veiculo' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Operação</Label>
                <Select value={state.tempVehicleOperation || ''} onValueChange={(v) => handleVehicleOperationChange(v as 'compra' | 'venda')}>
                  <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Compra ou Venda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra" className="font-bold">Compra</SelectItem>
                    <SelectItem value="venda" className="font-bold">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {state.tempVehicleOperation === 'venda' && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground px-1">Selecione o Veículo</Label>
                  <Select value={state.tempVehicleId || ''} onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'tempVehicleId', value: v })}>
                    <SelectTrigger className="h-10 rounded-xl border-none bg-card font-bold shadow-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {activeVehicles.map(v => <SelectItem key={v.id} value={String(v.id)} className="font-bold">{v.modelo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {state.tempVehicleOperation === 'compra' && (
                <div className="space-y-3 p-3 rounded-xl bg-card/50">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground block text-center">Dados do Novo Veículo</Label>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Modelo</Label>
                    <Input
                      value={state.newVehicleData.modelo}
                      onChange={e => dispatch({ type: 'SET_FIELD', field: 'newVehicleData', value: { ...state.newVehicleData, modelo: e.target.value } })}
                      placeholder="Ex: Honda Civic 2.0"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Tipo</Label>
                      <Select value={state.newVehicleData.tipo} onValueChange={v => dispatch({ type: 'SET_FIELD', field: 'newVehicleData', value: { ...state.newVehicleData, tipo: v as any } })}>
                        <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="carro">Carro</SelectItem>
                          <SelectItem value="moto">Moto</SelectItem>
                          <SelectItem value="caminhao">Caminhão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Marca</Label>
                      <Input
                        value={state.newVehicleData.marca || ''}
                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'newVehicleData', value: { ...state.newVehicleData, marca: e.target.value } })}
                        placeholder="Honda"
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Ano</Label>
                      <Input
                        type="number"
                        value={state.newVehicleData.ano}
                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'newVehicleData', value: { ...state.newVehicleData, ano: parseInt(e.target.value) || new Date().getFullYear() } })}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground px-1">Descrição do Registro</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <textarea
            value={state.description}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
            className="w-full h-16 p-2.5 pl-9 rounded-xl border-none bg-muted/20 focus:bg-muted/40 transition-all shadow-inner resize-none font-medium text-sm"
            placeholder="Ex: Compra supermercado, Aporte Selic..."
          />
        </div>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton 
        fullscreen={isMobile}
        className={cn(
          "p-0 shadow-2xl bg-card flex flex-col",
          !isMobile && "max-w-[36.4rem] max-h-[85vh] rounded-[2rem]"
        )}
      >
        <DialogHeader className={cn(
          "px-5 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 shrink-0 relative transition-colors duration-500",
          op?.bgColor || "bg-muted/30"
        )} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' } : undefined}>
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className={cn("w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-lg transition-transform duration-500", op?.color)}>
              {op ? <op.icon size={20} /> : <DollarSign size={20} />}
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tighter">
                {isEditing ? "Editar Registro" : "Novo Lançamento"}
              </DialogTitle>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1.5"><Sparkles className="w-2.5 h-2.5 text-primary" /> Inteligência Orbium</p>
            </div>
          </div>
        </DialogHeader>

        {isMobile ? (
          <ScrollArea className={cn("flex-1 px-5 sm:px-6 scrollbar-material", "max-h-[calc(100vh-10rem)]")}>
            {formBody}
          </ScrollArea>
        ) : (
          <div className={cn("flex-1 overflow-y-auto px-5 sm:px-6 scrollbar-material", "max-h-[75vh]")}>
            {formBody}
          </div>
        )}

        <DialogFooter className={cn(
          "p-4 sm:p-5 bg-muted/10 shrink-0 flex flex-col sm:flex-row gap-2",
          isMobile && "fixed bottom-0 left-0 right-0 border-t bg-card"
        )} style={isMobile ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}>
          {!isMobile && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full h-11 px-8 font-black text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground">FECHAR</Button>
          )}
          <Button form="movimentar-form" type="submit" className="flex-1 rounded-full h-11 bg-primary text-primary-foreground font-black text-sm gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all order-1 sm:order-2">
            <Check size={18} /> {isEditing ? "SALVAR" : "CONFIRMAR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
