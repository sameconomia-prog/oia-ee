"""Job trimestral: descarga indicadores ENOE → upsert en indicador_enoe."""
import os
from datetime import date
import structlog
from sqlalchemy.orm import Session
from pipeline.loaders.enoe_loader import fetch_enoe_indicadores
from pipeline.db.models_enoe import IndicadorENOE

logger = structlog.get_logger()


def _trimestre_anterior(hoy: date | None = None) -> tuple[int, int]:
    """Retorna (anio, trimestre) del trimestre anterior a hoy."""
    ref = hoy or date.today()
    mes = ref.month
    if mes <= 3:
        return ref.year - 1, 4
    elif mes <= 6:
        return ref.year, 1
    elif mes <= 9:
        return ref.year, 2
    else:
        return ref.year, 3


def run_enoe_ingest(session: Session, anio: int | None = None,
                    trimestre: int | None = None) -> dict:
    """Descarga indicadores ENOE y hace upsert en la BD.

    Si anio/trimestre no se especifican usa el trimestre anterior.
    Retorna {"procesados": N, "insertados": N, "actualizados": N}.
    """
    if anio is None or trimestre is None:
        anio, trimestre = _trimestre_anterior()

    api_token = os.getenv("INEGI_API_TOKEN", "")
    records = fetch_enoe_indicadores(anio, trimestre, api_token)
    procesados = insertados = actualizados = 0

    for r in records:
        procesados += 1
        existing = session.query(IndicadorENOE).filter_by(
            estado=r["estado"],
            anio=r["anio"],
            trimestre=r["trimestre"],
        ).first()

        if existing:
            if r.get("tasa_desempleo") is not None:
                existing.tasa_desempleo = r["tasa_desempleo"]
            if r.get("poblacion_ocupada") is not None:
                existing.poblacion_ocupada = r["poblacion_ocupada"]
            if r.get("fecha_corte"):
                existing.fecha_corte = r["fecha_corte"]
            actualizados += 1
        else:
            session.add(IndicadorENOE(
                estado=r["estado"],
                anio=r["anio"],
                trimestre=r["trimestre"],
                tasa_desempleo=r.get("tasa_desempleo"),
                poblacion_ocupada=r.get("poblacion_ocupada"),
                fecha_corte=r.get("fecha_corte"),
            ))
            insertados += 1

    session.flush()
    result = {"procesados": procesados, "insertados": insertados,
              "actualizados": actualizados}
    logger.info("enoe_ingest_complete", **result)
    return result
