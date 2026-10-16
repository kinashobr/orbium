# Plano de Integração Final - Open Finance (Pluggy API) no Orbium (Revisado)

Este plano detalha os passos para implementar a versão definitiva e limpa da integração com a Pluggy no Orbium, incorporando os ajustes solicitados: remoção de credenciais da tela (usando exclusivamente as variáveis de ambiente da Vercel) e padronização dos botões de atalho na Sidebar com a nomenclatura **Open Finance** e logotipo/ícone da Pluggy.

---

## 1. Escopo e Requisitos da Integração Final

1. **Remoção das Credenciais da Tela**:
   - Os inputs de `CLIENT_ID` e `CLIENT_SECRET` serão removidos da interface do usuário. A aplicação utilizará exclusivamente as variáveis de ambiente configuradas no servidor (Vercel).
2. **Nova Tela Limpa de Open Finance**:
   - Contém apenas:
     - Configuração e salvamento do `ITEM_ID`.
     - Seção de **Contas Bancárias** para linkagem com o Orbium.
     - Console limpo de logs/diagnóstico em tempo real com botão de copiar/baixar.
3. **Atalhos na Sidebar (acima de "Conectar Nuvem" em Ajustes)**:
   - Botão 1: **"Open Finance"** (com ícone/logo da Pluggy). Navega para a página de gerenciamento e linkagem.
   - Botão 2: **"Atualizar Dados Open Finance"** (com ícone de atualização/Pluggy). Dispara imediatamente a sincronização e atualização dos dados bancários sob demanda.
4. **Comportamento Diferenciado por Tipo de Conta**:
   - **Contas Correntes**: As transações obtidas via API são convertidas para o formato padrão do Orbium e inseridas automaticamente como um extrato pendente na tela de **Importar Extratos** convencional, para validação manual do usuário.
   - **Cartões de Crédito**: As transações do cartão de crédito são **lançadas automaticamente** na conta de cartão correspondente no sistema.
   - **Proteção contra Duplicidade**: O motor de salvamento automático das transações de cartão utilizará chave de unicidade composta (`fitId` / ID da transação na Pluggy + Data + Valor + Descrição) para garantir que nunca ocorram lançamentos duplicados em cliques repetidos no botão de atualizar.

---

## 2. Passos de Implementação

### Passo 1: Atualização do Contexto e Motor de Sincronização (`src/contexts/FinanceContext.tsx`)
- Implementar a lógica de sincronização disparada pelo botão da Sidebar ou da tela de Open Finance, utilizando as credenciais seguras do servidor.
- Implementar o lançamento automático das transações de cartão de crédito nas contas de cartão correspondentes com verificação estrita de duplicidade (`fitId` / ID único).

### Passo 2: Criação da Nova Página Limpa (`src/pages/OpenFinanceSettings.tsx`)
- Substituir a rota `/pluggy-lab` por uma interface limpa:
  - Input para salvar o `ITEM_ID`.
  - Tabela de Contas Bancárias sincronizadas com opções de linkagem.
  - Console de logs simplificado.

### Passo 3: Ajustes na Sidebar (`src/components/layout/Sidebar.tsx`)
- Inserir na seção de **Ajustes** (acima de *Conectar Nuvem*):
  - Botão **"Open Finance"** com ícone representativo da Pluggy.
  - Botão de ação rápida **"Atualizar Dados Open Finance"** para sincronização sob demanda com feedback via toast.

### Passo 4: Compilação e Validação
- Compilar o applet (`compile_applet`) e rodar o linter (`lint_applet`) para garantir build bem-sucedido.

---

## 3. Critérios de Aceitação
- [ ] Credenciais removidas da interface (uso exclusivo de variáveis do servidor).
- [ ] Atalhos na Sidebar com a nomenclatura **Open Finance** e ícone da Pluggy acima de *Conectar Nuvem*.
- [ ] Sincronização sob demanda funcionando.
- [ ] Cartões de crédito lançados automaticamente sem duplicidade.
- [ ] Contas correntes gerando extrato pendente para importação manual.
