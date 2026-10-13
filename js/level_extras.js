/* Level-System „Gemüsemonster“ – Etappe 5: Saison, Monatspostkarte (als Bild teilen), Arena-Duell, Einführung, Einstellungen.
   Nichts davon belohnt Mengen, Kalorien oder Gewicht. Kämpfe geben keine XP und keine Samen – nur das Emblem. */
'use strict';

const LVX_MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
// Saison-Deko (je Monat ein Sammelstück), Ursprung = Fußpunkt, Größe ca. 40 × 40
const LVX_SEA_ART = {
  s01: '<circle cx="0" cy="-10" r="10" fill="#F4F8FB"/><circle cx="0" cy="-26" r="7" fill="#F4F8FB"/><path d="M-7 -30 h14 v-3 h-14z M-4 -33 h8 v-7 h-8z" fill="#2E3A55"/><circle cx="-2.5" cy="-27" r="1" fill="#1B1E27"/><circle cx="2.5" cy="-27" r="1" fill="#1B1E27"/><path d="M0 -25 l5 1.5 -5 1z" fill="#F2A65A"/><path d="M-6 -20 h12" stroke="#5FB878" stroke-width="3"/>',
  s02: '<path d="M-16 -2 h32 M-14 -2 q-4 0 -4 -4" stroke="#8A6A4A" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M-12 -6 h24 v-5 h-24z" fill="#B5302A"/><path d="M-6 -11 q6 -14 12 0z" fill="#9A3B6B"/><path d="M0 -21 q-3 -6 -6 -7 M0 -21 q3 -6 6 -7" stroke="#5FB878" stroke-width="2" fill="none"/>',
  s03: [-8, -3, 2, 7].map((x, k) => `<path d="M${x} 0 q${k % 2 ? 6 : -6} -14 ${k % 2 ? 2 : -2} -26 q${k % 2 ? -8 : 8} 12 -${k % 2 ? 2 : -2} 26z" fill="${k % 2 ? '#4E9E4A' : '#6CBE5E'}"/>`).join('') + '<circle cx="0" cy="-27" r="2" fill="#fff"/><circle cx="4" cy="-24" r="1.6" fill="#fff"/>',
  s04: [-6, -2, 2, 6].map((x) => `<path d="M${x} 0 v-26" stroke="#9FD07A" stroke-width="3.4" stroke-linecap="round"/><path d="M${x - 1.5} -26 l1.5 -4 1.5 4z" fill="#C9B6E8"/>`).join('') + '<path d="M-9 -9 h18" stroke="#E8503E" stroke-width="3"/>',
  s05: '<path d="M-10 0 l-2 -14 h24 l-2 14z" fill="#C9752A"/><path d="M-13 -14 h26 v-3 h-26z" fill="#B0632A"/>' + [-5, 4].map((x) => `<circle cx="${x}" cy="-21" r="4.5" fill="#E85A8A"/><path d="M${x} -25 q-2 -6 -4 -7 M${x} -25 q2 -6 4 -7" stroke="#5FB878" stroke-width="1.6" fill="none"/>`).join(''),
  s06: '<path d="M-12 0 V-34 M12 0 V-34 M-12 -10 h24 M-12 -22 h24 M-12 -34 h24" stroke="#B08A63" stroke-width="2"/>' + [[-6, -14], [4, -26], [-2, -30], [7, -6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.6" fill="#7DBE5E"/><circle cx="${x - 2}" cy="${y}" r="1.1" fill="#B9E07A"/><circle cx="${x + 1}" cy="${y}" r="1.1" fill="#B9E07A"/>`).join(''),
  s07: '<ellipse cx="0" cy="-12" rx="14" ry="12" fill="#3E8A50"/>' + [[-6, -14, '#B5302A'], [4, -8, '#5B3A8A'], [6, -18, '#B5302A'], [-2, -6, '#5B3A8A'], [-9, -6, '#B5302A']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${c}"/>`).join(''),
  s08: '<path d="M0 0 V-34" stroke="#8A6A4A" stroke-width="2.4"/><path d="M0 -8 q-8 -4 -6 -12 M0 -18 q8 -4 6 -12" stroke="#4E9E4A" stroke-width="2" fill="none"/><circle cx="-6" cy="-19" r="4" fill="#E8503E"/><circle cx="6" cy="-29" r="3.6" fill="#E8503E"/><circle cx="-4" cy="-8" r="3" fill="#F2A65A"/>',
  s09: '<path d="M-4 0 h8 l-1 -12 h-6z" fill="#F4E9D8"/><path d="M-14 -12 a14 11 0 0 1 28 0z" fill="#E8503E"/><circle cx="-6" cy="-17" r="2" fill="#fff"/><circle cx="4" cy="-19" r="2.4" fill="#fff"/><circle cx="8" cy="-14" r="1.4" fill="#fff"/>',
  s10: '<ellipse cx="0" cy="-10" rx="14" ry="10" fill="#F2A65A"/><path d="M-6 -20 q-2 10 0 20 M6 -20 q2 10 0 20" stroke="#D9762A" stroke-width="1.2" fill="none"/><path d="M-6 -13 l3 -3 3 3z M3 -13 l3 -3 3 3z" fill="#FFE97A"/><path d="M-6 -6 q6 4 12 0" stroke="#FFE97A" stroke-width="2" fill="none"/><path d="M0 -20 q0 -4 3 -5" stroke="#5F8A3A" stroke-width="2" fill="none"/>',
  s11: '<path d="M0 0 V-36 M-14 -24 h28" stroke="#8A6A4A" stroke-width="2.6"/><circle cx="0" cy="-34" r="5" fill="#E9C9A0"/><path d="M-7 -36 h14 l-3 -5 h-8z" fill="#C9A47A"/><path d="M-8 -26 h16 l-2 12 h-12z" fill="#5BA3E0"/><path d="M-14 -24 l-3 4 M14 -24 l3 4" stroke="#E9C9A0" stroke-width="2"/>',
  s12: '<path d="M-18 -26 q9 8 18 0 q9 8 18 0" stroke="#4A4A54" stroke-width="1.2" fill="none"/>' + [[-14, -23, '#FFE97A'], [-6, -21, '#FF9A6B'], [2, -23, '#5BE7F5'], [10, -21, '#B9E07A'], [16, -24, '#FFE97A']].map(([x, y, c]) => `<circle class="i-twinkle" style="transform-origin:${x}px ${y}px" cx="${x}" cy="${y}" r="2.2" fill="${c}"/>`).join('') + '<path d="M-18 -26 V0 M18 -26 V0" stroke="#8A6A4A" stroke-width="2"/>',
};
const LVX_SEA_SPOTS = [[300, 300], [208, 296], [52, 300]]; // Plätze für die drei neuesten Saison-Stücke (Szenen-Koordinaten inkl. Versatz)
function lvSeasonArt(id, x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})">${LVX_SEA_ART[id] || ''}</g>`; }
function lvSeasonIcon(id, size = 40) { return `<svg viewBox="-22 -44 44 48" width="${size}" height="${size}" aria-hidden="true">${LVX_SEA_ART[id] || ''}</svg>`; }
function lvSeasonDekoSvg(g) { return g.deko.filter((d) => /^s\d\d$/.test(d)).slice(-3).reverse().map((id, k) => lvSeasonArt(id, LVX_SEA_SPOTS[k][0], LVX_SEA_SPOTS[k][1], 0.9)).join(''); }

/* ---------- Saison ---------- */
function lvSeasonCard(r) {
  const se = lvSeasonOf(lvToday()), g = lvG(r), n = g.monthCount[lvToday().slice(0, 7)] || 0, own = g.deko.includes(se.deko.id);
  return `<button class="card lvx-sea" id="lvSeason" style="--c:${LV_TC[se.type]}"><span class="lvx-si">${lvSeasonIcon(se.deko.id, 48)}</span><span class="lvx-st"><span class="lv-kicker" style="color:var(--t)">Saison · bis ${new Date(+lvToday().slice(0, 4), se.m, 0).getDate()}. ${LVX_MON[se.m - 1]}</span>
    <b>${esc(se.name)}</b><small>${esc(se.type)}-Besucher kommen öfter · ${own ? `${esc(se.deko.name)} steht im Garten` : n >= 10 ? `${esc(se.deko.name)} jetzt im Garten erhältlich` : `${Math.min(n, 10)}/10 Tage bis ${esc(se.deko.name)}`}</small></span></button>`;
}
function lvOpenSeason() {
  const r = lvNow(); if (!r) return;
  const today = lvToday(), se = lvSeasonOf(today), g = lvG(r), n = g.monthCount[today.slice(0, 7)] || 0, own = g.deko.includes(se.deko.id);
  const cal = LV_SEASONS.map((x) => `<div class="lvx-cm ${x.m === se.m ? 'on' : ''}" style="--c:${LV_TC[x.type]}"><b>${LVX_MON[x.m - 1].slice(0, 3)}</b><small>${esc(x.name)}</small></div>`).join('');
  const items = LV_SEASONS.map((x) => `<div class="lvx-it ${g.deko.includes(x.deko.id) ? 'own' : ''}" title="${esc(x.deko.name)}">${g.deko.includes(x.deko.id) ? lvSeasonIcon(x.deko.id, 30) : `<small>${LVX_MON[x.m - 1].slice(0, 1)}</small>`}</div>`).join('');
  openSheet(`${sheetHead('lvxClose', 'Saison')}
    <div class="card lvx-now" style="--c:${LV_TC[se.type]}"><div class="lvx-ni">${lvSeasonIcon(se.deko.id, 92)}</div><div><div class="lv-kicker" style="color:var(--c)">Jetzt · bis ${new Date(+today.slice(0, 4), se.m, 0).getDate()}. ${LVX_MON[se.m - 1]}</div>
      <div class="lv-name">${esc(se.name)}</div><div class="small muted">${esc(se.type)}-Besucher kommen doppelt so oft, Freundschaftsbesuche dieses Typs schillern doppelt so oft. Saison-Stück: ${esc(se.deko.name)}.</div></div></div>
    <div class="card"><div class="lv-sh"><h2>${esc(se.deko.name)}</h2><span class="small muted">${own ? 'im Garten' : `${Math.min(n, 10)} / 10 Tage`}</span></div>
      <div class="lv-bar"><span style="width:${Math.min(100, n * 10)}%;background:${LV_TC[se.type]}"></span></div>
      <p class="small muted" style="margin:8px 0 ${own || n < 10 ? 0 : 10}px">${own ? 'Gesammelt – es steht in deinem Garten.' : n >= 10 ? `Freigeschaltet: für ${se.deko.cost} Samen kommt es in den Garten. Nur in diesem Monat.` : 'Bei 10 gezählten Tagen in diesem Monat wird es freigeschaltet. Pausetage zählen mit.'}</p>
      ${!own && n >= 10 ? `<button class="btn block" id="lvxBuy" ${g.samen < se.deko.cost ? 'disabled' : ''}>In den Garten · ${se.deko.cost} ${lvSeedSvg(14)}</button>` : ''}</div>
    <div class="card"><div class="lv-sh"><h2>Saisonkalender</h2><span class="small muted">Typ-Bonus je Monat</span></div><div class="lvx-cal">${cal}</div>
      <p class="small muted" style="margin:8px 0 0">Grob nach deutschem Saisonkalender (aus allgemeinem Wissen, nicht geprüft). Der Bonus verschiebt nur, wer zu Besuch kommt – er belohnt nie eine Menge.</p></div>
    <div class="card"><div class="lv-sh"><h2>Saison-Sammelstücke</h2><span class="small muted">${g.deko.filter((d) => /^s\d\d$/.test(d)).length} von 12</span></div><div class="lvx-its">${items}</div></div>
    <div style="height:20px"></div>`);
  $('#lvxClose').onclick = closeSheet;
  const b = $('#lvxBuy'); if (b) b.onclick = () => { levelGardenAct(state, { a: 'deko', m: se.deko.id }, today); save(); toast(`${se.deko.name} steht jetzt im Garten`); lvOpenSeason(); };
}

/* ---------- Bild erzeugen und teilen (Postkarte, Sammelkarte) ---------- */
function lvStaticArt(tpl, size, shiny) { return lvArt(tpl, size, { shiny, still: true }).replace(/^<span class="mon-still">|<\/span>$/g, '').replace(/class="mon"/, ''); }
async function lvSvgToPng(svg, w, h) {
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image(); img.decoding = 'async';
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0, w, h);
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}
async function lvShareImage(svg, w, h, name) {
  try {
    const blob = await lvSvgToPng(svg, w, h), file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    const u = URL.createObjectURL(blob);
    lvOverlay(`<div class="lv-ovk">Bild</div><img src="${u}" alt="" style="width:100%;max-width:340px;border-radius:18px;margin:12px 0"><p class="small muted">Lange drücken, um das Bild zu sichern oder zu teilen.</p><button class="btn block" data-close>Fertig</button>`, 0);
  } catch (e) { if (!(e && e.name === 'AbortError')) toast('Bild konnte nicht erstellt werden'); }
}
const LVX_FONT = 'font-family="Sora,-apple-system,Helvetica,Arial,sans-serif"';

/* ---------- Monatspostkarte ---------- */
function lvPostcardSvg(pc) {
  const W = 360, H = 470, mn = LVX_MON[+pc.key.slice(5, 7) - 1], y = pc.key.slice(0, 4);
  const art = (tpl, s, x, yy, sh) => `<g transform="translate(${x} ${yy})">${lvStaticArt(tpl, s, sh).replace('<svg ', `<svg x="0" y="0" `)}</g>`;
  const stat = (v, l, x) => `<text x="${x}" y="402" text-anchor="middle" font-size="22" font-weight="700" fill="#3A2E22" ${LVX_FONT}>${v}</text><text x="${x}" y="420" text-anchor="middle" font-size="10" fill="#6B5A44" ${LVX_FONT}>${l}</text>`;
  const guests = pc.guests.map((id, k) => { const m = lvMon(id); return m ? art(m.tpl, 76, 214 + k * 64, 238 - k * 6) : ''; }).join('');
  const quote = pc.lead ? `„${pc.lead.name} sagt danke für einen schönen ${mn}.“` : `„Danke für einen schönen ${mn}.“`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" rx="22" fill="#F6EEDC"/>
    <text x="22" y="40" font-size="11" letter-spacing="1.6" font-weight="700" fill="#9C6B3E" ${LVX_FONT}>GRÜSSE AUS DEM</text>
    <text x="22" y="74" font-size="32" font-weight="700" fill="#3A2E22" ${LVX_FONT}>${mn}</text><text x="22" y="104" font-size="26" font-weight="700" fill="#3A2E22" ${LVX_FONT}>${y}</text>
    <rect x="${W - 86}" y="20" width="64" height="74" rx="6" fill="#FFF8E8" stroke="#C9A47A" stroke-width="2" stroke-dasharray="5 4"/>${lvSeasonArt(pc.season.deko.id, W - 54, 84, 1.05)}
    <rect x="18" y="122" width="${W - 36}" height="230" rx="16" fill="#EFE2C6"/><ellipse cx="${W / 2}" cy="292" rx="140" ry="48" fill="#F2C230" opacity=".22"/>
    ${pc.lead ? art(pc.lead.tpl, 190, 34, 140, pc.lead.shiny) : ''}${guests}
    <path d="M22 370 H${W - 22}" stroke="#C9A47A" stroke-width="1.4" stroke-dasharray="5 4"/>
    ${stat(pc.days, 'Tage dabei', 62)}${stat(pc.visits, 'Besuche', 144)}${stat(pc.done, 'vervollständigt', 226)}${stat('✦ ' + pc.shinies, 'schillernd', 302)}
    <text x="22" y="452" font-size="12" font-style="italic" fill="#6B5A44" ${LVX_FONT}>${esc(quote)}</text></svg>`;
}
function lvLastMonthKey() { const t = lvToday(); const d = new Date(+t.slice(0, 4), +t.slice(5, 7) - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function lvPostcardKeys(r) { const out = []; let k = r.start.slice(0, 7); const last = lvLastMonthKey(); while (k <= last) { out.push(k); const d = new Date(+k.slice(0, 4), +k.slice(5, 7), 1); k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; } return out.reverse(); }
function lvOpenPostcard(key) {
  const r = lvNow(); if (!r) return;
  const keys = lvPostcardKeys(r); if (!keys.length) { toast('Die erste Postkarte kommt am 1. des nächsten Monats'); return; }
  key = key || keys[0];
  const g = lvG(r), pc = levelPostcard(lvSrcFromState(state), state.level, key, r, g);
  const svg = lvPostcardSvg(pc);
  openSheet(`${sheetHead('lvpClose', 'Monatspostkarte')}
    <p class="small muted" style="margin:-4px 2px 10px">Zum Teilen – ohne Kalorien, Mengen oder Gewicht.</p>
    ${keys.length > 1 ? `<div class="lvp-keys">${keys.map((k) => `<button class="${k === key ? 'on' : ''}" data-pk="${k}">${LVX_MON[+k.slice(5, 7) - 1].slice(0, 3)} ${k.slice(2, 4)}</button>`).join('')}</div>` : ''}
    <div class="lvp-card">${svg.replace('<svg ', '<svg class="lvp-svg" ')}</div>
    <button class="btn block" id="lvpShare" style="margin-top:10px">Als Bild teilen</button>
    <p class="small muted" style="margin:10px 4px 24px">Eine neue Karte erscheint am 1. des Folgemonats. Sie zeigt nur Monster und Zähler fürs Dranbleiben.</p>`);
  $('#lvpClose').onclick = closeSheet;
  document.querySelectorAll('[data-pk]').forEach((b) => b.onclick = () => lvOpenPostcard(b.dataset.pk));
  $('#lvpShare').onclick = () => lvShareImage(svg, 360, 470, `gemuesemonster-${key}.png`);
}

/* ---------- Sammelkarte als Bild ---------- */
function lvCardSvg(e, f) {
  const W = 300, H = 430, col = e.shiny ? '#FFE97A' : (LV_TC[e.type] || '#F5C76B'), tc = LV_TC[e.type] || '#F5C76B';
  const note = (LV_NOTES[e.id] || {}).q || '', found = e.found ? `${e.found.how}${e.found.d ? ' · ' + new Date(e.found.d + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#242A42"/><stop offset="1" stop-color="#141A2A"/></linearGradient>
    <radialGradient id="ag" cx=".5" cy=".62"><stop offset="0" stop-color="${tc}" stop-opacity=".45"/><stop offset=".6" stop-color="${tc}" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient></defs>
    <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="22" fill="url(#cg)" stroke="${col}" stroke-width="6"/>
    <text x="20" y="38" font-size="20" font-weight="700" fill="#E8EEF7" ${LVX_FONT}>${esc(e.forms[f])}</text><text x="${W - 20}" y="37" text-anchor="end" font-size="12" font-weight="600" fill="${LV_TTEXT[e.type] || tc}" ${LVX_FONT}>${esc(e.type)}</text>
    <rect x="16" y="52" width="${W - 32}" height="206" rx="14" fill="url(#ag)" stroke="rgba(255,255,255,.08)"/>
    <g transform="translate(${W / 2 - 92} 62)">${lvStaticArt(e.tpl + f, 184, e.shiny)}</g>
    <text x="20" y="282" font-size="11" fill="#93A0B4" ${LVX_FONT}>#${e.no} · ${LVC_FORM[e.forms.length][f]}${e.shiny ? '   ✦ schillernd' : ''}</text>
    <foreignObject x="18" y="292" width="${W - 36}" height="70"><div xmlns="http://www.w3.org/1999/xhtml" style="font:italic 13px/1.4 Sora,-apple-system,Helvetica,sans-serif;color:#E8EEF7">${esc(note)}</div></foreignObject>
    <path d="M18 ${H - 46} H${W - 18}" stroke="rgba(255,255,255,.1)"/><text x="20" y="${H - 24}" font-size="11" fill="#93A0B4" ${LVX_FONT}>${esc(found)}</text><text x="${W - 20}" y="${H - 24}" text-anchor="end" font-size="11" fill="#93A0B4" ${LVX_FONT}>${e.meets}× getroffen</text></svg>`;
}
function lvShareCard(id, f) { const dx = lvDex(); const e = dx && dx.list.find((x) => x.id === id); if (e && e.have) lvShareImage(lvCardSvg(e, f), 300, 430, `${e.forms[f]}.png`); }

/* ---------- Arenen und Duell ---------- */
const LVX_EMB = ['#7FD4E8', '#9C6B3E', '#B5302A', '#B9A6FF', '#5BA3E0', '#8FC6F0', '#F2A65A', '#F5C76B'];
function lvEmblem(i, won, size = 56) {
  const c = LVX_EMB[i % 8], gold = !!won;
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${gold ? '<circle cx="32" cy="32" r="30" fill="#F5C76B" opacity=".18"/>' : ''}
    <path d="M32 4 L54 14 V34 C54 48 44 56 32 60 C20 56 10 48 10 34 V14z" fill="${gold ? '#F2C230' : 'rgba(var(--fg),0.08)'}" stroke="${gold ? '#B5891E' : c}" stroke-width="2"/>
    <circle cx="32" cy="32" r="12" fill="${c}" opacity="${gold ? 0.9 : 0.55}"/><text x="32" y="37" text-anchor="middle" font-size="14" font-weight="700" fill="${gold ? '#5A3E00' : '#E8EEF7'}" font-family="Sora,sans-serif">${i + 1}</text></svg>`;
}
function lvArenaState(r) {
  return LV_ARENAS.map((a, i) => ({ i, a, open: r.curMonth - 1 >= a.after, won: (state.level.arenas && state.level.arenas[i] && state.level.arenas[i].won) || null }));
}
function lvOpenArenas() {
  const r = lvNow(); if (!r) return;
  const ar = lvArenaState(r);
  openSheet(`${sheetHead('lvaClose', 'Arenen')}
    <p class="small muted" style="margin:-4px 2px 10px">Alle drei Monate öffnet eine neue Arena. Ein Sieg vergoldet nur das Emblem – keine XP, keine Samen. Verlieren hat keine Folgen.</p>
    <div class="lva-list">${ar.map((x) => `<button class="card lva-it ${x.open ? '' : 'lock'}" ${x.open ? `data-ar="${x.i}"` : 'aria-disabled="true"'}>${lvEmblem(x.i, x.won, 52)}<span><b>${esc(x.a.name)}</b><small>${x.a.fav.map((t) => t === 'legendär' ? 'Legendäre' : t).join(' · ')}</small><small>${x.won ? `vergoldet am ${new Date(x.won + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : x.open ? 'offen – Duell starten' : `öffnet nach ${x.a.after} Monaten`}</small></span></button>`).join('')}</div>
    <div class="card lva-wheel"><div>${lvTypeWheel()}</div><p class="small"><b>Typenrad</b><br><span class="muted">Pfeil = stark gegen (×1,5), umgekehrt schwach (×0,75). Legendäre ohne Typ. Stärke nur aus Form und Typ.</span></p></div>
    <div style="height:20px"></div>`);
  $('#lvaClose').onclick = closeSheet;
  document.querySelectorAll('[data-ar]').forEach((b) => b.onclick = () => lvOpenTeam(+b.dataset.ar));
}
function lvTypeWheel() {
  const n = LV_TYPES.length; let s = '<svg width="170" height="170" viewBox="-100 -100 200 200" aria-hidden="true"><defs><marker id="lvar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#93A0B4"/></marker></defs>';
  LV_TYPES.forEach((t, k) => {
    const a = (-90 + k * 360 / n) * Math.PI / 180, a2 = (-90 + (k + 1) * 360 / n) * Math.PI / 180, x = 70 * Math.cos(a), y = 70 * Math.sin(a), x2 = 70 * Math.cos(a2), y2 = 70 * Math.sin(a2), mx = 66 * Math.cos((a + a2) / 2), my = 66 * Math.sin((a + a2) / 2);
    s += `<path d="M${(x * 0.78).toFixed(1)} ${(y * 0.78).toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${(x2 * 0.78).toFixed(1)} ${(y2 * 0.78).toFixed(1)}" stroke="#93A0B4" stroke-width="1.4" fill="none" marker-end="url(#lvar)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="19" fill="${LV_TC[t]}33" stroke="${LV_TC[t]}"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${LV_TTEXT[t]}" font-family="Sora,sans-serif">${t}</text>`;
  });
  return s + '</svg>';
}
let lvaPick = [];
function lvOpenTeam(i) {
  const r = lvNow(); if (!r) return;
  const dx = lvDex(r), a = LV_ARENAS[i];
  const mine = dx.list.filter((e) => e.have);
  if (!lvaPick.length || lvaPick.some((id) => !mine.find((e) => e.id === id))) lvaPick = mine.slice().sort((x, y) => (y.have / y.forms.length) - (x.have / x.forms.length)).slice(0, 3).map((e) => e.id);
  const foes = levelArenaLeader(i);
  openSheet(`${sheetHead('lvaBack', esc(a.name), true)}
    <div class="lva-scene">${ARENA_SCENES['s' + i] || ''}<div class="lva-foes">${foes.map((f) => lvArt(f.tpl, 64, { still: true })).join('')}</div></div>
    <p class="small muted" style="margin:8px 2px 10px">Arena-Leitung: ${foes.map((f) => `${esc(f.name)} (${esc(f.type)})`).join(', ')}. Wähle bis zu 3 Monster für dein Team.</p>
    <div class="lva-team">${mine.map((e) => { const f = e.have - 1, on = lvaPick.includes(e.id); return `<button class="lva-pick ${on ? 'on' : ''}" data-pk="${e.id}" aria-pressed="${on}">${lvArt(e.tpl + f, 48, { still: true, shiny: e.shiny })}<b>${esc(e.forms[f])}</b>${lvChip(e.type)}</button>`; }).join('')}</div>
    <button class="btn block" id="lvaGo" style="margin-top:12px" ${lvaPick.length ? '' : 'disabled'}>Duell starten · ${lvaPick.length} von 3</button><div style="height:20px"></div>`);
  $('#lvaBack').onclick = () => lvOpenArenas();
  document.querySelectorAll('[data-pk]').forEach((b) => b.onclick = () => { const id = b.dataset.pk; if (lvaPick.includes(id)) lvaPick = lvaPick.filter((x) => x !== id); else if (lvaPick.length < 3) lvaPick.push(id); lvOpenTeam(i); });
  $('#lvaGo').onclick = () => {
    const team = lvaPick.map((id) => { const e = dx.list.find((x) => x.id === id); const m = lvMon(id) || { id, tpl: e.tpl, forms: e.forms, type: e.type }; return lvFighter(Object.assign({}, m, { type: e.type }), e.have - 1, e.forms.length, e.shiny); });
    lvDuel({ i, team, cur: 0, foes, fcur: 0, log: [`${foes[0].name} betritt die Arena.`], over: null });
  };
}
const LVA_MOVE = { attack: 'Angriff', special: 'Spezial', guard: 'Abwehr' };
function lvDuelText(ev, def) {
  if (ev.move === 'skip') return `${ev.who} muss aussetzen.`;
  if (ev.move === 'guard') return `${ev.who} geht in Abwehr.`;
  const eff = ev.mult > 1 ? ' Sehr effektiv!' : ev.mult < 1 ? ' Nicht sehr effektiv.' : '';
  return `${ev.who} setzt ${ev.move === 'special' ? 'die Spezialattacke' : 'einen Angriff'} ein: −${ev.dmg}.${eff}${ev.move === 'special' ? ` ${def.name} setzt aus.` : ''}`;
}
function lvDuel(D, anim) {
  const me = D.team[D.cur], foe = D.foes[D.fcur], i = D.i;
  const bar = (f, side) => `<div class="lva-hp ${side}"><div><b>${esc(f.name)}</b><small>${side === 'me' ? 'du' : 'Leitung'}</small></div><i><span style="width:${Math.round(f.hp / f.max * 100)}%;background:${LV_TC[f.type] || '#F5C76B'}"></span></i></div>`;
  const last = D.log.slice(-2).map((t) => `<div>${esc(t)}</div>`).join('');
  const spec = MONSTER_SIG['t' + me.tpl] || 'Spezialattacke';
  openSheet(`${sheetHead('lvdQuit', esc(LV_ARENAS[i].name), false, '')}
    <div class="lva-stage ${state.level.lively === false ? 'lv-calm' : ''}">${ARENA_SCENES['s' + i] || ''}
      <div class="lva-f foe ${anim === 'hitFoe' ? 'hit' : ''}">${lvArt(foe.tpl, 104, { shiny: foe.shiny })}</div>
      <div class="lva-f me ${anim === 'hitFoe' ? 'lunge' : ''} ${anim === 'hitMe' ? 'hit' : ''}">${lvArt(me.tpl, 112, { shiny: me.shiny })}</div>
      ${bar(foe, 'foe')}${bar(me, 'me')}</div>
    <div class="card lva-log" aria-live="polite">${last}</div>
    ${D.over ? '' : `<div class="lva-moves">
      <button class="lva-mv" data-mv="attack" style="--c:${LV_TC[me.type] || '#F5C76B'}"><b>Angriff</b><small>${esc(me.type)} · ${lvTypeMult(me.type, foe.type) > 1 ? 'sehr effektiv' : lvTypeMult(me.type, foe.type) < 1 ? 'schwach' : 'normal'}</small></button>
      <button class="lva-mv" data-mv="special" style="--c:#F5C76B" ${me.special ? '' : 'disabled'}><b>Spezial</b><small>${esc(spec)} · Gegner setzt aus · 1×</small></button>
      <button class="lva-mv" data-mv="guard" style="--c:#5BE7F5"><b>Abwehr</b><small>halber Schaden beim nächsten Treffer</small></button>
      <button class="lva-mv" data-mv="switch" style="--c:#93A0B4" ${D.team.filter((f, k) => k !== D.cur && f.hp > 0).length ? '' : 'disabled'}><b>Wechseln</b><small>${D.team.filter((f, k) => k !== D.cur && f.hp > 0).map((f) => esc(f.name)).join(' · ') || 'niemand bereit'}</small></button></div>`}
    <div class="lva-row">${D.team.map((f, k) => `<span class="${k === D.cur ? 'on' : ''} ${f.hp ? '' : 'ko'}">${lvArt(f.tpl, 40, { still: true, shiny: f.shiny })}</span>`).join('')}<small class="muted">Team</small></div>
    ${D.over ? `<button class="btn block" id="lvdEnd" style="margin-top:10px">${D.over === 'win' ? 'Emblem ansehen' : 'Revanche'}</button><button class="btn ghost block" id="lvdOut">Zu den Arenen</button>` : ''}
    <div style="height:16px"></div>`);
  $('#lvdQuit').textContent = D.over ? 'Schließen' : 'Aufgeben';
  $('#lvdQuit').onclick = () => lvOpenArenas();
  const rnd = Math.random;
  document.querySelectorAll('[data-mv]').forEach((b) => b.onclick = () => {
    const mv = b.dataset.mv; let a2 = null;
    if (mv === 'switch') { const k = D.team.findIndex((f, k2) => k2 !== D.cur && f.hp > 0); D.cur = k; D.log.push(`Du schickst ${D.team[k].name}.`); }
    else {
      const ev = lvDuelMove(me, foe, mv, rnd); D.log.push(lvDuelText(ev, foe)); a2 = ev.dmg ? 'hitFoe' : null;
      if (foe.hp <= 0) {
        D.log.push(`${foe.name} gibt auf.`);
        if (D.fcur < D.foes.length - 1) { D.fcur++; D.log.push(`${D.foes[D.fcur].name} kommt.`); lvDuel(D, a2); return; }
        D.over = 'win'; state.level.arenas = state.level.arenas || {}; if (!(state.level.arenas[i] && state.level.arenas[i].won)) state.level.arenas[i] = { won: lvToday() }; save();
        D.log.push('Sieg! Das Emblem wird vergoldet.'); lvDuel(D, a2); return;
      }
    }
    // Gegner ist dran
    const cme = D.team[D.cur], cf = D.foes[D.fcur];
    const ev2 = lvDuelMove(cf, cme, lvDuelAI(cf, cme, rnd), rnd); D.log.push(lvDuelText(ev2, cme));
    if (cme.hp <= 0) {
      D.log.push(`${cme.name} braucht eine Pause.`);
      const k = D.team.findIndex((f) => f.hp > 0);
      if (k < 0) { D.over = 'lose'; D.log.push('Diesmal nicht – Revanche jederzeit, ohne Folgen.'); } else { D.cur = k; D.log.push(`${D.team[k].name} übernimmt.`); }
    }
    lvDuel(D, ev2.dmg ? 'hitMe' : a2);
  });
  const end = $('#lvdEnd'); if (end) end.onclick = () => (D.over === 'win' ? lvShowWin(i) : lvOpenTeam(i));
  const out = $('#lvdOut'); if (out) out.onclick = () => lvOpenArenas();
}
function lvShowWin(i) {
  lvOverlay(`<div class="lv-ovk">Sieg!</div><div class="lv-stage" style="height:200px">${lvRays('#F2C230')}<div class="lv-abs">${lvEmblem(i, true, 170)}</div></div>
    <div class="lv-ovn" style="font-size:1.4rem">${esc(LV_ARENAS[i].name)}-Emblem vergoldet</div>
    <p class="small muted" style="max-width:300px">Kämpfe geben keine XP und keine Samen – nur das Emblem. Revanche jederzeit.</p><button class="btn block" data-close style="margin-top:12px">Weiter</button>`, 0, () => lvOpenArenas());
}

/* ---------- Kacheln im Fortschritt ---------- */
function lvExtrasTiles(r) {
  const ar = lvArenaState(r), won = ar.filter((x) => x.won).length, open = ar.filter((x) => x.open).length;
  const keys = lvPostcardKeys(r);
  return `${lvSeasonCard(r)}
    <div class="lv-two"><button class="card lv-tile" id="lvArenas">${lvEmblem(Math.max(0, open - 1), won > 0, 40)}<span><small>Arenen</small><b>${won}/${LV_ARENAS.length} Embleme</b></span></button>
    <button class="card lv-tile" id="lvPost">${lvSeasonIcon(LV_SEASONS[keys.length ? +keys[0].slice(5, 7) - 1 : +lvToday().slice(5, 7) - 1].deko.id, 40)}<span><small>Postkarte</small><b>${keys.length ? LVX_MON[+keys[0].slice(5, 7) - 1] : 'ab 1. nächsten Monat'}</b></span></button></div>`;
}
function lvBindExtras() {
  const s = $('#lvSeason'); if (s) s.onclick = () => lvOpenSeason();
  const a = $('#lvArenas'); if (a) a.onclick = () => lvOpenArenas();
  const p = $('#lvPost'); if (p) p.onclick = () => lvOpenPostcard();
}
// Neue Postkarte am Monatsanfang einmal melden
function lvPostcardNotice(r) {
  const lv = state.level, k = lvLastMonthKey();
  if (k < r.start.slice(0, 7) || lv.pcSeen === k) return false;
  lv.pcSeen = k; save();
  if (lv.toasts !== false) toast(`Deine ${LVX_MON[+k.slice(5, 7) - 1]}-Postkarte ist da – im Fortschritt`);
  return false;
}

/* ---------- Einführung (OB1–OB2), danach Ei wählen ---------- */
function lvOpenIntro(step = 0) {
  const dots = `<div class="lvi-dots">${[0, 1, 2].map((k) => `<i class="${k === step ? 'on' : ''}"></i>`).join('')}</div>`;
  if (step === 0) {
    openSheet(`<div class="lvi">${'<div class="lvi-cast">' + [[0, 104, 6, 46], [3, 124, 38, 30], [6, 104, 72, 46], [49, 70, 2, 8], [53, 70, 78, 6], [9, 62, 42, 2]].map(([t, s, x, y]) => `<span style="left:${x}%;top:${y}%;width:${s}px">${lvArt(t, s)}</span>`).join('') + '</div>'}
      <h1>Willkommen bei den Gemüsemonstern</h1><p class="muted">Ein freiwilliges Spiel neben deinem Tracker. Belohnt wird nur, dass du dranbleibst und Lebensmittel pflegst – <b style="color:var(--ink)">nie, wie viel du isst.</b></p>
      ${dots}<button class="btn block" id="lviGo">Los geht’s</button><button class="btn ghost block" id="lviNo">Ohne Spiel weiter</button></div>`);
    $('#lviGo').onclick = () => lvOpenIntro(1);
    $('#lviNo').onclick = () => { state.level.intro = 'no'; save(); closeSheet(); };
    return;
  }
  const row = (ic, t, d) => `<div class="lvi-row"><span>${ic}</span><div><b>${t}</b><small>${d}</small></div></div>`;
  openSheet(`<div class="lvi"><h1 style="margin-top:12px">So funktioniert’s</h1><p class="muted" style="margin-top:-4px">Drei Dinge, alle ohne Druck.</p>
    <div class="card" style="padding:4px 14px">${row(lvEgg(46), 'Level · Dranbleiben', 'Jeden Monat schlüpft ein Monster und wächst mit deinen getrackten Tagen. Lücken kosten nichts.')}
      ${row(lvSeedSvg(34), 'Entdecker · Samen', 'Scanne Produkte und ergänze fehlende Werte – die Lebensmittel-Daten werden besser.')}
      ${row(lvArt(49, 52, { still: true }), 'Garten · Besuche', 'Gemüse in deinem Journal lockt Besucher an. Nur ob, nie wie viel.')}</div>
    <div class="card lvi-lock"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6FE0C1" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><div class="small"><b>Alles bleibt auf deinem iPhone.</b><br><span class="muted">Kein Konto, kein Server. Tauschen nur per Code.</span></div></div>
    ${dots}<button class="btn block" id="lviGo">Weiter</button></div>`);
  $('#lviGo').onclick = () => { state.level.enabled = true; state.level.intro = 'done'; save(); lvOpenStart(); };
}
// Hinweis im Journal für alle, die das Spiel noch nicht kennen (einmal wegklickbar)
function lvIntroCardHtml(iso) {
  const lv = state.level; if (!lv || lv.enabled || lv.intro || iso !== lvToday()) return '';
  return `<div class="card lvi-card"><div class="lvi-ca">${lvArt(3, 64)}</div><div><div class="lv-kicker">Neu · freiwillig</div><b>Gemüsemonster</b><p class="small muted" style="margin:2px 0 8px">Sammle Monster fürs Dranbleiben – nie fürs Wenig-Essen.</p>
    <div class="lvg-vb"><button class="btn" id="lviShow">Ansehen</button><button class="btn ghost" id="lviHide">Nein danke</button></div></div></div>`;
}
function lvBindIntroCard(after) {
  const s = $('#lviShow'); if (s) s.onclick = () => lvOpenIntro(0);
  const h = $('#lviHide'); if (h) h.onclick = () => { state.level.intro = 'no'; save(); (after || render)(); };
}
