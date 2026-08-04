/* ==========================================================================
   EEBA 2027 — logica del sito
   Dipende da i18n.js (I18N, LANGS, PRICING, COUNTRIES)
   ========================================================================== */
(function () {
"use strict";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const EVENT_START = new Date("2027-04-08T09:00:00+02:00");
const STORE_KEY = "eeba27.lang";

let lang = "en";
let T = I18N.en;

/* ---------------------------------------------------------------- LINGUA */
function detectLang() {
  const q = new URLSearchParams(location.search).get("lang");
  const saved = (() => { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } })();
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  const has = c => LANGS.some(l => l.code === c);
  return has(q) ? q : has(saved) ? saved : has(nav) ? nav : "en";
}

function buildLangMenu() {
  const menu = $("#langMenu");
  menu.innerHTML = LANGS.map(l =>
    `<button role="menuitem" data-lang="${l.code}"><span>${l.label}</span><span class="code">${l.short}</span></button>`
  ).join("");
  menu.addEventListener("click", e => {
    const b = e.target.closest("button[data-lang]");
    if (b) { setLang(b.dataset.lang); $("#lang").classList.remove("is-open"); }
  });
}

function setLang(code) {
  lang = code;
  T = I18N[code];
  try { localStorage.setItem(STORE_KEY, code); } catch (e) {}
  document.documentElement.lang = code;

  const cur = LANGS.find(l => l.code === code);
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
  renderFaq();
  renderSummary();
  syncCta();
  tickCountdown();
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
  const items = T.ticker.map(t => `<span>${t}</span>`).join("");
  $("#ticker").innerHTML = items + items; // duplicato per il loop continuo
}

/* ------------------------------------------------------------ PROGRAMME */
const TAGMAP = { key:"tagKey", lab:"tagLab", soc:"tagSoc", sym:"tagSym", free:"tagFree", ind:"tagInd", ws:"tagWs" };

function renderProgramme() {
  const active = $(".tab.is-on")?.dataset.day || "1";
  $("#panels").innerHTML = [1, 2, 3].map(d => {
    const slots = T.prog["day" + d] || [];
    return `<div class="panel ${String(d) === active ? "is-on" : ""}" data-panel-day="${d}">` +
      slots.map(s => `
        <div class="slot">
          <div class="slot__t">${s.t}</div>
          <div><h4>${s.h}</h4><p>${s.p}</p></div>
          ${s.tag ? `<span class="slot__tag ${s.tag === "key" ? "slot__tag--key" : ""}">${T.prog[TAGMAP[s.tag]] || ""}</span>` : "<span></span>"}
        </div>`).join("") + `</div>`;
  }).join("");
}

function initTabs() {
  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("is-on"));
    tab.classList.add("is-on");
    $$(".panel").forEach(p => p.classList.toggle("is-on", p.dataset.panelDay === tab.dataset.day));
  }));
}

/* ------------------------------------------------------------- SPEAKERS */
function renderSpeakers() {
  const ph = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="8.5" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;
  $("#spkGrid").innerHTML = ["r1", "r2", "r3", "r4"].map(k => `
    <article class="spk">
      <div class="spk__ph">${ph}</div>
      <div class="spk__b"><h4>—</h4><p>${T.spk[k]}</p></div>
    </article>`).join("");
}

/* ----------------------------------------------------------------- FAQ */
function renderFaq() {
  const n = 7;
  $("#acc").innerHTML = Array.from({ length: n }, (_, i) => {
    const q = T.faq["q" + (i + 1)], a = T.faq["a" + (i + 1)];
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

const isEarly = () => Date.now() < new Date(PRICING.earlyUntil + "T23:59:59").getTime();
const eur = n => new Intl.NumberFormat(lang === "en" ? "en-IE" : lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const tierPrice = t => (isEarly() ? t.early : t.late);
const findTier = id => PRICING.tiers.find(t => t.id === id);
const findAddon = id => PRICING.addons.find(a => a.id === id);

function renderTiers() {
  $("#tierList").innerHTML = PRICING.tiers.map(t => {
    const c = T.reg.tiers[t.id];
    const early = isEarly();
    return `<div class="tier ${state.tier === t.id ? "is-sel" : ""}" data-tier="${t.id}" role="radio" tabindex="0" aria-checked="${state.tier === t.id}">
      <span class="tier__radio"></span>
      <div><h4>${c.h}</h4><p>${c.p}</p></div>
      <div class="tier__price"><b>${eur(tierPrice(t))}</b>${early ? `<s>${eur(t.late)}</s>` : ""}</div>
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
  $("#addonList").innerHTML = PRICING.addons.map(a => {
    const c = T.reg.add[a.id];
    return `<label class="addon ${state.addons.has(a.id) ? "is-sel" : ""}" data-addon="${a.id}">
      <span class="addon__box">${check}</span>
      <span class="addon__t"><b>${c.h}</b><span>${c.s}</span></span>
      <span class="addon__p">+ ${eur(a.price)}</span>
    </label>`;
  }).join("");

  $$("#addonList .addon").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    const id = el.dataset.addon;
    if (state.addons.has(id)) state.addons.delete(id);
    else { state.addons.add(id); toast(T.reg.toastAdded); }
    renderAddons(); renderSummary();
  }));
}

function renderPayMethods() {
  const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m4 12.5 5.2 5.2L20 7"/></svg>`;
  $("#payList").innerHTML = ["card", "sepa", "inv"].map(id => `
    <label class="addon ${state.pay === id ? "is-sel" : ""}" data-pay="${id}">
      <span class="addon__box" style="border-radius:50%">${check}</span>
      <span class="addon__t"><b>${T.reg.pm[id]}</b></span>
    </label>`).join("");

  $$("#payList .addon").forEach(el => el.addEventListener("click", e => {
    e.preventDefault(); state.pay = el.dataset.pay; renderPayMethods();
  }));
}

function renderFormOptions() {
  const role = $("#role"), country = $("#country");
  const rv = role.value, cv = country.value;
  role.innerHTML = `<option value="">${T.reg.f.rolePick}</option>` + T.reg.f.roles.map((r, i) => `<option value="r${i}">${r}</option>`).join("");
  country.innerHTML = `<option value="">${T.reg.f.countryPick}</option>` + COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join("");
  role.value = rv; country.value = cv;
}

function renderSummary() {
  const body = $("#sumBody");
  if (!state.tier) { body.innerHTML = `<p class="small" style="margin:0">${T.reg.sumEmpty}</p>`; return; }

  const t = findTier(state.tier), tp = tierPrice(t);
  let total = tp;
  let html = `<div class="sline"><span>${T.reg.sumTier}</span><span>${eur(tp)}</span></div>
              <div class="sline sline--sub"><span>${T.reg.tiers[t.id].h}</span><span></span></div>`;

  if (state.addons.size) {
    html += `<div class="sline" style="margin-top:6px"><span>${T.reg.sumAdd}</span><span></span></div>`;
    state.addons.forEach(id => {
      const a = findAddon(id); total += a.price;
      html += `<div class="sline sline--sub"><span>${T.reg.add[id].h}</span><span>${eur(a.price)}</span></div>`;
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

  if (!ok) { const first = $(".field.has-err input, .field.has-err select"); if (first) first.focus(); }
  return ok;
}

function completeBooking() {
  const ref = "EEBA27-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  $("#bookRef").textContent = ref;
  goStep(4);
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
  const end = new Date("2027-04-10T18:00:00+02:00");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EEBA 2027//EN", "BEGIN:VEVENT",
    "UID:eeba2027@eeba.eu",
    "DTSTAMP:" + fmt(new Date()),
    "DTSTART:" + fmt(EVENT_START),
    "DTEND:" + fmt(end),
    "SUMMARY:EEBA 2027 — XXXVIII Annual Meeting",
    "LOCATION:University Hall, Naamsestraat 22, 3000 Leuven, Belgium",
    "DESCRIPTION:" + T.meta.desc.replace(/,/g, "\\,"),
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

/* ------------------------------------------------------------------ BOOT */
function init() {
  buildLangMenu();
  initHeader();
  initTabs();

  $$("[data-go]").forEach(b => b.addEventListener("click", () => goStep(Number(b.dataset.go))));
  $("#sumCta").addEventListener("click", () => (state.step === 3 ? completeBooking() : goStep(Math.min(state.step + 1, 4))));
  $("#payBtn").addEventListener("click", completeBooking);
  $("#resetBtn").addEventListener("click", resetBooking);
  $("#icsBtn").addEventListener("click", downloadIcs);

  setLang(detectLang());
  initReveal();
  initScrollSpy();
  setInterval(tickCountdown, 1000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();
