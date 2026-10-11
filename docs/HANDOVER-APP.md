# Übergabe: Kalorien-Tracker (gesamte App)

Stand: 12.10.2026 · Version **1.35.0** · Service-Worker-Cache `ct-cache-v89`
Repo: `ST0PTV/Calorie-Tracker` (öffentlich) · App: https://st0ptv.github.io/Calorie-Tracker/

Mit dieser Datei kann ein neuer Chat die App weiterentwickeln, ohne den bisherigen Verlauf zu kennen. Für das geplante Level-System gibt es eine eigene Übergabe: `docs/HANDOVER-LEVEL-SYSTEM.md`.

---

## 1. Worum es geht

Eine private, kostenlose Kalorien-Tracking-App fürs iPhone als Ersatz für YAZIO. Zuerst für den Nutzer selbst, die Partnerin soll sie eventuell auch nutzen. Installiert als Web-App auf dem Home-Bildschirm. Der Nutzer hat eine Garmin-Uhr.

## 2. Regeln für die Zusammenarbeit (wichtig)

- **Alles kostenlos:** kein Server, kein Konto, keine bezahlten Dienste.
- **Keine privaten Daten ins öffentliche Repo.** Alle Nutzerdaten bleiben im `localStorage` des Telefons. Vor jedem Commit nach persönlichen Strings suchen (Name, E-Mail-Domains, Wohnort des Nutzers – die Suchliste kennt der Nutzer bzw. seine Notizen; nicht ins Repo schreiben). Backups und `*.xlsx` sind per `.gitignore` gesperrt.
- **Commits anonym:** `git -c user.name=ST0PTV -c user.email=333304963+ST0PTV@users.noreply.github.com commit …`, danach `git push`.
- **Sprache:** mit dem Nutzer Deutsch; App-Texte Deutsch (Reiter heißen Journal / Timeline / Essen / Analytics).
- **Designs zuerst:** Sichtbare Änderungen erst als Entwurf zeigen (Design-Canvas, siehe 8), nach Freigabe umsetzen – außer der Nutzer sagt „kein Entwurf nötig“ / „setz es so um“.
- **Wissenschaftliche Aussagen:** belegt / Konsens / Spekulation trennen; angeben, ob per Web geprüft oder aus Trainingswissen; Korrelation nicht als Kausalität; Schwächen aktiv nennen; bei unsicheren Daten nachfragen. Quellen in die Info-Texte (`INFO`) und die Quellenliste der App.
- **Gesundheit:** keine Belohnung oder Ermutigung fürs Wenigessen; Untergrenzen beim Gewichtsziel; Supplement-Infos beginnen immer mit „keine Empfehlung“.
- **Fließtext in der App im Blocksatz** (Info-Texte, Warnungen) – Wunsch des Nutzers.

## 3. Technik

- **Vanilla-JS-PWA** ohne Build-Schritt; alle Dateien statisch auf GitHub Pages (deploy from branch `main`).
- **Skript-Reihenfolge** in `index.html`: `vendor/zxing.min.js`, `js/caffeine.js`, `js/alcohol.js`, `js/weightgoal.js`, `js/food.js`, `js/timeline.js`, `js/supp_catalog.js`, `js/supplements.js`, `js/app.js`. Neue Module vor `app.js` einbinden.
- **Gemeinsame Info-Texte:** jede Datei beginnt mit `var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;` – Info-Knopf per `infoBtn('schlüssel')`, Inhalt `{ body, pts:[[titel,text]], src }` oder Funktion, die das liefert.
- **Speicher:** `localStorage['ct.v1']` = gesamter State (JSON). `normalizeState(data)` in `app.js` ergänzt fehlende Felder und migriert alte Backups – **jedes neue Feld dort mit Default eintragen**. Backup = Export des ganzen States (Datei), Import über dieselbe Funktion.
- **Bei jeder Änderung:** `APP_VERSION` in `js/app.js` und `CACHE` in `sw.js` hochzählen (Service Worker holt mit `cache: 'no-cache'`). Auf dem iPhone die App danach ganz schließen und neu öffnen (evtl. zweimal); Version steht unten in den Einstellungen.
- **Netzwerk:** einzige externe Anfrage ist die Barcode-Suche bei Open Food Facts (nur die Nummer). Schrift Sora lokal (`fonts/`), keine Google-Fonts-Anfrage.

### 3.1 Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Gerüst, Tab-Leiste (diary/timeline/food/history), Blätter (Sheets) |
| `js/app.js` | State, Ziele/Makros (`goalsFor`, `calcMacros`, `PRESETS`), Journal, Hero-Karte K1, Hinzufügen-Dialog, Barcode, Vorschläge, Wasser, Analytics (`renderHistory`), Einstellungen (`renderSettings`, `SET_GROUPS`, `SET_SUB`), Backup, Lebensmittel teilen, Quellen |
| `js/caffeine.js` | Koffein-Modell, Karte (C4), Eingabe, Heatmap, Einstellungen; außerdem `trackerFoot`/`trackerBind` (gemeinsame Tracker-Fußzeile) |
| `js/alcohol.js` | Promille-Schätzung (Widmark, BMI-Faktor), Karte, Warnhinweis beim ersten Getränk |
| `js/weightgoal.js` | Gewichtsziel: Bedarf (Uhr / Grundumsatz × PAL / DGE-Formel), Tempo-Optionen, Grenzen, Auto-Anpassung bei neuem Gewicht |
| `js/food.js` | Reiter „Essen“: Bibliothek mit Makro-Balken, Aktions-Chips je Lebensmittel |
| `js/timeline.js` | Mahlzeit-Zeiten, Magen-Modell, Plan-Vorschlag, Einstellungen Timeline und „Schlaf & Körper“ |
| `js/supp_catalog.js` | 30 Supplements mit Evidenz, BfR-Höchstmenge, Studie, Quelle |
| `js/supplements.js` | Supplement-Karte, Icons (`suppIcon`), Katalog-Auswahl, Erinnerung |
| `css/style.css` | Design „Glas“ |
| `data/bls.json` | BLS-4.0-Auszug (Energie, Makros, Ballaststoffe, Zucker je 100 g), erzeugt mit `tools/convert_bls.py` (Rohdaten nicht im Repo) |
| `data/recipes.json` | 57 Rezepte (nur als Vorschlags-Kandidaten), erzeugt mit `tools/build_recipes.py` aus `tools/recipes_src.py` |
| `docs/` | Übergaben, Gemüsemonster-Kompendium (Entwürfe) |
| `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/`, `vendor/` | PWA, Schrift, ZXing |

### 3.2 State (Auszug aus `emptyState()`)

`goalHistory` [{from, goal, protein, carbs, fat, fiber, sugar, weight, preset, pf, ff}] · `days[iso]` = Journal-Einträge · `custom`, `recent`, `favs`, `pantry`, `offCache` (Lebensmittel) · `sug` + `sugRatings` (Vorschläge, Bewertung −3…+3) · `diet` {type, allergens} · `wgoal` + `weightLog` · `waterFoods`, `slices` · `water` {enabled, goal, step, log, hist} · `supp` · `timeline` · `profile` {weight, sex, height, birthYear} · `sugarPct`, `showSF`, `heroMode`, `cardOpen` · `alcohol` · `caffeine` {…, log}. `settings` wird nur noch beim Import alter Backups gelesen.

### 3.3 Wichtige Hilfsfunktionen

`fmt(n)` (Tausenderpunkt, echtes Minus), `fmtS(n)` (mit Vorzeichen), `r0`, `r1`, `esc`, `num`, `isoDate`, `addDays`, `save()`, `toast()`, `sheetHead(id, title, sub, extra)` (Hauptfenster „Schließen“, Unterfenster „‹ Zurück“), `liveFood(snap)` (aktuelle Werte eines Lebensmittels), `dayGoalState(iso, kcal, goal)` → ok/miss/open (Zielrichtung aus `goalDir`), `waterOf(iso)`, `waterGoalFor(iso)`, `readJsonFile`, `shareJson`, `mealTimeHint`.

## 4. Funktionen (Stand 1.35.0)

- **Journal:** Kalorien-Übersicht K1 (Ring nach Makro-Herkunft, Umschalter Übrig/Gegessen, Makros „x / y g“), Mahlzeiten mit Zeit-Chips, Eintrag mit optional abweichender Uhrzeit, Kopieren, Schnelleintrag/Portionen (SINU LARN 2024), Scheibengewichte, Wasser-Karte (Plus-Menge 200/250/330/500 ml, Einträge mit Uhrzeit), Koffein- und Alkohol-Karte im Stil C4 (Plus auf der Trennlinie, Details aufklappbar, leere Karte kompakt), Supplement-Karte, kompakte Vorschlags-Karte (ab 16 Uhr, ⋯-Bewertung Öfter/Seltener/Nie mehr, hinterlegte Rezepte), Backup-Erinnerung.
- **Ziele:** Zielverlauf mit „gültig ab“; Makro-Presets (Ausgewogen DGE, Muskelaufbau, Fettabbau, Eigene) aus g/kg Körpergewicht; automatische Ballaststoff- und freier-Zucker-Ziele; Gewichtsziel mit gesunden Grenzen (≤ 1 %/Woche abnehmen, ≤ 0,5 %/Woche zunehmen, Untergrenze 1.200 kcal Frauen/ohne Angabe, 1.500 kcal Männer, mit Warnhinweisen).
- **Timeline:** Magen-Modell (nicht validiert) mit Schlafzone, Phasen-Balken, Plan-Vorschlag nach Verteilungs-Preset.
- **Essen-Reiter:** Bibliothek (Meine, Favoriten, Zuletzt, Vorgemerkt), Aktions-Chips, Barcode-Scan, Einkauf vormerken.
- **Analytics:** Monatskalender mit Zielringen (grün/orange je Zielrichtung, Info-Knopf), Kalorien-Balken mit Auswahlfenster, Ø Makros, Wasser-Tropfen-Kalender (Ø, Ziel erreicht, Serie), Koffein-Heatmap, weitere Werte. Durchschnitte ohne den laufenden Tag.
- **Einstellungen (Variante B):** Gruppen Ziele · Über mich · Tracker · Planung · Daten mit Kurzinfo je Zeile; alle Bereiche starten zugeklappt; Info-Knöpfe mit Quellen.
- **Daten:** Backup/Import, Lebensmittel teilen (Format `kalorien-tracker-lebensmittel` v2, ohne persönliche Daten, ohne Favoriten; Import landet in „Vorgemerkt“, max. 2.000), Quellen & Lizenzen.
- **Ausgeblendet:** Rezept-Erstellung (`RECIPES_ON = false`) – der Nutzer will sie in der finalen Version wohl löschen; Rezepte sollen später aus einer eigenen App kommen.

## 5. Tests

- Playwright (Python, Chromium vorinstalliert) gegen einen lokalen Server: `(python3 -m http.server 8765 >/dev/null 2>&1 &)` im Repo-Ordner, Seite `http://localhost:8765/index.html`, Viewport 390×844.
- Zustand per `pg.evaluate("state.… ; save(); goTab('settings')")` setzen; Fehler über `pg.on('pageerror', …)` sammeln.
- Server danach **separat** beenden: `pkill -f "http.server 8765"` (nicht mit `&&` verketten – Exit-Code 144 bricht die Kette ab).
- Die alten Testskripte lagen nur im temporären Arbeitsordner und sind nicht im Repo. Bei Bedarf neu anlegen (z. B. `tests/` – aber ohne persönliche Daten).

## 6. Offene Punkte und Ideen

- Level-System „Gemüsemonster“ umsetzen (eigene Übergabe).
- Rezept-Erstellung entfernen, wenn die Version final ist.
- Auf dem iPhone testen: Barcode-Kamera, Analytics-Griffe, Timeline, neues Gewichtsziel.
- Gewichtsziel mit geschätztem Bedarf nach einigen Wochen mit dem echten Gewichtsverlauf vergleichen.
- Optional: Analytics-Auswahl merken; Supplement-Einnahme-Verlauf; Espresso/Grüntee-Koffeinwerte prüfen; Energy-Drink-kcal gegenprüfen.
- Später: Benachrichtigungen (bräuchte Server oder Kurzbefehle), Apple-Health-Import, Trainings-/Ruhetag-Ziele, Mikronährstoffe.
- Unbestätigte Werte: Kreider-Kreatin-DOI und Citrullin-Metaanalyse nicht nachgeprüft.

## 7. Wichtige Quellen (Auswahl, Details in der App unter „Quellen & Lizenzen“)

Makros: Morton 2018, Jäger 2017 (ISSN), Thomas 2016 (ACSM), Helms 2014, Longland 2016, DGE. Koffein: EFSA 2015, Drake 2013, Seng 2009. Timeline: Abell 2008, Schoenfeld & Aragon 2018, Ruddick-Collins 2022, Katz 2022. Alkohol: Widmark, Maudens 2014. Gewichtsziel: NHS, Harvard Health, DGE/Verbraucherzentrale (Grundumsatz, PAL). Supplements: BfR-Höchstmengen 2021/2023/2024, EMA, Cochrane, USPSTF 2022. Daten: BLS 4.0 (Max Rubner-Institut), Open Food Facts (ODbL), ZXing (Apache 2.0), Sora (OFL). Eigener Code: MIT.

## 8. Entwürfe

- **Design-Canvas** (privat): https://claude.ai/artifact/QLbUSrKnpRNVB5nxfCDvPR – alle Board-Entwürfe (Glas-Design, K1–K3, C1–C5, A1–A4, W1–W5, Vorschläge, Supplement-Icons, Einstellungen A/B, Gewichtsziel, Wasser-Analytics, Level-System). Die Generator-Skripte waren nur temporär; neue Entwürfe direkt als Boards anlegen.
- **Gemüsemonster-Kompendium:** https://claude.ai/artifact/ENhTky756yoEYbVKLDaaLy (Kopie `docs/gemuesemonster.html`).
- Farben „Glas“: Hintergrund `#0D1320`, Text `#E8EEF7`, gedämpft `#93A0B4`, Akzent `#5BE7F5`, Eiweiß `#8FB4FF`, KH `#F5C76B`, Fett `#E99AD0`, Warnung `#FF9A6B`, Wasser `#7AB8FF`, Koffein `#E2B36B`, Schlaf `#B9A6FF`, Mint/gut `#6FE0C1`.

## 9. Dokumentation beim Nutzer

Projektnotiz im privaten Obsidian-Vault „Home-Base“ auf Google Drive: `Calorie Tracker.md` (Englisch, mit Entscheidungen, Quellen, offenen Punkten, Log und Versionsverlauf). Jede spätere Änderung dort im Log nachtragen (Drive-Verbindung kann Dateien nicht überschreiben: neu anlegen, alte in den Papierkorb).

## 10. Versionsverlauf (aus `git log`)

| Datum | Commit | Änderung |
|---|---|---|
| 2026-10-10 | `9cf0dbf` | Initial commit |
| 2026-10-10 | `b13766f` | Erste Version des Kalorien-Trackers (PWA) |
| 2026-10-10 | `e508d5e` | BLS 4.0 als Lebensmitteldatenbank ergänzen |
| 2026-10-10 | `4cef2a6` | Version 1.2: Favoriten, Rezepte, Schnelleintrag, Kopieren, Ballaststoffe/Zucker, Backup-Erinnerung |
| 2026-10-10 | `3ca22c1` | Version 1.3: Design "Glas" |
| 2026-10-10 | `140aa48` | Version 1.4: Ziel-Historie |
| 2026-10-10 | `1112334` | Version 1.5: Makro-Presets mit Körpergewicht |
| 2026-10-10 | `d48f739` | Version 1.6: Abend-Vorschläge, Ernährungsform und Allergie-Filter |
| 2026-10-10 | `24ee393` | Version 1.7: Portions-Schnellwahl |
| 2026-10-10 | `4af5f3a` | Version 1.8: Wasserzähler (Design W2) |
| 2026-10-10 | `6ce10ce` | Version 1.9: Koffein-Tracker mit Pegelmodell, Planer und Heatmap |
| 2026-10-10 | `12debc8` | Heatmap-Legende mit echten mg-Werten statt weniger/mehr |
| 2026-10-10 | `64b3bad` | v1.10.0: ml für Flüssigkeiten, Koffein-Getränke zählen in Tagebuch und Wasser |
| 2026-10-10 | `920945a` | Koffein-Karte: Tagesaufnahme und Bettzeit-Pegel als Kennzahl-Kacheln |
| 2026-10-10 | `516fdf2` | v1.11.0: Zahnrad in der Kalorien-Karte, Einstellungen mit Icon-Kacheln und Zurück-Pfeil |
| 2026-10-10 | `4fffbd4` | Koffein-Kachel: Text "bis zum Richtwert" entfernt |
| 2026-10-10 | `cbda124` | Service Worker: HTTP-Cache umgehen, damit Updates sofort ankommen |
| 2026-10-10 | `0dd4dbc` | v1.11.1: eigene Häkchen-Boxen, einklappbare Einstellungs-Bereiche |
| 2026-10-10 | `6318187` | v1.11.2: Hauptseite aufgeräumt (Wasser-Titel links, Ballaststoffe/Zucker und Hinweistexte entfernt) |
| 2026-10-10 | `96a7b81` | v1.11.3: Koffein-Getränke zählen immer sofort mit, Speichern nur mit ml |
| 2026-10-10 | `b1eaa79` | Wasserkarte: Hinweis "davon … aus Koffein-Getränken" entfernt |
| 2026-10-10 | `394c876` | v1.12.0: Barcode-Kamera behält den Stream kurz, bessere Fokus-Einstellungen |
| 2026-10-10 | `dc89bf0` | v1.13.0: Supplement-Tracker mit Pillen-Leiste, Erinnerung beim Öffnen und Wochenplan |
| 2026-10-10 | `8d3afc6` | v1.13.1: remove caffeine tracking switch (entries always count) |
| 2026-10-10 | `8a70fbd` | v1.14.0: Verlauf als Monatsansicht (Kalender, Auswahlfenster, Makros, Koffein) |
| 2026-10-10 | `526373d` | v1.14.1: calendar rings perfectly round (class clash with .empty) |
| 2026-10-10 | `df51e42` | v1.15.0: tabs Journal/Analytics, caffeine always as heatmap, hint text removed |
| 2026-10-10 | `f7d459e` | v1.15.1: Tagebuch -> Journal in all visible texts |
| 2026-10-10 | `6e21a1e` | v1.15.2: shorter labels in Analytics, explanatory notes moved to settings |
| 2026-10-10 | `69f4ade` | v1.15.3: days above caffeine guideline marked in heatmap instead of stat row |
| 2026-10-10 | `aafb917` | v1.16.0: Timeline tab (meal times, stomach model, plan suggestion), sleep & body settings |
| 2026-10-10 | `323fb7f` | v1.16.1: sugar/fibre row under macro tiles when goals are set |
| 2026-10-11 | `98d0e6d` | v1.16.2: caffeine card caption 'mg' for past days |
| 2026-10-11 | `51a9395` | v1.16.3: body weight only in 'Schlaf & Körper'; weight change recalculates macro goals from today |
| 2026-10-11 | `5067209` | v1.17.0: auto fibre/free-sugar targets per preset, free vs natural sugar (BLS heuristic), optional journal display |
| 2026-10-11 | `273ffd8` | v1.18.0: sex selection; sex-specific gastric emptying factor, iron reference, caffeine note |
| 2026-10-11 | `ef2b1a8` | v1.19.0: alcohol tracker (Widmark estimate, journal card, input, settings toggle) |
| 2026-10-11 | `e43b029` | v1.19.1: body height; BMI-based distribution factor for alcohol (Maudens 2014) |
| 2026-10-11 | `cd18289` | v1.20.0: info buttons with bottom sheet in settings; justified body text |
| 2026-10-11 | `9c136a8` | v1.21.0: slice weights for cold cuts and cheese (LARN defaults, OFF serving, package calculator) |
| 2026-10-11 | `c071eb2` | v1.22.0: weight goal (target weight + date -> calorie goal, auto-adjust on new weight) |
| 2026-10-11 | `8d0e99d` | v1.22.1: option to count ml foods towards water (remembered per food) |
| 2026-10-11 | `465d647` | v1.22.2: searchable 'Meine' list with delete buttons |
| 2026-10-11 | `88e953d` | v1.22.3: confirm before removing favourites/recent; camera off right after scan |
| 2026-10-11 | `06c5e1c` | v1.22.4: camera off when leaving the app, restart when returning to barcode tab |
| 2026-10-11 | `d3fbc48` | v1.23.0: food tab (library with macro bars, pantry pre-registration via scan/search/new) |
| 2026-10-11 | `76bb8de` | v1.24.0: Lebensmittel teilen (Export/Import ohne persönliche Daten), Einkauf-Hinweis entfernt |
| 2026-10-11 | `b38a4ad` | v1.24.1: Neu-Option beim Einkauf erfassen entfernt |
| 2026-10-11 | `3d5f22d` | v1.24.2: Import übernimmt fremde Favoriten als vorgemerkt statt als Favorit |
| 2026-10-11 | `5b898f8` | v1.24.3: Rezepte-Filter und Neu → Rezept vorerst ausgeblendet |
| 2026-10-11 | `1109513` | v1.24.4: Einstellungen öffnen mit allen Bereichen zugeklappt |
| 2026-10-11 | `1fef9e3` | v1.25.0: Lebensmittel teilen exportiert alle gescannten, getrackten, eigenen und vorgemerkten Lebensmittel (ohne Favoriten) |
| 2026-10-11 | `ae24b1a` | v1.25.1: Hinweis „Kein Alkohol eingetragen“ entfernt |
| 2026-10-11 | `cfa00f8` | v1.26.0: neue Kalorien-Übersicht (Ring nach Makro-Herkunft, Übrig/Gegessen, g/%) |
| 2026-10-11 | `9b547ae` | v1.26.1: Alkohol-Hinweis als Warnung beim Eintragen statt Dauertext |
| 2026-10-11 | `bf710c9` | v1.26.2: Alkohol-Warnhinweis nur beim ersten Getränk des Tages |
| 2026-10-11 | `f810821` | v1.26.4: Makro-Werte als x / y g bzw. % mit übrig/gegessen |
| 2026-10-11 | `a025980` | v1.26.5: g/%-Umschalter entfernt, Makros nur in g |
| 2026-10-11 | `305e683` | v1.26.6: Makro-Werte in einer Zeile (x / y g) |
| 2026-10-11 | `2e0d2a0` | v1.27.0: Kalender-Ringe grün/orange je nach Zielrichtung (abnehmen/zunehmen/halten) |
| 2026-10-11 | `5b38182` | v1.27.1: Kalender-Legende durch Info-Knopf ersetzt |
| 2026-10-11 | `3bc393b` | v1.28.0: Koffein-Karte kompakter (C4: Plus auf der Trennlinie, Details aufklappbar) |
| 2026-10-11 | `ab9dd6e` | v1.29.0: Alkohol-Karte im C4-Stil, leere Koffein-/Alkohol-Karten kompakt (A2) |
| 2026-10-11 | `2fb7e70` | v1.29.1: Vorgemerkt beim Bearbeiten/Löschen eigener Lebensmittel mitziehen |
| 2026-10-11 | `610a624` | v1.29.2: Analytics-Durchschnitte ohne den laufenden Tag |
| 2026-10-11 | `f1fa834` | v1.29.3: einheitliches Zahlenformat (Tausenderpunkt, echtes Minus) |
| 2026-10-11 | `2f09093` | v1.29.4: Balken „Kalorien pro Tag“ in Kalenderfarben (Zielrichtung) |
| 2026-10-11 | `145a001` | v1.29.5: „natürlicher Zucker“ nur ab 1 g anzeigen |
| 2026-10-11 | `da8d0bd` | v1.29.6: einheitliche Kopfzeilen (Analytics im Journal-Stil, Essen ohne doppelten Knopf) |
| 2026-10-11 | `7ebcd69` | v1.29.7: einheitliche Plus-Knöpfe (eckig umrandet für Listen, rund gefüllt für Tracker) |
| 2026-10-11 | `91a8959` | v1.30.0: Wasser-Karte im Tracker-Stil (W5), Plus-Menge einstellbar, Einträge mit Uhrzeit |
| 2026-10-11 | `b0ff607` | v1.30.1: einheitliche Kartentitel (klein grau für Inhaltskarten) |
| 2026-10-11 | `c5350e7` | v1.30.2: einheitliche Fenster-Kopfzeilen (Schließen vs. Zurück) |
| 2026-10-11 | `a7aebf2` | v1.30.3: Symbole für Backup und Quellen & Lizenzen |
| 2026-10-11 | `b33e9c8` | v1.30.4: feste Erklärtexte in Info-Knöpfe verschoben |
| 2026-10-11 | `4c309a6` | v1.31.0: kompakte Vorschlags-Karte mit ⋯-Bewertung, 57 hinterlegte Rezepte für Vorschläge |
| 2026-10-11 | `a367280` | README: hinterlegte Rezepte und kompakte Vorschläge |
| 2026-10-11 | `cd7f6df` | v1.32.0: 30 Supplements mit Katalog, Icons (Form + Kürzel) und Info je Supplement; eine Supplement-Karte im Journal |
| 2026-10-11 | `bc965cc` | v1.32.1: Verwalten im Essen-Reiter (Aktionen je Lebensmittel), Meine nur zur Auswahl |
| 2026-10-11 | `578fdbd` | Essen-Info: Aktionen statt Verweis auf Meine |
| 2026-10-11 | `c9e6b30` | v1.32.2: „Abweichende Uhrzeit“ mit Hinweis auf die Mahlzeit-Zeit, Uhr-Symbol im Journal |
| 2026-10-11 | `c7734a3` | v1.33.0: Einstellungen in Gruppen-Karten mit Kurzinfo (Variante B) |
| 2026-10-11 | `3eef612` | v1.33.1: Gewichtsverlauf immer mitschreiben |
| 2026-10-11 | `a853f5e` | v1.33.2: Ziel-Kopie (settings) nicht mehr schreiben, nur noch für alte Backups lesen |
| 2026-10-11 | `1ffb612` | v1.33.3: Favoriten/Zuletzt/Vorgemerkt zeigen immer aktuelle Werte (liveFood) |
| 2026-10-11 | `1781127` | v1.33.4: Aufräumen – toter Code/CSS entfernt, gemeinsames Teilen und Datei-Import |
| 2026-10-11 | `243fed4` | v1.33.5: Bettzeit-Hinweis in Koffein-Einstellungen entfernt |
| 2026-10-11 | `7e5cfbc` | MIT-Lizenz für den eigenen Code ergänzen |
| 2026-10-11 | `9ea5df3` | Gewichtsziel mit gesunden Grenzen: Bedarf aus Uhr oder geschätzt, Tempo-Vorschläge, Untergrenze 1.200/1.500 kcal |
| 2026-10-11 | `104bf66` | Analytics: Wasser-Tropfen-Kalender mit Ø, Zielerreichung und Serie; Zielverlauf fürs Wasser |
| 2026-10-12 | `0d73c56` | Docs: Übergabe Level-System und Gemüsemonster-Kompendium (Entwürfe) |
| 2026-10-12 | – | Übergabe der gesamten App (`docs/HANDOVER-APP.md`), `__pycache__` aus dem Repo entfernt |
