# Escalado de OIA-EE — Bloqueadores conocidos

> Documento creado en Fase 0 (auditoría 360° del 2026-05-08). Lee esto antes de cambiar el sizing del servicio en Railway o de añadir más instancias.

## ⚠️ NO escalar Railway a 2+ instancias sin antes implementar distributed lock

### Riesgo

`api/main.py` arranca un `APScheduler.BackgroundScheduler` **inline** dentro del proceso FastAPI (estrategia "Option C" introducida en Sprint P204). Esto significa que cada instancia del proceso tiene su propio scheduler local.

Si Railway escala el servicio a 2+ replicas, **cada instancia ejecutará todos los jobs del scheduler en paralelo**:

- 14 jobs envueltos con `notify_job_result()` se duplican.
- `_write_heartbeat()` cada 30 min se ejecuta N veces, llenando `pipeline_runs` con duplicados.
- `alert_job` recalcula KPIs y emite alertas duplicadas.
- KPIs históricos se escriben N veces y corrompen series temporales.
- Emails de alerta se envían N veces (la deduplicación por transición es por instancia, no global).
- Scrapers (OCC, NewsAPI, IMSS, ENOE) hacen N veces el rate-limit hit a la fuente, riesgo de baneo.

### Mitigación requerida antes de escalar

Implementar **distributed lock** (Redis) que cada job verifica antes de ejecutar:

```python
# Pseudocódigo
def with_distributed_lock(job_id, ttl_seconds):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            lock_key = f"oiaee:lock:{job_id}"
            acquired = redis_client.set(lock_key, instance_id, ex=ttl_seconds, nx=True)
            if not acquired:
                logger.info(f"Job {job_id} skipped: lock held by another instance")
                return
            try:
                return fn(*args, **kwargs)
            finally:
                # Solo liberar si seguimos siendo dueños (race-safe via Lua script)
                redis_client.eval(release_script, 1, lock_key, instance_id)
        return wrapper
    return decorator
```

Pasos concretos cuando llegue el momento:

1. Configurar servicio Redis en Railway (~$5/mes managed).
2. Añadir env var `REDIS_URL` y cliente `redis-py` en `pipeline/` (ya está en `requirements.txt` para rate limiting).
3. Crear `pipeline/distributed_lock.py` con el decorador.
4. Decorar los 14 jobs en `api/main.py` con `@with_distributed_lock(job_id, ttl=...)`.
5. Set `ttl` mayor que el tiempo máximo esperado del job (ej: alert_job ~15 min → ttl=1800s).
6. Tests: simular 2 instancias compitiendo por el mismo lock.

### Estado actual (2026-05-08)

- ✅ Producción Railway corriendo en **1 instancia** → seguro.
- ✅ Monitoring P204 funcionando.
- ❌ Sin distributed lock implementado.
- ❌ Sin Redis configurado.

### Threshold para implementar

Implementar ANTES de:

- Activar autoscaling en Railway.
- Añadir réplicas manuales.
- Migrar a Kubernetes / ECS / cualquier orquestador con N pods.
- Migrar a serverless (Cloud Run, Lambda) — los jobs scheduler no caben ahí; primero hay que extraerlos a un worker dedicado.

Si necesitas escalar **solo el API** (no el scheduler), considera:

1. Extraer scheduler a un proceso/servicio separado (1 instancia fija).
2. API queda stateless y sí escala horizontalmente.
3. No se necesita distributed lock si scheduler es 1 sola instancia.

Esa es la opción más simple si nunca se quiere depender de Redis.

---

## Otras consideraciones de escalado (referencia rápida)

### Pool de conexiones BD ✅

Configurado en Fase 0:
- `pool_size=20`, `max_overflow=10`, `pool_recycle=3600`, `pool_pre_ping=True`.
- Soporta hasta ~30 conexiones concurrentes por instancia.
- Configurable vía env vars `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE`.

### Rate limit en API pública ⚠️

`api/middleware/rate_limit.py` usa rate limit **en memoria por instancia**. Si escalan: cada instancia tiene su propio contador. Un atacante haciendo round-robin entre IPs públicas de Railway podría exceder el límite efectivo. Mitigación: usar Redis-backed rate limit (la librería ya soporta).

### Cache KPIs nacional ⚠️

`POST /admin/cache/clear` invalida cache **local de instancia**. En multi-instancia hace falta broadcast vía Redis pub/sub o reemplazar el cache local por Redis.

### Sesiones JWT ✅

JWT son stateless: no afecta escalado horizontal. Solo el refresh token está en BD.

### Embeddings pgvector ✅

Las queries de similitud van directo a Postgres → no hay state de instancia.
