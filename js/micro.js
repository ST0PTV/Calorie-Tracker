/* Mikronährstoffe aus dem BLS 4.0 (Calcium, Magnesium, Eisen, Zink, Jod, Selen, Vitamin B12, Vitamin D, Folat).
   Die Werte liegen in data/bls_micro.json (erzeugt mit tools/convert_bls.py, drittes Argument) und werden erst
   geladen, wenn Analytics geöffnet wird. Fehlt die Datei, bleibt die Karte ausgeblendet.
   Nur BLS-Lebensmittel haben Werte; gescannte und eigene Lebensmittel zählen nicht mit (Abdeckung wird angezeigt).
   Bezugswerte: EU-Nährstoffbezugswerte (NRV) für Erwachsene, Verordnung (EU) 1169/2011 Anhang XIII Teil A –
   Kennzeichnungswerte, keine persönliche Empfehlung (geprüft 13.10.2026 über gesetze.legal). */
'use strict';
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;

const MICRO_KEYS = ['ca', 'mg', 'fe', 'zn', 'io', 'se', 'b12', 'd', 'fol'];
const MICRO_META = {
  ca: ['Calcium', 'mg', 800], mg: ['Magnesium', 'mg', 375], fe: ['Eisen', 'mg', 14], zn: ['Zink', 'mg', 10],
  io: ['Jod', 'µg', 150], se: ['Selen', 'µg', 55], b12: ['Vitamin B12', 'µg', 2.5], d: ['Vitamin D', 'µg', 5], fol: ['Folat', 'µg', 200],
};
let microData = null, microStatus = 'idle'; // idle | loading | ok | missing

function microLoad(onReady) {
  if (microStatus !== 'idle') return;
  microStatus = 'loading';
  fetch('data/bls_micro.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d) => {
      if (!d || !d.foods || !d.meta || !Array.isArray(d.meta.keys) || !Object.keys(d.foods).length) throw new Error('leer'); // Platzhalter ohne Daten
      const idx = MICRO_KEYS.map((k) => d.meta.keys.indexOf(k));
      microData = new Map(Object.entries(d.foods).map(([code, v]) => [code, idx.map((i) => (i >= 0 ? v[i] : null))]));
      microStatus = 'ok'; if (onReady) onReady();
    })
    .catch(() => { microStatus = 'missing'; });
}

// Summen eines Tages: vals[i] = Summe der bekannten Werte; kcalKnown = kcal aus Einträgen mit Mikro-Daten
function microDay(entries) {
  const vals = MICRO_KEYS.map(() => 0); let kcalAll = 0, kcalKnown = 0;
  for (const e of entries) {
    if (e.cafId || e.alcId) continue; // Tracker-Getränke haben keine BLS-Werte und verfälschen sonst die Abdeckung
    const k = (e.k || 0) * (e.grams || 0) / 100; kcalAll += k;
    const id = String(e.ref || '');
    const m = id.startsWith('bls:') && microData ? microData.get(id.slice(4)) : null;
    if (!m) continue;
    kcalKnown += k;
    m.forEach((v, i) => { if (v != null) vals[i] += v * (e.grams || 0) / 100; });
  }
  return { vals, kcalAll, kcalKnown };
}

INFO.micro = { body: '<p>Durchschnitt pro Tag über die Tage mit Einträgen im gewählten Zeitraum, berechnet aus den Nährwerten des Bundeslebensmittelschlüssels (BLS 4.0). <strong>Keine Empfehlung</strong> und keine Aussage über eine Unterversorgung.</p><p>Der Balken zeigt den Anteil am EU-Nährstoffbezugswert (NRV) – das ist der Wert für die Nährwertkennzeichnung auf Verpackungen, nicht dein persönlicher Bedarf. Die DGE-Referenzwerte liegen teils deutlich anders (z. B. Vitamin D ohne eigene Bildung in der Haut).</p>',
  pts: [['Nur BLS-Lebensmittel', 'Gescannte und eigene Lebensmittel haben keine Werte; „Abdeckung“ zeigt, welcher Anteil der Kalorien eingerechnet ist.'], ['Angereicherte Produkte', 'Mit B12, Calcium, Jod oder Vitamin D angereicherte Pflanzendrinks, Salze usw. stehen meist nicht im BLS – gerade bei veganer Ernährung wird dann zu wenig angezeigt.'], ['Supplements', 'Tabletten aus dem Supplement-Tracker sind nicht eingerechnet.'], ['Vitamin D', 'Wird hauptsächlich über die Haut gebildet; die Zufuhr über Essen sagt wenig über die Versorgung.'], ['Blutwerte', 'Ob ein Nährstoff fehlt, zeigt nur eine ärztliche Untersuchung.']],
  src: 'BLS 4.0, Max Rubner-Institut 2025 · EU-Verordnung 1169/2011, Anhang XIII (NRV)' };

function microCardHtml(daysList) {
  if (microStatus === 'idle') microLoad(() => { if (typeof tab !== 'undefined' && tab === 'history') renderHistory(); });
  if (microStatus !== 'ok' || !daysList.length) return '';
  const tot = MICRO_KEYS.map(() => 0); let kAll = 0, kKnown = 0;
  daysList.forEach((d) => { const r = microDay(state.days[d] || []); r.vals.forEach((v, i) => { tot[i] += v; }); kAll += r.kcalAll; kKnown += r.kcalKnown; });
  const n = daysList.length, cov = kAll ? Math.round(kKnown / kAll * 100) : 0;
  const fmtV = (v) => (v < 10 ? r1(v) : fmt(v));
  const rows = MICRO_KEYS.map((k, i) => {
    const [label, unit, nrv] = MICRO_META[k]; const v = tot[i] / n; const pct = Math.round(v / nrv * 100);
    return `<div class="mc-row"><span class="mc-l">${label}</span><span class="mc-bar"><i style="width:${Math.min(100, pct)}%"></i></span><span class="mc-v">${fmtV(v)} ${unit}</span><span class="mc-p muted">${pct} %</span></div>`;
  }).join('');
  return `<div class="card mc"><div class="spread"><h2 class="ct">Mikronährstoffe ${infoBtn('micro')}</h2><span class="small muted">Ø pro Tag · ${n} ${n === 1 ? 'Tag' : 'Tage'}</span></div>
    ${rows}
    <p class="small muted" style="margin:8px 0 0">Balken = Anteil am EU-Bezugswert (Kennzeichnung). Abdeckung: ${cov} % der Kalorien stammen aus BLS-Lebensmitteln mit Werten.</p></div>`;
}
