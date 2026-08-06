/* ==========================================================================
   Verifica di contrasto sulle palette.

   Una palette che non si legge è peggio di una palette brutta, e a occhio non
   si valuta. Qui si controllano i quattro rapporti che contano davvero, in
   entrambi i temi, per tutti i preset e per una manciata di colori
   personalizzati scelti apposta per essere problematici.

   Soglie WCAG: 4.5:1 per il testo normale, 3:1 per elementi grafici.

   Uso:  node tests/theme.test.mjs
   ========================================================================== */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "public/theme.js"), "utf8");
const { THEMES, resolveTheme, deriveAccent, contrast } =
  new Function(src + ";return {THEMES,resolveTheme,deriveAccent,contrast};")();

/* Fondali reali del design system */
const BG = { light: "#FFFFFF", dark: "#0C1016" };
const ON_ACCENT = { light: "#FFFFFF", dark: "#08101C" };  // testo dentro i pulsanti

let pass = 0, fail = 0;
const out = [];
const check = (name, ratio, min) => {
  const ok = ratio >= min;
  ok ? pass++ : fail++;
  out.push(`  ${ok ? "✓" : "✗"} ${name.padEnd(52)} ${ratio.toFixed(2)}:1${ok ? "" : `  (serve ${min}:1)`}`);
};

function auditPalette(name, t) {
  out.push(`\n${name}`);
  for (const mode of ["light", "dark"]) {
    const v = t[mode];
    const label = mode === "light" ? "chiaro" : "scuro";
    // 1. l'accento come testo/link sul fondo della pagina
    check(`${label}: accento su fondo pagina`, contrast(v.accent, BG[mode]), 4.5);
    // 2. il testo dentro un pulsante pieno
    check(`${label}: testo del pulsante sull'accento`, contrast(ON_ACCENT[mode], v.accent), 4.5);
    // 3. il testo scuro sui fondi tenui (chip, riquadri "early bird")
    check(`${label}: testo su fondo tenue`, contrast(v.ink, v.soft), 4.5);
    // 4. il fondo tenue deve comunque distinguersi dalla pagina
    check(`${label}: fondo tenue distinguibile dalla pagina`, contrast(v.soft, BG[mode]), 1.03);
  }
}

/* ---------------------------------------------------- i sei preset */
for (const [id, theme] of Object.entries(THEMES)) {
  auditPalette(`Preset "${id}" — ${theme.label.it}`, { light: theme.light, dark: theme.dark });
}

/* ------------------------------------------- accenti personalizzati difficili */
/* Colori scelti perché a occhio sembrano ragionevoli ma sono trappole:
   giallo e ciano non si leggono su bianco, il nero non si legge su fondo scuro. */
const nasty = {
  "giallo acceso":  "#FFE500",
  "ciano":          "#00E5FF",
  "verde lime":     "#7CFF00",
  "nero":           "#000000",
  "bianco":         "#FFFFFF",
  "grigio medio":   "#808080",
  "arancione":      "#FF8A00",
  "rosa shocking":  "#FF2D95"
};
for (const [name, hex] of Object.entries(nasty)) {
  auditPalette(`Accento personalizzato: ${name} (${hex})`, deriveAccent(hex));
}

/* ------------------------------------------------------ comportamento atteso */
out.push("\nComportamento");
{
  const t1 = resolveTheme({ theme_preset: "forest" });
  const ok1 = t1.preset === "forest" && t1.custom === null && t1.light.accent === THEMES.forest.light.accent;
  ok1 ? pass++ : fail++;
  out.push(`  ${ok1 ? "✓" : "✗"} il preset scelto viene applicato`);

  const t2 = resolveTheme({ theme_preset: "forest", theme_accent: "#0057D9" });
  const ok2 = t2.custom === "#0057d9";
  ok2 ? pass++ : fail++;
  out.push(`  ${ok2 ? "✓" : "✗"} l'accento personalizzato ha la precedenza sul preset`);

  const t3 = resolveTheme({ theme_preset: "non-esiste" });
  const ok3 = t3.preset === "clinical-blue";
  ok3 ? pass++ : fail++;
  out.push(`  ${ok3 ? "✓" : "✗"} un preset inesistente ricade sul default`);

  const t4 = resolveTheme({ theme_accent: "non-un-colore" });
  const ok4 = t4.custom === null;
  ok4 ? pass++ : fail++;
  out.push(`  ${ok4 ? "✓" : "✗"} un accento non valido viene ignorato`);

  // il giallo su bianco è illeggibile: deve essere stato scurito
  const t5 = deriveAccent("#FFE500");
  const ok5 = t5.light.accent !== "#ffe500" && contrast(t5.light.accent, "#FFFFFF") >= 4.5;
  ok5 ? pass++ : fail++;
  out.push(`  ${ok5 ? "✓" : "✗"} un colore illeggibile viene corretto (giallo → ${t5.light.accent})`);
}

console.log(out.join("\n"));
console.log("\n" + "─".repeat(72));
console.log(`${pass} superati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
