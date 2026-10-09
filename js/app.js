/* Kalorien-Tracker – alle Nutzerdaten bleiben lokal auf dem Gerät (localStorage).
   Es werden keine persönlichen Daten an einen Server gesendet. Einzige Netzwerkanfrage
   nach außen: Barcode-Abfrage bei Open Food Facts (nur der Barcode wird übertragen). */
'use strict';

const APP_VERSION = '1.0.0';
const STORE_KEY = 'ct.v1';
const MEALS = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' },
];
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity';

/* ---------- Speicher ---------- */
function emptyState() {
  return { settings: { goal: null, protein: null, carbs: null, fat: null }, days: {}, custom: [], recent: [], offCache: {} };
}
let state = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyState();
    return Object.assign(emptyState(), JSON.parse(raw));
  } catch (e) { return emptyState(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Speichern fehlgeschlagen – bitte Backup exportieren.'); }
}
// Bittet iOS/Safari, den Speicher nicht automatisch zu löschen (falls unterstützt).
if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(() => {}); }

/* ---------- Hilfsfunktionen ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const r0 = (n) => Math.round(n || 0);
const r1 = (n) => Math.round((n || 0) * 10) / 10;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function isoDate(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
function fmtDate(iso) {
  const today = isoDate(new Date());
  if (iso === today) return 'Heute';
  if (iso === addDays(today, -1)) return 'Gestern';
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}
function norm(s) {
  return String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function entryTotals(e) {
  const f = e.grams / 100;
  return { k: e.k * f, p: (e.p || 0) * f, c: (e.c || 0) * f, f: (e.f || 0) * f };
}
function dayTotals(iso) {
  const t = { k: 0, p: 0, c: 0, f: 0 };
  (state.days[iso] || []).forEach((e) => { const x = entryTotals(e); t.k += x.k; t.p += x.p; t.c += x.c; t.f += x.f; });
  return t;
}

/* ---------- BLS-Daten ---------- */
let bls = [];       // [{id, n, k, p, c, f}]
let blsReady = false;
let blsMeta = null;
async function loadBls() {
  try {
    const res = await fetch('data/bls.json');
    const data = await res.json();
    blsMeta = data.meta || null;
    bls = (data.foods || []).map((x) => ({ src: 'bls', id: 'bls:' + x.id, n: x.n, k: x.k, p: x.p, c: x.c, f: x.f, _n: norm(x.n) }));
  } catch (e) { bls = []; }
  blsReady = true;
  if (sheetMode === 'add') renderAddResults();
}

function searchFoods(q) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const custom = state.custom.map((x) => Object.assign({ _n: norm(x.n + ' ' + (x.brand || '')) }, x));
  const pool = custom.concat(bls);
  const hits = [];
  for (const food of pool) {
    if (terms.every((t) => food._n.includes(t))) {
      let score = food._n.length;
      if (food._n.startsWith(terms[0])) score -= 1000;
      if (food.src !== 'bls') score -= 2000; // eigene Lebensmittel zuerst
      hits.push([score, food]);
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  return hits.slice(0, 60).map((h) => h[1]);
}

/* ---------- Navigation ---------- */
let tab = 'diary';
let currentDate = isoDate(new Date());
document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  document.querySelectorAll('.tabbar button').forEach((x) => x.classList.toggle('active', x === b));
  render();
}));
function render() {
  if (tab === 'diary') renderDiary();
  else if (tab === 'history') renderHistory();
  else renderSettings();
  window.scrollTo(0, 0);
}

/* ---------- Tagebuch ---------- */
function renderDiary() {
  const v = $('#view');
  const goal = state.settings.goal;
  const t = dayTotals(currentDate);
  const entries = state.days[currentDate] || [];
  const pct = goal ? Math.min(100, (t.k / goal) * 100) : 0;
  const over = goal && t.k > goal;
  const rest = goal ? goal - t.k : null;

  const macro = (cls, label, val, target) => `
    <div class="macro ${cls}">
      <div class="small muted">${label}</div>
      <div><strong>${r0(val)}</strong>${target ? `<span class="muted small"> / ${r0(target)} g</span>` : '<span class="muted small"> g</span>'}</div>
      <div class="mbar"><span style="width:${target ? Math.min(100, (val / target) * 100) : 0}%"></span></div>
    </div>`;

  let html = `
    <div class="datebar">
      <button id="prevDay" aria-label="Vorheriger Tag">‹</button>
      <div class="title"><strong>${esc(fmtDate(currentDate))}</strong><span class="small muted">${esc(new Date(currentDate + 'T12:00:00').toLocaleDateString('de-DE'))}</span></div>
      <button id="nextDay" aria-label="Nächster Tag">›</button>
    </div>`;

  if (!goal) {
    html += `<div class="card"><h2>Willkommen!</h2><p class="muted">Trage zuerst dein tägliches Kalorienziel ein (z. B. deinen Tagesbedarf aus Garmin).</p>
      <button class="btn block" id="toSettings">Ziel festlegen</button></div>`;
  }

  html += `
    <div class="card summary">
      <div class="spread">
        <div><div class="big">${r0(t.k)}</div><div class="small muted">kcal gegessen${goal ? ` von ${r0(goal)}` : ''}</div></div>
        ${goal ? `<div style="text-align:right"><div class="big" style="color:${over ? 'var(--warn)' : 'var(--accent)'}">${r0(Math.abs(rest))}</div><div class="small muted">${over ? 'kcal über Ziel' : 'kcal übrig'}</div></div>` : ''}
      </div>
      ${goal ? `<div class="bar ${over ? 'over' : ''}"><span style="width:${pct}%"></span></div>` : ''}
      <div class="macros">
        ${macro('p', 'Eiweiß', t.p, state.settings.protein)}
        ${macro('c', 'Kohlenhydrate', t.c, state.settings.carbs)}
        ${macro('f', 'Fett', t.f, state.settings.fat)}
      </div>
    </div>`;

  for (const m of MEALS) {
    const list = entries.filter((e) => e.meal === m.id);
    const kcal = list.reduce((s, e) => s + entryTotals(e).k, 0);
    html += `<div class="card">
      <div class="meal-head"><div><h2>${m.label}</h2><span class="small muted">${r0(kcal)} kcal</span></div>
      <button class="add-btn" data-add="${m.id}" aria-label="${m.label} hinzufügen">+</button></div>
      ${list.map((e) => `<div class="entry" data-entry="${e.id}">
        <div class="name">${esc(e.n)}<div class="small muted">${r1(e.grams)} g</div></div>
        <div class="kcal">${r0(entryTotals(e).k)} kcal</div></div>`).join('')}
    </div>`;
  }
  v.innerHTML = html;

  $('#prevDay').onclick = () => { currentDate = addDays(currentDate, -1); renderDiary(); };
  $('#nextDay').onclick = () => { currentDate = addDays(currentDate, 1); renderDiary(); };
  const ts = $('#toSettings'); if (ts) ts.onclick = () => document.querySelector('[data-tab="settings"]').click();
  v.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => openAdd(b.dataset.add));
  v.querySelectorAll('[data-entry]').forEach((el) => el.onclick = () => {
    const e = entries.find((x) => x.id === el.dataset.entry);
    if (e) openAmount(e, { edit: true });
  });
}

/* ---------- Sheet: Lebensmittel hinzufügen ---------- */
let sheetMode = null;
let addMeal = 'breakfast';
let addTab = 'search';
let addQuery = '';
let scanner = null;

function openSheet(html) {
  const s = $('#sheet');
  s.innerHTML = `<div class="sheet-inner">${html}</div>`;
  s.hidden = false; s.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  stopScanner();
  $('#sheet').hidden = true; $('#sheet').innerHTML = '';
  document.body.style.overflow = '';
  sheetMode = null;
  render();
}

function openAdd(meal) {
  addMeal = meal; sheetMode = 'add';
  const label = MEALS.find((m) => m.id === meal).label;
  openSheet(`
    <div class="sheet-head"><h1 style="margin:0">${label}</h1><button class="btn ghost" id="closeSheet">Fertig</button></div>
    <div class="seg" id="addSeg">
      <button data-t="search">Suche</button><button data-t="recent">Zuletzt</button>
      <button data-t="scan">Barcode</button><button data-t="custom">Eigenes</button>
    </div>
    <div id="addBody"></div>`);
  $('#closeSheet').onclick = closeSheet;
  $('#addSeg').querySelectorAll('button').forEach((b) => b.onclick = () => { addTab = b.dataset.t; renderAddTab(); });
  renderAddTab();
}

function renderAddTab() {
  stopScanner();
  $('#addSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.t === addTab));
  const body = $('#addBody');
  if (addTab === 'search') {
    body.innerHTML = `<input id="q" type="search" placeholder="Lebensmittel suchen, z. B. Haferflocken" autocomplete="off" value="${esc(addQuery)}">
      <ul class="list" id="results"></ul>`;
    const q = $('#q');
    q.oninput = () => { addQuery = q.value; renderAddResults(); };
    renderAddResults();
    if (!addQuery) setTimeout(() => q.focus(), 50);
  } else if (addTab === 'recent') {
    const items = state.recent.slice(0, 40);
    body.innerHTML = items.length ? `<ul class="list">${items.map((f, i) => foodLi(f, i)).join('')}</ul>`
      : '<div class="empty">Noch nichts eingetragen.</div>';
    body.querySelectorAll('li').forEach((li) => li.onclick = () => openAmount(items[+li.dataset.i]));
  } else if (addTab === 'scan') {
    renderScan();
  } else {
    renderCustomForm();
  }
}

function foodLi(f, i) {
  const tag = f.src === 'off' ? '<span class="tag">Barcode</span>' : f.src === 'custom' ? '<span class="tag">Eigenes</span>' : '';
  return `<li data-i="${i}"><div>${esc(f.n)}${tag}<div class="meta">${f.brand ? esc(f.brand) + ' · ' : ''}${r0(f.k)} kcal / 100 g</div></div><div class="meta">›</div></li>`;
}

function renderAddResults() {
  const ul = $('#results'); if (!ul) return;
  if (!addQuery.trim()) {
    ul.innerHTML = `<div class="empty">${!blsReady ? 'Lade Lebensmitteldaten…' : bls.length ? `${bls.length.toLocaleString('de-DE')} Lebensmittel aus dem BLS verfügbar.` : 'Lebensmitteldatenbank noch nicht enthalten – nutze Barcode oder „Eigenes“.'}</div>`;
    return;
  }
  const hits = searchFoods(addQuery);
  ul.innerHTML = hits.length ? hits.map((f, i) => foodLi(f, i)).join('')
    : '<div class="empty">Nichts gefunden. Unter „Eigenes“ kannst du es selbst anlegen.</div>';
  ul.querySelectorAll('li').forEach((li) => li.onclick = () => openAmount(hits[+li.dataset.i]));
}

/* ---------- Mengen-Dialog ---------- */
function openAmount(food, opts = {}) {
  stopScanner();
  const edit = !!opts.edit;
  const prevMode = sheetMode;
  sheetMode = 'amount';
  const defGrams = edit ? food.grams : (food.lastGrams || food.serving || 100);
  const mealSel = edit ? food.meal : addMeal;
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="back">‹ Zurück</button><span></span></div>
    <h1>${esc(food.n)}</h1>
    ${food.brand ? `<p class="muted">${esc(food.brand)}</p>` : ''}
    <p class="small muted">Pro 100 g: ${r0(food.k)} kcal · E ${r1(food.p)} g · KH ${r1(food.c)} g · F ${r1(food.f)} g</p>
    <label for="grams">Menge in Gramm</label>
    <input id="grams" type="text" inputmode="decimal" value="${r1(defGrams)}">
    ${food.serving ? `<button class="btn ghost" id="serving">1 Portion = ${r1(food.serving)} g</button>` : ''}
    <div class="nutri" id="nutri"></div>
    <label for="meal">Mahlzeit</label>
    <select id="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === mealSel ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
    <div style="height:14px"></div>
    <button class="btn block" id="save">${edit ? 'Speichern' : 'Hinzufügen'}</button>
    ${edit ? '<div style="height:10px"></div><button class="btn danger block" id="del">Eintrag löschen</button>' : ''}`);

  const g = $('#grams');
  const upd = () => {
    const grams = num(g.value) || 0;
    const x = entryTotals(Object.assign({}, food, { grams }));
    $('#nutri').innerHTML = `<div><strong>${r0(x.k)}</strong><span>kcal</span></div><div><strong>${r1(x.p)}</strong><span>Eiweiß</span></div>
      <div><strong>${r1(x.c)}</strong><span>KH</span></div><div><strong>${r1(x.f)}</strong><span>Fett</span></div>`;
  };
  g.oninput = upd; upd();
  const sv = $('#serving'); if (sv) sv.onclick = () => { g.value = r1(food.serving); upd(); };
  $('#back').onclick = () => { if (edit) closeSheet(); else { sheetMode = prevMode; openAdd(addMeal); } };

  $('#save').onclick = () => {
    const grams = num(g.value);
    if (!grams || grams <= 0) { toast('Bitte eine Menge eingeben.'); return; }
    const meal = $('#meal').value;
    if (edit) {
      const list = state.days[currentDate] || [];
      const e = list.find((x) => x.id === food.id);
      if (e) { e.grams = grams; e.meal = meal; }
    } else {
      const entry = { id: uid(), meal, grams, ref: food.id, src: food.src, n: food.n, brand: food.brand || '', k: food.k, p: food.p, c: food.c, f: food.f };
      (state.days[currentDate] = state.days[currentDate] || []).push(entry);
      rememberRecent(food, grams);
    }
    save();
    toast(edit ? 'Gespeichert' : 'Hinzugefügt');
    if (edit) closeSheet(); else { sheetMode = prevMode; openAdd(addMeal); }
  };
  const del = $('#del');
  if (del) del.onclick = () => {
    state.days[currentDate] = (state.days[currentDate] || []).filter((x) => x.id !== food.id);
    save(); toast('Gelöscht'); closeSheet();
  };
}

function rememberRecent(food, grams) {
  const item = { src: food.src, id: food.id, n: food.n, brand: food.brand || '', k: food.k, p: food.p, c: food.c, f: food.f, serving: food.serving || null, lastGrams: grams };
  state.recent = [item].concat(state.recent.filter((x) => x.id !== food.id)).slice(0, 60);
}

/* ---------- Barcode ---------- */
function renderScan() {
  $('#addBody').innerHTML = `
    <div class="scanner"><video id="video" playsinline muted></video><div class="frame"></div></div>
    <p class="small muted" style="margin-top:8px">Barcode in den Rahmen halten. Nur der Barcode wird an Open Food Facts gesendet.</p>
    <label for="code">Oder Barcode eintippen</label>
    <div class="row"><input id="code" type="text" inputmode="numeric" placeholder="z. B. 4008400401621"><button class="btn" id="lookup" style="flex:0 0 auto">Suchen</button></div>
    <div id="scanResult"></div>`;
  $('#lookup').onclick = () => { const c = ($('#code').value || '').replace(/\D/g, ''); if (c) lookupBarcode(c); };
  startScanner();
}

function startScanner() {
  if (!window.ZXing || !navigator.mediaDevices) { $('#scanResult').innerHTML = '<p class="muted">Kamera nicht verfügbar – bitte Barcode eintippen.</p>'; return; }
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
  scanner = new ZXing.BrowserMultiFormatReader(hints, 300);
  let done = false;
  scanner.decodeFromConstraints({ video: { facingMode: 'environment' } }, 'video', (result) => {
    if (result && !done) {
      done = true;
      if (navigator.vibrate) navigator.vibrate(60);
      const code = result.getText();
      stopScanner();
      $('#code').value = code;
      lookupBarcode(code);
    }
  }).catch(() => { $('#scanResult').innerHTML = '<p class="muted">Kein Kamerazugriff. Erlaube die Kamera in den Safari-Einstellungen oder tippe den Barcode ein.</p>'; });
}
function stopScanner() { if (scanner) { try { scanner.reset(); } catch (e) {} scanner = null; } }

async function lookupBarcode(code) {
  const out = $('#scanResult');
  // 1. Eigene Lebensmittel mit diesem Barcode
  const own = state.custom.find((x) => x.barcode === code);
  if (own) { openAmount(own); return; }
  // 2. Lokaler Zwischenspeicher früherer Abfragen
  if (state.offCache[code]) { openAmount(state.offCache[code]); return; }
  out.innerHTML = '<p class="muted">Suche bei Open Food Facts…</p>';
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
    const data = await res.json();
    const p = data.product;
    const nm = p && p.nutriments;
    let k = nm && num(nm['energy-kcal_100g']);
    if (k == null && nm && num(nm['energy_100g']) != null) k = num(nm['energy_100g']) / 4.184;
    if (!p || data.status !== 1 || k == null) {
      out.innerHTML = `<div class="card" style="margin-top:12px"><p>Produkt ${esc(code)} nicht gefunden oder ohne Nährwerte.</p>
        <button class="btn secondary block" id="createOwn">Als eigenes Lebensmittel anlegen</button></div>`;
      $('#createOwn').onclick = () => { addTab = 'custom'; renderAddTab(); $('#cBarcode').value = code; };
      return;
    }
    const food = {
      src: 'off', id: 'off:' + code, barcode: code,
      n: p.product_name_de || p.product_name || ('Produkt ' + code),
      brand: (p.brands || '').split(',')[0].trim(),
      k, p: num(nm.proteins_100g) || 0, c: num(nm.carbohydrates_100g) || 0, f: num(nm.fat_100g) || 0,
      serving: num(p.serving_quantity) || null,
    };
    state.offCache[code] = food; save();
    openAmount(food);
  } catch (e) {
    out.innerHTML = '<p class="muted">Keine Verbindung zu Open Food Facts. Bitte später erneut versuchen.</p>';
  }
}

/* ---------- Eigene Lebensmittel ---------- */
function renderCustomForm() {
  $('#addBody').innerHTML = `
    <p class="small muted">Werte pro 100 g, z. B. von der Verpackung.</p>
    <label for="cName">Name</label><input id="cName" type="text">
    <label for="cBrand">Marke (optional)</label><input id="cBrand" type="text">
    <div class="row">
      <div><label for="cK">kcal</label><input id="cK" inputmode="decimal"></div>
      <div><label for="cP">Eiweiß g</label><input id="cP" inputmode="decimal"></div>
    </div>
    <div class="row">
      <div><label for="cC">KH g</label><input id="cC" inputmode="decimal"></div>
      <div><label for="cF">Fett g</label><input id="cF" inputmode="decimal"></div>
    </div>
    <div class="row">
      <div><label for="cServ">Portion g (optional)</label><input id="cServ" inputmode="decimal"></div>
      <div><label for="cBarcode">Barcode (optional)</label><input id="cBarcode" inputmode="numeric"></div>
    </div>
    <div style="height:14px"></div>
    <button class="btn block" id="cSave">Speichern & auswählen</button>
    ${state.custom.length ? `<h2 style="margin-top:20px">Meine Lebensmittel</h2><ul class="list" id="ownList">${state.custom.map((f, i) => foodLi(f, i)).join('')}</ul>` : ''}`;
  $('#cSave').onclick = () => {
    const n = $('#cName').value.trim(); const k = num($('#cK').value);
    if (!n || k == null) { toast('Name und kcal sind Pflicht.'); return; }
    const food = {
      src: 'custom', id: 'custom:' + uid(), n, brand: $('#cBrand').value.trim(), k,
      p: num($('#cP').value) || 0, c: num($('#cC').value) || 0, f: num($('#cF').value) || 0,
      serving: num($('#cServ').value) || null, barcode: ($('#cBarcode').value || '').replace(/\D/g, '') || null,
    };
    state.custom.push(food); save(); openAmount(food);
  };
  const own = $('#ownList');
  if (own) own.querySelectorAll('li').forEach((li) => li.onclick = () => openAmount(state.custom[+li.dataset.i]));
}

/* ---------- Verlauf ---------- */
let histRange = 14;
function renderHistory() {
  const goal = state.settings.goal;
  const today = isoDate(new Date());
  const days = [];
  for (let i = histRange - 1; i >= 0; i--) { const d = addDays(today, -i); days.push({ d, k: dayTotals(d).k, n: (state.days[d] || []).length }); }
  const tracked = days.filter((x) => x.n > 0);
  const avg = tracked.length ? tracked.reduce((s, x) => s + x.k, 0) / tracked.length : 0;
  const max = Math.max(goal || 0, ...days.map((x) => x.k), 1) * 1.1;
  const W = 340, H = 180, pad = 22, bw = (W - pad) / days.length;
  const y = (v) => H - 18 - (v / max) * (H - 30);
  const bars = days.map((x, i) => {
    const h = (H - 18) - y(x.k);
    const lbl = (histRange <= 14 || i % 5 === 0) ? `<text x="${pad + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${new Date(x.d + 'T12:00:00').getDate()}</text>` : '';
    return `<rect class="b ${goal && x.k > goal ? 'over' : ''}" x="${pad + i * bw + bw * 0.15}" y="${y(x.k)}" width="${bw * 0.7}" height="${Math.max(0, h)}" rx="2"></rect>${lbl}`;
  }).join('');
  const goalLine = goal ? `<line class="goal" x1="${pad}" x2="${W}" y1="${y(goal)}" y2="${y(goal)}"></line><text x="0" y="${y(goal) + 3}">${r0(goal)}</text>` : '';

  $('#view').innerHTML = `
    <h1>Verlauf</h1>
    <div class="seg" id="rangeSeg"><button data-r="7">7 Tage</button><button data-r="14">14 Tage</button><button data-r="30">30 Tage</button></div>
    <div class="card chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kalorien pro Tag">${goalLine}${bars}</svg></div>
    <div class="card">
      <div class="spread"><span class="muted">Ø an getrackten Tagen</span><strong>${r0(avg)} kcal</strong></div>
      <div class="spread"><span class="muted">Getrackte Tage</span><strong>${tracked.length} / ${histRange}</strong></div>
      ${goal ? `<div class="spread"><span class="muted">Ø Differenz zum Ziel</span><strong>${tracked.length ? (avg - goal > 0 ? '+' : '') + r0(avg - goal) + ' kcal' : '–'}</strong></div>` : ''}
      <p class="small muted" style="margin-top:8px">Nicht getrackte Tage fließen nicht in den Durchschnitt ein. Ein Tag mit wenig Einträgen ist nicht unbedingt ein Tag mit wenig Essen.</p>
    </div>`;
  $('#rangeSeg').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', +b.dataset.r === histRange);
    b.onclick = () => { histRange = +b.dataset.r; renderHistory(); };
  });
}

/* ---------- Einstellungen ---------- */
function renderSettings() {
  const s = state.settings;
  $('#view').innerHTML = `
    <h1>Einstellungen</h1>
    <div class="card">
      <h2>Tagesziel</h2>
      <label for="sGoal">Kalorien pro Tag (kcal)</label><input id="sGoal" inputmode="decimal" value="${s.goal ?? ''}" placeholder="z. B. Tagesbedarf aus Garmin">
      <p class="small muted" style="margin-top:6px">Optional: Makro-Ziele in Gramm</p>
      <div class="row">
        <div><label for="sP">Eiweiß</label><input id="sP" inputmode="decimal" value="${s.protein ?? ''}"></div>
        <div><label for="sC">KH</label><input id="sC" inputmode="decimal" value="${s.carbs ?? ''}"></div>
        <div><label for="sF">Fett</label><input id="sF" inputmode="decimal" value="${s.fat ?? ''}"></div>
      </div>
      <div style="height:12px"></div>
      <button class="btn block" id="sSave">Speichern</button>
    </div>
    <div class="card">
      <h2>Backup</h2>
      <p class="small muted">Deine Daten liegen nur auf diesem Gerät. Exportiere regelmäßig ein Backup (z. B. in die Dateien-App).</p>
      <div class="row"><button class="btn secondary" id="exp">Exportieren</button><button class="btn secondary" id="impBtn">Importieren</button></div>
      <input type="file" id="imp" accept="application/json,.json" hidden>
      <div style="height:10px"></div>
      <button class="btn danger block" id="wipe">Alle Daten löschen</button>
    </div>
    <div class="card sources">
      <h2 style="color:var(--ink)">Quellen & Lizenzen</h2>
      <p>Lebensmitteldaten: Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.
        DOI: <a href="https://doi.org/10.25826/Data20251217-134202-0" target="_blank" rel="noopener">10.25826/Data20251217-134202-0</a>.
        ${blsMeta ? `In dieser App: ${esc(blsMeta.count)} Lebensmittel, nur Energie und Makronährstoffe.` : 'In dieser Version noch nicht enthalten.'}</p>
      <p>Barcode-Daten: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a>, Datenbank unter der
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">Open Database License (ODbL)</a>,
        Inhalte unter der Database Contents License (DbCL). Werte von Open Food Facts stammen von Freiwilligen – bitte mit der Verpackung abgleichen.</p>
      <p>Barcode-Erkennung: ZXing (Apache-2.0).</p>
      <p>Version ${APP_VERSION}</p>
    </div>`;

  $('#sSave').onclick = () => {
    const goal = num($('#sGoal').value);
    if (goal != null && (goal < 500 || goal > 10000)) { toast('Bitte einen Wert zwischen 500 und 10.000 kcal eingeben.'); return; }
    s.goal = goal; s.protein = num($('#sP').value); s.carbs = num($('#sC').value); s.fat = num($('#sF').value);
    save(); toast('Gespeichert');
  };
  $('#exp').onclick = exportBackup;
  $('#impBtn').onclick = () => $('#imp').click();
  $('#imp').onchange = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!data || typeof data !== 'object' || !data.days) throw new Error('format');
        if (!confirm('Backup importieren? Die aktuellen Daten auf diesem Gerät werden ersetzt.')) return;
        state = Object.assign(emptyState(), data); save(); toast('Backup importiert'); render();
      } catch (e) { toast('Datei ist kein gültiges Backup.'); }
    };
    rd.readAsText(file);
  };
  $('#wipe').onclick = () => {
    if (confirm('Wirklich alle Einträge, eigenen Lebensmittel und Einstellungen löschen?')) {
      state = emptyState(); save(); toast('Alle Daten gelöscht'); render();
    }
  };
}

async function exportBackup() {
  const name = `kalorien-backup-${isoDate(new Date())}.json`;
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- Start ---------- */
render();
loadBls();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
