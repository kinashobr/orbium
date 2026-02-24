

# Plano: Correções de Transferências, Duplicação de Despesas CC, Overflow de Texto, Adiantamento e Categorias

---

## Problema 1 — Transferências não geram partida dupla corretamente

### Diagnóstico
No `handleTogglePaid` (BillsTrackerModal.tsx, linha 148-161), o pagamento de fatura (`card_invoice`) já gera corretamente duas transações: `transfer_out` na conta pagamento e `transfer_in` na conta do cartão, ambas com `transferGroupId`.

Porém, para **outros tipos de despesas** (linha 163-184), o pagamento gera apenas **uma transação** com `flow: 'out'`. Quando o usuário paga uma conta via importação de extrato, não há mecanismo para vincular essa transação importada ao `BillTracker` correspondente.

### Solução
1. **Importação de extratos**: Ao contabilizar uma transação importada que corresponde a um `BillTracker` pendente (match por valor + data próxima + descrição similar), marcar automaticamente o bill como pago e vincular o `transactionId`.
2. **Despesas normais com flow `out`**: Manter como está (partida simples) pois são despesas operacionais, não transferências entre contas. A partida dupla só se aplica a transferências reais (fatura, movimentação entre contas).
3. **Reconciliação manual**: Adicionar na lista de contas a pagar um indicador visual quando uma transação importada corresponde a um bill pendente, com botão para vincular.

---

## Problema 2 — Duplicação de despesas com cartão de crédito

### Diagnóstico
Este é o problema central: quando o usuário tem despesas pagas no cartão de crédito, elas aparecem duas vezes no fluxo financeiro:
- **Momento 1**: A despesa individual aparece como lançamento na conta do cartão (ex: "Supermercado R$ 50")
- **Momento 2**: No mês seguinte, o pagamento da fatura aparece como `transfer_out` da conta corrente

Na função `getOtherPaidExpensesForMonth` (FinanceContext.tsx, linha 935-950), transações com `flow === 'out'` da conta do cartão são listadas como despesas pagas. E a fatura inteira também aparece como bill pago. Isso gera dupla contagem nos KPIs.

### Solução
1. **Filtrar transações de contas cartão de crédito** no `getOtherPaidExpensesForMonth`: excluir transações cuja `accountId` pertença a uma conta `cartao_credito`. Essas despesas já estão representadas na fatura.
2. **Nos KPIs do modal** (linhas 121-137): a lógica já tenta excluir cartão, mas de forma inconsistente. Centralizar a exclusão no `getOtherPaidExpensesForMonth`.
3. **Marcar bills de `card_invoice`** com flag especial nos KPIs: o valor da fatura **não é despesa nova**, é liquidação de passivo. Deve ser excluído do "Total Pago" de despesas e contado separadamente como "Faturas Pagas".

**Alteração em `getOtherPaidExpensesForMonth`:**
```
// Excluir transações de contas cartão de crédito (já representadas nas faturas)
const creditCardAccountIds = new Set(
  contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id)
);
// Adicionar filtro: && !creditCardAccountIds.has(t.accountId)
```

**Alteração nos KPIs:**
- "A Pagar": somar bills pendentes **exceto** `card_invoice` (pois a fatura é liquidação de passivo, não despesa nova)
- "Pago": somar bills pagos **exceto** `card_invoice`
- Criar indicador separado "Faturas" se houver faturas no mês

---

## Problema 3 — Descrições estourando no modal

### Diagnóstico
Na `BillsTrackerList.tsx` linha 225, a célula de descrição usa `max-w-[250px]` e `truncate`, mas o `EditableCell` pode não respeitar o truncamento. No mobile (`BillsTrackerMobileList.tsx`), o `EditableCell` para descrição não tem constraints de largura.

### Solução
1. **Desktop (`BillsTrackerList.tsx`)**: Envolver o `EditableCell` em um container com `overflow-hidden` e `truncate`, e passar `className` com `truncate max-w-full`.
2. **Mobile (`BillsTrackerMobileList.tsx`)**: Adicionar `max-w-[180px]` ou `overflow-hidden truncate` no container da descrição editável.
3. **Em ambos**: garantir que o texto renderizado (quando não em modo edição) use `truncate` consistentemente.

---

## Problema 4 — Adiantamento de parcelas com ajuste de datas

### Diagnóstico
Quando o usuário altera manualmente a data de vencimento de uma parcela de empréstimo/seguro no modal Contas a Pagar (antecipando o pagamento), as parcelas subsequentes não são afetadas. O sistema não pergunta se as próximas devem ser realinhadas.

### Solução
No `handleUpdateDueDate` da `BillsTrackerList.tsx` (linha 160), adicionar lógica condicional:
1. Verificar se o bill é `loan_installment` ou `insurance_installment`
2. Se a nova data for **anterior** à data original, mostrar um **dialog de confirmação** perguntando: "Deseja antecipar as próximas parcelas em X dias também?"
3. Se confirmar, buscar todos os bills do mesmo `sourceRef` com `parcelaNumber` maior e subtrair a mesma diferença de dias
4. Se recusar, alterar apenas a parcela selecionada

**Novo componente**: Dialog simples de confirmação inline (pode usar o AlertDialog já importado).

---

## Problema 5 — Permitir exclusão (delete) dos itens removidos

### Diagnóstico
Na `CommitmentsTabContent.tsx` (linha 264-281), a seção "Removidos" só permite restaurar (`isExcluded: false`). Não há opção de excluir permanentemente.

### Solução
Adicionar botão de exclusão permanente (Trash2) ao lado do botão "Restaurar" em cada item removido. Ao clicar, chamar `setBillsTracker(prev => prev.filter(b => b.id !== billId))` para remover definitivamente.

---

## Problema 6 — Categorias para empréstimos e pagamento de fatura

### Diagnóstico
No `handleTogglePaid` (BillsTrackerModal.tsx):
- **Empréstimos** (linha 166): o guard `!category && !isLoan` permite pagar sem categoria. Mas na lista, o select de categoria está vazio e pode confundir.
- **Faturas** (linha 148): o pagamento de fatura não usa categoria nenhuma (`categoryId: null`), o que é correto para transferência, mas na lista aparece como "—" na coluna categoria.

### Solução
1. **Auto-atribuir categoria padrão para empréstimos**: Na `autoPopulateFixedBills`, buscar categoria que contenha "empréstimo" ou "financiamento" no label. Se não existir, criar uma categoria padrão "Financiamentos" com nature `despesa_fixa`.
2. **Para faturas (`card_invoice`)**: Esconder o select de categoria na lista (mostrar badge "Transferência" ou "Fatura") pois não se aplica.
3. **Para seguros**: Auto-atribuir categoria "Seguro" se existir.

**Alteração em `BillsTrackerList.tsx`**: na coluna categoria (linha 228), se `sourceType === 'card_invoice'`, exibir badge "Fatura" ao invés do select. Se `sourceType === 'loan_installment'`, exibir badge "Financiamento".

**Alteração em `autoPopulateFixedBills`**: pré-preencher `suggestedCategoryId` buscando por label matching.

---

## Resumo de arquivos afetados

| Arquivo | Mudanças |
|---------|----------|
| `src/contexts/FinanceContext.tsx` | Filtrar CC no `getOtherPaidExpensesForMonth`, melhorar `autoPopulateFixedBills` com categoria auto |
| `src/components/bills/BillsTrackerModal.tsx` | KPIs: separar fatura de despesa, dialog de adiantamento |
| `src/components/bills/BillsTrackerList.tsx` | Overflow descrição, badge categoria para fatura/empréstimo, dialog adiantamento de parcelas |
| `src/components/bills/BillsTrackerMobileList.tsx` | Overflow descrição |
| `src/components/bills/tabs/CommitmentsTabContent.tsx` | Botão excluir permanente nos removidos |

---

## Ordem de implementação

| Passo | Descrição | Prioridade |
|-------|-----------|------------|
| 1 | Filtrar CC no `getOtherPaidExpensesForMonth` + ajustar KPIs para não duplicar | Critica |
| 2 | Corrigir overflow de descrições (desktop + mobile) | Alta |
| 3 | Badge de categoria para fatura e empréstimo + auto-categoria no populate | Alta |
| 4 | Dialog de adiantamento de parcelas ao alterar data | Media |
| 5 | Botão excluir permanente nos removidos | Media |

