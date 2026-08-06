/* ==========================================================================
   EEBA 2027 — palette e logo
   Condiviso fra sito pubblico e backoffice. Caricato prima di app.js.

   Ogni preset definisce solo la famiglia dell'accento: i neutri (sfondi,
   testi, bordi) restano quelli del design system, perché sono la parte su cui
   si gioca la leggibilità e non ha senso lasciarla modificare.

   I valori sono scelti per superare il contrasto AA in entrambi i temi:
   l'accento deve leggersi sul fondo, e il testo del pulsante deve leggersi
   sull'accento. Lo verifica tests/theme.test.mjs.
   ========================================================================== */

const THEMES = {
  "clinical-blue": {
    label: { en: "Clinical blue", it: "Blu clinico", nl: "Klinisch blauw", fr: "Bleu clinique" },
    light: { accent: "#0057D9", ink: "#0043A8", soft: "#E8F0FE" },
    dark:  { accent: "#5B9DFF", ink: "#8ABAFF", soft: "#13233A" }
  },
  "deep-teal": {
    label: { en: "Deep teal", it: "Verde acqua", nl: "Diep turkoois", fr: "Sarcelle" },
    light: { accent: "#0F6E64", ink: "#0A544C", soft: "#E0F2F0" },
    dark:  { accent: "#4FC9BA", ink: "#7FDCD1", soft: "#0E2A28" }
  },
  "ink-violet": {
    label: { en: "Ink violet", it: "Viola inchiostro", nl: "Inktviolet", fr: "Violet encre" },
    light: { accent: "#5B2BB8", ink: "#46208F", soft: "#EFE9FB" },
    dark:  { accent: "#A98BF5", ink: "#C2AAFA", soft: "#1F1733" }
  },
  "crimson": {
    label: { en: "Crimson", it: "Cremisi", nl: "Karmijn", fr: "Cramoisi" },
    light: { accent: "#B01739", ink: "#8B112C", soft: "#FCE9ED" },
    dark:  { accent: "#F4788F", ink: "#F9A0B0", soft: "#331319" }
  },
  "forest": {
    label: { en: "Forest", it: "Verde bosco", nl: "Bosgroen", fr: "Forêt" },
    light: { accent: "#15703A", ink: "#0F572C", soft: "#E4F3E9" },
    dark:  { accent: "#54C77D", ink: "#82D9A0", soft: "#0F2A1A" }
  },
  "graphite": {
    label: { en: "Graphite", it: "Grafite", nl: "Grafiet", fr: "Graphite" },
    light: { accent: "#3D4B5C", ink: "#2A3543", soft: "#EBEEF2" },
    dark:  { accent: "#9FB0C4", ink: "#BCC8D6", soft: "#1B222B" }
  }
};

const DEFAULT_THEME = "clinical-blue";

/* ---------------------------------------------------------- utilità colore */
const hexToRgb = h => {
  const s = String(h).replace("#", "").trim();
  const f = s.length === 3 ? s.split("").map(c => c + c).join("") : s;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
};
const isHex = h => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(h || "").trim());
const norm = h => "#" + String(h).replace("#", "").trim().toLowerCase();

const relLum = hex => {
  const c = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/* Schiarisce o scurisce un colore verso bianco/nero, per derivare le varianti
   di un accento personalizzato senza chiedere all'utente tre colori. */
function mix(hex, target, amount) {
  const a = hexToRgb(hex), b = hexToRgb(target);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amount)
    .toString(16).padStart(2, "0")).join("");
}

/* Da un solo accento ricava le quattro varianti (chiaro/scuro × accento/soft),
   spostandolo se serve per garantire il contrasto minimo. */
function deriveAccent(hex) {
  let light = norm(hex);
  // sul fondo bianco l'accento deve leggersi come testo: almeno 4.5:1
  let guard = 0;
  while (contrast(light, "#FFFFFF") < 4.5 && guard++ < 24) light = mix(light, "#000000", 0.08);

  // in scuro serve il contrario: abbastanza chiaro sul fondo quasi nero
  let dark = norm(hex);
  guard = 0;
  while (contrast(dark, "#0C1016") < 4.5 && guard++ < 24) dark = mix(dark, "#FFFFFF", 0.08);

  return {
    light: { accent: light, ink: mix(light, "#000000", 0.22), soft: mix(light, "#FFFFFF", 0.92) },
    dark:  { accent: dark,  ink: mix(dark, "#FFFFFF", 0.28),  soft: mix(dark, "#0C1016", 0.88) }
  };
}

/* Restituisce la coppia chiaro/scuro effettiva date le impostazioni salvate. */
function resolveTheme(settings) {
  const preset = THEMES[settings?.theme_preset] ? settings.theme_preset : DEFAULT_THEME;
  const custom = settings?.theme_accent;
  if (isHex(custom)) return { preset, custom: norm(custom), ...deriveAccent(custom) };
  return { preset, custom: null, light: THEMES[preset].light, dark: THEMES[preset].dark };
}

/* Applica al documento le variabili dell'accento per il tema attualmente attivo.
   Va richiamata anche quando l'utente cambia chiaro/scuro, perché i due set
   di valori sono diversi. */
function applyTheme(settings, root) {
  const el = root || document.documentElement;
  const t = resolveTheme(settings);
  const forced = el.dataset.theme;
  const isDark = forced === "dark" ||
    (forced !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  const v = isDark ? t.dark : t.light;
  el.style.setProperty("--accent", v.accent);
  el.style.setProperty("--accent-ink", v.ink);
  el.style.setProperty("--accent-soft", v.soft);
  return t;
}

/* Logo: URL a un'immagine oppure SVG incollato. Restituisce HTML già pronto,
   con il segno di default come riserva. */
function logoHtml(settings, { fallback = "", alt = "EEBA 2027" } = {}) {
  const svg = (settings?.logo_svg || "").trim();
  if (svg.startsWith("<svg")) return svg;
  const url = (settings?.logo_url || "").trim();
  if (/^https?:\/\//i.test(url)) return `<img src="${url}" alt="${alt}" style="height:100%;width:auto;object-fit:contain">`;
  return fallback;
}

if (typeof module !== "undefined") module.exports = { THEMES, DEFAULT_THEME, resolveTheme, deriveAccent, contrast, isHex, norm };
