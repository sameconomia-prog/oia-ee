import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia, Vacante

logger = logging.getLogger(__name__)


@dataclass
class D7Result:
    isn: float  # Índice Señal Noticias [0,1]  alto=señal fuerte precede vacantes
    vdm: float  # Velocidad Difusión Mediática [0,1]  alto=mucha actividad reciente
    score: float


def _pearson(x: list[float], y: list[float]) -> float:
    n = len(x)
    if n < 2:
        return 0.0
    mx, my = sum(x) / n, sum(y) / n
    num = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
    dx = sum((xi - mx) ** 2 for xi in x) ** 0.5
    dy = sum((yi - my) ** 2 for yi in y) ** 0.5
    if dx == 0 or dy == 0:
        return 0.0
    return num / (dx * dy)


def calcular_isn(session: Session) -> float:
    """ISN = corr(vol_noticias_sector_t, ΔVacantes_{t+1}) promedio entre sectores.
    Lag de 1 semana. Normalizado de [-1,1] a [0,1]."""
    noticias = (
        session.query(Noticia.sector, Noticia.fecha_pub)
        .filter(Noticia.fecha_pub.isnot(None), Noticia.sector.isnot(None))
        .all()
    )
    vacantes = (
        session.query(Vacante.sector, Vacante.fecha_pub)
        .filter(Vacante.fecha_pub.isnot(None), Vacante.sector.isnot(None))
        .all()
    )
    if not noticias or not vacantes:
        return 0.5

    def week_key(fecha) -> tuple:
        if hasattr(fecha, 'isocalendar'):
            iso = fecha.isocalendar()
            return (iso[0], iso[1])
        return (fecha.year, 1)

    news_sw: dict[str, dict[tuple, int]] = defaultdict(lambda: defaultdict(int))
    for sector, fecha in noticias:
        if fecha:
            news_sw[sector][week_key(fecha)] += 1

    vac_sw: dict[str, dict[tuple, int]] = defaultdict(lambda: defaultdict(int))
    for sector, fecha in vacantes:
        if fecha:
            vac_sw[sector][week_key(fecha)] += 1

    corrs = []
    for sector in set(news_sw) & set(vac_sw):
        weeks = sorted(news_sw[sector])
        if len(weeks) < 3:
            continue
        news_t = [news_sw[sector][w] for w in weeks[:-1]]
        delta_vac = [
            vac_sw[sector].get(weeks[i + 1], 0) - vac_sw[sector].get(weeks[i], 0)
            for i in range(len(weeks) - 1)
        ]
        c = _pearson(news_t, delta_vac)
        corrs.append(c)

    if not corrs:
        return 0.5
    avg_corr = sum(corrs) / len(corrs)
    return round((avg_corr + 1) / 2, 4)


def calcular_vdm(session: Session) -> float:
    """VDM = noticias en últimas 72h / 72h → artículos/hora, normalizado a [0,1].
    5 artículos/hora sostenidos → 1.0 (máxima velocidad)."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=72)
    recent = (
        session.query(Noticia)
        .filter(Noticia.fecha_pub.isnot(None), Noticia.fecha_pub >= cutoff)
        .count()
    )
    vdm_raw = recent / 72.0
    return round(min(1.0, vdm_raw / 5.0), 4)


def calcular_d7(session: Session) -> D7Result:
    isn = calcular_isn(session)
    vdm = calcular_vdm(session)
    score = round(isn * 0.60 + vdm * 0.40, 4)
    return D7Result(isn=isn, vdm=vdm, score=score)
