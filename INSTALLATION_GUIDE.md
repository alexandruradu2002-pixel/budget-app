# Budget App - Installation Guide

> **Aplicație personală de bugetare**: SvelteKit 5 + SQLite-compatible databases + Tailwind CSS

---

## Cuprins

- [Budget App - Installation Guide](#budget-app---installation-guide)
  - [Cuprins](#cuprins)
  - [Care variantă e pentru mine?](#care-variantă-e-pentru-mine)
  - [Cea mai ușoară variantă (Începători)](#cea-mai-ușoară-variantă-începători)
    - [🖥️ Varianta A: Local cu Docker](#️-varianta-a-local-cu-docker)
    - [☁️ Varianta B: Cloud cu Netlify (gratuit)](#️-varianta-b-cloud-cu-netlify-gratuit)
  - [Opțiuni Database](#opțiuni-database)
    - [Comparație completă](#comparație-completă)
    - [1. SQLite (Local File) - Cea mai simplă](#1-sqlite-local-file---cea-mai-simplă)
    - [2. Turso (Cloud SQLite) - Recomandat pentru producție](#2-turso-cloud-sqlite---recomandat-pentru-producție)
    - [3. PostgreSQL - Enterprise-grade](#3-postgresql---enterprise-grade)
  - [Ghid de Instalare](#ghid-de-instalare)
    - [Opțiunea 1: Docker (Recomandat pentru începători)](#opțiunea-1-docker-recomandat-pentru-începători)
    - [Opțiunea 2: Deploy pe Vercel + Turso](#opțiunea-2-deploy-pe-vercel--turso)
      - [Pas 1: Creează database Turso](#pas-1-creează-database-turso)
      - [Pas 2: Deploy pe Vercel](#pas-2-deploy-pe-vercel)
    - [Opțiunea 3: Deploy pe Netlify + Turso](#opțiunea-3-deploy-pe-netlify--turso)
      - [Pas 1: Creează database Turso](#pas-1-creează-database-turso-1)
      - [Pas 2: Deploy pe Netlify](#pas-2-deploy-pe-netlify)
      - [Pas 3: Configurare (opțional)](#pas-3-configurare-opțional)
    - [Opțiunea 4: Self-Host cu PostgreSQL](#opțiunea-4-self-host-cu-postgresql)
    - [Opțiunea 5: Development Local](#opțiunea-5-development-local)
  - [Configurare Avansată](#configurare-avansată)
    - [Environment Variables](#environment-variables)
    - [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
    - [SSL cu Let's Encrypt](#ssl-cu-lets-encrypt)
  - [FAQ \& Troubleshooting](#faq--troubleshooting)
    - [Aplicația nu pornește](#aplicația-nu-pornește)
    - [Cum fac backup la date?](#cum-fac-backup-la-date)
    - [Cum migrez de la SQLite la PostgreSQL?](#cum-migrez-de-la-sqlite-la-postgresql)
    - [Eroare "Database is locked"](#eroare-database-is-locked)
    - [Cum actualizez la ultima versiune?](#cum-actualizez-la-ultima-versiune)
  - [Resurse Utile](#resurse-utile)

---

## Care variantă e pentru mine?

| Ești... | Recomandare | Dificultate |
|---------|-------------|-------------|
| 🆕 **Începător complet** | Docker cu SQLite local | ⭐ Foarte ușor |
| 👨‍💻 **Developer** care vrea să contribuie | Development local | ⭐⭐ Ușor |
| 🏠 **Self-hoster** pe propriul server | Docker + PostgreSQL | ⭐⭐⭐ Mediu |
| ☁️ **Cloud hosting** pe Vercel/Netlify | Turso | ⭐⭐ Ușor |
| 🏢 **Producție enterprise** | PostgreSQL | ⭐⭐⭐⭐ Avansat |

---

## Cea mai ușoară variantă (Începători)

> **🎉 Zero configurare database! Funcționează în câteva minute.**

Alege varianta care ți se potrivește:

| Variantă | Avantaje | Dezavantaje |
|----------|----------|-------------|
| 🖥️ **Local (Docker)** | Date pe calculatorul tău, offline | Trebuie să ruleze PC-ul |
| ☁️ **Cloud (Netlify)** | Accesibil de oriunde, mereu online | Date în cloud |

---

### 🖥️ Varianta A: Local cu Docker

> **Timp**: ~2 minute | Datele rămân pe calculatorul tău

**Cerințe**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalat (download gratuit)

```bash
# 1. Descarcă proiectul
git clone https://github.com/alexandruradu2002-pixel/budget_app.git
cd budget_app

# 2. Creează folder pentru date
mkdir -p data

# 3. Pornește aplicația
docker compose up -d

# 4. Deschide în browser
open http://localhost:3000
```

**✅ Gata!** Datele sunt salvate local în `./data/budget.db`.

---

### ☁️ Varianta B: Cloud cu Netlify (gratuit)

> **Timp**: ~10 minute | Accesibil de pe orice dispozitiv

**Cerințe**: Cont GitHub (gratuit)

**Pas 1**: Click pe butonul de deploy:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/alexandruradu2002-pixel/budget_app)

**Pas 2**: Creează database Turso (gratuit) - vezi [instrucțiuni detaliate](#opțiunea-3-deploy-pe-netlify--turso)

**Pas 3**: Adaugă credențialele Turso în Netlify → Site settings → Environment variables

**✅ Gata!** Aplicația ta e live la `https://your-site.netlify.app`

---

> 💡 **Ai uitat parola?** Vezi [docs/PASSWORD_RESET.md](docs/PASSWORD_RESET.md) pentru instrucțiuni de resetare.

---

## Opțiuni Database

Budget App suportă multiple baze de date pentru a se adapta diferitelor scenarii de deployment și nevoi de scalabilitate.

### Comparație completă

| Database | Tip | Cost | Scalabilitate | Backup | Best For |
|----------|-----|------|---------------|--------|----------|
| **SQLite (file)** | Local | Gratuit | Limitată | Manual/simplu | Self-host, single user |
| **Turso** | Cloud SQLite | Free tier generos | Edge replicas | Automat | Vercel, serverless |
| **PostgreSQL** | Self-hosted | Gratuit | Excelentă | Flexible | Self-host, multi-user |

---

### 1. SQLite (Local File) - Cea mai simplă

**Avantaje**: Zero setup, zero costuri, backup = copiere fișier  
**Dezavantaje**: Nu suportă multi-user simultan

```bash
# Environment variable
TURSO_DATABASE_URL=file:./data/budget.db
TURSO_AUTH_TOKEN=
```

**Backup simplu**:
```bash
cp ./data/budget.db ./backups/budget_$(date +%Y%m%d).db
```

---

### 2. Turso (Cloud SQLite) - Recomandat pentru producție

**Avantaje**: Edge replicas, latență mică, free tier generos (9GB storage, 500M rows read/month)  
**Dezavantaje**: Vendor lock-in ușor

```bash
# 1. Instalează CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Creează cont și database
turso auth signup
turso db create budget-app

# 3. Obține credențiale
turso db show budget-app --url      # → TURSO_DATABASE_URL
turso db tokens create budget-app   # → TURSO_AUTH_TOKEN
```

```bash
# Environment variables
TURSO_DATABASE_URL=libsql://your-db-name-username.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

---

### 3. PostgreSQL - Enterprise-grade

**Avantaje**: Scalabil, ACID complet, extensii (PostGIS, full-text search)  
**Dezavantaje**: Necesită mai multă memorie

**Docker Compose cu PostgreSQL**:
```yaml
version: '3.8'
services:
  budget-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://budget:secret@postgres:5432/budget_app
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: budget
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: budget_app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

---

## Ghid de Instalare

### Opțiunea 1: Docker (Recomandat pentru începători)

> **Dificultate**: ⭐ Foarte ușor | **Timp**: ~5 minute

**Cerințe**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# Clonează repository-ul
git clone https://github.com/alexandruradu2002-pixel/budget_app.git
cd budget_app

# Creează folder pentru date persistente
mkdir -p data

# Pornește cu Docker Compose
docker compose up -d

# Verifică că rulează
docker compose ps

# Vezi log-urile (opțional)
docker compose logs -f
```

**Accesează**: http://localhost:3000

**Oprire**:
```bash
docker compose down        # Oprește (păstrează datele)
docker compose down -v     # Oprește și șterge datele
```

---

### Opțiunea 2: Deploy pe Vercel + Turso

> **Dificultate**: ⭐⭐ Ușor | **Timp**: ~10 minute

**Cerințe**: Cont GitHub, cont Vercel (gratuit), cont Turso (gratuit)

#### Pas 1: Creează database Turso

```bash
# Instalează Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Autentificare
turso auth signup    # sau: turso auth login

# Creează database
turso db create budget-app

# Copiază aceste valori (le vei folosi în Vercel)
turso db show budget-app --url
turso db tokens create budget-app
```

#### Pas 2: Deploy pe Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alexandruradu2002-pixel/budget_app&env=TURSO_DATABASE_URL,TURSO_AUTH_TOKEN)

1. Click pe butonul de mai sus
2. Conectează-ți contul GitHub
3. Adaugă environment variables:
   - `TURSO_DATABASE_URL` = URL-ul de la `turso db show`
   - `TURSO_AUTH_TOKEN` = Token-ul de la `turso db tokens create`
4. Click **Deploy**

---

### Opțiunea 3: Deploy pe Netlify + Turso

> **Dificultate**: ⭐⭐ Ușor | **Timp**: ~10 minute

**Cerințe**: Cont GitHub, cont Netlify (gratuit), cont Turso (gratuit)

**Free tier Netlify**: 100GB bandwidth/lună, 300 build minutes/lună - mai mult decât suficient pentru uz personal.

#### Pas 1: Creează database Turso

```bash
# Instalează Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Autentificare
turso auth signup    # sau: turso auth login

# Creează database
turso db create budget-app

# Copiază aceste valori (le vei folosi în Netlify)
turso db show budget-app --url
turso db tokens create budget-app
```

#### Pas 2: Deploy pe Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/alexandruradu2002-pixel/budget_app)

1. Click pe butonul de mai sus
2. Conectează-ți contul GitHub
3. Netlify va crea automat un fork și va începe build-ul
4. După deploy, mergi la **Site settings** → **Environment variables**
5. Adaugă:
   - `TURSO_DATABASE_URL` = URL-ul de la `turso db show`
   - `TURSO_AUTH_TOKEN` = Token-ul de la `turso db tokens create`
6. **Deploys** → **Trigger deploy** → **Deploy site** (pentru a aplica variabilele)

#### Pas 3: Configurare (opțional)

Pentru a schimba domeniul:
1. **Site settings** → **Domain management** → **Add custom domain**
2. Netlify oferă și subdomenii gratuite: `your-budget.netlify.app`

---

### Opțiunea 4: Self-Host cu PostgreSQL

> **Dificultate**: ⭐⭐⭐ Mediu | **Timp**: ~15 minute

**Cerințe**: Docker, server cu minim 1GB RAM

```bash
# Creează docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  budget-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://budget:secret@postgres:5432/budget_app
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: budget
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: budget_app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U budget -d budget_app"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Pornește serviciile
docker compose up -d

# Verifică
docker compose ps
```

**Backup PostgreSQL**:
```bash
docker compose exec postgres pg_dump -U budget budget_app > backup_$(date +%Y%m%d).sql
```

---

### Opțiunea 5: Development Local

> **Dificultate**: ⭐⭐ Ușor | **Timp**: ~5 minute

**Cerințe**: Node.js 18+, npm sau pnpm

```bash
# Clonează repository-ul
git clone https://github.com/alexandruradu2002-pixel/budget_app.git
cd budget_app

# Instalează dependințele
npm install

# Copiază environment variables
cp .env.example .env.local

# Editează .env.local (opțional - fără edit folosește in-memory SQLite)
# Pentru SQLite persistent:
# TURSO_DATABASE_URL=file:./data/budget.db
# TURSO_AUTH_TOKEN=

# Pornește development server
npm run dev

# Deschide în browser
open http://localhost:5173
```

---

## Configurare Avansată

### Autentificare

Budget App suportă două metode de autentificare:

#### 🔐 Opțiunea A: Email Magic Link + OTP (Recomandat pentru hosted instances)

Utilizatorii primesc un link magic și cod OTP pe email. Zero parole de ținut minte!

**Setup Resend** (free tier: 100 emails/zi = ~50 utilizatori):

1. Creează cont la [resend.com](https://resend.com)
2. Obține API Key din dashboard
3. Adaugă environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
APP_URL=https://your-domain.com
# Opțional: Custom email sender (necesită domain verificat)
# EMAIL_FROM=Budget App <login@yourdomain.com>
```

4. Setează limita de utilizatori (opțional):

```env
# Limitează la 50 utilizatori (Resend free tier)
USER_CAP=50

# Sau nelimitat (pentru self-host)
USER_CAP=unlimited
```

#### 🔑 Opțiunea B: Parolă (Pentru self-host privat)

Dacă nu configurezi Resend, aplicația folosește autentificare cu parolă:

1. **Prima rulare**: Accesează `/setup` pentru a seta parola
2. **Sau via environment**:

```env
# Setează direct în .env (nu se mai cere setup)
APP_PASSWORD=your-secure-password
```

> 💡 **Ai uitat parola?** Vezi [docs/PASSWORD_RESET.md](docs/PASSWORD_RESET.md)

#### Care metodă să aleg?

| Scenariu | Recomandare |
|----------|-------------|
| **Hosted public** (Vercel/Netlify) | Email Magic Link + OTP |
| **Self-host single user** | Parolă (mai simplu) |
| **Self-host cu familie** | Email Magic Link (fiecare cu emailul său) |

### Environment Variables

| Variabilă | Descriere | Exemplu |
|-----------|-----------|---------|
| `TURSO_DATABASE_URL` | URL-ul bazei de date | `libsql://db-user.turso.io` |
| `TURSO_AUTH_TOKEN` | Token autentificare Turso | `eyJhbGciOi...` |
| `RESEND_API_KEY` | API key pentru email auth | `re_xxxxxx` |
| `APP_URL` | URL-ul public al aplicației | `https://budget.example.com` |
| `USER_CAP` | Limită utilizatori (`50`, `unlimited`) | `50` |
| `APP_PASSWORD` | Parolă fallback (fără Resend) | `secret123` |
| `ALLOW_DEMO` | Activează mod demo | `true` |
| `DATABASE_URL` | URL PostgreSQL/MySQL (alternativ) | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Environment | `production` sau `development` |

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name budget.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL cu Let's Encrypt

```bash
# Instalează Certbot
sudo apt install certbot python3-certbot-nginx

# Obține certificat
sudo certbot --nginx -d budget.example.com
```

---

## FAQ & Troubleshooting

### Aplicația nu pornește

```bash
# Verifică log-urile
docker compose logs budget-app

# Verifică dacă portul e ocupat
lsof -i :3000

# Repornește
docker compose restart
```

### Cum fac backup la date?

| Database | Comandă Backup |
|----------|----------------|
| SQLite | `cp ./data/budget.db ./backups/` |
| PostgreSQL | `docker compose exec postgres pg_dump -U budget budget_app > backup.sql` |
| Turso | Backup automat în cloud, sau: `turso db shell budget-app ".dump" > backup.sql` |

### Cum migrez de la SQLite la PostgreSQL?

1. Exportă datele din aplicație (Settings → Export)
2. Schimbă `DATABASE_URL` la PostgreSQL
3. Repornește aplicația (va crea tabelele)
4. Importă datele (Settings → Import)

### Eroare "Database is locked"

Aceasta apare cu SQLite când mai multe procese încearcă să scrie simultan:
- Folosește un singur container/proces
- Sau migrează la PostgreSQL pentru multi-user

### Cum actualizez la ultima versiune?

```bash
# Pull ultimele modificări
git pull origin main

# Rebuild și restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Resurse Utile

- **Documentație Turso**: https://docs.turso.tech
- **Netlify Docs**: https://docs.netlify.com
- **Vercel Docs**: https://vercel.com/docs
- **Docker pentru începători**: https://docs.docker.com/get-started/
- **SvelteKit Docs**: https://kit.svelte.dev/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

<p align="center">
  <a href="https://github.com/alexandruradu2002-pixel/budget_app">⭐ Star pe GitHub</a> •
  <a href="https://github.com/alexandruradu2002-pixel/budget_app/issues">🐛 Raportează Bug</a> •
  <a href="https://github.com/alexandruradu2002-pixel/budget_app/discussions">💬 Discuții</a>
</p>
