/* Kalorien-Tracker – alle Nutzerdaten bleiben lokal auf dem Gerät (localStorage).
   Es werden keine persönlichen Daten an einen Server gesendet. Einzige Netzwerkanfrage
   nach außen: Barcode-Abfrage bei Open Food Facts (nur der Barcode wird übertragen). */
'use strict';

const APP_VERSION = '2.3.0';
const STORE_KEY = 'ct.v1';
const BACKUP_REMIND_DAYS = 7;
const MEALS = [
  { id: 'breakfast', label: 'Frühstück' },
  { id: 'lunch', label: 'Mittagessen' },
  { id: 'dinner', label: 'Abendessen' },
  { id: 'snack', label: 'Snacks' },
];
const NUTRIENTS = ['k', 'p', 'c', 'f', 'fi', 'su', 'fs']; // fs = freier Zucker (WHO-Definition), Teil von su
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,serving_size,product_quantity,quantity,allergens_tags,ingredients_analysis_tags';

/* ---------- Speicher ---------- */
function emptyState() {
  return {
    settings: { goal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null }, // nur noch zum Import alter Backups (vor dem Zielverlauf)
    goalHistory: [], // [{ from: 'JJJJ-MM-TT', goal, protein, carbs, fat, fiber, sugar }], sortiert nach Datum
    days: {}, custom: [], recent: [], favs: [], offCache: {}, lastBackup: null,
    wgoal: WG_DEFAULTS(), weightLog: {},
    pantry: [], // vorgemerkte Lebensmittel (z. B. nach dem Einkauf)
    waterFoods: {}, // Lebensmittel, die standardmäßig zur Flüssigkeit zählen
    weekSeen: null, // Wochenrückblick als gelesen markiert (Montag der aktuellen Woche)
    meals: [], // gespeicherte Mahlzeiten [{ id, n, items: [Journal-Eintrag ohne id/Zeit] }]
    cafFoods: {}, // eigener Koffeingehalt je Lebensmittel-ID (mg pro 100 g/ml); 0 = kein Koffein
    slices: {}, // gelerntes Scheibengewicht je Lebensmittel-ID (g)
    water: { enabled: true, goal: 1500, step: 250, log: {}, hist: [] }, // log: { 'JJJJ-MM-TT': [{ id, ml, min }, …] }; hist: Zielverlauf [{ from, goal }]
    supp: SUPP_DEFAULTS(),
    timeline: TL_DEFAULTS(),
    profile: { weight: null, sex: null, height: null, birthYear: null },
    sugarPct: 10, showSF: false, heroMode: 'left', cardOpen: {},
    theme: 'auto', // 'auto' (wie iPhone) | 'dark' | 'light'
    companion: true, // Begleiter (Gemüsemonster) im Journal
    dayDone: null, // Tag, an dem „Fertig für heute“ getippt wurde
    alcohol: ALC_DEFAULTS(),
    level: LEVEL_DEFAULTS(), // Level-System: nur Auswahl + Aktionszähler (js/level.js)
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
  delete s.sug; delete s.diet; delete s.sugRatings; // Abend-Vorschläge und Ernährungsfilter entfallen seit 2.3.0
  if (!s.slices || typeof s.slices !== 'object') s.slices = {};
  if (!s.waterFoods || typeof s.waterFoods !== 'object') s.waterFoods = {};
  if (!s.cafFoods || typeof s.cafFoods !== 'object') s.cafFoods = {};
  if (!Array.isArray(s.meals)) s.meals = [];
  if (typeof s.weekSeen !== 'string') s.weekSeen = null;
  if (!['auto', 'dark', 'light'].includes(s.theme)) s.theme = 'auto';
  s.companion = s.companion !== false;
  if (typeof s.dayDone !== 'string') s.dayDone = null;
  s.meals = s.meals.filter((m) => m && m.id && Array.isArray(m.items) && m.items.length);
  if (!Array.isArray(s.pantry)) s.pantry = [];
  s.wgoal = Object.assign(WG_DEFAULTS(), data.wgoal || {});
  if (!s.weightLog || typeof s.weightLog !== 'object') s.weightLog = {};
  s.water = Object.assign(emptyState().water, data.water || {});
  if (!s.water.log || typeof s.water.log !== 'object') s.water.log = {};
  if (!Array.isArray(s.water.hist) || !s.water.hist.length) s.water.hist = [{ from: '2000-01-01', goal: s.water.goal || 1500 }]; // ältere Daten: bisheriges Ziel gilt rückwirkend
  s.water.hist.sort((a, b) => a.from.localeCompare(b.from));
  s.supp = suppNormalize(data.supp);
  s.timeline = tlNormalize(data.timeline);
  s.profile = Object.assign({ weight: null, sex: null, height: null, birthYear: null }, data.profile || {});
  if (data.showSF == null) s.showSF = !!(s.goalHistory || []).some((h) => h.fiber || h.sugar);
  if (![5, 10].includes(s.sugarPct)) s.sugarPct = 10;
  s.alcohol = Object.assign(ALC_DEFAULTS(), data.alcohol || {});
  if (!s.alcohol.log || typeof s.alcohol.log !== 'object') s.alcohol.log = {};
  s.caffeine = Object.assign(CAFF_DEFAULTS(), data.caffeine || {});
  if (!s.caffeine.log || typeof s.caffeine.log !== 'object') s.caffeine.log = {};
  s.level = Object.assign(LEVEL_DEFAULTS(), data.level || {});
  if (!s.level.ev || typeof s.level.ev !== 'object') s.level.ev = {};
  if (!s.level.arenas || typeof s.level.arenas !== 'object') s.level.arenas = {};
  // Übernahme aus Versionen ohne Ziel-Historie: bisheriges Ziel gilt ab dem ersten Tagebuch-Tag
  if (!s.goalHistory.length && s.settings.goal != null) {
    const first = Object.keys(s.days).filter((d) => (s.days[d] || []).length).sort()[0] || isoDate(new Date());
    const entry = { from: first }; GOAL_KEYS.forEach((k) => { entry[k] = s.settings[k] ?? null; });
    s.goalHistory = [entry];
  }
  s.goalHistory.sort((a, b) => a.from.localeCompare(b.from));
  if (s.profile.weight == null) { const wh = s.goalHistory.slice().reverse().find((h) => h.weight); if (wh) s.profile.weight = wh.weight; }
  return s;
}
// Neues Körpergewicht: Profil speichern und die heute gültigen Makroziele ab heute neu berechnen (frühere Tage bleiben unverändert)
function applyProfileWeight(w) {
  if (w != null) (state.weightLog = state.weightLog || {})[isoDate(new Date())] = w; // vollständiger Gewichtsverlauf (auch ohne Gewichtsziel)
  const m1 = applyProfileWeightMacros(w);
  const m2 = w != null ? wgOnWeight(w) : null;
  return m2 ? `Gewicht gespeichert – ${m2}` : m1;
}
function applyProfileWeightMacros(w) {
  state.profile.weight = w;
  if (w == null || !state.goalHistory.length) return null;
  const today = isoDate(new Date());
  const cur = goalsFor(today);
  if (cur.weight === w) return null;
  const entry = Object.assign({}, cur, { from: today, weight: w });
  const m = calcMacros(cur.goal, w, cur.pf, cur.ff);
  let msg = 'Gewicht gespeichert';
  if (m && !m.carbsNegative) { entry.protein = m.protein; entry.carbs = m.carbs; entry.fat = m.fat; msg = `Gewicht gespeichert – Makroziele ab heute angepasst (E ${m.protein} g · F ${m.fat} g)`; }
  else if (m && m.carbsNegative) msg = 'Gewicht gespeichert – Eiweiß und Fett übersteigen das Kalorienziel, Makroziele unverändert';
  state.goalHistory = state.goalHistory.filter((h) => h.from !== today).concat([entry]).sort((a, b) => a.from.localeCompare(b.from));
  return msg;
}
// Ballaststoff- und Zuckerziel: bei Presets automatisch (DGE ≥ 30 g; freier Zucker < 10 % bzw. 5 % der kcal, WHO), bei „Eigene“ manuell
function sfTargets(s) {
  if (s.preset && s.preset !== 'custom') return { fiber: 30, sugar: s.goal ? Math.round(s.goal * state.sugarPct / 100 / 4) : null };
  return { fiber: s.fiber || null, sugar: s.sugar || null };
}
// Anzeige ganzer Zahlen: Tausenderpunkt, echtes Minuszeichen; fmtS mit Vorzeichen (+/−). Nicht für Eingabefelder.
const fmt = (n) => r0(n).toLocaleString('de-DE').replace('-', '−');
const fmtS = (n) => (r0(n) > 0 ? '+' : '') + fmt(n);
const de0 = fmt;
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
  NUTRIENTS.forEach((n) => { o[n] = (n === 'fs' ? fsOf(food) : (food[n] || 0)) * f; });
  return o;
}
/* Freier Zucker je 100 g: gespeicherter Wert, sonst aus dem BLS (abgeleitet), sonst konservativ = Gesamtzucker */
function fsOf(food) {
  if (food.fs != null) return Math.min(food.fs, food.su || 0);
  const id = food.ref || food.id;
  if (id && String(id).startsWith('bls:')) { const b = blsMap.get(id); if (b && b.fs != null) return b.fs; }
  return food.su || 0;
}
function entryTotals(e) { return per(e, e.grams); }
function sumEntries(list) {
  const t = { k: 0, p: 0, c: 0, f: 0, fi: 0, su: 0, fs: 0 };
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

function nutrientsOf(food) { const o = {}; NUTRIENTS.forEach((n) => { o[n] = n === 'fs' ? fsOf(food) : (food[n] || 0); }); return o; }
function foodSnap(food) {
  const o = Object.assign({ src: food.src, id: food.ref || food.id, n: food.n, brand: food.brand || '', serving: food.serving || null, liq: isLiq(food) }, nutrientsOf(food));
  if (food.cf != null) o.cf = food.cf; // Koffein mg pro 100 g/ml (OFF oder eigenes Lebensmittel)
  return o;
}
const isFav = (id) => state.favs.some((x) => x.id === id);
// Aktuelle Werte zu einer gespeicherten Kopie (Favoriten, Zuletzt, Vorgemerkt): Original aus BLS, Barcode-Speicher,
// eigenen Lebensmitteln; fehlt es, bleibt die Kopie. Journal-Einträge bleiben bewusst unverändert.
function liveFood(snap) {
  const id = snap && (snap.ref || snap.id); if (!id) return snap;
  const s = String(id);
  const live = s.startsWith('bls:') ? blsMap.get(s) : s.startsWith('off:') ? state.offCache[s.slice(4)] : state.custom.find((x) => x.id === s);
  return live ? Object.assign({}, snap, live, { id: s }) : snap;
}

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
    bls = (data.foods || []).map((x) => ({ src: 'bls', id: 'bls:' + x.id, n: x.n, k: x.k, p: x.p, c: x.c, f: x.f, fi: x.fi || 0, su: x.su || 0, fs: x.fs, d: x.d, a: x.a, b: x.b }));
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
function goTab(t, openSec) { if (t === 'settings' && (tab !== 'settings' || openSec)) { setOpen.clear(); if (openSec) setOpen.add(openSec); } tab = t; closePlus(); closeUndo(); render(); }
function render() {
  if (tab === 'timeline' && !state.timeline.enabled) tab = 'diary';
  tabbarActive();
  document.body.dataset.tab = tab;
  if (tab === 'diary') renderDiary();
  else if (tab === 'history') renderHistory();
  else if (tab === 'timeline') renderTimeline();
  else if (tab === 'food') renderFood();
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
  src.forEach((e) => {
    // Getränk aus dem Koffein-Tracker: den Koffein-Eintrag mitkopieren, der legt den Journal-Eintrag selbst an
    const ce = e.cafId && (state.caffeine.log[fromDate] || []).find((x) => x.id === e.cafId);
    if (ce) { const nc = Object.assign({}, ce, { id: uid() }); (state.caffeine.log[currentDate] = state.caffeine.log[currentDate] || []).push(nc); caffSyncDiary(currentDate, nc); return; }
    const ne = Object.assign({}, e, { id: uid() });
    (state.days[currentDate] = state.days[currentDate] || []).push(ne);
    if (ne.cf > 0) caffSyncFood(currentDate, ne);
  });
  save();
  return src.length;
}

/* Zucker (Obergrenze) und Ballaststoffe (Mindestziel) – nur wenn im Tagesziel festgelegt */
function sfHalf(cls, label, val, target, kind, natural) {
  const isMax = kind === 'max.';
  const r = target ? val / target : 0;
  let st, tone = '';
  if (isMax) {
    if (val > target) { st = `+${r0(val - target)} g über`; tone = 'warn'; }
    else if (r >= 0.9) { st = 'fast erreicht'; tone = 'warn'; }
    else st = `noch ${r0(target - val)} g`;
  } else {
    if (val >= target) { st = 'erreicht ✓'; tone = 'ok'; } else st = `noch ${r0(target - val)} g`;
  }
  return `<div class="sf ${cls}"><div class="sf-h"><span>${label}</span><span class="sf-st ${tone}">${st}</span></div>
    <div class="sf-v"><strong>${r0(val)}</strong><span>${kind} ${r0(target)} g</span></div>
    <div class="sf-bar"><span style="width:${Math.min(100, r * 100)}%"></span></div>${natural != null && natural >= 0.5 ? `<div class="sf-nat">+ ${r0(Math.max(0, natural))} g natürlicher Zucker</div>` : ''}</div>`;
}
/* ---------- Info-Knöpfe (Blatt von unten) ---------- */
const INFO_STATIC = {
  water: { body: '<p>Richtwert der DGE: 1,5 l Getränke pro Tag; bei Hitze, Sport oder körperlicher Arbeit mehr. Die EFSA nennt 2,5 l (Männer) bzw. 2,0 l (Frauen) Gesamtwasser – inklusive Wasser aus Lebensmitteln.</p><p>Getränke aus dem Koffein-Tracker zählen mit ihren ml, Alkohol zählt nicht. Bei Getränken mit Koffein aus dem Journal (z. B. Red Bull) ist „Zur Flüssigkeit zählen“ vorausgewählt. Andere Getränke aus dem Journal (z. B. Schorle, Milch) zählen, wenn du im Eintrag „Zur Flüssigkeit zählen“ anhakst – die App merkt sich das je Lebensmittel.</p><p>Das Plus trägt die in den Einstellungen gewählte Menge ein. Der Balken zeigt, woher das Wasser kommt: <span style="color:var(--water)">blau</span> = eigene Einträge, <span style="color:var(--caf)">gold</span> = Koffein-Getränke, <span style="color:var(--accent)">cyan</span> = Getränke aus dem Journal.</p>', src: 'DGE · EFSA 2010' },
  share: { body: '<p>Exportiert werden alle Lebensmittel, die du gescannt, im Journal getrackt, selbst angelegt oder vorgemerkt hast – jeweils nur Name, Marke und Nährwerte pro 100 g, dazu Barcode-Daten und Scheibengewichte. Favoriten-Markierungen, Datum, Mengen und Mahlzeiten aus dem Journal, Gewicht, Ziele und Einstellungen sind nicht enthalten.</p><p>Beim Import werden nur fehlende Lebensmittel ergänzt: eigene Lebensmittel unter „Eigene“, alle anderen unter „Vorgemerkt“. Was schon vorhanden ist, bleibt unverändert. Wird ein vollständiges Backup gewählt, werden daraus ebenfalls nur die Lebensmittel übernommen.</p><p>Die Datei läuft über das Teilen-Menü (z. B. AirDrop, Nachrichten) und nicht über einen Server der App.</p>' },
  sf: { body: '<p>Bei den Ernährungszielen Ausgewogen, Muskelaufbau und Fettabbau rechnet die App automatisch: Ballaststoffe mindestens 30 g (DGE), freier Zucker höchstens 10 % (oder 5 %) deiner Kalorien (WHO). Bei „Eigene“ trägst du beide Werte selbst ein.</p><p>Freier Zucker = zugesetzter Zucker sowie Zucker in Honig, Sirup und Fruchtsaft. Zucker in ganzem Obst, Gemüse und Milch zählt als natürlich und wird nur angezeigt. Der freie Anteil wird aus Lebensmittelgruppe und Namen geschätzt.</p>', pts: [['< 10 % der kcal', 'WHO, starke Empfehlung'], ['< 5 % der kcal', 'WHO, bedingte Empfehlung'], ['≥ 30 g Ballaststoffe', 'DGE, für Erwachsene']], src: 'WHO 2015 · DGE/DAG/DDG 2019 · DGE 2022' },
};
INFO_STATIC.goalFrom = { body: '<p>Ein neues Ziel gilt ab dem gewählten Tag. Frühere Tage behalten ihr damaliges Ziel – Analytics bewertet jeden Tag mit dem Ziel, das an diesem Tag galt. Im „Verlauf der Ziele“ kannst du einzelne Änderungen wieder löschen.</p>' };
// Einträge: { body: HTML, pts: [[fett, grau], …], src: 'Quellen' } oder Funktion, die so ein Objekt liefert
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO; Object.assign(INFO, INFO_STATIC);
const infoBtn = (key) => `<button type="button" class="ibtn" data-info="${key}" aria-label="Info">i</button>`;
function openInfo(key) {
  const raw = INFO[key]; if (!raw) return;
  const i = typeof raw === 'function' ? raw() : raw;
  closeInfo();
  const el = document.createElement('div');
  el.id = 'infoSheet';
  el.innerHTML = `<div class="info-back"></div><div class="info-panel" role="dialog" aria-modal="true" aria-label="${i.title || 'Info'}"><div class="info-grip"></div>
    <div class="info-h"><span class="info-i ${i.warn ? 'warn' : ''}">${i.warn ? '!' : 'i'}</span><h1>${i.title || 'Info'}</h1></div>
    <div class="info-body">${i.body}</div>
    ${i.pts ? `<div class="info-pts">${i.pts.map(([b, m]) => `<div><strong>${b}</strong>${m ? ` <span class="muted">· ${m}</span>` : ''}</div>`).join('')}</div>` : ''}
    ${i.src ? `<div class="info-src small muted">Quellen: ${i.src}</div>` : ''}
    <button class="btn block" id="infoOk">Verstanden</button></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  el.querySelector('.info-back').onclick = closeInfo;
  el.querySelector('#infoOk').onclick = closeInfo;
}
function closeInfo() { const el = document.getElementById('infoSheet'); if (el) el.remove(); }
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-info]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation(); openInfo(b.dataset.info);
}, true);
const openMeals = new Set();   // aufgeklappte Mahlzeiten (nur für diese Sitzung)
/* Kalorien-Übersicht (K1): Ring nach Herkunft der kcal (Eiweiß/KH/Fett, Rest z. B. Alkohol grau) + Makro-Balken.
   Umschalter Übrig/Gegessen und g/% werden gespeichert. */
function heroHtml(goal, t, s) {
  const left = state.heroMode !== 'eaten';
  const de = fmt;
  const over = goal && t.k > goal;
  const R = 58, L = 2 * Math.PI * R;
  const parts = [['p', t.p * 4], ['c', t.c * 4], ['f', t.f * 9]];
  const mk = parts.reduce((x, y) => x + y[1], 0);
  if (t.k - mk > Math.max(20, t.k * 0.03)) parts.push(['o', t.k - mk]); // nicht zugeordnete kcal (z. B. Alkohol); kleine Rundungsreste ignorieren
  const tot = parts.reduce((x, y) => x + y[1], 0) || 1;
  const full = goal ? Math.min(1, t.k / goal) : (t.k > 0 ? 1 : 0); // Anteil des Rings, der gefüllt ist
  let off = 0, segs = '';
  const gap = parts.filter((x) => x[1] / tot * full * L > 0.5).length > 1 ? 2 : 0; // kleine Lücke zwischen den Farben
  parts.forEach(([cls, kc]) => {
    const len = kc / tot * full * L;
    if (len > 0.5) segs += `<circle class="seg ${cls}" cx="70" cy="70" r="${R}" stroke-dasharray="${Math.max(0.5, len - gap).toFixed(1)} ${L.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"></circle>`;
    off += len;
  });
  const big = goal ? (left ? Math.abs(goal - t.k) : t.k) : t.k;
  const cap = !goal ? 'kcal gegessen' : left ? (over ? 'kcal über Ziel' : 'kcal übrig') : 'kcal gegessen';
  const foot = !goal ? 'Kein Tagesziel festgelegt' : left ? `${de(t.k)} von ${de(goal)} kcal gegessen` : (over ? `${de(t.k - goal)} kcal über dem Ziel von ${de(goal)}` : `${de(goal - t.k)} kcal übrig · Ziel ${de(goal)}`);
  const row = (cls, label, val, target) => {
    let v;
    if (!target) v = `${r0(val)}<small> g</small>`;
    else if (left && val > target) v = `<span class="ov">+${r0(val - target)}</span><small> g</small>`; // über dem Ziel
    else v = `${r0(left ? target - val : val)}<small> / ${r0(target)} g</small>`;
    return `<div class="hm ${cls}"><div class="hm-h"><span>${label}</span><b>${v}</b></div><div class="mbar"><span style="width:${target ? Math.min(100, (val / target) * 100) : 0}%"></span></div></div>`;
  };
  return `<div class="hero-top">
      <div class="seg-pill" id="heroMode" role="group" aria-label="Anzeige"><button type="button" data-m="left" class="${left ? 'on' : ''}">Übrig</button><button type="button" data-m="eaten" class="${left ? '' : 'on'}">Gegessen</button></div>
    </div>
    <div class="hero-body">
      <div class="kring" role="img" aria-label="${goal ? `${r0(t.k / goal * 100)} Prozent des Tagesziels gegessen` : `${de(t.k)} kcal gegessen`}">
        <svg viewBox="0 0 140 140"><circle class="track" cx="70" cy="70" r="${R}"></circle><g transform="rotate(-90 70 70)">${segs}</g></svg>
        <div class="kc"><div class="big ${goal && left && over ? 'over' : ''}">${de(big)}</div><div class="cap">${cap}</div></div>
      </div>
      <div class="hmacros">${row('p', 'Eiweiß', t.p, s.protein)}${row('c', 'Kohlenhydrate', t.c, s.carbs)}${row('f', 'Fett', t.f, s.fat)}</div>
    </div>
    <div class="hero-foot">${foot}</div>`;
}
function renderDiary() {
  const v = $('#view');
  const s = goalsFor(currentDate);
  const goal = s.goal;
  const entries = state.days[currentDate] || [];
  const t = sumEntries(entries);
  const prev = addDays(currentDate, -1);
  const prevEntries = state.days[prev] || [];
  const rerender = () => { const y = window.scrollY; renderDiary(); window.scrollTo(0, y); };

  let html = dayHeaderHtml(currentDate);
  if (backupDue()) {
    html += `<div class="card notice"><div><strong>Backup fällig</strong><div class="small muted">${backupText()} Deine Daten liegen nur auf diesem Handy.</div></div>
      <button class="btn secondary" id="quickBackup" style="flex:0 0 auto">Sichern</button></div>`;
  }
  if (!goal) {
    html += `<div class="card welcome">${state.companion !== false ? monsterSvg('awake', 84) : ''}<div><h2>Willkommen!</h2><p class="muted small" style="margin:4px 0 10px">Deine Daten bleiben nur auf diesem Handy. Lege zuerst dein Tagesziel fest – alles andere kannst du später einschalten.</p>
      <button class="btn block" id="toSettings">Ziel festlegen</button></div></div>`;
  }
  html += closingCardHtml(currentDate);
  html += `<div class="card hero">
      ${heroHtml(goal, t, s)}
      ${(() => { const T = sfTargets(s); return state.showSF && (T.sugar || T.fiber) ? `<div class="sf-row">${T.sugar ? sfHalf('su', 'Freier Zucker', t.fs, T.sugar, 'max.', t.su - t.fs) : ''}${T.fiber ? sfHalf('fi', 'Ballaststoffe', t.fi, T.fiber, 'mind.') : ''}</div>` : ''; })()}
    </div>`;
  const empty = emptyDayHtml(currentDate);
  html += empty;
  html += trackerCardsHtml(currentDate);
  if (currentDate === isoDate(new Date())) html += insWeekCardHtml(currentDate); // Wochenrückblick Mo–Mi
  if (!empty) html += dayTimelineHtml(currentDate);
  if (!empty && !entries.length && prevEntries.length) {
    html += `<button class="btn secondary block" id="copyDay" style="margin-top:4px">Ganzen Vortag übernehmen (${fmt(sumEntries(prevEntries).k)} kcal)</button>`;
  }
  v.innerHTML = html;
  justAdded.clear();
  if (pulseKey) { const el = v.querySelector(`[data-tkc="${pulseKey}"]`); if (el) el.classList.add('pulse'); pulseKey = null; }
  heroAnimate(currentDate);
  insBindWeek(currentDate, rerender);
  bindTrackerCards(currentDate, rerender);
  bindDayTimeline(currentDate, rerender);
  bindClosingCard(currentDate, rerender);
  bindEntrySwipe(currentDate, rerender);
  const goDay = (d) => { currentDate = d; closedMeals.clear(); renderDiary(); };
  bindDayHeader(goDay);
  bindDaySwipe((n) => { const vv = $('#view'); vv.classList.remove('slide-l', 'slide-r'); currentDate = addDays(currentDate, n); closedMeals.clear(); renderDiary(); if (!reduceMotion()) { void vv.offsetWidth; vv.classList.add(n > 0 ? 'slide-l' : 'slide-r'); } });
  const ts = $('#toSettings'); if (ts) ts.onclick = () => goTab('settings');
  document.querySelectorAll('#heroMode [data-m]').forEach((b) => b.onclick = () => { state.heroMode = b.dataset.m; save(); renderDiary(); });
  const qb = $('#quickBackup'); if (qb) qb.onclick = async () => { await exportBackup(); renderDiary(); };
  v.querySelectorAll('[data-mtime]').forEach((b) => b.onclick = () => tlTimeSheet(currentDate, b.dataset.mtime, rerender));
  v.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => { closedMeals.delete(b.dataset.add); addTab = 'search'; addQuery = ''; openAdd(b.dataset.add); });
  v.querySelectorAll('[data-msave]').forEach((b) => b.onclick = () => openSaveMeal(currentDate, b.dataset.msave));
  v.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { const before = new Set((state.days[currentDate] || []).map((e) => e.id)); const n = copyEntries(prev, b.dataset.copy); (state.days[currentDate] || []).forEach((e) => { if (!before.has(e.id)) justAdded.add(e.id); }); toast(`${n} übernommen`); renderDiary(); });
  const cd = $('#copyDay'); if (cd) cd.onclick = () => { const n = copyEntries(prev, null); (state.days[currentDate] || []).forEach((e) => justAdded.add(e.id)); toast(`${n} Einträge übernommen`); renderDiary(); };
  v.querySelectorAll('[data-entry]').forEach((el) => el.onclick = () => {
    const row = el.closest('.sw'); if (row && row.dataset.swiped) return; // Wischen ist kein Tippen
    const e = entries.find((x) => x.id === el.dataset.entry);
    if (!e) return;
    const ae = e.alcId && ((state.alcohol.log[currentDate] || []).find((x) => x.id === e.alcId));
    if (ae) { openAlcohol(currentDate, ae); return; }
    const ce = e.cafId && ((state.caffeine.log[currentDate] || []).find((x) => x.id === e.cafId));
    if (ce) openCaffeine(currentDate, ce); else if (e.quick) openQuick(e.meal, e); else openAmount(e, { edit: true });
  });
}

/* ---------- Wasser ----------
   Standardziel 1,5 l Getränke pro Tag (Richtwert der DGE); EFSA (2010): angemessene Gesamtwasserzufuhr
   2,5 l (Männer) bzw. 2,0 l (Frauen) inklusive Wasser aus Lebensmitteln. */
// Wasser-Einträge: { id, ml, min } (min = Minuten seit 0 Uhr; ältere Einträge waren reine Zahlen ohne Uhrzeit)
const wEntries = (iso) => (state.water.log[iso] || []).map((x, i) => (typeof x === 'number' ? { id: 'w' + i, ml: x, min: null } : x));
const waterManual = (iso) => wEntries(iso).reduce((a, x) => a + (x.ml || 0), 0);
// ml aus Journal-Einträgen, bei denen „zur Flüssigkeit zählen“ gesetzt ist (z. B. Schorle, Milch)
const foodWaterList = (iso) => (state.days[iso] || []).filter((e) => e.water && isLiq(e) && !e.cafId && !e.alcId);
const foodWater = (iso) => foodWaterList(iso).reduce((a, e) => a + (e.grams || 0), 0);
const waterOf = (iso) => waterManual(iso) + caffWater(iso) + foodWater(iso);
// Wasserziel, das an einem Tag galt (wie beim Kalorienziel: Änderungen gelten ab dem Tag der Änderung)
function waterGoalFor(iso) {
  const h = state.water.hist || [];
  let g = h.length ? h[0].goal : state.water.goal;
  for (const e of h) { if (e.from <= iso) g = e.goal; else break; }
  return g || 1500;
}
const litres = (ml) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const minHM = (m) => (m == null ? '–' : `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
function waterAdd(iso, ml, minOpt) {
  const now = new Date(), min = minOpt !== undefined ? minOpt : iso === isoDate(now) ? now.getHours() * 60 + now.getMinutes() : null;
  (state.water.log[iso] = state.water.log[iso] || []).push({ id: uid(), ml: Math.round(ml), min });
  save(); if (navigator.vibrate) navigator.vibrate(20);
}
// Alle Getränke des Tages, die zum Wasser zählen (eigene Einträge, Koffein-Getränke, Journal-Getränke)
function waterRows(iso) {
  const rows = wEntries(iso).map((x) => ({ kind: 'w', id: x.id, min: x.min, n: 'Wasser', ml: x.ml }));
  (state.caffeine.log[iso] || []).filter((x) => x.tr && x.ml > 0).forEach((x) => rows.push({ kind: 'c', id: x.id, min: x.min, n: x.n || 'Koffein-Getränk', ml: x.ml, src: 'aus Koffein' }));
  foodWaterList(iso).forEach((e) => {
    const min = e.t ? hmToMin(e.t) : (state.timeline.enabled ? Math.round(tlMealTime(iso, e.meal).h * 60) : null);
    rows.push({ kind: 'f', id: e.id, min, n: e.n, ml: e.grams || 0, src: 'aus dem Journal' });
  });
  return rows.sort((a, b) => (a.min ?? -1) - (b.min ?? -1));
}
function waterCardHtml(iso) {
  if (!state.water.enabled) return '';
  const W = state.water, goal = waterGoalFor(iso), step = W.step || 250;
  const ml = waterOf(iso), isToday = iso === isoDate(new Date());
  const rows = waterRows(iso);
  const add = `data-water-add aria-label="${step} ml Wasser eintragen"`;
  const other = `<div class="w-other" hidden>
      <div class="row"><div><label for="wOtherMl">Menge (ml)</label><input id="wOtherMl" inputmode="numeric" placeholder="z. B. 330"></div>
      <div><label for="wOtherT">Uhrzeit</label><input id="wOtherT" type="time" value="${isToday ? minHM(nowMin()) : ''}"></div></div>
      ${isToday ? '' : '<p class="small muted" style="margin-top:4px">Ohne Uhrzeit steht der Eintrag am Ende des Tages.</p>'}
      <button type="button" class="btn block" id="wOtherOk" style="margin-top:10px">Eintragen</button></div>`;
  if (!rows.length) return `<div class="card water tk-empty">
    <div class="small muted">Wasser</div><div class="tk-e-v">0,00<span class="muted small"> l</span></div>
    ${trackerFoot('water', add, 'Noch nichts eingetragen', `<div class="row w-more"><button type="button" class="btn secondary" id="wOther">Menge &amp; Uhrzeit</button></div>${other}`)}
  </div>`;
  const parts = [[waterManual(iso), 'w'], [caffWater(iso), 'c'], [foodWater(iso), 'f']];
  const bar = parts.map(([v, k]) => (v > 0 ? `<i class="${k}" style="width:${Math.min(100, v / goal * 100).toFixed(1)}%"></i>` : '')).join('');
  const done = ml >= goal;
  const pill = `<span class="caf-pill ${done ? 'ok' : 'water'}">${done ? 'Ziel erreicht ✓' : `noch ${litres(goal - ml)} l`}</span>`;
  const fromCaf = caffWater(iso);
  const summary = `${isToday ? 'Heute' : 'Getrunken:'} ${rows.length} ${rows.length === 1 ? 'Eintrag' : 'Einträge'}${fromCaf ? ` · <span class="muted">${litres(fromCaf).replace(/0$/, '')} l aus Kaffee</span>` : ''}`;
  const list = rows.map((r) => `<div class="w-row" data-wopen="${r.kind}:${esc(r.id)}" role="button" tabindex="0">
      <span class="caf-time w-${r.kind}">${minHM(r.min)}</span>
      <span class="w-n">${esc(r.n)}${r.src ? `<small>${r.src}</small>` : ''}</span>
      <strong>${fmt(r.ml)} ml</strong>
      ${r.kind === 'w' ? `<button type="button" class="w-del" data-wdel="${esc(r.id)}" aria-label="Eintrag löschen">✕</button>` : '<span class="w-go">↗</span>'}</div>`).join('');
  const details = `<div class="w-list">${list}</div>
    <div class="row w-more"><button type="button" class="btn secondary" data-water-ml="500">+ 500 ml</button><button type="button" class="btn secondary" id="wOther">Andere Menge</button></div>
    ${other}`;
  return `<div class="card water">
    <div class="caf-head"><div><div class="small muted">Wasser ${infoBtn('water')}</div><div class="caf-big">${litres(ml)}<span class="muted small"> / ${litres(goal)} l</span></div></div>${pill}</div>
    <div class="w-bar">${bar}</div>
    ${trackerFoot('water', add, summary, details)}
  </div>`;
}
function bindWaterCard(iso, rerender) {
  trackerBind();
  document.querySelectorAll('[data-water-add]').forEach((b) => b.onclick = () => { waterAdd(iso, state.water.step || 250); rerender(); });
  document.querySelectorAll('[data-water-ml]').forEach((b) => b.onclick = () => { waterAdd(iso, +b.dataset.waterMl); rerender(); });
  const o = $('#wOther'); if (o) o.onclick = () => { const r = document.querySelector('.w-other'); r.hidden = !r.hidden; if (!r.hidden) $('#wOtherMl').focus(); };
  const ok = $('#wOtherOk'); if (ok) ok.onclick = () => {
    const v = num($('#wOtherMl').value);
    if (v == null || v < 10 || v > 3000) { toast('Bitte 10–3000 ml eingeben.'); return; }
    const tv = $('#wOtherT').value;
    waterAdd(iso, v, tv ? hmToMin(tv) : null); rerender();
  };
  document.querySelectorAll('[data-wdel]').forEach((b) => b.onclick = (ev) => {
    ev.stopPropagation();
    const x = wEntries(iso).find((y) => y.id === b.dataset.wdel); if (!x) return;
    if (!confirm(`${fmt(x.ml)} ml Wasser löschen?`)) return;
    state.water.log[iso] = wEntries(iso).filter((y) => y.id !== x.id);
    if (!state.water.log[iso].length) delete state.water.log[iso];
    save(); rerender();
  });
  document.querySelectorAll('[data-wopen]').forEach((el) => el.onclick = () => {
    const [k, id] = el.dataset.wopen.split(':');
    if (k === 'w') openWaterEdit(iso, id, rerender);
    else if (k === 'c') { const e = (state.caffeine.log[iso] || []).find((x) => x.id === id); if (e) openCaffeine(iso, e); }
    else { const e = (state.days[iso] || []).find((x) => x.id === id); if (e) openAmount(e, { edit: true }); }
  });
}

// Eigenen Wasser-Eintrag bearbeiten: Menge, Uhrzeit (auch leer = ohne Uhrzeit), Löschen
function openWaterEdit(iso, id, back) {
  const x = wEntries(iso).find((y) => y.id === id); if (!x) return;
  sheetMode = 'tracker';
  openSheet(`${sheetHead('weBack', 'Wasser-Eintrag', true)}
    <div class="row"><div><label for="weMl">Menge (ml)</label><input id="weMl" inputmode="numeric" value="${x.ml}"></div>
    <div><label for="weT">Uhrzeit</label><input id="weT" type="time" value="${x.min != null ? minHM(x.min) : ''}"></div></div>
    <p class="small muted" style="margin-top:4px">Ohne Uhrzeit steht der Eintrag am Ende des Tages.</p>
    <div style="height:14px"></div><button class="btn block" id="weSave">Speichern</button>
    <div style="height:10px"></div><button class="btn danger block" id="weDel">Eintrag löschen</button>`);
  $('#weBack').onclick = back;
  $('#weSave').onclick = () => {
    const v = num($('#weMl').value);
    if (v == null || v < 10 || v > 3000) { toast('Bitte 10–3000 ml eingeben.'); return; }
    const t = $('#weT').value;
    state.water.log[iso] = wEntries(iso).map((y) => (y.id === id ? Object.assign({}, y, { ml: Math.round(v), min: t ? hmToMin(t) : null }) : y));
    save(); toast('Gespeichert'); back();
  };
  $('#weDel').onclick = () => {
    state.water.log[iso] = wEntries(iso).filter((y) => y.id !== id);
    if (!state.water.log[iso].length) delete state.water.log[iso];
    save(); toast('Gelöscht'); back();
  };
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

/* ---------- Sheet ----------
   Kopfzeile: Hauptfenster (direkt geöffnet) = Titel links, „Schließen“ rechts;
   Unterfenster (aus einem anderen Fenster) = „‹ Zurück“ links, Titel darunter. */
function sheetHead(id, title, sub, extra = '') {
  return sub
    ? `<div class="sheet-head"><button class="btn ghost" id="${id}">‹ Zurück</button>${extra || '<span></span>'}</div><h1>${title}</h1>`
    : `<div class="sheet-head"><h1 class="sh-t">${title}${extra}</h1><button class="btn ghost" id="${id}">Schließen</button></div>`;
}
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
  if (pantryMode) { openPantry(['mine', 'custom'].includes(addTab) ? 'search' : addTab); return; }
  addMeal = meal; sheetMode = 'add';
  const label = MEALS.find((m) => m.id === meal).label;
  openSheet(`
    <div class="sheet-head"><h1 class="sh-t">${label}</h1><button class="btn ghost" id="closeSheet">Schließen</button></div>
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
  return `<li data-i="${i}" class="fli">${foodBadge(f)}<div class="grow">${star}${esc(f.n)}${tag ? `<span class="tag">${tag}</span>` : ''}<div class="meta">${f.brand ? esc(f.brand) + ' · ' : ''}${fmt(f.k)} kcal / 100 ${unitOf(f)}</div></div><div class="meta">›</div></li>`;
}
function bindList(root, items, onPick) {
  root.querySelectorAll('li[data-i]').forEach((li) => li.onclick = () => onPick(items[+li.dataset.i]));
}

function renderAddResults() {
  const ul = $('#results'); if (!ul) return;
  if (!addQuery.trim()) {
    // Leeres Suchfeld: gespeicherte Mahlzeiten, Favoriten und zuletzt Verwendetes direkt anbieten (häufigster Weg)
    const meals = state.meals || [];
    const favs = state.favs.map(liveFood).slice(0, 8);
    const recent = state.recent.filter((x) => !isFav(x.id)).slice(0, 8).map(liveFood);
    const info = `<div class="empty">${!blsReady ? 'Lade Lebensmitteldaten…' : bls.length ? `${bls.length.toLocaleString('de-DE')} Lebensmittel aus dem BLS verfügbar.` : 'Lebensmitteldatenbank nicht geladen – nutze Barcode oder „Neu“.'}</div>`;
    const mealLi = (m, i) => `<li data-mi="${i}" class="fli"><span class="fb fb-c" aria-hidden="true">${ic('pot')}</span><div class="grow">${esc(m.n)}<span class="tag">Mahlzeit</span><div class="meta">${m.items.length} ${m.items.length === 1 ? 'Lebensmittel' : 'Lebensmittel'} · ${fmt(sumEntries(m.items).k)} kcal</div></div><div class="meta">›</div></li>`;
    ul.outerHTML = `<div id="results">${meals.length ? `<h2 class="sec">Gespeicherte Mahlzeiten</h2><ul class="list" id="qMeals">${meals.map(mealLi).join('')}</ul>` : ''}
      ${favs.length ? `<h2 class="sec">★ Favoriten</h2><ul class="list" id="qFavs">${favs.map((f, i) => foodLi(f, i)).join('')}</ul>` : ''}
      ${recent.length ? `<h2 class="sec">Zuletzt verwendet</h2><ul class="list" id="qRecent">${recent.map((f, i) => foodLi(f, i)).join('')}</ul>` : ''}${info}</div>`;
    const qf = $('#qFavs'); if (qf) bindList(qf, favs, (f) => openAmount(f));
    const qr = $('#qRecent'); if (qr) bindList(qr, recent, (f) => openAmount(f));
    document.querySelectorAll('#qMeals li[data-mi]').forEach((li) => li.onclick = () => openSavedMeal(meals[+li.dataset.mi]));
    return;
  }
  if (ul.tagName !== 'UL') { ul.outerHTML = '<ul class="list" id="results"></ul>'; return renderAddResults(); }
  const hits = searchFoods(addQuery);
  ul.innerHTML = hits.length ? hits.map((f, i) => foodLi(f, i)).join('')
    : '<div class="empty">Nichts gefunden. Unter „Neu“ kannst du es selbst anlegen.</div>';
  bindList(ul, hits, (f) => openAmount(f));
}

let mineQuery = '';
function renderMine() {
  const body = $('#addBody');
  body.innerHTML = `<input id="mq" type="search" placeholder="In Meine suchen" autocomplete="off" value="${esc(mineQuery)}"><div id="mineList"></div>`;
  const q = $('#mq');
  q.oninput = () => { mineQuery = q.value; drawMine(); };
  drawMine();
}
function drawMine() {
  const terms = norm(mineQuery).split(/\s+/).filter(Boolean);
  const hit = (f) => !terms.length || terms.every((t) => norm(f.n + ' ' + (f.brand || '')).includes(t));
  const favs = state.favs.map(liveFood).filter(hit);
  const recent = state.recent.filter((r) => !isFav(r.id)).slice(0, 30).map(liveFood).filter(hit);
  const own = state.custom.filter(hit);
  const pantry = (state.pantry || []).map(liveFood).filter(hit);
  const li = (f, i, key) => `<li data-i="${i}" class="fli">${foodBadge(f)}<div class="grow">${isFav(f.id) && key !== 'fav' ? '<span class="star">★</span>' : ''}${esc(f.n)}${{ off: '<span class="tag">Barcode</span>', custom: '<span class="tag">Eigenes</span>', recipe: '<span class="tag">Rezept</span>', rcp: '<span class="tag">Rezept</span>' }[f.src] || ''}<div class="meta">${f.brand ? esc(f.brand) + ' · ' : ''}${fmt(f.k)} kcal / 100 ${unitOf(f)}</div></div><div class="meta">›</div></li>`;
  const sec = (title, items, key) => items.length ? `<h2 class="sec">${title}</h2><ul class="list" data-sec="${key}">${items.map((f, i) => li(f, i, key)).join('')}</ul>` : '';
  const any = state.favs.length || state.recent.length || state.custom.length || (state.pantry || []).length;
  $('#mineList').innerHTML = (!any ? '<div class="empty">Noch nichts vorhanden. Favoriten markierst du mit dem Stern beim Eintragen.</div>'
    : (favs.length || recent.length || own.length || pantry.length) ? sec('★ Favoriten', favs, 'fav') + sec('Vorgemerkt', pantry, 'pantry') + sec('Zuletzt verwendet', recent, 'recent') + sec('Eigene Lebensmittel & Rezepte', own, 'own')
    : '<div class="empty">Nichts gefunden.</div>')
    + (any ? '<button type="button" class="linkbtn mine-manage" id="mineManage">Verwalten (Favoriten, Vorgemerkt, Löschen) im Reiter „Essen“ ›</button>' : '');
  const map = { fav: favs, recent, own, pantry };
  document.querySelectorAll('#mineList [data-sec]').forEach((ul) => bindList(ul, map[ul.dataset.sec], (f) => openAmount(f)));
  const mm = $('#mineManage'); if (mm) mm.onclick = () => { closeSheet(); goTab('food'); };
}
/* ---------- Gespeicherte Mahlzeiten ----------
   Eine Mahlzeit ist eine Kopie der Journal-Einträge (Nährwerte zum Speicherzeitpunkt, Mengen, Koffeingehalt).
   Einträge aus dem Koffein- oder Alkohol-Tracker werden nicht übernommen (die gehören zu ihrem Tracker). */
const MEAL_KEEP = ['ref', 'src', 'n', 'brand', 'liq', 'grams', 'quick', 'cf', 'water', 'serving'].concat(NUTRIENTS);
function mealItemOf(e) { const o = {}; MEAL_KEEP.forEach((k) => { if (e[k] != null) o[k] = e[k]; }); return o; }
function openSaveMeal(iso, meal) {
  const items = (state.days[iso] || []).filter((e) => e.meal === meal && !e.cafId && !e.alcId).map(mealItemOf);
  if (!items.length) return;
  sheetMode = 'savemeal';
  const label = (MEALS.find((m) => m.id === meal) || {}).label || 'Mahlzeit';
  const def = items.length === 1 ? items[0].n : `${items[0].n} + ${items.length - 1}`;
  openSheet(`${sheetHead('smBack', 'Mahlzeit speichern', false)}
    <p class="small muted">Speichert die ${items.length} Einträge aus „${esc(label)}“ mit ihren Mengen. Später trägst du alles mit einem Tipp ein (Plus → Suche).</p>
    <label for="smName">Name</label><input id="smName" type="text" value="${esc(def)}" maxlength="60">
    <ul class="list sm-items">${items.map((x) => `<li><div>${esc(x.n)}<div class="meta">${x.quick ? 'Schnelleintrag' : `${r1(x.grams)} ${unitOf(x)}`}</div></div><div class="meta">${fmt(entryTotals(x).k)} kcal</div></li>`).join('')}</ul>
    <button class="btn block" id="smSave">Speichern</button>`);
  $('#smBack').onclick = closeSheet;
  $('#smSave').onclick = () => {
    const n = $('#smName').value.trim() || def;
    state.meals = [{ id: uid(), n, items }].concat(state.meals || []).slice(0, 50);
    save(); toast('Mahlzeit gespeichert'); closeSheet();
  };
}
function openSavedMeal(m) {
  sheetMode = 'usemeal';
  const tot = sumEntries(m.items);
  openSheet(`${sheetHead('umBack', esc(m.n), true)}
    <p class="small muted">${fmt(tot.k)} kcal · E ${r0(tot.p)} g · KH ${r0(tot.c)} g · F ${r0(tot.f)} g</p>
    <ul class="list sm-items">${m.items.map((x) => `<li><div>${esc(x.n)}<div class="meta">${x.quick ? 'Schnelleintrag' : `${r1(x.grams)} ${unitOf(x)}`}</div></div><div class="meta">${fmt(entryTotals(x).k)} kcal</div></li>`).join('')}</ul>
    <label for="umMeal">Eintragen bei</label>
    <select id="umMeal">${MEALS.map((x) => `<option value="${x.id}" ${x.id === addMeal ? 'selected' : ''}>${x.label}</option>`).join('')}</select>
    <div style="height:14px"></div>
    <button class="btn block" id="umAdd">Alle eintragen</button>
    <div style="height:10px"></div><button class="btn danger block" id="umDel">Gespeicherte Mahlzeit löschen</button>`);
  $('#umBack').onclick = () => openAdd(addMeal);
  $('#umAdd').onclick = () => {
    const meal = $('#umMeal').value;
    m.items.forEach((x) => {
      const e = Object.assign({}, x, { id: uid(), meal });
      (state.days[currentDate] = state.days[currentDate] || []).push(e);
      if (e.cf > 0) caffSyncFood(currentDate, e);
      justAdded.add(e.id);
    });
    save(); toast(`${m.items.length} Einträge hinzugefügt`); closeSheet();
  };
  $('#umDel').onclick = () => {
    if (!confirm(`„${m.n}“ löschen? Bereits eingetragene Einträge bleiben erhalten.`)) return;
    state.meals = (state.meals || []).filter((x) => x.id !== m.id); save(); toast('Gelöscht'); openAdd(addMeal);
  };
}

// Eigenes Lebensmittel überall entfernen (Journal-Einträge bleiben)
function removeOwnFood(id) {
  state.custom = state.custom.filter((x) => x.id !== id);
  state.favs = state.favs.filter((x) => x.id !== id);
  state.recent = state.recent.filter((x) => x.id !== id);
  state.pantry = (state.pantry || []).filter((x) => x.id !== id);
  save();
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
/* ---------- Scheibengewicht für Aufschnitt und Käse ----------
   Richtwerte abgeleitet aus den LARN-Haushaltsmaßen (SINU 2024 via ATS Brescia): 50 g Aufschnitt = 5–6 Scheiben
   Salami/Bresaola (≈ 9 g), 3–4 Scheiben Schinken (≈ 15 g), 2 Scheiben Mortadella (25 g); Käse: 2 Scheiben
   „tipo formaggio fuso“ = 50 g (25 g). Echte Packungen weichen ab → eigener Wert aus Packung/Scheibenzahl hat Vorrang. */
const SLICE_RULES = [
  [/Salami|Bresaola|Chorizo|Cervelat|Plockwurst|Pfefferbei|Landjäger|Coppa|Rohwurst|Pepperoni|Mettwurst(?!.*(?:Streich|grob))|Sucuk/i, 9, 'Salami/Rohwurst'],
  [/Schinken(?!wurst)|Putenbrust|Hähnchenbrust.*(?:Aufschnitt|geräuchert|gegart)|Kassler|Kasseler|Bacon|Speck|Pastrami|Roastbeef/i, 15, 'Schinken/Brustaufschnitt'],
  [/Mortadella|Lyoner|Fleischwurst|Bierschinken|Jagdwurst|Leberkäse|Fleischkäse|Gelbwurst|Schinkenwurst|Sülze|Aspik|Blutwurst|Zungenwurst|Pressack|Mortadella/i, 25, 'Brühwurst'],
  [/Gouda|Edamer|Emmentaler|Tilsiter|Butterkäse|Leerdammer|Maasdamer|Bergkäse|Gruy[eè]re|Appenzeller|Schmelzkäse|Scheiblette|Cheddar|Provolone|Raclette|Esrom|Havarti|Käse.*Scheiben|Scheibenkäse/i, 25, 'Schnittkäse'],
];
function offSliceG(s) {
  if (!s || !/scheibe|slice|tranche|fetta|rebanada/i.test(s)) return null;
  const m = String(s).match(/(\d+(?:[.,]\d+)?)\s*g\b/i); const g = m ? num(m[1]) : null;
  const k = String(s).match(/^\s*(\d+)\s*(?:scheibe|slice|tranche|fetta)/i); const n = k ? +k[1] : 1;
  return g && g > 0 && g < 200 ? Math.round(g / n * 10) / 10 : null;
}
function sliceRule(food) {
  const n = food.n || '';
  if (/gerieben|Reibe|Streich|Aufstrich|Pulver|Würfel|Pastete|Suppe|Brötchen|Sandwich|Pizza/i.test(n)) return null;
  const id = String(food.ref || food.id || '');
  if (id.startsWith('bls:') && !'WUM'.includes(id[4])) return null; // nur Wurst, Fleisch-Aufschnitt, Käse
  return SLICE_RULES.find(([rx]) => rx.test(n)) || null;
}
function sliceInfo(food) {
  const id = food.ref || food.id;
  if (id && state.slices[id]) return { g: state.slices[id], src: 'own' };
  const live = id && String(id).startsWith('off:') ? state.offCache[String(id).slice(4)] : null;
  const og = (live && live.sliceG) || food.sliceG;
  if (og) return { g: og, src: 'off' };
  const r = sliceRule(food);
  return r ? { g: r[1], src: 'larn', kind: r[2] } : null;
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
  const sl = sliceInfo(food);
  if (sl && !out.some((o) => o.grams === sl.g)) out.unshift({ grams: sl.g, label: '1 Scheibe', hint: sl.src === 'own' ? 'aus deiner Packung berechnet' : sl.src === 'off' ? 'laut Open Food Facts' : `Richtwert ${sl.kind} (LARN-Haushaltsmaß)`, larn: sl.src === 'larn', slice: true });
  return out;
}
// Lebensmittel, deren Portion sich direkt auf den gegarten Zustand bezieht (z. B. Hülsenfrüchte gekocht)
function larnPortionDirect(food) {
  return /^H|^G/.test(food.id[4]) && /Hülsen|Kichererbse|Erbse reif|Bohne reif|Linse|Konserve/.test(food.n) && /gekocht|Konserve/.test(food.n);
}
const r1n = (n) => Math.round((n || 0) * 10) / 10;

/* ---------- Mengen-Dialog ---------- */
// Hinweis unter „Abweichende Uhrzeit“: welche Uhrzeit sonst gilt (die der Mahlzeit, siehe Timeline)
const MEAL_GEN = { breakfast: 'des Frühstücks', lunch: 'des Mittagessens', dinner: 'des Abendessens', snack: 'der Snacks' };
// Uhrzeit-Feld für Essen: immer sichtbar, mit der geltenden Zeit vorbelegt. Nur wenn der Nutzer sie ändert, wird sie am Eintrag gespeichert (e.t); leeren = automatisch.
function effTimeHM(entry, meal) {
  const h = entry ? tlEntryTime(currentDate, Object.assign({}, entry, { meal })) : tlMealTime(currentDate, meal).h;
  return tlHM(h);
}
function foodTimeField(id, entry, meal) {
  return `<label for="${id}">Uhrzeit</label><input id="${id}" type="time" value="${effTimeHM(entry, meal)}">
    <p class="small muted" id="${id}Hint" style="margin-top:4px">${entry && entry.t ? 'Eigene Uhrzeit. Leeren = Uhrzeit der Mahlzeit.' : 'Gilt automatisch. Ändern, um eine eigene Uhrzeit zu setzen.'}</p>`;
}
// liefert { touched, value } – value '' = geleert
function bindFoodTime(id, mealId, entry) {
  const t = $('#' + id), m = $('#' + mealId); if (!t) return () => ({ touched: false, value: '' });
  let touched = false;
  t.addEventListener('input', () => { touched = true; });
  if (m) m.addEventListener('change', () => { if (!touched && !(entry && entry.t)) t.value = effTimeHM(entry, m.value); });
  return () => ({ touched, value: t.value });
}
/* Mengen-Lineal (2.0): ziehen verändert die Menge (8 px = 1 g/ml), dazu ±1/±10-Stufen */
function bindAmountRuler(g) {
  const svg = $('#ruler svg'), box = $('#ruler'); if (!svg) return;
  const PX = 8, W = 352;
  const draw = () => {
    const v = num(g.value) || 0; let out = '';
    const lo = Math.floor(v - W / 2 / PX) - 1, hi = Math.ceil(v + W / 2 / PX) + 1;
    for (let i = Math.max(0, lo); i <= hi; i++) {
      const x = W / 2 + (i - v) * PX; if (x < -2 || x > W + 2) continue;
      const big = i % 10 === 0, mid = i % 5 === 0;
      out += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${big ? 6 : mid ? 14 : 20}" y2="30" class="${big ? 'b' : ''}"></line>`;
      if (big) out += `<text x="${x.toFixed(1)}" y="43" text-anchor="middle">${i}</text>`;
    }
    svg.innerHTML = out;
  };
  const set = (v) => { g.value = r1(Math.max(0, Math.round(v * 10) / 10)); g.dispatchEvent(new Event('input')); };
  g.addEventListener('input', draw); draw();
  document.querySelectorAll('[data-step]').forEach((b) => b.onclick = () => { const d = +b.dataset.step; const v = num(g.value) || 0; set(v + d); });
  box.onpointerdown = (ev) => {
    ev.preventDefault(); box.setPointerCapture(ev.pointerId);
    const x0 = ev.clientX, v0 = num(g.value) || 0, scale = W / box.getBoundingClientRect().width;
    box.onpointermove = (e2) => set(Math.round(v0 - (e2.clientX - x0) * scale / PX));
    box.onpointerup = box.onpointercancel = () => { box.onpointermove = box.onpointerup = box.onpointercancel = null; };
  };
}
function openAmount(food, opts = {}) {
  if (pantryMode && !opts.edit) { pantryAdd(food); return; } // Vormerken: nur speichern
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
  // Scheiben-Rechner nur, wo Scheiben üblich sind (Aufschnitt, Käse, Brot) oder schon ein Scheibengewicht bekannt ist
  const slicey = U === 'g' && (!!sliceInfo(food) || /Brot|Toast|Käse|Wurst|Schinken|Salami|Aufschnitt|Scheibe/i.test(food.n || ''));
  // Koffein: neuer Eintrag → gemerkter Wert, Wert am Lebensmittel oder Vorschlag; Bearbeiten → Wert des Eintrags
  const cafOn = !!state.caffeine.enabled;
  const cafInfo = !cafOn ? null : edit ? (food.cf > 0 ? { v: food.cf, src: 'entry' } : null) : caffPer100(food);
  const cafShown = !!(cafInfo && cafInfo.v > 0);
  const wDef = edit ? food.water : (state.waterFoods[foodId] != null ? state.waterFoods[foodId] : cafShown);
  const cafHint = (ci) => ci.src === 'guess'
    ? `<strong>Vorschlag:</strong> Für dieses Getränk ist kein Koffeinwert hinterlegt. Eingesetzt ist der Richtwert für ${esc(ci.label)}. Bitte mit der Packung abgleichen und ggf. ändern (leer oder 0 = kein Koffein).`
    : CAFF_SRC_HINT[ci.src];
  const cafField = (ci) => `<label for="eCaf">Koffein (mg pro 100 ${U})</label>
    <div class="row caf-in"><input id="eCaf" inputmode="decimal" value="${ci.v > 0 ? r1(ci.v) : ''}"><span class="small muted" id="eCafMg"></span></div>
    <p class="small muted" id="eCafHint" style="margin-top:4px">${cafHint(ci)} Der Koffein-Tracker trägt die Menge automatisch mit ein.</p>`;
  openSheet(`
    ${sheetHead('back', esc(food.n), !(edit || opts.direct), `<button class="btn ghost star-btn" id="favBtn" aria-label="Favorit">${fav ? '★' : '☆'}</button>`)}
    ${food.brand ? `<p class="muted">${esc(food.brand)}</p>` : ''}
    <p class="small muted">Pro 100 ${U}: ${fmt(food.k)} kcal · E ${r1(food.p)} g · KH ${r1(food.c)} g · F ${r1(food.f)} g · Ballastst. ${r1(food.fi)} g · Zucker ${r1(food.su)} g</p>
    <div class="amt"><label for="grams" class="amt-l">Menge in ${U === 'ml' ? 'Millilitern' : 'Gramm'}</label>
      <div class="amt-big"><input id="grams" type="text" inputmode="decimal" value="${r1(defGrams)}" aria-label="Menge in ${U}"><span>${U}</span></div>
      <div class="ruler" id="ruler" aria-hidden="true"><svg viewBox="0 0 352 46" preserveAspectRatio="none"></svg><i class="ruler-p"></i></div>
      <div class="amt-step">${[-10, -1, 1, 10].map((d) => `<button type="button" class="btn secondary" data-step="${d}">${d > 0 ? '+' : '−'}${Math.abs(d)}</button>`).join('')}</div></div>
    <div class="chips portions" id="portions">${portionOptions(food).map((o, i) => `<button type="button" class="chip" data-pi="${i}" title="${esc(o.hint)}">${esc(o.label)} · ${r1(o.grams)} ${U}</button>`).join('')}${recentHit && recentHit.lastGrams && !edit ? `<button type="button" class="chip" data-last="${recentHit.lastGrams}">Zuletzt · ${r1(recentHit.lastGrams)} ${U}</button>` : ''}</div>
    ${slicey ? `<button type="button" class="linkbtn" id="slCalcBtn">Scheibengewicht aus Packung berechnen</button>
    <div class="slcalc" id="slCalc" hidden>
      <div class="row">
        <div><label for="slPack">Packung (g)</label><input id="slPack" inputmode="decimal" value="${(state.offCache[String(foodId).slice(4)] || {}).pq || food.pq || ''}" placeholder="z. B. 200"></div>
        <div><label for="slN">Scheiben</label><input id="slN" inputmode="numeric" placeholder="z. B. 10"></div>
      </div>
      <div class="spread" style="margin-top:8px"><span class="small muted" id="slRes">= ? g pro Scheibe</span><button type="button" class="btn secondary" id="slSave">Übernehmen</button></div>
    </div>` : ''}
    ${portionOptions(food).some((o) => o.larn) ? '<p class="small muted portion-note">Mehrfach tippen = mehrere Portionen. Standardportionen: SINU, LARN 2024 (Rohgewicht, essbarer Anteil).</p>' : ''}
    <div class="nutri" id="nutri"></div>
    <label for="meal">Mahlzeit</label>
    <select id="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === mealSel ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
    ${U === 'ml' && state.water.enabled ? `<label class="switch" style="margin-top:12px"><input type="checkbox" id="eWater" ${wDef ? 'checked' : ''}> Zur Flüssigkeit (Wasserzähler) zählen</label>` : ''}
    ${cafOn ? `<div id="cafBox">${cafShown ? cafField(cafInfo) : '<button type="button" class="linkbtn" id="cafShow">Enthält Koffein? Wert eintragen</button>'}</div>` : ''}
    ${foodTimeField('eTime', edit ? food : null, mealSel)}
    <div style="height:14px"></div>
    <button class="btn block" id="save">${edit ? 'Speichern' : 'Hinzufügen'}</button>
    ${edit ? '<div style="height:10px"></div><button class="btn danger block" id="del">Eintrag löschen</button>' : ''}
    ${!edit && ownFood ? `<div style="height:10px"></div><button class="btn ghost block" id="editOwn">${ownFood.src === 'recipe' ? 'Rezept bearbeiten' : 'Lebensmittel bearbeiten'}</button>` : ''}`);

  const g = $('#grams');
  const upd = () => {
    const x = per(food, num(g.value) || 0);
    const g1 = (v) => (v >= 10 ? r0(v) : r1(v)); // ab 10 g ganze Gramm, darunter eine Nachkommastelle
    $('#nutri').innerHTML = `<div><strong>${fmt(x.k)}</strong><span>kcal</span></div><div><strong>${g1(x.p)}</strong><span>Eiweiß g</span></div>
      <div><strong>${g1(x.c)}</strong><span>KH g</span></div><div><strong>${g1(x.f)}</strong><span>Fett g</span></div>
      <div><strong>${g1(x.fi)}</strong><span>Ballastst. g</span></div><div><strong>${g1(x.su)}</strong><span>Zucker g</span></div>`;
  };
  g.oninput = upd; upd();
  bindAmountRuler(g);
  const cafMg = () => { const el = $('#eCafMg'); if (!el) return; const v = num($('#eCaf').value), q = num(g.value) || 0; el.textContent = v > 0 && q > 0 ? `= ${r0(v * q / 100)} mg Koffein` : ''; };
  const cafBind = () => { const el = $('#eCaf'); if (el) el.oninput = cafMg; cafMg(); };
  g.addEventListener('input', cafMg); cafBind();
  const cs = $('#cafShow');
  if (cs) cs.onclick = () => { $('#cafBox').innerHTML = cafField({ src: 'manual', v: 0 }); cafBind(); $('#eCaf').focus(); };
  const pOpts = portionOptions(food);
  const slRes = () => { const p = num($('#slPack').value), n = num($('#slN').value); const v = p && n ? Math.round(p / n * 10) / 10 : null; $('#slRes').textContent = v ? `= ${r1(v)} g pro Scheibe` : '= ? g pro Scheibe'; return v; };
  if (slicey) {
  $('#slCalcBtn').onclick = () => { const c = $('#slCalc'); c.hidden = !c.hidden; if (!c.hidden) $('#slN').focus(); };
  $('#slPack').oninput = slRes; $('#slN').oninput = slRes;
  $('#slSave').onclick = () => {
    const v = slRes(); if (!v || v > 500) { toast('Bitte Packungsgewicht und Anzahl Scheiben eingeben.'); return; }
    state.slices[foodId] = v; save(); toast(`1 Scheibe = ${r1(v)} g gespeichert`);
    const cur = $('#grams').value; openAmount(food, opts); $('#grams').value = cur; $('#grams').dispatchEvent(new Event('input'));
  };
  }
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
  const back = () => { if (edit || opts.direct) closeSheet(); else openAdd(addMeal); };
  $('#back').onclick = back;
  const eTime = bindFoodTime('eTime', 'meal', edit ? food : null);
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
    const cfEl = $('#eCaf'); const cf = cfEl ? (num(cfEl.value) || 0) : null;
    if (cf != null && (cf < 0 || cf > 1000)) { toast('Bitte Koffein zwischen 0 und 1.000 mg pro 100 eingeben.'); return; }
    if (cf != null) { // gemerkter Wert je Lebensmittel; entspricht er dem Wert am Lebensmittel, braucht es keinen eigenen
      const lv = liveFood(food); if (lv && lv.cf != null && Math.abs(lv.cf - cf) < 0.05) delete state.cafFoods[foodId]; else state.cafFoods[foodId] = cf;
    }
    const setCf = (x) => { if (cf != null) { if (cf > 0) x.cf = cf; else delete x.cf; } };
    if (edit) {
      const e = (state.days[currentDate] || []).find((x) => x.id === food.id);
      if (e) { e.grams = grams; e.meal = meal; const wv = $('#eWater'); if (wv) { if (wv.checked) e.water = true; else delete e.water; state.waterFoods[foodId] = wv.checked; } const et = eTime(); if (et.touched) { if (et.value) e.t = et.value; else delete e.t; } setCf(e); caffSyncFood(currentDate, e); }
    } else {
      const entry = Object.assign({ id: uid(), meal, grams, ref: foodId, src: food.src, n: food.n, brand: food.brand || '', liq: isLiq(food) }, nutrientsOf(food));
      const et = eTime(); if (et.touched && et.value) entry.t = et.value;
      const wv = $('#eWater'); if (wv) { if (wv.checked) entry.water = true; state.waterFoods[foodId] = wv.checked; }
      setCf(entry);
      (state.days[currentDate] = state.days[currentDate] || []).push(entry);
      caffSyncFood(currentDate, entry); justAdded.add(entry.id);
      state.recent = [Object.assign(foodSnap(food), { lastGrams: grams })].concat(state.recent.filter((x) => x.id !== foodId)).slice(0, 60);
    }
    save();
    toast(edit ? 'Gespeichert' : 'Hinzugefügt');
    back();
  };
  const del = $('#del');
  if (del) del.onclick = () => {
    state.days[currentDate] = (state.days[currentDate] || []).filter((x) => x.id !== food.id);
    caffSyncFood(currentDate, { id: food.id }); // verknüpften Koffein-Eintrag mit entfernen
    save(); toast('Gelöscht'); closeSheet();
  };
}

/* ---------- Schnelleintrag ---------- */
function openQuick(meal, entry) {
  sheetMode = 'quick';
  const e = entry || {};
  openSheet(`
    ${sheetHead('back', 'Schnelleintrag', !entry)}
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
    ${foodTimeField('qT', entry || null, e.meal || meal)}
    <div style="height:14px"></div>
    <button class="btn block" id="qSave">${entry ? 'Speichern' : 'Hinzufügen'}</button>
    ${entry ? '<div style="height:10px"></div><button class="btn danger block" id="qDel">Eintrag löschen</button>' : ''}`);
  const back = () => { if (entry) closeSheet(); else openAdd(addMeal); };
  $('#back').onclick = back;
  const qTime = bindFoodTime('qT', 'qMeal', entry || null);
  $('#qSave').onclick = () => {
    const k = num($('#qK').value);
    if (k == null || k < 0) { toast('Bitte Kalorien eingeben.'); return; }
    // Schnelleinträge werden als „100 g“ mit Absolutwerten gespeichert, damit die Rechnung einheitlich bleibt.
    const vals = { quick: true, grams: 100, n: $('#qN').value.trim() || 'Schnelleintrag', k, p: num($('#qP').value) || 0, c: num($('#qC').value) || 0, f: num($('#qF').value) || 0, fi: 0, su: 0, meal: $('#qMeal').value, src: 'quick' };
    const qt = qTime();
    if (qt.touched) { if (qt.value) vals.t = qt.value; else if (entry) { const ex = (state.days[currentDate] || []).find((x) => x.id === entry.id); if (ex) delete ex.t; } }
    if (entry) Object.assign((state.days[currentDate] || []).find((x) => x.id === entry.id) || {}, vals);
    else { const ne = Object.assign({ id: uid() }, vals); (state.days[currentDate] = state.days[currentDate] || []).push(ne); justAdded.add(ne.id); }
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
/* Kamera: läuft nur, solange der Barcode-Reiter offen ist. Aus beim Scan-Treffer (weiter zum Mengendialog), beim Wechsel
   des Reiters, beim Schließen und beim Verlassen der App (iOS fragt in Home-Bildschirm-Apps ggf. erneut nach der
   Erlaubnis). Außerdem: hohe Auflösung, Hauptkamera statt Ultraweitwinkel (schlechter Nahfokus),
   kontinuierlicher Autofokus, falls vom Gerät angeboten. */
let camStream = null, camTimer = null;
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
  }
  camRelease(); // Kamera nach dem Scannen bzw. Schließen sofort ganz ausschalten
}
// App verlassen → Kamera aus; zurück in die App mit offenem Barcode-Reiter → Scanner wieder starten
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { stopScanner(); return; }
  if (sheetMode === 'add' && addTab === 'scan' && !scanner && document.getElementById('video')) startScanner();
});

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
      fi: num(nm.fiber_100g) || 0, su: num(nm.sugars_100g) || 0, fs: num(nm['added-sugars_100g']), ...offDiet(p),
      serving: num(p.serving_quantity) || null,
      pq: num(p.product_quantity) || null,
      sliceG: offSliceG(p.serving_size),
      liq: /\d\s*(ml|cl|l)\b/i.test(p.quantity || ''),
    };
    const cafG = num(nm.caffeine_100g); // OFF speichert Koffein in g pro 100 g/ml
    if (cafG != null && cafG >= 0 && cafG <= 5) food.cf = Math.round(cafG * 10000) / 10;
    state.offCache[code] = food; levelEvent(state, 'scan', isoDate(new Date())); save();
    openAmount(food);
  } catch (e) {
    out.innerHTML = '<p class="muted">Keine Verbindung zu Open Food Facts. Bitte später erneut versuchen.</p>';
  }
}

/* ---------- Neu: Schnelleintrag, Lebensmittel, Rezept ---------- */
const RECIPES_ON = false; // Rezepte vorerst ausgeblendet (später Import aus anderer App); vorhandene Rezepte bleiben nutzbar
function renderNew() {
  $('#addBody').innerHTML = `
    <ul class="list choice">
      ${pantryMode ? '' : '<li id="newQuick"><div><strong>Schnelleintrag</strong>'}${pantryMode ? '' : `<div class="meta">Nur kcal eintragen, z. B. im Restaurant</div></div><div class="meta">›</div></li>`}
      <li id="newFood"><div><strong>Eigenes Lebensmittel</strong><div class="meta">Nährwerte pro 100 g, z. B. von der Verpackung</div></div><div class="meta">›</div></li>
      ${RECIPES_ON ? `<li id="newRecipe"><div><strong>Rezept</strong><div class="meta">Aus mehreren Zutaten zusammenstellen</div></div><div class="meta">›</div></li>` : ''}
    </ul>`;
  if ($('#newQuick')) $('#newQuick').onclick = () => openQuick(addMeal);
  $('#newFood').onclick = () => openFoodForm();
  if ($('#newRecipe')) $('#newRecipe').onclick = () => openRecipe();
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
      <div><label for="cP">Eiweiß g</label><input id="cP" inputmode="decimal" value="${(e.miss || []).includes('cP') ? '' : v(e.p)}"></div>
    </div>
    <div class="row">
      <div><label for="cC">KH g</label><input id="cC" inputmode="decimal" value="${(e.miss || []).includes('cC') ? '' : v(e.c)}"></div>
      <div><label for="cF">Fett g</label><input id="cF" inputmode="decimal" value="${(e.miss || []).includes('cF') ? '' : v(e.f)}"></div>
    </div>
    <div class="row">
      <div><label for="cFi">Ballaststoffe g</label><input id="cFi" inputmode="decimal" value="${(e.miss || []).includes('cFi') ? '' : v(e.fi)}"></div>
      <div><label for="cSu">davon Zucker g</label><input id="cSu" inputmode="decimal" value="${(e.miss || []).includes('cSu') ? '' : v(e.su)}"></div>
    </div>
    <label for="cFs">davon freier/zugesetzter Zucker g (optional)</label><input id="cFs" inputmode="decimal" value="${e.fs != null ? v(e.fs) : ''}" placeholder="leer = gesamter Zucker zählt als frei">
    <label class="chip" style="margin-top:10px"><input type="checkbox" id="cLiq" ${e.liq ? 'checked' : ''}> Flüssigkeit (Mengen in ml, Annahme 1 ml ≈ 1 g)</label>
    <label for="cCf">Koffein mg pro 100 g/ml (optional)</label><input id="cCf" inputmode="decimal" value="${state.cafFoods[e.id] != null ? state.cafFoods[e.id] : e.cf != null ? e.cf : ''}" placeholder="z. B. 32 bei Energy Drinks">
    <div class="row">
      <div><label for="cServ">Portion g/ml (optional)</label><input id="cServ" inputmode="decimal" value="${e.serving || ''}"></div>
      <div><label for="cBarcode">Barcode (optional)</label><input id="cBarcode" inputmode="numeric" value="${esc(e.barcode || '')}"></div>
    </div>
    <label for="cDiet">Ernährungsform (optional)</label>
    <select id="cDiet">
      <option value="" ${e.d == null ? 'selected' : ''}>Unbekannt</option>
      <option value="2" ${e.d === 2 ? 'selected' : ''}>Vegan</option>
      <option value="1" ${e.d === 1 ? 'selected' : ''}>Vegetarisch</option>
      <option value="0" ${e.d === 0 ? 'selected' : ''}>Mit Fleisch oder Fisch</option>
    </select>
    <label>Enthält</label>
    <div class="chips" id="cAll">${ALLERGENS.map(([k, l]) => `<label class="chip"><input type="checkbox" value="${k}" ${(e.a || []).includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
    <div style="height:14px"></div>
    <button class="btn block" id="cSave">${isEdit ? 'Speichern' : 'Speichern & auswählen'}</button>
    ${isEdit ? '<div style="height:10px"></div><button class="btn danger block" id="cDel">Lebensmittel löschen</button>' : ''}`);
  $('#back').onclick = () => { if (isEdit) openAmount(e); else openAdd(addMeal); };
  $('#cSave').onclick = () => {
    const n = $('#cName').value.trim(); const k = num($('#cK').value);
    if (!n || k == null) { toast('Name und kcal sind Pflicht.'); return; }
    const miss = ['cP', 'cC', 'cF', 'cFi', 'cSu'].filter((id) => $('#' + id).value.trim() === ''); // für Level-XP: leere Pflichtwerte
    const food = {
      src: 'custom', id: e.id || 'custom:' + uid(), n, brand: $('#cBrand').value.trim(), k,
      p: num($('#cP').value) || 0, c: num($('#cC').value) || 0, f: num($('#cF').value) || 0,
      fi: num($('#cFi').value) || 0, su: num($('#cSu').value) || 0, fs: num($('#cFs').value),
      serving: num($('#cServ').value) || null, barcode: ($('#cBarcode').value || '').replace(/\D/g, '') || null,
      liq: $('#cLiq').checked,
      d: $('#cDiet').value === '' ? null : +$('#cDiet').value,
      a: [...document.querySelectorAll('#cAll input:checked')].map((x) => x.value),
    };
    if (miss.length) food.miss = miss;
    const cfv = num($('#cCf').value);
    if (cfv != null && (cfv < 0 || cfv > 1000)) { toast('Bitte Koffein zwischen 0 und 1.000 mg pro 100 eingeben.'); return; }
    if (cfv != null) food.cf = cfv;
    delete state.cafFoods[food.id]; // Wert im Lebensmittel gilt
    const today = isoDate(new Date());
    if (!isEdit && !miss.length) levelEvent(state, 'own', today);
    else if (isEdit && miss.length < (e.miss || []).length) levelEvent(state, 'fill', today);
    saveOwnFood(food);
    if (isEdit) { toast('Gespeichert'); openAmount(food); } else openAmount(food);
  };
  const cd = $('#cDel');
  if (cd) cd.onclick = () => deleteOwnFood(e);
}

function saveOwnFood(food) {
  const i = state.custom.findIndex((x) => x.id === food.id);
  if (i >= 0) state.custom[i] = food; else state.custom.push(food);
  // Favoriten/Zuletzt/Vorgemerkt-Kopien aktualisieren (bereits eingetragene Tage bleiben unverändert)
  state.favs = state.favs.map((x) => (x.id === food.id ? foodSnap(food) : x));
  state.pantry = (state.pantry || []).map((x) => (x.id === food.id ? Object.assign(foodSnap(food), { added: x.added }) : x));
  state.recent = state.recent.map((x) => (x.id === food.id ? Object.assign(foodSnap(food), { lastGrams: x.lastGrams }) : x));
  save();
}
function deleteOwnFood(food) {
  if (!confirm(`„${food.n}“ löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)) return;
  removeOwnFood(food.id); toast('Gelöscht'); addTab = 'mine';
  if (sheetMode === 'add' && $('#mineList')) drawMine(); else openAdd(addMeal);
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
  const tot = { k: 0, p: 0, c: 0, f: 0, fi: 0, su: 0, fs: 0 };
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
    ${d.items.length ? `<ul class="list ingr">${d.items.map((x, i) => `<li><div class="grow">${esc(x.food.n)}<div class="meta">${fmt(per(x.food, x.grams || 0).k)} kcal</div></div>
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
    $('#rSum').innerHTML = `<div class="spread"><span class="muted">Gesamt</span><strong>${fmt(c.tot.k)} kcal · ${r0(c.weight)} g</strong></div>
      <div class="spread"><span class="muted">Pro 100 g</span><strong>${fmt(c.per100.k)} kcal</strong></div>
      ${portion ? `<div class="spread"><span class="muted">Pro Portion (${r0(portion)} g)</span><strong>${fmt(c.tot.k / draft.portions)} kcal</strong></div>` : ''}`;
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
let histMonth = null;   // 'YYYY-MM'; null = aktueller Monat
let histSel = null;     // null = ganzer Monat, sonst {a, b} (ISO, a <= b)
let histPick = false;   // true: nächster Kalender-Tipp setzt das Ende
const HIST_MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
/* Richtung des Ziels: Gewichtsziel (aktiv) > Ernährungsziel des Tages (Muskelaufbau = zunehmen, Fettabbau = abnehmen) > halten */
function goalDir(iso) {
  const o = state.wgoal, w = state.profile.weight;
  if (o && o.on && o.target && w) return o.target > w ? 'gain' : o.target < w ? 'lose' : 'keep';
  const pr = goalsFor(iso).preset;
  return pr === 'muscle' ? 'gain' : pr === 'cut' ? 'lose' : 'keep';
}
const KEEP_TOL = 0.1; // „Halten“: ±10 % um das Kalorienziel gelten als erreicht
/* Seit 2.0 für alle Ziele gleich: grün nur im Bereich ±10 % ums Tagesziel, darüber gelb, deutlich darunter neutral grau.
   Vorher war beim Abnehmen jeder Tag unter dem Ziel grün – das hätte auch sehr wenig Essen belohnt (Projektregel). */
// 'ok' (grün) · 'over' (gelb) · 'low' (grau) · 'open' (heute, noch unter dem Bereich) · null (kein Ziel)
function dayGoalState(iso, k, goal) {
  if (!goal) return null;
  if (Math.abs(k - goal) <= goal * KEEP_TOL) return 'ok';
  if (k > goal) return 'over';
  return iso === isoDate(new Date()) ? 'open' : 'low';
}
INFO.hcal = () => {
  const dir = goalDir(isoDate(new Date()));
  const now = { lose: 'Abnehmen', gain: 'Zunehmen', keep: 'Gewicht halten' }[dir];
  const why = state.wgoal && state.wgoal.on && state.wgoal.target && state.profile.weight ? 'aus deinem Gewichtsziel' : 'aus dem Ernährungsziel des Tages (Muskelaufbau = zunehmen, Fettabbau = abnehmen, sonst halten)';
  return { body: `<p>Die Farbe zeigt, wie nah ein Tag am Kalorienziel dieses Tages lag – im Kalender, bei den Balken und in der Übersicht. Das Ziel selbst enthält schon dein Vorhaben (aktuell: <strong>${now}</strong>, abgeleitet ${why}).</p><p>Deutlich weniger zu essen ist <strong>kein</strong> Erfolg und wird deshalb nicht grün, sondern neutral angezeigt.</p>`,
    pts: [['<span style="color:var(--good)">●</span> Grün – im Zielbereich', 'höchstens ±10 % neben dem Kalorienziel'],
      ['<span style="color:var(--c)">●</span> Gelb – darüber', 'mehr als 10 % über dem Ziel'],
      ['<span style="color:var(--muted)">●</span> Grau – deutlich darunter', 'mehr als 10 % unter dem Ziel; keine Wertung'],
      ['<span style="color:var(--accent)">●</span> Cyan – heute, läuft noch', 'Der Tag ist noch nicht vorbei'],
      ['◌ Gestrichelt – nicht getrackt', 'Kein Eintrag an diesem Tag']] };
};
// Serien beim Wasser: aufeinanderfolgende Tage mit erreichtem Ziel (heute zählt nur, wenn schon erreicht)
function waterStreaks(today) {
  const keys = Object.keys(state.water.log).concat(Object.keys(state.days), Object.keys(state.caffeine.log)).filter((d) => d <= today).sort();
  if (!keys.length) return { cur: 0, best: 0 };
  let best = 0, run = 0, cur = 0;
  for (let d = keys[0]; d <= today; d = addDays(d, 1)) {
    const ok = waterOf(d) >= waterGoalFor(d);
    if (ok) { run++; best = Math.max(best, run); } else if (d !== today) run = 0;
    if (d === today) cur = run;
  }
  return { cur, best };
}
function waterDrop(frac, i, isToday, none) {
  const p = Math.max(0, Math.min(1, frac)), top = (3 + (1 - p) * 19).toFixed(1);
  const path = 'M12 2.5s7 7 7 11.8A7 7 0 0 1 5 14.3C5 9.5 12 2.5 12 2.5z';
  return `<svg class="wd-drop${p >= 1 ? ' full' : ''}${none ? ' none' : ''}${isToday ? ' today' : ''}" viewBox="0 0 24 24">${none ? '' : `<clipPath id="wdc${i}"><rect x="0" y="${top}" width="24" height="24"/></clipPath><path class="f" d="${path}" clip-path="url(#wdc${i})"/>`}<path class="o" d="${path}"/></svg>`;
}
INFO.wStat = { body: '<p>Jeder Tropfen ist ein Tag. Er ist so weit gefüllt, wie viel vom Wasserziel dieses Tages getrunken wurde; ganz gefüllt und kräftig = Ziel erreicht. Jeder Tag wird mit dem Ziel bewertet, das damals galt.</p>',
  pts: [['Ø pro Tag', 'nur Tage mit Wasser; heute zählt erst, wenn nur heute gewählt ist'], ['Ziel erreicht', 'Tage mit erreichtem Ziel / Tage mit Wasser im Zeitraum'], ['Serie', 'Tage in Folge mit erreichtem Ziel bis heute; „beste“ = längste Serie bisher'], ['Gestrichelt', 'heute (läuft noch) bzw. leerer Tropfen = kein Wasser eingetragen']] };
let histPage = null; // null = Übersicht (Kacheln); sonst Detailseite: cal, weight, energy, water, caf, habit, micro, year
const HIST_PAGES = { cal: ['Kalorien', true], weight: ['Gewicht', false], energy: ['Energiebedarf', false], water: ['Wasser', true], caf: ['Koffein', true], habit: ['Gewohnheit', false], micro: ['Mikronährstoffe', true] };
function renderHistory() {
  if (!histPage) { renderAnalyticsOverview(); return; }
  if (histPage === 'year') { renderYear(); return; }
  const today = isoDate(new Date());
  const curMonth = today.slice(0, 7);
  if (!histMonth) histMonth = curMonth;
  const [Y, M] = histMonth.split('-').map(Number);
  const nDays = new Date(Y, M, 0).getDate();
  const mdays = [];
  for (let i = 1; i <= nDays; i++) { const d = `${histMonth}-${String(i).padStart(2, '0')}`; mdays.push({ d, t: dayTotals(d), n: (state.days[d] || []).length, goal: goalsFor(d).goal, fut: d > today }); }
  const ia = histSel ? Math.max(0, mdays.findIndex((x) => x.d === histSel.a)) : 0;
  const ib = histSel ? Math.max(ia, mdays.findIndex((x) => x.d === histSel.b)) : nDays - 1;
  const inSel = (i) => i >= ia && i <= ib;
  const sel = mdays.slice(ia, ib + 1).filter((x) => !x.fut);
  // Heute ist noch nicht vorbei: in Durchschnitten nur, wenn ausschließlich heute ausgewählt ist
  const onlyToday = sel.length === 1 && sel[0].d === today;
  const skipToday = !onlyToday && sel.some((x) => x.d === today);
  const done = sel.filter((x) => onlyToday || x.d !== today);
  const tracked = done.filter((x) => x.n > 0);
  const avg = (key) => (tracked.length ? tracked.reduce((s, x) => s + x.t[key], 0) / tracked.length : 0);
  const withGoal = tracked.filter((x) => x.goal);
  const avgDiff = withGoal.length ? withGoal.reduce((s, x) => s + (x.t.k - x.goal), 0) / withGoal.length : null;
  const dl = (iso) => { const dt = new Date(iso + 'T12:00:00'); return `${dt.getDate()}.${dt.getMonth() + 1}.`; };
  const selLabel = !histSel || (ia === 0 && ib === nDays - 1) ? `${HIST_MON[M - 1]} ${Y}` : ia === ib ? dl(mdays[ia].d) : `${dl(mdays[ia].d)}–${dl(mdays[ib].d)}`;
  const endIdx = histMonth === curMonth ? mdays.findIndex((x) => x.d === today) : nDays - 1;

  // 1) Kalender mit Zielerreichung
  const off = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
  let cells = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => `<div class="hc-w">${w}</div>`).join('') + '<div></div>'.repeat(off);
  mdays.forEach((x, i) => {
    const has = x.n > 0;
    const frac = has ? (x.goal ? Math.min(x.t.k / x.goal, 1) : 1) : 0;
    const st = has ? dayGoalState(x.d, x.t.k, x.goal) : null;
    const col = st === 'ok' ? 'var(--good)' : st === 'over' ? 'var(--c)' : st === 'low' ? 'var(--muted)' : 'var(--accent)';
    const ring = has ? `<span class="hc-ring" style="background:conic-gradient(${col} ${Math.round(frac * 360)}deg, rgba(var(--fg), 0.08) 0)"></span><span class="hc-in"></span>` : '<span class="hc-ring none"></span>';
    cells += `<button class="hc-d ${histSel && inSel(i) ? 'sel' : ''} ${x.fut ? 'fut' : ''} ${x.d === today ? 'today' : ''}" data-i="${i}" ${x.fut ? 'disabled' : ''} aria-label="${x.d}${has ? ', ' + r0(x.t.k) + ' kcal' : ''}">${ring}<span class="hc-n ${has ? '' : 'dim'}">${i + 1}</span></button>`;
  });
  const calCard = `<div class="card hc"><div class="hc-grid">${cells}</div>
    <div class="hc-leg">${infoBtn('hcal')}</div></div>`;

  // 2) Kalorien pro Tag mit Auswahlfenster
  const max = Math.max(...mdays.map((x) => Math.max(x.goal || 0, x.t.k)), 1) * 1.1;
  const W = 340, H = 170, pad = 22, bw = (W - pad) / nDays;
  const y = (v) => H - 18 - (v / max) * (H - 30);
  const bars = mdays.map((x, i) => {
    const h = (H - 18) - y(x.t.k);
    const lbl = (i % 5 === 0 || i === nDays - 1) ? `<text x="${pad + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${i + 1}</text>` : '';
    const st = x.n > 0 ? dayGoalState(x.d, x.t.k, x.goal) : null; // gleiche Farbe wie der Kalender-Ring
    return `<rect class="b ${st || ''}" style="opacity:${!histSel || inSel(i) ? 1 : 0.3}" x="${pad + i * bw + bw * 0.15}" y="${y(x.t.k)}" width="${bw * 0.7}" height="${Math.max(0, h)}" rx="2"></rect>${lbl}`;
  }).join('');
  let path = '';
  mdays.forEach((x, i) => {
    if (!x.goal) return;
    const x0 = pad + i * bw, x1 = x0 + bw, yy = y(x.goal).toFixed(1);
    path += (i > 0 && mdays[i - 1].goal ? `L ${x0.toFixed(1)} ${yy} ` : `M ${x0.toFixed(1)} ${yy} `) + `L ${x1.toFixed(1)} ${yy} `;
  });
  const fg = mdays.find((x) => x.goal);
  const goalLine = path ? `<path class="goal" d="${path}" fill="none"></path>${fg ? `<text x="0" y="${y(fg.goal) + 3}">${fmt(fg.goal)}</text>` : ''}` : '';
  const pct = (v) => (v / W * 100).toFixed(2);
  const brush = `<div class="hb" id="hBrush" style="left:${pct(pad + ia * bw)}%;width:${pct((ib - ia + 1) * bw)}%"><span class="hb-h l" data-h="l"></span><span class="hb-h r" data-h="r"></span></div>`;
  const chips = [['Monat', null]];
  const mk = (n) => ({ a: mdays[Math.max(0, endIdx - n + 1)].d, b: mdays[endIdx].d });
  chips.push(['14 Tage', mk(14)], ['7 Tage', mk(7)]);
  if (histMonth === curMonth) chips.push(['Heute', { a: today, b: today }]);
  const same = (s) => (s === null ? histSel === null : histSel && histSel.a === s.a && histSel.b === s.b);
  const chipHtml = chips.map(([t, s], i) => `<button class="hch ${same(s) ? 'active' : ''}" data-ch="${i}">${t}</button>`).join('');
  const barCard = `<div class="card chart"><div class="spread"><h2 class="ct">Kalorien pro Tag</h2><span class="small muted">${selLabel}</span></div>
    <div class="hch-row">${chipHtml}</div>
    <div class="hb-wrap" id="hWrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kalorien pro Tag">${goalLine}${bars}</svg>${brush}</div>
</div>`;

  // 3) Ø Makros im Zeitraum
  const ep = avg('p') * 4, ec = avg('c') * 4, ef = avg('f') * 9, es = ep + ec + ef || 1;
  const sh = (v) => Math.round(v / es * 100);
  const macroCard = `<div class="card"><div class="spread"><h2 class="ct">Ø Makros</h2><span class="small muted">${tracked.length ? 'Anteil an der Energie' : 'keine Daten'}</span></div>
    <div class="mbar"><span style="flex:${ep};background:var(--p)"></span><span style="flex:${ec};background:var(--c)"></span><span style="flex:${ef};background:var(--f)"></span></div>
    <div class="mlab"><span style="color:var(--p)">Eiweiß ${r0(avg('p'))} g · ${tracked.length ? sh(ep) : 0} %</span><span style="color:var(--c)">KH ${r0(avg('c'))} g · ${tracked.length ? sh(ec) : 0} %</span><span style="color:var(--f)">Fett ${r0(avg('f'))} g · ${tracked.length ? sh(ef) : 0} %</span></div></div>`;

  // 5) übrige Daten
  // 4) Wasser: Tropfen-Kalender (Füllung = Anteil am Ziel des jeweiligen Tages)
  let waterCard = '';
  if (state.water.enabled) {
    const wdone = done.map((x) => ({ d: x.d, ml: waterOf(x.d), g: waterGoalFor(x.d) })).filter((x) => x.ml > 0);
    const wAvg = wdone.length ? wdone.reduce((a, b) => a + b.ml, 0) / wdone.length : null;
    const wHit = wdone.filter((x) => x.ml >= x.g).length;
    const st = waterStreaks(today);
    let wc = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => `<div class="hc-w">${w}</div>`).join('') + '<div></div>'.repeat(off);
    mdays.forEach((x, i) => {
      const ml = x.fut ? 0 : waterOf(x.d), g = waterGoalFor(x.d);
      wc += `<div class="wd-d ${histSel && !inSel(i) ? 'dim' : ''}" aria-label="${x.d}${ml ? ', ' + litres(ml) + ' l von ' + litres(g) + ' l' : ''}">${x.fut ? '<span class="wd-dot"></span>' : waterDrop(ml / g, i, x.d === today, !ml)}<span class="hc-n">${i + 1}</span></div>`;
    });
    waterCard = `<div class="card wd"><div class="spread"><h2 class="ct"><svg class="wd-ic" viewBox="0 0 24 24"><path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/></svg>Wasser</h2><span class="small muted">${selLabel}</span></div>
      <div class="wd-stats"><div><b>${wAvg != null ? litres(wAvg) + ' l' : '–'}</b><span>Ø pro Tag${skipToday ? ' (ohne heute)' : ''}</span></div><div><b class="wv">${wHit} / ${wdone.length}</b><span>Ziel erreicht</span></div><div><b>${st.cur} ${st.cur === 1 ? 'Tag' : 'Tage'}</b><span>Serie · beste ${st.best}</span></div></div>
      <div class="wd-grid">${wc}</div><div class="hc-leg">${infoBtn('wStat')}</div></div>`;
  }
  const goalChanges = new Set(sel.map((x) => x.goal)).size > 1;
  const otherCard = `<div class="card">
    <div class="spread"><h2 class="ct">Weitere Werte</h2><span class="small muted">${selLabel}</span></div>
    <div class="spread" style="margin-top:8px"><span class="muted">Ø kcal</span><strong>${fmt(avg('k'))} kcal</strong></div>
    <div class="spread"><span class="muted">Getrackte Tage</span><strong>${tracked.length} / ${done.length}${skipToday ? ' <span class="muted small">(ohne heute)</span>' : ''}</strong></div>
    ${withGoal.length ? `<div class="spread"><span class="muted">Ø Differenz zum Ziel</span><strong>${fmtS(avgDiff)} kcal</strong></div>` : ''}
    <div class="spread"><span class="muted">Ø Ballaststoffe</span><strong>${r0(avg('fi'))} g</strong></div>
    ${state.alcohol.enabled ? (() => { const ad = done.map((x) => (state.alcohol.log[x.d] || []).reduce((s2, e) => s2 + alcGrams(e.ml, e.vol), 0)); const tot = ad.reduce((p, q) => p + q, 0); const n = ad.filter((v) => v > 0).length; return `<div class="spread"><span class="muted">Alkohol gesamt (Tage mit Alkohol)</span><strong>${r0(tot)} g (${n})</strong></div>`; })() : ''}
    <div class="spread"><span class="muted">Ø Zucker frei / natürlich</span><strong>${r0(avg('fs'))} / ${r0(avg('su') - avg('fs'))} g</strong></div>
</div>`;

  const cDays = sel.map((x) => x.d);
  const nextOff = histMonth >= curMonth;
  const [pTitle, monthly] = HIST_PAGES[histPage] || ['Analytics', true];
  const microDays = done.filter((x) => insLogged(state, x.d)).map((x) => x.d);
  const body = {
    cal: calCard + barCard + macroCard + otherCard,
    weight: insWeightCardHtml(today),
    energy: insEnergyCardHtml(today),
    water: waterCard || '<div class="card"><p class="muted">Der Wasser-Tracker ist ausgeschaltet (Ich → Wasser).</p></div>',
    caf: cDays.length ? caffHistoryHtml(cDays, cDays.length >= 15 ? 30 : 7) : '',
    habit: insHabitCardHtml(today),
    micro: microCardHtml(microDays) || `<div class="card"><p class="muted">${microStatus === 'missing' ? 'Die Mikronährstoff-Daten aus dem BLS sind noch nicht in der App. Sobald sie da sind, erscheinen hier Durchschnitte für Calcium, Eisen, Jod und weitere Werte.' : microStatus === 'loading' || microStatus === 'idle' ? 'Lade Mikronährstoff-Daten …' : 'Im gewählten Zeitraum gibt es keine Tage mit Einträgen.'}</p></div>`,
  }[histPage] || '';
  $('#view').innerHTML = `
    <div class="topbar v2 sub-top"><button class="icon-btn" id="anBack" aria-label="Zurück zur Übersicht">${ic('chevL')}</button><div class="st-t"><div class="sub">${monthly ? `${HIST_MON[M - 1]} ${Y}` : 'Analytics'}</div><div class="day">${pTitle}</div></div>
      ${monthly ? `<div class="nav"><button class="icon-btn" id="hmPrev" aria-label="Vorheriger Monat">${ic('chevL')}</button><button class="icon-btn" id="hmNext" aria-label="Nächster Monat" ${nextOff ? 'disabled' : ''}>${ic('chevR')}</button></div>` : ''}</div>
    ${body}`;
  $('#anBack').onclick = () => { histPage = null; render(); };
  if (histPage === 'caf' && cDays.length) caffHistoryBind(cDays, cDays.length >= 15 ? 30 : 7, () => { const sy = window.scrollY; renderHistory(); window.scrollTo(0, sy); });

  const rerender = () => { const sy = window.scrollY; renderHistory(); window.scrollTo(0, sy); };
  insBindHistory(rerender);
  if (!monthly) return;
  $('#hmPrev').onclick = () => { const d = new Date(Y, M - 2, 1); histMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; histSel = null; histPick = false; renderHistory(); };
  $('#hmNext').onclick = () => { const d = new Date(Y, M, 1); histMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; histSel = null; histPick = false; renderHistory(); };
  document.querySelectorAll('.hc-d').forEach((b) => b.onclick = () => {
    const i = +b.dataset.i, d = mdays[i].d;
    if (histPick && histSel) { const a = histSel.a; histSel = a <= d ? { a, b: d } : { a: d, b: a }; histPick = false; }
    else { histSel = { a: d, b: d }; histPick = true; }
    rerender();
  });
  document.querySelectorAll('.hch').forEach((b) => b.onclick = () => { const c = chips[+b.dataset.ch][1]; histSel = c; histPick = false; rerender(); });
  // Auswahlfenster ziehen
  const wrap = $('#hWrap'), br = $('#hBrush');
  if (!wrap || !br) return;
  const idxAt = (cx) => { const r = wrap.getBoundingClientRect(); const x = (cx - r.left) / r.width * W; return Math.max(0, Math.min(nDays - 1, Math.floor((x - pad) / bw))); };
  br.querySelectorAll('.hb-h').forEach((h) => {
    h.onpointerdown = (e) => {
      e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId);
      let a = ia, b = ib; const side = h.dataset.h;
      const paint = () => { br.style.left = pct(pad + a * bw) + '%'; br.style.width = pct((b - a + 1) * bw) + '%'; };
      h.onpointermove = (ev) => { const i = idxAt(ev.clientX); if (side === 'l') a = Math.min(i, b); else b = Math.max(i, a); paint(); };
      h.onpointerup = h.onpointercancel = () => { h.onpointermove = h.onpointerup = h.onpointercancel = null; histSel = (a === 0 && b === nDays - 1) ? null : { a: mdays[a].d, b: mdays[b].d }; histPick = false; rerender(); };
    };
  });
  br.onpointerdown = (e) => {
    if (e.target.classList.contains('hb-h')) return;
    e.preventDefault(); br.setPointerCapture(e.pointerId);
    const len = ib - ia, start = idxAt(e.clientX); let a = ia, b = ib;
    br.onpointermove = (ev) => { a = Math.max(0, Math.min(nDays - 1 - len, ia + idxAt(ev.clientX) - start)); b = a + len; br.style.left = pct(pad + a * bw) + '%'; };
    br.onpointerup = br.onpointercancel = () => { br.onpointermove = br.onpointerup = br.onpointercancel = null; histSel = (a === 0 && b === nDays - 1) ? null : { a: mdays[a].d, b: mdays[b].d }; histPick = false; rerender(); };
  };
}

/* ---------- Einstellungen ---------- */
const SET_ICONS = {
  'Tagesziel': ['#5BE7F5', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'],
  'Wasser': ['#7AB8FF', '<path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/>'],
  'Supplements': ['#6FE0C1', '<g transform="rotate(-35 12 12)"><rect x="3" y="7.5" width="18" height="9" rx="4.5"/><path d="M12 7.5v9"/></g>'],
  'Alkohol': ['#C79BF2', '<path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3z"/><path d="M12 15v6M8.5 21h7"/>'],
  'Koffein': ['#E2B36B', '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3v3M12.5 3v3"/>'],
  'Timeline': ['#5BE7F5', '<path d="M4 12h16"/><circle cx="7" cy="12" r="2"/><circle cx="13" cy="12" r="2"/><path d="M17 8v8"/>'],
  'Gewichtsziel': ['#6FE0C1', '<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>'],
  'Schlaf & Körper': ['#B9A6FF', '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'],
  'Lebensmittel teilen': ['#7AB8FF', '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>'],
  'Backup': ['#9DB4CF', '<path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z"/><path d="M3 4h18v4H3z"/><path d="M12 11v6M9 14l3 3 3-3"/>'],
  'Quellen & Lizenzen': ['#A9B3C1', '<path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M17 20h2V6"/><path d="M8 8h6M8 11.5h6"/>'],
  'Erscheinungsbild': ['#B9A6FF', '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>'],
};
const setOpen = new Set(); // aufgeklappte Einstellungs-Bereiche (beim Öffnen der Einstellungen alle zugeklappt)
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
  // Gruppen-Karten (Variante B): Bereiche einer Gruppe in einer Karte, mit Kurzinfo unter dem Namen
  const view = $('#view'), cards = {};
  view.querySelectorAll(':scope > .set-card').forEach((c) => { cards[c.querySelector('.set-h .set-t').textContent.trim()] = c; });
  Object.entries(cards).forEach(([t, c]) => { if (SET_SUB[t]) c.querySelector('.set-t').insertAdjacentHTML('beforeend', `<span class="set-sub" data-sub="${esc(t)}">${esc(SET_SUB[t]())}</span>`); });
  // Kurzinfos nach Änderungen aktualisieren (ohne neu zu zeichnen)
  const refresh = () => setTimeout(() => document.querySelectorAll('.set-sub[data-sub]').forEach((el) => { try { el.textContent = SET_SUB[el.dataset.sub](); } catch (e) { /* unverändert lassen */ } }), 0);
  view.addEventListener('change', refresh); view.addEventListener('click', refresh);
  document.querySelectorAll('#themeSeg [data-th]').forEach((b) => b.onclick = () => { state.theme = b.dataset.th; save(); applyTheme(); document.querySelectorAll('#themeSeg [data-th]').forEach((x) => x.classList.toggle('active', x === b)); });
  const co = $('#companionOn'); if (co) co.onchange = () => { state.companion = co.checked; save(); };
  SET_GROUPS.forEach(([g, titles]) => {
    const items = titles.map((t) => cards[t]).filter(Boolean); if (!items.length) return;
    const h = document.createElement('div'); h.className = 'set-gh'; h.textContent = g;
    const box = document.createElement('div'); box.className = 'card set-group';
    items.forEach((c) => box.appendChild(c));
    view.appendChild(h); view.appendChild(box);
  });
  }
const SET_GROUPS = [['Ziele', ['Tagesziel', 'Gewichtsziel']], ['Über mich', ['Schlaf & Körper']], ['Tracker', ['Wasser', 'Koffein', 'Alkohol', 'Supplements']],
  ['Planung', ['Timeline']], ['Darstellung', ['Erscheinungsbild']], ['Daten', ['Lebensmittel teilen', 'Backup', 'Quellen & Lizenzen']]];
const onOff = (on, txt) => (on ? txt : 'aus');
const SET_SUB = {
  'Tagesziel': () => { const g = goalsFor(isoDate(new Date())); return g.goal ? `${fmt(g.goal)} kcal${g.preset && PRESETS[g.preset] ? ' · ' + PRESETS[g.preset].label : ''}` : 'noch nicht festgelegt'; },
  'Gewichtsziel': () => { const o = state.wgoal; return o.on && o.target && o.date ? `${state.profile.weight != null ? r1(state.profile.weight) + ' → ' : ''}${r1(o.target)} kg bis ${new Date(o.date + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}` : 'aus'; },
  'Schlaf & Körper': () => `${state.caffeine.bed}–${state.caffeine.wake}${state.profile.weight != null ? ' · ' + r1(state.profile.weight) + ' kg' : ''}`,
  'Wasser': () => onOff(state.water.enabled, `${litres(state.water.goal)} l · Plus ${state.water.step || 250} ml`),
  'Koffein': () => onOff(state.caffeine.enabled, `an · Richtwert ${fmt(state.caffeine.limit)} mg`),
  'Alkohol': () => onOff(state.alcohol.enabled, 'an'),
  'Supplements': () => onOff(state.supp.enabled, `${state.supp.items.filter((x) => x.on).length} aktiv`),
  'Timeline': () => onOff(state.timeline.enabled, `an · ${TL_PRESETS[state.timeline.preset].label}`),
  'Lebensmittel teilen': () => 'Export / Import',
  'Erscheinungsbild': () => ({ auto: 'Wie iPhone', dark: 'Dunkel', light: 'Hell' }[state.theme || 'auto']),
  'Backup': () => { if (!state.lastBackup) return 'noch kein Backup'; const d = Math.floor((Date.now() - state.lastBackup) / 864e5); return `zuletzt ${d === 0 ? 'heute' : d === 1 ? 'gestern' : `vor ${d} Tagen`}`; },
};
INFO.goalSrc = () => ({ body: `<p>Dein tägliches Kalorienziel, z. B. der Tagesbedarf aus deiner Garmin-Uhr.${state.wgoal.on ? ' <strong>Aktuell wird es aus dem Gewichtsziel berechnet</strong> (Bereich „Gewichtsziel“) und bei neuem Gewicht angepasst.' : ''}</p><p>Eiweiß und Fett rechnet die App aus deinem Körpergewicht: <strong>${state.profile.weight != null ? r1(state.profile.weight) + ' kg' : 'noch nicht eingetragen'}</strong> – änderbar unter „Schlaf &amp; Körper“.</p>` });
function renderSettingsInner() {
  const today = isoDate(new Date());
  const s = goalsFor(today);
  const fmtD = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE');
  const hist = state.goalHistory.slice().reverse();
  $('#view').innerHTML = `
    <div class="topbar v2"><div><div class="sub">Ziele, Tracker &amp; Daten</div><div class="day">Ich</div></div></div>
    <div class="card">
      <h2>Tagesziel</h2>
      <label for="sGoal">Kalorien pro Tag (kcal) ${infoBtn('goalSrc')}</label><input id="sGoal" inputmode="decimal" value="${s.goal ?? ''}" placeholder="z. B. Tagesbedarf aus Garmin">
      <label>Ernährungsziel ${infoBtn('preset')}</label>
      <div class="seg" id="presetSeg">${Object.entries(PRESETS).map(([k, p]) => `<button type="button" data-preset="${k}">${p.label}</button>`).join('')}</div>
      <div class="row">
        <div><label for="sPf">Eiweiß (g/kg)</label><input id="sPf" inputmode="decimal"></div>
        <div><label for="sFf">Fett (g/kg)</label><input id="sFf" inputmode="decimal"></div>
      </div>
      <div class="card macro-preview" id="macroPreview"></div>
      <label>Ballaststoffe &amp; freier Zucker ${infoBtn('sf')}</label>
      <div id="sfAuto" class="small muted"></div>
      <div class="row" id="sfManual">
        <div><label for="sFi">Ballaststoffe mind. (g)</label><input id="sFi" inputmode="decimal" value="${s.fiber ?? ''}" placeholder="DGE: 30"></div>
        <div><label for="sSu">Freier Zucker max. (g)</label><input id="sSu" inputmode="decimal" value="${s.sugar ?? ''}"></div>
      </div>
      <div class="seg two" id="sugPct" style="margin:8px 0 4px"><button type="button" data-p="10">Zucker &lt; 10 % der kcal</button><button type="button" data-p="5">&lt; 5 % der kcal</button></div>
      <label class="switch"><input type="checkbox" id="sfShow" ${state.showSF ? 'checked' : ''}> Ballaststoffe &amp; Zucker im Journal anzeigen</label>
      <label for="sFrom">Gültig ab ${infoBtn('goalFrom')}</label><input id="sFrom" type="date" value="${today}" max="${addDays(today, 365)}">
      <div style="height:6px"></div>
      <button class="btn block" id="sSave">Speichern</button>
      ${hist.length ? `<h2 class="sec">Verlauf der Ziele</h2><ul class="list goals">${hist.map((h) => `<li><div>ab ${fmtD(h.from)}${h.from <= today && goalsFor(today) === h ? '<span class="tag">aktuell</span>' : ''}<div class="meta">${h.goal ? `${r0(h.goal).toLocaleString('de-DE')} kcal` : 'kein kcal-Ziel'}${h.preset && PRESETS[h.preset] ? ` · ${PRESETS[h.preset].label}` : ''}${h.weight ? ` · ${r1(h.weight)} kg` : ''}${[['protein', 'Eiweiß'], ['carbs', 'KH'], ['fat', 'Fett'], ['fiber', 'Ballastst.'], ['sugar', 'Zucker max.']].filter(([k]) => h[k]).map(([k, l]) => ` · ${l} ${r0(h[k])} g`).join('')}</div></div>
        ${hist.length > 1 ? `<button class="btn ghost rm" data-delgoal="${h.from}" aria-label="Ziel ab ${fmtD(h.from)} löschen">✕</button>` : ''}</li>`).join('')}</ul>` : ''}
    </div>
    ${wgSettingsHtml()}
    ${bodySettingsHtml()}
    <div class="card">
      <h2>Wasser</h2>
      <label class="switch"><input type="checkbox" id="wOn" ${state.water.enabled ? 'checked' : ''}> Wasserzähler im Journal anzeigen</label>
      <div class="row">
        <div><label for="wGoal">Tagesziel (Liter) ${infoBtn('water')}</label><input id="wGoal" inputmode="decimal" value="${litres(state.water.goal)}"></div>
        <div><label for="wStep">Menge pro Plus (ml)</label><input id="wStep" inputmode="numeric" value="${state.water.step || 250}"></div>
      </div>
      <div class="chips portions" id="wStepQ">${[200, 250, 330, 500].map((v) => `<button type="button" class="chip ${(state.water.step || 250) === v ? 'on' : ''}" data-v="${v}">${v} ml</button>`).join('')}</div>
    </div>
    ${caffSettingsHtml()}
    ${alcSettingsHtml()}
    ${suppSettingsHtml()}
    ${tlSettingsHtml()}
    <div class="card">
      <h2>Erscheinungsbild</h2>
      <label>Farben</label>
      <div class="seg three" id="themeSeg">${[['auto', 'Wie iPhone'], ['dark', 'Dunkel'], ['light', 'Hell']].map(([k, l]) => `<button type="button" data-th="${k}" class="${(state.theme || 'auto') === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      <label class="switch"><input type="checkbox" id="companionOn" ${state.companion !== false ? 'checked' : ''}> Begleiter im Journal zeigen (Tagesabschluss, leerer Tag)</label>
      <p class="small muted" style="margin:6px 0 0">Die Schriftgröße folgt der Textgröße in den iPhone-Einstellungen (Anzeige &amp; Helligkeit → Textgröße).</p>
    </div>
    <div class="card">
      <h2>Lebensmittel teilen</h2>
      <p class="small muted" style="margin:0 0 8px">Alle gescannten, getrackten, eigenen und vorgemerkten Lebensmittel als Datei weitergeben, z. B. per AirDrop an deine Partnerin. Favoriten, Journal-Einträge, Gewicht und Ziele sind nicht enthalten. ${infoBtn('share')}</p>
      <div class="row"><button class="btn secondary" id="fExp">Exportieren</button><button class="btn secondary" id="fImpBtn">Importieren</button></div>
      <input type="file" id="fImp" accept="application/json,.json" hidden>
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
      ${alcSourcesHtml()}
      <p style="margin-top:10px"><strong style="color:var(--ink)">Standardportionen</strong></p>
      <ul class="refs"><li>SINU – Società Italiana di Nutrizione Umana (2024). LARN – Livelli di Assunzione di Riferimento di Nutrienti ed energia per la popolazione italiana, V Revisione: Porzioni standard. Werte übernommen aus: ATS Brescia (2025), Porzioni standard degli alimenti per la popolazione adulta. <a href="https://www.ats-brescia.it/documents/3432658/78612060/Porzioni+standard+degli+alimenti+per+la+popolazione+adulta.pdf/2ce817e7-0713-bbe6-56c7-767285a575dd" target="_blank" rel="noopener">PDF</a></li>
        <li>Eier, Gewichtsklasse M: 53 bis unter 63 g mit Schale, VO (EG) Nr. 589/2008 Art. 4.</li></ul>
      <p style="margin-top:10px"><strong style="color:var(--ink)">Makro-Presets</strong></p>
      <ul class="refs">${Object.keys(REFS).map(refHtml).join('')}</ul>
      <p style="margin-top:10px"><strong style="color:var(--ink)">Analytics: woher die Werte kommen</strong></p>
      <p class="small muted">Mittelwerte (Ø) zählen nur Tage mit Einträgen; Tage ohne Eintrag und zukünftige Tage bleiben außen vor. Ein Tag mit wenig Einträgen ist nicht unbedingt ein Tag mit wenig Essen. Beim Wasser zählen Tage mit mindestens 1 ml, beim Koffein Tage mit Koffein- oder Essenseinträgen. Die Differenz zum Ziel nutzt für jeden Tag das damals gültige Ziel. Die Koffein-Pegel sind Modellwerte (Halbwertszeit in den Koffein-Einstellungen), keine Messungen. Die Makro-Anteile beziehen sich auf die Energie aus Eiweiß, Kohlenhydraten und Fett (4/4/9 kcal pro g).</p>
      <p style="margin-top:10px"><strong style="color:var(--ink)">Ballaststoffe &amp; Zucker</strong></p>
      <p class="small muted">Ballaststoffe: DGE-Richtwert mindestens 30 g pro Tag (2022 bestätigt). Freier Zucker: WHO (2015) empfiehlt weniger als 10 % der Energie (starke Empfehlung) und schlägt weniger als 5 % vor (bedingte Empfehlung, schwächere Evidenz); DGE, DAG und DDG schließen sich den 10 % an. Freier Zucker = zugesetzter Zucker sowie Zucker in Honig, Sirup, Fruchtsaft und -konzentrat; Zucker in ganzem Obst, Gemüse und Milch zählt als natürlich. Der BLS kennt keinen „zugesetzten“ Zucker – die App leitet ihn aus Lebensmittelgruppe und Namen ab (z. B. „gezuckert“, Süßwaren, Säfte); bei gesüßten Milchprodukten wird der Milchzucker abgezogen. Das ist eine Schätzung. Bei Barcode-Produkten wird „added sugars“ aus Open Food Facts genutzt, sonst zählt der gesamte Zucker als frei; bei eigenen Lebensmitteln ebenso, wenn kein Wert eingetragen ist.</p>
      <p style="margin-top:10px"><strong style="color:var(--ink)">Timeline</strong></p>
      <p class="small muted">Geschlecht: Frauen entleeren den Magen im Mittel langsamer (Datz FL et al. 1987, J Nucl Med 28(7):1204–1207: Feststoffe T½ 92 vs. 60 min, n = 15 je Gruppe; Caballero-Plasencia AM et al. 1999, Scand J Gastroenterol 34(8):772–776, doi:10.1080/003655299750025697: n = 200, kein Unterschied zwischen Zyklusphasen). Die App nutzt gedämpft den Faktor 0,9 (Männer) bzw. 1,1 (Frauen), damit beide Kurven innerhalb der Normalwerte bleiben. Koffein: Geschlecht ohne wesentlichen Einfluss auf CYP1A2 (Grzegorzewski J et al. 2022, Front Pharmacol 12:752826); östrogenhaltige Pille verlängert die Halbwertszeit (Abernethy DR, Todd EL 1985, Eur J Clin Pharmacol 28(4):425–428, doi:10.1007/BF00544361).</p>
      <p class="small muted">Die Magen-Füllung ist ein grobes Modell: Restanteil 2^(−(t/T½)²) mit T½ ≈ 1,75 h für eine kleine fettarme Mahlzeit (ergibt nach 1/2/4 h etwa 80/40/3 % – innerhalb der Normalwerte der Szintigrafie). Längere Zeiten für große und fettreiche Mahlzeiten sowie die Darmphase (+3 h) sind Annahmen, keine Messwerte. Der Plan-Vorschlag ist eine Faustregel, keine belegte „beste“ Verteilung.</p>
      <ul class="refs"><li>Abell TL et al. (2008). Consensus recommendations for gastric emptying scintigraphy. J Nucl Med Technol 36(1):44–54. doi:10.2967/jnmt.107.048116</li>
        <li>Katz PO et al. (2022). ACG Clinical Guideline for the Diagnosis and Management of GERD. Am J Gastroenterol 117(1):27–56 (Mahlzeiten 2–3 h vor dem Schlafen meiden; Empfehlung für Refluxkranke). doi:10.14309/ajg.0000000000001538</li>
        <li>Schoenfeld BJ, Aragon AA (2018). How much protein can the body use in a single meal for muscle-building? J Int Soc Sports Nutr 15:10. doi:10.1186/s12970-018-0215-1</li>
        <li>Ruddick-Collins LC et al. (2022). Timing of daily calorie loading affects appetite and hunger responses without changes in energy metabolism. Cell Metab 34(10):1472–1485 (n = 30; gleiche Gewichtsabnahme, morgens weniger Hunger). doi:10.1016/j.cmet.2022.08.001</li></ul>
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
    INFO.preset = () => ({ body: `<p><strong>${esc(P.long || P.label)}</strong></p><p>${esc(P.why)}</p><p>Die Faktoren beziehen sich auf das Körpergewicht. Bei höherem Körperfettanteil überschätzt das den Eiweißbedarf; dann eher das Zielgewicht eintragen.</p><ul class="refs">${P.refs.map(refHtml).join('')}</ul>` });
  };
  const preview = () => {
    const kcal = num($('#sGoal').value), w = state.profile.weight, pf = num(pfIn.value), ff = num(ffIn.value);
    const m = calcMacros(kcal, w, pf, ff);
    const box = $('#macroPreview');
    if (!m) { box.innerHTML = '<p class="small muted" style="margin:0">Körpergewicht unter „Schlaf &amp; Körper“ eintragen, dann werden Eiweiß, Fett und Kohlenhydrate berechnet.</p>'; return; }
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
  const sfUpd = () => {
    const custom = preset === 'custom';
    $('#sfManual').style.display = custom ? '' : 'none';
    const g = num($('#sGoal').value);
    const t = sfTargets({ preset, goal: g, fiber: preset === 'custom' ? num($('#sFi').value) : null, sugar: preset === 'custom' ? num($('#sSu').value) : null });
    $('#sfAuto').innerHTML = custom ? 'Eigene Werte (bei „Eigene“ frei wählbar).' : `Automatisch: Ballaststoffe <strong style="color:var(--ink)">mind. ${t.fiber} g</strong> (DGE) · freier Zucker <strong style="color:var(--ink)">max. ${t.sugar != null ? t.sugar + ' g' : '–'}</strong> (${state.sugarPct} % von ${g ? de0(g) : '…'} kcal, WHO)`;
    document.querySelectorAll('#sugPct button').forEach((b) => b.classList.toggle('active', +b.dataset.p === state.sugarPct));
  };
  document.querySelectorAll('#sugPct button').forEach((b) => b.onclick = () => { state.sugarPct = +b.dataset.p; save(); sfUpd(); });
  $('#sfShow').onchange = (ev) => { state.showSF = ev.target.checked; save(); };
  document.querySelectorAll('#presetSeg button').forEach((b) => b.addEventListener('click', sfUpd));
  pfIn.addEventListener('input', sfUpd); ffIn.addEventListener('input', sfUpd);
  $('#sGoal').oninput = () => { preview(); sfUpd(); };
  showPreset(); preview(); sfUpd();

  $('#sSave').onclick = () => {
    const goal = num($('#sGoal').value);
    if (goal != null && (goal < 500 || goal > 10000)) { toast('Bitte einen Wert zwischen 500 und 10.000 kcal eingeben.'); return; }
    const weight = state.profile.weight;
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
    save(); toast(from === today ? 'Gespeichert – gilt ab heute' : `Gespeichert – gilt ab ${fmtD(from)}`); renderSettings();
  };
  document.querySelectorAll('[data-delgoal]').forEach((b) => b.onclick = () => {
    if (!confirm('Diesen Eintrag aus dem Ziel-Verlauf löschen? Die betroffenen Tage nutzen dann das vorherige Ziel.')) return;
    state.goalHistory = state.goalHistory.filter((h) => h.from !== b.dataset.delgoal);
    save(); toast('Gelöscht'); renderSettings();
  });
  const keepScroll = () => { const y = window.scrollY; renderSettings(); window.scrollTo(0, y); };
  caffSettingsBind();
  alcSettingsBind();
  suppSettingsBind();
  bodySettingsBind();
  wgSettingsBind(keepScroll);
  tlSettingsBind(keepScroll);
  $('#wOn').onchange = (ev) => { state.water.enabled = ev.target.checked; save(); };
  $('#wGoal').onchange = (ev) => {
    const l = num(ev.target.value);
    if (l == null || l < 0.5 || l > 6) { toast('Bitte zwischen 0,5 und 6 Liter eingeben.'); ev.target.value = litres(state.water.goal); return; }
    state.water.goal = Math.round(l * 1000);
    const td = isoDate(new Date());
    state.water.hist = (state.water.hist || []).filter((h) => h.from !== td).concat([{ from: td, goal: state.water.goal }]).sort((a, b) => a.from.localeCompare(b.from));
    save(); toast(`Wasserziel ${litres(state.water.goal)} l ab heute`);
  };
  const setStep = (v) => { if (v == null || v < 50 || v > 2000) { toast('Bitte 50–2000 ml eingeben.'); $('#wStep').value = state.water.step || 250; return; } state.water.step = Math.round(v); save(); toast(`Plus = ${state.water.step} ml`); keepScroll(); };
  $('#wStep').onchange = (ev) => setStep(num(ev.target.value));
  document.querySelectorAll('#wStepQ [data-v]').forEach((b) => b.onclick = () => setStep(+b.dataset.v));
  $('#exp').onclick = async () => { await exportBackup(); renderSettings(); };
  $('#fExp').onclick = () => exportFoods();
  $('#fImpBtn').onclick = () => $('#fImp').click();
  $('#fImp').onchange = (ev) => readJsonFile(ev, (data) => { importFoods(data); keepScroll(); }, 'Datei konnte nicht gelesen werden.');
  $('#impBtn').onclick = () => $('#imp').click();
  $('#imp').onchange = (ev) => readJsonFile(ev, (data) => {
    if (!data || typeof data !== 'object' || !data.days) { toast('Datei ist kein gültiges Backup.'); return; }
    if (!confirm('Backup importieren? Die aktuellen Daten auf diesem Gerät werden ersetzt.')) return;
    state = normalizeState(data); save(); toast('Backup importiert'); render();
  }, 'Datei ist kein gültiges Backup.');
  $('#wipe').onclick = () => {
    if (confirm('Wirklich alle Einträge, eigenen Lebensmittel, Rezepte und Einstellungen löschen?')) {
      state = emptyState(); save(); toast('Alle Daten gelöscht'); render();
    }
  };
}

/* ---------- Lebensmittel teilen (ohne persönliche Daten) ---------- */
// Datei aus einem <input type="file"> als JSON lesen; Eingabe danach zurücksetzen (gleiche Datei erneut wählbar)
function readJsonFile(ev, onData, errMsg) {
  const file = ev.target.files[0]; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => { let data; try { data = JSON.parse(rd.result); } catch (e) { toast(errMsg); ev.target.value = ''; return; } ev.target.value = ''; onData(data); };
  rd.readAsText(file);
}
async function shareJson(obj, name, done) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); if (done) done(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  if (done) done();
}
// Alle Lebensmittel-Definitionen aus einem Zustand: eigene, vorgemerkte, gescannte und im Journal getrackte.
// Aus dem Journal wird nur das Lebensmittel selbst übernommen (Name, Nährwerte pro 100 g) – keine Daten, Mengen oder Mahlzeiten.
const SHARE_SRC = ['bls', 'off', 'custom', 'recipe'];
function collectFoods(st) {
  const custom = (st.custom || []).filter((f) => f && f.id && f.n);
  const cIds = new Set(custom.map((f) => f.id));
  const map = new Map();
  const put = (f) => { if (!f || !f.id || !f.n || cIds.has(f.id) || map.has(f.id) || !SHARE_SRC.includes(f.src)) return; map.set(f.id, foodSnap(st === state ? liveFood(f) : f)); };
  (st.pantry || []).forEach(put);
  Object.values(st.offCache || {}).forEach(put);
  (st.recent || []).forEach(put);
  Object.keys(st.days || {}).sort().reverse().forEach((d) => (st.days[d] || []).forEach((e) => {
    if (e && e.ref && !e.quick && !e.alcId && !e.cafId) put(Object.assign({}, e, { id: e.ref }));
  }));
  const ids = new Set([...cIds, ...map.keys()]);
  const off = {}; ids.forEach((id) => { const c = String(id).slice(4); if (String(id).startsWith('off:') && st.offCache && st.offCache[c]) off[c] = st.offCache[c]; });
  const slices = {}; ids.forEach((id) => { if (st.slices && st.slices[id]) slices[id] = st.slices[id]; });
  return { custom, foods: [...map.values()], off, slices };
}
function foodsPayload() {
  return Object.assign({ format: 'kalorien-tracker-lebensmittel', v: 2, exported: isoDate(new Date()) }, collectFoods(state));
}
async function exportFoods() {
  const p = foodsPayload();
  const n = p.custom.length + p.foods.length;
  if (!n) { toast('Noch keine Lebensmittel zum Teilen.'); return; }
  await shareJson(p, `lebensmittel-${isoDate(new Date())}.json`, () => { levelEvent(state, 'share', isoDate(new Date())); save(); toast(`${n} Lebensmittel exportiert`); });
}
function importFoods(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.custom)) { toast('Keine Lebensmittel-Datei.'); return; }
  const isBackup = data.format !== 'kalorien-tracker-lebensmittel';
  const src = isBackup ? collectFoods(data) : { custom: data.custom, foods: [...(data.foods || []), ...(data.pantry || [])], off: data.off || {}, slices: data.slices || {} };
  const key = (f) => norm(f.n || '') + '|' + Math.round(f.k || 0);
  const have = new Set(state.custom.map((f) => f.id)), haveKey = new Set(state.custom.map(key));
  const newCustom = src.custom.filter((f) => f && f.id && f.n && !have.has(f.id) && !haveKey.has(key(f)));
  // alles andere landet als „vorgemerkt“ – außer es ist hier schon bekannt (vorgemerkt, zuletzt verwendet, Favorit, eigen)
  const seen = new Set([...(state.pantry || []), ...state.recent, ...state.favs, ...state.custom].map((x) => x.id));
  const now = Date.now();
  const newPantry = src.foods.filter((f) => f && f.id && f.n && SHARE_SRC.includes(f.src) && !seen.has(f.id) && seen.add(f.id))
    .map((f, i) => Object.assign(foodSnap(f), { added: now - i }));
  const total = newCustom.length + newPantry.length;
  if (!total) { toast('Alles schon vorhanden – nichts Neues.'); return; }
  const msg = `${isBackup ? 'Die Datei ist ein vollständiges Backup – übernommen werden nur Lebensmittel. ' : ''}Hinzufügen: ${newCustom.length} eigene Lebensmittel und ${newPantry.length} weitere Lebensmittel (als „vorgemerkt“)? Vorhandenes bleibt unverändert.`;
  if (!confirm(msg)) return;
  state.custom = state.custom.concat(newCustom);
  state.pantry = (state.pantry || []).concat(newPantry).slice(0, PANTRY_MAX);
  Object.entries(src.off).forEach(([c, f]) => { if (!state.offCache[c]) state.offCache[c] = f; });
  Object.entries(src.slices).forEach(([id, g]) => { if (!state.slices[id]) state.slices[id] = g; });
  save(); toast(`${total} Lebensmittel übernommen`);
}
async function exportBackup() {
  await shareJson(state, `kalorien-backup-${isoDate(new Date())}.json`, () => { state.lastBackup = Date.now(); save(); toast('Backup erstellt'); });
}

/* ---------- Start ---------- */
applyTheme();
applyTextSize();
renderTabbar();
render();
loadBls();
// Koffein-Pegel altert mit der Zeit: Tagebuch (heute) jede Minute und beim Zurückkehren in die App auffrischen
function refreshCaffeine() {
  if (tab !== 'diary' || sheetMode || document.visibilityState !== 'visible' || !(state.caffeine.enabled || state.alcohol.enabled || (state.supp.enabled && state.supp.remind)) || currentDate !== isoDate(new Date())) return;
  const y = window.scrollY; renderDiary(); window.scrollTo(0, y);
}
setInterval(refreshCaffeine, 60000);
document.addEventListener('visibilitychange', refreshCaffeine);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
