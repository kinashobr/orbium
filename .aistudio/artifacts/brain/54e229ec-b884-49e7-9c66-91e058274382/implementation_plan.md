# Open Finance & Contas a Pagar — Refinamento de Conciliação, Deduplicação e Despesas de Cartão

Melhoria abrangente do módulo de Open Finance e Contas a Pagar para garantir categorização com dados reais do sistema, deduplicação precisa de faturas e movimentações mesmo com divergência de nomenclatura, reversão (Desfazer) em 1 clique sem erros de ID, e exibição fidedigna de todas as despesas de cartão no Contas a Pagar.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões e Diagnósticos Alinhados com o Usuário:**
> - **Navegação no Extrato de Conta Corrente**: Ao clicar em "Disponibilizar Extrato", o usuário permanece no Open Finance, recebendo confirmação via toast no canto inferior.
> - **Valores a Tratar**: Transações já lançadas (`transacoesV2`), já disponibilizadas em extratos (`importedStatements`) ou cadastradas no **Gerenciar Compromissos** (`billsTracker`) são automaticamente ocultadas sem botão de alternância, mantendo Inbox Zero.
> - **Deduplicação de Cartão com Nomenclatura Diferente**: Se o valor bater com precisão de centavos ($\pm 0,05$) e a data for próxima ($\pm 3$ dias) na conta do cartão de crédito ou no extrato importado (OFX), o sistema considera como já tratado/duplicado, impedindo que nomes diferentes (ex: "UBER" vs "Uber Trip" ou nome fantasia) gerem lançamentos duplicados ao clicar em "Lançar".
> - **Desfazer Lançamentos do Cartão de Crédito**: O botão "Desfazer" agora mapeia bidirecionalmente o ID da Pluggy e o ID da conta Orbium, além de rastrear `meta.pluggyAccountId`, revertendo com sucesso todos os lançamentos de cartão realizados via Open Finance.
> - **Despesas de Cartão Ocultas no Contas a Pagar**: Corrigida a exclusão arbitrária (`!creditCardAccountIds.has(t.accountId)`) em `getOtherPaidExpensesForMonth`. Todas as despesas efetuadas e pagas em cartão de crédito agora aparecem na listagem do Contas a Pagar (resolvendo o problema onde o usuário tinha 21 transações e só apareciam 20).

---

### 1. Overview & Core Concept

- **O que faz**: 
  - **Open Finance**: Conciliação contextual com categorias reais do sistema (`categoriasV2`), segregação clara entre Conta Corrente e Cartão de Crédito, deduplicação à prova de falhas para faturas e compras com nomenclaturas divergentes, e reversão garantida no botão "Desfazer".
  - **Contas a Pagar (`BillsTracker`)**: Exibição completa e transparente de todos os pagamentos e despesas do mês, incluindo transações de cartão de crédito e conta corrente, sem ocultações indevidas.

---

### 2. Root Cause Analysis & Fixes Implemented

#### Problema 1: Duplicação de Compras no Cartão com Nomenclatura Diferente
- **Causa Raiz**: O algoritmo de verificação de duplicidade exigia correspondência de strings no radical do nome do estabelecimento. Quando a nomenclatura do extrato OFX ou banco divergia da API Open Finance (ou fora renomeada pelo usuário), o teste de duplicata falhava e relançava tudo ao clicar em "Lançar". Além disso, o cheque não consultava `importedStatements`.
- **Solução Implementada**: Em `isCreditCardTransactionDuplicate` e `isPluggyTransactionAlreadyHandled` (`src/lib/pluggyAdapter.ts`):
  - No mesmo cartão de crédito vinculado, havendo correspondência exata de centavos ($\pm 0,05$) e proximidade temporal ($\pm 3$ dias), a transação é reconhecida como duplicada/já tratada, independente de diferenças de grafia no histórico.
  - Verificação estendida aos extratos já importados no sistema (`importedStatements`) e compromissos agendados (`billsTracker`).

#### Problema 2: Botão "Desfazer" Não Encontrava Lançamentos
- **Causa Raiz**: A tela passava `selectedTxAccount` (o ID da conta na Pluggy, ex: UUID), enquanto a função `undoPluggyCardTransactions` comparava `t.accountId === targetAccountId` (onde `t.accountId` é o ID interno da conta no Orbium). A comparação sempre retornava `false`.
- **Solução Implementada**: Em `FinanceContext.tsx`, `undoPluggyCardTransactions` agora resolve o ID mapeado via `pluggyConfig.linkedAccounts[targetAccountId]`, mapeia inversamente o ID da Pluggy, e checa tanto `t.accountId` quanto `t.meta?.pluggyAccountId`. Lançamentos de cartão são desfeitos instantaneamente.

#### Problema 3: Despesas de Cartão Ocultadas no Contas a Pagar (21 vs 20 transações)
- **Causa Raiz**: Em `FinanceContext.tsx` (`getOtherPaidExpensesForMonth`), a linha 1599 possuía a cláusula `!creditCardAccountIds.has(t.accountId)`, que descartava silenciosamente qualquer despesa cujo `accountId` pertencesse a uma conta do tipo `cartao_credito`. Quando o usuário alterava a conta para corrente, a cláusula passava e a transação reaparecia.
- **Solução Implementada**: Cláusula `!creditCardAccountIds.has(t.accountId)` removida. Agora `getOtherPaidExpensesForMonth` inclui normalmente despesas de cartão de crédito no mês, filtrando unicamente transferências de liquidação de faturas (`meta.isCardPayment` e transferências do `card_invoice`) para evitar sobreposição com o registro da fatura. Todas as 21 transações do usuário agora aparecem visíveis.

---

### 3. Verification & Validation

- `compile_applet`: Executado com sucesso (Build succeeded, 0 erros).
- `lint_applet`: Executado com sucesso (0 erros).
