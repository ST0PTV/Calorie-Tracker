/* Timeline: Essenszeiten, Magen-Modell (grobe Schätzung) und Plan-Vorschlag für Uhrzeiten und Portionsgrößen.
   Alle Verdauungswerte sind Modellwerte, keine Messungen. Quellen siehe Einstellungen → Timeline. */

const TL_DEFAULT_TIMES = { breakfast: '08:00', lunch: '12:30', snack: '16:00', dinner: '19:00' };
const TL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];
const TL_LABEL = { breakfast: 'Frühstück', lunch: 'Mittagessen', snack: 'Snack', dinner: 'Abendessen' };
const TL_PRESETS = {
  balanced: { label: 'Ausgeglichen', split: { breakfast: 30, lunch: 30, snack: 15, dinner: 25 } },
  lunch: { label: 'Mittags am meisten', split: { breakfast: 20, lunch: 40, snack: 15, dinner: 25 } },
  morning: { label: 'Morgens am meisten', split: { breakfast: 40, lunch: 30, snack: 10, dinner: 20 } },
  evening: { label: 'Abends am meisten', split: { breakfast: 20, lunch: 30, snack: 10, dinner: 40 } },
  custom: { label: 'Eigene' },
};
const TL_DEFAULTS = () => ({ enabled: true, preset: 'balanced', split: Object.assign({}, TL_PRESETS.balanced.split), gap: 3, first: 1, times: {} });

function tlNormalize(d) {
  const t = Object.assign(TL_DEFAULTS(), d || {});
  t.split = Object.assign({}, TL_PRESETS.balanced.split, (d && d.split) || {});
  if (!t.times || typeof t.times !== 'object') t.times = {};
  if (!TL_PRESETS[t.preset]) t.preset = 'balanced';
  return t;
}

/* ---------- Zeiten ---------- */
const tlH = (hm) => { const [a, b] = String(hm).split(':').map(Number); return a + (b || 0) / 60; };
const tlHM = (h) => { const m = Math.round(((h % 24) + 24) % 24 * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const tlDe = (n) => fmt(n);
const tlDur = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`; };
function tlBed() { const b = tlH(state.caffeine.bed); return b < 12 ? b + 24 : b; } // Bettzeit nach Mitternacht → +24
function tlWake() { return tlH(state.caffeine.wake); }
// Anlegezeit eines Eintrags aus der ID (Date.now in Basis 36); nur verwendet, wenn sie am selben Tag liegt
function tlCreated(iso, e) {
  const ms = parseInt(String(e.id || '').slice(0, -5), 36);
  if (!ms || isNaN(ms)) return null;
  const d = new Date(ms);
  if (isoDate(d) !== iso) return null;
  return d.getHours() + d.getMinutes() / 60;
}
// Uhrzeit einer Mahlzeit: gesetzt → frühester Eintrag (gleicher Tag) → Standardzeit
function tlMealTime(iso, meal) {
  const set = (state.timeline.times[iso] || {})[meal];
  if (set) return { h: tlH(set), src: 'set' };
  const hs = (state.days[iso] || []).filter((e) => e.meal === meal && !e.t && !e.cafId).map((e) => tlCreated(iso, e)).filter((h) => h != null);
  if (hs.length) return { h: Math.min(...hs), src: 'auto' };
  return { h: tlH(TL_DEFAULT_TIMES[meal]), src: 'default' };
}
function tlEntryTime(iso, e) {
  if (e.t) return tlH(e.t);
  if (e.cafId) { const ce = (state.caffeine.log[iso] || []).find((x) => x.id === e.cafId); if (ce) return ce.min / 60; }
  const set = (state.timeline.times[iso] || {})[e.meal];
  if (set) return tlH(set);
  if (e.meal === 'snack') { const c = tlCreated(iso, e); if (c != null) return c; }
  return tlMealTime(iso, e.meal).h;
}
// Ereignisse: Einträge je Mahlzeit, die innerhalb von 20 min liegen, werden zusammengefasst
function tlEvents(iso) {
  const list = (state.days[iso] || []).map((e) => ({ e, h: tlEntryTime(iso, e), t: entryTotals(e) })).filter((x) => x.t.k > 0).sort((a, b) => a.h - b.h);
  const ev = [];
  list.forEach((x) => {
    const g = ev.find((v) => v.meal === x.e.meal && Math.abs(v.h - x.h) <= 1 / 3);
    const liq = isLiq(x.e) || !!x.e.cafId;
    if (g) { g.kcal += x.t.k; g.p += x.t.p; g.c += x.t.c; g.f += x.t.f; g.liq = g.liq && liq; g.names.push(x.e.n); g.ids.push(x.e.id); }
    else ev.push({ meal: x.e.meal, h: x.h, kcal: x.t.k, p: x.t.p, c: x.t.c, f: x.t.f, liq, names: [x.e.n], ids: [x.e.id] });
  });
  return ev.sort((a, b) => a.h - b.h);
}

/* ---------- Magen-Modell ----------
   Restanteil im Magen: 2^(-(t/T½)^2) (Potenz-Exponential-Form). Mit T½ = 1,75 h ergibt das für ~250 kcal
   nach 1/2/4 h ≈ 80/40/3 % – innerhalb der Normalwerte der Szintigrafie (Abell et al. 2008: 37–90 / 30–60 / 0–10 %).
   Größere und fettreichere Mahlzeiten → längeres T½ (Annahme, Größenordnung nicht belegt); Getränke T½ 0,4 h. */
function tlHalf(ev) {
  if (ev.liq) return 0.4 * tlSexF();
  const fs = ev.kcal ? (ev.f * 9) / ev.kcal : 0;
  return Math.min(4.5, Math.max(0.75, 1.75 * tlSexF() * Math.pow(Math.max(ev.kcal, 50) / 250, 0.3) * (1 + 0.5 * fs)));
}
// Frauen entleeren den Magen im Mittel langsamer (Datz 1987: Feststoffe T½ 92 vs. 60 min, n = 15/15;
// Caballero-Plasencia 1999, n = 200: langsamer, kein Zyklusphasen-Effekt). Bewusst gedämpfter Faktor 0,9 / 1,1,
// damit beide Kurven innerhalb der gemischtgeschlechtlichen Normalwerte (Abell 2008) bleiben.
function tlSexF() { const sx = typeof state !== 'undefined' && state.profile && state.profile.sex; return sx === 'm' ? 0.9 : sx === 'f' ? 1.1 : 1; }
function tlRemain(ev, t) { const dt = t - ev.h; return dt < 0 ? 0 : ev.kcal * Math.pow(2, -Math.pow(dt / tlHalf(ev), 2)); }
function tlStomach(evs, t) { return evs.reduce((s, ev) => s + tlRemain(ev, t), 0); }
function tlPhases(ev) { const s = ev.h + 1.82 * tlHalf(ev); return { stomachEnd: s, absorbEnd: s + (ev.liq ? 1 : 3) }; } // 90 % entleert; Darmphase grob +3 h

/* ---------- Plan-Vorschlag ---------- */
function tlWeight(iso) { return state.profile.weight || null; }
function tlPlan(iso) {
  const T = state.timeline, bed = tlBed(), wake = tlWake();
  const start = wake + T.first;
  let end = bed - T.gap; if (end < start + 1) end = start + 1;
  const meals = TL_ORDER.filter((m) => (T.split[m] || 0) > 0);
  const n = meals.length;
  const goal = goalsFor(iso).goal;
  const entries = state.days[iso] || [];
  const eatenBy = {}; TL_ORDER.forEach((m) => { eatenBy[m] = entries.filter((e) => e.meal === m).reduce((s, e) => s + entryTotals(e).k, 0); });
  const eatenAll = Object.values(eatenBy).reduce((a, b) => a + b, 0);
  const openShare = meals.filter((m) => !eatenBy[m]).reduce((s, m) => s + T.split[m], 0);
  const rest = goal ? Math.max(0, goal - eatenAll) : null;
  const w = tlWeight(iso);
  const items = meals.map((m, i) => {
    const h = n === 1 ? start : start + (end - start) * i / (n - 1);
    const target = goal ? goal * T.split[m] / 100 : null;
    const done = eatenBy[m] > 0;
    return { meal: m, h: Math.round(h * 2) / 2, target, done, eaten: eatenBy[m], rest: !done && rest != null && openShare ? rest * T.split[m] / openShare : null };
  });
  return { start, end, items, goal, eatenAll, rest, protein: w ? [0.4 * w, 0.55 * w] : null, weight: w };
}

/* ---------- Ansicht ---------- */
let tlMode = 'day';
const TL_T0 = 6, TL_T1 = 30;
const tlX = (h) => Math.max(0, Math.min(100, (h - TL_T0) / (TL_T1 - TL_T0) * 100));

function renderTimeline() {
  const iso = currentDate, today = isoDate(new Date()), isToday = iso === today;
  const now = new Date(), nowH = now.getHours() + now.getMinutes() / 60;
  const dt = new Date(iso + 'T12:00:00');
  const title = isToday ? 'Heute' : dt.toLocaleDateString('de-DE', { weekday: 'long' });
  const head = `<div class="topbar"><div><div class="sub">${esc(dt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))}</div><div class="day">Timeline</div></div>
    <div class="nav"><button class="icon-btn" id="tlPrev" aria-label="Vorheriger Tag">‹</button><button class="icon-btn" id="tlNext" aria-label="Nächster Tag">›</button></div></div>
    <div class="seg two" id="tlSeg"><button data-m="day" class="${tlMode === 'day' ? 'active' : ''}">${esc(title)}</button><button data-m="plan" class="${tlMode === 'plan' ? 'active' : ''}">Plan-Vorschlag</button></div>`;
  $('#view').innerHTML = head + (tlMode === 'day' ? tlDayHtml(iso, isToday, nowH) : tlPlanHtml(iso, isToday, nowH));
  $('#tlPrev').onclick = () => { currentDate = addDays(currentDate, -1); renderTimeline(); };
  $('#tlNext').onclick = () => { currentDate = addDays(currentDate, 1); renderTimeline(); };
  document.querySelectorAll('#tlSeg button').forEach((b) => b.onclick = () => { tlMode = b.dataset.m; renderTimeline(); });
  document.querySelectorAll('[data-tlmeal]').forEach((b) => b.onclick = () => tlTimeSheet(iso, b.dataset.tlmeal, () => renderTimeline()));
}

function tlGhosts(iso, isToday, nowH) {
  if (!isToday) return [];
  const p = tlPlan(iso);
  return p.items.filter((x) => !x.done && x.rest && x.h + 0.25 >= nowH).map((x) => ({ meal: x.meal, h: x.h, kcal: x.rest, p: x.rest * 0.2 / 4, c: x.rest * 0.5 / 4, f: x.rest * 0.3 / 9, liq: false, ghost: true, names: ['Vorschlag'] }));
}

function tlDayHtml(iso, isToday, nowH) {
  const evs = tlEvents(iso);
  const bed = tlBed(), wakeN = tlWake() + 24;
  if (!evs.length) {
    return `<div class="card"><p class="muted" style="margin:0">Für diesen Tag gibt es noch keine Einträge. Sobald du im Journal etwas einträgst, erscheint hier, wann du was gegessen hast und wie lange es ungefähr verdaut wird.</p></div>`;
  }
  const ghosts = tlGhosts(iso, isToday, nowH);
  const all = evs.concat(ghosts);
  const atBed = tlStomach(evs, bed), atBedPlan = tlStomach(all, bed);
  const last = evs[evs.length - 1].h, gapH = bed - last;
  const okGap = gapH >= state.timeline.gap;
  // Kurve
  const W = 340, H = 100, N = 180;
  const xs = (h) => (tlX(h) / 100 * W).toFixed(1);
  let mx = 1; const pts = [], gpts = [];
  for (let i = 0; i <= N; i++) { const t = TL_T0 + (TL_T1 - TL_T0) * i / N; const a = tlStomach(evs, t), g = tlStomach(all, t); mx = Math.max(mx, a, g); pts.push([t, a]); gpts.push([t, g]); }
  mx *= 1.15;
  const y = (v) => (H - v / mx * H).toFixed(1);
  const cut = isToday ? nowH : TL_T1;
  const solid = pts.filter(([t]) => t <= cut);
  const line = solid.map(([t, v]) => `${xs(t)},${y(v)}`).join(' ');
  const ghostLine = (ghosts.length || isToday) ? gpts.filter(([t]) => t >= cut - 0.01).map(([t, v]) => `${xs(t)},${y(v)}`).join(' ') : '';
  const xb = xs(bed), xw = xs(Math.min(wakeN, TL_T1));
  let svg = `<svg class="tl-curve" viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="Magen-Füllung im Tagesverlauf (Modell)">
    <rect x="${xb}" y="0" width="${(xw - xb).toFixed(1)}" height="${H}" class="tl-sleep"></rect>
    <line x1="${xb}" x2="${xb}" y1="0" y2="${H}" class="tl-bedline"></line><text x="${(+xb + 4).toFixed(1)}" y="11" class="tl-bedtxt">Bett ${esc(state.caffeine.bed)}</text>
    ${ghostLine ? `<polyline points="${ghostLine}" class="tl-ghost"></polyline>` : ''}
    ${solid.length ? `<polygon points="${xs(TL_T0)},${H} ${line} ${xs(solid[solid.length - 1][0])},${H}" class="tl-fill"></polygon><polyline points="${line}" class="tl-line"></polyline>` : ''}
    ${isToday ? `<line x1="${xs(nowH)}" x2="${xs(nowH)}" y1="0" y2="${H}" class="tl-now"></line>` : ''}
    <circle cx="${xb}" cy="${y(ghosts.length ? atBedPlan : atBed)}" r="4" class="tl-bedpt"></circle>
    ${[6, 9, 12, 15, 18, 21, 24, 27, 30].map((h) => `<text x="${xs(h)}" y="${H + 12}" text-anchor="middle">${h % 24}</text>`).join('')}
  </svg>`;
  // Balken
  const bars = all.map((ev) => {
    const ph = tlPhases(ev), x0 = tlX(ev.h), xm = tlX(ph.stomachEnd), xe = tlX(ph.absorbEnd);
    const lab = `${tlHM(ev.h)} ${ev.ghost ? 'Vorschlag ' + TL_LABEL[ev.meal] : TL_LABEL[ev.meal]} · ${fmt(ev.kcal)}`;
    return `<button class="tl-bar ${ev.ghost ? 'ghost' : ''}" ${ev.ghost ? 'disabled' : `data-tlmeal="${ev.meal}"`} aria-label="${esc(lab)} kcal – Uhrzeit ändern">
      <span class="st" style="left:${x0}%;width:${Math.max(1, xm - x0)}%"></span><span class="ab" style="left:${xm}%;width:${Math.max(0, xe - xm)}%"></span>
      <span class="lb" style="left:${Math.min(x0, 62)}%">${esc(lab)}</span></button>`;
  }).join('');
  const sleepL = tlX(bed);
  const card = `<div class="card tl-card">
    <div class="tl-top"><div><div class="small muted">Magen zur Bettzeit (Modell)</div><div class="tl-big">~${fmt(atBed)} <span>kcal</span></div>
      ${ghosts.length ? `<div class="small muted">mit Vorschlag: ~${fmt(atBedPlan)} kcal</div>` : ''}</div>
      <div class="tl-pill ${okGap ? 'ok' : 'warn'}">${gapH > 0 ? tlDur(gapH) : '0:00 h'} zwischen<br>Essen und Bett</div></div>
    ${svg}
    <div class="tl-bars"><span class="tl-bsleep" style="left:${sleepL}%"></span>${isToday ? `<span class="tl-bnow" style="left:${tlX(nowH)}%"></span>` : ''}${bars}</div>
    <div class="tl-leg small muted"><span><i class="c"></i>Magen-Füllung</span>${ghosts.length ? '<span><i class="g"></i>mit Vorschlag</span>' : ''}<span><i class="s"></i>im Magen</span><span><i class="a"></i>Aufnahme</span><span><i class="z"></i>Schlaf</span></div>
    <p class="small muted" style="margin:6px 0 0">Balken antippen, um die Uhrzeit zu ändern.</p>
  </div>`;
  // Kacheln
  const first = evs[0].h;
  let pause = 0, pFrom = null;
  for (let i = 1; i < evs.length; i++) { const d = evs[i].h - evs[i - 1].h; if (d > pause) { pause = d; pFrom = [evs[i - 1].h, evs[i].h]; } }
  const tiles = `<div class="tl-tiles">
    <div class="tile"><div class="small muted">${isToday ? 'Jetzt im Magen' : 'Zur Bettzeit'}</div><strong>~${fmt(isToday ? tlStomach(evs, nowH) : atBed)} kcal</strong><div class="small muted">Modell</div></div>
    <div class="tile"><div class="small muted">Essfenster</div><strong>${tlHM(first)}–${tlHM(last)}</strong><div class="small muted">${tlDur(last - first)}</div></div>
    <div class="tile"><div class="small muted">Längste Pause</div><strong>${pFrom ? tlDur(pause) : '–'}</strong><div class="small muted">${pFrom ? `${tlHM(pFrom[0])}–${tlHM(pFrom[1])}` : 'eine Mahlzeit'}</div></div></div>`;
  return card + tiles;
}

function tlPlanHtml(iso, isToday, nowH) {
  const p = tlPlan(iso);
  if (!p.goal) return `<div class="card"><p class="muted" style="margin:0">Für einen Vorschlag brauche ich ein Kalorienziel. Lege es in den Einstellungen unter „Tagesziel“ fest.</p></div>`;
  const maxT = Math.max(...p.items.map((x) => Math.max(x.target || 0, x.eaten || 0, x.rest || 0)), 1);
  const bars = p.items.map((x) => {
    const v = x.done ? x.eaten : (x.rest ?? x.target);
    return `<span class="tp-bar ${x.done ? 'done' : ''}" style="left:${tlX(x.h)}%;height:${Math.max(6, v / maxT * 100)}%"></span>`;
  }).join('');
  const win = `<div class="tp-win">
    <span class="tp-eat" style="left:${tlX(p.start)}%;width:${tlX(p.end) - tlX(p.start)}%">Essfenster ${tlHM(p.start)}–${tlHM(p.end)}</span>
    <span class="tp-sleep" style="left:${tlX(tlBed())}%"></span>
    ${isToday ? `<span class="tl-bnow" style="left:${tlX(nowH)}%"></span>` : ''}
    <div class="tp-bars">${bars}</div>
    <div class="tp-axis">${[6, 9, 12, 15, 18, 21, 24, 27, 30].map((h) => `<span style="left:${tlX(h)}%">${h % 24}</span>`).join('')}</div></div>`;
  const pr = p.protein ? `${r0(p.protein[0])}–${r0(p.protein[1])} g Eiweiß` : 'Eiweiß: Körpergewicht fehlt';
  const rows = p.items.map((x) => {
    const st = x.done ? `<span class="ok">✓ ${tlDe(x.eaten)} kcal</span>` : (x.rest != null ? `<strong class="acc">noch ~${tlDe(Math.round(x.rest / 10) * 10)} kcal</strong>` : '');
    return `<div class="tp-row"><span class="tp-time ${x.done ? '' : 'open'}">${tlHM(x.h)}</span>
      <div class="tp-name"><strong>${TL_LABEL[x.meal]}</strong><div class="small muted">Ziel ${tlDe(Math.round(x.target / 10) * 10)} kcal · ${pr}</div></div><div class="tp-st">${st}</div></div>`;
  }).join('');
  const T = state.timeline;
  const over = p.rest === 0 && p.eatenAll > p.goal;
  return `<div class="card"><div class="spread"><span class="small muted">Vorschlag für ${tlDe(p.goal)} kcal · Bett ${esc(state.caffeine.bed)}</span><span class="small acc">${p.items.length} Mahlzeiten</span></div>${win}</div>
    <div class="card tp-list">${rows}${over ? `<p class="small muted" style="margin:8px 0 0">Das Tagesziel ist schon erreicht (${tlDe(p.eatenAll)} kcal).</p>` : ''}</div>
    <div class="card"><h2 class="ct" style="margin-bottom:6px">So entsteht der Vorschlag</h2>
      <p class="small muted" style="margin:0;line-height:1.6">· Essfenster: ${T.first} h nach dem Aufstehen bis ${T.gap} h vor dem Schlafen, Mahlzeiten gleichmäßig verteilt<br>
      · Aufteilung ${TL_ORDER.map((m) => T.split[m] || 0).join(' / ')} % (${esc(TL_PRESETS[T.preset].label)}, in den Einstellungen änderbar)<br>
      · Eiweiß ≈ 0,4–0,55 g pro kg je Mahlzeit${p.weight ? ` (bei ${r1(p.weight)} kg)` : ''}<br>
      · Was schon gegessen ist, zählt; der Rest wird auf die offenen Mahlzeiten verteilt<br>
      Das ist eine Faustregel-Planung, keine belegte „beste“ Verteilung. Quellen in den Einstellungen unter „Timeline“.</p></div>`;
}

/* ---------- Uhrzeit einer Mahlzeit setzen ---------- */
function tlTimeSheet(iso, meal, done) {
  const cur = tlMealTime(iso, meal);
  const now = new Date(), nowH = now.getHours() + now.getMinutes() / 60, isToday = iso === isoDate(now);
  const auto = (state.days[iso] || []).filter((e) => e.meal === meal && !e.cafId).map((e) => tlCreated(iso, e)).filter((h) => h != null);
  const chips = [];
  if (isToday) chips.push(['Jetzt', nowH], ['vor 30 min', nowH - 0.5], ['vor 1 h', nowH - 1]);
  if (auto.length) chips.push([`Eintragszeit ${tlHM(Math.min(...auto))}`, Math.min(...auto)]);
  chips.push([`Standard ${TL_DEFAULT_TIMES[meal]}`, tlH(TL_DEFAULT_TIMES[meal])]);
  openSheet(`${sheetHead('back', 'Wann gegessen?', false)}<p class="muted" style="margin-top:-4px">${TL_LABEL[meal]}</p>
    <div class="chips" id="tlChips">${chips.map(([l, h], i) => `<button type="button" class="chip" data-i="${i}">${esc(l)}</button>`).join('')}</div>
    <label for="tlTime">Uhrzeit</label><input id="tlTime" type="time" value="${tlHM(cur.h)}">
    <p class="small muted">Gilt für die ganze Mahlzeit. Einzelne Einträge können im Eintrag eine eigene Uhrzeit bekommen.${cur.src === 'default' ? ' Bisher wird die Standardzeit verwendet.' : cur.src === 'auto' ? ' Bisher wird die Zeit des ersten Eintrags verwendet.' : ''}</p>
    <button class="btn block" id="tlSave">Speichern</button>
    ${cur.src === 'set' ? '<div style="height:10px"></div><button class="btn ghost block" id="tlReset">Automatisch (Eintragszeit)</button>' : ''}`);
  document.querySelectorAll('#tlChips [data-i]').forEach((b) => b.onclick = () => { $('#tlTime').value = tlHM(chips[+b.dataset.i][1]); });
  $('#back').onclick = () => closeSheet();
  $('#tlSave').onclick = () => {
    const v = $('#tlTime').value; if (!v) { toast('Bitte eine Uhrzeit wählen.'); return; }
    (state.timeline.times[iso] = state.timeline.times[iso] || {})[meal] = v;
    save(); closeSheet(); toast(`${TL_LABEL[meal]}: ${v} Uhr`); if (done) done();
  };
  const rs = $('#tlReset');
  if (rs) rs.onclick = () => { delete (state.timeline.times[iso] || {})[meal]; if (state.timeline.times[iso] && !Object.keys(state.timeline.times[iso]).length) delete state.timeline.times[iso]; save(); closeSheet(); if (done) done(); };
}

/* ---------- Einstellungen ---------- */
function tlSettingsHtml() {
  const T = state.timeline;
  return `<div class="card">
    <h2>Timeline</h2>
    <label class="switch"><input type="checkbox" id="tlOn" ${T.enabled ? 'checked' : ''}> Timeline-Tab und Uhrzeiten im Journal anzeigen</label>
    <label>Kalorien-Verteilung für den Plan-Vorschlag ${infoBtn('tlSplit')}</label>
    <div class="chips" id="tlPre">${Object.entries(TL_PRESETS).map(([k, p]) => `<button type="button" class="chip ${T.preset === k ? 'on' : ''}" data-p="${k}">${p.label}</button>`).join('')}</div>
    <div class="row four">${TL_ORDER.map((m) => `<div><label for="tlS_${m}">${TL_LABEL[m].replace('essen', '')} %</label><input id="tlS_${m}" inputmode="numeric" value="${T.split[m] || 0}" ${T.preset === 'custom' ? '' : 'disabled'}></div>`).join('')}</div>
    <p class="small muted" id="tlSum" style="margin-top:4px"></p>
    <div class="row">
      <div><label for="tlFirst">Erste Mahlzeit nach dem Aufstehen (h) ${infoBtn('tlWin')}</label><input id="tlFirst" inputmode="decimal" value="${r1(T.first)}"></div>
      <div><label for="tlGap">Letzte Mahlzeit vor dem Schlafen (h)</label><input id="tlGap" inputmode="decimal" value="${r1(T.gap)}"></div>
    </div>
  </div>`;
}
function tlSettingsBind(rerender) {
  const T = state.timeline;
  $('#tlOn').onchange = (ev) => { T.enabled = ev.target.checked; save(); tlTabbar(); };
  const sumTxt = () => { const s = TL_ORDER.reduce((a, m) => a + (T.split[m] || 0), 0); $('#tlSum').textContent = s === 100 ? `Summe 100 %` : `Summe ${s} % – bitte auf 100 % bringen`; $('#tlSum').style.color = s === 100 ? '' : 'var(--warn)'; };
  sumTxt();
  document.querySelectorAll('#tlPre [data-p]').forEach((b) => b.onclick = () => {
    T.preset = b.dataset.p;
    if (TL_PRESETS[T.preset].split) T.split = Object.assign({}, TL_PRESETS[T.preset].split);
    save(); rerender();
  });
  TL_ORDER.forEach((m) => { $(`#tlS_${m}`).onchange = (ev) => {
    const v = num(ev.target.value);
    if (v == null || v < 0 || v > 100) { toast('Bitte 0 bis 100 % eingeben.'); ev.target.value = T.split[m]; return; }
    T.split[m] = Math.round(v); save(); sumTxt();
  }; });
  const nums = (id, key, lo, hi) => { $(id).onchange = (ev) => { const v = num(ev.target.value); if (v == null || v < lo || v > hi) { toast(`Bitte ${lo} bis ${hi} h eingeben.`); ev.target.value = r1(T[key]); return; } T[key] = Math.round(v * 4) / 4; save(); toast('Gespeichert'); }; };
  nums('#tlFirst', 'first', 0, 4); nums('#tlGap', 'gap', 0, 6);
}
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO; // Info-Texte (Blatt von unten), Anzeige in app.js
INFO.sleep = { body: '<p>Bett- und Aufstehzeit gelten für Koffein (Pegel zur Bettzeit, Schlafzone) und die Timeline (Essfenster, Magen zur Bettzeit, Plan-Vorschlag).</p>' };
INFO.sex = { body: '<p>Das Geschlecht verfeinert die Promille-Schätzung und das Magen-Modell der Timeline (Frauen entleeren den Magen im Mittel langsamer) und passt den Eisen-Hinweis bei den Supplements an.</p><p>Kalorien-, Eiweiß-, Ballaststoff- und Zuckerziele sind laut den genutzten Quellen pro kg bzw. pro kcal für beide gleich. „Keine Angabe“ nutzt jeweils Mittelwerte.</p>', pts: [['Promille', 'Verteilungsfaktor 0,7 / 0,6 bzw. aus dem BMI'], ['Magen-Modell', 'Faktor 0,9 / 1,1'], ['Eisen-Hinweis', '11 mg / 14–16 mg pro Tag']], src: 'Datz 1987 · Caballero-Plasencia 1999 · Maudens 2014 · DGE 2024' };
INFO.weight = { body: '<p>Das Gewicht ist die Grundlage der Makroziele im Tagesziel. Bei einer Änderung werden sie ab heute neu berechnet; frühere Tage behalten ihre Werte.</p><p>Außerdem nutzt es die Timeline für Eiweiß pro Mahlzeit und der Alkohol-Tracker für die Promille-Schätzung.</p>' };
INFO.height = { body: '<p>Mit Gewicht und Größe ergibt sich der BMI. Daraus berechnet die App den Verteilungsfaktor für die Promille-Schätzung genauer als mit festen Werten.</p><p>Die Formel stammt aus einer Studie mit 50 Personen (BMI 16–36) und erklärt nur einen Teil der Unterschiede zwischen Menschen.</p>', src: 'Maudens 2014' };
INFO.tlSplit = { body: '<p>So verteilt der Plan-Vorschlag dein Kalorienziel auf Frühstück, Mittag, Snack und Abend. Snack auf 0 % = drei Mahlzeiten.</p><p>Eine belegte „beste“ Verteilung gibt es nicht: In einer Studie änderte viel Energie morgens statt abends nichts am Gewichtsverlust, aber das Hungergefühl.</p>', src: 'Ruddick-Collins 2022' };
INFO.tlWin = { body: '<p>Das Essfenster beginnt diese Zeit nach dem Aufstehen und endet mit dem Abstand vor dem Schlafen; dazwischen werden die Mahlzeiten gleichmäßig verteilt.</p><p>Die 3 h vor dem Schlafen stammen aus einer Leitlinie zur Refluxkrankheit (2–3 h); für Gesunde ist das eine Übertragung. Die Stunde nach dem Aufstehen ist eine Konvention.</p>', src: 'Katz 2022 (ACG)' };
function bodySettingsHtml() {
  const c = state.caffeine, w = state.profile.weight;
  return `<div class="card">
    <h2>Schlaf &amp; Körper</h2>
    <div class="row">
      <div><label for="bdBed">Bettzeit ${infoBtn('sleep')}</label><input id="bdBed" type="time" value="${esc(c.bed)}"></div>
      <div><label for="bdWake">Aufstehen</label><input id="bdWake" type="time" value="${esc(c.wake)}"></div>
    </div>
    <label>Geschlecht ${infoBtn('sex')}</label>
    <div class="seg three" id="bdSex">${[['m', 'Mann'], ['f', 'Frau'], ['', 'Keine Angabe']].map(([k, l]) => `<button type="button" data-sx="${k}" class="${(state.profile.sex || '') === k ? 'active' : ''}">${l}</button>`).join('')}</div>
    <div class="row">
      <div><label for="bdW">Körpergewicht (kg) ${infoBtn('weight')}</label><input id="bdW" inputmode="decimal" value="${w != null ? r1(w) : ''}" placeholder="z. B. 80"></div>
      <div><label for="bdH">Körpergröße (cm) ${infoBtn('height')}</label><input id="bdH" inputmode="numeric" value="${state.profile.height != null ? r0(state.profile.height) : ''}" placeholder="z. B. 180"></div>
    </div>
  </div>`;
}
function bodySettingsBind() {
  const c = state.caffeine;
  const time = (id, key, label) => { $(id).onchange = (ev) => { if (ev.target.value) { c[key] = ev.target.value; save(); toast(`${label} ${ev.target.value} Uhr`); } }; };
  time('#bdBed', 'bed', 'Bettzeit'); time('#bdWake', 'wake', 'Aufstehen');
  document.querySelectorAll('#bdSex [data-sx]').forEach((b) => b.onclick = () => {
    state.profile.sex = b.dataset.sx || null; save();
    document.querySelectorAll('#bdSex [data-sx]').forEach((x) => x.classList.toggle('active', x === b));
    toast('Gespeichert');
  });
  $('#bdH').onchange = (ev) => {
    if (ev.target.value.trim() === '') { state.profile.height = null; save(); return; }
    const v = num(ev.target.value);
    if (v == null || v < 120 || v > 230) { toast('Bitte eine Größe zwischen 120 und 230 cm eingeben.'); ev.target.value = state.profile.height != null ? r0(state.profile.height) : ''; return; }
    state.profile.height = Math.round(v); save(); toast('Größe gespeichert');
  };
  $('#bdW').onchange = (ev) => {
    const v = num(ev.target.value);
    if (ev.target.value.trim() === '') { state.profile.weight = null; save(); return; }
    if (v == null || v < 30 || v > 300) { toast('Bitte ein Gewicht zwischen 30 und 300 kg eingeben.'); ev.target.value = state.profile.weight != null ? r1(state.profile.weight) : ''; return; }
    const msg = applyProfileWeight(Math.round(v * 10) / 10); save(); toast(msg || 'Gewicht gespeichert'); if (typeof renderSettings === 'function' && msg) { const y = window.scrollY; renderSettings(); window.scrollTo(0, y); }
  };
}
function tlTabbar() {
  const b = document.querySelector('.tabbar [data-tab="timeline"]');
  if (b) b.hidden = !state.timeline.enabled;
  const tb = document.querySelector('.tabbar'); tb.classList.toggle('four', state.timeline.enabled); tb.classList.toggle('three', !state.timeline.enabled);
}

if (typeof module !== 'undefined') module.exports = { tlH, tlHM, tlHalf, tlRemain, tlPhases };
