/* ==========================================================================
   Controlli statici sul codice del browser.

   Nascono da un errore vero: avevo sciolto initTabs() dentro renderProgramme
   e dimenticato la chiamata in init(). Una ReferenceError alla prima riga di
   avvio, e il sito si è presentato completamente vuoto — perché quasi tutti i
   testi vengono riempiti da JavaScript. I test dell'API non lo potevano
   vedere: non eseguono una riga di app.js.

   Non è un sostituto di un browser, ma copre gli errori che rompono tutto:
   identificatori inesistenti, classi senza CSS, id inesistenti, chiavi di
   traduzione mancanti.

   Uso:  node tests/frontend.test.mjs
   ========================================================================== */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const out = [];
const check = (name, cond, detail) => {
  cond ? pass++ : fail++;
  out.push(`  ${cond ? "✓" : "✗"} ${name}${cond || !detail ? "" : "  → " + detail}`);
};
const group = t => out.push(`\n${t}`);

/* Globali del browser e del progetto che i file possono usare liberamente. */
const BROWSER = new Set(["if","for","while","switch","catch","return","typeof","function","await","new",
  "async","var","let","const","else","do","try","in","of","delete","void","yield","this","super","case",
  "constructor","class","extends","static","get","set","instanceof",
  "Number","String","Boolean","Object","Array","Math","Date","JSON","Intl","parseInt","parseFloat","isNaN",
  "setTimeout","setInterval","clearTimeout","clearInterval","fetch","matchMedia","atob","btoa","alert","confirm",
  "encodeURIComponent","decodeURIComponent","URLSearchParams","URL","Blob","Promise","Set","Map","WeakMap",
  "IntersectionObserver","MutationObserver","requestAnimationFrame","Error","TypeError","RangeError",
  "console","document","window","navigator","location","history","localStorage","sessionStorage","crypto"]);

/* Identificatori esportati dai file condivisi, disponibili come globali. */
const SHARED = {
  "public/theme.js":    ["THEMES","DEFAULT_THEME","resolveTheme","applyTheme","logoHtml","deriveAccent","contrast","isHex","norm","mix","hexToRgb","relLum"],
  "public/payments.js": ["PAYMENT_METHODS","PAYMENT_BY_CODE","PAYMENT_ICONS","enabledPaymentMethods","paymentsMode","isOnlineMethod"],
  "public/i18n.js":     ["LANGS","I18N","PRICING","COUNTRIES"],
  "public/admin/errors.js": ["ERRORS","errorText"]
};

/* Toglie commenti e testo delle stringhe, così "Nome (opzionale)" dentro un
   messaggio in italiano non viene scambiato per una chiamata di funzione.
   Dei template literal conserva le espressioni ${…}, dove il codice c'è davvero.

   Scritto a scansione di caratteri e non con espressioni regolari: la prima
   versione usava una regex per i commenti e si mangiava le regex letterali
   come /^https?:\/\//, sbilanciando tutto quello che veniva dopo. */
function stripLiterals(src) {
  let out = "", i = 0, prev = "";
  const tplStack = [];                       // profondità delle ${…} annidate

  const isRegexStart = () => /[(,=:[!&|?{};+\-*%~^<>]/.test(prev) || prev === "";

  while (i < src.length) {
    const c = src[i], c2 = src[i + 1];

    if (c === "/" && c2 === "/") { while (i < src.length && src[i] !== "\n") i++; out += " "; continue; }
    if (c === "/" && c2 === "*") { i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; out += " "; continue; }

    if (c === "/" && isRegexStart()) {        // regex letterale: si salta intera
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) { i++; break; }
        else if (src[i] === "\n") break;
        i++;
      }
      while (i < src.length && /[gimsuyd]/.test(src[i])) i++;
      out += " R "; prev = "R"; continue;
    }

    if (c === "'" || c === '"') {             // stringa semplice: via il contenuto
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++; }
      i++; out += " S "; prev = "S"; continue;
    }

    if (c === "`") {                          // template literal
      i++;
      while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "`") { i++; break; }
        if (src[i] === "$" && src[i + 1] === "{") {   // qui dentro c'è codice: si tiene
          i += 2; let depth = 1, expr = "";
          while (i < src.length && depth > 0) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") { depth--; if (!depth) { i++; break; } }
            expr += src[i++];
          }
          out += " " + stripLiterals(expr) + " ";
          continue;
        }
        i++;
      }
      out += " S "; prev = "S"; continue;
    }

    out += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

/* --------------------------------------------- identificatori inesistenti */
group("Funzioni chiamate ma mai definite");
for (const [file, shared] of [
  ["public/app.js", ["public/theme.js", "public/payments.js", "public/i18n.js"]],
  ["public/admin/admin.js", ["public/theme.js", "public/payments.js", "public/admin/errors.js"]]
]) {
  const src = stripLiterals(read(file));
  const defined = new Set([
    ...[...src.matchAll(/(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]),
    ...[...src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)].map(m => m[1]),
    ...BROWSER,
    ...shared.flatMap(f => SHARED[f])
  ]);
  // parametri e variabili destrutturate: si aggiungono come definiti
  for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g))
    m[1].split(",").forEach(p => defined.add(p.split(":").pop().trim().split("=")[0].trim()));
  for (const m of src.matchAll(/(?:function\s*\w*|\bcatch)\s*\(([^)]*)\)/g))
    m[1].split(",").forEach(p => defined.add(p.trim().split("=")[0].trim().replace(/^\.\.\./, "")));
  for (const m of src.matchAll(/\(?([A-Za-z_$][\w$,\s]*)\)?\s*=>/g))
    m[1].split(",").forEach(p => defined.add(p.trim()));

  // chiamate a identificatore semplice, escluse quelle su un oggetto (a.b())
  const called = [...new Set([...src.matchAll(/(?<![.\w$'"`])([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]))];
  const missing = called.filter(c => !defined.has(c));
  check(file, missing.length === 0, missing.join(", "));
}

/* ------------------------------------------------- classi, id, endpoint */
group("Classi CSS e id");
for (const [label, srcs, cssFile] of [
  ["sito", ["public/index.html", "public/app.js", "public/pagamento.html", "public/checkout-anteprima.html", "public/404.html", "public/legal.html"], "public/styles.css"],
  ["backoffice", ["public/admin/index.html", "public/admin/admin.js"], "public/admin/admin.css"]
]) {
  let css = read(cssFile);
  for (const f of srcs) for (const m of read(f).matchAll(/<style>([\s\S]*?)<\/style>/g)) css += m[1];
  const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));

  const used = new Set();
  for (const f of srcs)
    for (const m of read(f).matchAll(/class="([^"$'+]*)"/g))
      m[1].split(/\s+/).filter(c => /^[a-zA-Z][\w-]*$/.test(c)).forEach(c => used.add(c));
  const missCls = [...used].filter(c => !defined.has(c));
  check(`${label}: ogni classe usata ha una regola CSS`, missCls.length === 0, missCls.join(", "));

  const all = srcs.map(read).join("\n");
  const haveIds = new Set([...all.matchAll(/\bid="([A-Za-z0-9_$-]+)"/g)].map(m => m[1]));
  const usedIds = [...new Set([...all.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map(m => m[1]))];
  const missIds = usedIds.filter(i => !haveIds.has(i) && !/^set_/.test(i));
  check(`${label}: ogni id cercato esiste nel markup`, missIds.length === 0, missIds.join(", "));
}

/* --------------------------------------------------- chiavi di traduzione */
group("Chiavi di traduzione");
{
  const { I18N, LANGS } = new Function(read("public/i18n.js") + ";return {I18N,LANGS};")();
  const at = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

  const keys = new Set();
  const html = read("public/index.html");
  for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) keys.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="[^|]+\|([^"]+)"/g)) keys.add(m[1]);
  for (const m of read("public/app.js").matchAll(/(?<![A-Za-z0-9_])T\.([a-zA-Z][A-Za-z0-9]*(?:\.[a-zA-Z][A-Za-z0-9]*)*)/g))
    keys.add(m[1]);

  const missing = [];
  for (const L of LANGS) for (const k of keys)
    if (at(I18N[L.code], k) === undefined) missing.push(`${L.code}:${k}`);
  check(`${keys.size} chiavi presenti in tutte e ${LANGS.length} le lingue`, missing.length === 0, missing.slice(0, 8).join(", "));

  // ogni metodo di pagamento ha la sua etichetta
  const { PAYMENT_METHODS } = new Function(read("public/payments.js") + ";return {PAYMENT_METHODS};")();
  const noLabel = [];
  for (const L of LANGS) for (const m of PAYMENT_METHODS)
    if (typeof at(I18N[L.code], "reg.pm." + m.code) !== "string") noLabel.push(`${L.code}:${m.code}`);
  check("ogni metodo di pagamento ha l'etichetta in ogni lingua", noLabel.length === 0, noLabel.join(", "));
}

/* -------------------------------------- registro metodi: browser vs server */
group("Coerenza fra browser e server");
{
  const { PAYMENT_METHODS } = new Function(read("public/payments.js") + ";return {PAYMENT_METHODS};")();
  const api = read("src/api.js");
  const block = api.slice(api.indexOf("const METHODS = {"), api.indexOf("const readSettings"));

  const mismatched = PAYMENT_METHODS.filter(m =>
    !new RegExp(`\\b${m.code}\\s*:\\s*\\{[^}]*kind:\\s*"${m.kind}"`).test(block));
  check("i metodi del browser esistono nel server con lo stesso tipo", mismatched.length === 0,
        mismatched.map(m => m.code).join(", "));

  const serverCodes = [...block.matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].map(m => m[1]);
  const extra = serverCodes.filter(c => !PAYMENT_METHODS.some(m => m.code === c));
  check("il server non conosce metodi che il browser ignora", extra.length === 0, extra.join(", "));
}

/* ------------------------------------ gestori senza niente da gestire */
/* Un `$$("[data-x]")` che aggancia i clic ma nessun markup che produca
   `data-x="…"` significa una tabella che non viene mai disegnata: il pulsante
   "crea" funziona, l'elenco resta vuoto, e sembra che il salvataggio non
   funzioni. È successo con le opzioni di menu. */
group("Gestori collegati a markup esistente");
for (const [file, companions] of [
  ["public/admin/admin.js", ["public/admin/index.html"]],
  ["public/app.js",         ["public/index.html"]]
]) {
  const src = read(file);
  // il markup può stare nel JS o nella pagina che lo carica
  const markup = [src, ...companions.map(read)].join("\n");
  const handled = [...new Set([...src.matchAll(/\$\$\(\s*["'`]\[data-([a-zA-Z0-9-]+)\]["'`]/g)].map(m => m[1]))];
  const orphan = handled.filter(attr => !new RegExp(`data-${attr}=`).test(markup));
  check(`${file}: ${handled.length} attributi agganciati, tutti prodotti`,
        orphan.length === 0, orphan.map(a => "data-" + a).join(", "));
}

/* --------------------------------------------------- sezioni della home */
/* Ogni riga della tabella `sections` deve corrispondere a un <section id="…">
   che esiste davvero nella home, e viceversa. Se i due elenchi divergono, il
   backoffice mostra una sezione che il sito non ha (o tiene nascosta una
   sezione che nessuno può più far riapparire) — e nessuno se ne accorge
   finché non è online. */
group("Sezioni della home");
{
  const html = read("public/index.html");
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  const inPage = [...main.matchAll(/<section\b[^>]*\bid="([a-z0-9_-]+)"/g)].map(m => m[1]);

  const grab = (file, re) => [...new Set([...read(file).matchAll(re)].map(m => m[1]))];
  const inSeed  = grab("schema/seed.sql", /INSERT INTO sections \(code, sort, published\) VALUES \('([a-z0-9_-]+)'/g);
  const inMigr  = grab("schema/migrations/004-sections.sql", /^\s*\('([a-z0-9_-]+)',\s*\d+,\s*1\)/gm);
  const inAdmin = grab("public/admin/admin.js",
    /^  ([a-z0-9_]+):\s*\{ n: "[^"]+",\s+d: "/gm);

  check("il seed elenca le sezioni della pagina",
    inSeed.every(c => inPage.includes(c)), inSeed.filter(c => !inPage.includes(c)).join(", "));
  check("la migrazione 004 elenca le stesse del seed",
    inSeed.every(c => inMigr.includes(c)) && inMigr.length === inSeed.length,
    `seed ${inSeed.length}, migrazione ${inMigr.length}`);
  check("il backoffice ha un nome in italiano per ognuna",
    inSeed.every(c => inAdmin.includes(c)), inSeed.filter(c => !inAdmin.includes(c)).join(", "));

  /* Le sezioni si spostano fra le loro posizioni: quelle che non sono in
     elenco (hero, statistiche, fascia finale) devono restare dove sono. */
  const app = read("public/app.js");
  check("il sito applica ordine e visibilità", /function applySections\s*\(/.test(app));
  check("e li chiede al server", /DATA\.sections/.test(app));
  check("il pulsante abstract ha una destinazione configurabile",
    /function applyAbstractsLink\s*\(/.test(app) && /id="absCta"/.test(html));
  check("e non resta un href=\"#\" nella sezione abstract",
    !/<a href="#" class="btn/.test(html));
}

/* ------------------------------------------------------- pagine legali */
group("Pagine legali");
{
  const { LEGAL, LEGAL_UI, LEGAL_ORG } =
    new Function(read("public/legal-content.js") + ";return {LEGAL,LEGAL_UI,LEGAL_ORG};")();
  const langs = ["en", "it", "nl", "fr"];

  for (const [doc, d] of Object.entries(LEGAL)) {
    const holes = [];
    for (const l of langs) {
      if (!d.title[l]) holes.push(`${l}:titolo`);
      d.sections.forEach((s, i) => {
        if (!s.h[l]) holes.push(`${l}:h${i}`);
        if (!s.body[l] || s.body[l].trim().length < 40) holes.push(`${l}:testo${i}`);
      });
    }
    check(`${doc}: ${d.sections.length} sezioni complete in 4 lingue`, holes.length === 0, holes.slice(0, 6).join(", "));
  }

  const html = read("public/index.html");
  for (const doc of ["privacy", "terms", "cookies"])
    check(`il piè di pagina rimanda a ${doc}`, html.includes(`/legal.html?doc=${doc}`));

  // niente Google Fonts: è il motivo per cui non serve un banner cookie
  const pages = ["public/index.html", "public/admin/index.html", "public/404.html",
                 "public/pagamento.html", "public/checkout-anteprima.html", "public/legal.html"];
  const withGoogle = pages.filter(p => /fonts\.(googleapis|gstatic)\.com/.test(read(p)));
  check("nessuna pagina carica i font da Google", withGoogle.length === 0, withGoogle.join(", "));

  // l'indirizzo del titolare è un segnaposto finché non viene compilato
  check("⚠ email del titolare ancora da compilare — non blocca i test",
        true, LEGAL_ORG.email);
}

/* --------------------------------------------------- messaggi di errore */
group("Messaggi di errore");
{
  const { ERRORS } = new Function(read("public/admin/errors.js") + ";return {ERRORS};")();
  const api = read("src/api.js");
  const admin = read("public/admin/admin.js");

  // ogni codice emesso dal server o dal backoffice ha un testo
  const emitted = new Set([
    ...[...api.matchAll(/err\([0-9]+, "([A-Z_]+)"/g)].map(m => m[1]),
    ...[...api.matchAll(/code: "([A-Z_]+)"/g)].map(m => m[1]),
    ...[...admin.matchAll(/code:\s*"([A-Z_]+)"/g)].map(m => m[1])
  ]);
  emitted.delete("SCONOSCIUTO");   // segnaposto di errorText, non un codice vero
  const noText = [...emitted].filter(c => !ERRORS[c]);
  check(`${emitted.size} codici, tutti con un testo`, noText.length === 0, noText.join(", "));

  // ogni voce dice cosa fare, non solo cosa è successo
  const noAction = Object.entries(ERRORS).filter(([, v]) => !v.w || v.w.length < 25).map(([k]) => k);
  check("ogni messaggio spiega cosa fare", noAction.length === 0, noAction.join(", "));

  /* Niente gergo: sono i termini che una segreteria non ha motivo di conoscere.
     "database" resta ammesso solo dove il problema è davvero quello e va
     segnalato a chi cura il sito. */
  const jargon = /\b(constraint|SQLITE|D1_ERROR|null|undefined|endpoint|payload|token|hash|binding|JSON|API|HTTP|4[0-9]{2}|5[0-9]{2})\b/i;
  const jargonHits = Object.entries(ERRORS)
    .filter(([, v]) => jargon.test(v.t) || jargon.test(v.w))
    .map(([k]) => k);
  check("nessun termine tecnico nei testi", jargonHits.length === 0, jargonHits.join(", "));

  // il titolo è una frase breve, non un paragrafo
  const longTitles = Object.entries(ERRORS).filter(([, v]) => v.t.length > 60).map(([k]) => k);
  check("titoli brevi", longTitles.length === 0, longTitles.join(", "));

  // nessun messaggio comincia dando la colpa a chi legge
  const blaming = Object.entries(ERRORS)
    .filter(([, v]) => /^(hai sbagliato|errore|non valido|invalido|fallit)/i.test(v.t))
    .map(([k]) => k);
  check("nessun messaggio colpevolizza", blaming.length === 0, blaming.join(", "));

  // il backoffice mostra gli errori nel riquadro, non nei toast che svaniscono
  const toastErrors = [...admin.matchAll(/toast\([^)]*,\s*true\s*\)/g)].length;
  check("gli errori non usano più i toast effimeri", toastErrors === 0, toastErrors + " rimasti");
}

/* ------------------------------------------------------------- sicurezza */
group("Nessun segreto nei file pubblici");
for (const f of ["public/app.js", "public/admin/admin.js", "public/payments.js",
                 "public/theme.js", "public/i18n.js", "schema/seed.sql"]) {
  const s = read(f);
  check(f, !/sk_live|sk_test|whsec_|Bearer\s+[A-Za-z0-9]{20}/.test(s));
}

/* ---------------------------------------------------------------- esito */
console.log(out.join("\n"));
console.log("\n" + "─".repeat(64));
console.log(`${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
