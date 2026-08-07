/* ==========================================================================
   EEBA 2027 — catalogo dei messaggi di errore del backoffice

   Chi userà questa interfaccia è una segreteria, non chi l'ha scritta. Un
   messaggio come "UNIQUE constraint failed: meals.code" è corretto e inutile:
   dice cosa è successo dentro il database, non cosa fare adesso.

   Ogni voce ha due parti, seguendo la struttura raccomandata da Nielsen Norman
   Group e dal design system di GOV.UK:

     t  cos'è successo, in una frase, senza gergo e senza colpevolizzare
     w  cosa fare adesso — è la parte che fa la differenza, e va sempre scritta

   Regole che ho seguito nello scrivere questi testi:
   · niente "errore", "non valido", "fallito" come prima parola
   · niente nomi di tabelle, colonne, codici HTTP o termini tecnici
   · si dà per scontato che chi legge non sappia com'è fatto il programma
   · dove serve, si dice esplicitamente che i dati non sono andati persi
   · si dà del "tu", come nel resto del backoffice

   Il testo tecnico non sparisce: resta nel riquadro "Dettagli tecnici", chiuso,
   da copiare quando serve segnalare un problema.
   ========================================================================== */

const ERRORS = {

  /* ---------------------------------------------------------- accesso ---- */
  AUTH_REQUIRED: {
    t: "La sessione è scaduta",
    w: "Per sicurezza l'accesso si chiude dopo dodici ore. Accedi di nuovo: quello che avevi già salvato è al sicuro."
  },
  AUTH_BAD_CREDENTIALS: {
    t: "Email o password non corrispondono",
    w: "Controlla di aver scritto bene l'indirizzo e riprova. Se non ricordi la password, chiedi a un amministratore di reimpostarla."
  },
  AUTH_TOO_MANY: {
    t: "Troppi tentativi di accesso",
    w: "Aspetta un quarto d'ora e riprova. Il blocco è automatico e serve a proteggere l'account da chi prova a indovinare la password."
  },
  AUTH_FIELDS_MISSING: {
    t: "Mancano email o password",
    w: "Compila entrambi i campi e riprova."
  },
  AUTH_PASSWORD_SHORT: {
    t: "La password è troppo corta",
    w: "Servono almeno dieci caratteri. Una frase che ricordi facilmente va benissimo e regge meglio di una parola con simboli strani."
  },
  AUTH_PASSWORD_WRONG: {
    t: "La password attuale non è quella giusta",
    w: "Riscrivila e riprova. Se non la ricordi, un amministratore può assegnartene una nuova."
  },
  SETUP_DONE: {
    t: "L'account amministratore esiste già",
    w: "La creazione del primo account si fa una volta sola. Accedi con le credenziali esistenti."
  },
  DIAG_CLOSED: {
    t: "La diagnostica non è più disponibile",
    w: "Serviva solo prima del primo accesso e si è chiusa da sola. Non è un problema."
  },

  /* --------------------------------------------------------- permessi ---- */
  PERM_INSUFFICIENT: {
    t: "Il tuo profilo non permette questa modifica",
    w: "Puoi consultare i dati ma non cambiarli. Se ti serve, chiedi a un amministratore di ampliare i tuoi permessi."
  },
  PERM_ADMIN_ONLY: {
    t: "Questa sezione è riservata agli amministratori",
    w: "Chiedi a chi gestisce gli account di occuparsene, oppure di darti il profilo di amministratore."
  },
  PERM_ADMIN_DELETE: {
    t: "Le iscrizioni può eliminarle solo un amministratore",
    w: "Se l'iscrizione va annullata, puoi intanto cambiarne lo stato in «Annullata»: resta nell'elenco ma non conta più nei totali."
  },
  PERM_SELF_ROLE: {
    t: "Non puoi togliere i permessi a te stesso",
    w: "È una protezione: se lo facessi, nessuno potrebbe più gestire gli account. Chiedi a un altro amministratore di modificarti il profilo."
  },
  PERM_SELF_DISABLE: {
    t: "Non puoi disattivare il tuo account",
    w: "Rimarresti chiuso fuori. Se devi lasciare il progetto, fallo fare a un altro amministratore."
  },
  PERM_SELF_DELETE: {
    t: "Non puoi eliminare il tuo account",
    w: "Come sopra: deve farlo un altro amministratore, così qualcuno resta con le chiavi."
  },
  ROLE_INVALID: {
    t: "Quel profilo non esiste",
    w: "Scegli fra Amministratore, Redattore e Sola lettura."
  },
  ORIGIN_BLOCKED: {
    t: "La richiesta non è partita da questa pagina",
    w: "Ricarica il backoffice e riprova. Se succede di nuovo, chiudi la scheda e riaprila da capo."
  },

  /* -------------------------------------------------------- contenuti ---- */
  DUPLICATE: {
    t: "Esiste già un elemento con questo codice",
    w: "I codici devono essere unici. Controlla l'elenco più in basso: probabilmente l'hai già aggiunto. Se serve modificarlo, apri quello esistente invece di crearne un altro."
  },
  USER_DUPLICATE: {
    t: "Questo indirizzo email è già registrato",
    w: "Ogni persona ha un account solo. Cerca l'indirizzo nell'elenco degli utenti: se c'è ma è disattivato, riattivalo invece di crearne uno nuovo."
  },
  FIELD_REQUIRED: {
    t: "Manca un dato obbligatorio",
    w: "Torna al modulo e compila il campo evidenziato."
  },
  VALUE_NOT_ALLOWED: {
    t: "Uno dei valori non è fra quelli ammessi",
    w: "Controlla i campi con un elenco a tendina: probabilmente ne è rimasto uno vuoto o con un valore vecchio."
  },
  STILL_IN_USE: {
    t: "L'elemento è collegato ad altri dati",
    w: "Non si può rimuovere finché qualcosa lo usa. Se non ti serve più, puoi sospenderlo invece di eliminarlo: sparisce dal sito e resta nello storico."
  },
  NOTHING_TO_SAVE: {
    t: "Non c'è niente da salvare",
    w: "Non risulta nessuna modifica rispetto a prima. Se pensavi di averne fatte, controlla di aver premuto invio nei campi di testo."
  },
  SETTING_INVALID: {
    t: "Questo valore non va bene",
    w: "Controlla il formato: le date si scrivono anno-mese-giorno, i colori iniziano con il cancelletto, le lingue sono sigle di due lettere separate da virgola."
  },
  ENDPOINT_UNKNOWN: {
    t: "Questa funzione non esiste",
    w: "Probabilmente il backoffice è rimasto aperto durante un aggiornamento. Ricarica la pagina."
  },

  /* -------------------------------------------------------- iscrizioni --- */
  REG_CLOSED: {
    t: "Le iscrizioni sono chiuse",
    w: "Le puoi riaprire da Impostazioni, alla voce «iscrizioni aperte»."
  },
  REG_CONSENT_MISSING: {
    t: "Mancano i consensi obbligatori",
    w: "Senza l'accettazione delle condizioni e del trattamento dei dati l'iscrizione non può essere registrata."
  },
  REG_ALLERGY_CONSENT: {
    t: "Le allergie richiedono un consenso a parte",
    w: "Riguardano la salute, quindi servono un'autorizzazione esplicita. Spunta la casella sotto il campo, oppure lascialo vuoto."
  },
  REG_EMAIL_INVALID: {
    t: "L'indirizzo email non sembra scritto bene",
    w: "Controlla che ci siano la chiocciola e il punto, per esempio nome@ospedale.it"
  },
  REG_FIELD_MISSING: {
    t: "Manca un dato necessario",
    w: "Compila il campo evidenziato e riprova."
  },
  REG_TIER_INVALID: {
    t: "Questa tariffa non è più disponibile",
    w: "Potrebbe essere stata sospesa mentre compilavi. Ricarica la pagina e scegli fra quelle attive."
  },
  REF_NOT_FOUND: {
    t: "Nessuna iscrizione con questo riferimento",
    w: "Controlla il codice: sono nove caratteri, per esempio EEBA27-4K2P9A. Se l'iscrizione è stata eliminata, il codice non è più valido."
  },
  SOLD_OUT_ADDON: {
    t: "I posti per questa opzione sono esauriti",
    w: "La capienza si imposta da Tariffe, extra e menu. Se puoi accettare qualcuno in più, alzala lì."
  },
  SOLD_OUT_TIER: {
    t: "I posti per questa tariffa sono esauriti",
    w: "La capienza si imposta da Tariffe, extra e menu."
  },

  /* --------------------------------------------------------- pagamenti --- */
  PAY_NO_METHOD: {
    t: "Serve almeno un metodo di pagamento attivo",
    w: "Se li spegni tutti nessuno può iscriversi. Lasciane acceso almeno uno, per esempio il bonifico."
  },
  PREVIEW_ONLY: {
    t: "Questa funzione esiste solo in modalità anteprima",
    w: "Con i pagamenti attivi il checkout simulato è disattivato di proposito, per evitare che qualcuno si dichiari pagato senza pagare."
  },
  WEBHOOK_BAD_SIGNATURE: {
    t: "Il messaggio non arriva davvero dal servizio di pagamento",
    w: "È un messaggio automatico e non richiede il tuo intervento. Se si ripete spesso, il codice di firma su Stripe potrebbe non corrispondere a quello configurato."
  },

  /* --------------------------------------------------------- di sistema -- */
  SERVER_ERROR: {
    t: "Qualcosa non ha funzionato",
    w: "Riprova fra qualche istante. Se succede di nuovo, apri i dettagli tecnici qui sotto, copiali e mandali a chi cura il sito: contengono quello che serve per capire.",
    report: true
  },
  DB_NOT_CONFIGURED: {
    t: "Il sito non è collegato al database",
    w: "È un problema di configurazione, non qualcosa che puoi risolvere da qui. Segnalalo a chi cura il sito.",
    report: true
  },
  DB_OUT_OF_DATE: {
    t: "Il database non è aggiornato",
    w: "Il programma si aspetta una struttura più recente di quella presente. Va applicato un aggiornamento: segnalalo a chi cura il sito.",
    report: true
  },
  PASSWORD_HASH_FAILED: {
    t: "Non è stato possibile proteggere la password",
    w: "L'account non è stato creato. Riprova; se si ripete, segnalalo a chi cura il sito.",
    report: true
  },
  USER_CREATE_FAILED: {
    t: "L'account non è stato creato",
    w: "Riprova. Se si ripete, apri i dettagli tecnici e segnalali.",
    report: true
  },
  BODY_UNREADABLE: {
    t: "I dati inviati non sono arrivati in modo leggibile",
    w: "Di solito è un problema momentaneo di connessione. Riprova."
  },

  SVG_INVALID: {
    t: "Quello non sembra codice SVG",
    w: "Deve iniziare con <svg. Se hai un file, aprilo con un editor di testo e copia tutto il contenuto; se hai un'immagine online, usa invece il campo dell'indirizzo."
  },

  /* Usato quando non c'è rete o il server non risponde affatto. */
  NETWORK: {
    t: "Non riesco a raggiungere il server",
    w: "Controlla la connessione e riprova. Quello che hai scritto è ancora nella pagina: non ricaricare, o lo perderesti."
  }
};

/* Restituisce sempre qualcosa di sensato, anche per un codice mai visto: un
   messaggio generico è meglio di una schermata muta o di un codice a nudo. */
function errorText(code, fallback) {
  if (code && ERRORS[code]) return { code, ...ERRORS[code] };
  return {
    code: code || "SCONOSCIUTO",
    t: "Qualcosa non ha funzionato",
    w: fallback
      ? `Il server ha risposto: «${fallback}». Se non è chiaro, copia i dettagli tecnici e segnalali a chi cura il sito.`
      : "Riprova fra qualche istante. Se si ripete, copia i dettagli tecnici e segnalali a chi cura il sito.",
    report: true
  };
}

if (typeof module !== "undefined") module.exports = { ERRORS, errorText };
