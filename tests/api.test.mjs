/* ==========================================================================
   Test d'integrazione dell'API.
   Esegue il router reale (functions/api/[[path]].js) contro un SQLite in
   memoria che imita il binding D1. Nessuna dipendenza esterna.

   Uso:  node --experimental-sqlite tests/api.test.mjs
         (su Node 22+ basta: node tests/api.test.mjs)
   ========================================================================== */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------- shim del binding D1 */
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  #norm() { return this.args.map(v => v === undefined ? null
    : typeof v === "boolean" ? (v ? 1 : 0)
    : (v === null || ["string", "number", "bigint"].includes(typeof v)) ? v : String(v)); }
  async first() { return this.db.prepare(this.sql).get(...this.#norm()) ?? null; }
  async all()   { return { results: this.db.prepare(this.sql).all(...this.#norm()) }; }
  async run()   {
    const r = this.db.prepare(this.sql).run(...this.#norm());
    return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } };
  }
}
function makeDB() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(join(ROOT, "schema/schema.sql"), "utf8"));
  db.exec(readFileSync(join(ROOT, "schema/seed.sql"), "utf8"));
  return {
    _raw: db,
    prepare: sql => new Stmt(db, sql),
    batch: async stmts => { for (const s of stmts) await s.run(); return []; }
  };
}

/* --------------------------------------------------- carica il router */
const routerSrc = readFileSync(join(ROOT, "functions/api/[[path]].js"), "utf8");
const tmp = join(tmpdir(), `eeba-router-${Date.now()}.mjs`);
writeFileSync(tmp, routerSrc);
const { onRequest } = await import(pathToFileURL(tmp).href);

/* --------------------------------------------------------- test harness */
let DB = makeDB();
let cookie = "";
const BASE = "https://eeba.test";

async function call(path, { method = "GET", body, useCookie = true, origin } = {}) {
  const headers = { origin: origin === undefined ? BASE : origin };
  if (body) headers["content-type"] = "application/json";
  if (useCookie && cookie) headers.cookie = cookie;

  const request = new Request(BASE + "/api" + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  const seg = path.split("?")[0].replace(/^\/api\/?/, "").replace(/^\//, "").split("/").filter(Boolean);
  const res = await onRequest({ request, env: { DB }, params: { path: seg } });

  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("json") ? await res.json() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) { pass++; results.push(`  ✓ ${name}`); }
  else { fail++; results.push(`  ✗ ${name}${detail ? "  → " + detail : ""}`); }
}
const group = t => results.push(`\n${t}`);

/* ====================================================================== */

group("Setup iniziale e autenticazione");
{
  let r = await call("/auth/state");
  check("stato iniziale: serve il setup", r.data.needsSetup === true, JSON.stringify(r.data));

  r = await call("/auth/setup", { method: "POST", body: { email: "gary@eeba.eu", name: "Gary", password: "corta" } });
  check("password troppo corta rifiutata", r.status === 400, r.status);

  r = await call("/auth/setup", { method: "POST", body: { email: "gary@eeba.eu", name: "Gary", password: "unaPasswordLunga1" } });
  check("primo admin creato", r.status === 200, JSON.stringify(r.data));

  r = await call("/auth/setup", { method: "POST", body: { email: "altro@eeba.eu", name: "X", password: "unaPasswordLunga1" } });
  check("secondo setup bloccato (409)", r.status === 409, r.status);

  r = await call("/auth/state");
  check("stato: setup completato", r.data.needsSetup === false);

  r = await call("/auth/login", { method: "POST", body: { email: "gary@eeba.eu", password: "sbagliata!!" } });
  check("login con password errata → 401", r.status === 401, r.status);

  r = await call("/auth/login", { method: "POST", body: { email: "gary@eeba.eu", password: "unaPasswordLunga1" } });
  check("login corretto → 200", r.status === 200, JSON.stringify(r.data));
  check("cookie di sessione impostato", /^eeba_sess=/.test(cookie), cookie);

  const raw = String(DB._raw.prepare("SELECT password_hash FROM users WHERE email='gary@eeba.eu'").get().password_hash);
  check("password salvata come hash PBKDF2, non in chiaro",
    raw.startsWith("pbkdf2$") && !raw.includes("unaPasswordLunga1"));
  check("in sessions è salvato l'hash del token, non il token",
    !String(DB._raw.prepare("SELECT token_hash FROM sessions").get().token_hash).includes(cookie.split("=")[1]));

  r = await call("/auth/me");
  check("/auth/me restituisce l'utente", r.data.user?.role === "admin", JSON.stringify(r.data));
}

group("Protezione degli endpoint admin");
{
  const saved = cookie; cookie = "";
  let r = await call("/admin/stats", { useCookie: false });
  check("stats senza sessione → 401", r.status === 401, r.status);
  r = await call("/admin/users", { useCookie: false });
  check("utenti senza sessione → 401", r.status === 401, r.status);
  cookie = "eeba_sess=token-inventato";
  r = await call("/admin/stats");
  check("cookie falso rifiutato → 401", r.status === 401, r.status);
  cookie = saved;
}

group("Difesa CSRF e limite tentativi");
{
  let r = await call("/admin/speakers", { method: "POST", body: { name: "X" }, origin: "https://sito-malevolo.example" });
  check("POST da origine esterna → 403", r.status === 403, r.status);

  const saved = cookie; cookie = "";
  let last;
  for (let i = 0; i < 10; i++)
    last = await call("/auth/login", { method: "POST", body: { email: "vittima@eeba.eu", password: "tentativo" + i }, useCookie: false });
  check("dopo ripetuti fallimenti → 429", last.status === 429, last.status);
  cookie = saved;
}

group("Contenuti pubblici");
{
  const r = await call("/public/content", { useCookie: false });
  check("content risponde 200", r.status === 200);
  check("chiavi di traduzione presenti", Object.keys(r.data.translations).length > 200, Object.keys(r.data.translations).length);
  check("le 3 giornate hanno sessioni",
    r.data.programme[1].length && r.data.programme[2].length && r.data.programme[3].length);
  check("le 4 lingue arrivano complete",
    ["en", "it", "nl", "fr"].every(l => r.data.programme[1][0].h[l]), JSON.stringify(r.data.programme[1][0].h));
  check("5 tariffe attive", r.data.tiers.length === 5, r.data.tiers.length);
  check("prezzi in centesimi", r.data.tiers.find(t => t.code === "mem").early_price === 52000);
  check("risposta cacheabile", (r.headers.get("cache-control") || "").includes("max-age=60"));
}

group("Iscrizione dal sito pubblico");
{
  const good = {
    first_name: "Anna", last_name: "Rossi", email: "anna@ospedale.it", org: "Banca Occhi Veneto",
    country: "Italy", tier_code: "mem", addons: ["gal"], lang: "it",
    consent_terms: true, consent_gdpr: true, total: 1, tier_price: 1   // valori taroccati
  };
  let r = await call("/public/register", { method: "POST", body: good, useCookie: false });
  check("iscrizione creata → 201", r.status === 201, JSON.stringify(r.data));
  check("il server ignora i prezzi inviati dal browser (520+95=615€)",
    r.data.total === 61500, r.data.total);
  check("riferimento generato", /^EEBA27-/.test(r.data.ref || ""), r.data.ref);

  r = await call("/public/register", { method: "POST", body: { ...good, email: "non-una-email" }, useCookie: false });
  check("email non valida → 400", r.status === 400, r.status);

  r = await call("/public/register", { method: "POST", body: { ...good, consent_gdpr: false }, useCookie: false });
  check("senza consenso GDPR → 400", r.status === 400, r.status);

  r = await call("/public/register", { method: "POST", body: { ...good, tier_code: "inesistente" }, useCookie: false });
  check("tariffa inesistente → 400", r.status === 400, r.status);

  r = await call("/public/register", { method: "POST", body: { ...good, first_name: "" }, useCookie: false });
  check("campo obbligatorio mancante → 400", r.status === 400, r.status);
}

group("Capienza degli extra e chiusura iscrizioni");
{
  DB._raw.exec("UPDATE addons SET capacity = 1 WHERE code = 'lab'");
  const base = {
    first_name: "B", last_name: "B", email: "b@b.it", org: "O", tier_code: "tra",
    addons: ["lab"], consent_terms: true, consent_gdpr: true
  };
  let r = await call("/public/register", { method: "POST", body: base, useCookie: false });
  check("primo posto wetlab assegnato", r.status === 201, r.status);
  r = await call("/public/register", { method: "POST", body: { ...base, email: "c@c.it" }, useCookie: false });
  check("wetlab esaurito → 409", r.status === 409 && r.data.soldOut === "lab", JSON.stringify(r.data));
  DB._raw.exec("UPDATE addons SET capacity = 24 WHERE code = 'lab'");

  DB._raw.exec("UPDATE settings SET svalue='0' WHERE skey='registration_open'");
  r = await call("/public/register", { method: "POST", body: { ...base, addons: [], email: "d@d.it" }, useCookie: false });
  check("iscrizioni chiuse → 403", r.status === 403, r.status);
  DB._raw.exec("UPDATE settings SET svalue='1' WHERE skey='registration_open'");
}

group("Dashboard e gestione iscrizioni");
{
  let r = await call("/admin/stats");
  // 2 iscrizioni andate a buon fine: Anna (mem+gala) e B (trainee+wetlab).
  // Tutte le altre chiamate erano scarti attesi e non devono aver scritto nulla.
  check("stats: conteggio corretto", r.data.totals.n === 2, JSON.stringify(r.data.totals));
  check("stats: valore totale = 615€ + 470€", r.data.totals.gross === 108500, r.data.totals.gross);
  check("stats: incassato a zero finché nulla è pagato", r.data.totals.paid === 0);
  check("stats: ripartizione per tariffa presente", r.data.byTier.length >= 2, r.data.byTier.length);
  check("stats: capienza extra calcolata", r.data.capacity.some(c => c.code === "lab"), JSON.stringify(r.data.capacity));

  r = await call("/admin/registrations?q=Rossi");
  check("ricerca per cognome", r.data.total === 1, r.data.total);
  r = await call("/admin/registrations?q=' OR '1'='1");
  check("tentativo di SQL injection innocuo", r.data.total === 0, r.data.total);
  r = await call("/admin/registrations?status=pending");
  check("filtro per stato", r.data.total === 2, r.data.total);

  const id = (await call("/admin/registrations?q=Rossi")).data.results[0].id;
  r = await call(`/admin/registrations/${id}`, { method: "PATCH", body: { payment_status: "paid", notes: "bonifico ricevuto" } });
  check("aggiornamento stato pagamento", r.status === 200, JSON.stringify(r.data));
  const row = DB._raw.prepare("SELECT payment_status, paid_at, notes FROM registrations WHERE id = ?").get(id);
  check("paid_at valorizzato automaticamente", row.payment_status === "paid" && !!row.paid_at, JSON.stringify(row));

  r = await call("/admin/stats");
  check("stats: incassato aggiornato", r.data.totals.paid === 61500, r.data.totals.paid);

  r = await call("/admin/registrations/export.csv");
  check("export CSV con intestazioni", typeof r.data === "string" && r.data.includes("ref;first_name"), String(r.data).slice(0, 60));
  check("export CSV contiene i dati", String(r.data).includes("anna@ospedale.it"));
}

group("Contenuti: CRUD e permessi per ruolo");
{
  let r = await call("/admin/speakers", { method: "POST", body: {
    name: "Dott.ssa Test", org: "KU Leuven", sort: 10,
    role_json: { en: "Keynote", it: "Lettura magistrale", nl: "Keynote", fr: "Plénière" }, published: 1 } });
  check("relatore creato → 201", r.status === 201, JSON.stringify(r.data));
  const sid = r.data.id;

  r = await call(`/admin/speakers/${sid}`, { method: "PATCH", body: { org: "UZ Leuven" } });
  check("relatore aggiornato", r.status === 200);

  r = await call("/public/content", { useCookie: false });
  check("il relatore compare subito sul sito pubblico",
    r.data.speakers.some(s => s.name === "Dott.ssa Test" && s.org === "UZ Leuven"));

  const tr = (await call("/admin/translations")).data.results.find(t => t.tkey === "hero.t1");
  await call(`/admin/translations/${tr.id}`, { method: "PATCH", body: { value_json: { en: "NUOVO TITOLO", it: "NUOVO TITOLO IT" } } });
  r = await call("/public/content", { useCookie: false });
  check("traduzione modificata è online", r.data.translations["hero.t1"].it === "NUOVO TITOLO IT",
    JSON.stringify(r.data.translations["hero.t1"]));

  r = await call("/admin/programme", { method: "POST", body: {
    day_no: 2, time: "18:30", tag: "soc", sort: 50,
    title_json: { en: "Extra session", it: "Sessione extra" }, published: 1 } });
  check("sessione di programma creata", r.status === 201, JSON.stringify(r.data));
  r = await call("/public/content", { useCookie: false });
  check("la sessione appare nel giorno 2", r.data.programme[2].some(s => s.t === "18:30"));

  r = await call("/admin/tiers", { method: "PATCH" });
  check("PATCH senza id non fa danni", r.status === 404, r.status);

  r = await call("/admin/speakers", { method: "POST", body: { nome_sbagliato: "x", id: 999 } });
  check("campi non in allowlist rifiutati", r.status === 500 || r.status === 400, r.status);
}

group("Ruoli: redattore e sola lettura");
{
  const adminCookie = cookie;

  await call("/admin/users", { method: "POST", body: { email: "red@eeba.eu", name: "Red", password: "passwordLunga12", role: "editor" } });
  await call("/admin/users", { method: "POST", body: { email: "lettore@eeba.eu", name: "Lettore", password: "passwordLunga12", role: "viewer" } });

  cookie = "";
  await call("/auth/login", { method: "POST", body: { email: "lettore@eeba.eu", password: "passwordLunga12" }, useCookie: false });
  let r = await call("/admin/speakers");
  check("viewer può leggere i contenuti", r.status === 200, r.status);
  r = await call("/admin/speakers", { method: "POST", body: { name: "Non permesso" } });
  check("viewer NON può scrivere → 403", r.status === 403, r.status);
  r = await call("/admin/users");
  check("viewer non accede agli utenti → 403", r.status === 403, r.status);

  cookie = "";
  await call("/auth/login", { method: "POST", body: { email: "red@eeba.eu", password: "passwordLunga12" }, useCookie: false });
  r = await call("/admin/speakers", { method: "POST", body: { name: "Creato dal redattore" } });
  check("editor può creare contenuti", r.status === 201, r.status);
  const regId = (await call("/admin/registrations?limit=1")).data.results[0].id;
  r = await call(`/admin/registrations/${regId}`, { method: "DELETE" });
  check("editor NON può eliminare iscrizioni → 403", r.status === 403, r.status);
  r = await call("/admin/users", { method: "POST", body: { email: "x@x.it", name: "X", password: "passwordLunga12" } });
  check("editor non crea utenti → 403", r.status === 403, r.status);

  cookie = adminCookie;
  r = await call(`/admin/registrations/${regId}`, { method: "DELETE" });
  check("admin può eliminare iscrizioni", r.status === 200, r.status);

  const me = (await call("/auth/me")).data.user;
  r = await call(`/admin/users/${me.id}`, { method: "PATCH", body: { role: "viewer" } });
  check("un admin non può declassare se stesso", r.status === 400, r.status);
  r = await call(`/admin/users/${me.id}`, { method: "DELETE" });
  check("un admin non può eliminare se stesso", r.status === 400, r.status);
}

group("Impostazioni e registro attività");
{
  let r = await call("/admin/settings", { method: "PATCH", body: { early_until: "2027-02-28" } });
  check("impostazione salvata", r.status === 200, JSON.stringify(r.data));
  r = await call("/public/content", { useCookie: false });
  check("nuova data early bird visibile al sito", r.data.settings.early_until === "2027-02-28", r.data.settings.early_until);

  r = await call("/admin/audit");
  check("il registro traccia le operazioni", r.data.results.length > 5, r.data.results.length);
  check("i login falliti sono tracciati", r.data.results.some(a => a.action === "login_failed"));
  check("le eliminazioni sono tracciate", r.data.results.some(a => a.action === "delete"));
  check("nessuna password finisce nel registro",
    !JSON.stringify(r.data.results).includes("passwordLunga12"));
}

group("Cambio password e chiusura sessione");
{
  let r = await call("/auth/password", { method: "POST", body: { current: "sbagliata", next: "nuovaPasswordOk1" } });
  check("password attuale errata → 400", r.status === 400, r.status);
  r = await call("/auth/password", { method: "POST", body: { current: "unaPasswordLunga1", next: "nuovaPasswordOk1" } });
  check("password cambiata", r.status === 200, JSON.stringify(r.data));
  r = await call("/auth/login", { method: "POST", body: { email: "gary@eeba.eu", password: "nuovaPasswordOk1" }, useCookie: false });
  check("login con la nuova password", r.status === 200, r.status);

  r = await call("/auth/logout", { method: "POST" });
  check("logout ok", r.status === 200);
  cookie = "";
  r = await call("/admin/stats", { useCookie: false });
  check("dopo il logout l'admin è chiuso", r.status === 401, r.status);
}

group("Endpoint inesistenti");
{
  const r = await call("/qualcosa/che/non/esiste", { useCookie: false });
  check("404 su rotta sconosciuta", r.status === 404, r.status);
}

/* ------------------------------------------------------------ risultato */
console.log(results.join("\n"));
console.log("\n" + "─".repeat(58));
console.log(`${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
