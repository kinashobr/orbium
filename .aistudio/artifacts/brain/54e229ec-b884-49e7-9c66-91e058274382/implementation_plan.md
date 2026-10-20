# Reformulação do Open Finance: Categorização, Lançamentos, Agrupamento e Anti-Duplicidade

Ajuste completo da arquitetura do módulo de Open Finance para separar responsabilidades entre busca de dados e lançamento contábil, introduzir categorização automática preditiva, agrupar despesas parceladas de forma compacta e eliminar qualquer duplicidade de transações e pagamentos de fatura.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> - **Botão Lançar e Desfazer:** Execução direta com 1 clique sem modais de confirmação (`AlertDialog` removido), mantendo feedback claro e imediato via Sonner toast.
> - **Novo botão de Extrato de Conta Corrente:** Posicionado no topo, logo ao lado do botão **Sincronizar**, com o título **"Disponibilizar Extrato"**, enviando o extrato para a tela de *Revisão de Extrato*.
> - **Despesas parceladas:** Agrupadas em linha compacta fixa, destacando o valor total da compra e o valor individual de cada parcela (ex: 6x de R$ 129,90 = R$ 779,40).
> - **Proporção do layout:** Card de Contas Bancárias reduzido para ~33% (`lg:col-span-4`) e Card de Transações expandido para ~67% (`lg:col-span-8`), garantindo área visual nobre para a nova coluna de categorias.

---

### 1. Overview & Core Concept

- **O que faz:**
  1. **Separação de Papéis:** O botão **Sincronizar** passa a ter o papel único e exclusivo de buscar os dados atualizados da Pluggy API e salvá-los no estado/cache local. Não faz lançamentos automáticos no extrato nem cria extratos não solicitados.
  2. **Botão Disponibilizar Extrato:** Criação de botão dedicado no cabeçalho superior (ao lado de Sincronizar) para gerar os lotes de extrato de contas correntes e disponibilizá-los na esteira de *Revisão de Extrato*.
  3. **Botão Lançar & Desfazer:** Adição do botão **Lançar** ao lado do botão **Desfazer** no cabeçalho do card de Transações. Ambos atuam instantaneamente sem modais de bloqueio.
  4. **Categorias Inteligentes:** Coluna de categoria adicionada diretamente no card de transações. O sistema atribui categorias automaticamente cruzando a descrição da transação com o histórico de lançamentos cadastrados (`transacoesV2`) e regras de padronização ativas, permitindo ajuste manual inline.
  5. **Agrupamento de Despesas Parceladas:** Linha consolidada para parcelamentos (ex: *On Fitness*), exibindo a quantidade de parcelas, o valor de cada parcela e o montante total.
  6. **Eliminação de Duplicidades:** Correção da lógica de verificação de duplicidade impedindo re-criações em sucessivos cliques ou após desfazer, e eliminação da duplicação de débito na conta corrente quando o pagamento de fatura já constar no extrato bancário.
  7. **Redistribuição de Espaço:** Rebalanceamento da proporção visual entre Contas Bancárias (33%) e Transações (67%).

---

### 2. User Experience & Visual Design

#### Hierarquia e Layout dos Cards
```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ CABEÇALHO DA PÁGINA: Open Finance                                                          │
│                                           [Disponibilizar Extrato]  [  Sincronizar (Pluggy) ]│
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────┬─────────────────────────────────────────────────────┐
│ CONTAS BANCÁRIAS (col-span-4, ~33%)   │ TRANSAÇÕES OPEN FINANCE (col-span-8, ~67%)          │
├───────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ • Itaú Corrente ... R$ 5.420,00       │ [Filtro Conta ▼]             [Lançar]  [Desfazer]   │
│   [Vínculo Orbium: Itaú Principal]    ├─────────────────────────────────────────────────────┤
│                                       │ Data  │ Descrição     │ Categoria      │ Valor      │
│ • Nubank Cartão ... R$ 1.890,00       ├───────┼───────────────┼────────────────┼────────────┤
│   [Vínculo Orbium: Cartão Nubank]     │ 18/10 │ Uber Viagens  │ [Transporte ▼] │ - R$ 24,90 │
│                                       │ 15/10 │ On Fitness    │ [Saúde ▼]      │ - R$ 779,40│
│                                       │       │ (6x R$ 129,90)│                │ (Parcelado)│
│                                       │ 10/10 │ Pgto Fatura   │ [Amortização]  │ + R$ 460,21│
└───────────────────────────────────────┴─────────────────────────────────────────────────────┘
```

#### Regras de Estilo e Anti-Slop
- Tipografia: Números e valores monetários com classe `font-mono tabular-nums`.
- Cores: Despesas em `text-destructive`, pagamentos/receitas em tom esmeralda positivo (`text-emerald-600 dark:text-emerald-400`).
- Sem badges decorativas excessivas: Metadados limpos com separadores tipográficos sutis (`·`).
- Select de categoria ágil: trigger compacto de 28px de altura, com busca e seleção fluida sem estourar as margens.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Sincronizar Exclusivamente como Leitor da Pluggy**
  - *Abordagem:* `syncPluggyData` apenas consulta a API e persiste o payload limpo no contexto. Lançamentos em `transacoesV2` só acontecem se o usuário clicar explicitamente em **Lançar**.
  - *Por que:* Atende perfeitamente ao pedido do usuário ("o botão Sincronizar deverá servir exclusivamente para buscar dados da Pluggy"), dando previsibilidade e controle absoluto ao usuário.
- **Decisão 2: Algoritmo de Autoatribuição de Categorias por Similaridade**
  - *Abordagem:* Ao carregar ou sincronizar transações, a função `predictTransactionCategory(tx, transacoesV2, standardizationRules)` verifica:
    1. Regras de padronização ativas (`matchCriteria`).
    2. Correspondência histórica em `transacoesV2` por similaridade de descrição ou termos-chave do estabelecimento.
    3. Categorias padrão para transações de amortização/fatura (`transferencia`).
  - *Por que:* O sistema aprende com os lançamentos prévios do usuário sem necessidade de configuração repetitiva.
- **Decisão 3: Agrupamento Inteligente no Card de Transações**
  - *Abordagem:* Transações identificadas como parceladas do mesmo estabelecimento e quantidade de parcelas são consolidadas em uma única linha no grid. O valor da parcela é exibido de forma secundária (`6x de R$ 129,90`), e o total consolidado é destacado.
  - *Por que:* Evita poluir a visualização com 6 ou 12 linhas repetidas da mesma compra.
- **Decisão 4: Proteção Anti-Duplicação de Pagamento de Fatura**
  - *Abordagem:* Antes de gerar débito em conta corrente para pagamento de fatura, o sistema verifica se a conta corrente de pagamento já possui lançamento com a mesma data e valor aproximado ou menção à fatura. Se já existir, a transação da conta corrente NÃO é duplicada; apenas o crédito da fatura é conciliado.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────┐           ┌────────────────────────────────┐
│   Botão "Sincronizar"   │ ────────> │  Busca Pluggy API & Cache      │
└─────────────────────────┘           │  (Sem escrita em transações)   │
                                      └────────────────┬───────────────┘
                                                       │
                                                       ▼
┌─────────────────────────┐           ┌────────────────────────────────┐
│   Card de Transações    │ <──────── │  Autoatribuição de Categoria   │
│   (Nova proporção 67%)  │           │  + Agrupamento de Parceladas   │
└────────────┬────────────┘           └────────────────────────────────┘
             │
   ┌─────────┴─────────┐
   ▼                   ▼
[Lançar]           [Desfazer]
   │                   │
   ▼                   ▼
Lança em           Remove do extrato
transacoesV2       sem modais de
com validação      confirmação
anti-duplicidade   (1 clique)
```

#### Modificações de Componentes
1. **`src/pages/OpenFinanceSettings.tsx`:**
   - Grid reconfigurado de `lg:col-span-6 / lg:col-span-6` para `lg:col-span-4 / lg:col-span-8`.
   - Adicionado botão **"Disponibilizar Extrato"** no topo, junto com **"Sincronizar"**.
   - Adicionado botão **"Lançar"** no card de transações ao lado de **"Desfazer"**.
   - Removido `AlertDialog` de confirmação do Desfazer e de Lançar (execução direta com notificação sonner).
   - Inserida coluna / seletor de Categoria com autoatribuição preditiva.
   - Agrupamento visual das parcelas com valor total + valor individual.
2. **`src/lib/pluggyAdapter.ts`:**
   - Implementada função `predictTransactionCategory` com base no histórico de `transacoesV2` e regras.
   - Refinada a função `isCreditCardTransactionDuplicate` para tratar pagamentos já existentes e evitar duplicação em conta corrente.
   - Função utilitária de agrupamento de transações parceladas para a interface.
3. **`src/contexts/FinanceContext.tsx`:**
   - Ajustada `syncPluggyData` para não gravar automaticamente em `transacoesV2` nem em `importedStatements` sem comando do usuário.
   - Criada a função `generateCheckingStatementsFromPluggy` para o botão dedicado "Disponibilizar Extrato".
   - Criada a função `commitPluggyTransactions` para o botão "Lançar", com proteção contra duplicidade de fatura.

---

### 5. Plano de Execução Sequencial

1. **Camada de Adaptação (`src/lib/pluggyAdapter.ts`):**
   - Implementar `predictTransactionCategory` e funções de agrupamento de parcelas.
   - Aprimorar verificação de duplicidade de faturas contra extratos existentes.
2. **Camada de Estado (`src/contexts/FinanceContext.tsx`):**
   - Limitar `syncPluggyData` à busca e cache do payload.
   - Implementar `generateCheckingStatementsFromPluggy` e `commitPluggyTransactions`.
3. **Camada de Interface (`src/pages/OpenFinanceSettings.tsx`):**
   - Atualizar layout com proporção 4/8 (33% / 67%).
   - Inserir botão "Disponibilizar Extrato" no cabeçalho.
   - Inserir botão "Lançar" ao lado de "Desfazer" e remover modais de diálogo.
   - Exibir coluna de categoria com seleção direta e agrupamento de compras parceladas.
4. **Validação:**
   - Executar `compile_applet` e `lint_applet` para assegurar integridade completa do código TypeScript.
