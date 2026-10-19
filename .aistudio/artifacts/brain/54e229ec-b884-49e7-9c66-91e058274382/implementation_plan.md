# Ajuste no Open Finance & Motor de Cartão de Crédito e Compromissos

Ajuste do fluxo de Open Finance para persistência local dos dados sincronizados (evitando requisições desnecessárias à API ao navegar entre telas), correção contábil de pagamentos de fatura ("Pagamento recebido" como receita/crédito positivo) e inteligência na detecção de compras parceladas no cartão de crédito integradas ao Gerenciar Compromissos, prevenindo duplicações e lançamentos indevidos de parcelas futuras no extrato.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário na Fase 1:**
> - **Compras parceladas detectadas no cartão:** Exibir aviso ou prévia modal para confirmação antes de cadastrar no *Gerenciar Compromissos*.
> - **Compras à vista (sem parcelamento):** Lançar diretamente no extrato do cartão no ciclo atual com deduplicação estrita.
> - **Parcelas futuras (ex: 4/6, 5/6, 6/6):** Ignorar no extrato atual se o compromisso já existir no *Gerenciar Compromissos*, mantendo o extrato limpo e fiel ao ciclo financeiro vigente.

- **Persistência de Dados (Item 1 do chamado):** Os dados da última sincronização (`accounts`, `transactions`, `lastSyncAt`) passam a ser salvos no `FinanceContext` e espelhados no `localStorage`. Ao sair e voltar para a página de Open Finance, a interface carrega instantaneamente o último estado obtido sem disparar chamadas de API. Novas chamadas ocorrem **exclusivamente** quando o usuário clica no botão "Sincronizar" ou "Atualizar Dados".
- **Normalização de "Pagamento recebido":** Transações contendo "Pagamento recebido", "Pagamento de fatura", "Credit card payment", "Pgto fatura" passam a ser classificadas como fluxo de entrada (`flow: 'in'`), operação `receita` (crédito no cartão que amortiza o saldo devedor), marcando automaticamente como paga a fatura correspondente no `billsTracker`.

---

### 1. Overview & Core Concept

- **O que faz:** Transforma o módulo de Open Finance em uma ferramenta rápida e econômica em chamadas de API, garantindo coerência contábil no cartão de crédito. Separa com precisão o que é despesa à vista (que entra no extrato do cartão), o que é pagamento de fatura (entrada de crédito) e o que são compras parceladas (que alimentam o *Gerenciar Compromissos* e só vencem mês a mês nas faturas corretas).
- **Público-alvo:** Usuários que conectam suas contas bancárias via Pluggy e precisam de controle orçamentário sem duplicidade entre extrato e faturas futuras.
- **Valor agregado:** Redução de consumo de quota da API Pluggy, eliminação de distorções no saldo do cartão e automação do cadastro de crediários/parcelamentos com aprovação em 1 clique.

---

### 2. User Experience & Visual Design

#### Fluxos Principais do Usuário
1. **Navegação Fluida (Zero Overhead de API):**
   - Ao acessar **Open Finance**, os cartões de saldo e lista de transações são renderizados imediatamente com os dados da última sincronização.
   - Indicador sutil de timestamp: *"Última atualização: 19/10/2026 às 14:30"*.
   - Apenas o clique intencional em **"Sincronizar"** ativa o spinner e consome a API.
2. **Identificação e Tratamento de Pagamentos:**
   - Transações como *"Pagamento recebido - R$ 460,21"* aparecem com valor verde positivo (`+ R$ 460,21`), ícone de quitação e badge descritivo *"Pagamento de Fatura"*.
3. **Prévia de Compras Parceladas Identificadas:**
   - Durante a sincronização, o motor identifica padrões de parcelamento (ex: `On Fitness 1/6`, `Mapfre*Pcl11de12`).
   - Se for uma compra parcelada nova ainda não registrada, surge um diálogo elegante:
     - **Título:** *"Novas Compras Parceladas Detectadas"*
     - **Card de Resumo:** Estabelecimento, valor da parcela, quantidade de parcelas (ex: 6x de R$ 129,90 = R$ 779,40), data inicial e conta de cartão.
     - **Ação:** Botão *"Cadastrar no Gerenciar Compromissos"* ou *"Lançar apenas parcela do mês"*.
4. **Extrato Limpo:**
   - Parcelas com vencimento em meses futuros não poluem as transações vigentes do cartão nem distorcem o limite/saldo do ciclo.

#### Identidade Visual & Tipografia
- Alinhado com o design system do Orbium:
  - Fundo neutro limpo (`bg-background` / `bg-surface-light` e `dark:bg-surface-dark`).
  - Cores semânticas rígidas: Despesas em vermelho destrutivo, entradas e quitações em esmeralda (`#10b981`), cartões em roxo/índigo.
  - Tipografia numérica estritamente tabular (`font-mono tabular-nums`).
  - Ausência de "pills" estáticas supérfluas, priorizando tipografia limpa com separadores sutis.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Persistência Local dos Dados da Pluggy (`ORBIUM_PLUGGY_LAST_PAYLOAD`)**
  - *Abordagem:* Salvar o `PluggySyncPayload` completo no `localStorage` sob a chave `ORBIUM_PLUGGY_LAST_PAYLOAD`, carregando-o no estado inicial do `FinanceContext`.
  - *Por que:* Elimina requisições automáticas no `useEffect` de montagem. O usuário pode alternar entre abas (Dashboard, DRE, Contas a Pagar, Open Finance) livremente sem perder os dados da tela e sem consumir requisições desnecessárias.
- **Decisão 2: Regex Universal para Detecção de Parcelamento**
  - *Abordagem:* Suportar múltiplos formatos bancários brasileiros:
    1. `(\d+)\s*\/\s*(\d+)` $\rightarrow$ *"On Fitness 3/6"*
    2. `(?:pcl|parcela)\s*(\d+)\s*(?:de|\/)\s*(\d+)` $\rightarrow$ *"Mapfre*Pcl11de12"*
    3. `(\d+)\s*de\s*(\d+)` $\rightarrow$ *"Compra 2 de 5"*
  - *Por que:* Bancos emissores (Itaú, Nubank, Bradesco, Santander, Inter) utilizam nomenclaturas distintas na fatura do cartão.
- **Decisão 3: Verificação de Existência Prévia no `billsTracker`**
  - *Abordagem:* Antes de sugerir um novo compromisso ou lançar uma transação, o sistema faz match no `billsTracker` pelo nome base normalizado e conta de cartão. Se o compromisso já existir, parcelas futuras são suprimidas do extrato de transações imediatas para não duplicar valores já previstos na fatura.
- **Decisão 4: Normalização Contábil de "Pagamento recebido"**
  - *Abordagem:* Expandir o detector de pagamento de cartão (`isCardPayment`) para incluir termos como `pagamento recebido`, `pgto recebido`, `pagamento efetuado`, invertendo o sinal contábil para entrada no cartão (`flow: 'in'`, `operationType: 'receita'`).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OPEN FINANCE SYNC ENGINE                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Sincronizar (On Demand)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PLUGGY API PROXY (/api/pluggy/data)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Retorna Accounts & Transactions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PARSER & CLASSIFICADOR                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. É Conta Corrente?                                                  │
│    └── Gera ImportedStatement pendente para conferência                │
│                                                                        │
│ 2. É Cartão de Crédito?                                                │
│    ├── A. "Pagamento recebido"?                                        │
│    │      └── Classifica como flow: 'in' (+ Crédito na fatura)         │
│    │                                                                   │
│    ├── B. Compra Parcelada (ex: 3/6 ou Pcl11de12)?                     │
│    │      ├── Se compromisso JÁ existe no billsTracker:                │
│    │      │   └── Se for parcela futura: IGNORA (já previsto)          │
│    │      │   └── Se for parcela atual: concilia com a fatura          │
│    │      └── Se compromisso NÃO existe:                               │
│    │          └── Abre Diálogo de Confirmação para cadastrar           │
│    │              em Compras Parceladas (Gerenciar Compromissos)       │
│    │                                                                   │
│    └── C. Compra à Vista (Single)?                                     │
│           └── Lança direto em transacoesV2 (com deduplicação estrita)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  CACHE PERSISTENTE (FinanceContext)                    │
│   • pluggyLastPayload em localStorage                                  │
│   • Navegação entre telas restaura instantaneamente sem novas chamadas │
└────────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Dados e Estados Atualizados
- **`pluggyLastPayload`:** Armazena `{ accounts: PluggyAccount[], transactions: Record<string, PluggyTransaction[]>, lastSyncAt: string }` no contexto e em `localStorage`.
- **`PendingInstallmentPurchase`:**
  ```typescript
  interface PendingInstallmentPurchase {
    tempId: string;
    description: string;
    cleanMerchantName: string;
    currentInstallment: number;
    totalInstallments: number;
    installmentAmount: number;
    totalAmount: number;
    firstDueDate: string;
    accountId: string;
    rawTransaction: PluggyTransaction;
  }
  ```
- **Modal de Confirmação (`InstallmentReviewDialog`):**
  Componente que exibe a lista de compras parceladas recém-descobertas antes de cadastrá-las no `billsTracker` via `addPurchaseInstallments`.

---

### 5. Plano de Execução Detalhado

1. **`src/types/pluggy.ts` & `src/types/finance.ts`:**
   - Adicionar tipagem para `PendingInstallmentPurchase` e cache `PluggyCachedData`.
2. **`src/lib/pluggyAdapter.ts`:**
   - Expandir `isCardPayment` para cobrir `"pagamento recebido"`, `"pgto recebido"`, etc.
   - Criar funções de extração de parcelamento: `detectInstallmentPattern(description: string)`.
   - Criar filtro inteligente para classificar transações de cartão entre compras à vista, pagamentos e parcelas a serem revisadas/ignoradas.
3. **`src/contexts/FinanceContext.tsx`:**
   - Adicionar `pluggyLastPayload` ao estado e persistência no `localStorage`.
   - Atualizar `syncPluggyData` para não lançar parcelas futuras se o compromisso já estiver registrado no `billsTracker`.
   - Retornar compras parceladas pendentes detectadas no resultado da sincronização.
4. **`src/pages/OpenFinanceSettings.tsx`:**
   - Inicializar `data` diretamente a partir do `pluggyLastPayload` do `FinanceContext`.
   - Adicionar o modal/alerta de confirmação para compras parceladas detectadas.
   - Corrigir a exibição das transações para refletir pagamentos com valor positivo e verde.
5. **Validação & Testes:**
   - Testar o fluxo de sair e voltar da tela de Open Finance sem perder os dados.
   - Testar o comportamento das transações listadas pelo usuário (On Fitness 1/6 a 6/6, Mapfre, Pagamento recebido).
   - Executar `compile_applet` e `lint_applet`.
