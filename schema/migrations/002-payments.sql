-- ==========================================================================
-- Migrazione 002 — pagamenti
--
--   npx wrangler d1 execute eeba-2027 --file=schema/migrations/002-payments.sql --remote
--
-- Allarga i metodi di pagamento ammessi, aggiunge le colonne che servono a
-- collegare un'iscrizione alla sessione di pagamento del processore, e crea
-- le impostazioni della sezione Pagamenti del backoffice.
--
-- Nessuna chiave segreta finisce qui dentro: le credenziali del processore
-- stanno nei secret del Worker, non nel database.
-- ==========================================================================

-- 1. registrations: il vincolo ammetteva solo card/sepa/inv.
--    SQLite non consente di modificare un CHECK: si ricrea la tabella.
CREATE TABLE IF NOT EXISTS registrations_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT    NOT NULL UNIQUE,
  first_name     TEXT    NOT NULL,
  last_name      TEXT    NOT NULL,
  email          TEXT    NOT NULL,
  org            TEXT    NOT NULL DEFAULT '',
  role           TEXT,
  country        TEXT,
  vat            TEXT,
  diet           TEXT,
  lang           TEXT    NOT NULL DEFAULT 'en',
  tier_code      TEXT    NOT NULL,
  tier_price     INTEGER NOT NULL DEFAULT 0,
  addons_json    TEXT    NOT NULL DEFAULT '[]',
  addons_total   INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  currency       TEXT    NOT NULL DEFAULT 'EUR',
  payment_method TEXT    NOT NULL DEFAULT 'card',
  payment_status TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (payment_status IN ('pending','paid','refunded','cancelled','failed')),
  -- riferimenti al processore, per riconciliare e per non pagare due volte
  provider       TEXT,                       -- stripe | preview | manual
  session_id     TEXT,                       -- id della sessione di checkout
  intent_id      TEXT,                       -- id del pagamento vero e proprio
  paid_at        TEXT,
  refunded_at    TEXT,
  newsletter     INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  source         TEXT    NOT NULL DEFAULT 'web',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO registrations_new
  (id, ref, first_name, last_name, email, org, role, country, vat, diet, lang,
   tier_code, tier_price, addons_json, addons_total, total, currency,
   payment_method, payment_status, paid_at, newsletter, notes, source, created_at, updated_at)
SELECT
   id, ref, first_name, last_name, email, org, role, country, vat, diet, lang,
   tier_code, tier_price, addons_json, addons_total, total, currency,
   payment_method, payment_status, paid_at, newsletter, notes, source, created_at, updated_at
FROM registrations;

DROP TABLE registrations;
ALTER TABLE registrations_new RENAME TO registrations;

CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_reg_status  ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_email   ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_tier    ON registrations(tier_code);
CREATE INDEX IF NOT EXISTS idx_reg_session ON registrations(session_id);

-- 2. Registro degli eventi ricevuti dal processore.
--    Serve a due cose: non elaborare due volte lo stesso evento (i webhook
--    vengono ritentati), e avere una traccia se un pagamento non torna.
CREATE TABLE IF NOT EXISTS payment_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  event_type   TEXT,
  ref          TEXT,
  status       TEXT,                          -- processed | ignored | error
  payload      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, event_id)
);
CREATE INDEX IF NOT EXISTS idx_payevents_ref ON payment_events(ref);

-- 3. Impostazioni della sezione Pagamenti.
--    payments_mode:
--      preview → nessun processore, checkout simulato (stato attuale)
--      test    → Stripe in modalità test, con chiavi di test
--      live    → Stripe in produzione
INSERT OR IGNORE INTO settings (skey, svalue) VALUES
  ('payments_provider', 'stripe'),
  ('payments_mode',     'preview'),
  ('payments_methods',  'card,bancontact,ideal,paypal,revolut_pay,sepa,inv'),
  ('payments_currency', 'EUR'),
  ('invoice_note',      '');
