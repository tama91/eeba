/* ==========================================================================
   EEBA 2027 — logica del sito
   Dipende da i18n.js (I18N, LANGS, PRICING, COUNTRIES)
   ========================================================================== */
(function () {
"use strict";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

let EVENT_START = new Date("2027-04-08T09:00:00+02:00");
const STORE_KEY = "eeba27.lang";

let lang = "en";
let T = I18N.en;

/* Contenuti caricati dal backoffice. Se l'API non risponde il sito continua
   a funzionare con i valori di i18n.js: nessuna schermata bianca. */
const DATA = { live: false, settings: {}, payments: null, programme: null,
               speakers: null, sponsors: null, tiers: null, addons: null, meals: null };

const pick = obj => (obj && (obj[lang] || obj.en || Object.values(obj).find(Boolean))) || "";

/* Quante giornate ha l'evento, e le loro date: tutto deriva dalle impostazioni,
   così un'edizione di due o quattro giorni non richiede di toccare il codice. */
const dayCount = () => Math.max(1, Math.min(14, Number(DATA.settings.event_days) || 3));
const dayDate = n => new Date(EVENT_START.getTime() + (n - 1) * 86400e3);
const dayLabel = n => `${T.prog.dayWord} ${n}`;
const dayDateLabel = n => {
  try {
    return dayDate(n).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });
  } catch { return ""; }
};

/* Tipi di sessione: elenco dalle impostazioni, etichette dalle traduzioni. */
const tagCodes = () => String(DATA.settings.session_tags || "key,lab,soc,sym,free,ind,ws")
  .split(",").map(s => s.trim()).filter(Boolean);
const tagLabel = code => (T.prog.tag && T.prog.tag[code]) || code;

function setPath(obj, path, value) {
  const ks = path.split(".");
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {};
    o = o[ks[i]];
  }
  o[ks[ks.length - 1]] = value;
}

async function hydrate() {
  try {
    const res = await fetch("/api/public/content", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error("offline");
    const d = await res.json();

    for (const [key, values] of Object.entries(d.translations || {}))
      for (const code of Object.keys(I18N))
        if (values[code] && String(values[code]).trim()) setPath(I18N[code], key, values[code]);

    DATA.settings  = d.settings || {};
    DATA.payments  = d.payments || null;
    DATA.programme = d.programme || null;
    DATA.speakers  = d.speakers || null;
    DATA.sponsors  = d.sponsors || null;
    DATA.tiers     = (d.tiers && d.tiers.length) ? d.tiers : null;
    DATA.addons    = (d.addons && d.addons.length) ? d.addons : null;
    DATA.meals     = Array.isArray(d.meals) ? d.meals : null;
    DATA.sections  = Array.isArray(d.sections) ? d.sections : [];
    DATA.live = true;

    if (DATA.settings.event_start) {
      const dd = new Date(DATA.settings.event_start);
      if (!isNaN(dd)) EVENT_START = dd;
    }
  } catch {
    DATA.live = false;   // si prosegue con i contenuti inclusi nel bundle
  }
}

/* Listino normalizzato: dal database se disponibile, altrimenti da PRICING. */
function tierList() {
  if (DATA.tiers) return DATA.tiers.map(t => ({
    id: t.code, early: t.early_price / 100, late: t.late_price / 100,
    h: pick(t.name_json), p: pick(t.desc_json)
  }));
  return PRICING.tiers.map(t => ({
    id: t.id, early: t.early, late: t.late,
    h: T.reg.tiers[t.id].h, p: T.reg.tiers[t.id].p
  }));
}

function addonList() {
  if (DATA.addons) return DATA.addons.map(a => ({
    id: a.code, price: a.price / 100, h: pick(a.name_json), s: pick(a.desc_json)
  }));
  return PRICING.addons.map(a => ({
    id: a.id, price: a.price, h: T.reg.add[a.id].h, s: T.reg.add[a.id].s
  }));
}

/* ---------------------------------------------------------------- LINGUA */
/* Le lingue attive vengono dalle impostazioni; LANGS serve solo per le etichette
   e come riserva se l'API non risponde. Così aggiungerne una è un'operazione da
   backoffice: impostazione + traduzioni, senza toccare il codice. */
function activeLangs() {
  const fromSettings = String(DATA.settings.languages || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const codes = fromSettings.length ? fromSettings : LANGS.map(l => l.code);
  return codes.map(code => {
    const known = LANGS.find(l => l.code === code);
    return known || { code, label: code.toUpperCase(), short: code.toUpperCase() };
  });
}

function detectLang() {
  const list = activeLangs();
  const q = new URLSearchParams(location.search).get("lang");
  const saved = (() => { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } })();
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  const has = c => list.some(l => l.code === c);
  return has(q) ? q : has(saved) ? saved : has(nav) ? nav : list[0].code;
}

function buildLangMenu() {
  const menu = $("#langMenu");
  menu.innerHTML = activeLangs().map(l =>
    `<button role="menuitem" data-lang="${l.code}"><span>${l.label}</span><span class="code">${l.short}</span></button>`
  ).join("");
  menu.addEventListener("click", e => {
    const b = e.target.closest("button[data-lang]");
    if (b) { setLang(b.dataset.lang); $("#lang").classList.remove("is-open"); }
  });
}

function setLang(code) {
  lang = code;
  // Una lingua aggiunta solo dal backoffice non ha un blocco in i18n.js:
  // si parte dall'inglese e le traduzioni dal database lo sovrascrivono.
  T = I18N[code] || I18N.en;
  try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
  document.documentElement.lang = code;

  const cur = activeLangs().find(l => l.code === code) || { short: code.toUpperCase() };
  $("#langCur").textContent = cur.short;
  $$("#langMenu button").forEach(b => b.classList.toggle("is-on", b.dataset.lang === code));

  applyTranslations();
  renderTicker();
  renderProgramme();
  renderSpeakers();
  renderTiers();
  renderAddons();
  renderPayMethods();
  renderFormOptions();
  renderSponsors();
  renderFaq();
  renderStats();
  renderSummary();
  syncCta();
  tickCountdown();
}

/* Logo dell'evento: se nel backoffice è stato messo un URL o un SVG, sostituisce
   il segno di default ovunque compaia il marchio. */
function renderLogo() {
  const marks = $$(".brand__mark");
  if (!marks.length) return;
  const fallback = marks[0].dataset.default || marks[0].outerHTML;
  marks.forEach(m => { if (!m.dataset.default) m.dataset.default = m.outerHTML; });

  const html = logoHtml(DATA.settings, { fallback: "", alt: T.meta.title });
  if (!html) return;
  marks.forEach(m => {
    const box = document.createElement("span");
    box.className = "brand__mark";
    box.dataset.default = m.dataset.default || fallback;
    box.innerHTML = html;
    m.replaceWith(box);
  });
}

/* Il pulsante del riepilogo cambia etichetta all'ultimo step: dopo un cambio
   lingua va risincronizzato, altrimenti applyTranslations lo riporta a "Continua". */
function syncCta() {
  const cta = $("#sumCta");
  cta.style.display = state.step === 4 ? "none" : "";
  cta.querySelector("span").textContent = state.step === 3 ? T.btn.pay : T.btn.next;
}

function applyTranslations() {
  $$("[data-i18n]").forEach(el => {
    const v = get(T, el.dataset.i18n);
    if (typeof v === "string") el.textContent = v;
  });
  $$("[data-i18n-html]").forEach(el => {
    const v = get(T, el.dataset.i18nHtml);
    if (typeof v === "string") el.innerHTML = v;
  });
  $$("[data-i18n-attr]").forEach(el => {
    const [attr, key] = el.dataset.i18nAttr.split("|");
    const v = get(T, key);
    if (typeof v === "string") el.setAttribute(attr, v);
  });
  document.title = T.meta.title;
}

/* ------------------------------------------------------------ COUNTDOWN */
function tickCountdown() {
  const diff = EVENT_START - Date.now();
  const box = $("#count");
  if (diff <= 0) { box.innerHTML = `<div style="grid-column:1/-1;padding:18px"><b>${T.count.over}</b></div>`; return; }
  const s = Math.floor(diff / 1000);
  const set = (id, n) => { const el = $(id); if (el) el.textContent = String(n).padStart(2, "0"); };
  set("#cd", Math.floor(s / 86400));
  set("#ch", Math.floor(s / 3600) % 24);
  set("#cm", Math.floor(s / 60) % 60);
  set("#cs", s % 60);
}

/* --------------------------------------------------------------- TICKER */
function renderTicker() {
  // Una sola stringa con le voci separate da "|", così è modificabile dal backoffice.
  const list = String(T.ticker?.items || "").split("|").map(s => s.trim()).filter(Boolean);
  const items = list.map(t => `<span>${t}</span>`).join("");
  $("#ticker").innerHTML = items + items; // duplicato per il loop continuo
}

/* ------------------------------------------------------------ PROGRAMME */
function renderProgramme() {
  const days = dayCount();
  const active = Math.min(Number($(".tab.is-on")?.dataset.day) || 1, days);

  $("#tabs").innerHTML = Array.from({ length: days }, (_, i) => i + 1).map(d =>
    `<button class="tab ${d === active ? "is-on" : ""}" role="tab" data-day="${d}">
       <b>${dayLabel(d)}</b><small>${dayDateLabel(d)}</small>
     </button>`).join("");

  $("#panels").innerHTML = Array.from({ length: days }, (_, i) => i + 1).map(d => {
    const slots = DATA.programme
      ? (DATA.programme[d] || []).map(s => ({ t: s.t, tag: s.tag, h: pick(s.h), p: pick(s.p) }))
      : (T.prog["day" + d] || []);
    return `<div class="panel ${d === active ? "is-on" : ""}" data-panel-day="${d}">` +
      (slots.length ? slots.map(s => `
        <div class="slot">
          <div class="slot__t">${s.t}</div>
          <div><h4>${s.h}</h4><p>${s.p}</p></div>
          ${s.tag ? `<span class="slot__tag ${s.tag === "key" ? "slot__tag--key" : ""}">${tagLabel(s.tag)}</span>` : "<span></span>"}
        </div>`).join("") : `<p class="small" style="padding:24px 0">—</p>`) + `</div>`;
  }).join("");

  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("is-on"));
    tab.classList.add("is-on");
    $$(".panel").forEach(p => p.classList.toggle("is-on", p.dataset.panelDay === tab.dataset.day));
  }));
}

/* I numeri della sezione statistiche: i segnaposto {days}, {sessions} e {months}
   si calcolano dai dati, così non invecchiano. */
function renderStats() {
  const sessions = DATA.programme
    ? Object.values(DATA.programme).reduce((n, a) => n + a.length, 0)
    : [1, 2, 3].reduce((n, d) => n + (T.prog["day" + d] || []).length, 0);

  const target = DATA.settings.stat_target_date;
  let months = 0;
  if (target) {
    const d = new Date(target);
    if (!isNaN(d)) months = Math.max(0, Math.round((d - EVENT_START) / (30.44 * 86400e3)));
  }

  const subs = { days: dayCount(), sessions: sessions >= 20 ? "20+" : String(sessions), months };
  $$("[data-stat]").forEach(el => {
    const raw = T.stats[el.dataset.stat] || "";
    el.innerHTML = raw.replace(/\{(\w+)\}/g, (m, k) => (k in subs ? subs[k] : m))
      .replace(/\+/g, "<em>+</em>");
  });
}

/* ------------------------------------------------------------- SPEAKERS */
function renderSpeakers() {
  const ph = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="8.5" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;
  const list = DATA.speakers
    ? DATA.speakers.map(s => ({ name: s.name, org: s.org, photo: s.photo_url, role: pick(s.role_json) }))
    : ["r1", "r2", "r3", "r4"].map(k => ({ name: "", org: "", photo: "", role: T.spk[k] }));

  $("#spkGrid").innerHTML = list.map(s => `
    <article class="spk">
      <div class="spk__ph"${s.name ? "" : ` data-tba="${T.spk.tba}"`}>${
        s.photo ? `<img src="${s.photo}" alt="${s.name || ""}" loading="lazy" style="width:100%;height:100%;object-fit:cover">` : ph
      }</div>
      <div class="spk__b">
        <h4>${s.name || "—"}</h4>
        <p>${[s.role, s.org].filter(Boolean).join(" · ")}</p>
      </div>
    </article>`).join("");
}

function renderSponsors() {
  const box = $(".sponsors");
  if (!box || !DATA.sponsors) return;
  const label = { platinum: "Platinum", gold: "Gold", silver: "Silver", partner: "Partner" };
  const rank = { platinum: 0, gold: 1, silver: 2, partner: 3 };
  const list = [...DATA.sponsors].sort((a, b) => (rank[a.tier] ?? 9) - (rank[b.tier] ?? 9));
  if (!list.length) return;
  box.innerHTML = list.map(s => {
    const inner = s.logo_url
      ? `<img src="${s.logo_url}" alt="${s.name}" loading="lazy" style="max-height:56%;max-width:70%;object-fit:contain">`
      : `${s.name || label[s.tier] || ""}`;
    return s.url
      ? `<div><a href="${s.url}" target="_blank" rel="noopener" title="${s.name}" style="display:grid;place-items:center;width:100%;height:100%">${inner}</a></div>`
      : `<div title="${s.name}">${inner}</div>`;
  }).join("");
}

/* ----------------------------------------------------------------- FAQ */
function renderFaq() {
  // Conta le domande effettivamente presenti: aggiungerne una in traduzioni basta.
  const items = [];
  for (let i = 1; i <= 50; i++) {
    const q = T.faq["q" + i], a = T.faq["a" + i];
    if (!q || !a) break;
    items.push([q, a]);
  }
  $("#acc").innerHTML = items.map(([q, a]) => {
    return `<div class="acc__i">
      <button class="acc__q" aria-expanded="false"><span>${q}</span><span class="pm"></span></button>
      <div class="acc__a"><p>${a}</p></div>
    </div>`;
  }).join("");

  $$(".acc__q").forEach(btn => btn.addEventListener("click", () => {
    const item = btn.parentElement, open = item.classList.contains("is-on");
    $$(".acc__i").forEach(i => { i.classList.remove("is-on"); i.querySelector(".acc__a").style.maxHeight = null; i.querySelector(".acc__q").setAttribute("aria-expanded", "false"); });
    if (!open) {
      item.classList.add("is-on");
      btn.setAttribute("aria-expanded", "true");
      const a = item.querySelector(".acc__a");
      a.style.maxHeight = a.scrollHeight + "px";
    }
  }));
}

/* ============================ REGISTRAZIONE ============================ */
const state = { tier: null, addons: new Set(), pay: "card", step: 1 };

const earlyUntil = () => DATA.settings.early_until || PRICING.earlyUntil;
const isEarly = () => Date.now() < new Date(earlyUntil() + "T23:59:59").getTime();
const eur = n => new Intl.NumberFormat(lang === "en" ? "en-IE" : lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const tierPrice = t => (isEarly() ? t.early : t.late);
const findTier = id => tierList().find(t => t.id === id);
const findAddon = id => addonList().find(a => a.id === id);

function renderTiers() {
  $("#tierList").innerHTML = tierList().map(t => {
    const early = isEarly();
    return `<div class="tier ${state.tier === t.id ? "is-sel" : ""}" data-tier="${t.id}" role="radio" tabindex="0" aria-checked="${state.tier === t.id}">
      <span class="tier__radio"></span>
      <div><h4>${t.h}</h4><p>${t.p}</p></div>
      <div class="tier__price"><b>${eur(tierPrice(t))}</b>${early && t.late > t.early ? `<s>${eur(t.late)}</s>` : ""}</div>
    </div>`;
  }).join("");

  $$("#tierList .tier").forEach(el => {
    const pick = () => { state.tier = el.dataset.tier; renderTiers(); renderSummary(); $("#err1").style.display = "none"; };
    el.addEventListener("click", pick);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
  });
}

function renderAddons() {
  const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m4 12.5 5.2 5.2L20 7"/></svg>`;
  $("#addonList").innerHTML = addonList().map(a => `
    <label class="addon ${state.addons.has(a.id) ? "is-sel" : ""}" data-addon="${a.id}">
      <span class="addon__box">${check}</span>
      <span class="addon__t"><b>${a.h}</b><span>${a.s}</span></span>
      <span class="addon__p">+ ${eur(a.price)}</span>
    </label>`).join("");

  $$("#addonList .addon").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    const id = el.dataset.addon;
    if (state.addons.has(id)) state.addons.delete(id);
    else { state.addons.add(id); toast(T.reg.toastAdded); }
    renderAddons(); renderSummary();
  }));
}

function payMethodList() {
  // Dal database se disponibile, altrimenti i tre metodi di base.
  const codes = DATA.payments?.methods?.length ? DATA.payments.methods : ["card", "sepa", "inv"];
  return codes.filter(c => PAYMENT_BY_CODE[c]).map(c => PAYMENT_BY_CODE[c]);
}

function renderPayMethods() {
  const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m4 12.5 5.2 5.2L20 7"/></svg>`;
  const list = payMethodList();

  if (!list.some(m => m.code === state.pay)) state.pay = list[0]?.code || "card";

  $("#payList").innerHTML = list.map(m => `
    <label class="addon ${state.pay === m.code ? "is-sel" : ""}" data-pay="${m.code}">
      <span class="addon__box" style="border-radius:50%">${check}</span>
      <span class="pay__ico">${PAYMENT_ICONS[m.icon] || ""}</span>
      <span class="addon__t">
        <b>${T.reg.pm[m.code] || m.code}</b>
        <span>${pick(m.note)}</span>
      </span>
    </label>`).join("");

  $$("#payList .addon").forEach(el => el.addEventListener("click", e => {
    e.preventDefault(); state.pay = el.dataset.pay; renderPayMethods();
  }));

  // Nota sotto l'elenco: cosa succede dopo aver premuto il pulsante.
  const sel = PAYMENT_BY_CODE[state.pay];
  const notes = [];
  if (DATA.payments?.mode === "preview") notes.push(`<span class="chip chip--accent" style="margin-bottom:8px"><i class="dot"></i>${T.reg.pay.preview}</span>`);
  notes.push(`<p class="small" style="margin:10px 0 0">${
    sel?.kind === "offline" ? T.reg.pay.offlineNote : T.reg.pay.redirect}</p>`);
  $("#payNote").innerHTML = notes.join("");
}

function renderFormOptions() {
  const role = $("#role"), country = $("#country");
  const rv = role.value, cv = country.value;
  // I codici r0…rN sono stabili: nel database finisce il codice, non l'etichetta.
  const roles = Object.entries(T.reg.roles || {}).sort((a, b) =>
    Number(a[0].slice(1)) - Number(b[0].slice(1)));
  role.innerHTML = `<option value="">${T.reg.f.rolePick}</option>` +
    roles.map(([code, label]) => `<option value="${code}">${label}</option>`).join("");

  /* Scelta del menu: opzioni dal database. Se l'edizione non prevede pasti,
     la sezione sparisce insieme a quella delle allergie. */
  const mealSel = $("#meal");
  const mv = mealSel.value;
  const meals = DATA.meals || [];
  const noMeals = DATA.settings.meals_enabled === "0" || (DATA.live && !meals.length);
  $("#mealField").classList.toggle("hidden", noMeals);
  $("#allergField").classList.toggle("hidden", noMeals);
  mealSel.innerHTML = `<option value="">${T.reg.f.mealPick}</option>` +
    meals.map(m => `<option value="${m.code}">${pick(m.name_json)}</option>`).join("");
  mealSel.value = mv;
  country.innerHTML = `<option value="">${T.reg.f.countryPick}</option>` + COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join("");
  role.value = rv; country.value = cv;
}

function renderSummary() {
  const body = $("#sumBody");
  if (!state.tier) { body.innerHTML = `<p class="small" style="margin:0">${T.reg.sumEmpty}</p>`; return; }

  const t = findTier(state.tier);
  if (!t) { body.innerHTML = `<p class="small" style="margin:0">${T.reg.sumEmpty}</p>`; return; }
  const tp = tierPrice(t);
  let total = tp;
  let html = `<div class="sline"><span>${T.reg.sumTier}</span><span>${eur(tp)}</span></div>
              <div class="sline sline--sub"><span>${t.h}</span><span></span></div>`;

  if (state.addons.size) {
    html += `<div class="sline" style="margin-top:6px"><span>${T.reg.sumAdd}</span><span></span></div>`;
    state.addons.forEach(id => {
      const a = findAddon(id);
      if (!a) return;
      total += a.price;
      html += `<div class="sline sline--sub"><span>${a.h}</span><span>${eur(a.price)}</span></div>`;
    });
  }

  html += `<div class="sline sline--tot"><span>${T.reg.sumTot}</span><span>${eur(total)}</span></div>`;
  body.innerHTML = html;
}

/* --------------------------------------------------------- STEP CONTROL */
function goStep(n) {
  if (n > 1 && !state.tier) { const e = $("#err1"); e.textContent = T.reg.errTier; e.style.display = "block"; return; }
  if (n > 2 && !validateForm()) return;

  state.step = n;
  $$(".regstep").forEach(p => p.classList.toggle("is-on", Number(p.dataset.panel) === n));
  $$(".step").forEach(s => {
    const i = Number(s.dataset.step);
    s.classList.toggle("is-on", i === n);
    s.classList.toggle("is-done", i < n);
  });

  syncCta();

  const y = $("#register").getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function validateForm() {
  let ok = true;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const mark = (el, msg) => {
    const f = el.closest(".field");
    f.classList.add("has-err"); el.classList.add("err");
    f.querySelector(".msg").textContent = msg;
    ok = false;
  };
  const clear = el => { const f = el.closest(".field"); f.classList.remove("has-err"); el.classList.remove("err"); };

  ["fn", "ln", "em", "em2", "org", "role", "country"].forEach(id => {
    const el = $("#" + id); clear(el);
    if (!el.value.trim()) mark(el, T.reg.errReq);
  });

  const em = $("#em"), em2 = $("#em2");
  if (em.value.trim() && !emailRe.test(em.value.trim())) mark(em, T.reg.errEmail);
  if (em2.value.trim() && em.value.trim() !== em2.value.trim()) mark(em2, T.reg.errMatch);

  const e2 = $("#err2");
  if (!$("#k1").checked || !$("#k2").checked) { e2.textContent = T.reg.errConsent; e2.style.display = "block"; ok = false; }
  else e2.style.display = "none";

  // allergie scritte senza consenso: si blocca invece di scartarle in silenzio
  const e3 = $("#err3");
  if ($("#allergies").value.trim() && !$("#k4").checked) {
    e3.textContent = T.reg.f.allergNeeded; e3.style.display = "block"; ok = false;
  } else e3.style.display = "none";

  if (!ok) { const first = $(".field.has-err input, .field.has-err select"); if (first) first.focus(); }
  return ok;
}

async function completeBooking() {
  const btn = $("#payBtn"), cta = $("#sumCta");
  btn.disabled = cta.disabled = true;

  const payload = {
    first_name: $("#fn").value.trim(),
    last_name:  $("#ln").value.trim(),
    email:      $("#em").value.trim(),
    org:        $("#org").value.trim(),
    role:       $("#role").value || null,   // codice stabile, non l'etichetta tradotta
    country:    $("#country").value || null,
    vat:        $("#vat").value.trim() || null,
    meal:       $("#meal").value || null,
    allergies:  $("#allergies").value.trim() || null,
    allergies_consent: $("#k4").checked,
    lang,
    tier_code:  state.tier,
    addons:     [...state.addons],
    payment_method: state.pay,
    consent_terms: $("#k1").checked,
    consent_gdpr:  $("#k2").checked,
    newsletter:    $("#k3").checked
  };

  try {
    const res = await fetch("/api/public/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");

    // Metodo online: si va alla pagina di pagamento. Il ritorno passa da /pagamento.
    if (data.checkout_url) {
      try { sessionStorage.setItem("eeba27.ref", data.ref); } catch (e) {}
      location.href = data.checkout_url;
      return;
    }

    $("#bookRef").textContent = data.ref;
    if (data.payment_error) toast(data.payment_error);
    goStep(4);
  } catch (e) {
    // L'API non è disponibile (es. sito aperto in locale): si mostra comunque
    // la conferma con un riferimento provvisorio, senza far perdere i dati.
    if (DATA.live) { toast(e.message); }
    else {
      $("#bookRef").textContent = "EEBA27-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      goStep(4);
    }
  } finally {
    btn.disabled = cta.disabled = false;
  }
}

function resetBooking() {
  state.tier = null; state.addons.clear(); state.pay = "card";
  $("#regForm").reset();
  $$(".field").forEach(f => f.classList.remove("has-err"));
  $("#err2").style.display = "none";
  renderTiers(); renderAddons(); renderPayMethods(); renderSummary();
  goStep(1);
}

/* ----------------------------------------------------------------- MISC */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
}

function downloadIcs() {
  const pad = n => String(n).padStart(2, "0");
  const fmt = d => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
  const esc = s => String(s).replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");

  // Fine e sede dalle impostazioni; in mancanza, l'ultimo giorno alle 18.
  let end = new Date(DATA.settings.event_end || "");
  if (isNaN(end)) {
    end = dayDate(dayCount());
    end.setHours(18, 0, 0, 0);
  }
  const place = DATA.settings.venue_name || T.venue.v1 || "";

  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EEBA 2027//EN", "BEGIN:VEVENT",
    "UID:eeba2027@eeba.eu",
    "DTSTAMP:" + fmt(new Date()),
    "DTSTART:" + fmt(EVENT_START),
    "DTEND:" + fmt(end),
    "SUMMARY:" + esc(T.meta.title.split("—")[0].trim() + " — " + T.hero.city),
    "LOCATION:" + esc(place),
    "DESCRIPTION:" + esc(T.meta.desc),
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "eeba-2027-leuven.ics"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initReveal() {
  if (!("IntersectionObserver" in window)) { $$(".rv").forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  $$(".rv").forEach(e => io.observe(e));
}

function initScrollSpy() {
  const links = $$("#nav a");
  const sections = links.map(a => $(a.getAttribute("href"))).filter(Boolean);
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + e.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(s => io.observe(s));
}

/* ------------------------------------------------------------------ TEMA */
const THEME_KEY = "eeba27.theme";

function currentTheme() {
  const forced = document.documentElement.dataset.theme;
  if (forced === "dark" || forced === "light") return forced;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function initTheme() {
  const btn = $("#themeBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(DATA.settings);   // chiaro e scuro hanno accenti diversi
  });

  // Se l'utente non ha mai scelto, si resta agganciati alle impostazioni di sistema.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!saved) delete document.documentElement.dataset.theme;
    applyTheme(DATA.settings);
  });
}

function initHeader() {
  const h = $("#header");
  const onScroll = () => h.classList.toggle("is-stuck", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  $("#burger").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $("#burger").setAttribute("aria-expanded", open);
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => document.body.classList.remove("menu-open")));

  const langBox = $("#lang"), langBtn = $("#langBtn");
  langBtn.addEventListener("click", e => {
    e.stopPropagation();
    const open = langBox.classList.toggle("is-open");
    langBtn.setAttribute("aria-expanded", open);
  });
  document.addEventListener("click", () => langBox.classList.remove("is-open"));
  document.addEventListener("keydown", e => { if (e.key === "Escape") { langBox.classList.remove("is-open"); document.body.classList.remove("menu-open"); } });
}

/* -------------------------------------------------------------- SEZIONI */
/* L'ordine e la visibilità dei blocchi della home stanno nel database. Qui si
   spostano quelli che ci sono: le sezioni restano scritte in index.html, il
   backoffice decide solo in che ordine appaiono e se appaiono.

   Se il database non risponde, o se una sezione è nel database ma non nella
   pagina (o viceversa), non succede niente: resta l'ordine del markup. */
function applySections() {
  const rows = Array.isArray(DATA.sections) ? DATA.sections : [];
  if (!rows.length) return;

  const known = new Map();
  for (const r of rows) {
    const el = document.getElementById(r.code);
    if (el && el.parentElement === $("main")) known.set(r.code, { r, el });
  }
  if (!known.size) return;

  /* Si riordina soltanto fra le posizioni già occupate da queste sezioni: hero,
     ticker, statistiche e fascia finale non sono in elenco e non si muovono. */
  const slots = [...$("main").children]
    .filter(el => known.has(el.id))
    .map(el => { const m = document.createElement("template"); el.before(m); return m; });

  [...known.values()]
    .sort((a, b) => (Number(a.r.sort) || 0) - (Number(b.r.sort) || 0))
    .forEach((w, i) => slots[i] && slots[i].replaceWith(w.el));

  slots.forEach(m => m.remove());   // eventuali segnaposto avanzati

  /* Una sezione spenta sparisce anche dal menu e dal piè di pagina: un link
     che porta a un'ancora inesistente è peggio di un link mancante. */
  for (const [code, { r, el }] of known) {
    const on = String(r.published) !== "0";
    el.hidden = !on;
    $$(`a[href="#${code}"]`).forEach(a => { (a.closest("li") || a).hidden = !on; });
  }
}

/* Il pulsante «Invia un abstract» va dove dice l'impostazione: un sistema
   esterno di raccolta, oppure l'indirizzo della segreteria. Senza indirizzo
   configurato il pulsante non si mostra, invece di non portare da nessuna
   parte come farebbe un href="#". */
function applyAbstractsLink() {
  const a = $("#absCta");
  if (!a) return;
  const url = String(DATA.settings.abstracts_url || "").trim();
  if (!url) { a.hidden = true; return; }
  a.hidden = false;
  a.href = url;
  if (/^https:/i.test(url)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  else { a.removeAttribute("target"); a.removeAttribute("rel"); }
}

/* ------------------------------------------------------------------ BOOT */
async function init() {
  buildLangMenu();
  initTheme();
  initHeader();

  $$("[data-go]").forEach(b => b.addEventListener("click", () => goStep(Number(b.dataset.go))));
  $("#sumCta").addEventListener("click", () => (state.step === 3 ? completeBooking() : goStep(Math.min(state.step + 1, 4))));
  $("#payBtn").addEventListener("click", completeBooking);
  $("#resetBtn").addEventListener("click", resetBooking);
  $("#icsBtn").addEventListener("click", downloadIcs);

  /* Il consenso per le allergie compare solo a chi scrive qualcosa: chi non
     ha allergie non deve nemmeno vedersi chiedere un consenso sanitario. */
  $("#allergies").addEventListener("input", e => {
    const has = !!e.target.value.trim();
    $("#allergConsentBox").classList.toggle("hidden", !has);
    if (!has) { $("#k4").checked = false; $("#err3").style.display = "none"; }
  });

  await hydrate();
  applyTheme(DATA.settings);
  applySections();
  applyAbstractsLink();
  renderLogo();
  buildLangMenu();          // le lingue attive si conoscono solo dopo l'idratazione
  setLang(detectLang());
  initReveal();
  initScrollSpy();
  setInterval(tickCountdown, 1000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();
