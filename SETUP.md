# Budget App - Setup Instructions

## 📦 Installation

```bash
cd budget_app
npm install
```

## 🗄️ Database Setup (Turso)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create budget-app

# Get connection URL
turso db show budget-app

# Create auth token
turso db tokens create budget-app

# Copy .env.example to .env.local
cp .env.example .env.local

# Add your credentials to .env.local:
# TURSO_DATABASE_URL=libsql://budget-app-....turso.io
# TURSO_AUTH_TOKEN=eyJ...
```

## 🚀 Development

```bash
npm run dev
```

Aplicația va rula pe `http://localhost:5173`

În dev mode, vei fi auto-autentificat ca admin (vezi `hooks.server.ts`).

## 📋 Features to Implement

### ✅ Core (Prioritate 1)
- [ ] Auth (signup/login) cu bcrypt
- [ ] Accounts CRUD
- [ ] Categories CRUD cu default categories
- [ ] Transactions CRUD cu filtering & search
- [ ] Dashboard cu stats

### 🎯 Budgets (Prioritate 2)
- [ ] Budget creation per category
- [ ] Progress tracking (spent vs limit)
- [ ] Alerts când depășești bugetul
- [ ] Monthly/weekly/yearly periods

### 📊 Reports (Prioritate 3)
- [ ] Spending by category (pie chart)
- [ ] Income vs expenses trend (line chart)
- [ ] Monthly comparison
- [ ] Export to CSV

### 🎨 Nice to have
- [ ] Multiple currencies cu conversion
- [ ] Recurring transactions
- [ ] Receipt upload
- [ ] Multi-user support (family sharing)
- [ ] Mobile PWA optimizations
- [ ] Dark/Light/Custom themes

## 🏗️ Structura Completă

```
budget_app/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── .env.example
├── README.md
├── SETUP.md                  # Acest fișier
│
├── src/
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.server.ts       # Session handling
│   │
│   ├── lib/
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── server/
│   │   │   ├── db.ts         # Turso client + schema
│   │   │   ├── auth.ts       # Session management
│   │   │   ├── middleware.ts # requireAuth, requireRole
│   │   │   └── validation.ts # Zod schemas
│   │   │
│   │   ├── services/         # Client API wrappers
│   │   │   ├── accounts.ts
│   │   │   ├── categories.ts
│   │   │   ├── transactions.ts
│   │   │   └── budgets.ts
│   │   │
│   │   ├── stores/           # Svelte stores
│   │   │   └── auth.ts
│   │   │
│   │   └── components/       # Reusable components
│   │       ├── accounts/
│   │       ├── transactions/
│   │       └── budgets/
│   │
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte      # Landing page
│       ├── layout.css        # Global styles
│       │
│       ├── (protected)/      # Auth-required routes
│       │   ├── +layout.svelte
│       │   ├── dashboard/
│       │   ├── accounts/
│       │   ├── transactions/
│       │   ├── budgets/
│       │   └── reports/
│       │
│       ├── api/              # API endpoints
│       │   ├── auth/
│       │   ├── accounts/
│       │   ├── categories/
│       │   ├── transactions/
│       │   ├── budgets/
│       │   └── dashboard/
│       │
│       ├── login/
│       └── signup/
│
└── static/
    ├── favicon.png
    └── manifest.json         # PWA manifest
```

## 🎨 Teme (CSS Variables)

Aplicația folosește CSS variables pentru 5 teme (vezi `layout.css`):

```css
--color-primary
--color-primary-hover
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-text-primary
--color-text-secondary
--color-text-muted
--color-border
--color-success
--color-danger
--color-warning
```

## 📝 Next Steps

1. **Install packages**: `npm install`
2. **Setup Turso**: Creează database și adaugă credentials în `.env.local`
3. **Run dev**: `npm run dev`
4. **Implement auth**: Creează `/api/auth/signup` și `/api/auth/login` endpoints
5. **Add default categories**: Seed database cu categorii comune (Groceries, Rent, Salary, etc.)
6. **Build CRUD pages**: Accounts → Categories → Transactions → Budgets

## 🚢 Deploy pe Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add env vars in Vercel dashboard:
# TURSO_DATABASE_URL
# TURSO_AUTH_TOKEN
# NODE_ENV=production
```

---

**Succes cu aplicația de budgeting! 💰📊**
