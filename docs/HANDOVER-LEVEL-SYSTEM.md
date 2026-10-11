# Übergabe: Level-System „Gemüsemonster“

Stand: 12.10.2026 · App-Version 1.35.0 · Repo `ST0PTV/Calorie-Tracker` (öffentlich) · App: https://st0ptv.github.io/Calorie-Tracker/

Diese Datei reicht aus, um in einem neuen Chat am Level-System weiterzuarbeiten. Sie beschreibt das beschlossene Konzept, die Entwürfe, die technischen Leitplanken der App und einen Umsetzungsplan. **Noch ist nichts davon im App-Code umgesetzt** – es gibt nur Entwürfe.

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
- **Design-Canvas** (alle Board-Entwürfe der App, auch ältere Level-Varianten): https://claude.ai/artifact/QLbUSrKnpRNVB5nxfCDvPR – relevante Boards: „Level-System“ (LV1–LV6), „Level-Themen“ (TH*), „Level-System v2“ (LS*), „Sport & Küche“ (TS*), „Smileys“ (TM1–TM3), „Gemüsemonster“ (MO1–MO7), „Monster-Evolutionen“ (MV1–MV7).
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

## 4. Offene Entscheidungen (beim Nutzer erfragen)

1. Schwellen „vollständiger Monat“ (20 Tage?) und „Quartal“ (60 Tage?).
2. Übergang Monat 1 → Monatslevel, wenn L10 nicht erreicht.
3. XP-Werte und Wochenziele ja/nein; Pausetag ja/nein.
4. Kämpfe ja/nein, und wenn ja: zuerst nur Arena-Duell?
5. Erntor-Zeichnung ggf. nachschärfen.
6. Weitere Themen parallel oder später?
7. Wo der Einstieg sitzt: Level-Chip im Journal-Kopf (Entwurf LV1) → Seite „Fortschritt“ (Variante A mit Bild).

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
