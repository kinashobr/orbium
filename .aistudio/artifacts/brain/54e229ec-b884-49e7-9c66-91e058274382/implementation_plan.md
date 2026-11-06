# Adequações Contábeis da DRE (Caixa, Competência e Orçado) - Concluído

Consolidação rigorosa das regras contábeis na Demonstração do Resultado do Exercício (DRE), com segregação correta do fato gerador (Competência) vs. efetivo desembolso (Caixa com liquidação de fatura de cartão e menção de competência), atualização da projeção orçada com base no último holerite fechado e estabilização da navegação entre as 3 abas sem conflito de chaves ou duplicidade de despesas.

---

### Ajustes Realizados

1. **Regime de Caixa com Liquidação de Faturas de Cartão**:
   - As despesas do cartão de crédito deixaram de ser puxadas na data da compra e passaram a ser reconhecidas no Caixa no momento da liquidação bancária/pagamento da fatura (ou vencimento caso liquidada no período).
   - Pagamentos de fatura em contas correntes foram descontados das despesas diretas para evitar duplicidade, dando lugar à abertura analítica das despesas reais da fatura.
   - Cada despesa traz sua competência de origem formatada em destaque sutil e legível (`COMPETÊNCIA MM/AAAA`).
   - As despesas da fatura são agrupadas sob o cabeçalho da Fatura Paga do Cartão, detalhando cada categoria com sua competência e valor.

2. **DRE Orçado com Salário do Último Holerite Fechado**:
   - A projeção salarial no DRE Orçado busca o valor líquido do último holerite fechado (ou da competência alvo se já cadastrada), prevenindo a utilização de bases desatualizadas.
   - Eliminada a geração indevida de "Receita Prevista Adicional" provocada pela defasagem salarial anterior.
   - Excluídos os lançamentos totais de fatura de cartão de crédito do `billsTracker` para não duplicar com os compromissos e compras individuais.

3. **Estabilização da Navegação entre as 3 Abas**:
   - Atribuição de chaves exclusivas vinculadas ao modo ativo (`activeMode`) e identificadores únicos no `DREStatement`.
   - Adicionada chave `key={activeMode}` ao container para garantir re-renderização e remontagem sem retenção de estado residual da aba anterior.
   - Filtros de operação estritos para garantir consistência matemática dos totais fixos e variáveis.
   - Desempacotamento de subcontas no gráfico de pizza "Top Gastos por Categoria" para exibir as categorias reais de gastos em todos os regimes.
