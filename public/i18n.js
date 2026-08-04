/* ==========================================================================
   EEBA 2027 — Dizionario multilingua
   Per aggiungere una lingua: duplica un blocco, traduci i valori, e aggiungi
   la voce corrispondente in LANGS. Le chiavi NON vanno mai tradotte.
   ========================================================================== */

const LANGS = [
  { code: "en", label: "English",    short: "EN" },
  { code: "it", label: "Italiano",   short: "IT" },
  { code: "nl", label: "Nederlands", short: "NL" },
  { code: "fr", label: "Français",   short: "FR" }
];

const I18N = {

/* ======================== ENGLISH ======================== */
en: {
  meta: { title: "EEBA 2027 — XXXVIII Annual Meeting · Leuven, 8–10 April 2027",
          desc: "The XXXVIII Annual Meeting of the European Eye Bank Association. University Hall, Leuven, Belgium. Register now." },
  nav: { about:"About", programme:"Programme", speakers:"Speakers", venue:"Venue",
         register:"Registration", abstracts:"Abstracts", faq:"FAQ", contact:"Contact" },
  btn: { register:"Register", programme:"See programme", abstract:"Submit an abstract",
         back:"Back", next:"Continue", pay:"Proceed to payment", newreg:"New registration",
         addcal:"Add to calendar", directions:"Get directions", all:"View all" },

  hero: {
    live:"Registration open",
    dates:"8–10 April 2027",
    city:"Leuven · Belgium",
    t1:"Eye banking,", t2:"from theory", t3:"to day one.",
    sub:"The XXXVIII Annual Meeting of the European Eye Bank Association, hosted with KU Leuven and University Hospital Leuven. Three days, four months before the EU SoHO Regulation becomes binding.",
  },
  count: { d:"Days", h:"Hours", m:"Min", s:"Sec", over:"The meeting has begun" },
  ticker: ["XXXVIII EEBA Annual Meeting","University Hall · Leuven","Symposia · Workshops · Wetlabs","EU SoHO Regulation readiness","Abstract deadline 15 Dec 2026","Early bird until 15 Jan 2027","In collaboration with KU Leuven"],

  about: {
    eye:"About the meeting", n:"01",
    t1:"A working meeting,", t2:"not a showcase.",
    lead:"The EEBA Annual Meeting is the dedicated platform for the latest innovations in eye banking, and the place where European eye banks compare practice, not just slides.",
    p1:"Over three days, participants engage with a rich scientific programme: symposia, workshops, keynote lectures, free oral and poster presentations, wetlabs and an industry-sponsored session.",
    p2:"Beyond the scientific content, the meeting offers a rare environment to connect with peers, share expertise and discuss best practices in eye banking and corneal transplantation.",
    c1t:"Scientific programme", c1d:"Symposia, keynotes, free papers and posters across three focused days.",
    c2t:"Hands-on wetlabs", c2d:"Limited-capacity practical sessions on preparation, evaluation and tissue handling.",
    c3t:"Regulatory clinic", c3d:"Compliance hurdles, final technical guidelines and 'day one' readiness under SoHO.",
    c4t:"Peer network", c4d:"Eye bankers, clinicians, researchers and industry partners from across Europe and beyond."
  },
  stats: { a:"Days", ad:"of programme, 8–10 April 2027",
           b:"Countries", bd:"represented in the EEBA network",
           c:"Sessions", cd:"symposia, workshops and wetlabs",
           d:"Months", dd:"until SoHO becomes legally binding" },

  focus: {
    eye:"Meeting theme", n:"02",
    t1:"From the ", t2:"New Scenario", t3:" to day one readiness.",
    lead:"EEBA 2026 introduced us to the 'New Scenario' of the EU SoHO Regulation. EEBA 2027 shifts the focus from theory to immediate application.",
    p1:"Set to take place just four months before the Regulation becomes legally binding in August 2027, this meeting serves as the essential final briefing.",
    p2:"We move beyond general overviews to address specific compliance hurdles, final technical guidelines, and the practical 'day one' readiness required for every eye bank in Europe.",
    l1:"Specific compliance hurdles, bank by bank",
    l2:"Final technical guidelines and how to read them",
    l3:"Documentation, traceability and vigilance in practice",
    l4:"What 'day one' actually looks like in August 2027"
  },

  prog: {
    eye:"Programme", n:"03",
    t1:"Three days,", t2:"one working agenda.",
    lead:"Provisional structure. The detailed scientific programme is published as sessions are confirmed by the Organising Committee.",
    d1:"Day 1", d1d:"Thu 8 April", d2:"Day 2", d2d:"Fri 9 April", d3:"Day 3", d3d:"Sat 10 April",
    tagKey:"Keynote", tagLab:"Wetlab", tagSoc:"Social", tagSym:"Symposium", tagFree:"Free papers", tagInd:"Industry", tagWs:"Workshop",
    day1:[
      {t:"08:30", h:"Registration & welcome coffee", p:"Badge collection, delegate pack, exhibition opens."},
      {t:"10:00", h:"Wetlab session A", p:"Tissue preparation and evaluation. Limited capacity, pre-booking required.", tag:"lab"},
      {t:"13:00", h:"Light lunch & poster walk", p:"Poster area opens with authors present."},
      {t:"14:30", h:"Opening ceremony", p:"Welcome from the EEBA President and the Local Organising Committee."},
      {t:"15:15", h:"Opening keynote — Eye banking under SoHO", p:"Setting the frame for the three days ahead.", tag:"key"},
      {t:"16:30", h:"Symposium I — Regulatory readiness", p:"Compliance hurdles and the final technical guidelines.", tag:"sym"},
      {t:"19:00", h:"Welcome reception", p:"University Hall. Included in all delegate registrations.", tag:"soc"}
    ],
    day2:[
      {t:"09:00", h:"Symposium II — Donor selection & screening", p:"Evolving criteria, serology and risk assessment.", tag:"sym"},
      {t:"10:45", h:"Free papers I", p:"Selected oral presentations from submitted abstracts.", tag:"free"},
      {t:"12:15", h:"Industry-sponsored session", p:"Technology and process innovation from EEBA partners.", tag:"ind"},
      {t:"14:00", h:"Workshop — Quality systems & traceability", p:"Practical documentation, deviations and vigilance.", tag:"ws"},
      {t:"15:45", h:"Free papers II & poster session", p:"Moderated poster discussion with award shortlist."},
      {t:"17:00", h:"EEBA General Assembly", p:"Members only. Reports, elections and the year ahead."},
      {t:"20:00", h:"Gala dinner", p:"Optional add-on. Historic venue in central Leuven.", tag:"soc"}
    ],
    day3:[
      {t:"09:00", h:"Wetlab session B", p:"Repeat of session A for a second cohort.", tag:"lab"},
      {t:"09:30", h:"Symposium III — Corneal transplantation outcomes", p:"Registry data, graft survival and clinical feedback loops.", tag:"sym"},
      {t:"11:15", h:"Keynote — What day one demands", p:"The practical checklist for August 2027.", tag:"key"},
      {t:"12:15", h:"Best practice exchange", p:"Short case reports from banks across the network."},
      {t:"13:30", h:"Awards & closing session", p:"Best abstract and best poster awards, handover to EEBA 2028."},
      {t:"14:15", h:"Farewell lunch", p:"Included. End of the scientific programme."}
    ]
  },

  spk: {
    eye:"Speakers", n:"04",
    t1:"Faculty", t2:"to be announced.",
    lead:"The Organising Committee is finalising the faculty. Confirmed speakers will be published here as invitations are accepted — the placeholders below show how the section will look.",
    r1:"Keynote lecture", r2:"Symposium chair", r3:"Regulatory session", r4:"Wetlab faculty",
    note:"Are you interested in contributing to the scientific programme? Submit an abstract or contact the Secretariat."
  },

  venue: {
    eye:"Venue & travel", n:"05",
    t1:"University Hall,", t2:"Leuven.",
    lead:"A 15th-century hall in the heart of a university city — thirty minutes from Brussels Airport and twenty-five from Brussels city centre.",
    badge:"University Hall · Naamsestraat, Leuven",
    k1:"Venue", v1:"University Hall (Universiteitshal), Naamsestraat 22, 3000 Leuven, Belgium",
    k2:"Dates", v2:"Thursday 8 – Saturday 10 April 2027",
    k3:"Host", v3:"KU Leuven and University Hospital Leuven, in collaboration with EEBA",
    k4:"Airport", v4:"Brussels Airport (BRU) — 25 min by direct train to Leuven station",
    k5:"From station", v5:"12 min on foot, or bus lines through the city centre",
    k6:"Accommodation", v6:"A list of partner hotels with delegate rates is published with the registration confirmation"
  },

  reg: {
    eye:"Registration & tickets", n:"06",
    t1:"Secure your", t2:"place.",
    lead:"Fees include access to the full scientific programme, the exhibition, coffee breaks, lunches and the welcome reception. Wetlabs and the gala dinner are optional add-ons with limited capacity.",
    s1:"Ticket", s2:"Details", s3:"Payment", s4:"Confirmed",
    early:"Early bird — until 15 January 2027",
    pickTier:"Choose your delegate category",
    tiers:{
      mem:{ h:"EEBA Member", p:"Individual or institutional member in good standing" },
      non:{ h:"Non-member", p:"Includes one year of EEBA individual membership" },
      tra:{ h:"Trainee / Nurse / Technician", p:"Proof of status required at badge collection" },
      ind:{ h:"Industry delegate", p:"Corporate and commercial partners" },
      day:{ h:"Single day pass", p:"Access to one day of your choice, add-ons excluded" }
    },
    addTitle:"Optional add-ons",
    add:{
      lab:{ h:"Wetlab session", s:"Limited to 24 places per session" },
      gal:{ h:"Gala dinner", s:"Friday 9 April, central Leuven" },
      acc:{ h:"Accompanying person", s:"Welcome reception and social programme" },
      pri:{ h:"Printed programme", s:"Collected at the registration desk" }
    },
    formTitle:"Delegate details",
    f:{ fn:"First name", ln:"Last name", em:"Email", em2:"Confirm email", org:"Institution / Company",
        role:"Role", country:"Country", vat:"VAT / Tax number", vatHint:"Optional — for institutional invoicing",
        diet:"Dietary requirements", dietHint:"Optional — allergies, vegetarian, vegan, other",
        rolePick:"Select a role", countryPick:"Select a country",
        roles:["Eye bank director","Eye bank technician","Ophthalmologist / Surgeon","Researcher","Nurse / Coordinator","Quality / Regulatory","Industry","Other"] },
    consent1:"I accept the terms of participation and the cancellation policy.",
    consent2:"I agree to the processing of my data for the organisation of the meeting (GDPR).",
    consent3:"I would like to receive news about EEBA meetings and webinars.",
    payTitle:"Payment",
    payLead:"This prototype does not process real payments. In production this step connects to the payment provider (card, SEPA transfer or institutional invoice).",
    pm:{ card:"Credit / debit card", sepa:"SEPA bank transfer", inv:"Institutional invoice" },
    sumTitle:"Your registration",
    sumSub:"Prices in EUR, VAT included",
    sumEmpty:"Select a category to see the total",
    sumTier:"Delegate fee", sumAdd:"Add-ons", sumTot:"Total",
    sumNote:"You will receive a confirmation email with your invoice and a QR badge within a few minutes.",
    confirmT:"You're registered.",
    confirmP:"We've sent the confirmation and invoice to your email address. Your badge QR code is attached — bring it to the registration desk in Leuven.",
    confirmRef:"Booking reference",
    errReq:"This field is required", errEmail:"Enter a valid email address", errMatch:"The two email addresses don't match",
    errTier:"Please choose a delegate category", errConsent:"Please accept the required terms",
    toastAdded:"Added to your registration"
  },

  abs: {
    eye:"Call for abstracts", n:"07",
    t1:"Share what", t2:"you've learned.",
    lead:"Free oral and poster presentations are the backbone of the meeting. Abstracts are peer-reviewed by the Scientific Committee and the best contributions receive an award at the closing session.",
    d1:"Abstract submission opens", d1v:"1 September 2026",
    d2:"Submission deadline", d2v:"15 December 2026",
    d3:"Notification to authors", d3v:"31 January 2027",
    d4:"Presenter registration deadline", d4v:"28 February 2027",
    note:"Maximum 300 words, structured abstract, English only. Presenting authors must be registered delegates."
  },

  faq: {
    eye:"Practical questions", n:"09", t1:"Frequently", t2:"asked.",
    q1:"What is included in the registration fee?",
    a1:"Access to the full scientific programme and exhibition, delegate pack, coffee breaks, lunches on all programme days and the welcome reception on Thursday evening. Wetlabs, the gala dinner and accompanying-person access are optional add-ons.",
    q2:"Can I register on site?",
    a2:"Yes, subject to availability, at the on-site rate. Wetlabs and the gala dinner almost always sell out in advance, so we strongly recommend booking those online.",
    q3:"What is the cancellation policy?",
    a3:"Full refund minus a handling fee until 15 February 2027, 50% until 15 March 2027, no refund afterwards. Registrations are transferable to another delegate from the same institution at any time, free of charge.",
    q4:"Do I need a visa or an invitation letter?",
    a4:"Belgium is in the Schengen Area. If you need a visa, the Secretariat can issue a personal letter of invitation after your registration has been paid. Please allow at least eight weeks.",
    q5:"Will sessions be recorded?",
    a5:"Selected sessions are recorded and made available to registered delegates on EEBA Campus after the meeting. Wetlabs and the General Assembly are not recorded.",
    q6:"Can I get an institutional invoice?",
    a6:"Yes. Choose 'Institutional invoice' at the payment step and enter your VAT or tax number. The invoice is issued by the EEBA Secretariat in Venice and payment is due within 30 days.",
    q7:"Is the venue accessible?",
    a7:"University Hall is wheelchair accessible with a dedicated entrance and lift. Please note any accessibility requirements in the registration form so we can arrange support."
  },

  spon: { eye:"Partners", n:"08", t1:"Industry", t2:"partners.",
          lead:"The meeting is supported by the companies that build the tools eye banks work with every day. Sponsorship packages for EEBA 2027 are available from the Secretariat.",
          cta:"Become a partner" },

  band: { t:"Leuven, 8–10 April 2027.", p:"Registration is open and early-bird rates run until 15 January 2027. Wetlab and gala dinner places are limited.", cta:"Register now" },

  foot: {
    about:"The XXXVIII Annual Meeting of the European Eye Bank Association, organised in collaboration with KU Leuven and University Hospital Leuven.",
    c1:"Meeting", c2:"Attend", c3:"EEBA",
    l:{ prog:"Programme", spk:"Speakers", ven:"Venue", abs:"Abstracts",
        reg:"Registration", faq:"FAQ", trav:"Travel & hotels", spon:"Sponsorship",
        eeba:"About EEBA", mem:"Membership", meet:"Annual Meetings", camp:"EEBA Campus" },
    secr:"Secretariat", secrAddr:"European Eye Bank Association<br>Via Paccagnella 11 — Padiglione Rama<br>30174 Zelarino, Venice — Italy",
    rights:"© 2027 European Eye Bank Association. All rights reserved.",
    priv:"Privacy", terms:"Terms", cook:"Cookies",
    disc:"Demo prototype. Programme, fees and deadlines are indicative and not an official EEBA publication."
  }
},

/* ======================== ITALIANO ======================== */
it: {
  meta: { title: "EEBA 2027 — XXXVIII Congresso Annuale · Lovanio, 8–10 aprile 2027",
          desc: "Il XXXVIII Congresso Annuale della European Eye Bank Association. University Hall, Lovanio, Belgio. Iscriviti ora." },
  nav: { about:"Il congresso", programme:"Programma", speakers:"Relatori", venue:"Sede",
         register:"Iscrizione", abstracts:"Abstract", faq:"FAQ", contact:"Contatti" },
  btn: { register:"Iscriviti", programme:"Vedi il programma", abstract:"Invia un abstract",
         back:"Indietro", next:"Continua", pay:"Vai al pagamento", newreg:"Nuova iscrizione",
         addcal:"Aggiungi al calendario", directions:"Come arrivare", all:"Vedi tutto" },

  hero: {
    live:"Iscrizioni aperte",
    dates:"8–10 aprile 2027",
    city:"Lovanio · Belgio",
    t1:"Eye banking,", t2:"dalla teoria", t3:"al giorno uno.",
    sub:"Il XXXVIII Congresso Annuale della European Eye Bank Association, ospitato con KU Leuven e l'Ospedale Universitario di Lovanio. Tre giorni, quattro mesi prima che il Regolamento europeo SoHO diventi vincolante.",
  },
  count: { d:"Giorni", h:"Ore", m:"Min", s:"Sec", over:"Il congresso è iniziato" },
  ticker: ["XXXVIII Congresso EEBA","University Hall · Lovanio","Simposi · Workshop · Wetlab","Pronti per il Regolamento SoHO","Abstract entro il 15 dic 2026","Early bird fino al 15 gen 2027","In collaborazione con KU Leuven"],

  about: {
    eye:"Il congresso", n:"01",
    t1:"Un congresso di lavoro,", t2:"non una vetrina.",
    lead:"Il Congresso Annuale EEBA è la piattaforma dedicata alle ultime innovazioni nell'eye banking, e il luogo in cui le banche degli occhi europee confrontano la pratica, non solo le slide.",
    p1:"In tre giorni i partecipanti affrontano un programma scientifico denso: simposi, workshop, letture magistrali, comunicazioni orali e poster, wetlab e una sessione sponsorizzata dall'industria.",
    p2:"Oltre ai contenuti scientifici, il congresso offre un contesto raro per incontrare i colleghi, condividere competenze e discutere le best practice in eye banking e trapianto corneale.",
    c1t:"Programma scientifico", c1d:"Simposi, letture magistrali, comunicazioni libere e poster in tre giornate.",
    c2t:"Wetlab pratici", c2d:"Sessioni pratiche a posti limitati su preparazione, valutazione e gestione del tessuto.",
    c3t:"Clinica normativa", c3d:"Ostacoli di conformità, linee guida tecniche definitive e prontezza al 'giorno uno' SoHO.",
    c4t:"Rete di colleghi", c4d:"Eye banker, clinici, ricercatori e partner industriali da tutta Europa e oltre."
  },
  stats: { a:"Giorni", ad:"di programma, 8–10 aprile 2027",
           b:"Paesi", bd:"rappresentati nella rete EEBA",
           c:"Sessioni", cd:"tra simposi, workshop e wetlab",
           d:"Mesi", dd:"prima che SoHO diventi vincolante" },

  focus: {
    eye:"Tema del congresso", n:"02",
    t1:"Dal ", t2:"Nuovo Scenario", t3:" alla prontezza operativa.",
    lead:"EEBA 2026 ci ha introdotti al 'Nuovo Scenario' del Regolamento europeo SoHO. EEBA 2027 sposta il fuoco dalla teoria all'applicazione immediata.",
    p1:"A soli quattro mesi dall'entrata in vigore del Regolamento, ad agosto 2027, questo congresso è il briefing finale indispensabile.",
    p2:"Andiamo oltre le panoramiche generali per affrontare ostacoli di conformità specifici, le linee guida tecniche definitive e la prontezza operativa richiesta a ogni banca degli occhi europea.",
    l1:"Ostacoli di conformità, banca per banca",
    l2:"Linee guida tecniche definitive e come leggerle",
    l3:"Documentazione, tracciabilità e vigilanza nella pratica",
    l4:"Cosa significa davvero il 'giorno uno' di agosto 2027"
  },

  prog: {
    eye:"Programma", n:"03",
    t1:"Tre giorni,", t2:"un'unica agenda di lavoro.",
    lead:"Struttura provvisoria. Il programma scientifico dettagliato viene pubblicato man mano che le sessioni sono confermate dal Comitato Organizzatore.",
    d1:"Giorno 1", d1d:"Gio 8 aprile", d2:"Giorno 2", d2d:"Ven 9 aprile", d3:"Giorno 3", d3d:"Sab 10 aprile",
    tagKey:"Lettura", tagLab:"Wetlab", tagSoc:"Sociale", tagSym:"Simposio", tagFree:"Comunicazioni", tagInd:"Industria", tagWs:"Workshop",
    day1:[
      {t:"08:30", h:"Registrazione e coffee di benvenuto", p:"Ritiro badge, kit congressuale, apertura dell'area espositiva."},
      {t:"10:00", h:"Wetlab sessione A", p:"Preparazione e valutazione del tessuto. Posti limitati, prenotazione obbligatoria.", tag:"lab"},
      {t:"13:00", h:"Light lunch e visita ai poster", p:"Apertura dell'area poster con gli autori presenti."},
      {t:"14:30", h:"Cerimonia di apertura", p:"Saluto del Presidente EEBA e del Comitato Organizzatore locale."},
      {t:"15:15", h:"Lettura inaugurale — L'eye banking sotto SoHO", p:"L'inquadramento dei tre giorni successivi.", tag:"key"},
      {t:"16:30", h:"Simposio I — Prontezza normativa", p:"Ostacoli di conformità e linee guida tecniche definitive.", tag:"sym"},
      {t:"19:00", h:"Cocktail di benvenuto", p:"University Hall. Incluso in tutte le iscrizioni delegato.", tag:"soc"}
    ],
    day2:[
      {t:"09:00", h:"Simposio II — Selezione e screening del donatore", p:"Criteri in evoluzione, sierologia e valutazione del rischio.", tag:"sym"},
      {t:"10:45", h:"Comunicazioni libere I", p:"Presentazioni orali selezionate tra gli abstract inviati.", tag:"free"},
      {t:"12:15", h:"Sessione sponsorizzata dall'industria", p:"Innovazione tecnologica e di processo dai partner EEBA.", tag:"ind"},
      {t:"14:00", h:"Workshop — Sistemi qualità e tracciabilità", p:"Documentazione pratica, non conformità e vigilanza.", tag:"ws"},
      {t:"15:45", h:"Comunicazioni libere II e sessione poster", p:"Discussione moderata dei poster con la rosa dei premi."},
      {t:"17:00", h:"Assemblea Generale EEBA", p:"Riservata ai soci. Relazioni, elezioni e programma dell'anno."},
      {t:"20:00", h:"Cena di gala", p:"Opzione a pagamento. Sede storica nel centro di Lovanio.", tag:"soc"}
    ],
    day3:[
      {t:"09:00", h:"Wetlab sessione B", p:"Replica della sessione A per un secondo gruppo.", tag:"lab"},
      {t:"09:30", h:"Simposio III — Esiti del trapianto corneale", p:"Dati di registro, sopravvivenza del lembo e ritorno clinico.", tag:"sym"},
      {t:"11:15", h:"Lettura — Cosa richiede il giorno uno", p:"La checklist operativa per agosto 2027.", tag:"key"},
      {t:"12:15", h:"Scambio di best practice", p:"Casi brevi presentati dalle banche della rete."},
      {t:"13:30", h:"Premi e sessione di chiusura", p:"Premi miglior abstract e miglior poster, passaggio a EEBA 2028."},
      {t:"14:15", h:"Pranzo di commiato", p:"Incluso. Fine del programma scientifico."}
    ]
  },

  spk: {
    eye:"Relatori", n:"04",
    t1:"Faculty", t2:"in via di definizione.",
    lead:"Il Comitato Organizzatore sta completando la faculty. I relatori confermati saranno pubblicati qui man mano che accettano l'invito — i segnaposto qui sotto mostrano come apparirà la sezione.",
    r1:"Lettura magistrale", r2:"Moderatore di simposio", r3:"Sessione normativa", r4:"Faculty wetlab",
    note:"Vuoi contribuire al programma scientifico? Invia un abstract o contatta la Segreteria."
  },

  venue: {
    eye:"Sede e viaggio", n:"05",
    t1:"University Hall,", t2:"Lovanio.",
    lead:"Un'aula del Quattrocento nel cuore di una città universitaria — trenta minuti dall'aeroporto di Bruxelles e venticinque dal centro della capitale.",
    badge:"University Hall · Naamsestraat, Lovanio",
    k1:"Sede", v1:"University Hall (Universiteitshal), Naamsestraat 22, 3000 Leuven, Belgio",
    k2:"Date", v2:"Da giovedì 8 a sabato 10 aprile 2027",
    k3:"Ospita", v3:"KU Leuven e Ospedale Universitario di Lovanio, in collaborazione con EEBA",
    k4:"Aeroporto", v4:"Brussels Airport (BRU) — 25 min di treno diretto per la stazione di Leuven",
    k5:"Dalla stazione", v5:"12 minuti a piedi, oppure autobus attraverso il centro",
    k6:"Alloggio", v6:"L'elenco degli hotel convenzionati con tariffa congressuale è allegato alla conferma di iscrizione"
  },

  reg: {
    eye:"Iscrizione e biglietti", n:"06",
    t1:"Assicurati", t2:"il posto.",
    lead:"La quota comprende l'accesso all'intero programma scientifico, all'area espositiva, coffee break, pranzi e cocktail di benvenuto. Wetlab e cena di gala sono opzioni a posti limitati.",
    s1:"Biglietto", s2:"Dati", s3:"Pagamento", s4:"Confermato",
    early:"Early bird — fino al 15 gennaio 2027",
    pickTier:"Scegli la categoria delegato",
    tiers:{
      mem:{ h:"Socio EEBA", p:"Socio individuale o istituzionale in regola" },
      non:{ h:"Non socio", p:"Include un anno di quota associativa individuale EEBA" },
      tra:{ h:"Specializzando / Infermiere / Tecnico", p:"Documentazione richiesta al ritiro del badge" },
      ind:{ h:"Delegato industria", p:"Partner aziendali e commerciali" },
      day:{ h:"Ingresso giornaliero", p:"Accesso a una giornata a scelta, opzioni escluse" }
    },
    addTitle:"Opzioni aggiuntive",
    add:{
      lab:{ h:"Sessione wetlab", s:"Massimo 24 posti per sessione" },
      gal:{ h:"Cena di gala", s:"Venerdì 9 aprile, centro di Lovanio" },
      acc:{ h:"Accompagnatore", s:"Cocktail di benvenuto e programma sociale" },
      pri:{ h:"Programma stampato", s:"Ritiro al desk registrazioni" }
    },
    formTitle:"Dati del delegato",
    f:{ fn:"Nome", ln:"Cognome", em:"Email", em2:"Conferma email", org:"Ente / Azienda",
        role:"Ruolo", country:"Paese", vat:"Partita IVA / Codice fiscale", vatHint:"Facoltativo — per la fatturazione istituzionale",
        diet:"Esigenze alimentari", dietHint:"Facoltativo — allergie, vegetariano, vegano, altro",
        rolePick:"Seleziona un ruolo", countryPick:"Seleziona un paese",
        roles:["Direttore banca degli occhi","Tecnico banca degli occhi","Oculista / Chirurgo","Ricercatore","Infermiere / Coordinatore","Qualità / Regolatorio","Industria","Altro"] },
    consent1:"Accetto le condizioni di partecipazione e la politica di cancellazione.",
    consent2:"Acconsento al trattamento dei miei dati per l'organizzazione del congresso (GDPR).",
    consent3:"Desidero ricevere notizie sui congressi e i webinar EEBA.",
    payTitle:"Pagamento",
    payLead:"Questo prototipo non elabora pagamenti reali. In produzione questo passaggio si collega al provider di pagamento (carta, bonifico SEPA o fattura istituzionale).",
    pm:{ card:"Carta di credito / debito", sepa:"Bonifico SEPA", inv:"Fattura istituzionale" },
    sumTitle:"La tua iscrizione",
    sumSub:"Prezzi in EUR, IVA inclusa",
    sumEmpty:"Seleziona una categoria per vedere il totale",
    sumTier:"Quota delegato", sumAdd:"Opzioni", sumTot:"Totale",
    sumNote:"Riceverai entro pochi minuti un'email di conferma con la fattura e il badge QR.",
    confirmT:"Iscrizione completata.",
    confirmP:"Abbiamo inviato conferma e fattura al tuo indirizzo email. Il QR del badge è in allegato — portalo al desk registrazioni a Lovanio.",
    confirmRef:"Codice prenotazione",
    errReq:"Campo obbligatorio", errEmail:"Inserisci un indirizzo email valido", errMatch:"I due indirizzi email non coincidono",
    errTier:"Scegli una categoria delegato", errConsent:"Accetta le condizioni obbligatorie",
    toastAdded:"Aggiunto alla tua iscrizione"
  },

  abs: {
    eye:"Call for abstract", n:"07",
    t1:"Condividi", t2:"quello che hai imparato.",
    lead:"Le comunicazioni orali e i poster sono la spina dorsale del congresso. Gli abstract sono valutati dal Comitato Scientifico e i contributi migliori ricevono un premio nella sessione di chiusura.",
    d1:"Apertura invio abstract", d1v:"1 settembre 2026",
    d2:"Scadenza invio", d2v:"15 dicembre 2026",
    d3:"Comunicazione agli autori", d3v:"31 gennaio 2027",
    d4:"Iscrizione del presentatore", d4v:"28 febbraio 2027",
    note:"Massimo 300 parole, abstract strutturato, solo in inglese. Gli autori presentatori devono essere delegati iscritti."
  },

  faq: {
    eye:"Domande pratiche", n:"09", t1:"Domande", t2:"frequenti.",
    q1:"Cosa comprende la quota di iscrizione?",
    a1:"Accesso all'intero programma scientifico e all'area espositiva, kit congressuale, coffee break, pranzi in tutte le giornate di programma e cocktail di benvenuto del giovedì sera. Wetlab, cena di gala e accesso accompagnatori sono opzioni a pagamento.",
    q2:"Posso iscrivermi in sede?",
    a2:"Sì, salvo disponibilità, alla tariffa on-site. Wetlab e cena di gala si esauriscono quasi sempre in anticipo, quindi consigliamo caldamente di prenotarli online.",
    q3:"Qual è la politica di cancellazione?",
    a3:"Rimborso totale meno le spese di gestione fino al 15 febbraio 2027, 50% fino al 15 marzo 2027, nessun rimborso successivamente. L'iscrizione è sempre trasferibile a un altro delegato dello stesso ente, gratuitamente.",
    q4:"Serve un visto o una lettera d'invito?",
    a4:"Il Belgio è nell'area Schengen. Se ti serve un visto, la Segreteria può emettere una lettera d'invito personale dopo il pagamento dell'iscrizione. Prevedi almeno otto settimane.",
    q5:"Le sessioni saranno registrate?",
    a5:"Alcune sessioni sono registrate e rese disponibili ai delegati iscritti su EEBA Campus dopo il congresso. Wetlab e Assemblea Generale non sono registrati.",
    q6:"Posso avere una fattura istituzionale?",
    a6:"Sì. Scegli 'Fattura istituzionale' al passaggio del pagamento e inserisci la partita IVA. La fattura è emessa dalla Segreteria EEBA di Venezia con pagamento a 30 giorni.",
    q7:"La sede è accessibile?",
    a7:"University Hall è accessibile in sedia a rotelle, con ingresso dedicato e ascensore. Segnala eventuali esigenze di accessibilità nel modulo di iscrizione così possiamo organizzare il supporto."
  },

  spon: { eye:"Partner", n:"08", t1:"Partner", t2:"industriali.",
          lead:"Il congresso è sostenuto dalle aziende che costruiscono gli strumenti con cui le banche degli occhi lavorano ogni giorno. I pacchetti di sponsorizzazione EEBA 2027 sono disponibili presso la Segreteria.",
          cta:"Diventa partner" },

  band: { t:"Lovanio, 8–10 aprile 2027.", p:"Le iscrizioni sono aperte e la tariffa early bird è valida fino al 15 gennaio 2027. I posti per wetlab e cena di gala sono limitati.", cta:"Iscriviti ora" },

  foot: {
    about:"Il XXXVIII Congresso Annuale della European Eye Bank Association, organizzato in collaborazione con KU Leuven e l'Ospedale Universitario di Lovanio.",
    c1:"Congresso", c2:"Partecipa", c3:"EEBA",
    l:{ prog:"Programma", spk:"Relatori", ven:"Sede", abs:"Abstract",
        reg:"Iscrizione", faq:"FAQ", trav:"Viaggio e hotel", spon:"Sponsorizzazioni",
        eeba:"Chi è EEBA", mem:"Associarsi", meet:"Congressi annuali", camp:"EEBA Campus" },
    secr:"Segreteria", secrAddr:"European Eye Bank Association<br>Via Paccagnella 11 — Padiglione Rama<br>30174 Zelarino, Venezia — Italia",
    rights:"© 2027 European Eye Bank Association. Tutti i diritti riservati.",
    priv:"Privacy", terms:"Condizioni", cook:"Cookie",
    disc:"Prototipo dimostrativo. Programma, quote e scadenze sono indicativi e non costituiscono una pubblicazione ufficiale EEBA."
  }
},

/* ======================== NEDERLANDS ======================== */
nl: {
  meta: { title: "EEBA 2027 — XXXVIIIe Jaarvergadering · Leuven, 8–10 april 2027",
          desc: "De XXXVIIIe Jaarvergadering van de European Eye Bank Association. Universiteitshal, Leuven, België. Schrijf u nu in." },
  nav: { about:"Over", programme:"Programma", speakers:"Sprekers", venue:"Locatie",
         register:"Inschrijving", abstracts:"Abstracts", faq:"FAQ", contact:"Contact" },
  btn: { register:"Inschrijven", programme:"Bekijk programma", abstract:"Abstract indienen",
         back:"Terug", next:"Verder", pay:"Naar betaling", newreg:"Nieuwe inschrijving",
         addcal:"Aan agenda toevoegen", directions:"Route", all:"Alles bekijken" },

  hero: {
    live:"Inschrijving open",
    dates:"8–10 april 2027",
    city:"Leuven · België",
    t1:"Oogbanken,", t2:"van theorie", t3:"naar dag één.",
    sub:"De XXXVIIIe Jaarvergadering van de European Eye Bank Association, georganiseerd met KU Leuven en UZ Leuven. Drie dagen, vier maanden voordat de Europese SoHO-verordening bindend wordt.",
  },
  count: { d:"Dagen", h:"Uren", m:"Min", s:"Sec", over:"De vergadering is begonnen" },
  ticker: ["XXXVIIIe EEBA Jaarvergadering","Universiteitshal · Leuven","Symposia · Workshops · Wetlabs","Klaar voor de SoHO-verordening","Abstracts tot 15 dec 2026","Early bird tot 15 jan 2027","In samenwerking met KU Leuven"],

  about: {
    eye:"Over de vergadering", n:"01",
    t1:"Een werkvergadering,", t2:"geen etalage.",
    lead:"De EEBA Jaarvergadering is hét platform voor de nieuwste innovaties in de oogbankwereld, en de plek waar Europese oogbanken hun praktijk vergelijken, niet alleen hun dia's.",
    p1:"In drie dagen krijgen deelnemers een rijk wetenschappelijk programma: symposia, workshops, keynotelezingen, vrije voordrachten en posters, wetlabs en een door de industrie gesponsorde sessie.",
    p2:"Naast de wetenschappelijke inhoud biedt de vergadering een zeldzame omgeving om collega's te ontmoeten, expertise te delen en best practices in oogbanken en corneatransplantatie te bespreken.",
    c1t:"Wetenschappelijk programma", c1d:"Symposia, keynotes, vrije voordrachten en posters over drie dagen.",
    c2t:"Praktische wetlabs", c2d:"Praktijksessies met beperkte capaciteit over preparatie, evaluatie en weefselbehandeling.",
    c3t:"Regelgevingskliniek", c3d:"Nalevingsdrempels, definitieve technische richtlijnen en 'dag één'-gereedheid onder SoHO.",
    c4t:"Collegiaal netwerk", c4d:"Oogbankmedewerkers, clinici, onderzoekers en industriepartners uit heel Europa en daarbuiten."
  },
  stats: { a:"Dagen", ad:"programma, 8–10 april 2027",
           b:"Landen", bd:"vertegenwoordigd in het EEBA-netwerk",
           c:"Sessies", cd:"symposia, workshops en wetlabs",
           d:"Maanden", dd:"tot SoHO juridisch bindend wordt" },

  focus: {
    eye:"Thema", n:"02",
    t1:"Van het ", t2:"Nieuwe Scenario", t3:" naar gereedheid op dag één.",
    lead:"EEBA 2026 introduceerde het 'Nieuwe Scenario' van de Europese SoHO-verordening. EEBA 2027 verschuift de focus van theorie naar directe toepassing.",
    p1:"Deze vergadering vindt plaats slechts vier maanden voordat de verordening in augustus 2027 juridisch bindend wordt, en vormt daarmee de essentiële eindbriefing.",
    p2:"We gaan verder dan algemene overzichten en behandelen concrete nalevingsdrempels, definitieve technische richtlijnen en de praktische 'dag één'-gereedheid die van elke Europese oogbank wordt verwacht.",
    l1:"Concrete nalevingsdrempels, bank per bank",
    l2:"Definitieve technische richtlijnen en hoe ze te lezen",
    l3:"Documentatie, traceerbaarheid en waakzaamheid in de praktijk",
    l4:"Hoe 'dag één' er in augustus 2027 werkelijk uitziet"
  },

  prog: {
    eye:"Programma", n:"03",
    t1:"Drie dagen,", t2:"één werkagenda.",
    lead:"Voorlopige structuur. Het gedetailleerde wetenschappelijke programma wordt gepubliceerd zodra sessies door het organiserend comité zijn bevestigd.",
    d1:"Dag 1", d1d:"Do 8 april", d2:"Dag 2", d2d:"Vr 9 april", d3:"Dag 3", d3d:"Za 10 april",
    tagKey:"Keynote", tagLab:"Wetlab", tagSoc:"Sociaal", tagSym:"Symposium", tagFree:"Vrije voordracht", tagInd:"Industrie", tagWs:"Workshop",
    day1:[
      {t:"08:30", h:"Registratie & welkomstkoffie", p:"Badge afhalen, deelnemerspakket, opening expositie."},
      {t:"10:00", h:"Wetlab sessie A", p:"Weefselpreparatie en -evaluatie. Beperkte capaciteit, vooraf reserveren.", tag:"lab"},
      {t:"13:00", h:"Lichte lunch & posterwandeling", p:"Posterruimte opent met auteurs aanwezig."},
      {t:"14:30", h:"Openingsceremonie", p:"Welkom door de EEBA-voorzitter en het lokale organiserend comité."},
      {t:"15:15", h:"Openingskeynote — Oogbanken onder SoHO", p:"Het kader voor de komende drie dagen.", tag:"key"},
      {t:"16:30", h:"Symposium I — Gereedheid voor regelgeving", p:"Nalevingsdrempels en definitieve technische richtlijnen.", tag:"sym"},
      {t:"19:00", h:"Welkomstreceptie", p:"Universiteitshal. Inbegrepen bij alle deelnemersinschrijvingen.", tag:"soc"}
    ],
    day2:[
      {t:"09:00", h:"Symposium II — Donorselectie & screening", p:"Evoluerende criteria, serologie en risicobeoordeling.", tag:"sym"},
      {t:"10:45", h:"Vrije voordrachten I", p:"Geselecteerde mondelinge presentaties uit ingediende abstracts.", tag:"free"},
      {t:"12:15", h:"Door industrie gesponsorde sessie", p:"Technologie- en procesinnovatie van EEBA-partners.", tag:"ind"},
      {t:"14:00", h:"Workshop — Kwaliteitssystemen & traceerbaarheid", p:"Praktische documentatie, afwijkingen en waakzaamheid.", tag:"ws"},
      {t:"15:45", h:"Vrije voordrachten II & postersessie", p:"Begeleide posterdiscussie met de shortlist voor de prijzen."},
      {t:"17:00", h:"EEBA Algemene Vergadering", p:"Alleen voor leden. Verslagen, verkiezingen en het komende jaar."},
      {t:"20:00", h:"Galadiner", p:"Optionele aanvulling. Historische locatie in het centrum van Leuven.", tag:"soc"}
    ],
    day3:[
      {t:"09:00", h:"Wetlab sessie B", p:"Herhaling van sessie A voor een tweede groep.", tag:"lab"},
      {t:"09:30", h:"Symposium III — Uitkomsten van corneatransplantatie", p:"Registergegevens, transplantaatoverleving en klinische terugkoppeling.", tag:"sym"},
      {t:"11:15", h:"Keynote — Wat dag één vereist", p:"De praktische checklist voor augustus 2027.", tag:"key"},
      {t:"12:15", h:"Uitwisseling van best practices", p:"Korte casusrapporten van banken uit het netwerk."},
      {t:"13:30", h:"Prijzen & slotsessie", p:"Prijzen beste abstract en beste poster, overdracht aan EEBA 2028."},
      {t:"14:15", h:"Afscheidslunch", p:"Inbegrepen. Einde van het wetenschappelijk programma."}
    ]
  },

  spk: {
    eye:"Sprekers", n:"04",
    t1:"Faculty", t2:"wordt aangekondigd.",
    lead:"Het organiserend comité stelt de faculty samen. Bevestigde sprekers worden hier gepubliceerd zodra uitnodigingen zijn aanvaard — de plaatshouders hieronder tonen hoe deze sectie eruit zal zien.",
    r1:"Keynotelezing", r2:"Symposiumvoorzitter", r3:"Sessie regelgeving", r4:"Wetlab faculty",
    note:"Wilt u bijdragen aan het wetenschappelijk programma? Dien een abstract in of neem contact op met het secretariaat."
  },

  venue: {
    eye:"Locatie & reizen", n:"05",
    t1:"Universiteitshal,", t2:"Leuven.",
    lead:"Een vijftiende-eeuwse hal in het hart van een universiteitsstad — dertig minuten van Brussels Airport en vijfentwintig van het centrum van Brussel.",
    badge:"Universiteitshal · Naamsestraat, Leuven",
    k1:"Locatie", v1:"Universiteitshal, Naamsestraat 22, 3000 Leuven, België",
    k2:"Data", v2:"Donderdag 8 tot zaterdag 10 april 2027",
    k3:"Gastheer", v3:"KU Leuven en UZ Leuven, in samenwerking met EEBA",
    k4:"Luchthaven", v4:"Brussels Airport (BRU) — 25 min met de directe trein naar station Leuven",
    k5:"Vanaf het station", v5:"12 minuten te voet, of buslijnen door het centrum",
    k6:"Overnachting", v6:"Een lijst met partnerhotels en deelnemerstarieven wordt bij de inschrijvingsbevestiging meegestuurd"
  },

  reg: {
    eye:"Inschrijving & tickets", n:"06",
    t1:"Verzeker u", t2:"van een plaats.",
    lead:"De deelnamekosten omvatten toegang tot het volledige wetenschappelijke programma, de expositie, koffiepauzes, lunches en de welkomstreceptie. Wetlabs en het galadiner zijn optioneel met beperkte capaciteit.",
    s1:"Ticket", s2:"Gegevens", s3:"Betaling", s4:"Bevestigd",
    early:"Early bird — tot 15 januari 2027",
    pickTier:"Kies uw deelnemerscategorie",
    tiers:{
      mem:{ h:"EEBA-lid", p:"Individueel of institutioneel lid in goede standing" },
      non:{ h:"Niet-lid", p:"Inclusief één jaar individueel EEBA-lidmaatschap" },
      tra:{ h:"Assistent / Verpleegkundige / Technicus", p:"Bewijs van status vereist bij badge-afhaling" },
      ind:{ h:"Industriedeelnemer", p:"Zakelijke en commerciële partners" },
      day:{ h:"Dagticket", p:"Toegang tot één dag naar keuze, opties niet inbegrepen" }
    },
    addTitle:"Optionele aanvullingen",
    add:{
      lab:{ h:"Wetlab-sessie", s:"Maximaal 24 plaatsen per sessie" },
      gal:{ h:"Galadiner", s:"Vrijdag 9 april, centrum Leuven" },
      acc:{ h:"Begeleider", s:"Welkomstreceptie en sociaal programma" },
      pri:{ h:"Gedrukt programma", s:"Af te halen bij de registratiebalie" }
    },
    formTitle:"Deelnemersgegevens",
    f:{ fn:"Voornaam", ln:"Achternaam", em:"E-mail", em2:"Bevestig e-mail", org:"Instelling / Bedrijf",
        role:"Functie", country:"Land", vat:"Btw-nummer", vatHint:"Optioneel — voor institutionele facturatie",
        diet:"Dieetwensen", dietHint:"Optioneel — allergieën, vegetarisch, veganistisch, anders",
        rolePick:"Kies een functie", countryPick:"Kies een land",
        roles:["Directeur oogbank","Technicus oogbank","Oogarts / Chirurg","Onderzoeker","Verpleegkundige / Coördinator","Kwaliteit / Regelgeving","Industrie","Anders"] },
    consent1:"Ik aanvaard de deelnamevoorwaarden en het annuleringsbeleid.",
    consent2:"Ik ga akkoord met de verwerking van mijn gegevens voor de organisatie van de vergadering (AVG).",
    consent3:"Ik ontvang graag nieuws over EEBA-vergaderingen en webinars.",
    payTitle:"Betaling",
    payLead:"Dit prototype verwerkt geen echte betalingen. In productie maakt deze stap verbinding met de betaalprovider (kaart, SEPA-overschrijving of institutionele factuur).",
    pm:{ card:"Krediet- / debetkaart", sepa:"SEPA-overschrijving", inv:"Institutionele factuur" },
    sumTitle:"Uw inschrijving",
    sumSub:"Prijzen in EUR, incl. btw",
    sumEmpty:"Kies een categorie om het totaal te zien",
    sumTier:"Deelnamekosten", sumAdd:"Aanvullingen", sumTot:"Totaal",
    sumNote:"U ontvangt binnen enkele minuten een bevestigingsmail met uw factuur en een QR-badge.",
    confirmT:"U bent ingeschreven.",
    confirmP:"We hebben de bevestiging en factuur naar uw e-mailadres gestuurd. Uw badge-QR-code zit erbij — neem die mee naar de registratiebalie in Leuven.",
    confirmRef:"Boekingsreferentie",
    errReq:"Dit veld is verplicht", errEmail:"Voer een geldig e-mailadres in", errMatch:"De twee e-mailadressen komen niet overeen",
    errTier:"Kies een deelnemerscategorie", errConsent:"Aanvaard de verplichte voorwaarden",
    toastAdded:"Toegevoegd aan uw inschrijving"
  },

  abs: {
    eye:"Oproep voor abstracts", n:"07",
    t1:"Deel wat", t2:"u geleerd heeft.",
    lead:"Vrije voordrachten en posters vormen de ruggengraat van de vergadering. Abstracts worden beoordeeld door het wetenschappelijk comité en de beste bijdragen krijgen een prijs tijdens de slotsessie.",
    d1:"Indiening opent", d1v:"1 september 2026",
    d2:"Uiterste indieningsdatum", d2v:"15 december 2026",
    d3:"Bericht aan auteurs", d3v:"31 januari 2027",
    d4:"Inschrijving presenterende auteur", d4v:"28 februari 2027",
    note:"Maximaal 300 woorden, gestructureerd abstract, uitsluitend in het Engels. Presenterende auteurs moeten ingeschreven deelnemers zijn."
  },

  faq: {
    eye:"Praktische vragen", n:"09", t1:"Veelgestelde", t2:"vragen.",
    q1:"Wat is inbegrepen bij de deelnamekosten?",
    a1:"Toegang tot het volledige wetenschappelijke programma en de expositie, deelnemerspakket, koffiepauzes, lunches op alle programmadagen en de welkomstreceptie op donderdagavond. Wetlabs, het galadiner en toegang voor begeleiders zijn optioneel.",
    q2:"Kan ik mij ter plaatse inschrijven?",
    a2:"Ja, afhankelijk van beschikbaarheid, tegen het on-site tarief. Wetlabs en het galadiner zijn vrijwel altijd vooraf uitverkocht, dus we raden sterk aan die online te boeken.",
    q3:"Wat is het annuleringsbeleid?",
    a3:"Volledige terugbetaling minus administratiekosten tot 15 februari 2027, 50% tot 15 maart 2027, daarna geen terugbetaling. Inschrijvingen zijn altijd kosteloos overdraagbaar aan een andere deelnemer van dezelfde instelling.",
    q4:"Heb ik een visum of uitnodigingsbrief nodig?",
    a4:"België ligt in de Schengenzone. Als u een visum nodig heeft, kan het secretariaat na betaling van uw inschrijving een persoonlijke uitnodigingsbrief opstellen. Houd rekening met minstens acht weken.",
    q5:"Worden de sessies opgenomen?",
    a5:"Geselecteerde sessies worden opgenomen en na afloop beschikbaar gesteld aan ingeschreven deelnemers op EEBA Campus. Wetlabs en de Algemene Vergadering worden niet opgenomen.",
    q6:"Kan ik een institutionele factuur krijgen?",
    a6:"Ja. Kies 'Institutionele factuur' bij de betaalstap en vul uw btw-nummer in. De factuur wordt uitgegeven door het EEBA-secretariaat in Venetië, betaalbaar binnen 30 dagen.",
    q7:"Is de locatie toegankelijk?",
    a7:"De Universiteitshal is rolstoeltoegankelijk met een aparte ingang en lift. Vermeld eventuele toegankelijkheidswensen in het inschrijvingsformulier zodat wij ondersteuning kunnen regelen."
  },

  spon: { eye:"Partners", n:"08", t1:"Industriële", t2:"partners.",
          lead:"De vergadering wordt ondersteund door de bedrijven die de instrumenten bouwen waarmee oogbanken dagelijks werken. Sponsorpakketten voor EEBA 2027 zijn verkrijgbaar bij het secretariaat.",
          cta:"Word partner" },

  band: { t:"Leuven, 8–10 april 2027.", p:"De inschrijving is open en de early-birdtarieven gelden tot 15 januari 2027. Plaatsen voor wetlab en galadiner zijn beperkt.", cta:"Nu inschrijven" },

  foot: {
    about:"De XXXVIIIe Jaarvergadering van de European Eye Bank Association, georganiseerd in samenwerking met KU Leuven en UZ Leuven.",
    c1:"Vergadering", c2:"Deelnemen", c3:"EEBA",
    l:{ prog:"Programma", spk:"Sprekers", ven:"Locatie", abs:"Abstracts",
        reg:"Inschrijving", faq:"FAQ", trav:"Reizen & hotels", spon:"Sponsoring",
        eeba:"Over EEBA", mem:"Lidmaatschap", meet:"Jaarvergaderingen", camp:"EEBA Campus" },
    secr:"Secretariaat", secrAddr:"European Eye Bank Association<br>Via Paccagnella 11 — Padiglione Rama<br>30174 Zelarino, Venetië — Italië",
    rights:"© 2027 European Eye Bank Association. Alle rechten voorbehouden.",
    priv:"Privacy", terms:"Voorwaarden", cook:"Cookies",
    disc:"Demonstratieprototype. Programma, tarieven en deadlines zijn indicatief en vormen geen officiële EEBA-publicatie."
  }
},

/* ======================== FRANÇAIS ======================== */
fr: {
  meta: { title: "EEBA 2027 — XXXVIIIe Congrès annuel · Louvain, 8–10 avril 2027",
          desc: "Le XXXVIIIe Congrès annuel de l'European Eye Bank Association. Halle universitaire, Louvain, Belgique. Inscrivez-vous." },
  nav: { about:"Le congrès", programme:"Programme", speakers:"Intervenants", venue:"Lieu",
         register:"Inscription", abstracts:"Résumés", faq:"FAQ", contact:"Contact" },
  btn: { register:"S'inscrire", programme:"Voir le programme", abstract:"Soumettre un résumé",
         back:"Retour", next:"Continuer", pay:"Aller au paiement", newreg:"Nouvelle inscription",
         addcal:"Ajouter au calendrier", directions:"Itinéraire", all:"Tout voir" },

  hero: {
    live:"Inscriptions ouvertes",
    dates:"8–10 avril 2027",
    city:"Louvain · Belgique",
    t1:"Banques d'yeux,", t2:"de la théorie", t3:"au jour un.",
    sub:"Le XXXVIIIe Congrès annuel de l'European Eye Bank Association, accueilli avec la KU Leuven et l'Hôpital universitaire de Louvain. Trois jours, quatre mois avant que le règlement européen SoHO ne devienne contraignant.",
  },
  count: { d:"Jours", h:"Heures", m:"Min", s:"Sec", over:"Le congrès a commencé" },
  ticker: ["XXXVIIIe Congrès EEBA","Halle universitaire · Louvain","Symposiums · Ateliers · Wetlabs","Prêts pour le règlement SoHO","Résumés avant le 15 déc. 2026","Early bird jusqu'au 15 janv. 2027","En collaboration avec la KU Leuven"],

  about: {
    eye:"Le congrès", n:"01",
    t1:"Un congrès de travail,", t2:"pas une vitrine.",
    lead:"Le congrès annuel de l'EEBA est la plateforme dédiée aux dernières innovations en matière de banques d'yeux, et le lieu où les banques européennes confrontent leurs pratiques, pas seulement leurs diapositives.",
    p1:"En trois jours, les participants suivent un programme scientifique dense : symposiums, ateliers, conférences plénières, communications orales et affichées, wetlabs et une session sponsorisée par l'industrie.",
    p2:"Au-delà du contenu scientifique, le congrès offre un cadre rare pour rencontrer ses pairs, partager son expertise et discuter des bonnes pratiques en banque d'yeux et en greffe de cornée.",
    c1t:"Programme scientifique", c1d:"Symposiums, plénières, communications libres et posters sur trois journées.",
    c2t:"Wetlabs pratiques", c2d:"Sessions pratiques à places limitées : préparation, évaluation et manipulation des tissus.",
    c3t:"Clinique réglementaire", c3d:"Obstacles de conformité, lignes directrices techniques finales et préparation au « jour un » SoHO.",
    c4t:"Réseau de pairs", c4d:"Professionnels des banques d'yeux, cliniciens, chercheurs et partenaires industriels de toute l'Europe et au-delà."
  },
  stats: { a:"Jours", ad:"de programme, 8–10 avril 2027",
           b:"Pays", bd:"représentés dans le réseau EEBA",
           c:"Sessions", cd:"symposiums, ateliers et wetlabs",
           d:"Mois", dd:"avant que SoHO ne devienne contraignant" },

  focus: {
    eye:"Thème du congrès", n:"02",
    t1:"Du ", t2:"Nouveau Scénario", t3:" à la préparation opérationnelle.",
    lead:"EEBA 2026 nous a fait découvrir le « Nouveau Scénario » du règlement européen SoHO. EEBA 2027 déplace l'attention de la théorie vers l'application immédiate.",
    p1:"Se tenant quatre mois seulement avant l'entrée en vigueur du règlement, en août 2027, ce congrès constitue le briefing final indispensable.",
    p2:"Nous dépassons les panoramas généraux pour traiter des obstacles de conformité précis, des lignes directrices techniques finales et de la préparation concrète attendue de chaque banque d'yeux européenne.",
    l1:"Obstacles de conformité, banque par banque",
    l2:"Lignes directrices techniques finales et comment les lire",
    l3:"Documentation, traçabilité et vigilance en pratique",
    l4:"À quoi ressemble vraiment le « jour un » d'août 2027"
  },

  prog: {
    eye:"Programme", n:"03",
    t1:"Trois jours,", t2:"un seul ordre du jour.",
    lead:"Structure provisoire. Le programme scientifique détaillé est publié au fur et à mesure que les sessions sont confirmées par le comité d'organisation.",
    d1:"Jour 1", d1d:"Jeu. 8 avril", d2:"Jour 2", d2d:"Ven. 9 avril", d3:"Jour 3", d3d:"Sam. 10 avril",
    tagKey:"Plénière", tagLab:"Wetlab", tagSoc:"Social", tagSym:"Symposium", tagFree:"Communications", tagInd:"Industrie", tagWs:"Atelier",
    day1:[
      {t:"08:30", h:"Accueil et café de bienvenue", p:"Retrait des badges, pochette congressiste, ouverture de l'exposition."},
      {t:"10:00", h:"Wetlab session A", p:"Préparation et évaluation des tissus. Places limitées, réservation obligatoire.", tag:"lab"},
      {t:"13:00", h:"Déjeuner léger et visite des posters", p:"Ouverture de l'espace posters, auteurs présents."},
      {t:"14:30", h:"Cérémonie d'ouverture", p:"Accueil par le Président de l'EEBA et le comité d'organisation local."},
      {t:"15:15", h:"Plénière d'ouverture — Les banques d'yeux face à SoHO", p:"Le cadre des trois journées à venir.", tag:"key"},
      {t:"16:30", h:"Symposium I — Préparation réglementaire", p:"Obstacles de conformité et lignes directrices techniques finales.", tag:"sym"},
      {t:"19:00", h:"Cocktail de bienvenue", p:"Halle universitaire. Inclus dans toutes les inscriptions congressistes.", tag:"soc"}
    ],
    day2:[
      {t:"09:00", h:"Symposium II — Sélection et dépistage du donneur", p:"Critères en évolution, sérologie et évaluation du risque.", tag:"sym"},
      {t:"10:45", h:"Communications libres I", p:"Présentations orales sélectionnées parmi les résumés soumis.", tag:"free"},
      {t:"12:15", h:"Session sponsorisée par l'industrie", p:"Innovation technologique et de process des partenaires EEBA.", tag:"ind"},
      {t:"14:00", h:"Atelier — Systèmes qualité et traçabilité", p:"Documentation pratique, écarts et vigilance.", tag:"ws"},
      {t:"15:45", h:"Communications libres II et session posters", p:"Discussion modérée des posters et sélection pour les prix."},
      {t:"17:00", h:"Assemblée générale de l'EEBA", p:"Réservée aux membres. Rapports, élections et année à venir."},
      {t:"20:00", h:"Dîner de gala", p:"Option payante. Lieu historique au centre de Louvain.", tag:"soc"}
    ],
    day3:[
      {t:"09:00", h:"Wetlab session B", p:"Reprise de la session A pour un second groupe.", tag:"lab"},
      {t:"09:30", h:"Symposium III — Résultats de la greffe de cornée", p:"Données de registre, survie du greffon et retours cliniques.", tag:"sym"},
      {t:"11:15", h:"Plénière — Ce qu'exige le jour un", p:"La liste de contrôle pratique pour août 2027.", tag:"key"},
      {t:"12:15", h:"Échange de bonnes pratiques", p:"Cas courts présentés par les banques du réseau."},
      {t:"13:30", h:"Prix et session de clôture", p:"Prix du meilleur résumé et du meilleur poster, passation à EEBA 2028."},
      {t:"14:15", h:"Déjeuner d'au revoir", p:"Inclus. Fin du programme scientifique."}
    ]
  },

  spk: {
    eye:"Intervenants", n:"04",
    t1:"Faculty", t2:"à annoncer.",
    lead:"Le comité d'organisation finalise la faculty. Les intervenants confirmés seront publiés ici au fur et à mesure des acceptations — les emplacements ci-dessous montrent l'aspect final de la section.",
    r1:"Conférence plénière", r2:"Présidence de symposium", r3:"Session réglementaire", r4:"Faculty wetlab",
    note:"Vous souhaitez contribuer au programme scientifique ? Soumettez un résumé ou contactez le secrétariat."
  },

  venue: {
    eye:"Lieu et voyage", n:"05",
    t1:"Halle universitaire,", t2:"Louvain.",
    lead:"Une halle du XVe siècle au cœur d'une ville universitaire — à trente minutes de l'aéroport de Bruxelles et vingt-cinq du centre de la capitale.",
    badge:"Halle universitaire · Naamsestraat, Louvain",
    k1:"Lieu", v1:"Halle universitaire (Universiteitshal), Naamsestraat 22, 3000 Louvain, Belgique",
    k2:"Dates", v2:"Du jeudi 8 au samedi 10 avril 2027",
    k3:"Hôtes", v3:"KU Leuven et Hôpital universitaire de Louvain, en collaboration avec l'EEBA",
    k4:"Aéroport", v4:"Brussels Airport (BRU) — 25 min en train direct jusqu'à la gare de Louvain",
    k5:"Depuis la gare", v5:"12 minutes à pied, ou lignes de bus traversant le centre",
    k6:"Hébergement", v6:"La liste des hôtels partenaires avec tarifs congressistes est jointe à la confirmation d'inscription"
  },

  reg: {
    eye:"Inscription et billets", n:"06",
    t1:"Réservez", t2:"votre place.",
    lead:"Les frais comprennent l'accès à l'ensemble du programme scientifique, à l'exposition, les pauses café, les déjeuners et le cocktail de bienvenue. Wetlabs et dîner de gala sont des options à places limitées.",
    s1:"Billet", s2:"Coordonnées", s3:"Paiement", s4:"Confirmé",
    early:"Early bird — jusqu'au 15 janvier 2027",
    pickTier:"Choisissez votre catégorie",
    tiers:{
      mem:{ h:"Membre EEBA", p:"Membre individuel ou institutionnel à jour de cotisation" },
      non:{ h:"Non-membre", p:"Comprend un an d'adhésion individuelle à l'EEBA" },
      tra:{ h:"Interne / Infirmier / Technicien", p:"Justificatif requis au retrait du badge" },
      ind:{ h:"Congressiste industrie", p:"Partenaires corporate et commerciaux" },
      day:{ h:"Pass journée", p:"Accès à une journée au choix, options non comprises" }
    },
    addTitle:"Options",
    add:{
      lab:{ h:"Session wetlab", s:"24 places maximum par session" },
      gal:{ h:"Dîner de gala", s:"Vendredi 9 avril, centre de Louvain" },
      acc:{ h:"Accompagnant", s:"Cocktail de bienvenue et programme social" },
      pri:{ h:"Programme imprimé", s:"À retirer au bureau d'accueil" }
    },
    formTitle:"Coordonnées du congressiste",
    f:{ fn:"Prénom", ln:"Nom", em:"E-mail", em2:"Confirmer l'e-mail", org:"Établissement / Entreprise",
        role:"Fonction", country:"Pays", vat:"N° de TVA", vatHint:"Facultatif — pour la facturation institutionnelle",
        diet:"Régime alimentaire", dietHint:"Facultatif — allergies, végétarien, végan, autre",
        rolePick:"Choisir une fonction", countryPick:"Choisir un pays",
        roles:["Directeur de banque d'yeux","Technicien de banque d'yeux","Ophtalmologue / Chirurgien","Chercheur","Infirmier / Coordinateur","Qualité / Réglementaire","Industrie","Autre"] },
    consent1:"J'accepte les conditions de participation et la politique d'annulation.",
    consent2:"J'accepte le traitement de mes données pour l'organisation du congrès (RGPD).",
    consent3:"Je souhaite recevoir des nouvelles des congrès et webinaires EEBA.",
    payTitle:"Paiement",
    payLead:"Ce prototype ne traite aucun paiement réel. En production, cette étape se connecte au prestataire de paiement (carte, virement SEPA ou facture institutionnelle).",
    pm:{ card:"Carte bancaire", sepa:"Virement SEPA", inv:"Facture institutionnelle" },
    sumTitle:"Votre inscription",
    sumSub:"Prix en EUR, TVA comprise",
    sumEmpty:"Choisissez une catégorie pour voir le total",
    sumTier:"Frais d'inscription", sumAdd:"Options", sumTot:"Total",
    sumNote:"Vous recevrez sous quelques minutes un e-mail de confirmation avec votre facture et un badge QR.",
    confirmT:"Vous êtes inscrit.",
    confirmP:"Nous avons envoyé la confirmation et la facture à votre adresse e-mail. Le QR de votre badge est en pièce jointe — présentez-le au bureau d'accueil à Louvain.",
    confirmRef:"Référence de réservation",
    errReq:"Ce champ est obligatoire", errEmail:"Saisissez une adresse e-mail valide", errMatch:"Les deux adresses e-mail ne correspondent pas",
    errTier:"Choisissez une catégorie", errConsent:"Veuillez accepter les conditions obligatoires",
    toastAdded:"Ajouté à votre inscription"
  },

  abs: {
    eye:"Appel à résumés", n:"07",
    t1:"Partagez ce", t2:"que vous avez appris.",
    lead:"Les communications orales et affichées sont la colonne vertébrale du congrès. Les résumés sont évalués par le comité scientifique et les meilleures contributions reçoivent un prix lors de la session de clôture.",
    d1:"Ouverture des soumissions", d1v:"1er septembre 2026",
    d2:"Date limite de soumission", d2v:"15 décembre 2026",
    d3:"Notification aux auteurs", d3v:"31 janvier 2027",
    d4:"Inscription de l'auteur présentateur", d4v:"28 février 2027",
    note:"300 mots maximum, résumé structuré, en anglais uniquement. Les auteurs présentateurs doivent être inscrits au congrès."
  },

  faq: {
    eye:"Questions pratiques", n:"09", t1:"Questions", t2:"fréquentes.",
    q1:"Que comprennent les frais d'inscription ?",
    a1:"L'accès à l'ensemble du programme scientifique et à l'exposition, la pochette congressiste, les pauses café, les déjeuners de toutes les journées et le cocktail de bienvenue du jeudi soir. Wetlabs, dîner de gala et accès accompagnant sont en option.",
    q2:"Puis-je m'inscrire sur place ?",
    a2:"Oui, sous réserve de disponibilité, au tarif sur place. Les wetlabs et le dîner de gala affichent presque toujours complet à l'avance : nous recommandons vivement de les réserver en ligne.",
    q3:"Quelle est la politique d'annulation ?",
    a3:"Remboursement intégral moins les frais de dossier jusqu'au 15 février 2027, 50 % jusqu'au 15 mars 2027, aucun remboursement ensuite. L'inscription est transférable gratuitement et à tout moment à un autre congressiste du même établissement.",
    q4:"Ai-je besoin d'un visa ou d'une lettre d'invitation ?",
    a4:"La Belgique fait partie de l'espace Schengen. Si un visa est nécessaire, le secrétariat peut délivrer une lettre d'invitation personnelle après paiement de l'inscription. Comptez au moins huit semaines.",
    q5:"Les sessions seront-elles enregistrées ?",
    a5:"Certaines sessions sont enregistrées et mises à disposition des congressistes inscrits sur EEBA Campus après le congrès. Les wetlabs et l'Assemblée générale ne sont pas enregistrés.",
    q6:"Puis-je obtenir une facture institutionnelle ?",
    a6:"Oui. Choisissez « Facture institutionnelle » à l'étape du paiement et indiquez votre numéro de TVA. La facture est émise par le secrétariat de l'EEBA à Venise, payable sous 30 jours.",
    q7:"Le lieu est-il accessible ?",
    a7:"La Halle universitaire est accessible en fauteuil roulant, avec une entrée dédiée et un ascenseur. Signalez vos besoins d'accessibilité dans le formulaire d'inscription afin que nous puissions organiser l'assistance."
  },

  spon: { eye:"Partenaires", n:"08", t1:"Partenaires", t2:"industriels.",
          lead:"Le congrès est soutenu par les entreprises qui fabriquent les outils utilisés chaque jour par les banques d'yeux. Les formules de partenariat EEBA 2027 sont disponibles auprès du secrétariat.",
          cta:"Devenir partenaire" },

  band: { t:"Louvain, 8–10 avril 2027.", p:"Les inscriptions sont ouvertes et le tarif early bird court jusqu'au 15 janvier 2027. Les places en wetlab et au dîner de gala sont limitées.", cta:"S'inscrire" },

  foot: {
    about:"Le XXXVIIIe Congrès annuel de l'European Eye Bank Association, organisé en collaboration avec la KU Leuven et l'Hôpital universitaire de Louvain.",
    c1:"Congrès", c2:"Participer", c3:"EEBA",
    l:{ prog:"Programme", spk:"Intervenants", ven:"Lieu", abs:"Résumés",
        reg:"Inscription", faq:"FAQ", trav:"Voyage et hôtels", spon:"Partenariat",
        eeba:"À propos de l'EEBA", mem:"Adhésion", meet:"Congrès annuels", camp:"EEBA Campus" },
    secr:"Secrétariat", secrAddr:"European Eye Bank Association<br>Via Paccagnella 11 — Padiglione Rama<br>30174 Zelarino, Venise — Italie",
    rights:"© 2027 European Eye Bank Association. Tous droits réservés.",
    priv:"Confidentialité", terms:"Conditions", cook:"Cookies",
    disc:"Prototype de démonstration. Programme, tarifs et échéances sont indicatifs et ne constituent pas une publication officielle de l'EEBA."
  }
}

};

/* Listino unico, indipendente dalla lingua (EUR) */
const PRICING = {
  earlyUntil: "2027-01-15",
  tiers: [
    { id:"mem", early:520, late:620 },
    { id:"non", early:680, late:780 },
    { id:"tra", early:320, late:390 },
    { id:"ind", early:950, late:1050 },
    { id:"day", early:280, late:310 }
  ],
  addons: [
    { id:"lab", price:150 },
    { id:"gal", price:95  },
    { id:"acc", price:70  },
    { id:"pri", price:15  }
  ]
};

const COUNTRIES = ["Belgium","Netherlands","France","Germany","Italy","Spain","Portugal","Austria","Switzerland","United Kingdom","Ireland","Denmark","Sweden","Norway","Finland","Poland","Czechia","Slovakia","Hungary","Slovenia","Croatia","Greece","Romania","Bulgaria","Estonia","Latvia","Lithuania","Türkiye","Israel","United States","Canada","Australia","India","Japan","Other"];
