/* Auswertungen über mehrere Tage: Gewichtstrend, geschätzter Energiebedarf aus Essen + Gewicht,
   Tracking-Gewohnheit (nachsichtiger Wert statt Serie) und Wochenrückblick.
   Die Rechenfunktionen (ins*) bekommen den Zustand als Parameter und laufen auch ohne Browser (Tests mit Node:
   tools/test_insights.js). Die Karten-Funktionen nutzen die globalen Helfer aus app.js. */
'use strict';
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;

const INS_DAY = 864e5;
const insIso = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const insAdd = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return insIso(d); };
const insDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / INS_DAY);
// Tag mit Essens-Einträgen (Getränke aus dem Koffein-/Alkohol-Tracker zählen nicht als „Essen getrackt“)
const insFoodEntries = (st, iso) => (st.days[iso] || []).filter((e) => !e.cafId && !e.alcId);
const insLogged = (st, iso) => insFoodEntries(st, iso).length > 0;
// Vorzeichen + eine Nachkommastelle (deutsch, echtes Minus) für kg-Angaben
const insS1 = (v) => (Math.round(v * 10) === 0 ? '±0' : (v > 0 ? '+' : '−') + (Math.round(Math.abs(v) * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 }));

/* ---------- Gewichtstrend ----------
   Exponentiell geglätteter Mittelwert wie im Hacker's Diet (Walker): T_neu = T_alt + a·(Gewicht − T_alt), a = 0,1.
   Tage ohne Wiegen behalten den Trend. Der Trend läuft der echten Entwicklung einige Tage hinterher. */
const INS_ALPHA = 0.1;
function insWeights(st) {
  return Object.entries(st.weightLog || {}).filter(([d, w]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && w > 20 && w < 400).sort((a, b) => a[0].localeCompare(b[0]));
}
function insTrend(st, to) {
  const ws = insWeights(st); if (!ws.length) return [];
  const map = new Map(ws), out = [];
  const end = to || ws[ws.length - 1][0];
  let t = ws[0][1];
  for (let d = ws[0][0]; d <= end; d = insAdd(d, 1)) {
    const w = map.has(d) ? map.get(d) : null;
    if (w != null) t += INS_ALPHA * (w - t);
    out.push({ d, w, t });
  }
  return out;
}

/* ---------- Energiebedarf aus Essen + Gewicht ----------
   Idee wie MacroFactor („expenditure“): Bedarf ≈ mittlere Aufnahme − Energie der Gewichtsänderung.
   Hier: Fenster der letzten 28 abgeschlossenen Tage. Gewichtsänderung = Steigung einer linearen Regression der
   Wiegewerte im Fenster (robuster als Trend-Anfang/-Ende, weil der geglättete Trend am Anfang hinterherläuft).
   Energie pro kg: 7.700 kcal (übliche Faustregel, unbestätigt – siehe „Unverified & To Verify“ Nr. 13).
   Spanne: 95-%-Intervall der Steigung; Wiegewerte schwanken aber nicht unabhängig (Wasser, Darminhalt),
   daher ist die echte Unsicherheit größer. Nur Anzeige – die App ändert damit kein Ziel. */
const INS_WIN = 28, INS_MIN_LOGGED = 14, INS_MIN_WEIGHS = 6, INS_MIN_SPAN = 14, INS_KCAL_KG = 7700;
function insRegression(pts) { // pts: [[x, y]]
  const n = pts.length; if (n < 3) return null;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  let sxx = 0, sxy = 0; pts.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); });
  if (!sxx) return null;
  const b = sxy / sxx, a = my - b * mx;
  const sse = pts.reduce((s, [x, y]) => s + (y - (a + b * x)) ** 2, 0);
  const se = Math.sqrt(sse / (n - 2) / sxx);
  return { slope: b, se, n };
}
function insExpenditure(st, today) {
  const end = insAdd(today, -1), start = insAdd(end, -(INS_WIN - 1));
  const days = []; for (let d = start; d <= end; d = insAdd(d, 1)) days.push(d);
  const loggedDays = days.filter((d) => insLogged(st, d));
  const kcalOf = (d) => (st.days[d] || []).reduce((s, e) => s + (e.quick ? (e.k || 0) : (e.k || 0) * (e.grams || 0) / 100), 0);
  const weighs = insWeights(st).filter(([d]) => d >= start && d <= end);
  const span = weighs.length ? insDiff(weighs[0][0], weighs[weighs.length - 1][0]) : 0;
  const base = { start, end, logged: loggedDays.length, weighs: weighs.length, span, win: INS_WIN };
  if (loggedDays.length < INS_MIN_LOGGED || weighs.length < INS_MIN_WEIGHS || span < INS_MIN_SPAN) return Object.assign(base, { ok: false });
  const intake = loggedDays.reduce((s, d) => s + kcalOf(d), 0) / loggedDays.length;
  const reg = insRegression(weighs.map(([d, w]) => [insDiff(start, d), w]));
  if (!reg) return Object.assign(base, { ok: false });
  const perDay = reg.slope * INS_KCAL_KG; // kcal/Tag, die ins (+) oder aus (−) dem Körpergewebe gingen
  const tdee = intake - perDay;
  const half = 1.96 * reg.se * INS_KCAL_KG;
  return Object.assign(base, { ok: true, intake, slopeWeek: reg.slope * 7, tdee, lo: tdee - half, hi: tdee + half });
}

/* ---------- Tracking-Gewohnheit ----------
   Nachsichtiger Wert wie im Loop Habit Tracker: jeder getrackte Tag hebt den Wert, ein ausgelassener senkt ihn etwas –
   statt einer Serie, die bei einem Fehltag auf 0 fällt. Formel: s = s·m + x·(1 − m), x = 1 (getrackt) oder 0,
   m = 0,5^(1/13) → ein Tag wirkt nach 13 Tagen nur noch halb (Halbwertszeit 13 Tage; Loop nutzt für tägliche
   Gewohnheiten einen ähnlichen Faktor – Trainingswissen, nicht im Quelltext geprüft). Heute zählt erst ab morgen. */
const INS_HL = 13, INS_M = Math.pow(0.5, 1 / INS_HL);
function insFirstLog(st) { return Object.keys(st.days || {}).filter((d) => insLogged(st, d)).sort()[0] || null; }
function insHabit(st, today) {
  const first = insFirstLog(st); if (!first) return null;
  const end = insAdd(today, -1); if (first > end) return { score: null, series: [], last30: 0, n30: 0 };
  let s = 0; const series = [];
  for (let d = first; d <= end; d = insAdd(d, 1)) { s = s * INS_M + (insLogged(st, d) ? 1 : 0) * (1 - INS_M); series.push({ d, s }); }
  const from30 = insAdd(end, -29);
  const n30 = Math.min(30, insDiff(first, end) + 1);
  const last30 = series.filter((x) => x.d >= from30 && insLogged(st, x.d)).length;
  return { score: s, series, last30, n30 };
}

/* ---------- Wochenrückblick (Montag–Sonntag der Vorwoche) ---------- */
function insWeekStart(iso) { const d = new Date(iso + 'T12:00:00'); const wd = (d.getDay() + 6) % 7; return insAdd(iso, -wd); }
function insWeek(st, today, helpers) {
  const mon = insAdd(insWeekStart(today), -7), sun = insAdd(mon, 6);
  const days = []; for (let d = mon; d <= sun; d = insAdd(d, 1)) days.push(d);
  const logged = days.filter((d) => insLogged(st, d));
  const h = helpers || {};
  const avg = (f, list) => (list.length ? list.reduce((s, d) => s + f(d), 0) / list.length : null);
  const goalAvg = avg((d) => (h.goalOf ? h.goalOf(d) || 0 : 0), logged);
  const trend = insTrend(st, sun);
  const tAt = (d) => { const x = trend.find((p) => p.d === d); return x ? x.t : null; };
  const t0 = tAt(insAdd(mon, -1)) ?? tAt(mon), t1 = tAt(sun);
  return {
    mon, sun, logged: logged.length,
    kcal: avg((d) => (h.kcalOf ? h.kcalOf(d) : 0), logged), goal: goalAvg || null,
    protein: avg((d) => (h.protOf ? h.protOf(d) : 0), logged), proteinGoal: avg((d) => (h.protGoalOf ? h.protGoalOf(d) || 0 : 0), logged) || null,
    waterOk: h.waterOk ? days.filter((d) => h.waterOk(d)).length : null,
    caffeine: h.cafOf ? avg(h.cafOf, days.filter((d) => h.cafOf(d) > 0)) : null,
    trendDelta: t0 != null && t1 != null ? t1 - t0 : null,
  };
}

if (typeof module !== 'undefined') module.exports = { insTrend, insExpenditure, insHabit, insWeek, insRegression, insAdd, INS_ALPHA, INS_M };

/* ================= Anzeige (nur im Browser aufgerufen; nutzt Helfer aus app.js) ================= */

INFO.insWeight = { body: '<p>Punkte = deine Wiegewerte, Linie = geglätteter Trend (exponentiell gewichteter Mittelwert, jeder neue Wert zählt 10 %). Das Körpergewicht schwankt von Tag zu Tag um bis zu 1–2 kg durch Wasser, Salz und Darminhalt; der Trend zeigt die Richtung ohne dieses Rauschen.</p><p>Schwäche: Der Trend reagiert erst nach einigen Tagen auf echte Änderungen. Am besten morgens nach dem Aufstehen wiegen, immer unter gleichen Bedingungen.</p>', src: 'Walker, The Hacker\'s Diet (Trend) · MacroFactor (Gewichtstrend)' };
INFO.insEnergy = () => ({ body: `<p>Schätzung deines tatsächlichen Energiebedarfs aus dem, was du isst, und wie sich dein Gewicht dabei ändert – ähnlich wie die App MacroFactor rechnet:</p><p><strong>Bedarf ≈ Ø Aufnahme − Gewichtsänderung × 7.700 kcal/kg</strong></p><p>Grundlage sind die letzten ${INS_WIN} abgeschlossenen Tage: der Durchschnitt der Tage mit Essens-Einträgen und die Steigung einer Ausgleichsgeraden durch die Wiegewerte. Nötig sind mindestens ${INS_MIN_LOGGED} Tage mit Einträgen und ${INS_MIN_WEIGHS} Wiegewerte über mindestens ${INS_MIN_SPAN} Tage.</p><p><strong>Schwächen:</strong></p>`,
  pts: [['Unvollständige Tage', 'Vergessene Einträge lassen Aufnahme und damit den Bedarf zu niedrig erscheinen.'], ['Wasser statt Energie', 'Kreatin-Start, mehr Kohlenhydrate, Salz oder Ballaststoffe verändern das Gewicht ohne Energie. MacroFactor nennt das selbst als Fehlerquelle für 1–2 Wochen.'], ['7.700 kcal pro kg', 'Faustregel; bei längerer Abnahme besteht Gewebe nicht nur aus Fett, der Wert ist dann eher zu hoch (unbestätigt).'], ['Spanne', '95-%-Intervall der Ausgleichsgeraden. Weil Wiegewerte nicht unabhängig schwanken, ist die echte Unsicherheit größer.'], ['Nur Anzeige', 'Die App ändert damit kein Ziel. Vergleiche den Wert mit Uhr und Formel und entscheide selbst.']],
  src: 'MacroFactor – Algorithms and Core Philosophy (Methode und Schwächen, geprüft 13.10.2026)' });
INFO.insHabit = { body: '<p>Wie fest das Tracken zur Gewohnheit geworden ist – als nachsichtiger Wert statt einer Serie: Jeder Tag mit Essens-Einträgen hebt den Wert, ein ausgelassener Tag senkt ihn nur etwas. Ein einzelner Fehltag wirft dich also nicht auf 0 zurück.</p><p>Hintergrund: In einer Studie zur Gewohnheitsbildung störte ein einzelner verpasster Tag den Aufbau nicht merklich; bis eine Gewohnheit automatisch läuft, dauerte es im Median 66 Tage (Spanne 18–254, Modellwerte aus einer kleinen Studie).</p><p>Der Wert sagt nur etwas über das Tracken – nicht darüber, wie viel du isst.</p>', src: 'Loop Habit Tracker (Prinzip) · Lally et al. 2010, Eur J Soc Psychol 40(6):998–1009' };

const insW = { range: 30 };
function insWeightCardHtml(today) {
  const all = insTrend(state, today);
  const ws = all.filter((p) => p.w != null);
  const head = `<div class="spread"><h2 class="ct">Gewicht ${infoBtn('insWeight')}</h2><button type="button" class="btn secondary ins-add" id="insWAdd">+ Gewicht</button></div>`;
  if (!ws.length) return `<div class="card ins-w">${head}<p class="small muted" style="margin:8px 0 0">Noch keine Wiegewerte. Trage dein Gewicht ein – dann erscheint hier der Verlauf mit Trendlinie.</p></div>`;
  const from = insAdd(today, -(insW.range - 1));
  const pts = all.filter((p) => p.d >= from);
  const last = all[all.length - 1];
  const t7 = all.find((p) => p.d === insAdd(last.d, -7));
  const W = 326, H = 120, top = 8, bot = H - 16;
  const vals = pts.flatMap((p) => (p.w != null ? [p.w, p.t] : [p.t]));
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx - mn < 1) { const c = (mx + mn) / 2; mn = c - 0.5; mx = c + 0.5; }
  const pad = (mx - mn) * 0.12; mn -= pad; mx += pad;
  const n = insDiff(from, today);
  const x = (d) => (Math.max(0, insDiff(from, d)) / Math.max(1, n)) * (W - 8) + 4;
  const y = (v) => bot - ((v - mn) / (mx - mn)) * (bot - top);
  const line = pts.map((p) => `${x(p.d).toFixed(1)},${y(p.t).toFixed(1)}`).join(' ');
  const dots = pts.filter((p) => p.w != null).map((p) => `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.w).toFixed(1)}" r="2.6" class="iw-dot"></circle>`).join('');
  const lab = (v, yy) => `<text x="2" y="${(yy - 3).toFixed(1)}" class="iw-lab">${r1(v)}</text>`;
  const svg = `<svg class="iw-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf mit Trendlinie, letzte ${insW.range} Tage">
    <line x1="0" x2="${W}" y1="${top}" y2="${top}" class="iw-grid"></line><line x1="0" x2="${W}" y1="${bot}" y2="${bot}" class="iw-grid"></line>
    ${lab(mx, top + 12)}${lab(mn, bot)}
    ${pts.length > 1 ? `<polyline points="${line}" class="iw-trend"></polyline>` : ''}${dots}
    <text x="4" y="${H - 2}" class="iw-lab">${new Date(from + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</text><text x="${W - 2}" y="${H - 2}" text-anchor="end" class="iw-lab">heute</text></svg>`;
  const d7 = t7 ? last.t - t7.t : null;
  return `<div class="card ins-w">${head}
    <div class="iw-kpi"><div><span class="iw-big">${r1(last.t)}</span><span class="muted small"> kg Trend</span></div>
      <div class="small muted">${d7 != null ? `${insS1(d7)} kg in 7 Tagen` : 'Trend braucht noch Werte'} · zuletzt gewogen ${r1(ws[ws.length - 1].w)} kg</div></div>
    ${svg}
    <div class="chips iw-rng">${[[30, '30 Tage'], [90, '90 Tage'], [365, '1 Jahr']].map(([v, l]) => `<button type="button" class="chip ${insW.range === v ? 'on' : ''}" data-iwr="${v}">${l}</button>`).join('')}</div>
  </div>`;
}
function insEnergyCardHtml(today) {
  const e = insExpenditure(state, today);
  const o = state.wgoal || {}, w = state.profile.weight;
  const watch = o.src === 'watch' && o.maint ? o.maint : (o.src === 'bmr' && o.bmr ? Math.round(o.bmr * wgPalTotal(o)) : null);
  const watchLabel = o.src === 'bmr' ? 'Uhr (Grundumsatz × PAL)' : 'Uhr';
  const bmr = w ? wgBmrEst(w) : null; const formula = bmr ? Math.round(bmr * wgPalTotal(o)) : null;
  const goal = goalsFor(today).goal;
  const head = `<div class="spread"><h2 class="ct">Energiebedarf ${infoBtn('insEnergy')}</h2><span class="small muted">aus Essen + Gewicht</span></div>`;
  if (!e.ok) {
    const need = [];
    if (e.logged < INS_MIN_LOGGED) need.push(`${e.logged}/${INS_MIN_LOGGED} Tage mit Essen`);
    if (e.weighs < INS_MIN_WEIGHS) need.push(`${e.weighs}/${INS_MIN_WEIGHS} Wiegewerte`);
    else if (e.span < INS_MIN_SPAN) need.push(`Wiegewerte über ${e.span}/${INS_MIN_SPAN} Tage`);
    return `<div class="card ins-e">${head}<p class="small muted" style="margin:8px 0 0">Noch zu wenige Daten in den letzten ${INS_WIN} Tagen: ${need.join(', ')}. Dann schätzt die App, wie viel du tatsächlich verbrauchst – zum Vergleich mit Uhr und Formel.</p></div>`;
  }
  const r50 = (v) => Math.round(v / 50) * 50;
  const cmp = [[watchLabel, watch], ['Formel (DGE × PAL)', formula], ['Dein Tagesziel', goal]].filter(([, v]) => v);
  // Kreatin-Hinweis nur, wenn Kreatin tatsächlich als genommen abgehakt wurde und die erste Einnahme kurz vor/im Zeitraum liegt
  const sp = state.supp || {}; let cre = null;
  if (sp.enabled) ((sp.items || []).filter((x) => x.kind === 'creatine')).forEach((it) => {
    const first = Object.keys(sp.log || {}).filter((d) => (sp.log[d] || []).includes(it.id)).sort()[0];
    if (first && first >= insAdd(e.start, -7) && (!cre || first < cre.from)) cre = { from: first };
  });
  return `<div class="card ins-e">${head}
    <div class="ie-big">≈ ${fmt(r50(e.tdee))}<span class="muted small"> kcal/Tag</span></div>
    <div class="small muted">Spanne ${fmt(r50(e.lo))}–${fmt(r50(e.hi))} kcal · Ø gegessen ${fmt(Math.round(e.intake))} kcal · Trend ${insS1(e.slopeWeek)} kg/Woche</div>
    ${cmp.length ? `<div class="ie-cmp"><div class="ie-row ie-hd small muted"><span>Vergleich</span><span>kcal</span><span>Differenz</span></div>${cmp.map(([l, v]) => `<div class="ie-row"><span>${l}</span><strong>${fmt(v)}</strong><span class="muted">${fmtS(v - r50(e.tdee))}</span></div>`).join('')}</div>` : ''}
    <p class="small muted" style="margin:8px 0 0">Grundlage: ${e.logged} von ${e.win} Tagen mit Einträgen, ${e.weighs} Wiegewerte. Nur Anzeige – kein Ziel wird automatisch geändert.</p>
    ${cre ? `<p class="small warn" style="margin-top:6px">Kreatin steht seit ${new Date(cre.from + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })} im Supplement-Tracker. Zu Beginn bindet Kreatin Wasser (Gewicht steigt ohne Energie) – die Schätzung kann dann für 1–2 Wochen zu hoch sein.</p>` : ''}
  </div>`;
}
function insHabitCardHtml(today) {
  const h = insHabit(state, today);
  if (!h || h.score == null) return '';
  const pct = Math.round(h.score * 100);
  const ser = h.series.slice(-60);
  const W = 326, H = 40;
  const line = ser.map((p, i) => `${(i / Math.max(1, ser.length - 1) * W).toFixed(1)},${(H - 2 - p.s * (H - 6)).toFixed(1)}`).join(' ');
  return `<div class="card ins-h"><div class="spread"><h2 class="ct">Tracking-Gewohnheit ${infoBtn('insHabit')}</h2><span class="small muted">${h.last30} von ${h.n30} Tagen</span></div>
    <div class="ih-row"><span class="ih-big">${pct}<span class="muted small"> %</span></span><span class="ih-bar"><i style="width:${pct}%"></i></span></div>
    ${ser.length > 1 ? `<svg class="ih-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf der Tracking-Gewohnheit, letzte ${ser.length} Tage"><polyline points="${line}"></polyline></svg>` : ''}
  </div>`;
}
function insBindHistory(rerender) {
  const a = $('#insWAdd'); if (a) a.onclick = () => insOpenWeight(rerender);
  document.querySelectorAll('[data-iwr]').forEach((b) => b.onclick = () => { insW.range = +b.dataset.iwr; rerender(); });
}
function insOpenWeight(after) {
  sheetMode = 'weight';
  openSheet(`${sheetHead('iwBack', 'Gewicht eintragen', false)}
    <p class="small muted">Am besten morgens nach dem Aufstehen, immer unter gleichen Bedingungen. Gilt für heute.</p>
    <label for="iwVal">Gewicht (kg)</label><input id="iwVal" inputmode="decimal" value="${state.profile.weight != null ? r1(state.profile.weight) : ''}">
    <div style="height:14px"></div><button class="btn block" id="iwSave">Speichern</button>`);
  $('#iwBack').onclick = closeSheet;
  $('#iwSave').onclick = () => {
    const w = num($('#iwVal').value);
    if (w == null || w < 25 || w > 350) { toast('Bitte ein Gewicht zwischen 25 und 350 kg eingeben.'); return; }
    const msg = applyProfileWeight(Math.round(w * 10) / 10);
    save(); toast(msg || 'Gewicht gespeichert'); closeSheet(); if (after) after();
  };
}

/* ---------- Wochenrückblick im Journal (Mo–Mi, bis „Gelesen“) ---------- */
function insWeekKey(today) { return insWeekStart(today); }
function insWeekCardHtml(today) {
  const wd = (new Date(today + 'T12:00:00').getDay() + 6) % 7; // 0 = Montag
  if (wd > 2 || state.weekSeen === insWeekKey(today)) return '';
  const r = insWeek(state, today, {
    kcalOf: (d) => dayTotals(d).k, goalOf: (d) => goalsFor(d).goal,
    protOf: (d) => dayTotals(d).p, protGoalOf: (d) => goalsFor(d).protein,
    waterOk: state.water.enabled ? (d) => waterOf(d) >= waterGoalFor(d) : null,
    cafOf: state.caffeine.enabled ? (d) => caffSum(state.caffeine, d) : null,
  });
  if (r.logged < 3) return '';
  const dm = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
  const rows = [
    ['Tage getrackt', `${r.logged} / 7`],
    ['Ø Kalorien', `${fmt(Math.round(r.kcal))}${r.goal ? ` <span class="muted">/ Ziel ${fmt(Math.round(r.goal))}</span>` : ''} kcal`],
    r.protein != null ? ['Ø Eiweiß', `${r0(r.protein)}${r.proteinGoal ? ` <span class="muted">/ ${r0(r.proteinGoal)}</span>` : ''} g`] : null,
    r.waterOk != null ? ['Wasserziel erreicht', `${r.waterOk} / 7 Tage`] : null,
    r.caffeine != null ? ['Ø Koffein', `${r0(r.caffeine)} mg`] : null,
    r.trendDelta != null ? ['Gewichtstrend', `${insS1(r.trendDelta)} kg`] : null,
  ].filter(Boolean);
  return `<div class="card ins-wk"><div class="spread"><h2 class="ct">Rückblick ${dm(r.mon)}–${dm(r.sun)}</h2><button type="button" class="btn ghost ins-wk-x" id="insWkSeen">Gelesen</button></div>
    <div class="ie-cmp">${rows.map(([l, v]) => `<div class="ie-row"><span>${l}</span><strong>${v}</strong></div>`).join('')}</div>
    <p class="small muted" style="margin:8px 0 0">Durchschnitte über die Tage mit Einträgen. Mehr in Analytics.</p></div>`;
}
function insBindWeek(today, rerender) {
  const b = $('#insWkSeen'); if (b) b.onclick = () => { state.weekSeen = insWeekKey(today); save(); rerender(); };
}
