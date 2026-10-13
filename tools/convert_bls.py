"""Konvertiert die BLS-4.0-Excel-Datei in das kompakte JSON-Format der App.

Aufruf:
    python3 tools/convert_bls.py BLS_4_0_Daten_2025_DE.xlsx data/bls.json [data/bls_micro.json]

Mit dem dritten Argument werden zusätzlich ausgewählte Mikronährstoffe (siehe MICRO_HINTS) in eine eigene,
nur bei Bedarf geladene Datei geschrieben. Die Spaltenerkennung für Mikronährstoffe ist NICHT an der echten
Datei geprüft (die Datei lag beim Schreiben nicht vor): Das Skript gibt die gefundenen Spalten aus – bitte
kontrollieren, dass Einheit und Nährstoff stimmen, bevor die Datei ins Repo kommt.

Übernommen werden nur Code, Name, Energie (kcal), Eiweiß, Kohlenhydrate, Fett,
Ballaststoffe, Zucker (plus abgeleiteter freier Zucker) je 100 g. Die Spaltennamen werden beim ersten Lauf ausgegeben und müssen ggf. unten in
COLUMN_HINTS angepasst werden.

Quelle: Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0.
DOI: 10.25826/Data20251217-134202-0
"""
import json
import sys

import openpyxl

# Suchbegriffe (klein geschrieben) zur Erkennung der benötigten Spalten
COLUMN_HINTS = {
    "id": ["bls code"],
    "n": ["lebensmittelbezeichnung"],
    "k": ["enercc energie (kilokalorien) [kcal/100g]"],
    "p": ["prot625 protein (nx6,25) [g/100g]"],
    "c": ["cho kohlenhydrate, verfügbar [g/100g]"],
    "f": ["fat fett [g/100g]"],
    "fi": ["fibt ballaststoffe, gesamt [g/100g]"],
    "su": ["sugar zucker (mono- und disaccharide), gesamt [g/100g]"],
    "lac": ["lacs lactose [g/100g]"],
    "gal": ["gals galactose [g/100g]"],
}

# Mikronährstoffe für data/bls_micro.json: Schlüssel → (Suchbegriffe, erwartete Einheit)
# Gesucht wird ein Spaltenname, der einen der Begriffe UND die Einheit enthält (klein geschrieben).
MICRO_HINTS = {
    "ca": (["calcium"], "mg/100g"),
    "mg": (["magnesium"], "mg/100g"),
    "fe": (["eisen"], "mg/100g"),
    "zn": (["zink"], "mg/100g"),
    "io": (["jodid", "jod "], "µg/100g"),
    "se": (["selen"], "µg/100g"),
    "b12": (["vitamin b12", "cobalamin"], "µg/100g"),
    "d": (["vitamin d ", "vitamin d (", "calciferol"], "µg/100g"),
    "fol": (["folat", "folsäure"], "µg/100g"),
}


def find_micro_columns(header):
    low = [str(h or "").strip().lower().replace("\u03bc", "\u00b5") for h in header]  # griechisches μ wie Mikro-Zeichen µ behandeln
    cols, report = {}, {}
    for key, (hints, unit) in MICRO_HINTS.items():
        hits = [i for i, h in enumerate(low) if unit in h and any(t in h for t in hints)]
        if hits:
            cols[key] = hits[0]
            report[key] = [header[i] for i in hits]
    return cols, report


# ---------------------------------------------------------------------------
# Ernährungsform und Allergene (für die Abend-Vorschläge)
#
# Der BLS enthält keine Allergen- oder Vegan-Angaben. Abgeleitet wird aus der
# Hauptgruppe (erster Buchstabe des BLS-Codes) und aus Stichwörtern im Namen.
# Klassifiziert werden nur Gruppen mit einfachen Zutaten; zusammengesetzte
# Gerichte, Backwaren, Getränke usw. bleiben "unbekannt" (kein Feld d) und
# werden bei aktiven Filtern nicht vorgeschlagen. Kein Ersatz für die
# Zutatenliste – Allergene können über Rezeptur oder Kreuzkontamination
# enthalten sein.
#
# d: 2 = vegan, 1 = vegetarisch, 0 = mit Fleisch/Fisch; fehlt = unbekannt
# a: Allergene nach LMIV Anhang II (ohne Sulfite, die aus dem Namen nicht
#    erkennbar sind): gl Gluten, kr Krebstiere, ei Ei, fi Fisch, er Erdnuss,
#    so Soja, mi Milch, nu Schalenfrüchte, se Sellerie, sf Senf, sa Sesam,
#    lu Lupine, we Weichtiere
# b: 1 = gängige Kochzutat (Basisliste für Vorschläge)
# ---------------------------------------------------------------------------
import re

CLASSIFIED_GROUPS = set("CEFGHKMTUV")
RX = lambda p: re.compile(p)
GLUTEN = RX(r"Mehrkorn|Weizen|Roggen|Gerste|Hafer|Dinkel|Grünkern|Emmer|Einkorn|Kamut|Triticale|Seitan|[Gg]luten(haltig|-)|Couscous|Bulgur|Graupen|Hartweizen|[Pp]aniert|Panade|Paniermehl")
PASTA = RX(r"[Tt]eigwaren|[Nn]udel|Spaghetti|Tortell|Ravioli|Lasagne")
PASTA_FREE = RX(r"Reis|Mais|glutenfrei|Glasnudel|Soja|Linsen|Kichererbs|Buchweizen|Hirse")
CRUST = RX(r"Garnele|Krabbe|[Kk]rebs|Hummer|Languste|Scampi|Shrimp|Kaisergranat|Krill")
MOLL = RX(r"[Mm]uschel|Auster(?!npilz)|Tintenfisch|Kalmar|Krake|Oktopus|Sepia|Schnecke|Abalone")
EGG = RX(r"Hühnerei|Entenei|Gänseei|Putenei|Wachtelei|Eier|\bEi\b|Eigelb|Eiklar|mit Ei")
PEANUT = RX(r"Erdnuss")
SOY = RX(r"[Ss]oja|Tofu|Tempeh|Edamame|Miso")
MILK = RX(r"(?<!Kokos)(?<!Kokosnuss)(?<!Mandel)(?<!Hafer)(?<!Reis)(?<!Soja)[Mm]ilch(?!ersatz)|Butter(?!pilz|bohne)|Käse(?!alternative)|Sahne|Rahm|Joghurt(?!alternative)|Quark|Molke|Kefir|Laktose|Ghee")
NUTS = RX(r"Mandel|Haselnuss|Walnuss|Cashew|Pekan|Paranuss|Pistazie|Macadamia")
CELERY = RX(r"Sellerie")
MUSTARD = RX(r"Senf")
SESAME = RX(r"Sesam|Tahin")
LUPIN = RX(r"Lupine")
MEAT = RX(r"Speck|Fleisch(?!ersatz)|Schinken|Wurst(?!alternative)|\bRind|Schwein|Huhn|Hähnchen|Pute(?!nei)|Fisch|Thunfisch|Lachs|Gelatine|Hack|Brühe|Schmalz")
HONEY = RX(r"Honig(?!melone|gurke)")
VEGAN_HINT = RX(r"vegan")
# Zusammengesetzte oder verarbeitete Produkte: Zutaten aus dem Namen nicht ableitbar -> unbekannt
COMPOSITE = RX(r"(?i)Knödel|Kloß|Klöß|Gnocchi|Spätzle|Schupfnudel|Maultasche|Tortell|Ravioli|Pfannkuchen|Püree|Rösti|Krokette|Pommes|Teig(?!waren)|[Ss]choko|Müsli|Cerealien|[Ff]lakes|Riegel|Gebäck|Kuchen|Pizza|Burger|Bratling|Frikadelle|Nugget|Konfitüre|Marmelade|Soße|Sauce|Dressing|Aufstrich|Pastete|Salat\b|Fertig|Instant|Pulver|Trockenprodukt|Zubereitung|gefüllt|Füllung|paniert")

def classify(code, name):
    g = code[0]
    if g not in CLASSIFIED_GROUPS or COMPOSITE.search(name):
        return None, []
    a = set()
    if GLUTEN.search(name) or (PASTA.search(name) and not PASTA_FREE.search(name)) or ("Grieß" in name and not PASTA_FREE.search(name)):
        a.add("gl")
    if g == "E" and "eifrei" in name:
        pass
    elif EGG.search(name):
        a.add("ei")
    if CRUST.search(name): a.add("kr")
    if MOLL.search(name): a.add("we")
    if g == "T" and not (a & {"kr", "we"}): a.add("fi")
    if PEANUT.search(name): a.add("er")
    if SOY.search(name): a.add("so")
    if g == "M" or MILK.search(name): a.add("mi")
    if NUTS.search(name): a.add("nu")
    if CELERY.search(name): a.add("se")
    if MUSTARD.search(name): a.add("sf")
    if SESAME.search(name): a.add("sa")
    if LUPIN.search(name): a.add("lu")

    if g in "TUV" or (MEAT.search(name) and not VEGAN_HINT.search(name)):
        d = 0
    elif "mi" in a or "ei" in a or HONEY.search(name):
        d = 1
    else:
        d = 2
    return d, sorted(a)

# Gängige Kochzutaten für Vorschläge, falls noch keine eigenen Einträge passen.
# Klassifizierung dieser Liste wurde von Hand geprüft.
BASICS = {
    # Eiweißquellen
    "V416100", "V486100", "U010100", "U284100", "U611100", "T410100", "T207100", "T204100",
    "T121902", "T753100", "H861000", "C558000", "E111100", "M713100", "M711100", "M710100",
    "M012200", "M0A1000", "M524500", "H730000", "H720902", "H742132", "G750100",
    # Kohlenhydrate
    "C352000", "C351000", "E401000", "E510000", "K120100", "K420100", "C118000", "C119200",
    "C119100", "C332000",
    # Gemüse
    "G312100", "G543100", "G582100", "G211100", "G620100", "G480100", "K701100", "G760100",
    "G311100", "G561100", "G510100", "G332100", "G710100", "G470100", "G581000", "G342100",
    # Fett
    "F502100",
}


# ---------------------------------------------------------------------------
# Freier Zucker (fs, g/100 g) nach WHO-Definition: zugesetzte Mono-/Disaccharide
# sowie Zucker in Honig, Sirup, Fruchtsaft und -konzentrat. Nicht frei: Zucker in
# ganzem Obst/Gemüse und Milchzucker. Der BLS hat keine Spalte "zugesetzt" –
# abgeleitet aus Hauptgruppe und Namen (Heuristik, keine Messung). Bei gesüßten
# Milchprodukten wird der Milchzucker (Laktose; bei laktosefrei ≈ 2 × Galaktose)
# abgezogen. Bei gesüßtem Obst/Gerichten zählt der gesamte Zucker als frei.
# ---------------------------------------------------------------------------
NOT_SWEET = RX(r"ungesüßt|ungezuckert|ohne Zucker|zuckerfrei|ohne Zuckerzusatz")
SAVOURY = RX(r"(?i)fleisch|rind|schwein|huhn|hähnchen|pute|ente|gans|lamm|wild|fisch|lachs|hering|thunfisch|wurst|speck|schinken|gemüse|kartoffel|käse|tomate|pilz|zwiebel|kohl|kraut|suppe|brühe|pesto|bratling|linse|bohne|erbse|nudel|teigwaren|(?<!milch)reis\b|pizza|lasagne|gurke|paprika|rote bete|möhre|karotte|spinat|lauch|curry|chili|gulasch|eintopf|salat")
SPICE = RX(r"(?i)salz|pfeffer|paprika|zimt|kümmel|muskat|kräuter|petersilie|basilikum|oregano|thymian|rosmarin|majoran|dill|schnittlauch|gewürz(?!ketchup)|senfkörner|senfsaat|ingwer|knoblauch|zwiebel|chili|kurkuma|koriander|anis|nelke|kardamom|vanilleschote|safran|lorbeer|wacholder|piment|fenchel|hefe|gelatine|agar|backpulver|natron|essig(?!.*balsam)")
SWEET = RX(r"(?i:kompott|gelee|krokant|creme(?!suppe| ?fra)|pudding|[a-zäöü]grütze|rote grütze|grieß(?:brei|flammeri)|flammeri|mousse|parfait|sorbet|tiramisu|strudel|crêpe|crepe|kaiserschmarrn|dampfnudel|germknödel|obstsalat|fruchtsalat|(?:beer|frucht|vanille|schoko|nuss|sahne|speise|milch|joghurt|zitronen|mango|aprikosen|pfirsich|kirsch|mokka|wasser|stracciatella|soft|kaffee|walnuss|haselnuss|pistazien|eier|quark|cassis|himbeer|erdbeer|bananen)eis\b|^eis\b|eistorte|eisbecher|bratapfel|krapfen|zabaione|rumtopf|melba|plotzer|baba\b|schnee\b|schaum(?!wein)|weinchaudeau|kirschsauce|fruchtsauce|beerensauce|preiselbeer|johannisbeersauce|erdbeersauce|vanillesauce|glasur|füllung für|für gebäck|ketchup|grillsauce|marzipan|ganache|pektin)|gezuckert|gesüßt|Zucker(?!rübe|mais|schote|erbse|hut|melone|frei)|Sirup|Honig(?!melone|gurke)|Konfitüre|Marmelade|kandiert|[Ss]chok|Nougat|Karamell|Praline|Dessert|Speiseeis|Torte|Kuchen|Likör|Limonade|Cola|Brause|Kakao|Fruchtzubereitung|Konfekt|Bonbon|Gummi|Lakritz|Waffel|Keks|Plätzchen|Baiser|Fruchtsoße|Süßspeise|Milchreis|Fruchtjoghurt")
JUICE = RX(r"saft|nektar(?!in)|Saft|Nektar(?!in)")
CEREAL_SWEET = RX(r"(?i)cerealien|müsli|flakes|crisp|pops|malzextrakt|riegel|granola")
BREAD_SWEET = RX(r"Stuten|Brioche|Hefezopf|Milchbrötchen|Rosinen|Früchtebrot|Toastbrot süß")
DAIRY_SWEET = RX(r"Frucht|Kakao|Vanille|Milchmisch|Milchshake|Eis\b|Kondensmilch.*gezuckert")
COND_SWEET = RX(r"[Zz]ucker|standmittel|Tortenguss|Vanillin|Dessert|Pudding|Chutney|Orangeat|Zitronat|Ketchup|Soße|Sauce|Senf|Balsam|Sirup|Honig|Konfitüre|gezuckert")


def free_sugar(code, name, su, lac, gal):
    if not su:
        return 0
    g = code[0]
    nm = NOT_SWEET.sub("", name)
    sweet = bool(SWEET.search(nm)) and not NOT_SWEET.search(name)
    milk = (lac or 0) + 2 * (gal or 0)
    if g in "SDNPQTUVW":
        return su
    if NOT_SWEET.search(name) and g not in "SDNP":
        return 0
    if g == "R":
        return 0 if (SPICE.search(name) and not COND_SWEET.search(nm)) else su
    if g == "F":
        return su if (JUICE.search(name.split(",")[0]) and not RX(r"Konserve|Konzentrat").search(name)) or sweet or RX(r"Konzentrat").search(name) else 0
    if g == "M":
        return max(0, round(su - milk, 2)) if (sweet or DAIRY_SWEET.search(nm)) else 0
    if g in "XY":
        return max(0, round(su - milk, 2)) if (sweet or (su >= 8 and not SAVOURY.search(name))) else 0
    if g == "C":
        return su if (sweet or CEREAL_SWEET.search(nm)) and not NOT_SWEET.search(name) else 0
    if g == "B":
        return su if (sweet or BREAD_SWEET.search(nm)) else 0
    return su if sweet else 0  # E, G, H, K


def find_columns(header):
    cols = {}
    low = [str(h or "").strip().lower() for h in header]
    for key, hints in COLUMN_HINTS.items():
        for hint in hints:
            idx = next((i for i, h in enumerate(low) if h == hint), None)
            if idx is None:
                idx = next((i for i, h in enumerate(low) if hint in h), None)
            if idx is not None:
                cols[key] = idx
                break
    return cols


def to_num(v):
    if v is None:
        return None
    try:
        return round(float(str(v).replace(",", ".")), 2)
    except ValueError:
        return None


def main(src, dst, micro_dst=None):
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    cols = find_columns(header)
    print("Gefundene Spalten:", {k: header[i] for k, i in cols.items()})
    missing = set(COLUMN_HINTS) - set(cols)
    if missing:
        print("Fehlende Spalten:", missing)
        print("Alle Spalten:", [h for h in header][:60])
        sys.exit(1)

    mcols = {}
    if micro_dst:
        mcols, report = find_micro_columns(header)
        print("Mikronährstoff-Spalten (bitte prüfen, erster Treffer wird genutzt):")
        for k, names in report.items():
            print(f"  {k}: {names}")
        miss = set(MICRO_HINTS) - set(mcols)
        if miss:
            print("Nicht gefunden:", miss, "– Spaltennamen:", [h for h in header if h][:200])
    micro = {}
    foods = []
    for r in rows:
        name = r[cols["n"]]
        kcal = to_num(r[cols["k"]])
        if not name or kcal is None:
            continue
        foods.append({
            "id": str(r[cols["id"]]),
            "n": str(name).strip(),
            "k": kcal,
            "p": to_num(r[cols["p"]]) or 0,
            "c": to_num(r[cols["c"]]) or 0,
            "f": to_num(r[cols["f"]]) or 0,
            "fi": to_num(r[cols["fi"]]) or 0,
            "su": to_num(r[cols["su"]]) or 0,
        })
        foods[-1]["fs"] = round(free_sugar(str(r[cols["id"]]), str(name).strip(), foods[-1]["su"], to_num(r[cols["lac"]]), to_num(r[cols["gal"]])), 2)
        d, a = classify(str(r[cols["id"]]), str(name).strip())
        if d is not None:
            foods[-1]["d"] = d
            if a:
                foods[-1]["a"] = a
        if str(r[cols["id"]]) in BASICS:
            foods[-1]["b"] = 1
        if mcols:
            vals = [to_num(r[mcols[k]]) if k in mcols else None for k in MICRO_HINTS]
            if any(v is not None for v in vals):
                micro[str(r[cols["id"]])] = vals

    out = {
        "meta": {
            "source": "Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.",
            "doi": "10.25826/Data20251217-134202-0",
            "note": "Auszug: Energie, Makronährstoffe, Ballaststoffe, Zucker und freier Zucker (abgeleitet) je 100 g; Ernährungsform/Allergene abgeleitet (siehe tools/convert_bls.py).",
            "count": len(foods),
        },
        "foods": foods,
    }
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    missing = BASICS - {f["id"] for f in foods if f.get("b")}
    if missing:
        print("Basis-IDs nicht gefunden:", missing)
        sys.exit(1)
    print(f"{len(foods)} Lebensmittel nach {dst} geschrieben.")
    if micro_dst:
        units = {k: u for k, (_, u) in MICRO_HINTS.items()}
        mout = {
            "meta": {
                "source": out["meta"]["source"], "doi": out["meta"]["doi"],
                "note": "Ausgewählte Mikronährstoffe je 100 g; null = kein Wert im BLS.",
                "keys": list(MICRO_HINTS), "units": units, "columns": {k: header[i] for k, i in mcols.items()},
            },
            "foods": micro,
        }
        with open(micro_dst, "w", encoding="utf-8") as fh:
            json.dump(mout, fh, ensure_ascii=False, separators=(",", ":"))
        print(f"Mikronährstoffe für {len(micro)} Lebensmittel nach {micro_dst} geschrieben.")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
