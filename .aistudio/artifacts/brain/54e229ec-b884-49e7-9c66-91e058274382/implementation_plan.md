# Reconciliação Automática e Eliminação de Duplicatas na Revisão de Extrato

Ajuste do motor de conciliação bancária da tela **Revisão de Extrato** para reconhecer e conciliar automaticamente transações que já foram lançadas no sistema (`transacoesV2`), garantindo que não reapareçam indevidamente como "Pendentes" na revisão de extratos bancários importados (OFX, CSV ou Open Finance).

### Decisões Confirmadas com o Usuário

> [!IMPORTANT]
> - **Tratamento de transações já lançadas**: Ocultar da aba "Pendente" e conciliar automaticamente com os lançamentos existentes no sistema (`transacoesV2`).
> - **Tolerância de data**: Apenas mesma data exata (sem margem de dias divergentes), garantindo máxima fidelidade contábil.
> - **Compatibilização de formatos OFX vs CSV**: Normalização inteligente de separadores e caracteres especiais (ex.: `Transferência enviada pelo Pix|Nome` do CSV vs `Transferência enviada pelo Pix - Nome...` do OFX) para reconhecimento assertivo do destinatário/origem.

---

### 1. Visão Geral & Diagnóstico do Problema

#### Causa Raiz Identificada
1. **Pré-reserva bloqueante no motor de conciliação (`usedV2TxIds`)**: No arquivo `src/contexts/FinanceContext.tsx` (`getTransactionsForReview`), o sistema adicionava previamente todos os IDs de transações já contabilizadas a um conjunto de exclusão (`usedV2TxIds`). Quando um novo extrato (ou segundo arquivo como CSV) continha essas mesmas transações, o motor rejeitava a correspondência por considerá-las "já usadas", fazendo com que todas fossem tratadas como novos lançamentos "Pendentes".
2. **Divergência de formatação de descrições (OFX vs CSV)**: No Nubank CSV, o separador usado pelo banco é a barra vertical `|` sem dados de conta/CPF (ex.: `Transferência enviada pelo Pix|Manoel Batista Guimarães Neto`), enquanto no OFX é utilizado o hífen `-` com dados bancários completos. A comparação textual estrita (`includes`) falhava devido à divergência de pontuação.
3. **Persistência de status nos extratos importados (`importedStatements`)**: Transações brutas em extratos secundários permaneciam com `isContabilized: false`, fazendo com que a listagem de pendências as recarregasse a cada abertura de tela.

#### Benefício da Solução
- Eliminação imediata dos itens fantasmas na aba "Pendente" que já estão contabilizados.
- Conciliação automática transparente: o usuário visualiza apenas o que realmente precisa ser classificado ou conferido.
- Sincronização dos estados dos extratos importados para status `complete` quando todos os lançamentos estiverem conciliados.

---

### 2. Experiência do Usuário & Fluxo Visual

- **Aba Pendente Limpa**: Exibe estritamente transações inéditas que necessitam de categorização ou definição de operação (ex.: novas transferências ou despesas sem lançamento prévio).
- **Aba Contabilizadas Completa**: Continua exibindo todos os lançamentos conciliados no período selecionado, com detalhes originais preservados e opção de estorno caso o usuário necessite.
- **Feedback & Métricas no Rodapé**: Contadores em tempo real refletindo o total de pendências reais e de lançamentos contabilizados.

---

### 3. Decisões Técnicas & Trade-Offs

- **Remoção da pré-reserva cega em `usedV2TxIds`**:
  - *Abordagem*: `usedV2TxIds` é inicializado vazio a cada ciclo de avaliação de transações pendentes, servindo exclusivamente para garantir que duas transações pendentes do mesmo valor/data não consumam o mesmo candidato em `transacoesV2` (1 para 1).
  - *Benefício*: Permite que transações importadas correspondentes a lançamentos já existentes em `transacoesV2` sejam identificadas como duplicatas/já conciliadas e devidamente ocultadas da aba de pendências.
- **Normalizador de Texto Robusto**:
  - *Abordagem*: Função de normalização que remove acentos, pontuação (`|`, `-`, `/`, `.`), comprime espaços múltiplos e compara os tokens mais significativos (ex.: nome do beneficiário/pagador).
- **Auto-Sync de `importedStatements`**:
  - *Abordagem*: Ao detectar correspondência exata (mesma data, mesmo valor, mesmo fluxo e descrição compatível) com uma transação em `transacoesV2`, o registro bruto do extrato é marcado como `isContabilized: true` com vínculo ao `contabilizedTransactionId`.

---

### 4. Arquitetura Técnica & Diagrama de Dados

```
┌───────────────────────────────────────────────────────────────┐
│                      Extratos Importados                      │
│             (importedStatements: OFX / CSV / Pluggy)          │
└──────────────────────────────┬────────────────────────────────┘
                               │ rawTransactions (não contabilizadas)
                               ▼
┌───────────────────────────────────────────────────────────────┐
│              Motor: getTransactionsForReview                  │
│  1. Filtra candidatos de transacoesV2 da mesma conta          │
│  2. Match Prioritário: fitId (OFX)                            │
│  3. Match Exato: Mesma Data + Mesmo Valor + Mesmo Fluxo +     │
│     Descrição Normalizada (ignora variações | vs -)           │
│  4. Deduplicação 1 a 1: consome candidato sem pré-bloqueio    │
└──────────────────────────────┬────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    [Match Encontrado]                [Sem Correspondência]
    - isPotentialDuplicate: true      - isPotentialDuplicate: false
    - Vincula ao ID de transacoesV2   - Permanece em Pendentes
    - Ocultado da aba "Pendente"      - Exige categorização do usuário
    - Atualiza statement para OK
```

#### Mapeamento de Arquivos
1. `src/contexts/FinanceContext.tsx`:
   - Refatoração do `getTransactionsForReview` para remover a pré-reserva indevida de `usedV2TxIds`.
   - Adição da função auxiliar de normalização de descrição (`normalizeDescriptionForMatch`) para compatibilidade total entre formatos de extrato bancário.
   - Sincronização automática de `rawTransactions` em `importedStatements` para marcar registros identificados como conciliados.
2. `src/pages/RevisaoExtrato.tsx`:
   - Garantir que a filtragem de `pendingTransactions` exclua confiavelmente duplicatas potenciais e transações já contabilizadas.
