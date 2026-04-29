# pipeline/loaders/enoe_loader.py
"""Descarga indicadores ENOE del INEGI vía API de Indicadores v2.0 (fuente BISE)."""
from datetime import date
import httpx
import structlog

logger = structlog.get_logger()

_INEGI_API = (
    "https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR"
)
# Series ENOE (Encuesta Nacional de Ocupación y Empleo)
_SERIE_TDA = "6200093677"   # Tasa de desocupación abierta (%) — trimestral
_SERIE_POB = "6200093696"   # Población ocupada total (miles de personas) — trimestral

# Códigos de área geográfica v2.0: 00=Nacional, 01=Ags ... 32=Zac
_GEOGRAFIAS: dict[str, str] = {
    "Nacional":             "00",
    "Aguascalientes":       "01",
    "Baja California":      "02",
    "Baja California Sur":  "03",
    "Campeche":             "04",
    "Coahuila":             "05",
    "Colima":               "06",
    "Chiapas":              "07",
    "Chihuahua":            "08",
    "Ciudad de México":     "09",
    "Durango":              "10",
    "Guanajuato":           "11",
    "Guerrero":             "12",
    "Hidalgo":              "13",
    "Jalisco":              "14",
    "México":               "15",
    "Michoacán":            "16",
    "Morelos":              "17",
    "Nayarit":              "18",
    "Nuevo León":           "19",
    "Oaxaca":               "20",
    "Puebla":               "21",
    "Querétaro":            "22",
    "Quintana Roo":         "23",
    "San Luis Potosí":      "24",
    "Sinaloa":              "25",
    "Sonora":               "26",
    "Tabasco":              "27",
    "Tamaulipas":           "28",
    "Tlaxcala":             "29",
    "Veracruz":             "30",
    "Yucatán":              "31",
    "Zacatecas":            "32",
}

_TRIMESTRE_A_MES = {1: 1, 2: 4, 3: 7, 4: 10}


def _fetch_serie(serie: str, geo_code: str, anio: int, trimestre: int,
                 token: str) -> float | None:
    """Llama API BISE para un indicador + geografía. Filtra el período deseado."""
    mes = _TRIMESTRE_A_MES[trimestre]
    target_period = f"{anio}/{mes:02d}"
    url = (
        f"{_INEGI_API}/{serie}/es/{geo_code}/false/BISE/2.0/{token}"
        "?type=json"
    )
    try:
        resp = httpx.get(url, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        # v2.0 usa OBSERVATIONS (antes era Obs)
        obs = data.get("Series", [{}])[0].get("OBSERVATIONS", [])
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
