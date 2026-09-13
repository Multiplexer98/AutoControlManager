# AutoControlManager — Analisi Funzionale e Tecnica

## 1. Obiettivo
Web app per tracciare scadenze e manutenzioni ordinarie di più veicoli (max 5), con reminder automatico via email ~30 giorni prima della scadenza. Uso personale/familiare (1-2 utenti), hosting a costo zero.

---

## 2. Analisi Funzionale

### 2.1 Entità principali

**Auto**
- id
- nome/etichetta (es. "Panda di papà")
- targa
- modello (opzionale)
- anno immatricolazione (opzionale)
- attiva (bool, per "archiviare" senza cancellare)

**Scadenza/Manutenzione**
- id
- auto_id (FK)
- tipo: enum { TAGLIANDO, REVISIONE, BOLLO, ASSICURAZIONE, ALTRO }
- data_esecuzione (quando è stata fatta l'ultima volta, nullable se è la prima registrazione)
- km_esecuzione (nullable — non sempre applicabile, es. bollo/assicurazione)
- data_prossima_scadenza (data in cui va rifatta/rinnovata — campo chiave per i reminder)
- costo (opzionale, decimal)
- note (opzionale, testo libero — es. officina, polizza n°)
- reminder_inviato (bool, evita invii duplicati)

Nota: `data_prossima_scadenza` è inserita manualmente dall'utente al momento della registrazione (non calcolata automaticamente, perché bollo/assicurazione hanno scadenze proprie e tagliando/revisione dipendono da km o tempo a seconda dell'auto) — mantiene il modello semplice.

### 2.2 Funzionalità
1. CRUD auto (creare/modificare/disattivare un veicolo).
2. Per ogni auto, CRUD scadenze/manutenzioni, con storico (non si cancella la storia, si aggiungono nuovi record).
3. Vista "prossime scadenze" aggregata su tutte le auto, ordinata per data.
4. Reminder email automatico: ogni giorno un job controlla le scadenze con `data_prossima_scadenza` entro 30 giorni e `reminder_inviato = false`, invia una mail riepilogativa e marca il flag.
5. Login semplice (1-2 utenti, niente registrazione pubblica: credenziali fisse configurate come secret).

### 2.3 Fuori scope (per restare minimali)
- Nessuna gestione multi-tenant/registrazione utenti.
- Nessun calcolo automatico "km previsti" o integrazioni con centralina auto.
- Nessuna gestione allegati/foto dei documenti (eventualmente in v2).

---

## 3. Analisi Tecnica

### 3.1 Architettura (tutta a costo zero)

| Livello | Scelta | Hosting |
|---|---|---|
| Frontend | Angular | GitHub Pages (statico) |
| Backend | Python + FastAPI | Render (free web service) |
| Dati | SQLite-compatibile via **Turso** (libSQL) | Turso free tier |
| Reminder | Script Python schedulato | GitHub Actions (cron giornaliero) |
| Email | API HTTP (non SMTP) | Brevo (ex Sendinblue), free 300 email/giorno |

**Perché Turso e non SQLite locale:** il free tier di Render non offre disco persistente (i dati su file locale spariscono ad ogni redeploy/restart). Turso è SQLite "as a service", stesso linguaggio SQL, client Python semplice, free tier ampio (GB di storage, milioni di letture/mese) — persistenza reale senza dover gestire un server DB.

**Perché il reminder gira su GitHub Actions e non su Render:** il backend free di Render va in sleep dopo inattività, quindi non è affidabile per un cron interno. GitHub Actions ha uno scheduler nativo (`schedule: cron`) gratuito, gira indipendentemente dal backend e può parlare direttamente con Turso.

**Perché Brevo (API HTTP) e non SMTP diretto:** Render free blocca le porte SMTP (25/465/587) in uscita. Un'API HTTP per l'invio email evita il problema del tutto ed è gratuita fino a 300 email/giorno (ben oltre il bisogno).

### 3.2 Struttura cartelle proposta (dentro `AutoControlManager/`)
```
AutoControlManager/
├── frontend/          # Angular app
├── backend/           # FastAPI app
│   ├── main.py
│   ├── models.py
│   ├── db.py          # client Turso
│   └── routers/
├── reminder/           # script standalone per il cron
│   └── check_scadenze.py
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml   # build Angular -> GitHub Pages
│       └── reminder-cron.yml     # schedule daily -> reminder/check_scadenze.py
└── docs/
    └── analisi-autocontrolmanager.md   # questo documento
```

### 3.3 API essenziali (FastAPI)
- `POST /auth/login` → verifica credenziali, ritorna JWT semplice
- `GET /auto` / `POST /auto` / `PUT /auto/{id}` / `DELETE /auto/{id}` (soft delete)
- `GET /auto/{id}/scadenze` / `POST /auto/{id}/scadenze` / `PUT /scadenze/{id}`
- `GET /scadenze/prossime` → vista aggregata ordinata per data

Tutti gli endpoint (tranne login) protetti da JWT — sufficiente per 1-2 utenti, senza bisogno di un sistema di ruoli/permessi.

### 3.4 Secrets necessari
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (Render env vars + GitHub Actions secrets)
- `BREVO_API_KEY` (GitHub Actions secret, usato solo dal job reminder)
- `APP_USER`, `APP_PASSWORD_HASH`, `JWT_SECRET` (Render env vars)

### 3.5 Note di deploy
- Frontend: build Angular in modalità produzione, deploy automatico su push tramite GitHub Actions (`gh-pages` branch o Pages da Actions).
- Backend: repo collegato a Render, auto-deploy su push al branch principale; primo avvio dopo sleep ~30-60s (accettabile per uso personale).
- CORS: il backend deve abilitare esplicitamente l'origin di GitHub Pages (es. `https://<user>.github.io`).

---

## 4. Prossimo step
Passare questo documento a un agente di sviluppo (es. Claude Code) con istruzione di:
1. Scaffolding backend FastAPI + integrazione Turso secondo il modello dati sopra.
2. Scaffolding frontend Angular con le viste: lista auto, dettaglio auto/scadenze, prossime scadenze, login.
3. Script reminder + workflow GitHub Actions.
4. Workflow deploy frontend su GitHub Pages.
