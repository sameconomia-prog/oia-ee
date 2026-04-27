# pipeline/jobs/imss_ingest_job.py
"""Job mensual: descarga empleo formal IMSS → upsert en empleo_formal_imss."""
from datetime import date
from typing import Optional
import structlog
from sqlalchemy.orm import Session
from pipeline.loaders.imss_loader import fetch_imss_empleo
from pipeline.db.models_imss import EmpleoFormalIMSS

logger = structlog.get_logger()


def _mes_anterior(hoy: Optional[date] = None) -> tuple[int, int]:
    """Retorna (anio, mes) del mes anterior a hoy."""
    ref = hoy or date.today()
    if ref.month == 1:
        return ref.year - 1, 12
    return ref.year, ref.month - 1


def run_imss_ingest(session: Session, anio: Optional[int] = None,
                    mes: Optional[int] = None) -> dict:
    """Descarga empleo formal IMSS y hace upsert en la BD.

    Si anio/mes no se especifican usa el mes anterior.
    Retorna {"procesados": N, "insertados": N, "actualizados": N}.
    """
    if anio is None and mes is None:
        anio, mes = _mes_anterior()

    records = fetch_imss_empleo(anio, mes)
    procesados = insertados = actualizados = 0

    for r in records:
        procesados += 1
        existing = session.query(EmpleoFormalIMSS).filter_by(
            estado=r["estado"],
            sector_scian=r["sector_scian"],
            anio=r["anio"],
            mes=r["mes"],
        ).first()

        if existing:
            existing.trabajadores = r["trabajadores"]
            if r.get("fecha_corte"):
                existing.fecha_corte = r["fecha_corte"]
            actualizados += 1
        else:
            session.add(EmpleoFormalIMSS(
                estado=r["estado"],
                sector_scian=r["sector_scian"],
                sector_nombre=r.get("sector_nombre", ""),
                anio=r["anio"],
                mes=r["mes"],
                trabajadores=r["trabajadores"],
                fecha_corte=r.get("fecha_corte"),
            ))
            insertados += 1

    session.flush()
    result = {"procesados": procesados, "insertados": insertados,
              "actualizados": actualizados}
    logger.info("imss_ingest_complete", **result)
    return result
