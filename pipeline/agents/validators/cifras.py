"""Detector de cifras sin cita.

Heurística: extrae todo número con decimal o porcentaje del cuerpo MDX y verifica
si tiene una **cita o anclaje verificable** dentro de un contexto cercano (±120 chars).

Anclajes válidos:
- Paréntesis con autor + año: `(Frey & Osborne, 2013)` o `(WEF 2025)` o `(McKinsey, 2024)`
- Frase con verbo de atribución: "según…", "de acuerdo con…", "estima…", "calculan…", "reporta…"
- Mención explícita de fuente reconocida: WEF, McKinsey, CEPAL, Frey, Osborne, Eloundou, Anthropic, IMSS, INEGI, OCC, STPS, ANUIES, OIA-EE, OIA EE, observatorio
- Auto-referencias al observatorio: "el OIA-EE mide…", "datos propios…", "el indicador…"

Si una cifra no encuentra anclaje, se reporta como `CifraHit(cited=False)`.
El llamador decide si bloquear publish, marcar warning o ignorar.
"""
from __future__ import annotations
import re
from dataclasses import dataclass

# Cifras: porcentaje, decimal con coma o punto, entero ≥ 2 dígitos.
# Excluye: años (4 dígitos en rango 1900-2099) y números simples 1-9 sin contexto.
_CIFRA_RE = re.compile(
    r"\b("
    r"\d{1,3}(?:[.,]\d{1,3})?\s*%|"     # porcentajes 12% / 12.5% / 12,5 %
    r"0[.,]\d{1,3}|"                     # decimales 0,72 / 0.72
    r"\d{1,3}[.,]\d{1,3}\s*(?:millones|mil|veces)|"
    r"\d{2,5}"                           # enteros >=2 dígitos
    r")\b"
)
_YEAR_RE = re.compile(r"^(19|20)\d{2}$")
_CITATION_KEYWORDS = re.compile(
    r"(WEF|World Economic Forum|McKinsey|CEPAL|Frey|Osborne|Eloundou|Anthropic|"
    r"IMSS|INEGI|ENOE|OCC|STPS|ANUIES|OIA-EE|OIA EE|observatorio|"
    r"según|de acuerdo con|estima|estiman|calcula|calculan|reporta|reportan|"
    r"proyecta|proyectan|muestra|muestran|encontró|encontraron|"
    r"\(\d{4}\)|\(\w+,?\s*\d{4}\)|"     # (2013), (Frey 2013), (Frey, 2013)
    r"Future of Jobs|AI Index)",
    re.IGNORECASE,
)
_CONTEXT_RADIUS = 140  # chars antes/después


@dataclass
class CifraHit:
    cifra: str
    pos: int
    context: str
    cited: bool


def scan_cifras_sin_cita(mdx_body: str) -> list[CifraHit]:
    """Devuelve TODAS las cifras detectadas con flag `cited`."""
    hits: list[CifraHit] = []
    for m in _CIFRA_RE.finditer(mdx_body):
        cifra = m.group(1).strip()
        # Filtrar años (4 dígitos 1900-2099) y números super pequeños sin %
        if _YEAR_RE.match(cifra):
            continue
        try:
            n = float(cifra.replace(",", ".").replace("%", "").replace("millones", "").replace("mil", "").replace("veces", "").strip())
            if n < 2 and "%" not in cifra and "." not in cifra and "," not in cifra:
                continue  # números sueltos 1, 0
        except ValueError:
            pass

        start = max(0, m.start() - _CONTEXT_RADIUS)
        end = min(len(mdx_body), m.end() + _CONTEXT_RADIUS)
        ctx = mdx_body[start:end]
        cited = bool(_CITATION_KEYWORDS.search(ctx))
        hits.append(CifraHit(cifra=cifra, pos=m.start(), context=ctx.replace("\n", " "), cited=cited))
    return hits


def cifras_summary(mdx_body: str) -> dict:
    """Estadísticas para reportar en CLI."""
    hits = scan_cifras_sin_cita(mdx_body)
    if not hits:
        return {"total": 0, "cited": 0, "uncited": 0, "ratio_cited": 1.0, "uncited_examples": []}
    cited = sum(1 for h in hits if h.cited)
    uncited = [h for h in hits if not h.cited]
    return {
        "total": len(hits),
        "cited": cited,
        "uncited": len(uncited),
        "ratio_cited": cited / len(hits),
        "uncited_examples": [
            {"cifra": h.cifra, "context": h.context[:200] + "…"} for h in uncited[:5]
        ],
    }


__all__ = ["scan_cifras_sin_cita", "cifras_summary", "CifraHit"]
