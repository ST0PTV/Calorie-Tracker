/* Reiter „Essen“: Übersicht über die eigenen Lebensmittel (Vorgemerkt, Favoriten, Eigene, Rezepte, Zuletzt) mit
   Makro-Balken; „Einkauf erfassen“ öffnet das Vormerken-Blatt (Barcode/Suche), das Lebensmittel nur speichert,
   ohne sie ins Journal einzutragen. „+“ trägt ein Lebensmittel direkt ins Journal ein. */
'use strict';
let pantryMode = false;      // true: Auswahl im Hinzufügen-Blatt merkt das Lebensmittel nur vor
let pantryFav = false;       // beim Vormerken zusätzlich als Favorit markieren
let pantryCount = 0;         // in diesem Durchgang vorgemerkt
let foodFilter = 'all';
let foodQuery = '';
const PANTRY_MAX = 2000;

function pantryAdd(food) {
  const snap = foodSnap(food);
  state.pantry = [Object.assign(snap, { added: Date.now() })].concat((state.pantry || []).filter((x) => x.id !== snap.id)).slice(0, PANTRY_MAX);
  if (pantryFav && !isFav(snap.id)) state.favs.unshift(foodSnap(food));
  pantryCount++;
  save();
  toast(`„${food.n}“ vorgemerkt`);
  openPantry(addTab); // im gleichen Reiter weitermachen (Barcode: nächster Scan)
}
function openPantry(tab) {
  pantryMode = true;
  addTab = tab || 'scan';
  sheetMode = 'add';
  openSheet(`
    <div class="sheet-head"><h1 style="margin:0">Lebensmittel vormerken</h1><button class="btn ghost" id="closeSheet">Fertig</button></div>
    <div class="seg two" id="addSeg"><button data-t="scan">Barcode</button><button data-t="search">Suche</button></div>
    <div class="pantry-bar"><label class="switch" style="margin:0"><input type="checkbox" id="pFav" ${pantryFav ? 'checked' : ''}> als Favorit</label><span class="small muted">${pantryCount ? `${pantryCount} vorgemerkt` : 'nur speichern, nicht ins Journal'}</span></div>
    <div id="addBody"></div>`);
  $('#closeSheet').onclick = () => { pantryMode = false; pantryCount = 0; closeSheet(); };
  $('#pFav').onchange = (ev) => { pantryFav = ev.target.checked; };
  $('#addSeg').querySelectorAll('button').forEach((b) => b.onclick = () => { addTab = b.dataset.t; renderAddTab(); });
  renderAddTab();
}

function foodItems() {
  const map = new Map();
  const put = (f, flag) => { const id = f.ref || f.id; const cur = map.get(id) || Object.assign({}, f, { id, flags: {} }); cur.flags[flag] = true; map.set(id, cur); };
  (state.pantry || []).forEach((f) => put(f, 'pantry'));
  state.favs.forEach((f) => put(f, 'fav'));
  state.custom.forEach((f) => put(f, f.src === 'recipe' ? 'recipe' : 'own'));
  state.recent.slice(0, 40).forEach((f) => put(f, 'recent'));
  return [...map.values()];
}
const FOOD_FILTERS = [['all', 'Alle'], ['fav', '★ Favoriten'], ['pantry', 'Vorgemerkt'], ['own', 'Eigene'], ['recent', 'Zuletzt']];
function mealByTime() { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'; }

function renderFood() {
  const all = foodItems();
  const pantry = (state.pantry || []).slice(0, 3);
  $('#view').innerHTML = `
    <div class="topbar"><div><div class="sub">Deine Lebensmittel</div><div class="day">Essen</div></div>
</div>
    <div class="card fd-shop">
      <div class="fd-shop-h"><div class="fd-ico">▥</div><div class="fd-t">Einkauf erfassen</div></div>
      <div class="fd-btns"><button class="btn" id="fdScan">Scannen</button><button class="btn secondary" id="fdSearch">Suchen</button></div>
      ${pantry.length ? `<div class="small muted">Zuletzt vorgemerkt: <span style="color:var(--ink)">${pantry.map((x) => esc(x.n)).join(' · ')}</span></div>` : ''}
    </div>
    <input id="fdQ" type="search" placeholder="In deinen Lebensmitteln suchen" autocomplete="off" value="${esc(foodQuery)}">
    <div class="chips fd-chips" id="fdF">${FOOD_FILTERS.map(([k, l]) => { const n = k === 'all' ? all.length : all.filter((x) => x.flags[k]).length; return `<button type="button" class="chip ${foodFilter === k ? 'on' : ''}" data-f="${k}">${l}${n ? ` <span class="muted">${n}</span>` : ''}</button>`; }).join('')}</div>
    <div class="card fd-list" id="fdList"></div>
    <p class="small muted" style="margin:0 4px 12px">Balken = Energieanteil <span style="color:var(--p)">Eiweiß</span> · <span style="color:var(--c)">KH</span> · <span style="color:var(--f)">Fett</span>. „+“ trägt ins Journal ein; entfernen kannst du Einträge unter „Meine“ im Journal.</p>`;
  const draw = () => {
    const terms = norm(foodQuery).split(/\s+/).filter(Boolean);
    const list = all.filter((x) => (foodFilter === 'all' || x.flags[foodFilter]) && (!terms.length || terms.every((t) => norm(x.n + ' ' + (x.brand || '')).includes(t))));
    const tagOf = (x) => x.flags.recipe ? 'Rezept' : x.flags.own ? 'Eigenes' : x.src === 'off' ? 'Barcode' : '';
    $('#fdList').innerHTML = list.length ? list.map((x, i) => {
      const e = (x.p || 0) * 4 + (x.c || 0) * 4 + (x.f || 0) * 9 || 1;
      return `<div class="fd-row" data-i="${i}"><div class="fd-main"><div class="fd-n">${x.flags.fav ? '<span class="star">★</span>' : ''}${esc(x.n)}${tagOf(x) ? `<span class="tag">${tagOf(x)}</span>` : ''}${x.flags.pantry ? '<span class="tag fd-p">vorgemerkt</span>' : ''}</div>
        <div class="fd-m"><span>${fmt(x.k)} kcal/100 ${unitOf(x)}</span><span class="fd-bar"><i style="flex:${((x.p || 0) * 4 / e).toFixed(3)};background:var(--p)"></i><i style="flex:${((x.c || 0) * 4 / e).toFixed(3)};background:var(--c)"></i><i style="flex:${((x.f || 0) * 9 / e).toFixed(3)};background:var(--f)"></i></span><span class="fd-e">E ${r1(x.p || 0)}</span></div></div>
        <button type="button" class="fd-plus" data-plus="${i}" aria-label="${esc(x.n)} ins Journal eintragen">+</button></div>`;
    }).join('') : `<div class="empty">${all.length ? 'Nichts gefunden.' : 'Noch keine Lebensmittel. Nach dem Einkauf einfach „Scannen“ tippen.'}</div>`;
    const pick = (i) => { const f = list[+i]; if (!f) return; addMeal = mealByTime(); openAmount(f, { direct: true }); };
    document.querySelectorAll('#fdList [data-plus]').forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); pick(b.dataset.plus); });
    document.querySelectorAll('#fdList .fd-row').forEach((r) => r.onclick = () => pick(r.dataset.i));
  };
  $('#fdQ').oninput = (ev) => { foodQuery = ev.target.value; draw(); };
  document.querySelectorAll('#fdF [data-f]').forEach((b) => b.onclick = () => { foodFilter = b.dataset.f; document.querySelectorAll('#fdF [data-f]').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
  $('#fdScan').onclick = () => openPantry('scan');
  $('#fdSearch').onclick = () => openPantry('search');
  draw();
}
