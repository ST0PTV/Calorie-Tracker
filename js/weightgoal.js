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
const WG_DEFAULTS = () => ({ on: false, target: null, date: null, maint: null, auto: true, src: 'watch', bmr: null, pal: 1.4, sport: false, tempo: 'rec' });
// Tempo in % des Körpergewichts pro Woche; „fast“ = Obergrenze der App
const WG_RATE = { lose: { slow: 0.5, rec: 0.75, fast: 1 }, gain: { slow: 0.25, rec: 0.35, fast: 0.5 } };
const WG_MAX = { lose: 1, gain: 0.5 };
const WG_TEMPO = [['slow', 'Gemächlich'], ['rec', 'Empfohlen'], ['fast', 'Zügig']];
const WG_PAL = [[1.4, 'sitzend'], [1.6, 'gemischt'], [1.8, 'viel auf den Beinen'], [2.0, 'körperlich schwer']];
// Untergrenze ohne fachliche Begleitung (Harvard Health): Frauen 1.200, Männer 1.500 kcal; ohne Angabe 1.200
function wgFloor(sex = state.profile.sex) { return sex === 'm' ? 1500 : 1200; }
function wgAge() { const y = state.profile.birthYear; return y ? new Date().getFullYear() - y : null; }
// Grundumsatz nach DGE/Verbraucherzentrale (Müller et al. 2004); ohne Geschlecht Mittel beider Formeln
function wgBmrEst(w, sex = state.profile.sex, age = wgAge()) {
  if (!w || age == null) return null;
  const f = (0.047 * w - 0.01452 * age + 3.21) * 239, m = f + 1.009 * 239;
  return Math.round(sex === 'm' ? m : sex === 'f' ? f : (f + m) / 2);
}
function wgPalTotal(o) { return Math.round(((o.pal || 1.4) + (o.sport ? 0.3 : 0)) * 100) / 100; }
function wgMaint(o, w) {
  if (o.src === 'bmr') return o.bmr ? Math.round(o.bmr * wgPalTotal(o)) : null;
  if (o.src === 'est') { const b = wgBmrEst(w); return b ? Math.round(b * wgPalTotal(o)) : null; }
  return o.maint || null;
}
const r10 = (v) => Math.round(v / 10) * 10;
const wgDateFmt = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: iso.slice(0, 4) !== String(new Date().getFullYear()) ? 'numeric' : undefined });

function wgDays(from, to) { return Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 864e5); }
// Tempo-Vorschläge ab heute (gemächlich / empfohlen / zügig) mit Datum und kcal
function wgOptions(w, o = state.wgoal, today = isoDate(new Date())) {
  const maint = wgMaint(o, w);
  if (!w || !o.target || !maint) return null;
  const dkg = o.target - w;
  if (Math.abs(dkg) < 0.3) return { keep: true, maint };
  const dir = dkg < 0 ? 'lose' : 'gain', floor = wgFloor();
  return { dir, dkg, maint, floor, list: WG_TEMPO.map(([k, l]) => {
    const kgw = WG_RATE[dir][k] * w / 100, days = Math.max(7, Math.ceil(Math.abs(dkg) / kgw * 7));
    const perDay = Math.sign(dkg) * kgw * WG_KCAL_PER_KG / 7;
    return { k, l, pct: WG_RATE[dir][k], days, date: addDays(today, days), perDay, goal: r10(maint + perDay), low: dir === 'lose' && maint + perDay < floor };
  }) };
}
// Plan für ein Gewicht w mit dem gespeicherten (oder eingegebenen) Zieldatum; hält die Grenzen ein und warnt
function wgPlan(w, o = state.wgoal, today = isoDate(new Date())) {
  const maint = wgMaint(o, w);
  if (!o || !o.target || !o.date || !w || !maint) return null;
  const days = wgDays(today, o.date);
  if (days < 1) return { past: true };
  const dkg = o.target - w;
  if (Math.abs(dkg) < 0.3) return { keep: true, days, dkg, maint, perDay: 0, goal: r10(maint), weekPct: 0, warn: [] };
  const dir = dkg < 0 ? 'lose' : 'gain', floor = wgFloor();
  const weekPct = Math.abs(dkg) / (days / 7) / w * 100;
  const warn = [];
  let perDay = dkg * WG_KCAL_PER_KG / days, tooFast = false, earliest = null, floorHit = false, reach = null;
  if (weekPct > WG_MAX[dir] + 1e-9) {
    tooFast = true;
    const kgw = WG_MAX[dir] * w / 100;
    earliest = addDays(today, Math.ceil(Math.abs(dkg) / kgw * 7));
    perDay = Math.sign(dkg) * kgw * WG_KCAL_PER_KG / 7;
    warn.push(dir === 'lose'
      ? `Zu schnell: Bis ${wgDateFmt(o.date)} wären es ${pct2(weekPct)} % des Körpergewichts pro Woche. Gesund sind höchstens 1 % (NHS: 0,5–1 kg pro Woche) – sonst geht mehr Muskulatur verloren. Frühestens realistisch: ${wgDateFmt(earliest)}.`
      : `Zu schnell: Bis ${wgDateFmt(o.date)} wären es ${pct2(weekPct)} % des Körpergewichts pro Woche. Sinnvoll sind höchstens 0,5 % – mehr Zunahme ist überwiegend Fett. Frühestens realistisch: ${wgDateFmt(earliest)}.`);
  }
  let goal = maint + perDay;
  if (dir === 'lose' && goal < floor) {
    floorHit = true;
    const def = maint - floor;
    reach = def > 0 ? addDays(today, Math.ceil(Math.abs(dkg) * WG_KCAL_PER_KG / def)) : null;
    warn.push(`Das Kalorienziel läge bei ${de0(r10(goal))} kcal und damit unter ${de0(floor)} kcal – der Untergrenze ohne ärztliche bzw. ernährungstherapeutische Begleitung${state.profile.sex ? '' : ' (Frauen 1.200, Männer 1.500 kcal; ohne Geschlechtsangabe gilt 1.200)'}. Es wird auf ${de0(floor)} kcal angehoben${reach ? `; das Ziel ist damit voraussichtlich am ${wgDateFmt(reach)} erreicht` : ''}.`);
    goal = floor;
  }
  goal = r10(goal);
  if (dir === 'lose' && goal < floor) goal = floor;
  return { days, dkg, dir, maint, perDay: goal - maint, goal, weekPct, tooFast, earliest, floorHit, floor, reach, warn };
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
  return `Kalorienziel ab heute ${de0(p.goal)} kcal (Gewichtsziel)${p.tooFast || p.floorHit ? ' – an der Grenze, Zieldatum wohl nicht haltbar' : ''}`;
}

INFO.wg = { body: '<p>Kalorienziel = Erhaltungsbedarf ± Energie für die gewünschte Gewichtsänderung. Gerechnet wird mit der Faustregel 7.700 kcal pro kg.</p><p>Die Faustregel überschätzt die Änderung über längere Zeit, weil sich der Verbrauch mitverändert. Deshalb rechnet die App mit jedem neuen Gewicht (Schlaf &amp; Körper) neu, wenn „automatisch anpassen“ an ist. Am verlässlichsten ist der Abgleich mit deinem echten Gewichtsverlauf über einige Wochen.</p>',
  pts: [['Abnehmen', 'höchstens 1 % des Gewichts pro Woche (NHS: 0,5–1 kg); „Empfohlen“ = 0,75 %'], ['Zunehmen', 'höchstens 0,5 % pro Woche; „Empfohlen“ = 0,35 %'], ['Untergrenze', 'Frauen 1.200, Männer 1.500 kcal pro Tag – darunter nur mit fachlicher Begleitung']],
  src: 'NHS · Harvard Health · Thomas et al. 2013 · Iraki et al. 2019 · Helms et al. 2014' };
INFO.wgSrc = { body: '<p>Der Erhaltungsbedarf ist, was du an einem Tag verbrauchst. Drei Wege:</p>',
  pts: [['Gesamtverbrauch (Uhr)', 'Ø „Kalorien gesamt“ (Ruhe + aktiv) über einige Wochen. Uhren schätzen den Verbrauch oft zu hoch.'], ['Grundumsatz (Uhr) × Aktivität', 'Ruhekalorien der Uhr mal Aktivitätsfaktor (PAL).'], ['Schätzen', 'Grundumsatz aus Gewicht, Alter und Geschlecht (DGE-Formel) mal PAL. Ein Mittelwert für viele Menschen – im Einzelfall oft 10 % und mehr daneben.']],
  src: 'DGE · Verbraucherzentrale · Müller et al. 2004' };
INFO.wgPal = { body: '<p>Der PAL-Wert (physical activity level) beschreibt die Alltagsaktivität: Gesamtbedarf = Grundumsatz × PAL.</p>', pts: [['1,4', 'überwiegend sitzend, z. B. Büro'], ['1,6', 'sitzend, zeitweise gehend oder stehend'], ['1,8', 'überwiegend gehend oder stehend'], ['2,0+', 'körperlich anstrengende Arbeit'], ['+0,3', 'Sport 4–5× pro Woche je 30–60 min']], src: 'DGE' };

function wgPlanHtml(w, r) {
  const opts = wgOptions(w, r);
  const maint = wgMaint(r, w);
  if (!w) return '<p class="small muted" style="margin:0">Aktuelles Körpergewicht fehlt (Schlaf &amp; Körper).</p>';
  if (!maint) return `<p class="small muted" style="margin:0">${r.src === 'est' && wgAge() == null ? 'Für die Schätzung bitte das Geburtsjahr unter „Schlaf &amp; Körper“ eintragen.' : 'Bitte deinen Bedarf eintragen.'}</p>`;
  if (!r.target) return '<p class="small muted" style="margin:0">Zielgewicht eintragen.</p>';
  if (opts.keep) return `<div class="spread wg-res"><span>Kalorienziel (Gewicht halten)</span><strong>${de0(r10(maint))} kcal</strong></div>`;
  const tempo = WG_TEMPO.map(([k]) => k).includes(r.tempo) || r.tempo === 'custom' ? r.tempo : 'rec';
  const verb = opts.dir === 'lose' ? 'abnehmen' : 'zunehmen';
  let html = `<p class="small muted" style="margin:0 0 6px">Tempo (${r1(Math.abs(opts.dkg))} kg ${verb})</p><div class="wg-opts">${opts.list.map((x) => `<button type="button" class="wg-opt${tempo === x.k ? ' on' : ''}" data-tempo="${x.k}">
      <span class="wg-rad"></span><span class="wg-ot"><b>${x.l}</b> <span class="muted">${pct2(x.pct)} %/Woche${x.k === 'fast' ? ' · Obergrenze' : ''}</span><span class="muted">bis ${wgDateFmt(x.date)} · ${Math.round(x.days / 7)} Wochen</span></span>
      <span class="wg-ok${x.low ? ' warn' : ''}">${fmtS(r10(x.perDay))} kcal</span></button>`).join('')}
    <button type="button" class="wg-opt${tempo === 'custom' ? ' on' : ''}" data-tempo="custom"><span class="wg-rad"></span><span class="wg-ot"><b>Eigenes Datum</b></span></button></div>
    ${tempo === 'custom' ? `<label for="wgDate">Zieldatum</label><input id="wgDate" type="date" value="${r.date || ''}" min="${addDays(isoDate(new Date()), 7)}">` : ''}`;
  const date = tempo === 'custom' ? r.date : opts.list.find((x) => x.k === tempo).date;
  const p = date ? wgPlan(w, Object.assign({}, r, { date })) : null;
  if (p && !p.past) html += `<div class="spread wg-res"><span>Kalorienziel</span><strong>${de0(p.goal)} kcal</strong></div>
      <p class="small muted" style="margin:2px 0 0">${fmtS(r10(p.perDay))} kcal am Tag · Bedarf ≈ ${de0(p.maint)} kcal · ≈ ${r1(Math.abs(p.perDay) * 7 / WG_KCAL_PER_KG)} kg pro Woche</p>
      ${p.warn.map((x) => `<p class="small warn">${esc(x)}</p>`).join('')}
      ${p.dkg > 0 && goalsFor(isoDate(new Date())).preset !== 'muscle' ? '<p class="small muted" style="margin:6px 0 0">Tipp: Für Zunahme mit Krafttraining passt das Ernährungsziel „Muskelaufbau“.</p>' : ''}
      ${p.dkg < 0 && goalsFor(isoDate(new Date())).preset !== 'cut' ? '<p class="small muted" style="margin:6px 0 0">Tipp: Beim Abnehmen passt das Ernährungsziel „Fettabbau“.</p>' : ''}`;
  else if (p && p.past) html += '<p class="small warn">Das Zieldatum liegt in der Vergangenheit.</p>';
  return html;
}

function wgSettingsHtml() {
  const o = state.wgoal, w = state.profile.weight;
  const log = Object.entries(state.weightLog || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const src = o.src || 'watch';
  return `<div class="card">
    <h2>Gewichtsziel</h2>
    <label class="switch"><input type="checkbox" id="wgOn" ${o.on ? 'checked' : ''}> Kalorienziel aus Gewichtsziel berechnen</label>
    <div id="wgBody" ${o.on ? '' : 'hidden'}>
      <label>1 · Dein Tagesbedarf ${infoBtn('wgSrc')}</label>
      <div class="seg three wg-src" id="wgSrc">${[['watch', 'Gesamt­verbrauch (Uhr)'], ['bmr', 'Grund­umsatz (Uhr) × Aktivität'], ['est', 'Schätzen aus Körperdaten']].map(([k, l]) => `<button type="button" data-src="${k}" class="${src === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      <div id="wgSrcBox"></div>
      <label for="wgTarget">2 · Zielgewicht (kg) ${infoBtn('wg')}</label><input id="wgTarget" inputmode="decimal" value="${o.target != null ? r1(o.target) : ''}" placeholder="z. B. 75">
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
  // Entwurf: Änderungen erst mit „Übernehmen“ speichern
  const d = { src: o.src || 'watch', maint: o.maint ?? goalsFor(isoDate(new Date())).goal ?? null, bmr: o.bmr, pal: o.pal || 1.4, sport: !!o.sport, tempo: o.tempo || 'rec', date: o.date, target: o.target };
  const read = () => Object.assign({}, d, { on: true, auto: $('#wgAuto').checked });
  const srcBox = () => {
    const w = state.profile.weight, b = wgBmrEst(w), age = wgAge();
    const pal = `<label>Aktivität im Alltag ${infoBtn('wgPal')}</label><div class="chips portions" id="wgPal">${WG_PAL.map(([v, l]) => `<button type="button" class="chip${d.pal === v ? ' on' : ''}" data-pal="${v}">${String(v).replace('.', ',')}${v === 2 ? '+' : ''} ${l}</button>`).join('')}</div>
      <label class="switch"><input type="checkbox" id="wgSport" ${d.sport ? 'checked' : ''}> Sport 4–5× pro Woche (+0,3)</label>`;
    let h = '';
    if (d.src === 'watch') h = `<label for="wgMaint">Ø Gesamtverbrauch der letzten Wochen (kcal/Tag)</label><input id="wgMaint" inputmode="numeric" value="${d.maint ?? ''}" placeholder="z. B. 2500"><p class="small muted" style="margin:4px 0 0">Bei Garmin: „Kalorien gesamt“ (Ruhe + aktiv), nicht nur „Ruhekalorien“.</p>`;
    else if (d.src === 'bmr') h = `<label for="wgBmr">Grundumsatz laut Uhr (kcal/Tag)</label><input id="wgBmr" inputmode="numeric" value="${d.bmr ?? ''}" placeholder="z. B. Garmin „Ruhekalorien“">` + pal;
    else h = `<p class="small muted" style="margin:6px 0 0">${w ? r1(w) + ' kg' : 'Gewicht fehlt'} · ${state.profile.sex === 'm' ? 'Mann' : state.profile.sex === 'f' ? 'Frau' : 'ohne Geschlecht (Mittelwert)'} · ${age != null ? age + ' Jahre' : 'Geburtsjahr fehlt'}${b ? ` → Grundumsatz ≈ <strong style="color:var(--ink)">${de0(b)} kcal</strong> (DGE-Formel)` : ''}</p><p class="small muted" style="margin:2px 0 0">Änderbar unter „Schlaf &amp; Körper“.</p>` + pal;
    if (d.src !== 'watch') h += '<p class="small" id="wgMaintOut" style="margin:6px 0 0"></p>';
    $('#wgSrcBox').innerHTML = h;
    const numIn = (id, key) => { const el = $('#' + id); if (el) el.oninput = () => { d[key] = num(el.value); draw(); }; };
    numIn('wgMaint', 'maint'); numIn('wgBmr', 'bmr');
    document.querySelectorAll('#wgPal [data-pal]').forEach((b2) => b2.onclick = () => { d.pal = +b2.dataset.pal; srcBox(); draw(); });
    const sp = $('#wgSport'); if (sp) sp.onchange = () => { d.sport = sp.checked; srcBox(); draw(); };
  };
  const draw = () => {
    const box = $('#wgPlan'); if (!box) return;
    const mo = $('#wgMaintOut'), m = wgMaint(d, state.profile.weight);
    if (mo) mo.innerHTML = m ? `Erhaltungsbedarf ≈ <strong style="color:var(--accent)">${de0(m)} kcal</strong> <span class="muted">(${de0(d.src === 'bmr' ? d.bmr : wgBmrEst(state.profile.weight))} × ${String(wgPalTotal(d)).replace('.', ',')})</span>` : '';
    box.innerHTML = wgPlanHtml(state.profile.weight, d);
    box.querySelectorAll('[data-tempo]').forEach((b) => b.onclick = () => { d.tempo = b.dataset.tempo; draw(); });
    const di = $('#wgDate'); if (di) di.onchange = () => { d.date = di.value || null; draw(); };
  };
  $('#wgOn').onchange = (ev) => { o.on = ev.target.checked; save(); $('#wgBody').hidden = !o.on; draw(); };
  document.querySelectorAll('#wgSrc [data-src]').forEach((b) => b.onclick = () => {
    d.src = b.dataset.src; document.querySelectorAll('#wgSrc [data-src]').forEach((x) => x.classList.toggle('active', x === b)); srcBox(); draw();
  });
  $('#wgTarget').oninput = () => { d.target = num($('#wgTarget').value); draw(); };
  $('#wgAuto').onchange = (ev) => { o.auto = ev.target.checked; save(); };
  $('#wgApply').onclick = () => {
    const w = state.profile.weight;
    if (!w) { toast('Bitte zuerst das Körpergewicht unter „Schlaf & Körper“ eintragen.'); return; }
    if (d.target == null || d.target < 30 || d.target > 300) { toast('Bitte ein Zielgewicht zwischen 30 und 300 kg eingeben.'); return; }
    if (d.src === 'watch' && (d.maint == null || d.maint < 1000 || d.maint > 6000)) { toast('Bitte den Gesamtverbrauch (1.000–6.000 kcal) eingeben.'); return; }
    if (d.src === 'bmr' && (d.bmr == null || d.bmr < 800 || d.bmr > 4000)) { toast('Bitte den Grundumsatz (800–4.000 kcal) eingeben.'); return; }
    if (d.src === 'est' && !wgBmrEst(w)) { toast('Für die Schätzung bitte das Geburtsjahr unter „Schlaf & Körper“ eintragen.'); return; }
    const opts = wgOptions(w, d);
    let date = d.date;
    if (opts && opts.keep) date = date && wgDays(isoDate(new Date()), date) > 0 ? date : addDays(isoDate(new Date()), 91);
    else if (d.tempo !== 'custom') date = opts.list.find((x) => x.k === (d.tempo || 'rec')).date;
    if (!date) { toast('Bitte ein Zieldatum wählen.'); return; }
    const r = Object.assign(read(), { date });
    const p = wgPlan(w, r);
    if (!p || p.past) { toast('Bitte ein Datum in der Zukunft wählen.'); return; }
    Object.assign(o, r); (state.weightLog = state.weightLog || {})[isoDate(new Date())] = w;
    wgApplyGoal(p.goal); save();
    toast(`Kalorienziel ab heute ${de0(p.goal)} kcal${p.warn.length ? ' – Grenze beachten' : ''}`); rerender();
  };
  srcBox(); draw();
}

if (typeof module !== 'undefined') module.exports = { wgDays, WG_KCAL_PER_KG, wgBmrEst, wgFloor, wgPlan, wgOptions };
