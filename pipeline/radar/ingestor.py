# pipeline/radar/ingestor.py
"""Orquestador del Radar IA: fuentes → extractor → validación → PostgreSQL."""
import structlog
from dataclasses import dataclass
from datetime import date
from sqlalchemy.orm import Session
from pipeline.radar.sources.grok_source import fetch_grok_news
from pipeline.radar.sources.newsapi_source import fetch_newsapi_articles
from pipeline.radar.extractor import extract_despido_event, extract_empleo_event
from pipeline.db.models_radar import EventoIADespido, EventoIAEmpleo

logger = structlog.get_logger()


@dataclass
class IngestResult:
    procesados: int = 0
    insertados: int = 0
    duplicados: int = 0
    errores: int = 0


def _parse_date(value) -> date:
    """Convierte string YYYY-MM-DD o date a date de Python."""
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value)
    return date.today()


def _url_exists_despido(db: Session, url: str) -> bool:
    return db.query(EventoIADespido).filter_by(fuente_url=url).first() is not None


def _url_exists_empleo(db: Session, url: str) -> bool:
    return db.query(EventoIAEmpleo).filter_by(fuente_url=url).first() is not None


def run_radar_ingestion(db: Session, tipo: str = "despidos") -> IngestResult:
    """Corre un ciclo completo de ingesta del radar. tipo: 'despidos' | 'empleos'"""
    result = IngestResult()

    grok_articles = fetch_grok_news(tipo=tipo)
    newsapi_articles = fetch_newsapi_articles(tipo=tipo)
    all_articles = grok_articles + newsapi_articles

    logger.info("radar_ingestion_start", tipo=tipo, total_articles=len(all_articles))

    for article in all_articles:
        result.procesados += 1
        url = getattr(article, "url", "")

        if tipo == "despidos" and _url_exists_despido(db, url):
            result.duplicados += 1
            continue
        if tipo == "empleos" and _url_exists_empleo(db, url):
            result.duplicados += 1
            continue

        try:
            texto = getattr(article, "resumen", "") or getattr(article, "contenido", "")
            if tipo == "despidos":
                extracted = extract_despido_event(texto)
                if extracted:
                    evento = EventoIADespido(
                        empresa=extracted.empresa,
                        sector=extracted.sector,
                        pais=extracted.pais,
                        fecha_anuncio=_parse_date(extracted.fecha_anuncio),
                        numero_despidos=extracted.numero_despidos,
                        rango_min_despidos=extracted.rango_min_despidos,
                        rango_max_despidos=extracted.rango_max_despidos,
                        salario_promedio_usd=extracted.salario_promedio_usd,
                        ia_tecnologia=extracted.ia_tecnologia,
                        area_reemplazada=extracted.area_reemplazada,
                        porcentaje_fuerza_laboral=extracted.porcentaje_fuerza_laboral,
                        es_reemplazo_total=extracted.es_reemplazo_total,
                        fuente_url=url,
                        fuente_nombre=getattr(article, "fuente", ""),
                        confiabilidad=extracted.confiabilidad,
                        resumen_haiku=texto[:500],
                    )
                    db.add(evento)
                    db.flush()
                    result.insertados += 1
            else:
                extracted = extract_empleo_event(texto)
                if extracted:
                    evento = EventoIAEmpleo(
                        empresa=extracted.empresa,
                        sector=extracted.sector,
                        pais=extracted.pais,
                        fecha_anuncio=_parse_date(extracted.fecha_anuncio),
                        numero_empleos=extracted.numero_empleos,
                        tipo_contrato=extracted.tipo_contrato,
                        titulo_puesto=extracted.titulo_puesto,
                        habilidades_requeridas=extracted.habilidades_requeridas,
                        salario_min_usd=extracted.salario_min_usd,
                        salario_max_usd=extracted.salario_max_usd,
                        ia_tecnologia_usada=extracted.ia_tecnologia_usada,
                        fuente_url=url,
                        fuente_nombre=getattr(article, "fuente", ""),
                        confiabilidad=extracted.confiabilidad,
                        resumen_haiku=texto[:500],
                    )
                    db.add(evento)
                    db.flush()
                    result.insertados += 1
        except Exception as e:
            logger.error("radar_ingest_error", url=url, error=str(e))
            result.errores += 1

    logger.info("radar_ingestion_complete", tipo=tipo, **result.__dict__)
    return result
