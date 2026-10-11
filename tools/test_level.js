// Tests für js/level.js – Aufruf: node tools/test_level.js (nur erfundene Testdaten)
'use strict';
const L = require('../js/level.js');
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ' ≠ ' + JSON.stringify(want)}`); };
const add = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const range = (a, b) => { const o = []; for (let d = a; d <= b; d = add(d, 1)) o.push(d); return o; };
const fullDay = () => ['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => ({ meal, k: 300 }));
const src = (days, extra = {}) => Object.assign({ days, weightLog: {}, ev: {}, waterOn: false, waterOf: () => 0, waterGoalFor: () => 1500 }, extra);
const START = '2026-10-12'; // Montag

// 1) Nichts getrackt: Level 1, ein Pausetag pro Woche, nie Verlust
let r = L.levelCompute(src({}), { startDate: START }, '2026-10-25');
eq('leer: Level', r.level, 1);
eq('leer: Pausetage (2 Wochen)', r.pauseDays, ['2026-10-12', '2026-10-19']);

// 2) Jeden Tag voll getrackt (4 Einträge, alle Mahlzeiten): 10 + 15 + 8 = 33 XP/Tag, + 35 je voller Woche
const days = {}; range(START, '2026-11-30').forEach((d) => { days[d] = fullDay(); });
r = L.levelCompute(src(days), { startDate: START, starter: 'erbsi' }, '2026-10-12');
eq('Tag 1: XP / Level', [r.xp, r.level], [33, 2]);
r = L.levelCompute(src(days), { startDate: START, starter: 'erbsi' }, '2026-10-18');
eq('Woche 1: XP (7×33 + 35)', r.xp, 7 * 33 + 35);
r = L.levelCompute(src(days), { startDate: START, starter: 'erbsi' }, '2026-11-30');
eq('L10 erreicht am (Tag 27: 27×33 + 3×35 = 996)', r.l10, '2026-11-07');
eq('Starter-Stufe 3 (Schotador)', [r.starterStage, r.starterTpl], [2, 5]);
eq('November (Monat 2) mit 30 Tagen → +1 Level', [r.months[0].key, r.months[0].done, r.months[0].form, r.level], ['2026-11', true, 2, 11]);

// 3) Wasser- und Gewichts-XP, Teilen nur 1× pro Woche, Mahlzeiten unvollständig
const d3 = { [START]: [{ meal: 'lunch' }] };
r = L.levelCompute(src(d3, { waterOn: true, waterOf: () => 1600, weightLog: { [START]: 70, '2026-10-13': 70 }, ev: { [START]: { share: 1, scan: 2 }, '2026-10-13': { share: 1, own: 1, fill: 1 } } }), { startDate: START }, '2026-10-13');
// Tag 1: 10 + 2 + scan 30 + share 25 + weight 5 + water 5 = 77; Tag 2: own 20 + fill 10 + water 5 = 35 (kein 2. Share/Gewicht in derselben Woche)
eq('Extras: XP', r.xp, 112);

// 4) Monatsmonster-Formen: 9 Tage → Baby, 10 → Normal, Lücken egal
const d4 = Object.assign({}, days); range('2026-12-01', '2026-12-31').filter((d, i) => i % 3 === 0).forEach((d) => { d4[d] = fullDay(); });
r = L.levelCompute(src(d4), { startDate: START }, '2026-12-31');
const dec = r.months.find((m) => m.key === '2026-12');
eq('Dezember: getrackt / gezählt (inkl. Pausetage) / Form', [dec.tracked, dec.counted, dec.form, dec.done], [11, 16, 1, false]);

// 5) Jahre und Quartale: Start 12.10.2026 → Monat 13 = Oktober 2027
const d5 = {}; range(START, '2027-12-31').forEach((d) => { d5[d] = fullDay(); });
r = L.levelCompute(src(d5), { startDate: START }, '2027-12-31');
eq('Monat 15, Level = 10 + 11 + 1 Quartal', [r.curMonth, r.level], [15, 22]);
eq('Jahr 1 → Erntor', r.years.map((y) => [y.y, y.done, y.legend.id]), [[1, true, 'erntor']]);
eq('Arenen offen', r.arenas.filter((a) => a.open).map((a) => a.name), ['Glasdom', 'Wurzelgrotte', 'Kompostkrater', 'Wolkenbeet']);
const c = L.levelCollection(r);
eq('Sammlung: Monster / Formen', [c.monsters, c.forms], [12, 33 + 1]); // ohne gewählten Starter

// 6) Start in der Zukunft oder fehlend
eq('ohne Start', L.levelCompute(src({}), {}, '2026-10-12'), null);

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(fail ? 1 : 0);
