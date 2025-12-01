# Budget App

Personal budgeting app built with **SvelteKit 5 + Turso + Tailwind 4**.

## Features

- 💳 **Multiple Accounts** - Track bank accounts, cash, credit cards
- 📊 **Categories** - Organize expenses/income with custom categories
- 💰 **Transactions** - Log, edit, and search all financial transactions
- 🎯 **Budgets** - Set monthly budgets per category
- 📈 **Reports** - Visual insights (charts, trends, spending analysis)
- 🔐 **Multi-user** - Session-based auth with role support
- 🌙 **Themes** - 5 color themes (Midnight, Ocean, Forest, Sunset, Royal)

## Tech Stack

- **SvelteKit 5** (Svelte 5 runes: `$state`, `$props`, `$effect`)
- **Turso** (Cloud SQLite database)
- **Tailwind CSS 4** (CSS variables for theming)
- **Vercel** (Hosting + serverless functions)

## Setup

```bash
npm install

# Configure Turso
turso db create budget-app
turso db tokens create budget-app

# .env.local
TURSO_DATABASE_URL=libsql://budget-app-....turso.io
TURSO_AUTH_TOKEN=eyJ...

npm run dev  # → http://localhost:5173
```

## Architecture

```
Client Components → Services → API Routes → Turso DB

src/lib/
├── server/           # Server-only code
│   ├── db.ts         # Turso client + schema
│   ├── auth.ts       # Session management
│   └── middleware.ts # requireAuth()
├── services/         # Client API wrappers
├── stores/           # Svelte stores (auth, data)
└── types.ts          # TypeScript interfaces

src/routes/
├── api/              # REST endpoints
├── (protected)/      # Auth-required pages
└── login/, signup/   # Public routes
```

## Database Schema

- **users** - User accounts with roles
- **sessions** - Auth sessions (30-day expiry)
- **accounts** - Bank accounts, cash, cards
- **categories** - Expense/income categories
- **transactions** - Financial transactions
- **budgets** - Monthly budget limits per category

## Commands

```bash
npm run dev      # Dev server
npm run check    # TypeScript + svelte-check
npm run build    # Production build
```
