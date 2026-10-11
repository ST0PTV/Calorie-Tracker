/* Alkohol-Tracker – Blutalkohol-Schätzung (Promille), Karte im Journal, Eingabe, Einstellungen.
   Daten bleiben lokal (state.alcohol). Nutzt Hilfsfunktionen aus caffeine.js (caffAbs, hmToMin, caffBedWake, caffFmt).

   Modell (Widmark mit Aufnahme erster Ordnung und Abbau nullter Ordnung):
     Promille c(t): dc/dt = Aufnahme(t) / (r · Körpergewicht) − β   (c ≥ 0)
     Aufnahme je Getränk: A · (1 − Defizit) · ka · e^(−ka·(t − t0)),  A = ml · Vol-% / 100 · 0,789 g/ml
   r: 0,7 (Männer) / 0,6 (Frauen) – übliche feste Werte in der Rechtsmedizin (Maudens et al. 2014: passen vor allem
   bei Normalgewicht, bei Übergewicht überschätzt); ohne Angabe 0,65.
   β: Standard 0,15 ‰/h (Jones 2010: guter Mittelwert für moderate Trinker; nüchtern eher 0,10–0,15, nach Essen 0,15–0,20).
   ka und Resorptionsdefizit sind eigene Annahmen (nüchtern ka 4/h, Defizit 10 %; mit Essen ka 1,5/h, Defizit 20 %):
   Essen verzögert und senkt den Gipfel (Fraser et al. 1995), die genaue Größe hängt von Mahlzeit und Person ab.
   Grobe Schätzung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen. */
'use strict';

const ALC_DEFAULTS = () => ({ enabled: true, beta: 0.15, log: {} });
const ALC_CATS = [['beer', 'Bier'], ['wine', 'Wein'], ['spirit', 'Schnaps'], ['cocktail', 'Cocktail'], ['custom', 'Eigene']];
// vol: Vol-% (aus BLS-Alkoholgehalt g/100 g umgerechnet, Spirituosen Nennwert); k100: kcal/100 ml (BLS 4.0)
const ALC_DRINKS = [
  { c: 'beer', n: 'Pils', ml: 330, vol: 4.9, k100: 38 },
  { c: 'beer', n: 'Pils', ml: 500, vol: 4.9, k100: 38 },
  { c: 'beer', n: 'Weizenbier', ml: 500, vol: 5.3, k100: 42 },
  { c: 'beer', n: 'Radler', ml: 500, vol: 2.5, k100: 38 },
  { c: 'beer', n: 'Pils alkoholfrei', ml: 500, vol: 0.3, k100: 18 },
  { c: 'wine', n: 'Rotwein trocken', ml: 200, vol: 11.7, k100: 70 },
  { c: 'wine', n: 'Weißwein trocken', ml: 200, vol: 11.0, k100: 64 },
  { c: 'wine', n: 'Sekt trocken', ml: 100, vol: 11.7, k100: 75 },
  { c: 'wine', n: 'Apfelwein', ml: 300, vol: 4.8, k100: 44 },
  { c: 'spirit', n: 'Schnaps/Wodka', ml: 20, vol: 40, k100: 225 },
  { c: 'spirit', n: 'Schnaps/Wodka', ml: 40, vol: 40, k100: 225 },
  { c: 'cocktail', n: 'Gin Tonic', ml: 300, vol: 6.1, k100: 55 },
  { c: 'cocktail', n: 'Cuba Libre', ml: 300, vol: 5.3, k100: 52 },
  { c: 'cocktail', n: 'Caipirinha', ml: 200, vol: 12.2, k100: 92 },
  { c: 'cocktail', n: 'Hugo', ml: 200, vol: 4.9, k100: 38 },
];
const ALC_DENS = 0.789;
const alcGrams = (ml, vol) => (ml || 0) * (vol || 0) / 100 * ALC_DENS;
const alcFmt = (v) => (Math.round(v * 100) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const alcMl = (ml) => (ml >= 1000 ? `${(ml / 1000).toLocaleString('de-DE')} l` : ml >= 100 ? `${(ml / 1000).toLocaleString('de-DE')} l` : `${ml / 10} cl`);

// Verteilungsfaktor: mit Körpergröße aus dem BMI (Maudens et al. 2014: Männer 0,8202 − 0,0090·BMI, Frauen 0,7772 − 0,0099·BMI;
// gemessen an 23 Männern und 27 Frauen, BMI 16–36), sonst feste Werte 0,7 / 0,6 (ohne Geschlecht: Mittel)
function alcBmi() { const p = state.profile || {}; return p.weight && p.height ? p.weight / Math.pow(p.height / 100, 2) : null; }
function alcR() {
  const sx = state.profile && state.profile.sex, bmi = alcBmi();
  if (bmi) {
    const m = 0.8202 - 0.0090 * bmi, f = 0.7772 - 0.0099 * bmi;
    return Math.min(0.8, Math.max(0.4, sx === 'm' ? m : sx === 'f' ? f : (m + f) / 2));
  }
  return sx === 'm' ? 0.7 : sx === 'f' ? 0.6 : 0.65;
}
function alcW() { return (state.profile && state.profile.weight) || null; }

// Getränke von Vortag bis Folgetag als absolute Zeitpunkte
function alcDoses(iso, from = -1, to = 1) {
  const out = [];
  for (let o = from; o <= to; o++) {
    const d = addDays(iso, o);
    for (const e of state.alcohol.log[d] || []) out.push({ t: caffAbs(d, e.min), g: alcGrams(e.ml, e.vol), fed: !!e.fed, id: e.id });
  }
  return out.sort((a, b) => a.t - b.t);
}
// Promille-Verlauf von t0 bis t1 (Stunden, absolut) in Schritten von dt; Start beim ersten Getränk
function alcSeries(doses, t0, t1, dt = 1 / 30) {
  const W = alcW(); const r = alcR(); const beta = state.alcohol.beta || 0.15;
  const out = [];
  if (!W || !doses.length) { for (let t = t0; t <= t1 + 1e-9; t += dt) out.push([t, 0]); return out; }
  const h = 1 / 60; // feste Rechenschrittweite 1 min, Aufnahme je Schritt exakt integriert
  const absorbed = (a, b) => doses.reduce((s, d) => {
    const ka = d.fed ? 1.5 : 4, def = d.fed ? 0.2 : 0.1;
    const F = (x) => (x <= d.t ? 0 : 1 - Math.exp(-ka * (x - d.t)));
    return s + d.g * (1 - def) * (F(b) - F(a));
  }, 0);
  let t = Math.min(t0, doses[0].t), c = 0, next = t0;
  while (next <= t1 + 1e-9) {
    while (t + h <= next + 1e-9) { c = Math.max(0, c + absorbed(t, t + h) / (r * W) - beta * h); t += h; }
    out.push([next, c]); next += dt;
  }
  return out;
}
function alcLevelAt(doses, t) { const s = alcSeries(doses, t, t); return s.length ? s[0][1] : 0; }
// Zeitpunkt, ab dem wieder ~0,0 ‰ (unter 0,01) – auf 5 min gerundet
function alcSober(doses, from) {
  const s = alcSeries(doses, from, from + 36, 1 / 12);
  let last = null; s.forEach(([t, c]) => { if (c >= 0.01) last = t; });
  return last == null ? null : Math.ceil((last + 1 / 12) * 12) / 12;
}
// Hat man in den 3 h vor t etwas gegessen (≥ 100 kcal, kein Getränk)?
function alcFedAuto(iso, min) {
  if (typeof tlEntryTime !== 'function') return false;
  const h = min / 60;
  return (state.days[iso] || []).some((e) => !e.alcId && !e.cafId && !isLiq(e) && entryTotals(e).k >= 100 && (() => { const t = tlEntryTime(iso, e); return t <= h && t >= h - 3; })());
}

function alcSyncDiary(iso, ent) {
  const day = (state.days[iso] = (state.days[iso] || []).filter((x) => x.alcId !== ent.id));
  if (!ent.del && ent.kcal > 0) {
    const base = ent.ml > 0 ? ent.ml : 100;
    day.push({ id: uid(), alcId: ent.id, meal: 'snack', grams: base, ref: 'alc:' + ent.id, src: 'alc', n: ent.n, brand: '', liq: true,
      t: `${String(Math.floor(ent.min / 60)).padStart(2, '0')}:${String(ent.min % 60).padStart(2, '0')}`,
      k: ent.kcal * 100 / base, p: 0, c: 0, f: 0, fi: 0, su: 0, fs: 0 });
  }
  if (!day.length) delete state.days[iso];
}

/* ---------- Diagramm ---------- */
function alcChartSvg(o) {
  const { iso, doses, plan, nowH, h: H = 140 } = o;
  const W = 326, top = 8, bot = H - 16;
  const t0 = caffAbs(iso, 360), t1 = t0 + 24;
  const sb = alcSeries(doses, t0, t1, 0.1), sp = plan ? alcSeries(plan, t0, t1, 0.1) : null;
  const peak = Math.max(0, ...sb.map((x) => x[1]), ...(sp ? sp.map((x) => x[1]) : []));
  const mx = Math.max(0.6, peak * 1.15);
  const x = (t) => ((t - t0) / 24) * W, y = (v) => bot - (Math.min(v, mx) / mx) * (bot - top);
  const path = (s, a = t0, b = t1) => s.filter(([t]) => t >= a - 1e-9 && t <= b + 1e-9).map(([t, v], i) => `${i ? 'L' : 'M'} ${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const { bed, wake } = caffBedWake(state.caffeine, iso);
  let svg = `<svg class="cchart alc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Geschätzter Blutalkohol von 6 Uhr bis 6 Uhr am Folgetag">
    <defs><linearGradient id="${o.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"></stop><stop offset="1" class="s1"></stop></linearGradient></defs>`;
  if (bed < t1) { const bx = Math.max(0, x(bed)), wx = x(Math.min(wake, t1)); svg += `<rect class="sleep" x="${bx.toFixed(1)}" y="${top - 2}" width="${(wx - bx).toFixed(1)}" height="${bot - top + 2}" rx="8"></rect><text class="lab sl" x="${(bx + 6).toFixed(1)}" y="${top + 10}">Schlaf</text>`; }
  svg += `<line class="thr" x1="0" x2="${W}" y1="${y(0.5).toFixed(1)}" y2="${y(0.5).toFixed(1)}"></line><text class="lab" x="2" y="${(y(0.5) - 4).toFixed(1)}">0,5 ‰</text>`;
  const inRange = nowH != null && nowH >= t0 && nowH <= t1;
  const d = path(sb);
  svg += `<path class="area" d="${d} L ${x(t1).toFixed(1)} ${bot} L 0 ${bot} Z" fill="url(#${o.id})"></path><path class="line ${plan ? 'base' : ''}" d="${d}"></path>`;
  if (sp) svg += `<path class="line plan" d="${path(sp)}"></path>`;
  if (inRange) {
    const ny = y(alcLevelAt(plan || doses, nowH));
    svg += `<line class="now" x1="${x(nowH).toFixed(1)}" x2="${x(nowH).toFixed(1)}" y1="${top - 2}" y2="${bot}"></line><circle class="dot" cx="${x(nowH).toFixed(1)}" cy="${ny.toFixed(1)}" r="5"></circle>`;
  }
  [['6', 0, 'start'], ['12', 0.25, 'middle'], ['18', 0.5, 'middle'], ['24', 0.75, 'middle'], ['6', 1, 'end']].forEach(([t, f, a]) => { svg += `<text class="lab" x="${(f * W).toFixed(1)}" y="${H - 3}" text-anchor="${a}">${t}</text>`; });
  return svg + '</svg>';
}

/* ---------- Karte im Journal ---------- */
function alcCardHtml(iso) {
  const A = state.alcohol; if (!A.enabled) return '';
  const day = (A.log[iso] || []).slice().sort((a, b) => a.min - b.min);
  const isToday = iso === isoDate(new Date());
  if (!alcW()) {
    return `<div class="card caf alc"><div class="small muted">Alkohol</div><p class="small muted" style="margin:6px 0 10px">Für die Promille-Schätzung brauche ich dein Körpergewicht (Einstellungen → Schlaf &amp; Körper).</p><button class="btn block caf-add" data-alc-set>Körpergewicht eintragen</button></div>`;
  }
  const doses = alcDoses(iso);
  const nowH = isToday ? Date.now() / 36e5 : null;
  const grams = day.reduce((s, e) => s + alcGrams(e.ml, e.vol), 0);
  const t0 = caffAbs(iso, 360), ser = alcSeries(doses, t0, t0 + 24, 1 / 12);
  let pk = [t0, 0]; ser.forEach((p) => { if (p[1] > pk[1]) pk = p; });
  let big, cap, pill = '';
  if (isToday) {
    const now = alcLevelAt(doses, nowH); big = alcFmt(now); cap = '‰ jetzt';
    const sob = alcSober(doses, nowH);
    pill = sob && sob > nowH + 1 / 12 ? `<span class="caf-pill late">0,0 ‰ ab <strong>${caffFmt(sob, iso)}</strong></span>` : (grams ? '<span class="caf-pill ok">0,0 ‰</span>' : '');
  } else { big = alcFmt(pk[1]); cap = '‰ Maximum'; }
  const rows = day.map((e) => `<button class="caf-row" data-alc-entry="${esc(e.id)}"><span class="caf-time">${String(Math.floor(e.min / 60)).padStart(2, '0')}:${String(e.min % 60).padStart(2, '0')}</span>
      <span class="caf-name">${esc(e.n || 'Getränk')}<small class="muted"> · ${String(e.vol).replace('.', ',')} %${e.fed ? ' · mit Essen' : ''}</small></span>
      <span class="caf-mg"><strong>${r1(alcGrams(e.ml, e.vol))} g</strong><small>${isToday && caffAbs(iso, e.min) > nowH ? 'geplant' : 'Alkohol'}</small></span></button>`).join('');
  return `<div class="card caf alc">
    <div class="caf-head"><div><div class="small muted">Alkohol</div><div class="caf-big">${big}<span class="muted small"> ${cap}</span></div></div>${pill}</div>
    ${grams ? alcChartSvg({ id: 'ag-card', iso, doses, nowH }) : ''}
    ${grams ? `<div class="caf-stats">
      <div class="caf-stat"><span class="cs-l">${isToday ? 'Heute getrunken' : 'Getrunken'}</span><span class="cs-v">${r0(grams)}<small> g Alkohol</small></span><span class="cs-s">${day.length} ${day.length === 1 ? 'Getränk' : 'Getränke'}</span></div>
      <div class="caf-stat"><span class="cs-l">Höchstwert</span><span class="cs-v ${pk[1] >= 0.5 ? 'bad' : pk[1] >= 0.3 ? 'mid' : 'good'}">${alcFmt(pk[1])}<small> ‰</small></span><span class="cs-s">${pk[1] > 0 ? 'um ' + caffFmt(pk[0], iso) : ''}</span></div>
    </div>` : ''}
    ${rows ? `<div class="caf-list-day">${rows}</div>` : ''}
    <p class="small muted" style="margin:8px 0 0">Grobe Schätzung, keine Messung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.</p>
    <button class="btn block caf-add" data-alc-add>+ Getränk hinzufügen</button>
  </div>`;
}
function alcBindCard(iso) {
  const a = document.querySelector('[data-alc-add]'); if (a) a.onclick = () => openAlcohol(iso);
  const s = document.querySelector('[data-alc-set]'); if (s) s.onclick = () => { goTab('settings', 'Schlaf & Körper'); };
  document.querySelectorAll('[data-alc-entry]').forEach((b) => b.onclick = () => {
    const e = (state.alcohol.log[iso] || []).find((x) => x.id === b.dataset.alcEntry); if (e) openAlcohol(iso, e);
  });
}

/* ---------- Eingabe ---------- */
function openAlcohol(iso, entry) {
  const A = state.alcohol;
  const isToday = iso === isoDate(new Date());
  sheetMode = 'alcohol';
  let cat = 'beer';
  const nowRounded = () => { const d = new Date(Math.round(Date.now() / 300000) * 300000); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const minToHm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const startMin = entry ? entry.min : hmToMin(isToday ? nowRounded() : '20:00');
  let fed = entry ? !!entry.fed : alcFedAuto(iso, startMin);
  let fedTouched = !!entry;
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="aBack">‹ Zurück</button><span></span></div>
    <h1>${entry ? 'Eintrag bearbeiten' : 'Alkohol eintragen'}</h1>
    <div class="seg five" id="aCats">${ALC_CATS.map(([k, l]) => `<button type="button" data-c="${k}">${l}</button>`).join('')}</div>
    <div id="aList" class="caf-pick"></div>
    <label for="aName">Bezeichnung</label><input id="aName" type="text" value="${esc(entry ? entry.n : '')}" placeholder="z. B. Helles">
    <div class="row">
      <div><label for="aMl">Menge (ml)</label><input id="aMl" inputmode="decimal" value="${entry ? entry.ml : ''}"></div>
      <div><label for="aVol">Alkohol (Vol-%)</label><input id="aVol" inputmode="decimal" value="${entry ? String(entry.vol).replace('.', ',') : ''}"></div>
      <div><label for="aKc">kcal</label><input id="aKc" inputmode="decimal" value="${entry && entry.kcal != null ? entry.kcal : ''}"></div>
    </div>
    <label for="aTime">Uhrzeit</label><input id="aTime" type="time" value="${minToHm(startMin)}">
    ${isToday ? `<div class="chips portions" id="aWhen">${[['Jetzt', 0], ['vor 30 min', -30], ['vor 1 h', -60], ['+1 h', 60]].map(([l, m]) => `<button type="button" class="chip" data-add="${m}">${l}</button>`).join('')}</div>` : ''}
    <label>Magen</label>
    <div class="seg two" id="aFed"><button type="button" data-f="0">Nüchtern</button><button type="button" data-f="1">Mit / nach Essen</button></div>
    <p class="small muted" id="aFedHint" style="margin-top:4px"></p>
    <div class="card caf-prev" id="aPrev"></div>
    <button class="btn block" id="aSave"></button>
    ${entry ? '<div style="height:10px"></div><button class="btn danger block" id="aDel">Eintrag löschen</button>' : ''}`);
  const base = alcDoses(iso).filter((d) => !entry || d.id !== entry.id);
  const read = () => ({ ml: num($('#aMl').value), vol: num($('#aVol').value), kcal: num($('#aKc').value), tm: $('#aTime').value, name: $('#aName').value.trim() });
  const drawFed = () => {
    document.querySelectorAll('#aFed button').forEach((b) => b.classList.toggle('active', (+b.dataset.f === 1) === fed));
    $('#aFedHint').textContent = fedTouched ? '' : (fed ? 'Automatisch: In den 3 Stunden davor ist eine Mahlzeit im Journal.' : 'Automatisch: Keine Mahlzeit in den 3 Stunden davor im Journal.');
  };
  const preview = () => {
    const { ml, vol, tm } = read(); const box = $('#aPrev'); const btn = $('#aSave');
    if (!fedTouched && tm) { fed = alcFedAuto(iso, hmToMin(tm)); drawFed(); }
    if (!ml || vol == null || !tm) { box.innerHTML = '<p class="small muted" style="margin:0">Getränk wählen oder Menge und Vol-% eintragen.</p>'; btn.textContent = entry ? 'Speichern' : 'Eintragen'; return; }
    const g = alcGrams(ml, vol);
    btn.textContent = `${entry ? 'Speichern' : 'Eintragen'} · ${r1(g)} g Alkohol`;
    if (!alcW()) { box.innerHTML = '<p class="small muted" style="margin:0">Ohne Körpergewicht keine Promille-Vorschau (Einstellungen → Schlaf &amp; Körper).</p>'; return; }
    const tNew = caffAbs(iso, hmToMin(tm));
    const plan = base.concat([{ t: tNew, g, fed }]).sort((a, b) => a.t - b.t);
    const ser = alcSeries(plan, tNew, tNew + 24, 1 / 12); let pk = [tNew, 0]; ser.forEach((p) => { if (p[1] > pk[1]) pk = p; });
    const sob = alcSober(plan, tNew);
    box.innerHTML = `${alcChartSvg({ id: 'ag-prev', iso, doses: base, plan, nowH: isToday ? Date.now() / 36e5 : null, h: 108 })}
      <div class="small caf-note">Höchstwert ca. <strong>${alcFmt(pk[1])} ‰</strong> um ${caffFmt(pk[0], iso)}${sob ? ` · 0,0 ‰ ab <strong>${caffFmt(sob, iso)}</strong>` : ''}</div>`;
  };
  const drawList = () => {
    document.querySelectorAll('#aCats button').forEach((b) => b.classList.toggle('active', b.dataset.c === cat));
    const items = ALC_DRINKS.filter((d) => d.c === cat);
    $('#aList').innerHTML = cat === 'custom' ? '<p class="small muted" style="margin:0 0 4px">Eigenes Getränk: Menge, Vol-% (Etikett) und kcal unten eintragen.</p>'
      : items.map((d, i) => `<button type="button" class="caf-drink" data-i="${i}"><span>${esc(d.n)}</span><span class="muted small">${alcMl(d.ml)}</span><strong>${String(d.vol).replace('.', ',')} %</strong></button>`).join('');
    document.querySelectorAll('#aList .caf-drink').forEach((b) => b.onclick = () => {
      const d = items[+b.dataset.i];
      $('#aName').value = `${d.n} ${alcMl(d.ml)}`; $('#aMl').value = d.ml; $('#aVol').value = String(d.vol).replace('.', ','); $('#aKc').value = Math.round(d.ml * d.k100 / 100);
      document.querySelectorAll('#aList .caf-drink').forEach((x) => x.classList.toggle('on', x === b)); preview();
    });
  };
  document.querySelectorAll('#aCats button').forEach((b) => b.onclick = () => { cat = b.dataset.c; drawList(); });
  document.querySelectorAll('#aFed button').forEach((b) => b.onclick = () => { fed = b.dataset.f === '1'; fedTouched = true; drawFed(); preview(); });
  document.querySelectorAll('#aWhen .chip').forEach((b) => b.onclick = () => { const d = new Date(Date.now() + (+b.dataset.add) * 60000); $('#aTime').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; preview(); });
  ['aMl', 'aVol', 'aTime'].forEach((id) => { $('#' + id).oninput = preview; $('#' + id).onchange = preview; });
  $('#aBack').onclick = () => closeSheet();
  $('#aSave').onclick = () => {
    const { ml, vol, kcal, tm, name } = read();
    if (!ml || ml <= 0 || ml > 3000) { toast('Bitte eine Menge zwischen 1 und 3000 ml eingeben.'); return; }
    if (vol == null || vol < 0 || vol > 80) { toast('Bitte den Alkoholgehalt in Vol-% (0–80) eingeben.'); return; }
    if (!tm) { toast('Bitte eine Uhrzeit wählen.'); return; }
    if (kcal != null && (kcal < 0 || kcal > 3000)) { toast('Bitte kcal prüfen.'); return; }
    const vals = { min: hmToMin(tm), ml, vol, kcal: kcal != null ? kcal : Math.round(alcGrams(ml, vol) * 7), n: name || 'Alkohol', fed };
    const list = (A.log[iso] = A.log[iso] || []);
    let ent = entry && list.find((x) => x.id === entry.id);
    if (ent) Object.assign(ent, vals); else { ent = Object.assign({ id: uid() }, vals); list.push(ent); }
    alcSyncDiary(iso, ent);
    save(); toast(entry ? 'Gespeichert' : 'Eingetragen'); closeSheet();
  };
  const del = $('#aDel');
  if (del) del.onclick = () => {
    A.log[iso] = (A.log[iso] || []).filter((x) => x.id !== entry.id); if (!A.log[iso].length) delete A.log[iso];
    alcSyncDiary(iso, Object.assign({}, entry, { del: true }));
    save(); toast('Gelöscht'); closeSheet();
  };
  drawList(); drawFed(); preview();
}

/* ---------- Einstellungen ---------- */
function alcSettingsHtml() {
  const A = state.alcohol;
  const sx = state.profile.sex;
  return `<div class="card">
    <h2>Alkohol</h2>
    <label class="switch"><input type="checkbox" id="alOn" ${A.enabled ? 'checked' : ''}> Alkohol-Tracker im Journal anzeigen</label>
    <label for="alBeta">Abbau (‰ pro Stunde) ${infoBtn('alc')}</label><input id="alBeta" inputmode="decimal" value="${String(A.beta).replace('.', ',')}">
    <p class="small muted" style="margin-top:6px"><strong>Grobe Schätzung, keine Messung – nicht geeignet, um die Fahrtüchtigkeit zu beurteilen.</strong></p>
  </div>`;
}
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO; // Info-Texte (Blatt von unten), Anzeige in app.js
INFO.alc = () => {
  const sx = state.profile.sex;
  return { body: `<p>Abbau: im Mittel etwa 0,15 ‰ pro Stunde, Spanne etwa 0,10–0,20 (nüchtern eher niedriger, nach Essen höher).</p><p>Die kcal kommen ins Journal (Snacks); Alkohol zählt nicht zum Wasserzähler. Die DGE empfiehlt (2024), auf Alkohol zu verzichten; keine Menge ist risikofrei.</p>`,
    pts: [['Verteilungsfaktor r', `${(Math.round(alcR() * 100) / 100).toLocaleString('de-DE')} (${sx === 'm' ? 'Mann' : sx === 'f' ? 'Frau' : 'ohne Geschlecht'}${alcBmi() ? ', aus BMI ' + r1(alcBmi()) : ', fester Wert'})`], ['Körpergewicht', alcW() ? r1(alcW()) + ' kg' : 'fehlt'], ['Aufnahme', 'nüchtern schneller, mit Essen langsamer (Annahme)']],
    src: 'Widmark 1932 · Jones 2010 · Maudens 2014 · Fraser 1995 · DGE 2024' };
};
function alcSettingsBind() {
  const A = state.alcohol;
  $('#alOn').onchange = (ev) => { A.enabled = ev.target.checked; save(); };
  $('#alBeta').onchange = (ev) => {
    const v = num(ev.target.value);
    if (v == null || v < 0.05 || v > 0.35) { toast('Bitte einen Wert zwischen 0,05 und 0,35 ‰/h eingeben.'); ev.target.value = String(A.beta).replace('.', ','); return; }
    A.beta = Math.round(v * 100) / 100; save(); toast('Gespeichert');
  };
}
function alcSourcesHtml() {
  return `<p style="margin-top:10px"><strong style="color:var(--ink)">Alkohol</strong></p>
    <ul class="refs"><li>Widmark EMP (1932). Die theoretischen Grundlagen und die praktische Verwendbarkeit der gerichtlich-medizinischen Alkoholbestimmung.</li>
    <li>Jones AW (2010). Evidence-based survey of the elimination rates of ethanol from blood with applications in forensic casework. Forensic Sci Int 200(1–3):1–20. doi:10.1016/j.forsciint.2010.02.021</li>
    <li>Maudens KE et al. (2014). The influence of the body mass index on the volume of distribution of ethanol. Forensic Sci Int 243:74–78. doi:10.1016/j.forsciint.2014.04.036 (BMI-Formeln für r, n = 50; Korrelation r = 0,66 bzw. 0,78 – erklärt nur einen Teil der Streuung)</li>
    <li>Fraser AG et al. (1995). Inter-individual and intra-individual variability of ethanol concentration-time profiles: comparison of ethanol ingestion before or after an evening meal. Br J Clin Pharmacol 40(4):387–392. doi:10.1111/j.1365-2125.1995.tb04561.x</li>
    <li>DGE (2024). Positionspapier Alkohol (Pressemitteilung vom 15.08.2024).</li></ul>
    <p class="small muted">Annahmen ohne eigene Quelle: Aufnahmegeschwindigkeit (nüchtern ka 4/h, mit Essen 1,5/h) und Resorptionsdefizit (10 bzw. 20 %); Vol-% der Vorlagen aus dem BLS-Alkoholgehalt umgerechnet (1 ml ≈ 1 g).</p>`;
}

if (typeof module !== 'undefined') module.exports = { alcGrams, ALC_DRINKS };
