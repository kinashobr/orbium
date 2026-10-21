# Open Finance — Refinamento de Conciliação, Deduplicação e Visualização Contextual

Melhoria abrangente do módulo de Open Finance para garantir categorização com dados reais do sistema, deduplicação precisa de faturas e movimentações, segregação de experiência entre Cartão de Crédito e Conta Corrente, e foco exclusivo em valores pendentes a tratar.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Alinhadas com o Usuário:**
> - **Navegação no Extrato de Conta Corrente**: Ao clicar em "Disponibilizar Extrato", o usuário permanece na tela de Open Finance, recebendo uma notificação discreta (toast sonner) no canto inferior da tela confirmando a geração.
> - **Valores a Tratar**: Transações já lançadas no sistema (`transacoesV2`), já disponibilizadas como extrato (`importedStatements`) ou cadastradas no módulo **Gerenciar Compromissos** (`billsTracker`) serão automaticamente ocultadas da lista de trabalho sem botão de alternância, mantendo a visualização 100% limpa com foco exclusivo no que resta tratar.

---

### 1. Overview & Core Concept

- **O que faz**: Transforma a tela de Open Finance em uma esteira de conciliação inteligente e limpa, onde o usuário visualiza apenas transações pendentes de tratamento. A interface adapta-se dinamicamente ao tipo de conta selecionada:
  - **Cartão de Crédito**: Oferece categorização inline completa usando o catálogo real de categorias do sistema (`categoriasV2`), detecção inteligente de pagamentos de fatura sem duplicações, e ações de "Lançar" e "Desfazer".
  - **Conta Corrente**: Proporciona uma visualização rápida e desobstruída (Data, Histórico e Valor), ocultando controles desnecessários de categorização/lançamento direto e disponibilizando a geração direta do extrato OFX para conciliação no módulo de Revisão de Extrato.
- **Público-alvo**: Usuários que buscam conciliação bancária rápida e sem ruídos, eliminando riscos de lançamentos repetidos ou confusão entre fluxos de fatura e extrato bancário.
- **Valor Principal**: Eliminação de duplicidades, automação contextual conforme o tipo de conta e visualização focada apenas no saldo/itens a tratar.

---

### 2. User Experience & Visual Design

#### Fluxo 1: Visualização Dinâmica por Tipo de Conta
1. **Filtro "Todas as Contas" / "Cartão de Crédito"**:
   - Cabeçalho da tabela exibe: *Data / Descrição*, *Categoria* (seletor com ícones e nomes reais), *Valor*.
   - Botões de ação visíveis: **Lançar** (1 clique) e **Desfazer** (para reversão de cartão).
2. **Filtro "Conta Corrente"**:
   - Cabeçalho da tabela simplificado: *Data*, *Histórico*, *Valor*. Sem coluna de categoria.
   - Botões "Lançar" e "Desfazer" são **ocultados** para evitar confusão do usuário.
   - Botão **Disponibilizar Extrato** ganha destaque no topo da tabela ou barra de ações.
   - Ao clicar em "Disponibilizar Extrato", o extrato é gerado e adicionado à lista de extratos do sistema, disparando um toast no canto inferior da tela sem retirar o usuário da página.

#### Fluxo 2: Filtro Estrito de Valores a Tratar
- O grid analisa em tempo real:
  - Transações já lançadas em `transacoesV2` (via Pluggy, via manual ou importação OFX anterior).
  - Transações de conta corrente que já foram exportadas para `importedStatements`.
  - Transações de cartão ou débito que já constam no **Gerenciar Compromissos** (`billsTracker`).
- Se qualquer uma dessas condições for atendida, a transação é considerada **tratada** e removida da lista.
- Quando todas estiverem tratadas, exibe um empty state positivo: *"Tudo em dia! Não há valores pendentes a tratar nesta conta."*

#### Fluxo 3: Seletor de Categorias Reais do Sistema
- Substituição de referências quebradas (`cat.name`, `cat.color`) pelo padrão oficial de `Categoria` do Orbium:
  - `cat.label` (nome amigável da categoria: ex. "Alimentação", "Salário", "Transporte").
  - `cat.icon` (ícone da categoria).
  - Agrupamento ou indicação de natureza (`receita`, `despesa_fixa`, `despesa_variavel`).
  - Cobertura de todas as categorias cadastradas e editadas pelo usuário no sistema.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Segregação Funcional Cartão vs. Conta Corrente**
  - *Abordagem*: Conta corrente não categoriza no Open Finance; seu fluxo oficial no sistema é gerar extrato OFX e revisar no módulo de Revisão de Extrato (partidas dobradas). Cartão de crédito categoriza e lança direto ou agenda faturas.
  - *Por que*: Evita duplicar a lógica contábil e elimina a confusão de lançar duas vezes (uma no Open Finance e outra na importação de extrato).
- **Decisão 2: Deduplicação Rigorosa de Fatura e Verificação Cruzada**
  - *Abordagem*: Identificar pagamentos de fatura não apenas pelo ID Pluggy, mas também por impressão digital financeira: mesmo valor ($\pm 0,05$), mesma conta/cartão e data próxima ($\pm 3$ dias) em `transacoesV2` (lançamentos manuais ou via OFX) ou em compromissos de fatura no `billsTracker`.
  - *Por que*: Usuários frequentemente importam o extrato bancário onde o débito da fatura já aparece; lançar novamente via Open Finance gerava duplicidade de pagamento ("Pagamento recebido" duplicado).
- **Decisão 3: Ocultação Definitiva de Itens Tratados**
  - *Abordagem*: Não sobrecarregar a interface com botões de alternância. A lista do Open Finance é concebida como uma "caixa de entrada" com princípio de Inbox Zero.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Pluggy Open Finance API                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Sincronização
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               pluggyAdapter.ts & groupTransactionsForDisplay           │
│  - Deduplica transações brutas de entrada com mesma assinatura          │
│  - Checa se tx já existe em transacoesV2 (manual, OFX ou Pluggy)       │
│  - Checa se tx de conta corrente já está em importedStatements         │
│  - Checa se tx bate com compromissos em billsTracker                   │
│  - Filtra: mantém estritamente itens pendentes ("valores a tratar")    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [Conta Corrente Ativa]               [Cartão de Crédito Ativo]
        - Oculta botões Lançar/Desfazer      - Exibe botões Lançar e Desfazer
        - Exibe botão Disponibilizar Extrato - Exibe Select com categoriasV2
        - Tabela simplificada:               - Tabela detalhada:
          (Data, Histórico, Valor)             (Data/Descrição, Categoria, Valor)
        - Gera extrato OFX silencioso com    - Commit direto em transacoesV2
          toast inferior                       com prevenção de contrapartida
```

#### Alterações no Código:

1. **`src/lib/pluggyAdapter.ts`**:
   - Atualizar a função `groupTransactionsForDisplay` para aceitar:
     - `importedStatements`: para verificar se transações de conta corrente já foram disponibilizadas em extratos.
     - `billsTracker`: para verificar se compras parceladas ou compromissos já estão cadastrados.
     - `transacoesV2`: para verificar transações já lançadas por qualquer canal.
   - Refinar a função `isCardInvoicePayment` e o algoritmo de deduplicação na montagem da lista: se houver dois registros de pagamento de fatura idênticos vindos da API, agrupar e exibir apenas um.
   - Excluir da lista exibida qualquer transação que já tenha correspondente confirmado em `transacoesV2`, `importedStatements` ou `billsTracker`.

2. **`src/contexts/FinanceContext.tsx`**:
   - Refinar `commitPluggyTransactions` para blindar pagamentos de fatura contra duplicidades originadas de extratos OFX já importados.
   - Garantir que `generateCheckingStatementsFromPluggy` marque as transações processadas de conta corrente para que sumam imediatamente da lista de "valores a tratar" do Open Finance.
   - Ajustar o toast de sucesso ao disponibilizar extrato: exibir toast sonner na parte inferior e permanecer na tela sem forçar `navigate`.

3. **`src/pages/OpenFinanceSettings.tsx`**:
   - Detectar o tipo da conta selecionada (`isCheckingAccount` vs `isCreditCard`):
     - Se `isCheckingAccount`:
       - Ocultar botões "Lançar" e "Desfazer".
       - Exibir o botão "Disponibilizar Extrato" diretamente na barra de ações da tabela.
       - Renderizar cabeçalho da tabela com 3 colunas: Data (col-span-3), Histórico (col-span-6), Valor (col-span-3 text-right).
       - Ocultar seletor de categorias na listagem.
     - Se `isCreditCard` ou "Todas":
       - Exibir botões "Lançar" e "Desfazer".
       - Renderizar colunas completas: Data / Descrição, Categoria (com dropdown usando `categoriasV2`), Valor.
   - Corrigir o dropdown de categorias:
     - Usar `cat.label` e `cat.icon` de `categoriasV2` do `FinanceContext`.
     - Exibir o ícone oficial da categoria e o nome em texto limpo.
   - Ajustar a mensagem quando a lista estiver vazia para indicar que não há valores a tratar.
