
# Plano: Fatura de Cartão — Modelo Banco Real

## Referência: o que a fatura do banco mostra

Com base nos dados brutos da fatura Nubank fornecidos, a fatura real de um banco apresenta:

**Seção 1 — Cabeçalho da fatura**
- Valor total da fatura
- Data de vencimento
- Período vigente (ex: 04 JAN a 04 FEV)

**Seção 2 — Alternativas de pagamento (com cálculo real)**
- Opção 1: Pagar total — sem juros
- Opção 2: Parcelar fatura — com simulação de parcelas, juros, IOF e CET
- Opção 3: Pagamento mínimo (15% das compras) — entra no rotativo (juros 16,1% a.m.)
- Opção 4: Atraso — bloqueio de cartão, negativação

**Seção 3 — Resumo da fatura**
- Fatura anterior + Pagamento recebido + Novas compras = Total a pagar
- Pagamento mínimo

**Seção 4 — Próximas faturas**
- Próximo fechamento
- Saldo em aberto da próxima fatura

**Seção 5 — Limites disponíveis**
- Utilizado vs disponível (total, saque, pix, boleto)

**Seção 6 — Transações detalhadas**
- Data, descrição, valor, número de parcela

---

## O que o app faz hoje (estado atual)

### O que funciona:
- Configuração de cartão (limite, fechamento, vencimento, conta pagamento)
- Cálculo do valor da fatura por ciclo de fechamento
- Barra de uso (usado / limite)
- Botões de pagamento: Total, Mínimo, Custom
- Persistência da fatura no `billsTracker`
- Alertas na sidebar (cobertura, limite crítico, mínimo recorrente)

### Limitações identificadas:

**L1 — Cálculo de "Usado" está errado**
O `usedAmount` usa `calculateBalanceUpToDate` que soma tudo desde sempre. O correto é somar apenas transações `flow === 'out'` no ciclo aberto atual (pós-fechamento anterior até hoje).

**L2 — Mínimo calculado simplesmente como 15% flat**
O banco calcula: 15% das compras em aberto do mês atual + 15% do mês anterior + 100% de outros lançamentos (juros, mora, IOF, saques, parcelamentos). O app usa só `Math.max(invoiceAmount * 0.15, 50)`.

**L3 — Nenhuma informação de transações da fatura**
O card não mostra quais transações compõem a fatura. O usuário não consegue ver "04 JAN - Supermercado R$49,75" como no banco.

**L4 — Sem distinção de ciclo (fatura atual vs próxima)**
Não existe noção de "saldo em aberto da próxima fatura". Compras feitas após o fechamento já pertencem ao próximo ciclo, mas o app não separa isso.

**L5 — Sem simulação de parcelamento de fatura**
O banco mostra: se parcelar em 3x → total R$ 344,44 com juros 12,86% a.m. O app não tem isso.

**L6 — Sem cálculo de juros rotativos**
O app não calcula o custo do rotativo (ex: "saldo restante R$ 239,80 × 16,1% a.m. = + R$ 47,42"). O usuário não vê o impacto real de pagar o mínimo.

**L7 — Sem resumo estruturado tipo extrato**
Não há "Fatura anterior + Pagamentos recebidos + Novas compras = Total" como a estrutura de extrato bancário.

**L8 — Pagamento mínimo sem warning quantificado**
O card avisa genericamente que "haverá juros". O banco mostra: "Na próxima fatura ficará R$ 329,54 se pagar só o mínimo".

**L9 — CashFlowTimeline não está integrada na UI**
O componente `CashFlowTimeline.tsx` existe mas não aparece em nenhum lugar da interface (nem no modal nem na página).

**L10 — Fatura da próxima vigência não é calculada nem exibida**
A seção "Próximas Faturas" do banco mostra o saldo em aberto do próximo ciclo. O app não calcula compras após o fechamento.

---

## Soluções possíveis para cada limitação

| Limitação | Solução | Viabilidade |
|-----------|---------|-------------|
| L1 — Cálculo de usado | Criar função `getCardCurrentCycleUsage(cardId, today)` que soma `flow === 'out'` pós último fechamento | Alta — só lógica de filtro |
| L2 — Mínimo flat | Criar `calculateMinimumPayment(invoiceAmount, previousBalance)` com fórmula real do banco | Alta — cálculo puro |
| L3 — Transações da fatura | Criar seção expansível no card mostrando transações do ciclo | Alta — dados já existem |
| L4 — Próximo ciclo | Calcular transações entre último fechamento e hoje (ciclo aberto) | Alta — extensão de L1 |
| L5 — Simulação parcelamento | Criar função `simulateInstallmentPlan(amount, months, monthlyRate)` | Alta — math financeiro |
| L6 — Juros rotativos | Calcular `saldoRestante × taxaMensal` e exibir no modo Mínimo | Alta — simples multiplicação |
| L7 — Resumo estruturado | Criar painel "Resumo da Fatura" com linhas: anterior + pagamentos + compras = total | Alta |
| L8 — Warning quantificado | No modo Mínimo, calcular e mostrar "próxima fatura será R$ X se pagar só o mínimo" | Alta |
| L9 — Timeline não integrada | Adicionar `CashFlowTimeline` na sidebar do `BillsSidebarKPIs` | Imediata |
| L10 — Próxima fatura | Criar `getNextCycleBalance(cardId, today)` somando transações após o fechamento | Alta |

---

## Plano de implementação

### Passo 1 — Corrigir lógica de ciclo e "usado" (L1, L4, L10)

**Arquivo: `src/contexts/FinanceContext.tsx`**

Criar/atualizar funções:

```
getCardCurrentCycleUsage(cardId, referenceDate):
  1. Calcular data do último fechamento (mês anterior ou atual)
  2. Filtrar transacoesV2 onde:
     - accountId === config.accountId
     - flow === 'out'
     - date > lastClosingDate && date <= referenceDate
  3. Retornar soma

getNextCycleBalance(cardId, referenceDate):
  1. Calcular data do fechamento atual
  2. Filtrar transações após o fechamento até hoje
  3. Retornar soma (saldo aberto da próxima fatura)

getCardCycleTransactions(cardId, monthDate):
  Retorna array de TransacaoCompleta do ciclo (para exibir no breakdown)
```

Expor essas 3 funções no `FinanceContext.value`.

---

### Passo 2 — Reestruturar o `CreditCardTab` como "Fatura do Banco" (L2–L8)

**Arquivo: `src/components/bills/CreditCardTab.tsx`**

Cada card de cartão passa a ter **duas seções expansíveis**:

#### Seção A — Visão da Fatura Atual (sempre visível)

```
┌─ Nubank ────────────────────────────────────┐
│ Período: 04 JAN → 04 FEV                   │
│ Vence: 11 FEV 2026                         │
│                                             │
│ FATURA: R$ 282,12    DISPONÍVEL: R$ 5.318  │
│ ▓▓▓▓▓▓░░░░░░░░░░  14% usado               │
│                                             │
│ Próxima fatura (em aberto): R$ 119,90      │
└─────────────────────────────────────────────┘
```

#### Seção B — Breakdown de transações (expansível, ▼)

```
┌─ Transações do ciclo ───────────────────────┐
│ 07 JAN  Panificadora Pao de Queijo  R$ 49,75│
│ 26 JAN  Mapfre Parcela 3/12        R$ 92,47 │
│ 30 JAN  Panificadora Pao de Queijo  R$ 20,00│
│ 31 JAN  On Fitness - Parcela 1/6   R$ 119,90│
│ ─────────────────────────────────────────── │
│ Total de compras: R$ 282,12                 │
└─────────────────────────────────────────────┘
```

#### Seção C — Alternativas de Pagamento (substituindo botões simples)

Substituir os 3 botões por um painel com 3 opções visualmente hierarquizadas, similar ao layout do banco:

**Opção 1 — Total (recomendada)**
```
✓ Pagar Total: R$ 282,12
  Sem juros. Melhor escolha.
```

**Opção 2 — Mínimo (com impacto calculado)**
```
⚠ Pagamento Mínimo: R$ 42,31
  Saldo restante: R$ 239,80
  Juros rotativos (16,1%/mês): +R$ 38,63
  Próxima fatura: ~R$ 329,54
```
- Taxa de juros configurável no card
- Cálculo: `saldoRestante × taxaRotativo`

**Opção 3 — Parcelar fatura (simulação)**
```
◈ Parcelar em: [3x] [6x] [12x]
  3x: R$ 100,70/mês · Total R$ 344,44 · Juros 12,86%/mês
  6x: R$  59,08/mês · Total R$ 396,84 · Juros 12,86%/mês
```
- Taxas configuráveis no cadastro do cartão
- Cálculo: tabela Price simples

**Opção 4 — Valor customizado**
- Input de valor + cálculo de impacto em tempo real

---

### Passo 3 — Expandir o modelo `CreditCardConfig` (L5, L6)

**Arquivo: `src/types/finance.ts`**

Adicionar campos opcionais à `CreditCardConfig`:

```typescript
interface CreditCardConfig {
  // ... campos existentes ...
  interestRateMonthly?: number;       // Taxa rotativa (ex: 0.161 = 16,1%)
  installmentRateMonthly?: number;    // Taxa parcelamento (ex: 0.1286 = 12,86%)
  minimumPaymentPercent?: number;     // % do mínimo (default 0.15 = 15%)
  previousCycleBalance?: number;      // Saldo do mês anterior (para cálculo do mínimo real)
}
```

Todos opcionais com defaults (0.15 mínimo, sem juros se não configurado).

---

### Passo 4 — Criar lógica financeira (L2, L5, L6)

**Novo helper `src/lib/creditCardCalc.ts`** (ou dentro do FinanceContext):

```typescript
// Pagamento mínimo real (fórmula do banco)
calculateMinimumPayment(invoiceAmount, config):
  base = invoiceAmount * (config.minimumPaymentPercent || 0.15)
  return Math.max(base, 10) // mínimo absoluto R$10

// Simulação rotativo
calculateRevolvingImpact(remainingBalance, monthlyRate):
  interest = remainingBalance * monthlyRate
  return { interest, nextMonthEstimate: remainingBalance + interest }

// Simulação parcelamento (Price)
simulateInstallmentPlan(amount, months, monthlyRate):
  if monthlyRate === 0: return { monthlyPayment: amount/months, total: amount, interest: 0 }
  i = monthlyRate
  pmt = amount * (i * (1+i)^n) / ((1+i)^n - 1)
  return { monthlyPayment: pmt, total: pmt * months, interest: pmt*months - amount }
```

---

### Passo 5 — Integrar `CashFlowTimeline` na sidebar (L9)

**Arquivo: `src/components/bills/BillsSidebarKPIs.tsx`**

Adicionar o componente `CashFlowTimeline` após a seção de alertas de cartão. O componente já existe e está completo, só precisa ser importado e renderizado dentro do `BillsSidebarKPIs`.

---

### Passo 6 — Resumo estruturado da fatura (L7)

No `CreditCardTab`, adicionar painel "Resumo" estilo extrato bancário:

```
Fatura anterior         R$ 1.313,68
Pagamento recebido     −R$ 1.313,68
Compras do ciclo        R$ 282,12
─────────────────────────────────
Total a pagar           R$ 282,12
```

Para isso, o app precisará rastrear:
- Valor da fatura do mês anterior (já existe em `billsTracker` como `card_invoice` do mês anterior)
- Pagamentos realizados no ciclo (transações que quitaram a fatura anterior)

---

## Resumo de arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/types/finance.ts` | Adicionar campos de taxa ao `CreditCardConfig` |
| `src/contexts/FinanceContext.tsx` | Criar `getCardCurrentCycleUsage`, `getNextCycleBalance`, `getCardCycleTransactions` |
| `src/components/bills/CreditCardTab.tsx` | Reestruturar completamente — breakdown, alternativas hierarquizadas, simulações |
| `src/components/bills/BillsSidebarKPIs.tsx` | Integrar `CashFlowTimeline` |
| `src/lib/creditCardCalc.ts` | **NOVO** — funções financeiras (mínimo, rotativo, parcelamento Price) |

---

## Ordem de implementação recomendada

| Passo | Ação | Impacto |
|-------|------|---------|
| 1 | Expandir `CreditCardConfig` com campos de taxa | Base para os demais |
| 2 | Criar helper `creditCardCalc.ts` | Lógica financeira isolada e testável |
| 3 | Criar `getCardCurrentCycleUsage` e `getCardCycleTransactions` no Context | Corrige L1 e L3 |
| 4 | Criar `getNextCycleBalance` no Context | Corrige L4 e L10 |
| 5 | Reestruturar `CreditCardTab` com breakdown + alternativas + simulações | Experiência principal |
| 6 | Integrar `CashFlowTimeline` na sidebar | Corrige L9 (imediato) |

---

## Limitações que não têm solução completa no app

| Limitação | Por quê não resolve totalmente |
|-----------|-------------------------------|
| Mínimo real exato | O banco considera histórico de meses anteriores e lançamentos automáticos de juros que o app não lança. Faremos uma aproximação boa o suficiente. |
| CET (Custo Efetivo Total) | Cálculo regulatório complexo que envolve IOF diário, taxa de abertura, etc. Será exibido como estimativa. |
| Limite adicional dinâmico | O app usa limite fixo configurado pelo usuário. Não há API para consultar limite real do banco. |
| Parcelamento de fatura pelo banco | A "entrada + parcelas" do Nubank é um produto do banco. O app simulará matematicamente mas não executa via banco. |
| IOF automático | IOF em transações internacionais e saques não é calculado automaticamente pois o app não distingue tipo de compra. |
