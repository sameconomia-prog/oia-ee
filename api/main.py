# api/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from api.routers import noticias, kpis, admin, rector, alertas, escenarios, auth
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job

app = FastAPI(title="OIA-EE API", version="0.7.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])

_scheduler = BackgroundScheduler()


def _run_alert_job_scheduled() -> None:
    with get_session() as db:
        run_alert_job(db)


@app.on_event("startup")
def _startup() -> None:
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        _scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        _scheduler.start()


@app.on_event("shutdown")
def _shutdown() -> None:
    if _scheduler.running:
        _scheduler.shutdown()


@app.get("/health")
def health():
    return {"status": "ok"}
