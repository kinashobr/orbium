

# Plano: Ajustes na aba Análise — Cálculos, Balanço e Modais

---

## 1. Balanço Patrimonial: integrar compras parceladas

**Correção em `BalancoTab.tsx`:**
- Importar `billsTracker` do `useFinance()`
- Calcular total de parcelas não pagas de compras parceladas: `billsTracker.filter(b => b.sourceType === 'purchase_installment' && !b.isPaid && !b.isExcluded).reduce((a, b) => a + b.expectedAmount, 0)`
- Adicionar ao **Passivo Circulante** como item "Compras Parceladas"

**Correção em `FinanceContext.tsx` (`getPassivosTotal`):**
- Incluir saldo de compras parceladas não pagas no cálculo global de passivos

---

## 2. Fix: Card "Distribuição" mostrando 20% com dados zerados

**Correção em `Index.tsx`:** Se `temDados` é false OU se nenhum saldo positivo existe, retornar 0.

---

## 3. Fix: Card "Endividamento" mostrando "0%" vs "—"

**Correção em `SaudeFinanceira.tsx`:** Usar `!hasData ? "—"` como primeiro check para TODOS os indicadores, sem exceção.

---

## 4. Fix: Modal "Configurar Indicadores" — design e responsividade

**Correção em `IndicatorManagerModal.tsx`:**
- `max-h-[85vh]` no `DialogContent`, scroll interno via `ScrollArea`
- Mobile: fullscreen pattern
- Inputs com estilo padrão do sistema

---

## 5. Fix: Cálculos de indicadores incorretos

### 5a. Despesas — cálculo mais restritivo

**Problema:** Linha 119 usa `t.flow === 'out'`, que inclui `aplicacao` (investimento), `veiculo` (compra de ativo), `imobilizado` (compra de ativo) e `pagamento_emprestimo`. Nenhum desses é despesa operacional real — são movimentações patrimoniais ou financeiras. Isso infla artificialmente as despesas.

**Correção:** Substituir o filtro genérico por uma lista explícita de `operationType` que representam despesas reais:

```ts
const despesas = txs
  .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
  .reduce((a, t) => a + t.amount, 0);
```

Justificativa:
- `despesa` → despesa operacional real ✅
- `pagamento_emprestimo` → compromisso financeiro que impacta caixa ✅
- `aplicacao` → movimentação patrimonial (dinheiro vira investimento) ❌ não é despesa
- `veiculo` compra → movimentação patrimonial (dinheiro vira ativo) ❌ não é despesa
- `imobilizado` compra → movimentação patrimonial ❌ não é despesa

Isso garante que indicadores como Margem Líquida, Taxa de Poupança e Lucro reflitam apenas despesas genuínas.

### 5b. Ativo Circulante — falta Seguros a Apropriar

**Correção:** `ativoCirculante = saldoContas + getSegurosAApropriar(date)`

### 5c. Passivo Circulante — falta Principal (12m) e compras parceladas

**Correção:** `passivoCirculante = getCreditCardDebt(date) + getSegurosAPagar(date) + calculateLoanPrincipalDueInNextMonths(date, 12) + comprasParceladasPendentes`

### 5d. Disponibilidades — expandir tipos de conta

**Correção:** Filtrar por `['corrente', 'poupanca', 'reserva'].includes(c.accountType)` + contas com `accountTerm === 'curto_prazo'` e tipos `renda_fixa`, `objetivo`.

### 5e. Parcelas — incluir seguro e compras parceladas

**Correção:** Somar bills pagas no período com sourceType `loan_installment`, `insurance_installment` e `purchase_installment`.

---

## 6. FormulaValues nos cards do Balanço e DRE

Adicionar `formulaValues` a cada `IndicatorCard` em `BalancoTab.tsx` (6 cards) e `DRETab.tsx` (5 cards).

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/FinanceContext.tsx` | `getPassivosTotal`: incluir compras parceladas |
| `src/components/reports/BalancoTab.tsx` | Compras parceladas no passivo + `formulaValues` |
| `src/components/reports/IndicadoresTab.tsx` | Corrigir despesas, ativoCirculante, passivoCirculante, disponibilidades, parcelas |
| `src/components/reports/DRETab.tsx` | `formulaValues` nos 5 cards |
| `src/components/reports/IndicatorManagerModal.tsx` | Fix design/responsividade/scroll |
| `src/pages/Index.tsx` | Fix distribuição 20% com dados zerados |
| `src/components/dashboard/SaudeFinanceira.tsx` | Fix endividamento "0%" vs "—" |

## Ordem de execução

1. Fix cálculos (`IndicadoresTab` + `FinanceContext`)
2. Balanço: compras parceladas (`BalancoTab` + `FinanceContext`)
3. Fix distribuição e endividamento (`Index.tsx` + `SaudeFinanceira.tsx`)
4. Fix modais (`IndicatorManagerModal`)
5. FormulaValues nos cards Balanço e DRE

