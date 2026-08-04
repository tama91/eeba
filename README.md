# EEBA 2027 — Leuven

Sito, iscrizioni e backoffice per il XXXVIII Congresso Annuale della European Eye Bank Association
(University Hall, Leuven, 8–10 aprile 2027).

Stack: **Cloudflare Worker con asset statici + D1**. Nessun framework, nessuna build.

---

## Struttura

```
public/              → sito statico, servito dal binding ASSETS
  index.html           sito pubblico, 4 lingue
  styles.css
  app.js               logica del sito + flusso iscrizione
  i18n.js              contenuti di fallback + listino di riserva
  404.html
  _headers             intestazioni di sicurezza
  admin/               backoffice (SPA)
src/
  index.js             entry del Worker: /api/* → api.js, il resto → ASSETS
  api.js               tutta l'API, router unico
schema/
  schema.sql           tabelle D1
  seed.sql             dati iniziali (generato)
  generate-seed.js     rigenera seed.sql da public/i18n.js
tests/api.test.mjs     75 test d'integrazione sull'API reale
wrangler.toml
```

> **Nota storica.** Il progetto era nato come Cloudflare Pages. È un Worker con
> asset statici perché è così che il progetto esiste sull'account, ed è la
> direzione verso cui Cloudflare sta spostando tutto. La differenza pratica:
> si deploya con `wrangler deploy` e non `wrangler pages deploy`, e i binding
> stanno in `wrangler.toml` invece che nel pannello.

---

## Setup

### 1. Crea il database

```bash
npm install
npx wrangler d1 create eeba-2027
```

Copia il `database_id` che ottieni dentro `wrangler.toml`.

### 2. Carica schema e contenuti iniziali

```bash
npm run db:schema
npm run db:seed
```

Il seed importa nel database tutto ciò che oggi sta in `i18n.js`: 227 chiavi di traduzione
nelle 4 lingue, 20 sessioni di programma, 5 tariffe, 4 extra, relatori e sponsor segnaposto.

### 3. Deploy

Dal tuo computer basta:

```bash
npm run deploy
```

Se invece deploya Cloudflare a ogni push, nelle impostazioni del Worker
(**Settings → Build**) serve:

| Campo | Valore |
|---|---|
| Build command | *(vuoto)* |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

Non impostare `CLOUDFLARE_API_TOKEN` fra le variabili: se c'è, wrangler lo usa
al posto delle credenziali della build e serve che abbia i permessi
`Workers Scripts: Edit` e `D1: Edit`, altrimenti il deploy fallisce con
`Authentication error [code: 10000]`.

Il binding D1 e la cartella degli asset vengono da `wrangler.toml`: non c'è
nulla da configurare a mano nel pannello.

### 4. Primo accesso

Vai su `https://iltuosito/admin`. La prima volta compare la schermata di setup:
crea l'account amministratore. È possibile una sola volta — appena esiste un utente,
l'endpoint di setup si chiude da solo.

### Sviluppo in locale

```bash
npm run db:schema:local
npm run db:seed:local
npm run dev          # → http://localhost:8787
npm test             # 75 test, nessuna dipendenza esterna
```

I test non toccano Cloudflare: eseguono il router vero (`src/api.js`) contro un
SQLite in memoria che imita il binding D1.

---

## Backoffice

Su `/admin`.

**Dashboard** — iscritti, valore totale, incassato e da incassare; andamento a 30 giorni;
ripartizione per stato, tariffa e paese; riempimento degli extra a capienza limitata; ultime iscrizioni.

**Iscrizioni** — ricerca su nome/email/ente/riferimento, filtri per stato e tariffa, paginazione,
scheda di dettaglio con cambio stato pagamento e note interne, export CSV (separatore `;`, BOM per Excel).

**Programma / Relatori / Sponsor / Traduzioni** — CRUD completo con editor a schede per le 4 lingue.
Le schede segnano con un pallino rosso le lingue ancora vuote. Ogni salvataggio è online entro un minuto
(la risposta pubblica è in cache 60 secondi).

**Tariffe ed extra** — prezzi early bird e pieni, capienza, attivazione/sospensione.
I prezzi si inseriscono in euro e vengono salvati in centesimi.

**Impostazioni** — date evento, scadenza early bird, lingue attive, apertura iscrizioni, sede.

**Utenti** — tre ruoli:

| Ruolo | Può fare |
|---|---|
| `viewer` | solo lettura |
| `editor` | + modificare contenuti e iscrizioni |
| `admin` | + gestire utenti ed eliminare |

**Registro attività** — ultime 200 operazioni con autore, azione e oggetto. Traccia anche i login falliti.

---

## Come sono legati sito e database

All'avvio il sito chiama `GET /api/public/content` e sovrascrive i valori di `i18n.js`
con quelli del database. **Se l'API non risponde, il sito continua a funzionare** con i
contenuti inclusi nel bundle: nessuna pagina bianca, nessun blocco.

Questo vale anche per `public/index.html` aperto direttamente da disco, comodo per lavorare sulla grafica.

### Aggiungere una lingua

1. `i18n.js`: duplica un blocco lingua, traduci, aggiungi la voce in `LANGS`.
2. Backoffice → Impostazioni → `languages`: aggiungi il codice (es. `en,it,nl,fr,de`).
3. Le schede lingua nel backoffice compaiono da sole, con tutti i campi da riempire.

---

## Sicurezza

Cosa è già coperto, verificato dai test:

- password con **PBKDF2-SHA256, 100.000 iterazioni**, salt casuale, confronto a tempo costante.
  100.000 è il tetto imposto dal runtime dei Workers, sotto i 600.000 raccomandati da OWASP:
  è compensato da password di almeno 10 caratteri e dal freno sui tentativi. Il conteggio è
  scritto dentro l'hash, quindi alzarlo in futuro non invalida le password esistenti
- in `sessions` è salvato l'**hash** del token, non il token; cookie `HttpOnly` `Secure` `SameSite=Strict`
- **i prezzi sono sempre ricalcolati dal server** — quelli inviati dal browser vengono ignorati
- controllo di **origine** su tutte le scritture (difesa CSRF)
- **freno ai tentativi di login**: 8 fallimenti in 15 minuti per email, poi 429
- query esclusivamente **parametrizzate**; i nomi di colonna passano da una allowlist
- un amministratore non può declassare né eliminare se stesso (niente lock-out)
- cambio password: chiude tutte le altre sessioni

Cosa manca prima del traffico reale:

- [ ] **Pagamenti**: `POST /api/public/register` crea l'iscrizione in stato `pending`.
      Va collegato a Stripe/Mollie creando lì la Checkout Session e restituendo l'URL,
      con webhook che porta lo stato a `paid`. Il punto di aggancio è commentato nel codice.
- [ ] **Email transazionali**: conferma, fattura, QR del badge (Resend, Postmark o MailChannels).
- [ ] **Recupero password** via email (oggi la reimposta un amministratore).
- [ ] **Backup del D1** programmati (`wrangler d1 export`).
- [ ] Pagine Privacy / Condizioni / Cookie e banner di consenso.
- [ ] Verifica partita IVA su VIES per la fatturazione istituzionale.

---

## Note sui contenuti

Invito, tema, sede, date e recapiti della segreteria derivano dalla pagina ufficiale EEBA.
Sono invece **indicativi e da confermare** con il Comitato Organizzatore: il dettaglio orario
delle sessioni, le tariffe, le scadenze di early bird e cancellazione, le risposte delle FAQ.
I relatori sono segnaposto "TBA" in attesa delle conferme.
