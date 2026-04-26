import pytest
from unittest.mock import patch
from datetime import date
import pandas as pd
from pipeline.predictor.forecaster import run_forecast, PredRow, _MIN_POINTS


def _make_series(n: int) -> list[tuple[date, float]]:
    return [
        (date(2022 + i // 4, (i % 4) * 3 + 1, 1), 0.50 + i * 0.01)
        for i in range(n)
    ]


def test_run_forecast_returns_empty_on_insufficient_data():
    series = _make_series(_MIN_POINTS - 1)
    result = run_forecast(series, horizonte_trimestres=4)
    assert result == []


def test_run_forecast_returns_pred_rows_on_valid_data():
    mock_forecast_df = pd.DataFrame({
        'unique_id': ['serie'] * 4,
        'ds': pd.date_range('2025-01-01', periods=4, freq='QS'),
        'AutoETS': [0.72, 0.74, 0.76, 0.78],
        'AutoETS-lo-80': [0.68, 0.70, 0.72, 0.74],
        'AutoETS-hi-80': [0.76, 0.78, 0.80, 0.82],
        'AutoETS-lo-95': [0.65, 0.67, 0.69, 0.71],
        'AutoETS-hi-95': [0.79, 0.81, 0.83, 0.85],
    })

    with patch('pipeline.predictor.forecaster.StatsForecast') as MockSF:
        mock_instance = MockSF.return_value
        mock_instance.predict.return_value = mock_forecast_df

        series = _make_series(_MIN_POINTS + 2)
        result = run_forecast(series, horizonte_trimestres=4)

    assert len(result) == 4
    assert all(isinstance(r, PredRow) for r in result)
    assert result[0].valor_predicho == pytest.approx(0.72)
    assert result[0].ci_80_lower == pytest.approx(0.68)
    assert result[0].ci_95_upper == pytest.approx(0.79)


def test_run_forecast_returns_empty_on_statsforecast_exception():
    with patch('pipeline.predictor.forecaster.StatsForecast') as MockSF:
        mock_instance = MockSF.return_value
        mock_instance.predict.side_effect = Exception("statsforecast error")

        series = _make_series(_MIN_POINTS + 2)
        result = run_forecast(series, horizonte_trimestres=4)

    assert result == []
