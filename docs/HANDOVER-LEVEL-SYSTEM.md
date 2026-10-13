# Übergabe: Level-System „Gemüsemonster“

Stand: 12.10.2026 · App-Version 1.36.0 · Repo `ST0PTV/Calorie-Tracker` (öffentlich) · App: https://st0ptv.github.io/Calorie-Tracker/

Diese Datei reicht aus, um in einem neuen Chat am Level-System weiterzuarbeiten. Sie beschreibt das beschlossene Konzept, die Entwürfe, die technischen Leitplanken der App und einen Umsetzungsplan. **Umgesetzt: Schritt 1 (Berechnung, `js/level.js`, ohne Oberfläche, Tests in `tools/test_level.js`).** Alles Sichtbare ist noch Entwurf.

---

## 1. Rahmen, der nicht verhandelbar ist

- **Kostenlos:** keine bezahlten Dienste, kein Server, kein Konto.
- **Privat:** Alle persönlichen Daten bleiben im `localStorage` des iPhones. **Niemals private Daten ins öffentliche Repo** (Gewicht, Namen, E-Mail, Wohnort, Backups). Vor jedem Commit nach persönlichen Strings suchen (Name, E-Mail-Domain, Wohnort des Nutzers – die konkrete Suchliste steht in den Notizen des Nutzers, nicht hier im öffentlichen Repo).
- **Belohnt wird nur das Dranbleiben und die Datenpflege, nie weniger Essen.** Keine XP, Formen oder Kampfstärke aus Kalorien unter Ziel, Defizit oder Gewichtsverlust. Grund: Kalorien-Tracking-Apps hängen in Studien mit Essstörungs-Symptomen zusammen (Korrelation, Kausalität unklar; Wissensstand aus Training, nicht nachgeprüft) – Belohnungen fürs Wenigessen würden dieses Risiko verstärken.
- **Kein Druck:** ausgelassene Tage/Monate kosten nichts, man verliert nie etwas (keine Monster, kein Level), keine Ranglisten.
- Kommunikation mit dem Nutzer auf **Deutsch**; Commits anonym als `ST0PTV <333304963+ST0PTV@users.noreply.github.com>`.
- Wissenschaftliche Aussagen: belegt / Konsens / Spekulation trennen, angeben ob per Web geprüft oder aus Trainingswissen, Schwächen benennen, bei unsicheren Daten nachfragen.
- Der Nutzer will Designs **zuerst als Entwurf** sehen und freigeben, bevor umgebaut wird (außer er sagt „kein Entwurf nötig“).

## 2. Entwürfe (Quellen)

- **Gemüsemonster-Kompendium** (alle finalen Designs, interaktiv): `docs/gemuesemonster.html` in diesem Repo (= Inhalt des Artefakts https://claude.ai/artifact/ENhTky756yoEYbVKLDaaLy). Enthält **alle Monster als Inline-SVG** (je `viewBox="0 0 64 64"`, in `<template id="t0…t44">`), alle 8 Arena-Szenen (`<template id="s0…s7">`, `viewBox="0 0 320 180"`), die Probe-Logik für „Arena belegen“ und „Probekampf“ (JS am Ende der Datei).
  - Index der Templates: `t0–t8` Starter (Möhri, Möhrax, Möhrgon, Erbsi, Schotti, Schotador, Tomi, Tomatz, Tomagma), `t9–t41` Monatsmonster je 3 Formen (Reihenfolge wie Tabelle unten: Baby, Normal, Super), `t42–t44` Legendäre (Erntor, Rhizowal, Solarion).
- **Level-Canvas „Kalorien Tracker Level-UI“** (inkl. „Entdecker & Zufall“ EZ0–EZ8 und „Bonus-Monster & Ausbau“ BM0–BM8 sowie Runde 3: OV, GA, HA, SK, KO, LG, AD, OB, IC, SIM, FS, A11Y) (privat, seit 12.10.2026 getrennt vom App-Design-Canvas https://claude.ai/artifact/QLbUSrKnpRNVB5nxfCDvPR): https://claude.ai/artifact/UCr1R6T5B4JoQLymnBDmXB – Boards: „Level-System“ (LV1–LV6), „Level-Themen“ (TH*), „Level-System v2“ (LS*), „Sport & Küche“ (TS*), „Smileys“ (TM1–TM6), „Gemüsemonster“ (MO1–MO7), „Monster-Evolutionen“ (MV1–MV7), „Level-UI zur Freigabe“ (U1–U6, rückwirkender Start), „Monster-Animationen“ (AN1–AN6: alle 45 Formen animiert, Vergleich ruhig/lebhaft).
- Die Python-Generatoren der Entwürfe lagen nur im temporären Arbeitsordner der alten Sitzung und sind **nicht** übernommen. Die SVGs im Kompendium sind die Quelle der Wahrheit.

## 3. Konzept (vom Nutzer freigegeben)

### 3.1 Zeitstufen

| Phase | Level | Wie man aufsteigt |
|---|---|---|
| Monat 1 | 1–10 | nach **XP**; soll Spaß am Tracken etablieren, Level leicht erreichbar |
| Monat 2–12 | 11–21 | **1 Level pro vollständigem Monat** |
| ab Jahr 2 | 22, 23 … | **1 Level pro vollständigem Quartal** |
| jedes volle Jahr | – | **Sonderauszeichnung**: legendäres Jahresmonster |

- **Vollständiger Monat:** Vorschlag ≥ 20 Tage mit mindestens einem Eintrag (Pausetage zählen mit). **Quartal:** ≥ 60 Tage. → Schwellen vom Nutzer noch nicht endgültig bestätigt.
- Übergang (Vorschlag, offen): Wer nach 30 Tagen Level 10 noch nicht hat, steigt per XP weiter; Monatslevel zählen trotzdem ab dem 2. Kalendermonat.

### 3.2 XP in Monat 1 (Vorschlag)

| Aktion | XP |
|---|---|
| Tag mit ≥ 1 Eintrag | 10 |
| Tag vollständig (alle Mahlzeiten) | +15 |
| Eintrag (max. 10 pro Tag) | 2 |
| Neues Produkt gescannt (mit Nährwerten) | 15 |
| Eigenes Lebensmittel mit allen Werten | 20 |
| Fehlende Werte ergänzt | 10 |
| Lebensmittel geteilt (1× pro Woche) | 25 |
| Wasserziel erreicht | 5 |
| Gewicht eingetragen (1× pro Woche) | 5 |
| Wochenziel geschafft (optional) | 30–40 |

Level-Schwellen (Gesamt-XP): L1 0 · L2 30 · L3 80 · L4 150 · L5 240 · L6 350 · L7 480 · L8 630 · L9 800 · L10 990. Ein normaler Tag ≈ 40 XP (Schätzung) → L2 am 1. Tag, L10 nach ~25 Tagen. Optional: 1 Pausetag pro Woche hält eine Serie.

### 3.3 Starter (Monat 1, einmal wählen)

Jeder Starter entwickelt sich zweimal (Level 6 und 10). Monat 1: L1 Ei · L2 Ei wackelt · L3 schlüpft · L4 Baby · L5 übt · L6 **Evo** · L7 trainiert · L8 volle Kraft · L9 leuchtet · L10 **Evo**.

| Typ | Stufe 1 | Stufe 2 | Stufe 3 | Charakter |
|---|---|---|---|---|
| Wurzel | Möhri | Möhrax | Möhrgon (Möhren-Drache) | mutig und stur |
| Hülse | Erbsi | Schotti | Schotador (Schoten-Ritter) | Teamplayer |
| Frucht | Tomi | Tomatz | Tomagma (Lava-Tomate) | heißblütig |

### 3.4 Monatsmonster (Monat 2–12)

Jeden Monat ein neues Monster, das sich **innerhalb des Monats** über getrackte Tage entwickelt: **Baby ab Tag 1 · Normalform ab 10 · Superform ab 20 Tagen** (Lücken egal). Wird der Monat nicht fertig, bleibt das Monster in der erreichten Form im Album.

| # | Baby | Normalform | Superform | Typ | Wesen / Superform |
|---|---|---|---|---|---|
| 01 | Brokki | Brokko | Brokkolos | Blatt | verschlafen; Vogelnest in der Krone |
| 02 | Kürbi | Kürbo | Kürbrock | Frucht | lacht laut; leuchtet wie eine Laterne |
| 03 | Pepi | Papri | Paprisma | Frucht | schüchtern; rot/gelb/grün zugleich |
| 04 | Radl | Radi | Radirex | Wurzel | flink; Radieschen-Dino |
| 05 | Zwibbel | Zwiebi | Zwiebolon | Zwiebel | weint; Schalen als Rüstung |
| 06 | Gurki | Gurkon | Gurkodil | Frucht | cool; Gurken-Krokodil |
| 07 | Aubi | Aubaron | Aubzar | Frucht | adlig; Zepter und Hermelin |
| 08 | Sprossi | Sparx | Sparxion | Spross | unter Strom; drei Stangen |
| 09 | Spori | Pilzo | Myzelor | Pilz | verträumt; einäugiger Riesenpilz |
| 10 | Beti | Betti | Bettrix | Wurzel | geheimnisvoll; Rote-Bete-Hexe |
| 11 | Lauchling | Lauchi | Merlauch | Blatt | weise; Erzmagier |

Ideen für Jahr 2+: Ingo (Ingwer), Knobi (Knoblauch), Knolle (Kartoffel), Maisi (Mais), Kohli (Rotkohl), Fenchi (Fenchel).

### 3.5 Legendäre Jahresmonster

Jahr 1 **Erntor** (Kürbis-Erntedrache, Blattflügel, Weizenkrone) · Jahr 2 **Rhizowal** (Wolkenwal mit Wald auf dem Rücken, Wurzelranken) · Jahr 3 **Solarion** (Sonnenlöwe mit Sonnenblumen-Mähne). Ab Jahr 4 in Goldform.

### 3.6 Arenen (Freischaltung jedes Quartal)

Monster können in Arenen aufgestellt werden (4 Plätze, Sternenacker 3). Sind alle Plätze mit Lieblingstypen besetzt → Arena-Emblem in Gold.

| # | Arena | Art | Frei nach | Lieblingstypen |
|---|---|---|---|---|
| 1 | Glasdom | Gewächshaus | 3 Monaten | Blatt, Spross |
| 2 | Wurzelgrotte | Höhle mit leuchtenden Wurzeln | 6 | Wurzel, Pilz |
| 3 | Kompostkrater | dampfender Vulkan | 9 | Frucht |
| 4 | Wolkenbeet | schwebende Beete | 12 | Spross, Hülse |
| 5 | Salatsee | Seerosenblätter | 15 | Blatt, Frucht |
| 6 | Frostkeller | Eiskeller | 18 | Zwiebel, Wurzel |
| 7 | Markthalle | Marktstände, Lichterkette | 21 | alle Typen |
| 8 | Sternenacker | Feld unter der Milchstraße | 24 | nur Legendäre |

### 3.7 Kämpfe (Idee, freiwillig – Nutzer hat gefragt, noch nicht beschlossen)

- **Arena-Duell** gegen die Leitung (z. B. Brokkolos im Glasdom), Sieg vergoldet das Emblem; **Partnerduell per Teamcode** (Code enthält nur Monster + Form, keine Ess-/Gewichtsdaten; Kampf lokal gegen eine Kopie).
- **Typenrad** (stark gegen den nächsten, ×1,5; schwach ×0,75): Frucht → Blatt → Wurzel → Pilz → Zwiebel → Spross → Hülse → Frucht. Legendäre ohne Typ.
- Stärke nur aus **Form + Typ**. Kämpfe geben **keine XP**. Verlieren hat keine Folgen.
- Spezialattacken der Superformen: Wurzelpeitsche (Möhrgon), Lavaspritzer (Tomagma), Nickerchen (Brokkolos, heilt), Lachanfall (Kürbrock, Gegner setzt aus), Farbwechsel (Paprisma), Turbohüpfer (Radirex, zuerst), Tränenflut (Zwiebolon), Coole Brise (Gurkodil), Königlicher Befehl (Aubzar), Spargelblitz (Sparxion), Sporenwolke (Myzelor, Schlaf), Spiralzauber (Bettrix), Lauchzauber (Merlauch, Team +10 %).
- Werte im Prototyp nur grob austariert – vor Umsetzung balancieren.

### 3.8 Sammlung & Steckbrief

Sammlung mit Zählern (Monster x/17, Formen x/45, Orden x/8), Typ-Filter, drei Punkte pro Monster für erreichte Formen, Silhouette + „???“ für unentdeckte. Steckbrief: großes Bild, Entdeckungsmonat, getrackte Tage im Monat, Datum der Superform, Evolutionskette, Spruch.

### 3.9 Weitere Themen (entworfen, nicht beschlossen)

Garten, Schmetterling, Kristall, Gipfelweg, Wasser, Nachthimmel, Süße Tiere (Baumhaus), Labor (Zellen → Geräte → Paper), Sport (Startnummern, Pokale), Küche (Saisonkorb), Smileys (Sticker-Album). Thema soll wählbar sein, Level bleibt beim Wechsel gleich. **Fokus der ersten Umsetzung: Gemüsemonster.**

## 4. Entscheidungen

Beschlossen (12.10.2026):
1. Vollständiger Monat ≥ 20, Quartal ≥ 60 gezählte Tage.
2. Wer L10 nach Monat 1 nicht hat, sammelt weiter XP; Monatslevel zählen trotzdem ab dem 2. Kalendermonat und kommen obendrauf.
3. Alle XP-Bausteine an: Wochenziele (nur Tracking), Pausetag, Gewicht (+5, 1×/Woche), Wasserziel (+5).
4. Kämpfe: nur Arena-Duell (kein Partnerduell), kommt nach Arenen.

In `js/level.js` so umgesetzt, aber noch vom Nutzer zu bestätigen:
- Pausetag automatisch: je Kalenderwoche zählt der erste ausgelassene vergangene Tag mit (für Monat, Quartal, Monsterform, Wochenziel).
- Wochenziel = 7 von 7 Tagen gezählt (also ≥ 6 echte), 35 XP, nur ganze Wochen ab Start.
- „Tag vollständig“ = Frühstück, Mittag und Abend je ≥ 1 Eintrag (Snacks kein Muss).
- „Eigenes Lebensmittel mit allen Werten“ = E/KH/F/Ballaststoffe/Zucker ausgefüllt (freier Zucker optional); leere Felder merkt sich `food.miss`, „Werte ergänzt“ zählt, wenn ein Bearbeiten Felder füllt.
- Monatslevel/Quartal zählt, sobald die Schwelle erreicht ist (nicht erst am Monatsende). Monat 1 = Kalendermonat des Starts.
- Volles Jahr = 12 Monate vorbei und ≥ 240 gezählte Tage.
- Arena i öffnet, wenn 3·(i+1) Kalendermonate seit dem Start vergangen sind.
- Scan/Eigenes/Ergänzt/Geteilt haben kein Datum im State → Zähler in `state.level.ev[iso]` (nur Anzahl), erst ab Version 1.36.0; ältere Aktionen geben keine XP.

Beschlossen (13.10.2026) – Entwürfe EZ0–EZ8 im Level-Canvas, noch nicht umgesetzt:
5. **Zwei getrennte Fortschritte:** Level (Dranbleiben, wie oben) und **Entdecker-Rang** (Datenpflege) mit der Währung **Samen**, ohne Ende. Samen (Vorschlag): neues Produkt mit allen Nährwerten 15 · fehlenden Wert ergänzt 10 · Portions-/Scheibengewicht 10 · eigenes Rezept 20 · geteilt 25 (1×/Woche); max. 60/Tag; zählt erst, wenn das Lebensmittel einmal im Journal eingetragen wurde. Ränge: Sammler 0 · Spurenleser 150 · Kartograf 500 · Botaniker 1200 · Archivar 2500 · Meister-Entdecker 5000. Wöchentlicher Forschungsauftrag (3 gegessene Lebensmittel mit Lücken ergänzen, +50).
6. **Zufall, alle drei Stufen:** (A) Monatsmonster in zufälliger Reihenfolge je Installation (lokaler Zufallsschlüssel, nur noch nicht besessene Monster); (B) **Schillernde** Farbvariante 1:15, Garantie spätestens beim 6. Monster, Doppelte 1:8 (Farbton-Drehung der SVGs + Funkeln); (C) Bonus-Monster über Samen (Beet säen, schlüpft nach getrackten Tagen). Zufall nie bei Level oder Fortschritt.
7. **Begegnungen an gegessene Lebensmittel gekoppelt:** Gemüse eines Typs im Journal erhöht die Chance auf diesen Typ – zählt nur, ob es vorkam, nicht wie viel; je Typ max. 1×/Tag. Zwei Varianten zur Wahl: A Beet (EZ5), B Besucher im Journal (EZ6). Hinweis: belohnt eine Lebensmittelwahl, nicht die Menge – vom Nutzer bewusst gewählt.
8. Sammlungs-Code zum Vergleichen und Tausch-Code (nur Monster-IDs/Form, keine Ess-/Gewichtsdaten; ohne Server nicht fälschungssicher, für Freunde gedacht).

Beschlossen (13.10.2026, Teil 2) – Entwürfe BM0–BM8 im Level-Canvas:
9. **Besucher A + B kombiniert:** Gemüse im Journal → Besuch (max. 1/Tag) → einladen (40 Samen) → Ei im Beet → schlüpft nach 3 getrackten Tagen → wächst mit 3 weiteren Tagen desselben Typs. Nicht eingeladene Besucher kommen wieder. Säen 60 Samen (Überraschung, gewichtet nach Gemüse der Woche). Beet 6 Plätze, letzter ab Rang Kartograf; Deko als Samen-Ausgabe.
10. **6 Bonus-Monster (je Typ eins, 2 Formen, nur über Besuche/Beet):** Ingi→Ingwar (Wurzel), Knobi→Graf Knobula (Zwiebel), Kichi→Kicheron (Hülse), Maisi→Kolbrix (Spross), Kohli→Kohlossus (Blatt), Morchi→Morchelor (Pilz). SVGs + Animation in `tools/design_gen/bonus.py` (t45–t56, nutzt `tools/design_gen/anim.py`). Pool: 23 Monster.
11. **Weitere Vorschläge (noch nicht entschieden):** Begleiter im Journal (reagiert nur auf Uhrzeit/Eintragen/Pause), Mitbringsel von Beet-Monstern (max. 1/Tag), Monatspostkarte zum Teilen (ohne kcal/Gewicht), Saison-Events mit Saisonkalender (Typ-Bonus je Monat, Saison-Deko ab 10 Tagen), Feldnotizen pro Monster, Typ-Zuordnung über Stichwörter/BLS-Gruppe (BM8).

Runde 3 (13.10.2026, alles nur Entwurf im Level-Canvas, Übersicht-Board „OV“ ganz oben):
12. **Samen-Wirtschaft simuliert** (`tools/design_gen/sim_samen.py`, Monte-Carlo, Raten geschätzt). Empfehlung **Regel E**: Einladen 40, Säen 60, Besuch an 40 % der Gemüse-Tage, Bekannte kommen gratis (Freundschaftsbesuch, 1:8 schillernd), Monatsmonster nur übers Monatsei, Mitbringsel 5–10 Samen (20 %), Saison-Deko 150/Monat, Ränge 200/700/1.800/3.500/7.000, Bonus-Monster 3–4 ab Kartograf **oder Monat 4**, 5–6 ab Botaniker **oder Monat 8** (Board SIM1, FS1).
13. Neue Entwürfe: Garten (GA1–4, vier Stimmungen), Schlüpf-/Entwicklungsanimation (HA1–3), Sammelkarten mit Holo (SK1–2), Saison-Kostüme + Kleiderschrank (KO1–2), Erntor nachgeschärft (LG1, t57), Arena-Duell (AD1–2), Onboarding neue Nutzer (OB1–3), App-Icons (IC1), Barrierefreiheit (A11Y1: Frucht-/Pilz-Chiptext aufhellen, min. 11 px, Tippziele 44 px).
14. Entschieden (13.10.2026): Monster **lebhaft** (Ruhe + typische Aktion), **Regel E** bestätigt, **Erntor neu** (t57) übernehmen, Typ-Chip-Text Frucht `#FF7A66` / Pilz `#B49BEA`, **alle Zusätze** kommen rein. App-Icon: erst nach dem Zusammenführen. Nächster Schritt: UI im Code entwickeln (Branch, kein Deploy). Generatoren: `tools/design_gen/`.

Beschlossen (12.10.): rückwirkender Start ab dem ersten Journal-Eintrag. Noch offen: Erntor nachschärfen, weitere Themen, Einstieg (LV1-Chip → Fortschritt-Seite), Variante A oder B für Begegnungen.

## 5. Technik der App (was man wissen muss)

- **Vanilla-JS-PWA**, kein Build-Schritt. Skript-Reihenfolge in `index.html`: zxing, caffeine.js, alcohol.js, weightgoal.js, food.js, timeline.js, supp_catalog.js, supplements.js, app.js. Neues Modul (z. B. `js/level.js`) vor `app.js` einbinden.
- **State** in `localStorage` unter `ct.v1`; Migrationen in `normalizeState` (app.js). Neue Felder dort mit Defaults ergänzen, damit alte Backups funktionieren. Backup/Import exportiert den ganzen State.
- **Service Worker:** bei jeder Änderung `CACHE` in `sw.js` hochzählen (aktuell `ct-cache-v89`) und `APP_VERSION` in `js/app.js` (aktuell `1.35.0`).
- Info-Texte: globales `INFO`-Objekt (`var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;` am Dateianfang); Knopf per `infoBtn('key')`.
- Hilfsfunktionen: `fmt`, `fmtS`, `r0`, `r1`, `esc`, `isoDate`, `addDays`, `save()`, `toast()`, `sheetHead(id, title, sub, extra)` (Hauptfenster „Schließen“, Unterfenster „‹ Zurück“), `trackerFoot`/`trackerBind` (Karten-Fußzeile mit Plus), `dayGoalState`.
- **Daten für das Level-System sind schon vorhanden:** `state.days[iso]` (Journal-Einträge pro Tag), `state.water.log`, `state.caffeine.log`, `state.weightLog`, `state.custom`/`state.pantry`/`state.offCache` (eigene/gescannte Lebensmittel). Getrackte Tage = Tage mit ≥ 1 Journal-Eintrag. XP lassen sich **rückwirkend aus diesen Daten berechnen** (kein Event-Log nötig) – Vorschlag: XP/Level/Formen deterministisch aus dem State ableiten, nur Auswahl-Entscheidungen speichern (Starter, Thema, Arena-Belegung), z. B. `state.level = { theme:'veg', starter:'moehri', startDate, arenas:{0:[ids…]} }`.
- Design „Glas“: dunkles Nachtblau `#0D1320`, Text `#E8EEF7`, gedämpft `#93A0B4`, Akzent Cyan `#5BE7F5`, Warnung `#FF9A6B`, Mint `#6FE0C1`, Schrift Sora (lokal). Monster-SVGs können direkt eingebettet werden (keine Bilddateien nötig).
- **Tests:** Playwright-Skripte (Python) gegen `python3 -m http.server 8765` im Repo-Ordner; Chromium ist vorinstalliert. Beim Beenden des Servers `pkill -f "http.server 8765"` **separat** ausführen (nicht mit `&&` verketten – Exit-Code 144 bricht die Kette ab).
- Lizenz: eigener Code MIT (`LICENSE`); Fremddaten (BLS, Open Food Facts, ZXing, Sora) eigene Lizenzen (README).

## 6. Vorgeschlagener Umsetzungsplan

1. **Datenmodell + Berechnung** (`js/level.js`): getrackte Tage, XP für Monat 1, Level, aktueller Monat, Monatsmonster-Form, Quartale, Jahre – als reine Funktionen, mit Node/Playwright testbar.
2. **Monster-Grafiken** als `js/monster_art.js` (Objekt `id → SVG-String`) aus `docs/gemuesemonster.html` übernehmen.
3. **UI:** Level-Chip im Journal-Kopf → Fortschritt-Seite (Bild, Balken, Monster des Monats mit Fortschritt Tag 1/10/20), Starter-Wahl beim ersten Öffnen, Level-up-Meldung, Sammlung + Steckbrief.
4. **Einstellungen:** Level-System an/aus, XP-Meldungen an/aus, Thema; Info-Texte (inkl. Hinweis „belohnt nur Dranbleiben“).
5. Später: Arenen belegen, dann optional Kämpfe.

Jeden Schritt erst als Entwurf zeigen, wenn er sichtbar etwas verändert, dann nach Freigabe umsetzen, testen, Version/Cache hochzählen, Privat-Check, anonym committen.

## 7. Stand der Umsetzung (Branch `wip/level-ui`, nicht in `main`)

Neu aufgesetzt auf `main` 2.1.1 (Glas 2.0). Keine Versionsnummer, kein Cache-Sprung – das passiert erst beim Deploy.

**Dateien:** `js/monster_art.js` + `css/monster.css` (generiert mit `tools/design_gen/build_monster_art.py`: 57 Formen mit Animation, Hüte, Garten-Szenen in 5 Stimmungen), `js/level_ui.js` + `css/level.css` (Oberfläche), `js/level_garden.js` (Garten). Skript-Reihenfolge: `level.js`, `monster_art.js`, `level_ui.js`, `level_garden.js`, `level_notes.js`, `level_collection.js`, `level_explorer.js`, `level_extras.js` vor `insights.js`/`app.js`.

**Etappe 1:** Level-Chip in der Kopfzeile neben dem Kalender (`dayHeaderHtml` in `v2.js`), Fortschritt-Seite, Starter-Wahl (rückwirkend ab erstem Eintrag oder Ei für Neue), Schlüpf- und Entwicklungs-Overlay (einmal abspielen, am Höhepunkt anhalten; „Bewegung reduzieren“ zeigt sofort das Ergebnis), Meldung „Tag gezählt“, Einstellungen „Ich → Motivation → Level-System“. Der Begleiter aus 2.0 (`monsterSvg`) zeigt bei aktivem Level-System das aktuelle Monster. Regel geändert: das Monatsei schlüpft erst mit dem ersten echten Eintrag im Monat (Pausetage allein reichen nicht).

**Etappe 2 (Garten):** Berechnung `levelGarden()` in `level.js` (Node-Tests in `tools/test_level.js`). Gespeichert werden nur Entscheidungen `state.level.garden.acts` (`invite`/`friend`/`sow`/`deko` mit Datum) und abgeholte Mitbringsel `garden.gifts[iso]`; Samen, Rang, Besuche, Beet und Wachstum werden Tag für Tag nachgerechnet, ungültige Entscheidungen ignoriert (Samen nie negativ).
- Samen aus Aktionszählern: Scan 15, eigenes Lebensmittel 15, Wert ergänzt 10, Teilen 25 (1×/Woche), max. 60/Tag; Mitbringsel 5–10. Ränge 200/700/1.800/3.500/7.000. 6. Beetplatz ab Kartograf.
- Besuch: an 40 % der Tage mit Gemüse (Typ über Stichwörter im Namen, `lvFoodTypes`), Typ gewichtet nach den letzten 7 Tagen. Neue Bonus-Monster einladen 40 Samen; bekannte (Monats- oder Bonus-Monster, nie Starter) kommen gratis, 1:8 schillernd. Freischaltung Bonus 3–4 ab Kartograf oder Monat 4, 5–6 ab Botaniker oder Monat 8.
- Beet: Ei schlüpft nach 3 getrackten Tagen, Baby wächst mit 3 weiteren Tagen seines Typs und zieht dann in den Garten. Säen 60 Samen: Überraschung aus freien Bonus-Monstern (gewichtet nach Gemüse der Woche); ist keins mehr frei, gibt es Samen zurück oder 1:8 einen schillernden Bekannten.
- Oberfläche: Garten-Seite (Szene nach Jahreszeit/Nacht mit Bewohnern, Beet, Deko, Besucher), Garten-Kachel im Fortschritt, Besucher-Karte im Journal (nur heute), Punkt am Level-Chip, Mitbringsel-Overlay beim Öffnen.

**Etappe 3 (Sammlung):** `levelDex()` (Album mit 23 Monstern / 57 Formen in fester Reihenfolge Starter · Monat · Bonus · Legendär, Fundort, Begegnungen = Tage mit Gemüse des Typs seit dem Fund, Feldnotizen 1: entdeckt · 2: letzte Form · 3: 10 Begegnungen) und `levelCostumes()` (Saison-Kostüm frei, sobald ein Monat der Saison 10 gezählte Tage hat; Partyhut nach 365 Tagen) in `level.js`, Tests in `tools/test_level.js`. Oberfläche in `js/level_collection.js`: Sammlung (Monster/Karten), Sammelkarte je Form (Schillernde mit Goldrahmen + Holo), Steckbrief mit Formen, Feldnotizen, „Lockt an“, Kleiderschrank (`state.level.costume`, trägt der Begleiter im Journal, Garten und Fortschritt). Texte in `js/level_notes.js`. Hut-Anker für alle 57 Formen: `tools/design_gen/auto_anchor.py` (geschätzt) + `anchors_fix.json` (von Hand) + Entwurfsanker; Prüfbild mit `qa_hats.py`. Nicht gewählte Starter sind im Album sichtbar, aber noch nicht erreichbar (geplant: Tausch-Code). „Als Bild teilen“ folgt mit der Postkarte (Etappe 5).

**Etappe 4 (Entdecker):** Samen-Buchhaltung `lvSamenLedger()` in `level.js`: Aktionen mit Lebensmittel-Bezug werden über `levelFoodEvent(state, art, datum, foodId)` in `state.level.fx[foodId]` gemerkt (Scan, Anlegen, Scheibe je Lebensmittel einmal; Ergänzen mehrfach) und erst gutgeschrieben, wenn das Lebensmittel im Journal steht (am späteren der beiden Tage). Ältere Zähler ohne Bezug zählen sofort. Scheibe wiegen +10. Forschungsauftrag: 3 verschiedene gegessene Lebensmittel in einer Woche vervollständigt → +50 (außerhalb der Tagesgrenze). Oberfläche in `js/level_explorer.js`: Entdecker-Karte im Fortschritt, Entdecker-Seite (Rang, Auftrag mit Kandidaten aus dem Journal: eigene Lebensmittel mit Lücken, Brot/Aufschnitt ohne gewogene Scheibe; Wochenübersicht; wartende Samen), Vergleichen & Tauschen: Sammlungs-Code (Version 1, je Monster 2 Bit Formen + 1 Bit schillernd, 8-Bit-Prüfsumme, Base32) und Geschenk-Code (Version 2, Monster + 24-Bit-Zufall; Kopie in erster Form, nie schillernd/legendär, 1× pro Woche, jeder Code nur einmal einlösbar). `state.level.trades {given, got}`, `friend`, `lastGift`. Ohne Server nicht fälschungssicher.

**Etappe 5:** `js/level_extras.js` + Berechnung in `level.js`.
- Saison: `LV_SEASONS` (12 Monate, Typ-Bonus, Saison-Stück). Im Monat des Saison-Typs zählt dieser Typ bei Besuchen doppelt, Freundschaftsbesuche schillern doppelt so oft. Saison-Stück: im eigenen Monat ab 10 gezählten Tagen für 150 Samen (Regel E); die drei neuesten stehen im Garten. Saisonkalender aus Trainingswissen, nicht geprüft.
- Monatspostkarte `levelPostcard()`: Tage dabei, Besuche, vervollständigte Lebensmittel, Schillernde – nie kcal/Mengen/Gewicht; ab dem 1. des Folgemonats, Hinweis einmal pro Monat (`state.level.pcSeen`). Als Bild teilen: SVG → Canvas → PNG → `navigator.share({files})`, sonst Bild zum Gedrückthalten. Sammelkarten lassen sich genauso teilen (`lvCardSvg`). Im SVG-Bild lädt die Schrift Sora nicht (Ersatzschrift).
- Arena-Duell: Arena i offen ab Monat 3·(i+1). Kämpfer `lvFighter` (Stärke nur aus Form + Typ), Typenrad `lvTypeMult` (×1,5/×0,75), Leitung `levelArenaLeader(i)`, Züge Angriff/Spezial (1×, Gegner setzt aus)/Abwehr/Wechseln, einfache Gegner-Taktik. Sieg: `state.level.arenas[i] = {won}` – keine XP, keine Samen; Verlieren ohne Folgen. Szenen `ARENA_SCENES` (s0–s7) in `monster_art.js`.
- Einführung (OB1–OB3): Hinweiskarte im Journal für alle mit ausgeschaltetem Spiel (einmal wegklickbar, `state.level.intro`), zwei Seiten, danach Ei/Starter wählen. Einstellungen: zusätzlich Besucher-Karte an/aus, Einführung ansehen, Level-System zurücksetzen (zweistufig; Journal und Aktionszähler bleiben).

**Vereinfachungen / offen:** Eigene Rezepte geben keine Samen (Rezepte sind ausgeblendet); OFF-Produkte lassen sich nicht ergänzen und tauchen deshalb nicht im Forschungsauftrag auf; die Typ-Erkennung ist eine grobe Stichwortliste (z. B. zählt Obst als Frucht, Säfte auch).

**Vorschau:** `sh tools/preview/build.sh <ordner>` baut die App mit erfundenen Testdaten (`tools/preview/seed.js`, Szenarien-Schalter oben) als private Vorschau-Seite.
