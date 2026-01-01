# 💰 Budget App

A personal budgeting app built with **SvelteKit 5 + SQLite (Turso) + Tailwind 4**.

Self-hosted, open source, privacy-first. Your data stays with you.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alexandruradu2002-pixel/budget_app&env=TURSO_DATABASE_URL,TURSO_AUTH_TOKEN)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 💳 **Multiple Accounts** - Track bank accounts, cash, credit cards, investments
- 📊 **Categories** - Organize expenses/income with custom categories
- 💰 **Transactions** - Log, edit, search, and filter transactions
- 🎯 **Budgets** - Set and track monthly budgets per category
- 📈 **Reports** - Visual insights (spending trends, category breakdown)
- 🌍 **Multi-Currency** - Support for RON, EUR, USD, GBP with exchange rates
- 🌙 **5 Themes** - Midnight Blue, Ocean, Forest, Sunset, Royal Purple
- 📱 **Mobile-First** - Responsive design, works offline (PWA)
- 🔐 **Self-Hosted** - Your data stays on your own database
- 📥 **YNAB Import** - Migrate from You Need A Budget

## 🚀 Quick Start

### Option 1: Deploy to Vercel (Recommended)

1. **Create a Turso database** (free):
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Sign up and create database
   turso auth signup
   turso db create budget-app
   
   # Get credentials
   turso db show budget-app --url
   turso db tokens create budget-app
   ```

2. **Deploy with one click:**
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alexandruradu2002-pixel/budget_app&env=TURSO_DATABASE_URL,TURSO_AUTH_TOKEN)

3. **Add environment variables** in Vercel dashboard:
   - `TURSO_DATABASE_URL` - Your Turso database URL
   - `TURSO_AUTH_TOKEN` - Your Turso auth token

### Option 2: Self-Host with Docker

```bash
# Clone the repository
git clone https://github.com/alexandruradu2002-pixel/budget_app.git
cd budget_app

# Create data directory
mkdir -p data

# Run with Docker Compose
docker compose up -d
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  budget-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TURSO_DATABASE_URL=file:/app/data/budget.db
      - TURSO_AUTH_TOKEN=
    volumes:
      - ./data:/app/data
```

### Option 3: Local Development

```bash
# Clone and install
git clone https://github.com/alexandruradu2002-pixel/budget_app.git
cd budget_app
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Turso credentials (or leave empty for in-memory SQLite)

# Start development server
npm run dev
```

## 📸 Demo

Try the app with sample data: [**Live Demo**](https://budget-app-demo.vercel.app/demo)

## 🗄️ Database Options

| Option | Best For | Persistence | Setup |
|--------|----------|-------------|-------|
| **Turso Cloud** | Vercel, production | ✅ Cloud-hosted | Free account at turso.tech |
| **Local SQLite** | Docker, self-host | ✅ Local file | `TURSO_DATABASE_URL=file:./data/budget.db` |
| **In-Memory** | Development | ❌ Lost on restart | Leave env vars empty |

## 🏗️ Tech Stack

- **[SvelteKit 5](https://svelte.dev/)** - Full-stack framework with Svelte 5 runes
- **[Turso](https://turso.tech/)** - Edge SQLite database (libSQL)
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS with CSS variables
- **[Vercel](https://vercel.com/)** - Serverless deployment

## 📁 Project Structure

```
src/lib/
├── server/           # Server-only: db.ts, auth.ts, validation.ts
├── components/       # UI components (Svelte 5)
├── stores/           # Svelte 5 runes stores (*.svelte.ts)
├── utils/            # Client utilities (format.ts, etc.)
├── constants.ts      # Enums, labels, currencies
└── types.ts          # TypeScript interfaces

src/routes/
├── api/              # REST endpoints (+server.ts)
├── demo/             # Public demo page
├── (protected)/      # Auth-required pages
└── login/            # Public auth pages
```

## 📖 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Copilot Instructions](.github/copilot-instructions.md) - AI coding guidelines

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Development
npm run dev      # Start dev server
npm run check    # TypeScript + svelte-check
npm run build    # Production build
```

## 💖 Support

If you find this project useful, consider:
- ⭐ **Starring** the repository
- 🐛 **Reporting bugs** or suggesting features
- 💻 **Contributing** code or documentation
- ☕ **Supporting** on [Patreon](https://www.patreon.com/cw/Alex_Ai14)

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Made with ❤️ by [Alex Radu](https://github.com/alexandruradu2002-pixel)
