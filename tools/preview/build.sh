#!/bin/sh
# Baut die private Vorschau (App + Testdaten-Seed) nach $1. Aufruf: sh tools/preview/build.sh <zielordner>
set -e
OUT="$1"; [ -n "$OUT" ] || { echo "Zielordner fehlt"; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
rm -rf "$OUT"; mkdir -p "$OUT"
cd "$ROOT"
cp -r index.html manifest.webmanifest css js data fonts icons vendor "$OUT"/
cp tools/preview/seed.js "$OUT/js/preview_seed.js"
sed -i 's#<script src="js/app.js" defer></script>#<script src="js/preview_seed.js" defer></script>\n  <script src="js/app.js" defer></script>#' "$OUT/index.html"
sed -i 's#<title>\([^<]*\)</title>#<title>Gemüsemonster Vorschau</title>#' "$OUT/index.html"
echo "Vorschau in $OUT"
# Steuerzeichen in zxing (nur in Zeichenketten) als \uXXXX schreiben – der Vorschau-Upload lehnt Rohbytes ab, JS bleibt gleich
python3 - "$OUT/vendor/zxing.min.js" <<'PY'
import re, sys
p = sys.argv[1]; b = open(p, 'rb').read()
open(p, 'wb').write(re.sub(rb'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', lambda m: b'\\u%04x' % m.group()[0], b))
PY
