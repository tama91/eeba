#!/usr/bin/env bash
# ==========================================================================
# Scarica i font da Google una volta sola e li mette in public/fonts/,
# così il sito non contatta più fonts.googleapis.com né fonts.gstatic.com.
#
# Perché: ogni visitatore, prima di qualunque consenso, manda il proprio
# indirizzo IP a Google. Ospitando i file in casa il problema sparisce —
# e il sito diventa anche un filo più veloce, un handshake in meno.
#
# Da lanciare una volta, e di nuovo solo se cambi i font:
#   bash scripts/fetch-fonts.sh
# ==========================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="public/fonts"
CSS="$OUT/fonts.css"
mkdir -p "$OUT"

# User-agent moderno: serve a farsi restituire woff2 invece di formati vecchi.
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

FAMILIES="family=Inter:wght@400;500;600;650&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500"
URL="https://fonts.googleapis.com/css2?${FAMILIES}&display=swap"

echo "→ scarico il foglio di stile da Google…"
RAW="$(curl -sS -A "$UA" "$URL")"
[ -n "$RAW" ] || { echo "✘ risposta vuota da Google"; exit 1; }

echo "→ tengo solo i sottoinsiemi latin e latin-ext (bastano per en/it/nl/fr)"
FILTERED="$(printf '%s\n' "$RAW" | awk '
  /^\/\* / { keep = ($0 ~ /latin/) ; next }
  keep { print }
')"

echo "→ scarico i file dei font…"
COUNT=0
printf '%s\n' "$FILTERED" | grep -oE 'https://fonts\.gstatic\.com/[^)]+\.woff2' | sort -u | while read -r u; do
  f="$(basename "$u")"
  if [ ! -f "$OUT/$f" ]; then
    curl -sS -o "$OUT/$f" "$u"
    echo "   $f"
  fi
  COUNT=$((COUNT+1))
done

echo "→ riscrivo i percorsi verso /fonts/"
printf '%s\n' "$FILTERED" \
  | sed -E 's|https://fonts\.gstatic\.com/[^)]*/([^/)]+\.woff2)|/fonts/\1|g' \
  > "$CSS.tmp"

{
  echo "/* Generato da scripts/fetch-fonts.sh — non modificare a mano."
  echo "   Font ospitati in proprio: nessuna chiamata a Google dal browser. */"
  cat "$CSS.tmp"
} > "$CSS"
rm -f "$CSS.tmp"

echo
echo "✓ $(ls -1 "$OUT"/*.woff2 2>/dev/null | wc -l | tr -d ' ') file in $OUT"
echo "✓ $CSS scritto"
echo
echo "Ora nelle pagine HTML il collegamento a Google è già sostituito da /fonts/fonts.css."
echo "Controlla che i testi si vedano bene, poi committa anche public/fonts/."
