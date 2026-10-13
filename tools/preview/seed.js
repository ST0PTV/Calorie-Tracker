/* Vorschau-Seite: füllt eine leere Vorschau mit erfundenen Testdaten (keine echten Daten!) und bietet Szenarien.
   Wird nur in die Vorschau eingebaut (tools/preview/build.sh), nie in die App. Läuft nach js/level.js, vor js/app.js. */
'use strict';
(function () {
  const KEY = 'ct.v1', SKEY = 'ct.preview.scenario';
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register = () => Promise.resolve(); } catch (e) { /* egal */ } }
  let ra = 20260714;
  const rnd = () => { ra = (ra + 0x6D2B79F5) | 0; let t = Math.imul(ra ^ (ra >>> 15), 1 | ra); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const add = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const TODAY = iso(new Date()), START = '2026-07-14';
  // Werte je 100 g (BLS 4.0, gerundet): id, Name, kcal, Eiweiß, KH, Fett, Ballaststoffe, Zucker
  const F = {
    hafer: ['C133000', 'Hafer Flocken', 348, 13.2, 53.3, 6.7, 11, 0.7], banane: ['F503100', 'Banane roh', 79, 1.3, 15.9, 0.4, 2, 13.9],
    apfel: ['F110100', 'Apfel roh', 58, 0.4, 11.7, 0.5, 2.3, 10.5], reis: ['C352000', 'Reis poliert, roh', 351, 7.9, 77.1, 0.6, 2.5, 0.3],
    tofu: ['H861000', 'Tofu', 115, 15.5, 0, 5.6, 1.3, 0], moehre: ['G620100', 'Karotte/Möhre, roh', 40, 0.8, 6.5, 0.4, 2.9, 6.4],
    tomate: ['G561100', 'Tomate roh', 22, 1, 3.3, 0.1, 1.3, 3.3], spinat: ['G211100', 'Spinat roh', 18, 2.1, 0.9, 0.3, 1.8, 0.8],
    champ: ['K701100', 'Champignon roh', 28, 3.7, 2.9, 0.3, 1.9, 0.2], zwiebel: ['G480100', 'Speisezwiebel roh', 34, 1.2, 6, 0.2, 1.4, 6],
    brokkoli: ['G312100', 'Broccoli roh', 35, 3.6, 2.3, 0.6, 3, 1.4], mais: ['G570100', 'Zuckermais roh', 67, 3.3, 9.4, 1.2, 2.8, 3.4],
    kartoffel: ['K110100', 'Kartoffel geschält, roh', 83, 1.9, 17.9, 0.1, 1.4, 0.9], paprika: ['G543100', 'Gemüsepaprika rot, roh', 36, 1, 6.2, 0.2, 2.2, 6.2],
  };
  const ent = (meal, k, g) => { const f = F[k]; return { id: Math.random().toString(36).slice(2, 10), meal, grams: g, ref: f[0], src: 'bls', n: f[1], brand: '', liq: false, k: f[2], p: f[3], c: f[4], f: f[5], fi: f[6], su: f[7], fs: 0 }; };
  const LUNCH = [['reis', 'tofu', 'brokkoli'], ['kartoffel', 'spinat', 'zwiebel'], ['reis', 'champ', 'paprika'], ['kartoffel', 'tofu', 'moehre'], ['reis', 'mais', 'tomate']];
  const day = (i) => { const l = LUNCH[i % LUNCH.length]; return [ent('breakfast', 'hafer', 70), ent('breakfast', i % 2 ? 'apfel' : 'banane', 130), ent('lunch', l[0], 90), ent('lunch', l[1], 150), ent('lunch', l[2], 120), ent('dinner', 'tomate', 150), ent('dinner', 'zwiebel', 40)]; };
  const srcOf = (s) => ({ days: s.days, weightLog: {}, ev: s.level.ev || {}, waterOn: false, waterOf: () => 0, waterGoalFor: () => Infinity });

  function base(from, to, skip) {
    const s = { days: {}, goalHistory: [{ from, goal: 2300, preset: 'dge', pf: 0.8, ff: 1.0, protein: 70, carbs: 300, fat: 80, fiber: 30, sugar: 57, weight: 75 }],
      profile: { weight: 75, sex: null, height: null, birthYear: null }, diet: { type: 'all', allergens: [] }, lastBackup: Date.now(), level: { ev: {} } };
    let i = 0;
    for (let d = from; d <= to; d = add(d, 1)) { if (!skip(d)) s.days[d] = day(i); i++; if (i % 3 === 0) s.level.ev[d] = { scan: 1 + (i % 2) }; }
    return s;
  }
  // Garten-Verlauf nachspielen: Besucher einladen, Freunde begrüßen, Mitbringsel abholen, ab und zu säen und Deko kaufen
  function play(s, until, keep) {
    s.level.garden = { acts: [], gifts: {} };
    const S = srcOf(s), r = levelCompute(S, s.level, until);
    const g = levelGarden(S, s.level, add(until, -1), r, (d, x) => {
      const out = [];
      if (x.gift) out.push({ a: 'gift' });
      if (x.visitor && x.visitor.kind === 'new' && x.visitor.id !== keep && x.samen >= 40 && x.plots.length < x.maxPlots) out.push({ a: 'invite', m: x.visitor.id });
      else if (x.visitor && x.visitor.kind === 'friend') out.push({ a: 'friend', m: x.visitor.id });
      else if (!keep && x.samen >= 160 && x.plots.length < 2) out.push({ a: 'sow' });
      const dk = LV_DEKO.find((k) => !k.gift && !x.deko.includes(k.id) && x.samen >= k.cost + 60);
      if (dk && d.slice(8) === '15') out.push({ a: 'deko', m: dk.id });
      return out;
    });
    s.level.garden = { acts: g.acts, gifts: g.gifts };
  }
  // Szenario mit passendem Zufallsschlüssel bauen (z. B. heute ein Besuch, ein Mitbringsel)
  function garden(want, keep) {
    for (let seed = 1; seed < 400; seed++) {
      ra = 20260714;
      const s = base(START, TODAY, (d) => d !== TODAY && rnd() < 0.1);
      s.level = Object.assign(s.level, { enabled: true, starter: 'erbsi', startDate: START, seed });
      s.days[TODAY] = day(4); // heute mit Mais (Spross) – lockt Maisi
      play(s, TODAY, keep);
      const g = levelGarden(srcOf(s), s.level, TODAY, levelCompute(srcOf(s), s.level, TODAY));
      if (want(g)) { s.level.gseen = g.log.filter((x) => x.kind === 'hatch' || x.kind === 'grow').length; return s; }
    }
    return null;
  }
  const SC = {
    retro: { t: 'Rückwirkend starten', d: 'Daten seit 14. Juli, Level-System noch nicht gestartet → Starter wählen (rückwirkend).',
      make: () => { const s = base(START, add(TODAY, -1), () => rnd() < 0.12); s.level.enabled = true; return s; } },
    evolve: { t: 'Kurz vor Entwicklung', d: 'Im aktuellen Monat fehlt 1 Tag bis zur Normalform → heute etwas eintragen.',
      make: () => {
        const mStart = TODAY.slice(0, 8) + '01';
        const s = base(START, add(mStart, -1), () => rnd() < 0.12);
        Object.assign(s.level, { enabled: true, starter: 'moehri', startDate: START, seed: 4242 });
        const yest = add(TODAY, -1), src = srcOf(s);
        for (let n = 1; n <= 31; n++) { // so viele Tage bis gestern, dass im Monat genau 9 zählen (Pausetage zählen mit)
          for (let d = mStart; d <= yest; d = add(d, 1)) delete s.days[d];
          for (let k = 0; k < n && add(yest, -k) >= mStart; k++) s.days[add(yest, -k)] = day(k);
          if ([...lvCountedDays(src, s.level.startDate, yest).counted].filter((x) => x >= mStart).length >= 9) break;
        }
        return s;
      } },
    hatch: { t: 'Neuer Monat, Ei', d: 'Im aktuellen Monat noch nichts eingetragen → erster Eintrag lässt das Monatsei schlüpfen.',
      make: () => { const s = base(START, add(TODAY.slice(0, 8) + '01', -1), () => rnd() < 0.12); Object.assign(s.level, { enabled: true, starter: 'tomi', startDate: START, seed: 777 }); return s; } },
    visit: { t: 'Garten mit Besuch', d: 'Läuft seit Juli mit Garten, Beet und Deko; heute schaut ein neues Bonus-Monster vorbei (Karte im Journal).',
      make: () => garden((g) => g.visitor && g.visitor.kind === 'new' && !g.gift && g.samen >= 40 && g.plots.length, 'maisi') },
    gift: { t: 'Mitbringsel heute', d: 'Wie oben, aber ein Monster hat heute etwas mitgebracht (erscheint beim Öffnen).',
      make: () => garden((g) => g.gift && !g.gift.claimed && g.plots.length, null) },
    fresh: { t: 'Neu ohne Daten', d: 'Leere App, Level-System an → Ei wählen und ausbrüten.', make: () => ({ days: {}, level: { enabled: true } }) },
  };
  let cur = localStorage.getItem(SKEY) || 'visit';
  if (!SC[cur]) cur = 'visit';
  if (!localStorage.getItem(KEY)) { localStorage.setItem(KEY, JSON.stringify(SC[cur].make())); localStorage.setItem(SKEY, cur); }

  // Kleiner Schalter oben: Szenario wechseln / zurücksetzen
  window.addEventListener('load', () => {
    const b = document.createElement('button');
    b.textContent = 'Vorschau · Testdaten'; b.setAttribute('aria-label', 'Vorschau-Szenarien');
    b.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top) + 2px);left:50%;transform:translateX(-50%);z-index:90;font:600 10.5px Sora,sans-serif;padding:3px 10px;border-radius:999px;border:1px solid rgba(245,199,107,.5);background:rgba(245,199,107,.16);color:#C99A3A;cursor:pointer';
    b.onclick = () => {
      const m = document.createElement('div');
      m.style.cssText = 'position:fixed;inset:0;z-index:95;background:rgba(8,12,22,.85);display:flex;align-items:flex-start;justify-content:center;padding:48px 16px;font-family:Sora,sans-serif;overflow:auto';
      m.innerHTML = `<div style="background:#151C2B;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:16px;max-width:420px;width:100%;color:#E8EEF7">
        <b>Vorschau mit erfundenen Testdaten</b><p style="font-size:12px;color:#93A0B4;margin:4px 0 10px">Nur in dieser Vorschau gespeichert, getrennt von deiner echten App.</p>
        ${Object.entries(SC).map(([k, v]) => `<button data-sc="${k}" style="display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:14px;border:1px solid ${k === cur ? '#5BE7F5' : 'rgba(255,255,255,.12)'};background:rgba(255,255,255,.05);color:inherit;font:inherit;cursor:pointer"><b style="font-size:13px">${v.t}</b><br><span style="font-size:11.5px;color:#93A0B4">${v.d}</span></button>`).join('')}
        <button data-x style="margin-top:6px;width:100%;padding:10px;border-radius:14px;border:0;background:transparent;color:#5BE7F5;font:inherit;cursor:pointer">Schließen</button></div>`;
      m.onclick = (e) => { const t = e.target.closest('[data-sc]'); if (t) { localStorage.setItem(KEY, JSON.stringify(SC[t.dataset.sc].make())); localStorage.setItem(SKEY, t.dataset.sc); location.reload(); } else if (e.target === m || e.target.closest('[data-x]')) m.remove(); };
      document.body.appendChild(m);
    };
    document.body.appendChild(b);
  });
})();
