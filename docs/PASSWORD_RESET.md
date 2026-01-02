# Ghid de Resetare a Parolei (Self-Hosting)

Acest ghid te ajută să resetezi parola aplicației Budget App pentru instanțe self-hosted.

💡 **Context**: La self-hosting, aplicația folosește autentificare cu parolă (fără email/SMTP). Parola este stocată hash-uită în tabela `app_config` din baza de date.

---

## 📋 Cuprins

- [Metoda 1: Resetare prin Baza de Date (Recomandat)](#metoda-1-resetare-prin-baza-de-date-recomandat)
- [Metoda 2: Ștergere Completă și Reconfigurare](#metoda-2-ștergere-completă-și-reconfigurare)
- [Metoda 3: Folosind Docker](#metoda-3-folosind-docker)
- [Metoda 4: Script de Resetare Automată](#metoda-4-script-de-resetare-automată)
- [FAQ](#faq)

---

## Metoda 1: Resetare prin Baza de Date (Recomandat)

Această metodă păstrează toate datele tale (conturi, tranzacții, categorii, bugete) și doar resetează parola.

### Pentru SQLite Local (file:/app/data/budget.db)

1. **Localizează fișierul bazei de date**:
   - Docker: `/app/data/budget.db` (în container) sau `./data/budget.db` (pe host)
   - Self-hosted: calea specificată în `TURSO_DATABASE_URL` (ex: `file:/path/to/budget.db`)

2. **Oprește aplicația** (dacă rulează):
   ```bash
   # Docker
   docker compose down
   
   # Sau pentru dev server
   # CTRL+C pentru a opri npm run dev
   ```

3. **Deschide baza de date cu un client SQLite**:
   ```bash
   # Instalează sqlite3 CLI dacă nu-l ai
   # macOS: sqlite3 este preinstalat
   # Ubuntu/Debian: sudo apt install sqlite3
   # Windows: descarcă de pe sqlite.org
   
   # Deschide baza de date
   sqlite3 ./data/budget.db
   ```

4. **Șterge configurația parolei**:
   ```sql
   DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');
   ```

5. **Verifică că s-a șters** (opțional):
   ```sql
   SELECT key, value FROM app_config;
   -- Nu ar trebui să vezi password_hash sau password_salt în listă
   ```

6. **Ieși din SQLite**:
   ```sql
   .exit
   ```

7. **Repornește aplicația**:
   ```bash
   # Docker
   docker compose up -d
   
   # Sau pentru dev
   npm run dev
   ```

8. **Accesează aplicația** în browser - vei fi redirecționat automat la `/setup` pentru a seta o parolă nouă.

> **Tip**: Prima autentificare după reset va folosi user-ul implicit (ID: 1). Poți actualiza email-ul în Settings după login.

---

### Pentru Turso (Cloud SQLite)

Dacă folosești Turso cloud database (recomandat pentru deployment):

1. **Instalează Turso CLI** (dacă nu l-ai instalat deja):
   ```bash
   # macOS/Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Windows
   # Descarcă de pe https://docs.turso.tech/cli/installation
   ```

2. **Autentifică-te** (prima dată):
   ```bash
   turso auth login
   ```

3. **Găsește numele bazei tale de date**:
   ```bash
   turso db list
   # Notează numele (ex: budget-app)
   ```

4. **Conectează-te la baza de date**:
   ```bash
   turso db shell budget-app
   # Înlocuiește 'budget-app' cu numele tău
   ```

5. **Șterge configurația parolei**:
   ```sql
   DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');
   ```

6. **Verifică rezultatul**:
   ```sql
   SELECT changes();
   -- Ar trebui să afișeze: 2 (dacă amândouă cheile au fost șterse)
   ```

7. **Ieși din shell**:
   ```sql
   .exit
   ```

8. **Reîncarcă aplicația** în browser - vei fi redirecționat la pagina de setup.

---

## Metoda 2: Ștergere Completă și Reconfigurare

⚠️ **ATENȚIE**: Această metodă șterge TOATE datele (conturi, tranzacții, categorii, bugete)! Folosește doar dacă:
- Vrei să începi de la zero
- Nu ai date importante de păstrat
- Ai un backup al datelor

### Pentru SQLite Local

```bash
# 1. Oprește aplicația
docker compose down
# sau CTRL+C pentru npm

# 2. (Opțional) Fă backup înainte
cp ./data/budget.db ./data/budget.db.backup

# 3. Șterge fișierul bazei de date
rm ./data/budget.db

# 4. Repornește aplicația
docker compose up -d
# sau
npm run dev
```

### Pentru Docker cu volum persistent

Dacă folosești Docker volumes (definit în `docker-compose.yml`):

```bash
# 1. Oprește și șterge containerele
docker compose down

# 2. Găsește numele volumului
docker volume ls | grep budget

# 3. Șterge volumul (înlocuiește cu numele tău)
docker volume rm budget_app_budget-data

# 4. Repornește (va crea volum nou)
docker compose up -d
```

### Pentru Turso Cloud

⚠️ **Nu șterge baza de date din Turso** decât dacă ești sigur!

```bash
# 1. Vezi toate bazele de date
turso db list

# 2. Șterge baza de date
turso db destroy budget-app
# Confirmă când te întreabă

# 3. Creează una nouă
turso db create budget-app

# 4. Actualizează variabilele de mediu
# Obține noul URL și token:
turso db show budget-app --url
turso db tokens create budget-app

# 5. Actualizează .env.local cu noile credențiale
# TURSO_DATABASE_URL=...
# TURSO_AUTH_TOKEN=...

# 6. Restart aplicația
```

---

## Metoda 3: Folosind Docker

Dacă rulezi aplicația în Docker, poți accesa baza de date direct din container fără să oprești serviciul:

```bash
# 1. Vezi containerele care rulează
docker ps
# Notează numele containerului (ex: budget-app sau budget_app-app-1)

# 2. Verifică locația bazei de date
docker compose exec app printenv TURSO_DATABASE_URL
# Dacă începe cu 'file:', este SQLite local

# 3. Intră în container
docker compose exec app sh
# SAU
docker exec -it budget-app sh

# 4. Accesează SQLite (doar dacă folosești SQLite local)
sqlite3 /app/data/budget.db

# 5. Șterge configurația parolei
DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');

# 6. Verifică (ar trebui să returneze 2)
SELECT changes();

# 7. Ieși din SQLite
.exit

# 8. Ieși din container
exit

# 9. Accesează aplicația în browser - vei vedea pagina de setup
```

**Alternativă rapid (one-liner)**:
```bash
# Execută direct comanda SQL în container
docker compose exec app sqlite3 /app/data/budget.db \
  "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"

echo "✅ Parolă resetată! Accesează aplicația în browser."
```

---

## Metoda 4: Script de Resetare Automată

Pentru resetări frecvente sau automatizare, salvează acest script:

### `reset-password.sh` (Linux/macOS)

```bash
#!/bin/bash
set -e

# Culori pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Calea implicit către baza de date
DB_PATH="${1:-./data/budget.db}"

echo -e "${YELLOW}🔐 Budget App - Password Reset${NC}\n"

# Verifică dacă rulează în Docker
if [ -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}🐳 Detectat Docker setup${NC}"
    echo -e "${YELLOW}📝 Resetez parola în container...${NC}\n"
    
    docker compose exec app sqlite3 /app/data/budget.db \
      "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Parola a fost resetată cu succes!${NC}"
        echo -e "${GREEN}👉 Accesează aplicația în browser la /setup pentru a seta o parolă nouă.${NC}"
    else
        echo -e "\n${RED}❌ Eroare la resetarea parolei${NC}"
        exit 1
    fi
else
    # Setup non-Docker
    if [ ! -f "$DB_PATH" ]; then
        echo -e "${RED}❌ Nu am găsit baza de date la: $DB_PATH${NC}"
        echo -e "Folosire: ./reset-password.sh [cale/spre/budget.db]"
        exit 1
    fi

    echo -e "${YELLOW}📝 Resetez parola din $DB_PATH...${NC}\n"

    sqlite3 "$DB_PATH" "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"

    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ Parola a fost resetată cu succes!${NC}"
        echo -e "${GREEN}👉 Repornește aplicația și accesează /setup pentru a seta o parolă nouă.${NC}"
    else
        echo -e "\n${RED}❌ Eroare la resetarea parolei${NC}"
        exit 1
    fi
fi
```

**Instalare și utilizare**:

```bash
# 1. Salvează scriptul în root-ul proiectului
curl -o reset-password.sh https://raw.githubusercontent.com/alexandruradu2002-pixel/budget-app/main/scripts/reset-password.sh

# 2. Fă-l executabil
chmod +x reset-password.sh

# 3. Rulează (auto-detectează Docker sau local)
./reset-password.sh

# SAU cu cale custom (doar pentru non-Docker)
./reset-password.sh /custom/path/budget.db
```

> **Self-hosting tip**: Adaugă acest script în `.gitignore` dacă îl personalizezi, dar commit-ul versiunii default este OK pentru echipă.

### Pentru Windows (PowerShell)

Creează `reset-password.ps1`:

```powershell
# Budget App - Password Reset (Windows)
param(
    [string]$DbPath = ".\data\budget.db"
)

Write-Host "🔐 Budget App - Password Reset`n" -ForegroundColor Yellow

# Verifică dacă există docker-compose.yml
if (Test-Path "docker-compose.yml") {
    Write-Host "🐳 Detectat Docker setup" -ForegroundColor Yellow
    Write-Host "📝 Resetez parola în container...`n" -ForegroundColor Yellow
    
    docker compose exec app sqlite3 /app/data/budget.db "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Parola a fost resetată cu succes!" -ForegroundColor Green
        Write-Host "👉 Accesează aplicația în browser la /setup" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Eroare la resetarea parolei" -ForegroundColor Red
        exit 1
    }
} else {
    # Setup non-Docker
    if (-not (Test-Path $DbPath)) {
        Write-Host "❌ Nu am găsit baza de date la: $DbPath" -ForegroundColor Red
        Write-Host "Folosire: .\reset-password.ps1 [-DbPath 'cale\spre\budget.db']"
        exit 1
    }

    Write-Host "📝 Resetez parola din $DbPath...`n" -ForegroundColor Yellow

    sqlite3 $DbPath "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Parola a fost resetată cu succes!" -ForegroundColor Green
        Write-Host "👉 Repornește aplicația și accesează /setup" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Eroare la resetarea parolei" -ForegroundColor Red
        exit 1
    }
}
```

**Utilizare Windows**:
```powershell
# Rulează cu ExecutionPolicy bypass
powershell -ExecutionPolicy Bypass -File .\reset-password.ps1

# SAU cu cale custom
powershell -ExecutionPolicy Bypass -File .\reset-password.ps1 -DbPath "C:\path\to\budget.db"
```

---

## FAQ

### Q: Ce se întâmplă cu datele mele când resetez parola?
**A:** Datele tale (conturi, tranzacții, categorii, bugete) rămân 100% intacte. Se șterge doar configurația parolei din tabela `app_config` (2 rânduri: `password_hash` și `password_salt`). Toate celelalte tabele rămân neschimbate.

### Q: Cum este stocată parola?
**A:** Parola este hash-uită cu SHA-256 + salt înainte de stocare. Nu este stocată în plaintext niciodată:
```sql
-- Exemplu (hash-ul tău va fi diferit)
SELECT key, substr(value, 1, 20) || '...' as value_preview 
FROM app_config 
WHERE key IN ('password_hash', 'password_salt');

-- password_hash | a3f2b8c9e4d1f7a2...
-- password_salt | 1f9e2d3c4b5a6...
```

### Q: Pot schimba parola fără să o resetez complet?
**A:** Momentan nu există UI pentru schimbarea parolei. Singura metodă este:
1. Șterge parola curentă (Metoda 1)
2. Accesează `/setup` pentru a seta una nouă

**Planificat pentru viitor**: Pagină Settings > Security cu opțiune "Schimbare parolă".

### Q: Pot folosi variabile de mediu în loc de setup UI?
**A:** Nu direct. Aplicația necesită setup prin `/setup` pentru a genera hash + salt corect. 

Dar poți automatiza cu un script:
```bash
# Generează hash din parolă
PASSWORD="your-password"
SALT=$(openssl rand -hex 16)
HASH=$(echo -n "${PASSWORD}${SALT}" | sha256sum | cut -d' ' -f1)

# Inserează în DB
sqlite3 ./data/budget.db <<EOF
INSERT OR REPLACE INTO app_config (key, value) VALUES ('password_salt', '$SALT');
INSERT OR REPLACE INTO app_config (key, value) VALUES ('password_hash', '$HASH');
EOF
```

### Q: Am pierdut acces la server. Cum recuperez datele?
**A:** Dacă ai backup la baza de date:

**Pentru SQLite local**:
```bash
# 1. Găsește backup-ul (ex: budget.db.backup)
# 2. Înlocuiește baza curentă
cp budget.db.backup budget.db
# 3. Resetează parola (Metoda 1)
sqlite3 budget.db "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"
# 4. Repornește app și accesează /setup
```

**Pentru Turso**:
Turso nu suportă restore direct, dar poți:
```bash
# 1. Creează bază nouă
turso db create budget-app-restored

# 2. Importă backup-ul (trebuie să ai export SQL)
turso db shell budget-app-restored < backup.sql

# 3. Actualizează TURSO_DATABASE_URL și TURSO_AUTH_TOKEN
turso db show budget-app-restored --url
turso db tokens create budget-app-restored
```

### Q: Pot automatiza backup-urile?
**A:** Da! Exemplu de cron job (Linux/macOS):

```bash
# Adaugă în crontab (crontab -e)
# Backup zilnic la 2 AM
0 2 * * * sqlite3 /path/to/budget.db ".backup /path/to/backups/budget-$(date +\%Y\%m\%d).db"

# Sau backup la fiecare 6 ore
0 */6 * * * sqlite3 /path/to/budget.db ".backup /path/to/backups/budget-$(date +\%Y\%m\%d-\%H\%M).db"
```

Pentru Docker:
```bash
# Script: backup-db.sh
#!/bin/bash
docker compose exec app sqlite3 /app/data/budget.db \
  ".backup /app/data/backups/budget-$(date +%Y%m%d-%H%M).db"

# Crontab:
0 2 * * * /path/to/backup-db.sh
```

### Q: Există limită de utilizatori pentru self-hosting?
**A:** Nu, la self-hosting nu există limitări. Setează în `.env`:
```bash
# Nelimitat (recomandat pentru self-hosting)
USER_CAP=0
# SAU
USER_CAP=unlimited
```

> **Notă**: Limitarea de utilizatori există doar pentru instanțe hosted publice (Vercel) pentru controlul costurilor.

### Q: Cum adaug utilizatori noi?
**A:** După ce te loghezi ca admin, poți invita utilizatori:
1. Settings > Users
2. Add User (necesită email valid)
3. Utilizatorul primește credențiale și se poate loga

**Alternativă**: Creează manual în DB:
```sql
-- Generează hash pentru parolă "password123"
-- (folosește scriptul de mai sus pentru hash real)
INSERT INTO users (email, name, password_hash, roles) 
VALUES ('user@example.com', 'John Doe', 'hash-here', '["user"]');
```

### Q: Cum setez parola direct din linia de comandă?
**A:** Folosește acest one-liner pentru a seta o parolă nouă direct:

```bash
#!/bin/bash
# Set password directly via CLI
read -sp "Enter new password: " PASSWORD
echo
SALT=$(openssl rand -hex 16)
HASH=$(echo -n "${PASSWORD}${SALT}" | sha256sum | awk '{print $1}')

sqlite3 ./data/budget.db <<EOF
DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');
INSERT INTO app_config (key, value) VALUES ('password_salt', '$SALT');
INSERT INTO app_config (key, value) VALUES ('password_hash', '$HASH');
EOF

echo "✅ Parolă setată cu succes!"
```

---

## 🔗 Resurse Utile

- **Documentație Turso**: https://docs.turso.tech
- **Documentație SvelteKit**: https://kit.svelte.dev
- **Repository GitHub**: https://github.com/alexandruradu2002-pixel/budget-app
- **Issues & Support**: https://github.com/alexandruradu2002-pixel/budget-app/issues
- **Installation Guide**: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)

---

## Suport

Dacă întâmpini probleme sau ai întrebări:

1. **Verifică Issues existente**: https://github.com/alexandruradu2002-pixel/budget-app/issues
2. **Deschide Issue nou**: Descrie problema + pași de reproducere + logs
3. **Include informații despre setup**:
   - Turso Cloud sau SQLite local?
   - Docker sau npm?
   - Versiune aplicație (commit hash)
   - Logs relevante

**Template pentru Issue (Self-Hosting)**:
```markdown
**Descriere problemă**: [Ce ai încercat să faci]
**Comportament așteptat**: [Ce ar trebui să se întâmple]
**Comportament actual**: [Ce se întâmplă]

**Setup Self-Hosting**:
- Database: [SQLite local file / Turso cloud]
- Deployment: [Docker / npm dev / systemd service]
- OS: [Ubuntu 22.04 / Debian / macOS / Windows]
- Node version: [node --version]

**Environment (.env)**:
```bash
TURSO_DATABASE_URL=file:/app/data/budget.db
USER_CAP=0
# (exclude credențiale sensibile!)
```

**Pași de reproducere**:
1. [Pas 1]
2. [Pas 2]
3. [...]

**Logs** (vezi cu `docker compose logs -f` sau `journalctl -u budget-app`):
```
[paste logs aici]
```
```

---

**Ultima actualizare**: Ianuarie 2026  
**Versiune aplicație**: v1.0 (SvelteKit 5 + Turso)  
**Target audience**: Self-hosters using password authentication
