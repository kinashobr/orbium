# Três Regimes de DRE e Vinculação de Indicadores

Implementação da alternância entre **DRE Regime de Caixa**, **DRE Regime de Competência** e **DRE Orçado** diretamente na linha de cabeçalho do card isolado da Demonstração do Resultado (DRE) na tela de Análise (`/relatorios`). Por padrão, a visualização e os indicadores iniciarão vinculados ao **Regime de Competência**.

---

### Decisões Confirmadas e Parâmetros

> [!IMPORTANT]
> **Decisão do Usuário**: Os indicadores financeiros do topo e da aba DRE serão **vinculados ao tipo de DRE selecionado**, iniciando **por padrão no Regime de Competência**.
> **Isolamento de UI**: A alternância de modos fica contida de forma elegante e limpa diretamente na linha superior de descrição do card da DRE (`DREStatement`), sem poluir o restante da interface.

- **Modo Padrão Inicial**: `competencia` (Regime de Competência).
- **Três Regimes Suportados**:
  1. **Regime de Caixa**: Desembolso financeiro real (data da liquidação/pagamento das transações).
  2. **Regime de Competência**: Fato gerador/data de origem da obrigação (data da compra do cartão, data de emissão/origem da obrigação, apropriação proporcional e receitas contratadas).
  3. **Orçado (Planejado)**: Orçamento planejado de despesas mensais (`expenseSnapshots` e `billsTracker`) confrontado com a receita prevista (`revenueForecasts`, salários/holerites da tela Recebimentos e parcelas de contratos de recebíveis).

---

## 1. Visão Geral e Conceito

O módulo de DRE na tela de Análise passará a oferecer uma visão contábil e gerencial completa em 3 perspectivas fundamentais para tomada de decisão patrimonial:
1. **Caixa (Liquidez Real)**: Avalia a saúde do saldo e a capacidade de honrar desembolsos no período.
2. **Competência (Resultado Econômico)**: Avalia se o patrimônio gerou lucro ou prejuízo econômico real de acordo com as obrigações contraídas no período, independente do momento em que foram ou serão pagas.
3. **Orçado (Planejamento vs. Meta)**: Confronta as projeções de receitas originadas na tela de Recebimentos e contratos com o orçamento teto e compromissos fixados.

```
┌────────────────────────────────────────────────────────────────────────┐
│ CARD DRE (Isolado)                                                     │
│                                                                        │
│ [Ícone] DEMONSTRAÇÃO DO RESULTADO DO PERÍODO                           │
│         Regime Ativo: [ Caixa | • Competência (Padrão) | Orçado ]      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. RECEITA OPERACIONAL ................................. R$ 14.500,00  │
│    └ Salários e Contratos Recebíveis                                   │
│ 2. DESPESAS OPERACIONAIS ............................... R$  8.200,00  │
│    └ Fixas e Variáveis (Origem da Obrigação / Faturas)                 │
│ 3. RESULTADO OPERACIONAL ............................... R$  6.300,00  │
│ 4. RESULTADO FINANCEIRO ................................ R$    450,00  │
│    └ Rendimentos - Juros de Empréstimos                                │
│ 5. RESULTADO LÍQUIDO DO PERÍODO ........................ R$  6.750,00  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Experiência do Usuário e Design Visual

1. **Cabeçalho do Card da DRE (`DREStatement`)**:
   - Substituição do subtítulo estático `(Regime de Caixa)` por um controle segmentado de alta fidelidade integrado à linha de descrição:
     - Três opções: **Caixa**, **Competência** (selecionado por padrão), **Orçado**.
     - Design minimalista, seguindo o padrão de tokens do sistema (fundo `bg-muted/40`, item ativo com destaque sutil em `bg-card text-primary shadow-xs`, fonte `text-[10px] font-black uppercase tracking-wider`).
   - Um pequeno tooltip informativo ao passar o mouse em cada modo explicando sucintamente o critério contábil:
     - *Caixa*: Real desembolso de caixa e pagamentos efetuados.
     - *Competência*: Valores na data de origem e geração da obrigação.
     - *Orçado*: Orçamento planejado e receita prevista (histórico + recebimentos).

2. **Sincronização dos Indicadores e Cards Superiores**:
   - O card principal de **Resultado Líquido do Período** (Superávit/Déficit), o badge de status e os 5 cards de indicadores (Margem Líquida, Eficiência Operacional, Custos Fixos %, Impacto Financeiro de Juros % e Ponto de Equilíbrio) recalculam instantaneamente com base nos dados do modo de DRE selecionado.
   - O indicador de referência no card exibe a etiqueta correspondente: *(Base: Competência)*, *(Base: Caixa)* ou *(Base: Orçado)*.

---

## 3. Arquitetura Técnica e Lógica de Cálculo

```
                      ┌────────────────────────────┐
                      │    FinanceContext State    │
                      │  transacoesV2, billsTracker│
                      │  cltCompetencias, snapshots│
                      └─────────────┬──────────────┘
                                    │
                                    ▼
                      ┌────────────────────────────┐
                      │     DRETab Controller      │
                      │  dreMode: 'competencia'    │
                      └─────────────┬──────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ DRE Caixa     │           │DRE Competência│           │ DRE Orçado    │
│ Desembolso na │           │ Data origem   │           │ Orçamento +   │
│ data do pgto  │           │ da obrigação  │           │ Recebimentos  │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │  Card DREStatement & KPIs   │
                     │  Indicadores recalculados   │
                     └─────────────────────────────┘
```

### Regras de Cálculo dos 3 Modos:

1. **DRE Caixa**:
   - Transações com `date` dentro do período selecionado (`range1`).
   - Receitas e despesas registradas pelo desembolso efetivo de caixa.
   - Juros extraídos das parcelas de empréstimo liquidadas no período.

2. **DRE Competência** (Padrão):
   - **Despesas com Cartão de Crédito / Compras Parceladas**:
     - Transações e despesas alocadas com base na data do fato gerador (data de realização da compra / vencimento da competência), computando custos operacionais contraídos no período.
   - **Receitas por Competência**:
     - Salários e vínculos (`cltCompetencias` correspondentes ao mês da competência, independente de recebimento no 5º dia útil do mês seguinte).
     - Recebíveis de clientes (`parcelasRecebiveis` contratadas ou com competência do mês).
     - Rendimentos de aplicações apropriados no mês.
   - **Juros e Encargos**: Apropriação do custo financeiro contratual das parcelas devidas no período.

3. **DRE Orçado**:
   - **Receitas Previstas**:
     - Salários brutos/líquidos previstos para os contratos ativos em `cltContracts`.
     - Parcelas de recebíveis programadas em `parcelasRecebiveis` para o mês.
     - Histórico e previsão manual em `revenueForecasts` para o mês em referência.
   - **Despesas Orçadas**:
     - Itens do snapshot de despesas (`expenseSnapshots` ou meta orçamentária do mês).
     - Compromissos recorrentes e despesas fixas cadastradas em `billsTracker`.
   - **Resultado Orçado**: Margem projetada entre receita prevista e orçamento teto.

---

## 4. Plano de Execução

1. **Atualizar `DREStatement.tsx`**:
   - Adicionar propriedade `activeMode` e callback `onModeChange` na interface `DREStatementProps`.
   - Inserir o seletor segmentado com as opções: `Regime de Caixa`, `Competência` (padrão) e `Orçado` na linha de título/descrição do card.
   - Estilização moderna e responsiva alinhada com o design system do Orbium.

2. **Atualizar a Lógica de Cálculo em `DRETab.tsx`**:
   - Criar estado `dreMode: 'caixa' | 'competencia' | 'orcado'`, inicializado em `'competencia'`.
   - Implementar cálculo parametrizado para cada um dos 3 regimes:
     - `calculateDRECaixa(range)`
     - `calculateDRECompetencia(range)`
     - `calculateDREOrcado(range)`
   - Computar o `dre1` e `dre2` ativos de acordo com o `dreMode`.
   - Alimentar os `indicadores` e o card de `Resultado Líquido` com os dados do regime ativo.

3. **Validação & Compilação**:
   - Executar `compile_applet` para assegurar que não haja quebras de tipos TypeScript ou regressões de interface.
   - Testar a alternância entre os 3 regimes em tempo real.
