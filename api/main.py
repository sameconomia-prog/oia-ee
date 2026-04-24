# api/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from api.routers import noticias, kpis, admin, rector, alertas, escenarios, auth, publico
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job
from pipeline.jobs.news_ingest_job import run_news_ingest
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot

_scheduler = BackgroundScheduler()


def _run_alert_job_scheduled() -> None:
    with get_session() as db:
        run_alert_job(db)


def _run_news_job_scheduled() -> None:
    with get_session() as db:
        run_news_ingest(db)
        db.commit()


def _run_snapshot_job_scheduled() -> None:
    with get_session() as db:
        run_kpi_snapshot(db)
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        _scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        _scheduler.add_job(_run_news_job_scheduled, "cron", hour="*/6")
        _scheduler.add_job(_run_snapshot_job_scheduled, "cron", day_of_week="mon", hour=5)
        _scheduler.start()
    yield
    if _scheduler.running:
        _scheduler.shutdown()


app = FastAPI(title="OIA-EE API", version="0.8.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(publico.router, prefix="/publico", tags=["publico"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])


@app.get("/health")
def health():
    return {"status": "ok"}
