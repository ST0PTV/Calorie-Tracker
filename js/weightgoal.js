/* Gewichtsziel: Zielgewicht + Zieldatum → tägliches Kalorienziel = Erhaltungsbedarf ± Energie für die Gewichtsänderung.
   Faustregel 7.700 kcal pro kg (entspricht der „3.500-kcal-Regel“ pro Pfund). Sie überschätzt die Gewichtsänderung über
   längere Zeit, weil sich der Verbrauch mitverändert (Thomas et al. 2013). Deshalb rechnet die App bei jedem neuen
   Gewicht mit den verbleibenden kg und Tagen neu (wenn „automatisch anpassen“ an ist).
   Tempo-Orientierung: Zunahme ~0,25–0,5 % des Körpergewichts pro Woche für Einsteiger/Fortgeschrittene im Krafttraining
   (Iraki et al. 2019); Abnahme ~0,5–1 %/Woche, um Muskulatur zu erhalten (Helms et al. 2014). */
'use strict';
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;
const WG_KCAL_PER_KG = 7700;
const pct2 = (v) => (Math.round(v * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const WG_DEFAULTS = () => ({ on: false, target: null, date: null, maint: null, auto: true });

function wgDays(from, to) { return Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 864e5); }
// Plan für ein Gewicht w ab heute
function wgPlan(w, o = state.wgoal, today = isoDate(new Date())) {
  if (!o || !o.target || !o.date || !w || !o.maint) return null;
  const days = wgDays(today, o.date);
  if (days < 1) return { past: true };
  const dkg = o.target - w;
  const perDay = dkg * WG_KCAL_PER_KG / days;
  const goal = Math.round((o.maint + perDay) / 10) * 10;
  const weekPct = (dkg / (days / 7)) / w * 100;
  const warn = [];
  if (dkg > 0 && weekPct > 0.5) warn.push(`Zunahme ${pct2(weekPct)} % pro Woche – schneller als die oft empfohlenen 0,25–0,5 %; mehr davon dürfte Fett sein.`);
  if (dkg < 0 && -weekPct > 1) warn.push(`Abnahme ${pct2(-weekPct)} % pro Woche – schneller als 0,5–1 %; das erhöht das Risiko, Muskulatur zu verlieren.`);
  if (goal < 1200) warn.push('Das Kalorienziel wäre sehr niedrig – bitte Zeitraum verlängern oder ärztlich begleiten lassen.');
  return { days, dkg, perDay, goal, weekPct, warn };
}
// Kalorienziel ab heute setzen (Makros mit den aktuellen Faktoren neu berechnet; frühere Tage unverändert)
function wgApplyGoal(goal) {
  const today = isoDate(new Date());
  const cur = state.goalHistory.length ? goalsFor(today) : Object.assign({}, emptyState().settings, { preset: 'dge', pf: PRESETS.dge.pf, ff: PRESETS.dge.ff });
  const w = state.profile.weight;
  const entry = Object.assign({}, cur, { from: today, goal, weight: w ?? cur.weight ?? null });
  const m = calcMacros(goal, entry.weight, entry.pf, entry.ff);
  if (m && !m.carbsNegative) { entry.protein = m.protein; entry.carbs = m.carbs; entry.fat = m.fat; }
  state.goalHistory = state.goalHistory.filter((h) => h.from !== today).concat([entry]).sort((a, b) => a.from.localeCompare(b.from));
}
// Nach Gewichtsänderung: bei aktivem Ziel mit „automatisch“ neu rechnen. Gibt eine Meldung zurück oder null.
function wgOnWeight(w) {
  const today = isoDate(new Date());
  (state.weightLog = state.weightLog || {})[today] = w;
  const o = state.wgoal;
  if (!o.on || !o.auto) return null;
  const p = wgPlan(w);
  if (!p || p.past) return null;
  wgApplyGoal(p.goal);
  return `Kalorienziel ab heute ${de0(p.goal)} kcal (Gewichtsziel)`;
}

INFO.wg = { body: '<p>Kalorienziel = Erhaltungsbedarf ± Energie für die gewünschte Gewichtsänderung. Gerechnet wird mit der Faustregel 7.700 kcal pro kg, verteilt auf die Tage bis zum Zieldatum.</p><p>Die Faustregel überschätzt die Änderung über längere Zeit, weil sich der Verbrauch mitverändert. Deshalb rechnet die App mit jedem neuen Gewicht (Schlaf &amp; Körper) die verbleibenden kg neu, wenn „automatisch anpassen“ an ist. Den Erhaltungsbedarf schätzt du selbst, z. B. aus dem Ø Gesamtverbrauch deiner Garmin-Uhr über einige Wochen.</p>',
  pts: [['Zunahme', '≈ 0,25–0,5 % des Gewichts pro Woche (Krafttraining, Einsteiger/Fortgeschrittene)'], ['Abnahme', '≈ 0,5–1 % pro Woche, um Muskulatur zu erhalten']],
  src: 'Thomas et al. 2013 · Iraki et al. 2019 · Helms et al. 2014' };

function wgSettingsHtml() {
  const o = state.wgoal, w = state.profile.weight;
  const curGoal = goalsFor(isoDate(new Date())).goal;
  const log = Object.entries(state.weightLog || {}).sort((a, b) => a[0].localeCompare(b[0]));
  return `<div class="card">
    <h2>Gewichtsziel</h2>
    <label class="switch"><input type="checkbox" id="wgOn" ${o.on ? 'checked' : ''}> Kalorienziel aus Gewichtsziel berechnen</label>
    <div id="wgBody" ${o.on ? '' : 'hidden'}>
      <div class="row">
        <div><label for="wgTarget">Zielgewicht (kg)</label><input id="wgTarget" inputmode="decimal" value="${o.target != null ? r1(o.target) : ''}" placeholder="z. B. 80"></div>
        <div><label for="wgDate">bis</label><input id="wgDate" type="date" value="${o.date || ''}" min="${addDays(isoDate(new Date()), 7)}"></div>
      </div>
      <div class="chips portions" id="wgQuick">${[['1 Monat', 30], ['3 Monate', 91], ['6 Monate', 182]].map(([l, d]) => `<button type="button" class="chip" data-d="${d}">${l}</button>`).join('')}</div>
      <label for="wgMaint">Erhaltungsbedarf (kcal/Tag) ${infoBtn('wg')}</label><input id="wgMaint" inputmode="numeric" value="${o.maint ?? curGoal ?? ''}" placeholder="z. B. Ø Gesamtverbrauch Garmin">
      <div class="card wg-plan" id="wgPlan"></div>
      <label class="switch"><input type="checkbox" id="wgAuto" ${o.auto ? 'checked' : ''}> Bei neuem Gewicht automatisch anpassen</label>
      <button class="btn block" id="wgApply">Als Kalorienziel übernehmen</button>
      ${log.length ? `<p class="small muted" style="margin-top:8px">Gewichtsverlauf: ${log.slice(-5).map(([d, v]) => `${new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })} ${r1(v)} kg`).join(' · ')}</p>` : ''}
    </div>
    ${!w ? '<p class="small muted" style="margin-top:8px">Für die Berechnung bitte das aktuelle Körpergewicht unter „Schlaf &amp; Körper“ eintragen.</p>' : ''}
  </div>`;
}
function wgSettingsBind(rerender) {
  const o = state.wgoal;
  const read = () => ({ on: true, target: num($('#wgTarget').value), date: $('#wgDate').value || null, maint: num($('#wgMaint').value), auto: $('#wgAuto').checked });
  const draw = () => {
    const box = $('#wgPlan'); if (!box) return;
    const r = read(), w = state.profile.weight;
    const p = wgPlan(w, r);
    if (!w) { box.innerHTML = '<p class="small muted" style="margin:0">Aktuelles Körpergewicht fehlt (Schlaf &amp; Körper).</p>'; return; }
    if (!p) { box.innerHTML = '<p class="small muted" style="margin:0">Zielgewicht, Datum und Erhaltungsbedarf eintragen.</p>'; return; }
    if (p.past) { box.innerHTML = '<p class="small muted" style="margin:0">Das Zieldatum liegt in der Vergangenheit.</p>'; return; }
    const sign = p.perDay >= 0 ? '+' : '−';
    box.innerHTML = `<div class="spread"><span class="muted">${r1(w)} → ${r1(r.target)} kg in ${Math.round(p.days / 7)} Wochen</span><strong>${p.dkg >= 0 ? '+' : ''}${r1(p.dkg)} kg</strong></div>
      <div class="spread"><span class="muted">Tempo</span><strong>${p.dkg >= 0 ? '+' : ''}${pct2(p.weekPct)} % pro Woche</strong></div>
      <div class="spread"><span class="muted">Täglich</span><strong>${sign}${de0(Math.abs(p.perDay))} kcal</strong></div>
      <div class="spread wg-res"><span>Kalorienziel</span><strong>${de0(p.goal)} kcal</strong></div>
      ${p.warn.map((w2) => `<p class="small warn" style="margin:6px 0 0">${esc(w2)}</p>`).join('')}
      ${p.dkg > 0 && goalsFor(isoDate(new Date())).preset !== 'muscle' ? '<p class="small muted" style="margin:6px 0 0">Tipp: Für Zunahme mit Krafttraining passt das Ernährungsziel „Muskelaufbau“.</p>' : ''}
      ${p.dkg < 0 && goalsFor(isoDate(new Date())).preset !== 'cut' ? '<p class="small muted" style="margin:6px 0 0">Tipp: Beim Abnehmen passt das Ernährungsziel „Fettabbau“.</p>' : ''}`;
  };
  $('#wgOn').onchange = (ev) => { o.on = ev.target.checked; save(); $('#wgBody').hidden = !o.on; draw(); };
  ['wgTarget', 'wgDate', 'wgMaint'].forEach((id) => { $('#' + id).oninput = draw; $('#' + id).onchange = draw; });
  document.querySelectorAll('#wgQuick [data-d]').forEach((b) => b.onclick = () => { $('#wgDate').value = addDays(isoDate(new Date()), +b.dataset.d); draw(); });
  $('#wgAuto').onchange = (ev) => { o.auto = ev.target.checked; save(); };
  $('#wgApply').onclick = () => {
    const r = read();
    if (r.target == null || r.target < 30 || r.target > 300) { toast('Bitte ein Zielgewicht zwischen 30 und 300 kg eingeben.'); return; }
    if (!r.date) { toast('Bitte ein Zieldatum wählen.'); return; }
    if (r.maint == null || r.maint < 1000 || r.maint > 6000) { toast('Bitte den Erhaltungsbedarf (1.000–6.000 kcal) eingeben.'); return; }
    const p = wgPlan(state.profile.weight, r);
    if (!p || p.past) { toast('Bitte Körpergewicht und ein Datum in der Zukunft angeben.'); return; }
    Object.assign(o, r); (state.weightLog = state.weightLog || {})[isoDate(new Date())] = state.profile.weight;
    wgApplyGoal(p.goal); save();
    toast(`Kalorienziel ab heute ${de0(p.goal)} kcal`); rerender();
  };
  draw();
}

if (typeof module !== 'undefined') module.exports = { wgDays, WG_KCAL_PER_KG };
