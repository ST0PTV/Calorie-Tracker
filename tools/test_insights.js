// Tests für js/insights.js – Aufruf: node tools/test_insights.js (nur erfundene Testdaten)
'use strict';
const I = require('../js/insights.js');
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ' ≠ ' + JSON.stringify(want)}`); };
const near = (name, got, want, tol) => { const ok = got != null && Math.abs(got - want) <= tol; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got} (soll ${want} ± ${tol})`); };
const range = (a, b) => { const o = []; for (let d = a; d <= b; d = I.insAdd(d, 1)) o.push(d); return o; };
const TODAY = '2026-11-30';
const food = (k) => [{ meal: 'lunch', grams: 100, k }];

// 1) Trend: konstantes Gewicht bleibt konstant; Sprung wird mit 10 % je Tag übernommen
let st = { days: {}, weightLog: { '2026-11-01': 80, '2026-11-02': 81 } };
let t = I.insTrend(st);
eq('Trend Länge', t.length, 2);
near('Trend nach Sprung +1 kg', t[1].t, 80.1, 1e-9);
t = I.insTrend(st, '2026-11-05');
near('Trend bleibt ohne Wiegen', t[t.length - 1].t, 80.1, 1e-9);
eq('ungültige Werte ignoriert', I.insTrend({ weightLog: { x: 80, '2026-11-01': 5 } }).length, 0);

// 2) Energiebedarf: 2.500 kcal gegessen, Gewicht −0,5 kg/Woche → Bedarf ≈ 2.500 + 0,5/7·7.700 = 3.050
const days = {}, weightLog = {};
range(I.insAdd(TODAY, -28), I.insAdd(TODAY, -1)).forEach((d, i) => { days[d] = food(2500); if (i % 2 === 0) weightLog[d] = 80 - (0.5 / 7) * i; });
let e = I.insExpenditure({ days, weightLog }, TODAY);
eq('genug Daten', e.ok, true);
near('Bedarf (ohne Rauschen)', e.tdee, 2500 + 0.5 / 7 * 7700, 1);
near('Aufnahme', e.intake, 2500, 1e-6);
near('Steigung kg/Woche', e.slopeWeek, -0.5, 1e-6);
eq('Spanne ohne Rauschen = 0', Math.round(e.hi - e.lo), 0);

// 3) Rauschen ±0,6 kg: Schätzung bleibt in der Nähe, Spanne wird breiter
const wl2 = {}; Object.keys(weightLog).forEach((d, i) => { wl2[d] = weightLog[d] + (i % 2 ? 0.6 : -0.6); });
e = I.insExpenditure({ days, weightLog: wl2 }, TODAY);
near('Bedarf mit Rauschen', e.tdee, 3050, 250);
eq('Spanne > 0', e.hi - e.lo > 50, true);

// 4) Leere Tage zählen nicht als Aufnahme 0 (Durchschnitt nur über Tage mit Einträgen)
const d3 = Object.assign({}, days); Object.keys(d3).slice(0, 10).forEach((d) => { delete d3[d]; });
e = I.insExpenditure({ days: d3, weightLog }, TODAY);
near('Aufnahme ohne leere Tage', e.intake, 2500, 1e-6);
eq('getrackte Tage', e.logged, 18);

// 5) Zu wenige Daten
e = I.insExpenditure({ days: { [I.insAdd(TODAY, -1)]: food(2000) }, weightLog: {} }, TODAY);
eq('zu wenig Daten', [e.ok, e.logged, e.weighs], [false, 1, 0]);
// Koffein-Getränke allein zählen nicht als getrackter Essens-Tag
const dc = {}; range(I.insAdd(TODAY, -28), I.insAdd(TODAY, -1)).forEach((d) => { dc[d] = [{ meal: 'snack', grams: 250, k: 45, cafId: 'c1' }]; });
eq('nur Koffein-Getränke', I.insExpenditure({ days: dc, weightLog }, TODAY).logged, 0);

// 6) Gewohnheit: jeden Tag getrackt → steigt gegen 1; ein Fehltag senkt nur leicht
const hd = {}; range('2026-09-01', '2026-11-29').forEach((d) => { hd[d] = food(2000); });
let h = I.insHabit({ days: hd }, TODAY);
eq('Gewohnheit nach 90 Tagen > 0,95', h.score > 0.95, true);
eq('30 von 30', [h.last30, h.n30], [30, 30]);
delete hd['2026-11-29'];
const h2 = I.insHabit({ days: hd }, TODAY);
near('ein Fehltag: Rückgang um (1−m)', h.score - h2.score, 1 - I.INS_M, 1e-9);
eq('ein Fehltag: Wert bleibt > 0,9', h2.score > 0.9, true);
eq('heute zählt nicht', I.insHabit({ days: { [TODAY]: food(1) } }, TODAY).score, null);

// 7) Wochenrückblick: Vorwoche Mo–So
const wd = {}; range('2026-11-23', '2026-11-29').forEach((d, i) => { if (i < 5) wd[d] = food(2000 + i * 100); });
const w = I.insWeek({ days: wd, weightLog: {} }, '2026-12-01', { kcalOf: (d) => wd[d] ? wd[d][0].k : 0, goalOf: () => 2400 });
eq('Vorwoche', [w.mon, w.sun, w.logged], ['2026-11-23', '2026-11-29', 5]);
near('Ø kcal', w.kcal, 2200, 1e-9);
eq('Ziel', w.goal, 2400);

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(fail ? 1 : 0);
