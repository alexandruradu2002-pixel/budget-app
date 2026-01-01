# Budget App - Installation Guide

> **Aplicație personală de bugetare**: SvelteKit 5 + SQLite-compatible databases + Tailwind CSS

---

## Cuprins

- [Care variantă e pentru mine?](#care-variantă-e-pentru-mine)
- [Cea mai ușoară variantă (Începători)](#cea-mai-ușoară-variantă-începători)
- [Opțiuni Database](#opțiuni-database)
- [Ghid de Instalare](#ghid-de-instalare)
  - [Opțiunea 1: Docker](#opțiunea-1-docker-recomandat-pentru-începători)
  - [Opțiunea 2: Deploy pe Vercel + Turso](#opțiunea-2-deploy-pe-vercel--turso)
  - [Opțiunea 3: Self-Host cu PostgreSQL](#opțiunea-3-self-host-cu-postgresql)
  - [Opțiunea 4: Development Local](#opțiunea-4-development-local)
- [Configurare Avansată](#configurare-avansată)
- [FAQ & Troubleshooting](#faq--troubleshooting)
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

> **🎉 Zero configurare database! Funcționează în 2 minute.**

### Cerințe
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalat (download gratuit)

### Pași

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

**✅ Gata!** La prima accesare, vei fi redirecționat la pagina de **Setup Inițial** unde îți vei seta parola.

> 💡 **Ai uitat parola?** Vezi [docs/PASSWORD_RESET.md](docs/PASSWORD_RESET.md) pentru instrucțiuni de resetare.

Datele tale sunt salvate în `./data/budget.db` și persistă între restartări.

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

### Opțiunea 3: Self-Host cu PostgreSQL

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

### Opțiunea 4: Development Local

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

### Environment Variables

| Variabilă | Descriere | Exemplu |
|-----------|-----------|---------|
| `TURSO_DATABASE_URL` | URL-ul bazei de date | `libsql://db-user.turso.io` |
| `TURSO_AUTH_TOKEN` | Token autentificare Turso | `eyJhbGciOi...` |
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
- **Docker pentru începători**: https://docs.docker.com/get-started/
- **SvelteKit Docs**: https://kit.svelte.dev/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

<p align="center">
  <a href="https://github.com/alexandruradu2002-pixel/budget_app">⭐ Star pe GitHub</a> •
  <a href="https://github.com/alexandruradu2002-pixel/budget_app/issues">🐛 Raportează Bug</a> •
  <a href="https://github.com/alexandruradu2002-pixel/budget_app/discussions">💬 Discuții</a>
</p>
