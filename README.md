# EEBA 2027 — Leuven

Sito vetrina + iscrizioni per il XXXVIII Congresso Annuale della European Eye Bank Association
(University Hall, Leuven, 8–10 aprile 2027).

Prototipo statico: nessuna build, nessuna dipendenza. Apri `index.html` in un browser.

## File

| File | Cosa contiene |
|---|---|
| `index.html` | Struttura di tutte le sezioni. Il testo non è scritto qui: ogni elemento traducibile ha `data-i18n="chiave.percorso"`. |
| `styles.css` | Design system completo (variabili colore/tipografia in `:root`), componenti, responsive, print, `prefers-reduced-motion`. |
| `i18n.js` | **Tutti i contenuti**, in 4 lingue. In fondo: listino prezzi (`PRICING`) e lista paesi (`COUNTRIES`). |
| `app.js` | Logica: switch lingua, countdown, tab programma, accordion FAQ, flusso iscrizione a 4 step, export `.ics`. |

## Modificare i contenuti

Tutto il testo sta in `i18n.js`. Le **chiavi** (a sinistra dei due punti) non vanno mai tradotte;
si traducono solo i valori tra virgolette.

```js
hero: {
  t1:"Eye banking,",     // ← traduci questo
  t2:"from theory",
}
```

`data-i18n-html` accetta HTML nel valore (usato per l'indirizzo della segreteria).

### Aggiungere una lingua

1. In `i18n.js`, duplica un blocco lingua completo (es. `en: { … }`) e rinominalo (`de: { … }`).
2. Traduci i valori.
3. Aggiungi la voce in `LANGS`: `{ code:"de", label:"Deutsch", short:"DE" }`.

Il selettore lingua e il rilevamento automatico si aggiornano da soli.
La lingua è rilevata in quest'ordine: `?lang=xx` nell'URL → scelta salvata in `localStorage` → lingua del browser → inglese.

### Modificare i prezzi

In fondo a `i18n.js`:

```js
const PRICING = {
  earlyUntil: "2027-01-15",         // dopo questa data scatta il prezzo "late"
  tiers:  [{ id:"mem", early:520, late:620 }, …],
  addons: [{ id:"lab", price:150 }, …]
};
```

Gli `id` collegano il prezzo al testo in `reg.tiers.<id>` e `reg.add.<id>` di ogni lingua.
Aggiungendo una tariffa, aggiungi il testo corrispondente in **tutte** le lingue.

## Flusso di iscrizione

4 step: **Biglietto → Dati → Pagamento → Conferma**, con riepilogo sticky che ricalcola il totale in tempo reale.
Validazione lato client su campi obbligatori, formato email, corrispondenza delle due email e consensi GDPR.

⚠️ **Il pagamento è simulato.** Nessun dato lascia il browser e nessuna transazione viene eseguita.
Per andare in produzione servono tre agganci:

1. **Backend** — `completeBooking()` in `app.js` deve fare POST di `state` + dati del form a un endpoint server.
2. **Pagamento** — il server crea una Checkout Session (Stripe/Mollie/Adyen) e restituisce l'URL di redirect.
   I prezzi vanno ricalcolati **lato server**: `PRICING` è pubblico e modificabile dal browser.
3. **Conferma** — webhook del provider → invio email con fattura e QR del badge, scrittura su database.

Da valutare anche: capienza reale dei wetlab (24 posti), verifica dello status di socio EEBA,
validazione partita IVA (VIES) e conservazione dei dati a norma GDPR.

## Note sui contenuti

Testi introduttivi, tema, sede, date e recapiti della segreteria derivano dalla pagina ufficiale EEBA.
Sono invece **indicativi e da confermare** con il Comitato Organizzatore:

- il dettaglio orario delle sessioni nel programma
- le tariffe e le date di early bird / cancellazione
- le scadenze per gli abstract
- le risposte delle FAQ
- i relatori (segnaposto "TBA" in attesa delle conferme)

## Da fare prima del lancio

- [ ] Sostituire i contenuti indicativi con quelli approvati
- [ ] Foto della sede e ritratti dei relatori al posto dei segnaposto SVG
- [ ] Logo EEBA ufficiale al posto del simbolo generato
- [ ] Backend pagamenti + email transazionali
- [ ] Pagine Privacy / Condizioni / Cookie e banner di consenso
- [ ] Meta OG e Twitter card con immagine di anteprima
- [ ] Analytics e URL definitivo nei link canonici
