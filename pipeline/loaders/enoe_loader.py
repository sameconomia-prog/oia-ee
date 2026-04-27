# pipeline/loaders/enoe_loader.py
"""Descarga indicadores ENOE del INEGI vía API BIE (token gratuito)."""
from datetime import date
import httpx
import structlog

logger = structlog.get_logger()

_INEGI_API = "https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR"
# Series BIE ENOE
_SERIE_TDA = "6200093677"   # Tasa de desocupación abierta (%) — trimestral
_SERIE_POB = "6200093696"   # Población ocupada total (miles de personas) — trimestral

# Códigos de área geográfica BIE: 070000=Nacional, 070001=Ags ... 070032=Zac
_GEOGRAFIAS: dict[str, str] = {
    "Nacional":             "070000",
    "Aguascalientes":       "070001",
    "Baja California":      "070002",
    "Baja California Sur":  "070003",
    "Campeche":             "070004",
    "Coahuila":             "070005",
    "Colima":               "070006",
    "Chiapas":              "070007",
    "Chihuahua":            "070008",
    "Ciudad de México":     "070009",
    "Durango":              "070010",
    "Guanajuato":           "070011",
    "Guerrero":             "070012",
    "Hidalgo":              "070013",
    "Jalisco":              "070014",
    "México":               "070015",
    "Michoacán":            "070016",
    "Morelos":              "070017",
    "Nayarit":              "070018",
    "Nuevo León":           "070019",
    "Oaxaca":               "070020",
    "Puebla":               "070021",
    "Querétaro":            "070022",
    "Quintana Roo":         "070023",
    "San Luis Potosí":      "070024",
    "Sinaloa":              "070025",
    "Sonora":               "070026",
    "Tabasco":              "070027",
    "Tamaulipas":           "070028",
    "Tlaxcala":             "070029",
    "Veracruz":             "070030",
    "Yucatán":              "070031",
    "Zacatecas":            "070032",
}

_TRIMESTRE_A_MES = {1: 1, 2: 4, 3: 7, 4: 10}


def _fetch_serie(serie: str, geo_code: str, anio: int, trimestre: int,
                 token: str) -> float | None:
    """Llama BIE para un indicador + geografía. Filtra el período deseado. Retorna valor o None."""
    mes = _TRIMESTRE_A_MES[trimestre]
    target_period = f"{anio}/{mes:02d}"
    url = f"{_INEGI_API}/{serie}/es/{geo_code}/false/BIE/2.0/{token}.json"
    try:
        resp = httpx.get(url, timeout=15.0)
        resp.raise_for_status()
        data = resp.json()
        obs = data.get("Series", [{}])[0].get("Obs", [])
        match = next((o for o in obs if o.get("TIME_PERIOD") == target_period), None)
        if match:
            raw = match.get("OBS_VALUE")
            return float(raw) if raw not in (None, "") else None
    except Exception as e:
        logger.warning("enoe_serie_error", serie=serie, geo=geo_code, error=str(e))
    return None


def fetch_enoe_indicadores(anio: int, trimestre: int, api_token: str) -> list[dict]:
    """Descarga TDA y población ocupada ENOE para todos los estados y Nacional.

    Retorna lista de dicts con campos del modelo IndicadorENOE.
    Si api_token vacío → retorna lista vacía.
    """
    if not api_token:
        logger.warning("enoe_no_token")
        return []

    fecha_corte = date(anio, _TRIMESTRE_A_MES[trimestre], 1)
    results = []
    for estado, geo_code in _GEOGRAFIAS.items():
        tda = _fetch_serie(_SERIE_TDA, geo_code, anio, trimestre, api_token)
        pob = _fetch_serie(_SERIE_POB, geo_code, anio, trimestre, api_token)
        if tda is not None or pob is not None:
            results.append({
                "estado": estado,
                "anio": anio,
                "trimestre": trimestre,
                "tasa_desempleo": tda,
                "poblacion_ocupada": int(pob) if pob is not None else None,
                "fecha_corte": fecha_corte,
            })
    logger.info("enoe_fetch_ok", anio=anio, trimestre=trimestre, registros=len(results))
    return results
