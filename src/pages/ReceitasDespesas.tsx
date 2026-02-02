"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus, CalendarCheck, Receipt, Sparkles, Filter, LayoutDashboard, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { isWithinInterval, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, addMonths, format } from "date-fns";
import { ContaCorrente, Categoria, TransacaoCompleta, TransferGroup, AccountSummary, OperationType, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, generateTransactionId, formatCurrency, generateTransferGroupId, DateRange, ComparisonDateRanges, TransactionLinks, Veiculo, Imovel, Terreno } from "@/types/finance";
import { AccountsCarousel } from "@/components/transactions/AccountsCarousel";
import { MovimentarContaModal } from "@/components/transactions/MovimentarContaModal";
import { KPISidebar } from "@/components/transactions/KPISidebar";
import { AccountFormModal } from "@/components/transactions/AccountFormModal";
import { CategoryFormModal } from "@/components/transactions/CategoryFormModal";
import { CategoryListModal } from "@/components/transactions/CategoryListModal";
import { AccountStatementDialog } from "@/components/transactions/AccountStatementDialog";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { BillsTrackerModal } from "@/components/bills/BillsTrackerModal";
import { StatementManagerDialog } from "@/components/transactions/StatementManagerDialog";
import { ConsolidatedReviewDialog } from "@/components/transactions/ConsolidatedReviewDialog";
import { StandardizationRuleManagerModal } from "@/components/transactions/StandardizationRuleManagerModal";
import { useFinance } from "@/contexts/FinanceContext";
import { parseDateLocal, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Tipos para dados de novos ativos
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

const ReceitasDespesas = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { 
    contasMovimento, setContasMovimento, 
    categoriasV2: categories, setCategoriasV2, 
    transacoesV2, setTransacoesV2, addTransacaoV2, 
    emprestimos, markLoanParcelPaid, unmarkLoanParcelPaid, 
    veiculos, imoveis, terrenos, calculateBalanceUpToDate, dateRanges, setDateRanges, 
    markSeguroParcelPaid, unmarkSeguroParcelPaid, 
    standardizationRules, deleteStandardizationRule, 
    uncontabilizeImportedTransaction, segurosVeiculo, 
    updateImovel, updateTerreno, updateVeiculo,
    addVeiculo, addImovel, addTerreno,
  } = useFinance();

  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<string>();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ContaCorrente>();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryListModal, setShowCategoryListModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria>();
  const [editingTransaction, setEditingTransaction] = useState<TransacaoCompleta>();
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [showBillsTrackerModal, setShowBillsTrackerModal] = useState(false);
  const [showStatementManagerDialog, setShowStatementManagerDialog] = useState(false);
  const [showConsolidatedReview, setShowConsolidatedReview] = useState(false);
  const [accountForConsolidatedReview, setAccountForConsolidatedReview] = useState<string | null>(null);
  const [showRuleManagerModal, setShowRuleManagerModal] = useState(false);

  const transactions = transacoesV2;
  const transacoesPeriodo1 = useMemo(() => {
    if (!dateRanges.range1.from || !dateRanges.range1.to) return transacoesV2;
    const from = startOfDay(dateRanges.range1.from);
    const to = endOfDay(dateRanges.range1.to);
    return transacoesV2.filter(t => isWithinInterval(parseDateLocal(t.date), { start: from, end: to }));
  }, [transacoesV2, dateRanges.range1]);

  const visibleAccounts = useMemo(() => contasMovimento.filter(a => !a.hidden), [contasMovimento]);
  
  const accountSummaries: AccountSummary[] = useMemo(() => {
    const periodStart = dateRanges.range1.from;
    const periodEnd = dateRanges.range1.to;
    return visibleAccounts.map(account => {
      const periodInitialBalance = periodStart ? calculateBalanceUpToDate(account.id, subDays(periodStart, 1), transactions, contasMovimento) : 0;
      const accountTx = transactions.filter(t => t.accountId === account.id && (!periodStart || isWithinInterval(parseDateLocal(t.date), { start: startOfDay(periodStart), end: endOfDay(periodEnd || new Date()) })));
      let totalIn = 0, totalOut = 0;
      accountTx.forEach(t => {
        if (account.accountType === 'cartao_credito') { if (t.operationType === 'despesa') totalOut += t.amount; else if (t.operationType === 'transferencia') totalIn += t.amount; }
        else { if (t.flow === 'in' || t.flow === 'transfer_in') totalIn += t.amount; else totalOut += t.amount; }
      });
      const finalBal = periodInitialBalance + totalIn - totalOut;
      return { accountId: account.id, accountName: account.name, accountType: account.accountType, institution: account.institution, initialBalance: periodInitialBalance, currentBalance: finalBal, projectedBalance: finalBal, totalIn, totalOut, reconciliationStatus: accountTx.length === 0 || accountTx.every(t => t.conciliated) ? 'ok' : 'warning', transactionCount: accountTx.length };
    });
  }, [visibleAccounts, transactions, dateRanges, calculateBalanceUpToDate, contasMovimento]);

  const viewingAccount = useMemo(() => viewingAccountId ? contasMovimento.find(a => a.id === viewingAccountId) : undefined, [viewingAccountId, contasMovimento]);
  const viewingSummary = useMemo(() => viewingAccountId ? accountSummaries.find(s => s.accountId === viewingAccountId) : undefined, [viewingAccountId, accountSummaries]);

  const transactionCountByCategory = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if (t.categoryId) acc[t.categoryId] = (acc[t.categoryId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
  }, [transactions]);

  const handleEditTransaction = (t: TransacaoCompleta) => { setEditingTransaction(t); setSelectedAccountForModal(t.accountId); setShowMovimentarModal(true); };
  
  const handleDeleteTransaction = (id: string) => { 
    if (window.confirm("Excluir transação?")) { 
      const t = transactions.find(x => x.id === id); 
      if (t?.links?.loanId) unmarkLoanParcelPaid(parseInt(t.links.loanId.replace('loan_', ''))); 
      if (t?.links?.vehicleTransactionId && t.flow === 'out') { 
        const [s, p] = t.links.vehicleTransactionId.split('_'); 
        unmarkSeguroParcelPaid(parseInt(s), parseInt(p)); 
      } 
      
      // Side effects para veículos (compra/venda)
      if (t?.operationType === 'veiculo' && t.meta.assetType === 'veiculo' && t.meta.assetId) {
        const vehicleId = t.meta.assetId;
        const veiculo = veiculos.find(v => v.id === vehicleId);
        if (veiculo) {
          const updates: Partial<Veiculo> = {};
          if (veiculo.compraTransactionId === t.id) {
            updates.compraTransactionId = undefined;
            updates.status = 'pendente_cadastro';
          }
          if (veiculo.vendaTransactionId === t.id) {
            updates.vendaTransactionId = undefined;
            updates.status = 'ativo';
          }
          if (Object.keys(updates).length > 0) updateVeiculo(vehicleId, updates);
        }
      }
      
      // Side effects para imóveis/terrenos
      if (t?.operationType === 'imobilizado' && t.meta.assetType && t.meta.assetId) {
        const assetId = t.meta.assetId;
        if (t.meta.assetType === 'imovel') {
          const imovel = imoveis.find(i => i.id === assetId);
          if (imovel) {
            const updates: Partial<Imovel> = {};
            if (imovel.compraTransactionId === t.id) updates.compraTransactionId = undefined;
            if (imovel.vendaTransactionId === t.id) {
              updates.vendaTransactionId = undefined;
              updates.status = 'ativo';
            }
            if (Object.keys(updates).length > 0) updateImovel(assetId, updates);
          }
        } else if (t.meta.assetType === 'terreno') {
          const terreno = terrenos.find(tr => tr.id === assetId);
          if (terreno) {
            const updates: Partial<Terreno> = {};
            if (terreno.compraTransactionId === t.id) updates.compraTransactionId = undefined;
            if (terreno.vendaTransactionId === t.id) {
              updates.vendaTransactionId = undefined;
              updates.status = 'ativo';
            }
            if (Object.keys(updates).length > 0) updateTerreno(assetId, updates);
          }
        }
      }
      if (t?.meta.source === 'import') uncontabilizeImportedTransaction(id); 
      setTransacoesV2(prev => prev.filter(x => x.links?.transferGroupId ? x.links.transferGroupId !== t?.links?.transferGroupId : x.id !== id)); 
      toast.success("Excluído!"); 
    } 
  };
  
  const handleToggleConciliated = useCallback((id: string, value: boolean) => {
    setTransacoesV2(prev => prev.map(t => t.id === id ? { ...t, conciliated: value } : t));
  }, [setTransacoesV2]);
  
  const handleManageRules = useCallback(() => {
    setShowStatementManagerDialog(false);
    setShowRuleManagerModal(true);
  }, []);

  const handleTransactionSubmit = (
    t: TransacaoCompleta, 
    g?: any,
    newAsset?: { type: 'veiculo' | 'imovel' | 'terreno'; data: NewVehicleData | NewImovelData | NewTerrenoData }
  ) => {
    // Se está criando um novo ativo junto com a transação de compra
    let createdAssetId: number | undefined;
    
    if (newAsset) {
      if (newAsset.type === 'veiculo') {
        const vehicleData = newAsset.data as NewVehicleData;
        const newVehicle: Omit<Veiculo, 'id'> = {
          modelo: vehicleData.modelo,
          tipo: vehicleData.tipo,
          marca: vehicleData.marca,
          ano: vehicleData.ano,
          dataCompra: t.date,
          valorVeiculo: t.amount,
          valorSeguro: 0,
          vencimentoSeguro: '',
          parcelaSeguro: 0,
          valorFipe: t.amount,
          status: 'ativo',
          compraTransactionId: t.id,
        };
        addVeiculo(newVehicle);
        // O ID será gerado internamente - precisamos pegar do último veículo adicionado
        // Por enquanto, vamos marcar o meta.assetId como undefined e atualizar depois
        createdAssetId = Math.floor(Date.now() / 1000); // Mesmo cálculo usado em generateVeiculoId
      } else if (newAsset.type === 'imovel') {
        const imovelData = newAsset.data as NewImovelData;
        const newImovel: Omit<Imovel, 'id'> = {
          descricao: imovelData.descricao,
          tipo: imovelData.tipo,
          endereco: imovelData.endereco,
          dataAquisicao: t.date,
          valorAquisicao: t.amount,
          valorAvaliacao: t.amount,
          status: 'ativo',
          compraTransactionId: t.id,
        };
        addImovel(newImovel);
        createdAssetId = Math.floor(Date.now() / 1000);
      } else if (newAsset.type === 'terreno') {
        const terrenoData = newAsset.data as NewTerrenoData;
        const newTerreno: Omit<Terreno, 'id'> = {
          descricao: terrenoData.descricao,
          endereco: terrenoData.endereco,
          dataAquisicao: t.date,
          valorAquisicao: t.amount,
          valorAvaliacao: t.amount,
          status: 'ativo',
          compraTransactionId: t.id,
        };
        addTerreno(newTerreno);
        createdAssetId = Math.floor(Date.now() / 1000);
      }
      
      // Atualizar o meta.assetId na transação com o ID do ativo criado
      if (createdAssetId) {
        t = { ...t, meta: { ...t.meta, assetId: createdAssetId } };
      }
    }

    if (editingTransaction) {
      // Remover side effects antigos antes de aplicar os novos
      if (editingTransaction.links?.loanId) unmarkLoanParcelPaid(parseInt(editingTransaction.links.loanId.replace('loan_', '')));
      if (editingTransaction.links?.vehicleTransactionId) {
          const [s, p] = editingTransaction.links.vehicleTransactionId.split('_');
          unmarkSeguroParcelPaid(parseInt(s), parseInt(p));
      }

      // Remover vínculo antigo de veículo
      if (editingTransaction.operationType === 'veiculo' && editingTransaction.meta.assetType === 'veiculo' && editingTransaction.meta.assetId) {
        const oldVehicleId = editingTransaction.meta.assetId;
        const veiculo = veiculos.find(v => v.id === oldVehicleId);
        if (veiculo) {
          const updates: Partial<Veiculo> = {};
          if (veiculo.compraTransactionId === editingTransaction.id) {
            updates.compraTransactionId = undefined;
            updates.status = 'pendente_cadastro';
          }
          if (veiculo.vendaTransactionId === editingTransaction.id) {
            updates.vendaTransactionId = undefined;
            updates.status = 'ativo';
          }
          if (Object.keys(updates).length > 0) updateVeiculo(oldVehicleId, updates);
        }
      }

      // Remover vínculo antigo de imóvel/terreno
      if (editingTransaction.operationType === 'imobilizado' && editingTransaction.meta.assetType && editingTransaction.meta.assetId) {
        const oldAssetId = editingTransaction.meta.assetId;
        if (editingTransaction.meta.assetType === 'imovel') {
          const imovel = imoveis.find(i => i.id === oldAssetId);
          if (imovel) {
            const updates: Partial<Imovel> = {};
            if (imovel.compraTransactionId === editingTransaction.id) updates.compraTransactionId = undefined;
            if (imovel.vendaTransactionId === editingTransaction.id) {
              updates.vendaTransactionId = undefined;
              updates.status = 'ativo';
            }
            if (Object.keys(updates).length > 0) updateImovel(oldAssetId, updates);
          }
        } else if (editingTransaction.meta.assetType === 'terreno') {
          const terreno = terrenos.find(tr => tr.id === oldAssetId);
          if (terreno) {
            const updates: Partial<Terreno> = {};
            if (terreno.compraTransactionId === editingTransaction.id) updates.compraTransactionId = undefined;
            if (terreno.vendaTransactionId === editingTransaction.id) {
              updates.vendaTransactionId = undefined;
              updates.status = 'ativo';
            }
            if (Object.keys(updates).length > 0) updateTerreno(oldAssetId, updates);
          }
        }
      }

      setTransacoesV2(p => p.map(x => x.id === t.id ? t : x));
      toast.success("Registro atualizado!");
    } else {
      if (g) {
        // Gerar as duas pontas da transferência
        const outT = { ...t, id: generateTransactionId(), flow: 'transfer_out' as const, links: { ...t.links, transferGroupId: g.id } };
        const inT = { 
            ...t, 
            id: generateTransactionId(), 
            accountId: g.toAccountId, 
            flow: (contasMovimento.find(a => a.id === g.toAccountId)?.accountType === 'cartao_credito' ? 'in' : 'transfer_in') as any, 
            links: { ...t.links, transferGroupId: g.id }, 
            conciliated: false 
        };
        addTransacaoV2(outT);
        addTransacaoV2(inT);
        toast.success("Transferência realizada!");
      } else {
        addTransacaoV2(t);
        toast.success("Lançamento confirmado!");
      }
    }

    // Aplicar Side Effects (Empréstimos/Seguros)
    if (t.operationType === 'pagamento_emprestimo' && t.links?.loanId && t.links?.parcelaId) {
        markLoanParcelPaid(parseInt(t.links.loanId.replace('loan_', '')), t.amount, t.date, parseInt(t.links.parcelaId));
    }
    
    // Side effect para pagamento de seguro (usa vehicleTransactionId)
    if (t.operationType === 'despesa' && t.links?.vehicleTransactionId) {
        const [s, p] = t.links.vehicleTransactionId.split('_');
        if (s && p && !isNaN(parseInt(s))) markSeguroParcelPaid(parseInt(s), parseInt(p), t.id);
    }

    // Side effects para veículos (compra/venda) - não quando foi criado novo (já aplicado acima)
    if (t.operationType === 'veiculo' && t.meta.assetType === 'veiculo' && t.meta.assetId && t.meta.assetOperation && !newAsset) {
      const vehicleId = t.meta.assetId;
      const updates: Partial<Veiculo> = {};
      if (t.meta.assetOperation === 'compra') {
        updates.compraTransactionId = t.id;
        updates.status = 'ativo';
        updates.dataCompra = t.date;
        updates.valorVeiculo = t.amount;
      } else if (t.meta.assetOperation === 'venda') {
        updates.vendaTransactionId = t.id;
        updates.status = 'vendido';
      }
      if (Object.keys(updates).length > 0) updateVeiculo(vehicleId, updates);
    }

    // Side effects para imóveis/terrenos (compra/venda) - não quando foi criado novo
    if (t.operationType === 'imobilizado' && t.meta.assetType && t.meta.assetId && t.meta.assetOperation && !newAsset) {
      const assetId = t.meta.assetId;
      if (t.meta.assetType === 'imovel') {
        const updates: Partial<Imovel> = {};
        if (t.meta.assetOperation === 'compra') {
          updates.compraTransactionId = t.id;
          updates.status = 'ativo';
        } else if (t.meta.assetOperation === 'venda') {
          updates.vendaTransactionId = t.id;
          updates.status = 'vendido';
        }
        if (Object.keys(updates).length > 0) updateImovel(assetId, updates);
      } else if (t.meta.assetType === 'terreno') {
        const updates: Partial<Terreno> = {};
        if (t.meta.assetOperation === 'compra') {
          updates.compraTransactionId = t.id;
          updates.status = 'ativo';
        } else if (t.meta.assetOperation === 'venda') {
          updates.vendaTransactionId = t.id;
          updates.status = 'vendido';
        }
        if (Object.keys(updates).length > 0) updateTerreno(assetId, updates);
      }
    }
  };

  const handleAccountSubmit = (accountData: ContaCorrente, initialBalanceValue: number) => {
    if (editingAccount) {
      setContasMovimento(prev => prev.map(x => x.id === accountData.id ? accountData : x));
      setTransacoesV2(prev => {
        const initialBalanceTxIndex = prev.findIndex(t => t.accountId === accountData.id && t.operationType === 'initial_balance');
        if (initialBalanceTxIndex !== -1) {
          const updatedTxs = [...prev];
          const tx = updatedTxs[initialBalanceTxIndex];
          updatedTxs[initialBalanceTxIndex] = { ...tx, date: accountData.startDate || tx.date, amount: Math.abs(initialBalanceValue), flow: initialBalanceValue >= 0 ? 'in' : 'out' };
          return updatedTxs;
        } else if (initialBalanceValue !== 0) {
          const newTx: TransacaoCompleta = { id: generateTransactionId(), date: accountData.startDate || new Date().toISOString().split('T')[0], accountId: accountData.id, flow: initialBalanceValue >= 0 ? 'in' : 'out', operationType: 'initial_balance', domain: 'operational', amount: Math.abs(initialBalanceValue), categoryId: null, description: "Saldo Inicial", links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null }, conciliated: true, attachments: [], meta: { createdBy: 'user', source: 'manual', createdAt: new Date().toISOString() } };
          return [...prev, newTx];
        }
        return prev;
      });
      toast.success("Conta atualizada!");
    } else {
      setContasMovimento(prev => [...prev, accountData]);
      if (initialBalanceValue !== 0) {
        addTransacaoV2({ id: generateTransactionId(), date: accountData.startDate!, accountId: accountData.id, flow: initialBalanceValue >= 0 ? 'in' : 'out', operationType: 'initial_balance', domain: 'operational', amount: Math.abs(initialBalanceValue), categoryId: null, description: "Saldo Inicial", links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null }, conciliated: true, attachments: [], meta: { createdBy: 'user', source: 'manual', createdAt: new Date().toISOString() } });
      }
      toast.success("Conta criada com sucesso!");
    }
    setEditingAccount(undefined);
  };

  return (
    <MainLayout>
      <div className="space-y-8 pb-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shadow-primary/20 ring-4 ring-primary/10"><Receipt className="w-6 h-6" /></div>
            <div><h1 className="font-display font-bold text-2xl leading-none tracking-tight">Movimentação</h1><p className="text-xs text-muted-foreground font-medium tracking-wide mt-0.5 uppercase">Gestão Operacional</p></div>
          </div>
          <PeriodSelector initialRanges={dateRanges} onDateRangeChange={setDateRanges} className="h-10 rounded-full bg-surface-light dark:bg-surface-dark border-border/40 shadow-sm" />
        </header>

        <section className="flex flex-wrap gap-2 px-1 animate-fade-in-up">
          <Button variant="outline" onClick={() => setShowBillsTrackerModal(true)} className="h-10 rounded-full gap-2 px-4 sm:px-5 border-border/40 bg-card/50 backdrop-blur-sm flex-1 sm:flex-none justify-center"><CalendarCheck className="h-4 w-4 text-primary" /><span className="font-bold text-sm hidden sm:inline">Contas a Pagar</span><span className="font-bold text-sm sm:hidden">Contas</span></Button>
          <Button variant="outline" onClick={() => setShowCategoryListModal(true)} className="h-10 rounded-full gap-2 px-4 sm:px-5 border-border/40 bg-card/50 backdrop-blur-sm flex-1 sm:flex-none justify-center"><Tags className="h-4 w-4 text-primary" /><span className="font-bold text-sm">Categorias</span></Button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 animate-fade-in-up">
          <div className="col-span-12 lg:col-span-8 space-y-4 sm:space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div><h3 className="font-display font-bold text-lg text-foreground">Contas Correntes</h3><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">Saldos e Disponibilidade</p></div>
                <Button variant="ghost" size="sm" onClick={() => { setEditingAccount(undefined); setShowAccountModal(true); }} className="w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20"><Plus className="h-5 w-5" /></Button>
              </div>
              <AccountsCarousel accounts={accountSummaries} onMovimentar={id => { setSelectedAccountForModal(id); setEditingTransaction(undefined); setShowMovimentarModal(true); }} onViewHistory={id => { setViewingAccountId(id); setShowStatementDialog(true); }} onAddAccount={() => setShowAccountModal(true)} onEditAccount={id => { const a = contasMovimento.find(x => x.id === id); if (a) { const tx = transactions.find(t => t.accountId === id && t.operationType === 'initial_balance'); setEditingAccount({ ...a, initialBalanceValue: tx ? (tx.flow === 'in' ? tx.amount : -tx.amount) : 0 } as any); setShowAccountModal(true); } }} onImportAccount={id => { setAccountForConsolidatedReview(null); setViewingAccountId(id); setShowStatementManagerDialog(true); }} showHeader={false} />
            </div>

            <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
              <div className="absolute right-0 bottom-0 opacity-10 scale-150 translate-x-10 translate-y-10 group-hover:rotate-12 transition-transform duration-700"><Sparkles className="w-[120px] h-[120px] sm:w-[180px] sm:h-[180px]" /></div>
              <div className="z-10">
                <div className="flex items-center gap-2 mb-2"><Badge variant="outline" className="border-primary/50 text-primary-foreground text-[8px] sm:text-[9px] font-black tracking-widest px-2">POWERED BY AI</Badge></div>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-2">Conciliação Inteligente</h3>
                <p className="text-neutral-400 text-xs sm:text-sm max-w-sm">Diga adeus ao trabalho manual. Importe múltiplos arquivos e deixe o Orbium reconhecer padrões e sugerir categorias automaticamente.</p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <Button className="bg-primary text-primary-foreground rounded-full px-4 sm:px-8 font-black h-10 sm:h-11 hover:scale-105 transition-transform shadow-xl shadow-primary/20 text-sm" onClick={() => setShowStatementManagerDialog(true)}>
                    <FileText className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">IMPORTAR EXTRATOS</span><span className="sm:hidden">IMPORTAR</span>
                  </Button>
                  <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full px-4 sm:px-6 font-bold" onClick={() => setShowRuleManagerModal(true)}>
                    Regras <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
              <div className="hidden md:flex z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/10 items-center justify-center bg-white/5 backdrop-blur-sm shrink-0"><RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground/40 group-hover:rotate-180 transition-transform duration-1000" /></div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4"><div className="bg-surface-light dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 shadow-soft border border-white/60 dark:border-white/5 h-full"><KPISidebar transactions={transacoesPeriodo1} categories={categories} /></div></div>
        </div>
      </div>

      <MovimentarContaModal
        open={showMovimentarModal}
        onOpenChange={setShowMovimentarModal}
        accounts={contasMovimento}
        categories={categories}
        investments={contasMovimento
          .filter(c => ['renda_fixa', 'poupanca', 'reserva', 'objetivo'].includes(c.accountType))
          .map(i => ({ id: i.id, name: i.name }))}
        loans={emprestimos
          .filter(e => e.status !== 'pendente_config')
          .map(e => ({
            id: `loan_${e.id}`,
            institution: e.contrato,
            numeroContrato: e.contrato,
            parcelas:
              e.meses > 0
                ? Array.from({ length: e.meses }, (_, i) => ({
                    numero: i + 1,
                    vencimento: format(addMonths(parseDateLocal(e.dataInicio!), i), 'yyyy-MM-dd'),
                    valor: e.parcela,
                    paga: transactions.some(
                      t => t.links?.loanId === `loan_${e.id}` && t.links?.parcelaId === (i + 1).toString(),
                    ),
                  }))
                : [],
            valorParcela: e.parcela,
            totalParcelas: e.meses,
          }))}
        segurosVeiculo={segurosVeiculo}
        veiculos={veiculos}
        imoveis={imoveis}
        terrenos={terrenos}
        selectedAccountId={selectedAccountForModal}
        onSubmit={handleTransactionSubmit}
        editingTransaction={editingTransaction}
      />
      <AccountFormModal open={showAccountModal} onOpenChange={setShowAccountModal} account={editingAccount} onSubmit={handleAccountSubmit} onDelete={id => setContasMovimento(p => p.filter(x => x.id !== id))} hasTransactions={editingAccount ? transactions.some(t => t.accountId === editingAccount.id) : false} />
      <CategoryFormModal open={showCategoryModal} onOpenChange={setShowCategoryModal} category={editingCategory} onSubmit={c => { if (editingCategory) setCategoriasV2(p => p.map(x => x.id === c.id ? c : x)); else setCategoriasV2(p => [...p, c]); }} onDelete={id => setCategoriasV2(p => p.filter(x => x.id !== id))} hasTransactions={editingCategory ? transactions.some(t => t.categoryId === editingCategory.id) : false} />
      <CategoryListModal open={showCategoryListModal} onOpenChange={setShowCategoryListModal} categories={categories} onAddCategory={() => { setEditingCategory(undefined); setShowCategoryModal(true); }} onEditCategory={c => { setEditingCategory(c); setShowCategoryModal(true); }} onDeleteCategory={id => setCategoriasV2(p => p.filter(x => x.id !== id))} transactionCountByCategory={transactionCountByCategory} />
      {viewingAccount && viewingSummary && <AccountStatementDialog open={showStatementDialog} onOpenChange={setShowStatementDialog} account={viewingAccount} accountSummary={viewingSummary} transactions={transactions.filter(t => t.accountId === viewingAccountId)} categories={categories} onEditTransaction={handleEditTransaction} onDeleteTransaction={handleDeleteTransaction} onToggleConciliated={handleToggleConciliated} onReconcileAll={() => setTransacoesV2(p => p.map(t => t.accountId === viewingAccountId ? { ...t, conciliated: true } : t))} />}
      <BillsTrackerModal open={showBillsTrackerModal} onOpenChange={setShowBillsTrackerModal} />
      <StatementManagerDialog open={showStatementManagerDialog} onOpenChange={setShowStatementManagerDialog} initialAccountId={viewingAccountId || undefined} onStartConsolidatedReview={id => { setAccountForConsolidatedReview(id); setShowConsolidatedReview(true); }} onManageRules={handleManageRules} />
      {accountForConsolidatedReview && <ConsolidatedReviewDialog open={showConsolidatedReview} onOpenChange={setShowConsolidatedReview} accountId={accountForConsolidatedReview} accounts={contasMovimento} categories={categories} investments={contasMovimento.filter(c => ['renda_fixa', 'poupanca', 'reserva', 'objetivo'].includes(c.accountType)).map(i => ({ id: i.id, name: i.name }))} loans={emprestimos.map(e => ({ id: `loan_${e.id}`, institution: e.contrato, numeroContrato: e.contrato, parcelas: [], valorParcela: e.parcela, totalParcelas: e.meses }))} />}
      <StandardizationRuleManagerModal open={showRuleManagerModal} onOpenChange={setShowRuleManagerModal} rules={standardizationRules} onDeleteRule={deleteStandardizationRule} categories={categories} />
    </MainLayout>
  );
};

export default ReceitasDespesas;