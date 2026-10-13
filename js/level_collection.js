/* Level-System „Gemüsemonster“ – Etappe 3: Sammlung, Sammelkarten, Feldnotizen, Kleiderschrank.
   Berechnung: levelDex / levelCostumes in js/level.js, Texte: js/level_notes.js. Rein kosmetisch – nichts davon hängt an Kalorien. */
'use strict';

const LVC_FORM = { 1: ['Jahresmonster'], 2: ['Form 1 von 2', 'Form 2 von 2'], 3: ['Baby', 'Normalform', 'Superform'] };
const LVC_GROUPS = [['starter', 'Starter'], ['month', 'Monatsmonster'], ['bonus', 'Bonus-Monster'], ['legend', 'Legendär']];
const LVC_SCARF = '#E8503E';
let lvcTab = 'monster';

function lvDex(r) { r = r || lvNow(); if (!r) return null; const g = lvG(r); return levelDex(lvSrcFromState(state), state.level, lvToday(), r, g); }
function lvCostumesNow(r) { r = r || lvNow(); return r ? levelCostumes(lvSrcFromState(state), state.level, lvToday(), r) : []; }
// Getragenes Kostüm (nur wenn freigeschaltet)
function lvWear(r) {
  const id = state.level && state.level.costume; if (!id) return {};
  const c = lvCostumesNow(r).find((x) => x.id === id);
  return c && c.open ? { costume: id, scarf: id === 'muetze' ? LVC_SCARF : null } : {};
}
const lvcDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
function lvcHint(e) {
  if (e.kind === 'starter') return 'anderer Starter · später per Tausch';
  if (e.kind === 'month') return 'kommt aus einem Monatsei';
  if (e.kind === 'bonus') return e.locked ? ({ kichi: 'ab Kartograf oder Monat 4', maisi: 'ab Kartograf oder Monat 4', kohli: 'ab Botaniker oder Monat 8', morchi: 'ab Botaniker oder Monat 8' }[e.id] || 'bald') : `Besuch bei ${e.type}-Gemüse`;
  return 'nach einem Jahr dabei';
}

/* ---------- Sammelkarte ---------- */
function lvCard(e, f, o = {}) {
  const w = o.w || 108;
  if (f >= e.have) {
    return `<div class="lvc-card back" style="--w:${w}px" aria-label="unbekannte Karte"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="none" stroke="#5BE7F5" stroke-width="1.2" opacity=".5"/><circle cx="32" cy="32" r="22" fill="none" stroke="#B9E07A" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<path transform="rotate(${k * 45} 32 32) translate(32 6)" d="M0 0 C2 -2 4.4 -1.6 6 0 C4.4 1.6 2 2 0 0z" fill="#5FB878" opacity=".7"/>`).join('')}<text x="32" y="36" text-anchor="middle" font-size="9" font-weight="700" fill="#E8EEF7" font-family="Sora,sans-serif">GEMÜSE</text><text x="32" y="45" text-anchor="middle" font-size="5.6" fill="#93A0B4" font-family="Sora,sans-serif" letter-spacing="1.5">MONSTER</text></svg>${o.label ? `<span class="lvc-bl">#${e.no}</span>` : ''}</div>`;
  }
  const col = LV_TC[e.type] || '#F5C76B', sh = e.shiny && o.shiny !== false;
  const art = lvArt(e.tpl + f, Math.round(w * 0.62), { shiny: sh, still: o.still });
  const note = (LV_NOTES[e.id] || {}).q || '';
  const found = e.found ? `${e.found.how}${e.found.d ? ' · ' + lvcDate(e.found.d) : ''}` : '';
  return `<div class="lvc-card ${sh ? 'shiny' : ''} ${o.big ? 'big' : ''}" style="--w:${w}px;--c:${sh ? '#FFE97A' : col};--tc:${col}">
    <div class="lvc-h"><b>${esc(e.forms[f])}</b>${o.big ? lvChip(e.type) : ''}</div>
    <div class="lvc-art">${art}</div>
    <div class="lvc-m"><span>#${e.no} · ${LVC_FORM[e.forms.length][f]}</span>${sh ? '<span class="lvc-sh">✦</span>' : ''}</div>
    ${o.big ? `<div class="lvc-q">${esc(note)}</div><div class="lvc-sp"></div><div class="lvc-f"><span>${esc(found)}</span><span>${e.meets}× getroffen</span></div>` : ''}
    ${sh ? '<div class="lvc-holo"></div><div class="lvc-spark"></div>' : ''}</div>`;
}

/* ---------- Sammlung ---------- */
function lvOpenCollection(tab) {
  const r = lvNow(); if (!r) return;
  if (tab) lvcTab = tab;
  const dx = lvDex(r);
  let body;
  if (lvcTab === 'monster') {
    body = LVC_GROUPS.map(([k, t]) => {
      const es = dx.list.filter((e) => e.kind === k);
      return `<div class="lvc-gh">${t}<span>${es.filter((e) => e.have).length}/${es.length}</span></div><div class="lvc-grid">${es.map((e) => {
        const got = e.have > 0, f = Math.max(0, e.have - 1);
        return `<button class="lvc-mon ${got ? '' : 'miss'}" data-dex="${e.id}" style="--c:${LV_TC[e.type] || '#F5C76B'}" aria-label="${got ? esc(e.forms[f]) : 'unbekannt'}">
          <span class="lvc-ma">${got ? lvArt(e.tpl + f, 64, { still: true, shiny: e.shiny }) : lvSil(e.tpl, 64)}</span>
          <b>${got ? esc(e.forms[f]) : '???'}</b><small>${got ? `${'●'.repeat(e.have)}${'○'.repeat(e.forms.length - e.have)}${e.shiny ? ' <i>✦</i>' : ''}` : esc(lvcHint(e))}</small></button>`;
      }).join('')}</div>`;
    }).join('');
  } else {
    body = LVC_GROUPS.map(([k, t]) => {
      const es = dx.list.filter((e) => e.kind === k);
      const cards = es.flatMap((e) => e.forms.map((_, f) => `<button class="lvc-cb" ${f < e.have ? `data-dex="${e.id}" data-f="${f}"` : 'disabled'} aria-label="${f < e.have ? esc(e.forms[f]) : 'Karte fehlt'}">${lvCard(e, f, { w: 100, still: true, label: true })}</button>`));
      return `<div class="lvc-gh">${t}<span>${es.reduce((a, e) => a + e.have, 0)}/${es.reduce((a, e) => a + e.forms.length, 0)}</span></div><div class="lvc-cards">${cards.join('')}</div>`;
    }).join('');
  }
  openSheet(`${sheetHead('lvcClose', 'Sammlung')}
    <div class="lvc-stats"><div><b>${dx.monsters}/${dx.total}</b><small>Monster</small></div><div><b>${dx.forms}/${dx.totalForms}</b><small>Formen</small></div><div><b class="lvc-gold">✦ ${dx.shinies}</b><small>schillernd</small></div></div>
    <div class="seg two lvc-seg" id="lvcSeg"><button type="button" data-t="monster" class="${lvcTab === 'monster' ? 'active' : ''}">Monster</button><button type="button" data-t="karten" class="${lvcTab === 'karten' ? 'active' : ''}">Karten</button></div>
    ${body}
    <button class="btn secondary block" id="lvcTrade" style="margin-top:14px">⇄ Vergleichen & Tauschen</button>
    <p class="small muted" style="margin:12px 4px 24px">Jede Form ist eine Sammelkarte. Schillernde haben einen goldenen Rahmen mit Holo-Schimmer. Gezählt wird nur, ob du dabei warst – nie, wie viel du gegessen hast.</p>`);
  $('#lvcClose').onclick = closeSheet;
  const tb = $('#lvcTrade'); if (tb && typeof lvOpenTrade === 'function') tb.onclick = () => lvOpenTrade();
  document.querySelectorAll('#lvcSeg [data-t]').forEach((b) => b.onclick = () => lvOpenCollection(b.dataset.t));
  document.querySelectorAll('#sheet [data-dex]').forEach((b) => b.onclick = () => lvOpenDex(b.dataset.dex, b.dataset.f != null ? +b.dataset.f : null));
}

/* ---------- Steckbrief mit Karte und Feldnotizen ---------- */
function lvOpenDex(id, f) {
  const r = lvNow(); if (!r) return;
  const dx = lvDex(r), e = dx.list.find((x) => x.id === id); if (!e) return;
  if (!e.have) {
    openSheet(`${sheetHead('lvdBack', '', true)}<div class="lvd-miss">${lvSil(e.tpl, 140)}<h2>Noch nicht entdeckt</h2><p class="small muted">${esc(lvcHint(e))}.</p>${lvChip(e.type)}</div>`);
    $('#lvdBack').onclick = () => lvOpenCollection(); return;
  }
  f = f == null ? e.have - 1 : Math.min(f, e.have - 1);
  const notes = (LV_NOTES[e.id] || { n: [] }).n, need = ['Entdeckt', `Letzte Form (${e.forms[e.forms.length - 1]})`, '10 Begegnungen'];
  const sig = MONSTER_SIG['t' + (e.tpl + f)] || '';
  openSheet(`${sheetHead('lvdBack', esc(e.forms[f]), true)}
    <div class="lvd-stage ${state.level.lively === false ? 'lv-calm' : ''}"><div class="lvd-tilt">${lvCard(e, f, { w: 260, big: true })}</div></div>
    ${e.forms.length > 1 ? `<div class="lvd-forms">${e.forms.map((n, k) => `<button class="${k === f ? 'on' : ''}" ${k < e.have ? `data-f="${k}"` : 'disabled'}>${k < e.have ? lvArt(e.tpl + k, 34, { still: true, shiny: e.shiny }) : lvSil(e.tpl + k, 34)}<small>${k < e.have ? esc(n) : '???'}</small></button>`).join('')}</div>` : ''}
    <div class="card lvd-facts"><div><small>Typ</small>${lvChip(e.type)}</div><div><small>Zuerst getroffen</small><b>${e.found ? `${lvcDate(e.found.d)} · ${esc(e.found.how)}` : '–'}</b></div>
      <div><small>Begegnungen</small><b>${e.meets}</b></div><div><small>Schillernd</small><b>${e.shiny ? '<span class="lvc-gold">✦ ja</span>' : 'noch nicht'}</b></div>
      ${sig ? `<div class="lvd-wide"><small>Typische Aktion</small><b>${esc(sig)}</b></div>` : ''}</div>
    <div class="card"><div class="lv-sh"><h2>Feldnotizen</h2><span class="small muted">${e.notes.filter(Boolean).length} von 3</span></div>
      ${notes.map((t, k) => `<div class="lvd-note ${e.notes[k] ? 'on' : ''}"><span>${e.notes[k] ? '✓' : '?'}</span><p>${e.notes[k] ? esc(t) : `Schalte frei: ${esc(need[k])}`}</p></div>`).join('')}</div>
    ${e.kind !== 'legend' ? `<div class="card"><div class="lv-sh"><h2>Lockt an</h2><span class="small muted">${esc(e.type)}</span></div><div class="lvd-lure">${(LV_LURE[e.type] || '').split(', ').map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      <p class="small muted" style="margin:8px 0 0">Begegnungen zählen Tage, an denen so etwas im Journal stand – nur ob, nie wie viel.</p></div>` : ''}
    <div class="row"><button class="btn secondary" id="lvdShare">Als Bild teilen</button>${e.kind === 'starter' && e.have > 1 ? '<button class="btn secondary" id="lvdEvo">Entwicklung ansehen</button>' : ''}</div>
    <div style="height:20px"></div>`);
  $('#lvdBack').onclick = () => lvOpenCollection();
  document.querySelectorAll('.lvd-forms [data-f]').forEach((b) => b.onclick = () => lvOpenDex(id, +b.dataset.f));
  const sh = $('#lvdShare'); if (sh) sh.onclick = () => lvShareCard(id, f);
  const ev = $('#lvdEvo'); if (ev) ev.onclick = () => lvShowEvo(e.tpl + e.have - 2, e.tpl + e.have - 1, e.forms[e.have - 1], 'Dein Starter', e.shiny, true);
}

/* ---------- Kleiderschrank ---------- */
const LVC_HAT_ICON = (k) => `<svg viewBox="-16 -20 32 24" width="44" height="34" aria-hidden="true">${k ? `<g transform="translate(0 2)">${MONSTER_HATS[k]}</g>` : '<path d="M-6 -6 l12 0" stroke="#93A0B4" stroke-width="1.4" stroke-linecap="round"/>'}</svg>`;
function lvOpenWardrobe() {
  const r = lvNow(); if (!r) return;
  const c = lvCurrent(r), cos = lvCostumesNow(r), cur = state.level.costume || null;
  const wear = lvWear(r);
  const big = c.tpl == null ? lvEgg(200) : lvArt(c.tpl, 220, Object.assign({ shiny: c.shiny }, wear));
  const items = [{ id: null, name: 'Ohne', season: '', open: true }].concat(cos).map((x) => `<button class="lvw-it ${x.id === cur || (!x.id && !cur) ? 'on' : ''} ${x.open ? '' : 'lock'}" ${x.open ? `data-cos="${x.id || ''}"` : 'aria-disabled="true"'} aria-pressed="${x.id === cur}">
      ${LVC_HAT_ICON(x.id)}<b>${esc(x.name)}</b><small>${x.open ? (x.id ? esc(x.season) : 'normal') : x.months ? `${esc(x.season)}: 10 Tage im Monat` : 'nach einem Jahr'}</small></button>`).join('');
  openSheet(`${sheetHead('lvwClose', 'Kleiderschrank')}
    <div class="card lvw-stage ${state.level.lively === false ? 'lv-calm' : ''}" style="--c:${LV_TC[c.type] || '#5BE7F5'}">${big}</div>
    <div class="lvw-who"><div><b>${esc(c.name)}</b><div class="small muted">Begleiter${cur && wear.costume ? ' · trägt ' + esc(cos.find((x) => x.id === cur).name) : ''}</div></div>${lvChip(c.type)}</div>
    <div class="card"><div class="lv-sh"><h2>Kostüme</h2><span class="small muted">${cos.filter((x) => x.open).length + 1} von ${cos.length + 1}</span></div><div class="lvw-grid">${items}</div>
      <p class="small muted" style="margin:8px 0 0">Ein Saison-Kostüm gibt es, sobald du in einem Monat der Saison 10 Tage dabei warst. Verpasst? Nächstes Jahr wieder. Rein kosmetisch – das Kostüm trägt dein Begleiter im Journal, im Garten und im Fortschritt.</p></div>
    <div style="height:20px"></div>`);
  $('#lvwClose').onclick = closeSheet;
  document.querySelectorAll('[data-cos]').forEach((b) => b.onclick = () => { state.level.costume = b.dataset.cos || null; save(); lvOpenWardrobe(); });
}
