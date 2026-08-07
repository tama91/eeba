/* ==========================================================================
   EEBA 2027 — testi legali, quattro lingue

   Stanno in un file versionato e non nel database di proposito: di
   un'informativa privacy conta poter dimostrare quale testo era pubblicato in
   una certa data, e git lo fa meglio di una tabella modificabile dal
   backoffice.

   ⚠️ BOZZE. Descrivono con precisione cosa fa il sito, ma vanno riviste da un
   professionista prima di aprire le iscrizioni: ci sono dati che possono
   rivelare salute o religione, pagamenti, e un evento in un paese diverso da
   quello dell'associazione.

   DA COMPLETARE prima della pubblicazione: LEGAL_ORG.email
   ========================================================================== */

const LEGAL_ORG = {
  name:  "European Eye Bank Association",
  addr:  "Via Paccagnella 11 — Padiglione Rama, 30174 Zelarino, Venezia, Italia",
  email: "«indirizzo da definire»",          // ← da compilare
  tel:   "+39 041 9656422",
  site:  "https://www.eeba.eu/contact/"
};

const LEGAL_UPDATED = "2026-08-07";

/* Etichette dell'interfaccia della pagina */
const LEGAL_UI = {
  draft: {
    en: "Draft — this text is being reviewed and is not yet the final version.",
    it: "Bozza — questo testo è in revisione e non è ancora la versione definitiva.",
    nl: "Concept — deze tekst wordt nog herzien en is niet definitief.",
    fr: "Brouillon — ce texte est en cours de révision et n'est pas définitif."
  },
  updated: { en: "Last updated", it: "Ultimo aggiornamento", nl: "Laatst bijgewerkt", fr: "Dernière mise à jour" },
  back:    { en: "Back to the site", it: "Torna al sito", nl: "Terug naar de site", fr: "Retour au site" },
  nav:     { privacy: { en:"Privacy", it:"Privacy", nl:"Privacy", fr:"Confidentialité" },
             cookies: { en:"Cookies", it:"Cookie", nl:"Cookies", fr:"Cookies" },
             terms:   { en:"Terms", it:"Condizioni", nl:"Voorwaarden", fr:"Conditions" } }
};

const LEGAL = {

/* ====================================================== PRIVACY ========= */
privacy: {
  title: { en:"Privacy notice", it:"Informativa privacy",
           nl:"Privacyverklaring", fr:"Politique de confidentialité" },
  sections: [
    { h: { en:"Who processes your data", it:"Chi tratta i tuoi dati",
           nl:"Wie uw gegevens verwerkt", fr:"Qui traite vos données" },
      body: {
        en:`<p>The controller is <b>${LEGAL_ORG.name}</b>, ${LEGAL_ORG.addr}.<br>
            Email ${LEGAL_ORG.email} — tel. ${LEGAL_ORG.tel}</p>
            <p>This notice covers this website and the registration process for the
            XXXVIII Annual Meeting held in Leuven on 8–10 April 2027.</p>`,
        it:`<p>Il titolare del trattamento è <b>${LEGAL_ORG.name}</b>, ${LEGAL_ORG.addr}.<br>
            Email ${LEGAL_ORG.email} — tel. ${LEGAL_ORG.tel}</p>
            <p>Questa informativa riguarda questo sito e la procedura di iscrizione al
            XXXVIII Congresso Annuale che si tiene a Lovanio dall'8 al 10 aprile 2027.</p>`,
        nl:`<p>De verwerkingsverantwoordelijke is <b>${LEGAL_ORG.name}</b>, ${LEGAL_ORG.addr}.<br>
            E-mail ${LEGAL_ORG.email} — tel. ${LEGAL_ORG.tel}</p>
            <p>Deze verklaring geldt voor deze website en voor de inschrijving voor de
            XXXVIIIe Jaarvergadering in Leuven, 8–10 april 2027.</p>`,
        fr:`<p>Le responsable du traitement est <b>${LEGAL_ORG.name}</b>, ${LEGAL_ORG.addr}.<br>
            E-mail ${LEGAL_ORG.email} — tél. ${LEGAL_ORG.tel}</p>
            <p>Cette politique concerne ce site et la procédure d'inscription au
            XXXVIIIe Congrès annuel, à Louvain du 8 au 10 avril 2027.</p>` } },

    { h: { en:"What we collect and why", it:"Quali dati raccogliamo e perché",
           nl:"Welke gegevens en waarom", fr:"Quelles données et pourquoi" },
      body: {
        en:`<table class="lg__t"><thead><tr><th>Data</th><th>Purpose</th><th>Legal basis</th></tr></thead><tbody>
            <tr><td>First and last name, email, institution, role, country</td><td>Managing your registration and admission to the meeting</td><td>Performance of a contract</td></tr>
            <tr><td>VAT or tax number, billing details</td><td>Issuing invoices and keeping accounting records</td><td>Legal obligation</td></tr>
            <tr><td>Meal preference (a choice from a menu)</td><td>Planning how many of each dish to prepare</td><td>Performance of a contract</td></tr>
            <tr><td>Allergies and intolerances, if you tell us</td><td>Food safety at the meeting</td><td>Your explicit consent, asked separately</td></tr>
            <tr><td>Email address for the newsletter</td><td>News about EEBA meetings and webinars</td><td>Your consent, withdrawable at any time</td></tr>
            <tr><td>Technical logs (IP, browser, time)</td><td>Security of the service and abuse prevention</td><td>Legitimate interest</td></tr>
            </tbody></table>
            <p>Providing the data in the first two rows is necessary to register. Everything else is optional.</p>`,
        it:`<table class="lg__t"><thead><tr><th>Dati</th><th>Finalità</th><th>Base giuridica</th></tr></thead><tbody>
            <tr><td>Nome e cognome, email, ente, ruolo, paese</td><td>Gestione dell'iscrizione e accesso al congresso</td><td>Esecuzione di un contratto</td></tr>
            <tr><td>Partita IVA o codice fiscale, dati di fatturazione</td><td>Emissione delle fatture e scritture contabili</td><td>Obbligo di legge</td></tr>
            <tr><td>Preferenza per i pasti (scelta fra opzioni di menu)</td><td>Sapere quanti piatti preparare di ciascun tipo</td><td>Esecuzione di un contratto</td></tr>
            <tr><td>Allergie e intolleranze, se ce le segnali</td><td>Sicurezza alimentare durante il congresso</td><td>Tuo consenso esplicito, richiesto a parte</td></tr>
            <tr><td>Email per la newsletter</td><td>Notizie sui congressi e i webinar EEBA</td><td>Tuo consenso, revocabile in ogni momento</td></tr>
            <tr><td>Log tecnici (indirizzo IP, browser, orario)</td><td>Sicurezza del servizio e prevenzione degli abusi</td><td>Legittimo interesse</td></tr>
            </tbody></table>
            <p>Conferire i dati delle prime due righe è necessario per iscriversi. Tutto il resto è facoltativo.</p>`,
        nl:`<table class="lg__t"><thead><tr><th>Gegevens</th><th>Doel</th><th>Grondslag</th></tr></thead><tbody>
            <tr><td>Voor- en achternaam, e-mail, instelling, functie, land</td><td>Beheer van de inschrijving en toegang tot de vergadering</td><td>Uitvoering van een overeenkomst</td></tr>
            <tr><td>Btw-nummer, factuurgegevens</td><td>Facturatie en boekhouding</td><td>Wettelijke verplichting</td></tr>
            <tr><td>Maaltijdvoorkeur (keuze uit een menu)</td><td>Bepalen hoeveel er van elk gerecht nodig is</td><td>Uitvoering van een overeenkomst</td></tr>
            <tr><td>Allergieën en intoleranties, als u ze doorgeeft</td><td>Voedselveiligheid tijdens de vergadering</td><td>Uw uitdrukkelijke toestemming, apart gevraagd</td></tr>
            <tr><td>E-mailadres voor de nieuwsbrief</td><td>Nieuws over EEBA-vergaderingen en webinars</td><td>Uw toestemming, altijd intrekbaar</td></tr>
            <tr><td>Technische logs (IP, browser, tijdstip)</td><td>Beveiliging en misbruikpreventie</td><td>Gerechtvaardigd belang</td></tr>
            </tbody></table>
            <p>De gegevens in de eerste twee rijen zijn nodig om in te schrijven. De rest is optioneel.</p>`,
        fr:`<table class="lg__t"><thead><tr><th>Données</th><th>Finalité</th><th>Base légale</th></tr></thead><tbody>
            <tr><td>Nom, prénom, e-mail, établissement, fonction, pays</td><td>Gestion de l'inscription et accès au congrès</td><td>Exécution d'un contrat</td></tr>
            <tr><td>Numéro de TVA, données de facturation</td><td>Émission des factures et comptabilité</td><td>Obligation légale</td></tr>
            <tr><td>Préférence de repas (choix parmi des menus)</td><td>Savoir combien de plats préparer de chaque sorte</td><td>Exécution d'un contrat</td></tr>
            <tr><td>Allergies et intolérances, si vous les signalez</td><td>Sécurité alimentaire pendant le congrès</td><td>Votre consentement explicite, demandé séparément</td></tr>
            <tr><td>E-mail pour la lettre d'information</td><td>Actualités des congrès et webinaires EEBA</td><td>Votre consentement, révocable à tout moment</td></tr>
            <tr><td>Journaux techniques (IP, navigateur, horodatage)</td><td>Sécurité du service et prévention des abus</td><td>Intérêt légitime</td></tr>
            </tbody></table>
            <p>Les données des deux premières lignes sont nécessaires à l'inscription. Le reste est facultatif.</p>` } },

    { h: { en:"Meals and allergies", it:"Pasti e allergie",
           nl:"Maaltijden en allergieën", fr:"Repas et allergies" },
      body: {
        en:`<p>Choosing a menu is an order, not a statement about yourself: we know how many
            vegetarian dishes to prepare, not why you picked one. That is deliberate — a free
            text field would have collected far more than we need.</p>
            <p>Allergies are different. The kitchen has to know precisely what to avoid, so that
            information does concern your health. We ask for it separately, only from those who
            have something to report, with a consent we request explicitly. It goes to the
            caterer and is deleted right after the meeting.</p>
            <p>Both fields are optional.</p>`,
        it:`<p>Scegliere un menu è un'ordinazione, non una dichiarazione su di sé: sappiamo
            quanti piatti vegetariani preparare, non perché tu ne abbia scelto uno. È una scelta
            voluta — una casella di testo libero avrebbe raccolto molto più del necessario.</p>
            <p>Le allergie sono un'altra cosa. La cucina deve sapere con precisione cosa evitare,
            quindi quell'informazione riguarda davvero la tua salute. Te la chiediamo a parte,
            solo se hai qualcosa da segnalare, con un consenso richiesto esplicitamente. Viene
            comunicata al servizio di ristorazione e cancellata subito dopo il congresso.</p>
            <p>Entrambi i campi sono facoltativi.</p>`,
        nl:`<p>Een menu kiezen is een bestelling, geen verklaring over uzelf: wij weten hoeveel
            vegetarische gerechten nodig zijn, niet waarom u dat koos. Dat is bewust — een vrij
            tekstveld zou veel meer hebben verzameld dan nodig.</p>
            <p>Allergieën liggen anders. De keuken moet precies weten wat te vermijden, dus die
            informatie betreft wel uw gezondheid. We vragen ze apart, alleen aan wie iets te
            melden heeft, met een uitdrukkelijk gevraagde toestemming. Ze gaat naar de cateraar
            en wordt direct na de vergadering gewist.</p>
            <p>Beide velden zijn optioneel.</p>`,
        fr:`<p>Choisir un menu est une commande, pas une déclaration sur soi : nous savons
            combien de plats végétariens préparer, pas pourquoi vous en avez choisi un. C'est
            délibéré — un champ libre aurait recueilli bien plus que nécessaire.</p>
            <p>Les allergies, c'est différent. La cuisine doit savoir précisément quoi éviter :
            cette information concerne bien votre santé. Nous la demandons séparément, uniquement
            à qui a quelque chose à signaler, avec un consentement demandé explicitement. Elle
            est transmise au traiteur et supprimée juste après le congrès.</p>
            <p>Les deux champs sont facultatifs.</p>` } },

    { h: { en:"Who else sees your data", it:"Chi altro vede i tuoi dati",
           nl:"Wie uw gegevens nog meer ziet", fr:"Qui d'autre voit vos données" },
      body: {
        en:`<ul><li><b>Cloudflare</b> — hosting of the site and the database, within the European Union.</li>
            <li><b>Stripe</b> — payment processing. Stripe is based in the United States; transfers rely on the standard safeguards provided for by European law. We never see or store your card details.</li>
            <li><b>The venue and the caterer</b> in Leuven, limited to what is needed for access and meals.</li></ul>
            <p>We do not sell your data and we do not pass it to anyone for advertising.</p>`,
        it:`<ul><li><b>Cloudflare</b> — ospita il sito e il database, all'interno dell'Unione Europea.</li>
            <li><b>Stripe</b> — elabora i pagamenti. Ha sede negli Stati Uniti e il trasferimento avviene con le garanzie standard previste dalla normativa europea. I dati della tua carta non passano né restano da noi.</li>
            <li><b>La sede e il servizio di ristorazione</b> a Lovanio, limitatamente a quanto serve per l'accesso e i pasti.</li></ul>
            <p>Non vendiamo i tuoi dati e non li cediamo a nessuno per finalità pubblicitarie.</p>`,
        nl:`<ul><li><b>Cloudflare</b> — hosting van de site en de database, binnen de Europese Unie.</li>
            <li><b>Stripe</b> — betalingsverwerking. Stripe is gevestigd in de Verenigde Staten; de doorgifte gebeurt met de standaardwaarborgen van het Europese recht. Uw kaartgegevens bereiken ons nooit.</li>
            <li><b>De locatie en de cateraar</b> in Leuven, beperkt tot wat nodig is voor toegang en maaltijden.</li></ul>
            <p>We verkopen uw gegevens niet en geven ze niet door voor reclamedoeleinden.</p>`,
        fr:`<ul><li><b>Cloudflare</b> — hébergement du site et de la base de données, dans l'Union européenne.</li>
            <li><b>Stripe</b> — traitement des paiements. Stripe est établi aux États-Unis ; le transfert s'appuie sur les garanties standard prévues par le droit européen. Vos données de carte ne nous parviennent jamais.</li>
            <li><b>Le lieu et le traiteur</b> à Louvain, dans la limite de ce qui est nécessaire à l'accès et aux repas.</li></ul>
            <p>Nous ne vendons pas vos données et ne les cédons à personne à des fins publicitaires.</p>` } },

    { h: { en:"How long we keep it", it:"Per quanto tempo li conserviamo",
           nl:"Hoe lang we ze bewaren", fr:"Combien de temps nous les conservons" },
      body: {
        en:`<ul><li>Registration data: until the end of the meeting, then for the period required to handle any disputes.</li>
            <li>Invoices and accounting records: ten years, as required by law.</li>
            <li>Meal preference and allergies: deleted immediately after the meeting.</li>
            <li>Newsletter: until you unsubscribe.</li>
            <li>Technical logs: a few months.</li></ul>`,
        it:`<ul><li>Dati di iscrizione: fino alla conclusione del congresso, poi per il tempo necessario a gestire eventuali contestazioni.</li>
            <li>Fatture e scritture contabili: dieci anni, come impone la legge.</li>
            <li>Preferenza per i pasti e allergie: cancellate subito dopo il congresso.</li>
            <li>Newsletter: finché non ti disiscrivi.</li>
            <li>Log tecnici: pochi mesi.</li></ul>`,
        nl:`<ul><li>Inschrijvingsgegevens: tot het einde van de vergadering, daarna zolang nodig voor eventuele geschillen.</li>
            <li>Facturen en boekhouding: tien jaar, zoals wettelijk vereist.</li>
            <li>Maaltijdvoorkeur en allergieën: direct na de vergadering gewist.</li>
            <li>Nieuwsbrief: tot u zich uitschrijft.</li>
            <li>Technische logs: enkele maanden.</li></ul>`,
        fr:`<ul><li>Données d'inscription : jusqu'à la fin du congrès, puis le temps nécessaire au traitement d'éventuels litiges.</li>
            <li>Factures et pièces comptables : dix ans, comme l'exige la loi.</li>
            <li>Préférence de repas et allergies : supprimées juste après le congrès.</li>
            <li>Lettre d'information : jusqu'à votre désinscription.</li>
            <li>Journaux techniques : quelques mois.</li></ul>` } },

    { h: { en:"Your rights", it:"I tuoi diritti", nl:"Uw rechten", fr:"Vos droits" },
      body: {
        en:`<p>You can ask us at any time to see your data, correct it, delete it, receive a
            copy in a portable format, limit how we use it, or object to a processing based on
            legitimate interest. Where processing rests on consent, you can withdraw it without
            affecting what was lawful before.</p>
            <p>Write to ${LEGAL_ORG.email}. If you believe something is wrong you may lodge a
            complaint with your national data protection authority.</p>
            <p>We do not profile you and we take no automated decisions about you.</p>`,
        it:`<p>Puoi chiederci in qualsiasi momento di accedere ai tuoi dati, correggerli,
            cancellarli, riceverne una copia in formato portabile, limitarne l'uso, oppure
            opporti a un trattamento fondato sul legittimo interesse. Dove il trattamento si
            basa sul consenso, puoi revocarlo senza che questo tolga validità a quanto fatto
            prima.</p>
            <p>Scrivi a ${LEGAL_ORG.email}. Se ritieni che qualcosa non vada, puoi presentare
            reclamo all'autorità di controllo del tuo paese; in Italia è il Garante per la
            protezione dei dati personali.</p>
            <p>Non ti profiliamo e non prendiamo decisioni automatizzate che ti riguardano.</p>`,
        nl:`<p>U kunt ons altijd vragen uw gegevens in te zien, te corrigeren, te wissen, een
            kopie in een overdraagbaar formaat te ontvangen, het gebruik te beperken, of bezwaar
            te maken tegen een verwerking op grond van gerechtvaardigd belang. Berust de
            verwerking op toestemming, dan kunt u die intrekken zonder gevolgen voor het
            verleden.</p>
            <p>Schrijf naar ${LEGAL_ORG.email}. Meent u dat er iets misgaat, dan kunt u een
            klacht indienen bij de toezichthouder in uw land.</p>
            <p>We profileren u niet en nemen geen geautomatiseerde besluiten over u.</p>`,
        fr:`<p>Vous pouvez à tout moment nous demander d'accéder à vos données, de les corriger,
            de les effacer, d'en recevoir une copie portable, d'en limiter l'usage, ou vous
            opposer à un traitement fondé sur l'intérêt légitime. Lorsque le traitement repose
            sur le consentement, vous pouvez le retirer sans remettre en cause ce qui précède.</p>
            <p>Écrivez à ${LEGAL_ORG.email}. Si vous estimez qu'un point ne va pas, vous pouvez
            saisir l'autorité de contrôle de votre pays.</p>
            <p>Nous ne vous profilons pas et ne prenons aucune décision automatisée à votre égard.</p>` } }
  ]
},

/* ====================================================== COOKIE ========== */
cookies: {
  title: { en:"Cookies and local storage", it:"Cookie e memoria locale",
           nl:"Cookies en lokale opslag", fr:"Cookies et stockage local" },
  sections: [
    { h: { en:"The short version", it:"In breve", nl:"Kort samengevat", fr:"En bref" },
      body: {
        en:`<p>This site uses <b>no tracking or advertising cookies</b>, and no analytics.
            There is nothing to consent to, which is why you are not seeing a banner.</p>
            <p>Fonts are served from our own servers, so loading a page contacts no third party.</p>`,
        it:`<p>Questo sito <b>non usa cookie di tracciamento o pubblicitari</b>, e non ha
            strumenti di statistica. Non c'è nulla da consentire, ed è il motivo per cui non
            vedi un banner.</p>
            <p>I caratteri tipografici sono serviti dai nostri server: aprire una pagina non
            contatta nessun soggetto terzo.</p>`,
        nl:`<p>Deze site gebruikt <b>geen tracking- of advertentiecookies</b> en geen analytics.
            Er valt niets toe te staan, en daarom ziet u geen banner.</p>
            <p>Lettertypen komen van onze eigen servers: het openen van een pagina legt geen
            contact met derden.</p>`,
        fr:`<p>Ce site n'utilise <b>aucun cookie de suivi ou publicitaire</b>, ni aucun outil de
            mesure d'audience. Il n'y a rien à accepter, d'où l'absence de bandeau.</p>
            <p>Les polices sont servies depuis nos propres serveurs : ouvrir une page ne contacte
            aucun tiers.</p>` } },

    { h: { en:"What is actually stored", it:"Cosa viene effettivamente salvato",
           nl:"Wat er echt wordt opgeslagen", fr:"Ce qui est réellement stocké" },
      body: {
        en:`<table class="lg__t"><thead><tr><th>Name</th><th>What it is</th><th>How long</th></tr></thead><tbody>
            <tr><td><code>eeba_sess</code></td><td>Cookie that keeps a staff member signed in to the administration area. Never set for ordinary visitors.</td><td>12 hours</td></tr>
            <tr><td><code>eeba27.lang</code></td><td>Local storage: the language you chose</td><td>Until you clear it</td></tr>
            <tr><td><code>eeba27.theme</code></td><td>Local storage: light or dark theme</td><td>Until you clear it</td></tr>
            <tr><td><code>eeba27.ref</code></td><td>Session storage: your booking reference during payment</td><td>Until you close the tab</td></tr>
            </tbody></table>
            <p>All of these are technically necessary or simply remember a choice you made.
            None of them follows you across other websites.</p>`,
        it:`<table class="lg__t"><thead><tr><th>Nome</th><th>Cos'è</th><th>Durata</th></tr></thead><tbody>
            <tr><td><code>eeba_sess</code></td><td>Cookie che tiene aperta la sessione di chi lavora nell'area di amministrazione. Non viene mai impostato per i visitatori normali.</td><td>12 ore</td></tr>
            <tr><td><code>eeba27.lang</code></td><td>Memoria locale: la lingua che hai scelto</td><td>Finché non la cancelli</td></tr>
            <tr><td><code>eeba27.theme</code></td><td>Memoria locale: tema chiaro o scuro</td><td>Finché non la cancelli</td></tr>
            <tr><td><code>eeba27.ref</code></td><td>Memoria di sessione: il codice della tua iscrizione durante il pagamento</td><td>Finché non chiudi la scheda</td></tr>
            </tbody></table>
            <p>Sono tutti tecnicamente necessari oppure ricordano semplicemente una tua scelta.
            Nessuno di questi ti segue su altri siti.</p>`,
        nl:`<table class="lg__t"><thead><tr><th>Naam</th><th>Wat het is</th><th>Duur</th></tr></thead><tbody>
            <tr><td><code>eeba_sess</code></td><td>Cookie dat een medewerker ingelogd houdt in het beheergedeelte. Wordt nooit geplaatst bij gewone bezoekers.</td><td>12 uur</td></tr>
            <tr><td><code>eeba27.lang</code></td><td>Lokale opslag: de door u gekozen taal</td><td>Tot u het wist</td></tr>
            <tr><td><code>eeba27.theme</code></td><td>Lokale opslag: licht of donker thema</td><td>Tot u het wist</td></tr>
            <tr><td><code>eeba27.ref</code></td><td>Sessieopslag: uw boekingsreferentie tijdens de betaling</td><td>Tot u het tabblad sluit</td></tr>
            </tbody></table>
            <p>Alle zijn technisch noodzakelijk of onthouden simpelweg een keuze van u.
            Geen ervan volgt u op andere websites.</p>`,
        fr:`<table class="lg__t"><thead><tr><th>Nom</th><th>De quoi il s'agit</th><th>Durée</th></tr></thead><tbody>
            <tr><td><code>eeba_sess</code></td><td>Cookie qui maintient la session d'un membre du secrétariat dans l'espace d'administration. Jamais déposé pour les visiteurs ordinaires.</td><td>12 heures</td></tr>
            <tr><td><code>eeba27.lang</code></td><td>Stockage local : la langue que vous avez choisie</td><td>Jusqu'à effacement</td></tr>
            <tr><td><code>eeba27.theme</code></td><td>Stockage local : thème clair ou sombre</td><td>Jusqu'à effacement</td></tr>
            <tr><td><code>eeba27.ref</code></td><td>Stockage de session : votre référence de réservation pendant le paiement</td><td>Jusqu'à fermeture de l'onglet</td></tr>
            </tbody></table>
            <p>Tous sont techniquement nécessaires ou mémorisent simplement un choix que vous avez fait.
            Aucun ne vous suit sur d'autres sites.</p>` } },

    { h: { en:"During payment", it:"Durante il pagamento", nl:"Tijdens de betaling", fr:"Pendant le paiement" },
      body: {
        en:`<p>When you pay, you are taken to a page hosted by Stripe. What happens there is
            governed by Stripe's own privacy and cookie policies. Once the payment is done you
            come back here, and nothing from Stripe remains on our pages.</p>`,
        it:`<p>Quando paghi vieni portato su una pagina ospitata da Stripe. Quello che accade lì
            è regolato dalle informative di Stripe. Concluso il pagamento torni qui, e sulle
            nostre pagine non resta nulla di Stripe.</p>`,
        nl:`<p>Bij het betalen wordt u naar een pagina van Stripe geleid. Wat daar gebeurt valt
            onder de verklaringen van Stripe. Na de betaling keert u hier terug, en er blijft
            niets van Stripe op onze pagina's achter.</p>`,
        fr:`<p>Au moment de payer, vous êtes dirigé vers une page hébergée par Stripe. Ce qui s'y
            passe relève des politiques de Stripe. Le paiement effectué, vous revenez ici, et
            rien de Stripe ne subsiste sur nos pages.</p>` } },

    { h: { en:"Clearing it", it:"Come cancellarli", nl:"Wissen", fr:"Comment les effacer" },
      body: {
        en:`<p>Your browser's settings let you delete cookies and local storage for this site at
            any time. Doing so only means the site will forget your language and theme.</p>`,
        it:`<p>Dalle impostazioni del browser puoi cancellare in qualsiasi momento cookie e
            memoria locale di questo sito. L'unica conseguenza è che il sito dimenticherà la
            lingua e il tema che avevi scelto.</p>`,
        nl:`<p>Via de instellingen van uw browser kunt u cookies en lokale opslag voor deze site
            altijd wissen. Het enige gevolg is dat de site uw taal en thema vergeet.</p>`,
        fr:`<p>Les réglages de votre navigateur vous permettent d'effacer à tout moment les
            cookies et le stockage local de ce site. La seule conséquence est que le site
            oubliera votre langue et votre thème.</p>` } }
  ]
},

/* ====================================================== CONDIZIONI ====== */
terms: {
  title: { en:"Terms of participation", it:"Condizioni di partecipazione",
           nl:"Deelnamevoorwaarden", fr:"Conditions de participation" },
  sections: [
    { h: { en:"Registration", it:"Iscrizione", nl:"Inschrijving", fr:"Inscription" },
      body: {
        en:`<p>Registration is complete once payment is received, or — for bank transfer and
            institutional invoicing — once the amount reaches our account. Places on wetlabs and
            at the gala dinner are limited and assigned in order of payment.</p>
            <p>Reduced fees for trainees, nurses and technicians require proof of status at badge
            collection.</p>`,
        it:`<p>L'iscrizione si perfeziona con il pagamento o, per bonifico e fattura
            istituzionale, con l'accredito dell'importo. I posti per i wetlab e per la cena di
            gala sono limitati e assegnati in ordine di pagamento.</p>
            <p>Le tariffe ridotte per specializzandi, infermieri e tecnici richiedono un
            documento che attesti la qualifica al ritiro del badge.</p>`,
        nl:`<p>De inschrijving is definitief zodra de betaling is ontvangen of — bij overschrijving
            en institutionele facturatie — zodra het bedrag op onze rekening staat. Plaatsen voor
            wetlabs en het galadiner zijn beperkt en worden toegekend op volgorde van betaling.</p>
            <p>Voor gereduceerde tarieven is bij het afhalen van de badge een bewijs van status vereist.</p>`,
        fr:`<p>L'inscription est acquise au paiement ou, pour le virement et la facture
            institutionnelle, à la réception des fonds. Les places en wetlab et au dîner de gala
            sont limitées et attribuées par ordre de paiement.</p>
            <p>Les tarifs réduits exigent un justificatif présenté au retrait du badge.</p>` } },

    { h: { en:"Cancellation and transfer", it:"Cancellazione e trasferimento",
           nl:"Annulering en overdracht", fr:"Annulation et transfert" },
      body: {
        en:`<ul><li>Until 15 February 2027: full refund, less a handling fee.</li>
            <li>Until 15 March 2027: 50% refund.</li>
            <li>After that date: no refund.</li></ul>
            <p>At any time, and free of charge, a registration may be transferred to another
            person from the same institution: write to the secretariat with both names.</p>
            <p>Because this is admission to an event on specific dates, the right of withdrawal
            provided for distance contracts does not apply.</p>`,
        it:`<ul><li>Fino al 15 febbraio 2027: rimborso totale, meno le spese di gestione.</li>
            <li>Fino al 15 marzo 2027: rimborso del 50%.</li>
            <li>Dopo tale data: nessun rimborso.</li></ul>
            <p>In qualsiasi momento, e senza costi, l'iscrizione può essere trasferita a un'altra
            persona dello stesso ente: basta scrivere alla segreteria indicando entrambi i nomi.</p>
            <p>Trattandosi dell'accesso a un evento in date determinate, non si applica il
            diritto di recesso previsto per i contratti a distanza.</p>`,
        nl:`<ul><li>Tot 15 februari 2027: volledige terugbetaling minus administratiekosten.</li>
            <li>Tot 15 maart 2027: 50% terugbetaling.</li>
            <li>Daarna: geen terugbetaling.</li></ul>
            <p>De inschrijving kan altijd kosteloos worden overgedragen aan een andere persoon van
            dezelfde instelling: laat het secretariaat beide namen weten.</p>
            <p>Omdat het gaat om toegang tot een evenement op bepaalde data, geldt het
            herroepingsrecht voor overeenkomsten op afstand niet.</p>`,
        fr:`<ul><li>Jusqu'au 15 février 2027 : remboursement intégral, moins les frais de dossier.</li>
            <li>Jusqu'au 15 mars 2027 : remboursement de 50 %.</li>
            <li>Au-delà : aucun remboursement.</li></ul>
            <p>À tout moment et sans frais, l'inscription peut être transférée à une autre personne
            du même établissement : écrivez au secrétariat en indiquant les deux noms.</p>
            <p>S'agissant de l'accès à un événement à dates déterminées, le droit de rétractation
            prévu pour les contrats à distance ne s'applique pas.</p>` } },

    { h: { en:"Prices and invoicing", it:"Prezzi e fatturazione",
           nl:"Prijzen en facturatie", fr:"Prix et facturation" },
      body: {
        en:`<p>Prices are in euro and include VAT where applicable. The early-bird rate applies to
            registrations paid by the published deadline. Invoices are issued by the secretariat;
            for institutional invoicing, payment is due within 30 days.</p>`,
        it:`<p>I prezzi sono in euro e comprendono l'IVA ove applicabile. La tariffa early bird si
            applica alle iscrizioni pagate entro la scadenza pubblicata. Le fatture sono emesse
            dalla segreteria; per la fatturazione istituzionale il pagamento è a 30 giorni.</p>`,
        nl:`<p>Prijzen zijn in euro en inclusief btw waar van toepassing. Het early-birdtarief geldt
            voor inschrijvingen die vóór de gepubliceerde deadline zijn betaald. Facturen worden
            door het secretariaat uitgegeven; bij institutionele facturatie geldt 30 dagen.</p>`,
        fr:`<p>Les prix sont en euros et incluent la TVA le cas échéant. Le tarif early bird
            s'applique aux inscriptions réglées avant l'échéance publiée. Les factures sont émises
            par le secrétariat ; pour la facturation institutionnelle, le paiement est à 30 jours.</p>` } },

    { h: { en:"Changes and cancellation of the meeting", it:"Modifiche e annullamento del congresso",
           nl:"Wijzigingen en annulering", fr:"Modifications et annulation" },
      body: {
        en:`<p>The programme may change: speakers and sessions are confirmed as the meeting
            approaches, and a substitution is not grounds for a refund. Should the meeting be
            cancelled by the organisers, registration fees are refunded in full; we cannot
            reimburse travel or accommodation, so we recommend flexible bookings or insurance.</p>`,
        it:`<p>Il programma può cambiare: relatori e sessioni vengono confermati con
            l'avvicinarsi del congresso, e una sostituzione non dà diritto al rimborso. Se il
            congresso venisse annullato dagli organizzatori, le quote di iscrizione sarebbero
            rimborsate integralmente; non possiamo invece rimborsare viaggio e alloggio, quindi
            consigliamo prenotazioni flessibili o un'assicurazione.</p>`,
        nl:`<p>Het programma kan wijzigen: sprekers en sessies worden bevestigd naarmate de datum
            nadert, en een vervanging geeft geen recht op terugbetaling. Wordt de vergadering door
            de organisatie geannuleerd, dan worden de inschrijvingsgelden volledig terugbetaald;
            reis- en verblijfkosten kunnen we niet vergoeden.</p>`,
        fr:`<p>Le programme peut évoluer : intervenants et sessions sont confirmés à l'approche du
            congrès, et un remplacement n'ouvre pas droit à remboursement. Si le congrès était
            annulé par les organisateurs, les frais d'inscription seraient intégralement
            remboursés ; le voyage et l'hébergement ne peuvent l'être.</p>` } },

    { h: { en:"Conduct, images and applicable law", it:"Comportamento, immagini e legge applicabile",
           nl:"Gedrag, beeldmateriaal en toepasselijk recht", fr:"Comportement, images et droit applicable" },
      body: {
        en:`<p>We expect respectful conduct towards other participants and staff. Photographs and
            video may be taken during the meeting for documentation; tell the registration desk if
            you prefer not to appear.</p>
            <p>These terms are governed by Italian law, the country in which the association has
            its seat.</p>`,
        it:`<p>Ci aspettiamo un comportamento rispettoso verso gli altri partecipanti e verso il
            personale. Durante il congresso possono essere realizzate fotografie e riprese a scopo
            documentale; se preferisci non comparire, segnalalo al desk registrazioni.</p>
            <p>Queste condizioni sono regolate dalla legge italiana, paese in cui l'associazione
            ha sede.</p>`,
        nl:`<p>We verwachten respectvol gedrag jegens andere deelnemers en medewerkers. Tijdens de
            vergadering kunnen foto's en video-opnamen worden gemaakt voor documentatie; geef het
            aan bij de registratiebalie als u liever niet in beeld komt.</p>
            <p>Op deze voorwaarden is het Italiaanse recht van toepassing.</p>`,
        fr:`<p>Nous attendons un comportement respectueux envers les autres participants et le
            personnel. Des photographies et des vidéos peuvent être réalisées à des fins de
            documentation ; signalez-le au bureau d'accueil si vous préférez ne pas y figurer.</p>
            <p>Ces conditions sont régies par le droit italien, pays du siège de l'association.</p>` } }
  ]
}
};
