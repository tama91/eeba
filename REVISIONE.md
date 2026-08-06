# Revisione — stato

Tutte le voci trovate nel giro di controllo sono state risolte.
Resta questo documento come traccia di cosa c'era e come è stato sistemato.

---

## A. Bug — risolti

| | Cos'era | Come è stato risolto |
|---|---|---|
| A1 | Il badge "TBA" compariva anche sui relatori confermati, e in inglese fisso | Il segnaposto ora è legato all'attributo `data-tba`, che c'è solo se il nome manca, e il testo arriva dalle traduzioni (`spk.tba`) |
| A2 | Il ruolo del delegato finiva nel database tradotto, quindi "Direttore banca degli occhi" e "Eye bank director" erano due categorie diverse | Nel database va il codice `r0…r7`; l'etichetta si risolve solo in visualizzazione. La migrazione 001 riconduce le iscrizioni già presenti, in tutte e quattro le lingue |
| A3 | La capienza delle tariffe era un campo finto: salvato e mai controllato | Il server ora la verifica come già faceva per gli extra, e restituisce 409 con `soldOut` |
| A4 | Il file `.ics` aveva la data di fine e l'indirizzo scritti a mano | Legge `event_end` e `venue_name` dalle impostazioni; senza `event_end` calcola l'ultimo giorno alle 18 |
| A5 | Le FAQ erano bloccate a sette: aggiungere `faq.q8` non serviva a niente | Vengono contate quelle effettivamente presenti |

## B. La durata dell'evento — risolta

Il numero tre non è più scritto da nessuna parte.

- nuova impostazione `event_days` (da 1 a 14, validata lato server)
- schede e pannelli del programma generati da lì
- le date delle giornate si calcolano da `event_start` e sono tradotte automaticamente
- il vincolo `CHECK (day_no BETWEEN 1 AND 3)` è stato allargato dalla migrazione 001
- anche il backoffice usa le stesse regole, e avvisa se restano sessioni su giornate
  oltre quelle configurate invece di nasconderle in silenzio

I numeri della sezione statistiche accettano i segnaposto `{days}`, `{sessions}` e
`{months}`, calcolati dai dati. Il "4 mesi" che sarebbe invecchiato da solo ora si
ricalcola rispetto a `stat_target_date`.

## C. Contenuti nel backoffice — risolti

- **ticker** e **ruoli** sono nel database e si modificano dalle Traduzioni.
  Il ticker è una sola stringa con le voci separate da `|`
- **lingue**: il sito legge `settings.languages` come già faceva il backoffice.
  Aggiungerne una è ora solo impostazione + traduzioni. Una lingua senza blocco in
  `i18n.js` parte dall'inglese e viene sovrascritta dal database
- **tipi di sessione**: codici in `session_tags`, etichette in `prog.tag.*`.
  Una sola fonte, usata da sito e backoffice
- **404**: tradotta in quattro lingue, in pagina, così funziona anche con l'API giù

## D. Manutenzione — risolta

- le sessioni scadute e le voci di registro oltre i 180 giorni vengono eliminate
  a ogni accesso: raro abbastanza da non pesare, frequente abbastanza da bastare
- l'export CSV rispetta i filtri attivi nella schermata

---

## Aggiunte

**Palette configurabile.** Sei preset (blu clinico, verde acqua, viola inchiostro,
cremisi, verde bosco, grafite) più un accento libero. I preset toccano solo la
famiglia dell'accento: sfondi, testi e bordi restano quelli del design system,
perché è da lì che dipende la leggibilità.

Un accento personalizzato viene spostato quel tanto che basta a mantenere il
contrasto: il giallo `#FFE500`, illeggibile su bianco, diventa `#847600`, e il
backoffice lo dice invece di farlo di nascosto. `tests/theme.test.mjs` verifica
quattro rapporti di contrasto per ogni palette in entrambi i temi, inclusi otto
colori scelti apposta per essere problematici.

**Logo.** URL a un'immagine oppure codice SVG incollato, con anteprima dal vivo su
fondo chiaro e scuro. L'SVG viene sanificato lato server — via `<script>`, attributi
`on*`, `foreignObject`, URL `javascript:` — perché finisce nella pagina come markup
e un account compromesso non deve poter iniettare codice nel sito pubblico.

---

## Verifica

```
npm test
```

- `tests/api.test.mjs` — 106 test sul router reale contro SQLite in memoria
- `tests/theme.test.mjs` — 117 controlli di contrasto e comportamento delle palette

Il test sulle giornate ha trovato un bug che avevo appena introdotto: l'API
costruiva ancora la risposta pubblica con tre giornate fisse, quindi una sessione
al quinto giorno faceva fallire l'endpoint. È il motivo per cui vale la pena
scrivere il test insieme alla funzionalità e non dopo.

---

## Prima di andare online

```bash
npm run db:migrate     # allarga il vincolo, aggiunge le impostazioni, converte i ruoli
npm run seed           # rigenera seed.sql da i18n.js
git add -A && git commit -m "..." && git push
```

La migrazione è idempotente: si può rilanciare senza danni.
