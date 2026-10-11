/* Supplement-Tracker: Leiste im Tagebuch (abhaken), Erinnerung beim Öffnen der App, Einstellungen mit Wochenplan.
   Daten: state.supp = { enabled, remind, items: [{ id, kind, name, amount, unit, form, mode, days, slot, time, on, from, anchor, color }],
   log: { 'JJJJ-MM-TT': [itemId, …] } }. Globale Hilfen (state, save, $, esc, uid, isoDate, toast, renderSettings) kommen aus app.js. */
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;
const SUPP_SLOTS = [['breakfast', 'Frühstück'], ['lunch', 'Mittag'], ['dinner', 'Abend'], ['snack', 'Snack'], ['time', 'Uhrzeit']];
const SUPP_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const SUPP_UNITS = ['g', 'mg', 'µg', 'Tabl.', 'Kaps.', 'Tropfen', 'Messl.', 'ml'];
const SUPP_FORMS = [['powder', 'Pulver'], ['tablet', 'Tablette'], ['softgel', 'Softgel'], ['capsule', 'Kapsel'], ['drops', 'Tropfen'], ['custom', 'Sonstiges']];
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
const suppColor = (x) => (SUPP_CAT_MAP[x.kind] || {}).c || SUPP_COL[x.kind] || x.color || SUPP_EXTRA[0];
// Kürzel für die Plakette (Stil A): aus dem Katalog, sonst die ersten zwei Buchstaben des Namens
const suppBadge = (x) => (SUPP_CAT_MAP[x.kind] || {}).k || String(x.name || '?').replace(/^Vitamin\s+/i, '').replace(/[^A-Za-zÄÖÜäöüß0-9]/g, '').slice(0, 2) || '?';
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
function suppIcon(form, c, size = 32, badge = null) {
  const d = {
    powder: `<path d="M3.5 17.5h17l-1.4 2.5H4.9z" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 17.5c1.3-3.4 3.6-5.5 6.5-5.5s5.2 2.1 6.5 5.5z" fill="${c}"/><circle cx="9" cy="9" r=".9" fill="${c}"/><circle cx="14.5" cy="7.5" r=".9" fill="${c}"/><circle cx="12" cy="5" r=".9" fill="${c}"/>`,
    tablet: `<circle cx="12" cy="12" r="8.5" fill="${c}"/><path d="M4 12h16" stroke="#0D1320" stroke-opacity="0.45" stroke-width="1.6"/><path d="M8 7.8a6 6 0 0 1 4-1.6" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    softgel: `<g transform="rotate(-35 12 12)"><rect x="2.8" y="7" width="18.4" height="10" rx="5" fill="${c}"/><rect x="5.5" y="9" width="9" height="2.2" rx="1.1" fill="#fff" fill-opacity="0.5"/></g>`,
    capsule: `<g transform="rotate(-35 12 12)"><rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" fill="${c}" fill-opacity="0.38" stroke="${c}" stroke-width="1.4"/><path d="M12 7.5h5.2a4.5 4.5 0 0 1 0 9H12z" fill="${c}"/></g>`,
    drops: `<path d="M12 3.2c3.2 4.3 5.6 7.6 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-3 2.4-6.3 5.6-10.6z" fill="${c}"/><path d="M9.2 13.6a2.9 2.9 0 0 0 2 2.8" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    custom: `<g transform="rotate(-35 12 12)"><rect x="2.8" y="7.5" width="18.4" height="9" rx="4.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 2.4"/></g><path d="M12 9.5v5M9.5 12h5" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/>`,
  }[form] || '';
  if (!badge) return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const fs = badge.length >= 3 ? 5.2 : 6.2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(-1.6 -1.6) scale(.86)">${d}</g><rect x="12.6" y="13.6" width="10.6" height="8.6" rx="3" fill="#0D1320" stroke="${c}" stroke-width="1"/><text x="17.9" y="19.9" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="${fs}" fill="${c}">${esc(badge)}</text></svg>`;
}
const SUPP_CHECK = (c, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Eisen-Referenzwert (DGE, 2024) je nach Geschlecht aus „Schlaf & Körper“
function suppIronRef() {
  const sx = (typeof state !== 'undefined' && state.profile) ? state.profile.sex : null;
  if (sx === 'm') return 'Bedarf laut DGE (2024) für Männer: 11 mg/Tag.';
  if (sx === 'f') return 'Bedarf laut DGE (2024) für Frauen: 14–16 mg/Tag (je nach Alter; in Schwangerschaft 27 mg) – Frauen vor den Wechseljahren haben durch die Menstruation häufiger einen Mangel.';
  return 'Bedarf laut DGE (2024): Männer 11 mg, Frauen 14–16 mg pro Tag.';
}
/* ---------- Journal: eine Karte (Leiste); offene Supplements werden hervorgehoben ---------- */
let suppSnoozeUntil = 0; // nur im Speicher: „Später“ blendet die Hervorhebung für eine Stunde aus
function suppOpenItems(iso) { return suppItemsFor(iso).filter((x) => !suppTaken(iso, x.id)); }
function suppCardHtml(iso) {
  const s = state.supp; if (!s.enabled) return '';
  const items = suppItemsFor(iso); if (!items.length) return '';
  const done = items.filter((x) => suppTaken(iso, x.id)).length;
  const open = items.length - done;
  const hi = open > 0 && s.remind && iso === isoDate(new Date()) && Date.now() >= suppSnoozeUntil;
  const pills = items.map((x) => {
    const c = suppColor(x), taken = suppTaken(iso, x.id);
    return `<button type="button" class="supp-pill ${taken ? 'taken' : ''}" data-supp="${esc(x.id)}" aria-pressed="${taken}" aria-label="${esc(x.name)} ${taken ? 'genommen' : 'noch offen'}">
      <span class="supp-ico" style="--c:${c}">${suppIcon(x.form, taken ? SUPP_MINT : c, 34, suppBadge(x))}${taken ? `<i class="supp-badge">${SUPP_CHECK('#0D1320', 12)}</i>` : ''}</span>
      <span class="supp-n">${esc(x.name.replace(/^Vitamin /, ''))}</span>
      <span class="supp-s">${taken ? 'erledigt' : esc(suppSlotLabel(x))}</span></button>`;
  }).join('');
  return `<div class="card supp ${hi ? 'due' : ''}"><div class="supp-head"><span class="small muted">Supplements <span class="supp-count ${done === items.length ? 'all' : ''}">${done}/${items.length}</span></span>
      ${hi ? `<span class="supp-acts"><button type="button" class="btn ghost supp-later" id="suppLater">Später</button><button type="button" class="btn supp-all" id="suppAll">Alle genommen</button></span>` : ''}</div>
    <div class="supp-grid">${pills}</div></div>`;
}
// Koffein-Tabletten: beim Abhaken im Koffein-Tracker mitzählen (nur bei Mengenangabe in mg)
function suppCafSync(iso, x, taken) {
  if (x.kind !== 'caffeine' || x.unit !== 'mg' || typeof state.caffeine !== 'object') return;
  const id = 'supp-' + x.id;
  const log = (state.caffeine.log[iso] || []).filter((e) => e.id !== id);
  if (taken) { const now = new Date(); log.push({ id, min: iso === isoDate(now) ? now.getHours() * 60 + now.getMinutes() : hmToMin(x.time || '08:00'), mg: +x.amount || 0, n: x.name || 'Koffein-Tablette', dur: 0 }); }
  if (log.length) state.caffeine.log[iso] = log; else delete state.caffeine.log[iso];
}
function suppBind(iso, rerender) {
  document.querySelectorAll('[data-supp]').forEach((b) => b.onclick = () => {
    const x = state.supp.items.find((i) => i.id === b.dataset.supp); const v = !suppTaken(iso, b.dataset.supp);
    suppSetTaken(iso, b.dataset.supp, v); if (x) suppCafSync(iso, x, v);
    save(); if (navigator.vibrate) navigator.vibrate(15); rerender();
  });
  const all = $('#suppAll'); if (all) all.onclick = () => { suppOpenItems(iso).forEach((x) => { suppSetTaken(iso, x.id, true); suppCafSync(iso, x, true); }); save(); toast('Alle abgehakt'); rerender(); };
  const later = $('#suppLater'); if (later) later.onclick = () => { suppSnoozeUntil = Date.now() + 60 * 60000; toast('Hervorhebung für 1 Stunde aus'); rerender(); };
}

/* ---------- Einstellungen ---------- */
let suppOpen = null; // Id des aufgeklappten Supplements in den Einstellungen
let suppPick = false; // Katalog beim Hinzufügen sichtbar
const SUPP_NOREC = '<p class="supp-norec"><strong>Keine Empfehlung.</strong> Diese Angaben fassen Fachquellen zusammen und ersetzen keine ärztliche oder pharmazeutische Beratung. Ob ein Supplement für dich sinnvoll ist, klärst du am besten mit deiner Ärztin, deinem Arzt oder in der Apotheke.</p>';
SUPP_CAT.forEach((c) => {
  INFO['supp:' + c.kind] = () => {
    const [evT, evC] = SUPP_EV[c.ev];
    const iron = c.iron ? ' ' + suppIronRef() : '';
    return { title: c.name, body: `${SUPP_NOREC}<p><strong>Was:</strong> ${esc(c.what)}</p><p><strong>Studienlage:</strong> <span class="ev ${evC}">${evT}</span> – ${esc(c.study)}${esc(iron)}</p>${c.max ? `<p class="nojust"><strong>BfR-Höchstmenge</strong> für Nahrungsergänzungsmittel: ${String(c.max[0]).replace('.', ',')} ${c.max[1]} pro Tag.</p>` : ''}<p><strong>Vorsicht:</strong> ${esc(c.care)}</p>`,
      src: c.src.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ') };
  };
});
INFO['supp:custom'] = { title: 'Eigenes Supplement', body: SUPP_NOREC + '<p>Für eigene Supplements hat die App keine hinterlegten Informationen. Angaben zu Menge und Wirkung findest du auf der Packung oder bei Fachstellen wie dem BfR oder der Verbraucherzentrale.</p>' };
function suppSummary(x) {
  const w = x.mode === 'daily' ? 'täglich' : x.mode === 'every2' ? 'jeden 2. Tag' : (x.days.length ? x.days.map((d) => SUPP_DAYS[d - 1]).join(' ') : 'keine Tage');
  return `${w} · ${suppSlotLabel(x)} · ${x.amount} ${x.unit}`;
}
function suppItemHtml(x) {
  const c = suppColor(x), open = suppOpen === x.id;
  const chip = (attrs, label, on) => `<button type="button" class="chip sp-chip ${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  let ed = '';
  if (open) {
    const cat = SUPP_CAT_MAP[x.kind];
    const over = cat && ((cat.max && x.unit === cat.max[1] && +x.amount > cat.max[0]) ? `Deine Menge liegt über der BfR-Höchstmenge für Nahrungsergänzungsmittel (${String(cat.max[0]).replace('.', ',')} ${cat.max[1]}).` : (cat.warnAbove && x.unit === cat.warnAbove[1] && +x.amount > cat.warnAbove[0]) ? `Deine Menge liegt über den ${cat.warnAbove[2]}.` : '');
    ed = `<div class="sp-edit">
      ${over ? `<p class="small warn" style="margin:2px 0 6px">${esc(over)} Mehr dazu im ⓘ.</p>` : ''}
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
      <button type="button" class="btn danger block" data-del style="margin-top:12px">Supplement löschen</button></div>`;
  }
  return `<div class="sp-item ${open ? 'open' : ''}" data-id="${esc(x.id)}">
    <div class="sp-row"><button type="button" class="sp-main" data-open aria-expanded="${open}"><span class="supp-ico sm" style="--c:${c}">${suppIcon(x.form, c, 28, suppBadge(x))}</span>
      <span class="sp-t"><strong>${esc(x.name)}</strong><span class="small muted">${x.on ? esc(suppSummary(x)) : 'ausgeschaltet'}</span></span></button>
      ${infoBtn('supp:' + (SUPP_CAT_MAP[x.kind] ? x.kind : 'custom'))}<label class="sw"><input type="checkbox" data-on ${x.on ? 'checked' : ''} aria-label="${esc(x.name)} aktiv"></label></div>${ed}</div>`;
}
INFO.suppRem = { body: '<p>Sind beim Öffnen der App noch Supplements offen, wird die Supplement-Karte im Journal hervorgehoben und zeigt „Alle genommen“. Eine Benachrichtigung bei geschlossener App ist ohne Server nicht möglich. „Später“ blendet die Hervorhebung für eine Stunde aus.</p><p>Die Hinweise zu den Supplements zeigen Richtwerte aus der Literatur und ersetzen keine ärztliche Beratung.</p>' };
function suppSettingsHtml() {
  const s = state.supp;
  return `<div class="card"><h2>Supplements</h2>
    <label class="switch"><input type="checkbox" id="spOn" ${s.enabled ? 'checked' : ''}> Supplement-Leiste im Journal anzeigen</label>
    <label class="switch"><input type="checkbox" id="spRem" ${s.remind ? 'checked' : ''}> Offene Supplements im Journal hervorheben ${infoBtn('suppRem')}</label>
    <div class="sp-list">${s.items.map(suppItemHtml).join('')}</div>
    <button type="button" class="btn secondary block" id="spAdd" style="margin-top:10px" aria-expanded="${suppPick}">${suppPick ? 'Auswahl schließen' : '+ Supplement hinzufügen'}</button>
    ${suppPick ? `<div class="sp-pick">${SUPP_CAT.map((c) => `<button type="button" class="sp-pk" data-kind="${c.kind}"><span class="supp-ico sm" style="--c:${c.c}">${suppIcon(c.form, c.c, 28, c.k)}</span><span>${esc(c.name)}</span></button>`).join('')}<button type="button" class="sp-pk" data-kind="custom"><span class="supp-ico sm" style="--c:#93A0B4">${suppIcon('custom', '#93A0B4', 28)}</span><span>Eigenes</span></button></div>
      <p class="small muted" style="margin:8px 2px 0">Zu jedem Supplement gibt es nach dem Hinzufügen ein ⓘ mit Studienlage und Quellen – keine Empfehlung.</p>` : ''}
  </div>`;
}
function suppSettingsBind() {
  const s = state.supp;
  const redraw = () => { const y = window.scrollY; renderSettings(); window.scrollTo(0, y); };
  $('#spOn').onchange = (e) => { s.enabled = e.target.checked; save(); };
  $('#spRem').onchange = (e) => { s.remind = e.target.checked; save(); };
  $('#spAdd').onclick = () => { suppPick = !suppPick; redraw(); };
  document.querySelectorAll('.sp-pk[data-kind]').forEach((b) => b.onclick = () => {
    const t = isoDate(new Date()); const c = SUPP_CAT_MAP[b.dataset.kind];
    const x = { id: 's-' + uid(), kind: c ? c.kind : 'custom', name: c ? c.name : 'Neues Supplement', amount: c ? c.amount : 1, unit: c ? c.unit : 'Tabl.', form: c ? c.form : 'tablet', mode: 'daily', days: [1, 2, 3, 4, 5, 6, 7], slot: 'breakfast', time: '08:00', on: true, from: t, anchor: t, color: c ? c.c : SUPP_EXTRA[s.items.length % SUPP_EXTRA.length] };
    s.items.push(x); suppOpen = x.id; suppPick = false; save(); toast(`${x.name} hinzugefügt`); redraw();
  });
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
