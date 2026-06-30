# CreatorZ

SaaS de organização de vida para criadores de conteúdo. Reúne tarefas, hábitos, metas, finanças, diário e agenda em um único lugar, rodando 100% na edge com Cloudflare Workers.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Estilo | Tailwind CSS v4 + Shadcn/ui + Radix UI |
| Banco de dados | Cloudflare D1 (SQLite) via Drizzle ORM |
| Auth | Better Auth (email/senha) |
| Deploy | Cloudflare Workers via OpenNext |
| Cache | Cloudflare KV |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |

---

## Funcionalidades

- **Hoje** — dashboard com visão geral do dia
- **Tarefas** — criação, conclusão e organização de tarefas
- **Hábitos** — rastreamento diário com histórico
- **Metas** — metas com progresso e detalhamento
- **Finanças** — controle de transações com gráficos
- **Diário** — registro de entradas diárias
- **Daily** — nota diária estruturada
- **Agenda** — visualização de eventos
- **Check-in** — check-in diário de bem-estar
- **Perfil** — dados e preferências do usuário

---

## Pré-requisitos

- Node.js 20+
- Conta Cloudflare com Workers e D1 habilitados
- Wrangler CLI (`npm i -g wrangler`) autenticado (`wrangler login`)

---

## Setup local

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

Crie o arquivo `.dev.vars` na raiz do projeto (usado pelo `cf:dev`):

```ini
BETTER_AUTH_SECRET=uma-string-aleatoria-com-pelo-menos-32-caracteres
BETTER_AUTH_URL=http://localhost:8787
```

> Para rodar com `npm run dev` (modo Next.js puro), crie também `.env.local` com as mesmas variáveis no formato `NOME=valor`.

### 3. Aplique as migrations no banco local

```bash
npm run db:migrate:local
```

### 4. Inicie o servidor de desenvolvimento

```bash
# Desenvolvimento com Cloudflare (D1, KV, Workers — recomendado)
npm run cf:dev

# Desenvolvimento Next.js puro (sem bindings Cloudflare)
npm run dev
```

Acesse [http://localhost:8787](http://localhost:8787) (cf:dev) ou [http://localhost:3000](http://localhost:3000) (dev).

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor Next.js local (sem bindings CF) |
| `npm run cf:dev` | Servidor local com Cloudflare (D1, KV) |
| `npm run cf:preview` | Preview do build Cloudflare localmente |
| `npm run cf:build` | Build para Cloudflare Workers |
| `npm run cf:deploy` | Deploy para Cloudflare Workers |
| `npm run db:migrate:local` | Aplica migrations no D1 local |
| `npm run db:migrate:prod` | Aplica migrations no D1 de produção |
| `npm run db:types` | Gera tipos TypeScript dos bindings Wrangler |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run lint` | ESLint |
| `npm run test:finance` | Testes dos cálculos financeiros |

---

## Banco de dados

O projeto usa **Cloudflare D1** (SQLite) com Drizzle ORM. As migrations ficam em `migrations/` e são aplicadas pelo Wrangler.

```
migrations/
├── 0001_auth.sql             # Tabelas de autenticação (Better Auth)
├── 0002_app.sql              # Tarefas, hábitos, diário, agenda
├── 0003_daily_redesign.sql   # Redesign da daily note
├── 0004_finance_redesign.sql # Redesign das finanças
├── 0005_goals_redesign.sql   # Redesign das metas
└── 0006_profiles_extended.sql # Extensão do perfil do usuário
```

Para criar uma nova migration, adicione um arquivo `000N_descricao.sql` e rode `npm run db:migrate:local`.

---

## Deploy

### 1. Crie o banco D1 de produção (primeira vez)

```bash
wrangler d1 create creatorz
```

Atualize `database_id` em `wrangler.toml` com o ID retornado.

### 2. Configure o secret de produção

```bash
wrangler secret put BETTER_AUTH_SECRET
```

### 3. Aplique as migrations em produção

```bash
npm run db:migrate:prod
```

### 4. Faça o deploy

```bash
npm run cf:deploy
```

---

## Estrutura do projeto

```
creatorz/
├── app/
│   ├── (app)/          # Rotas protegidas (dashboard, módulos)
│   ├── (auth)/         # Login e cadastro
│   └── api/            # Route Handlers (REST)
├── components/
│   ├── layout/         # Sidebar, BottomNav, MobileMenu
│   ├── metas/          # Componentes de metas
│   └── ui/             # Componentes Shadcn/ui
├── lib/
│   ├── auth.ts         # Configuração do Better Auth (server-only)
│   ├── db.ts           # Helpers do D1 (server-only)
│   ├── schema.ts       # Schema Drizzle ORM
│   ├── finance.ts      # Lógica de finanças
│   └── utils.ts        # Utilitários gerais
├── migrations/         # SQL migrations do D1
├── types/              # Tipos TypeScript globais
├── wrangler.toml       # Configuração Cloudflare (D1, KV, Workers)
└── open-next.config.ts # Configuração OpenNext para Cloudflare
```

> **Importante:** `lib/auth.ts` e `lib/db.ts` são server-only. Nunca os importe em componentes client-side — use `lib/auth-client.ts` no cliente.
