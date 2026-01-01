# Ghid de Resetare a Parolei

Dacă ți-ai uitat parola aplicației Budget App, urmează pașii de mai jos pentru a o reseta.

---

## 📋 Cuprins

- [Metoda 1: Resetare prin Baza de Date (Recomandat)](#metoda-1-resetare-prin-baza-de-date-recomandat)
- [Metoda 2: Ștergere Completă și Reconfigurare](#metoda-2-ștergere-completă-și-reconfigurare)
- [Metoda 3: Folosind Docker](#metoda-3-folosind-docker)
- [FAQ](#faq)

---

## Metoda 1: Resetare prin Baza de Date (Recomandat)

Această metodă păstrează toate datele tale și doar resetează parola.

### Pentru SQLite Local (file)

1. **Oprește aplicația** (dacă rulează)

2. **Deschide baza de date cu un client SQLite**:
   ```bash
   # Dacă folosești sqlite3 CLI
   sqlite3 ./data/budget.db
   ```

3. **Șterge parola curentă**:
   ```sql
   DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');
   ```

4. **Verifică că s-a șters**:
   ```sql
   SELECT * FROM app_config;
   -- Nu ar trebui să vezi password_hash sau password_salt
   ```

5. **Ieși din SQLite**:
   ```sql
   .exit
   ```

6. **Repornește aplicația**:
   ```bash
   # Docker
   docker compose restart
   
   # Sau npm
   npm run dev
   ```

7. **Accesează aplicația** - vei fi redirecționat automat la pagina de setup pentru a seta o parolă nouă.

---

### Pentru Turso (Cloud SQLite)

1. **Instalează Turso CLI** (dacă nu l-ai instalat):
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Conectează-te la baza de date**:
   ```bash
   turso db shell your-database-name
   ```

3. **Șterge parola**:
   ```sql
   DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');
   ```

4. **Ieși și reîncarcă aplicația** în browser.

---

## Metoda 2: Ștergere Completă și Reconfigurare

⚠️ **ATENȚIE**: Această metodă șterge TOATE datele! Folosește doar dacă vrei să începi de la zero.

### Pentru SQLite Local

```bash
# Șterge fișierul bazei de date
rm ./data/budget.db

# Repornește aplicația
docker compose restart
# sau
npm run dev
```

### Pentru Docker cu volum

```bash
# Oprește containerele
docker compose down

# Șterge volumul de date
docker volume rm budget_app_data

# Repornește
docker compose up -d
```

---

## Metoda 3: Folosind Docker

Dacă rulezi aplicația în Docker, poți accesa baza de date direct din container:

```bash
# 1. Găsește containerul
docker ps

# 2. Intră în container
docker exec -it budget-app sh

# 3. Accesează SQLite (dacă folosești SQLite local)
sqlite3 /app/data/budget.db

# 4. Șterge parola
DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');

# 5. Ieși
.exit
exit

# 6. Accesează aplicația în browser - vei vedea pagina de setup
```

---

## Script de Resetare Automată

Poți crea un script pentru resetare rapidă:

### `reset-password.sh` (Linux/macOS)

```bash
#!/bin/bash

DB_PATH="${1:-./data/budget.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Nu am găsit baza de date la: $DB_PATH"
    echo "Folosire: ./reset-password.sh [cale/spre/budget.db]"
    exit 1
fi

echo "🔄 Resetez parola din $DB_PATH..."

sqlite3 "$DB_PATH" "DELETE FROM app_config WHERE key IN ('password_hash', 'password_salt');"

if [ $? -eq 0 ]; then
    echo "✅ Parola a fost resetată!"
    echo "👉 Repornește aplicația și accesează-o în browser pentru a seta o parolă nouă."
else
    echo "❌ Eroare la resetarea parolei"
    exit 1
fi
```

Folosire:
```bash
chmod +x reset-password.sh
./reset-password.sh
# sau cu cale custom:
./reset-password.sh /path/to/budget.db
```

---

## FAQ

### Q: Ce se întâmplă cu datele mele când resetez parola?
**A:** Datele tale (conturi, tranzacții, categorii, bugete) rămân intacte. Doar parola de autentificare este resetată.

### Q: Pot folosi variabila de mediu APP_PASSWORD în loc de setup?
**A:** Da! Dacă setezi `APP_PASSWORD` în environment, aplicația va folosi acea parolă ca fallback. Dar recomandăm setup-ul prin interfață pentru securitate mai bună (parola este hash-uită).

### Q: Cum pot vedea dacă am parolă setată în DB sau folosesc APP_PASSWORD?
**A:** Verifică în baza de date:
```sql
SELECT * FROM app_config WHERE key = 'password_hash';
```
Dacă returnează un rezultat, parola e în DB. Dacă nu, se folosește APP_PASSWORD.

### Q: Pot schimba parola fără să o resetez complet?
**A:** Momentan nu există interfață pentru schimbarea parolei. Poți:
1. Reseta parola (metoda 1)
2. Seta una nouă prin pagina de setup

### Q: Am pierdut acces la server. Cum recuperez datele?
**A:** Dacă ai backup la fișierul `budget.db`, poți:
1. Porni o instanță nouă
2. Înlocui baza de date goală cu backup-ul
3. Reseta parola folosind metoda 1

---

## Suport

Dacă întâmpini probleme, deschide un issue pe GitHub:
https://github.com/alexandruradu2002-pixel/budget_app/issues
