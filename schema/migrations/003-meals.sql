-- ==========================================================================
-- Migrazione 003 — scelta del menu e allergie separate
--
--   npx wrangler d1 execute eeba-2027 --file=schema/migrations/003-meals.sql --remote
--
-- Il campo libero "esigenze alimentari" raccoglieva senza volerlo dati che
-- rivelano salute o religione: "celiaco", "musulmano, niente maiale".
-- Viene sostituito da due cose distinte:
--
--   meal       scelta fra opzioni di menu — è un'ordinazione, non una
--              dichiarazione su di sé
--   allergies  campo libero per allergie e intolleranze, che al catering
--              servono precise per ragioni di sicurezza, accompagnato da un
--              consenso esplicito richiesto solo a chi lo compila
--
-- Idempotente: si può rilanciare.
-- ==========================================================================

-- 1. Opzioni di menu, configurabili dal backoffice come tariffe ed extra.
CREATE TABLE IF NOT EXISTS meals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE,
  name_json  TEXT    NOT NULL DEFAULT '{}',
  sort       INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO meals (code, name_json, sort) VALUES
 ('standard',    '{"en":"Standard menu","it":"Menu standard","nl":"Standaardmenu","fr":"Menu standard"}', 0),
 ('vegetarian',  '{"en":"Vegetarian","it":"Vegetariano","nl":"Vegetarisch","fr":"Végétarien"}', 1),
 ('vegan',       '{"en":"Vegan","it":"Vegano","nl":"Veganistisch","fr":"Végétalien"}', 2),
 ('gluten_free', '{"en":"Gluten free","it":"Senza glutine","nl":"Glutenvrij","fr":"Sans gluten"}', 3),
 ('no_pork',     '{"en":"No pork","it":"Senza maiale","nl":"Zonder varkensvlees","fr":"Sans porc"}', 4),
 ('fish',        '{"en":"Fish","it":"Pesce","nl":"Vis","fr":"Poisson"}', 5);

-- 2. registrations: si ricrea come nelle migrazioni precedenti, perché in
--    SQLite ALTER TABLE ADD COLUMN non è ripetibile senza errore.
CREATE TABLE IF NOT EXISTS registrations_m3 (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT    NOT NULL UNIQUE,
  first_name     TEXT    NOT NULL,
  last_name      TEXT    NOT NULL,
  email          TEXT    NOT NULL,
  org            TEXT    NOT NULL DEFAULT '',
  role           TEXT,
  country        TEXT,
  vat            TEXT,
  meal           TEXT,                        -- codice da meals
  allergies      TEXT,                        -- testo libero, dato sanitario
  allergies_ok   INTEGER NOT NULL DEFAULT 0,  -- consenso esplicito, art. 9
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
  provider       TEXT,
  session_id     TEXT,
  intent_id      TEXT,
  paid_at        TEXT,
  refunded_at    TEXT,
  newsletter     INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  source         TEXT    NOT NULL DEFAULT 'web',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Il vecchio testo libero finisce in allergies, senza consenso registrato:
-- così resta visibile alla segreteria ma segnalato come da riverificare.
INSERT INTO registrations_m3
  (id, ref, first_name, last_name, email, org, role, country, vat,
   meal, allergies, allergies_ok, lang, tier_code, tier_price, addons_json,
   addons_total, total, currency, payment_method, payment_status,
   provider, session_id, intent_id, paid_at, refunded_at,
   newsletter, notes, source, created_at, updated_at)
SELECT
   id, ref, first_name, last_name, email, org, role, country, vat,
   NULL, NULLIF(TRIM(diet), ''), 0, lang, tier_code, tier_price, addons_json,
   addons_total, total, currency, payment_method, payment_status,
   provider, session_id, intent_id, paid_at, refunded_at,
   newsletter, notes, source, created_at, updated_at
FROM registrations;

DROP TABLE registrations;
ALTER TABLE registrations_m3 RENAME TO registrations;

CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_reg_status  ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_email   ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_tier    ON registrations(tier_code);
CREATE INDEX IF NOT EXISTS idx_reg_session ON registrations(session_id);
CREATE INDEX IF NOT EXISTS idx_reg_meal    ON registrations(meal);

-- 3. Impostazione: si può spegnere del tutto la raccolta, se un'edizione
--    non prevede pasti.
INSERT OR IGNORE INTO settings (skey, svalue) VALUES ('meals_enabled', '1');
