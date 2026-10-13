/* Level-System „Gemüsemonster“ – Berechnung (Schritt 1, noch ohne Oberfläche).
   Grundsatz: belohnt wird nur das Dranbleiben und die Datenpflege, nie weniger Essen.
   Kalorien, Defizit und Gewichtsverlauf fließen NICHT in XP, Level, Formen oder Stärke ein.
   Alles wird deterministisch aus dem State abgeleitet; gespeichert werden nur Auswahl-Entscheidungen
   (Start, Starter, Thema, Arenen) und Zähler für Aktionen ohne eigenes Datum (state.level.ev).
   Ausgelassene Tage kosten nie etwas: Level, Formen und Monster gehen nicht verloren. */
'use strict';

const LV_CFG = {
  monthDays: 20,        // vollständiger Monat (Monat 2–12): gezählte Tage
  quarterDays: 60,      // vollständiges Quartal (ab Jahr 2)
  yearDays: 240,        // volles Jahr für das legendäre Monster (12 × 20) – Vorschlag
  pausePerWeek: 1,      // pro Kalenderwoche zählt der erste ausgelassene Tag automatisch mit
  fullDayMeals: ['breakfast', 'lunch', 'dinner'], // „Tag vollständig“ – Snacks sind kein Muss
  formDays: [1, 10, 20], // Monatsmonster: Baby ab 1, Normalform ab 10, Superform ab 20 Tagen
  maxEntryXpPerDay: 10,
  weekGoalDays: 7,      // Wochenziel: alle 7 Tage gezählt (inkl. Pausetag), also mind. 6 echte
  xp: { day: 10, full: 15, entry: 2, scan: 15, own: 20, fill: 10, share: 25, water: 5, weight: 5, week: 35 },
  thresholds: [0, 30, 80, 150, 240, 350, 480, 630, 800, 990], // L1 … L10 (Gesamt-XP)
};

const LV_TYPES = ['Frucht', 'Blatt', 'Wurzel', 'Pilz', 'Zwiebel', 'Spross', 'Hülse']; // Typenrad-Reihenfolge
const LV_STARTERS = [
  { id: 'moehri', type: 'Wurzel', forms: ['Möhri', 'Möhrax', 'Möhrgon'], tpl: 0 },
  { id: 'erbsi', type: 'Hülse', forms: ['Erbsi', 'Schotti', 'Schotador'], tpl: 3 },
  { id: 'tomi', type: 'Frucht', forms: ['Tomi', 'Tomatz', 'Tomagma'], tpl: 6 },
];
const LV_MONTHLY = [
  ['brokki', 'Blatt', ['Brokki', 'Brokko', 'Brokkolos']],
  ['kuerbi', 'Frucht', ['Kürbi', 'Kürbo', 'Kürbrock']],
  ['pepi', 'Frucht', ['Pepi', 'Papri', 'Paprisma']],
  ['radl', 'Wurzel', ['Radl', 'Radi', 'Radirex']],
  ['zwibbel', 'Zwiebel', ['Zwibbel', 'Zwiebi', 'Zwiebolon']],
  ['gurki', 'Frucht', ['Gurki', 'Gurkon', 'Gurkodil']],
  ['aubi', 'Frucht', ['Aubi', 'Aubaron', 'Aubzar']],
  ['sprossi', 'Spross', ['Sprossi', 'Sparx', 'Sparxion']],
  ['spori', 'Pilz', ['Spori', 'Pilzo', 'Myzelor']],
  ['beti', 'Wurzel', ['Beti', 'Betti', 'Bettrix']],
  ['lauchling', 'Blatt', ['Lauchling', 'Lauchi', 'Merlauch']],
].map(([id, type, forms], i) => ({ id, type, forms, tpl: 9 + 3 * i }));
const LV_LEGENDS = [
  { id: 'erntor', name: 'Erntor', tpl: 57 }, // 13.10.2026: nachgeschärfte Zeichnung
  { id: 'rhizowal', name: 'Rhizowal', tpl: 43 },
  { id: 'solarion', name: 'Solarion', tpl: 44 },
];
const LV_ARENAS = [
  ['Glasdom', ['Blatt', 'Spross'], 4], ['Wurzelgrotte', ['Wurzel', 'Pilz'], 4], ['Kompostkrater', ['Frucht'], 4],
  ['Wolkenbeet', ['Spross', 'Hülse'], 4], ['Salatsee', ['Blatt', 'Frucht'], 4], ['Frostkeller', ['Zwiebel', 'Wurzel'], 4],
  ['Markthalle', LV_TYPES, 4], ['Sternenacker', ['legendär'], 3],
].map(([name, fav, slots], i) => ({ name, fav, slots, after: 3 * (i + 1) }));
// Stufen im ersten Monat (Starter): L1–L10
const LV_STEPS = ['Ei', 'Ei wackelt', 'schlüpft', 'Baby', 'übt', 'entwickelt sich', 'trainiert', 'volle Kraft', 'leuchtet', 'entwickelt sich'];

// Bonus-Monster (nur über Besuche/Beet, Etappe 2) – je Typ eins, 2 Formen
const LV_BONUS = [
  ['ingi', 'Wurzel', ['Ingi', 'Ingwar'], 45], ['knobi', 'Zwiebel', ['Knobi', 'Graf Knobula'], 47], ['kichi', 'Hülse', ['Kichi', 'Kicheron'], 49],
  ['maisi', 'Spross', ['Maisi', 'Kolbrix'], 51], ['kohli', 'Blatt', ['Kohli', 'Kohlossus'], 53], ['morchi', 'Pilz', ['Morchi', 'Morchelor'], 55],
].map(([id, type, forms, tpl]) => ({ id, type, forms, tpl }));
const LV_SHINY = { p: 1 / 15, pity: 6 }; // Schillernd: 1 zu 15, spätestens beim 6. Schlüpfen

/* ---------- Zufall (deterministisch aus state.level.seed) ---------- */
function lvRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Reihenfolge der 11 Monatsmonster je Installation
function lvMonthOrder(seed) {
  const r = lvRand((seed || 1) ^ 0x51ED), o = LV_MONTHLY.map((_, i) => i);
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}
// Schillernd je Schlüpfen (0 = Starter, 1.. = Monatsmonster) mit Garantie
function lvShinyList(seed, n) {
  const r = lvRand((seed || 1) ^ 0xC0FFEE), out = []; let since = 0;
  for (let k = 0; k < n; k++) { since++; const sh = r() < LV_SHINY.p || since >= LV_SHINY.pity; out.push(sh); if (sh) since = 0; }
  return out;
}

/* ---------- Datumshilfen (unabhängig von app.js, damit testbar) ---------- */
const lvIsoAdd = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const lvDow = (iso) => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; // Mo = 0 … So = 6
const lvMonday = (iso) => lvIsoAdd(iso, -lvDow(iso));
// Monatsnummer relativ zum Startmonat (Startmonat = 1, Kalendermonate)
const lvMonthIdx = (start, iso) => (+iso.slice(0, 4) - +start.slice(0, 4)) * 12 + (+iso.slice(5, 7) - +start.slice(5, 7)) + 1;
const lvMonthKey = (start, k) => { const y = +start.slice(0, 4), m = +start.slice(5, 7) - 1 + (k - 1); return `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`; };
function lvRange(a, b) { const out = []; for (let d = a; d <= b; d = lvIsoAdd(d, 1)) out.push(d); return out; }

/* ---------- Eingaben aus dem State ----------
   src = { days, weightLog, ev, waterOn, waterOf(iso), waterGoalFor(iso) } – in der App aus state gebaut,
   in Tests direkt übergeben. */
function lvSrcFromState(s) {
  return {
    days: s.days || {}, weightLog: s.weightLog || {}, ev: (s.level && s.level.ev) || {},
    waterOn: !!(s.water && s.water.enabled),
    waterOf: typeof waterOf === 'function' ? waterOf : () => 0,
    waterGoalFor: typeof waterGoalFor === 'function' ? waterGoalFor : () => Infinity,
  };
}
const lvTracked = (src, iso) => (src.days[iso] || []).length > 0;

// Gezählte Tage = getrackte Tage + automatische Pausetage (je Kalenderwoche der erste ausgelassene, bereits vergangene Tag)
function lvCountedDays(src, start, today) {
  const counted = new Set(), pause = new Set();
  if (!start || start > today) return { counted, pause };
  let week = null, used = 0;
  for (const d of lvRange(start, today)) {
    const w = lvMonday(d); if (w !== week) { week = w; used = 0; }
    if (lvTracked(src, d)) counted.add(d);
    else if (d < today && used < LV_CFG.pausePerWeek) { used++; pause.add(d); counted.add(d); }
  }
  return { counted, pause };
}

/* ---------- XP (zählt ab Start bis Level 10 erreicht ist; danach keine Bedeutung mehr) ---------- */
function lvXp(src, start, today, cd) {
  const X = LV_CFG.xp, rows = [];
  let total = 0, l10 = null;
  const add = (d, k, n) => { if (!n) return; rows.push({ d, k, xp: n }); total += n; };
  const weeksShare = new Set(), weeksWeight = new Set();
  for (const d of lvRange(start, today)) {
    const e = src.days[d] || [];
    if (e.length) {
      add(d, 'day', X.day);
      if (LV_CFG.fullDayMeals.every((m) => e.some((x) => x.meal === m))) add(d, 'full', X.full);
      add(d, 'entry', Math.min(e.length, LV_CFG.maxEntryXpPerDay) * X.entry);
    }
    const ev = src.ev[d] || {};
    add(d, 'scan', (ev.scan || 0) * X.scan);
    add(d, 'own', (ev.own || 0) * X.own);
    add(d, 'fill', (ev.fill || 0) * X.fill);
    const wk = lvMonday(d);
    if (ev.share && !weeksShare.has(wk)) { weeksShare.add(wk); add(d, 'share', X.share); }
    if (src.weightLog[d] != null && !weeksWeight.has(wk)) { weeksWeight.add(wk); add(d, 'weight', X.weight); }
    if (src.waterOn) { const ml = src.waterOf(d); if (ml > 0 && ml >= src.waterGoalFor(d)) add(d, 'water', X.water); }
    // Wochenziel am Sonntag: ganze Woche ab Start, alle Tage gezählt (Pausetag inklusive)
    if (lvDow(d) === 6 && lvIsoAdd(d, -6) >= start && lvRange(lvIsoAdd(d, -6), d).filter((x) => cd.counted.has(x)).length >= LV_CFG.weekGoalDays) add(d, 'week', X.week);
    if (l10 == null && total >= LV_CFG.thresholds[9]) { l10 = d; break; }
  }
  return { total, rows, l10 };
}
function lvXpLevel(xp) { let l = 1; LV_CFG.thresholds.forEach((t, i) => { if (xp >= t) l = i + 1; }); return l; }

function lvMonsterForm(n) { let f = -1; LV_CFG.formDays.forEach((t, i) => { if (n >= t) f = i; }); return f; } // −1 = noch nicht entdeckt

/* ---------- Gesamtauswertung ----------
   lv = state.level ({ startDate, starter, … }); today = 'JJJJ-MM-TT' */
function levelCompute(src, lv, today) {
  const start = lv && lv.startDate;
  if (!start || start > today) return null;
  const cd = lvCountedDays(src, start, today);
  const xp = lvXp(src, start, today, cd);
  const xpLevel = lvXpLevel(xp.total);
  const curMonth = lvMonthIdx(start, today);
  const inMonth = (k) => { const key = lvMonthKey(start, k); let n = 0, t = 0; cd.counted.forEach((d) => { if (d.slice(0, 7) === key) n++; }); Object.keys(src.days).forEach((d) => { if (d >= start && d <= today && d.slice(0, 7) === key && lvTracked(src, d)) t++; }); return { n, t }; };

  // Monate 2–12: Monatsmonster (zufällige Reihenfolge je Installation) und Monatslevel
  const order = lvMonthOrder(lv.seed), shinies = lvShinyList(lv.seed, 12);
  const months = [];
  for (let k = 2; k <= Math.min(12, curMonth); k++) {
    const c = inMonth(k), m = LV_MONTHLY[order[k - 2]], form = c.t > 0 ? lvMonsterForm(c.n) : -1; // Ei schlüpft erst mit echtem Eintrag, nicht durch Pausetage
    months.push({ k, key: lvMonthKey(start, k), counted: c.n, tracked: c.t, done: c.n >= LV_CFG.monthDays, form, monster: m, shiny: shinies[k - 1] && form >= 0 });
  }
  const monthLevels = months.filter((m) => m.done).length;

  // Ab Monat 13: Quartale
  const quarters = [];
  for (let q = 0; 13 + 3 * q <= curMonth; q++) {
    let n = 0; for (let k = 13 + 3 * q; k < 16 + 3 * q; k++) n += inMonth(k).n;
    quarters.push({ q: q + 1, year: 2 + Math.floor(q / 4), counted: n, done: n >= LV_CFG.quarterDays });
  }
  const quarterLevels = quarters.filter((q) => q.done).length;

  // Volle Jahre: Jahr vorbei und genug gezählte Tage
  const years = [];
  for (let y = 1; 12 * y < curMonth; y++) {
    let n = 0; for (let k = 12 * (y - 1) + 1; k <= 12 * y; k++) n += inMonth(k).n;
    const L = LV_LEGENDS[(y - 1) % 3];
    years.push({ y, counted: n, done: n >= LV_CFG.yearDays, legend: L, gold: y >= 4 });
  }

  const level = xpLevel + monthLevels + quarterLevels;
  const starter = LV_STARTERS.find((s) => s.id === (lv && lv.starter)) || null;
  const starterStage = xpLevel >= 10 ? 2 : xpLevel >= 6 ? 1 : 0;
  const next = xpLevel < 10 ? { kind: 'xp', have: xp.total, need: LV_CFG.thresholds[xpLevel] } : null;
  const arenas = LV_ARENAS.map((a, i) => Object.assign({ i, open: curMonth - 1 >= a.after }, a));

  return {
    start, today, level, xp: xp.total, xpRows: xp.rows, xpLevel, l10: xp.l10, step: LV_STEPS[xpLevel - 1], next,
    starter, starterStage, starterTpl: starter ? starter.tpl + starterStage : null, starterShiny: !!(starter && shinies[0]),
    order, nextMonthly: curMonth < 12 ? LV_MONTHLY[order[Math.max(0, curMonth - 1)]] : null,
    curMonth, months, monthLevels, quarters, quarterLevels, years, arenas,
    counted: cd.counted.size, pauseDays: [...cd.pause],
  };
}

// Sammlung: erreichte Formen (für Album/Zähler „Monster x/17 · Formen x/45 · Orden x/8“)
function levelCollection(r) {
  const out = [];
  if (r.starter) out.push({ id: r.starter.id, forms: r.starterStage + 1, tpl: r.starter.tpl, shiny: r.starterShiny });
  r.months.forEach((m) => { if (m.form >= 0) out.push({ id: m.monster.id, forms: m.form + 1, tpl: m.monster.tpl, month: m.key, counted: m.counted, shiny: m.shiny }); });
  const seen = new Set();
  r.years.filter((y) => y.done).forEach((y) => { if (!seen.has(y.legend.id)) { seen.add(y.legend.id); out.push({ id: y.legend.id, forms: 1, tpl: y.legend.tpl, year: y.y, gold: y.gold }); } });
  return { list: out, monsters: out.length, forms: out.reduce((a, b) => a + b.forms, 0), totalMonsters: 23, totalForms: 57, totalBadges: LV_ARENAS.length };
}

// Aktion ohne eigenes Datum zählen (Scan, eigenes Lebensmittel, Werte ergänzt, geteilt). Nur Zähler, keine Lebensmitteldaten.
function levelEvent(s, kind, iso) {
  if (!s.level) return;
  const ev = (s.level.ev = s.level.ev || {});
  const d = (ev[iso] = ev[iso] || {});
  d[kind] = (d[kind] || 0) + 1;
}

/* ---------- Garten: Samen, Entdecker-Rang, Besucher, Beet, Mitbringsel (Regel E, Entwurf SIM1/BM1–BM4) ----------
   Gespeichert werden nur Entscheidungen (lv.garden.acts) und abgeholte Mitbringsel (lv.garden.gifts);
   alles andere wird Tag für Tag aus dem Journal nachgerechnet. Belohnt wird nur, OB ein Gemüse-Typ vorkam, nie wie viel. */
const LV_GARDEN = { invite: 40, sow: 60, visitP: 0.4, hatchDays: 3, growDays: 3, plots: 6, plot6: 700, giftP: 0.2, friendShiny: 8, dayCap: 60 };
const LV_SAMEN = { scan: 15, own: 15, fill: 10, share: 25 }; // je Aktion; Tagesgrenze LV_GARDEN.dayCap, Teilen 1×/Woche
const LV_RANKS = [['Sammler', 0], ['Spurenleser', 200], ['Kartograf', 700], ['Botaniker', 1800], ['Archivar', 3500], ['Meister-Entdecker', 7000]];
// Bonus-Monster frei ab Samen-Summe ODER Monat seit Start (FS1): 1–2 sofort, 3–4 ab Kartograf/Monat 4, 5–6 ab Botaniker/Monat 8
const LV_UNLOCK = { ingi: [0, 1], knobi: [0, 1], kichi: [700, 4], maisi: [700, 4], kohli: [1800, 8], morchi: [1800, 8] };
const LV_DEKO = [
  ['blumen', 'Blumenbeet', 80], ['pilzring', 'Pilzring', 80], ['laterne', 'Laterne', 100], ['vogelhaus', 'Vogelhaus', 120],
  ['windrad', 'Windrad', 150], ['bank', 'Bank', 200], ['teich', 'Teich', 250],
  ['giesskanne', 'Gießkanne', 0, true], ['gluehwuermchen', 'Glühwürmchen', 0, true], // nur als seltenes Mitbringsel
].map(([id, name, cost, gift]) => ({ id, name, cost, gift: !!gift }));
// Gemüse-Typ eines Lebensmittels über Stichwörter im Namen (BM8). Grob und bewusst einfach; unklare bleiben ohne Typ.
const LV_FOOD_RX = [
  ['Blatt', /spinat|salat|grünkohl|(?<!blumen)kohl(?!rabi|enhydrat)|brokkoli|broccoli|mangold|rucola|rauke|wirsing|pak.?choi|kresse/],
  ['Frucht', /tomat|paprika|gurke|zucchini|kürbis|aubergine|apfel|äpfel|birne|banane|beere|kirsch|pflaume|orange|mandarine|zitrone|traube|mango|ananas|melone|pfirsich|aprikose|kiwi|obst|avocado/],
  ['Wurzel', /möhre|karotte|rote bete|rote rübe|radieschen|rettich|kartoffel|ingwer|pastinake|sellerie|topinambur|schwarzwurzel|petersilienwurzel/],
  ['Zwiebel', /zwiebel|knoblauch|lauch|porree|schalotte/],
  ['Hülse', /linse|kichererbse|bohne|erbse|tofu|tempeh|edamame|hummus|lupine|falafel/],
  ['Spross', /spargel|mais|sprossen|keimling|bambus|kohlrabi|fenchel|artischocke|blumenkohl/],
  ['Pilz', /pilz|champignon|shiitake|pfifferling|steinpilz|seitling|morchel/],
];
const LV_FOOD_NO = /chips|gummi|bonbon|limonade|sirup|kaffee|kakao|aroma|maisstärke|stärke/;
function lvFoodTypes(name) {
  const n = String(name || '').toLowerCase();
  if (!n || LV_FOOD_NO.test(n)) return [];
  return LV_FOOD_RX.filter(([, rx]) => rx.test(n)).map(([t]) => t);
}
function lvDayTypes(src, iso) {
  const set = new Set();
  (src.days[iso] || []).forEach((e) => lvFoodTypes(e.n).forEach((t) => set.add(t)));
  return [...set];
}
function lvHash(seed, key) { let h = 2166136261 ^ (seed >>> 0); for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619); return lvRand(h >>> 0)(); }
function lvRank(earned) {
  let i = 0; LV_RANKS.forEach(([, t], k) => { if (earned >= t) i = k; });
  return { i, name: LV_RANKS[i][0], next: LV_RANKS[i + 1] ? { name: LV_RANKS[i + 1][0], need: LV_RANKS[i + 1][1] } : null };
}
// Samen aus den Aktionszählern eines Tages (Teilen höchstens 1× pro Woche)
function lvSamenDay(ev, iso, sharedWeek) {
  const e = ev[iso] || {};
  let n = (e.scan || 0) * LV_SAMEN.scan + (e.own || 0) * LV_SAMEN.own + (e.fill || 0) * LV_SAMEN.fill;
  let share = false;
  if (e.share && !sharedWeek) { n += LV_SAMEN.share; share = true; }
  return { n: Math.min(LV_GARDEN.dayCap, n), share };
}
function levelGarden(src, lv, today, r, hook) { // hook(d, lage) → Entscheidungen für Tag d (nur für Simulation/Vorschau)
  if (!r) return null;
  const seed = (lv && lv.seed) || 1, g = (lv && lv.garden) || {};
  const acts = Array.isArray(g.acts) ? (hook ? g.acts.slice() : g.acts) : [], gifts = hook ? Object.assign({}, g.gifts) : (g.gifts || {});
  const byDay = {}; acts.forEach((a) => { if (a && a.d) (byDay[a.d] = byDay[a.d] || []).push(a); });
  const owned = {}; // id → { forms, shiny, via }
  (levelCollection(r).list || []).forEach((o) => { owned[o.id] = { forms: o.forms, shiny: !!o.shiny, via: 'level' }; });
  const all = [].concat(LV_STARTERS, LV_MONTHLY, LV_BONUS);
  const byId = (id) => all.find((m) => m.id === id);
  let samen = 0, earned = 0, sharedWeek = null;
  const plots = [], deko = [], log = [], hist = [];
  let visitor = null, gift = null;
  for (const d of lvRange(r.start, today)) {
    const types = lvDayTypes(src, d), tracked = (src.days[d] || []).length > 0;
    hist.push(types); if (hist.length > 7) hist.shift();
    const wk = lvMonday(d);
    const sd = lvSamenDay(src.ev, d, sharedWeek === wk);
    if (sd.share) sharedWeek = wk;
    samen += sd.n; earned += sd.n;
    const month = lvMonthIdx(r.start, d);
    const unlocked = LV_BONUS.filter((b) => earned >= LV_UNLOCK[b.id][0] || month >= LV_UNLOCK[b.id][1]);
    const inBeet = new Set(plots.map((p) => p.id));
    const maxPlots = earned >= LV_GARDEN.plot6 ? LV_GARDEN.plots : LV_GARDEN.plots - 1;
    // Mitbringsel: nur wenn schon ein Bonus-Monster geschlüpft ist, nur wenn an dem Tag abgeholt
    const hatched = LV_BONUS.some((b) => owned[b.id] && owned[b.id].via === 'garden') || plots.some((p) => p.stage !== 'egg');
    let gd = null;
    if (hatched && lvHash(seed, 'g' + d) < LV_GARDEN.giftP) {
      const rare = LV_DEKO.filter((x) => x.gift && !deko.includes(x.id));
      gd = rare.length && lvHash(seed, 'gr' + d) < 0.1 ? { deko: rare[Math.floor(lvHash(seed, 'gd' + d) * rare.length)].id } : { n: lvHash(seed, 'gn' + d) < 0.5 ? 5 : 10 };
      gd.from = (plots.find((p) => p.stage !== 'egg') || {}).id || LV_BONUS.find((b) => owned[b.id] && owned[b.id].via === 'garden').id;
      if (gifts[d]) { if (gd.n) { samen += gd.n; earned += gd.n; } else deko.push(gd.deko); log.push({ d, kind: 'gift', gift: gd }); }
    }
    // Besuch: 40 % der Tage mit Gemüse; Typ gewichtet nach den letzten 7 Tagen
    let vis = null;
    if (tracked && types.length && lvHash(seed, 'v' + d) < LV_GARDEN.visitP) {
      const w = types.map((t) => hist.reduce((a, h) => a + (h.includes(t) ? 1 : 0), 0));
      let x = lvHash(seed, 'vt' + d) * w.reduce((a, b) => a + b, 0), t = types[0];
      for (let k = 0; k < types.length; k++) { x -= w[k]; if (x < 0) { t = types[k]; break; } }
      const fresh = unlocked.find((b) => b.type === t && !owned[b.id] && !inBeet.has(b.id));
      if (fresh) vis = { id: fresh.id, type: t, kind: 'new', cost: LV_GARDEN.invite };
      else {
        const known = Object.keys(owned).map(byId).filter((m) => m && m.type === t && !LV_STARTERS.includes(m));
        if (known.length) { const m = known[Math.floor(lvHash(seed, 'vk' + d) * known.length)]; vis = { id: m.id, type: t, kind: 'friend', cost: 0, shiny: !owned[m.id].shiny && lvHash(seed, 'vs' + d) < 1 / LV_GARDEN.friendShiny }; }
      }
    }
    if (hook) { const add = hook(d, { visitor: vis, gift: gd, samen, plots, maxPlots, deko }) || []; add.forEach((x) => { const act = Object.assign({ d }, x); acts.push(act); (byDay[d] = byDay[d] || []).push(act); if (gd && x.a === 'gift' && !gifts[d]) { gifts[d] = 1; if (gd.n) { samen += gd.n; earned += gd.n; } else deko.push(gd.deko); } }); }
    // Entscheidungen des Tages (in Reihenfolge); ungültige werden ignoriert
    (byDay[d] || []).forEach((a) => {
      if (a.a === 'invite' && vis && vis.kind === 'new' && a.m === vis.id && samen >= LV_GARDEN.invite && plots.length < maxPlots && !vis.done) {
        samen -= LV_GARDEN.invite; vis.done = true; plots.push({ id: vis.id, kind: 'invite', at: d, stage: 'egg', t: 0, grow: 0 }); log.push({ d, kind: 'invite', id: vis.id });
      } else if (a.a === 'friend' && vis && vis.kind === 'friend' && a.m === vis.id && !vis.done) {
        vis.done = true; if (vis.shiny) { owned[vis.id].shiny = true; log.push({ d, kind: 'shiny', id: vis.id }); } else log.push({ d, kind: 'friend', id: vis.id });
      } else if (a.a === 'sow' && samen >= LV_GARDEN.sow && plots.length < maxPlots) {
        samen -= LV_GARDEN.sow;
        const recent = new Set([].concat(...hist));
        const free = unlocked.filter((b) => !owned[b.id] && !plots.some((p) => p.id === b.id));
        const pool = free.filter((b) => recent.has(b.type)).length ? free.filter((b) => recent.has(b.type)) : free;
        const k = plots.length + log.length;
        if (pool.length) { const m = pool[Math.floor(lvHash(seed, 's' + d + k) * pool.length)]; plots.push({ id: m.id, kind: 'sow', at: d, stage: 'egg', t: 0, grow: 0 }); log.push({ d, kind: 'sow', id: m.id }); }
        else plots.push({ id: null, kind: 'sow', at: d, stage: 'egg', t: 0, grow: 0, surprise: lvHash(seed, 'ss' + d + k) < 1 / LV_GARDEN.friendShiny ? 'shiny' : 'seeds' });
      } else if (a.a === 'deko') {
        const it = LV_DEKO.find((x) => x.id === a.m);
        if (it && !it.gift && !deko.includes(it.id) && samen >= it.cost) { samen -= it.cost; deko.push(it.id); log.push({ d, kind: 'deko', id: it.id }); }
      }
    });
    // Wachstum am Tagesende: Ei schlüpft nach 3 getrackten Tagen, Baby wächst mit 3 weiteren Tagen seines Typs
    for (let i = plots.length - 1; i >= 0; i--) {
      const p = plots[i]; if (d <= p.at) continue;
      if (p.stage === 'egg' && tracked && ++p.t >= LV_GARDEN.hatchDays) {
        p.stage = 'baby'; p.hatched = d;
        if (!p.id) { // nichts Neues mehr frei: Überraschung (Samen zurück oder schillernder Bekannter)
          plots.splice(i, 1);
          const kn = LV_BONUS.filter((b) => owned[b.id] && !owned[b.id].shiny);
          if (p.surprise === 'shiny' && kn.length) { const m = kn[Math.floor(lvHash(seed, 'sk' + d) * kn.length)]; owned[m.id].shiny = true; log.push({ d, kind: 'shiny', id: m.id }); }
          else { samen += LV_GARDEN.sow; log.push({ d, kind: 'refund' }); }
          continue;
        }
        owned[p.id] = { forms: 1, shiny: lvHash(seed, 'sh' + p.id) < LV_SHINY.p, via: 'garden' };
        log.push({ d, kind: 'hatch', id: p.id });
      } else if (p.stage === 'baby' && d > p.hatched && types.includes(byId(p.id).type) && ++p.grow >= LV_GARDEN.growDays) {
        owned[p.id].forms = 2; plots.splice(i, 1); log.push({ d, kind: 'grow', id: p.id });
      }
    }
    if (d === today) { visitor = vis; gift = gd ? Object.assign({ claimed: !!gifts[d] }, gd) : null; }
  }
  const resident = LV_BONUS.filter((b) => owned[b.id] && owned[b.id].via === 'garden' && !plots.some((p) => p.id === b.id) && owned[b.id].forms >= 2).map((b) => b.id);
  const unlocked = LV_BONUS.filter((b) => earned >= LV_UNLOCK[b.id][0] || r.curMonth >= LV_UNLOCK[b.id][1]).map((b) => b.id);
  return { acts: hook ? acts.filter((x) => x.a !== 'gift') : undefined, gifts: hook ? gifts : undefined, samen, earned, rank: lvRank(earned), plots, maxPlots: earned >= LV_GARDEN.plot6 ? LV_GARDEN.plots : LV_GARDEN.plots - 1, deko, owned, resident, unlocked, visitor, gift, log, todayTypes: lvDayTypes(src, today) };
}
/* ---------- Sammlung (Etappe 3): Monster-Verzeichnis, Begegnungen, Feldnotizen, Kostüme ---------- */
// Reihenfolge im Album: Starter, Monatsmonster, Bonus, Legendäre. Nummern wie auf den Sammelkarten.
function levelDex(src, lv, today, r, g) {
  if (!r) return null;
  const coll = levelCollection(r), have = {}; coll.list.forEach((o) => { have[o.id] = o; });
  // Tage je Typ (für Begegnungen), einmal pro Tag und Typ
  const typeDays = {}; Object.keys(src.days).filter((d) => d >= r.start && d <= today).sort().forEach((d) => lvDayTypes(src, d).forEach((t) => (typeDays[t] = typeDays[t] || []).push(d)));
  const meets = (type, from) => (typeDays[type] || []).filter((d) => d >= from).length;
  const firstIn = (key) => Object.keys(src.days).filter((d) => d.slice(0, 7) === key && d >= r.start && (src.days[d] || []).length).sort()[0] || null;
  const own = (id) => (g && g.owned[id]) || null;
  const out = [];
  LV_STARTERS.forEach((m, i) => {
    const h = have[m.id];
    out.push({ id: m.id, kind: 'starter', no: 'S' + (i + 1), type: m.type, forms: m.forms, tpl: m.tpl, have: h ? h.forms : 0, shiny: !!((h && h.shiny) || (own(m.id) && own(m.id).shiny)), found: h ? { d: r.start, how: 'Starter' } : null });
  });
  LV_MONTHLY.forEach((m, i) => {
    const mo = r.months.find((x) => x.monster.id === m.id && x.form >= 0);
    const d = mo ? firstIn(mo.key) : null;
    out.push({ id: m.id, kind: 'month', no: String(i + 1).padStart(2, '0'), type: m.type, forms: m.forms, tpl: m.tpl, have: mo ? mo.form + 1 : 0, shiny: !!((mo && mo.shiny) || (own(m.id) && own(m.id).shiny)), found: mo ? { d: d || mo.key + '-01', how: 'Monatsei', month: mo.key } : null });
  });
  LV_BONUS.forEach((m, i) => {
    const o = own(m.id); const via = o && o.via === 'garden' ? o : null;
    const h = g && g.log.find((x) => x.kind === 'hatch' && x.id === m.id);
    const p = g && g.plots.find((x) => x.id === m.id);
    out.push({ id: m.id, kind: 'bonus', no: 'B' + (i + 1), type: m.type, forms: m.forms, tpl: m.tpl, have: via ? via.forms : 0, shiny: !!(via && via.shiny), found: via && h ? { d: h.d, how: p && p.kind === 'sow' ? 'Beet · gesät' : 'Besuch' } : null, locked: g ? !g.unlocked.includes(m.id) : true });
  });
  LV_LEGENDS.forEach((m, i) => {
    const y = r.years.find((x) => x.done && x.legend.id === m.id);
    out.push({ id: m.id, kind: 'legend', no: 'L' + (i + 1), type: 'Legendär', forms: [m.name], tpl: m.tpl, have: y ? 1 : 0, shiny: !!(y && y.gold), found: y ? { d: today, how: `Jahr ${y.y} geschafft` } : null });
  });
  out.forEach((e) => {
    e.meets = e.found ? (e.kind === 'legend' ? 1 : meets(e.type, e.found.d)) : 0;
    e.notes = [e.have >= 1, e.have >= e.forms.length, e.meets >= 10];
  });
  return { list: out, monsters: out.filter((e) => e.have).length, forms: out.reduce((a, e) => a + e.have, 0), shinies: out.filter((e) => e.shiny).length, total: out.length, totalForms: out.reduce((a, e) => a + e.forms.length, 0) };
}
// Saison-Kostüme: Saison freigeschaltet, sobald ein Monat dieser Saison 10 gezählte Tage hat; Partyhut nach einem Jahr
const LV_COSTUMES = [
  ['kranz', 'Blumenkranz', 'Frühling', [3, 4, 5]], ['stroh', 'Strohhut', 'Sommer', [6, 7, 8]], ['kuerbis', 'Kürbishut', 'Herbst', [9, 10, 11]],
  ['muetze', 'Mütze + Schal', 'Winter', [12, 1, 2]], ['party', 'Partyhut', '1 Jahr dabei', null],
].map(([id, name, season, months]) => ({ id, name, season, months }));
function levelCostumes(src, lv, today, r) {
  if (!r) return [];
  const cd = lvCountedDays(src, r.start, today), per = {};
  cd.counted.forEach((d) => { per[d.slice(0, 7)] = (per[d.slice(0, 7)] || 0) + 1; });
  return LV_COSTUMES.map((c) => {
    let open, since = null;
    if (c.months) { const ks = Object.keys(per).filter((k) => c.months.includes(+k.slice(5, 7)) && per[k] >= 10).sort(); open = ks.length > 0; since = ks[0] || null; }
    else { open = lvIsoAdd(r.start, 365) <= today; since = open ? lvIsoAdd(r.start, 365) : null; }
    return Object.assign({ open, since }, c);
  });
}
function levelGardenAct(s, act, iso) {
  const g = (s.level.garden = s.level.garden || { acts: [], gifts: {} });
  if (!Array.isArray(g.acts)) g.acts = [];
  g.acts.push(Object.assign({ d: iso }, act));
}
const LEVEL_DEFAULTS = () => ({ enabled: false, startDate: null, starter: null, theme: 'veg', arenas: {}, ev: {}, toasts: true, seed: null, seen: null, lively: true, garden: { acts: [], gifts: {} } });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LV_CFG, LV_STARTERS, LV_MONTHLY, LV_LEGENDS, LV_BONUS, LV_ARENAS, levelCompute, levelCollection, levelEvent, lvCountedDays, lvMonthIdx, lvMonthOrder, lvShinyList, LEVEL_DEFAULTS, LV_GARDEN, LV_RANKS, LV_UNLOCK, LV_DEKO, lvFoodTypes, lvDayTypes, levelGarden, levelGardenAct, lvRank, levelDex, levelCostumes, LV_COSTUMES };
}
