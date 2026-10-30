# Plano de Implementação: Nova Aba Ficha & Seguro (Tela Bens / Veículos)

Reformulação completa da aba **Ficha & Seguro** no detalhe do veículo (`/veiculos/:id`), implementando a nova arquitetura visual baseada na maquete com design moderno, foco em legibilidade, widgets analíticos ricos e integração direta com o contexto financeiro (`FinanceContext`).

---

## Decisões Confirmadas pelo Usuário

- **Hero Showcase**: Substituição dos cards antigos por uma Hero Stage com foto do veículo, badges de estado patrimonial, dock de métricas mecânicas/garantia e pílulas com suporte a cópia de Placa e RENAVAM ao clique (`navigator.clipboard.writeText`).
- **Foto do Veículo**: Suporte a envio de foto personalizada pelo usuário. Caso não enviada, utilizar foto buscada/gerada ou o ícone/imagem padrão do tipo de veículo.
- **Cronograma de Seguro de 12 Meses**: Fita estática e intuitiva exibindo o status de quitação das 12 parcelas da apólice (P01 a P12) calculadas com base nas parcelas do seguro salvas no contexto.
- **Widgets Analíticos**: Cálculo dinâmico dos 3 widgets (Medidor Radial do Seguro, Sparkline Bezier da FIPE e Medidor de Eficiência de Consumo) utilizando dados reais do veículo do contexto. Se houver dados faltantes, disponibilizar opção direta para informar/alocar.
- **Cofre de Documentos e Obrigações Tributárias**: Doca interativa com status de IPVA e Licenciamento (com suporte a marcar quitação/editar valores) e cofre de documentos com botões para download e adição de novos laudos/certificados.
- **Respeito ao Tema e Cores**: Preservação estrita das variáveis de tema claro/escuro do aplicativo (Tailwind CSS), sem aplicar cores estáticas desalinhadas.

---

## 1. Visão Geral & Conceito

Transformar a aba **Ficha e Seguro** da tela de detalhe de bens (`/veiculos/:id`) em um **Cockpit Patrimonial de Veículos**, unificando:
1. **Identificação & Ativos**: Placa, RENAVAM, garantia, troca de óleo e fotos do bem.
2. **Saúde Financeira da Apólice**: Indicador radial da apólice, prêmio total e cronograma de 12 parcelas.
3. **Depreciação & Consumo**: Curva FIPE com retenção de capital e medidor de consumo de combustível (km/l).
4. **Regularidade Fiscal & Documental**: Status SEFAZ/DETRAN (IPVA e Licenciamento) e cofre de documentos (CRLV-e, apólices).

---

## 2. Experiência do Usuário & Design Visual

### A. Componentes do Layout

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HERO SHOWCASE (Estágio Integrado do Veículo)                                        │
│ ┌──────────────────────────────────────────────┬────────────────────────────────────┐ │
│ │ Título, Categoria e Badges "Ativo Imob."     │ Foto do Veículo (ou upload/ícone)  │ │
│ │ Pílulas Copiáveis: Placa Mercosul & RENAVAM  │ com Brilho Radial de Fundo         │ │
│ │ Dock: IPVA Status · Próx. Óleo · Garantia      │                                    │ │
│ └──────────────────────────────────────────────┴────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ 2. WIDGETS ANALÍTICOS (Grid 3 Colunas)                                               │
│ ┌──────────────────────────┬──────────────────────────┬─────────────────────────────┐ │
│ │ WIDGET A: APÓLICE SEGURO │ WIDGET B: AVALIAÇÃO FIPE │ WIDGET C: CONSUMO & RODAGEM │ │
│ │ • Anel Radial SVG (% pago)│ • Sparkline Bezier SVG   │ • Barra Gradiente (Km/L)    │ │
│ │ • Prêmio & Parcelas     │ • Delta % & Retenção Cap.│ • Gasto em Combustível (R$) │ │
│ └──────────────────────────┴──────────────────────────┴─────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ 3. TIMELINE SEGMENTED RIBBON (Cronograma de 12 Parcelas da Apólice)                   │
│ ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Resumo: Total R$ · Liquidado R$ · Restante R$                                    │ │
│ │ Grid P01 .. P12: Badges com valor, mês e ícone de status (Quitado / Pendente)     │ │
│ └───────────────────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ 4. DOCA FAZENDÁRIA & COFRE DE DOCUMENTOS (Grid 7 cols / 5 cols)                       │
│ ┌──────────────────────────────────────────────┬────────────────────────────────────┐ │
│ │ Obrigações Tributárias SEFAZ / DETRAN        │ Cofre de Documentos Digitais        │ │
│ │ • IPVA Exercício (R$ / Quitado)              │ • CRLV-e 2026 Digital (PDF)        │ │
│ │ • Licenciamento Anual (R$ / Quitado)         │ • Apólice de Seguro (PDF)          │ │
│ │ • Ação rápida para marcar/editar             │ • Botão "Adicionar Documento"      │ │
│ └──────────────────────────────────────────────┴────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### B. Especificações de Interação & UI

- **Upload de Foto**: Clique no container da imagem do veículo abre dialog para upload de imagem local ou inserção de URL de foto.
- **Pílulas Copiáveis**: Clique na Placa ou RENAVAM copia o texto para a área de transferência com notificação *Sonner Toast* ("Placa copiada!").
- **Radial Gauge Ring SVG**: Gráfico circular SVG responsivo calculando o percentual de parcelas pagas do seguro com transição suave.
- **Sparkline Bezier SVG**: Gráfico de linha vetorial vetorial exibindo o histórico de valor FIPE do veículo com gradiente subjacente.
- **Cronograma de Parcelas**: Exibição dos 12 meses sincronizados com as parcelas salvas do seguro no `FinanceContext`.
- **Gerenciador de Documentos**: Upload de arquivos locais que ficam salvos no estado do veículo (com suporte a simulação de download de PDFs de CRLV-e e Apólice).

---

## 3. Decisões do Produto & Arquitetura de Dados

### Atualizações nas Interfaces (`src/types/finance.ts`)

1. **Campos Adicionais no Veículo (`Veiculo`)**:
   - `fotoUrl?: string;`
   - `proximaTrocaOleoData?: string;`
   - `garantiaStatus?: string;`
   - `documentos?: { id: string; nome: string; tipo: string; data: string; url?: string; fileData?: string }[];`

2. **Cálculos Dinâmicos**:
   - **Eficiência de Consumo**: Derivada do histórico de transações marcadas com `gastoTipo: 'combustivel'` no histórico do veículo. Se inexistente, sugere atalho para registrar reabastecimento.
   - **Percentual FIPE**: Variação entre `valorVeiculo` (compra) e `valorFipe` (atual).

---

## 4. Etapas de Execução

1. **Atualização do Modelo de Dados (`src/types/finance.ts`)**: Adicionar novos campos para suporte a foto, documentos e métricas mecânicas ao tipo `Veiculo`.
2. **Criação dos Novos Subcomponentes da Ficha & Seguro**:
   - `src/components/vehicles/VehicleHeroShowcase.tsx`: Estágio principal do veículo com foto, upload, atalhos de cópia e métricas.
   - `src/components/vehicles/VehicleAnalyticWidgets.tsx`: Trio de widgets (Radial Gauge Seguro, Sparkline Bezier FIPE, Barra de Consumo).
   - `src/components/vehicles/VehicleInsuranceTimeline.tsx`: Fita de 12 parcelas do seguro com indicação de liquidação.
   - `src/components/vehicles/VehicleFiscalAndDocsDock.tsx`: Doca de obrigações IPVA/Licenciamento e cofre de documentos digitais com upload/download.
3. **Integração na Tela do Veículo (`src/pages/VehicleDetailPage.tsx`)**: Substituir os componentes legados na aba `visao_geral` pela nova estrutura unificada.
4. **Testes & Compilação**: Executar `compile_applet` para validar integridade do código e ausência de erros TypeScript.
