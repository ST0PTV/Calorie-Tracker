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
- Tagesziel mit Datum (Ziel-Historie); Makro-Presets (Ausgewogen, Muskelaufbau, Fettabbau, Eigene) aus Körpergewicht × Faktor
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
- **Schrift:** [Sora](https://github.com/sora-xor/sora-font), SIL Open Font License 1.1, lokal eingebunden (`fonts/`, siehe `fonts/SORA-OFL.txt`), damit beim Öffnen keine Anfrage an externe Server geht.

## Makro-Presets: Herleitung

Eiweiß und Fett = Faktor (g/kg Körpergewicht) × Gewicht; Kohlenhydrate = (Kalorienziel − 4 × Eiweiß − 9 × Fett) / 4. Die App prüft den resultierenden Fettanteil gegen den empfohlenen Bereich in % der Energie.

| Preset | Eiweiß | Fett | Fettanteil-Prüfung | Quellen |
|---|---|---|---|---|
| Ausgewogen | 0,8 g/kg | 1,0 g/kg | 30–35 % | DGE (2017) Protein; DGE (2011) Richtwerte KH und Fett |
| Muskelaufbau | 1,6 g/kg | 1,0 g/kg | 20–35 % | Morton et al. 2018, [doi:10.1136/bjsports-2017-097608](https://doi.org/10.1136/bjsports-2017-097608); Jäger et al. 2017, [doi:10.1186/s12970-017-0177-8](https://doi.org/10.1186/s12970-017-0177-8); Thomas et al. 2016, [doi:10.1249/MSS.0000000000000852](https://doi.org/10.1249/MSS.0000000000000852) |
| Fettabbau | 2,2 g/kg | 0,8 g/kg | 15–30 % | Helms et al. 2014, [doi:10.1123/ijsnem.2013-0054](https://doi.org/10.1123/ijsnem.2013-0054); Longland et al. 2016, [doi:10.3945/ajcn.115.119339](https://doi.org/10.3945/ajcn.115.119339); Helms, Aragon & Fitschen 2014, [doi:10.1186/1550-2783-11-20](https://doi.org/10.1186/1550-2783-11-20) |

Die Presets ändern nur die Verteilung der Makros, nicht das Kalorienziel.
