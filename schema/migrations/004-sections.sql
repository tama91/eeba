-- ==========================================================================
-- Migrazione 004 — sezioni della home ordinabili e nascondibili
--
--   npm run db:migrate:004
--
-- Le nove sezioni erano scritte in index.html in ordine fisso. Ora l'ordine e
-- la visibilità stanno nel database: un'edizione senza call for abstract
-- nasconde quella sezione senza toccare il codice.
--
-- Restano nel codice le sezioni *esistenti*: questa migrazione permette di
-- riordinarle e spegnerle, non di inventarne di nuove.
--
-- Idempotente.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS sections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL UNIQUE,   -- corrisponde all'id nel markup
  sort       INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- L'ordine di partenza è quello attuale della pagina.
INSERT OR IGNORE INTO sections (code, sort, published) VALUES
  ('about',     0, 1),
  ('focus',     1, 1),
  ('programme', 2, 1),
  ('speakers',  3, 1),
  ('venue',     4, 1),
  ('register',  5, 1),
  ('abstracts', 6, 1),
  ('sponsors',  7, 1),
  ('faq',       8, 1);

-- Dove mandare chi preme «Invia un abstract». Accetta un indirizzo web
-- (sistema esterno di raccolta) oppure un mailto:. Vuoto = pulsante nascosto.
INSERT OR IGNORE INTO settings (skey, svalue) VALUES ('abstracts_url', '');
