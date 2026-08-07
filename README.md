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
  theme.js             palette e logo, condiviso fra sito e backoffice
  payments.js          registro dei metodi di pagamento
  pagamento.html       pagina di ritorno dal processore
  checkout-anteprima.html   checkout simulato (solo in modalità anteprima)
src/
  index.js             entry del Worker: /api/* → api.js, il resto → ASSETS
  api.js               tutta l'API, router unico
schema/
  schema.sql           tabelle D1
  seed.sql             dati iniziali (generato)
  generate-seed.js     rigenera seed.sql da public/i18n.js
  migrations/          modifiche allo schema, da applicare in ordine
tests/
  api.test.mjs         144 test d'integrazione sull'API reale
  theme.test.mjs       117 controlli di contrasto sulle palette
  frontend.test.mjs    16 controlli statici sul codice del browser
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

Se il database esiste già da prima, applica le migrazioni e aggiungi le chiavi nuove:

```bash
npm run db:migrate
npm run db:topup
```

⚠️ **Non usare `db:seed` su un database già in uso.** Fa `DELETE` prima di inserire:
cancellerebbe le traduzioni corrette a mano, il logo, i prezzi ritoccati.
`db:topup` fa lo stesso lavoro con `INSERT OR IGNORE`, quindi aggiunge solo ciò
che manca. `seed.sql` serve solo al primo avvio.

Il seed importa nel database tutto ciò che oggi sta in `i18n.js`: 236 chiavi di traduzione
nelle 4 lingue, 20 sessioni di programma, 5 tariffe, 4 extra, relatori e sponsor segnaposto.

### 3. Deploy

**Commit e push non mettono niente online.** Salvano il codice su GitHub, nient'altro.
Il sito cambia solo quando viene eseguito un deploy, che è un'operazione separata.

Ci sono due modi, e conviene usarne uno solo per volta.

**Automatico, a ogni push** — è il flusso normale. Cloudflare clona il repo ed esegue
il Deploy command. Nelle impostazioni del Worker (**Settings → Build**):

| Campo | Valore |
|---|---|
| Build command | *(vuoto)* |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

> Se qui resta `npx wrangler pages deploy` la build fallisce con
> *"Must specify a directory of assets to deploy"*: è il comando per Pages,
> e questo progetto è un Worker.

Flusso completo:

```bash
git add -A
git commit -m "descrizione"
git push
# poi: Cloudflare → Deployments → la build deve essere verde
```

Se la build è rossa, **il sito resta alla versione precedente** anche se GitHub è aggiornato.

**Manuale, dal terminale** — utile per provare in fretta o quando la build automatica è rotta:

```bash
npm run deploy
```

⚠️ Carica i file che hai **sul disco**, non quelli su GitHub. Se hai modifiche non
committate finiscono online senza essere tracciate. Controlla sempre che
`git status` sia pulito prima di lanciarlo.

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
npm test             # 277 test, nessuna dipendenza esterna
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

**Pagamenti** — modalità (anteprima / test / attivo), metodi accettati, stato del
collegamento a Stripe e URL del webhook da copiare. Le chiavi segrete non stanno qui:
vedi `PAGAMENTI.md`.

**Aspetto e logo** — sei palette preimpostate più un accento personalizzato, e il logo
dell'evento come URL o come SVG incollato. Anteprima dal vivo su fondo chiaro e scuro.

I preset cambiano solo la famiglia dell'accento: sfondi, testi e bordi restano quelli
del design system, perché è da lì che dipende la leggibilità. Un accento personalizzato
viene spostato quel tanto che basta a mantenere il contrasto minimo — un giallo acceso
su fondo bianco viene scurito, e il backoffice te lo dice.

**Impostazioni** — date evento, numero di giornate, scadenza early bird, lingue attive,
tipi di sessione, apertura iscrizioni, sede. I valori sono validati lato server: le
giornate accettano solo 1–14, i colori solo esadecimali, le lingue solo codici a due lettere.

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

Backoffice → Impostazioni → `languages`: aggiungi il codice (es. `en,it,nl,fr,de`).
Le schede lingua compaiono da sole in tutti gli editor, e il selettore sul sito
si aggiorna al caricamento successivo.

Finché le traduzioni non sono compilate, quella lingua mostra i testi inglesi.
Aggiungere anche un blocco in `public/i18n.js` serve solo a dare una riserva
sensata se l'API non risponde — è facoltativo.

### Cambiare la durata dell'evento

Backoffice → Impostazioni → `event_days` (1–14). Schede del programma, pannelli,
date delle giornate e statistiche si adeguano da sé. Se restano sessioni su giornate
oltre il numero configurato, il backoffice lo segnala invece di nasconderle.

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
- **impostazioni validate lato server**: giornate 1–14, colori esadecimali, URL solo https
- l'**SVG del logo viene sanificato** prima del salvataggio (via `<script>`, attributi `on*`,
  `foreignObject`, URL `javascript:`): finisce nella pagina come markup, e un account
  compromesso non deve poter iniettare codice nel sito pubblico
- un amministratore non può declassare né eliminare se stesso (niente lock-out)
- cambio password: chiude tutte le altre sessioni

Cosa manca prima del traffico reale:

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
