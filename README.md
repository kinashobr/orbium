# 🌌 ORBIUM — Plataforma de Inteligência Financeira Pessoal

<div align="center">

![Orbium Logo](public/logo.png)

[![Status](https://img.shields.io/badge/Status-Pr%C3%A9--Alpha%20(v0.1.0)-orange?style=for-the-badge&logo=git)](https://github.com)
[![Uso](https://img.shields.io/badge/Uso-Pessoal%20N%C3%A3o%20Comercial-purple?style=for-the-badge)](https://github.com)
[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Open Finance](https://img.shields.io/badge/Open_Finance-Pluggy_API-00C49F?style=for-the-badge)](https://pluggy.ai)
[![Google Drive](https://img.shields.io/badge/Sync-Google_Drive_PKCE-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)](https://developers.google.com/drive)

<p align="center">
  <strong>Ecossistema unificado de gestão patrimonial, conciliação contábil executiva, análise de fluxo de caixa e integração bancária Open Finance automatizada.</strong>
</p>

</div>

---

> [!IMPORTANT]
> **AVISO DE VERSÃO & FINALIDADE DE USO:**
> Este software é um **produto em estágio Pré-Alpha**, desenvolvido exclusivamente para **uso pessoal e não comercial**. Ele é fornecido "no estado em que se encontra" (*as is*), sem garantias de qualquer tipo. O projeto prioriza a **soberania de dados** do usuário através de arquitetura *Local-First*, sem servidores externos de terceiros armazenando suas informações financeiras privadas.

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [O que é o Open Finance no ORBIUM?](#-o-que-é-o-open-finance-no-orbium)
  - [Integração via Pluggy API](#integração-via-pluggy-api)
  - [Dados Sincronizados](#dados-sincronizados)
  - [Modo Sandbox vs. Produção](#modo-sandbox-vs-produção)
  - [Segurança e Privacidade no Open Finance](#segurança-e-privacidade-no-open-finance)
- [Arquitetura & Módulos do Sistema](#-arquitetura--módulos-do-sistema)
  - [1. Cockpit Executivo & Dashboard](#1-cockpit-executivo--dashboard)
  - [2. Gestão de Contas, Cartões & Extratos](#2-gestão-de-contas-cartões--extratos)
  - [3. Revisão de Extrato & Conciliação Inteligente](#3-revisão-de-extrato--conciliação-inteligente)
  - [4. Bills Tracker & Linha do Tempo de Fluxo de Caixa](#4-bills-tracker--linha-do-tempo-de-fluxo-de-caixa)
  - [5. Simulador e Gestão de Empréstimos (SAC & PRICE)](#5-simulador-e-gestão-de-empréstimos-sac--price)
  - [6. Gestão Patrimonial de Veículos & FIPE](#6-gestão-patrimonial-de-veículos--fipe)
  - [7. Módulo CLT & Cálculos Trabalhistas](#7-módulo-clt--cálculos-trabalhistas)
  - [8. Relatórios Contábeis: DRE & Balanço Patrimonial](#8-relatórios-contábeis-dre--balanço-patrimonial)
  - [9. Sincronização Segura via Google Drive (Zero-Cloud Database)](#9-sincronização-segura-via-google-drive-zero-cloud-database)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Segurança & Privacidade](#-segurança--privacidade)
- [Licença MIT](#-licença-mit)

---

## 🧭 Visão Geral

O **ORBIUM** nasceu da necessidade de consolidar em um único ambiente de alto nível todas as esferas da vida financeira e patrimonial de um indivíduo, aplicando o rigor de conceitos da contabilidade gerencial (como DRE e Balanço Patrimonial) à gestão de finanças pessoais.

Diferente de planilhas dispersas ou soluções comerciais fechadas que monetizam dados do usuário ou exigem assinaturas recorrentes, o ORBIUM opera sob o paradigma **Local-First com Nuvem Pessoal**:
- **Privacidade Absoluta:** Seus dados residem no seu navegador e no seu próprio Google Drive privado.
- **Rigor Matemático:** Métricas de liquidez, margens de poupança, taxas de esforço de dívida e depreciação real de ativos.
- **Automação Bancária:** Conexão direta com instituições financeiras brasileiras regulamentadas via Open Finance.

---

## 🌐 O que é o Open Finance no ORBIUM?

O **Open Finance** (Sistema Financeiro Aberto do Banco Central do Brasil) permite que clientes compartilhem seus próprios dados financeiros entre instituições de forma padronizada, segura e com consentimento explícito.

No **ORBIUM**, o módulo de Open Finance transforma o processo maçante de digitação manual de gastos em uma esteira de dados sincronizada e auditável.

```
┌─────────────────────────────────┐
│     Instituições Financeiras    │
│  (Nubank, Itaú, Bradesco, etc.) │
└────────────────┬────────────────┘
                 │ Consentimento Seguro (OAuth Bancário)
                 ▼
┌─────────────────────────────────┐
│         PLUGGY ENGINE           │
│  (Agregador Open Finance BR)    │
└────────────────┬────────────────┘
                 │ Criptografia TLS / JSON
                 ▼
┌─────────────────────────────────┐
│       ORBIUM SERVER PROXY       │
│  (/api/pluggy/data - Node/Exp)  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       ORBIUM CLIENT (SPA)       │
│  - Extrato Conciliado           │
│  - Limites e Faturas de Cartão  │
│  - Regras de Padronização       │
│  - Atualização de Saldos        │
└─────────────────────────────────┘
```

### Integração via Pluggy API
A aplicação utiliza a infraestrutura da **Pluggy** (`https://api.pluggy.ai`), provedora credenciada para conexões de Open Finance no mercado latino-americano:
1. **Autenticação Segura via Connect Token:** O usuário autentica sua conta diretamente pelo widget da Pluggy (nunca inserindo senhas ou tokens bancários no Orbium).
2. **Proxy Backend Protegido:** Todas as chamadas para autenticação da API e consulta de dados bancários passam pela rota do servidor Express (`/api/pluggy/data`), garantindo que o `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` fiquem isolados no ambiente do servidor, sem nunca vazar para o bundle do frontend.

### Dados Sincronizados
- **Contas Correntes e Poupanças:** Saldo consolidado em tempo real, agência, conta e identificação do banco emissor.
- **Cartões de Crédito:** Fatura atual, limite total, limite disponível e data de fechamento/vencimento.
- **Transações Financeiras:** Extrato detalhado com data, valor, descrição original bancária e categoria sugerida pela inteligência da Pluggy.
- **Investimentos:** Saldos e posições em renda fixa, fundos e custódias vinculadas à instituição.

### Modo Sandbox vs. Produção
O ORBIUM foi desenhado para suportar dois ambientes de Open Finance:
| Modo | Finalidade | Credenciais |
| :--- | :--- | :--- |
| **Sandbox (Testes)** | Ambiente de testes seguro onde é possível simular conexões com bancos fictícios da Pluggy sem transações reais. Ideal para desenvolvimento, demonstrações e auditoria do código. | Disponível gratuitamente criando conta de desenvolvedor na Pluggy. |
| **Produção** | Conexão real com seus bancos (Itaú, Nubank, Inter, Bradesco, XP, etc.) utilizando suas chaves privadas de desenvolvedor da Pluggy. | Configurado via `.env` do servidor ou painel de configurações internas da aplicação. |

### Segurança e Privacidade no Open Finance
- **Sem Intermediação de Terceiros:** Não há servidores SaaS coletando seus dados. As requisições vão diretamente do seu servidor local para a API oficial da Pluggy.
- **Consentimento Revogável:** O usuário pode desconectar a qualquer momento o conector bancário (*item*) ou apagar o cache local.
- **Nenhum Dado Sensível no Código:** Nenhuma credencial de conta corrente, chave PIX pessoal ou senha de banco é jamais solicitada ou guardada pelo sistema.

---

## 🏛️ Arquitetura & Módulos do Sistema

O ORBIUM é dividido em 9 módulos especializados que conversam entre si através de um barramento de contexto unificado (`FinanceContext`):

### 1. Cockpit Executivo & Dashboard
- **Resumo Patrimonial:** Cálculo dinâmico do Patrimônio Líquido (Ativos Totais Líquidos e Bens − Passivos e Obrigações).
- **Date Orbs (Filtro Temporal Dinâmico):** Comparação visual e percentual entre dois intervalos de datas independentes para avaliar evolução patrimonial e controle de gastos.
- **Gráficos Executivos:**
  - *Evolução Financeira:* Histórico acumulado de entradas, saídas e saldo líquido.
  - *Distribuição Patrimonial:* Divisão percentual entre reservas de emergência, contas, cartões e patrimônio imobilizado.
  - *Evolução por Categoria:* Análise de quais centros de custo mais demandaram capital no período selecionado.
- **Radar de Alertas:** Notificações proativas sobre vencimento iminente de contas, parcelas de empréstimo e fatura de cartão.

### 2. Gestão de Contas, Cartões & Extratos
- Cadastro e organização de múltiplas contas (corrente, carteira, investimentos, caixinhas).
- Drag-and-drop para reordenação de contas prioritárias no carrossel (`@dnd-kit`).
- Monitor de faturas de cartão de crédito com cálculo de impacto no orçamento mensal.
- Modal universal de movimentação rápida para lançamentos manuais com suporte a recorrência e vínculo com compromissos existentes.

### 3. Revisão de Extrato & Conciliação Inteligente
- Painel para revisão detalhada antes de consolidar lançamentos no histórico definitivo.
- **Motor de Regras de Padronização:** Permite criar regras automáticas de regex/palavra-chave (ex: todo lançamento contendo "UBER" ou "POSTO" é automaticamente atribuído à categoria "Transporte" e marcado como despesa variável).
- Tabela de revisão com flags de status: pendente, conciliado, ignorado ou duplicado.

### 4. Bills Tracker & Linha do Tempo de Fluxo de Caixa
- **Despesas Recorrentes:** Assinaturas mensais, aluguéis, condomínios e contas de consumo com identificação de dia de vencimento.
- **Parcelamentos de Compras:** Acompanhamento do progresso de compras parceladas (ex: parcela 3 de 10), data final de quitação e impacto acumulado nas faturas futuras.
- **Cash Flow Timeline:** Visão cronológica em cascata mostrando exatamente quando cada compromisso irá debitar o caixa nos próximos 30, 60 e 90 dias.

### 5. Simulador e Gestão de Empréstimos (SAC & PRICE)
- Gerenciamento de contratos de crédito, financiamentos imobiliários e veiculares.
- Tabela completa de evolução de parcelas com discriminação de:
  - Saldo devedor inicial
  - Amortização do principal
  - Juros da parcela
  - Seguro e taxas administrativas
  - Saldo devedor residual
- Simulação de amortização extraordinária antecipada (redução de prazo vs. redução de parcela).

### 6. Gestão Patrimonial de Veículos & FIPE
- Cadastro de veículos (carros, motocicletas, utilitários) e imóveis.
- **Integração com a API da Tabela FIPE:** Cotação histórica automática e atualização do valor venal de mercado do veículo para compor o patrimônio.
- Controle de custos automotivos:
  - Manutenções preventivas e corretivas com registro de quilometragem (KM).
  - Controle de abastecimento e consumo médio.
  - Linha do tempo de apólice de seguro (seguradora, franquia, vigência e sinistros).
  - Obrigações fiscais (IPVA, Licenciamento, DPVAT e multas).

### 7. Módulo CLT & Cálculos Trabalhistas
- **Simulador e Editor de Holerite:** Cálculo automatizado conforme a legislação trabalhista brasileira:
  - Desconto progressivo de INSS por faixas salariais oficiais.
  - Cálculo de IRRF (Imposto de Renda Retido na Fonte) com dedução de dependentes e pensão.
  - Provisão de FGTS (8% empregador).
  - Benefícios (VT, VR/VA, Plano de Saúde, Descontos de Farmácia).
- **Módulo de Férias:** Cálculo do terço constitucional (1/3), abono pecuniário (venda de dias) e antecipação de 1ª parcela do 13º salário.
- **Simulador de Rescisão Contratual:** Cálculo de aviso prévio (trabalhado ou indenizado), multa rescisória do FGTS (40%), saldo de salário e férias/13º proporcionais.

### 8. Relatórios Contábeis: DRE & Balanço Patrimonial
- **DRE Gerencial (Demonstração do Resultado do Exercício):**
  - Receita Bruta Total
  - (-) Deduções e Custos Diretos
  - (=) Margem de Contribuição
  - (-) Despesas Fixas Operacionais
  - (-) Despesas Financeiras e Juros
  - (=) Resultado Líquido do Período (Lucro/Prejuízo Pessoal)
- **Balanço Patrimonial Pessoal:**
  - *Ativo Circulante:* Caixa, bancos, investimentos com liquidez imediata.
  - *Ativo Não Circulante:* Imobilizado (veículos FIPE, imóveis, bens duráveis).
  - *Passivo Circulante:* Faturas abertas, contas do mês a pagar.
  - *Passivo Não Circulante:* Saldo devedor de financiamentos de longo prazo.
  - *Patrimônio Líquido:* Capital acumulado e reservas.
- **Indicadores Gerenciais:** Índice de Liquidez Corrente, Grau de Endividamento, Taxa de Poupança (*Savings Rate*) e Margem Operacional.

### 9. Sincronização Segura via Google Drive (Zero-Cloud Database)
- Implementação de backup em nuvem sem intermediários utilizando a API oficial do Google Drive.
- Autenticação cliente via fluxo **OAuth 2.0 com PKCE** (Proof Key for Code Exchange).
- Os backups são arquivos JSON formatados e versionados, gravados exclusivamente na pasta de aplicativo ou diretório selecionado no Google Drive do usuário.

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) | Interface reativa, modular e fortemente tipada |
| **Build & Bundler** | [Vite 5](https://vitejs.dev/) com SWC | Hot Module Replacement veloz e compilação otimizada |
| **Design System & UI** | [Tailwind CSS 3](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) | Componentes acessíveis, responsivos e consistentes |
| **Componentes Shadcn** | [shadcn/ui](https://ui.shadcn.com/) | Primitivas customizadas de alta fidelidade visual |
| **Visualização de Dados** | [Recharts](https://recharts.org/) | Gráficos dinâmicos de área, barras, pizza e sparklines |
| **Arrastar e Soltar** | [@dnd-kit/core](https://dndkit.com/) | Drag-and-drop fluido para reorganização de cartões |
| **Backend / BFF** | [Express 5](https://expressjs.com/) (Node.js) | Proxy de autenticação Google e Open Finance Pluggy |
| **Open Finance API** | [Pluggy API](https://docs.pluggy.ai/) | Agregação bancária e extratos financeiros |
| **Consulta FIPE** | BrasilAPI / Fipe API | Cotação oficial de veículos automotores |
| **Autenticação Cloud** | Google OAuth 2.0 (PKCE) | Backup e restauração soberana no Google Drive |

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- **Node.js**: Versão `18.x` ou superior (recomendado `20+`).
- **NPM** ou gerenciador de pacotes compatível (`pnpm` ou `yarn`).

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/orbium-finance.git
cd orbium-finance
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais (veja a seção seguinte).

### 4. Executar em Modo de Desenvolvimento
O comando a seguir inicializa o servidor Node Express com o middleware Vite integrado na porta `3000`:
```bash
npm run dev
```

Abra o navegador e acesse:
```
http://localhost:3000
```

### 5. Compilação para Produção (Build)
Para gerar a versão otimizada de produção:
```bash
npm run build
npm start
```

---

## 🔑 Variáveis de Ambiente

As variáveis necessárias no arquivo `.env` são:

```env
# Google OAuth (Para Sincronização via Google Drive Pessoal)
GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-google-client-secret
VITE_GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com

# Pluggy Open Finance API (Obtidas no dashboard da Pluggy)
PLUGGY_CLIENT_ID=seu-pluggy-client-id
PLUGGY_CLIENT_SECRET=seu-pluggy-client-secret
```

> [!TIP]
> Caso você ainda não possua credenciais da Pluggy ou do Google Drive, o aplicativo funcionará perfeitamente em modo **Off-line / Local Storage**, permitindo exportação manual de backups e simulação de dados via Sandbox.

---

## 📂 Estrutura de Pastas

```text
├── api/                        # Rotas e adaptadores de integração (Pluggy, OAuth)
│   ├── auth/google.ts          # Proxy de troca de tokens Google OAuth
│   └── pluggy/data.ts          # Camada de comunicação com a Pluggy Open Finance
├── public/                     # Ativos públicos estáticos (logos, ícones, manifest)
├── server.ts                   # Servidor Express (BFF com Vite integrado)
├── src/
│   ├── components/             # Componentes modulares de interface
│   │   ├── bills/              # Módulo Contas a Pagar, Cartões e Parcelamentos
│   │   ├── clt/                # Editor de Holerite, Cálculos CLT e Rescisão
│   │   ├── dashboard/          # Cards de Saldo, Gráficos de Evolução e Alertas
│   │   ├── layout/             # Sidebar, Navbar e Sincronizador Google Drive
│   │   ├── loans/              # Simulador e Tabelas de Amortização de Empréstimos
│   │   ├── reports/            # DRE, Balanço Patrimonial e Indicadores
│   │   ├── transactions/       # Gestão de Contas, Extratos e Conciliação
│   │   ├── ui/                 # Componentes de Design System (Radix/Shadcn)
│   │   └── vehicles/           # Veículos, Custos, Seguro e Tabela FIPE
│   ├── contexts/               # Gerenciamento de Estado Global (FinanceContext, ThemeContext)
│   ├── hooks/                  # Custom Hooks (Google Drive, Mobile, Breakpoints)
│   ├── lib/                    # Helpers, cálculos matemáticos e adaptadores de dados
│   ├── pages/                  # Visualizações e Rotas Principais
│   ├── types/                  # Definições estritas de TypeScript
│   ├── App.tsx                 # Roteador central da aplicação
│   └── main.tsx                # Ponto de entrada do React
├── .env.example                # Exemplo de configuração de ambiente
├── LICENSE                     # Licença MIT
└── README.md                   # Esta documentação
```

---

## 🔒 Segurança & Privacidade

1. **Arquitetura Soberana (Local-First):**
   Todos os dados de lançamentos, orçamentos, veículos e contratos ficam salvos no `localStorage` do seu navegador. Não há banco de dados centralizado em servidores de terceiros.
2. **Sem Telemetria ou Rastreadores:**
   O ORBIUM não contém ferramentas de rastreamento comercial, telemetria invasiva ou scripts de terceiros de publicidade.
3. **Backup Criptografado no Google Drive:**
   Quando a sincronização está ativada, os dados viajam diretamente entre o seu navegador e a sua pasta pessoal no Google Drive através de canais criptografados HTTPS/TLS via token OAuth de escopo restrito (`drive.file`).
4. **Isolamento de Credenciais Financeiras:**
   Senhas e credenciais bancárias nunca são manipuladas pelo código do Orbium. A autenticação com bancos ocorre exclusivamente dentro do ambiente seguro certificado pela Pluggy e pelo Banco Central.

---

## 📄 Licença MIT

Este projeto é disponibilizado sob os termos da **Licença MIT**.

```text
MIT License

Copyright (c) 2026 Gabriel Schimtez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">
  <sub>Construído com rigor matemático e compromisso com a privacidade financeira pessoal.</sub>
</div>