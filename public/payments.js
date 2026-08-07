/* ==========================================================================
   EEBA 2027 — registro dei metodi di pagamento
   Condiviso fra sito pubblico, backoffice e (come riferimento) API.

   "online"  = il pagamento avviene subito presso il processore
   "offline" = l'iscrizione resta in attesa e la segreteria la segna pagata
               a mano quando arriva il bonifico o la fattura è saldata

   `stripe` indica se il metodo si attiva dal cruscotto Stripe. I metodi
   offline non passano da nessun processore: esistono anche in modalità
   anteprima e non hanno bisogno di chiavi.
   ========================================================================== */

const PAYMENT_METHODS = [
  { code: "card",        kind: "online",  stripe: "card",        icon: "card",
    regions: null,        note: { it: "Visa, Mastercard, American Express" } },

  { code: "bancontact",  kind: "online",  stripe: "bancontact",  icon: "bank",
    regions: ["BE"],      note: { it: "Il metodo più diffuso in Belgio" } },

  { code: "ideal",       kind: "online",  stripe: "ideal",       icon: "bank",
    regions: ["NL"],      note: { it: "Il metodo più diffuso nei Paesi Bassi" } },

  { code: "paypal",      kind: "online",  stripe: "paypal",      icon: "wallet",
    regions: null,        note: { it: "Conto PayPal o carta tramite PayPal" } },

  { code: "revolut_pay", kind: "online",  stripe: "revolut_pay", icon: "wallet",
    regions: ["EEA", "UK"], note: { it: "Richiede un conto Revolut. Disponibile in SEE e Regno Unito" } },

  { code: "sepa",        kind: "offline", stripe: null,          icon: "transfer",
    regions: null,        note: { it: "Bonifico bancario. L'iscrizione resta in attesa fino all'accredito" } },

  { code: "inv",         kind: "offline", stripe: null,          icon: "invoice",
    regions: null,        note: { it: "Fattura all'ente. Pagamento a 30 giorni" } }
];

const PAYMENT_BY_CODE = Object.fromEntries(PAYMENT_METHODS.map(m => [m.code, m]));

/* Metodi attivi secondo le impostazioni, nell'ordine del registro.
   In modalità anteprima i metodi online restano visibili ma il pagamento è
   simulato: serve a far approvare l'esperienza prima di collegare Stripe. */
function enabledPaymentMethods(settings) {
  const on = String(settings?.payments_methods || "card,sepa,inv")
    .split(",").map(s => s.trim()).filter(Boolean);
  return PAYMENT_METHODS.filter(m => on.includes(m.code));
}

const paymentsMode = settings => {
  const m = String(settings?.payments_mode || "preview");
  return ["preview", "test", "live"].includes(m) ? m : "preview";
};

const isOnlineMethod = code => PAYMENT_BY_CODE[code]?.kind === "online";

/* Icone: un solo set, così sito e backoffice non divergono. */
const PAYMENT_ICONS = {
  card:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/></svg>',
  bank:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 9.5 12 4l9 5.5M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/></svg>',
  wallet:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3"/><rect x="3" y="7.5" width="18" height="11.5" rx="2.5"/><circle cx="16.5" cy="13" r="1.3"/></svg>',
  transfer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  invoice:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg>'
};

if (typeof module !== "undefined")
  module.exports = { PAYMENT_METHODS, PAYMENT_BY_CODE, enabledPaymentMethods, paymentsMode, isOnlineMethod };
