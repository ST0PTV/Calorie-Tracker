/* Level-System „Gemüsemonster“ – Etappe 4: Entdecker-Rang, Forschungsauftrag, Vergleichen und Tauschen per Code.
   Samen gibt es nur für Datenpflege (Scannen, Anlegen, Werte ergänzen, Scheiben wiegen, Teilen) – nie für weniger Essen. */
'use strict';

const LVE_PARTS = [['scan', 'Neue Produkte gescannt'], ['own', 'Eigene Lebensmittel angelegt'], ['fill', 'Fehlende Werte ergänzt'], ['slice', 'Scheiben gewogen'], ['share', 'Lebensmittel geteilt'], ['task', 'Forschungsauftrag'], ['gift', 'Mitbringsel']];
const LVE_MISS = { cP: 'Eiweiß', cC: 'Kohlenhydrate', cF: 'Fett', cFi: 'Ballaststoffe', cSu: 'Zucker' };
const LVE_SLICE_RX = /Brot|Toast|Käse|Wurst|Schinken|Salami|Aufschnitt|Scheibe/i;

/* ---------- Kandidaten für den Forschungsauftrag: gegessene Lebensmittel mit Lücken ---------- */
function lvResearchItems() {
  const today = lvToday(), from = addDays(today, -60), seen = new Map();
  Object.keys(state.days).filter((d) => d >= from && d <= today).sort().reverse().forEach((d) => (state.days[d] || []).forEach((e) => { if (e.ref && !seen.has(e.ref)) seen.set(e.ref, e); }));
  const out = [];
  seen.forEach((e, id) => {
    const f = typeof liveFood === 'function' ? liveFood(e) : e; if (!f) return;
    if (String(id).startsWith('custom:') && (f.miss || []).length) out.push({ id, food: f, kind: 'fill', what: f.miss.map((m) => LVE_MISS[m] || m).join(', ') + ' fehlt' });
    else if (!state.slices[id] && LVE_SLICE_RX.test(f.n || '') && !e.quick) out.push({ id, food: f, kind: 'slice', what: 'Scheibengewicht fehlt' });
  });
  return out;
}

/* ---------- Karte im Fortschritt ---------- */
function lvExplorerCard(r) {
  const g = lvG(r); if (!g) return '';
  const rk = g.rank, lo = LV_RANKS[rk.i][1], pct = rk.next ? (g.earned - lo) / (rk.next.need - lo) : 1;
  const pend = g.ledger.pending.length;
  return `<button class="card lve-card" id="lvExplorer"><span class="lve-ring">${lvRing(pct, 64, '#B9E07A', 4)}<span>${lvSeedSvg(26)}</span></span>
    <span class="lve-ct"><span class="lv-kicker">Entdecker · Datenpflege</span><b>${esc(rk.name)}</b>
    <small>${g.earned} Samen gesammelt${rk.next ? ` · noch ${rk.next.need - g.earned} bis ${esc(rk.next.name)}` : ''}${pend ? ` · ${pend} wartet` : ''}</small></span></button>`;
}
function lvBindExplorerCard() { const b = $('#lvExplorer'); if (b) b.onclick = () => lvOpenExplorer(); }

/* ---------- Entdecker-Seite ---------- */
function lvOpenExplorer() {
  const r = lvNow(); if (!r) return;
  const g = lvG(r), led = g.ledger, today = lvToday(), mon = addDays(today, -((new Date(today + 'T12:00:00').getDay() + 6) % 7));
  const rk = g.rank, lo = LV_RANKS[rk.i][1], pct = rk.next ? (g.earned - lo) / (rk.next.need - lo) : 1;
  const W = led.weeks[mon] || { foods: [], done: null };
  // Diese Woche: Samen je Quelle (gutgeschrieben), Mitbringsel aus dem Garten-Protokoll
  const wk = {}; Object.entries(led.byDay).filter(([d]) => d >= mon && d <= today).forEach(([, x]) => { Object.entries(x.parts).forEach(([k, v]) => { wk[k] = (wk[k] || 0) + v; }); if (x.task) wk.task = (wk.task || 0) + x.task; });
  g.log.filter((x) => x.kind === 'gift' && x.d >= mon && x.gift && x.gift.n).forEach((x) => { wk.gift = (wk.gift || 0) + x.gift.n; });
  const items = lvResearchItems(), doneIds = new Set(W.foods);
  const list = items.filter((x) => !doneIds.has(x.id)).slice(0, Math.max(0, 3 - W.foods.length));
  const doneRows = W.foods.map((id) => { const e = Object.values(state.days).flat().find((x) => x.ref === id); return `<div class="lve-task done"><span>✓</span><div><b>${esc(e ? e.n : id)}</b><small>vervollständigt</small></div></div>`; }).join('');
  const rows = list.map((x, i) => `<div class="lve-task"><span></span><div><b>${esc(x.food.n)}</b><small>${esc(x.what)}</small></div><button class="btn ghost" data-res="${i}">Ergänzen</button></div>`).join('');
  const pend = led.pending.reduce((a, x) => a + (LV_SAMEN[x.k] || 0), 0);
  const dots = LV_RANKS.map(([n, v], i) => `<div class="lve-rd ${g.earned >= v ? 'on' : ''} ${i === rk.i ? 'cur' : ''}"><i></i><small>${esc(n)}</small></div>`).join('');
  openSheet(`${sheetHead('lveClose', 'Entdecker')}
    <p class="small muted" style="margin:-4px 2px 10px">Deine Beiträge machen die Lebensmittel-Daten besser.</p>
    <div class="card"><div class="lve-head">${lvSeedSvg(34)}<div><b class="lve-big">${g.earned} Samen</b><div class="small muted">Rang <b style="color:var(--ink)">${esc(rk.name)}</b>${rk.next ? ` · noch ${rk.next.need - g.earned} bis ${esc(rk.next.name)}` : ''}</div></div></div>
      <div class="lv-bar" style="margin:10px 0 8px"><span style="width:${Math.round(Math.min(1, pct) * 100)}%;background:#B9E07A"></span></div><div class="lve-rds">${dots}</div>
      <p class="small muted" style="margin:8px 0 0">${g.samen} davon noch auszugeben im Garten. Ausgeben senkt den Rang nicht.</p></div>
    <div class="card"><div class="lv-sh"><h2>Forschungsauftrag der Woche</h2><span class="small lve-seedc">+${LV_SAMEN.task} Samen</span></div>
      ${W.done ? '<p class="small" style="margin:0 0 6px"><b class="lve-seedc">Geschafft!</b> Die 50 Samen sind gutgeschrieben. Nächste Woche gibt es einen neuen Auftrag.</p>' : '<p class="small muted" style="margin:0 0 4px">Vervollständige 3 Lebensmittel, die du schon gegessen hast:</p>'}
      ${doneRows}${W.done ? '' : rows || (W.foods.length ? '' : '<p class="small muted" style="margin:6px 0 0">Gerade fehlt bei deinen gegessenen Lebensmitteln nichts. Neue eigene Lebensmittel mit Lücken oder Brot und Aufschnitt ohne gewogene Scheibe tauchen hier auf.</p>')}
      <div class="lv-bar" style="margin-top:10px;height:6px"><span style="width:${Math.min(100, W.foods.length / 3 * 100)}%;background:#B9E07A"></span></div><div class="small muted" style="margin-top:4px">${Math.min(3, W.foods.length)} von 3 · zählt ab dem ersten Journal-Eintrag des Lebensmittels</div></div>
    <div class="card"><div class="lv-sh"><h2>Diese Woche</h2><span class="small muted">seit Montag</span></div>
      ${LVE_PARTS.filter(([k]) => wk[k]).map(([k, t]) => `<div class="lve-row"><span>${t}</span><b class="lve-seedc">+${wk[k]}</b></div>`).join('') || '<p class="small muted" style="margin:0">Noch keine Samen diese Woche.</p>'}
      ${pend ? `<div class="lve-row lve-pend"><span>Wartet auf den ersten Eintrag (${led.pending.length})</span><b>${pend}</b></div>` : ''}</div>
    <div class="card"><div class="lv-sh"><h2>So gibt es Samen</h2><span class="small muted">max. ${LV_GARDEN.dayCap} pro Tag</span></div>
      ${[['Neues Produkt scannen', LV_SAMEN.scan], ['Eigenes Lebensmittel mit allen Werten', LV_SAMEN.own], ['Fehlenden Wert ergänzen', LV_SAMEN.fill], ['Scheibengewicht wiegen', LV_SAMEN.slice], ['Lebensmittel teilen (1× pro Woche)', LV_SAMEN.share], ['Forschungsauftrag (1× pro Woche)', LV_SAMEN.task]].map(([t, v]) => `<div class="lve-row"><span>${t}</span><b class="lve-seedc">${v}</b></div>`).join('')}
      <p class="small muted" style="margin:8px 0 0">Samen zählen erst, wenn du das Lebensmittel einmal im Journal eingetragen hast – so lohnen sich nur echte Einträge. Wie viel du isst, spielt nie eine Rolle.</p></div>
    <div class="lv-two"><button class="card lv-tile" id="lveGarden">${lvSproutSvg()}<span><small>Samen ausgeben</small><b>Garten</b></span></button><button class="card lv-tile" id="lveTrade"><span class="lv-cnt">⇄</span><span><small>Codes</small><b>Vergleichen & Tauschen</b></span></button></div>
    <div style="height:20px"></div>`);
  $('#lveClose').onclick = closeSheet;
  $('#lveGarden').onclick = () => lvOpenGarden();
  $('#lveTrade').onclick = () => lvOpenTrade();
  document.querySelectorAll('[data-res]').forEach((b) => b.onclick = () => {
    const x = list[+b.dataset.res];
    if (x.kind === 'fill' && typeof openFoodForm === 'function') openFoodForm(x.food);
    else if (typeof openAmount === 'function') openAmount(x.food);
  });
}

/* ---------- Vergleichen und Tauschen ---------- */
async function lvShareText(text, title) {
  try { if (navigator.share) { await navigator.share({ title, text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Code kopiert'); } catch (e) { toast('Code markieren und kopieren'); }
}
function lvOpenTrade(result) {
  const r = lvNow(); if (!r) return;
  const dx = lvDex(r), my = levelCollectionCode(dx), lv = state.level, today = lvToday();
  const tr = lv.trades || (lv.trades = { given: [], got: [] });
  const mon = addDays(today, -((new Date(today + 'T12:00:00').getDay() + 6) % 7));
  const gaveThisWeek = tr.given.find((x) => x.d >= mon);
  const giftable = dx.list.filter((e) => e.have && e.kind !== 'legend' && !e.traded);
  let cmp = '';
  const fr = result && result.kind === 'collection' ? result : lv.friend && levelParseCode(lv.friend.code);
  if (fr && fr.kind === 'collection') {
    const both = [], onlyF = [], onlyMe = [];
    dx.list.forEach((e) => { const o = fr.list.find((x) => x.id === e.id) || {}; if (e.have && o.have) both.push(e); else if (o.have) onlyF.push(e); else if (e.have) onlyMe.push(e); });
    const mini = (es, f) => es.map((e) => `<span title="${esc(e.forms[0])}">${f ? lvSil(e.tpl, 34) : lvArt(e.tpl + Math.max(0, e.have - 1), 34, { still: true })}</span>`).join('') || '<small class="muted">–</small>';
    cmp = `<div class="card lve-cmp"><div class="lv-sh"><h2>Vergleich</h2><span class="small muted">Code vom ${new Date(((lv.friend && lv.friend.d) || today) + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span></div>
      <div class="lve-cmpn"><div><b>${both.length}</b><small>habt ihr beide</small></div><div><b class="lve-warm">${onlyF.length}</b><small>hat nur dein Gegenüber</small></div><div><b class="lve-cy">${onlyMe.length}</b><small>hast nur du</small></div></div>
      ${onlyF.length ? `<div class="small muted" style="margin:10px 0 4px">Fehlt dir noch:</div><div class="lve-mini">${mini(onlyF, true)}</div>` : ''}
      ${onlyMe.length ? `<div class="small muted" style="margin:10px 0 4px">Hast nur du:</div><div class="lve-mini">${mini(onlyMe)}</div>` : ''}</div>`;
  }
  const gift = lv.lastGift && lv.lastGift.d >= mon ? lv.lastGift : null;
  openSheet(`${sheetHead('lvtBack', 'Vergleichen & Tauschen', true)}
    <p class="small muted" style="margin:-4px 2px 10px">Per Code, ohne Server. Codes enthalten nur Monster und Formen – keine Ess-, Gewichts- oder Zeitdaten.</p>
    <div class="card"><div class="lv-sh"><h2>Mein Sammlungs-Code</h2><span class="small muted">${dx.monsters}/${dx.total} · ✦ ${dx.shinies}</span></div>
      <div class="lve-code" id="lvtMy">${my}</div><button class="btn secondary block" id="lvtShare">Code teilen</button></div>
    <div class="card"><div class="lv-sh"><h2>Code einlesen</h2><span class="small muted">Sammlung oder Geschenk</span></div>
      <input id="lvtIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="GM-…" aria-label="Code einlesen">
      <button class="btn block" id="lvtGo" style="margin-top:8px">Einlesen</button></div>
    ${cmp}
    <div class="card"><div class="lv-sh"><h2>Monster verschenken</h2><span class="small muted">1× pro Woche</span></div>
      ${gift ? `<p class="small" style="margin:0 0 6px">Dein Geschenk-Code für <b>${esc(lvMon(gift.id).forms[0])}</b>:</p><div class="lve-code">${gift.code}</div><button class="btn secondary block" id="lvtGiftShare">Geschenk-Code teilen</button>
        <p class="small muted" style="margin:8px 0 0">Nächste Woche kannst du wieder etwas verschenken.</p>`
        : `<p class="small muted" style="margin:0 0 8px">Dein Gegenüber bekommt eine Kopie in der ersten Form – deins bleibt bei dir. Schillernde und Legendäre lassen sich nicht verschenken.</p>
        <div class="lve-gifts">${giftable.map((e) => `<button data-gift="${e.id}" aria-label="${esc(e.forms[0])} verschenken">${lvArt(e.tpl, 44, { still: true })}<small>${esc(e.forms[0])}</small></button>`).join('')}</div>`}</div>
    <p class="small muted" style="margin:6px 4px 24px">Ohne Server lässt sich nicht prüfen, ob ein Code woanders schon eingelöst wurde – gedacht für Freunde, nicht für Fremde. Ein Geschenk-Code lässt sich hier nur einmal einlösen.</p>`);
  $('#lvtBack').onclick = () => lvOpenCollection();
  $('#lvtShare').onclick = () => lvShareText(my, 'Meine Gemüsemonster');
  const gs = $('#lvtGiftShare'); if (gs) gs.onclick = () => lvShareText(gift.code, 'Gemüsemonster-Geschenk');
  $('#lvtGo').onclick = () => {
    const raw = $('#lvtIn').value.trim(), p = levelParseCode(raw);
    if (!p) { toast('Code ungültig – bitte prüfen'); return; }
    if (raw.replace(/[^0-9A-Z]/gi, '').toUpperCase() === my.replace(/[^0-9A-Z]/g, '')) { toast('Das ist dein eigener Code'); return; }
    if (p.kind === 'collection') { lv.friend = { code: raw.toUpperCase(), d: today }; save(); lvOpenTrade(p); return; }
    if (tr.got.some((x) => x.nonce === p.nonce && x.id === p.id) || tr.given.some((x) => x.nonce === p.nonce)) { toast('Dieser Geschenk-Code wurde schon eingelöst'); return; }
    const e = dx.list.find((x) => x.id === p.id);
    tr.got.push({ id: p.id, nonce: p.nonce, d: today }); save();
    if (e && e.have) toast(`${e.forms[0]} hast du schon – trotzdem danke!`);
    else { const m = lvMon(p.id); lvShowHatch(m.tpl, m.forms[0], 'Geschenk aus einem Tausch-Code', false); }
    lvOpenTrade();
  };
  document.querySelectorAll('[data-gift]').forEach((b) => b.onclick = () => {
    if (gaveThisWeek) { toast('Diese Woche hast du schon etwas verschenkt'); return; }
    let nonce = 1; try { const a = new Uint32Array(1); crypto.getRandomValues(a); nonce = a[0] & 0xFFFFFF; } catch (e) { nonce = Math.floor(Math.random() * 0xFFFFFF); }
    const code = levelGiftCode(b.dataset.gift, nonce);
    tr.given.push({ id: b.dataset.gift, nonce, d: today }); lv.lastGift = { id: b.dataset.gift, code, d: today }; save();
    lvOpenTrade();
  });
}
