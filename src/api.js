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

  let body = {};
  if (method === "POST" || method === "PATCH" || method === "PUT") {
    try { body = await request.json(); } catch { body = {}; }
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

        const programme = { 1: [], 2: [], 3: [] };
        for (const s of slots.results) {
          programme[s.day_no].push({
            t: s.time, tag: s.tag || null,
            h: parseJson(s.title_json, {}), p: parseJson(s.desc_json, {})
          });
        }

        return json({
          settings: Object.fromEntries(settings.results.map(r => [r.skey, r.svalue])),
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
          `SELECT code, early_price, late_price FROM tiers WHERE code = ?1 AND active = 1`)
          .bind(String(body.tier_code)).first();
        if (!tier) return err(400, "Tariffa non valida");

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
            ["card", "sepa", "inv"].includes(body.payment_method) ? body.payment_method : "card",
            body.newsletter ? 1 : 0).run();

        await audit(env, null, "create", "registrations", ref, email);
        // Qui, in produzione, si crea la sessione di pagamento e si restituisce l'URL.
        return json({ ref, total, currency: "EUR", payment_status: "pending" }, 201);
      }
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
        if (method === "GET" && !seg[2]) {
          const status = url.searchParams.get("status") || "";
          const tier   = url.searchParams.get("tier") || "";
          const search = (url.searchParams.get("q") || "").trim();
          const limit  = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
          const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

          const where = [], bind = [];
          if (status) { bind.push(status); where.push(`payment_status = ?${bind.length}`); }
          if (tier)   { bind.push(tier);   where.push(`tier_code = ?${bind.length}`); }
          if (search) {
            bind.push(`%${search}%`);
            const p = `?${bind.length}`;
            where.push(`(first_name LIKE ${p} OR last_name LIKE ${p} OR email LIKE ${p} OR org LIKE ${p} OR ref LIKE ${p})`);
          }
          const wsql = where.length ? "WHERE " + where.join(" AND ") : "";

          const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM registrations ${wsql}`)
            .bind(...bind).first();
          const { results } = await env.DB.prepare(
            `SELECT * FROM registrations ${wsql} ORDER BY created_at DESC, id DESC
              LIMIT ?${bind.length + 1} OFFSET ?${bind.length + 2}`)
            .bind(...bind, limit, offset).all();

          return json({ total: count.n, limit, offset, results: results.map(hydrateJson) });
        }

        if (seg[2] === "export.csv" && method === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT ref, first_name, last_name, email, org, role, country, vat, diet, lang,
                    tier_code, tier_price, addons_json, addons_total, total,
                    payment_method, payment_status, created_at
               FROM registrations ORDER BY created_at DESC`).all();
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
          const entries = Object.entries(body || {});
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
