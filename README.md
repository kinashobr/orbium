<div align="center">
  <img src="public/logo.png" alt="ORBIUM Logo" width="76" height="76" />
  <h1>ORBIUM</h1>
  <p><strong>Plataforma pessoal de gestão financeira, contábil e patrimonial.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18-149eca?style=flat-square&logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 5" />
    <img src="https://img.shields.io/badge/Express-5-222222?style=flat-square&logo=express&logoColor=white" alt="Express 5" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Licen%C3%A7a-MIT-c86a22?style=flat-square" alt="Licença MIT" />
  </p>
</div>

---

## Visão Geral

O **ORBIUM** gerencia finanças pessoais em um painel web (com suporte a PWA ). O projeto aplica fundamentos básicos de contabilidade gerencial — como DRE, Balanço Patrimonial e conciliação de extratos — ao controle financeiro pessoal.

> **Status:** em desenvolvimento (pré-alpha).  
> Projeto pessoal. Não deve ser utilizado como única fonte para decisões financeiras, fiscais ou trabalhistas.

---

## Módulos

| Módulo | Rota | Descrição |
| :--- | :--- | :--- |
| **Visão Geral** | `/` | Saldos consolidados, indicador dinâmico de saúde orçamentária, despesas a vencer e evolução financeira. |
| **Movimentação** | `/receitas-despesas` | Lançamentos de receitas, despesas, transferências, categorias, regras de padronização e cartões de crédito. |
| **Revisão de Extrato** | `/revisao-extrato` | Importação de arquivos OFX/CSV, conciliação e revisão de transações contabilizadas. |
| **Contas a Pagar** | `/contas-pagar` | Compromissos fixos, despesas recorrentes, parcelamentos, faturas e fluxo de caixa. |
| **Recebimentos & CLT** | `/recebimentos` | Controle de recebíveis de clientes e módulo trabalhista (holerites, férias e rescisões). |
| **Financiamentos** | `/emprestimos` | Gestão de contratos, parcelas, amortizações, alertas e simulador. |
| **Investimentos** | `/investimentos` | Registro e acompanhamento de posições e evolução de carteira. |
| **Bens & Patrimônio** | `/veiculos` | Gestão de veículos (com consulta à Tabela FIPE), imóveis, terrenos, seguros e obrigações. |
| **Análise & Relatórios** | `/relatorios` | DRE gerencial, Balanço Patrimonial e indicadores financeiros personalizáveis. |
| **Open Finance** | `/open-finance` | Integração bancária via Pluggy API para sincronização de contas e transações. |

---

## Stack Tecnológica

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI (shadcn/ui), Recharts, Motion
- **Backend / Proxy:** Node.js, Express 5 (`tsx` em desenvolvimento, `esbuild` para produção)
- **Integrações:** Pluggy API (Open Finance), Google OAuth 2.0 / Google Drive API (backup em nuvem), FIPE API
- **PWA & Deploy:** `vite-plugin-pwa`, suporte a Vercel (`api/` + `vercel.json`) ou servidor Node (`server.ts`)

---

## Como Executar Localmente

### Pré-requisitos

- **Node.js** 20 ou superior
- **npm**

### Instalação e Execução

```bash
git clone https://github.com/kinashobr/orbium.git
cd orbium
npm install
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

### Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor Express + Vite em modo de desenvolvimento (`tsx server.ts`). |
| `npm run build` | Gera o build de produção do frontend (`dist/`) e o bundle do servidor (`dist/server.cjs`). |
| `npm run start` | Executa o servidor Node em produção (`node server.ts`). |
| `npm run preview` | Pré-visualiza o build estático gerado pelo Vite. |
| `npm run lint` | Executa a verificação estática com ESLint. |

---

## Variáveis de Ambiente

Copie o arquivo de exemplo antes de iniciar:

```bash
cp .env.example .env
```

Preencha apenas as credenciais das integrações que desejar habilitar:

| Variável | Integração | Obrigatória | Uso |
| :--- | :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Google Drive | Opcional | Troca de tokens OAuth no proxy `/api/auth/google` |
| `GOOGLE_CLIENT_SECRET` | Google Drive | Opcional | Segredo do cliente OAuth no servidor |
| `VITE_GOOGLE_CLIENT_ID` | Google Drive | Opcional | Client ID exposto ao fluxo PKCE no navegador |
| `PLUGGY_CLIENT_ID` | Pluggy (Open Finance) | Opcional | Autenticação com a API Pluggy via `/api/pluggy/data` |
| `PLUGGY_CLIENT_SECRET` | Pluggy (Open Finance) | Opcional | Segredo da API Pluggy no servidor |

> As credenciais da Pluggy também podem ser testadas/informadas diretamente pela interface de configuração de Open Finance quando aplicável.

---

## Estrutura do Projeto

```text
.
├── api/                  # Funções serverless (Google Auth proxy e Pluggy API)
├── public/               # Ícones, manifest PWA e ativos estáticos
├── src/
│   ├── components/       # Componentes por domínio (bills, clt, dashboard, loans, reports, vehicles, ui)
│   ├── contexts/         # Estado financeiro global (FinanceContext) e temas (ThemeContext)
│   ├── hooks/            # Hooks customizados (Google Drive, cores de gráficos, mobile)
│   ├── lib/              # Cálculos financeiros/CLT, adaptadores, validadores e utilitários
│   ├── pages/            # Páginas e rotas da aplicação
│   ├── services/         # Integrações externas (ex.: FIPE)
│   └── types/            # Tipagens TypeScript (finanças, CLT, Pluggy)
└── server.ts             # Servidor Express unificado (dev middleware + rotas /api/* + SPA fallback)
```

---

## Dados e Privacidade

- Os dados financeiros são armazenados localmente no navegador (`localStorage`), com opção de exportação/importação manual em JSON.
- O backup em nuvem via Google Drive e a sincronização bancária via Pluggy são opcionais e compartilham exclusivamente os dados necessários para o funcionamento dessas integrações.
- Nunca versione arquivos `.env`, chaves de API ou tokens de acesso.

---

## Licença

Distribuído sob a licença [MIT](LICENSE).
