/* ==========================================================================
   Genera schema/seed.sql a partire da i18n.js — così il database parte
   esattamente con i contenuti che oggi sono nel sito.

   Uso:  node schema/generate-seed.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "public", "i18n.js"), "utf8");
const { LANGS, I18N, PRICING } = new Function(src + ";return {LANGS,I18N,PRICING};")();

const CODES = LANGS.map(l => l.code);
const q = v => "'" + String(v).replace(/'/g, "''") + "'";
const json = o => q(JSON.stringify(o));

/* Raccoglie il valore di una chiave in tutte le lingue */
const bag = keyFn => Object.fromEntries(CODES.map(c => [c, keyFn(I18N[c]) ?? ""]));
const at = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

const out = [];
const W = s => out.push(s);

W("-- ==========================================================================");
W("-- EEBA 2027 — seed generato automaticamente da i18n.js");
W("-- NON modificare a mano: rigenera con  node schema/generate-seed.js");
W("-- Applicare con:  npm run db:seed   (npx wrangler d1 execute eeba-2027 --file=schema/seed.sql --remote)");
W("-- ==========================================================================\n");

/* ------------------------------------------------------------- IMPOSTAZIONI */
W("DELETE FROM settings;");
const settings = {
  event_start:  "2027-04-08T09:00:00+02:00",
  event_end:    "2027-04-10T18:00:00+02:00",
  early_until:  PRICING.earlyUntil,
  currency:     "EUR",
  venue_name:   "University Hall, Leuven",
  venue_maps:   "https://maps.app.goo.gl/1JEywDNpTEGTMjMs8",
  languages:    CODES.join(","),
  registration_open: "1",
  event_days:       "3",
  session_tags:     "key,lab,soc,sym,free,ind,ws",
  stat_target_date: "2027-08-01",
  theme_preset:     "clinical-blue",
  theme_accent:     "",
  logo_url:         "",
  logo_svg:         ""
};
for (const [k, v] of Object.entries(settings)) {
  W(`INSERT INTO settings (skey, svalue) VALUES (${q(k)}, ${q(v)});`);
}

/* ------------------------------------------------------------------ TARIFFE */
W("\nDELETE FROM tiers;");
PRICING.tiers.forEach((t, i) => {
  const name = bag(T => at(T, `reg.tiers.${t.id}.h`));
  const desc = bag(T => at(T, `reg.tiers.${t.id}.p`));
  W(`INSERT INTO tiers (code, early_price, late_price, name_json, desc_json, sort, active) VALUES (` +
    `${q(t.id)}, ${t.early * 100}, ${t.late * 100}, ${json(name)}, ${json(desc)}, ${i}, 1);`);
});

W("\nDELETE FROM addons;");
PRICING.addons.forEach((a, i) => {
  const name = bag(T => at(T, `reg.add.${a.id}.h`));
  const desc = bag(T => at(T, `reg.add.${a.id}.s`));
  const cap = a.id === "lab" ? 24 : "NULL";
  W(`INSERT INTO addons (code, price, capacity, name_json, desc_json, sort, active) VALUES (` +
    `${q(a.id)}, ${a.price * 100}, ${cap}, ${json(name)}, ${json(desc)}, ${i}, 1);`);
});

/* ---------------------------------------------------------------- PROGRAMMA */
W("\nDELETE FROM programme_slots;");
[1, 2, 3].forEach(day => {
  const ref = I18N.en.prog["day" + day];
  ref.forEach((slot, i) => {
    const title = bag(T => at(T, `prog.day${day}`)[i]?.h);
    const desc  = bag(T => at(T, `prog.day${day}`)[i]?.p);
    const tag = slot.tag ? q(slot.tag) : "NULL";
    W(`INSERT INTO programme_slots (day_no, time, tag, title_json, desc_json, sort, published) VALUES (` +
      `${day}, ${q(slot.t)}, ${tag}, ${json(title)}, ${json(desc)}, ${i}, 1);`);
  });
});

/* ---------------------------------------------------------------- RELATORI */
W("\nDELETE FROM speakers;");
["r1", "r2", "r3", "r4"].forEach((k, i) => {
  const role = bag(T => at(T, `spk.${k}`));
  W(`INSERT INTO speakers (name, org, role_json, bio_json, sort, published) VALUES (` +
    `'', '', ${json(role)}, ${json({})}, ${i}, 1);`);
});

/* ----------------------------------------------------------------- SPONSOR */
W("\nDELETE FROM sponsors;");
const sponsorSeed = [
  ["Platinum partner 1", "platinum"], ["Platinum partner 2", "platinum"],
  ["Gold partner 1", "gold"], ["Gold partner 2", "gold"], ["Gold partner 3", "gold"],
  ["Silver partner 1", "silver"], ["Silver partner 2", "silver"], ["Silver partner 3", "silver"],
  ["Silver partner 4", "silver"], ["Silver partner 5", "silver"]
];
sponsorSeed.forEach(([name, tier], i) => {
  W(`INSERT INTO sponsors (name, tier, sort, published) VALUES (${q(name)}, ${q(tier)}, ${i}, 1);`);
});

/* -------------------------------------------------------------- TRADUZIONI */
/* Tutte le stringhe "piatte" di i18n.js, escluse quelle già gestite da
   tabelle dedicate (programma, tariffe, extra) e gli array. */
const SKIP = /^(prog\.day[123]|reg\.tiers\.|reg\.add\.)/;

function leaves(obj, prefix = "") {
  const acc = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + "." + k : k;
    if (typeof v === "string") acc.push(p);
    else if (v && !Array.isArray(v) && typeof v === "object") acc.push(...leaves(v, p));
  }
  return acc;
}

const keys = leaves(I18N.en).filter(k => !SKIP.test(k));
W("\nDELETE FROM translations;");
keys.forEach(k => {
  W(`INSERT INTO translations (tkey, value_json) VALUES (${q(k)}, ${json(bag(T => at(T, k)))});`);
});

/* --------------------------------------------------------------------- FINE */
W(`\n-- ${keys.length} chiavi di traduzione, ${PRICING.tiers.length} tariffe, ` +
  `${PRICING.addons.length} extra, ${[1,2,3].reduce((s,d)=>s+I18N.en.prog["day"+d].length,0)} slot di programma.`);
W("-- Nessun utente creato: il primo admin si registra da /admin (setup iniziale).");

fs.writeFileSync(path.join(__dirname, "seed.sql"), out.join("\n") + "\n");
console.log(`seed.sql generato — ${out.length} righe, ${keys.length} chiavi di traduzione.`);
