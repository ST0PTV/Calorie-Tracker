# Design-Generatoren (Level-System „Gemüsemonster“)

Erzeugen die Entwürfe im privaten Canvas „Kalorien Tracker Level-UI“ (nicht die App).
Stand 13.10.2026. Pfade im Code zeigen auf den damaligen temporären Arbeitsordner – vor erneuter Nutzung anpassen.

- `anim.py` – zerlegt Kompendium-SVGs in bewegliche Teile, CSS-Animationen (Ruhe `i-*`, typisch `sg s-*`)
- `bonus.py` – 6 Bonus-Monster (t45–t56), `r3_more.py` – Erntor neu (t57), Arena-Duell, Onboarding, Icons
- `r3kit.py` – Saison-Kostüme (Hüte, Schal) + Szenen-CSS, `r3_garden.py` – Garten, `r3_hatch.py` – Schlüpfen/Entwickeln
- `r3_cards.py` – Sammelkarten/Kostüme, `r3_small.py` – Simulation/Freischaltung/Barrierefreiheit
- `gen_*.py`, `assemble3.py` – Boards + canvas.json, `sim_samen.py` – Monte-Carlo der Samen-Wirtschaft (Regeln A–E), `qa_tool.py` – Render-Check
