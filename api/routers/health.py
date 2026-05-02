"""Endpoint /health — reporta estado real del sistema con frescura por job."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from api.deps import get_db
from pipeline.db.models import PipelineRun

router = APIRouter(tags=["health"])

JOB_THRESHOLDS: dict[str, int] = {
    "news_scraper":    8,
    "stps_loader":     30,
    "kpi_snapshot":    192,
    "resumen_semanal": 192,
    "anuies_loader":   192,
    "imss_loader":     840,
    "enoe_loader":     2400,
    "alert_job":       26,
    "occ_ingest":      8,
    "radar_despidos":  14,
    "radar_empleos":   14,
    "obsidian_sync":   192,
    "forecast_job":    192,
    "skills_job":      192,
}
HEARTBEAT_THRESHOLD_HOURS = 1


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    # Verificar DB
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    if not db_ok:
        return JSONResponse(
            status_code=503,
            content={"status": "down", "db": "error", "scheduler_alive": False, "jobs": {}},
        )

    # Verificar scheduler vivo via heartbeat
    heartbeat = (
        db.query(PipelineRun)
        .filter(PipelineRun.job_id == "_heartbeat")
        .order_by(desc(PipelineRun.ran_at))
        .first()
    )
    if heartbeat is None:
        scheduler_alive = False
    else:
        ran_at_utc = heartbeat.ran_at.replace(tzinfo=timezone.utc) if heartbeat.ran_at.tzinfo is None else heartbeat.ran_at
        hours_since_hb = (now - ran_at_utc).total_seconds() / 3600
        scheduler_alive = hours_since_hb <= HEARTBEAT_THRESHOLD_HOURS

    # Evaluar frescura de cada job
    jobs: dict = {}
    degraded = False
    for job_id, threshold_hours in JOB_THRESHOLDS.items():
        last = (
            db.query(PipelineRun)
            .filter(PipelineRun.job_id == job_id)
            .order_by(desc(PipelineRun.ran_at))
            .first()
        )
        if last is None:
            jobs[job_id] = {"last_run": None, "status": "n/a", "threshold_hours": threshold_hours}
        else:
            last_ran_at_utc = last.ran_at.replace(tzinfo=timezone.utc) if last.ran_at.tzinfo is None else last.ran_at
            hours_since = (now - last_ran_at_utc).total_seconds() / 3600
            stale = hours_since > threshold_hours
            if stale or last.status == "error":
                degraded = True
            jobs[job_id] = {
                "last_run": last.ran_at.isoformat(),
                "status": "stale" if stale else last.status,
                "threshold_hours": threshold_hours,
            }

    if not scheduler_alive:
        return JSONResponse(
            status_code=503,
            content={"status": "down", "db": "ok", "scheduler_alive": False, "jobs": jobs},
        )

    overall = "degraded" if degraded else "ok"
    return {"status": overall, "db": "ok", "scheduler_alive": True, "jobs": jobs}
