/* Kalorien-Tracker – alle Nutzerdaten bleiben lokal auf dem Gerät (localStorage).
   Es werden keine persönlichen Daten an einen Server gesendet. Einzige Netzwerkanfrage
   nach außen: Barcode-Abfrage bei Open Food Facts (nur der Barcode wird übertragen). */
'use strict';

const APP_VERSION = '1.13.0';
const STORE_KEY = 'ct.v1';
const BACKUP_REMIND_DAYS = 7;
const MEALS = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' },
];
const NUTRIENTS = ['k', 'p', 'c', 'f', 'fi', 'su'];
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,quantity,allergens_tags,ingredients_analysis_tags';

/* ---------- Speicher ---------- */
function emptyState() {
  return {
    settings: { goal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null },
    goalHistory: [], // [{ from: 'JJJJ-MM-TT', goal, protein, carbs, fat, fiber, sugar }], sortiert nach Datum
    days: {}, custom: [], recent: [], favs: [], offCache: {}, lastBackup: null,
    sug: { enabled: true, time: '16:00', count: 2, priority: 'protein', minKcal: 200 },
    diet: { type: 'all', allergens: [] },
    sugRatings: {}, // Bewertung je Lebensmittel-ID: -3 … +3; ab -2 nicht mehr vorgeschlagen
    water: { enabled: true, goal: 1500, log: {} }, // log: { 'JJJJ-MM-TT': [ml, ml, …] }
    supp: SUPP_DEFAULTS(),
    caffeine: CAFF_DEFAULTS(), // log: { 'JJJJ-MM-TT': [{ id, min (Minuten seit 0 Uhr), mg, n, dur (Minuten) }] }
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
  s.sug = Object.assign(emptyState().sug, data.sug || {});
  s.diet = Object.assign(emptyState().diet, data.diet || {});
  if (!Array.isArray(s.diet.allergens)) s.diet.allergens = [];
  if (!s.sugRatings || typeof s.sugRatings !== 'object') s.sugRatings = {};
  s.water = Object.assign(emptyState().water, data.water || {});
  if (!s.water.log || typeof s.water.log !== 'object') s.water.log = {};
  s.supp = suppNormalize(data.supp);
  s.caffeine = Object.assign(CAFF_DEFAULTS(), data.caffeine || {});
  if (!s.caffeine.log || typeof s.caffeine.log !== 'object') s.caffeine.log = {};
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
/* Flüssigkeiten werden in ml angezeigt/eingegeben. Gespeichert wird weiter die Menge als Zahl (e.grams),
   Annahme: 1 ml ≈ 1 g (Dichte 1,0; bei Milch ~1,03, Saft ~1,04 → Abweichung ≤ 4 %). */
function blsLiquid(id, n) {
  if (!id || !id.startsWith('bls:')) return false;
  const g = id[4];
  if (g === 'P') return true;
  if (g === 'N') return !/pulver/i.test(n) || /Getränk/.test(n);
  if (g === 'F') return /(saft|nektar(?!in))/i.test(n.split(',')[0]) && !/Konserve|Konzentrat|in Fruchtsaft/.test(n);
  if (g === 'G') return /^Gemüsesaft/.test(n);
  if (g === 'M') return /^(Milch |Vollmilch|H-|Rohmilch|Buttermilch|Ziegenmilch|Schafmilch|Dickmilch|Kefir|Milchmisch|Milchshake)/.test(n) && !/Kondensmilch|pulver|dessert/i.test(n);
  if (g === 'C' || g === 'H') return /drink|^Kokosmilch/i.test(n);
  return false;
}
function isLiq(x) { return x.liq != null ? !!x.liq : blsLiquid(x.ref || x.id, x.n || ''); }
const unitOf = (x) => (isLiq(x) ? 'ml' : 'g');

function nutrientsOf(food) { const o = {}; NUTRIENTS.forEach((n) => { o[n] = food[n] || 0; }); return o; }
function foodSnap(food) {
  return Object.assign({ src: food.src, id: food.ref || food.id, n: food.n, brand: food.brand || '', serving: food.serving || null, liq: isLiq(food) }, nutrientsOf(food));
}
const isFav = (id) => state.favs.some((x) => x.id === id);

/* ---------- BLS-Daten ---------- */
let bls = [];
let blsMap = new Map();
let blsReady = false;
let blsMeta = null;
async function loadBls() {
  try {
    const res = await fetch('data/bls.json');
    const data = await res.json();
    blsMeta = data.meta || null;
    bls = (data.foods || []).map((x) => ({ src: 'bls', id: 'bls:' + x.id, n: x.n, k: x.k, p: x.p, c: x.c, f: x.f, fi: x.fi || 0, su: x.su || 0, d: x.d, a: x.a, b: x.b }));
    blsMap = new Map(bls.map((f) => [f.id, f]));
  } catch (e) { bls = []; }
  blsReady = true;
  if (sheetMode === 'add') renderAddResults();
  else if (!sheetMode && tab === 'diary') renderDiary();
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
  goTab(b.dataset.tab);
}));
function goTab(t) { tab = t; render(); }
function render() {
  document.body.classList.toggle('in-settings', tab === 'settings');
  document.querySelectorAll('.tabbar button').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
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
      <button class="gear" id="gear" aria-label="Einstellungen"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"/></svg></button>
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
    </div>`;
  html += suppReminderHtml(currentDate);
  html += suppCardHtml(currentDate);
  html += waterCardHtml(currentDate);
  html += caffCardHtml(currentDate);
  html += suggestionCardHtml(currentDate);

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
        <div class="name">${esc(e.n)}<div class="small muted">${e.quick ? 'Schnelleintrag' : `${r1(e.grams)} ${unitOf(e)}`}</div></div>
        <div class="kcal">${de(entryTotals(e).k)} kcal</div></div>`).join('')}</div>` : ''}
      ${!list.length && prevMeal.length ? `<button class="btn ghost copy" data-copy="${m.id}">↺ Wie am Vortag (${de(prevMeal.reduce((a, e) => a + entryTotals(e).k, 0))} kcal)</button>` : ''}
    </div>`;
  }
  if (!entries.length && prevEntries.length) {
    html += `<button class="btn secondary block" id="copyDay" style="margin-top:4px">Ganzen Vortag übernehmen (${de(sumEntries(prevEntries).k)} kcal)</button>`;
  }
  v.innerHTML = html;
  bindSuggestionCard(currentDate, () => { const y = window.scrollY; renderDiary(); window.scrollTo(0, y); });
  bindWaterCard(currentDate, () => { const y = window.scrollY; renderDiary(); window.scrollTo(0, y); });
  caffBindCard(currentDate);
  suppBind(currentDate, () => { const y = window.scrollY; renderDiary(); window.scrollTo(0, y); });

  $('#prevDay').onclick = () => { currentDate = addDays(currentDate, -1); openMeals.clear(); renderDiary(); };
  $('#nextDay').onclick = () => { currentDate = addDays(currentDate, 1); openMeals.clear(); renderDiary(); };
  const ts = $('#toSettings'); if (ts) ts.onclick = () => goTab('settings');
  const gr = $('#gear'); if (gr) gr.onclick = () => goTab('settings');
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
    const ce = e.cafId && ((state.caffeine.log[currentDate] || []).find((x) => x.id === e.cafId));
    if (ce) openCaffeine(currentDate, ce); else if (e.quick) openQuick(e.meal, e); else openAmount(e, { edit: true });
  });
}

/* ---------- Wasser ----------
   Standardziel 1,5 l Getränke pro Tag (Richtwert der DGE); EFSA (2010): angemessene Gesamtwasserzufuhr
   2,5 l (Männer) bzw. 2,0 l (Frauen) inklusive Wasser aus Lebensmitteln. */
const waterManual = (iso) => (state.water.log[iso] || []).reduce((a, b) => a + b, 0);
const waterOf = (iso) => waterManual(iso) + caffWater(iso);
const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function waterCardHtml(iso) {
  if (!state.water.enabled) return '';
  const ml = waterOf(iso), goal = state.water.goal || 1500;
  const pct = Math.max(0, Math.min(100, (ml / goal) * 100));
  const n = (state.water.log[iso] || []).length;
  return `<div class="card water">
    <div class="small muted water-title">Wasser</div>
    <div class="water-row">
    <div class="vessel" role="img" aria-label="Wasser ${r0(pct)} Prozent des Tagesziels">
      <div class="fill" style="height:${pct}%"></div>
      <svg class="wave" viewBox="0 0 74 14" preserveAspectRatio="none" style="bottom:calc(${pct}% - 7px)" aria-hidden="true"><path d="M0 7 Q 9 1 18 7 T 37 7 T 56 7 T 76 7 V 14 H 0 Z"></path></svg>
      <i style="top:25%"></i><i style="top:50%"></i><i style="top:75%"></i>
    </div>
    <div class="water-body">
      <div>
        <div><span class="water-big">${litres(ml)}</span><span class="muted small"> / ${litres(goal)} l</span></div>
      </div>
      <div class="water-btns"><button class="btn" data-water="250">+ 250 ml</button><button class="btn secondary" data-water="500">+ 500 ml</button></div>
      ${n ? `<button class="btn ghost water-undo" id="waterUndo">↶ Rückgängig (${state.water.log[iso][n - 1]} ml)</button>` : '<div class="small muted water-undo">Tippe, wenn du etwas getrunken hast.</div>'}
    </div>
    </div>
  </div>`;
}
function bindWaterCard(iso, rerender) {
  document.querySelectorAll('[data-water]').forEach((b) => b.onclick = () => {
    (state.water.log[iso] = state.water.log[iso] || []).push(+b.dataset.water);
    save(); if (navigator.vibrate) navigator.vibrate(20); rerender();
  });
  const u = $('#waterUndo');
  if (u) u.onclick = () => { const l = state.water.log[iso] || []; l.pop(); if (!l.length) delete state.water.log[iso]; save(); rerender(); };
}

/* ---------- Ernährungsform & Allergene ---------- */
// Allergene nach LMIV (EU-VO 1169/2011) Anhang II, ohne Sulfite (aus Namen nicht erkennbar)
const ALLERGENS = [
  ['gl', 'Gluten'], ['mi', 'Milch/Laktose'], ['ei', 'Ei'], ['nu', 'Schalenfrüchte'], ['er', 'Erdnuss'], ['so', 'Soja'],
  ['fi', 'Fisch'], ['kr', 'Krebstiere'], ['we', 'Weichtiere'], ['se', 'Sellerie'], ['sf', 'Senf'], ['sa', 'Sesam'], ['lu', 'Lupine'],
];
const OFF_ALLERGEN = {
  'en:gluten': 'gl', 'en:milk': 'mi', 'en:eggs': 'ei', 'en:nuts': 'nu', 'en:peanuts': 'er', 'en:soybeans': 'so', 'en:fish': 'fi',
  'en:crustaceans': 'kr', 'en:molluscs': 'we', 'en:celery': 'se', 'en:mustard': 'sf', 'en:sesame-seeds': 'sa', 'en:lupin': 'lu',
};
function offDiet(p) {
  const t = p.ingredients_analysis_tags || [];
  let d = null;
  if (t.includes('en:vegan')) d = 2;
  else if (t.includes('en:vegetarian')) d = 1;
  else if (t.includes('en:non-vegetarian')) d = 0;
  const a = (p.allergens_tags || []).map((x) => OFF_ALLERGEN[x]).filter(Boolean);
  return { d, a: d == null ? null : a };
}
// Liefert { d, a, group } – d/a = null bedeutet unbekannt
function foodInfo(id, depth = 0) {
  if (!id || depth > 3) return { d: null, a: null, group: null };
  if (id.startsWith('bls:')) {
    const b = blsMap.get(id);
    return { d: b && b.d != null ? b.d : null, a: b && b.d != null ? (b.a || []) : null, group: id[4] };
  }
  if (id.startsWith('off:')) {
    const o = state.offCache[id.slice(4)];
    return { d: o && o.d != null ? o.d : null, a: o && o.d != null ? (o.a || []) : null, group: null };
  }
  const own = state.custom.find((x) => x.id === id);
  if (!own) return { d: null, a: null, group: null };
  if (own.src === 'recipe') {
    let d = 2; const a = new Set();
    for (const it of own.items || []) {
      const inf = foodInfo(it.food.id, depth + 1);
      if (inf.d == null) return { d: null, a: null, group: null };
      d = Math.min(d, inf.d); inf.a.forEach((x) => a.add(x));
    }
    return { d, a: [...a], group: null };
  }
  return { d: own.d != null ? own.d : null, a: own.d != null ? (own.a || []) : null, group: null };
}
function dietFiltersActive() { return state.diet.type !== 'all' || state.diet.allergens.length > 0; }
function dietAllows(info) {
  if (!dietFiltersActive()) return true;
  if (info.d == null || info.a == null) return false; // unbekannt -> im Zweifel nicht vorschlagen
  if (state.diet.type === 'veg' && info.d < 1) return false;
  if (state.diet.type === 'vegan' && info.d < 2) return false;
  return !info.a.some((x) => state.diet.allergens.includes(x));
}

/* ---------- Abend-Vorschläge ----------
   Sucht 1–3 Lebensmittel und Mengen, die die offenen Tagesziele möglichst gut treffen.
   Methode: gewichtete quadratische Abweichung (relativ zum offenen Rest) von kcal und Makros,
   Mengen per Koordinaten-Gittersuche in 5- bzw. 10-g-Schritten innerhalb sinnvoller Portionsgrenzen.
   Bevorzugt werden Lebensmittel aus früheren Einträgen, dann die Basisliste gängiger Kochzutaten. */
const SUG_GROUPS = 'CEFGHKMTUV'; // BLS-Gruppen mit Kochzutaten (keine Getränke, Süßwaren, Gerichte, Brot …)
const SUG_WEIGHTS = {
  kcal: { kU: 4, kO: 8, pU: 0.5, pO: 0.5, c: 0.3, f: 0.3 },
  protein: { kU: 2, kO: 6, pU: 8, pO: 0.3, c: 0.3, f: 0.3 },
  balanced: { kU: 3, kO: 6, pU: 1.5, pO: 1.5, c: 1.5, f: 1.5 },
};
// Realistische Portionsgrenzen [min, max, Schritt] in g, grob nach Energiedichte und Eiweißgehalt
function sugBounds(f) {
  if (f.k >= 600) return [5, 40, 5];          // Öle, Nüsse
  if (f.k >= 300) return [30, 150, 10];       // trockene Getreide/Hülsenfrüchte, Hartkäse
  if (f.f >= 20) return [30, 150, 10];        // fettreicher Käse u. Ä.
  if (f.p >= 15) return [80, 250, 10];        // Fleisch, Fisch, Tofu, Quark
  if (f.k >= 100) return [50, 250, 10];       // z. B. Avocado, Hülsenfrüchte gegart, Kartoffelprodukte
  return [50, 400, 10];                       // Gemüse, Obst
}
function remainingFor(iso) {
  const g = goalsFor(iso);
  if (!g.goal) return null;
  const t = dayTotals(iso);
  const R = { k: g.goal - t.k };
  if (g.protein) R.p = Math.max(0, g.protein - t.p);
  if (g.carbs) R.c = Math.max(0, g.carbs - t.c);
  if (g.fat) R.f = Math.max(0, g.fat - t.f);
  return R;
}
function sugCandidates() {
  const ratings = state.sugRatings;
  const hist = new Map();
  for (const [d, list] of Object.entries(state.days)) {
    for (const e of list) {
      if (e.quick) continue;
      const id = e.ref || e.id;
      let cur = hist.get(id);
      if (!cur) {
        const live = id.startsWith('bls:') ? blsMap.get(id) : state.custom.find((x) => x.id === id) || (id.startsWith('off:') ? state.offCache[id.slice(4)] : null);
        const base = live || e;
        cur = Object.assign({ id, n: base.n, src: base.src || e.src, count: 0, dinner: 0, last: d }, nutrientsOf(base));
        hist.set(id, cur);
      }
      cur.count++; if (e.meal === 'dinner') cur.dinner++; if (d > cur.last) cur.last = d;
    }
  }
  const ok = (f) => {
    if ((ratings[f.id] || 0) <= -2) return false;
    if (!f.k || f.k < 10) return false;
    const inf = foodInfo(f.id);
    if (f.id.startsWith('bls:') && !SUG_GROUPS.includes(inf.group)) return false;
    return dietAllows(inf);
  };
  const fromHist = [...hist.values()].filter(ok)
    .sort((a, b) => (b.count + 2 * b.dinner) - (a.count + 2 * a.dinner)).slice(0, 40)
    .map((f) => Object.assign(f, { fromHistory: true }));
  const have = new Set(fromHist.map((f) => f.id));
  const basics = bls.filter((f) => f.b && !have.has(f.id) && ok(f)).map((f) => Object.assign({}, f, { fromHistory: false, count: 0, dinner: 0 }));
  return fromHist.concat(basics);
}
function sugError(tot, R, W) {
  const ek = (tot.k - R.k) / R.k;
  let E = (ek > 0 ? W.kO : W.kU) * ek * ek;
  if (R.p != null) { const e = (tot.p - R.p) / Math.max(R.p, 15); E += (e < 0 ? W.pU : W.pO) * e * e; }
  if (R.c != null) { const e = (tot.c - R.c) / Math.max(R.c, 15); E += W.c * e * e; }
  if (R.f != null) { const e = (tot.f - R.f) / Math.max(R.f, 15); E += W.f * e * e; }
  return E;
}
function optimizeCombo(foods, R, W) {
  const bnd = foods.map(sugBounds);
  const g = bnd.map((b) => b[0]);
  const totalOf = () => {
    const t = { k: 0, p: 0, c: 0, f: 0 };
    foods.forEach((f, i) => { const x = g[i] / 100; t.k += f.k * x; t.p += f.p * x; t.c += f.c * x; t.f += f.f * x; });
    return t;
  };
  let best = sugError(totalOf(), R, W);
  for (let round = 0; round < 3; round++) {
    let changed = false;
    for (let i = 0; i < foods.length; i++) {
      const [lo, hi, step] = bnd[i];
      let bestG = g[i];
      for (let v = lo; v <= hi; v += step) {
        g[i] = v;
        const e = sugError(totalOf(), R, W);
        if (e < best - 1e-9) { best = e; bestG = v; changed = true; }
      }
      g[i] = bestG;
    }
    if (!changed) break;
  }
  return { grams: g.slice(), err: best, tot: totalOf() };
}
function sugPref(foods) {
  let p = 0;
  for (const f of foods) {
    p += -0.06 * (state.sugRatings[f.id] || 0) - 0.04 * Math.log(1 + (f.count || 0)) - 0.08 * Math.log(1 + (f.dinner || 0)) + (f.fromHistory ? 0 : 0.12);
    if (f.fromHistory && !f.dinner && f.count >= 2) p += 0.2;    // bisher nur zu anderen Mahlzeiten gegessen
  }
  const groups = foods.map((f) => (f.id.startsWith('bls:') ? f.id[4] : f.id));
  if (new Set(groups).size < groups.length) p += 0.15;           // zwei aus derselben Gruppe
  if (foods.filter((f) => f.k < 60).length >= 2) p += 0.3;       // zwei kalorienarme Gemüse füllen kaum auf
  if (foods.filter((f) => f.c >= 50).length >= 2) p += 0.15;     // zwei Sättigungsbeilagen (z. B. Reis + Nudeln)
  if (foods.filter((f) => f.p >= 15).length >= 2) p += 0.1;      // zwei Hauptkomponenten Fleisch/Fisch/Tofu
  return p;
}
let sugCache = { key: null, list: [] };
function computeSuggestions(iso) {
  const R = remainingFor(iso);
  if (!R || R.k <= 0) return [];
  const S = state.sug;
  const key = JSON.stringify([iso, R, S.count, S.priority, state.diet, state.sugRatings, Object.keys(state.days).length, state.custom.length, bls.length]);
  if (sugCache.key === key) return sugCache.list;
  const W = SUG_WEIGHTS[S.priority] || SUG_WEIGHTS.protein;
  const pool = sugCandidates();
  const results = [];
  const n = Math.max(1, Math.min(3, S.count || 2));
  const pairsOrSingles = [];
  if (n === 1) {
    pool.forEach((a) => pairsOrSingles.push([a]));
  } else {
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) pairsOrSingles.push([pool[i], pool[j]]);
  }
  for (const foods of pairsOrSingles) {
    const o = optimizeCombo(foods, R, W);
    results.push({ foods, ...o, score: o.err + sugPref(foods) });
  }
  results.sort((a, b) => a.score - b.score);
  let final = results;
  if (n === 3) {
    const triples = [];
    for (const base of results.slice(0, 25)) {
      for (const c of pool) {
        if (base.foods.some((f) => f.id === c.id)) continue;
        const foods = base.foods.concat([c]);
        const o = optimizeCombo(foods, R, W);
        triples.push({ foods, ...o, score: o.err + sugPref(foods) });
      }
    }
    triples.sort((a, b) => a.score - b.score);
    final = triples;
  }
  // bis zu 5 unterschiedliche Vorschläge; jedes Lebensmittel höchstens in 2 Vorschlägen
  const chosen = []; const used = new Map(); const seen = new Set();
  for (const r of final) {
    const k = r.foods.map((f) => f.id).sort().join('|');
    if (seen.has(k) || r.foods.some((f) => (used.get(f.id) || 0) >= 2)) continue;
    seen.add(k); r.foods.forEach((f) => used.set(f.id, (used.get(f.id) || 0) + 1));
    chosen.push(Object.assign({ R }, r));
    if (chosen.length >= 5) break;
  }
  sugCache = { key, list: chosen };
  return chosen;
}
function sugDue(iso) {
  const S = state.sug;
  if (!S.enabled || iso !== isoDate(new Date())) return false;
  const now = new Date();
  const [h, m] = (S.time || '16:00').split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return false;
  const R = remainingFor(iso);
  return !!R && R.k >= (S.minKcal || 200);
}
let sugIndex = 0;
function suggestionCardHtml(iso) {
  if (!sugDue(iso)) return '';
  if (!blsReady) return '<div class="card sug"><h2>Vorschlag für heute Abend</h2><p class="small muted">Lade Lebensmitteldaten…</p></div>';
  const list = computeSuggestions(iso);
  const R = remainingFor(iso);
  const de = (x) => r0(x).toLocaleString('de-DE');
  const open = `${de(R.k)} kcal${R.p != null ? ` · Eiweiß ${de(R.p)} g` : ''}${R.c != null ? ` · KH ${de(R.c)} g` : ''}${R.f != null ? ` · Fett ${de(R.f)} g` : ''}`;
  const prio = `<div class="seg three sug-prio">${[['kcal', 'Kalorien'], ['protein', 'Eiweiß zuerst'], ['balanced', 'Ausgewogen']].map(([k, l]) => `<button type="button" data-sugprio="${k}" class="${state.sug.priority === k ? 'active' : ''}">${l}</button>`).join('')}</div>`;
  if (!list.length) {
    return `<div class="card sug"><h2>Vorschlag für heute Abend</h2><p class="small muted">Noch offen: ${open}</p>${prio}
      <p class="small muted">Keine passenden Lebensmittel gefunden. ${dietFiltersActive() ? 'Deine Ernährungs- und Allergie-Filter schließen viele Lebensmittel aus; eigene Lebensmittel brauchen dafür Angaben zu Ernährungsform und Allergenen.' : ''}</p></div>`;
  }
  const i = sugIndex % list.length;
  const s = list[i];
  const after = { k: R.k - s.tot.k, p: R.p != null ? R.p - s.tot.p : null };
  const rows = s.foods.map((f, j) => {
    const x = per(f, s.grams[j]);
    const r = state.sugRatings[f.id] || 0;
    return `<div class="sug-row">
      <div class="grow"><div>${esc(f.n)}</div>
        <div class="meta"><strong>${s.grams[j]} ${unitOf(f)}</strong> · ${de(x.k)} kcal · E ${r0(x.p)} g · KH ${r0(x.c)} g · F ${r0(x.f)} g${f.fromHistory ? '' : ' · <span class="tag">neu</span>'}</div></div>
      <button class="rate ${r > 0 ? 'on' : ''}" data-rate="${esc(f.id)}" data-v="1" aria-label="${esc(f.n)} gut bewerten">👍</button>
      <button class="rate ${r < 0 ? 'on' : ''}" data-rate="${esc(f.id)}" data-v="-1" aria-label="${esc(f.n)} schlecht bewerten">👎</button>
    </div>`;
  }).join('');
  const missKcal = Math.abs(after.k) > Math.max(80, 0.15 * R.k);
  return `<div class="card sug">
    <div class="spread"><h2>Vorschlag für heute Abend</h2><span class="small muted">${i + 1}/${list.length}</span></div>
    <p class="small muted">Noch offen: ${open}</p>
    ${prio}
    ${rows}
    <p class="small muted sug-after">Danach: ${after.k >= 0 ? `noch ${de(after.k)} kcal offen` : `${de(-after.k)} kcal über Ziel`}${after.p != null ? ` · Eiweiß ${after.p > 0.5 ? `noch ${de(after.p)} g offen` : 'gedeckt'}` : ''}${missKcal ? `<br>Mit realistischen Portionen ist das Ziel so nicht ganz erreichbar.${state.sug.count < 3 && after.k > 0 ? ' Tipp: In den Einstellungen 3 Lebensmittel wählen.' : ''}` : ''}</p>
    <p class="small muted">Mengen als Rohgewicht bzw. wie im Lebensmittel angegeben.</p>
    <div class="row"><button class="btn" id="sugTake">Übernehmen</button><button class="btn secondary" id="sugNext" ${list.length < 2 ? 'disabled' : ''}>Anderer Vorschlag</button></div>
  </div>`;
}
function bindSuggestionCard(iso, rerender) {
  const card = document.querySelector('.card.sug'); if (!card) return;
  card.querySelectorAll('[data-sugprio]').forEach((b) => b.onclick = () => { state.sug.priority = b.dataset.sugprio; sugIndex = 0; save(); rerender(); });
  card.querySelectorAll('[data-rate]').forEach((b) => b.onclick = () => {
    const id = b.dataset.rate; const v = +b.dataset.v;
    const r = Math.max(-3, Math.min(3, (state.sugRatings[id] || 0) + v));
    state.sugRatings[id] = r; save();
    toast(v > 0 ? 'Wird öfter vorgeschlagen' : r <= -2 ? 'Wird nicht mehr vorgeschlagen' : 'Wird seltener vorgeschlagen');
    rerender();
  });
  const nx = $('#sugNext'); if (nx) nx.onclick = () => { sugIndex++; rerender(); };
  const tk = $('#sugTake'); if (tk) tk.onclick = () => {
    const list = computeSuggestions(iso); const s = list[sugIndex % list.length];
    const target = (state.days[iso] = state.days[iso] || []);
    s.foods.forEach((f, j) => {
      target.push(Object.assign({ id: uid(), meal: 'dinner', grams: s.grams[j], ref: f.id, src: f.src, n: f.n, brand: f.brand || '', liq: isLiq(f) }, nutrientsOf(f)));
      state.recent = [Object.assign(foodSnap(f), { lastGrams: s.grams[j] })].concat(state.recent.filter((x) => x.id !== f.id)).slice(0, 60);
      state.sugRatings[f.id] = Math.min(3, (state.sugRatings[f.id] || 0) + 1);
    });
    save(); openMeals.add('dinner'); sugIndex = 0; toast('Zum Abendessen hinzugefügt'); rerender();
  };
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
  return `<li data-i="${i}"><div>${star}${esc(f.n)}${tag ? `<span class="tag">${tag}</span>` : ''}<div class="meta">${f.brand ? esc(f.brand) + ' · ' : ''}${r0(f.k)} kcal / 100 ${unitOf(f)}</div></div><div class="meta">›</div></li>`;
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

/* ---------- Standardportionen ----------
   Quelle: SINU, LARN – V Revisione 2024, „Porzioni standard“ für Erwachsene (über ATS Brescia, 2025).
   Grammangaben beziehen sich auf das rohe Lebensmittel, essbarer Anteil. Für gegarte Varianten rechnet
   die App die Rohportion über das Energieverhältnis roh/gegart aus dem BLS um. Stückgewichte sind aus den
   LARN-Haushaltsmaßen abgeleitet (z. B. 2–3 Tomaten = 200 g). */
const COOKED_RX = /,?\s*(gekocht|gegart|gedünstet|gedämpft|pochiert|geschmort ohne Fett|gebraten ohne Fett(?: \((?:Pfanne|Ofen)\))?|gegrillt)\b.*$/;
const FISH_CAN = /Konserve|Präserve|in Öl|im eigenen Saft/;
function larnPortion(food) {
  const n = food.n, g = food.id && food.id.startsWith('bls:') ? food.id[4] : null;
  if (!g) return null;
  const P = (grams, label, hint) => ({ grams, label, hint });
  switch (g) {
    case 'C':
      if (/Mehl|Stärke|Kleie|Malz|Drink|Grieß/.test(n)) return null;
      if (/Flocken|Müsli|Cerealien|Flakes|gepufft/.test(n)) return P(30, '1 Portion', 'Frühstückscerealien');
      return P(80, '1 Portion', 'Getreide/Reis roh');
    case 'E':
      if (/Hühnerei roh|^Hühnerei$/.test(n)) return P(50, '1 Ei (M)', 'essbarer Anteil');
      if (/Eiklar|Eigelb|Pulver/.test(n)) return null;
      if (/Gnocchi/.test(n)) return P(200, '1 Portion', 'Gnocchi');
      if (/Tortell|Ravioli|gefüllt|Füllung/.test(n)) return P(125, '1 Portion', 'gefüllte Pasta');
      if (/Frisch/.test(n)) return P(100, '1 Portion', 'frische Pasta');
      if (/[Tt]eigwaren|[Nn]udel/.test(n)) return P(80, '1 Portion', 'Nudeln roh');
      return null;
    case 'K':
      if (/Kartoffel|Batate|Süßkartoffel|Yams|Topinambur/.test(n) && !/Püree|Kloß|Stärke|Mehl|Chips|Pommes|Rösti|Krokette|Pulver|Trocken/.test(n)) return P(200, '1 Portion', 'ca. 2 kleine Kartoffeln');
      if (/getrocknet/.test(n)) return null;
      return P(200, '1 Portion', 'Pilze wie Gemüse');
    case 'H':
      if (/Drink|Joghurt|Mehl|Öl|Mus|Butter|Creme|Sprossen|Keimlinge/.test(n)) return null;
      if (/Mandel|Haselnuss|Walnuss|Cashew|Pekan|Paranuss|Pistazie|Macadamia|Erdnuss|Sesam|Sonnenblumenkern|Kürbiskern|Leinsamen|Chia|Pinienkern|Nuss/.test(n)) return P(30, '1 Portion', 'Nüsse/Samen, z. B. 7–8 Walnüsse');
      if (/Tofu|Tempeh|Seitan|Ersatz|Aufschnitt/.test(n)) return null;
      if (/Konserve|gekocht|gegart/.test(n)) return P(150, '1 Portion', 'Hülsenfrüchte gegart/Dose');
      if (/reif|getrocknet/.test(n)) return P(50, '1 Portion', 'Hülsenfrüchte getrocknet');
      return null;
    case 'G':
      if (/Saft|getrocknet|Pulver/.test(n)) return null;
      if (/zwiebel|knoblauch|ingwer|petersilie|schnittlauch|basilikum|dill|kerbel|koriander|minze|rosmarin|thymian|oregano|kresse|meerrettich|chili|peperoni/i.test(n)) return null; // Würzzutaten, keine Beilage
      if (/Hülsenfr|Kichererbse reif|Erbse reif|Bohne reif|Linse/.test(n)) return /gekocht|Konserve/.test(n) ? P(150, '1 Portion', 'Hülsenfrüchte gegart') : P(50, '1 Portion', 'Hülsenfrüchte getrocknet');
      if (/salat|Rucola|Feldsalat|Eisberg|Endivie|Radicchio|Chicorée|Kresse/i.test(n)) return P(80, '1 Portion', 'Blattsalat');
      return P(200, '1 Portion', 'Gemüse');
    case 'F':
      if (/Saft|Nektar|Konfitüre|Marmelade|Mus\b|Sirup/.test(n)) return null;
      if (/getrocknet|Trocken/.test(n)) return P(30, '1 Portion', 'Trockenobst');
      return P(150, '1 Stück/Portion', 'mittelgroßes Stück Obst');
    case 'T':
      if (/Rogen|Kaviar|Leber|Salat|Paste/.test(n)) return null;
      if (FISH_CAN.test(n)) return P(50, '1 kleine Dose', 'Fischkonserve abgetropft');
      return P(150, '1 Portion', 'Fisch, z. B. 1 Filet');
    case 'U': case 'V':
      if (/Fett|Speck|Leber|Niere|Herz|Hirn|Zunge|Knochen|Mark|Blut|Haut\b/.test(n) && !/Filet|Brust/.test(n)) return null;
      return P(100, '1 Portion', 'Fleisch roh, z. B. 1 Scheibe Hähnchenbrust');
    case 'W':
      return P(50, '1 Portion', 'Wurst/Aufschnitt, ca. 3–4 Scheiben');
    case 'M':
      if (/Pulver|Butter|Sahne|Rahm/.test(n)) return null;
      if (/Ricotta/.test(n)) return P(150, '1 Portion', 'Ricotta');
      if (/[Jj]oghurt|Kefir|Dickmilch|Sauermilch|Buttermilch/.test(n)) return P(125, '1 Becher', 'Joghurt/Sauermilch');
      if (/[Mm]ilch\b|Milch,|Milch \d|Vollmilch|Trinkmilch/.test(n) && !/käse/i.test(n)) return P(125, '1 kleines Glas', 'Milch (ml ≈ g)');
      return (food.f || 0) > 25 ? P(50, '1 Portion', 'gereifter Käse') : P(100, '1 Portion', 'Frischkäse/Quark/Mozzarella');
    case 'B':
      return P(50, '1 Portion', '1 Scheibe oder kleines Brötchen');
    case 'Q':
      if (/[Öö]l\b/.test(n)) return P(9, '1 EL', 'Öl (10 ml)');
      if (/Butter|Schmalz/.test(n)) return P(10, '1 Portion', 'Butter/Schmalz');
      return null;
    default: return null;
  }
}
// Zusätzliche Stückgewichte aus LARN-Haushaltsmaßen
function pieceSize(food) {
  const n = food.n;
  if (/^Tomate roh/.test(n)) return { grams: 80, label: '1 Tomate' };
  if (/^Karotte\/Möhre, roh/.test(n)) return { grams: 60, label: '1 Karotte' };
  if (/^Kartoffel (geschält|ungeschält), roh/.test(n)) return { grams: 100, label: '1 kleine Kartoffel' };
  return null;
}
function portionOptions(food) {
  const out = [];
  let base = food;
  let factor = 1;
  if (food.id && food.id.startsWith('bls:') && COOKED_RX.test(food.n) && !larnPortionDirect(food)) {
    const stem = food.n.replace(COOKED_RX, '').trim();
    const raw = bls.find((x) => x.id[4] === food.id[4] && (x.n === stem + ', roh' || x.n === stem + ' roh' || x.n === stem));
    if (raw && raw.k > 0 && food.k > 0) { base = raw; factor = raw.k / food.k; }
    else base = null;
  }
  const p = base ? larnPortion(base) : null;
  if (p) {
    const g = factor === 1 ? p.grams : Math.round((p.grams * factor) / 5) * 5;
    out.push({ grams: g, label: p.label + (factor !== 1 ? ' (gegart)' : ''), hint: p.hint + (factor !== 1 ? `; ${p.grams} g roh umgerechnet` : ''), larn: true });
  }
  const pc = factor === 1 ? pieceSize(food) : null;
  if (pc && !out.some((o) => o.grams === pc.grams)) out.push({ grams: pc.grams, label: pc.label, hint: 'aus LARN-Haushaltsmaß', larn: true });
  if (food.serving && !out.some((o) => o.grams === Math.round(food.serving))) out.push({ grams: r1n(food.serving), label: food.src === 'off' ? 'Packungsportion' : food.src === 'recipe' ? '1 Rezeptportion' : '1 Portion', hint: food.src === 'off' ? 'laut Open Food Facts' : 'eigene Angabe' });
  return out;
}
// Lebensmittel, deren Portion sich direkt auf den gegarten Zustand bezieht (z. B. Hülsenfrüchte gekocht)
function larnPortionDirect(food) {
  return /^H|^G/.test(food.id[4]) && /Hülsen|Kichererbse|Erbse reif|Bohne reif|Linse|Konserve/.test(food.n) && /gekocht|Konserve/.test(food.n);
}
const r1n = (n) => Math.round((n || 0) * 10) / 10;

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
  const U = unitOf(food);
  openSheet(`
    <div class="sheet-head"><button class="btn ghost" id="back">‹ Zurück</button>
      <button class="btn ghost star-btn" id="favBtn" aria-label="Favorit">${fav ? '★' : '☆'}</button></div>
    <h1>${esc(food.n)}</h1>
    ${food.brand ? `<p class="muted">${esc(food.brand)}</p>` : ''}
    <p class="small muted">Pro 100 ${U}: ${r0(food.k)} kcal · E ${r1(food.p)} g · KH ${r1(food.c)} g · F ${r1(food.f)} g · Ballastst. ${r1(food.fi)} g · Zucker ${r1(food.su)} g</p>
    <label for="grams">Menge in ${U === 'ml' ? 'Millilitern' : 'Gramm'}</label>
    <input id="grams" type="text" inputmode="decimal" value="${r1(defGrams)}">
    <div class="chips portions" id="portions">${portionOptions(food).map((o, i) => `<button type="button" class="chip" data-pi="${i}" title="${esc(o.hint)}">${esc(o.label)} · ${r1(o.grams)} ${U}</button>`).join('')}${recentHit && recentHit.lastGrams && !edit ? `<button type="button" class="chip" data-last="${recentHit.lastGrams}">Zuletzt · ${r1(recentHit.lastGrams)} ${U}</button>` : ''}</div>
    ${portionOptions(food).some((o) => o.larn) ? '<p class="small muted portion-note">Mehrfach tippen = mehrere Portionen. Standardportionen: SINU, LARN 2024 (Rohgewicht, essbarer Anteil).</p>' : ''}
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
  const pOpts = portionOptions(food);
  let lastChip = null, mult = 0;
  document.querySelectorAll('#portions [data-pi]').forEach((b) => b.onclick = () => {
    const o = pOpts[+b.dataset.pi];
    mult = lastChip === b ? mult + 1 : 1; lastChip = b;
    g.value = r1(o.grams * mult); upd();
    document.querySelectorAll('#portions .chip').forEach((c) => c.classList.toggle('on', c === b));
    b.textContent = `${mult > 1 ? mult + ' × ' + o.label.replace(/^1 /, '') : o.label} · ${r1(o.grams * mult)} ${U}`;
  });
  const lc = document.querySelector('#portions [data-last]');
  if (lc) lc.onclick = () => { g.value = r1(+lc.dataset.last); upd(); lastChip = lc; document.querySelectorAll('#portions .chip').forEach((c) => c.classList.toggle('on', c === lc)); };
  g.addEventListener('input', () => { lastChip = null; document.querySelectorAll('#portions .chip').forEach((c) => c.classList.remove('on')); });
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
      const entry = Object.assign({ id: uid(), meal, grams, ref: foodId, src: food.src, n: food.n, brand: food.brand || '', liq: isLiq(food) }, nutrientsOf(food));
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
    <p class="small muted" style="margin-top:8px">Barcode in den Rahmen halten, etwa 15–25 cm Abstand, gut beleuchtet. Nur der Barcode wird an Open Food Facts gesendet.</p>
    <label for="code">Oder Barcode eintippen</label>
    <div class="row"><input id="code" type="text" inputmode="numeric" placeholder="z. B. 4008400401621"><button class="btn" id="lookup" style="flex:0 0 auto">Suchen</button></div>
    <div id="scanResult"></div>`;
  $('#lookup').onclick = () => { const c = ($('#code').value || '').replace(/\D/g, ''); if (c) lookupBarcode(c); };
  startScanner();
}
/* Kamera: Der Stream wird kurz behalten (CAM_KEEP_MS), damit iOS beim erneuten Öffnen des Scanners nicht jedes Mal
   neu nach der Erlaubnis fragt. Außerdem: hohe Auflösung, Hauptkamera statt Ultraweitwinkel (schlechter Nahfokus),
   kontinuierlicher Autofokus, falls vom Gerät angeboten. */
let camStream = null, camTimer = null;
const CAM_KEEP_MS = 3 * 60 * 1000;
const camLive = () => camStream && camStream.getVideoTracks().some((t) => t.readyState === 'live');
function camRelease() { clearTimeout(camTimer); camTimer = null; if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
async function getCamStream() {
  clearTimeout(camTimer);
  if (camLive()) { camStream.getVideoTracks().forEach((t) => { t.enabled = true; }); return camStream; }
  const res = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  let st = await navigator.mediaDevices.getUserMedia({ video: Object.assign({ facingMode: { ideal: 'environment' } }, res) });
  try {
    const tr = st.getVideoTracks()[0];
    if (/ultra/i.test(tr.label || '')) {
      const back = (await navigator.mediaDevices.enumerateDevices()).find((d) => d.kind === 'videoinput' && /back|rück|hinter/i.test(d.label) && !/ultra|tele/i.test(d.label));
      if (back) { st.getTracks().forEach((t) => t.stop()); st = await navigator.mediaDevices.getUserMedia({ video: Object.assign({ deviceId: { exact: back.deviceId } }, res) }); }
    }
  } catch (e) { /* bei Fehlern Standardkamera behalten */ }
  try {
    const tr = st.getVideoTracks()[0]; const cap = tr.getCapabilities ? tr.getCapabilities() : {};
    if (cap.focusMode && cap.focusMode.includes('continuous')) await tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
  } catch (e) { /* Fokus nicht steuerbar */ }
  camStream = st;
  return st;
}
function startScanner() {
  if (!window.ZXing || !navigator.mediaDevices) { $('#scanResult').innerHTML = '<p class="muted">Kamera nicht verfügbar – bitte Barcode eintippen.</p>'; return; }
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  const reader = new ZXing.BrowserMultiFormatReader(hints, 150);
  scanner = reader;
  let done = false;
  getCamStream().then((stream) => {
    if (scanner !== reader) return; // inzwischen geschlossen
    return reader.decodeFromStream(stream, 'video', (result) => {
      if (result && !done) {
        done = true;
        if (navigator.vibrate) navigator.vibrate(60);
        const code = result.getText();
        stopScanner();
        $('#code').value = code;
        lookupBarcode(code);
      }
    });
  }).catch(() => { const r = $('#scanResult'); if (r) r.innerHTML = '<p class="muted">Kein Kamerazugriff. Erlaube die Kamera in den Safari-Einstellungen oder tippe den Barcode ein.</p>'; });
}
function stopScanner() {
  if (scanner) {
    try { scanner.stopContinuousDecode(); } catch (e) { /* ok */ }
    scanner = null;
    const v = document.getElementById('video'); if (v) { try { v.pause(); v.srcObject = null; } catch (e) { /* ok */ } }
    if (camStream) { camStream.getVideoTracks().forEach((t) => { t.enabled = false; }); clearTimeout(camTimer); camTimer = setTimeout(camRelease, CAM_KEEP_MS); }
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && !scanner) camRelease(); });

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
      fi: num(nm.fiber_100g) || 0, su: num(nm.sugars_100g) || 0, ...offDiet(p),
      serving: num(p.serving_quantity) || null,
      liq: /\d\s*(ml|cl|l)\b/i.test(p.quantity || ''),
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
    <p class="small muted">Werte pro 100 g bzw. 100 ml, z. B. von der Verpackung.</p>
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
    <label class="chip" style="margin-top:10px"><input type="checkbox" id="cLiq" ${e.liq ? 'checked' : ''}> Flüssigkeit (Mengen in ml, Annahme 1 ml ≈ 1 g)</label>
    <div class="row">
      <div><label for="cServ">Portion g/ml (optional)</label><input id="cServ" inputmode="decimal" value="${e.serving || ''}"></div>
      <div><label for="cBarcode">Barcode (optional)</label><input id="cBarcode" inputmode="numeric" value="${esc(e.barcode || '')}"></div>
    </div>
    <label for="cDiet">Ernährungsform (für Vorschläge)</label>
    <select id="cDiet">
      <option value="" ${e.d == null ? 'selected' : ''}>Unbekannt</option>
      <option value="2" ${e.d === 2 ? 'selected' : ''}>Vegan</option>
      <option value="1" ${e.d === 1 ? 'selected' : ''}>Vegetarisch</option>
      <option value="0" ${e.d === 0 ? 'selected' : ''}>Mit Fleisch oder Fisch</option>
    </select>
    <label>Enthält</label>
    <div class="chips" id="cAll">${ALLERGENS.map(([k, l]) => `<label class="chip"><input type="checkbox" value="${k}" ${(e.a || []).includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <p class="small muted">Nur nötig, wenn du Ernährungs- oder Allergie-Filter nutzt. Bei „Unbekannt“ wird das Lebensmittel mit aktiven Filtern nicht vorgeschlagen.</p>
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
      liq: $('#cLiq').checked,
      d: $('#cDiet').value === '' ? null : +$('#cDiet').value,
      a: [...document.querySelectorAll('#cAll input:checked')].map((x) => x.value),
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
      ${state.water.enabled ? (() => { const wd = days.map((x) => waterOf(x.d)).filter((v) => v > 0); return `<div class="spread"><span class="muted">Ø Wasser (an ${wd.length} Tagen erfasst)</span><strong>${wd.length ? litres(wd.reduce((a, b) => a + b, 0) / wd.length) + ' l' : '–'}</strong></div>`; })() : ''}
      <p class="small muted" style="margin-top:8px">Nicht getrackte Tage fließen nicht in den Durchschnitt ein. Ein Tag mit wenig Einträgen ist nicht unbedingt ein Tag mit wenig Essen.${goalChanges ? ' Die Differenz zum Ziel nutzt für jeden Tag das damals gültige Ziel.' : ''}</p>
    </div>
    ${caffHistoryHtml(days.map((x) => x.d), histRange)}`;
  caffHistoryBind(days.map((x) => x.d), histRange, () => { const y = window.scrollY; renderHistory(); window.scrollTo(0, y); });
  $('#rangeSeg').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', +b.dataset.r === histRange);
    b.onclick = () => { histRange = +b.dataset.r; renderHistory(); };
  });
}

/* ---------- Einstellungen ---------- */
const SET_ICONS = {
  'Tagesziel': ['#5BE7F5', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'],
  'Wasser': ['#7AB8FF', '<path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/>'],
  'Supplements': ['#6FE0C1', '<g transform="rotate(-35 12 12)"><rect x="3" y="7.5" width="18" height="9" rx="4.5"/><path d="M12 7.5v9"/></g>'],
  'Koffein': ['#E2B36B', '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3v3M12.5 3v3"/>'],
  'Abend-Vorschläge': ['#B9A6FF', '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'],
  'Ernährung & Allergien': ['#6FE0C1', '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19l8-8"/>'],
};
const setOpen = new Set(['Tagesziel']); // aufgeklappte Einstellungs-Bereiche
function renderSettings() {
  renderSettingsInner();
  document.querySelectorAll('#view > .card > h2:not(.sec)').forEach((h) => {
    const title = h.textContent.trim();
    const ic = SET_ICONS[title] || ['#93A0B4', '<path d="M5 12h14M12 5v14"/>'];
    const card = h.parentElement;
    h.classList.add('set-h');
    h.innerHTML = `<span class="set-ico" style="--c:${ic[0]}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic[1]}</svg></span><span class="set-t">${h.innerHTML}</span><span class="set-chev" aria-hidden="true"></span>`;
    const body = document.createElement('div'); body.className = 'set-body';
    while (h.nextSibling) body.appendChild(h.nextSibling);
    card.appendChild(body);
    card.classList.add('set-card');
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    const apply = () => { const open = setOpen.has(title); card.classList.toggle('collapsed', !open); h.setAttribute('aria-expanded', open); };
    const toggle = () => { if (setOpen.has(title)) setOpen.delete(title); else setOpen.add(title); apply(); };
    h.onclick = toggle; h.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } };
    apply();
  });
  const bk = $('#setBack'); if (bk) bk.onclick = () => goTab('diary');
}
function renderSettingsInner() {
  const today = isoDate(new Date());
  const s = goalsFor(today);
  const fmtD = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE');
  const hist = state.goalHistory.slice().reverse();
  $('#view').innerHTML = `
    <div class="set-top"><button class="set-back" id="setBack" aria-label="Zurück">‹</button><h1>Einstellungen</h1></div>
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
      <h2>Wasser</h2>
      <label class="switch"><input type="checkbox" id="wOn" ${state.water.enabled ? 'checked' : ''}> Wasserzähler im Tagebuch anzeigen</label>
      <label for="wGoal">Tagesziel (Liter)</label><input id="wGoal" inputmode="decimal" value="${litres(state.water.goal)}">
      <p class="small muted" style="margin-top:6px">Richtwert der DGE: 1,5 l Getränke pro Tag; bei Hitze, Sport oder körperlicher Arbeit mehr. Die EFSA nennt 2,5 l (Männer) bzw. 2,0 l (Frauen) Gesamtwasser – inklusive Wasser aus Lebensmitteln.</p>
    </div>
    ${caffSettingsHtml()}
    ${suppSettingsHtml()}
    <div class="card">
      <h2>Abend-Vorschläge</h2>
      <label class="switch"><input type="checkbox" id="sgOn" ${state.sug.enabled ? 'checked' : ''}> Vorschläge anzeigen, wenn das Ziel noch offen ist</label>
      <div class="row">
        <div><label for="sgTime">Ab Uhrzeit</label><input id="sgTime" type="time" value="${esc(state.sug.time)}"></div>
        <div><label for="sgMin">Ab offenen kcal</label><input id="sgMin" inputmode="numeric" value="${state.sug.minKcal}"></div>
      </div>
      <label>Anzahl Lebensmittel</label>
      <div class="seg three" id="sgCount">${[1, 2, 3].map((n) => `<button type="button" data-n="${n}" class="${state.sug.count === n ? 'active' : ''}">${n}</button>`).join('')}</div>
      <label>Priorität</label>
      <div class="seg three" id="sgPrio">${[['kcal', 'Kalorien'], ['protein', 'Eiweiß zuerst'], ['balanced', 'Ausgewogen']].map(([k, l]) => `<button type="button" data-p="${k}" class="${state.sug.priority === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">Erscheint im Tagebuch, wenn du die App nach dieser Uhrzeit öffnest. Vorgeschlagen wird zuerst aus deinen bisherigen Einträgen, sonst aus gängigen Kochzutaten. Mit 👍/👎 bewertest du einzelne Lebensmittel; zweimal 👎 schließt sie aus. Eine Benachrichtigung zur Uhrzeit ist ohne Server nicht möglich – mit einer Kurzbefehle-Automation kann iOS die App aber zur gewünschten Zeit öffnen.</p>
      ${Object.keys(state.sugRatings).length ? `<h2 class="sec">Bewertete Lebensmittel</h2><ul class="list goals">${Object.entries(state.sugRatings).sort((a, b) => a[1] - b[1]).map(([id, r]) => `<li><div>${esc((blsMap.get(id) || state.custom.find((x) => x.id === id) || state.offCache[id.slice(4)] || { n: id }).n)}<div class="meta">${r <= -2 ? 'ausgeschlossen' : r < 0 ? 'seltener' : 'bevorzugt'} (${r > 0 ? '+' : ''}${r})</div></div><button class="btn ghost rm" data-unrate="${esc(id)}" aria-label="Bewertung zurücksetzen">✕</button></li>`).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <h2>Ernährung & Allergien</h2>
      <div class="seg three" id="dietType">${[['all', 'Alles'], ['veg', 'Vegetarisch'], ['vegan', 'Vegan']].map(([k, l]) => `<button type="button" data-d="${k}" class="${state.diet.type === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      <label>Allergien / Unverträglichkeiten ausschließen</label>
      <div class="chips" id="dietAll">${ALLERGENS.map(([k, l]) => `<label class="chip"><input type="checkbox" value="${k}" ${state.diet.allergens.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">Gilt für die Vorschläge. Erkannt wird anhand der BLS-Lebensmittelgruppe und des Namens, bei Barcode-Produkten über Open Food Facts, bei eigenen Lebensmitteln über deine Angaben. Ist etwas unklar (z. B. Fertiggerichte), wird es nicht vorgeschlagen. Sulfite sind nicht erkennbar. <strong>Keine Gewähr – bei Allergien immer die Zutatenliste prüfen.</strong></p>
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
      <p style="margin-top:10px"><strong style="color:var(--ink)">Wasser</strong></p>
      <ul class="refs"><li>Deutsche Gesellschaft für Ernährung: Richtwert 1,5 l Getränke pro Tag für Erwachsene (zitiert nach Verbraucherzentrale NRW). <a href="https://www.verbraucherzentrale.nrw/wissen/lebensmittel/gesund-ernaehren/wie-viel-sollte-man-am-tag-trinken-24202" target="_blank" rel="noopener">Link</a></li>
        <li>EFSA NDA Panel (2010). Scientific Opinion on Dietary Reference Values for water. EFSA Journal 8(3):1459. <a href="https://www.efsa.europa.eu/en/press/news/nda100326" target="_blank" rel="noopener">Pressemitteilung</a></li></ul>
      ${caffSourcesHtml()}
      <p style="margin-top:10px"><strong style="color:var(--ink)">Standardportionen</strong></p>
      <ul class="refs"><li>SINU – Società Italiana di Nutrizione Umana (2024). LARN – Livelli di Assunzione di Riferimento di Nutrienti ed energia per la popolazione italiana, V Revisione: Porzioni standard. Werte übernommen aus: ATS Brescia (2025), Porzioni standard degli alimenti per la popolazione adulta. <a href="https://www.ats-brescia.it/documents/3432658/78612060/Porzioni+standard+degli+alimenti+per+la+popolazione+adulta.pdf/2ce817e7-0713-bbe6-56c7-767285a575dd" target="_blank" rel="noopener">PDF</a></li>
        <li>Eier, Gewichtsklasse M: 53 bis unter 63 g mit Schale, VO (EG) Nr. 589/2008 Art. 4.</li></ul>
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
  const keepScroll = () => { const y = window.scrollY; renderSettings(); window.scrollTo(0, y); };
  caffSettingsBind();
  suppSettingsBind();
  $('#sgOn').onchange = (ev) => { state.sug.enabled = ev.target.checked; save(); };
  $('#wOn').onchange = (ev) => { state.water.enabled = ev.target.checked; save(); };
  $('#wGoal').onchange = (ev) => {
    const l = num(ev.target.value);
    if (l == null || l < 0.5 || l > 6) { toast('Bitte zwischen 0,5 und 6 Liter eingeben.'); ev.target.value = litres(state.water.goal); return; }
    state.water.goal = Math.round(l * 1000); save(); toast(`Wasserziel ${litres(state.water.goal)} l`);
  };
  $('#sgTime').onchange = (ev) => { if (ev.target.value) { state.sug.time = ev.target.value; save(); toast(`Vorschläge ab ${ev.target.value} Uhr`); } };
  $('#sgMin').onchange = (ev) => { const v = num(ev.target.value); if (v != null && v >= 0) { state.sug.minKcal = Math.round(v); save(); } };
  document.querySelectorAll('#sgCount button').forEach((b) => b.onclick = () => { state.sug.count = +b.dataset.n; save(); keepScroll(); });
  document.querySelectorAll('#sgPrio button').forEach((b) => b.onclick = () => { state.sug.priority = b.dataset.p; save(); keepScroll(); });
  document.querySelectorAll('[data-unrate]').forEach((b) => b.onclick = () => { delete state.sugRatings[b.dataset.unrate]; save(); keepScroll(); });
  document.querySelectorAll('#dietType button').forEach((b) => b.onclick = () => { state.diet.type = b.dataset.d; save(); keepScroll(); });
  document.querySelectorAll('#dietAll input').forEach((c) => c.onchange = () => {
    state.diet.allergens = [...document.querySelectorAll('#dietAll input:checked')].map((x) => x.value); save();
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
// Koffein-Pegel altert mit der Zeit: Tagebuch (heute) jede Minute und beim Zurückkehren in die App auffrischen
function refreshCaffeine() {
  if (tab !== 'diary' || sheetMode || document.visibilityState !== 'visible' || !(state.caffeine.enabled || (state.supp.enabled && state.supp.remind)) || currentDate !== isoDate(new Date())) return;
  const y = window.scrollY; renderDiary(); window.scrollTo(0, y);
}
setInterval(refreshCaffeine, 60000);
document.addEventListener('visibilitychange', refreshCaffeine);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
