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
- Wasserzähler (+250 ml / +500 ml, Rückgängig, Tagesziel einstellbar, Standard 1,5 l nach DGE-Richtwert)
- Koffein-Tracker: Pegel im Körper mit Kurve bis zum nächsten Morgen, „unter X mg ab …“, Vorschau/Planung neuer Getränke zur Bettzeit; Verlauf in mg pro Tag, bei 30 Tagen als Heatmap (Stunde × Tag)
- Flüssigkeiten (Getränke, Milch, Säfte, Pflanzendrinks, Barcode-Produkte mit ml-Angabe, eigene Lebensmittel mit Häkchen „Flüssigkeit“) werden in ml eingegeben und angezeigt; **Annahme 1 ml ≈ 1 g** (Dichte 1,0; Milch ca. 1,03, Saft ca. 1,04 – Abweichung bis ca. 4 %)
- Koffein-Getränke tragen auf Wunsch kcal ins Tagebuch (Snacks) und ml in den Wasserzähler ein (pro Eintrag und als Standard in den Einstellungen schaltbar; Bearbeiten/Löschen bleibt synchron)
- Supplement-Tracker: Pillen-Leiste im Tagebuch (Tippen = genommen, erneut Tippen = zurücknehmen), Erinnerungskarte beim Öffnen der App für alle noch offenen Supplements („Alles genommen“, „Später“ = 1 Stunde), Einstellungen mit Menge/Einheit, täglich / jeden 2. Tag / Wochentage und Mahlzeit oder Uhrzeit; Voreinstellung Kreatin 7 g, Vitamin B12, Omega-3, Eisen (aus). Hinweise je Supplement mit Quellen (AIS, NIH ODS, Stoffel 2017); keine Benachrichtigung bei geschlossener App (ohne Server nicht möglich)
- Abend-Vorschläge ab einstellbarer Uhrzeit: 1–3 Lebensmittel mit Mengen, die die offenen Ziele treffen (Priorität Kalorien / Eiweiß / ausgewogen), bevorzugt aus eigenen Einträgen, bewertbar mit 👍/👎
- Ernährungsform (vegetarisch, vegan) und Allergie-Filter für die Vorschläge
- Lebensmittelsuche im Bundeslebensmittelschlüssel (offline)
- Portions-Schnellwahl im Mengen-Dialog (Standardportionen nach SINU LARN 2024, Stückgewichte, Packungsportion, zuletzt verwendete Menge; mehrfach tippen = mehrere Portionen)
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

## Abend-Vorschläge: Methode

- **Offene Ziele:** Tagesziel (kcal und, falls gesetzt, Eiweiß/KH/Fett) minus bereits Gegessenes.
- **Kandidaten:** zuerst Lebensmittel aus früheren Einträgen (abends Gegessenes bevorzugt), sonst eine Basisliste gängiger Kochzutaten aus dem BLS (`BASICS` in `tools/convert_bls.py`). Ausgeschlossen: Getränke, Süßwaren, Fertiggerichte, Brot/Backwaren, Gewürze, Öle sowie Lebensmittel mit zweimal 👎.
- **Mengen:** Für jede Kombination werden die Grammzahlen per Gittersuche (5- bzw. 10-g-Schritte, realistische Portionsgrenzen je Lebensmittelart) so gewählt, dass die gewichtete quadratische Abweichung der Summe von den offenen Zielen minimal ist. Überschreiten der kcal wird stärker bestraft als Unterschreiten; bei „Eiweiß zuerst“ wird fehlendes Eiweiß stark gewichtet.
- **Rangfolge:** Abweichung plus kleine Präferenzterme (Bewertung, Häufigkeit, neu vs. bekannt, keine zwei Beilagen/Gemüse).

## Ernährungsform und Allergene

Der BLS enthält keine Allergen- oder Vegan-Angaben. `tools/convert_bls.py` leitet sie aus der Hauptgruppe (erster Buchstabe des BLS-Codes) und Stichwörtern im Namen ab, nur für Gruppen mit einfachen Zutaten; zusammengesetzte Produkte bleiben „unbekannt“ und werden bei aktiven Filtern nicht vorgeschlagen. Allergene nach LMIV Anhang II, ohne Sulfite. Barcode-Produkte nutzen die Angaben von Open Food Facts, eigene Lebensmittel die eigenen Angaben. **Keine Gewähr – bei Allergien immer die Zutatenliste prüfen.**

## Standardportionen

Quelle: SINU – Società Italiana di Nutrizione Umana (2024), LARN V Revisione, „Porzioni standard“ für Erwachsene; Werte übernommen aus [ATS Brescia (2025)](https://www.ats-brescia.it/documents/3432658/78612060/Porzioni+standard+degli+alimenti+per+la+popolazione+adulta.pdf/2ce817e7-0713-bbe6-56c7-767285a575dd). Eine vergleichbare deutsche Tabelle für Einzelportionen Erwachsener wurde nicht gefunden (die DGE gibt Tages- bzw. Wochenmengen an).

| Lebensmittel (roh, essbarer Anteil) | Portion |
|---|---|
| Reis, Nudeln, Getreide (trocken) | 80 g |
| Frühstückscerealien, Haferflocken | 30 g |
| Frische Pasta / gefüllte Pasta / Gnocchi | 100 / 125 / 200 g |
| Kartoffeln | 200 g (ca. 2 kleine) |
| Hülsenfrüchte getrocknet / gegart oder Dose | 50 / 150 g |
| Fleisch | 100 g |
| Fisch / Fischkonserve abgetropft | 150 / 50 g |
| Wurst, Aufschnitt | 50 g |
| Ei | 50 g (1 Ei) |
| Milch / Joghurt | 125 ml / 125 g |
| Frischkäse, Quark, Mozzarella (≤ 25 % Fett) / Ricotta / gereifter Käse | 100 / 150 / 50 g |
| Gemüse / Blattsalat | 200 / 80 g |
| Obst frisch / Trockenobst | 150 / 30 g |
| Nüsse, Samen | 30 g |
| Brot | 50 g |
| Öl (1 EL) / Butter | 9 / 10 g |

Gegarte BLS-Varianten (z. B. „Reis poliert, gekocht“) rechnen die Rohportion über das Energieverhältnis roh/gegart um. Stückgewichte (1 Tomate 80 g, 1 Karotte 60 g, 1 kleine Kartoffel 100 g) sind aus den LARN-Haushaltsmaßen abgeleitet.

## Wasser

Standardziel 1,5 l Getränke pro Tag (Richtwert der DGE, zitiert nach [Verbraucherzentrale NRW](https://www.verbraucherzentrale.nrw/wissen/lebensmittel/gesund-ernaehren/wie-viel-sollte-man-am-tag-trinken-24202)); die [EFSA (2010)](https://www.efsa.europa.eu/en/press/news/nda100326) hält 2,5 l (Männer) bzw. 2,0 l (Frauen) **Gesamtwasser** für angemessen, inklusive Wasser aus Lebensmitteln. Das Ziel ist in den Einstellungen änderbar.


## Barcode-Kamera

- Der Kamera-Stream wird nach dem Schließen des Scanners 3 Minuten behalten (Kamera dann deaktiviert), damit iOS beim erneuten Öffnen nicht erneut nach der Erlaubnis fragt. Bekannt ist, dass iOS-Home-Bildschirm-Apps die Erlaubnis nicht dauerhaft speichern ([WebKit-Bug 215884](https://bugs.webkit.org/show_bug.cgi?id=215884)); ob das Behalten des Streams die Abfrage zuverlässig verhindert, ist nicht bestätigt.
- Fokus: Auflösung bis 1920×1080, Hauptkamera statt Ultraweitwinkel (falls erkennbar), Autofokus „continuous“ nur wenn das Gerät ihn anbietet, TRY_HARDER und Abtastung alle 150 ms. Die Wirkung auf dem iPhone ist ungetestet.

## Flüssigkeiten und Koffein-Getränke im Tagebuch

- Erkennung als Flüssigkeit bei BLS-Daten nach Warengruppe und Name (Getränke, Milch/Kefir/Buttermilch, Säfte/Nektare, Pflanzendrinks; Pulver, Konserven, Konzentrate und Kondensmilch ausgenommen). Die Regeln sind Heuristiken – Einzelfälle können falsch eingeordnet sein.
- kcal pro 100 ml: Kaffee, Espresso, Cola aus der BLS 4.0; **Energy Drink 45 kcal/100 ml stammt nur aus einer Quelle (wikifit.de, Red Bull, zuckerhaltig) und ist nicht gegengeprüft**; zuckerfreie Sorten haben deutlich weniger. Werte sind im Eingabedialog änderbar.
- Ob Kaffee/Energy zur Flüssigkeitszufuhr zählen, ist eine Entscheidung des Nutzers (per Schalter änderbar). Geplante Getränke in der Zukunft zählen sofort mit.

## Koffein: Modell, Annahmen und Quellen

**Modell.** Ein-Kompartiment-Modell mit Aufnahme und Abbau erster Ordnung: Menge(t) = D · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t)), ke = ln 2 / Halbwertszeit, ka = 8/h (Maximum nach ca. 30 min). „Getrunken über X min“ verteilt die Dosis in sechs Teile über diese Zeit. Mehrere Getränke addieren sich (Superposition). Geprüft mit `node`: Fläche unter der Kurve = D/ke, Maximum nach 31 min, terminale Halbwertszeit exakt wie eingestellt, Dauer verschiebt das Maximum, ändert die Gesamtmenge nicht.

**Quellen (per Websuche/PubMed geprüft):**

| Aussage | Quelle |
|---|---|
| Halbwertszeit im Mittel ca. 5 h, individuell 2,7–9,9 h; Maximum nach ca. 30 min; Bioverfügbarkeit ≈ 100 % | Blanchard (1983), Eur J Clin Pharmacol (Abstract) |
| Ein-Kompartiment-Modell mit Aufnahme/Abbau erster Ordnung; Halbwertszeit Nichtraucher 4,3 h, Raucher 3,0 h | Seng et al. (2009), [doi:10.1111/j.1365-2710.2008.00976.x](https://doi.org/10.1111/j.1365-2710.2008.00976.x) |
| 400 mg Koffein 0, 3 oder 6 h vor der Bettzeit störten den Schlaf (randomisiert, placebokontrolliert) | Drake et al. (2013), [doi:10.5664/jcsm.3170](https://doi.org/10.5664/jcsm.3170) |
| Einzeldosis bis 200 mg, täglich bis 400 mg (gesunde Erwachsene), 200 mg/Tag Schwangere/Stillende; ca. 100 mg kurz vor dem Schlafen können den Schlaf beeinflussen | EFSA NDA Panel (2015), [doi:10.2903/j.efsa.2015.4102](https://doi.org/10.2903/j.efsa.2015.4102) |
| Energy Drink ca. 80 mg je 250 ml; Gleichwerte (200 mg ≈ 2 Tassen Kaffee, 4 Tassen Tee, 5 Dosen Cola) | [Bundesregierung/BfR](https://www.bundesregierung.de/breg-de/aktuelles/koffein-die-dosis-machts-1649340) |

**Getränkewerte.** Filterkaffee 90 mg/200 ml, Schwarztee 50 mg/200 ml, Cola 33 mg/330 ml und die Energy-Drink-Größen sind aus den BfR-Angaben abgeleitet. **Nicht belegt** (übliche Werte aus allgemeinem Wissen, in der App mit „ca.“ markiert): Espresso 60 mg/30 ml, doppelter Espresso 120 mg, Grüntee 30 mg. Die Packungsangabe hat Vorrang; die Menge ist beim Eintragen änderbar.

**Schwächen und Grenzen.**
- Die **Schwelle „unter 50 mg zur Bettzeit“ ist eine Faustregel, kein belegter Grenzwert.** In Drake et al. lag die Menge im Körper bei Bettzeit (400 mg, 6 h vorher) nach diesem Modell bei ca. 100–220 mg (Halbwertszeit 3–7 h); unterhalb davon gibt es keine Daten, die einen sicheren Wert belegen. Schlafempfindlichkeit ist individuell.
- Die **Halbwertszeit streut stark** (2,7–9,9 h). Der Pegel zur Bettzeit eines Beispieltags reichte im Modell von 11 mg (Halbwertszeit 3 h) bis 72 mg (9,9 h). Deshalb ist sie einstellbar. Medikamente, Schwangerschaft, Leber, Rauchen u. a. verändern sie; das Modell kennt sie nicht.
- Gezeigt wird die **Menge im Körper in mg**, nicht die Konzentration im Blut (Körpergewicht/Verteilungsvolumen fehlen). Toleranz, Mahlzeiten und Alkohol sind nicht berücksichtigt; Aufnahmegeschwindigkeit (ka) ist angenommen, nicht gemessen (Seng et al.: große Streuung der Absorptionsrate).
- Die Studienlage zu Schlaf ist korrelativ/klein (Drake: Stichprobengröße nach meiner Erinnerung klein, in dieser Recherche nicht geprüft); die App gibt keine medizinischen Empfehlungen.
- Heatmap und Durchschnitte zählen nur Tage mit Koffein- oder Essenseinträgen; ein Tag ohne Eintrag ist nicht zwingend ein Tag ohne Koffein.

Alle Koffein-Daten liegen wie alles andere nur lokal auf dem Gerät und sind Teil des Backup-Exports.
