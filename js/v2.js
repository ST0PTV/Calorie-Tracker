/* Version 2.0 – „Glas 2.0“ (Design-Portfolio vom 13.10.2026, Canvas-Boards UX1–UX11).
   Journal als Tagesverlauf, Plus-Knopf in der Tab-Leiste, Tracker-Kacheln, Wischgesten mit Rückgängig,
   Rückmeldung per Animation, Tagesabschluss, leerer Tag mit Begleiter, Analytics-Übersicht mit Detailseiten,
   Jahresansicht, Hell-Modus und Textgröße nach iPhone-Einstellung.
   Grundsatz bleibt: keine Belohnung für weniger Essen – der Begleiter reagiert nur aufs Eintragen. */
'use strict';

const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Darstellung: Hell/Dunkel und Textgröße ---------- */
function themeIsLight() {
  const t = state.theme || 'auto';
  return t === 'light' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
}
function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = state.theme || 'auto';
  const light = themeIsLight();
  root.classList.toggle('is-light', light);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = light ? '#F3F5F9' : '#0D1320';
}
if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch (e) { /* ältere Browser */ } }
/* Textgröße: Safari kennt die Schrift „-apple-system-body“, deren Größe der iPhone-Einstellung folgt (Standard 17 px).
   Daraus ein Faktor für die rem-Größen; begrenzt, damit Kacheln und Diagramme nicht zerfallen. */
function applyTextSize() {
  const p = document.createElement('span');
  p.style.cssText = 'position:absolute;visibility:hidden;font:-apple-system-body';
  document.documentElement.appendChild(p);
  const apple = p.style.font !== ''; // nur Safari/WebKit versteht die Angabe
  const px = parseFloat(getComputedStyle(p).fontSize) || 17;
  p.remove();
  const ts = apple ? Math.max(0.94, Math.min(1.24, px / 17)) : 1;
  document.documentElement.style.setProperty('--ts', ts.toFixed(3));
}

/* ---------- Tab-Leiste mit Plus in der Mitte ---------- */
function renderTabbar() {
  const nav = document.querySelector('.tabbar'); if (!nav) return;
  const b = (t, icon, label) => `<button type="button" data-tab="${t}">${ic(icon)}<span>${label}</span></button>`;
  nav.innerHTML = `${b('diary', 'journal', 'Journal')}${b('food', 'food', 'Essen')}<div class="tb-mid"><button type="button" class="tb-plus" id="plusBtn" aria-label="Eintragen">${ic('plus')}</button></div>${b('history', 'chart', 'Analytics')}${b('settings', 'person', 'Ich')}`;
  nav.querySelectorAll('[data-tab]').forEach((x) => x.addEventListener('click', () => {
    if (x.dataset.tab === 'history') histPage = null;
    if (x.dataset.tab === 'diary' && tab === 'diary') { currentDate = isoDate(new Date()); }
    goTab(x.dataset.tab);
  }));
  $('#plusBtn').onclick = openPlus;
}
function tabbarActive() {
  const map = { diary: 'diary', timeline: 'diary', food: 'food', history: 'history', settings: 'settings' };
  document.querySelectorAll('.tabbar [data-tab]').forEach((x) => x.classList.toggle('active', x.dataset.tab === map[tab]));
}

/* ---------- Kopf: Datum, Wochenleiste, Kalender ---------- */
const WD2 = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function dayHeaderHtml(iso) {
  const today = isoDate(new Date());
  const sub = new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const wd = (new Date(iso + 'T12:00:00').getDay() + 6) % 7, mon = addDays(iso, -wd);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i), logged = (state.days[d] || []).length > 0;
    days.push(`<button type="button" class="wk-d ${d === iso ? 'on' : ''} ${d === today ? 'today' : ''} ${d > today ? 'fut' : ''}" data-day="${d}" aria-label="${d}${logged ? ', eingetragen' : ''}"><span>${WD2[i]}</span><b>${+d.slice(8)}</b><i class="${logged ? 'dot' : ''}"></i></button>`);
  }
  return `<div class="topbar v2">
      <div><div class="sub">${esc(sub)}</div><div class="day">${esc(fmtDate(iso))}</div></div>
      <label class="icon-btn cal-btn" aria-label="Datum wählen">${ic('calendar')}<input type="date" id="dayPick" value="${iso}" max="${addDays(today, 7)}"></label>
    </div>
    <div class="wk" id="wkStrip">${days.join('')}</div>`;
}
function bindDayHeader(onDay) {
  document.querySelectorAll('#wkStrip [data-day]').forEach((b) => b.onclick = () => onDay(b.dataset.day));
  const p = $('#dayPick'); if (p) p.onchange = () => { if (/^\d{4}-\d{2}-\d{2}$/.test(p.value)) onDay(p.value); };
}

/* ---------- Tracker-Karten im Journal (Supplements, Wasser, Koffein, Alkohol) ----------
   Seit 2.2.0 wieder als ganze Karten wie in 1.x (Nutzerwunsch); die Kacheln aus 2.0 sind entfernt. */
const TK_ORDER = ['supp', 'water', 'caf', 'alc'];
function trackerCardsHtml(iso) {
  const fn = { water: waterCardHtml, caf: caffCardHtml, alc: alcCardHtml, supp: suppCardHtml };
  return TK_ORDER.map((k) => { const h = fn[k](iso); return h ? `<div class="tk-wrap" data-tkc="${k}">${h}</div>` : ''; }).join('');
}
function bindTrackerCards(iso, rerender) {
  // Bearbeiten-Blätter (z. B. Wasser-Eintrag) schließen beim Zurück; sonst nur das Journal neu zeichnen
  const rr = () => { if (!$('#sheet').hidden) closeSheet(); else rerender(); };
  bindWaterCard(iso, rr);
  caffBindCard(iso);
  alcBindCard(iso);
  suppBind(iso, rr);
}
// Zur Karte im Journal springen; nur wenn sie dort nicht steht, das Blatt öffnen (vermeidet doppelte IDs)
function showTracker(kind, iso) {
  const el = tab === 'diary' && currentDate === iso ? document.querySelector(`#view [data-tkc="${kind}"]`) : null;
  if (!el) { openTrackerSheet(kind, iso); return; }
  el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}
let pulseKey = null;
function pulse(k) { pulseKey = k; }
const TK_TITLE = { water: 'Wasser', caf: 'Koffein', supp: 'Supplements', alc: 'Alkohol' };
function openTrackerSheet(kind, iso, keepScroll) {
  sheetMode = 'tracker';
  const key = kind === 'water' ? 'water' : kind;
  if (kind !== 'supp') state.cardOpen = Object.assign({}, state.cardOpen, { [key]: true }); // im Blatt Details immer offen
  const html = { water: waterCardHtml, caf: caffCardHtml, alc: alcCardHtml, supp: suppCardHtml }[kind](iso);
  const y = keepScroll ? $('#sheet').scrollTop : 0;
  const empty = kind === 'supp' ? '<div class="card"><p class="muted">Heute ist kein Supplement fällig.</p><button type="button" class="btn secondary block" id="tkSet">Supplements einstellen</button></div>' : '';
  openSheet(`${sheetHead('tkBack', TK_TITLE[kind], false)}<div class="tk-sheet">${html || empty}</div>`);
  $('#sheet').scrollTop = y;
  $('#tkBack').onclick = closeSheet;
  const set = $('#tkSet'); if (set) set.onclick = () => { closeSheet(); goTab('settings', 'Supplements'); };
  const again = () => openTrackerSheet(kind, iso, true);
  if (kind === 'water') bindWaterCard(iso, again);
  else if (kind === 'caf') caffBindCard(iso);
  else if (kind === 'alc') alcBindCard(iso);
  else suppBind(iso, again);
}

/* ---------- Plus-Menü (Blatt von unten) ---------- */
function openPlus() {
  if (tab !== 'diary') { tab = 'diary'; render(); }
  closePlus();
  const meal = currentDate === isoDate(new Date()) ? mealByTime() : addMeal;
  addMeal = meal;
  const iso = currentDate, isToday = iso === isoDate(new Date());
  const quick = [];
  if (state.water.enabled) quick.push(['water', 'drop', 'Wasser', `+ ${fmt(state.water.step || 250)} ml`]);
  if (state.caffeine.enabled) quick.push(['caf', 'cup', 'Koffein', 'Kaffee, Tee …']);
  quick.push(['weight', 'scale', 'Gewicht', isToday ? 'heute' : 'gilt für heute']);
  if (state.supp.enabled) { const o = suppOpenItems(iso).length; quick.push(['supp', 'pill', 'Supplements', o ? `${o} offen` : 'alle erledigt']); }
  if (state.alcohol.enabled) quick.push(['alc', 'glass', 'Alkohol', 'Getränk']);
  quick.push(['quick', 'bolt', 'Schnell', 'nur kcal']);
  if ((state.meals || []).length) quick.push(['meal', 'pot', 'Mahlzeit', `${state.meals.length} gespeichert`]);
  const recent = state.recent.slice(0, 4).map(liveFood);
  const el = document.createElement('div');
  el.id = 'plusSheet';
  el.innerHTML = `<div class="info-back"></div><div class="info-panel plus-panel" role="dialog" aria-modal="true" aria-label="Eintragen"><div class="info-grip"></div>
    <div class="plus-top"><button type="button" class="plus-search" id="plSearch">${ic('search')}<span>Lebensmittel suchen</span></button>
      <button type="button" class="icon-btn plus-scan" id="plScan" aria-label="Barcode scannen">${ic('scan')}</button></div>
    <div><div class="plus-lab">Eintragen in${isToday ? ' · nach Uhrzeit gewählt' : ` · ${esc(fmtDate(iso))}`}</div>
      <div class="seg plus-meal" id="plMeal">${MEALS.map((m) => `<button type="button" data-pm="${m.id}" class="${m.id === meal ? 'active' : ''}">${ic(MEAL_ICON[m.id])}<span>${m.id === 'lunch' ? 'Mittag' : m.id === 'dinner' ? 'Abend' : m.id === 'snack' ? 'Snack' : m.label}</span></button>`).join('')}</div></div>
    <div class="plus-quick">${quick.map(([k, i, n, s]) => `<button type="button" class="pq pq-${k}" data-pq="${k}">${ic(i)}<b>${n}</b><span>${esc(s)}</span></button>`).join('')}</div>
    ${recent.length ? `<div><div class="plus-lab">Zuletzt verwendet</div><ul class="list plus-recent">${recent.map((f, i) => `<li data-pr="${i}">${foodBadge(f)}<div class="grow"><div class="nm">${esc(f.n)}</div><div class="meta">${f.lastGrams ? `zuletzt ${r1(f.lastGrams)} ${unitOf(f)}` : `${fmt(f.k)} kcal / 100 ${unitOf(f)}`}</div></div><div class="kc">${f.lastGrams ? fmt(per(f, f.lastGrams).k) : ''}</div></li>`).join('')}</ul></div>` : ''}
  </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  el.querySelector('.info-back').onclick = closePlus;
  el.querySelectorAll('[data-pm]').forEach((b) => b.onclick = () => { addMeal = b.dataset.pm; el.querySelectorAll('[data-pm]').forEach((x) => x.classList.toggle('active', x === b)); });
  $('#plSearch').onclick = () => { closePlus(); addTab = 'search'; addQuery = ''; openAdd(addMeal); };
  $('#plScan').onclick = () => { closePlus(); addTab = 'scan'; openAdd(addMeal); };
  el.querySelectorAll('[data-pr]').forEach((li) => li.onclick = () => { const f = recent[+li.dataset.pr]; closePlus(); addTab = 'search'; openAdd(addMeal); openAmount(f); });
  el.querySelectorAll('[data-pq]').forEach((b) => b.onclick = () => {
    const k = b.dataset.pq; closePlus();
    if (k === 'water') { const st = state.water.step || 250; waterAdd(iso, st); toast(`${fmt(st)} ml Wasser eingetragen`); pulse('water'); render(); }
    else if (k === 'caf') openCaffeine(iso);
    else if (k === 'alc') { if (alcW()) openAlcohol(iso); else showTracker('alc', iso); }
    else if (k === 'supp') showTracker('supp', iso);
    else if (k === 'weight') insOpenWeight(() => render());
    else if (k === 'quick') { addTab = 'search'; openQuick(addMeal); }
    else { addTab = 'search'; addQuery = ''; openAdd(addMeal); }
  });
}
function closePlus() { const el = document.getElementById('plusSheet'); if (el) el.remove(); }

/* ---------- Rückmeldung: Ring, Zahlen, neue Einträge ---------- */
const justAdded = new Set();
let heroPrev = null; // { iso, big, dash: [[dasharray, dashoffset], …] }
function heroAnimate(iso) {
  const ring = document.querySelector('#view .kring'); if (!ring) return;
  const segs = [...ring.querySelectorAll('circle.seg')];
  const key = (c) => [...c.classList].find((k) => k !== 'seg') || '';
  const now = segs.map((c) => [c.getAttribute('stroke-dasharray'), c.getAttribute('stroke-dashoffset')]);
  const mode = state.heroMode;
  const bigEl = ring.querySelector('.big'); const bigTxt = bigEl ? bigEl.textContent : '';
  const bigNum = parseInt(bigTxt.replace(/\./g, '').replace('−', '-'), 10);
  const prev = heroPrev && heroPrev.iso === iso ? heroPrev : null;
  const dashBy = {}; segs.forEach((c, i) => { dashBy[key(c)] = now[i]; });
  heroPrev = { iso, dash: dashBy, big: bigNum, mode };
  if (reduceMotion()) return;
  const L = (c) => (c.getAttribute('stroke-dasharray') || '0 0').split(' ')[1];
  // Startwerte: vorheriger Stand (gleicher Tag) bzw. leerer Ring beim ersten Öffnen
  segs.forEach((c, i) => {
    const from = prev && prev.dash[key(c)] ? prev.dash[key(c)] : [`0 ${L(c)}`, now[i][1]];
    c.style.transition = 'none'; c.setAttribute('stroke-dasharray', from[0]); c.setAttribute('stroke-dashoffset', from[1]);
  });
  // eslint-disable-next-line no-unused-expressions
  ring.getBoundingClientRect();
  requestAnimationFrame(() => segs.forEach((c, i) => { c.style.transition = ''; c.setAttribute('stroke-dasharray', now[i][0]); c.setAttribute('stroke-dashoffset', now[i][1]); }));
  if (prev && prev.mode === mode && bigEl && Number.isFinite(prev.big) && Number.isFinite(bigNum) && prev.big !== bigNum) countUp(bigEl, prev.big, bigNum);
}
function countUp(el, a, b, ms = 420) {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(a + (b - a) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Rückgängig ---------- */
let undoTimer = null;
function undoToast(msg, onUndo) {
  closeUndo();
  const el = document.createElement('div');
  el.id = 'undoToast'; el.className = 'undo-toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="ut-m">${esc(msg)}</span><button type="button" id="utBtn">${ic('undo')}Rückgängig</button><i class="ut-bar"></i>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('run'));
  $('#utBtn').onclick = () => { closeUndo(); onUndo(); };
  undoTimer = setTimeout(closeUndo, 5000);
}
function closeUndo() { clearTimeout(undoTimer); const el = document.getElementById('undoToast'); if (el) el.remove(); }

/* ---------- Wischen: Eintrag löschen (links) oder nochmal eintragen (rechts) ---------- */
function deleteEntry(iso, id) {
  const list = state.days[iso] || [];
  const e = list.find((x) => x.id === id); if (!e) return null;
  const idx = list.indexOf(e);
  const caf = (state.caffeine.log[iso] || []).find((x) => x.fe === id) || null;
  state.days[iso] = list.filter((x) => x.id !== id);
  caffSyncFood(iso, { id }); // verknüpften Koffein-Eintrag mit entfernen
  if (!state.days[iso].length) delete state.days[iso];
  save();
  return { e, idx, caf };
}
function restoreEntry(iso, snap) {
  const list = (state.days[iso] = state.days[iso] || []);
  list.splice(Math.min(snap.idx, list.length), 0, snap.e);
  if (snap.caf) (state.caffeine.log[iso] = state.caffeine.log[iso] || []).push(snap.caf); else caffSyncFood(iso, snap.e);
  save();
}
function duplicateEntry(iso, id) {
  const e = (state.days[iso] || []).find((x) => x.id === id); if (!e) return null;
  const ne = Object.assign({}, e, { id: uid() }); delete ne.t;
  state.days[iso].push(ne); caffSyncFood(iso, ne); save();
  return ne;
}
function bindEntrySwipe(iso, rerender) {
  document.querySelectorAll('#view .sw[data-sw]').forEach((row) => {
    const card = row.querySelector('.sw-c'); if (!card) return;
    let x0 = null, y0 = 0, dx = 0, lock = null, moved = false;
    const TH = 84;
    row.addEventListener('touchstart', (ev) => { const t = ev.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; lock = null; moved = false; card.style.transition = 'none'; }, { passive: true });
    row.addEventListener('touchmove', (ev) => {
      if (x0 == null) return;
      const t = ev.touches[0], ddx = t.clientX - x0, ddy = t.clientY - y0;
      if (!lock) { if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return; lock = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'; }
      if (lock !== 'x') return;
      ev.preventDefault(); moved = true;
      dx = Math.max(-140, Math.min(140, ddx));
      card.style.transform = `translateX(${dx}px)`;
      row.classList.toggle('arm-del', dx <= -TH); row.classList.toggle('arm-dup', dx >= TH);
      row.classList.toggle('show-del', dx < 0); row.classList.toggle('show-dup', dx > 0);
    }, { passive: false });
    const end = () => {
      if (x0 == null) return; x0 = null;
      card.style.transition = ''; card.style.transform = '';
      row.classList.remove('arm-del', 'arm-dup');
      setTimeout(() => row.classList.remove('show-del', 'show-dup'), 200);
      if (!moved) return;
      row.dataset.swiped = '1'; setTimeout(() => { delete row.dataset.swiped; }, 350);
      const id = row.dataset.sw;
      if (dx <= -TH) {
        const snap = deleteEntry(iso, id); if (!snap) return;
        rerender();
        undoToast(`${snap.e.n} gelöscht`, () => { restoreEntry(iso, snap); justAdded.add(snap.e.id); if (tab === 'diary') rerender(); else render(); });
      } else if (dx >= TH) {
        const ne = duplicateEntry(iso, id); if (!ne) return;
        justAdded.add(ne.id); rerender();
        undoToast(`${ne.n} nochmal eingetragen`, () => { deleteEntry(iso, ne.id); if (tab === 'diary') rerender(); else render(); });
      }
    };
    row.addEventListener('touchend', end); row.addEventListener('touchcancel', end);
  });
}
/* Tag wechseln per Wischen über die Seite (nicht über Einträge, Diagramme und Eingaben) */
function bindDaySwipe(onShift) {
  const v = $('#view');
  if (v.dataset.dswipe) return; v.dataset.dswipe = '1';
  let x0 = null, y0 = 0, t0 = 0;
  v.addEventListener('touchstart', (ev) => {
    if (tab !== 'diary' || ev.touches.length !== 1 || ev.target.closest('.sw, input, select, textarea, .hb-wrap, .cchart, svg, .wk')) { x0 = null; return; }
    x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  v.addEventListener('touchend', (ev) => {
    if (x0 == null || tab !== 'diary') return;
    const t = ev.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && Date.now() - t0 < 600) onShift(dx < 0 ? 1 : -1);
  }, { passive: true });
}

/* ---------- Journal: Tagesverlauf ---------- */
const MEAL_SHORT = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack' };
const closedMeals = new Set(); // zugeklappte Mahlzeiten (nur diese Sitzung)
function entryRowHtml(e) {
  const t = entryTotals(e);
  const meta = e.quick ? 'Schnelleintrag' : `${r1(e.grams)} ${unitOf(e)}`;
  const swipe = !e.cafId && !e.alcId;
  return `<div class="sw ${justAdded.has(e.id) ? 'just' : ''}" ${swipe ? `data-sw="${e.id}"` : ''}>
    ${swipe ? `<div class="sw-u del">${ic('trash')}<span>Löschen</span></div><div class="sw-u dup">${ic('copy')}<span>Nochmal</span></div>` : ''}
    <button type="button" class="sw-c entry2" data-entry="${e.id}">${foodBadge(e)}<span class="e2-t"><span class="e2-n">${esc(e.n)}</span><span class="e2-m">${meta}${e.t ? ` · ${esc(e.t)} Uhr` : ''}</span></span><span class="e2-k">${fmt(t.k)}</span></button></div>`;
}
function mealMacroStrip(list) {
  const t = sumEntries(list); const ek = [t.p * 4, t.c * 4, t.f * 9]; const sum = ek[0] + ek[1] + ek[2];
  if (!(sum > 0)) return '';
  const pc = ek.map((x) => Math.round(x / sum * 100));
  return `<div class="mm2"><div class="mm2-bar" role="img" aria-label="Energieanteile: Eiweiß ${pc[0]} %, Kohlenhydrate ${pc[1]} %, Fett ${pc[2]} %">${['p', 'c', 'f'].map((k, i) => `<i style="width:${(ek[i] / sum * 100).toFixed(1)}%;background:var(--${k})"></i>`).join('')}</div>
    <div class="mm2-l"><span>E ${r0(t.p)} g · ${pc[0]} %</span><span>KH ${r0(t.c)} g · ${pc[1]} %</span><span>F ${r0(t.f)} g · ${pc[2]} %</span></div></div>`;
}
function mealCardHtml(m, list) {
  const kcal = list.reduce((s, e) => s + entryTotals(e).k, 0);
  const open = !closedMeals.has(m.id);
  return `<div class="mcard ${list.some((e) => justAdded.has(e.id)) ? 'glow' : ''}">
    <div class="mc-h"><button type="button" class="mc-tg" data-toggle="${m.id}" aria-expanded="${open}"><span class="mc-n">${m.label}</span><span class="mc-k"><b>${fmt(kcal)}</b> kcal</span></button>
      <button type="button" class="mc-add" data-add="${m.id}" aria-label="Zu ${m.label} hinzufügen">${ic('plus')}</button></div>
    ${open ? `<div class="mc-b">${list.map(entryRowHtml).join('')}${mealMacroStrip(list)}<button type="button" class="linkbtn meal-save" data-msave="${m.id}">Als Mahlzeit speichern</button></div>`
    : `<div class="mc-sum">${esc(list.slice(0, 3).map((e) => e.n).join(', '))}${list.length > 3 ? ` +${list.length - 3}` : ''}</div>`}
  </div>`;
}
function tlRow(time, node, content, o = {}) {
  return `<div class="tlr ${o.cls || ''}"><button type="button" class="tlr-t" ${o.timeAttr || 'tabindex="-1"'}>${time}</button>
    <div class="tlr-r"><i class="tlr-l" style="${o.line ? `background:${o.line}` : ''}"></i><span class="tlr-n">${node}</span></div>
    <div class="tlr-c">${content}</div></div>`;
}
const dotN = (cls) => `<i class="tdot ${cls}"></i>`;
function chipHtml(kind, icon, text, sub, attr) {
  return `<button type="button" class="tchip c-${kind}" ${attr}>${ic(icon)}<span>${text}${sub ? `<em> · ${sub}</em>` : ''}</span></button>`;
}
function dayTimelineHtml(iso) {
  const today = isoDate(new Date()), isToday = iso === today;
  const now = new Date(), nowH = now.getHours() + now.getMinutes() / 60;
  const entries = state.days[iso] || [];
  const prevEntries = state.days[addDays(iso, -1)] || [];
  const rows = [];
  // Mahlzeiten (ohne Tracker-Getränke – die stehen als eigene Punkte im Verlauf)
  let nextGhost = null;
  for (const m of MEALS) {
    const list = entries.filter((e) => e.meal === m.id && !e.cafId && !e.alcId);
    const h = tlMealTime(iso, m.id).h;
    if (list.length) rows.push({ h, kind: 'meal', m, list });
    else rows.push({ h, kind: 'ghost', m, prev: prevEntries.filter((e) => e.meal === m.id && !e.cafId && !e.alcId) });
  }
  if (isToday) {
    const up = rows.filter((r) => r.kind === 'ghost' && r.m.id !== 'snack' && r.h + 1 >= nowH).sort((a, b) => a.h - b.h)[0];
    if (up) nextGhost = up.m.id;
  }
  // Koffein (ohne Einträge, die aus einem Lebensmittel stammen – die stehen in der Mahlzeit)
  if (state.caffeine.enabled) (state.caffeine.log[iso] || []).filter((e) => !e.fe && !String(e.id).startsWith('supp-')).forEach((e) => rows.push({ h: e.min / 60, kind: 'caf', e }));
  if (state.alcohol.enabled) (state.alcohol.log[iso] || []).forEach((e) => rows.push({ h: e.min / 60, kind: 'alc', e }));
  if (state.water.enabled) {
    const all = wEntries(iso), ws = all.filter((x) => x.min != null).sort((a, b) => a.min - b.min);
    const noTime = all.filter((x) => x.min == null); // für andere Tage nachgetragen: ohne Uhrzeit, ans Ende
    if (noTime.length) rows.push({ h: 23.98, kind: 'water', ml: noTime.reduce((a, x) => a + x.ml, 0), n: noTime.length, noTime: true });
    let g = null;
    ws.forEach((x) => { if (g && x.min - g.last <= 60) { g.ml += x.ml; g.n++; g.last = x.min; } else { g = { h: x.min / 60, kind: 'water', ml: x.ml, n: 1, last: x.min }; rows.push(g); } });
  }
  if (state.supp.enabled) {
    const groups = {};
    suppItemsFor(iso).forEach((x) => {
      const h = x.slot === 'time' ? tlH(x.time || '08:00') : tlMealTime(iso, x.slot).h + 0.01;
      const k = h.toFixed(2); (groups[k] = groups[k] || { h, kind: 'supp', items: [] }).items.push(x);
    });
    Object.values(groups).forEach((g) => rows.push(g));
  }
  rows.sort((a, b) => a.h - b.h || (a.kind === 'meal' ? -1 : 1));
  // Magen-Modell: Linie farbig, solange laut Modell noch nennenswert Essen im Magen ist
  const model = state.timeline.enabled;
  const evs = model ? tlEvents(iso) : [];
  const digest = (h) => model && tlStomach(evs, h) > 40;
  const out = [];
  let nowDone = !isToday;
  const nowRow = () => `<div class="tlr now"><span class="tlr-t">${tlHM(nowH)}</span><div class="tlr-r"><span class="tlr-n"><i class="tdot now"></i></span></div><div class="tlr-c"><i class="now-l"></i></div></div>`;
  rows.forEach((r, i) => {
    if (!nowDone && r.h > nowH) { out.push(nowRow()); nowDone = true; }
    const nextH = i + 1 < rows.length ? rows[i + 1].h : r.h + 1;
    const line = r.kind === 'ghost' ? '' : digest((r.h + Math.min(nextH, r.h + 2)) / 2 + 0.05) ? 'rgba(var(--accent-rgb), 0.55)' : '';
    const time = r.noTime ? '' : tlHM(r.h);
    if (r.kind === 'meal') {
      out.push(tlRow(time, ic(MEAL_ICON[r.m.id], 'acc'), mealCardHtml(r.m, r.list), { line, timeAttr: `data-mtime="${r.m.id}" aria-label="Uhrzeit ${r.m.label} ändern"` }));
    } else if (r.kind === 'ghost') {
      const prevK = r.prev.reduce((a, e) => a + entryTotals(e).k, 0);
      if (r.m.id === nextGhost) {
        out.push(tlRow(`~${time}`, dotN('open'), `<div class="ghost big"><div class="gh-h">${ic(MEAL_ICON[r.m.id])}<b>${r.m.label}</b><span>noch frei</span></div>
          <div class="gh-b"><button type="button" class="btn" data-add="${r.m.id}">Eintragen</button>${r.prev.length ? `<button type="button" class="btn secondary" data-copy="${r.m.id}">Wie gestern (${fmt(prevK)})</button>` : ''}</div></div>`, { cls: 'gh' }));
      } else {
        out.push(tlRow(isToday && r.h > nowH ? `~${time}` : '', dotN('open'), `<div class="ghost sm"><button type="button" class="gh-add" data-add="${r.m.id}">${ic(MEAL_ICON[r.m.id])}<span>${r.m.label}</span>${ic('plus', 'acc')}</button>${r.prev.length ? `<button type="button" class="gh-copy" data-copy="${r.m.id}">${ic('undo')}Wie gestern</button>` : ''}</div>`, { cls: 'gh' }));
      }
    } else if (r.kind === 'caf') {
      const de = r.e.tr && r.e.kcal > 0 ? `${r0(r.e.mg)} mg · ${fmt(r.e.kcal)} kcal` : `${r0(r.e.mg)} mg`;
      out.push(tlRow(time, dotN('caf'), chipHtml('caf', 'cup', esc(r.e.n || 'Koffein'), de, `data-tcaf="${esc(r.e.id)}"`), { line }));
    } else if (r.kind === 'alc') {
      out.push(tlRow(time, dotN('alc'), chipHtml('alc', 'glass', esc(r.e.n || 'Getränk'), `${r1(alcGrams(r.e.ml, r.e.vol))} g Alkohol`, `data-talc="${esc(r.e.id)}"`), { line }));
    } else if (r.kind === 'water') {
      out.push(tlRow(time, dotN('water'), chipHtml('water', 'drop', 'Wasser', `${(r.ml / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} l`, 'data-twater="1"'), { line }));
    } else if (r.kind === 'supp') {
      const done = r.items.filter((x) => suppTaken(iso, x.id));
      const all = done.length === r.items.length;
      out.push(tlRow(time, dotN(all ? 'supp' : 'supp open'), chipHtml(all ? 'supp' : 'supp open', 'pill', esc(r.items.map((x) => x.name.replace(/^Vitamin /, '')).join(', ')), all ? 'genommen' : `${done.length}/${r.items.length}`, 'data-tsupp="1"'), { line }));
    }
  });
  if (!nowDone) out.push(nowRow());
  if (model) {
    const bed = tlBed();
    const lvl = tlStomach(tlEvents(iso), bed);
    out.push(tlRow(tlHM(bed), dotN('bed'), `<button type="button" class="tbed" id="tlOpen">${ic('bed')}<span>Bett · Magen dann ≈ ${fmt(lvl)} kcal <em>(Modell)</em></span>${ic('chevR')}</button>`, { cls: 'bedrow' }));
  }
  const head = `<div class="tl2-h"><h2>Tagesverlauf</h2>${model ? `<button type="button" class="tl2-m" id="tlModel"><i></i>Magen-Modell</button>` : ''}</div>`;
  return `<div class="tl2">${head}${out.join('')}</div>`;
}
function bindDayTimeline(iso, rerender) {
  const v = $('#view');
  v.querySelectorAll('[data-tcaf]').forEach((b) => b.onclick = () => { const e = (state.caffeine.log[iso] || []).find((x) => x.id === b.dataset.tcaf); if (e) openCaffeine(iso, e); });
  v.querySelectorAll('[data-talc]').forEach((b) => b.onclick = () => { const e = (state.alcohol.log[iso] || []).find((x) => x.id === b.dataset.talc); if (e) openAlcohol(iso, e); });
  v.querySelectorAll('[data-twater]').forEach((b) => b.onclick = () => showTracker('water', iso));
  v.querySelectorAll('[data-tsupp]').forEach((b) => b.onclick = () => showTracker('supp', iso));
  const open = () => { tab = 'timeline'; render(); };
  const m = $('#tlModel'); if (m) m.onclick = open;
  const o = $('#tlOpen'); if (o) o.onclick = open;
  v.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = () => { const id = b.dataset.toggle; if (closedMeals.has(id)) closedMeals.delete(id); else closedMeals.add(id); rerender(); });
}

/* ---------- Tagesabschluss am Abend und leerer Tag ---------- */
function closingDue(iso) {
  if (iso !== isoDate(new Date()) || state.dayDone === iso) return false;
  const food = (state.days[iso] || []).filter((e) => !e.cafId && !e.alcId);
  if (!food.length) return false;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const bed = typeof tlBed === 'function' ? tlBed() : 23;
  return h >= Math.min(20, bed - 3);
}
function closingCardHtml(iso) {
  if (!closingDue(iso)) return '';
  const entries = state.days[iso] || [];
  const meals = MEALS.filter((m) => entries.some((e) => e.meal === m.id && !e.cafId && !e.alcId)).length;
  const tiles = [['food', 'acc', String(meals), meals === 1 ? 'Mahlzeit' : 'Mahlzeiten']];
  if (state.water.enabled) tiles.push(['drop', 'wat', `${(waterOf(iso) / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} l`, 'Wasser']);
  if (state.supp.enabled && suppItemsFor(iso).length) { const it = suppItemsFor(iso); tiles.push(['pill', 'sup', `${it.filter((x) => suppTaken(iso, x.id)).length} / ${it.length}`, 'Supplements']); }
  return `<div class="card close-card">
    <div class="cc-top">${state.companion !== false ? monsterSvg('awake', 92) : ''}<div><div class="small muted">Tagesabschluss</div><div class="cc-t">Tag eingetragen</div><div class="small muted">Danke fürs Dranbleiben – jeder eingetragene Tag hilft beim Überblick.</div></div></div>
    <div class="cc-tiles">${tiles.map(([i, c, v, l]) => `<div>${ic(i, c)}<b>${v}</b><span>${l}</span></div>`).join('')}</div>
    <div class="small muted" style="margin:2px 0 6px">Makro-Verteilung heute</div>${mealMacroStrip(entries)}
    <div class="cc-btns"><button type="button" class="btn secondary" id="ccMore">Noch etwas eintragen</button><button type="button" class="btn" id="ccDone">Fertig für heute</button></div></div>`;
}
function bindClosingCard(iso, rerender) {
  const d = $('#ccDone'); if (d) d.onclick = () => { state.dayDone = iso; save(); toast('Bis morgen!'); rerender(); };
  const m = $('#ccMore'); if (m) m.onclick = openPlus;
}
function emptyDayHtml(iso) {
  const today = isoDate(new Date());
  if (iso !== today || (state.days[iso] || []).some((e) => !e.cafId && !e.alcId) || !goalsFor(iso).goal) return '';
  const h = new Date().getHours();
  const hi = h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : 'Guten Abend';
  const meal = mealByTime(), lab = MEALS.find((m) => m.id === meal).label;
  const prev = (state.days[addDays(iso, -1)] || []).filter((e) => !e.cafId && !e.alcId);
  const prevNames = prev.slice(0, 2).map((e) => e.n).join(', ');
  return `<div class="card empty-day">${state.companion !== false ? monsterSvg('sleep', 120) : ''}
    <div class="ed-t">${hi}</div><p class="ed-p">Noch nichts eingetragen.${state.companion !== false ? ` ${esc(companionName())} wacht auf, sobald du loslegst.` : ''}</p>
    <button type="button" class="btn block" data-add="${meal}">${ic(MEAL_ICON[meal])}${lab} eintragen</button>
    ${prev.length ? `<button type="button" class="btn secondary block" id="copyDay">Wie gestern · ${esc(prevNames)}${prev.length > 2 ? ' …' : ''}</button>` : ''}</div>`;
}

/* ---------- Analytics: Übersicht mit Kacheln ---------- */
let anaRange = 7;
function sparkSvg(vals, cls) {
  const v = vals.filter((x) => x != null && Number.isFinite(x)); if (v.length < 2) return '<div class="sp-none"></div>';
  const lo = Math.min(...v), hi = Math.max(...v), rg = (hi - lo) || 1, W = 140, H = 34;
  const pts = []; vals.forEach((x, i) => { if (x != null && Number.isFinite(x)) pts.push([i / (vals.length - 1) * W, H - 3 - (x - lo) / rg * (H - 6)]); });
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
  return `<svg class="spark ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z"></path><path class="l" d="${d}"></path></svg>`;
}
function kcalBarsSvg(days) {
  const W = 300, H = 44, n = days.length; if (!n) return '';
  const mx = Math.max(...days.map((x) => Math.max(x.k, (x.goal || 0) * 1.1)), 1) * 1.05, bw = W / n;
  const y = (v) => H - v / mx * H;
  return `<svg class="kbars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${days.map((x, i) => {
    const band = x.goal ? `<rect class="band" x="${(i * bw).toFixed(1)}" y="${y(x.goal * 1.1).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(x.goal * 0.9) - y(x.goal * 1.1)).toFixed(1)}"></rect>` : '';
    return band + (x.n ? `<rect class="b ${x.st || ''}" x="${(i * bw + bw * 0.18).toFixed(1)}" y="${y(x.k).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${(H - y(x.k)).toFixed(1)}" rx="${Math.min(2, bw * 0.2).toFixed(1)}"></rect>` : '');
  }).join('')}</svg>`;
}
function anaTile(page, icon, cls, name, val, unit, sub, viz, wide) {
  return `<button type="button" class="an-tile ${wide ? 'wide' : ''}" data-page="${page}"><span class="an-h">${ic(icon, cls)}<span>${name}</span>${ic('chevR', 'chev')}</span>
    <span class="an-v">${val}<small> ${unit}</small></span><span class="an-s">${sub}</span>${viz}</button>`;
}
function renderAnalyticsOverview() {
  const today = isoDate(new Date()), end = addDays(today, -1), start = addDays(end, -(anaRange - 1));
  const days = []; for (let d = start; d <= end; d = addDays(d, 1)) { const t = dayTotals(d), n = (state.days[d] || []).filter((e) => !e.cafId && !e.alcId).length, goal = goalsFor(d).goal; days.push({ d, k: t.k, n, goal, st: n ? dayGoalState(d, t.k, goal) : null }); }
  const tracked = days.filter((x) => x.n);
  const avgK = tracked.length ? tracked.reduce((a, x) => a + x.k, 0) / tracked.length : null;
  const withGoal = tracked.filter((x) => x.goal), inBand = withGoal.filter((x) => x.st === 'ok').length;
  const tiles = [];
  tiles.push(anaTile('cal', 'flame', 'acc', 'Kalorien', avgK != null ? 'Ø ' + fmt(avgK) : '–', 'kcal', withGoal.length ? `${inBand} von ${withGoal.length} Tagen im Zielbereich` : `${tracked.length} von ${days.length} Tagen getrackt`, kcalBarsSvg(days), true));
  // Gewicht: Trend (EWMA) wie in der Detailkarte
  const tr = insTrend(state, today), trR = tr.filter((x) => x.d >= start);
  if (tr.length) {
    const last = tr[tr.length - 1], first = trR[0] || last;
    const wk = trR.length > 1 ? (last.t - first.t) / (trR.length - 1) * 7 : null;
    tiles.push(anaTile('weight', 'scale', 'pp', 'Gewicht', r1(last.t), 'kg', wk != null ? `Trend ${insS1(wk)} kg / Woche` : 'Trend', sparkSvg(trR.map((x) => x.t), 'pp')));
  } else tiles.push(anaTile('weight', 'scale', 'pp', 'Gewicht', '–', '', 'noch nicht gewogen', '<div class="sp-none"></div>'));
  const ex = insExpenditure(state, today);
  tiles.push(anaTile('energy', 'chart', 'gd', 'Energiebedarf', ex.ok ? '≈ ' + fmt(Math.round(ex.tdee / 10) * 10) : '–', ex.ok ? 'kcal' : '', ex.ok ? 'aus Essen + Gewicht' : `braucht ${INS_MIN_LOGGED} Tage + ${INS_MIN_WEIGHS}× Wiegen`, '<div class="sp-none"></div>'));
  if (state.water.enabled) {
    const w = days.map((x) => waterOf(x.d)), wd = days.filter((x, i) => w[i] > 0);
    const avg = wd.length ? wd.reduce((a, x) => a + waterOf(x.d), 0) / wd.length : null;
    const hit = days.filter((x) => waterOf(x.d) >= waterGoalFor(x.d) && waterOf(x.d) > 0).length;
    tiles.push(anaTile('water', 'drop', 'wat', 'Wasser', avg != null ? 'Ø ' + (avg / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '–', 'l', `Ziel erreicht ${hit} / ${days.length}`, sparkSvg(w.map((x) => (x > 0 ? x : null)), 'wat')));
  }
  if (state.caffeine.enabled) {
    const c = state.caffeine, ke = caffKe(c);
    const mg = days.map((x) => caffSum(c, x.d)), cd = mg.filter((x) => x > 0);
    const bedL = days.filter((x, i) => mg[i] > 0).map((x) => caffLevel(caffDoses(c, x.d), caffBedWake(c, x.d).bed, ke));
    tiles.push(anaTile('caf', 'cup', 'caf', 'Koffein', cd.length ? 'Ø ' + fmt(cd.reduce((a, b) => a + b, 0) / cd.length) : '–', 'mg', bedL.length ? `zur Bettzeit Ø ${fmt(bedL.reduce((a, b) => a + b, 0) / bedL.length)} mg` : 'keine Einträge', sparkSvg(mg.map((x) => (x > 0 ? x : null)), 'caf')));
  }
  const hb = insHabit(state, today);
  const hs = hb && hb.series ? hb.series.filter((x) => x.d >= start).map((x) => x.s * 100) : [];
  tiles.push(anaTile('habit', 'habit', 'lil', 'Gewohnheit', hb && hb.score != null ? fmt(hb.score * 100) : '–', hb && hb.score != null ? '/ 100' : '', 'nachsichtig: Lücken kosten wenig', sparkSvg(hs, 'lil'), (tiles.length - 1) % 2 === 0)); // Kalorien belegt eine ganze Zeile
  const logged = Object.keys(state.days).filter((d) => d.slice(0, 4) === today.slice(0, 4) && (state.days[d] || []).some((e) => !e.cafId && !e.alcId)).length;
  const rows = [['micro', 'micro', 'ff', 'Mikronährstoffe', '9 Werte'], ['cal', 'macro', 'cc', 'Kalender, Makros & mehr', 'Monat'], ['year', 'calendar', 'acc', 'Jahresansicht', `${logged} Tage ${today.slice(0, 4)}`]];
  const rng = [[7, '7 Tage'], [30, '30 Tage'], [90, '90 Tage']];
  $('#view').innerHTML = `<div class="topbar v2"><div><div class="sub">${new Date(start + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${new Date(end + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} · ohne heute</div><div class="day">Analytics</div></div></div>
    <div class="seg three" id="anRange">${rng.map(([n, l]) => `<button type="button" data-r="${n}" class="${anaRange === n ? 'active' : ''}">${l}</button>`).join('')}</div>
    <div class="an-grid">${tiles.join('')}</div>
    <div class="an-leg"><span><i class="ok"></i>im Zielbereich ±10 %</span><span><i class="over"></i>darüber</span><span><i class="low"></i>deutlich darunter</span>${infoBtn('hcal')}</div>
    <div class="card an-more">${rows.map(([p, i, c, n, s]) => `<button type="button" class="an-row" data-page="${p}">${ic(i, c)}<span class="grow">${n}</span><span class="muted">${s}</span>${ic('chevR', 'chev')}</button>`).join('')}</div>`;
  document.querySelectorAll('#anRange [data-r]').forEach((b) => b.onclick = () => { anaRange = +b.dataset.r; renderAnalyticsOverview(); });
  document.querySelectorAll('#view [data-page]').forEach((b) => b.onclick = () => {
    const p = b.dataset.page;
    if (p === 'weight' && !tr.length) { insOpenWeight(() => render()); return; }
    histPage = p; if (p !== 'year') { histMonth = null; histSel = null; histPick = false; } window.scrollTo(0, 0); render();
  });
}

/* ---------- Jahresansicht: ein Kästchen pro Tag, keine Serie ---------- */
let anaYear = null;
function renderYear() {
  const today = isoDate(new Date());
  const Y = anaYear || +today.slice(0, 4);
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  let logged = 0, part = 0, first = null;
  const blocks = MON.map((mn, mi) => {
    const d1 = new Date(Y, mi, 1), lead = (d1.getDay() + 6) % 7, nd = new Date(Y, mi + 1, 0).getDate();
    let cells = '<i></i>'.repeat(lead);
    for (let k = 1; k <= nd; k++) {
      const d = `${Y}-${String(mi + 1).padStart(2, '0')}-${String(k).padStart(2, '0')}`;
      const list = state.days[d] || [];
      const food = list.some((e) => !e.cafId && !e.alcId);
      const other = !food && (list.length || (state.water.log[d] || []).length || (state.caffeine.log[d] || []).length);
      if (food) { logged++; if (!first) first = d; } else if (other) part++;
      const cls = d > today ? 'fut' : food ? 'on' : other ? 'part' : '';
      cells += `<button type="button" class="yd ${cls} ${d === today ? 'today' : ''}" data-yd="${d}" ${d > today ? 'disabled' : ''} aria-label="${d}${food ? ', eingetragen' : ''}"></button>`;
    }
    return `<div class="ym"><div class="ym-n ${Y === +today.slice(0, 4) && mi > +today.slice(5, 7) - 1 ? 'fut' : ''}">${mn}</div><div class="ym-g">${cells}</div></div>`;
  }).join('');
  const endD = Y === +today.slice(0, 4) ? today : `${Y}-12-31`;
  const span = first ? Math.round((new Date(endD + 'T12:00:00') - new Date(first + 'T12:00:00')) / 864e5) + 1 : 0;
  $('#view').innerHTML = `<div class="topbar v2 sub-top"><button class="icon-btn" id="anBack" aria-label="Zurück">${ic('chevL')}</button><div class="st-t"><div class="sub">Analytics</div><div class="day">Jahr ${Y}</div></div>
      <div class="nav"><button class="icon-btn" id="yPrev" aria-label="Vorheriges Jahr">${ic('chevL')}</button><button class="icon-btn" id="yNext" aria-label="Nächstes Jahr" ${Y >= +today.slice(0, 4) ? 'disabled' : ''}>${ic('chevR')}</button></div></div>
    <div class="y-kpi"><div class="card"><b>${logged}</b><span>Tage eingetragen</span></div><div class="card"><b>${span ? Math.round(logged / span * 100) : 0} %</b><span>seit dem ersten Eintrag</span></div></div>
    <div class="card"><div class="y-grid">${blocks}</div>
      <div class="y-leg"><span><i class="on"></i>Essen eingetragen</span><span><i class="part"></i>nur Getränke</span><span><i></i>leer</span></div></div>
    <p class="small muted" style="padding:0 4px">Keine Serie, die reißen kann: Jeder Tag zählt für sich. Tag antippen öffnet das Journal.</p>`;
  $('#anBack').onclick = () => { histPage = null; render(); };
  $('#yPrev').onclick = () => { anaYear = Y - 1; renderYear(); };
  $('#yNext').onclick = () => { anaYear = Y + 1; renderYear(); };
  document.querySelectorAll('[data-yd]').forEach((b) => b.onclick = () => { currentDate = b.dataset.yd; tab = 'diary'; render(); });
}
