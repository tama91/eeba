/* ==========================================================================
   EEBA 2027 — API (Cloudflare Worker + D1)
   Router unico su /api/*, invocato da src/index.js. Binding D1 atteso: env.DB
   ========================================================================== */

const COOKIE = "eeba_sess";
const SESSION_HOURS = 12;
// 100.000 è il massimo che il runtime dei Workers accetta: oltre, deriveBits
// lancia "Pbkdf2 failed: iteration counts above 100000 are not supported".
// Il numero di iterazioni è scritto dentro l'hash, quindi se un domani il
// limite salisse basta alzare questa costante: le password già salvate
// continuano a verificarsi con il valore con cui erano state create.
const PBKDF2_ITER = 100000;

/* ------------------------------------------------------------------ utils */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });

const err = (status, message, extra = {}) => json({ error: message, ...extra }, status);

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const enc = new TextEncoder();

async function sha256hex(str) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, saltBytes) {
  const salt = saltBytes || crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" }, key, 256);
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(bits)}`;
}

async function verifyPassword(password, stored) {
  try {
    const [scheme, iter, salt, hash] = String(stored).split("$");
    if (scheme !== "pbkdf2") return false;
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: unb64(salt), iterations: Number(iter), hash: "SHA-256" }, key, 256);
    const a = new Uint8Array(bits), b = unb64(hash);
    if (a.length !== b.length) return false;
    let diff = 0;                                  // confronto a tempo costante
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch { return false; }
}

const readCookie = (request, name) => {
  const raw = request.headers.get("cookie") || "";
  const hit = raw.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

const setCookie = (token, maxAge) =>
  `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

const parseJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const nowIso = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const plusHours = h => new Date(Date.now() + h * 3600e3).toISOString().replace("T", " ").slice(0, 19);

/* ------------------------------------------------------------------- auth */
async function currentUser(request, env) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const th = await sha256hex(token);
  const row = await env.DB.prepare(
    `SELECT s.token_hash, s.expires_at, u.id, u.email, u.name, u.role, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')`).bind(th).first();
  if (!row || !row.active) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, tokenHash: th };
}

const RANK = { viewer: 1, editor: 2, admin: 3 };
const can = (user, level) => !!user && RANK[user.role] >= RANK[level];

async function audit(env, user, action, entity, entityId, detail) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (user_id, user_email, action, entity, entity_id, detail)
       VALUES (?1,?2,?3,?4,?5,?6)`)
      .bind(user?.id ?? null, user?.email ?? null, action, entity, entityId ? String(entityId) : null,
            detail ? String(detail).slice(0, 500) : null).run();
  } catch { /* l'audit non deve mai far fallire la richiesta */ }
}

/* Blocca le richieste di scrittura che non arrivano dal nostro stesso sito */
function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;                       // fetch same-origin non sempre invia Origin
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

/* ================================================================ PAGAMENTI */
/* Il registro dei metodi è duplicato qui di proposito: il server non deve
   fidarsi di quello che arriva dal browser, nemmeno dell'elenco dei metodi.
   Va tenuto allineato a public/payments.js — lo verifica il test. */
const METHODS = {
  card:        { kind: "online",  stripe: "card" },
  bancontact:  { kind: "online",  stripe: "bancontact" },
  ideal:       { kind: "online",  stripe: "ideal" },
  paypal:      { kind: "online",  stripe: "paypal" },
  revolut_pay: { kind: "online",  stripe: "revolut_pay" },
  sepa:        { kind: "offline", stripe: null },
  inv:         { kind: "offline", stripe: null }
};

const readSettings = async env => {
  const { results } = await env.DB.prepare(`SELECT skey, svalue FROM settings`).all();
  return Object.fromEntries(results.map(r => [r.skey, r.svalue]));
};

const payMode = s => ["preview", "test", "live"].includes(s.payments_mode) ? s.payments_mode : "preview";

const enabledMethods = s => String(s.payments_methods || "card,sepa,inv")
  .split(",").map(x => x.trim()).filter(c => METHODS[c]);

/* Crea la sessione di pagamento presso Stripe.

   Due cose non negoziabili:
   - l'importo è quello già calcolato dal server e salvato sull'iscrizione,
     mai uno che arrivi dal browser;
   - il riferimento dell'iscrizione viaggia in client_reference_id, così il
     webhook sa a quale riga applicare l'esito. */
async function stripeCheckout(env, settings, reg, method, origin) {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurata: vedi PAGAMENTI.md");

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("client_reference_id", reg.ref);
  form.set("customer_email", reg.email);
  form.set("success_url", `${origin}/pagamento.html?ref=${reg.ref}&esito=ok`);
  form.set("cancel_url",  `${origin}/pagamento.html?ref=${reg.ref}&esito=annullato`);
  form.set("payment_method_types[0]", METHODS[method].stripe);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", (settings.payments_currency || "EUR").toLowerCase());
  form.set("line_items[0][price_data][unit_amount]", String(reg.total));
  form.set("line_items[0][price_data][product_data][name]", `EEBA 2027 — ${reg.ref}`);
  form.set("metadata[ref]", reg.ref);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: "Bearer " + key,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": "eeba-" + reg.ref          // niente doppie sessioni sullo stesso riferimento
    },
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe ha rifiutato la richiesta");
  return { url: data.url, sessionId: data.id };
}

/* Verifica la firma del webhook Stripe (schema t=…,v1=… con HMAC-SHA256).
   Senza questa verifica chiunque potrebbe dichiarare pagata un'iscrizione. */
async function stripeSignatureValid(rawBody, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=").map(x => x.trim())));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;

  const key = await crypto.subtle.importKey("raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");

  const given = String(parts.v1 || "");
  if (given.length !== expected.length) return false;
  let diff = 0;                                       // confronto a tempo costante
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/* Applica l'esito a un'iscrizione. Idempotente: un webhook ritentato non
   cambia niente, e un'iscrizione già pagata non torna indietro. */
async function applyPaymentOutcome(env, ref, status, { provider, intentId, sessionId } = {}) {
  const reg = await env.DB.prepare(
    `SELECT id, payment_status FROM registrations WHERE ref = ?1`).bind(ref).first();
  if (!reg) return { ok: false, reason: "iscrizione inesistente" };
  if (reg.payment_status === "paid" && status !== "refunded")
    return { ok: true, reason: "già pagata, nessuna modifica" };

  const paidAt = status === "paid" ? ", paid_at = datetime('now')" : "";
  const refAt  = status === "refunded" ? ", refunded_at = datetime('now')" : "";
  await env.DB.prepare(
    `UPDATE registrations
        SET payment_status = ?1, provider = COALESCE(?2, provider),
            intent_id = COALESCE(?3, intent_id), session_id = COALESCE(?4, session_id),
            updated_at = datetime('now')${paidAt}${refAt}
      WHERE id = ?5`)
    .bind(status, provider ?? null, intentId ?? null, sessionId ?? null, reg.id).run();
  return { ok: true };
}

/* ------------------------------------------------- validazione impostazioni */
/* L'SVG del logo viene poi inserito nella pagina come markup: qui si toglie
   tutto ciò che potrebbe eseguire codice. Chi ha accesso al backoffice è una
   persona fidata, ma un account compromesso non deve poter iniettare script
   nel sito pubblico. */
function cleanSvg(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (!s.startsWith("<svg")) return new Error("deve iniziare con <svg");
  if (s.length > 64 * 1024) return new Error("troppo grande, massimo 64 KB");
  s = s.replace(/<\s*(script|foreignObject|iframe|object|embed|animate|set)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*(script|foreignObject|iframe|object|embed)\b[^>]*\/?>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/(href|xlink:href|src)\s*=\s*("|')?\s*(javascript|data:text\/html)[^"'\s>]*("|')?/gi, "");
  return s;
}

function sanitizeSetting(key, value) {
  const v = String(value ?? "");
  switch (key) {
    case "logo_svg":    return cleanSvg(v);
    case "logo_url":
      if (v && !/^https:\/\//i.test(v)) return new Error("deve essere un URL https");
      return v;
    case "theme_accent":
      if (v && !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim())) return new Error("colore esadecimale non valido");
      return v ? "#" + v.replace("#", "").toLowerCase() : "";
    case "event_days": {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 14) return new Error("da 1 a 14");
      return String(n);
    }
    case "languages":
      if (!/^[a-z]{2}(,[a-z]{2})*$/.test(v.trim())) return new Error("codici di due lettere separati da virgola");
      return v.trim();
    case "session_tags":
      if (!/^[a-z0-9_]+(,[a-z0-9_]+)*$/.test(v.trim())) return new Error("codici separati da virgola, solo lettere minuscole");
      return v.trim();
    case "early_until":
    case "stat_target_date":
      if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Error("formato AAAA-MM-GG");
      return v;
    case "registration_open":
      return v === "1" || v === "0" ? v : new Error("solo 0 o 1");
    case "payments_mode":
      return ["preview", "test", "live"].includes(v) ? v : new Error("solo preview, test o live");
    case "payments_provider":
      return ["stripe"].includes(v) ? v : new Error("processore non supportato");
    case "payments_methods": {
      const list = v.split(",").map(x => x.trim()).filter(Boolean);
      const unknown = list.filter(c => !METHODS[c]);
      if (unknown.length) return new Error("metodi sconosciuti: " + unknown.join(", "));
      if (!list.length) return new Error("almeno un metodo deve restare attivo");
      return list.join(",");
    }
    case "payments_currency":
      return /^[A-Z]{3}$/.test(v) ? v : new Error("codice valuta di tre lettere maiuscole");
    default:
      return v.slice(0, 4000);
  }
}

/* ------------------------------------------------------- entità CRUD generiche */
const ENTITIES = {
  speakers: {
    table: "speakers", order: "sort, id",
    fields: ["name", "org", "photo_url", "role_json", "bio_json", "sort", "published"]
  },
  sponsors: {
    table: "sponsors", order: "sort, id",
    fields: ["name", "tier", "logo_url", "url", "sort", "published"]
  },
  programme: {
    table: "programme_slots", order: "day_no, sort, id",
    fields: ["day_no", "time", "tag", "title_json", "desc_json", "sort", "published"]
  },
  tiers: {
    table: "tiers", order: "sort, id",
    fields: ["code", "early_price", "late_price", "capacity", "name_json", "desc_json", "sort", "active"]
  },
  addons: {
    table: "addons", order: "sort, id",
    fields: ["code", "price", "capacity", "name_json", "desc_json", "sort", "active"]
  },
  translations: {
    table: "translations", order: "tkey",
    fields: ["tkey", "value_json"]
  }
};

function pickFields(cfg, body) {
  const cols = [], vals = [];
  for (const f of cfg.fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      cols.push(f);
      let v = body[f];
      if (f.endsWith("_json") && typeof v === "object") v = JSON.stringify(v);
      if (typeof v === "boolean") v = v ? 1 : 0;
      vals.push(v === undefined ? null : v);
    }
  }
  return { cols, vals };
}

async function entityList(env, cfg) {
  const { results } = await env.DB.prepare(`SELECT * FROM ${cfg.table} ORDER BY ${cfg.order}`).all();
  return results.map(hydrateJson);
}

const hydrateJson = row => {
  const o = { ...row };
  for (const k of Object.keys(o)) if (k.endsWith("_json")) o[k] = parseJson(o[k], {});
  return o;
};

async function entityCreate(env, cfg, body) {
  const { cols, vals } = pickFields(cfg, body);
  if (!cols.length) throw new Error("nessun campo valido");
  const ph = cols.map((_, i) => "?" + (i + 1)).join(", ");
  const res = await env.DB.prepare(
    `INSERT INTO ${cfg.table} (${cols.join(", ")}) VALUES (${ph})`).bind(...vals).run();
  return res.meta.last_row_id;
}

async function entityUpdate(env, cfg, id, body) {
  const { cols, vals } = pickFields(cfg, body);
  if (!cols.length) throw new Error("nessun campo valido");
  const set = cols.map((c, i) => `${c} = ?${i + 1}`).join(", ");
  await env.DB.prepare(
    `UPDATE ${cfg.table} SET ${set}, updated_at = datetime('now') WHERE id = ?${cols.length + 1}`)
    .bind(...vals, id).run();
}

/* ======================================================================= */
export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const seg = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const method = request.method.toUpperCase();

  if (!env.DB) return err(500, "Binding D1 'DB' non configurato. Vedi README → Setup.");

  if (method === "OPTIONS") return new Response(null, { status: 204 });

  if (method !== "GET" && method !== "HEAD" && !sameOrigin(request))
    return err(403, "Origine non consentita");

  /* Il corpo si legge una volta sola: il webhook ha bisogno del testo grezzo
     per verificare la firma, quindi lo conserviamo invece di consumarlo. */
  let rawBody = "";
  let body = {};
  if (method === "POST" || method === "PATCH" || method === "PUT") {
    try { rawBody = await request.text(); } catch { rawBody = ""; }
    try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
  }

  try {
    /* ------------------------------------------------------------ AUTH */
    if (seg[0] === "auth") {

      // stato del setup iniziale
      if (seg[1] === "state" && method === "GET") {
        const n = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
        return json({ needsSetup: (n?.c ?? 0) === 0 });
      }

      /* Diagnostica: dice quale pezzo non funziona senza dover leggere i log.
         Si disattiva da sola appena esiste un utente, come il setup. */
      if (seg[1] === "diag" && method === "GET") {
        const out = { runtime: typeof navigator !== "undefined" ? navigator.userAgent : "unknown" };
        try {
          const n = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
          out.db = "ok"; out.users = n?.c ?? 0;
          if (out.users > 0) return err(403, "Diagnostica disponibile solo prima del setup iniziale");
        } catch (e) { out.db = "ERRORE: " + String(e?.message || e); return json(out); }

        try {
          const t0 = Date.now();
          const h = await hashPassword("prova-di-derivazione");
          out.pbkdf2 = "ok"; out.pbkdf2_ms = Date.now() - t0; out.pbkdf2_iter = PBKDF2_ITER;
          out.verify = await verifyPassword("prova-di-derivazione", h) ? "ok" : "ERRORE: mismatch";
        } catch (e) { out.pbkdf2 = "ERRORE: " + String(e?.message || e); return json(out); }

        try {
          await env.DB.prepare(
            `INSERT INTO audit_log (action, entity, detail) VALUES ('diag','users','test scrittura')`).run();
          await env.DB.prepare(`DELETE FROM audit_log WHERE action = 'diag'`).run();
          out.write = "ok";
        } catch (e) { out.write = "ERRORE: " + String(e?.message || e); }

        return json(out);
      }

      // creazione del primo amministratore — possibile solo a tabella vuota
      if (seg[1] === "setup" && method === "POST") {
        const n = await env.DB.prepare(`SELECT COUNT(*) AS c FROM users`).first();
        if ((n?.c ?? 0) > 0) return err(409, "Il setup iniziale è già stato completato");
        const { email, name, password } = body;
        if (!email || !password) return err(400, "Email e password obbligatorie");
        if (String(password).length < 10) return err(400, "La password deve avere almeno 10 caratteri");

        let hash;
        try { hash = await hashPassword(String(password)); }
        catch (e) { return err(500, "Hashing della password non riuscito", { detail: String(e?.message || e) }); }

        try {
          await env.DB.prepare(
            `INSERT INTO users (email, name, password_hash, role) VALUES (?1,?2,?3,'admin')`)
            .bind(String(email).toLowerCase().trim(), name || "Admin", hash).run();
        } catch (e) { return err(500, "Creazione dell'utente non riuscita", { detail: String(e?.message || e) }); }

        await audit(env, null, "setup", "users", null, email);
        return json({ ok: true });
      }

      if (seg[1] === "login" && method === "POST") {
        const email = String(body.email || "").toLowerCase().trim();
        const password = String(body.password || "");
        if (!email || !password) return err(400, "Email e password obbligatorie");

        // freno ai tentativi ripetuti: max 8 fallimenti in 15 minuti
        const fails = await env.DB.prepare(
          `SELECT COUNT(*) AS c FROM audit_log
            WHERE action='login_failed' AND detail=?1 AND created_at > datetime('now','-15 minutes')`)
          .bind(email).first();
        if ((fails?.c ?? 0) >= 8)
          return err(429, "Troppi tentativi falliti. Riprova tra qualche minuto.");

        const u = await env.DB.prepare(
          `SELECT id, email, name, role, active, password_hash FROM users WHERE email = ?1`)
          .bind(email).first();

        const ok = u && u.active && await verifyPassword(password, u.password_hash);
        if (!ok) {
          await audit(env, null, "login_failed", "users", u?.id ?? null, email);
          return err(401, "Credenziali non valide");
        }

        const token = b64(crypto.getRandomValues(new Uint8Array(32)))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
        await env.DB.prepare(
          `INSERT INTO sessions (token_hash, user_id, expires_at, ip, ua) VALUES (?1,?2,?3,?4,?5)`)
          .bind(await sha256hex(token), u.id, plusHours(SESSION_HOURS),
                request.headers.get("cf-connecting-ip") || null,
                (request.headers.get("user-agent") || "").slice(0, 200)).run();
        await env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?1`).bind(u.id).run();
        await audit(env, u, "login", "users", u.id, null);

        /* Manutenzione al login: è raro abbastanza da non pesare e frequente
           abbastanza da non far crescere le tabelle all'infinito. */
        try {
          await env.DB.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run();
          await env.DB.prepare(
            `DELETE FROM audit_log WHERE created_at < datetime('now','-180 days')`).run();
        } catch { /* la pulizia non deve mai impedire l'accesso */ }

        return json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } },
                     200, { "set-cookie": setCookie(token, SESSION_HOURS * 3600) });
      }

      if (seg[1] === "logout" && method === "POST") {
        const token = readCookie(request, COOKIE);
        if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?1`)
          .bind(await sha256hex(token)).run();
        return json({ ok: true }, 200, { "set-cookie": setCookie("", 0) });
      }

      if (seg[1] === "me" && method === "GET") {
        const u = await currentUser(request, env);
        return u ? json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } })
                 : err(401, "Non autenticato");
      }

      if (seg[1] === "password" && method === "POST") {
        const u = await currentUser(request, env);
        if (!u) return err(401, "Non autenticato");
        const row = await env.DB.prepare(`SELECT password_hash FROM users WHERE id = ?1`).bind(u.id).first();
        if (!await verifyPassword(String(body.current || ""), row.password_hash))
          return err(400, "Password attuale errata");
        if (String(body.next || "").length < 10) return err(400, "La nuova password deve avere almeno 10 caratteri");
        await env.DB.prepare(`UPDATE users SET password_hash = ?1 WHERE id = ?2`)
          .bind(await hashPassword(String(body.next)), u.id).run();
        await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1 AND token_hash <> ?2`)
          .bind(u.id, u.tokenHash).run();
        await audit(env, u, "password_change", "users", u.id, null);
        return json({ ok: true });
      }
    }

    /* ---------------------------------------------------------- PUBBLICO */
    if (seg[0] === "public") {

      if (seg[1] === "content" && method === "GET") {
        const db = env.DB;
        const [settings, translations, slots, speakers, sponsors, tiers, addons] = await Promise.all([
          db.prepare(`SELECT skey, svalue FROM settings`).all(),
          db.prepare(`SELECT tkey, value_json FROM translations`).all(),
          db.prepare(`SELECT day_no, time, tag, title_json, desc_json FROM programme_slots
                       WHERE published = 1 ORDER BY day_no, sort, id`).all(),
          db.prepare(`SELECT name, org, photo_url, role_json, bio_json FROM speakers
                       WHERE published = 1 ORDER BY sort, id`).all(),
          db.prepare(`SELECT name, tier, logo_url, url FROM sponsors
                       WHERE published = 1 ORDER BY sort, id`).all(),
          db.prepare(`SELECT code, early_price, late_price, name_json, desc_json FROM tiers
                       WHERE active = 1 ORDER BY sort, id`).all(),
          db.prepare(`SELECT code, price, name_json, desc_json FROM addons
                       WHERE active = 1 ORDER BY sort, id`).all()
        ]);

        /* Le giornate si ricavano dalle impostazioni, non da un numero fisso:
           un'edizione più lunga o più corta non richiede di toccare il codice. */
        const settingsMap = Object.fromEntries(settings.results.map(r => [r.skey, r.svalue]));
        const days = Math.max(1, Math.min(14, Number(settingsMap.event_days) || 3));
        const programme = {};
        for (let d = 1; d <= days; d++) programme[d] = [];
        for (const s of slots.results) {
          if (!programme[s.day_no]) continue;   // sessione oltre le giornate configurate
          programme[s.day_no].push({
            t: s.time, tag: s.tag || null,
            h: parseJson(s.title_json, {}), p: parseJson(s.desc_json, {})
          });
        }

        return json({
          settings: settingsMap,
          payments: {
            mode: payMode(settingsMap),
            provider: settingsMap.payments_provider || "stripe",
            methods: enabledMethods(settingsMap)
          },
          translations: Object.fromEntries(translations.results.map(r => [r.tkey, parseJson(r.value_json, {})])),
          programme,
          speakers: speakers.results.map(hydrateJson),
          sponsors: sponsors.results,
          tiers: tiers.results.map(hydrateJson),
          addons: addons.results.map(hydrateJson)
        }, 200, { "cache-control": "public, max-age=60, s-maxage=60" });
      }

      /* Iscrizione dal sito pubblico. I prezzi sono SEMPRE ricalcolati qui:
         quelli che arrivano dal browser non vengono mai usati. */
      if (seg[1] === "register" && method === "POST") {
        const open = await env.DB.prepare(`SELECT svalue FROM settings WHERE skey='registration_open'`).first();
        if (open && open.svalue !== "1") return err(403, "Le iscrizioni sono chiuse");

        const req = ["first_name", "last_name", "email", "org", "tier_code"];
        for (const f of req) if (!String(body[f] || "").trim()) return err(400, `Campo mancante: ${f}`);
        const email = String(body.email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err(400, "Email non valida");
        if (!body.consent_terms || !body.consent_gdpr) return err(400, "Consensi obbligatori mancanti");

        const tier = await env.DB.prepare(
          `SELECT code, early_price, late_price, capacity FROM tiers WHERE code = ?1 AND active = 1`)
          .bind(String(body.tier_code)).first();
        if (!tier) return err(400, "Tariffa non valida");

        if (tier.capacity != null) {
          const used = await env.DB.prepare(
            `SELECT COUNT(*) AS c FROM registrations
              WHERE tier_code = ?1 AND payment_status <> 'cancelled'`).bind(tier.code).first();
          if ((used?.c ?? 0) >= tier.capacity)
            return err(409, `Posti esauriti per la tariffa "${tier.code}"`, { soldOut: tier.code });
        }

        const earlyRow = await env.DB.prepare(`SELECT svalue FROM settings WHERE skey='early_until'`).first();
        const isEarly = earlyRow ? Date.now() < new Date(earlyRow.svalue + "T23:59:59Z").getTime() : false;
        const tierPrice = isEarly ? tier.early_price : tier.late_price;

        const wanted = Array.isArray(body.addons) ? body.addons.map(String) : [];
        let addonsTotal = 0;
        const chosen = [];
        if (wanted.length) {
          const { results } = await env.DB.prepare(
            `SELECT code, price, capacity FROM addons WHERE active = 1`).all();
          for (const a of results) {
            if (!wanted.includes(a.code)) continue;
            if (a.capacity != null) {                       // controllo capienza
              const used = await env.DB.prepare(
                `SELECT COUNT(*) AS c FROM registrations
                  WHERE payment_status <> 'cancelled' AND addons_json LIKE ?1`)
                .bind('%"' + a.code + '"%').first();
              if ((used?.c ?? 0) >= a.capacity)
                return err(409, `Posti esauriti per l'opzione "${a.code}"`, { soldOut: a.code });
            }
            addonsTotal += a.price;
            chosen.push(a.code);
          }
        }

        const total = tierPrice + addonsTotal;
        const ref = "EEBA27-" + b64(crypto.getRandomValues(new Uint8Array(6)))
          .replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();

        // Il metodo deve essere fra quelli attivi: non basta che esista.
        const settingsForMethod = await readSettings(env);
        const allowed = enabledMethods(settingsForMethod);
        const method = allowed.includes(body.payment_method) ? body.payment_method : allowed[0];

        await env.DB.prepare(
          `INSERT INTO registrations
             (ref, first_name, last_name, email, org, role, country, vat, diet, lang,
              tier_code, tier_price, addons_json, addons_total, total,
              payment_method, payment_status, newsletter)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,'pending',?17)`)
          .bind(ref,
            String(body.first_name).trim(), String(body.last_name).trim(), email,
            String(body.org || "").trim(), body.role || null, body.country || null,
            body.vat || null, body.diet || null, body.lang || "en",
            tier.code, tierPrice, JSON.stringify(chosen), addonsTotal, total,
            method, body.newsletter ? 1 : 0).run();

        await audit(env, null, "create", "registrations", ref, email);

        /* Dal metodo scelto dipende cosa succede adesso.
           Offline: l'iscrizione resta in attesa, la segreteria la segnerà pagata.
           Online: si apre una sessione presso il processore, salvo in modalità
           anteprima, dove il checkout è simulato dal sito stesso. */
        const settings = settingsForMethod;
        const mode = payMode(settings);
        const out = { ref, total, currency: settings.payments_currency || "EUR",
                      payment_status: "pending", method, mode };

        if (METHODS[method].kind === "offline") {
          await env.DB.prepare(`UPDATE registrations SET provider='manual' WHERE ref=?1`).bind(ref).run();
          return json(out, 201);
        }

        if (mode === "preview") {
          await env.DB.prepare(`UPDATE registrations SET provider='preview' WHERE ref=?1`).bind(ref).run();
          out.checkout_url = `/checkout-anteprima.html?ref=${encodeURIComponent(ref)}`;
          return json(out, 201);
        }

        try {
          const origin = new URL(request.url).origin;
          const { url: checkoutUrl, sessionId } = await stripeCheckout(env, settings,
            { ref, email, total }, method, origin);
          await env.DB.prepare(
            `UPDATE registrations SET provider='stripe', session_id=?1 WHERE ref=?2`)
            .bind(sessionId, ref).run();
          out.checkout_url = checkoutUrl;
          return json(out, 201);
        } catch (e) {
          /* L'iscrizione è già salvata: non la si perde perché il processore
             non risponde. Resta in attesa e la segreteria può recuperarla. */
          await audit(env, null, "payment_error", "registrations", ref, String(e.message).slice(0, 200));
          return json({ ...out, payment_error: String(e.message) }, 201);
        }
      }

      /* Checkout simulato: esiste solo in modalità anteprima e rifiuta di
         funzionare altrove, così non può diventare un modo per dichiararsi
         pagati una volta che i pagamenti sono veri. */
      if (seg[1] === "preview-pay" && method === "POST") {
        const settings = await readSettings(env);
        if (payMode(settings) !== "preview")
          return err(403, "Il checkout simulato è disponibile solo in modalità anteprima");
        const ref = String(body.ref || "");
        const esito = body.esito === "ok" ? "paid" : "cancelled";
        const r = await applyPaymentOutcome(env, ref, esito, { provider: "preview" });
        if (!r.ok) return err(404, r.reason);
        await audit(env, null, "preview_pay", "registrations", ref, esito);
        return json({ ok: true, ref, payment_status: esito });
      }

      /* Stato di un'iscrizione, per la pagina di ritorno dal pagamento.
         Restituisce il minimo indispensabile: chi conosce il riferimento non
         deve poter leggere i dati personali dell'iscritto. */
      if (seg[1] === "status" && method === "GET") {
        const ref = url.searchParams.get("ref") || "";
        const row = await env.DB.prepare(
          `SELECT ref, payment_status, payment_method, total, currency FROM registrations WHERE ref = ?1`)
          .bind(ref).first();
        if (!row) return err(404, "Riferimento non trovato");
        return json(row);
      }
    }

    /* ---------------------------------------------------------- WEBHOOK */
    /* Unico punto in cui un'iscrizione diventa "pagata" quando il pagamento è
       reale. Il ritorno del browser sulla pagina di successo non conta: si
       falsifica cambiando l'indirizzo. */
    if (seg[0] === "payments" && seg[1] === "webhook" && seg[2] === "stripe" && method === "POST") {
      const raw = rawBody;
      const sig = request.headers.get("stripe-signature");
      const secret = env.STRIPE_WEBHOOK_SECRET;

      if (!await stripeSignatureValid(raw, sig, secret)) {
        await audit(env, null, "webhook_rejected", "payments", null, "firma non valida");
        return err(400, "Firma non valida");
      }

      let event;
      try { event = JSON.parse(raw); } catch { return err(400, "Corpo non leggibile"); }

      // I webhook vengono ritentati: lo stesso evento non va elaborato due volte.
      const seen = await env.DB.prepare(
        `SELECT 1 AS x FROM payment_events WHERE provider='stripe' AND event_id=?1`)
        .bind(event.id).first();
      if (seen) return json({ ok: true, duplicate: true });

      const obj = event.data?.object || {};
      const ref = obj.client_reference_id || obj.metadata?.ref || null;
      const MAP = {
        "checkout.session.completed":       "paid",
        "checkout.session.async_payment_succeeded": "paid",
        "checkout.session.async_payment_failed":    "failed",
        "checkout.session.expired":         "cancelled",
        "charge.refunded":                  "refunded"
      };
      const status = MAP[event.type];

      let outcome = "ignored";
      if (status && ref) {
        const r = await applyPaymentOutcome(env, ref, status,
          { provider: "stripe", intentId: obj.payment_intent || obj.id, sessionId: obj.id });
        outcome = r.ok ? "processed" : "error";
      }

      await env.DB.prepare(
        `INSERT INTO payment_events (provider, event_id, event_type, ref, status, payload)
         VALUES ('stripe', ?1, ?2, ?3, ?4, ?5)`)
        .bind(event.id, event.type || null, ref, outcome, raw.slice(0, 4000)).run();

      return json({ ok: true, outcome });
    }

    /* ------------------------------------------------------------- ADMIN */
    if (seg[0] === "admin") {
      const user = await currentUser(request, env);
      if (!user) return err(401, "Non autenticato");

      const writing = method !== "GET" && method !== "HEAD";
      if (writing && !can(user, "editor")) return err(403, "Permessi insufficienti");

      /* --- riepilogo dashboard --- */
      if (seg[1] === "stats" && method === "GET") {
        const db = env.DB;
        const [tot, byStatus, byTier, byCountry, daily, addonRows, recent, cap] = await Promise.all([
          db.prepare(`SELECT COUNT(*) AS n,
                             COALESCE(SUM(total),0) AS gross,
                             COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END),0) AS paid,
                             COALESCE(SUM(CASE WHEN payment_status='pending' THEN total ELSE 0 END),0) AS pending,
                             COUNT(CASE WHEN created_at > datetime('now','-7 days') THEN 1 END) AS last7
                        FROM registrations WHERE payment_status <> 'cancelled'`).first(),
          db.prepare(`SELECT payment_status AS k, COUNT(*) AS n FROM registrations GROUP BY payment_status`).all(),
          db.prepare(`SELECT tier_code AS k, COUNT(*) AS n, COALESCE(SUM(total),0) AS v
                        FROM registrations WHERE payment_status <> 'cancelled'
                       GROUP BY tier_code ORDER BY n DESC`).all(),
          db.prepare(`SELECT COALESCE(country,'—') AS k, COUNT(*) AS n
                        FROM registrations WHERE payment_status <> 'cancelled'
                       GROUP BY country ORDER BY n DESC LIMIT 10`).all(),
          db.prepare(`SELECT date(created_at) AS d, COUNT(*) AS n, COALESCE(SUM(total),0) AS v
                        FROM registrations
                       WHERE created_at > datetime('now','-30 days') AND payment_status <> 'cancelled'
                       GROUP BY date(created_at) ORDER BY d`).all(),
          db.prepare(`SELECT addons_json FROM registrations WHERE payment_status <> 'cancelled'`).all(),
          db.prepare(`SELECT ref, first_name, last_name, email, org, country, tier_code, total,
                             payment_status, created_at
                        FROM registrations ORDER BY created_at DESC, id DESC LIMIT 8`).all(),
          db.prepare(`SELECT code, capacity, name_json FROM addons WHERE capacity IS NOT NULL`).all()
        ]);

        const addonCount = {};
        for (const r of addonRows.results)
          for (const c of parseJson(r.addons_json, [])) addonCount[c] = (addonCount[c] || 0) + 1;

        return json({
          totals: tot,
          byStatus: byStatus.results,
          byTier: byTier.results,
          byCountry: byCountry.results,
          daily: daily.results,
          addons: addonCount,
          capacity: cap.results.map(a => ({
            code: a.code, capacity: a.capacity,
            used: addonCount[a.code] || 0, name: parseJson(a.name_json, {})
          })),
          recent: recent.results
        });
      }

      /* --- iscrizioni --- */
      if (seg[1] === "registrations") {
        /* Stessi filtri per l'elenco e per l'export: quello che vedi è quello
           che scarichi. */
        const buildFilter = () => {
          const status = url.searchParams.get("status") || "";
          const tier   = url.searchParams.get("tier") || "";
          const search = (url.searchParams.get("q") || "").trim();
          const where = [], bind = [];
          if (status) { bind.push(status); where.push(`payment_status = ?${bind.length}`); }
          if (tier)   { bind.push(tier);   where.push(`tier_code = ?${bind.length}`); }
          if (search) {
            bind.push(`%${search}%`);
            const p = `?${bind.length}`;
            where.push(`(first_name LIKE ${p} OR last_name LIKE ${p} OR email LIKE ${p} OR org LIKE ${p} OR ref LIKE ${p})`);
          }
          return { wsql: where.length ? "WHERE " + where.join(" AND ") : "", bind };
        };

        if (method === "GET" && !seg[2]) {
          const limit  = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
          const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
          const { wsql, bind } = buildFilter();

          const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM registrations ${wsql}`)
            .bind(...bind).first();
          const { results } = await env.DB.prepare(
            `SELECT * FROM registrations ${wsql} ORDER BY created_at DESC, id DESC
              LIMIT ?${bind.length + 1} OFFSET ?${bind.length + 2}`)
            .bind(...bind, limit, offset).all();

          return json({ total: count.n, limit, offset, results: results.map(hydrateJson) });
        }

        if (seg[2] === "export.csv" && method === "GET") {
          const { wsql, bind } = buildFilter();
          const { results } = await env.DB.prepare(
            `SELECT ref, first_name, last_name, email, org, role, country, vat, diet, lang,
                    tier_code, tier_price, addons_json, addons_total, total,
                    payment_method, payment_status, created_at
               FROM registrations ${wsql} ORDER BY created_at DESC`).bind(...bind).all();
          const cols = Object.keys(results[0] || { ref: "" });
          const cell = v => {
            const s = v == null ? "" : String(v);
            return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          };
          const csv = "﻿" + [cols.join(";"), ...results.map(r => cols.map(c => cell(r[c])).join(";"))].join("\r\n");
          await audit(env, user, "export", "registrations", null, `${results.length} righe`);
          return new Response(csv, {
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": `attachment; filename="eeba2027-iscrizioni-${new Date().toISOString().slice(0,10)}.csv"`
            }
          });
        }

        if (seg[2] && method === "PATCH") {
          const allowed = ["payment_status", "payment_method", "notes", "diet", "org", "country", "role"];
          const cols = [], vals = [];
          for (const f of allowed) if (f in body) { cols.push(f); vals.push(body[f]); }
          if (!cols.length) return err(400, "Nessun campo modificabile");
          const set = cols.map((c, i) => `${c} = ?${i + 1}`).join(", ");
          const paid = body.payment_status === "paid" ? ", paid_at = datetime('now')" : "";
          await env.DB.prepare(
            `UPDATE registrations SET ${set}${paid}, updated_at = datetime('now') WHERE id = ?${cols.length + 1}`)
            .bind(...vals, seg[2]).run();
          await audit(env, user, "update", "registrations", seg[2], cols.join(","));
          return json({ ok: true });
        }

        if (seg[2] && method === "DELETE") {
          if (!can(user, "admin")) return err(403, "Solo un amministratore può eliminare le iscrizioni");
          await env.DB.prepare(`DELETE FROM registrations WHERE id = ?1`).bind(seg[2]).run();
          await audit(env, user, "delete", "registrations", seg[2], null);
          return json({ ok: true });
        }
      }

      /* --- contenuti (CRUD generico) --- */
      if (ENTITIES[seg[1]]) {
        const cfg = ENTITIES[seg[1]];
        if (method === "GET")    return json({ results: await entityList(env, cfg) });
        if (method === "POST") {
          const id = await entityCreate(env, cfg, body);
          await audit(env, user, "create", cfg.table, id, null);
          return json({ ok: true, id }, 201);
        }
        if (method === "PATCH" && seg[2]) {
          await entityUpdate(env, cfg, seg[2], body);
          await audit(env, user, "update", cfg.table, seg[2], Object.keys(body).join(","));
          return json({ ok: true });
        }
        if (method === "DELETE" && seg[2]) {
          await env.DB.prepare(`DELETE FROM ${cfg.table} WHERE id = ?1`).bind(seg[2]).run();
          await audit(env, user, "delete", cfg.table, seg[2], null);
          return json({ ok: true });
        }
        /* riordino in blocco: [{id, sort}, …] */
        if (method === "PUT" && seg[2] === "reorder" && Array.isArray(body.order)) {
          const stmt = env.DB.prepare(`UPDATE ${cfg.table} SET sort = ?1 WHERE id = ?2`);
          await env.DB.batch(body.order.map((o, i) => stmt.bind(i, o.id)));
          await audit(env, user, "reorder", cfg.table, null, `${body.order.length} elementi`);
          return json({ ok: true });
        }
      }

      /* --- impostazioni --- */
      if (seg[1] === "settings") {
        if (method === "GET") {
          const { results } = await env.DB.prepare(`SELECT skey, svalue FROM settings ORDER BY skey`).all();
          return json({ results });
        }
        if (method === "PATCH") {
          const entries = Object.entries(body || {}).map(([k, v]) => [k, sanitizeSetting(k, v)]);
          const bad = entries.find(([, v]) => v instanceof Error);
          if (bad) return err(400, `Valore non valido per "${bad[0]}": ${bad[1].message}`);
          if (!entries.length) return err(400, "Nessuna impostazione da salvare");
          const stmt = env.DB.prepare(
            `INSERT INTO settings (skey, svalue) VALUES (?1, ?2)
             ON CONFLICT(skey) DO UPDATE SET svalue = excluded.svalue, updated_at = datetime('now')`);
          await env.DB.batch(entries.map(([k, v]) => stmt.bind(k, String(v))));
          await audit(env, user, "update", "settings", null, entries.map(e => e[0]).join(","));
          return json({ ok: true });
        }
      }

      /* --- utenti (solo admin) --- */
      if (seg[1] === "users") {
        if (!can(user, "admin")) return err(403, "Riservato agli amministratori");
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT id, email, name, role, active, created_at, last_login_at FROM users ORDER BY id`).all();
          return json({ results });
        }
        if (method === "POST") {
          const { email, name, password, role } = body;
          if (!email || !password) return err(400, "Email e password obbligatorie");
          if (String(password).length < 10) return err(400, "La password deve avere almeno 10 caratteri");
          if (!["admin", "editor", "viewer"].includes(role || "editor")) return err(400, "Ruolo non valido");
          const hash = await hashPassword(String(password));
          try {
            const res = await env.DB.prepare(
              `INSERT INTO users (email, name, password_hash, role) VALUES (?1,?2,?3,?4)`)
              .bind(String(email).toLowerCase().trim(), name || email, hash, role || "editor").run();
            await audit(env, user, "create", "users", res.meta.last_row_id, email);
            return json({ ok: true, id: res.meta.last_row_id }, 201);
          } catch { return err(409, "Esiste già un utente con questa email"); }
        }
        if (method === "PATCH" && seg[2]) {
          const id = Number(seg[2]);
          const cols = [], vals = [];
          if ("name" in body)   { cols.push("name");   vals.push(body.name); }
          if ("role" in body)   {
            if (!["admin", "editor", "viewer"].includes(body.role)) return err(400, "Ruolo non valido");
            if (id === user.id && body.role !== "admin") return err(400, "Non puoi rimuovere i tuoi stessi permessi");
            cols.push("role"); vals.push(body.role);
          }
          if ("active" in body) {
            if (id === user.id && !body.active) return err(400, "Non puoi disattivare te stesso");
            cols.push("active"); vals.push(body.active ? 1 : 0);
          }
          if (body.password) {
            if (String(body.password).length < 10) return err(400, "La password deve avere almeno 10 caratteri");
            cols.push("password_hash"); vals.push(await hashPassword(String(body.password)));
          }
          if (!cols.length) return err(400, "Nessun campo da aggiornare");
          const set = cols.map((c, i) => `${c} = ?${i + 1}`).join(", ");
          await env.DB.prepare(`UPDATE users SET ${set} WHERE id = ?${cols.length + 1}`).bind(...vals, id).run();
          if (body.password || body.active === false)
            await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(id).run();
          await audit(env, user, "update", "users", id, cols.filter(c => c !== "password_hash").join(","));
          return json({ ok: true });
        }
        if (method === "DELETE" && seg[2]) {
          const id = Number(seg[2]);
          if (id === user.id) return err(400, "Non puoi eliminare te stesso");
          await env.DB.prepare(`DELETE FROM users WHERE id = ?1`).bind(id).run();
          await audit(env, user, "delete", "users", id, null);
          return json({ ok: true });
        }
      }

      /* --- stato del collegamento al processore ---
         Risponde solo se le chiavi ci sono, mai il loro valore. */
      if (seg[1] === "payments" && seg[2] === "health" && method === "GET") {
        const s = await readSettings(env);
        return json({
          mode: payMode(s),
          provider: s.payments_provider || "stripe",
          secret_key: !!env.STRIPE_SECRET_KEY,
          webhook_secret: !!env.STRIPE_WEBHOOK_SECRET,
          methods: enabledMethods(s)
        });
      }

      /* --- eventi ricevuti dal processore, per capire cosa è successo --- */
      if (seg[1] === "payments" && seg[2] === "events" && method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT id, provider, event_id, event_type, ref, status, created_at
             FROM payment_events ORDER BY id DESC LIMIT 100`).all();
        return json({ results });
      }

      /* --- registro attività --- */
      if (seg[1] === "audit" && method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT * FROM audit_log ORDER BY id DESC LIMIT 200`).all();
        return json({ results });
      }
    }

    return err(404, "Endpoint non trovato: /" + seg.join("/"));

  } catch (e) {
    return err(500, "Errore del server", { detail: String(e && e.message || e).slice(0, 300) });
  }
}
