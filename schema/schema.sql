-- ==========================================================================
-- EEBA 2027 — schema Cloudflare D1
-- I campi tradotti sono JSON: {"en":"…","it":"…","nl":"…","fr":"…"}
-- Applicare con:  npx wrangler d1 execute eeba --file=schema/schema.sql --remote
-- ==========================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- ACCESSO
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,          -- pbkdf2$<iter>$<salt_b64>$<hash_b64>
  role          TEXT    NOT NULL DEFAULT 'editor'
                CHECK (role IN ('admin','editor','viewer')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,             -- SHA-256 del token nel cookie
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  ip         TEXT,
  ua         TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- --------------------------------------------------------------- CONTENUTI
CREATE TABLE IF NOT EXISTS speakers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL DEFAULT '',
  org        TEXT    NOT NULL DEFAULT '',
  photo_url  TEXT,
  role_json  TEXT    NOT NULL DEFAULT '{}',   -- ruolo nel programma, tradotto
  bio_json   TEXT    NOT NULL DEFAULT '{}',
  sort       INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_speakers_sort ON speakers(sort);

CREATE TABLE IF NOT EXISTS sponsors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  tier       TEXT    NOT NULL DEFAULT 'silver'
             CHECK (tier IN ('platinum','gold','silver','partner')),
  logo_url   TEXT,
  url        TEXT,
  sort       INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sponsors_sort ON sponsors(tier, sort);

CREATE TABLE IF NOT EXISTS programme_slots (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  day_no     INTEGER NOT NULL CHECK (day_no BETWEEN 1 AND 3),
  time       TEXT    NOT NULL DEFAULT '09:00',
  tag        TEXT,                            -- key|lab|soc|sym|free|ind|ws
  title_json TEXT    NOT NULL DEFAULT '{}',
  desc_json  TEXT    NOT NULL DEFAULT '{}',
  sort       INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_slots_day ON programme_slots(day_no, sort);

-- ---------------------------------------------------------------- LISTINO
CREATE TABLE IF NOT EXISTS tiers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  early_price INTEGER NOT NULL DEFAULT 0,     -- centesimi di euro
  late_price  INTEGER NOT NULL DEFAULT 0,
  capacity    INTEGER,                        -- NULL = illimitato
  name_json   TEXT    NOT NULL DEFAULT '{}',
  desc_json   TEXT    NOT NULL DEFAULT '{}',
  sort        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE,
  price      INTEGER NOT NULL DEFAULT 0,      -- centesimi di euro
  capacity   INTEGER,
  name_json  TEXT    NOT NULL DEFAULT '{}',
  desc_json  TEXT    NOT NULL DEFAULT '{}',
  sort       INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------ TRADUZIONI
-- Override delle stringhe statiche di i18n.js. Chiave = percorso puntato
-- (es. "hero.t1"). Se una chiave non c'è qui, il sito usa i18n.js.
CREATE TABLE IF NOT EXISTS translations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tkey       TEXT NOT NULL UNIQUE,
  value_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  skey       TEXT PRIMARY KEY,
  svalue     TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- ISCRIZIONI
CREATE TABLE IF NOT EXISTS registrations (
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
  tier_price     INTEGER NOT NULL DEFAULT 0,  -- centesimi, calcolato lato server
  addons_json    TEXT    NOT NULL DEFAULT '[]',
  addons_total   INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  currency       TEXT    NOT NULL DEFAULT 'EUR',
  payment_method TEXT    NOT NULL DEFAULT 'card'
                 CHECK (payment_method IN ('card','sepa','inv')),
  payment_status TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (payment_status IN ('pending','paid','refunded','cancelled')),
  paid_at        TEXT,
  newsletter     INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  source         TEXT    NOT NULL DEFAULT 'web',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_reg_status  ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_email   ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_tier    ON registrations(tier_code);

-- ----------------------------------------------------------------- AUDIT
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action     TEXT NOT NULL,                   -- create | update | delete | login | …
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
