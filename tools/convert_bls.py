"""Konvertiert die BLS-4.0-Excel-Datei in das kompakte JSON-Format der App.

Aufruf:
    python3 tools/convert_bls.py BLS_4_0_Daten_2025_DE.xlsx data/bls.json

Übernommen werden nur Code, Name, Energie (kcal) sowie Eiweiß, Kohlenhydrate und Fett
je 100 g. Die Spaltennamen werden beim ersten Lauf ausgegeben und müssen ggf. unten in
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
        })

    out = {
        "meta": {
            "source": "Max Rubner-Institut (2025). Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.",
            "doi": "10.25826/Data20251217-134202-0",
            "note": "Auszug: nur Energie und Makronährstoffe je 100 g.",
            "count": len(foods),
        },
        "foods": foods,
    }
    with open(dst, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(foods)} Lebensmittel nach {dst} geschrieben.")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
