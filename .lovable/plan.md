
## Plano de Correções e Melhorias — Auditoria Orbium

Este plano aborda as inconsistências identificadas na auditoria técnica, organizadas por prioridade.

---

## 1) ✅ Unificar "Taxa de Economia / Taxa de Poupança"
**Status: CONCLUÍDO | Impacto: Alto | Arquivos: 3**

### Alterações Realizadas
- **KPISidebar.tsx** — Label alterada de "Taxa de Economia" para "Taxa de Poupança"
- **DRETab.tsx** — "Taxa de Sobra" alterada para "Taxa de Poupança", card duplicado "Taxa de Economia" removido
- **IndicadoresTab.tsx** — Label alterada de "Taxa de Economia" para "Taxa de Poupança"
- **DRETab.tsx** — "Lucro Operacional" alterado para "Superávit Mensal"

---

## 2) ✅ Corrigir Valor Hardcoded de Manutenção
**Status: CONCLUÍDO | Impacto: Médio | Arquivo: 1**

### Alterações Realizadas
- **Veiculos.tsx** — Criado componente `CustoMedioVeiculos` que calcula dinamicamente o custo mensal médio a partir de transações de categorias relacionadas a veículos (Combustível, Manutenção, IPVA, etc.) nos últimos 6 meses

---

## 3) ✅ Ajustar Label do Motor de Análise (Empréstimos)
**Status: CONCLUÍDO | Impacto: Médio | Arquivo: 1**

### Alterações Realizadas
- **LoanAlerts.tsx** — statusLabel alterado de "SAUDÁVEL" para "OPORTUNIDADE"
- Tipo de alerta alterado de `success` para `info`

---

## 4) ✅ Remover Placeholders "Premium Account"
**Status: CONCLUÍDO | Impacto: Baixo | Arquivo: 1**

### Alterações Realizadas
- **Index.tsx** — "Visão Premium" alterado para "Visão Consolidada"
- **Index.tsx** — Badge "Premium Account" removido

---

## 5) ✅ Padronizar Terminologia Financeira (DRE)
**Status: CONCLUÍDO | Impacto: Baixo | Arquivo: 1**

### Alterações Realizadas
- **DRETab.tsx** — "Lucro Operacional" alterado para "Superávit Mensal"

---

## 6) Corrigir Valores Hardcoded de Saúde Financeira (Opcional)
**Status: PENDENTE | Impacto: Baixo | Arquivo: 1**

### Problema
Em `Index.tsx`, os valores de `diversificacao` e `estabilidade` estão fixos.

### Solução Futura
Implementar cálculo real baseado em:
- **Diversificação**: distribuição de ativos por tipo de conta
- **Estabilidade**: variação do fluxo de caixa mês a mês

---

## Resumo Final

| Item | Status |
|------|--------|
| Unificar Taxa de Poupança | ✅ Concluído |
| Custo Manutenção Dinâmico | ✅ Concluído |
| Label Motor Análise | ✅ Concluído |
| Remover Premium Placeholders | ✅ Concluído |
| Terminologia DRE | ✅ Concluído |
| Saúde Financeira Dinâmica | ⏳ Pendente (opcional) |
