"""JSONL run logger para agentes IA.

Cada invocación de agente genera una línea en `pipeline/agents/logs/<agent>/YYYY-MM-DD.jsonl`
con tokens, costo, latencia y referencias al output. Pensado para auditoría +
métricas de éxito (ratio aceptación, tiempo revisión, costo/agente/mes).

No depende de DB. Si en fase 2 se quiere replicar a Postgres `agent_runs`,
basta con un cron que tail los JSONL y los inserte.
"""
from __future__ import annotations
import hashlib
import json
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

LOGS_DIR = Path(__file__).resolve().parents[1] / "logs"


def make_run_id() -> str:
    """Run id corto + ordenable por tiempo: YYYYMMDDhhmmss-xxxxxx."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    suf = secrets.token_hex(3)
    return f"{ts}-{suf}"


def hash_input(payload: Any) -> str:
    """SHA-256 corto del input para detectar duplicados / re-runs."""
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:16]


def log_run(
    agent: str,
    run_id: str,
    *,
    model: str,
    status: str,
    input_hash: str,
    tokens_in: int = 0,
    tokens_in_cached: int = 0,
    tokens_in_cache_creation: int = 0,
    tokens_out: int = 0,
    cost_usd: float = 0.0,
    latency_ms: int = 0,
    output_path: str | None = None,
    error: str | None = None,
    extra: dict | None = None,
) -> Path:
    """Append a one-line JSON record to today's log file. Returns log path."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_dir = LOGS_DIR / agent
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{today}.jsonl"

    record = {
        "run_id": run_id,
        "agent": agent,
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "model": model,
        "status": status,
        "input_hash": input_hash,
        "tokens_in": tokens_in,
        "tokens_in_cached": tokens_in_cached,
        "tokens_in_cache_creation": tokens_in_cache_creation,
        "tokens_out": tokens_out,
        "cost_usd": round(cost_usd, 6),
        "latency_ms": latency_ms,
        "output_path": output_path,
        "error": error,
    }
    if extra:
        record["extra"] = extra

    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    return log_path


class RunTimer:
    """Context manager que mide latencia y emite a log al salir."""

    def __init__(self, agent: str, run_id: str, model: str, input_hash: str):
        self.agent = agent
        self.run_id = run_id
        self.model = model
        self.input_hash = input_hash
        self.start_ms = 0
        self.fields: dict = {}

    def __enter__(self):
        self.start_ms = int(time.time() * 1000)
        return self

    def update(self, **kwargs):
        self.fields.update(kwargs)

    def __exit__(self, exc_type, exc, tb):
        latency = int(time.time() * 1000) - self.start_ms
        log_run(
            self.agent,
            self.run_id,
            model=self.model,
            status="error" if exc else self.fields.pop("status", "ok"),
            input_hash=self.input_hash,
            latency_ms=latency,
            error=str(exc) if exc else None,
            **self.fields,
        )
        # Don't suppress exceptions
        return False
