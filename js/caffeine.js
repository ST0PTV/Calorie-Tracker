/* Koffein-Tracker – Rechenmodell, Karte im Tagebuch, Eingabe, Verlauf (Heatmap) und Einstellungen.
   Alle Daten bleiben lokal (state.caffeine). Das Modell steht oben und läuft auch ohne Browser (Tests mit Node). */
'use strict';

/* ---------- Rechenmodell ----------
   Ein-Kompartiment-Modell mit Aufnahme und Abbau erster Ordnung (so beschreiben es u. a. Seng et al. 2009):
     Menge im Körper(t) = D · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t)),  ke = ln 2 / Halbwertszeit.
   ka = 8 / h ergibt ein Maximum nach ca. 30–40 min bei Sofort-Aufnahme (Blanchard 1983: 30 min bei Lösung).
   Getrunken über X Minuten = die Dosis wird in 6 gleiche Teile über diese Zeit verteilt.
   Das Modell zeigt die Menge im Körper in mg, nicht die Plasmakonzentration; Körpergewicht, Mahlzeiten, Toleranz
   und Wechselwirkungen sind nicht berücksichtigt. */
const CAFF_KA = 8;
const CAFF_DEFAULTS = () => ({ enabled: true, track: true, bed: '23:00', wake: '07:00', halfLife: 5, threshold: 50, limit: 400, log: {} });

// Richtwerte für den Koffeingehalt. s: 'bfr' = aus BfR-Angaben abgeleitet, 'typ' = üblicher Wert (nicht belegt, bitte Packung prüfen)
const CAFF_CATS = [['coffee', 'Kaffee'], ['energy', 'Energy'], ['tea', 'Tee'], ['cola', 'Cola'], ['custom', 'Eigene']];
// ml = Portion; k100 = kcal pro 100 ml. kq: 'bls' = BLS 4.0, 'web' = nur eine Quelle (Red Bull, wikifit.de), nicht gegengeprüft
const CAFF_DRINKS = [
  { c: 'coffee', n: 'Filterkaffee', size: '200 ml', ml: 200, k100: 1, kq: 'bls', mg: 90, s: 'bfr' },
  { c: 'coffee', n: 'Espresso', size: '30 ml', ml: 30, k100: 2, kq: 'bls', mg: 60, s: 'typ' },
  { c: 'coffee', n: 'Doppelter Espresso', size: '60 ml', ml: 60, k100: 2, kq: 'bls', mg: 120, s: 'typ' },
  { c: 'energy', n: 'Energy Drink', size: '250 ml', ml: 250, k100: 45, kq: 'web', mg: 80, s: 'bfr' },
  { c: 'energy', n: 'Energy Drink', size: '330 ml', ml: 330, k100: 45, kq: 'web', mg: 105, s: 'bfr' },
  { c: 'energy', n: 'Energy Drink', size: '500 ml', ml: 500, k100: 45, kq: 'web', mg: 160, s: 'bfr' },
  { c: 'tea', n: 'Schwarztee', size: '200 ml', ml: 200, k100: 0, kq: 'bls', mg: 50, s: 'bfr' },
  { c: 'tea', n: 'Grüntee', size: '200 ml', ml: 200, k100: 0, kq: 'bls', mg: 30, s: 'typ' },
  { c: 'cola', n: 'Cola', size: '330 ml', ml: 330, k100: 41, kq: 'bls', mg: 33, s: 'bfr' },
  { c: 'cola', n: 'Cola', size: '500 ml', ml: 500, k100: 41, kq: 'bls', mg: 50, s: 'bfr' },
];
const cdKcal = (d) => Math.round(d.ml * d.k100 / 100);

// Wasser aus Koffein-Getränken (zählt zum Wasserzähler, wenn „tr“ gesetzt ist)
function caffWater(iso) {
  return ((state.caffeine.log[iso] || []).filter((x) => x.tr && x.ml > 0)).reduce((a, x) => a + x.ml, 0);
}
// Tagebucheintrag (kcal) zu einem Koffein-Eintrag anlegen/aktualisieren/entfernen
function caffSyncDiary(iso, ent) {
  const day = (state.days[iso] = (state.days[iso] || []).filter((x) => x.cafId !== ent.id));
  if (ent.tr && ent.kcal > 0) {
    const base = ent.ml > 0 ? ent.ml : 100;
    day.push({ id: uid(), cafId: ent.id, meal: 'snack', grams: base, ref: 'caff:' + ent.id, src: 'caff', n: ent.n, brand: '', liq: true,
      k: ent.kcal * 100 / base, p: 0, c: 0, f: 0, fi: 0, su: 0 });
  }
  if (!day.length) delete state.days[iso];
}


const hmToMin = (s) => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
// absolute Zeit in Stunden (lokale Uhrzeit des Tages iso + min Minuten)
function caffAbs(iso, min) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 0, min).getTime() / 36e5; }
function caffOne(D, t0, t, ke) {
  const dt = t - t0; if (dt <= 0) return 0;
  return D * CAFF_KA / (CAFF_KA - ke) * (Math.exp(-ke * dt) - Math.exp(-CAFF_KA * dt));
}
// doses: [{ t (abs. Stunden), mg, dur (Stunden) }]
function caffLevel(doses, t, ke) {
  let s = 0;
  for (const d of doses) {
    if (t <= d.t) continue;
    const n = d.dur > 0 ? 6 : 1;
    for (let i = 0; i < n; i++) s += caffOne(d.mg / n, d.t + (n > 1 ? d.dur * i / (n - 1) : 0), t, ke);
  }
  return s;
}
// Zeitpunkt, ab dem der Pegel dauerhaft unter thr bleibt (frühestens from); auf 5 min gerundet
function caffClear(doses, from, thr, ke) {
  let last = null;
  for (let t = from; t <= from + 48; t += 1 / 12) if (caffLevel(doses, t, ke) >= thr) last = t;
  return last == null ? from : Math.ceil((last + 1 / 12) * 12) / 12;
}
function caffDoses(caff, iso, from = -1, to = 1) {
  const out = [];
  for (let o = from; o <= to; o++) {
    const d = addDays(iso, o);
    for (const e of caff.log[d] || []) out.push({ t: caffAbs(d, e.min), mg: e.mg, dur: (e.dur || 0) / 60, id: e.id, n: e.n, date: d, min: e.min });
  }
  return out;
}
function caffBedWake(caff, iso) {
  const bm = hmToMin(caff.bed), wm = hmToMin(caff.wake);
  const bed = caffAbs(iso, bm + (bm < 720 ? 1440 : 0));
  let wake = caffAbs(iso, wm); let k = 0;
  while (wake <= bed && k++ < 3) wake = caffAbs(iso, wm + 1440 * k);
  return { bed, wake };
}
const caffKe = (caff) => Math.LN2 / (caff.halfLife || 5);
function caffFmt(h, refIso) {
  const d = new Date(Math.round(h * 3600000)); const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}${refIso && isoDate(d) !== refIso ? ' (Folgetag)' : ''}`;
}
const caffSum = (caff, iso) => (caff.log[iso] || []).reduce((a, e) => a + e.mg, 0);

/* ---------- Diagramm (Tagebuch-Karte und Vorschau) ---------- */
function caffChartSvg(o) {
  const { id, iso, doses, plan, nowH, ke, thr, bed, wake, h: H = 150, axis = true } = o;
  const W = 326, top = 8, bot = H - (axis ? 16 : 4);
  const t0 = caffAbs(iso, 360), t1 = t0 + 24;
  const ts = []; for (let t = t0; t <= t1 + 1e-9; t += 0.1) ts.push(t);
  const lb = ts.map((t) => caffLevel(doses, t, ke));
  const lp = plan ? ts.map((t) => caffLevel(plan, t, ke)) : null;
  const peak = Math.max(0, ...lb, ...(lp || []));
  const maxMg = Math.max(100, thr * 2, peak * 1.15);
  const x = (t) => ((t - t0) / 24) * W;
  const y = (mg) => bot - (Math.min(mg, maxMg) / maxMg) * (bot - top);
  const path = (arr, dl, a = t0, b = t1) => {
    let d = '';
    ts.forEach((t, i) => { if (t >= a - 1e-9 && t <= b + 1e-9) d += (d ? ' L ' : 'M ') + x(t).toFixed(1) + ' ' + y(arr[i]).toFixed(1); });
    const tail = b === t1 ? '' : ` L ${x(b).toFixed(1)} ${y(caffLevel(dl, b, ke)).toFixed(1)}`;
    return d + tail;
  };
  const inRange = nowH != null && nowH >= t0 && nowH <= t1;
  let svg = `<svg class="cchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'Koffeinverlauf von 6 Uhr bis 6 Uhr am Folgetag')}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="s0"></stop><stop offset="1" class="s1"></stop></linearGradient></defs>`;
  if (bed < t1) {
    const bx = Math.max(0, x(bed)), wx = x(Math.min(wake, t1));
    svg += `<rect class="sleep" x="${bx.toFixed(1)}" y="${top - 2}" width="${(wx - bx).toFixed(1)}" height="${bot - top + 2}" rx="8"></rect><text class="lab sl" x="${(bx + 6).toFixed(1)}" y="${top + 10}">Schlaf</text>`;
  }
  svg += `<line class="thr" x1="0" x2="${W}" y1="${y(thr).toFixed(1)}" y2="${y(thr).toFixed(1)}"></line><text class="lab" x="2" y="${(y(thr) - 4).toFixed(1)}">${r0(thr)} mg</text>`;
  const mainArr = lb;
  if (inRange) {
    const pastD = path(mainArr, doses, t0, nowH);
    svg += `<path class="area" d="${pastD} L ${x(nowH).toFixed(1)} ${bot} L 0 ${bot} Z" fill="url(#${id})"></path>`;
    svg += `<path class="line ${plan ? 'base' : ''}" d="${pastD}"></path>`;
    svg += `<path class="line fut ${plan ? 'base' : ''}" d="${path(mainArr, doses, nowH, t1)}"></path>`;
  } else {
    const d = path(mainArr, doses);
    svg += `<path class="area" d="${d} L ${x(t1).toFixed(1)} ${bot} L 0 ${bot} Z" fill="url(#${id})"></path><path class="line ${plan ? 'base' : ''}" d="${d}"></path>`;
  }
  if (plan) svg += `<path class="line plan" d="${path(lp, plan)}"></path>`;
  if (inRange) {
    const ny = y(caffLevel(plan || doses, nowH, ke));
    svg += `<line class="now" x1="${x(nowH).toFixed(1)}" x2="${x(nowH).toFixed(1)}" y1="${top - 2}" y2="${bot}"></line><circle class="dot" cx="${x(nowH).toFixed(1)}" cy="${ny.toFixed(1)}" r="5"></circle>`;
  }
  if (axis) {
    [['6', 0, 'start'], ['12', 0.25, 'middle'], ['18', 0.5, 'middle'], ['24', 0.75, 'middle'], ['6', 1, 'end']]
      .forEach(([t, f, a]) => { svg += `<text class="lab" x="${(f * W).toFixed(1)}" y="${H - 3}" text-anchor="${a}">${t}</text>`; });
  }
  return svg + '</svg>';
}

/* ---------- Karte im Tagebuch (Design K1) ---------- */
function caffCardHtml(iso) {
  const c = state.caffeine; if (!c.enabled) return '';
  const ke = caffKe(c), thr = c.threshold;
  const doses = caffDoses(c, iso);
  const isToday = iso === isoDate(new Date());
  const nowH = isToday ? Date.now() / 36e5 : null;
  const { bed, wake } = caffBedWake(c, iso);
  const day = (c.log[iso] || []).slice().sort((a, b) => a.min - b.min);
  const total = caffSum(c, iso);
  const bedLvl = caffLevel(doses, bed, ke);
  let big, cap, pill = '';
  if (isToday) {
    big = r0(caffLevel(doses, nowH, ke)); cap = 'jetzt im Körper';
    const clr = caffClear(doses, nowH, thr, ke);
    if (clr <= nowH + 1 / 12) pill = `<span class="caf-pill ok">unter ${r0(thr)} mg</span>`;
    else pill = `<span class="caf-pill ${clr <= bed ? 'ok' : 'late'}">unter ${r0(thr)} mg ab <strong>${caffFmt(clr, iso)}</strong></span>`;
  } else { big = r0(total); cap = 'mg an diesem Tag'; }
  const over = total > c.limit;
  const rows = day.map((e) => {
    const left = isToday ? caffLevel([{ t: caffAbs(iso, e.min), mg: e.mg, dur: (e.dur || 0) / 60 }], nowH, ke) : null;
    const pct = left == null ? 0 : Math.min(100, (left / e.mg) * 100);
    const future = isToday && caffAbs(iso, e.min) > nowH;
    return `<button class="caf-row" data-caf-entry="${esc(e.id)}"><span class="caf-time">${String(Math.floor(e.min / 60)).padStart(2, '0')}:${String(e.min % 60).padStart(2, '0')}</span>
      <span class="caf-name">${esc(e.n || 'Koffein')}<span class="caf-bar"><i style="width:${pct.toFixed(0)}%"></i></span></span>
      <span class="caf-mg"><strong>${r0(e.mg)} mg</strong><small>${future ? 'geplant' : left != null ? `noch ${r0(left)} mg` : ''}</small></span></button>`;
  }).join('');
  return `<div class="card caf">
    <div class="caf-head">
      <div><div class="small muted">Koffein</div><div class="caf-big">${big}<span class="muted small"> ${cap}</span></div></div>
      ${pill}
    </div>
    ${caffChartSvg({ id: 'cg-card', iso, doses, nowH, ke, thr, bed, wake })}
    <div class="caf-stats">
      <div class="caf-stat">
        <span class="cs-l">${isToday ? 'Heute aufgenommen' : 'Aufgenommen'}</span>
        <span class="cs-v ${over ? 'bad' : ''}">${r0(total)}<small> / ${r0(c.limit)} mg</small></span>
        <span class="cs-bar"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, total / c.limit * 100).toFixed(0)}%"></i></span>
        <span class="cs-s">${over ? `${r0(total - c.limit)} mg über dem Richtwert` : `${r0(Math.max(0, c.limit - total))} mg bis zum Richtwert`}</span>
      </div>
      <div class="caf-stat">
        <span class="cs-l">Zur Bettzeit (${esc(c.bed)})</span>
        <span class="cs-v ${bedLvl < thr ? 'good' : bedLvl < 2 * thr ? 'mid' : 'bad'}">${r0(bedLvl)}<small> mg</small></span>
        <span class="cs-bar"><i class="${bedLvl < thr ? 'ok' : bedLvl < 2 * thr ? 'mid' : 'over'}" style="width:${Math.min(100, bedLvl / (3 * thr) * 100).toFixed(0)}%"></i></span>
        <span class="cs-s">${bedLvl < thr ? `unter Ziel (${r0(thr)} mg)` : `Ziel ${r0(thr)} mg`}</span>
      </div>
    </div>
    ${rows ? `<div class="caf-list-day">${rows}</div>` : '<div class="small muted caf-empty">Noch nichts getrunken.</div>'}
    <button class="btn block caf-add" data-caf-add>+ Getränk hinzufügen</button>
  </div>`;
}
function caffBindCard(iso) {
  const a = document.querySelector('[data-caf-add]'); if (a) a.onclick = () => openCaffeine(iso);
  document.querySelectorAll('[data-caf-entry]').forEach((b) => b.onclick = () => {
    const e = (state.caffeine.log[iso] || []).find((x) => x.id === b.dataset.cafEntry); if (e) openCaffeine(iso, e);
  });
}

/* ---------- Eingabe (Design K2) ---------- */
function openCaffeine(iso, entry) {
  const c = state.caffeine, ke = caffKe(c), thr = c.threshold;
  const isToday = iso === isoDate(new Date());
  sheetMode = 'caffeine';
  let cat = 'coffee';
  const nowRounded = () => { const d = new Date(Math.round(Date.now() / 300000) * 300000); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const minToHm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  let dur = entry ? (entry.dur || 0) : 15;
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="cBack">‹ Zurück</button><span></span></div>
    <h1>${entry ? 'Eintrag bearbeiten' : 'Getränk hinzufügen'}</h1>
    <div class="seg five" id="cCats">${CAFF_CATS.map(([k, l]) => `<button type="button" data-c="${k}">${l}</button>`).join('')}</div>
    <div id="cList" class="caf-pick"></div>
    <div class="row">
      <div><label for="cName">Bezeichnung</label><input id="cName" type="text" placeholder="z. B. Mate" value="${esc(entry ? entry.n : '')}"></div>
      <div><label for="cMg">Koffein (mg)</label><input id="cMg" inputmode="decimal" value="${entry ? entry.mg : ''}"></div>
    </div>
    <div class="row">
      <div><label for="cMl">Menge (ml)</label><input id="cMl" inputmode="decimal" value="${entry && entry.ml ? entry.ml : ''}"></div>
      <div><label for="cKc">Energie (kcal)</label><input id="cKc" inputmode="decimal" value="${entry && entry.kcal != null ? entry.kcal : ''}"></div>
    </div>
    <label class="switch"><input type="checkbox" id="cTr" ${(entry ? entry.tr : c.track) ? 'checked' : ''}> In Tagebuch (kcal) und Wasserzähler (ml) eintragen</label>
    <label for="cTime">Uhrzeit (spätere Zeit = Vorschau/Planung)</label>
    <input id="cTime" type="time" value="${entry ? minToHm(entry.min) : isToday ? nowRounded() : '08:00'}">
    ${isToday ? `<div class="chips portions" id="cWhen">${[['Jetzt', 0], ['+30 min', 30], ['+1 h', 60], ['+2 h', 120]].map(([l, m]) => `<button type="button" class="chip" data-add="${m}">${l}</button>`).join('')}</div>` : ''}
    <label>Getrunken über …</label>
    <div class="seg" id="cDur">${[['Sofort', 0], ['15 min', 15], ['30 min', 30], ['1 h', 60]].map(([l, m]) => `<button type="button" data-d="${m}">${l}</button>`).join('')}</div>
    <div class="card caf-prev" id="cPrev"></div>
    <button class="btn block" id="cSave"></button>
    ${entry ? '<div style="height:10px"></div><button class="btn danger block" id="cDel">Eintrag löschen</button>' : ''}`);

  const base = caffDoses(c, iso).filter((d) => !entry || d.id !== entry.id);
  const read = () => {
    const mg = num($('#cMg').value); const tm = $('#cTime').value;
    return { mg, min: tm ? hmToMin(tm) : null, name: $('#cName').value.trim() };
  };
  const preview = () => {
    const { mg, min } = read();
    const box = $('#cPrev'); const btn = $('#cSave');
    if (mg == null || mg <= 0 || min == null) { box.innerHTML = '<p class="small muted" style="margin:0">Getränk wählen oder mg eintragen – dann erscheint die Vorschau.</p>'; btn.textContent = entry ? 'Speichern' : 'Eintragen'; return; }
    btn.textContent = `${entry ? 'Speichern' : 'Eintragen'} · ${r0(mg)} mg`;
    const tNew = caffAbs(iso, min);
    const plan = base.concat([{ t: tNew, mg, dur: dur / 60 }]);
    const { bed, wake } = caffBedWake(c, iso);
    const nowH = isToday ? Date.now() / 36e5 : null;
    const b0 = caffLevel(base, bed, ke), b1 = caffLevel(plan, bed, ke);
    const clr = caffClear(plan, tNew, thr, ke);
    const dayTotal = caffSum(c, iso) - (entry ? entry.mg : 0) + mg;
    const col = b1 < thr ? 'good' : b1 < 2 * thr ? 'mid' : 'bad';
    const warns = [];
    if (mg > 200) warns.push('Einzeldosis über 200 mg (EFSA-Richtwert für Einzeldosen).');
    if (dayTotal > c.limit) warns.push(`Damit liegt der Tag bei ${r0(dayTotal)} mg – über deinem Richtwert von ${r0(c.limit)} mg.`);
    $('#cPrev').innerHTML = `${caffChartSvg({ id: 'cg-prev', iso, doses: base, plan, nowH, ke, thr, bed, wake, h: 112, label: 'Vorschau des Koffeinverlaufs mit dem neuen Getränk' })}
      <div class="small caf-note">Zur Bettzeit <strong class="${col}">${r0(b1)} mg</strong> statt ${r0(b0)} mg · unter ${r0(thr)} mg ab <strong>${caffFmt(clr, iso)}</strong></div>
      ${warns.map((w) => `<div class="small warn">${esc(w)}</div>`).join('')}`;
  };
  const drawList = () => {
    document.querySelectorAll('#cCats button').forEach((b) => b.classList.toggle('active', b.dataset.c === cat));
    const items = CAFF_DRINKS.filter((d) => d.c === cat);
    $('#cList').innerHTML = cat === 'custom'
      ? '<p class="small muted" style="margin:0 0 4px">Eigenes Getränk: Bezeichnung und Koffein-Menge unten eintragen (Packungsangabe).</p>'
      : items.map((d, i) => `<button type="button" class="caf-drink" data-i="${i}"><span>${esc(d.n)}</span><span class="muted small">${d.size}</span><strong>${d.mg} mg</strong>${d.s === 'typ' ? '<em title="üblicher Wert, nicht belegt">ca.</em>' : ''}</button>`).join('');
    document.querySelectorAll('.caf-drink').forEach((b) => b.onclick = () => {
      const d = items[+b.dataset.i];
      $('#cName').value = `${d.n} ${d.size}`; $('#cMg').value = d.mg; $('#cMl').value = d.ml; $('#cKc').value = cdKcal(d);
      document.querySelectorAll('.caf-drink').forEach((x) => x.classList.toggle('on', x === b));
      preview();
    });
  };
  const drawDur = () => document.querySelectorAll('#cDur button').forEach((b) => b.classList.toggle('active', +b.dataset.d === dur));
  document.querySelectorAll('#cCats button').forEach((b) => b.onclick = () => { cat = b.dataset.c; drawList(); });
  document.querySelectorAll('#cDur button').forEach((b) => b.onclick = () => { dur = +b.dataset.d; drawDur(); preview(); });
  document.querySelectorAll('#cWhen .chip').forEach((b) => b.onclick = () => {
    const d = new Date(Date.now() + (+b.dataset.add) * 60000);
    $('#cTime').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; preview();
  });
  ['cMg', 'cTime', 'cName'].forEach((id) => { $('#' + id).oninput = preview; $('#' + id).onchange = preview; });
  $('#cBack').onclick = () => closeSheet();
  $('#cSave').onclick = () => {
    const { mg, min, name } = read();
    if (mg == null || mg <= 0 || mg > 1000) { toast('Bitte eine Koffein-Menge zwischen 1 und 1000 mg eingeben.'); return; }
    if (min == null) { toast('Bitte eine Uhrzeit wählen.'); return; }
    const ml = num($('#cMl').value), kcal = num($('#cKc').value);
    if ((ml != null && (ml < 0 || ml > 3000)) || (kcal != null && (kcal < 0 || kcal > 2000))) { toast('Bitte Menge (0–3000 ml) und kcal (0–2000) prüfen.'); return; }
    const vals = { min, mg: Math.round(mg * 10) / 10, n: name || 'Koffein', dur, ml: ml || 0, kcal: kcal || 0, tr: $('#cTr').checked };
    const list = (c.log[iso] = c.log[iso] || []);
    let ent = entry && list.find((x) => x.id === entry.id);
    if (ent) Object.assign(ent, vals); else { ent = Object.assign({ id: uid() }, vals); list.push(ent); }
    caffSyncDiary(iso, ent);
    save(); toast(entry ? 'Gespeichert' : 'Eingetragen'); closeSheet();
  };
  const del = $('#cDel');
  if (del) del.onclick = () => {
    c.log[iso] = (c.log[iso] || []).filter((x) => x.id !== entry.id); if (!c.log[iso].length) delete c.log[iso];
    caffSyncDiary(iso, Object.assign({}, entry, { tr: false }));
    save(); toast('Gelöscht'); closeSheet();
  };
  drawList(); drawDur(); preview();
}

/* ---------- Verlauf: Balken (7/14 Tage) und Heatmap (30 Tage) ---------- */
let caffSel = null; // gewählter Tag (Index) in der Heatmap
function caffHeatColor(level, thr) {
  if (level < 1) return 'rgba(255,255,255,0.04)';
  const r = level / thr;
  if (r < 0.5) return 'rgba(226,179,107,0.20)';
  if (r < 1) return 'rgba(226,179,107,0.42)';
  if (r < 2) return 'rgba(226,179,107,0.68)';
  if (r < 3) return 'rgba(226,179,107,0.92)';
  return '#FF9A6B';
}
function caffDayInfo(c, iso, ke) {
  const doses = caffDoses(c, iso);
  const { bed } = caffBedWake(c, iso);
  const entries = (c.log[iso] || []);
  const last = entries.length ? Math.max(...entries.map((e) => e.min)) : null;
  return { iso, mg: caffSum(c, iso), n: entries.length, last, bedLvl: caffLevel(doses, bed, ke), tracked: entries.length > 0 || (state.days[iso] || []).length > 0, doses };
}
function caffHistoryHtml(days, range) {
  const c = state.caffeine; if (!c.enabled) return '';
  const ke = caffKe(c), thr = c.threshold;
  const info = days.map((d) => caffDayInfo(c, d, ke));
  const tr = info.filter((x) => x.tracked);
  const withC = info.filter((x) => x.n > 0);
  const avg = tr.length ? tr.reduce((s, x) => s + x.mg, 0) / tr.length : 0;
  const overDays = info.filter((x) => x.mg > c.limit).length;
  const avgLast = withC.length ? withC.reduce((s, x) => s + x.last, 0) / withC.length : null;
  const avgBed = withC.length ? withC.reduce((s, x) => s + x.bedLvl, 0) / withC.length : null;
  const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  let chart = '';
  if (range >= 30) {
    const n = info.length, W = 340, L = 26, top = 6, ch = 7, cw = (W - L) / n, H = top + 24 * ch + 18;
    const now = Date.now() / 36e5;
    const sel = caffSel == null ? n - 1 : Math.min(caffSel, n - 1);
    const bedH = Math.floor(((hmToMin(c.bed)) % 1440) / 60), wakeH = Math.ceil(hmToMin(c.wake) / 60);
    const sleepRow = (h) => (bedH >= wakeH ? (h >= bedH || h < wakeH) : (h >= bedH && h < wakeH));
    let cells = '';
    info.forEach((x, i) => {
      for (let h = 0; h < 24; h++) {
        const t = caffAbs(x.iso, h * 60 + 30);
        if (t > now) continue;
        const lv = caffLevel(x.doses, t, ke);
        cells += `<rect x="${(L + i * cw + 0.5).toFixed(1)}" y="${top + h * ch + 0.5}" width="${(cw - 1).toFixed(1)}" height="${ch - 1}" rx="1.5" fill="${caffHeatColor(lv, thr)}"></rect>`;
      }
    });
    let strip = ''; for (let h = 0; h < 24; h++) if (sleepRow(h)) strip += `<rect x="${L - 6}" y="${top + h * ch + 0.5}" width="3" height="${ch - 1}" rx="1" fill="#B9A6FF" fill-opacity="0.7"></rect>`;
    const hl = [0, 6, 12, 18].map((h) => `<text x="${L - 10}" y="${top + h * ch + 6}" text-anchor="end">${h}</text>`).join('');
    const dl = info.map((x, i) => (i % 5 === 0 || i === n - 1) ? `<text x="${(L + i * cw + cw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${new Date(x.iso + 'T12:00:00').getDate()}</text>` : '').join('');
    const hit = info.map((x, i) => `<rect class="hit" data-heat="${i}" x="${(L + i * cw).toFixed(1)}" y="${top}" width="${cw.toFixed(1)}" height="${24 * ch}" fill="transparent"></rect>`).join('');
    chart = `<svg class="heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Heatmap: Koffein im Körper je Stunde und Tag, ${n} Tage">
      ${strip}${hl}${cells}
      <rect x="${(L + sel * cw).toFixed(1)}" y="${top - 1}" width="${cw.toFixed(1)}" height="${24 * ch + 2}" rx="2" fill="none" stroke="#E8EEF7" stroke-width="1.2"></rect>
      ${dl}${hit}</svg>
      <div class="heat-legend small muted" aria-label="Legende in mg">${[[0, '0'], [0.25, `<${r0(thr / 2)}`], [0.75, `<${r0(thr)}`], [1.5, `<${r0(2 * thr)}`], [2.5, `<${r0(3 * thr)}`], [3, `≥${r0(3 * thr)}`]].map(([r, l]) => `<div><i style="background:${caffHeatColor(r * thr + (r ? 0.1 : 0), thr)}"></i><span>${l}</span></div>`).join('')}<span class="unit">mg</span></div>
      <p class="small muted" style="margin:4px 0 0">Koffein im Körper je Stunde (Modellwert). Lila Streifen: Schlafenszeit. Tippe auf einen Tag.</p>`;
    const s = info[sel];
    const lab = new Date(s.iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    chart += `<div class="heat-detail"><button class="btn ghost" data-heatnav="-1" aria-label="Vorheriger Tag">‹</button>
      <div class="hd"><strong>${esc(lab)} · ${r0(s.mg)} mg</strong><div class="small muted">${s.last != null ? `letztes Getränk ${hm(s.last)} · ` : ''}Pegel zur Bettzeit ${r0(s.bedLvl)} mg</div></div>
      <button class="btn ghost" data-heatnav="1" aria-label="Nächster Tag">›</button></div>`;
  } else {
    const n = info.length, W = 340, H = 176, pad = 22, bw = (W - pad) / n;
    const max = Math.max(c.limit * 1.15, ...info.map((x) => x.mg * 1.15), 1);
    const y = (v) => H - 18 - (v / max) * (H - 36);
    const bars = info.map((x, i) => {
      const bx = pad + i * bw;
      const lbl = `<text x="${bx + bw / 2}" y="${H - 4}" text-anchor="middle">${new Date(x.iso + 'T12:00:00').getDate()}</text>`;
      const val = x.mg > 0 ? `<text class="v" x="${bx + bw / 2}" y="${y(x.mg) - 4}" text-anchor="middle">${r0(x.mg)}</text>` : '';
      return `<rect class="b ${x.mg > c.limit ? 'over' : ''}" x="${bx + bw * 0.15}" y="${y(x.mg)}" width="${bw * 0.7}" height="${Math.max(0, H - 18 - y(x.mg))}" rx="3"></rect>${val}${lbl}`;
    }).join('');
    chart = `<svg class="cbars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Koffein in mg pro Tag"><line class="lim" x1="${pad}" x2="${W}" y1="${y(c.limit)}" y2="${y(c.limit)}"></line><text x="0" y="${y(c.limit) + 3}">${r0(c.limit)}</text>${bars}</svg>
      <div class="caf-nights"><div class="small muted">Pegel zur Bettzeit (${esc(c.bed)})</div><div class="caf-night-row">${info.map((x) => {
        const col = x.bedLvl < thr ? 'good' : x.bedLvl < 2 * thr ? 'mid' : 'bad';
        return `<div class="caf-night ${col}" title="${r0(x.bedLvl)} mg">${x.n || x.tracked ? r0(x.bedLvl) : '–'}</div>`;
      }).join('')}</div></div>`;
  }
  return `<div class="card caf-hist"><div class="spread"><h2>Koffein</h2><span class="small muted">Ø ${r0(avg)} mg pro Tag</span></div>${chart}</div>
    <div class="card">
      <div class="spread"><span class="muted">Ø Koffein pro erfasstem Tag</span><strong>${r0(avg)} mg</strong></div>
      <div class="spread"><span class="muted">Tage über ${r0(c.limit)} mg</span><strong>${overDays}</strong></div>
      <div class="spread"><span class="muted">Ø letztes Getränk</span><strong>${avgLast != null ? hm(avgLast) : '–'}</strong></div>
      <div class="spread"><span class="muted">Ø Pegel zur Bettzeit</span><strong>${avgBed != null ? r0(avgBed) + ' mg' : '–'}</strong></div>
      <p class="small muted" style="margin-top:8px">Gezählt werden Tage mit Koffein- oder Essenseinträgen; Tage ohne Eintrag bleiben außen vor. Die Pegel sind Modellwerte (Halbwertszeit ${r1(c.halfLife)} h), keine Messungen.</p>
    </div>`;
}
function caffHistoryBind(days, range, rerender) {
  document.querySelectorAll('[data-heat]').forEach((el) => el.onclick = () => { caffSel = +el.dataset.heat; rerender(); });
  document.querySelectorAll('[data-heatnav]').forEach((b) => b.onclick = () => {
    const cur = caffSel == null ? days.length - 1 : caffSel;
    caffSel = Math.max(0, Math.min(days.length - 1, cur + (+b.dataset.heatnav))); rerender();
  });
}

/* ---------- Einstellungen ---------- */
function caffSettingsHtml() {
  const c = state.caffeine;
  return `<div class="card">
    <h2>Koffein</h2>
    <label class="switch"><input type="checkbox" id="cfOn" ${c.enabled ? 'checked' : ''}> Koffein-Tracker anzeigen</label>
    <label class="switch"><input type="checkbox" id="cfTr" ${c.track ? 'checked' : ''}> Neue Getränke standardmäßig in Tagebuch (kcal) und Wasserzähler (ml) eintragen</label>
    <div class="row">
      <div><label for="cfBed">Bettzeit</label><input id="cfBed" type="time" value="${esc(c.bed)}"></div>
      <div><label for="cfWake">Aufstehen</label><input id="cfWake" type="time" value="${esc(c.wake)}"></div>
    </div>
    <div class="row">
      <div><label for="cfHl">Halbwertszeit (h)</label><input id="cfHl" inputmode="decimal" value="${r1(c.halfLife)}"></div>
      <div><label for="cfThr">Ziel zur Bettzeit (mg)</label><input id="cfThr" inputmode="numeric" value="${r0(c.threshold)}"></div>
    </div>
    <label for="cfLim">Richtwert pro Tag (mg)</label><input id="cfLim" inputmode="numeric" value="${r0(c.limit)}">
    <p class="small muted" style="margin-top:8px">Halbwertszeit: im Mittel etwa 5 Stunden, individuell aber sehr verschieden (in Studien 2,7 bis 9,9 h); bei Rauchern kürzer (ca. 3 statt 4,3 h). Passe den Wert an, wenn du Koffein erfahrungsgemäß schneller oder langsamer abbaust. Das Ziel zur Bettzeit ist eine <strong>Faustregel, kein belegter Grenzwert</strong>: Die EFSA nennt, dass schon 100 mg kurz vor dem Schlafen den Schlaf stören können; in einer Studie störten 400 mg sogar 6 Stunden vor dem Zubettgehen noch. Richtwert pro Tag: EFSA 400 mg für gesunde Erwachsene, 200 mg in der Schwangerschaft und Stillzeit.</p>
  </div>`;
}
function caffSettingsBind() {
  const c = state.caffeine;
  $('#cfTr').onchange = (ev) => { c.track = ev.target.checked; save(); };
  $('#cfOn').onchange = (ev) => { c.enabled = ev.target.checked; save(); };
  const time = (id, key, label) => { $(id).onchange = (ev) => { if (ev.target.value) { c[key] = ev.target.value; save(); toast(`${label} ${ev.target.value} Uhr`); } }; };
  time('#cfBed', 'bed', 'Bettzeit'); time('#cfWake', 'wake', 'Aufstehen');
  const nums = (id, key, lo, hi, unit, dec) => {
    $(id).onchange = (ev) => {
      const v = num(ev.target.value);
      if (v == null || v < lo || v > hi) { toast(`Bitte einen Wert zwischen ${lo} und ${hi} ${unit} eingeben.`); ev.target.value = dec ? r1(c[key]) : r0(c[key]); return; }
      c[key] = dec ? Math.round(v * 10) / 10 : Math.round(v); save(); toast('Gespeichert');
    };
  };
  nums('#cfHl', 'halfLife', 1.5, 12, 'h', true); nums('#cfThr', 'threshold', 10, 200, 'mg'); nums('#cfLim', 'limit', 50, 1000, 'mg');
}
const CAFF_REFS = [
  { text: 'EFSA NDA Panel (2015). Scientific Opinion on the safety of caffeine. EFSA Journal 13(5):4102.', doi: '10.2903/j.efsa.2015.4102' },
  { text: 'Drake C, Roehrs T, Shambroom J, Roth T (2013). Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med 9(11):1195–1200.', doi: '10.5664/jcsm.3170' },
  { text: 'Seng KY et al. (2009). Population pharmacokinetics of caffeine in healthy male adults using mixed-effects models. J Clin Pharm Ther 34(1):103–114.', doi: '10.1111/j.1365-2710.2008.00976.x' },
  { text: 'Blanchard J (1983). The absolute bioavailability of caffeine in man. Eur J Clin Pharmacol (Halbwertszeiten 2,7–9,9 h; Maximum nach ca. 30 min).' },
  { text: 'Bundesregierung: „Koffein: Die Dosis macht’s“ (nach BfR/EFSA) – Energy Drink ca. 80 mg je 250 ml, Gleichwerte für Kaffee, Tee und Cola.', url: 'https://www.bundesregierung.de/breg-de/aktuelles/koffein-die-dosis-machts-1649340' },
];
function caffSourcesHtml() {
  return `<p style="margin-top:10px"><strong style="color:var(--ink)">Koffein</strong></p><ul class="refs">${CAFF_REFS.map((r) => `<li>${esc(r.text)} ${r.doi ? `<a href="https://doi.org/${r.doi}" target="_blank" rel="noopener">doi:${esc(r.doi)}</a>` : r.url ? `<a href="${r.url}" target="_blank" rel="noopener">Link</a>` : ''}</li>`).join('')}
    <li>Koffeingehalte sind Richtwerte und schwanken je Sorte und Zubereitung; mit „ca.“ markierte Werte sind übliche Angaben ohne Beleg. Die Packungsangabe hat Vorrang.</li></ul>`;
}

if (typeof module !== 'undefined') module.exports = { caffLevel, caffClear, caffOne, CAFF_KA, hmToMin };
