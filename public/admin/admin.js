/* ==========================================================================
   EEBA 2027 — Backoffice
   SPA senza dipendenze. Routing via hash, dati da /api/*.
   ========================================================================== */
(function () {
"use strict";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

let ME = null;
let LANGS = ["en", "it", "nl", "fr"];
const LANG_LABEL = { en: "English", it: "Italiano", nl: "Nederlands", fr: "Français", de: "Deutsch", es: "Español" };

/* ------------------------------------------------------------------ utils */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = cents => new Intl.NumberFormat("it-IT",
  { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format((cents || 0) / 100);

const dt = s => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z"));
  return isNaN(d) ? s : d.toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const dOnly = s => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z"));
  return isNaN(d) ? s : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });
};

const canWrite = () => ME && (ME.role === "admin" || ME.role === "editor");
const isAdmin  = () => ME && ME.role === "admin";

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("err", !!isErr);
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 2600);
}

async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    headers: options.body ? { "content-type": "application/json" } : {},
    ...options
  });
  if (res.status === 401 && !path.startsWith("/auth")) { showGate(); throw new Error("Sessione scaduta"); }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    if (!res.ok) throw new Error("Errore " + res.status);
    return res;
  }
  const data = await res.json();
  if (!res.ok) {
    // Il dettaglio tecnico serve a capire i 500 senza dover aprire i log.
    const msg = data.error || ("Errore " + res.status);
    throw new Error(data.detail ? `${msg} — ${data.detail}` : msg);
  }
  return data;
}
const apiJson = (path, method, body) => api(path, { method, body: JSON.stringify(body || {}) });

/* ------------------------------------------------------------------ accesso */
async function boot() {
  try {
    const me = await api("/auth/me");
    ME = me.user;
    await showApp();
  } catch {
    const st = await api("/auth/state").catch(() => ({ needsSetup: false }));
    showGate(st.needsSetup);
  }
}

function showGate(needsSetup) {
  ME = null;
  $("#shell").classList.add("hidden");
  $("#gate").classList.remove("hidden");
  $("#loginForm").classList.toggle("hidden", !!needsSetup);
  $("#setupForm").classList.toggle("hidden", !needsSetup);
}

async function showApp() {
  $("#gate").classList.add("hidden");
  $("#shell").classList.remove("hidden");
  $("#meName").textContent = ME.name || ME.email;
  $("#meRole").textContent = ME.role;
  $("#meAv").textContent = (ME.name || ME.email).trim().slice(0, 2).toUpperCase();
  $("#navUsers").classList.toggle("hidden", !isAdmin());

  try {
    const s = await api("/admin/settings");
    const l = s.results.find(r => r.skey === "languages");
    if (l && l.svalue) LANGS = l.svalue.split(",").map(x => x.trim()).filter(Boolean);
  } catch {}

  route();
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const box = $("#loginErr"); box.classList.add("hidden");
  try {
    const r = await apiJson("/auth/login", "POST", { email: $("#lEmail").value, password: $("#lPass").value });
    ME = r.user; $("#lPass").value = "";
    await showApp();
  } catch (ex) { box.textContent = ex.message; box.classList.remove("hidden"); }
});

$("#setupForm").addEventListener("submit", async e => {
  e.preventDefault();
  const box = $("#setupErr"); box.classList.add("hidden");
  try {
    await apiJson("/auth/setup", "POST",
      { name: $("#sName").value, email: $("#sEmail").value, password: $("#sPass").value });
    const r = await apiJson("/auth/login", "POST", { email: $("#sEmail").value, password: $("#sPass").value });
    ME = r.user;
    await showApp();
    toast("Amministratore creato");
  } catch (ex) { box.textContent = ex.message; box.classList.remove("hidden"); }
});

$("#logoutBtn").addEventListener("click", async () => {
  await apiJson("/auth/logout", "POST").catch(() => {});
  location.hash = "";
  showGate();
});

$("#burger2").addEventListener("click", () => document.body.classList.toggle("nav-open"));
$$("#sideNav a").forEach(a => a.addEventListener("click", () => document.body.classList.remove("nav-open")));

/* ------------------------------------------------------------------ modale */
function modal({ title, body, actions, wide }) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  $("#modalBox").classList.toggle("wide", !!wide);
  const foot = $("#modalFoot");
  foot.innerHTML = "";
  (actions || []).forEach(a => {
    const b = document.createElement("button");
    b.className = "btn " + (a.cls || "btn--ghost");
    b.textContent = a.label;
    b.addEventListener("click", () => a.onClick && a.onClick());
    foot.appendChild(b);
  });
  $("#modal").classList.add("is-on");
}
const closeModal = () => $("#modal").classList.remove("is-on");
$("#modalX").addEventListener("click", closeModal);
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

function confirmDialog(title, text, onYes) {
  modal({
    title,
    body: `<p style="margin:0;color:var(--ink-70)">${esc(text)}</p>`,
    actions: [
      { label: "Annulla", onClick: closeModal },
      { label: "Conferma", cls: "btn--danger", onClick: () => { closeModal(); onYes(); } }
    ]
  });
}

/* ------------------------------------------- editor campo multilingua */
function langFieldHtml(id, values, { multiline, label } = {}) {
  const v = values || {};
  const tabs = LANGS.map((l, i) =>
    `<button type="button" class="${i === 0 ? "is-on" : ""}${v[l] ? "" : " empty"}" data-lt="${id}" data-l="${l}">${l}</button>`).join("");
  const panes = LANGS.map((l, i) => `
    <div class="langpane ${i === 0 ? "is-on" : ""}" data-lp="${id}" data-l="${l}">
      ${multiline
        ? `<textarea data-lf="${id}" data-l="${l}">${esc(v[l] || "")}</textarea>`
        : `<input data-lf="${id}" data-l="${l}" value="${esc(v[l] || "")}">`}
    </div>`).join("");
  return `<div class="f">
    ${label ? `<label>${esc(label)}</label>` : ""}
    <div class="langtabs">${tabs}</div>${panes}
  </div>`;
}

function bindLangTabs(root = document) {
  $$("[data-lt]", root).forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.lt;
    $$(`[data-lt="${id}"]`, root).forEach(b => b.classList.remove("is-on"));
    btn.classList.add("is-on");
    $$(`[data-lp="${id}"]`, root).forEach(p => p.classList.toggle("is-on", p.dataset.l === btn.dataset.l));
  }));
  $$("[data-lf]", root).forEach(inp => inp.addEventListener("input", () => {
    const tab = $(`[data-lt="${inp.dataset.lf}"][data-l="${inp.dataset.l}"]`, root);
    if (tab) tab.classList.toggle("empty", !inp.value.trim());
  }));
}

const readLangField = (id, root = document) =>
  Object.fromEntries(LANGS.map(l => [l, ($(`[data-lf="${id}"][data-l="${l}"]`, root) || {}).value || ""]));

/* --------------------------------------------------------------- grafici */
function lineChart(data, { w = 700, h = 200 } = {}) {
  if (!data.length) return `<div class="empty">Nessun dato negli ultimi 30 giorni</div>`;
  const pad = { t: 12, r: 8, b: 22, l: 34 };
  const max = Math.max(1, ...data.map(d => d.n));
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const x = i => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = v => pad.t + ih - (v / max) * ih;
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join(" ");
  const area = `M ${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} L ${pts.replace(/ /g, " L ")} L ${x(data.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;
  const ticks = [0, Math.ceil(max / 2), max];
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
    ${ticks.map(t => `<line class="axis" x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}"/>
                      <text x="4" y="${y(t) + 3}">${t}</text>`).join("")}
    <path class="area" d="${area}"/>
    <polyline class="line" points="${pts}"/>
    ${data.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.n)}" r="2.5" fill="#0057D9"><title>${d.d}: ${d.n}</title></circle>`).join("")}
    <text x="${pad.l}" y="${h - 6}">${data[0].d}</text>
    <text x="${w - pad.r}" y="${h - 6}" text-anchor="end">${data[data.length - 1].d}</text>
  </svg>`;
}

function hbars(rows, labelFn) {
  if (!rows.length) return `<div class="empty" style="padding:28px">Nessun dato</div>`;
  const max = Math.max(...rows.map(r => r.n));
  return `<div class="hbar">` + rows.map(r => `
    <div class="hbar__r">
      <div class="hbar__t">
        <span>${esc(labelFn ? labelFn(r) : r.k)}</span>
        <span class="hbar__track"><span class="hbar__fill" style="width:${(r.n / max * 100).toFixed(1)}%"></span></span>
      </div>
      <span class="hbar__n">${r.n}</span>
    </div>`).join("") + `</div>`;
}

/* =========================================================== ROUTING */
const VIEWS = {};
function setHeader(title, sub, actions) {
  $("#viewTitle").textContent = title;
  $("#viewSub").textContent = sub || "";
  const box = $("#viewAct"); box.innerHTML = "";
  (actions || []).forEach(a => {
    const b = document.createElement("button");
    b.className = "btn " + (a.cls || "btn--ghost");
    b.innerHTML = esc(a.label);
    b.addEventListener("click", a.onClick);
    box.appendChild(b);
  });
}

async function route() {
  if (!ME) return;
  const name = (location.hash.replace(/^#\/?/, "") || "dashboard").split("/")[0];
  const view = VIEWS[name] ? name : "dashboard";
  $$("#sideNav a").forEach(a => a.classList.toggle("is-on", a.dataset.view === view));
  $("#view").innerHTML = `<div class="spinner"></div>`;
  try { await VIEWS[view](); }
  catch (e) { $("#view").innerHTML = `<div class="alert alert--err">${esc(e.message)}</div>`; }
  refreshBadge();
}
window.addEventListener("hashchange", route);

async function refreshBadge() {
  try {
    const d = await api("/admin/registrations?limit=1");
    $("#navRegCount").textContent = d.total;
  } catch {}
}

/* =========================================================== DASHBOARD */
VIEWS.dashboard = async function () {
  const s = await api("/admin/stats");
  const t = s.totals || {};
  setHeader("Dashboard", "Quadro generale di iscrizioni e incassi", [
    { label: "Aggiorna", onClick: route }
  ]);

  const statusLabel = { paid: "Pagate", pending: "In attesa", refunded: "Rimborsate", cancelled: "Annullate" };
  const tierName = {};
  try { (await api("/admin/tiers")).results.forEach(x => tierName[x.code] = x.name_json.it || x.name_json.en || x.code); } catch {}

  $("#view").innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="kpi__l">Iscrizioni</div><div class="kpi__v">${t.n || 0}</div>
        <div class="kpi__d"><b>+${t.last7 || 0}</b> negli ultimi 7 giorni</div></div>
      <div class="kpi"><div class="kpi__l">Valore totale</div><div class="kpi__v">${money(t.gross)}</div>
        <div class="kpi__d">annullate escluse</div></div>
      <div class="kpi"><div class="kpi__l">Incassato</div><div class="kpi__v">${money(t.paid)}</div>
        <div class="kpi__d">${t.gross ? Math.round((t.paid / t.gross) * 100) : 0}% del totale</div></div>
      <div class="kpi"><div class="kpi__l">Da incassare</div><div class="kpi__v">${money(t.pending)}</div>
        <div class="kpi__d">in attesa di pagamento</div></div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card__h"><h3>Iscrizioni — ultimi 30 giorni</h3></div>
        <div class="card__b">${lineChart(s.daily || [])}</div>
      </div>
      <div class="card">
        <div class="card__h"><h3>Stato pagamenti</h3></div>
        <div class="card__b">${hbars(s.byStatus || [], r => statusLabel[r.k] || r.k)}</div>
      </div>
    </div>

    <div class="grid3">
      <div class="card">
        <div class="card__h"><h3>Per tariffa</h3></div>
        <div class="card__b">${hbars(s.byTier || [], r => tierName[r.k] || r.k)}</div>
      </div>
      <div class="card">
        <div class="card__h"><h3>Per paese</h3></div>
        <div class="card__b">${hbars(s.byCountry || [])}</div>
      </div>
      <div class="card">
        <div class="card__h"><h3>Capienza extra</h3></div>
        <div class="card__b">${(s.capacity || []).length ? `<div class="hbar">${s.capacity.map(c => `
          <div class="hbar__r">
            <div class="hbar__t">
              <span>${esc(c.name.it || c.name.en || c.code)}</span>
              <span class="hbar__track"><span class="hbar__fill" style="width:${Math.min(100, c.used / c.capacity * 100).toFixed(1)}%;background:${c.used >= c.capacity ? "var(--danger)" : "var(--accent)"}"></span></span>
            </div>
            <span class="hbar__n">${c.used}/${c.capacity}</span>
          </div>`).join("")}</div>` : `<div class="empty" style="padding:28px">Nessun extra a capienza limitata</div>`}</div>
      </div>
    </div>

    <div class="card">
      <div class="card__h"><h3>Ultime iscrizioni</h3>
        <div class="act"><a class="btn btn--ghost btn--sm" href="#/registrations">Vedi tutte</a></div></div>
      <div class="tblwrap">
        <table><thead><tr>
          <th>Riferimento</th><th>Nome</th><th>Ente</th><th>Paese</th><th>Tariffa</th>
          <th class="num">Totale</th><th>Stato</th><th>Data</th>
        </tr></thead><tbody>
        ${(s.recent || []).length ? s.recent.map(r => `<tr>
          <td class="mono">${esc(r.ref)}</td>
          <td>${esc(r.first_name)} ${esc(r.last_name)}<div class="muted">${esc(r.email)}</div></td>
          <td>${esc(r.org || "—")}</td>
          <td>${esc(r.country || "—")}</td>
          <td><span class="pill pill--plain">${esc(tierName[r.tier_code] || r.tier_code)}</span></td>
          <td class="num">${money(r.total)}</td>
          <td><span class="pill pill--${r.payment_status}">${statusLabel[r.payment_status] || r.payment_status}</span></td>
          <td class="muted">${dOnly(r.created_at)}</td>
        </tr>`).join("") : `<tr><td colspan="8"><div class="empty">Ancora nessuna iscrizione</div></td></tr>`}
        </tbody></table>
      </div>
    </div>`;
};

/* ======================================================== ISCRIZIONI */
const regFilters = { q: "", status: "", tier: "", offset: 0, limit: 50 };

VIEWS.registrations = async function () {
  const tiers = (await api("/admin/tiers")).results;
  const tierName = Object.fromEntries(tiers.map(t => [t.code, t.name_json.it || t.name_json.en || t.code]));
  const statusLabel = { paid: "Pagata", pending: "In attesa", refunded: "Rimborsata", cancelled: "Annullata" };

  setHeader("Iscrizioni", "Elenco completo, filtri e scarico dati", [
    { label: "Esporta CSV", onClick: () => location.href = "/api/admin/registrations/export.csv" }
  ]);

  $("#view").innerHTML = `
    <div class="filters">
      <input type="search" id="fq" placeholder="Cerca nome, email, ente o riferimento…" value="${esc(regFilters.q)}">
      <select id="fstatus">
        <option value="">Tutti gli stati</option>
        ${Object.entries(statusLabel).map(([k, v]) => `<option value="${k}" ${regFilters.status === k ? "selected" : ""}>${v}</option>`).join("")}
      </select>
      <select id="ftier">
        <option value="">Tutte le tariffe</option>
        ${tiers.map(t => `<option value="${esc(t.code)}" ${regFilters.tier === t.code ? "selected" : ""}>${esc(tierName[t.code])}</option>`).join("")}
      </select>
      <span class="spacer"></span>
      <span class="muted" id="fcount"></span>
    </div>
    <div class="card"><div class="tblwrap"><table>
      <thead><tr>
        <th>Riferimento</th><th>Delegato</th><th>Ente</th><th>Tariffa</th><th>Extra</th>
        <th class="num">Totale</th><th>Stato</th><th>Data</th><th></th>
      </tr></thead>
      <tbody id="regRows"><tr><td colspan="9"><div class="spinner"></div></td></tr></tbody>
    </table></div>
    <div style="padding:14px 20px;display:flex;gap:10px;align-items:center;border-top:1px solid var(--line)">
      <button class="btn btn--ghost btn--sm" id="prevPage">← Precedenti</button>
      <button class="btn btn--ghost btn--sm" id="nextPage">Successive →</button>
      <span class="muted" id="pageInfo" style="margin-left:auto"></span>
    </div></div>`;

  async function load() {
    const p = new URLSearchParams({
      q: regFilters.q, status: regFilters.status, tier: regFilters.tier,
      limit: regFilters.limit, offset: regFilters.offset
    });
    const d = await api("/admin/registrations?" + p);
    $("#fcount").textContent = `${d.total} risultat${d.total === 1 ? "o" : "i"}`;
    $("#pageInfo").textContent = d.total
      ? `${d.offset + 1}–${Math.min(d.offset + d.limit, d.total)} di ${d.total}` : "";
    $("#prevPage").disabled = d.offset === 0;
    $("#nextPage").disabled = d.offset + d.limit >= d.total;

    $("#regRows").innerHTML = d.results.length ? d.results.map(r => `
      <tr>
        <td class="mono">${esc(r.ref)}</td>
        <td>${esc(r.first_name)} ${esc(r.last_name)}<div class="muted">${esc(r.email)}</div></td>
        <td>${esc(r.org || "—")}<div class="muted">${esc(r.country || "")}</div></td>
        <td><span class="pill pill--plain">${esc(tierName[r.tier_code] || r.tier_code)}</span></td>
        <td class="muted">${(r.addons_json && r.addons_json.length) ? r.addons_json.join(", ") : "—"}</td>
        <td class="num">${money(r.total)}</td>
        <td><span class="pill pill--${r.payment_status}">${statusLabel[r.payment_status] || r.payment_status}</span></td>
        <td class="muted">${dOnly(r.created_at)}</td>
        <td class="rowact"><button class="btn btn--subtle btn--sm" data-open="${r.id}">Apri</button></td>
      </tr>`).join("")
      : `<tr><td colspan="9"><div class="empty">Nessuna iscrizione con questi filtri</div></td></tr>`;

    $$("[data-open]").forEach(b => b.addEventListener("click", () =>
      openReg(d.results.find(x => String(x.id) === b.dataset.open), tierName, statusLabel, load)));
  }

  let deb;
  $("#fq").addEventListener("input", e => {
    clearTimeout(deb);
    deb = setTimeout(() => { regFilters.q = e.target.value; regFilters.offset = 0; load(); }, 280);
  });
  $("#fstatus").addEventListener("change", e => { regFilters.status = e.target.value; regFilters.offset = 0; load(); });
  $("#ftier").addEventListener("change", e => { regFilters.tier = e.target.value; regFilters.offset = 0; load(); });
  $("#prevPage").addEventListener("click", () => { regFilters.offset = Math.max(0, regFilters.offset - regFilters.limit); load(); });
  $("#nextPage").addEventListener("click", () => { regFilters.offset += regFilters.limit; load(); });

  await load();
};

function openReg(r, tierName, statusLabel, reload) {
  if (!r) return;
  const ro = !canWrite();
  modal({
    title: `Iscrizione ${r.ref}`,
    wide: true,
    body: `
      <dl class="kv" style="margin:0 0 22px">
        <dt>Delegato</dt><dd>${esc(r.first_name)} ${esc(r.last_name)}</dd>
        <dt>Email</dt><dd><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></dd>
        <dt>Ente</dt><dd>${esc(r.org || "—")}</dd>
        <dt>Ruolo</dt><dd>${esc(r.role || "—")}</dd>
        <dt>Paese</dt><dd>${esc(r.country || "—")}</dd>
        <dt>P. IVA</dt><dd>${esc(r.vat || "—")}</dd>
        <dt>Esigenze alim.</dt><dd>${esc(r.diet || "—")}</dd>
        <dt>Lingua</dt><dd>${esc(r.lang)}</dd>
        <dt>Tariffa</dt><dd>${esc(tierName[r.tier_code] || r.tier_code)} — ${money(r.tier_price)}</dd>
        <dt>Extra</dt><dd>${(r.addons_json || []).length ? esc(r.addons_json.join(", ")) + " — " + money(r.addons_total) : "—"}</dd>
        <dt>Totale</dt><dd><b>${money(r.total)}</b></dd>
        <dt>Creata il</dt><dd>${dt(r.created_at)}</dd>
        <dt>Pagata il</dt><dd>${dt(r.paid_at)}</dd>
      </dl>
      <div class="f-row">
        <div class="f"><label>Stato pagamento</label>
          <select id="mStatus" ${ro ? "disabled" : ""}>
            ${Object.entries(statusLabel).map(([k, v]) => `<option value="${k}" ${r.payment_status === k ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
        <div class="f"><label>Metodo</label>
          <select id="mMethod" ${ro ? "disabled" : ""}>
            ${[["card", "Carta"], ["sepa", "Bonifico SEPA"], ["inv", "Fattura"]].map(([k, v]) =>
              `<option value="${k}" ${r.payment_method === k ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
      </div>
      <div class="f"><label>Note interne</label>
        <textarea id="mNotes" ${ro ? "disabled" : ""}>${esc(r.notes || "")}</textarea></div>`,
    actions: ro ? [{ label: "Chiudi", onClick: closeModal }] : [
      { label: "Elimina", cls: "btn--danger", onClick: () => {
          if (!isAdmin()) return toast("Solo un amministratore può eliminare", true);
          confirmDialog("Eliminare l'iscrizione?",
            `${r.ref} — ${r.first_name} ${r.last_name}. L'operazione non è reversibile.`,
            async () => {
              await api(`/admin/registrations/${r.id}`, { method: "DELETE" });
              toast("Iscrizione eliminata"); reload();
            });
        } },
      { label: "Annulla", onClick: closeModal },
      { label: "Salva", cls: "btn--primary", onClick: async () => {
          try {
            await apiJson(`/admin/registrations/${r.id}`, "PATCH", {
              payment_status: $("#mStatus").value,
              payment_method: $("#mMethod").value,
              notes: $("#mNotes").value
            });
            closeModal(); toast("Iscrizione aggiornata"); reload();
          } catch (e) { toast(e.message, true); }
        } }
    ]
  });
}

/* ========================================================= PROGRAMMA */
VIEWS.programme = async function () {
  const d = await api("/admin/programme");
  const TAGS = { key: "Lettura", lab: "Wetlab", soc: "Sociale", sym: "Simposio", free: "Comunicazioni", ind: "Industria", ws: "Workshop" };

  setHeader("Programma", "Sessioni delle tre giornate — pubblicate subito sul sito",
    canWrite() ? [{ label: "+ Nuova sessione", cls: "btn--primary", onClick: () => editSlot(null) }] : []);

  const byDay = { 1: [], 2: [], 3: [] };
  d.results.forEach(s => byDay[s.day_no]?.push(s));
  const dayLabel = { 1: "Giorno 1 — giovedì 8 aprile", 2: "Giorno 2 — venerdì 9 aprile", 3: "Giorno 3 — sabato 10 aprile" };

  $("#view").innerHTML = [1, 2, 3].map(day => `
    <div class="card" style="margin-bottom:16px">
      <div class="card__h"><h3>${dayLabel[day]}</h3>
        <span class="pill pill--plain">${byDay[day].length} sessioni</span></div>
      <div class="tblwrap"><table>
        <thead><tr><th style="width:80px">Ora</th><th>Titolo (IT)</th><th>Tipo</th><th>Stato</th><th></th></tr></thead>
        <tbody>${byDay[day].length ? byDay[day].map(s => `
          <tr>
            <td class="mono">${esc(s.time)}</td>
            <td>${esc(s.title_json.it || s.title_json.en || "—")}
              <div class="muted">${esc((s.desc_json.it || s.desc_json.en || "").slice(0, 90))}</div></td>
            <td>${s.tag ? `<span class="pill pill--plain">${TAGS[s.tag] || s.tag}</span>` : "—"}</td>
            <td>${s.published ? `<span class="pill pill--paid">Pubblicata</span>` : `<span class="pill pill--refunded">Nascosta</span>`}</td>
            <td class="rowact">${canWrite() ? `<button class="btn btn--subtle btn--sm" data-edit="${s.id}">Modifica</button>` : ""}</td>
          </tr>`).join("") : `<tr><td colspan="5"><div class="empty" style="padding:28px">Nessuna sessione</div></td></tr>`}
        </tbody></table></div>
    </div>`).join("");

  $$("[data-edit]").forEach(b => b.addEventListener("click", () =>
    editSlot(d.results.find(x => String(x.id) === b.dataset.edit))));

  function editSlot(s) {
    const isNew = !s;
    s = s || { day_no: 1, time: "09:00", tag: "", title_json: {}, desc_json: {}, published: 1, sort: 99 };
    modal({
      title: isNew ? "Nuova sessione" : "Modifica sessione",
      wide: true,
      body: `
        <div class="f-row-3">
          <div class="f"><label>Giornata</label><select id="sDay">
            ${[1, 2, 3].map(n => `<option value="${n}" ${s.day_no === n ? "selected" : ""}>Giorno ${n}</option>`).join("")}
          </select></div>
          <div class="f"><label>Ora</label><input id="sTime" value="${esc(s.time)}" placeholder="09:00"></div>
          <div class="f"><label>Ordine</label><input id="sSort" type="number" value="${s.sort ?? 0}"></div>
        </div>
        <div class="f"><label>Tipo di sessione</label><select id="sTag">
          <option value="">— nessuno —</option>
          ${Object.entries(TAGS).map(([k, v]) => `<option value="${k}" ${s.tag === k ? "selected" : ""}>${v}</option>`).join("")}
        </select></div>
        ${langFieldHtml("title", s.title_json, { label: "Titolo" })}
        ${langFieldHtml("desc", s.desc_json, { label: "Descrizione", multiline: true })}
        <label class="switch"><input type="checkbox" id="sPub" ${s.published ? "checked" : ""}> Pubblicata sul sito</label>`,
      actions: [
        { label: "Annulla", onClick: closeModal },
        ...(isNew ? [] : [{ label: "Elimina", cls: "btn--danger", onClick: () =>
            confirmDialog("Eliminare la sessione?", s.title_json.it || s.title_json.en || "", async () => {
              await api(`/admin/programme/${s.id}`, { method: "DELETE" });
              closeModal(); toast("Sessione eliminata"); route();
            }) }]),
        { label: "Salva", cls: "btn--primary", onClick: async () => {
            const payload = {
              day_no: Number($("#sDay").value), time: $("#sTime").value.trim(),
              tag: $("#sTag").value || null, sort: Number($("#sSort").value) || 0,
              title_json: readLangField("title"), desc_json: readLangField("desc"),
              published: $("#sPub").checked ? 1 : 0
            };
            try {
              if (isNew) await apiJson("/admin/programme", "POST", payload);
              else await apiJson(`/admin/programme/${s.id}`, "PATCH", payload);
              closeModal(); toast("Programma aggiornato"); route();
            } catch (e) { toast(e.message, true); }
          } }
      ]
    });
    bindLangTabs();
  }
};

/* ========================================================== RELATORI */
VIEWS.speakers = async function () {
  const d = await api("/admin/speakers");
  setHeader("Relatori", "Lascia il nome vuoto per mostrare il segnaposto “TBA” sul sito",
    canWrite() ? [{ label: "+ Nuovo relatore", cls: "btn--primary", onClick: () => edit(null) }] : []);

  $("#view").innerHTML = `<div class="card"><div class="tblwrap"><table>
    <thead><tr><th style="width:40px"></th><th>Nome</th><th>Ente</th><th>Ruolo (IT)</th><th>Stato</th><th></th></tr></thead>
    <tbody>${d.results.length ? d.results.map(s => `
      <tr>
        <td class="handle">⠿</td>
        <td>${s.name ? esc(s.name) : `<span class="muted">— da annunciare —</span>`}</td>
        <td>${esc(s.org || "—")}</td>
        <td>${esc(s.role_json.it || s.role_json.en || "—")}</td>
        <td>${s.published ? `<span class="pill pill--paid">Pubblicato</span>` : `<span class="pill pill--refunded">Nascosto</span>`}</td>
        <td class="rowact">${canWrite() ? `<button class="btn btn--subtle btn--sm" data-edit="${s.id}">Modifica</button>` : ""}</td>
      </tr>`).join("") : `<tr><td colspan="6"><div class="empty">Nessun relatore</div></td></tr>`}
    </tbody></table></div></div>`;

  $$("[data-edit]").forEach(b => b.addEventListener("click", () =>
    edit(d.results.find(x => String(x.id) === b.dataset.edit))));

  function edit(s) {
    const isNew = !s;
    s = s || { name: "", org: "", photo_url: "", role_json: {}, bio_json: {}, published: 1, sort: 99 };
    modal({
      title: isNew ? "Nuovo relatore" : "Modifica relatore",
      wide: true,
      body: `
        <div class="f-row">
          <div class="f"><label>Nome e cognome</label><input id="pName" value="${esc(s.name)}" placeholder="Lasciare vuoto = TBA"></div>
          <div class="f"><label>Ente</label><input id="pOrg" value="${esc(s.org)}"></div>
        </div>
        <div class="f-row">
          <div class="f"><label>URL foto</label><input id="pPhoto" value="${esc(s.photo_url || "")}" placeholder="https://…">
            <p class="hint">Vuoto = segnaposto grafico sul sito.</p></div>
          <div class="f"><label>Ordine</label><input id="pSort" type="number" value="${s.sort ?? 0}"></div>
        </div>
        ${langFieldHtml("role", s.role_json, { label: "Ruolo nel programma" })}
        ${langFieldHtml("bio", s.bio_json, { label: "Biografia", multiline: true })}
        <label class="switch"><input type="checkbox" id="pPub" ${s.published ? "checked" : ""}> Pubblicato sul sito</label>`,
      actions: [
        { label: "Annulla", onClick: closeModal },
        ...(isNew ? [] : [{ label: "Elimina", cls: "btn--danger", onClick: () =>
            confirmDialog("Eliminare il relatore?", s.name || "Segnaposto TBA", async () => {
              await api(`/admin/speakers/${s.id}`, { method: "DELETE" });
              closeModal(); toast("Relatore eliminato"); route();
            }) }]),
        { label: "Salva", cls: "btn--primary", onClick: async () => {
            const payload = {
              name: $("#pName").value.trim(), org: $("#pOrg").value.trim(),
              photo_url: $("#pPhoto").value.trim() || null, sort: Number($("#pSort").value) || 0,
              role_json: readLangField("role"), bio_json: readLangField("bio"),
              published: $("#pPub").checked ? 1 : 0
            };
            try {
              if (isNew) await apiJson("/admin/speakers", "POST", payload);
              else await apiJson(`/admin/speakers/${s.id}`, "PATCH", payload);
              closeModal(); toast("Relatore salvato"); route();
            } catch (e) { toast(e.message, true); }
          } }
      ]
    });
    bindLangTabs();
  }
};

/* =========================================================== SPONSOR */
VIEWS.sponsors = async function () {
  const d = await api("/admin/sponsors");
  const TIERS = { platinum: "Platinum", gold: "Gold", silver: "Silver", partner: "Partner" };
  setHeader("Sponsor", "Partner industriali mostrati nella sezione dedicata",
    canWrite() ? [{ label: "+ Nuovo sponsor", cls: "btn--primary", onClick: () => edit(null) }] : []);

  $("#view").innerHTML = `<div class="card"><div class="tblwrap"><table>
    <thead><tr><th>Nome</th><th>Livello</th><th>Sito</th><th>Logo</th><th>Stato</th><th></th></tr></thead>
    <tbody>${d.results.length ? d.results.map(s => `
      <tr>
        <td>${esc(s.name)}</td>
        <td><span class="pill pill--plain">${TIERS[s.tier] || s.tier}</span></td>
        <td>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url.replace(/^https?:\/\//, "").slice(0, 34))}</a>` : "—"}</td>
        <td class="muted">${s.logo_url ? "sì" : "—"}</td>
        <td>${s.published ? `<span class="pill pill--paid">Pubblicato</span>` : `<span class="pill pill--refunded">Nascosto</span>`}</td>
        <td class="rowact">${canWrite() ? `<button class="btn btn--subtle btn--sm" data-edit="${s.id}">Modifica</button>` : ""}</td>
      </tr>`).join("") : `<tr><td colspan="6"><div class="empty">Nessuno sponsor</div></td></tr>`}
    </tbody></table></div></div>`;

  $$("[data-edit]").forEach(b => b.addEventListener("click", () =>
    edit(d.results.find(x => String(x.id) === b.dataset.edit))));

  function edit(s) {
    const isNew = !s;
    s = s || { name: "", tier: "silver", logo_url: "", url: "", published: 1, sort: 99 };
    modal({
      title: isNew ? "Nuovo sponsor" : "Modifica sponsor",
      body: `
        <div class="f"><label>Nome</label><input id="zName" value="${esc(s.name)}"></div>
        <div class="f-row">
          <div class="f"><label>Livello</label><select id="zTier">
            ${Object.entries(TIERS).map(([k, v]) => `<option value="${k}" ${s.tier === k ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
          <div class="f"><label>Ordine</label><input id="zSort" type="number" value="${s.sort ?? 0}"></div>
        </div>
        <div class="f"><label>URL logo</label><input id="zLogo" value="${esc(s.logo_url || "")}" placeholder="https://…"></div>
        <div class="f"><label>Sito web</label><input id="zUrl" value="${esc(s.url || "")}" placeholder="https://…"></div>
        <label class="switch"><input type="checkbox" id="zPub" ${s.published ? "checked" : ""}> Pubblicato sul sito</label>`,
      actions: [
        { label: "Annulla", onClick: closeModal },
        ...(isNew ? [] : [{ label: "Elimina", cls: "btn--danger", onClick: () =>
            confirmDialog("Eliminare lo sponsor?", s.name, async () => {
              await api(`/admin/sponsors/${s.id}`, { method: "DELETE" });
              closeModal(); toast("Sponsor eliminato"); route();
            }) }]),
        { label: "Salva", cls: "btn--primary", onClick: async () => {
            const payload = {
              name: $("#zName").value.trim(), tier: $("#zTier").value,
              logo_url: $("#zLogo").value.trim() || null, url: $("#zUrl").value.trim() || null,
              sort: Number($("#zSort").value) || 0, published: $("#zPub").checked ? 1 : 0
            };
            if (!payload.name) return toast("Il nome è obbligatorio", true);
            try {
              if (isNew) await apiJson("/admin/sponsors", "POST", payload);
              else await apiJson(`/admin/sponsors/${s.id}`, "PATCH", payload);
              closeModal(); toast("Sponsor salvato"); route();
            } catch (e) { toast(e.message, true); }
          } }
      ]
    });
  }
};

/* ======================================================= TRADUZIONI */
VIEWS.translations = async function () {
  const d = await api("/admin/translations");
  let filter = "", onlyMissing = false;

  setHeader("Traduzioni", `${d.results.length} chiavi — ogni modifica è online al prossimo caricamento`, []);

  $("#view").innerHTML = `
    <div class="filters">
      <input type="search" id="tq" placeholder="Cerca per chiave o per testo…">
      <label class="switch"><input type="checkbox" id="tMissing"> Solo con lingue mancanti</label>
      <span class="spacer"></span><span class="muted" id="tCount"></span>
    </div>
    <div class="card"><div class="tblwrap"><table>
      <thead><tr><th style="width:210px">Chiave</th>${LANGS.map(l => `<th>${l.toUpperCase()}</th>`).join("")}<th></th></tr></thead>
      <tbody id="tRows"></tbody>
    </table></div></div>`;

  function render() {
    const q = filter.toLowerCase();
    const rows = d.results.filter(r => {
      const missing = LANGS.some(l => !String(r.value_json[l] || "").trim());
      if (onlyMissing && !missing) return false;
      if (!q) return true;
      return r.tkey.toLowerCase().includes(q) ||
             LANGS.some(l => String(r.value_json[l] || "").toLowerCase().includes(q));
    });
    $("#tCount").textContent = `${rows.length} di ${d.results.length}`;
    $("#tRows").innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td class="mono" style="color:var(--accent)">${esc(r.tkey)}</td>
        ${LANGS.map(l => {
          const v = String(r.value_json[l] || "");
          return `<td class="${v ? "" : "muted"}" style="max-width:230px">${v ? esc(v.slice(0, 70)) + (v.length > 70 ? "…" : "") : "— mancante —"}</td>`;
        }).join("")}
        <td class="rowact">${canWrite() ? `<button class="btn btn--subtle btn--sm" data-edit="${r.id}">Modifica</button>` : ""}</td>
      </tr>`).join("")
      : `<tr><td colspan="${LANGS.length + 2}"><div class="empty">Nessuna chiave corrisponde</div></td></tr>`;

    $$("[data-edit]").forEach(b => b.addEventListener("click", () =>
      edit(d.results.find(x => String(x.id) === b.dataset.edit))));
  }

  let deb;
  $("#tq").addEventListener("input", e => { clearTimeout(deb); deb = setTimeout(() => { filter = e.target.value; render(); }, 200); });
  $("#tMissing").addEventListener("change", e => { onlyMissing = e.target.checked; render(); });
  render();

  function edit(r) {
    modal({
      title: r.tkey,
      wide: true,
      body: `<p class="hint" style="margin:0 0 16px;color:var(--ink-45)">
               Questo testo sostituisce quello di <code>i18n.js</code> sul sito pubblico.</p>
             ${langFieldHtml("tv", r.value_json, { multiline: true })}`,
      actions: [
        { label: "Annulla", onClick: closeModal },
        { label: "Salva", cls: "btn--primary", onClick: async () => {
            try {
              const value_json = readLangField("tv");
              await apiJson(`/admin/translations/${r.id}`, "PATCH", { value_json });
              r.value_json = value_json;
              closeModal(); toast("Traduzione salvata"); render();
            } catch (e) { toast(e.message, true); }
          } }
      ]
    });
    bindLangTabs();
  }
};

/* ==================================================== TARIFFE ED EXTRA */
VIEWS.pricing = async function () {
  const [tiers, addons, settings] = await Promise.all([
    api("/admin/tiers"), api("/admin/addons"), api("/admin/settings")
  ]);
  const early = (settings.results.find(s => s.skey === "early_until") || {}).svalue || "";

  setHeader("Tariffe ed extra", `Early bird valida fino al ${early || "—"} — i prezzi sono ricalcolati dal server a ogni iscrizione`,
    canWrite() ? [
      { label: "+ Tariffa", onClick: () => editTier(null) },
      { label: "+ Extra", onClick: () => editAddon(null) }
    ] : []);

  $("#view").innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card__h"><h3>Categorie delegato</h3></div>
      <div class="tblwrap"><table>
        <thead><tr><th>Codice</th><th>Nome (IT)</th><th class="num">Early bird</th><th class="num">Prezzo pieno</th><th class="num">Capienza</th><th>Stato</th><th></th></tr></thead>
        <tbody>${tiers.results.map(t => `
          <tr>
            <td class="mono">${esc(t.code)}</td>
            <td>${esc(t.name_json.it || t.name_json.en || "—")}</td>
            <td class="num">${money(t.early_price)}</td>
            <td class="num">${money(t.late_price)}</td>
            <td class="num muted">${t.capacity ?? "∞"}</td>
            <td>${t.active ? `<span class="pill pill--paid">Attiva</span>` : `<span class="pill pill--refunded">Sospesa</span>`}</td>
            <td class="rowact">${canWrite() ? `<button class="btn btn--subtle btn--sm" data-tier="${t.id}">Modifica</button>` : ""}</td>
          </tr>`).join("")}
        </tbody></table></div>
    </div>

    <div class="card">
      <div class="card__h"><h3>Opzioni aggiuntive</h3></div>
      <div class="tblwrap"><table>
        <thead><tr><th>Codice</th><th>Nome (IT)</th><th class="num">Prezzo</th><th class="num">Capienza</th><th>Stato</th><th></th></tr></thead>
        <tbody>${addons.results.map(a => `
          <tr>
            <td class="mono">${esc(a.code)}</td>
            <td>${esc(a.name_json.it || a.name_json.en || "—")}</td>
            <td class="num">${money(a.price)}</td>
            <td class="num muted">${a.capacity ?? "∞"}</td>
            <td>${a.active ? `<span class="pill pill--paid">Attivo</span>` : `<span class="pill pill--refunded">Sospeso</span>`}</td>
            <td class="rowact">${canWrite() ? `<button class="btn btn--subtle btn--sm" data-addon="${a.id}">Modifica</button>` : ""}</td>
          </tr>`).join("")}
        </tbody></table></div>
    </div>`;

  $$("[data-tier]").forEach(b => b.addEventListener("click", () =>
    editTier(tiers.results.find(x => String(x.id) === b.dataset.tier))));
  $$("[data-addon]").forEach(b => b.addEventListener("click", () =>
    editAddon(addons.results.find(x => String(x.id) === b.dataset.addon))));

  function priceBody(o, isTier) {
    return `
      <div class="f-row">
        <div class="f"><label>Codice</label><input id="cCode" value="${esc(o.code || "")}" placeholder="mem">
          <p class="hint">Identificatore breve, non modificarlo se ci sono già iscrizioni.</p></div>
        <div class="f"><label>Ordine</label><input id="cSort" type="number" value="${o.sort ?? 0}"></div>
      </div>
      <div class="f-row-3">
        ${isTier
          ? `<div class="f"><label>Early bird (€)</label><input id="cEarly" type="number" step="1" value="${((o.early_price || 0) / 100)}"></div>
             <div class="f"><label>Prezzo pieno (€)</label><input id="cLate" type="number" step="1" value="${((o.late_price || 0) / 100)}"></div>`
          : `<div class="f"><label>Prezzo (€)</label><input id="cPrice" type="number" step="1" value="${((o.price || 0) / 100)}"></div>`}
        <div class="f"><label>Capienza</label><input id="cCap" type="number" value="${o.capacity ?? ""}" placeholder="illimitata"></div>
      </div>
      ${langFieldHtml("nm", o.name_json || {}, { label: "Nome" })}
      ${langFieldHtml("ds", o.desc_json || {}, { label: "Descrizione", multiline: true })}
      <label class="switch"><input type="checkbox" id="cAct" ${o.active !== 0 ? "checked" : ""}> Disponibile in fase di iscrizione</label>`;
  }

  function save(kind, o, isNew) {
    return async () => {
      const cap = $("#cCap").value.trim();
      const payload = {
        code: $("#cCode").value.trim(), sort: Number($("#cSort").value) || 0,
        capacity: cap === "" ? null : Number(cap),
        name_json: readLangField("nm"), desc_json: readLangField("ds"),
        active: $("#cAct").checked ? 1 : 0
      };
      if (kind === "tiers") {
        payload.early_price = Math.round(Number($("#cEarly").value) * 100) || 0;
        payload.late_price  = Math.round(Number($("#cLate").value) * 100) || 0;
      } else {
        payload.price = Math.round(Number($("#cPrice").value) * 100) || 0;
      }
      if (!payload.code) return toast("Il codice è obbligatorio", true);
      try {
        if (isNew) await apiJson(`/admin/${kind}`, "POST", payload);
        else await apiJson(`/admin/${kind}/${o.id}`, "PATCH", payload);
        closeModal(); toast("Listino aggiornato"); route();
      } catch (e) { toast(e.message, true); }
    };
  }

  function del(kind, o, label) {
    return () => confirmDialog("Eliminare?", label + " — le iscrizioni già registrate non vengono toccate.", async () => {
      await api(`/admin/${kind}/${o.id}`, { method: "DELETE" });
      closeModal(); toast("Eliminato"); route();
    });
  }

  function editTier(t) {
    const isNew = !t;
    t = t || { code: "", early_price: 0, late_price: 0, capacity: null, name_json: {}, desc_json: {}, active: 1, sort: 99 };
    modal({
      title: isNew ? "Nuova tariffa" : "Modifica tariffa", wide: true, body: priceBody(t, true),
      actions: [
        { label: "Annulla", onClick: closeModal },
        ...(isNew ? [] : [{ label: "Elimina", cls: "btn--danger", onClick: del("tiers", t, t.name_json.it || t.code) }]),
        { label: "Salva", cls: "btn--primary", onClick: save("tiers", t, isNew) }
      ]
    });
    bindLangTabs();
  }

  function editAddon(a) {
    const isNew = !a;
    a = a || { code: "", price: 0, capacity: null, name_json: {}, desc_json: {}, active: 1, sort: 99 };
    modal({
      title: isNew ? "Nuovo extra" : "Modifica extra", wide: true, body: priceBody(a, false),
      actions: [
        { label: "Annulla", onClick: closeModal },
        ...(isNew ? [] : [{ label: "Elimina", cls: "btn--danger", onClick: del("addons", a, a.name_json.it || a.code) }]),
        { label: "Salva", cls: "btn--primary", onClick: save("addons", a, isNew) }
      ]
    });
    bindLangTabs();
  }
};

/* ====================================================== IMPOSTAZIONI */
const SETTING_LABEL = {
  event_start: "Inizio evento (ISO)", event_end: "Fine evento (ISO)",
  early_until: "Early bird fino al (AAAA-MM-GG)", currency: "Valuta",
  venue_name: "Nome della sede", venue_maps: "Link Google Maps",
  languages: "Lingue attive (codici separati da virgola)",
  registration_open: "Iscrizioni aperte (1 = sì, 0 = no)"
};

VIEWS.settings = async function () {
  const d = await api("/admin/settings");
  setHeader("Impostazioni", "Parametri generali dell'evento", []);

  $("#view").innerHTML = `
    <div class="card" style="max-width:720px">
      <div class="card__h"><h3>Generali</h3></div>
      <div class="card__b">
        ${d.results.map(s => `
          <div class="f">
            <label for="set_${esc(s.skey)}">${esc(SETTING_LABEL[s.skey] || s.skey)}</label>
            <input id="set_${esc(s.skey)}" data-skey="${esc(s.skey)}" value="${esc(s.svalue)}" ${canWrite() ? "" : "disabled"}>
            <p class="hint" style="font-family:var(--mono);font-size:11px">${esc(s.skey)}</p>
          </div>`).join("")}
        ${canWrite() ? `<button class="btn btn--primary" id="saveSettings">Salva impostazioni</button>` : ""}
      </div>
    </div>

    <div class="card" style="max-width:720px;margin-top:16px">
      <div class="card__h"><h3>La tua password</h3></div>
      <div class="card__b">
        <div class="alert alert--err hidden" id="pwErr"></div>
        <div class="f-row">
          <div class="f"><label>Password attuale</label><input type="password" id="pwCur" autocomplete="current-password"></div>
          <div class="f"><label>Nuova password</label><input type="password" id="pwNew" autocomplete="new-password">
            <p class="hint">Almeno 10 caratteri. Le altre sessioni verranno chiuse.</p></div>
        </div>
        <button class="btn btn--ghost" id="savePw">Cambia password</button>
      </div>
    </div>`;

  $("#saveSettings")?.addEventListener("click", async () => {
    const payload = Object.fromEntries($$("[data-skey]").map(i => [i.dataset.skey, i.value]));
    try { await apiJson("/admin/settings", "PATCH", payload); toast("Impostazioni salvate"); }
    catch (e) { toast(e.message, true); }
  });

  $("#savePw").addEventListener("click", async () => {
    const box = $("#pwErr"); box.classList.add("hidden");
    try {
      await apiJson("/auth/password", "POST", { current: $("#pwCur").value, next: $("#pwNew").value });
      $("#pwCur").value = $("#pwNew").value = "";
      toast("Password aggiornata");
    } catch (e) { box.textContent = e.message; box.classList.remove("hidden"); }
  });
};

/* ============================================================ UTENTI */
VIEWS.users = async function () {
  if (!isAdmin()) { $("#view").innerHTML = `<div class="alert alert--err">Sezione riservata agli amministratori.</div>`; return; }
  const d = await api("/admin/users");
  const ROLES = { admin: "Amministratore", editor: "Redattore", viewer: "Sola lettura" };

  setHeader("Utenti", "Chi può accedere al backoffice e con quali permessi",
    [{ label: "+ Nuovo utente", cls: "btn--primary", onClick: () => edit(null) }]);

  $("#view").innerHTML = `
    <div class="alert alert--info">
      <b>Redattore</b> modifica contenuti e iscrizioni. <b>Sola lettura</b> consulta soltanto.
      <b>Amministratore</b> gestisce anche utenti ed eliminazioni.
    </div>
    <div class="card"><div class="tblwrap"><table>
      <thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th><th>Ultimo accesso</th><th></th></tr></thead>
      <tbody>${d.results.map(u => `
        <tr>
          <td>${esc(u.name)}${u.id === ME.id ? ` <span class="muted">(tu)</span>` : ""}</td>
          <td class="muted">${esc(u.email)}</td>
          <td><span class="pill pill--${u.role}">${ROLES[u.role] || u.role}</span></td>
          <td>${u.active ? `<span class="pill pill--paid">Attivo</span>` : `<span class="pill pill--cancelled">Disattivato</span>`}</td>
          <td class="muted">${dt(u.last_login_at)}</td>
          <td class="rowact"><button class="btn btn--subtle btn--sm" data-edit="${u.id}">Modifica</button></td>
        </tr>`).join("")}
      </tbody></table></div></div>`;

  $$("[data-edit]").forEach(b => b.addEventListener("click", () =>
    edit(d.results.find(x => String(x.id) === b.dataset.edit))));

  function edit(u) {
    const isNew = !u;
    u = u || { name: "", email: "", role: "editor", active: 1 };
    modal({
      title: isNew ? "Nuovo utente" : "Modifica utente",
      body: `
        <div class="f"><label>Nome</label><input id="uName" value="${esc(u.name)}"></div>
        <div class="f"><label>Email</label><input id="uEmail" type="email" value="${esc(u.email)}" ${isNew ? "" : "disabled"}></div>
        <div class="f"><label>Ruolo</label><select id="uRole">
          ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${v}</option>`).join("")}
        </select></div>
        <div class="f"><label>${isNew ? "Password" : "Nuova password"}</label>
          <input id="uPass" type="password" autocomplete="new-password" placeholder="${isNew ? "" : "lascia vuoto per non cambiarla"}">
          <p class="hint">Almeno 10 caratteri.</p></div>
        <label class="switch"><input type="checkbox" id="uAct" ${u.active ? "checked" : ""}> Account attivo</label>`,
      actions: [
        { label: "Annulla", onClick: closeModal },
        ...(isNew || u.id === ME.id ? [] : [{ label: "Elimina", cls: "btn--danger", onClick: () =>
            confirmDialog("Eliminare l'utente?", u.email, async () => {
              await api(`/admin/users/${u.id}`, { method: "DELETE" });
              closeModal(); toast("Utente eliminato"); route();
            }) }]),
        { label: "Salva", cls: "btn--primary", onClick: async () => {
            const pass = $("#uPass").value;
            try {
              if (isNew) {
                await apiJson("/admin/users", "POST", {
                  name: $("#uName").value.trim(), email: $("#uEmail").value.trim(),
                  role: $("#uRole").value, password: pass
                });
              } else {
                const payload = { name: $("#uName").value.trim(), role: $("#uRole").value, active: $("#uAct").checked };
                if (pass) payload.password = pass;
                await apiJson(`/admin/users/${u.id}`, "PATCH", payload);
              }
              closeModal(); toast("Utente salvato"); route();
            } catch (e) { toast(e.message, true); }
          } }
      ]
    });
  }
};

/* ============================================================= AUDIT */
VIEWS.audit = async function () {
  const d = await api("/admin/audit");
  const ACTION = {
    create: "Creazione", update: "Modifica", delete: "Eliminazione", login: "Accesso",
    login_failed: "Accesso fallito", logout: "Uscita", export: "Esportazione",
    reorder: "Riordino", setup: "Setup iniziale", password_change: "Cambio password"
  };
  setHeader("Registro attività", "Ultime 200 operazioni", [{ label: "Aggiorna", onClick: route }]);

  $("#view").innerHTML = `<div class="card"><div class="tblwrap"><table>
    <thead><tr><th>Quando</th><th>Chi</th><th>Azione</th><th>Oggetto</th><th>Dettaglio</th></tr></thead>
    <tbody>${d.results.length ? d.results.map(a => `
      <tr>
        <td class="muted">${dt(a.created_at)}</td>
        <td>${esc(a.user_email || "—")}</td>
        <td><span class="pill pill--${a.action === "login_failed" ? "cancelled" : "plain"}">${ACTION[a.action] || a.action}</span></td>
        <td class="mono">${esc(a.entity)}${a.entity_id ? " #" + esc(a.entity_id) : ""}</td>
        <td class="muted">${esc(a.detail || "—")}</td>
      </tr>`).join("") : `<tr><td colspan="5"><div class="empty">Nessuna attività registrata</div></td></tr>`}
    </tbody></table></div></div>`;
};

/* ------------------------------------------------------------------ avvio */
boot();

})();
