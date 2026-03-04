

# Plano: Modal Receitas e Recebimentos — Fase 1 (Fundação)

Este é um feature muito grande. Vou implementar a **Fase 1** completa (dados + UI base + cadastro + pipeline) e deixar as fases seguintes preparadas pela arquitetura.

---

## Visão geral da Fase 1

1. **Tipos de dados** em `src/types/finance.ts`
2. **Estado + CRUD** no `FinanceContext`
3. **Modal principal** com aba Pipeline + formulário de cadastro
4. **Botão de acesso** no módulo Contas a Pagar
5. **Persistência** (localStorage + export/import)

---

## 1. Tipos de dados (`src/types/finance.ts`)

### Novos tipos a adicionar:

```typescript
// Natureza financeira da entrada
export type IncomeFinancialNature = 
  | 'receita' | 'aporte' | 'emprestimo_recebido' 
  | 'reembolso' | 'repasse_terceiros' | 'doacao' | 'outras_entradas';

// Fonte/perfil da receita
export type IncomeSourceType =
  | 'clt_salario' | 'clt_13' | 'clt_ferias' | 'clt_plr' | 'clt_beneficio' | 'clt_adiantamento'
  | 'autonomo_projeto' | 'autonomo_milestone' | 'autonomo_comissao' | 'autonomo_freelance'
  | 'mei_servico' | 'mei_venda' | 'mei_prolabore' | 'mei_lucro'
  | 'bico' | 'renda_extra' | 'informal'
  | 'emprestimo_pessoal' | 'repasse' | 'reembolso' | 'rateio'
  | 'doacao' | 'venda_ativo' | 'indenizacao' | 'outros';

// Status do recebível
export type IncomeStatus = 
  | 'previsto' | 'cobrado_ou_faturado' | 'recebido_parcial' 
  | 'recebido' | 'atrasado' | 'renegociado' | 'cancelado';

// Recorrência
export interface IncomeRecurrenceRule {
  id: string;
  frequency: 'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'anual' | 'personalizado';
  interval: number;
  dayOfMonth?: number;
  endsAt?: string;
  maxOccurrences?: number;
}

// Entidade principal
export interface FutureIncome {
  id: string;
  description: string;
  sourceType: IncomeSourceType;
  financialNature: IncomeFinancialNature;
  counterparty?: string; // cliente/empresa/pagador
  grossAmount: number;
  fees: number;
  discounts: number;
  taxWithheld: number;
  netExpectedAmount: number;
  competenceDate: string; // YYYY-MM-DD
  expectedDueDate: string; // YYYY-MM-DD
  expectedCreditDate?: string;
  status: IncomeStatus;
  confidence: number; // 0–100
  recurrenceRule?: IncomeRecurrenceRule;
  accountId?: string; // conta de recebimento
  categoryId?: string;
  isTaxable: boolean;
  isThirdPartyMoney: boolean;
  requiresLiabilityTracking: boolean;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Liquidação/recebimento
export interface IncomeSettlement {
  id: string;
  futureIncomeId: string;
  receivedAmount: number;
  receivedDate: string;
  accountId: string;
  feesApplied: number;
  taxWithheldApplied: number;
  transactionId?: string; // vínculo com transação real
  notes?: string;
}
```

### Atualizar `FinanceExportV2.data`:
- Adicionar `futureIncomes: FutureIncome[]`
- Adicionar `incomeSettlements: IncomeSettlement[]`

### Helpers:
- `generateFutureIncomeId(): string`
- `generateSettlementId(): string`

---

## 2. FinanceContext — Estado e CRUD

### Novos estados:
- `futureIncomes: FutureIncome[]` (persistido em localStorage key `fin_future_incomes_v1`)
- `incomeSettlements: IncomeSettlement[]` (persistido em `fin_income_settlements_v1`)

### Novas actions na interface:
```
addFutureIncome(income: Omit<FutureIncome, 'id' | 'createdAt' | 'updatedAt'>): void
updateFutureIncome(id: string, updates: Partial<FutureIncome>): void
deleteFutureIncome(id: string): void
addIncomeSettlement(settlement: Omit<IncomeSettlement, 'id'>): void
deleteIncomeSettlement(id: string): void
getFutureIncomesForMonth(date: Date): FutureIncome[]
```

### Lógica de status automático:
- Ao adicionar settlement: calcular saldo aberto. Se zero → `recebido`; se parcial → `recebido_parcial`.
- Job no useEffect: itens com `expectedDueDate` vencido e status `previsto`/`cobrado_ou_faturado` → `atrasado`.

### Export/Import:
- Incluir `futureIncomes` e `incomeSettlements` no `exportData` e `importData`.
- Incluir no `GoogleDriveSync.tsx` dataToSave.

---

## 3. Modal UI — `IncomeReceivablesModal`

### Arquivo: `src/components/bills/IncomeReceivablesModal.tsx`

**Estrutura:** Segue o mesmo padrão do `ManageCommitmentsModal` (fullscreen mobile, dialog desktop, header com ícone, tabs).

**Abas Fase 1:**

#### Aba 1: Pipeline
- Lista de `FutureIncome` do mês selecionado, agrupada por status
- Cada card mostra: descrição, contraparte, valor líquido, vencimento, badge de status, barra de confiança
- Ações inline: marcar como cobrado, registrar recebimento rápido (total), expandir para parcial
- Filtro por natureza financeira e sourceType

#### Aba 2: Registrar Receita (formulário)
- Formulário completo baseado nos campos de `FutureIncome`
- Catálogo de cenários: ao selecionar `sourceType`, preenche defaults inteligentes (confidence, isTaxable, etc.)
- Seção "Valores": bruto, taxas, descontos, retenção → calcula líquido automaticamente
- Seção "Recorrência": toggle + configuração
- Seção "Classificação": natureza financeira, flags (terceiros, passivo)

### Arquivo: `src/components/bills/IncomeReceivableCard.tsx`
- Card individual do pipeline com status visual, ações e indicadores

### Arquivo: `src/components/bills/IncomeFormSheet.tsx`
- Formulário de cadastro/edição reutilizável (Sheet no mobile, inline no desktop)

---

## 4. Ponto de acesso

### Arquivo: `src/pages/BillsTracker.tsx`
- Adicionar botão "Receitas e Recebimentos" ao lado do "Gerenciar Compromissos"
- Importar e renderizar `IncomeReceivablesModal`

### Arquivo: `src/components/bills/BillsTrackerModal.tsx`
- Adicionar botão alternativo no header do modal principal

---

## 5. KPIs básicos (sidebar)

### Arquivo: `src/components/bills/BillsSidebarKPIs.tsx`
- Adicionar seção "Receitas Previstas" com:
  - Total previsto no mês (soma de `netExpectedAmount` com status != cancelado)
  - Total recebido (soma de settlements do mês)
  - Pendente de recebimento (previsto - recebido)

---

## Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/types/finance.ts` | Adicionar tipos FutureIncome, IncomeSettlement, enums |
| `src/contexts/FinanceContext.tsx` | Estado, CRUD, persistência, auto-status |
| `src/components/bills/IncomeReceivablesModal.tsx` | **Novo** — Modal principal com Pipeline + Form |
| `src/components/bills/IncomeReceivableCard.tsx` | **Novo** — Card do pipeline |
| `src/components/bills/IncomeFormSheet.tsx` | **Novo** — Formulário cadastro/edição |
| `src/pages/BillsTracker.tsx` | Botão de acesso ao modal |
| `src/components/bills/BillsSidebarKPIs.tsx` | KPIs de receitas previstas |
| `src/components/bills/BillsTrackerModal.tsx` | Botão de acesso alternativo |
| `src/components/layout/GoogleDriveSync.tsx` | Incluir futureIncomes no backup |

## Ordem de implementação

| # | Ação | Prioridade |
|---|------|------------|
| 1 | Tipos de dados (finance.ts) | Crítica |
| 2 | Estado + CRUD (FinanceContext) | Crítica |
| 3 | Modal principal com Pipeline + Formulário | Crítica |
| 4 | Cards do pipeline + form sheet | Alta |
| 5 | Botões de acesso (BillsTracker + Modal) | Alta |
| 6 | KPIs na sidebar | Média |
| 7 | Google Drive sync | Média |

