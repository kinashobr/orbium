# Revisão de Extrato — Modernização, Usabilidade e Tratamento em Lote

Plano de modernização integral da tela de Revisão de Extrato bancário (`/revisao-extrato`), trazendo unificação visual inteligente de descrições, alternância fluida entre lançamentos pendentes e contabilizados, seletores avançados com busca idênticos ao Contas a Pagar, seleção por checkbox para contabilização e reversão em lote, preservação definitiva de digitações manuais e refinamento de todas as operações contábeis.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Confirmadas com o Usuário:**
> - **Visualização de Contabilizados**: Alternância de abas na própria página entre **"A Tratar" (Pendentes)** e **"Contabilizadas"**, permitindo conferência e reversão sem necessidade de modais extras.
> - **Seleção por Checkbox**: A coluna 1 terá caixas de seleção (com opção "Selecionar Todos" no cabeçalho), e o botão **Contabilizar** processará exclusivamente as transações marcadas que estiverem válidas.
> - **Desfazer do Período**: O botão no topo executa o **Desfazer Contabilização do Período**, revertendo as transações criadas nas contas correntes e devolvendo os itens para a fila "A Tratar" com segurança.
> - **Zero Perda de Dados em Regras**: As alterações manuais feitas nas linhas em tela passam a ser salvas no estado do extrato importado (`importedStatements`), garantindo que criar ou alterar uma regra não sobrescreva o trabalho já preenchido pelo usuário.

---

### 1. Overview & Core Concept

- **O que faz**:
  - **Coluna de Descrição Unificada**: Elimina a redundância de duas colunas separadas. Mostra a descrição original se não houver padronização, e a descrição final cadastrada quando padronizada ou editada pelo usuário, com dica/subtexto elegante do histórico original.
  - **Filtro Estrito de Duplicadas e Inbox Zero**: Transações detectadas como duplicatas potenciais já lançadas no sistema são removidas da lista de pendências a tratar. Ao concluir todo o lote, a tela exibe um estado vazio limpo e minimalista no centro.
  - **Aba de Contabilizadas & Desfazer Seletivo**: Permite inspecionar o histórico contabilizado do período, selecionar transações específicas e clicar em "Desfazer Contabilização" para que retornem imediatamente à tela de revisão para novo tratamento.
  - **Componentes com Busca (Categoria e Operação)**: Integração do `CategorySearchSelector` (mesmo padrão do Contas a Pagar com Command/Popover) e estilização unificada para o seletor de Operação com ícones temáticos e busca.
  - **Exclusão de Transações**: Coluna com botão para descartar permanentemente transações irrelevantes do extrato que não devem ser contabilizadas.
  - **Botão Alterar Regra vs Criar Regra**: Design contextual que identifica se a transação já foi associada a uma regra pré-existente (exibindo "Editar Regra") ou se é um novo padrão ("Criar Regra").

---

### 2. User Experience & Visual Design

#### A. Estrutura e Abas Principais
- **Top Bar**:
  - Título e subtítulo com identificação da conta.
  - Contadores tipográficos limpos (sem pílulas estáticas): `X pendentes · Y prontos · Z contabilizados`.
  - **Segmented Control / Abas**: `[ A Tratar (N) ]` e `[ Contabilizadas (M) ]`.
  - Botão **Desfazer Contabilização do Período** (com diálogo de confirmação explicativo).
  - Seletor de Período (`PeriodSelector`) e Botão de Regras (`Settings2`).

#### B. Tabela "A Tratar" (Pendentes)
- **Coluna 1 (Seleção & Status)**: Checkbox de seleção por linha + indicador de prontidão (ícone verde sutil quando pronta para contabilizar ou ícone de pendência).
- **Coluna 2 (Data & Valor)**: Data formatada e valor com cor semântica (+ verde receita / - vermelho despesa).
- **Coluna 3 (Descrição / Histórico - Unificada)**:
  - Exibe campo editável com a descrição final / padronizada.
  - Se houver histórico original divergente, exibe tipografia discreta logo abaixo com o texto original do banco.
- **Coluna 4 (Operação)**: Seletor estilizado consistente com busca rápida e badges de cores por tipo de operação.
- **Coluna 5 (Categoria)**: `CategorySearchSelector` com busca por texto, ícones de categoria e navegação fluida.
- **Coluna 6 (Vínculo)**: Exibido dinamicamente quando a operação exige (Transferência -> Conta Destino; Aplicação/Resgate -> Investimento; Empréstimo -> Contrato & Parcela).
- **Coluna 7 (Ações)**:
  - Botão contextual de Regra: se já existe regra vinculada ao padrão, exibe botão estilizado de edição de regra; se não existe, exibe botão de criar regra.
  - Botão de Excluir Transação (lixeira discreta com confirmação) para descartar o item do extrato.

#### C. Tabela "Contabilizadas"
- Exibe as transações que foram contabilizadas no período para aquela conta.
- Colunas: Checkbox de seleção, Data, Valor, Descrição, Categoria / Operação, e Ação "Desfazer".
- Botão no rodapé: **"Desfazer Selecionadas (K)"** e botão individual por linha.
- Ao clicar em desfazer, remove os lançamentos em `transacoesV2` e reativa as transações no extrato importado, que reaparecem imediatamente na aba "A Tratar".

#### D. Estado Vazio (Inbox Zero)
- Quando todas as transações forem tratadas, exibe um card central amplo e acolhedor:
  - Ícone de sucesso / arquivo conciliado.
  - Texto: *"Extrato 100% conciliado para este período!"*
  - Subtexto: *"Nenhuma transação pendente a tratar. Você pode alternar para a aba 'Contabilizadas' para revisar ou desfazer lançamentos."*

---

### 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          RevisaoExtrato.tsx                            │
│  - State: activeTab ('pending' | 'contabilized')                       │
│  - State: selectedTxIds (Set<string>)                                  │
│  - Memo: pendingTransactions (filtered duplicates excluded)            │
│  - Memo: contabilizedTransactions (from importedStatements in period)  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
         activeTab === 'pending'           activeTab === 'contabilized'
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│        TransactionReviewTable        │ │   ContabilizedReviewTable     │
│  - Select all / Checkboxes           │ │  - Select all / Checkboxes    │
│  - Unified Description cell          │ │  - Batch / Single Undo        │
│  - CategorySearchSelector (Search)   │ │  - Direct call to             │
│  - OperationSelector (Searchable)    │ │    uncontabilizeImportedTx    │
│  - Smart Rule button (Create/Edit)   │ └───────────────────────────────┘
│  - Delete transaction button         │
└──────────────────────────────────────┘
                    ▲
                    │
┌───────────────────┴────────────────────────────────────────────────────┐
│                    FinanceContext & Data Persistence                   │
│  - updateImportedTransactionInStatement (persists user in-memory edits)│
│  - uncontabilizeImportedTransaction (batch & single safe rollback)     │
│  - deleteTransactionFromImportedStatement (permanent item exclusion)  │
│  - applyRules (preserves user-edited dirty fields)                     │
└────────────────────────────────────────────────────────────────────────┘
```

#### Regras de Validação das Operações (Item 9 do Pedido)
1. **Receita**: `categoryId` obrigatório com natureza `receita`; gera `flow: 'in'`, `domain: 'operational'`.
2. **Despesa**: `categoryId` obrigatório com naturezas de despesa; gera `flow: 'out'`, `domain: 'operational'`.
3. **Transferência**: `destinationAccountId` obrigatório (diferente da conta de origem); gera partida dobrada (`transfer_out` e `transfer_in`) com `transferGroupId`.
4. **Aplicação**: `tempInvestmentId` obrigatório; debita a conta corrente e credita a conta de investimento com `domain: 'investment'`.
5. **Resgate**: `tempInvestmentId` obrigatório; credita a conta corrente e debita o investimento.
6. **Pagamento de Empréstimo**: `tempLoanId` e `tempParcelaId` obrigatórios; debita a conta e baixa a parcela no contrato (`markLoanParcelPaid`).
7. **Liberação de Empréstimo**: `flow: 'in'`, registra o crédito do financiamento.
8. **Rendimento**: `flow: 'in'`, categoria de receita/rendimento.
9. **Veículo**: `tempAssetOperation` obrigatório se for aquisição ou manutenção específica de ativo.

---

### 4. Implementation Steps

1. **Atualização no `FinanceContext.tsx`**:
   - Adicionar funções auxiliares:
     - `deleteTransactionFromImportedStatement(statementId: string, transactionId: string)`: remove transação indesejada da importação.
     - `uncontabilizeTransactionsBatch(transactionIds: string[])`: reverte lote de transações contabilizadas de uma só vez.
     - `updateRawTransactionDraft(statementId: string, transactionId: string, updates: Partial<ImportedTransaction>)`: persiste descrições ou categorias editadas pelo usuário no extrato em tempo real.
     - Ajustar `getTransactionsForReview` para não sobrescrever dados salvos no rascunho da transação.

2. **Criação do Seletor de Operação com Busca e Ícones**:
   - Criar `src/components/transactions/OperationSearchSelector.tsx` utilizando Popover e Command, exatamente como o `CategorySearchSelector`.

3. **Refatoração da Tabela `TransactionReviewTable.tsx`**:
   - Checkbox na coluna 1 (com "Selecionar Todos").
   - Unificação de "Descrição Original" e "Descrição Final" em uma coluna única responsiva.
   - Substituição dos selects nativos por `CategorySearchSelector` e `OperationSearchSelector`.
   - Adição do botão de exclusão de transação (com tooltip e diálogo de confirmação).
   - Estilização aprimorada do botão de regra: detecta se a transação corresponde a uma regra cadastrada para exibir "Editar Regra" com ícone de lápis/ajuste, ou "Criar Regra" se for nova.
   - Ocultação automática de `isPotentialDuplicate` do fluxo "A Tratar".

4. **Criação da Tabela / Visão de Contabilizadas**:
   - Componente ou aba dedicada para exibir os lançamentos já contabilizados do período pertencentes àquela conta.
   - Checkboxes e botão "Desfazer Contabilização Selecionadas".

5. **Ajustes na Página `RevisaoExtrato.tsx`**:
   - Abas superiores de alternância entre "A Tratar" e "Contabilizadas".
   - Botão no cabeçalho: "Desfazer Contabilização do Período".
   - Mensagem central elegante para o estado de "Nenhum lançamento a tratar / Tudo conciliado".
   - Atualização do botão no rodapé para contabilizar apenas as transações marcadas pelo checkbox.
   - Corrigir `handleSaveRule` para não zerar as descrições ou seleções já informadas em outras linhas.

6. **Validação & Testes**:
   - Executar `compile_applet` e `lint_applet` para garantir 0 erros de compilação e TypeScript estrito.
   - Verificar fluxos ponta a ponta (edição sem perda, filtros de operação, reversão de contabilização e persistência).
