# Ativação Total Pass — Quiz de captação + Painel de conversão

Aplicação Next.js (App Router) para captar leads interessados nas condições de acesso ao
**TotalPass** por meio de um **serviço de intermediação**, com painel administrativo para
acompanhar o funil e a conversão.

> Serviço independente de intermediação. A taxa informada é do serviço, **não** é taxa oficial
> da TotalPass. Não há promessa de aprovação/acesso. Nenhuma marca oficial é utilizada.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** + **PostgreSQL** (Neon)
- Autenticação admin **real** (bcrypt + sessão httpOnly no servidor, bloqueio por tentativas)
- **Lucide React** (ícones)
- **Meta Pixel** e **GA4** opcionais (a app funciona sem eles)
- Deploy na **Vercel**

> Obs.: o prompt original sugeria Supabase. Reutilizamos a stack já consolidada dos outros
> projetos deste repositório (Prisma + Neon + auth própria no servidor), que entrega os mesmos
> requisitos (persistência, RLS via acesso só pelo servidor, auth real) com menos configuração
> manual. A troca para Supabase pode ser feita depois sem alterar o front.

## Fluxo do quiz

Intro → Objetivo → Acesso atual → Local de treino (+ cidade/UF) → Condições/taxa → Captura
(nome, WhatsApp, e-mail, consentimento) → Tela final com botão do WhatsApp (link `wa.me` com
mensagem pré-preenchida). Respostas são preservadas ao voltar/atualizar (localStorage).

## Eventos do funil (deduplicados por sessão)

`quiz_started` · `fee_step_reached` · `lead_submitted` · `whatsapp_clicked`
Cada sessão tem um ID aleatório (sem dado pessoal); recarregar a página não duplica eventos.

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Mínimo para rodar: `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `WHATSAPP_PHONE`,
`NEXT_PUBLIC_SITE_URL`. Pixel/GA são opcionais.

## Como rodar localmente

```bash
npm install
cp .env.example .env            # preencha os valores
npm run admin:hash -- "sua-senha-forte-12+"   # gere ADMIN_PASSWORD_HASH
npm run db:migrate:dev          # cria as tabelas (precisa do Postgres)
npm run dev
```

- Quiz: `http://localhost:3000`
- Painel: `http://localhost:3000/admin` (login com `ADMIN_EMAIL` + senha)

## Migrations

As migrations ficam em `prisma/migrations`. Em produção o `build` roda
`prisma migrate deploy` automaticamente. Para criar/alterar o schema em desenvolvimento use
`npm run db:migrate:dev`.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build:local   # build sem conectar ao banco (páginas admin são dinâmicas)
```

## Painel administrativo (`/admin`)

- Indicadores: inícios, chegada à taxa, leads, cliques no WhatsApp, conversas, ativações,
  receita confirmada, taxa lead→ativação.
- Taxas com **denominador explícito** e proteção contra divisão por zero (sessões únicas nas
  etapas do quiz).
- Filtros: hoje / 7 / 30 dias / mês / período personalizado / campanha / status.
- Tabela de leads com troca de status, confirmação de ativação **com valor recebido** (a receita
  nunca é presumida), link do WhatsApp e **exportação CSV** protegida por autenticação.
- Registro de **gasto de anúncios** → custo por lead e por ativação.

## Meta Pixel

Defina `NEXT_PUBLIC_META_PIXEL_ID`. Eventos: `PageView` (automático), `QuizStarted` (início real
do quiz), `Lead` (após envio dos dados) e `Contact` (clique no WhatsApp). **Purchase não é
disparado** no clique — a ativação paga depende de confirmação manual. Nenhum dado pessoal é
enviado em parâmetros. Verifique no Gerenciador de Eventos da Meta (Testar eventos).
