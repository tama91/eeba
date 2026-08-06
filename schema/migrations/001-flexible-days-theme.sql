-- ==========================================================================
-- Migrazione 001 — durata dell'evento variabile, aspetto configurabile
--
-- Applicare con:
--   npx wrangler d1 execute eeba-2027 --file=schema/migrations/001-flexible-days-theme.sql --remote
--
-- È idempotente: si può rilanciare senza danni.
-- ==========================================================================

-- 1. Toglie il vincolo che bloccava il programma a tre giornate.
--    SQLite non permette di rimuovere un CHECK: si ricrea la tabella.
CREATE TABLE IF NOT EXISTS programme_slots_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  day_no     INTEGER NOT NULL CHECK (day_no BETWEEN 1 AND 14),
  time       TEXT    NOT NULL DEFAULT '09:00',
  tag        TEXT,
  title_json TEXT    NOT NULL DEFAULT '{}',
  desc_json  TEXT    NOT NULL DEFAULT '{}',
  sort       INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO programme_slots_new (id, day_no, time, tag, title_json, desc_json, sort, published, updated_at)
  SELECT id, day_no, time, tag, title_json, desc_json, sort, published, updated_at FROM programme_slots;

DROP TABLE programme_slots;
ALTER TABLE programme_slots_new RENAME TO programme_slots;
CREATE INDEX IF NOT EXISTS idx_slots_day ON programme_slots(day_no, sort);

-- 2. Nuove impostazioni. INSERT OR IGNORE: non sovrascrive scelte già fatte.
INSERT OR IGNORE INTO settings (skey, svalue) VALUES
  ('event_days',      '3'),
  ('session_tags',    'key,lab,soc,sym,free,ind,ws'),
  ('stat_target_date','2027-08-01'),
  ('theme_preset',    'clinical-blue'),
  ('theme_accent',    ''),
  ('logo_url',        ''),
  ('logo_svg',        '');

-- 3. Il ruolo del delegato ora è un codice stabile (r0…r7) e non più
--    l'etichetta tradotta. Le iscrizioni già presenti vengono ricondotte
--    al codice corrispondente, in tutte e quattro le lingue.
UPDATE registrations SET role = 'r0' WHERE role IN
  ('Eye bank director','Direttore banca degli occhi','Directeur oogbank','Directeur de banque d''yeux');
UPDATE registrations SET role = 'r1' WHERE role IN
  ('Eye bank technician','Tecnico banca degli occhi','Technicus oogbank','Technicien de banque d''yeux');
UPDATE registrations SET role = 'r2' WHERE role IN
  ('Ophthalmologist / Surgeon','Oculista / Chirurgo','Oogarts / Chirurg','Ophtalmologue / Chirurgien');
UPDATE registrations SET role = 'r3' WHERE role IN
  ('Researcher','Ricercatore','Onderzoeker','Chercheur');
UPDATE registrations SET role = 'r4' WHERE role IN
  ('Nurse / Coordinator','Infermiere / Coordinatore','Verpleegkundige / Coördinator','Infirmier / Coordinateur');
UPDATE registrations SET role = 'r5' WHERE role IN
  ('Quality / Regulatory','Qualità / Regolatorio','Kwaliteit / Regelgeving','Qualité / Réglementaire');
UPDATE registrations SET role = 'r6' WHERE role IN
  ('Industry','Industria','Industrie');
UPDATE registrations SET role = 'r7' WHERE role IN
  ('Other','Altro','Anders','Autre');

-- 4. Pulizia delle sessioni scadute rimaste da prima della rotazione automatica.
DELETE FROM sessions WHERE expires_at <= datetime('now');
