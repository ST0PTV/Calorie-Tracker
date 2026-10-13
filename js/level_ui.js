/* Level-System „Gemüsemonster“ – Oberfläche (Etappe 1: Chip, Fortschritt, Starter, Schlüpfen/Entwickeln, Einstellungen).
   Nutzt js/level.js (Berechnung) und js/monster_art.js (Grafik). Belohnt nur Dranbleiben – nie weniger Essen. */
'use strict';

const LV_TC = { Frucht: '#E8503E', Blatt: '#5FB878', Wurzel: '#F2A65A', Pilz: '#9A7ADA', Zwiebel: '#C9A47A', Spross: '#9FD07A', 'Hülse': '#8FD46B', 'Legendär': '#F5C76B' };
const LV_TTEXT = Object.assign({}, LV_TC, { Frucht: '#FF7A66', Pilz: '#B49BEA' }); // Text auf Chips: Kontrast ≥ 4,5 : 1
const LV_CHAR = {
  moehri: 'mutig und stur', erbsi: 'Teamplayer', tomi: 'heißblütig', brokki: 'verschlafen', kuerbi: 'lacht laut', pepi: 'schüchtern', radl: 'flink', zwibbel: 'nah am Wasser gebaut',
  gurki: 'cool', aubi: 'adlig', sprossi: 'unter Strom', spori: 'verträumt', beti: 'geheimnisvoll', lauchling: 'weise',
};
const LV_FORM = ['Baby', 'Normalform', 'Superform'];
const LV_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/* ---------- Grafik-Helfer ---------- */
function lvHls(hex) {
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, l, 0];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, l, s];
}
function lvRgb(h, l, s) {
  if (!s) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const LV_SKIP = new Set(['1B1E27', '2A0E08', 'FFFFFF', 'F4F6FA', 'E6E9EF', 'F0E6FF']);
// Schillernd: Farbton aller Monsterfarben drehen + Funkeln
function lvShiny(svg, shift = 0.42) {
  const out = svg.replace(/((?:fill|stroke)=")#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?=")/g, (m, a, h) => {
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (LV_SKIP.has(h.toUpperCase())) return m;
    const [hh, ll, ss] = lvHls(h);
    if (ll < 0.16 || ll > 0.9 || ss < 0.12) return m;
    const rgb = lvRgb((hh + shift) % 1, Math.min(0.82, ll * 1.06), Math.min(1, ss * 1.1));
    return a + '#' + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  });
  const stars = [[8, 14, 1.1, 0], [58, 20, 0.9, -0.8], [54, 52, 1, -1.6], [10, 46, 0.8, -1.1]].map(([x, y, s, d]) =>
    `<g class="i-twinkle" style="transform-origin:${x}px ${y}px;--x:${d}s"><path transform="translate(${x} ${y}) scale(${s})" d="M0 -3 L.9 -.9 3 0 .9 .9 0 3 -.9 .9 -3 0 -.9 -.9z" fill="#FFE97A"/></g>`).join('');
  return out.replace(/<\/svg>$/, stars + '</svg>');
}
function lvCostume(tpl, kind, scarfCol) {
  const a = MONSTER_ANCHOR['t' + tpl]; if (!a) return '';
  let s = '';
  if (scarfCol && a[1]) {
    const [x, y, w] = a[1];
    s += `<path d="M${x - w / 2} ${y - 2} Q${x} ${y + 2} ${x + w / 2} ${y - 2} L${x + w / 2} ${y + 2} Q${x} ${y + 6} ${x - w / 2} ${y + 2}z" fill="${scarfCol}"/><path d="M${x + w / 4} ${y + 2} l1.6 9 l4 -1 l-2.2 -8z" fill="${scarfCol}"/>`;
  }
  if (kind && MONSTER_HATS[kind]) { const [x, y, sc] = a[0]; s += `<g transform="translate(${x} ${y}) scale(${sc})">${MONSTER_HATS[kind]}</g>`; }
  return s;
}
function lvArt(tpl, size, o = {}) {
  let s = MONSTER_ART['t' + tpl]; if (!s) return '';
  s = s.replace(/%S%/g, size).replace('%C%', o.costume || o.scarf ? lvCostume(tpl, o.costume, o.scarf) : '');
  if (o.shiny) s = lvShiny(s);
  return o.still ? `<span class="mon-still">${s}</span>` : s;
}
function lvSil(tpl, size) {
  return (MONSTER_PLAIN['t' + tpl] || '').replace('class="m"', `width="${size}" height="${size}" class="lv-sil" style="overflow:visible;flex:none" aria-hidden="true"`)
    .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"').replace(/stroke="(?!none)[^"]*"/g, 'stroke="currentColor"');
}
function lvEgg(size, color = '#F3E7C2', q = true) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="overflow:visible;flex:none"><g class="i-hop" style="transform-origin:32px 58px;--x:0s">
    <ellipse cx="32" cy="59" rx="14" ry="2.4" fill="currentColor" style="color:rgba(var(--fg),0.08)"/><path d="M32 6 C46 6 52 30 52 40 C52 52 43 58 32 58 C21 58 12 52 12 40 C12 30 18 6 32 6z" fill="${color}"/>
    <circle cx="22" cy="30" r="3" fill="#B9E07A" opacity=".8"/><circle cx="41" cy="22" r="2.4" fill="#9A7ADA" opacity=".7"/><circle cx="43" cy="44" r="3.2" fill="#E8503E" opacity=".6"/>
    ${q ? '<text x="32" y="42" text-anchor="middle" font-size="18" font-weight="700" fill="#93A0B4" font-family="Sora,sans-serif">?</text>' : ''}</g></svg>`;
}
function lvChip(t) { return `<span class="lv-chip" style="--c:${LV_TC[t] || '#93A0B4'};--t:${LV_TTEXT[t] || '#93A0B4'}">${esc(t)}</span>`; }
function lvRing(pct, size, color, stroke = 3) {
  const r = size / 2 - stroke, c = 2 * Math.PI * r, h = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" class="lv-ring"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="currentColor" style="color:rgba(var(--fg),0.12)" stroke-width="${stroke}"/>
    <circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(c * Math.max(0, Math.min(1, pct))).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}

/* ---------- Zustand ---------- */
function lvToday() { return isoDate(new Date()); }
function lvNow() {
  const lv = state.level;
  if (!lv || !lv.enabled || !lv.startDate || !lv.starter) return null;
  return levelCompute(lvSrcFromState(state), lv, lvToday());
}
function lvFirstEntry() { return Object.keys(state.days).filter((d) => (state.days[d] || []).length).sort()[0] || null; }
// Das gerade aktive Monster (Monat 1: Starter, danach Monatsmonster)
function lvCurrent(r) {
  if (r.curMonth <= 1 || !r.months.length) {
    return { kind: 'starter', tpl: r.starterTpl, shiny: r.starterShiny, name: r.starter.forms[r.starterStage], type: r.starter.type, form: r.starterStage, monster: r.starter, label: 'Dein Starter' };
  }
  const m = r.months[r.months.length - 1];
  const f = Math.max(m.form, -1);
  return { kind: 'month', month: m, tpl: f >= 0 ? m.monster.tpl + f : null, shiny: m.shiny, name: f >= 0 ? m.monster.forms[f] : 'Monatsei', type: m.monster.type, form: f, monster: m.monster,
    label: `Monster des ${LV_MONTHS[+m.key.slice(5, 7) - 1]}s` };
}
function lvArtCur(c, size, still) { return c.tpl == null ? lvEgg(size) : lvArt(c.tpl, size, Object.assign({ shiny: c.shiny, still }, typeof lvWear === 'function' ? lvWear() : {})); }

/* ---------- Level-Chip im Journal ---------- */
function lvChipHtml() {
  const lv = state.level;
  if (!lv || !lv.enabled) return '';
  if (!lv.starter) return `<button class="lv-chipbtn lv-new" id="lvChip" aria-label="Level-System starten">${lvEgg(30)}<span class="lv-cl"><b>Neu</b><small>Ei wählen</small></span></button>`;
  const r = lvNow(); if (!r) return '';
  const c = lvCurrent(r);
  let pct, sub;
  if (r.next) { const t = LV_CFG.thresholds, a = t[r.xpLevel - 1], b = t[r.xpLevel]; pct = (r.xp - a) / (b - a); sub = `${r.next.need - r.xp} XP`; }
  else if (c.kind === 'month') { pct = c.month.counted / LV_CFG.monthDays; sub = `${Math.min(c.month.counted, LV_CFG.monthDays)}/${LV_CFG.monthDays}`; }
  else { pct = 1; sub = 'max'; }
  return `<button class="lv-chipbtn" id="lvChip" aria-label="Level ${r.level}, ${esc(c.name)} – Fortschritt öffnen">
    <span class="lv-cr">${lvRing(pct, 36, '#5BE7F5', 2.6)}<span class="lv-cm">${lvArtCur(c, 26, true)}</span></span>
    <span class="lv-cl"><b>Lv ${r.level}</b><small>${sub}</small></span>${typeof lvVisitorDot === 'function' ? lvVisitorDot() : ''}</button>`;
}
function lvBindChip() { const b = $('#lvChip'); if (b) b.onclick = () => (state.level.starter ? lvOpenProgress() : lvOpenStart()); }

/* ---------- Fortschritt ---------- */
function lvMonthCal(key, start) {
  const y = +key.slice(0, 4), mo = +key.slice(5, 7), n = new Date(y, mo, 0).getDate(), today = lvToday();
  const cd = lvCountedDays(lvSrcFromState(state), start, today);
  let out = '';
  for (let d = 1; d <= n; d++) {
    const iso = `${key}-${String(d).padStart(2, '0')}`;
    const cls = iso > today ? 'fut' : (state.days[iso] || []).length ? 'on' : cd.pause.has(iso) ? 'pause' : 'off';
    out += `<span class="lv-cd ${cls}${iso === today ? ' today' : ''}" title="${d}."></span>`;
  }
  return out;
}
function lvOpenProgress() {
  const r = lvNow(); if (!r) return;
  const c = lvCurrent(r), col = LV_TC[c.type] || '#5BE7F5';
  const start = new Date(r.start + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  let text, card2 = '';
  if (c.kind === 'starter') {
    const t = LV_CFG.thresholds, nxt = r.next;
    text = nxt ? `Noch <b>${nxt.need - nxt.have} XP</b> bis Level ${r.xpLevel + 1}.${r.xpLevel < 6 ? ' Bei Level 6 entwickelt es sich.' : r.xpLevel < 10 ? ' Bei Level 10 entwickelt es sich.' : ''}` : 'Monat 1 geschafft!';
    const steps = [[0, 'Level 1'], [1, 'Level 6'], [2, 'Level 10']].map(([k, l]) => `<div class="lv-step"><div>${k <= r.starterStage ? lvArt(r.starter.tpl + k, 40, { still: true, shiny: r.starterShiny }) : lvSil(r.starter.tpl + k, 40)}</div><small>${l}</small></div>`).join('');
    card2 = `<div class="card"><div class="lv-sh"><h2>Monat 1 · XP</h2><span class="small muted">${r.xp} XP</span></div>
      <div class="lv-bar"><span style="width:${Math.min(100, r.xp / t[9] * 100)}%;background:#5BE7F5"></span></div><div class="lv-steps">${steps}</div>
      <p class="small muted" style="margin:8px 0 0">XP gibt es fürs Eintragen, vollständige Tage, Scans und gepflegte Lebensmittel – nie für weniger Essen.</p></div>`;
  } else {
    const m = c.month, need = Math.max(0, [1, 10, 20][Math.min(2, m.form + 1)] - m.counted);
    text = m.form >= 2 ? `Superform erreicht – ${LV_MONTHS[+m.key.slice(5, 7) - 1]} geschafft!` : m.form < 0 ? 'Trag heute etwas ein – dann schlüpft das Ei.'
      : `Noch <b>${need} ${need === 1 ? 'Tag' : 'Tage'}</b> bis ${esc(m.monster.forms[m.form + 1])}${m.form === 1 ? ` und Level ${r.level + 1}` : ''}.`;
    const pos = [6, 50, 92];
    const marks = [0, 1, 2].map((k) => `<div class="lv-mk" style="left:${pos[k]}%"><div class="lv-mi">${k <= m.form ? lvArt(m.monster.tpl + k, 36, { still: true, shiny: m.shiny }) : lvSil(m.monster.tpl + k, 36)}</div><small>${['Tag 1', '10 Tage', '20 Tage'][k]}</small></div>`).join('');
    card2 = `<div class="card"><div class="lv-sh"><h2>${LV_MONTHS[+m.key.slice(5, 7) - 1]}</h2><span class="small muted">${Math.min(m.counted, 20)} / 20 Tage</span></div>
      <div class="lv-track"><div class="lv-bar"><span style="width:${Math.min(100, m.counted / 20 * 100)}%;background:${col}"></span></div>${marks}</div>
      <div class="lv-cal" style="--c:${col}">${lvMonthCal(m.key, r.start)}</div>
      <div class="lv-leg"><span><i class="on" style="background:${col}"></i>getrackt</span><span><i class="pause" style="border-color:${col}"></i>Pausetag (zählt mit)</span></div></div>`;
  }
  const coll = typeof lvCollectionAll === 'function' ? lvCollectionAll(r) : levelCollection(r);
  const nextM = r.curMonth < 12 ? new Date(+r.today.slice(0, 4), +r.today.slice(5, 7), 1).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : null;
  openSheet(`${sheetHead('lvClose', 'Fortschritt')}
    <p class="small muted" style="margin:-4px 2px 10px">Level ${r.level} · seit ${start} dabei</p>
    <div class="card lv-hero ${state.level.lively ? '' : 'lv-calm'}">
      <button class="lv-big" id="lvBig" aria-label="${esc(c.name)} antippen" style="--c:${col}">${lvArtCur(c, 108)}</button>
      <div class="lv-ht"><div class="small muted lv-hl">${c.label} ${lvChip(c.type)}${c.shiny ? ' <span class="lv-shiny">✦ schillernd</span>' : ''}</div>
        <div class="lv-name">${esc(c.name)}</div>
        <div class="small muted">${c.form >= 0 ? LV_FORM[c.kind === 'starter' ? Math.min(2, c.form) : c.form] + ' · ' : ''}${esc(LV_CHAR[c.monster.id] || '')}</div>
        <div class="small" style="margin-top:6px">${text}</div></div></div>
    ${card2}
    <div class="lv-two">
      <button class="card lv-tile" id="lvWard">${typeof LVC_HAT_ICON === 'function' ? LVC_HAT_ICON(state.level.costume || 'kuerbis') : ''}<span><small>Kleiderschrank</small><b>${typeof lvWear === 'function' && lvWear(r).costume ? 'Kostüm an' : 'Kostüme'}</b></span></button>
      <button class="card lv-tile" id="lvColl"><span class="lv-cnt">${coll.monsters}/${coll.totalMonsters || 23}</span><span><small>Sammlung</small><b>${coll.forms} Formen</b></span></button>
    </div>
    ${typeof lvGardenTeaser === 'function' ? lvGardenTeaser(r) : ''}
    ${nextM ? `<div class="card lv-next">${lvEgg(46)}<div><b>Nächstes Monatsei</b><div class="small muted">schlüpft am ${nextM} – welches Monster, entscheidet der Zufall.</div></div></div>` : ''}
    <p class="small muted" style="margin:10px 4px 24px">Hier zählt nur, dass du einträgst – nicht, wie viel du isst. Ausgelassene Tage kosten nichts.</p>`);
  $('#lvClose').onclick = closeSheet;
  $('#lvColl').onclick = () => lvOpenCollection();
  $('#lvWard').onclick = () => lvOpenWardrobe();
  if (typeof lvBindGardenTeaser === 'function') lvBindGardenTeaser();
  $('#lvBig').onclick = (ev) => { const b = ev.currentTarget; b.classList.remove('lv-boing'); void b.offsetWidth; b.classList.add('lv-boing'); };
}

/* ---------- Starter wählen ---------- */
function lvOpenStart() {
  const first = lvFirstEntry(), today = lvToday();
  const retro = !!first && first.slice(0, 7) < today.slice(0, 7);
  let pick = state.level.pick || 'erbsi';
  const draw = () => {
    const seed = state.level.seed || 1;
    let head = '';
    if (retro) {
      const tmp = levelCompute(lvSrcFromState(state), { startDate: first, starter: pick, seed }, today);
      const d = new Date(first + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
      head = `<div class="lv-intro"><div class="lv-kicker">Neu: Gemüsemonster</div><h1>Du trackst schon seit dem ${d}</h1><p class="small muted">Deine bisherigen Tage zählen mit. Du startest direkt auf</p></div>
        <div class="card lv-retro">${lvRing(1, 58, '#5BE7F5', 4)}<span class="lv-rl">${tmp.level}</span><div class="small"><b style="font-size:15px">Level ${tmp.level}</b><br><span class="muted">Monat 1 ${tmp.xpLevel >= 10 ? 'geschafft' : `· Level ${tmp.xpLevel}`}<br>${tmp.monthLevels} Monat${tmp.monthLevels === 1 ? '' : 'e'} komplett</span></div></div>
        <h2 class="lv-h2">Wähle deinen Starter</h2><p class="small muted" style="margin:-6px 2px 8px">Er ist schon so weit entwickelt, wie es deine Tage hergeben.</p>`;
    } else {
      head = `<div class="lv-intro"><div class="lv-kicker">Gemüsemonster</div><h1>Welches Ei nimmst du?</h1><p class="small muted">Dein Starter schlüpft heute und entwickelt sich im ersten Monat zweimal – bei Level 6 und 10. Belohnt wird nur, dass du dranbleibst – nie, wie viel du isst.</p></div>`;
    }
    const opts = LV_STARTERS.map((s) => `<button class="lv-st ${s.id === pick ? 'sel' : ''}" data-st="${s.id}" aria-pressed="${s.id === pick}">
        <span class="lv-sta">${retro ? [0, 1, 2].map((k) => lvArt(s.tpl + k, [30, 38, 50][k], { still: true })).join('') : `${lvEgg(64, { Wurzel: '#F2A65A', 'Hülse': '#8FD46B', Frucht: '#E8503E' }[s.type], false)}<span class="lv-stb">${lvArt(s.tpl, 34, { still: true })}</span>`}</span>
        <span class="lv-stt"><b>${s.forms[0]}</b> ${lvChip(s.type)}<small>wird ${s.forms[2]} · ${LV_CHAR[s.id]}</small></span></button>`).join('');
    openSheet(`${sheetHead('lvClose', 'Level-System')}${head}<div class="lv-sts ${retro ? '' : 'egg'}">${opts}</div>
      <button class="btn block" id="lvGo" style="margin-top:14px">${esc(LV_STARTERS.find((s) => s.id === pick).forms[0])} ${retro ? 'wählen' : 'ausbrüten'}</button>
      <button class="btn ghost block" id="lvLater" style="margin:6px 0 24px">Später</button>`);
    $('#lvClose').onclick = closeSheet; $('#lvLater').onclick = closeSheet;
    document.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => { pick = b.dataset.st; draw(); });
    $('#lvGo').onclick = () => {
      Object.assign(state.level, { enabled: true, starter: pick, startDate: retro ? first : today });
      if (!state.level.seed) state.level.seed = lvNewSeed();
      const r = lvNow(); state.level.seen = lvSnap(r); save(); closeSheet();
      lvShowHatch(r.starterTpl, r.starter.forms[r.starterStage], retro ? `Level ${r.level} · rückwirkend` : 'Dein Starter', r.starterShiny);
    };
  };
  if (!state.level.seed) { state.level.seed = lvNewSeed(); save(); }
  draw();
}
function lvNewSeed() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] || 1; } catch (e) { return (Math.random() * 4294967295) >>> 0 || 1; } }

/* ---------- Schlüpfen / Entwickeln (Überlagerung) ---------- */
// Die Abläufe stammen aus den Entwürfen (Schleife); in der App einmal abspielen und am Höhepunkt anhalten.
function lvOverlay(html, holdMs, onClose) {
  const old = document.getElementById('lvOv'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'lvOv'; d.className = 'lv-ov lv-anim'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.innerHTML = `<div class="lv-ovi">${html}</div>`;
  document.body.appendChild(d);
  const t = setTimeout(() => d.classList.add('lv-held'), holdMs);
  const close = () => { clearTimeout(t); d.remove(); if (onClose) onClose(); };
  const btn = d.querySelector('[data-close]'); if (btn) setTimeout(() => { try { btn.focus({ preventScroll: true }); } catch (e) { /* egal */ } }, 50);
  d.querySelectorAll('[data-close]').forEach((b) => b.onclick = close);
  return d;
}
const LV_ZIG = 'L22 33 L28 37 L34 32 L40 37 L46 33 L52 36';
function lvRays(color) {
  let p = ''; for (let k = 0; k < 16; k++) { const a = k * 0.3927, b = a + 0.12; p += `<path d="M50 50 L${(50 + 60 * Math.cos(a)).toFixed(1)} ${(50 + 60 * Math.sin(a)).toFixed(1)} L${(50 + 60 * Math.cos(b)).toFixed(1)} ${(50 + 60 * Math.sin(b)).toFixed(1)}z" fill="${color}" opacity=".08"/>`; }
  return `<svg class="i-rays lv-rays" viewBox="0 0 100 100" aria-hidden="true">${p}</svg>`;
}
function lvShowHatch(tpl, name, sub, shiny) {
  const egg = `<svg width="200" height="200" viewBox="0 0 64 64" aria-hidden="true" style="overflow:visible"><ellipse cx="32" cy="60" rx="14" ry="2.4" fill="rgba(255,255,255,0.08)"/>
    <g class="lvh-eggw lvh-once"><path class="lvh-ebot" d="M12 36 ${LV_ZIG} C52 52 43 58 32 58 C21 58 12 52 12 36z" fill="#F3E7C2"/><path class="lvh-etop" d="M32 6 C46 6 52 30 52 36 L46 33 L40 37 L34 32 L28 37 L22 33 L12 36 C12 30 18 6 32 6z" fill="#F3E7C2"/>
    <path class="lvh-crack" d="M12 36 ${LV_ZIG}" stroke="#1B1E27" stroke-width="1.6" fill="none"/></g></svg>`;
  lvOverlay(`<div class="lv-ovk">${shiny ? '✦ Schillernd!' : 'Es schlüpft …'}</div>
    <div class="lv-stage">${lvRays(shiny ? '#FFE97A' : '#B9E07A')}<div class="lvh-halo lv-glow"></div><div class="lv-abs">${egg}</div>
      <div class="lvh-flash lv-flash"></div><div class="lvh-pop lv-abs lv-hold">${lvArt(tpl, 210, { shiny })}</div></div>
    <div class="lvh-lbl lv-hold lv-ovt"><div class="lv-ovn">${esc(name)}</div><div class="small muted">${esc(sub)}</div></div>
    <button class="btn block" data-close style="margin-top:18px">Weiter</button>`, 5950);
}
function lvShowEvo(fromTpl, toTpl, name, sub, shiny, replay) {
  lvOverlay(`<div class="lv-ovk">${replay ? 'Entwicklung' : 'Es entwickelt sich!'}</div>
    <div class="lv-stage">${lvRays('#F2C230')}<div class="lvh-evglow lv-glow"></div>
      <div class="lvh-aN lv-abs">${lvArt(fromTpl, 190, { shiny })}</div><div class="lvh-aW lvh-white lv-abs">${lvArt(fromTpl, 190, { still: true })}</div>
      <div class="lvh-bW lvh-white lv-abs">${lvArt(toTpl, 220, { still: true })}</div><div class="lvh-evflash lv-flash"></div><div class="lvh-bN lv-abs lv-hold">${lvArt(toTpl, 220, { shiny })}</div></div>
    <div class="lvh-evl lv-hold lv-ovt"><div class="lv-ovn">${esc(name)}</div><div class="small muted">${esc(sub)}</div></div>
    <button class="btn block" data-close style="margin-top:18px">Weiter</button>`, 6400);
}

/* ---------- Ereignisse nach dem Eintragen ---------- */
function lvSnap(r) {
  if (!r) return null;
  const c = lvCurrent(r);
  return { level: r.level, stage: r.starterStage, mk: c.kind === 'month' ? c.month.key : 'm1', form: c.form, today: (state.days[lvToday()] || []).length ? lvToday() : null };
}
function lvAfterRender() {
  const lv = state.level;
  if (!lv || !lv.enabled || !lv.starter || document.getElementById('lvOv')) return;
  const r = lvNow(); if (!r) return;
  if (typeof lvGardenEvents === 'function' && lvGardenEvents(r)) return;
  const now = lvSnap(r), was = lv.seen;
  if (!was) { lv.seen = now; save(); return; }
  const c = lvCurrent(r);
  const done = () => { lv.seen = now; save(); };
  if (now.mk === was.mk && now.form > was.form && c.kind === 'month') {
    done();
    if (was.form < 0) lvShowHatch(c.tpl, c.name, `${c.label} · Baby`, c.shiny);
    else lvShowEvo(c.monster.tpl + was.form, c.tpl, c.name, `${LV_FORM[now.form]}${now.level > was.level ? ` · Level ${now.level}` : ''}`, c.shiny);
    return;
  }
  if (now.mk !== was.mk && c.kind === 'month' && now.form >= 0) { done(); lvShowHatch(c.tpl, c.name, `${c.label} · aus dem Monatsei`, c.shiny); return; }
  if (now.stage > was.stage) { done(); lvShowEvo(r.starter.tpl + was.stage, r.starterTpl, r.starter.forms[r.starterStage], `Level ${now.level}`, r.starterShiny); return; }
  if (now.level > was.level) { done(); if (lv.toasts) toast(`Level ${now.level}! ${c.name} freut sich.`); return; }
  if (now.today && now.today !== was.today) { done(); if (lv.toasts) toast(c.kind === 'month' ? `Tag gezählt · ${c.name} ${Math.min(20, c.month.counted)}/20` : `Tag gezählt · +XP für ${c.name}`); return; }
  if (JSON.stringify(now) !== JSON.stringify(was)) done();
}

/* ---------- Einstellungen ---------- */
function lvSettingsCard() {
  const lv = state.level;
  return `<div class="card" id="lvSet"><h2>Level-System</h2>
    <p class="small muted" style="margin:0 0 6px">Gemüsemonster sammeln – belohnt wird nur, dass du einträgst und Lebensmittel pflegst, nie weniger Essen. Lücken kosten nichts. ${infoBtn('lvRules')}</p>
    <label class="switch"><input type="checkbox" id="lvOn" ${lv.enabled ? 'checked' : ''}> Level-System anzeigen</label>
    <label class="switch"><input type="checkbox" id="lvLively" ${lv.lively !== false ? 'checked' : ''}> Lebhafte Monster (typische Aktionen)</label>
    <label class="switch"><input type="checkbox" id="lvToasts" ${lv.toasts !== false ? 'checked' : ''}> Meldungen beim Eintragen</label>
    ${lv.enabled && lv.starter ? '<button class="btn secondary block" id="lvOpen" style="margin-top:10px">Fortschritt öffnen</button>' : lv.enabled ? '<button class="btn block" id="lvPick" style="margin-top:10px">Starter wählen</button>' : ''}
    <p class="small muted" style="margin:8px 0 0">„Bewegung reduzieren“ auf dem iPhone hält alle Monster an.</p></div>`;
}
function lvBindSettings() {
  const on = $('#lvOn'); if (!on) return;
  on.onchange = () => { state.level.enabled = on.checked; save(); render(); if (on.checked && !state.level.starter) lvOpenStart(); };
  $('#lvLively').onchange = (e) => { state.level.lively = e.target.checked; save(); };
  $('#lvToasts').onchange = (e) => { state.level.toasts = e.target.checked; save(); };
  const o = $('#lvOpen'); if (o) o.onclick = lvOpenProgress;
  const p = $('#lvPick'); if (p) p.onclick = lvOpenStart;
}
var INFO = globalThis.INFO || {}; globalThis.INFO = INFO;
INFO.lvRules = { body: '<p><b>Monat 1:</b> Level 1–10 nach XP fürs Eintragen, vollständige Tage, Scans und gepflegte Lebensmittel. Dein Starter entwickelt sich bei Level 6 und 10.</p><p><b>Danach:</b> 1 Level pro Monat mit 20 gezählten Tagen, ab Jahr 2 pro Quartal mit 60. Jeden Monat schlüpft ein zufälliges Monster: Baby ab Tag 1, Normalform ab 10, Superform ab 20 Tagen.</p><p>Pro Woche zählt ein ausgelassener Tag automatisch mit (Pausetag). Schillernd: 1 zu 15, spätestens beim 6. Schlüpfen.</p><p><b>Nie belohnt:</b> weniger Essen, Defizit, Gewichtsverlust.</p>' };

/* ---------- Begleiter (Glas 2.0): echtes Monster statt Platzhalter ---------- */
function lvCompanion() { const r = lvNow(); return r ? lvCurrent(r) : null; }
function lvCompanionSvg(mood, size) {
  const c = lvCompanion(); if (!c) return '';
  const art = lvArtCur(c, size, mood === 'sleep');
  if (mood !== 'sleep') return `<span class="monster lv-comp">${art}</span>`;
  return `<span class="monster lv-comp sleep">${art}<svg class="lv-zz" viewBox="0 0 24 24" aria-hidden="true"><text x="2" y="16" font-size="11" font-weight="600" fill="var(--lilac)" font-family="Sora,sans-serif">z</text><text x="11" y="9" font-size="8" font-weight="600" fill="var(--lilac)" font-family="Sora,sans-serif">z</text></svg></span>`;
}
