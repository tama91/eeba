# Pagamenti — come funziona e come si attiva

Oggi il sito è in **modalità anteprima**: chi si iscrive vede l'intero percorso di
pagamento, ma il checkout è simulato e non viene incassato nulla. Serve a far
approvare l'esperienza prima di collegare soldi veri.

---

## Come funziona

### I due tipi di metodo

**Immediati** — carta, Bancontact, iDEAL, PayPal, Revolut Pay. Passano dal
processore: l'iscritto paga subito e l'iscrizione diventa `paid` da sola.

**Differiti** — bonifico SEPA e fattura all'ente. Non passano da nessun
processore: l'iscrizione resta `pending` e la segreteria la segna pagata a mano
quando il denaro arriva.

Per un congresso medico i differiti sono spesso la quota maggiore, perché paga
l'ospedale e non la persona. Non toglierli quando attivi Stripe.

### Il percorso

```
iscrizione salvata (pending)
      │
      ├── metodo differito ──→ resta pending, la segreteria conferma a mano
      │
      └── metodo immediato ──→ sessione di checkout ──→ pagina del processore
                                                              │
                    pagina /pagamento.html ←── ritorno browser │
                                                              │
                              stato scritto qui ←── WEBHOOK ───┘
```

**Lo stato "pagato" lo scrive solo il webhook.** Il ritorno del browser sulla
pagina di successo non conta: basta cambiare l'indirizzo per fingerlo. La pagina
di ritorno chiede lo stato al server e, se il webhook non è ancora arrivato,
riprova per qualche secondo.

### Cosa protegge cosa

| Rischio | Difesa |
|---|---|
| Prezzo manomesso dal browser | L'importo è ricalcolato dal server e preso dall'iscrizione salvata |
| Falso "ho pagato" | Solo un webhook con firma HMAC valida cambia lo stato |
| Webhook rigiocato da terzi | La firma include un timestamp: oltre 5 minuti viene rifiutata |
| Doppio addebito | `idempotency-key` sulla creazione della sessione, legata al riferimento |
| Webhook ritentato da Stripe | Ogni `event_id` viene elaborato una volta sola |
| Rimborso che riapre un posto | `charge.refunded` porta a `refunded`, non a `pending` |
| Checkout simulato lasciato acceso | Rifiuta di funzionare se la modalità non è `preview` |

Tutto questo è verificato da `npm test` — gruppo "Webhook — firma e idempotenza".

---

## Attivare Stripe

### 1. Account e metodi

Su [dashboard.stripe.com](https://dashboard.stripe.com):

1. Crea l'account, intestato all'ente che deve incassare (qui: EEBA).
2. Completa la verifica dell'identità e collega il conto bancario.
3. **Settings → Payment methods**: attiva carta, Bancontact, iDEAL, PayPal e
   Revolut Pay. Alcuni richiedono un'approvazione che può metterci qualche giorno.

Bancontact è il metodo più usato in Belgio e iDEAL nei Paesi Bassi: per un
congresso a Lovanio contano più di Revolut.

### 2. Chiavi

Le chiavi **non vanno nel database e non vanno nel backoffice**: chiunque abbia
il ruolo redattore può leggere il database, e non deve poter leggere le
credenziali con cui si incassa. Vivono nei secret del Worker, dove non si
rileggono più dopo l'inserimento:

```bash
cd ~/Documents/GitHub/eeba
npx wrangler secret put STRIPE_SECRET_KEY       # sk_test_… all'inizio
npx wrangler secret put STRIPE_WEBHOOK_SECRET   # whsec_… dal punto 3
```

### 3. Webhook

Su Stripe, **Developers → Webhooks → Add endpoint**:

- URL: `https://eeba.tamabase.app/api/payments/webhook/stripe`
- Eventi: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`

Stripe mostra un *signing secret* `whsec_…`: è quello del comando sopra.

L'URL lo trovi già pronto da copiare nel backoffice, in **Pagamenti**.

### 4. Prova in test

Backoffice → **Pagamenti** → modalità **Test**, poi salva.

Fai un'iscrizione vera sul sito e paga con le carte di prova di Stripe:

| Carta | Cosa succede |
|---|---|
| `4242 4242 4242 4242` | pagamento riuscito |
| `4000 0000 0000 9995` | fondi insufficienti, rifiutata |
| `4000 0025 0000 3155` | richiede autenticazione 3D Secure |

Scadenza qualsiasi data futura, CVC qualsiasi.

Cosa deve succedere: l'iscrizione compare nel backoffice come **Pagata** entro
pochi secondi, e in **Pagamenti → eventi** compare il webhook ricevuto. Se resta
in attesa, il webhook non sta arrivando: controlla l'URL e il signing secret.

### 5. Passaggio in produzione

1. Sostituisci i due secret con quelli di produzione (`sk_live_…` e il `whsec_…`
   dell'endpoint creato in modalità live — sono endpoint distinti).
2. Backoffice → Pagamenti → modalità **Attivo**.
3. Fai un'iscrizione reale da 1 € e poi rimborsala da Stripe, per verificare che
   anche il rimborso torni indietro nel backoffice.

---

## Quello che manca ancora

- [ ] **Email transazionali.** Oggi nessuno riceve niente: chi paga vede solo il
      codice a schermo. È la lacuna più visibile per l'iscritto e va colmata prima
      di aprire le iscrizioni. Serve un servizio (Resend, Postmark, MailChannels)
      e i modelli in quattro lingue.
- [ ] **Fatture.** Il flusso `inv` raccoglie la partita IVA ma non emette niente.
      Va deciso se le fatture le fa la segreteria dal proprio gestionale o se
      collegare Stripe Invoicing.
- [ ] **Rimborsi dal backoffice.** Oggi si fanno da Stripe e il webhook aggiorna
      il sito. Un pulsante nella scheda dell'iscritto sarebbe più comodo.
- [ ] **Riconciliazione dei bonifici.** Restano manuali. Con volumi alti si può
      leggere l'estratto conto, ma non credo ne valga la pena.

## Due questioni non tecniche

**Chi intesta l'account incassa e risponde.** La segreteria EEBA è a Venezia,
l'evento è in Belgio.

**IVA.** Per l'accesso a eventi, in UE l'imposta si applica dove si tiene
l'evento. Non sono un consulente fiscale: è una cosa da chiarire con il
commercialista dell'associazione prima di emettere la prima fattura, non dopo.
