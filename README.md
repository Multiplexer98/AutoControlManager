# AutoControlManager

Tracciamento scadenze e manutenzioni auto (max 5 veicoli) con reminder email 30 giorni prima.
Analisi funzionale completa: [docs/analisi-autocontrolmanager.md](docs/analisi-autocontrolmanager.md).

| Pezzo | Tecnologia | Hosting |
|---|---|---|
| `frontend/` | Angular 19 | GitHub Pages |
| `backend/` | FastAPI | Render (free) |
| dati | Turso (libSQL) | Turso free tier |
| `reminder/` | script Python | GitHub Actions (cron giornaliero) |
| email | Brevo API HTTP | free 300/giorno |

## Sviluppo locale

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
python auth.py la-mia-password  # copia l'hash in APP_PASSWORD_HASH dentro .env

uvicorn main:app --reload       # http://localhost:8000/docs
```

Senza variabili Turso il backend usa uno SQLite locale (`backend/local.db`): comodo per provare.

### Frontend

```bash
cd frontend
npm install
npm start                       # http://localhost:4200
```

L'URL del backend sta in `src/environments/environment.development.ts` (dev) e
`src/environments/environment.ts` (produzione — **da aggiornare col proprio dominio Render**).

## Deploy

1. **Turso** — crea il database, prendi URL e token:
   ```bash
   turso db create autocontrolmanager
   turso db show autocontrolmanager --url
   turso db tokens create autocontrolmanager
   ```
   Lo schema viene creato da solo al primo avvio del backend.

2. **Render** — collega il repo; `render.yaml` è già pronto. Imposta le env var
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_USER`, `APP_PASSWORD_HASH` e
   `CORS_ORIGINS` (es. `https://<utente>.github.io`).

3. **GitHub Pages** — Settings → Pages → Source: *GitHub Actions*. Il workflow
   `deploy-frontend.yml` builda a ogni push su `main`. Se il repo non si chiama
   `AutoControlManager`, aggiorna il `--base-href` nel workflow.

4. **Reminder** — Settings → Secrets → Actions, aggiungi:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BREVO_API_KEY`, `EMAIL_TO`, `EMAIL_FROM`
   (il mittente dev'essere un indirizzo verificato su Brevo).
   Il job gira ogni giorno alle 07:00 UTC e si può lanciare a mano da *Actions →
   Reminder scadenze → Run workflow* per provarlo.

## API

| Metodo | Rotta | Note |
|---|---|---|
| POST | `/auth/login` | ritorna un JWT valido 7 giorni |
| GET/POST | `/auto` | `?includi_inattive=true` per vedere l'archivio |
| PUT/DELETE | `/auto/{id}` | il DELETE è un soft delete (`attiva = 0`) |
| GET/POST | `/auto/{id}/scadenze` | |
| PUT/DELETE | `/scadenze/{id}` | |
| GET | `/scadenze/prossime` | `?giorni=90`, aggregata e ordinata per data |

Tutte le rotte tranne `/auth/login` e `/health` richiedono `Authorization: Bearer <token>`.
