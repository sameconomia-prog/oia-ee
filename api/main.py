# api/main.py
import os
import traceback
import structlog
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from apscheduler.schedulers.background import BackgroundScheduler
from api.routers import noticias, kpis, admin, rector, alertas, escenarios, auth, publico, radar, predicciones, api_keys, skill_graph, pertinencia, siia, whitelabel, leads, benchmarks, contacto, health
from pipeline.db import get_session
from pipeline.jobs.alert_job import run_alert_job
from pipeline.jobs.news_ingest_job import run_news_ingest
from pipeline.jobs.kpi_snapshot_job import run_kpi_snapshot
from pipeline.jobs.radar_job import run_radar_despidos_job, run_radar_empleos_job, run_obsidian_sync_job
from pipeline.jobs.forecast_job import run_forecast_job, run_skills_job
from pipeline.jobs.occ_ingest_job import run_occ_ingest as _occ_ingest
from pipeline.monitoring import notify_job_result

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
    error = None
    traceback_str = None
    try:
        with get_session() as db:
            run_alert_job(db)
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("alert_job", error=error, traceback_str=traceback_str)


def _run_news_job_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        with get_session() as db:
            run_news_ingest(db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("news_scraper", error=error, traceback_str=traceback_str)


def _run_snapshot_job_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        with get_session() as db:
            run_kpi_snapshot(db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("kpi_snapshot", error=error, traceback_str=traceback_str)


def _run_occ_job_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        with get_session() as db:
            _occ_ingest(db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("occ_ingest", error=error, traceback_str=traceback_str)


def _run_radar_despidos_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        run_radar_despidos_job()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("radar_despidos", error=error, traceback_str=traceback_str)


def _run_radar_empleos_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        run_radar_empleos_job()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("radar_empleos", error=error, traceback_str=traceback_str)


def _run_obsidian_sync_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        run_obsidian_sync_job()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("obsidian_sync", error=error, traceback_str=traceback_str)


def _run_forecast_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        run_forecast_job()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("forecast_job", error=error, traceback_str=traceback_str)


def _run_skills_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        run_skills_job()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("skills_job", error=error, traceback_str=traceback_str)


def _run_stps_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        from pipeline.jobs.stps_ingest_job import run_stps_ingest
        with get_session() as db:
            run_stps_ingest(db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("stps_loader", error=error, traceback_str=traceback_str)


def _run_anuies_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        path_env = os.getenv("ANUIES_CSV_PATH")
        if not path_env:
            return
        from pathlib import Path
        from pipeline.loaders.anuies_loader import AnuiesLoader
        from pipeline.jobs.anuies_ingest_job import ingest_anuies
        records = AnuiesLoader().load_csv(Path(path_env))
        with get_session() as db:
            ingest_anuies(records, db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        if os.getenv("ANUIES_CSV_PATH"):
            notify_job_result("anuies_loader", error=error, traceback_str=traceback_str)


def _run_imss_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        from pipeline.jobs.imss_ingest_job import run_imss_ingest
        with get_session() as db:
            run_imss_ingest(db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("imss_loader", error=error, traceback_str=traceback_str)


def _run_enoe_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        from pipeline.jobs.enoe_ingest_job import run_enoe_ingest
        with get_session() as db:
            run_enoe_ingest(db)
            db.commit()
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("enoe_loader", error=error, traceback_str=traceback_str)


def _run_resumen_semanal_scheduled() -> None:
    error = None
    traceback_str = None
    try:
        from pipeline.services.resumen_semanal import send_resumen_semanal
        with get_session() as db:
            send_resumen_semanal(db)
    except Exception as e:
        error = e
        traceback_str = traceback.format_exc()
    finally:
        notify_job_result("resumen_semanal", error=error, traceback_str=traceback_str)


def _write_heartbeat() -> None:
    notify_job_result("_heartbeat", error=None)


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
        FastAPILimiter.redis = None  # ensure dynamic_rate_limiter gracefully skips

    # Scheduler
    if os.getenv("ENABLE_SCHEDULER", "false").lower() == "true":
        _scheduler.add_job(_run_alert_job_scheduled, "cron", hour=3, minute=0)
        _scheduler.add_job(_run_news_job_scheduled, "cron", hour="*/6")
        _scheduler.add_job(_run_occ_job_scheduled, "cron", hour="*/6", minute=15)
        _scheduler.add_job(_run_snapshot_job_scheduled, "cron", day_of_week="mon", hour=5)
        _scheduler.add_job(_run_stps_scheduled, "cron", hour=2, minute=0)
        _scheduler.add_job(_run_anuies_scheduled, "cron", day_of_week="sun", hour=4)
        _scheduler.add_job(_run_imss_scheduled, "cron", day=15, hour=3, minute=0)
        _scheduler.add_job(_run_enoe_scheduled, "cron", month="1,4,7,10", day=20, hour=4, minute=0)
        _scheduler.add_job(_run_resumen_semanal_scheduled, "cron", day_of_week="mon", hour=8, minute=0)
        _scheduler.add_job(_run_radar_despidos_scheduled, "cron", hour="*/12")
        _scheduler.add_job(_run_radar_empleos_scheduled, "cron", hour="*/12", minute=30)
        _scheduler.add_job(_run_obsidian_sync_scheduled, "cron", day_of_week="sun", hour=6)
        _scheduler.add_job(_run_forecast_scheduled, "cron", day_of_week="sun", hour=4)
        _scheduler.add_job(_run_skills_scheduled, "cron", day_of_week="sun", hour=5)
        _scheduler.add_job(_write_heartbeat, "cron", minute="*/30")
        _scheduler.start()
        logger.info("scheduler_started")

    yield

    if _scheduler.running:
        _scheduler.shutdown()


app = FastAPI(
    title="OIA-EE API",
    version="1.0.0",
    description=(
        "Observatorio de Impacto IA en Educación y Empleo (OIA-EE). "
        "Mide el desplazamiento de carreras universitarias mexicanas por IA "
        "usando 7 indicadores KPI: D1 Obsolescencia, D2 Oportunidades, "
        "D3 Mercado Laboral, D4 Institucional, D5 Geografía, D6 Estudiantil, D7 Noticias. "
        "\n\n**Autenticación:** Endpoints públicos disponibles sin autenticación. "
        "Para cuotas mayores, incluye el header `X-API-Key` con tu token de acceso."
    ),
    contact={"name": "OIA-EE", "email": "sam.economia@gmail.com"},
    lifespan=lifespan,
)

_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGIN", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)

app.include_router(publico.router, prefix="/publico", tags=["publico"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(api_keys.router, prefix="/admin/api-keys", tags=["admin"])
app.include_router(rector.router, prefix="/rector", tags=["rector"])
app.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["escenarios"])
app.include_router(radar.router, prefix="/radar", tags=["radar"])
app.include_router(predicciones.router, prefix="/predicciones", tags=["predicciones"])
app.include_router(skill_graph.router, tags=["skill-graph"])
app.include_router(pertinencia.router, prefix="", tags=["pertinencia"])
app.include_router(siia.router, prefix="", tags=["siia"])
app.include_router(whitelabel.router, prefix="", tags=["whitelabel"])
app.include_router(leads.router, prefix="/publico", tags=["leads"])
app.include_router(contacto.router, prefix="/publico", tags=["contacto"])
app.include_router(benchmarks.router, prefix="/publico/benchmarks", tags=["benchmarks"])
app.include_router(health.router)
