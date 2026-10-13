// Tests für js/level.js – Aufruf: node tools/test_level.js (nur erfundene Testdaten)
'use strict';
const L = require('../js/level.js');
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ' ≠ ' + JSON.stringify(want)}`); };
const ok = (name, cond) => eq(name, !!cond, true);
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

// 6) Zufällige Reihenfolge + Schillernde: Permutation, deterministisch, Garantie
const o1 = L.lvMonthOrder(123), o2 = L.lvMonthOrder(123), o3 = L.lvMonthOrder(999);
eq('Reihenfolge ist Permutation von 0–10', o1.slice().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
eq('gleicher Seed → gleiche Reihenfolge', o1, o2);
eq('anderer Seed → andere Reihenfolge', JSON.stringify(o1) !== JSON.stringify(o3), true);
let maxGap = 0;
for (let sd = 1; sd < 300; sd++) { let g = 0; L.lvShinyList(sd, 40).forEach((x) => { g = x ? 0 : g + 1; maxGap = Math.max(maxGap, g); }); }
eq('Schillernd spätestens beim 6. Schlüpfen (max. 5 ohne)', maxGap <= 5, true);
r = L.levelCompute(src(d5), { startDate: START, seed: 123 }, '2027-12-31');
eq('Monatsmonster folgen Seed-Reihenfolge', r.months.map((m) => m.monster.id).slice(0, 3), o1.slice(0, 3).map((i) => L.LV_MONTHLY[i].id));

// 6b) Monatsei schlüpft erst mit echtem Eintrag – Pausetage allein reichen nicht
{ const d = {}; for (let i = 0; i < 31; i++) { const x = new Date(2026, 9, 1 + i, 12); const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; if (k < '2026-11-01') d[k] = [{ k: 1 }]; }
  const r6 = L.levelCompute(src(d), { startDate: '2026-10-01', seed: 5 }, '2026-11-04');
  eq('Ei ohne Eintrag', r6.months[0].form, -1);
  d['2026-11-04'] = [{ k: 1 }];
  eq('Ei mit Eintrag', L.levelCompute(src(d), { startDate: '2026-10-01', seed: 5 }, '2026-11-04').months[0].form, 0); }

// 8) Garten: Typen, Samen, Besuch, Beet, Mitbringsel
eq('Typ Linsen', L.lvFoodTypes('Linsen-Dal'), ['Hülse']);
eq('Typ Kohlrabi kein Blatt', L.lvFoodTypes('Kohlrabi roh'), ['Spross']);
eq('Typ Kohlenhydrate nichts', L.lvFoodTypes('Kohlenhydrat-Riegel'), []);
eq('Typ Chips nichts', L.lvFoodTypes('Kartoffelchips'), []);
eq('Typ Tomate+Zwiebel', L.lvFoodTypes('Tomaten-Zwiebel-Salat').sort(), ['Blatt', 'Frucht', 'Zwiebel']);
{
  const G0 = '2026-03-02', T = '2026-05-31';
  const days = {}; for (let d = G0; d <= T; d = new Date(new Date(d + 'T12:00:00Z').getTime() + 864e5).toISOString().slice(0, 10)) days[d] = [{ n: 'Linsen-Dal mit Möhre und Knoblauch', k: 1 }];
  const ev = { '2026-03-02': { scan: 9 }, '2026-03-03': { scan: 2, share: 1 }, '2026-03-04': { share: 1 } };
  const S = src(days, { ev });
  const lv = { startDate: G0, starter: 'moehri', seed: 99, garden: { acts: [], gifts: {} } };
  let r = L.levelCompute(S, lv, T), g = L.levelGarden(S, lv, T, r);
  eq('Samen Tagesgrenze + Teilen 1×/Woche', g.earned, 60 + 55 + 0);
  eq('Rang Sammler', g.rank.name, 'Sammler');
  eq('5 Beetplätze vor Kartograf', g.maxPlots, 5);
  // ersten neuen Besuch finden und einladen
  const lv2 = JSON.parse(JSON.stringify(lv)); let vd = null, vid = null;
  for (let d = G0; d <= T && !vd; d = new Date(new Date(d + 'T12:00:00Z').getTime() + 864e5).toISOString().slice(0, 10)) {
    const gg = L.levelGarden(S, lv2, d, L.levelCompute(S, lv2, d)); if (gg.visitor && gg.visitor.kind === 'new') { vd = d; vid = gg.visitor.id; }
  }
  ok('Besuch kommt', !!vd);
  ok('Besucher ist Bonus-Monster passenden Typs', ['ingi', 'knobi', 'kichi'].includes(vid));
  L.levelGardenAct({ level: lv2 }, { a: 'invite', m: vid }, vd);
  g = L.levelGarden(S, lv2, T, L.levelCompute(S, lv2, T));
  eq('Einladen kostet 40', g.samen, 115 - 40 + g.log.filter((x) => x.kind === 'gift').length * 0);
  ok('Monster geschlüpft und gewachsen', g.owned[vid] && g.owned[vid].forms === 2);
  ok('gewachsen → Garten', g.resident.includes(vid) && !g.plots.length);
  // zu teuer: zweites Einladen am selben Tag wird ignoriert, Säen ohne Samen auch
  L.levelGardenAct({ level: lv2 }, { a: 'sow' }, vd); L.levelGardenAct({ level: lv2 }, { a: 'sow' }, vd);
  const g2 = L.levelGarden(S, lv2, T, L.levelCompute(S, lv2, T));
  eq('Säen nur mit genug Samen (1×)', g2.log.filter((x) => x.kind === 'sow' || x.kind === 'refund').length <= 1, true);
  ok('Samen nie negativ', g2.samen >= 0);
  // Mitbringsel nur, wenn abgeholt
  const gd = g.log.find((x) => x.kind === 'gift');
  eq('ohne Abholen keine Mitbringsel', gd, undefined);
  // Deko kaufen
  const lv3 = JSON.parse(JSON.stringify(lv)); L.levelGardenAct({ level: lv3 }, { a: 'deko', m: 'blumen' }, '2026-03-05'); L.levelGardenAct({ level: lv3 }, { a: 'deko', m: 'teich' }, '2026-03-05');
  const g3 = L.levelGarden(S, lv3, T, L.levelCompute(S, lv3, T));
  eq('Deko: Blumen ja, Teich zu teuer', g3.deko, ['blumen']);
  eq('Deko kostet', g3.samen, 115 - 80);
  // Freischaltung über Zeit: Monat 4 → Kichi/Maisi frei
  eq('frei bis Monat 3', L.levelGarden(S, lv, T, L.levelCompute(S, lv, T)).unlocked, ['ingi', 'knobi']);
  const T2 = '2026-06-05'; days[T2] = [{ n: 'Kichererbsen', k: 1 }];
  eq('frei ab Monat 4', L.levelGarden(S, lv, T2, L.levelCompute(S, lv, T2)).unlocked, ['ingi', 'knobi', 'kichi', 'maisi']);
}

// 7) Start in der Zukunft oder fehlend
eq('ohne Start', L.levelCompute(src({}), {}, '2026-10-12'), null);

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(fail ? 1 : 0);
