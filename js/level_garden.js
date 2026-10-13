/* Level-System „Gemüsemonster“ – Etappe 2: Garten, Beet, Besucher, Mitbringsel, Samen & Entdecker-Rang.
   Berechnung in js/level.js (levelGarden), Grafik in js/monster_art.js (GARDEN_SCENES), Rest von js/level_ui.js.
   Belohnt nur, OB ein Gemüse-Typ vorkam – nie die Menge, nie weniger Essen. */
'use strict';

const LVG_W = 358, LVG_H = 520, LVG_DY = 50;
const LVG_PLOTS = [[120, 380], [196, 380], [272, 380], [120, 428], [196, 428], [272, 428]];
// Plätze für Bewohner (links, oben, Größe, Spazierweg [px, s, Versatz]) in Szenen-Koordinaten
const LVG_SLOTS = [[140, 279, 88, [80, 16, 0]], [243, 253, 66, [-60, 13, 4]], [11, 268, 76], [92, 300, 62], [300, 316, 54], [14, 392, 58]];
const LVG_DEKO_ART = {
  blumen: '<g transform="translate(26 352)">' + [[0, 0, '#FFB3C7'], [12, 4, '#fff'], [24, -2, '#B9A6FF'], [6, 12, '#FFE97A'], [20, 12, '#FFB3C7']].map(([x, y, c]) => `<path d="M${x} ${y + 10} v-8" stroke="#4E9E4A" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="3.6" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.3" fill="#F2C230"/>`).join('') + '</g>',
  pilzring: '<g transform="translate(320 505)">' + [[-14, 0], [0, -6], [14, 0], [6, 6], [-8, 6]].map(([x, y]) => `<path d="M${x - 1.5} ${y} v5 h3 v-5z" fill="#F4E9D8"/><path d="M${x - 5} ${y} a5 4 0 0 1 10 0z" fill="#E8503E"/><circle cx="${x - 1.5}" cy="${y - 2}" r=".9" fill="#fff"/>`).join('') + '</g>',
  laterne: '<g transform="translate(318 350)"><path d="M0 0 V-46" stroke="#4A4A54" stroke-width="3"/><path d="M0 -46 h10" stroke="#4A4A54" stroke-width="2.4"/><rect x="4" y="-44" width="12" height="16" rx="4" fill="#F2A65A"/><rect x="7" y="-40" width="6" height="8" rx="2" fill="#FFE97A"/></g>',
  vogelhaus: '<g transform="translate(96 350)"><path d="M0 0 V-34" stroke="#8A6A4A" stroke-width="3"/><path d="M-12 -34 l12 -10 l12 10z" fill="#B5302A"/><rect x="-9" y="-34" width="18" height="13" fill="#E9C9A0"/><circle cx="0" cy="-28" r="3" fill="#6B4A2E"/></g>',
  windrad: '<g transform="translate(232 312)"><path d="M0 0 V-34" stroke="#8A6A4A" stroke-width="2.6"/><g class="lvg-spin" style="transform-origin:0px -34px">' + [0, 90, 180, 270].map((a) => `<path transform="rotate(${a} 0 -34)" d="M0 -34 l10 -3 l-2 7z" fill="${a % 180 ? '#5BE7F5' : '#FF9A6B'}"/>`).join('') + '</g><circle cx="0" cy="-34" r="2" fill="#4A4A54"/></g>',
  bank: '<g transform="translate(232 506)"><rect x="-22" y="-12" width="44" height="5" rx="2" fill="#B08A63"/><rect x="-22" y="-20" width="44" height="4" rx="2" fill="#C9A47A"/><path d="M-18 -7 v7 M18 -7 v7" stroke="#8A6A4A" stroke-width="3"/></g>',
  teich: '<g transform="translate(40 500)"><ellipse cx="0" cy="0" rx="32" ry="10" fill="#5BA3E0"/><ellipse cx="-6" cy="-2" rx="18" ry="5" fill="#8FC6F0" opacity=".7"/><ellipse class="i-ripple" style="transform-origin:8px 2px" cx="8" cy="2" rx="6" ry="2" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/><path d="M26 -2 q4 -12 2 -18 M30 -2 q1 -9 5 -14" stroke="#4E9E4A" stroke-width="1.8" fill="none"/></g>',
  giesskanne: '<g transform="translate(160 492)"><path d="M0 0 h16 v-12 h-16z" fill="#7AB8FF"/><path d="M16 -8 l10 -7" stroke="#7AB8FF" stroke-width="2.6" stroke-linecap="round"/><path d="M3 -12 a5 5 0 0 1 10 0" stroke="#7AB8FF" stroke-width="2" fill="none"/></g>',
  gluehwuermchen: [[70, 350], [140, 380], [250, 340], [300, 410], [40, 410], [210, 470]].map(([x, y], i) => `<circle class="lvg-ffly" style="--fd:${4 + i % 3}s;--fo:-${i}s" cx="${x}" cy="${y}" r="2" fill="#FFF3A0"/>`).join(''),
};
const LVG_DEKO_BOX = { blumen: [14, 336, 44, 36], pilzring: [296, 486, 48, 28], laterne: [290, 298, 52, 56], vogelhaus: [70, 302, 52, 52], windrad: [206, 264, 52, 52],
  bank: [204, 478, 56, 36], teich: [2, 470, 80, 44], giesskanne: [150, 466, 44, 32], gluehwuermchen: [30, 336, 290, 150] };
const LVG_DEKO_ICON = (id) => { const [x, y, w, h] = LVG_DEKO_BOX[id] || [0, 0, LVG_W, LVG_H]; return `<svg viewBox="${x} ${y} ${w} ${h}" width="44" height="40" aria-hidden="true"${id === 'gluehwuermchen' ? ' style="background:#173030;border-radius:10px"' : ''}>${LVG_DEKO_ART[id] || ''}</svg>`; };
const LVG_SEASON = { herbst: 'Herbst', winter: 'Winter', fruehling: 'Frühling', sommer: 'Sommer', nacht: 'Nacht' };

/* ---------- Daten ---------- */
function lvG(r) {
  r = r || lvNow(); if (!r) return null;
  return levelGarden(lvSrcFromState(state), state.level, lvToday(), r);
}
const lvMon = (id) => [].concat(LV_STARTERS, LV_MONTHLY, LV_BONUS).find((m) => m.id === id);
// Sammlung inkl. Bonus-Monster aus dem Garten und schillernder Freundschaftsbesuche
function lvCollectionAll(r, g) {
  const c = levelCollection(r); g = g || lvG(r); if (!g) return c;
  const list = c.list.map((o) => Object.assign({}, o, { shiny: o.shiny || !!(g.owned[o.id] && g.owned[o.id].shiny) }));
  LV_BONUS.forEach((b) => { const o = g.owned[b.id]; if (o && o.via === 'garden') list.push({ id: b.id, forms: o.forms, tpl: b.tpl, shiny: o.shiny, bonus: true }); });
  return Object.assign({}, c, { list, monsters: list.length, forms: list.reduce((a, b) => a + b.forms, 0) });
}
function lvSeasonKey(now = new Date()) {
  const h = now.getHours(), m = now.getMonth() + 1;
  if (h >= 21 || h < 6) return 'nacht';
  return m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'fruehling' : m <= 8 ? 'sommer' : 'herbst';
}
// Bewohner: aktuelles Monster, Starter, gewachsene Bonus-Monster, frühere Monatsmonster (neueste zuerst)
function lvResidents(r, g) {
  const out = [], seen = new Set();
  const add = (id, tpl, name, shiny, type) => { if (!seen.has(id) && out.length < LVG_SLOTS.length) { seen.add(id); out.push({ id, tpl, name, shiny, type }); } };
  const c = lvCurrent(r);
  if (c.tpl != null) add(c.monster.id, c.tpl, c.name, c.shiny || !!(g.owned[c.monster.id] && g.owned[c.monster.id].shiny), c.type);
  add(r.starter.id, r.starterTpl, r.starter.forms[r.starterStage], r.starterShiny || !!(g.owned[r.starter.id] && g.owned[r.starter.id].shiny), r.starter.type);
  g.resident.slice().reverse().forEach((id) => { const b = lvMon(id); add(id, b.tpl + 1, b.forms[1], g.owned[id].shiny, b.type); });
  r.months.slice().reverse().forEach((m) => { if (m.form >= 0) add(m.monster.id, m.monster.tpl + m.form, m.monster.forms[m.form], m.shiny || !!(g.owned[m.monster.id] && g.owned[m.monster.id].shiny), m.monster.type); });
  return out;
}

/* ---------- Szene ---------- */
function lvgPct(x, y, size) { return `left:${(x / LVG_W * 100).toFixed(2)}%;top:${((y + LVG_DY) / LVG_H * 100).toFixed(2)}%;width:${(size / LVG_W * 100).toFixed(2)}%`; }
function lvGardenScene(r, g, o = {}) {
  const season = o.season || lvSeasonKey(), night = season === 'nacht';
  let deko = g.deko.map((id) => LVG_DEKO_ART[id] || '').join('');
  if (night && g.deko.includes('laterne')) deko += '<circle class="i-glow" cx="328" cy="314" r="38" fill="#FFE08A" opacity=".25"/>';
  const plotHtml = LVG_PLOTS.map(([x, y], i) => {
    const p = g.plots[i];
    if (i >= g.maxPlots) return `<div class="lvg-in" style="${lvgPct(x - 12, y - 34, 24)}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 11 v-3 a5 5 0 0 1 10 0 v3" stroke="#93A0B4" stroke-width="2" fill="none"/><rect x="5" y="11" width="14" height="9" rx="2.5" fill="#93A0B4"/></svg></div>`;
    if (!p) return '';
    if (p.stage === 'egg') return `<div class="lvg-in" style="${lvgPct(x - 16, y - 40, 32)}">${p.kind === 'sow' ? '<svg viewBox="0 0 64 64" aria-hidden="true"><g class="i-swayslow" style="transform-origin:32px 60px;--x:0s"><path d="M32 60 V36" stroke="#5FB878" stroke-width="4" stroke-linecap="round"/><path d="M32 42 c-11 0 -16 -6 -16 -14 c11 0 16 6 16 14z M32 40 c10 0 14 -6 14 -12 c-10 0 -14 6 -14 12z" fill="#5FB878"/></g></svg>' : lvEgg('100%')}</div>`;
    const b = lvMon(p.id);
    return `<div class="lvg-in" style="${lvgPct(x - 24, y - 50, 48)}">${lvArt(b.tpl, '100%', { shiny: g.owned[p.id] && g.owned[p.id].shiny })}</div>`;
  }).join('');
  const res = lvResidents(r, g).map((m, i) => {
    const [x, y, sz, wd] = LVG_SLOTS[i];
    const w = wd && !o.still ? ` class="lvg-wander" style="--wx:${(wd[0] / sz * 100).toFixed(0)}%;--wd:${wd[1]}s;--wo:-${wd[2]}s"` : '';
    const tag = o.small ? 'span' : 'button', at = o.small ? '' : ` data-lvgm="${esc(m.name)}" aria-label="${esc(m.name)}"`;
    return `<div class="lvg-in" style="${lvgPct(x, y, sz)}"><div${w}><${tag} class="lvg-mon"${at}>${lvArt(m.tpl, '100%', { shiny: m.shiny })}</${tag}></div></div>`;
  }).join('');
  const vt = o.small ? 'span' : 'button';
  const v = g.visitor && !g.visitor.done ? `<div class="lvg-in lvg-vis" style="${lvgPct(152, 198, 52)}"><${vt} class="lvg-mon" ${o.small ? '' : `id="lvgVis" aria-label="Besuch: ${esc(lvMon(g.visitor.id).forms[0])}"`}>${lvArt(lvMon(g.visitor.id).tpl, '100%', { shiny: g.visitor.shiny })}<span class="lvg-q">?</span></${vt}></div>` : '';
  const now = new Date();
  return `<div class="lvg-stage ${o.small ? 'small' : ''} ${state.level.lively === false ? 'lv-calm' : ''}">${GARDEN_SCENES[season]}
    <svg class="lvg-deko" viewBox="0 0 ${LVG_W} ${LVG_H}" aria-hidden="true">${deko}</svg>${plotHtml}${res}${v}
    ${o.small ? '' : `<div class="lvg-tag">${LVG_SEASON[season]} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}</div><div class="lvg-bubble" id="lvgBubble" hidden></div>`}</div>`;
}

/* ---------- Kachel im Fortschritt ---------- */
function lvGardenTeaser(r) {
  const g = lvG(r); if (!g) return '';
  const vis = g.visitor && !g.visitor.done;
  return `<button class="card lvg-teaser" id="lvGarden"><div class="lvg-tprev">${lvGardenScene(r, g, { small: true, still: true })}</div>
    <div class="lvg-tt"><b>Garten</b><span class="small muted">${g.samen} Samen · Beet ${g.plots.length}/${g.maxPlots}${vis ? ' · <span class="lvg-new">Besuch!</span>' : ''}</span></div></button>`;
}
function lvBindGardenTeaser() { const b = $('#lvGarden'); if (b) b.onclick = () => lvOpenGarden(); }

/* ---------- Garten-Seite ---------- */
function lvOpenGarden(scrollTo) {
  const r = lvNow(); if (!r) return;
  const g = lvG(r), today = lvToday();
  const rk = g.rank, nxt = rk.next;
  const pct = nxt ? (g.earned - LV_RANKS[rk.i][1]) / (nxt.need - LV_RANKS[rk.i][1]) : 1;
  const plots = LVG_PLOTS.map((_, i) => {
    const p = g.plots[i];
    if (i >= g.maxPlots) return `<div class="lvg-plot lock"><div class="lvg-pa">${lvLockSvg()}</div><b>Gesperrt</b><small>ab Rang Kartograf</small></div>`;
    if (!p) return `<button class="lvg-plot free" data-sow ${g.samen < LV_GARDEN.sow ? 'aria-disabled="true"' : ''}><div class="lvg-pa"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="#B9E07A" stroke-width="2.4" stroke-linecap="round"/></svg></div><b>Frei</b><small>${LV_GARDEN.sow} Samen säen</small></button>`;
    const b = p.id && lvMon(p.id);
    if (p.stage === 'egg') return `<div class="lvg-plot" style="--c:#B9E07A"><div class="lvg-pa">${p.kind === 'sow' ? lvSproutSvg() : lvEgg(54)}</div><b>${p.kind === 'sow' ? 'Gesät' : esc(b.forms[0]) + '-Ei'}</b><small>${p.kind === 'sow' ? 'Überraschung · ' : ''}noch ${LV_GARDEN.hatchDays - p.t} ${LV_GARDEN.hatchDays - p.t === 1 ? 'Tag' : 'Tage'}</small></div>`;
    return `<div class="lvg-plot" style="--c:${LV_TC[b.type]}"><div class="lvg-pa">${lvArt(b.tpl, 56, { shiny: g.owned[p.id] && g.owned[p.id].shiny })}</div><b>${esc(b.forms[0])}</b><small>wächst · ${p.grow}/${LV_GARDEN.growDays} ${esc(b.type)}-Tage</small></div>`;
  }).join('');
  const deko = LV_DEKO.filter((d) => !d.gift || g.deko.includes(d.id)).map((d) => {
    const own = g.deko.includes(d.id);
    return `<button class="lvg-dk ${own ? 'own' : ''}" ${own ? 'disabled' : `data-deko="${d.id}"`} ${!own && g.samen < d.cost ? 'aria-disabled="true"' : ''}>${LVG_DEKO_ICON(d.id)}<b>${esc(d.name)}</b><small>${own ? (d.gift ? 'Mitbringsel' : 'im Garten') : `${d.cost} Samen`}</small></button>`;
  }).join('');
  const vis = g.visitor && !g.visitor.done ? lvVisitorCard(g, true) : '';
  openSheet(`${sheetHead('lvgClose', 'Garten')}
    <p class="small muted" style="margin:-4px 2px 10px">${lvResidents(r, g).length} Bewohner · ${rk.name}</p>
    ${lvGardenScene(r, g)}
    <div class="lvg-stats"><div><b class="lvg-seed">${lvSeedSvg(16)} ${g.samen}</b><small>Samen</small></div><div><b>${g.plots.length}/${g.maxPlots}</b><small>Beet</small></div><div><b>${g.deko.length}</b><small>Deko</small></div></div>
    ${vis}
    <div class="card" id="lvgBeet"><div class="lv-sh"><h2>Beet</h2><span class="small muted">Eier schlüpfen nach ${LV_GARDEN.hatchDays} getrackten Tagen</span></div><div class="lvg-plots">${plots}</div>
      <p class="small muted" style="margin:8px 0 0">Eingeladene Besucher kommen als Ei ins Beet. Säen bringt eine Überraschung – gewichtet nach den Gemüsen deiner Woche. Ist ein Monster ausgewachsen, zieht es in den Garten.</p></div>
    <div class="card"><div class="lv-sh"><h2>Deko</h2><span class="small muted">mit Samen</span></div><div class="lvg-dks">${deko}</div></div>
    <div class="card"><div class="lv-sh"><h2>Entdecker-Rang</h2><span class="small muted">${g.earned} Samen gesammelt</span></div>
      <div class="lvg-rank"><b>${rk.name}</b>${nxt ? `<span class="small muted">noch ${nxt.need - g.earned} bis ${nxt.name}</span>` : '<span class="small muted">höchster Rang</span>'}</div>
      <div class="lv-bar"><span style="width:${Math.round(Math.min(1, pct) * 100)}%;background:#B9E07A"></span></div>
      <ul class="lvg-earn small"><li><span>Neues Lebensmittel scannen oder anlegen</span><b>+${LV_SAMEN.scan}</b></li><li><span>Fehlenden Wert ergänzen</span><b>+${LV_SAMEN.fill}</b></li><li><span>Lebensmittel teilen (1× pro Woche)</span><b>+${LV_SAMEN.share}</b></li><li><span>Mitbringsel von Beet-Monstern</span><b>+5–10</b></li></ul>
      <p class="small muted" style="margin:6px 0 0">Höchstens ${LV_GARDEN.dayCap} Samen pro Tag aus Datenpflege. Der Rang zählt alle je gesammelten Samen, Ausgeben senkt ihn nicht.</p></div>
    <div class="card lvg-why small muted">Besucher kommen an etwa 4 von 10 Tagen, an denen ein Gemüse im Journal steht – es zählt nur, ob es vorkam, nie wie viel. Wer nicht eingeladen wird, kommt später wieder.</div>
    <div style="height:16px"></div>`);
  $('#lvgClose').onclick = closeSheet;
  lvBindVisitor(g, () => lvOpenGarden(), $('#sheet'));
  document.querySelectorAll('[data-sow]').forEach((b) => b.onclick = () => {
    if (g.samen < LV_GARDEN.sow) { toast(`Noch ${LV_GARDEN.sow - g.samen} Samen bis zum Säen`); return; }
    levelGardenAct(state, { a: 'sow' }, today); save(); toast(`Gesät – schlüpft nach ${LV_GARDEN.hatchDays} getrackten Tagen`); lvOpenGarden('beet');
  });
  document.querySelectorAll('[data-deko]').forEach((b) => b.onclick = () => {
    const d = LV_DEKO.find((x) => x.id === b.dataset.deko);
    if (g.samen < d.cost) { toast(`Noch ${d.cost - g.samen} Samen für ${d.name}`); return; }
    levelGardenAct(state, { a: 'deko', m: d.id }, today); save(); toast(`${d.name} steht jetzt im Garten`); lvOpenGarden();
  });
  const bub = $('#lvgBubble');
  document.querySelectorAll('[data-lvgm]').forEach((b) => b.onclick = () => {
    if (!bub) return; const st = b.closest('.lvg-stage').getBoundingClientRect(), br = b.getBoundingClientRect();
    bub.textContent = b.dataset.lvgm; bub.hidden = false; bub.style.left = `${Math.max(4, br.left - st.left + br.width / 2 - 40)}px`; bub.style.top = `${Math.max(4, br.top - st.top - 26)}px`;
    b.classList.remove('lv-boing'); void b.offsetWidth; b.classList.add('lv-boing');
    clearTimeout(bub._t); bub._t = setTimeout(() => { bub.hidden = true; }, 1600);
  });
  const gv = $('#lvgVis'); if (gv) gv.onclick = () => { const c = $('#sheet').querySelector('#lvgVisCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  if (scrollTo === 'beet') { const el = $('#lvgBeet'); if (el) el.scrollIntoView({ block: 'start' }); }
}
const lvLockSvg = () => '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M7 11 v-3 a5 5 0 0 1 10 0 v3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="5" y="11" width="14" height="9" rx="2.5" fill="currentColor"/></svg>';
const lvSproutSvg = () => '<svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true"><path d="M14 54 Q32 48 50 54 L48 60 H16z" fill="#6B4A2E"/><g class="i-swayslow" style="transform-origin:32px 52px;--x:0s"><path d="M32 52 V34" stroke="#5FB878" stroke-width="3" stroke-linecap="round"/><path d="M32 40 c-9 0 -13 -5 -13 -11 c9 0 13 5 13 11z M32 38 c8 0 11 -5 11 -10 c-8 0 -11 5 -11 10z" fill="#5FB878"/></g></svg>';
const lvSeedSvg = (s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="vertical-align:-2px"><path d="M12 3 C18 7 18 15 12 21 C6 15 6 7 12 3z" fill="#B9E07A"/><path d="M12 6 V18" stroke="#7FA94E" stroke-width="1.4"/></svg>`;

/* ---------- Besucher (Journal und Garten) ---------- */
function lvVisitorFood(type) {
  const e = (state.days[lvToday()] || []).find((x) => lvFoodTypes(x.n).includes(type));
  return e ? e.n.split(',')[0] : '';
}
function lvVisitorCard(g, inGarden) {
  const v = g.visitor, m = lvMon(v.id), food = lvVisitorFood(v.type);
  const full = g.plots.length >= g.maxPlots, poor = g.samen < v.cost;
  let txt, btns;
  if (v.kind === 'new') {
    txt = full ? 'Dein Beet ist voll – es wartet höflich und kommt wieder.' : poor ? `Einladen kostet ${v.cost} Samen, dir fehlen noch ${v.cost - g.samen}. Es kommt wieder.` : `Lädst du es ein, kommt ein Ei ins Beet. Es schlüpft nach ${LV_GARDEN.hatchDays} getrackten Tagen.`;
    btns = `<button class="btn" data-lvinv ${full || poor ? 'disabled' : ''}>Einladen · ${v.cost} ${lvSeedSvg(14)}</button>${inGarden ? '' : '<button class="btn ghost" data-lvlater>Später</button>'}`;
  } else {
    txt = 'Ein alter Bekannter schaut auf einen Freundschaftsbesuch vorbei.';
    btns = `<button class="btn" data-lvfriend>Hallo sagen</button>${inGarden ? '' : '<button class="btn ghost" data-lvlater>Später</button>'}`;
  }
  return `<div class="card lvg-visit" id="lvgVisCard" style="--c:${LV_TC[v.type]}"><div class="lvg-va">${lvArt(m.tpl + (v.kind === 'friend' && g.owned[v.id] ? Math.max(0, (g.owned[v.id].forms || 1) - 1) : 0), 72)}</div>
    <div class="lvg-vt"><div class="lv-kicker">${v.kind === 'new' ? 'Besuch!' : 'Freundschaftsbesuch'}</div><b>${esc(v.kind === 'new' ? m.forms[0] : lvMonName(v.id, g))} schaut vorbei</b>
      <div class="small muted">${food ? `angelockt von ${esc(food)} · ` : ''}${lvChip(v.type)}</div><p class="small" style="margin:6px 0 8px">${txt}</p><div class="lvg-vb">${btns}</div></div></div>`;
}
function lvMonName(id, g) { const m = lvMon(id), o = g.owned[id]; return m.forms[Math.max(0, Math.min(m.forms.length - 1, ((o && o.forms) || 1) - 1))]; }
function lvVisitorHtml(iso) {
  const lv = state.level;
  if (!lv || !lv.enabled || !lv.starter || iso !== lvToday() || (lv.garden && lv.garden.later === iso)) return '';
  const g = lvG(); if (!g || !g.visitor || g.visitor.done) return '';
  return lvVisitorCard(g, false);
}
function lvBindVisitor(g, after, root) {
  root = root || document;
  const today = lvToday();
  g = g || lvG(); if (!g || !g.visitor) return;
  const v = g.visitor, m = lvMon(v.id);
  const inv = root.querySelector('[data-lvinv]');
  if (inv) inv.onclick = () => { levelGardenAct(state, { a: 'invite', m: v.id }, today); save(); toast(`${m.forms[0]}-Ei liegt im Beet`); (after || render)(); };
  const fr = root.querySelector('[data-lvfriend]');
  if (fr) fr.onclick = () => {
    levelGardenAct(state, { a: 'friend', m: v.id }, today); save();
    if (v.shiny) { const n = lvMonName(v.id, g), o = g.owned[v.id]; lvShowHatch(m.tpl + Math.max(0, ((o && o.forms) || 1) - 1), n, 'schillernd – jetzt in deiner Sammlung', true); }
    else toast(`${lvMonName(v.id, g)} freut sich über den Besuch`);
    (after || render)();
  };
  const la = root.querySelector('[data-lvlater]');
  if (la) la.onclick = () => { state.level.garden.later = today; save(); (after || render)(); };
}

/* ---------- Ereignisse: Schlüpfen/Wachsen im Beet, Mitbringsel ---------- */
function lvGardenEvents(r) {
  const lv = state.level, g = lvG(r); if (!g) return false;
  const evs = g.log.filter((x) => x.kind === 'hatch' || x.kind === 'grow');
  if (lv.gseen == null) { lv.gseen = evs.length; save(); return false; }
  if (evs.length > lv.gseen) {
    const e = evs[lv.gseen]; lv.gseen++; save();
    const b = lvMon(e.id), sh = g.owned[e.id] && g.owned[e.id].shiny;
    if (e.kind === 'hatch') lvShowHatch(b.tpl, b.forms[0], 'im Beet geschlüpft · Bonus-Monster', sh);
    else lvShowEvo(b.tpl, b.tpl + 1, b.forms[1], 'ausgewachsen · zieht in den Garten', sh);
    return true;
  }
  if (evs.length < lv.gseen) lv.gseen = evs.length;
  const gf = g.gift;
  if (gf && !gf.claimed) {
    const b = lvMon(gf.from), deko = gf.deko && LV_DEKO.find((x) => x.id === gf.deko);
    const name = lvMonName(gf.from, g);
    lvOverlay(`<div class="lv-ovk">Mitbringsel</div><div class="lv-ovn" style="font-size:1.35rem;margin-top:4px">${esc(name)} hat etwas dagelassen</div>
      <div class="lvg-gift">${lvArt(b.tpl + Math.max(0, ((g.owned[gf.from] || {}).forms || 1) - 1), 120, { shiny: g.owned[gf.from] && g.owned[gf.from].shiny })}
        <div class="lvg-gbox">${deko ? LVG_DEKO_ICON(deko.id) + `<b>${esc(deko.name)}</b>` : `${lvSeedSvg(30)}<b>+${gf.n}</b>`}</div></div>
      <p class="small muted" style="max-width:300px">Monster im Beet und Garten bringen ab und zu etwas mit, wenn du die App öffnest – höchstens eins pro Tag.</p>
      <button class="btn block" data-close style="margin-top:14px">Danke, ${esc(name)}!</button>`, 0, () => {
      lv.garden = lv.garden || { acts: [], gifts: {} }; lv.garden.gifts = lv.garden.gifts || {}; lv.garden.gifts[lvToday()] = 1; save(); render();
    });
    return true;
  }
  return false;
}
function lvVisitorDot() { const lv = state.level; if (!lv || !lv.starter || (lv.garden && lv.garden.later === lvToday())) return ''; const g = lvG(); return g && g.visitor && !g.visitor.done ? '<i class="lv-dot" aria-label="Besuch"></i>' : ''; }
