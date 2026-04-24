# Sprint 22 — Alembic: Completar integración + migración email

**Fecha:** 2026-04-24  
**Estado:** Aprobado

## Contexto real (hallazgo en exploración)

Alembic ya estaba parcialmente configurado desde sprints anteriores:

- `pipeline/alembic.ini` — config existente, lee `DATABASE_URL` vía `env.py`
- `pipeline/db/migrations/versions/59b6941e44fd_initial_schema.py` — 9 tablas iniciales
- `pipeline/db/migrations/versions/32b4d297eab5_add_tabla_usuarios.py` — tabla `usuarios` SIN campo `email`
- `alembic==1.13.1` ya en `pipeline/requirements.txt`

**Problema:** El Sprint 21 añadió `email` al modelo `Usuario`, pero la migración correspondiente nunca se creó. Tampoco se integró `alembic upgrade head` en el arranque de producción.

## Alcance (Sprint 22)

1. Nueva migración: `add_email_to_usuarios` — añade columna `email VARCHAR(200) NULL`
2. `Procfile` — correr `alembic upgrade head` antes de `uvicorn`
3. `nixpacks.toml [start]` — ídem para Railway
4. 1 test de integridad de migración sobre SQLite
5. Verificar que los 169 tests existentes siguen pasando

## Fuera de alcance

- Rediseñar la estructura de migraciones (está bien donde está)
- Migraciones down/rollback automatizadas
- Datos existentes en Railway (BD prod aún vacía)

## Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `pipeline/db/migrations/versions/XXX_add_email_to_usuarios.py` | Crear — nueva migración |
| `Procfile` | Modificar — agregar `alembic upgrade head` |
| `nixpacks.toml` | Modificar — agregar `alembic upgrade head` en `[start].cmd` |
| `tests/test_migrations.py` | Crear — test SQLite en-memoria |

## Diseño de la migración

```python
def upgrade() -> None:
    op.add_column('usuarios', sa.Column('email', sa.String(200), nullable=True))

def downgrade() -> None:
    op.drop_column('usuarios', 'email')
```

## Diseño Procfile

```
web: cd pipeline && alembic upgrade head && cd .. && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

Nota: se corre desde `pipeline/` porque `alembic.ini` tiene `script_location = db/migrations` relativo a su ubicación.

## Diseño nixpacks.toml `[start]`

```toml
[start]
cmd = "cd pipeline && alembic upgrade head && cd .. && uvicorn api.main:app --host 0.0.0.0 --port $PORT"
```

## Test de integridad

`tests/test_migrations.py` — verifica que las 3 migraciones (inicial + usuarios + email) aplican sin errores sobre SQLite in-memory, y que la tabla `usuarios` tiene la columna `email`.

Usa `alembic.config.Config` + `command.upgrade` con engine SQLite in-memory + `render_as_batch=True`.

## Criterios de éxito

1. `alembic upgrade head` corre sin errores (SQLite y Postgres)
2. `python -m pytest tests/ -q` → 170+ passed (169 anteriores + 1 nuevo)
3. `Procfile` ejecuta la migración antes de `uvicorn`
4. No hay regresiones en tests existentes
