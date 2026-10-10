"""Konvertiert die BLS-4.0-Excel-Datei in das kompakte JSON-Format der App.

Aufruf:
    python3 tools/convert_bls.py BLS_4_0_Daten_2025_DE.xlsx data/bls.json

Übernommen werden nur Code, Name, Energie (kcal), Eiweiß, Kohlenhydrate, Fett,
Ballaststoffe und Zucker je 100 g. Die Spaltennamen werden beim ersten Lauf ausgegeben und müssen ggf. unten in
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
}

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


def main(src, dst):
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
        d, a = classify(str(r[cols["id"]]), str(name).strip())
        if d is not None:
            foods[-1]["d"] = d
            if a:
                foods[-1]["a"] = a
        if str(r[cols["id"]]) in BASICS:
            foods[-1]["b"] = 1

    out = {
        "meta": {
            "source": "Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.",
            "doi": "10.25826/Data20251217-134202-0",
            "note": "Auszug: Energie, Makronährstoffe, Ballaststoffe und Zucker je 100 g; Ernährungsform/Allergene abgeleitet (siehe tools/convert_bls.py).",
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


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
