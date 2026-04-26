import structlog
from dataclasses import dataclass
from datetime import date
from typing import Optional
import pandas as pd
from statsforecast import StatsForecast
from statsforecast.models import AutoETS

logger = structlog.get_logger()

_MIN_POINTS = 8
_MODEL_VERSION = "AutoETS-v1"


@dataclass
class PredRow:
    fecha_prediccion: date
    valor_predicho: float
    ci_80_lower: Optional[float]
    ci_80_upper: Optional[float]
    ci_95_lower: Optional[float]
    ci_95_upper: Optional[float]
    modelo_version: str = _MODEL_VERSION


def run_forecast(
    series: list[tuple[date, float]],
    horizonte_trimestres: int = 20,
) -> list[PredRow]:
    if len(series) < _MIN_POINTS:
        logger.debug("forecast_skipped_insufficient_data", n_points=len(series))
        return []

    df = pd.DataFrame({
        'unique_id': ['serie'] * len(series),
        'ds': pd.to_datetime([str(f) for f, _ in series]),
        'y': [float(v) for _, v in series],
    })

    try:
        sf = StatsForecast(
            models=[AutoETS(season_length=1)],
            freq='QS',
            n_jobs=1,
        )
        sf.fit(df)
        forecast_df = sf.predict(h=horizonte_trimestres, level=[80, 95])
    except Exception as e:
        logger.error("forecast_failed", error=str(e), n_points=len(series))
        return []

    rows = []
    for _, row in forecast_df.iterrows():
        rows.append(PredRow(
            fecha_prediccion=row['ds'].date() if hasattr(row['ds'], 'date') else row['ds'],
            valor_predicho=float(row.get('AutoETS', 0.0)),
            ci_80_lower=_safe_float(row.get('AutoETS-lo-80')),
            ci_80_upper=_safe_float(row.get('AutoETS-hi-80')),
            ci_95_lower=_safe_float(row.get('AutoETS-lo-95')),
            ci_95_upper=_safe_float(row.get('AutoETS-hi-95')),
        ))

    logger.info("forecast_complete", n_predictions=len(rows), horizonte=horizonte_trimestres)
    return rows


def _safe_float(val) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None
