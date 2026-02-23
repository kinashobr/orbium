

# Plano: Reestruturar Abas do Gerenciar Compromissos + Edição de Descrição

## Resumo das mudanças

O usuario pediu 3 coisas:
1. Permitir edição da descrição dos lançamentos no modal Contas a Pagar
2. As contas fixas (seguros, empréstimos) devem ser carregadas automaticamente nos meses — não exigir adição manual
3. Unificar as abas "Fixas", "Parceladas" e "Adiantamentos" em uma única aba de "Contas Futuras" com listagem agrupada e botão de lançar nova compra parcelada

---

## 1. Edição da descrição no modal Contas a Pagar

### Problema atual
Na `BillsTrackerList` (desktop), linha 225, a descrição é exibida como texto estático (`bill.description`). No mobile (`BillsTrackerMobileList`), idem.

### Solução
Usar o componente `EditableCell` (que já existe e suporta `type="text"`) para a coluna de descrição quando o lançamento não está pago e não é externo.

**Arquivo:** `src/components/bills/BillsTrackerList.tsx`
- Linha 225: substituir o texto estático por `EditableCell` com `type="text"` e `onSave` chamando `onUpdateBill(bill.id, { description: newValue })`
- Permitir edição para todos os sourceTypes (ad_hoc, purchase_installment, loan_installment, etc.)

**Arquivo:** `src/components/bills/BillsTrackerMobileList.tsx`
- Adicionar ação de edição na descrição (toque para editar com input inline ou um pequeno botão de editar)

---

## 2. Auto-carregar contas fixas do mês (sem exigir inclusão manual)

### Problema atual
As contas fixas (empréstimos, seguros) são listadas na aba "Fixas" como `PotentialFixedBill` e o usuário precisa clicar em cada uma para incluí-la no tracker do mês. Isso é trabalhoso e reduz a visibilidade do fluxo de caixa.

### Solução
Mudar a lógica: ao abrir o mês, as contas fixas já devem vir **incluídas por padrão** no `billsTracker`. O usuário pode **remover** as que não quer.

**Arquivo:** `src/contexts/FinanceContext.tsx`
- Criar função `autoPopulateFixedBills(date)` que:
  1. Chama `getPotentialFixedBillsForMonth(date, billsTracker)`
  2. Para cada `PotentialFixedBill` que **não está incluída** e **não foi previamente excluída**, cria automaticamente um `BillTracker` e adiciona ao estado
  3. Usa uma flag `isExcluded` para itens que o usuário removeu manualmente (já existe no tipo)
- Essa função deve rodar quando o mês muda (no `BillsTrackerModal` e `BillsTracker.tsx`)

**Arquivo:** `src/components/bills/BillsTrackerModal.tsx` e `src/pages/BillsTracker.tsx`
- Adicionar `useEffect` que chama `autoPopulateFixedBills(currentDate)` quando `currentDate` muda
- Guard para não duplicar (verificar por `sourceType + sourceRef + parcelaNumber` antes de adicionar)

### Na aba unificada (item 3)
- Os itens fixos já carregados aparecem na listagem com opção de **remover** (marca `isExcluded: true`)
- Itens removidos podem ser restaurados com um clique

---

## 3. Unificar abas em "Contas Futuras"

### Estrutura atual (4 abas)
1. Fixas — lista de PotentialFixedBill do mês (toggle incluir/remover)
2. Parceladas — formulário de lançamento de compra parcelada
3. Cartões — gestão de cartão de crédito
4. Adiantamentos — lista de parcelas futuras para adiantar

### Nova estrutura (3 abas)

| Aba | Nome | Conteudo |
|-----|------|----------|
| 1 | **Compromissos** | Lista unificada de todas as contas do mês + futuras, agrupadas por tipo, com botão de adiantar em cada item futuro e botão para lançar nova compra parcelada |
| 2 | **Cartões** | Sem mudança — gestão de cartão de crédito |
| 3 | *(removida)* | Adiantamentos absorvida pela aba 1 |

### Detalhamento da aba "Compromissos"

**Novo componente:** `src/components/bills/tabs/CommitmentsTabContent.tsx`

Layout:

```
┌─ Botão [+ Nova Compra Parcelada] ───────────┐
│                                               │
│ ── EMPRÉSTIMOS ─────────────────────────────  │
│ [✓] Empréstimo Banco X - P3/24    R$ 850,00  │
│ [✓] Empréstimo Banco Y - P7/12    R$ 420,00  │
│   ▸ Parcelas futuras (2)                      │
│     P4/24 - Mar 2026  [Adiantar]              │
│     P5/24 - Abr 2026  [Adiantar]              │
│                                               │
│ ── SEGUROS ─────────────────────────────────  │
│ [✓] Seguro Porto - P5/12          R$ 92,47   │
│   ▸ Parcelas futuras (7)                      │
│     P6/12 - Mar 2026  [Adiantar]              │
│                                               │
│ ── COMPRAS PARCELADAS ──────────────────────  │
│ [✓] iPhone 15 Pro 3/10            R$ 599,90  │
│ [✓] On Fitness 1/6                R$ 119,90  │
│   ▸ Parcelas futuras (5)                      │
│     2/6 - Mar 2026  [Adiantar]                │
└───────────────────────────────────────────────┘
```

Funcionalidades:
- **Itens do mês atual** aparecem com checkbox (já incluídos automaticamente por padrão)
- Desmarcar = `isExcluded: true` (remove do tracker)
- Cada grupo mostra parcelas futuras em seção expansível (Collapsible)
- Parcelas futuras têm botão "Adiantar" que adiciona ao mês atual
- Botão "+ Nova Compra Parcelada" abre modal/drawer com o formulário existente (`PurchaseInstallmentTabContent`)

**Arquivo:** `src/components/bills/ManageCommitmentsModal.tsx`
- Reduzir de 4 abas para 2: "Compromissos" e "Cartões"
- Aba "Compromissos" usa o novo `CommitmentsTabContent`
- Remover imports de `FixedBillsTabContent`, `PurchaseInstallmentTabContent`, `AdvanceInstallmentsTabContent`

---

## Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/bills/BillsTrackerList.tsx` | Tornar coluna descrição editável via EditableCell |
| `src/components/bills/BillsTrackerMobileList.tsx` | Adicionar edição de descrição inline |
| `src/contexts/FinanceContext.tsx` | Criar `autoPopulateFixedBills(date)`, expor no contexto |
| `src/components/bills/tabs/CommitmentsTabContent.tsx` | **NOVO** — aba unificada com grupos, adiantamento inline e botão de nova compra |
| `src/components/bills/ManageCommitmentsModal.tsx` | Reduzir para 2 abas (Compromissos + Cartões) |
| `src/components/bills/BillsTrackerModal.tsx` | Chamar autoPopulateFixedBills no useEffect de currentDate |
| `src/pages/BillsTracker.tsx` | Idem — autoPopulateFixedBills |

---

## Ordem de implementação

| Passo | Descrição |
|-------|-----------|
| 1 | Adicionar edição de descrição na `BillsTrackerList` e `BillsTrackerMobileList` |
| 2 | Criar `autoPopulateFixedBills` no `FinanceContext` |
| 3 | Integrar auto-populate nos modais/página com useEffect |
| 4 | Criar `CommitmentsTabContent` com listagem agrupada + adiantamento + botão nova compra |
| 5 | Refatorar `ManageCommitmentsModal` para 2 abas |

