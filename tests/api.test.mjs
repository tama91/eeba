/* ==========================================================================
   Test d'integrazione dell'API.
   Esegue il router reale (functions/api/[[path]].js) contro un SQLite in
   memoria che imita il binding D1. Nessuna dipendenza esterna.

   Uso:  node --experimental-sqlite tests/api.test.mjs
         (su Node 22+ basta: node tests/api.test.mjs)
   ========================================================================== */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(ROOT, p), "utf8");

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
  /* Niente migrazioni qui: schema.sql è già lo stato corrente, quello con cui
     nasce un'installazione nuova. Le migrazioni servono a portare avanti un
     database vecchio, e vengono provate a parte — gruppo "Migrazioni". */
  return {
    _raw: db,
    prepare: sql => new Stmt(db, sql),
    batch: async stmts => { for (const s of stmts) await s.run(); return []; }
  };
}

/* --------------------------------------------------- carica il router */
const routerSrc = readFileSync(join(ROOT, "src/api.js"), "utf8");
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

group("Capienza delle tariffe");
{
  const saved = cookie;
  DB._raw.exec("UPDATE tiers SET capacity = 1 WHERE code = 'ind'");
  const base = { first_name:"T", last_name:"T", email:"t1@t.it", org:"O", tier_code:"ind",
                 consent_terms:true, consent_gdpr:true };
  let r = await call("/public/register", { method:"POST", body: base, useCookie:false });
  check("primo posto sulla tariffa assegnato", r.status === 201, r.status);
  r = await call("/public/register", { method:"POST", body:{ ...base, email:"t2@t.it" }, useCookie:false });
  check("tariffa esaurita → 409", r.status === 409 && r.data.soldOut === "ind", JSON.stringify(r.data));
  r = await call("/public/register", { method:"POST", body:{ ...base, email:"t3@t.it", tier_code:"tra" }, useCookie:false });
  check("le altre tariffe restano aperte", r.status === 201, r.status);
  DB._raw.exec("UPDATE tiers SET capacity = NULL WHERE code = 'ind'");
  cookie = saved;
}

group("Validazione delle impostazioni");
{
  const cases = [
    ["event_days", "3",    200, "3 giornate accettate"],
    ["event_days", "0",    400, "zero giornate rifiutate"],
    ["event_days", "99",   400, "99 giornate rifiutate"],
    ["event_days", "tre",  400, "testo al posto del numero rifiutato"],
    ["theme_accent", "#0057D9", 200, "colore esadecimale accettato"],
    ["theme_accent", "",   200, "accento vuoto accettato (torna al preset)"],
    ["theme_accent", "rosso", 400, "nome di colore rifiutato"],
    ["logo_url", "https://x.test/l.svg", 200, "URL https accettato"],
    ["logo_url", "http://x.test/l.svg",  400, "URL non cifrato rifiutato"],
    ["languages", "en,it,de", 200, "elenco lingue valido"],
    ["languages", "inglese",  400, "elenco lingue non valido rifiutato"],
    ["registration_open", "2", 400, "valore booleano fuori range rifiutato"],
    ["stat_target_date", "01/08/2027", 400, "data in formato sbagliato rifiutata"]
  ];
  for (const [k, v, expect, name] of cases) {
    const r = await call("/admin/settings", { method: "PATCH", body: { [k]: v } });
    check(name, r.status === expect, `atteso ${expect}, ottenuto ${r.status}`);
  }
  const r = await call("/admin/settings", { method: "PATCH", body: { theme_accent: "0057D9" } });
  const row = DB._raw.prepare("SELECT svalue FROM settings WHERE skey='theme_accent'").get();
  check("il cancelletto viene aggiunto da solo", r.status === 200 && row.svalue === "#0057d9", row.svalue);
}

group("Sanificazione del logo SVG");
{
  const attacks = [
    ['<svg onload="alert(1)"><circle r="4"/></svg>', "onload", "attributo onload rimosso"],
    ['<svg><script>alert(1)</script><circle r="4"/></svg>', "<script", "tag script rimosso"],
    ['<svg><a href="javascript:alert(1)">x</a></svg>', "javascript:", "href javascript neutralizzato"],
    ['<svg><foreignObject><body onclick="x"/></foreignObject></svg>', "foreignObject", "foreignObject rimosso"]
  ];
  for (const [payload, needle, name] of attacks) {
    await call("/admin/settings", { method: "PATCH", body: { logo_svg: payload } });
    const row = DB._raw.prepare("SELECT svalue FROM settings WHERE skey='logo_svg'").get();
    check(name, !String(row.svalue).toLowerCase().includes(needle.toLowerCase()), row.svalue);
  }
  let r = await call("/admin/settings", { method: "PATCH", body: { logo_svg: "<div>non è un svg</div>" } });
  check("markup che non è un SVG viene rifiutato", r.status === 400, r.status);
  r = await call("/admin/settings", { method: "PATCH", body: { logo_svg: "<svg>" + "x".repeat(70000) + "</svg>" } });
  check("SVG enorme rifiutato", r.status === 400, r.status);
  r = await call("/admin/settings", { method: "PATCH", body: { logo_svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="currentColor"/></svg>' } });
  check("un SVG pulito passa intatto", r.status === 200, r.status);
  await call("/admin/settings", { method: "PATCH", body: { logo_svg: "" } });
}

group("L'export CSV rispetta i filtri");
{
  const all = await call("/admin/registrations/export.csv");
  const paid = await call("/admin/registrations/export.csv?status=paid");
  const rows = s => String(s).trim().split("\r\n").length - 1;
  check("export completo con più righe", rows(all.data) > rows(paid.data),
        `tutte:${rows(all.data)} pagate:${rows(paid.data)}`);
  const q = await call("/admin/registrations/export.csv?q=Rossi");
  check("export filtrato per ricerca", rows(q.data) === 1, rows(q.data));
  check("l'export filtrato contiene la riga giusta", String(q.data).includes("anna@ospedale.it"));
}

group("Giornate del programma oltre le tre");
{
  await call("/admin/settings", { method: "PATCH", body: { event_days: "5" } });
  let r = await call("/admin/programme", { method: "POST", body: {
    day_no: 5, time: "10:00", title_json: { it: "Quinta giornata" }, published: 1 } });
  check("una sessione al giorno 5 viene accettata", r.status === 201, JSON.stringify(r.data));
  r = await call("/public/content", { useCookie: false });
  check("il giorno 5 arriva al sito pubblico", (r.data.programme[5] || []).length === 1,
        JSON.stringify(Object.keys(r.data.programme)));
  await call("/admin/settings", { method: "PATCH", body: { event_days: "3" } });
}

group("Il ruolo viaggia come codice, non come etichetta");
{
  const r = await call("/public/register", { method: "POST", useCookie: false, body: {
    first_name:"Jan", last_name:"Peeters", email:"jan@uz.be", org:"UZ Leuven",
    role:"r2", country:"Belgium", tier_code:"tra", consent_terms:true, consent_gdpr:true, lang:"nl" } });
  check("iscrizione con codice ruolo", r.status === 201, JSON.stringify(r.data));
  const row = DB._raw.prepare("SELECT role FROM registrations WHERE email='jan@uz.be'").get();
  check("nel database c'è il codice, non il testo tradotto", row.role === "r2", row.role);
}

group("Pagamenti — modalità anteprima");
{
  let r = await call("/public/content", { useCookie: false });
  check("i metodi attivi arrivano al sito", Array.isArray(r.data.payments?.methods) && r.data.payments.methods.length > 3,
        JSON.stringify(r.data.payments));
  check("modalità anteprima", r.data.payments.mode === "preview", r.data.payments?.mode);

  const body = { first_name:"Paul", last_name:"Dupont", email:"paul@chu.fr", org:"CHU",
                 tier_code:"tra", payment_method:"card", consent_terms:true, consent_gdpr:true };
  r = await call("/public/register", { method:"POST", body, useCookie:false });
  check("iscrizione con carta → checkout simulato", r.status === 201 && /checkout-anteprima/.test(r.data.checkout_url || ""),
        JSON.stringify(r.data));
  const refPreview = r.data.ref;

  r = await call(`/public/status?ref=${refPreview}`, { useCookie: false });
  check("stato iniziale in attesa", r.data.payment_status === "pending", r.data.payment_status);
  check("lo stato non espone dati personali",
        !("email" in r.data) && !("first_name" in r.data), Object.keys(r.data).join(","));

  r = await call("/public/preview-pay", { method:"POST", body:{ ref: refPreview, esito:"ok" }, useCookie:false });
  check("il checkout simulato segna pagato", r.status === 200, JSON.stringify(r.data));
  r = await call(`/public/status?ref=${refPreview}`, { useCookie: false });
  check("stato aggiornato a pagato", r.data.payment_status === "paid", r.data.payment_status);

  r = await call("/public/preview-pay", { method:"POST", body:{ ref:"EEBA27-INESISTENTE", esito:"ok" }, useCookie:false });
  check("riferimento inventato → 404", r.status === 404, r.status);

  // metodo differito: nessun checkout, resta in attesa
  r = await call("/public/register", { method:"POST", useCookie:false,
    body:{ ...body, email:"ufficio@ospedale.it", payment_method:"inv" } });
  check("fattura istituzionale: nessun checkout", r.status === 201 && !r.data.checkout_url, JSON.stringify(r.data));
  const rowInv = DB._raw.prepare("SELECT payment_method, provider, payment_status FROM registrations WHERE email='ufficio@ospedale.it'").get();
  check("fattura registrata come differita",
        rowInv.payment_method === "inv" && rowInv.provider === "manual" && rowInv.payment_status === "pending",
        JSON.stringify(rowInv));

  // metodo non attivo: si ricade sul primo disponibile invece di accettarlo
  await call("/admin/settings", { method:"PATCH", body:{ payments_methods:"card,inv" } });
  r = await call("/public/register", { method:"POST", useCookie:false,
    body:{ ...body, email:"x@y.it", payment_method:"revolut_pay" } });
  const rowX = DB._raw.prepare("SELECT payment_method FROM registrations WHERE email='x@y.it'").get();
  check("un metodo disattivato non viene accettato", rowX.payment_method !== "revolut_pay", rowX.payment_method);
  await call("/admin/settings", { method:"PATCH", body:{ payments_methods:"card,bancontact,ideal,paypal,revolut_pay,sepa,inv" } });
}

group("Pagamenti — il checkout simulato non sopravvive alla produzione");
{
  await call("/admin/settings", { method: "PATCH", body: { payments_mode: "live" } });
  const r = await call("/public/preview-pay", { method:"POST", body:{ ref:"EEBA27-QUALSIASI", esito:"ok" }, useCookie:false });
  check("in modalità live il checkout simulato è chiuso → 403", r.status === 403, r.status);

  const body = { first_name:"A", last_name:"B", email:"live@test.it", org:"O", tier_code:"tra",
                 payment_method:"card", consent_terms:true, consent_gdpr:true };
  const reg = await call("/public/register", { method:"POST", body, useCookie:false });
  check("senza chiave Stripe l'iscrizione si salva comunque", reg.status === 201, reg.status);
  check("e segnala il problema invece di fingere", !!reg.data.payment_error, JSON.stringify(reg.data).slice(0, 120));
  const row = DB._raw.prepare("SELECT payment_status FROM registrations WHERE email='live@test.it'").get();
  check("l'iscrizione resta in attesa, non pagata", row.payment_status === "pending", row.payment_status);
  await call("/admin/settings", { method: "PATCH", body: { payments_mode: "preview" } });
}

group("Webhook — firma e idempotenza");
{
  const SECRET = "whsec_test_1234567890";
  const encU = new TextEncoder();
  async function sign(payload, ts) {
    const key = await crypto.subtle.importKey("raw", encU.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, encU.encode(`${ts}.${payload}`));
    return `t=${ts},v1=` + [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function hook(payload, header) {
    const request = new Request(BASE + "/api/payments/webhook/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, ...(header ? { "stripe-signature": header } : {}) },
      body: payload
    });
    const res = await onRequest({ request, env: { DB, STRIPE_WEBHOOK_SECRET: SECRET },
                                  params: { path: ["payments", "webhook", "stripe"] } });
    return { status: res.status, data: await res.json() };
  }

  // un'iscrizione da far pagare dal webhook
  const reg = await call("/public/register", { method: "POST", useCookie: false, body: {
    first_name:"Web", last_name:"Hook", email:"hook@test.it", org:"O", tier_code:"tra",
    payment_method:"card", consent_terms:true, consent_gdpr:true } });
  const ref = reg.data.ref;

  const payload = JSON.stringify({ id:"evt_1", type:"checkout.session.completed",
    data:{ object:{ id:"cs_1", client_reference_id: ref, payment_intent:"pi_1" } } });
  const now = Math.floor(Date.now() / 1000);

  let r = await hook(payload, null);
  check("senza firma → 400", r.status === 400, r.status);
  r = await hook(payload, `t=${now},v1=deadbeef`);
  check("firma sbagliata → 400", r.status === 400, r.status);
  r = await hook(payload, await sign(payload, now - 3600));
  check("firma valida ma vecchia di un'ora → 400", r.status === 400, r.status);
  r = await hook(payload + " ", await sign(payload, now));
  check("corpo alterato dopo la firma → 400", r.status === 400, r.status);

  r = await hook(payload, await sign(payload, now));
  check("firma valida → 200", r.status === 200, JSON.stringify(r.data));
  let row = DB._raw.prepare("SELECT payment_status, paid_at, intent_id FROM registrations WHERE ref=?").get(ref);
  check("il webhook segna pagato", row.payment_status === "paid", JSON.stringify(row));
  check("registra l'identificativo del pagamento", row.intent_id === "pi_1", row.intent_id);

  r = await hook(payload, await sign(payload, now));
  check("lo stesso evento ripetuto non viene rielaborato", r.data.duplicate === true, JSON.stringify(r.data));

  // un evento di scadenza su un'iscrizione già pagata non deve annullarla
  const expired = JSON.stringify({ id:"evt_2", type:"checkout.session.expired",
    data:{ object:{ id:"cs_1", client_reference_id: ref } } });
  await hook(expired, await sign(expired, now));
  row = DB._raw.prepare("SELECT payment_status FROM registrations WHERE ref=?").get(ref);
  check("un'iscrizione pagata non torna indietro", row.payment_status === "paid", row.payment_status);

  // il rimborso invece deve passare
  const refunded = JSON.stringify({ id:"evt_3", type:"charge.refunded",
    data:{ object:{ id:"ch_1", metadata:{ ref } } } });
  await hook(refunded, await sign(refunded, now));
  row = DB._raw.prepare("SELECT payment_status, refunded_at FROM registrations WHERE ref=?").get(ref);
  check("il rimborso viene applicato", row.payment_status === "refunded" && !!row.refunded_at, JSON.stringify(row));

  const ev = DB._raw.prepare("SELECT COUNT(*) AS n FROM payment_events").get();
  check("gli eventi vengono archiviati", ev.n >= 3, ev.n);
}

group("Pagamenti — configurazione dal backoffice");
{
  let r = await call("/admin/payments/health");
  check("stato del collegamento leggibile", r.status === 200 && "secret_key" in r.data, JSON.stringify(r.data));
  check("la chiave non viene mai restituita", !JSON.stringify(r.data).includes("sk_"), JSON.stringify(r.data));
  check("dice solo se la chiave c'è", r.data.secret_key === false, String(r.data.secret_key));

  const cases = [
    ["payments_mode", "test", 200, "modalità test accettata"],
    ["payments_mode", "produzione", 400, "modalità inventata rifiutata"],
    ["payments_methods", "card,paypal", 200, "elenco metodi valido"],
    ["payments_methods", "bitcoin", 400, "metodo sconosciuto rifiutato"],
    ["payments_methods", "", 400, "elenco vuoto rifiutato"],
    ["payments_currency", "EUR", 200, "valuta valida"],
    ["payments_currency", "euro", 400, "valuta non valida rifiutata"],
    ["payments_provider", "paypal", 400, "processore non supportato rifiutato"]
  ];
  for (const [k, v, expect, name] of cases) {
    const res = await call("/admin/settings", { method: "PATCH", body: { [k]: v } });
    check(name, res.status === expect, `atteso ${expect}, ottenuto ${res.status}`);
  }
  await call("/admin/settings", { method: "PATCH", body: {
    payments_mode: "preview", payments_methods: "card,bancontact,ideal,paypal,revolut_pay,sepa,inv" } });

  r = await call("/admin/payments/events");
  check("elenco eventi accessibile", r.status === 200 && Array.isArray(r.data.results), r.status);
}

group("Menu e allergie");
{
  let r = await call("/public/content", { useCookie: false });
  check("le opzioni di menu arrivano al sito", (r.data.meals || []).length === 6, (r.data.meals || []).length);
  check("i nomi dei menu sono tradotti",
    r.data.meals.every(m => m.name_json.it && m.name_json.nl), JSON.stringify(r.data.meals[0]));

  const base = { first_name:"Marie", last_name:"Claes", email:"marie@uz.be", org:"UZ",
                 tier_code:"tra", payment_method:"inv", consent_terms:true, consent_gdpr:true };

  r = await call("/public/register", { method:"POST", useCookie:false,
    body:{ ...base, meal:"vegetarian" } });
  check("iscrizione con scelta del menu", r.status === 201, JSON.stringify(r.data));
  let row = DB._raw.prepare("SELECT meal, allergies, allergies_ok FROM registrations WHERE email='marie@uz.be'").get();
  check("il menu è salvato come codice", row.meal === "vegetarian", JSON.stringify(row));
  check("nessuna allergia, nessun consenso registrato", !row.allergies && row.allergies_ok === 0);

  r = await call("/public/register", { method:"POST", useCookie:false,
    body:{ ...base, email:"finto@x.it", meal:"menu_inventato" } });
  check("un menu inesistente non viene accettato", r.status === 201);
  row = DB._raw.prepare("SELECT meal FROM registrations WHERE email='finto@x.it'").get();
  check("e viene salvato vuoto invece che alla cieca", row.meal === null, String(row.meal));

  // il punto centrale: allergie senza consenso esplicito vengono rifiutate
  r = await call("/public/register", { method:"POST", useCookie:false,
    body:{ ...base, email:"nocons@x.it", allergies:"arachidi, shock anafilattico" } });
  check("allergie senza consenso → 400", r.status === 400 && r.data.field === "allergies_consent",
        JSON.stringify(r.data));
  const none = DB._raw.prepare("SELECT COUNT(*) AS n FROM registrations WHERE email='nocons@x.it'").get();
  check("e l'iscrizione non viene creata a metà", none.n === 0, none.n);

  r = await call("/public/register", { method:"POST", useCookie:false,
    body:{ ...base, email:"cons@x.it", meal:"gluten_free",
           allergies:"arachidi", allergies_consent:true } });
  check("con consenso esplicito l'iscrizione passa", r.status === 201, JSON.stringify(r.data));
  row = DB._raw.prepare("SELECT allergies, allergies_ok FROM registrations WHERE email='cons@x.it'").get();
  check("allergie salvate con il consenso tracciato",
        row.allergies === "arachidi" && row.allergies_ok === 1, JSON.stringify(row));

  // conteggi per la ristorazione
  r = await call("/admin/stats");
  check("le statistiche contano i menu", (r.data.meals || []).length >= 2, JSON.stringify(r.data.meals));
  check("le statistiche elencano chi ha allergie",
        (r.data.allergies || []).some(a => a.allergies === "arachidi"), JSON.stringify(r.data.allergies));

  // filtro e export per menu
  r = await call("/admin/registrations?meal=vegetarian");
  check("filtro per menu", r.data.total === 1, r.data.total);
  r = await call("/admin/registrations/export.csv?meal=gluten_free");
  check("export filtrato per menu", String(r.data).split("\r\n").length - 1 === 1,
        String(r.data).split("\r\n").length - 1);
  check("il CSV contiene menu e allergie", /meal;allergies/.test(String(r.data)), String(r.data).slice(0, 90));

  // le opzioni di menu si gestiscono dal backoffice
  r = await call("/admin/meals", { method:"POST", body:{
    code:"lactose_free", sort:9, active:1,
    name_json:{ en:"Lactose free", it:"Senza lattosio", nl:"Lactosevrij", fr:"Sans lactose" } } });
  check("nuova opzione di menu creata", r.status === 201, JSON.stringify(r.data));
  r = await call("/public/content", { useCookie: false });
  check("compare subito sul sito", r.data.meals.some(m => m.code === "lactose_free"));

  // si può spegnere del tutto
  await call("/admin/settings", { method:"PATCH", body:{ meals_enabled:"0" } });
  r = await call("/public/content", { useCookie: false });
  check("con meals_enabled a 0 il sito non li chiede", r.data.meals.length === 0, r.data.meals.length);
  await call("/admin/settings", { method:"PATCH", body:{ meals_enabled:"1" } });
}

group("Sezioni della home");
{
  let r = await call("/admin/sections");
  check("le nove sezioni ci sono tutte", r.data.results.length === 9, r.data.results.length);
  check("arrivano nell'ordine della pagina",
    r.data.results.map(x => x.code).join(",") === "about,focus,programme,speakers,venue,register,abstracts,sponsors,faq",
    r.data.results.map(x => x.code).join(","));

  const byCode = Object.fromEntries(r.data.results.map(x => [x.code, x]));

  /* spostare gli sponsor sopra le FAQ = scambiare i due valori di sort */
  r = await call(`/admin/sections/${byCode.sponsors.id}`, { method: "PATCH", body: { sort: 8 } });
  check("una sezione si può spostare", r.status === 200, JSON.stringify(r.data));
  r = await call(`/admin/sections/${byCode.faq.id}`, { method: "PATCH", body: { sort: 7 } });
  check("e quella che scala prende il posto", r.status === 200);

  r = await call("/public/content", { useCookie: false });
  const pub = r.data.sections.map(x => x.code);
  check("il sito riceve il nuovo ordine",
    pub.indexOf("faq") < pub.indexOf("sponsors"), pub.join(","));

  /* nasconderne una */
  r = await call(`/admin/sections/${byCode.abstracts.id}`, { method: "PATCH", body: { published: 0 } });
  check("una sezione si può nascondere", r.status === 200);
  r = await call("/public/content", { useCookie: false });
  check("il sito sa che è nascosta",
    r.data.sections.find(x => x.code === "abstracts").published === 0);
  check("ma continua a riceverla, per non perderne la posizione",
    r.data.sections.length === 9, r.data.sections.length);

  /* l'elenco è chiuso: nove sezioni sono nove blocchi che esistono nel markup */
  r = await call("/admin/sections", { method: "POST", body: { sort: 99, published: 1 } });
  check("non si può inventare una sezione nuova", r.status === 403, r.status);
  check("con un codice riconoscibile", r.data.code === "LIST_FIXED", r.data.code);
  r = await call(`/admin/sections/${byCode.faq.id}`, { method: "DELETE" });
  check("né eliminarne una esistente", r.status === 403, r.status);

  /* si rimette a posto per i gruppi successivi */
  await call(`/admin/sections/${byCode.sponsors.id}`, { method: "PATCH", body: { sort: 7 } });
  await call(`/admin/sections/${byCode.faq.id}`,      { method: "PATCH", body: { sort: 8 } });
  await call(`/admin/sections/${byCode.abstracts.id}`,{ method: "PATCH", body: { published: 1 } });
}

group("Dove si inviano gli abstract");
{
  const cases = [
    ["",                                 200, "vuoto = pulsante nascosto"],
    ["https://abstracts.eeba.eu/2027",   200, "indirizzo di un sistema esterno"],
    ["mailto:abstracts@eeba.eu",         200, "indirizzo email della segreteria"],
    ["http://abstracts.eeba.eu",         400, "senza cifratura rifiutato"],
    ["abstracts@eeba.eu",                400, "email senza mailto: rifiutata"],
    ["javascript:alert(1)",              400, "indirizzo eseguibile rifiutato"],
    ["https://x.eu/\" onclick=\"evil()", 400, "virgolette rifiutate"]
  ];
  for (const [v, status, name] of cases) {
    const r = await call("/admin/settings", { method: "PATCH", body: { abstracts_url: v } });
    check(name, r.status === status, `${v} → ${r.status} ${JSON.stringify(r.data)}`);
  }
  await call("/admin/settings", { method: "PATCH", body: { abstracts_url: "mailto:abstracts@eeba.eu" } });
  const r = await call("/public/content", { useCookie: false });
  check("il sito riceve la destinazione", r.data.settings.abstracts_url === "mailto:abstracts@eeba.eu");
}

group("Messaggi di errore comprensibili");
{
  /* Il caso che ha fatto nascere questo gruppo: creando due volte la stessa
     opzione di menu, a schermo arrivava
     "D1_ERROR: UNIQUE constraint failed: meals.code: SQLITE_CONSTRAINT".
     Corretto per chi ha scritto il codice, inservibile per una segreteria. */
  let r = await call("/admin/meals", { method: "POST", body: {
    code: "test_doppione", name_json: { it: "Prova" }, sort: 50, active: 1 } });
  check("prima creazione riuscita", r.status === 201, r.status);

  r = await call("/admin/meals", { method: "POST", body: {
    code: "test_doppione", name_json: { it: "Prova" }, sort: 51, active: 1 } });
  check("il doppione viene rifiutato", r.status === 409, r.status);
  check("con un codice riconoscibile", r.data.code === "DUPLICATE", JSON.stringify(r.data));
  check("e indica quale campo", r.data.field === "code", r.data.field);
  const raw = JSON.stringify(r.data);
  check("nessun gergo del database nella risposta",
    !/constraint|SQLITE|D1_ERROR|sqlite/i.test(raw), raw);

  /* Un valore non ammesso da un vincolo CHECK */
  r = await call("/admin/sponsors", { method: "POST", body: {
    name: "Prova", tier: "diamante" } });
  check("livello sponsor inesistente rifiutato", r.status === 400, r.status);
  check("tradotto in VALUE_NOT_ALLOWED", r.data.code === "VALUE_NOT_ALLOWED", JSON.stringify(r.data));
  check("senza gergo", !/constraint|SQLITE/i.test(JSON.stringify(r.data)), JSON.stringify(r.data));

  /* Ogni errore porta un codice: è ciò che permette di riscrivere i testi
     senza toccare il server. */
  const samples = [
    ["/admin/users", "POST", { email: "gary@eeba.eu", name: "X", password: "passwordLunga12" }, "USER_DUPLICATE"],
    ["/admin/settings", "PATCH", { event_days: "99" }, "SETTING_INVALID"],
    ["/public/register", "POST", { first_name: "" }, "REG_FIELD_MISSING"]
  ];
  for (const [path, method, body, expected] of samples) {
    const res = await call(path, { method, body, useCookie: !path.startsWith("/public") });
    check(`${path} risponde con ${expected}`, res.data.code === expected,
          `${res.status} ${JSON.stringify(res.data).slice(0, 90)}`);
  }

  await call("/admin/meals/" + (await call("/admin/meals")).data.results
    .find(m => m.code === "test_doppione").id, { method: "DELETE" });
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

group("Migrazioni su un database preesistente");
{
  /* Le migrazioni non si possono provare sopra schema.sql, che è già allo
     stato finale: si ricrea la forma vecchia della tabella e si verifica che
     il passaggio porti i dati dove deve. Il punto delicato della 003 è che il
     vecchio campo libero finisca fra le allergie senza consenso registrato,
     invece di sparire o di risultare consentito. */
  const old = new DatabaseSync(":memory:");
  old.exec(`
    CREATE TABLE settings (skey TEXT PRIMARY KEY, svalue TEXT NOT NULL,
                           updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL,
      org TEXT NOT NULL DEFAULT '', role TEXT, country TEXT, vat TEXT, diet TEXT,
      lang TEXT NOT NULL DEFAULT 'en', tier_code TEXT NOT NULL,
      tier_price INTEGER NOT NULL DEFAULT 0, addons_json TEXT NOT NULL DEFAULT '[]',
      addons_total INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR', payment_method TEXT NOT NULL DEFAULT 'card',
      payment_status TEXT NOT NULL DEFAULT 'pending', provider TEXT, session_id TEXT,
      intent_id TEXT, paid_at TEXT, refunded_at TEXT, newsletter INTEGER NOT NULL DEFAULT 0,
      notes TEXT, source TEXT NOT NULL DEFAULT 'web',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO registrations (ref, first_name, last_name, email, tier_code, diet)
      VALUES ('EEBA27-OLD1','Vecchia','Iscrizione','v@x.it','mem','celiaca, niente glutine');
    INSERT INTO registrations (ref, first_name, last_name, email, tier_code, diet)
      VALUES ('EEBA27-OLD2','Senza','Note','s@x.it','tra',NULL);`);

  let ok = true, why = "";
  try { old.exec(readFileSync(join(ROOT, "schema/migrations/003-meals.sql"), "utf8")); }
  catch (e) { ok = false; why = e.message; }
  check("la 003 si applica su un database con il vecchio campo diet", ok, why);

  if (ok) {
    const r1 = old.prepare("SELECT allergies, allergies_ok, meal FROM registrations WHERE ref='EEBA27-OLD1'").get();
    check("il vecchio testo libero diventa allergie", r1.allergies === "celiaca, niente glutine", JSON.stringify(r1));
    check("senza consenso registrato, da riverificare", r1.allergies_ok === 0, String(r1.allergies_ok));
    check("il menu resta da scegliere", r1.meal === null, String(r1.meal));

    const r2 = old.prepare("SELECT allergies FROM registrations WHERE ref='EEBA27-OLD2'").get();
    check("chi non aveva scritto niente resta vuoto", r2.allergies === null, String(r2.allergies));

    const n = old.prepare("SELECT COUNT(*) AS n FROM registrations").get();
    check("nessuna riga persa nel passaggio", n.n === 2, n.n);
    const meals = old.prepare("SELECT COUNT(*) AS n FROM meals").get();
    check("le opzioni di menu vengono create", meals.n === 6, meals.n);

    /* La 003 sposta dati da una colonna che poi sparisce: rilanciarla non ha
       senso, e infatti fallisce. È il comportamento giusto — se fosse
       "ripetibile" ignorando l'errore, la seconda esecuzione sovrascriverebbe
       le allergie con dei vuoti. Meglio un errore rumoroso che una perdita
       silenziosa. */
    let twice = true, why2 = "";
    try { old.exec(readFileSync(join(ROOT, "schema/migrations/003-meals.sql"), "utf8")); }
    catch (e) { twice = false; why2 = e.message; }
    check("rilanciarla si ferma con un errore invece di svuotare le allergie",
          !twice && /diet/.test(why2), why2 || "è passata due volte");
    const still = old.prepare("SELECT allergies FROM registrations WHERE ref='EEBA27-OLD1'").get();
    check("e i dati restano intatti dopo il tentativo",
          still.allergies === "celiaca, niente glutine", String(still.allergies));
  }

  /* Ogni migrazione dev'essere collegata agli script npm: dimenticarlo
     significa che su un database esistente non verrà mai applicata. */
  {
    const pkg = JSON.parse(read("package.json"));
    const files = readdirSync(join(ROOT, "schema/migrations")).filter(f => f.endsWith(".sql")).sort();
    const wired = files.filter(f => pkg.scripts["db:migrate"].includes(f));
    check(`tutte le ${files.length} migrazioni sono in db:migrate`,
          wired.length === files.length, files.filter(f => !wired.includes(f)).join(", "));
    const documented = read("schema/migrations/README.md");
    const undoc = files.filter(f => !documented.includes(f));
    check("tutte sono elencate nel README", undoc.length === 0, undoc.join(", "));
  }

  old.close();
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
