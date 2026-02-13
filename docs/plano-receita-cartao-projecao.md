# Plano Otimizado: Despesas Futuras + Cartão de Crédito no Contas a Pagar (com reuso do app atual)

## 1) Escopo decidido
Receita fica pausada por enquanto.

Este plano cobre somente:
1. Despesas futuras
2. Cartão de crédito (incluindo multi-cartão)
3. Projeção de caixa futura centralizada em **Contas a Pagar**

---

## 2) Visão de usabilidade (princípio central)
Manter a experiência que já funciona bem hoje:
- poucos botões,
- fluxo rápido,
- robustez por trás.

Diretriz: **menos superfície de UI, mais inteligência contextual**.

---

## 3) O que já existe no app e deve ser reaproveitado (não recriar do zero)

## 3.1 Estrutura funcional já pronta
No `BillsTracker` já existem pilares fortes que devem ser mantidos:
- lista consolidada de contas (`BillsTrackerList`)
- sidebar de KPIs (`BillsSidebarKPIs`)
- navegação por mês (`currentDate`)
- fontes de contas do mês e despesas pagas externas

Isso evita reconstruir tela e reduz risco de regressão.

## 3.2 Fluxos já implementados e reutilizáveis
Já existem fluxos para:
- contas do mês (`getBillsForMonth`)
- possíveis fixas do mês (`getPotentialFixedBillsForMonth`)
- parcelas futuras/adiantáveis (`getFutureFixedBills`)
- compra parcelada (`AddPurchaseInstallmentDialog`)

Estratégia: evoluir essas funções para suportar cartão/fatura sem mudar paradigma.

## 3.3 Estado e modelagem já existentes
Já há:
- `billsTracker`
- categorias e contas movimento
- conta movimento do tipo `cartao_credito`

Logo, o plano deve expandir o domínio do tracker em vez de criar módulo paralelo.

---

## 4) Ajuste principal solicitado: simplificar ações da tela

## 4.1 Problema atual de superfície de comando
Hoje há 3 botões no topo:
- Compra Parcelada
- Gerenciar Fixas
- Adiantar Parcelas

Funciona, mas pode poluir e fragmentar decisões.

## 4.2 Proposta de UX consolidada
Substituir os 3 por:

### Botão principal único: **Gerenciar Compromissos**
Dentro dele (tabs ou seções):
1. **Fixas e Recorrentes** (antigo Gerenciar Fixas)
2. **Compras Parceladas** (antigo Compra Parcelada)
3. **Adiantamentos** (antigo Adiantar Parcelas)

Opcionalmente manter apenas um secundário rápido:
- “+ Conta Avulsa”

Resultado:
- menos ruído visual,
- usuário encontra tudo no mesmo contexto,
- sem perda de robustez.

---

## 5) Como incorporar cartão sem “encher de modal”

## 5.1 Abordagem recomendada
Não criar vários botões novos de cartão na home.
Adicionar cartão dentro do mesmo **Gerenciar Compromissos**.

Estrutura interna sugerida:
- Tab A: Fixas
- Tab B: Parceladas
- Tab C: Cartões e Faturas
- Tab D: Adiantamentos

## 5.2 Modal realmente novo (somente 1)
Criar **apenas 1 modal novo relevante**:
- `GerenciarCartoesEFaturasModal`

Esse modal cobre:
- cadastro/edição de cartão (limite, fechamento, vencimento)
- visão de fatura atual e próxima
- ação de pagamento (total/mínimo/custom)

Todo o restante continua reutilizando modais/componentes atuais.

---

## 6) Plano funcional de robustez (sem quebrar simplicidade)

## 6.1 Camada 1 — Operacional mínima (rápida)
1. Configurar cartão:
   - limite
   - fechamento
   - vencimento
   - conta de pagamento padrão
2. Registrar compras parceladas no fluxo já existente
3. Mostrar compromisso de fatura no tracker do mês de vencimento

## 6.2 Camada 2 — Caixa futuro robusto
1. Timeline diária (30/60/90) no bloco da direita
2. Alertas:
   - fatura sem cobertura
   - limite crítico
   - pagamento mínimo recorrente
3. Simulação simples:
   - total vs mínimo vs custom

## 6.3 Camada 3 — Casos avançados
1. pagamento parcial com saldo remanescente
2. estorno e recálculo de fatura
3. múltiplos cartões com estratégias distintas

---

## 7) “Maluquices” reais com cartão que o sistema precisa aguentar

## 7.1 Uso comum de alta complexidade
1. Usuário com 3-6 cartões para organizar datas.
2. Concentra compras após fechamento para “ganhar prazo”.
3. Usa cartão A para fixas e B para variáveis.
4. Mistura compras à vista e parceladas em vários ciclos.

## 7.2 Uso arriscado (mas frequente)
1. pagar mínimo em sequência por falta de caixa
2. usar quase todo limite e depender de rotação entre cartões
3. parcelar fatura e manter novas compras simultâneas
4. perder controle por ter cartão titular + adicional

## 7.3 Casos excepcionais reais
1. banco muda vencimento automaticamente
2. redução de limite sem aviso
3. estorno parcial de compra contestada
4. renegociação de saldo da fatura

---

## 8) Layout otimizado (sem poluição)

## 8.1 Tela Contas a Pagar (principal)
Header limpo:
- mês/horizonte
- botão único: **Gerenciar Compromissos**
- botão secundário opcional: “+ Conta Avulsa”

Corpo:
- coluna esquerda: KPIs e alertas
- coluna direita: lista + timeline

## 8.2 Modal Gerenciar Compromissos
Estrutura em abas:
1. Fixas
2. Parceladas
3. Cartões e Faturas
4. Adiantamentos

Cada aba reaproveita lógica já existente e inclui apenas o necessário.

## 8.3 Ações de 1 clique (manter eficiência)
- incluir/remover fixa
- antecipar parcela
- registrar pagamento de fatura
- mover vencimento de despesa avulsa

---

## 9) Exemplo prático de fluxo (como fica fácil mesmo com regra complexa)

Cenário: usuário com 2 cartões, aluguel, seguro e compras parceladas.

1. Abre Contas a Pagar.
2. Clica em **Gerenciar Compromissos**.
3. Na aba **Fixas**, confirma aluguel/seguro.
4. Na aba **Parceladas**, adiciona nova compra em 10x.
5. Na aba **Cartões e Faturas**, ajusta pagamento da fatura:
   - cartão A: total
   - cartão B: mínimo
6. Fecha modal.
7. Timeline diária mostra impacto e alerta de risco em D+18.
8. Usuário volta e adianta uma parcela para data com maior saldo.

Complexidade interna alta, interação simples e guiada.

---

## 10) Modelo de dados incremental (compatível com o que já existe)

Expandir o domínio atual sem quebrar compatibilidade:

### Reaproveitar
- `BillTracker`
- `BillSourceType`
- `PotentialFixedBill`

### Adicionar (incremental)
- `card_invoice` em `BillSourceType`
- metadados opcionais em bill:
  - `cardId`
  - `invoiceCycle`
  - `paymentMode` (`total|minimo|custom`)
  - `remainingAfterPayment`

Isso permite integrar cartão no tracker sem criar outro pipeline paralelo.

---

## 11) Roadmap prático orientado a reuso

### Fase 1 — Simplificação de UX
- Consolidar 3 botões em 1 (`Gerenciar Compromissos`)
- Unificar fluxos atuais em abas internas
- Remover redundâncias de navegação

### Fase 2 — Cartão no mesmo fluxo
- Aba Cartões e Faturas
- Cadastro de cartão (limite/fechamento/vencimento)
- Fatura como compromisso rastreável no tracker

### Fase 3 — Robustez de cenário
- pagamento parcial e saldo remanescente
- alertas avançados de limite/rotativo
- simulações no próprio modal

---

## 12) Critérios de sucesso (usabilidade + robustez)
1. Reduzir cliques médios para operações comuns.
2. Aumentar taxa de uso do gerenciador único.
3. Reduzir surpresa de fatura/vencimento.
4. Melhorar aderência projeção x realizado.
5. Manter satisfação do usuário sem sensação de tela poluída.

---

## 13) Decisões de produto para preservar a experiência atual
1. Não multiplicar modais independentes.
2. Não criar nova tela separada para cartão neste momento.
3. Priorizar evolução dos componentes existentes.
4. Tratar robustez como regra de domínio, não como excesso de UI.

---

## 14) Próxima entrega recomendada (objetiva)
1. Refatorar header de Contas a Pagar para botão único.
2. Criar `GerenciarCompromissosModal` com abas e reuso dos fluxos atuais.
3. Incluir aba Cartões e Faturas com cadastro básico + pagamento de fatura.
4. Exibir impacto direto no tracker e nos KPIs já existentes.

Assim o app evolui com consistência: mais capacidade sem perder a simplicidade que já funciona.
