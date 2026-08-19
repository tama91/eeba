# Migrazioni

**`schema/schema.sql` è sempre lo stato corrente.** Un'installazione nuova esegue
schema + seed e parte già aggiornata: non deve applicare nessuna migrazione.

**Le migrazioni servono a portare avanti un database già esistente.** Si applicano
in ordine, una volta sola per database, con `npm run db:migrate`.

Non si possono applicare sopra `schema.sql`: la 003, per esempio, legge la colonna
`diet` che nello schema corrente non esiste più. Non è un difetto — è la differenza
fra "come si costruisce oggi" e "come ci si arriva da ieri".

`npm run db:migrate` le lancia tutte in sequenza: va bene la prima volta, ma
rilanciarlo dopo che sono state applicate fallisce, perché una migrazione legge
colonne che essa stessa ha rimosso. **È il comportamento voluto**: se fosse
"ripetibile" ignorando l'errore, la seconda esecuzione sovrascriverebbe le
allergie già raccolte con dei vuoti. Meglio un errore rumoroso che una perdita
silenziosa. Per applicarne una sola: `npm run db:migrate:003`.

I test le provano su una ricostruzione della forma vecchia della tabella
(gruppo *Migrazioni su un database preesistente* in `tests/api.test.mjs`),
verificando che i dati finiscano dove devono e che rilanciarle non rompa niente.

| File | Cosa fa |
|---|---|
| `001-flexible-days-theme.sql` | Toglie il limite di 3 giornate, aggiunge palette, logo e impostazioni derivate |
| `002-payments.sql` | Metodi di pagamento, riferimenti al processore, registro degli eventi |
| `003-meals.sql` | Sostituisce il campo libero sulle esigenze alimentari con scelta del menu e allergie con consenso esplicito |
| `004-sections.sql` | Ordine e visibilità delle sezioni della home, e destinazione del pulsante «Invia un abstract» |

## Quando ne aggiungi una

1. Scrivila idempotente: ricrea le tabelle invece di usare `ALTER TABLE ADD COLUMN`,
   che non è ripetibile.
2. Aggiorna anche `schema.sql`, così le installazioni nuove nascono già corrette.
3. Aggiungila a `db:migrate` in `package.json` e all'elenco qui sopra.
