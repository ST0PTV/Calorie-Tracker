/* Supplement-Tracker: Leiste im Tagebuch (abhaken), Erinnerung beim Öffnen der App, Einstellungen mit Wochenplan.
   Daten: state.supp = { enabled, remind, items: [{ id, kind, name, amount, unit, form, mode, days, slot, time, on, from, anchor, color }],
   log: { 'JJJJ-MM-TT': [itemId, …] } }. Globale Hilfen (state, save, $, esc, uid, isoDate, toast, renderSettings) kommen aus app.js. */
const SUPP_SLOTS = [['breakfast', 'Frühstück'], ['lunch', 'Mittag'], ['dinner', 'Abend'], ['snack', 'Snack'], ['time', 'Uhrzeit']];
const SUPP_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const SUPP_UNITS = ['g', 'mg', 'µg', 'Tabl.', 'Kaps.', 'Messl.', 'ml'];
const SUPP_FORMS = [['powder', 'Pulver'], ['tablet', 'Tablette'], ['softgel', 'Softgel'], ['capsule', 'Kapsel'], ['custom', 'Sonstiges']];
const SUPP_COL = { creatine: '#5BE7F5', b12: '#E99AD0', omega3: '#F5C76B', iron: '#FF9A6B' };
const SUPP_EXTRA = ['#B9A6FF', '#8FB4FF', '#6FE0C1'];
const SUPP_MINT = '#6FE0C1';

function SUPP_DEFAULTS() {
  const t = isoDate(new Date()); const all = [1, 2, 3, 4, 5, 6, 7];
  const mk = (id, kind, name, amount, unit, form, mode, slot, on) => ({ id, kind, name, amount, unit, form, mode, days: all.slice(), slot, time: '08:00', on, from: t, anchor: t });
  return { enabled: true, remind: true, log: {}, items: [
    mk('s-cr', 'creatine', 'Kreatin', 7, 'g', 'powder', 'daily', 'breakfast', true),
    mk('s-b12', 'b12', 'Vitamin B12', 1, 'Tabl.', 'tablet', 'daily', 'breakfast', true),
    mk('s-om', 'omega3', 'Omega-3', 2, 'Kaps.', 'softgel', 'daily', 'lunch', true),
    mk('s-fe', 'iron', 'Eisen', 1, 'Kaps.', 'capsule', 'every2', 'breakfast', false),
  ] };
}
function suppNormalize(d) {
  const base = SUPP_DEFAULTS();
  if (!d || typeof d !== 'object') return base;
  const s = Object.assign({ enabled: true, remind: true, items: [], log: {} }, d);
  if (!Array.isArray(s.items)) s.items = [];
  if (!s.log || typeof s.log !== 'object') s.log = {};
  const t = isoDate(new Date());
  s.items = s.items.filter((x) => x && x.id).map((x) => Object.assign({ kind: 'custom', name: 'Supplement', amount: 1, unit: 'Tabl.', form: 'tablet', mode: 'daily', days: [1, 2, 3, 4, 5, 6, 7], slot: 'breakfast', time: '08:00', on: true, from: t, anchor: t }, x));
  return s;
}
const suppColor = (x) => SUPP_COL[x.kind] || x.color || SUPP_EXTRA[0];
const suppSlotLabel = (x) => (x.slot === 'time' ? x.time : (SUPP_SLOTS.find((s) => s[0] === x.slot) || [0, ''])[1]);
const suppDow = (iso) => (new Date(iso + 'T12:00:00').getDay() + 6) % 7 + 1; // 1 = Montag … 7 = Sonntag
function suppDayDiff(a, b) { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); }
function suppDue(x, iso) {
  if (!x.on || iso < x.from) return false;
  if (x.mode === 'every2') return suppDayDiff(x.anchor || x.from, iso) % 2 === 0 && suppDayDiff(x.anchor || x.from, iso) >= 0;
  if (x.mode === 'days') return (x.days || []).includes(suppDow(iso));
  return true;
}
const suppItemsFor = (iso) => state.supp.items.filter((x) => suppDue(x, iso));
const suppTaken = (iso, id) => (state.supp.log[iso] || []).includes(id);
function suppSetTaken(iso, id, v) {
  const l = (state.supp.log[iso] = (state.supp.log[iso] || []).filter((x) => x !== id));
  if (v) l.push(id);
  if (!l.length) delete state.supp.log[iso];
}

/* Icons im Stil „Darreichungsform“ (gefüllte Formen) */
function suppIcon(form, c, size = 32) {
  const d = {
    powder: `<path d="M3.5 17.5h17l-1.4 2.5H4.9z" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 17.5c1.3-3.4 3.6-5.5 6.5-5.5s5.2 2.1 6.5 5.5z" fill="${c}"/><circle cx="9" cy="9" r=".9" fill="${c}"/><circle cx="14.5" cy="7.5" r=".9" fill="${c}"/><circle cx="12" cy="5" r=".9" fill="${c}"/>`,
    tablet: `<circle cx="12" cy="12" r="8.5" fill="${c}"/><path d="M4 12h16" stroke="#0D1320" stroke-opacity="0.45" stroke-width="1.6"/><path d="M8 7.8a6 6 0 0 1 4-1.6" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    softgel: `<g transform="rotate(-35 12 12)"><rect x="2.8" y="7" width="18.4" height="10" rx="5" fill="${c}"/><rect x="5.5" y="9" width="9" height="2.2" rx="1.1" fill="#fff" fill-opacity="0.5"/></g>`,
    capsule: `<g transform="rotate(-35 12 12)"><rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" fill="${c}" fill-opacity="0.38" stroke="${c}" stroke-width="1.4"/><path d="M12 7.5h5.2a4.5 4.5 0 0 1 0 9H12z" fill="${c}"/></g>`,
    custom: `<g transform="rotate(-35 12 12)"><rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 2.4"/></g><path d="M12 9.5v5M9.5 12h5" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/>`,
  }[form] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
}
const SUPP_CHECK = (c, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Eisen-Referenzwert (DGE, 2024) je nach Geschlecht aus „Schlaf & Körper“
function suppIronRef() {
  const sx = (typeof state !== 'undefined' && state.profile) ? state.profile.sex : null;
  if (sx === 'm') return 'Bedarf laut DGE (2024) für Männer: 11 mg/Tag.';
  if (sx === 'f') return 'Bedarf laut DGE (2024) für Frauen: 14–16 mg/Tag (je nach Alter; in Schwangerschaft 27 mg) – Frauen vor den Wechseljahren haben durch die Menstruation häufiger einen Mangel.';
  return 'Bedarf laut DGE (2024): Männer 11 mg, Frauen 14–16 mg pro Tag.';
}
/* ---------- Tagebuch: Leiste + Erinnerung ---------- */
let suppSnoozeUntil = 0; // nur im Speicher: nach dem App-Start erscheint die Erinnerung wieder
function suppOpenItems(iso) { return suppItemsFor(iso).filter((x) => !suppTaken(iso, x.id)); }
function suppCardHtml(iso) {
  const s = state.supp; if (!s.enabled) return '';
  const items = suppItemsFor(iso); if (!items.length) return '';
  const done = items.filter((x) => suppTaken(iso, x.id)).length;
  const pills = items.map((x) => {
    const c = suppColor(x), taken = suppTaken(iso, x.id);
    return `<button type="button" class="supp-pill ${taken ? 'taken' : ''}" data-supp="${esc(x.id)}" aria-pressed="${taken}" aria-label="${esc(x.name)} ${taken ? 'genommen' : 'noch offen'}">
      <span class="supp-ico" style="--c:${c}">${suppIcon(x.form, taken ? SUPP_MINT : c)}${taken ? `<i class="supp-badge">${SUPP_CHECK('#0D1320', 12)}</i>` : ''}</span>
      <span class="supp-n">${esc(x.name.replace(/^Vitamin /, ''))}</span>
      <span class="supp-s">${taken ? 'erledigt' : esc(suppSlotLabel(x))}</span></button>`;
  }).join('');
  return `<div class="card supp"><div class="supp-head"><span class="small muted">Supplements</span><span class="supp-count ${done === items.length ? 'all' : ''}">${done} / ${items.length}</span></div><div class="supp-grid">${pills}</div></div>`;
}
function suppReminderHtml(iso) {
  const s = state.supp;
  if (!s.enabled || !s.remind || iso !== isoDate(new Date()) || Date.now() < suppSnoozeUntil) return '';
  const open = suppOpenItems(iso); if (!open.length) return '';
  return `<div class="card supp-remind" role="alert">
    <div class="supp-r-top"><strong>${open.length === 1 ? 'Noch ein Supplement offen' : `Noch ${open.length} Supplements offen`}</strong><button type="button" class="supp-x" id="suppDismiss" aria-label="Ausblenden bis zum nächsten Öffnen">✕</button></div>
    <div class="supp-chips">${open.map((x) => `<span class="supp-chip" style="--c:${suppColor(x)}">${suppIcon(x.form, suppColor(x), 18)}${esc(x.name.replace(/^Vitamin /, ''))}</span>`).join('')}</div>
    <div class="supp-r-btns"><button type="button" class="btn" id="suppAll" style="background:${SUPP_MINT};color:#0D1320">Alles genommen</button><button type="button" class="btn secondary" id="suppLater">Später</button></div></div>`;
}
function suppBind(iso, rerender) {
  document.querySelectorAll('[data-supp]').forEach((b) => b.onclick = () => {
    suppSetTaken(iso, b.dataset.supp, !suppTaken(iso, b.dataset.supp));
    save(); if (navigator.vibrate) navigator.vibrate(15); rerender();
  });
  const all = $('#suppAll'); if (all) all.onclick = () => { suppOpenItems(iso).forEach((x) => suppSetTaken(iso, x.id, true)); save(); toast('Alles abgehakt'); rerender(); };
  const later = $('#suppLater'); if (later) later.onclick = () => { suppSnoozeUntil = Date.now() + 60 * 60000; toast('Erinnerung in 1 Stunde'); rerender(); };
  const x = $('#suppDismiss'); if (x) x.onclick = () => { suppSnoozeUntil = Infinity; rerender(); };
}

/* ---------- Einstellungen ---------- */
const SUPP_HINTS = {
  creatine: { t: 'Übliche Erhaltungsdosis 3–5 g pro Tag oder 0,03 g/kg Körpergewicht, täglich auch an Ruhetagen, am besten mit einer Mahlzeit; Pulver direkt nach dem Anrühren trinken.', s: 'AIS', u: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a/performance-supplements2/creatine' },
  b12: { t: 'Die Aufnahme ist begrenzt: bei 500 µg werden etwa 2 % aufgenommen, bei 1.000 µg etwa 1,3 %. Ein belegter Einnahmezeitpunkt ist nicht bekannt. Für B12 ist keine Obergrenze festgelegt.', s: 'NIH ODS', u: 'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/' },
  omega3: { t: 'Omega-3 wird zu etwa 95 % aufgenommen, wie andere Nahrungsfette. Die Einnahme zu einer Mahlzeit ist üblich, aber hier nicht belegt. Bis etwa 5 g EPA+DHA pro Tag gelten als sicher (EFSA/FDA).', s: 'NIH ODS', u: 'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/' },
  iron: { t: 'Jeden 2. Tag als einzelne Morgendosis erhöhte in einer Studie an jungen Frauen mit niedrigen Eisenspeichern die Aufnahme (Stoffel 2017). Calcium kann die Aufnahme senken, Vitamin C erhöht sie, mit Essen gibt es weniger Magen-Darm-Beschwerden. Obergrenze 45 mg/Tag. Nur bei bestätigtem Mangel sinnvoll (Blutwerte).', s: 'Stoffel 2017 / NIH ODS', u: 'https://doi.org/10.1016/S2352-3026(17)30182-5' },
};
let suppOpen = null; // Id des aufgeklappten Supplements in den Einstellungen
function suppSummary(x) {
  const w = x.mode === 'daily' ? 'täglich' : x.mode === 'every2' ? 'jeden 2. Tag' : (x.days.length ? x.days.map((d) => SUPP_DAYS[d - 1]).join(' ') : 'keine Tage');
  return `${w} · ${suppSlotLabel(x)} · ${x.amount} ${x.unit}`;
}
function suppItemHtml(x) {
  const c = suppColor(x), open = suppOpen === x.id;
  const chip = (attrs, label, on) => `<button type="button" class="chip sp-chip ${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  let ed = '';
  if (open) {
    const h = SUPP_HINTS[x.kind];
    ed = `<div class="sp-edit">
      <label>Name</label><input type="text" data-f="name" value="${esc(x.name)}">
      <div class="row"><div><label>Menge</label><input inputmode="decimal" data-f="amount" value="${esc(x.amount)}"></div>
        <div><label>Einheit</label><select data-f="unit">${SUPP_UNITS.map((u) => `<option ${u === x.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>
      <label>Form (Icon)</label><select data-f="form">${SUPP_FORMS.map(([k, l]) => `<option value="${k}" ${k === x.form ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label>Wann</label>
      <div class="seg three">${[['daily', 'Täglich'], ['every2', 'Jeden 2. Tag'], ['days', 'Wochentage']].map(([k, l]) => `<button type="button" data-mode="${k}" class="${x.mode === k ? 'active' : ''}">${l}</button>`).join('')}</div>
      ${x.mode === 'days' ? `<div class="sp-days">${SUPP_DAYS.map((d, i) => chip(`data-day="${i + 1}"`, d, x.days.includes(i + 1))).join('')}</div>` : ''}
      <label>Zu welcher Mahlzeit / Uhrzeit</label>
      <div class="chips">${SUPP_SLOTS.map(([k, l]) => chip(`data-slot="${k}"`, l, x.slot === k)).join('')}</div>
      ${x.slot === 'time' ? `<input type="time" data-f="time" value="${esc(x.time)}" style="margin-top:8px">` : ''}
      ${h ? `<div class="sp-hint"><strong>Hinweis:</strong> ${esc(h.t)}${x.kind === 'iron' ? ' ' + esc(suppIronRef()) : ''}${x.kind === 'creatine' && x.unit === 'g' && x.amount > 5 ? ' <span class="warn">Deine Menge liegt über 3–5 g.</span>' : ''}<div class="muted">Quelle: <a href="${h.u}" target="_blank" rel="noopener">${esc(h.s)}</a></div></div>` : ''}
      <button type="button" class="btn danger block" data-del style="margin-top:12px">Supplement löschen</button></div>`;
  }
  return `<div class="sp-item ${open ? 'open' : ''}" data-id="${esc(x.id)}">
    <div class="sp-row"><button type="button" class="sp-main" data-open aria-expanded="${open}"><span class="supp-ico sm" style="--c:${c}">${suppIcon(x.form, c, 24)}</span>
      <span class="sp-t"><strong>${esc(x.name)}</strong><span class="small muted">${x.on ? esc(suppSummary(x)) : 'ausgeschaltet'}</span></span></button>
      <label class="sw"><input type="checkbox" data-on ${x.on ? 'checked' : ''} aria-label="${esc(x.name)} aktiv"></label></div>${ed}</div>`;
}
function suppSettingsHtml() {
  const s = state.supp;
  return `<div class="card"><h2>Supplements</h2>
    <label class="switch"><input type="checkbox" id="spOn" ${s.enabled ? 'checked' : ''}> Supplement-Leiste im Journal anzeigen</label>
    <label class="switch"><input type="checkbox" id="spRem" ${s.remind ? 'checked' : ''}> Beim Öffnen der App an offene Supplements erinnern</label>
    <div class="sp-list">${s.items.map(suppItemHtml).join('')}</div>
    <button type="button" class="btn secondary block" id="spAdd" style="margin-top:10px">+ Supplement hinzufügen</button>
    <p class="small muted" style="margin-top:8px">Die Erinnerung erscheint nur, wenn du die App öffnest (eine Benachrichtigung bei geschlossener App ist ohne Server nicht möglich). „Später“ blendet sie für eine Stunde aus. Die Hinweise zeigen Richtwerte aus der Literatur und ersetzen keine ärztliche Beratung.</p></div>`;
}
function suppSettingsBind() {
  const s = state.supp;
  const redraw = () => { const y = window.scrollY; renderSettings(); window.scrollTo(0, y); };
  $('#spOn').onchange = (e) => { s.enabled = e.target.checked; save(); };
  $('#spRem').onchange = (e) => { s.remind = e.target.checked; save(); };
  $('#spAdd').onclick = () => {
    const t = isoDate(new Date());
    const x = { id: 's-' + uid(), kind: 'custom', name: 'Neues Supplement', amount: 1, unit: 'Tabl.', form: 'tablet', mode: 'daily', days: [1, 2, 3, 4, 5, 6, 7], slot: 'breakfast', time: '08:00', on: true, from: t, anchor: t, color: SUPP_EXTRA[s.items.length % SUPP_EXTRA.length] };
    s.items.push(x); suppOpen = x.id; save(); redraw();
  };
  document.querySelectorAll('.sp-item').forEach((el) => {
    const x = s.items.find((i) => i.id === el.dataset.id); if (!x) return;
    el.querySelector('[data-open]').onclick = () => { suppOpen = suppOpen === x.id ? null : x.id; redraw(); };
    el.querySelector('[data-on]').onchange = (e) => { x.on = e.target.checked; if (x.on) { const t = isoDate(new Date()); x.from = t; x.anchor = t; } save(); redraw(); };
    el.querySelectorAll('[data-f]').forEach((inp) => inp.onchange = () => {
      const f = inp.dataset.f; let v = inp.value;
      if (f === 'amount') { v = num(v); if (v == null || v <= 0 || v > 100000) { toast('Bitte eine gültige Menge eingeben.'); inp.value = x.amount; return; } }
      if (f === 'name') { v = v.trim(); if (!v) { toast('Bitte einen Namen eingeben.'); inp.value = x.name; return; } }
      x[f] = v; save(); redraw();
    });
    el.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { x.mode = b.dataset.mode; if (x.mode === 'every2') x.anchor = isoDate(new Date()); save(); redraw(); });
    el.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => { const d = +b.dataset.day; x.days = x.days.includes(d) ? x.days.filter((q) => q !== d) : x.days.concat(d).sort(); save(); redraw(); });
    el.querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { x.slot = b.dataset.slot; save(); redraw(); });
    const del = el.querySelector('[data-del]');
    if (del) del.onclick = () => { if (!confirm(`„${x.name}“ löschen? Bereits abgehakte Tage bleiben im Backup.`)) return; s.items = s.items.filter((i) => i.id !== x.id); suppOpen = null; save(); redraw(); };
  });
}
if (typeof module !== 'undefined') module.exports = { suppDue, suppDow, suppDayDiff };
