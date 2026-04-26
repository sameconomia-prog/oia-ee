# api/main.py
import os
import structlog
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from apscheduler.schedulers.background import BackgroundScheduler
from api.routers import noticias, kpis, admin, rector, alertas, escenarios, auth, publico, radar
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job
from pipeline.jobs.news_ingest_job import run_news_ingest
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot
from pipeline.jobs.radar_job import run_radar_despidos_job, run_radar_empleos_job, run_obsidian_sync_job
from pipeline.jobs.forecast_job import run_forecast_job, run_skills_job

# Sentry — solo en producción
_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    sentry_sdk.init(dsn=_SENTRY_DSN, integrations=[FastApiIntegration()], traces_sample_rate=0.1)

# structlog config
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()

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
    # Redis para rate limiting (graceful degradation si no está disponible)
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis = aioredis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis)
        logger.info("redis_connected", url=redis_url)
    except Exception as e:
        logger.warning("redis_unavailable", error=str(e), detail="Rate limiting deshabilitado")

    # Scheduler
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        _scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        _scheduler.add_job(_run_news_job_scheduled, "cron", hour="*/6")
        _scheduler.add_job(_run_snapshot_job_scheduled, "cron", day_of_week="mon", hour=5)
        _scheduler.add_job(run_radar_despidos_job, "cron", hour="*/12")
        _scheduler.add_job(run_radar_empleos_job, "cron", hour="*/12", minute=30)
        _scheduler.add_job(run_obsidian_sync_job, "cron", day_of_week="sun", hour=6)
        _scheduler.add_job(run_forecast_job, "cron", day_of_week="sun", hour=4)
        _scheduler.add_job(run_skills_job, "cron", day_of_week="sun", hour=5)
        _scheduler.start()
        logger.info("scheduler_started")

    yield

    if _scheduler.running:
        _scheduler.shutdown()


app = FastAPI(title="OIA-EE API", version="0.9.0", lifespan=lifespan)

_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGIN", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(publico.router, prefix="/publico", tags=["publico"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])
app.include_router(radar.router, prefix="/radar", tags=["radar"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.9.0"}
