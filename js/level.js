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
  { id: 'erntor', name: 'Erntor', tpl: 42 },
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

  // Monate 2–12: Monatsmonster und Monatslevel
  const months = [];
  for (let k = 2; k <= Math.min(12, curMonth); k++) {
    const c = inMonth(k), m = LV_MONTHLY[k - 2];
    months.push({ k, key: lvMonthKey(start, k), counted: c.n, tracked: c.t, done: c.n >= LV_CFG.monthDays, form: lvMonsterForm(c.n), monster: m });
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
    starter, starterStage, starterTpl: starter ? starter.tpl + starterStage : null,
    curMonth, months, monthLevels, quarters, quarterLevels, years, arenas,
    counted: cd.counted.size, pauseDays: [...cd.pause],
  };
}

// Sammlung: erreichte Formen (für Album/Zähler „Monster x/17 · Formen x/45 · Orden x/8“)
function levelCollection(r) {
  const out = [];
  if (r.starter) out.push({ id: r.starter.id, forms: r.starterStage + 1, tpl: r.starter.tpl });
  r.months.forEach((m) => { if (m.form >= 0) out.push({ id: m.monster.id, forms: m.form + 1, tpl: m.monster.tpl, month: m.key, counted: m.counted }); });
  const seen = new Set();
  r.years.filter((y) => y.done).forEach((y) => { if (!seen.has(y.legend.id)) { seen.add(y.legend.id); out.push({ id: y.legend.id, forms: 1, tpl: y.legend.tpl, year: y.y, gold: y.gold }); } });
  return { list: out, monsters: out.length, forms: out.reduce((a, b) => a + b.forms, 0), totalMonsters: 17, totalForms: 45, totalBadges: LV_ARENAS.length };
}

// Aktion ohne eigenes Datum zählen (Scan, eigenes Lebensmittel, Werte ergänzt, geteilt). Nur Zähler, keine Lebensmitteldaten.
function levelEvent(s, kind, iso) {
  if (!s.level) return;
  const ev = (s.level.ev = s.level.ev || {});
  const d = (ev[iso] = ev[iso] || {});
  d[kind] = (d[kind] || 0) + 1;
}
const LEVEL_DEFAULTS = () => ({ enabled: false, startDate: null, starter: null, theme: 'veg', arenas: {}, ev: {}, toasts: true });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LV_CFG, LV_STARTERS, LV_MONTHLY, LV_LEGENDS, LV_ARENAS, levelCompute, levelCollection, levelEvent, lvCountedDays, lvMonthIdx, LEVEL_DEFAULTS };
}
