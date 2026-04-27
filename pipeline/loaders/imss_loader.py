# pipeline/loaders/imss_loader.py
"""Descarga datos de empleo formal del IMSS Microscopio Laboral (API CKAN pública)."""
from datetime import date
import httpx
import structlog

logger = structlog.get_logger()

_IMSS_API = "https://datos.imss.gob.mx/api/3/action/datastore_search"
_RESOURCE_ID = "c2f11c9f-cbaf-48e9-9e20-39fdb4f85e7f"  # Asegurados por estado/sector

_ESTADO_ALIASES: dict[str, str] = {
    "CDMX": "Ciudad de México",
    "D.F.": "Ciudad de México",
    "Distrito Federal": "Ciudad de México",
    "Estado de México": "México",
    "Edo. de México": "México",
    "Edo. México": "México",
}


def _normalizar_estado(nombre: str) -> str:
    return _ESTADO_ALIASES.get(nombre.strip(), nombre.strip())


def fetch_imss_empleo(anio: int, mes: int, limit: int = 10000) -> list[dict]:
    """Descarga empleo formal IMSS para el periodo anio/mes.

    Retorna lista de dicts con campos: estado, sector_scian, sector_nombre,
    anio, mes, trabajadores, fecha_corte.
    Si la API falla retorna lista vacía.
    """
    try:
        resp = httpx.get(
            _IMSS_API,
            params={
                "resource_id": _RESOURCE_ID,
                "limit": limit,
                "filters": f'{{"anio":"{anio}","mes":"{mes}"}}',
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        records = data.get("result", {}).get("records", [])
        results = []
        fecha_corte = date(anio, mes, 1)
        for r in records:
            try:
                trabajadores = int(float(r.get("total_trabajadores", 0) or 0))
            except (ValueError, TypeError):
                trabajadores = 0
            results.append({
                "estado": _normalizar_estado(r.get("estado", "")),
                "sector_scian": str(r.get("sector", "")).strip(),
                "sector_nombre": r.get("desc_sector", ""),
                "anio": anio,
                "mes": mes,
                "trabajadores": trabajadores,
                "fecha_corte": fecha_corte,
            })
        logger.info("imss_fetch_ok", anio=anio, mes=mes, registros=len(results))
        return results
    except Exception as e:
        logger.error("imss_fetch_error", anio=anio, mes=mes, error=str(e))
        return []
