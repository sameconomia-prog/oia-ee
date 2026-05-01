"""Tests para pipeline/monitoring.py — helpers de registro y alertas."""
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from pipeline.db.models import Base, PipelineRun


@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite+pysqlite:///:memory:", echo=False)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture
def session(engine):
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


def _make_run(session, job_id: str, status: str):
    run = PipelineRun(
        job_id=job_id,
        ran_at=datetime.now(timezone.utc),
        status=status,
        message="test",
    )
    session.add(run)
    session.commit()
    return run


# --- _write_pipeline_run ---

def test_write_pipeline_run_creates_row(session):
    from pipeline.monitoring import _write_pipeline_run
    with patch("pipeline.monitoring.get_session") as mock_gs:
        mock_gs.return_value.__enter__ = lambda s: session
        mock_gs.return_value.__exit__ = MagicMock(return_value=False)
        _write_pipeline_run("test_job", "ok", "mensaje")

    row = session.query(PipelineRun).filter_by(job_id="test_job").first()
    assert row is not None
    assert row.status == "ok"
    assert row.message == "mensaje"
    # SQLite strips tzinfo on round-trip; verify the datetime was set (non-null)
    assert row.ran_at is not None


# --- _get_previous_status ---

def test_get_previous_status_returns_none_when_no_runs(session):
    from pipeline.monitoring import _get_previous_status
    with patch("pipeline.monitoring.get_session") as mock_gs:
        mock_gs.return_value.__enter__ = lambda s: session
        mock_gs.return_value.__exit__ = MagicMock(return_value=False)
        result = _get_previous_status("job_that_never_ran")
    assert result is None


def test_get_previous_status_returns_last_status(session):
    from pipeline.monitoring import _get_previous_status
    _make_run(session, "my_job", "ok")
    _make_run(session, "my_job", "error")
    with patch("pipeline.monitoring.get_session") as mock_gs:
        mock_gs.return_value.__enter__ = lambda s: session
        mock_gs.return_value.__exit__ = MagicMock(return_value=False)
        result = _get_previous_status("my_job")
    assert result == "error"


# --- notify_job_result: deduplicación de emails ---

def test_notify_sends_alert_on_first_error(session):
    """ok → error: debe enviar alert email."""
    _make_run(session, "job_a", "ok")
    with (
        patch("pipeline.monitoring.get_session") as mock_gs,
        patch("pipeline.monitoring._send_alert_email") as mock_alert,
        patch("pipeline.monitoring._send_recovery_email") as mock_recovery,
    ):
        mock_gs.return_value.__enter__ = lambda s: session
        mock_gs.return_value.__exit__ = MagicMock(return_value=False)
        from pipeline.monitoring import notify_job_result
        notify_job_result("job_a", error=ValueError("fallo"))
    mock_alert.assert_called_once()
    mock_recovery.assert_not_called()


def test_notify_skips_alert_on_consecutive_errors(session):
    """error → error: NO debe re-enviar alert email."""
    _make_run(session, "job_b", "error")
    with (
        patch("pipeline.monitoring.get_session") as mock_gs,
        patch("pipeline.monitoring._send_alert_email") as mock_alert,
        patch("pipeline.monitoring._send_recovery_email") as mock_recovery,
    ):
        mock_gs.return_value.__enter__ = lambda s: session
        mock_gs.return_value.__exit__ = MagicMock(return_value=False)
        from pipeline.monitoring import notify_job_result
        notify_job_result("job_b", error=ValueError("otro fallo"))
    mock_alert.assert_not_called()
    mock_recovery.assert_not_called()


def test_notify_sends_recovery_on_ok_after_error(session):
    """error → ok: debe enviar recovery email."""
    _make_run(session, "job_c", "error")
    with (
        patch("pipeline.monitoring.get_session") as mock_gs,
        patch("pipeline.monitoring._send_alert_email") as mock_alert,
        patch("pipeline.monitoring._send_recovery_email") as mock_recovery,
    ):
        mock_gs.return_value.__enter__ = lambda s: session
        mock_gs.return_value.__exit__ = MagicMock(return_value=False)
        from pipeline.monitoring import notify_job_result
        notify_job_result("job_c", error=None)
    mock_recovery.assert_called_once()
    mock_alert.assert_not_called()
