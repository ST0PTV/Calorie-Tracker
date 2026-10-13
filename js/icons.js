/* Icons und kleine Grafiken für Version 2.0 („Glas 2.0“):
   eigene Linien-Icons (24er-Raster, 1,8 px Strich, runde Enden, kein Emoji), Abzeichen für Lebensmittel
   (Symbol nach BLS-Gruppe, Farbe nach dem stärksten Makro) und der Begleiter (Gemüsemonster) für Journal-Zustände. */
'use strict';

const ICONS = {
  journal: '<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  food: '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 4.5c-1 1.2 1 2.3 0 3.5M13 4.5c-1 1.2 1 2.3 0 3.5"/>',
  chart: '<path d="M4 4v16h16"/><path d="M7.5 15l3.5-4 3 2.5 4.5-6"/>',
  person: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sunrise: '<path d="M4 18h16"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 9.5V6.5M6.3 12.6l-1.6-1.4M17.7 12.6l1.6-1.4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  apple: '<path d="M12 7.5c-2-1.6-6-1-6 3.5 0 4 2.6 8 4.3 8 .8 0 1-.4 1.7-.4s.9.4 1.7.4C15.4 19 18 15 18 11c0-4.5-4-5.1-6-3.5z"/><path d="M12 7.5c0-1.6.8-3 2.5-3.5"/>',
  drop: '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0c0-4.3 6-10.5 6-10.5z"/>',
  cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>',
  pill: '<g transform="rotate(-35 12 12)"><rect x="3" y="7.5" width="18" height="9" rx="4.5"/><path d="M12 7.5v9"/></g>',
  glass: '<path d="M7 3h10l-1 8a4 4 0 0 1-8 0L7 3z"/><path d="M12 15v6M8.5 21h7"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.6 10a4.6 4.6 0 0 1 6.8 0"/><path d="M12 10.6l1.4-1.8"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8 9v6M11 9v6M14 9v6M17 9v6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8"/>',
  undo: '<path d="M9 6.5L4.5 11 9 15.5"/><path d="M5 11h9.5a5 5 0 0 1 0 10H12"/>',
  chevR: '<path d="M9.5 6l6 6-6 6"/>',
  chevL: '<path d="M14.5 6l-6 6 6 6"/>',
  chevD: '<path d="M6 9.5l6 6 6-6"/>',
  grain: '<path d="M12 21V8"/><path d="M12 14c-2.6 0-4.2-1.6-4.2-4.2 2.6 0 4.2 1.6 4.2 4.2zM12 14c2.6 0 4.2-1.6 4.2-4.2-2.6 0-4.2 1.6-4.2 4.2zM12 9.2c-1.5-1-1.9-2.8-.9-4.7 1.6 1 1.9 2.9.9 4.7z"/>',
  milk: '<path d="M9 3.5h6M9.5 3.5v3L7.5 9.5V20h9V9.5l-2-3v-3"/><path d="M7.5 13h9"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
  pod: '<path d="M4.5 16.5C8 9 13 5.5 19.5 5c-.5 6.5-4 11.5-11.5 15z"/><circle cx="10" cy="14" r="1.6"/><circle cx="13" cy="11" r="1.6"/><circle cx="16" cy="8.2" r="1.4"/>',
  potato: '<path d="M6.5 8.5C8.5 5 15 4 17.8 7.5c2.6 3.3 1 9.2-3.3 10.8-4.6 1.7-9.7-.4-10-4.4-.1-2.1.6-3.8 2-5.4z"/><path d="M10 10h.01M14 9h.01M13 14h.01"/>',
  oil: '<path d="M10 3h4M10.5 3v3.5L8 10v9.5A1.5 1.5 0 0 0 9.5 21h5a1.5 1.5 0 0 0 1.5-1.5V10l-2.5-3.5V3"/><path d="M12 13.5s1.8 1.9 1.8 3.2a1.8 1.8 0 0 1-3.6 0c0-1.3 1.8-3.2 1.8-3.2z"/>',
  shaker: '<path d="M8 9h8l-1 11H9z"/><path d="M8.5 9a3.5 3.5 0 0 1 7 0"/><path d="M11 5.5h.01M13 5.5h.01M12 4h.01"/>',
  candy: '<circle cx="12" cy="12" r="4.5"/><path d="M8 9.8L4 8l1 4-1 4 4-1.8M16 9.8L20 8l-1 4 1 4-4-1.8"/>',
  fish: '<path d="M3.5 12c3-4.5 9-5.5 13-2.2L20.5 7v10l-4-2.8C12.5 17.5 6.5 16.5 3.5 12z"/><path d="M8 11h.01"/>',
  meat: '<path d="M14.5 4.5c3.5 1 5.5 4.5 4.5 8-1.1 3.9-5.6 6.4-9.5 5.2-.9 1.9-2.6 2.6-3.8 1.4-1.2-1.2-.4-2.9 1.4-3.8C6 11.4 8.4 6.9 12 5.2c.8-.4 1.7-.7 2.5-.7z"/><circle cx="14" cy="10.5" r="2"/>',
  pot: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6z"/><path d="M2.5 10h19M9 7c0-1 .8-1.5 1.5-1.5h3c.7 0 1.5.5 1.5 1.5"/>',
  flame: '<path d="M12 3c.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.8 2.5-5 .3 1.5 1 2.3 2 2.6C12 8.3 11.5 5.6 12 3z"/>',
  habit: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3M9 14.5l2 2 4-4"/>',
  bed: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  star: '<path d="M12 4l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 15.8 7.4 18.3l.9-5.2L4.5 9.5l5.2-.7z"/>',
  micro: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="8" r="2"/><circle cx="14.5" cy="16" r="3.5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3"/>',
  bolt: '<path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  macro: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6.5 4.5"/>',
};
function ic(name, cls = '', label = '') {
  const a = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" ${a}>${ICONS[name] || ''}</svg>`;
}

/* Abzeichen für Lebensmittel. Symbol: BLS-Hauptgruppe (Anfangsbuchstabe des BLS-Codes, siehe data/bls.json),
   sonst Herkunft. Farbe: Makro mit dem größten Energieanteil (E/KH 4, Fett 9 kcal pro g). */
const BLS_GROUP_ICON = { B: 'grain', C: 'grain', D: 'grain', E: 'grain', F: 'apple', G: 'leaf', H: 'pod', K: 'potato', M: 'milk', N: 'cup', P: 'glass', Q: 'oil', R: 'shaker', S: 'candy', T: 'fish', U: 'meat', V: 'meat', W: 'meat', X: 'pot', Y: 'pot' };
function foodIconName(f) {
  if (!f) return 'food';
  if (f.cafId) return 'cup';
  if (f.alcId) return 'glass';
  if (f.quick) return 'bolt';
  const id = String(f.ref || f.id || '');
  if (id.startsWith('bls:')) return BLS_GROUP_ICON[id.charAt(4)] || 'food';
  if (f.src === 'rcp' || f.src === 'recipe' || id.startsWith('rcp:')) return 'pot';
  if (f.src === 'custom') return 'star';
  if (f.liq) return 'cup';
  return null; // unbekannt: Anfangsbuchstabe
}
function foodMacroKey(f) {
  const e = [(f.p || 0) * 4, (f.c || 0) * 4, (f.f || 0) * 9];
  const m = Math.max(...e); if (!(m > 0)) return 'n';
  return ['p', 'c', 'f'][e.indexOf(m)];
}
function foodBadge(f, size = '') {
  const name = foodIconName(f);
  const inner = name ? ic(name) : `<b>${esc(String((f && f.n) || '?').trim().charAt(0).toUpperCase())}</b>`;
  return `<span class="fb fb-${foodMacroKey(f || {})} ${size}" aria-hidden="true">${inner}</span>`;
}
const MEAL_ICON = { breakfast: 'sunrise', lunch: 'sun', dinner: 'moon', snack: 'apple' };

/* Begleiter: das Starter-Monster aus dem Level-System (falls gewählt), sonst Möhri.
   Reagiert nur auf das Eintragen (wach / schläft), nie auf die Menge des Essens. */
function companionName() {
  if (typeof lvCompanion === 'function') { const c = lvCompanion(); if (c) return c.name; }
  const st = state.level && state.level.starter;
  const s = typeof LV_STARTERS !== 'undefined' && LV_STARTERS.find((x) => x.id === st);
  return s ? s.forms[0] : 'Möhri';
}
function monsterSvg(mood = 'awake', size = 96) {
  if (typeof lvCompanionSvg === 'function') { const h = lvCompanionSvg(mood, size); if (h) return h; } // Level-System aktiv: echtes Monster
  const st = (state.level && state.level.starter) || 'moehri';
  const eyes = mood === 'sleep'
    ? '<path d="M44 58q5 4 10 0M66 58q5 4 10 0" fill="none" stroke="#2A1408" stroke-width="3" stroke-linecap="round"/>'
    : '<ellipse cx="49" cy="57" rx="5" ry="6" fill="#2A1408"/><ellipse cx="71" cy="57" rx="5" ry="6" fill="#2A1408"/><circle cx="51" cy="55" r="1.8" fill="#FFF"/><circle cx="73" cy="55" r="1.8" fill="#FFF"/>';
  const mouth = mood === 'sleep' ? '<ellipse cx="60" cy="72" rx="3.5" ry="2.5" fill="#2A1408"/>' : '<path d="M53 71q7 6 14 0" fill="none" stroke="#2A1408" stroke-width="3" stroke-linecap="round"/>';
  const z = mood === 'sleep' ? '<text x="92" y="30" font-family="Sora,sans-serif" font-size="16" font-weight="600" fill="var(--lilac)">z</text><text x="102" y="18" font-family="Sora,sans-serif" font-size="11" font-weight="600" fill="var(--lilac)">z</text>' : '';
  const cheeks = '<ellipse cx="41" cy="66" rx="5" ry="3" fill="#FFB9A0" opacity="0.75"/><ellipse cx="79" cy="66" rx="5" ry="3" fill="#FFB9A0" opacity="0.75"/>';
  let body;
  if (st === 'erbsi') {
    body = '<path d="M60 18v14" stroke="#4FB57E" stroke-width="5" stroke-linecap="round"/><path d="M60 26c6-6 14-6 18-2-5 4-11 5-18 2z" fill="#6FE0A0"/>'
      + '<circle cx="60" cy="66" r="36" fill="#8ED16B"/><path d="M34 84c8 8 18 12 26 12s18-4 26-12" fill="none" stroke="#6DB24E" stroke-width="3" stroke-linecap="round"/>';
  } else if (st === 'tomi') {
    body = '<circle cx="60" cy="68" r="36" fill="#FF7A6B"/><path d="M60 30l-6 8-9-2 5 8-8 5 10 1 8 4 8-4 10-1-8-5 5-8-9 2z" fill="#4FB57E"/><path d="M82 52c3 4 4 9 3 14" fill="none" stroke="#FFB0A6" stroke-width="4" stroke-linecap="round"/>';
  } else {
    body = '<path d="M60 24c-9 6-10 13-6 18M60 24c9 5 11 12 6 18M60 22v18" fill="none" stroke="#6FE0C1" stroke-width="6" stroke-linecap="round"/>'
      + '<path d="M30 46c0-6 6-10 30-10s30 4 30 10c0 26-16 62-30 62S30 72 30 46z" fill="#FF9A6B"/><path d="M38 82h10M70 90h8M42 96h7" stroke="#E57F50" stroke-width="3" stroke-linecap="round"/>';
  }
  return `<svg class="monster ${mood}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="30" ry="5" fill="rgba(0,0,0,0.22)"/>${body}${cheeks}${eyes}${mouth}${z}</svg>`;
}
