
# Plano: Formato de Moeda, Cores "Nova Conta", Botao "Fechar" e Relatorio PDF/OFX

## 1. Valor da fatura com formato 0,000 (3 decimais)

**Causa raiz:** No `EditableCell.tsx` (linha 55), o `formatDisplay` para tipo `currency` usa:
```
Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
```
Falta `maximumFractionDigits: 2`, permitindo que valores com flutuacao de ponto flutuante exibam 3+ casas decimais.

**Arquivo:** `src/components/EditableCell.tsx` (linha 55)
- Adicionar `maximumFractionDigits: 2` ao `toLocaleString`

---

## 2. Cores apagadas no "Nova Conta"

**Causa:** No `BillsTrackerList.tsx` (linha 229), o container do formulario nova conta usa:
- `from-primary/[0.05] to-primary/[0.01]` -- opacidades muito baixas (5% e 1%)
- `border-primary/20` -- borda fraca

**Correcao:** Aumentar opacidades para valores mais visiveis e consistentes com o design system M3:
- Gradiente: `from-primary/[0.12] to-primary/[0.04]`
- Borda: `border-primary/30`
- Sombra mais presente

---

## 3. Botao "FECHAR JANELA" para "FECHAR"

**Arquivo:** `src/components/bills/BillsTrackerModal.tsx` (linha 433)
- Trocar texto de `FECHAR JANELA` para `FECHAR`

---

## 4. Relatorio impresso/PDF/OFX dos extratos

Implementar exportacao no `AccountStatementDialog.tsx`, adicionando 3 opcoes de exportacao:

### 4a. Imprimir/PDF
Usar `window.print()` com CSS `@media print` dedicado. Criar funcao que:
1. Gera uma janela de impressao com layout formatado (cabecalho com nome da conta, periodo, resumo, tabela de transacoes)
2. O navegador permite salvar como PDF nativamente

### 4b. Exportar OFX
Gerar arquivo OFX (Open Financial Exchange) a partir das transacoes filtradas. O formato OFX e texto estruturado usado por bancos. Criar funcao `generateOFX(account, transactions)` que:
1. Monta o header OFX com dados da conta
2. Lista cada transacao como `<STMTTRN>` com data, valor, descricao
3. Gera download do arquivo `.ofx`

### 4c. Exportar CSV (bonus simples)
Gerar CSV com colunas: Data, Descricao, Valor, Tipo, Categoria, Conciliado

**Arquivos:**
- `src/components/transactions/AccountStatementDialog.tsx` -- Adicionar botoes de exportacao no header e criar funcoes de geracao
- Nao precisa de dependencia externa (tudo nativo)

### Layout dos botoes de exportacao
Adicionar ao lado do botao "Conciliar Tudo" um dropdown com opcoes:
- Imprimir
- Exportar PDF
- Exportar OFX
- Exportar CSV

---

## Resumo de arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/components/EditableCell.tsx` | Adicionar `maximumFractionDigits: 2` no formatDisplay |
| `src/components/bills/BillsTrackerList.tsx` | Aumentar opacidades do gradiente/borda do "Nova Conta" |
| `src/components/bills/BillsTrackerModal.tsx` | Trocar "FECHAR JANELA" por "FECHAR" |
| `src/components/transactions/AccountStatementDialog.tsx` | Adicionar exportacao Print/PDF/OFX/CSV |

## Ordem

| # | Acao | Prioridade |
|---|------|------------|
| 1 | Corrigir formato moeda (maximumFractionDigits) | Critica |
| 2 | Texto botao "FECHAR" | Alta |
| 3 | Cores "Nova Conta" | Alta |
| 4 | Exportacao de extratos (Print/OFX/CSV) | Media |
