# Calorie-Tracker

Ein schlanker Kalorien-Tracker als Web-App (PWA) fürs iPhone. Er läuft komplett im Browser und lässt sich über „Zum Home-Bildschirm“ wie eine App installieren.

**App:** https://st0ptv.github.io/Calorie-Tracker/

## Datenschutz

- Alle Einträge, Einstellungen und eigenen Lebensmittel werden **nur lokal auf dem Gerät** gespeichert (localStorage). Es gibt keinen Server und kein Konto.
- Dieses Repository enthält ausschließlich Programmcode und öffentliche Referenzdaten, **keine persönlichen Daten**.
- Einzige externe Anfrage: Beim Barcode-Scan wird die Barcode-Nummer an Open Food Facts gesendet.
- Backups werden über „Einstellungen → Exportieren“ als JSON-Datei erstellt und gehören **nicht** in dieses Repository.

## Funktionen

- Tagebuch mit vier Mahlzeiten, Tagesziel, Makros, Ballaststoffen und Zucker
- Lebensmittelsuche im Bundeslebensmittelschlüssel (offline)
- Barcode-Scan über die Kamera (Open Food Facts)
- Favoriten, zuletzt verwendete und eigene Lebensmittel
- Eigene Rezepte aus mehreren Zutaten (mit Endgewicht und Portionen)
- Schnelleintrag (nur kcal)
- Mahlzeit oder ganzen Tag vom Vortag übernehmen
- Verlauf über 7, 14 oder 30 Tage
- Backup-Export und -Import mit Erinnerung nach 7 Tagen

## Installation auf dem iPhone

1. Die App-Adresse in **Safari** öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm**.
3. Über das neue Symbol starten und unter „Einstellungen“ das Tagesziel eintragen.

## Quellen und Lizenzen

- **Lebensmitteldaten:** Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe. DOI: [10.25826/Data20251217-134202-0](https://doi.org/10.25826/Data20251217-134202-0). Die Datei `data/bls.json` ist ein Auszug (Energie, Makronährstoffe, Ballaststoffe und Zucker je 100 g), erzeugt mit `tools/convert_bls.py`.
- **Barcode-Daten:** [Open Food Facts](https://world.openfoodfacts.org). Datenbank unter der [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/), einzelne Inhalte unter der Database Contents License (DbCL) 1.0. Die Daten werden zur Laufzeit abgefragt und nur auf dem Gerät zwischengespeichert.
- **Barcode-Erkennung:** [ZXing](https://github.com/zxing-js/library) (`vendor/zxing.min.js`), Apache License 2.0, siehe `vendor/ZXING-LICENSE`.
