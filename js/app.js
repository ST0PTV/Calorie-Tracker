/* Kalorien-Tracker – alle Nutzerdaten bleiben lokal auf dem Gerät (localStorage).
   Es werden keine persönlichen Daten an einen Server gesendet. Einzige Netzwerkanfrage
   nach außen: Barcode-Abfrage bei Open Food Facts (nur der Barcode wird übertragen). */
'use strict';

const APP_VERSION = '1.5.0';
const STORE_KEY = 'ct.v1';
const BACKUP_REMIND_DAYS = 7;
const MEALS = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' },
];
const NUTRIENTS = ['k', 'p', 'c', 'f', 'fi', 'su'];
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity';

/* ---------- Speicher ---------- */
function emptyState() {
  return {
    settings: { goal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null },
    goalHistory: [], // [{ from: 'JJJJ-MM-TT', goal, protein, carbs, fat, fiber, sugar }], sortiert nach Datum
    days: {}, custom: [], recent: [], favs: [], offCache: {}, lastBackup: null,
  };
}
const GOAL_KEYS = ['goal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'weight', 'preset', 'pf', 'ff'];

/* ---------- Makro-Presets ----------
   Eiweiß und Fett = Faktor (g/kg Körpergewicht) × Gewicht, Kohlenhydrate = verbleibende Energie / 4.
   Energiefaktoren: 4 kcal/g Eiweiß und KH, 9 kcal/g Fett (Atwater). fatRange = empfohlener Fettanteil in % der Energie,
   gegen den die App das Ergebnis prüft (Fett wird in der Literatur meist in % der Energie angegeben, nicht in g/kg). */
const PRESETS = {
  dge: {
    label: 'Ausgewogen', long: 'Ausgewogene Mischkost (DGE)', pf: 0.8, ff: 1.0, fatRange: [30, 35],
    why: 'Eiweiß 0,8 g/kg ist die DGE-Empfehlung für Erwachsene von 19 bis unter 65 Jahren (ab 65: 1,0 g/kg). Fett: DGE-Richtwert 30 % der Energie, bei hoher Aktivität bis 35 %.',
    refs: ['dgeProtein', 'dgeFat'],
  },
  muscle: {
    label: 'Muskelaufbau', long: 'Muskelaufbau / Krafttraining', pf: 1.6, ff: 1.0, fatRange: [20, 35],
    why: 'Meta-Analyse aus 49 RCTs: Über ca. 1,6 g/kg/Tag (95-%-KI 1,03–2,20) kein weiterer Zuwachs an fettfreier Masse durch Krafttraining. Die ISSN nennt 1,4–2,0 g/kg. Fett: 20–35 % der Energie (ACSM/AND/DC).',
    refs: ['morton', 'issn', 'acsm'],
  },
  cut: {
    label: 'Fettabbau', long: 'Fettabbau im Kaloriendefizit', pf: 2.2, ff: 0.8, fatRange: [15, 30],
    why: 'Im Defizit steigt der Eiweißbedarf, um Muskelmasse zu erhalten: 2,3–3,1 g/kg fettfreie Masse bei trainierten, schlanken Personen (≈ 2,0–2,6 g/kg Körpergewicht). Im RCT führten 2,4 g/kg zu mehr Magermasse und mehr Fettverlust als 1,2 g/kg. Fett: 15–30 % der Energie. Das Kalorienziel muss dafür unter dem Bedarf liegen (Ziel: 0,5–1 % Körpergewicht pro Woche).',
    refs: ['helms2014', 'longland', 'helmsPrep'],
  },
  custom: { label: 'Eigene', long: 'Eigene Faktoren', pf: null, ff: null, fatRange: [20, 35], why: 'Eigene Faktoren. Die Prüfung des Fettanteils nutzt den allgemeinen Bereich von 20–35 % der Energie (ACSM/AND/DC).', refs: ['acsm'] },
};
const REFS = {
  morton: { text: 'Morton RW et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med 52(6):376–384.', doi: '10.1136/bjsports-2017-097608' },
  issn: { text: 'Jäger R et al. (2017). International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr 14:20.', doi: '10.1186/s12970-017-0177-8' },
  acsm: { text: 'Thomas DT, Erdman KA, Burke LM (2016). American College of Sports Medicine Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc 48(3):543–568.', doi: '10.1249/MSS.0000000000000852' },
  helms2014: { text: 'Helms ER et al. (2014). A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes. Int J Sport Nutr Exerc Metab 24(2):127–138.', doi: '10.1123/ijsnem.2013-0054' },
  longland: { text: 'Longland TM et al. (2016). Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial. Am J Clin Nutr 103(3):738–746.', doi: '10.3945/ajcn.115.119339' },
  helmsPrep: { text: 'Helms ER, Aragon AA, Fitschen PJ (2014). Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr 11:20.', doi: '10.1186/1550-2783-11-20' },
  dgeProtein: { text: 'Deutsche Gesellschaft für Ernährung (2017). Referenzwerte für die Proteinzufuhr – Pressemeldung 08/2017. Bonn.', url: 'https://www.dge.de/fileadmin/dok/presse/meldungen/2011-2018/DGE-Pressemeldung-aktuell-08-2017-Referenzwert-Protein.pdf' },
  dgeFat: { text: 'Deutsche Gesellschaft für Ernährung (2011). DGE-Position: Richtwerte für die Energiezufuhr aus Kohlenhydraten und Fett. Bonn.', url: 'https://www.dge.de/fileadmin/dok/wissenschaft/positionen/DGE-Positionspapier-Richtwerte-Energiezufuhr-KH-und-Fett.pdf' },
};
function refHtml(key) {
  const r = REFS[key];
  const href = r.doi ? `https://doi.org/${r.doi}` : r.url;
  return `<li>${esc(r.text)} <a href="${href}" target="_blank" rel="noopener">${r.doi ? 'doi:' + esc(r.doi) : 'PDF'}</a></li>`;
}
function calcMacros(kcal, weight, pf, ff) {
  if (!weight || pf == null || ff == null) return null;
  const protein = Math.round(pf * weight);
  const fat = Math.round(ff * weight);
  const carbsRaw = kcal ? (kcal - protein * 4 - fat * 9) / 4 : null;
  return {
    protein, fat,
    carbs: carbsRaw == null ? null : Math.max(0, Math.round(carbsRaw)),
    carbsNegative: carbsRaw != null && carbsRaw < 0,
    pctP: kcal ? (protein * 4 / kcal) * 100 : null,
    pctF: kcal ? (fat * 9 / kcal) * 100 : null,
    pctC: kcal && carbsRaw != null ? (Math.max(0, carbsRaw) * 4 / kcal) * 100 : null,
  };
}
function normalizeState(data) {
  const s = Object.assign(emptyState(), data);
  s.settings = Object.assign(emptyState().settings, data.settings || {});
  if (!Array.isArray(s.goalHistory)) s.goalHistory = [];
  // Übernahme aus Versionen ohne Ziel-Historie: bisheriges Ziel gilt ab dem ersten Tagebuch-Tag
  if (!s.goalHistory.length && s.settings.goal != null) {
    const first = Object.keys(s.days).filter((d) => (s.days[d] || []).length).sort()[0] || isoDate(new Date());
    const entry = { from: first }; GOAL_KEYS.forEach((k) => { entry[k] = s.settings[k] ?? null; });
    s.goalHistory = [entry];
  }
  s.goalHistory.sort((a, b) => a.from.localeCompare(b.from));
  return s;
}
// Ziele, die an einem Tag galten. Tage vor dem ersten Eintrag nutzen das erste Ziel.
function goalsFor(iso) {
  const h = state.goalHistory;
  if (!h.length) return Object.assign({}, emptyState().settings);
  let g = h[0];
  for (const e of h) { if (e.from <= iso) g = e; else break; }
  return g;
}
let state = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyState();
    return normalizeState(JSON.parse(raw));
  } catch (e) { return emptyState(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Speichern fehlgeschlagen – bitte Backup exportieren.'); }
}
if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(() => {}); }

/* ---------- Hilfsfunktionen ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const r0 = (n) => Math.round(n || 0);
// Anzeige mit deutschem Dezimalkomma, ohne Tausenderpunkt (Eingabefelder lesen das Komma über num() wieder ein)
const r1 = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1, useGrouping: false });
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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/-/g, '').replace(/[^a-z0-9 ]/g, ' ');
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function per(food, grams) {
  const f = grams / 100; const o = {};
  NUTRIENTS.forEach((n) => { o[n] = (food[n] || 0) * f; });
  return o;
}
function entryTotals(e) { return per(e, e.grams); }
function sumEntries(list) {
  const t = { k: 0, p: 0, c: 0, f: 0, fi: 0, su: 0 };
  list.forEach((e) => { const x = entryTotals(e); NUTRIENTS.forEach((n) => { t[n] += x[n]; }); });
  return t;
}
const dayTotals = (iso) => sumEntries(state.days[iso] || []);
function nutrientsOf(food) { const o = {}; NUTRIENTS.forEach((n) => { o[n] = food[n] || 0; }); return o; }
function foodSnap(food) {
  return Object.assign({ src: food.src, id: food.ref || food.id, n: food.n, brand: food.brand || '', serving: food.serving || null }, nutrientsOf(food));
}
const isFav = (id) => state.favs.some((x) => x.id === id);

/* ---------- BLS-Daten ---------- */
let bls = [];
let blsReady = false;
let blsMeta = null;
async function loadBls() {
  try {
    const res = await fetch('data/bls.json');
    const data = await res.json();
    blsMeta = data.meta || null;
    bls = (data.foods || []).map((x) => ({ src: 'bls', id: 'bls:' + x.id, n: x.n, k: x.k, p: x.p, c: x.c, f: x.f, fi: x.fi || 0, su: x.su || 0 }));
  } catch (e) { bls = []; }
  blsReady = true;
  if (sheetMode === 'add') renderAddResults();
}

function prepFood(food) {
  if (!food._n) food._n = norm(food.n + ' ' + (food.brand || ''));
  if (!food._w) { food._w = food._n.split(/\s+/).filter(Boolean); food._c = food._w.join(''); }
  return food;
}
function searchFoods(q, { includeRecipes = true } = {}) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const own = state.custom.filter((x) => includeRecipes || x.src !== 'recipe').map((x) => prepFood(Object.assign({}, x)));
  const favIds = new Set(state.favs.map((x) => x.id));
  const hits = [];
  for (const food of own.concat(bls)) {
    prepFood(food);
    let score = food._w.length * 40 + food._n.length;
    let ok = true;
    for (const t of terms) {
      if (food._w.includes(t)) score -= 400;                      // ganzes Wort
      else if (t.length >= 2 && food._w.some((w) => w.endsWith(t))) score -= 350; // Wortende: im Deutschen das Grundwort (Voll-milch, Hühner-ei)
      else if (food._w.some((w) => w.startsWith(t))) score -= 150; // Wortanfang
      else if (food._n.includes(t)) score += 0;                    // irgendwo im Wort
      else if (food._c.includes(t)) score -= 450;                  // ohne Leerzeichen, z. B. „haferflocken“ → „Hafer Flocken“
      else { ok = false; break; }
    }
    if (!ok) continue;
    const first = food._w[0], t0 = terms[0];
    if (first === t0 || first.endsWith(t0) || (t0.length > first.length && food._c.startsWith(t0))) score -= 300;
    // Zusammengesetzte Gerichte („… mit Milch“) nach hinten, außer man sucht explizit danach
    if (!terms.includes('mit') && food._w.includes('mit')) score += 1500;
    if (food.src !== 'bls') score -= 2000;
    if (favIds.has(food.id)) score -= 3000;
    hits.push([score, food]);
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

/* ---------- Backup-Erinnerung ---------- */
function backupDue() {
  const hasData = Object.values(state.days).some((l) => l.length) || state.custom.length;
  if (!hasData) return false;
  if (!state.lastBackup) return true;
  return (Date.now() - state.lastBackup) / 86400000 >= BACKUP_REMIND_DAYS;
}
function backupText() {
  if (!state.lastBackup) return 'Noch kein Backup erstellt.';
  const d = Math.floor((Date.now() - state.lastBackup) / 86400000);
  return `Letztes Backup: ${d === 0 ? 'heute' : d === 1 ? 'gestern' : `vor ${d} Tagen`}.`;
}

/* ---------- Tagebuch ---------- */
function copyEntries(fromDate, meal) {
  const src = (state.days[fromDate] || []).filter((e) => !meal || e.meal === meal);
  if (!src.length) return 0;
  const target = (state.days[currentDate] = state.days[currentDate] || []);
  src.forEach((e) => target.push(Object.assign({}, e, { id: uid() })));
  save();
  return src.length;
}

const openMeals = new Set();   // aufgeklappte Mahlzeiten (nur für diese Sitzung)
function renderDiary() {
  const v = $('#view');
  const s = goalsFor(currentDate);
  const goal = s.goal;
  const entries = state.days[currentDate] || [];
  const t = sumEntries(entries);
  const prev = addDays(currentDate, -1);
  const prevEntries = state.days[prev] || [];
  const frac = goal ? Math.min(1, t.k / goal) : 0;
  const over = goal && t.k > goal;
  const rest = goal ? goal - t.k : null;
  const ARC = 345.6; // Länge des Halbkreises (r = 110)
  const de = (n) => r0(n).toLocaleString('de-DE');
  const weekday = new Date(currentDate + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const tile = (cls, label, val, target) => `
    <div class="tile ${cls}">
      <div class="lbl">${label}</div>
      <div class="val">${r0(val)} <span>${target ? `/ ${r0(target)} g` : 'g'}</span></div>
      <div class="mbar"><span style="width:${target ? Math.min(100, (val / target) * 100) : 0}%"></span></div>
    </div>`;

  let html = `
    <div class="topbar">
      <div><div class="sub">${esc(weekday)}</div><div class="day">${esc(fmtDate(currentDate))}</div></div>
      <div class="nav"><button class="icon-btn" id="prevDay" aria-label="Vorheriger Tag">‹</button><button class="icon-btn" id="nextDay" aria-label="Nächster Tag">›</button></div>
    </div>`;

  if (backupDue()) {
    html += `<div class="card notice"><div><strong>Backup fällig</strong><div class="small muted">${backupText()} Deine Daten liegen nur auf diesem Handy.</div></div>
      <button class="btn secondary" id="quickBackup" style="flex:0 0 auto">Sichern</button></div>`;
  }
  if (!goal) {
    html += `<div class="card"><h2>Willkommen!</h2><p class="muted small" style="margin-top:4px">Trage zuerst dein tägliches Kalorienziel ein, z. B. deinen Tagesbedarf aus Garmin.</p>
      <button class="btn block" id="toSettings">Ziel festlegen</button></div>`;
  }

  html += `
    <div class="card hero">
      <div class="gauge">
        <svg viewBox="0 0 260 140" role="img" aria-label="${goal ? `${r0(frac * 100)} Prozent des Tagesziels gegessen` : 'Kein Tagesziel festgelegt'}">
          <path class="track" d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke-width="14" stroke-linecap="round"></path>
          ${goal && t.k > 0 ? `<path class="fill ${over ? 'over' : ''}" d="M 20 130 A 110 110 0 0 1 240 130" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(frac * ARC).toFixed(1)} ${ARC}"></path>` : ''}
        </svg>
        <div class="center">
          <div class="big ${over ? 'over' : ''}">${goal ? de(Math.abs(rest)) : de(t.k)}</div>
          <div class="cap">${goal ? `${over ? 'kcal über Ziel' : 'kcal übrig'} · ${de(t.k)} von ${de(goal)}` : 'kcal gegessen'}</div>
        </div>
      </div>
      <div class="tiles">
        ${tile('p', 'Eiweiß', t.p, s.protein)}
        ${tile('c', 'Kohlenhydr.', t.c, s.carbs)}
        ${tile('f', 'Fett', t.f, s.fat)}
      </div>
      <div class="subline">
        <span>Ballaststoffe <strong>${r0(t.fi)}${s.fiber ? ` / ${r0(s.fiber)}` : ''} g</strong></span>
        <span>Zucker <strong class="${s.sugar && t.su > s.sugar ? 'over' : ''}">${r0(t.su)}${s.sugar ? ` / ${r0(s.sugar)}` : ''} g</strong></span>
      </div>
    </div>`;

  for (const m of MEALS) {
    const list = entries.filter((e) => e.meal === m.id);
    const kcal = list.reduce((sum, e) => sum + entryTotals(e).k, 0);
    const prevMeal = prevEntries.filter((e) => e.meal === m.id);
    const open = openMeals.has(m.id);
    const sub = list.length
      ? (list.length === 1 ? `${esc(list[0].n)} · ${de(kcal)} kcal` : `${list.length} Einträge · ${de(kcal)} kcal`)
      : (prevMeal.length ? 'Noch leer · gestern gab es etwas' : 'Noch leer');
    html += `<div class="card meal ${list.length ? '' : 'is-empty'}">
      <div class="meal-head">
        <button class="meal-toggle" ${list.length ? `data-toggle="${m.id}" aria-expanded="${open}"` : 'disabled'}>
          <h2>${m.label}${list.length ? `<span class="chev">${open ? '▴' : '▾'}</span>` : ''}</h2>
          <div class="sub">${sub}</div>
        </button>
        <button class="add-btn ${list.length ? '' : 'primary'}" data-add="${m.id}" aria-label="${m.label} hinzufügen">+</button>
      </div>
      ${open && list.length ? `<div class="entries">${list.map((e) => `<div class="entry" data-entry="${e.id}">
        <div class="name">${esc(e.n)}<div class="small muted">${e.quick ? 'Schnelleintrag' : `${r1(e.grams)} g`}</div></div>
        <div class="kcal">${de(entryTotals(e).k)} kcal</div></div>`).join('')}</div>` : ''}
      ${!list.length && prevMeal.length ? `<button class="btn ghost copy" data-copy="${m.id}">↺ Wie am Vortag (${de(prevMeal.reduce((a, e) => a + entryTotals(e).k, 0))} kcal)</button>` : ''}
    </div>`;
  }
  if (!entries.length && prevEntries.length) {
    html += `<button class="btn secondary block" id="copyDay" style="margin-top:4px">Ganzen Vortag übernehmen (${de(sumEntries(prevEntries).k)} kcal)</button>`;
  }
  v.innerHTML = html;

  $('#prevDay').onclick = () => { currentDate = addDays(currentDate, -1); openMeals.clear(); renderDiary(); };
  $('#nextDay').onclick = () => { currentDate = addDays(currentDate, 1); openMeals.clear(); renderDiary(); };
  const ts = $('#toSettings'); if (ts) ts.onclick = () => document.querySelector('[data-tab="settings"]').click();
  const qb = $('#quickBackup'); if (qb) qb.onclick = async () => { await exportBackup(); renderDiary(); };
  v.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = () => {
    const id = b.dataset.toggle; if (openMeals.has(id)) openMeals.delete(id); else openMeals.add(id);
    const y = window.scrollY; renderDiary(); window.scrollTo(0, y);
  });
  v.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => { openMeals.add(b.dataset.add); openAdd(b.dataset.add); });
  v.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { const n = copyEntries(prev, b.dataset.copy); openMeals.add(b.dataset.copy); toast(`${n} übernommen`); renderDiary(); });
  const cd = $('#copyDay'); if (cd) cd.onclick = () => { const n = copyEntries(prev, null); toast(`${n} Einträge übernommen`); renderDiary(); };
  v.querySelectorAll('[data-entry]').forEach((el) => el.onclick = () => {
    const e = entries.find((x) => x.id === el.dataset.entry);
    if (!e) return;
    if (e.quick) openQuick(e.meal, e); else openAmount(e, { edit: true });
  });
}

/* ---------- Sheet ---------- */
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
      <button data-t="search">Suche</button><button data-t="mine">Meine</button>
      <button data-t="scan">Barcode</button><button data-t="custom">Neu</button>
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
  } else if (addTab === 'mine') {
    renderMine();
  } else if (addTab === 'scan') {
    renderScan();
  } else {
    renderNew();
  }
}

function foodLi(f, i) {
  const tag = { off: 'Barcode', custom: 'Eigenes', recipe: 'Rezept' }[f.src];
  const star = isFav(f.id) ? '<span class="star">★</span>' : '';
  return `<li data-i="${i}"><div>${star}${esc(f.n)}${tag ? `<span class="tag">${tag}</span>` : ''}<div class="meta">${f.brand ? esc(f.brand) + ' · ' : ''}${r0(f.k)} kcal / 100 g</div></div><div class="meta">›</div></li>`;
}
function bindList(root, items, onPick) {
  root.querySelectorAll('li[data-i]').forEach((li) => li.onclick = () => onPick(items[+li.dataset.i]));
}

function renderAddResults() {
  const ul = $('#results'); if (!ul) return;
  if (!addQuery.trim()) {
    ul.innerHTML = `<div class="empty">${!blsReady ? 'Lade Lebensmitteldaten…' : bls.length ? `${bls.length.toLocaleString('de-DE')} Lebensmittel aus dem BLS verfügbar.` : 'Lebensmitteldatenbank nicht geladen – nutze Barcode oder „Neu“.'}</div>`;
    return;
  }
  const hits = searchFoods(addQuery);
  ul.innerHTML = hits.length ? hits.map((f, i) => foodLi(f, i)).join('')
    : '<div class="empty">Nichts gefunden. Unter „Neu“ kannst du es selbst anlegen.</div>';
  bindList(ul, hits, (f) => openAmount(f));
}

function renderMine() {
  const favs = state.favs;
  const recent = state.recent.filter((r) => !isFav(r.id)).slice(0, 30);
  const own = state.custom;
  const sec = (title, items, key) => items.length ? `<h2 class="sec">${title}</h2><ul class="list" data-sec="${key}">${items.map((f, i) => foodLi(f, i)).join('')}</ul>` : '';
  $('#addBody').innerHTML = (favs.length || recent.length || own.length)
    ? sec('★ Favoriten', favs, 'fav') + sec('Zuletzt verwendet', recent, 'recent') + sec('Eigene Lebensmittel & Rezepte', own, 'own')
    : '<div class="empty">Noch nichts vorhanden. Favoriten markierst du mit dem Stern beim Eintragen.</div>';
  const map = { fav: favs, recent, own };
  document.querySelectorAll('#addBody [data-sec]').forEach((ul) => bindList(ul, map[ul.dataset.sec], (f) => openAmount(f)));
}

/* ---------- Mengen-Dialog ---------- */
function openAmount(food, opts = {}) {
  stopScanner();
  const edit = !!opts.edit;
  sheetMode = 'amount';
  const foodId = food.ref || food.id;
  const recentHit = state.recent.find((r) => r.id === foodId);
  const defGrams = edit ? food.grams : ((recentHit && recentHit.lastGrams) || food.serving || 100);
  const mealSel = edit ? food.meal : addMeal;
  const ownFood = state.custom.find((x) => x.id === foodId);
  const fav = isFav(foodId);
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="back">‹ Zurück</button>
      <button class="btn ghost star-btn" id="favBtn" aria-label="Favorit">${fav ? '★' : '☆'}</button></div>
    <h1>${esc(food.n)}</h1>
    ${food.brand ? `<p class="muted">${esc(food.brand)}</p>` : ''}
    <p class="small muted">Pro 100 g: ${r0(food.k)} kcal · E ${r1(food.p)} g · KH ${r1(food.c)} g · F ${r1(food.f)} g · Ballastst. ${r1(food.fi)} g · Zucker ${r1(food.su)} g</p>
    <label for="grams">Menge in Gramm</label>
    <input id="grams" type="text" inputmode="decimal" value="${r1(defGrams)}">
    ${food.serving ? `<button class="btn ghost" id="serving">1 Portion = ${r1(food.serving)} g</button>` : ''}
    <div class="nutri" id="nutri"></div>
    <label for="meal">Mahlzeit</label>
    <select id="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === mealSel ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
    <div style="height:14px"></div>
    <button class="btn block" id="save">${edit ? 'Speichern' : 'Hinzufügen'}</button>
    ${edit ? '<div style="height:10px"></div><button class="btn danger block" id="del">Eintrag löschen</button>' : ''}
    ${!edit && ownFood ? `<div style="height:10px"></div><button class="btn ghost block" id="editOwn">${ownFood.src === 'recipe' ? 'Rezept bearbeiten' : 'Lebensmittel bearbeiten'}</button>` : ''}`);

  const g = $('#grams');
  const upd = () => {
    const x = per(food, num(g.value) || 0);
    $('#nutri').innerHTML = `<div><strong>${r0(x.k)}</strong><span>kcal</span></div><div><strong>${r1(x.p)}</strong><span>Eiweiß</span></div>
      <div><strong>${r1(x.c)}</strong><span>KH</span></div><div><strong>${r1(x.f)}</strong><span>Fett</span></div>
      <div><strong>${r1(x.fi)}</strong><span>Ballastst.</span></div><div><strong>${r1(x.su)}</strong><span>Zucker</span></div>`;
  };
  g.oninput = upd; upd();
  const sv = $('#serving'); if (sv) sv.onclick = () => { g.value = r1(food.serving); upd(); };
  const back = () => { if (edit) closeSheet(); else openAdd(addMeal); };
  $('#back').onclick = back;
  $('#favBtn').onclick = () => {
    if (isFav(foodId)) { state.favs = state.favs.filter((x) => x.id !== foodId); $('#favBtn').textContent = '☆'; toast('Aus Favoriten entfernt'); }
    else { state.favs.unshift(foodSnap(food)); $('#favBtn').textContent = '★'; toast('Zu Favoriten hinzugefügt'); }
    save();
  };
  const eo = $('#editOwn');
  if (eo) eo.onclick = () => { if (ownFood.src === 'recipe') openRecipe(ownFood); else openFoodForm(ownFood); };

  $('#save').onclick = () => {
    const grams = num(g.value);
    if (!grams || grams <= 0) { toast('Bitte eine Menge eingeben.'); return; }
    const meal = $('#meal').value;
    if (edit) {
      const e = (state.days[currentDate] || []).find((x) => x.id === food.id);
      if (e) { e.grams = grams; e.meal = meal; }
    } else {
      const entry = Object.assign({ id: uid(), meal, grams, ref: foodId, src: food.src, n: food.n, brand: food.brand || '' }, nutrientsOf(food));
      (state.days[currentDate] = state.days[currentDate] || []).push(entry);
      state.recent = [Object.assign(foodSnap(food), { lastGrams: grams })].concat(state.recent.filter((x) => x.id !== foodId)).slice(0, 60);
    }
    save();
    toast(edit ? 'Gespeichert' : 'Hinzugefügt');
    back();
  };
  const del = $('#del');
  if (del) del.onclick = () => {
    state.days[currentDate] = (state.days[currentDate] || []).filter((x) => x.id !== food.id);
    save(); toast('Gelöscht'); closeSheet();
  };
}

/* ---------- Schnelleintrag ---------- */
function openQuick(meal, entry) {
  sheetMode = 'quick';
  const e = entry || {};
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="back">‹ Zurück</button><span></span></div>
    <h1>Schnelleintrag</h1>
    <p class="small muted">Für Restaurant oder Unterwegs: nur die Gesamtwerte eintragen.</p>
    <label for="qN">Bezeichnung (optional)</label><input id="qN" type="text" value="${esc(e.n && e.n !== 'Schnelleintrag' ? e.n : '')}" placeholder="z. B. Pizza beim Italiener">
    <label for="qK">Kalorien (kcal)</label><input id="qK" inputmode="decimal" value="${e.k ?? ''}">
    <div class="row">
      <div><label for="qP">Eiweiß g</label><input id="qP" inputmode="decimal" value="${e.p || ''}"></div>
      <div><label for="qC">KH g</label><input id="qC" inputmode="decimal" value="${e.c || ''}"></div>
      <div><label for="qF">Fett g</label><input id="qF" inputmode="decimal" value="${e.f || ''}"></div>
    </div>
    <label for="qMeal">Mahlzeit</label>
    <select id="qMeal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === (e.meal || meal) ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
    <div style="height:14px"></div>
    <button class="btn block" id="qSave">${entry ? 'Speichern' : 'Hinzufügen'}</button>
    ${entry ? '<div style="height:10px"></div><button class="btn danger block" id="qDel">Eintrag löschen</button>' : ''}`);
  const back = () => { if (entry) closeSheet(); else openAdd(addMeal); };
  $('#back').onclick = back;
  $('#qSave').onclick = () => {
    const k = num($('#qK').value);
    if (k == null || k < 0) { toast('Bitte Kalorien eingeben.'); return; }
    // Schnelleinträge werden als „100 g“ mit Absolutwerten gespeichert, damit die Rechnung einheitlich bleibt.
    const vals = { quick: true, grams: 100, n: $('#qN').value.trim() || 'Schnelleintrag', k, p: num($('#qP').value) || 0, c: num($('#qC').value) || 0, f: num($('#qF').value) || 0, fi: 0, su: 0, meal: $('#qMeal').value, src: 'quick' };
    if (entry) Object.assign((state.days[currentDate] || []).find((x) => x.id === entry.id) || {}, vals);
    else (state.days[currentDate] = state.days[currentDate] || []).push(Object.assign({ id: uid() }, vals));
    save(); toast(entry ? 'Gespeichert' : 'Hinzugefügt'); back();
  };
  const qd = $('#qDel');
  if (qd) qd.onclick = () => { state.days[currentDate] = (state.days[currentDate] || []).filter((x) => x.id !== entry.id); save(); toast('Gelöscht'); closeSheet(); };
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
  }).catch(() => { const r = $('#scanResult'); if (r) r.innerHTML = '<p class="muted">Kein Kamerazugriff. Erlaube die Kamera in den Safari-Einstellungen oder tippe den Barcode ein.</p>'; });
}
function stopScanner() { if (scanner) { try { scanner.reset(); } catch (e) {} scanner = null; } }

async function lookupBarcode(code) {
  const out = $('#scanResult');
  const own = state.custom.find((x) => x.barcode === code);
  if (own) { openAmount(own); return; }
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
      $('#createOwn').onclick = () => openFoodForm({ barcode: code });
      return;
    }
    const food = {
      src: 'off', id: 'off:' + code, barcode: code,
      n: p.product_name_de || p.product_name || ('Produkt ' + code),
      brand: (p.brands || '').split(',')[0].trim(),
      k, p: num(nm.proteins_100g) || 0, c: num(nm.carbohydrates_100g) || 0, f: num(nm.fat_100g) || 0,
      fi: num(nm.fiber_100g) || 0, su: num(nm.sugars_100g) || 0,
      serving: num(p.serving_quantity) || null,
    };
    state.offCache[code] = food; save();
    openAmount(food);
  } catch (e) {
    out.innerHTML = '<p class="muted">Keine Verbindung zu Open Food Facts. Bitte später erneut versuchen.</p>';
  }
}

/* ---------- Neu: Schnelleintrag, Lebensmittel, Rezept ---------- */
function renderNew() {
  $('#addBody').innerHTML = `
    <ul class="list choice">
      <li id="newQuick"><div><strong>Schnelleintrag</strong><div class="meta">Nur kcal eintragen, z. B. im Restaurant</div></div><div class="meta">›</div></li>
      <li id="newFood"><div><strong>Eigenes Lebensmittel</strong><div class="meta">Nährwerte pro 100 g, z. B. von der Verpackung</div></div><div class="meta">›</div></li>
      <li id="newRecipe"><div><strong>Rezept</strong><div class="meta">Aus mehreren Zutaten zusammenstellen</div></div><div class="meta">›</div></li>
    </ul>`;
  $('#newQuick').onclick = () => openQuick(addMeal);
  $('#newFood').onclick = () => openFoodForm();
  $('#newRecipe').onclick = () => openRecipe();
}

function openFoodForm(existing) {
  sheetMode = 'food';
  const e = existing || {};
  const isEdit = !!e.id;
  const v = (x) => (x == null || x === 0 && !isEdit ? '' : x);
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="back">‹ Zurück</button><span></span></div>
    <h1>${isEdit ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel'}</h1>
    <p class="small muted">Werte pro 100 g, z. B. von der Verpackung.</p>
    <label for="cName">Name</label><input id="cName" type="text" value="${esc(e.n || '')}">
    <label for="cBrand">Marke (optional)</label><input id="cBrand" type="text" value="${esc(e.brand || '')}">
    <div class="row">
      <div><label for="cK">kcal</label><input id="cK" inputmode="decimal" value="${v(e.k)}"></div>
      <div><label for="cP">Eiweiß g</label><input id="cP" inputmode="decimal" value="${v(e.p)}"></div>
    </div>
    <div class="row">
      <div><label for="cC">KH g</label><input id="cC" inputmode="decimal" value="${v(e.c)}"></div>
      <div><label for="cF">Fett g</label><input id="cF" inputmode="decimal" value="${v(e.f)}"></div>
    </div>
    <div class="row">
      <div><label for="cFi">Ballaststoffe g</label><input id="cFi" inputmode="decimal" value="${v(e.fi)}"></div>
      <div><label for="cSu">davon Zucker g</label><input id="cSu" inputmode="decimal" value="${v(e.su)}"></div>
    </div>
    <div class="row">
      <div><label for="cServ">Portion g (optional)</label><input id="cServ" inputmode="decimal" value="${e.serving || ''}"></div>
      <div><label for="cBarcode">Barcode (optional)</label><input id="cBarcode" inputmode="numeric" value="${esc(e.barcode || '')}"></div>
    </div>
    <div style="height:14px"></div>
    <button class="btn block" id="cSave">${isEdit ? 'Speichern' : 'Speichern & auswählen'}</button>
    ${isEdit ? '<div style="height:10px"></div><button class="btn danger block" id="cDel">Lebensmittel löschen</button>' : ''}`);
  $('#back').onclick = () => { if (isEdit) openAmount(e); else openAdd(addMeal); };
  $('#cSave').onclick = () => {
    const n = $('#cName').value.trim(); const k = num($('#cK').value);
    if (!n || k == null) { toast('Name und kcal sind Pflicht.'); return; }
    const food = {
      src: 'custom', id: e.id || 'custom:' + uid(), n, brand: $('#cBrand').value.trim(), k,
      p: num($('#cP').value) || 0, c: num($('#cC').value) || 0, f: num($('#cF').value) || 0,
      fi: num($('#cFi').value) || 0, su: num($('#cSu').value) || 0,
      serving: num($('#cServ').value) || null, barcode: ($('#cBarcode').value || '').replace(/\D/g, '') || null,
    };
    saveOwnFood(food);
    if (isEdit) { toast('Gespeichert'); openAmount(food); } else openAmount(food);
  };
  const cd = $('#cDel');
  if (cd) cd.onclick = () => deleteOwnFood(e);
}

function saveOwnFood(food) {
  const i = state.custom.findIndex((x) => x.id === food.id);
  if (i >= 0) state.custom[i] = food; else state.custom.push(food);
  // Favoriten/Zuletzt-Kopien aktualisieren (bereits eingetragene Tage bleiben unverändert)
  state.favs = state.favs.map((x) => (x.id === food.id ? foodSnap(food) : x));
  state.recent = state.recent.map((x) => (x.id === food.id ? Object.assign(foodSnap(food), { lastGrams: x.lastGrams }) : x));
  save();
}
function deleteOwnFood(food) {
  if (!confirm(`„${food.n}“ löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)) return;
  state.custom = state.custom.filter((x) => x.id !== food.id);
  state.favs = state.favs.filter((x) => x.id !== food.id);
  state.recent = state.recent.filter((x) => x.id !== food.id);
  save(); toast('Gelöscht'); addTab = 'mine'; openAdd(addMeal);
}

/* ---------- Rezepte ---------- */
let draft = null;
function openRecipe(existing) {
  sheetMode = 'recipe';
  draft = existing
    ? { id: existing.id, n: existing.n, items: existing.items.map((x) => Object.assign({}, x)), finalWeight: existing.finalWeight || null, portions: existing.portions || null }
    : { id: null, n: '', items: [], finalWeight: null, portions: null };
  renderRecipe('');
}
function recipeCalc(d) {
  const raw = d.items.reduce((s, x) => s + (x.grams || 0), 0);
  const tot = { k: 0, p: 0, c: 0, f: 0, fi: 0, su: 0 };
  d.items.forEach((x) => { const v = per(x.food, x.grams || 0); NUTRIENTS.forEach((n) => { tot[n] += v[n]; }); });
  const weight = d.finalWeight || raw;
  const per100 = {}; NUTRIENTS.forEach((n) => { per100[n] = weight ? (tot[n] / weight) * 100 : 0; });
  return { raw, weight, tot, per100 };
}
function renderRecipe(query) {
  const d = draft;
  const calc = recipeCalc(d);
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="back">‹ Zurück</button><span></span></div>
    <h1>${d.id ? 'Rezept bearbeiten' : 'Neues Rezept'}</h1>
    <label for="rName">Name</label><input id="rName" type="text" value="${esc(d.n)}" placeholder="z. B. Overnight Oats">
    <h2 class="sec">Zutaten (roh)</h2>
    ${d.items.length ? `<ul class="list ingr">${d.items.map((x, i) => `<li><div class="grow">${esc(x.food.n)}<div class="meta">${r0(per(x.food, x.grams || 0).k)} kcal</div></div>
      <input class="g" data-g="${i}" inputmode="decimal" value="${r1(x.grams)}" aria-label="Gramm"><span class="meta">g</span>
      <button class="btn ghost rm" data-rm="${i}" aria-label="Entfernen">✕</button></li>`).join('')}</ul>` : '<div class="empty">Noch keine Zutaten.</div>'}
    <input id="rQ" type="search" placeholder="Zutat suchen und antippen" autocomplete="off" value="${esc(query)}">
    <ul class="list" id="rResults"></ul>
    <div class="row">
      <div><label for="rW">Endgewicht g (optional)</label><input id="rW" inputmode="decimal" value="${d.finalWeight || ''}" placeholder="${r0(calc.raw)}"></div>
      <div><label for="rPo">Portionen (optional)</label><input id="rPo" inputmode="decimal" value="${d.portions || ''}"></div>
    </div>
    <p class="small muted" style="margin-top:6px">Endgewicht = Gewicht nach dem Kochen (z. B. Topf wiegen minus Topf). Ohne Angabe wird das Rohgewicht verwendet.</p>
    <div class="card" id="rSum"></div>
    <button class="btn block" id="rSave">Rezept speichern</button>
    ${d.id ? '<div style="height:10px"></div><button class="btn danger block" id="rDel">Rezept löschen</button>' : ''}`);

  const sum = () => {
    const c = recipeCalc(draft);
    const portion = draft.portions ? c.weight / draft.portions : null;
    $('#rSum').innerHTML = `<div class="spread"><span class="muted">Gesamt</span><strong>${r0(c.tot.k)} kcal · ${r0(c.weight)} g</strong></div>
      <div class="spread"><span class="muted">Pro 100 g</span><strong>${r0(c.per100.k)} kcal</strong></div>
      ${portion ? `<div class="spread"><span class="muted">Pro Portion (${r0(portion)} g)</span><strong>${r0(c.tot.k / draft.portions)} kcal</strong></div>` : ''}`;
  };
  sum();
  $('#rName').oninput = (ev) => { draft.n = ev.target.value; };
  $('#rW').oninput = (ev) => { draft.finalWeight = num(ev.target.value); sum(); };
  $('#rPo').oninput = (ev) => { draft.portions = num(ev.target.value); sum(); };
  document.querySelectorAll('[data-g]').forEach((inp) => inp.oninput = () => { draft.items[+inp.dataset.g].grams = num(inp.value) || 0; sum(); });
  document.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { draft.items.splice(+b.dataset.rm, 1); renderRecipe($('#rQ').value); });

  const q = $('#rQ');
  const showResults = () => {
    const hits = q.value.trim() ? searchFoods(q.value, { includeRecipes: false }).slice(0, 20) : [];
    $('#rResults').innerHTML = hits.map((f, i) => foodLi(f, i)).join('');
    bindList($('#rResults'), hits, (f) => {
      draft.items.push({ food: Object.assign(nutrientsOf(f), { id: f.id, n: f.n, src: f.src }), grams: 100 });
      renderRecipe('');
      toast('Zutat mit 100 g hinzugefügt – Menge anpassen');
    });
  };
  q.oninput = showResults; showResults();

  $('#back').onclick = () => { draft = null; if (d.id) { const f = state.custom.find((x) => x.id === d.id); if (f) { openAmount(f); return; } } addTab = 'custom'; openAdd(addMeal); };
  $('#rSave').onclick = () => {
    draft.n = $('#rName').value.trim();
    if (!draft.n) { toast('Bitte einen Namen eingeben.'); return; }
    if (!draft.items.length) { toast('Bitte mindestens eine Zutat hinzufügen.'); return; }
    const c = recipeCalc(draft);
    if (!c.weight) { toast('Gewicht der Zutaten fehlt.'); return; }
    const food = Object.assign({
      src: 'recipe', id: draft.id || 'recipe:' + uid(), n: draft.n, brand: '',
      serving: draft.portions ? c.weight / draft.portions : null,
      items: draft.items, finalWeight: draft.finalWeight || null, portions: draft.portions || null,
    }, c.per100);
    saveOwnFood(food);
    draft = null;
    toast('Rezept gespeichert');
    openAmount(food);
  };
  const rd = $('#rDel');
  if (rd) rd.onclick = () => { const f = state.custom.find((x) => x.id === d.id); if (f) deleteOwnFood(f); };
}

/* ---------- Verlauf ---------- */
let histRange = 14;
function renderHistory() {
  const today = isoDate(new Date());
  const days = [];
  for (let i = histRange - 1; i >= 0; i--) { const d = addDays(today, -i); days.push({ d, t: dayTotals(d), n: (state.days[d] || []).length, goal: goalsFor(d).goal }); }
  const tracked = days.filter((x) => x.n > 0);
  const avg = (key) => (tracked.length ? tracked.reduce((s, x) => s + x.t[key], 0) / tracked.length : 0);
  const withGoal = tracked.filter((x) => x.goal);
  const avgDiff = withGoal.length ? withGoal.reduce((s, x) => s + (x.t.k - x.goal), 0) / withGoal.length : null;
  const max = Math.max(...days.map((x) => Math.max(x.goal || 0, x.t.k)), 1) * 1.1;
  const W = 340, H = 180, pad = 22, bw = (W - pad) / days.length;
  const y = (v) => H - 18 - (v / max) * (H - 30);
  const bars = days.map((x, i) => {
    const h = (H - 18) - y(x.t.k);
    const lbl = (histRange <= 14 || i % 5 === 0) ? `<text x="${pad + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${new Date(x.d + 'T12:00:00').getDate()}</text>` : '';
    return `<rect class="b ${x.goal && x.t.k > x.goal ? 'over' : ''}" x="${pad + i * bw + bw * 0.15}" y="${y(x.t.k)}" width="${bw * 0.7}" height="${Math.max(0, h)}" rx="2"></rect>${lbl}`;
  }).join('');
  // Ziel-Linie als Treppe: jeder Tag mit seinem damals gültigen Ziel
  let path = '';
  days.forEach((x, i) => {
    if (!x.goal) return;
    const x0 = pad + i * bw, x1 = x0 + bw, yy = y(x.goal).toFixed(1);
    const prevGoal = i > 0 ? days[i - 1].goal : null;
    path += (prevGoal ? `L ${x0.toFixed(1)} ${yy} ` : `M ${x0.toFixed(1)} ${yy} `) + `L ${x1.toFixed(1)} ${yy} `;
  });
  const lastGoal = days[days.length - 1].goal;
  const firstWithGoal = days.find((x) => x.goal);
  const goalLine = path ? `<path class="goal" d="${path}" fill="none"></path>${firstWithGoal ? `<text x="0" y="${y(firstWithGoal.goal) + 3}">${r0(firstWithGoal.goal)}</text>` : ''}` : '';
  const a = avg('k');
  const goalChanges = new Set(days.map((x) => x.goal)).size > 1;

  $('#view').innerHTML = `
    <h1>Verlauf</h1>
    <div class="seg three" id="rangeSeg"><button data-r="7">7 Tage</button><button data-r="14">14 Tage</button><button data-r="30">30 Tage</button></div>
    <div class="card chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kalorien pro Tag">${goalLine}${bars}</svg></div>
    <div class="card">
      <div class="spread"><span class="muted">Ø kcal an getrackten Tagen</span><strong>${r0(a)} kcal</strong></div>
      <div class="spread"><span class="muted">Getrackte Tage</span><strong>${tracked.length} / ${histRange}</strong></div>
      ${lastGoal || withGoal.length ? `<div class="spread"><span class="muted">Ø Differenz zum Ziel</span><strong>${avgDiff != null ? (avgDiff > 0 ? '+' : '') + r0(avgDiff) + ' kcal' : '–'}</strong></div>` : ''}
      <div class="spread"><span class="muted">Ø Eiweiß / KH / Fett</span><strong>${r0(avg('p'))} / ${r0(avg('c'))} / ${r0(avg('f'))} g</strong></div>
      <div class="spread"><span class="muted">Ø Ballaststoffe / Zucker</span><strong>${r0(avg('fi'))} / ${r0(avg('su'))} g</strong></div>
      <p class="small muted" style="margin-top:8px">Nicht getrackte Tage fließen nicht in den Durchschnitt ein. Ein Tag mit wenig Einträgen ist nicht unbedingt ein Tag mit wenig Essen.${goalChanges ? ' Die Differenz zum Ziel nutzt für jeden Tag das damals gültige Ziel.' : ''}</p>
    </div>`;
  $('#rangeSeg').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', +b.dataset.r === histRange);
    b.onclick = () => { histRange = +b.dataset.r; renderHistory(); };
  });
}

/* ---------- Einstellungen ---------- */
function renderSettings() {
  const today = isoDate(new Date());
  const s = goalsFor(today);
  const fmtD = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE');
  const hist = state.goalHistory.slice().reverse();
  $('#view').innerHTML = `
    <h1>Einstellungen</h1>
    <div class="card">
      <h2>Tagesziel</h2>
      <label for="sGoal">Kalorien pro Tag (kcal)</label><input id="sGoal" inputmode="decimal" value="${s.goal ?? ''}" placeholder="z. B. Tagesbedarf aus Garmin">
      <label for="sW">Körpergewicht (kg)</label><input id="sW" inputmode="decimal" value="${s.weight != null ? r1(s.weight) : ''}" placeholder="z. B. 80">
      <label>Ernährungsziel</label>
      <div class="seg" id="presetSeg">${Object.entries(PRESETS).map(([k, p]) => `<button type="button" data-preset="${k}">${p.label}</button>`).join('')}</div>
      <div class="row">
        <div><label for="sPf">Eiweiß (g/kg)</label><input id="sPf" inputmode="decimal"></div>
        <div><label for="sFf">Fett (g/kg)</label><input id="sFf" inputmode="decimal"></div>
      </div>
      <div class="card macro-preview" id="macroPreview"></div>
      <details class="why"><summary>Warum diese Werte? Quellen</summary><div id="presetWhy"></div></details>
      <div class="row">
        <div><label for="sFi">Ballaststoffe (g)</label><input id="sFi" inputmode="decimal" value="${s.fiber ?? ''}" placeholder="DGE: mind. 30"></div>
        <div><label for="sSu">Zucker max. (g)</label><input id="sSu" inputmode="decimal" value="${s.sugar ?? ''}"></div>
      </div>
      <label for="sFrom">Gültig ab</label><input id="sFrom" type="date" value="${today}" max="${addDays(today, 365)}">
      <p class="small muted" style="margin-top:6px">Frühere Tage behalten ihr damaliges Ziel.</p>
      <div style="height:6px"></div>
      <button class="btn block" id="sSave">Speichern</button>
      ${hist.length ? `<h2 class="sec">Verlauf der Ziele</h2><ul class="list goals">${hist.map((h) => `<li><div>ab ${fmtD(h.from)}${h.from <= today && goalsFor(today) === h ? '<span class="tag">aktuell</span>' : ''}<div class="meta">${h.goal ? `${r0(h.goal).toLocaleString('de-DE')} kcal` : 'kein kcal-Ziel'}${h.preset && PRESETS[h.preset] ? ` · ${PRESETS[h.preset].label}` : ''}${h.weight ? ` · ${r1(h.weight)} kg` : ''}${[['protein', 'Eiweiß'], ['carbs', 'KH'], ['fat', 'Fett'], ['fiber', 'Ballastst.'], ['sugar', 'Zucker max.']].filter(([k]) => h[k]).map(([k, l]) => ` · ${l} ${r0(h[k])} g`).join('')}</div></div>
        ${hist.length > 1 ? `<button class="btn ghost rm" data-delgoal="${h.from}" aria-label="Ziel ab ${fmtD(h.from)} löschen">✕</button>` : ''}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <h2>Backup</h2>
      <p class="small muted">Deine Daten liegen nur auf diesem Gerät. ${backupText()} Du wirst nach ${BACKUP_REMIND_DAYS} Tagen erinnert.</p>
      <div class="row"><button class="btn secondary" id="exp">Exportieren</button><button class="btn secondary" id="impBtn">Importieren</button></div>
      <input type="file" id="imp" accept="application/json,.json" hidden>
      <div style="height:10px"></div>
      <button class="btn danger block" id="wipe">Alle Daten löschen</button>
    </div>
    <div class="card sources">
      <h2 style="color:var(--ink)">Quellen & Lizenzen</h2>
      <p>Lebensmitteldaten: Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.
        DOI: <a href="https://doi.org/10.25826/Data20251217-134202-0" target="_blank" rel="noopener">10.25826/Data20251217-134202-0</a>.
        ${blsMeta ? `In dieser App: ${esc(blsMeta.count)} Lebensmittel; Energie, Makronährstoffe, Ballaststoffe und Zucker.` : ''}</p>
      <p>Barcode-Daten: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a>, Datenbank unter der
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">Open Database License (ODbL)</a>,
        Inhalte unter der Database Contents License (DbCL). Werte von Open Food Facts stammen von Freiwilligen – bitte mit der Verpackung abgleichen.</p>
      <p>Barcode-Erkennung: ZXing (Apache-2.0). Schrift: Sora (SIL OFL 1.1).</p>
      <p style="margin-top:10px"><strong style="color:var(--ink)">Makro-Presets</strong></p>
      <ul class="refs">${Object.keys(REFS).map(refHtml).join('')}</ul>
      <p>Version ${APP_VERSION}</p>
    </div>`;

  let preset = s.preset && PRESETS[s.preset] ? s.preset : 'dge';
  const pfIn = $('#sPf'), ffIn = $('#sFf');
  pfIn.value = r1(s.pf ?? PRESETS[preset].pf ?? PRESETS.dge.pf);
  ffIn.value = r1(s.ff ?? PRESETS[preset].ff ?? PRESETS.dge.ff);
  const pct = (x) => `${r0(x)} %`;
  const showPreset = () => {
    document.querySelectorAll('#presetSeg button').forEach((b) => b.classList.toggle('active', b.dataset.preset === preset));
    const P = PRESETS[preset];
    $('#presetWhy').innerHTML = `<p class="small">${esc(P.why)}</p><ul class="refs">${P.refs.map(refHtml).join('')}</ul>
      <p class="small muted">Hinweis: Die Faktoren beziehen sich auf das Körpergewicht. Bei höherem Körperfettanteil überschätzt das den Eiweißbedarf; dann eher das Zielgewicht eintragen.</p>`;
  };
  const preview = () => {
    const kcal = num($('#sGoal').value), w = num($('#sW').value), pf = num(pfIn.value), ff = num(ffIn.value);
    const m = calcMacros(kcal, w, pf, ff);
    const box = $('#macroPreview');
    if (!m) { box.innerHTML = '<p class="small muted" style="margin:0">Körpergewicht eintragen, dann werden Eiweiß, Fett und Kohlenhydrate berechnet.</p>'; return; }
    const [lo, hi] = PRESETS[preset].fatRange;
    const fatOk = m.pctF == null || (m.pctF >= lo - 0.5 && m.pctF <= hi + 0.5);
    box.innerHTML = `<div class="tiles">
        <div class="tile p"><div class="lbl">Eiweiß</div><div class="val">${m.protein} <span>g</span></div><div class="lbl">${m.pctP != null ? pct(m.pctP) + ' der kcal' : ''}</div></div>
        <div class="tile c"><div class="lbl">Kohlenhydr.</div><div class="val">${m.carbs ?? '–'} <span>g</span></div><div class="lbl">${m.pctC != null ? pct(m.pctC) + ' der kcal' : 'kcal fehlt'}</div></div>
        <div class="tile f"><div class="lbl">Fett</div><div class="val">${m.fat} <span>g</span></div><div class="lbl">${m.pctF != null ? pct(m.pctF) + ' der kcal' : ''}</div></div>
      </div>
      ${m.carbsNegative ? '<p class="small warn">Eiweiß und Fett liefern schon mehr Energie als das Kalorienziel – Faktoren oder Kalorienziel prüfen.</p>' : ''}
      ${!fatOk ? `<p class="small warn">Fettanteil ${pct(m.pctF)} liegt außerhalb der Empfehlung für dieses Ziel (${lo}–${hi} % der Energie).</p>` : ''}
      ${preset === 'cut' ? '<p class="small muted">Für Fettabbau muss das Kalorienziel unter deinem Bedarf liegen – die Presets ändern nur die Makro-Verteilung, nicht die Kalorien.</p>' : ''}`;
  };
  document.querySelectorAll('#presetSeg button').forEach((b) => b.onclick = () => {
    preset = b.dataset.preset;
    const P = PRESETS[preset];
    if (P.pf != null) { pfIn.value = r1(P.pf); ffIn.value = r1(P.ff); }
    showPreset(); preview();
  });
  const toCustom = () => {
    const P = PRESETS[preset];
    if (preset !== 'custom' && (num(pfIn.value) !== P.pf || num(ffIn.value) !== P.ff)) { preset = 'custom'; showPreset(); }
    preview();
  };
  pfIn.oninput = toCustom; ffIn.oninput = toCustom;
  $('#sGoal').oninput = preview; $('#sW').oninput = preview;
  showPreset(); preview();

  $('#sSave').onclick = () => {
    const goal = num($('#sGoal').value);
    if (goal != null && (goal < 500 || goal > 10000)) { toast('Bitte einen Wert zwischen 500 und 10.000 kcal eingeben.'); return; }
    const weight = num($('#sW').value);
    if (weight != null && (weight < 30 || weight > 300)) { toast('Bitte ein Gewicht zwischen 30 und 300 kg eingeben.'); return; }
    const pf = num(pfIn.value), ff = num(ffIn.value);
    if ((pf != null && (pf < 0 || pf > 4)) || (ff != null && (ff < 0 || ff > 3))) { toast('Faktoren bitte prüfen (Eiweiß 0–4, Fett 0–3 g/kg).'); return; }
    const m = calcMacros(goal, weight, pf, ff);
    if (m && m.carbsNegative) { toast('Eiweiß und Fett übersteigen das Kalorienziel.'); return; }
    const from = $('#sFrom').value || today;
    const entry = { from, goal, weight, preset, pf, ff, protein: m ? m.protein : null, carbs: m ? m.carbs : null, fat: m ? m.fat : null, fiber: num($('#sFi').value), sugar: num($('#sSu').value) };
    const prev = goalsFor(from);
    if (state.goalHistory.length && GOAL_KEYS.every((k) => (prev[k] ?? null) === (entry[k] ?? null))) { toast('Keine Änderung'); return; }
    state.goalHistory = state.goalHistory.filter((h) => h.from !== from).concat([entry]).sort((a, b) => a.from.localeCompare(b.from));
    // „settings“ spiegelt das heute gültige Ziel (für ältere Backups/Versionen)
    const cur = goalsFor(today); GOAL_KEYS.forEach((k) => { state.settings[k] = cur[k] ?? null; });
    save(); toast(from === today ? 'Gespeichert – gilt ab heute' : `Gespeichert – gilt ab ${fmtD(from)}`); renderSettings();
  };
  document.querySelectorAll('[data-delgoal]').forEach((b) => b.onclick = () => {
    if (!confirm('Diesen Eintrag aus dem Ziel-Verlauf löschen? Die betroffenen Tage nutzen dann das vorherige Ziel.')) return;
    state.goalHistory = state.goalHistory.filter((h) => h.from !== b.dataset.delgoal);
    const cur = goalsFor(today); GOAL_KEYS.forEach((k) => { state.settings[k] = cur[k] ?? null; });
    save(); toast('Gelöscht'); renderSettings();
  });
  $('#exp').onclick = async () => { await exportBackup(); renderSettings(); };
  $('#impBtn').onclick = () => $('#imp').click();
  $('#imp').onchange = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!data || typeof data !== 'object' || !data.days) throw new Error('format');
        if (!confirm('Backup importieren? Die aktuellen Daten auf diesem Gerät werden ersetzt.')) return;
        state = normalizeState(data); save(); toast('Backup importiert'); render();
      } catch (e) { toast('Datei ist kein gültiges Backup.'); }
    };
    rd.readAsText(file);
  };
  $('#wipe').onclick = () => {
    if (confirm('Wirklich alle Einträge, eigenen Lebensmittel, Rezepte und Einstellungen löschen?')) {
      state = emptyState(); save(); toast('Alle Daten gelöscht'); render();
    }
  };
}

async function exportBackup() {
  const name = `kalorien-backup-${isoDate(new Date())}.json`;
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const markDone = () => { state.lastBackup = Date.now(); save(); toast('Backup erstellt'); };
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      markDone(); return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  markDone();
}

/* ---------- Start ---------- */
render();
loadBls();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
