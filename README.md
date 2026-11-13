# ORBIUM

![Orbium](public/logo.png)

**Plataforma pessoal de gestão financeira e patrimonial.**

O ORBIUM reúne receitas, despesas, contas, cartões, investimentos, dívidas e bens em um único painel. O projeto aplica conceitos de gestão financeira e contabilidade gerencial às finanças pessoais.

> **Status:** em desenvolvimento (pré-alpha).  
> Projeto experimental, fornecido “como está”. Não utilize como única fonte para decisões financeiras, fiscais ou trabalhistas.

## Funcionalidades

- **Dashboard:** visão consolidada de saldos, patrimônio e movimentações.
- **Receitas e despesas:** lançamentos, categorias, contas e transferências.
- **Extratos:** importação de arquivos OFX e CSV, revisão e conciliação.
- **Contas a pagar e receber:** compromissos, recorrências e recebimentos parcelados.
- **Cartões de crédito:** controle de ciclos, faturas e limites.
- **Empréstimos:** acompanhamento de contratos, parcelas e amortizações.
- **Investimentos:** registro e acompanhamento de posições.
- **Patrimônio:** veículos, imóveis, terrenos, seguros e custos associados.
- **Relatórios:** indicadores financeiros, DRE gerencial e visão patrimonial.
- **Gestão trabalhista:** recursos para vínculos, holerites, férias e rescisões.
- **Open Finance:** integração com a Pluggy, mediante configuração de credenciais.
- **Backup:** exportação e importação de dados, com integração ao Google Drive.

## Tecnologias

- React 18 + TypeScript
- Vite 5
- Node.js + Express 5
- Tailwind CSS
- Radix UI / shadcn
- Recharts
- Pluggy API e Google OAuth

## Executar localmente

**Requisitos:** Node.js 20 ou superior e npm.

```bash
git clone https://github.com/kinashobr/orbium.git
cd orbium
npm install
npm run dev
```

A aplicação estará disponível em:

```
http://localhost:3000
```

### Variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha as credenciais das integrações que deseja utilizar:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VITE_GOOGLE_CLIENT_ID=

PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
```

As integrações Google Drive e Pluggy dependem de credenciais próprias. Consulte a documentação dos respectivos serviços para configurá-las.

### Build

```bash
npm run build
```

## Dados e privacidade

O ORBIUM utiliza armazenamento no navegador para os dados da aplicação e oferece recursos de exportação e importação. Integrações externas, como Pluggy e Google Drive, envolvem o compartilhamento dos dados necessários com esses serviços.

Mantenha backups atualizados e não publique arquivos `.env`, tokens ou credenciais.

## Licença

Distribuído sob a licença [MIT](LICENSE).
