#!/usr/bin/env python3
"""Monte-Carlo-Simulation der Samen-Wirtschaft (365 Tage, 400 Läufe je Szenario).
Alle Raten sind ANNAHMEN (keine Nutzungsdaten vorhanden)."""
import random, statistics as st, json, math, sys

CAP = 60
COST = dict(invite=40, sow=60)
DEKO = [80, 80, 100, 100, 120, 120, 150, 150, 200, 200, 250, 300]  # 12 Deko-Teile, Summe 1850
RANKS = [('Sammler', 0), ('Spurenleser', 150), ('Kartograf', 500), ('Botaniker', 1200), ('Archivar', 2500), ('Meister-Entdecker', 5000)]
RANKS_C = [('Sammler', 0), ('Spurenleser', 200), ('Kartograf', 700), ('Botaniker', 1800), ('Archivar', 3500), ('Meister-Entdecker', 7000)]
TYPES = ['Blatt', 'Frucht', 'Wurzel', 'Zwiebel', 'Hülse', 'Spross', 'Pilz']
# Monster je Typ (Monatsmonster m*, Bonus b*)
POOL = {'Blatt': ['m1', 'm11', 'b5'], 'Frucht': ['m2', 'm3', 'm6', 'm7'], 'Wurzel': ['m4', 'm10', 'b1'], 'Zwiebel': ['m5', 'b2'], 'Hülse': ['b3'], 'Spross': ['m8', 'b4'], 'Pilz': ['m9', 'b6']}
MONTHLY = [f'm{i}' for i in range(1, 12)]
BONUS = [f'b{i}' for i in range(1, 7)]
# Anteil getrackter Tage, an denen ein Typ vorkommt (gemüsereicher Alltag, Annahme)
TYPE_P = {'Blatt': .6, 'Frucht': .8, 'Wurzel': .4, 'Zwiebel': .6, 'Hülse': .7, 'Spross': .1, 'Pilz': .15}

PERSONAS = {
    # track: Anteil getrackter Tage; scan0/scanInf: neue Produkte/Tag am Anfang/dauerhaft; fill, slice: pro Tag; recipe, share: pro Woche; task: P(Wochenauftrag)
    'Gelegentlich': dict(track=.5, scan0=.8, scanInf=.05, fill=.05, slice=.03, recipe=.05, share=.05, task=.15, open=.5),
    'Regelmäßig': dict(track=.85, scan0=2.0, scanInf=.15, fill=.25, slice=.12, recipe=.3, share=.3, task=.5, open=.9),
    'Datenfan': dict(track=.95, scan0=4.0, scanInf=.4, fill=.8, slice=.3, recipe=.8, share=.9, task=.9, open=1.0),
    'Mitnutzer (Daten geteilt)': dict(track=.8, scan0=.6, scanInf=.1, fill=.15, slice=.08, recipe=.2, share=.2, task=.4, open=.8),
}


def unlocked(m, earned, d=0, rule='D'):
    if rule == 'E':
        return {'b1': 0, 'b2': 0, 'b3': 700, 'b4': 700, 'b5': 1800, 'b6': 1800}[m] <= earned or d >= {'b1': 0, 'b2': 0, 'b3': 120, 'b4': 120, 'b5': 240, 'b6': 240}[m]
    return {'b1': 0, 'b2': 0, 'b3': 700, 'b4': 700, 'b5': 1800, 'b6': 1800}[m] <= earned


def pois(lam, r):
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= r.random()
        if p < L:
            return k
        k += 1


def run(p, rule, seed, gift=True, days=365, cap=CAP):
    r = random.Random(seed)
    samen = earned = 0
    owned, typedays, evolved = set(), {}, set()
    plots = []  # Restliche getrackte Tage bis Schlüpfen
    deko_i = 0
    deko = list(DEKO)
    hist7 = []
    dup = shiny = visits = invites = sows = 0
    month_owned_by_visit = 0
    log = []
    egg_empty_day = None
    first_all_bonus = None
    for d in range(days):
        if rule in 'DE' and d % 30 == 0:
            deko.append(150)
        if d % 30 == 0 and d >= 30:  # Monatsei
            cand = [m for m in MONTHLY if m not in owned]
            if cand:
                owned.add(r.choice(cand))
            elif egg_empty_day is None:
                egg_empty_day = d
        tracked = r.random() < p['track']
        income = 0
        if tracked:
            lam = p['scanInf'] + (p['scan0'] - p['scanInf']) * math.exp(-d / 30)
            income += 15 * pois(lam, r) + 10 * pois(p['fill'] * (0.5 + 0.5 * math.exp(-d / 60)), r) + 10 * pois(p['slice'], r)
            if d % 7 == 0:
                income += 20 * pois(p['recipe'], r) + (25 if r.random() < p['share'] else 0)
            income = min(income, cap)
            if d % 7 == 6 and r.random() < p['task']:
                income += 50  # Wochenauftrag außerhalb der Tagesgrenze
        # Mitbringsel: 1×/Tag beim Öffnen, wenn ein Monster im Beet wohnt (P .35, 10–20)
        if gift and r.random() < p['open'] and any(o.startswith('b') for o in owned) and r.random() < (.2 if rule in 'DE' else .35):
            income += r.choice([5, 10]) if rule in 'DE' else r.choice([10, 15, 20])
        samen += income
        earned += income
        # Typen des Tages
        types = [t for t in TYPES if tracked and r.random() < TYPE_P[t]]
        hist7 = (hist7 + [types])[-7:]
        for t in types:
            typedays[t] = typedays.get(t, 0) + 1
        # Beet: Wachstum der Eier
        if tracked:
            plots = [x - 1 for x in plots]
            plots = [x for x in plots if x > 0]
        # Besuch
        if types and (rule not in 'CDE' or r.random() < .4):
            w = {}
            for day in hist7:
                for t in day:
                    w[t] = w.get(t, 0) + 1
            t = r.choices(list(w), weights=list(w.values()))[0]
            if t in types or True:
                cands = POOL[t] if rule == 'A' else [m for m in POOL[t] if (m.startswith('b') and (rule not in 'DE' or unlocked(m, earned, d, rule))) or m in owned]
                if cands:
                    m = r.choice(cands)
                    visits += 1
                    want = (m not in owned) or rule not in 'CDE'
                    if rule in 'CDE' and m in owned:
                        dup += 1; shiny += r.random() < 1 / 8
                    if want and samen >= COST['invite'] and len(plots) < 5:
                        samen -= COST['invite']; invites += 1; plots.append(3)
                        if m in owned:
                            dup += 1
                            if r.random() < 1 / 8:
                                shiny += 1
                        else:
                            owned.add(m)
                            if m.startswith('m'):
                                month_owned_by_visit += 1
        # Säen, wenn Reserve fürs Einladen bleibt
        if samen >= COST['sow'] + COST['invite'] and len(plots) < 5 and r.random() < .5 and (rule not in 'CDE' or any(b not in owned and (rule not in 'DE' or unlocked(b, earned, d, rule)) for b in BONUS)):
            samen -= COST['sow']; sows += 1; plots.append(3)
            t = r.choice(TYPES)
            cands = POOL[t] if rule == 'A' else [m for m in POOL[t] if (m.startswith('b') and (rule not in 'DE' or unlocked(m, earned, d, rule))) or m in owned]
            m = r.choice(cands) if cands else None
            if m and m not in owned:
                owned.add(m)
            elif m:
                dup += 1
                shiny += r.random() < 1 / 8
        # Deko kaufen, wenn viel übrig
        if deko_i < len(deko) and samen >= deko[deko_i] + (60 if rule in 'CDE' else 100):
            samen -= deko[deko_i]; deko_i += 1
        if first_all_bonus is None and all(b in owned for b in BONUS):
            first_all_bonus = d
        if d in (29, 89, 179, 364):
            rank = [n for n, v in (RANKS_C if rule in 'CDE' else RANKS) if earned >= v][-1]
            log.append(dict(day=d + 1, earned=earned, saldo=samen, rank=rank, bonus=sum(b in owned for b in BONUS), monthly=sum(m in owned for m in MONTHLY),
                            deko=deko_i, invites=invites, sows=sows, dup=dup, shiny=shiny))
    return log, egg_empty_day, first_all_bonus, month_owned_by_visit


def summarize(rule, gift=True, cap=CAP):
    out = {}
    for name, p in PERSONAS.items():
        runs = [run(p, rule, s, gift, cap=cap) for s in range(400)]
        res = {}
        for i, day in enumerate([30, 90, 180, 365]):
            rows = [x[0][i] for x in runs]
            q = lambda k: (st.quantiles([r[k] for r in rows], n=10)[0], st.median([r[k] for r in rows]), st.quantiles([r[k] for r in rows], n=10)[-1])
            ranks = {}
            for r_ in rows:
                ranks[r_['rank']] = ranks.get(r_['rank'], 0) + 1
            res[day] = dict(earned=q('earned'), saldo=q('saldo'), bonus=q('bonus'), monthly=q('monthly'), deko=q('deko'), shiny=q('shiny'),
                            rank=max(ranks, key=ranks.get), deko_total=None)
        eggs = [x[1] for x in runs]
        allb = [x[2] for x in runs if x[2] is not None]
        res['egg_empty_median'] = st.median([e for e in eggs if e is not None]) if any(e is not None for e in eggs) else None
        res['egg_empty_share'] = sum(e is not None for e in eggs) / len(eggs)
        res['all_bonus_median_day'] = st.median(allb) if allb else None
        res['all_bonus_share'] = len(allb) / len(runs)
        res['month_by_visit'] = st.median([x[3] for x in runs])
        out[name] = res
    return out


if __name__ == '__main__':
    R = {'A': summarize('A'), 'B': summarize('B'), 'C': summarize('C'), 'D': summarize('D'), 'E': summarize('E')}
    json.dump(R, open('sim_result.json', 'w'), ensure_ascii=False, indent=1)
    for rule in 'E':
        print(f'\n===== Regel {rule} =====')
        for n, res in R[rule].items():
            print(f'-- {n}: Ei leer bei {res["egg_empty_share"]:.0%} (Median Tag {res["egg_empty_median"]}), alle 6 Bonus bei {res["all_bonus_share"]:.0%} (Median Tag {res["all_bonus_median_day"]}), Monatsmonster per Besuch {res["month_by_visit"]}')
            for d in (30, 90, 180, 365):
                x = res[d]
                print(f'   Tag {d:3}: verdient {x["earned"][1]:5.0f} [{x["earned"][0]:.0f}–{x["earned"][2]:.0f}]  Saldo {x["saldo"][1]:4.0f}  Rang {x["rank"]:17}  Bonus {x["bonus"][1]:.0f}/6  Monat {x["monthly"][1]:.0f}/11  Deko {x["deko"][1]:.0f}/12  Schillernd {x["shiny"][1]:.0f}')
