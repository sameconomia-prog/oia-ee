# Sprint 22 — Alembic: Completar integración + migración email

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la integración de Alembic en OIA-EE: agregar la migración del campo `email` que faltó en Sprint 21, e integrar `alembic upgrade head` en el arranque de producción (Procfile + nixpacks.toml).

**Architecture:** Alembic ya está configurado en `pipeline/alembic.ini` con dos migraciones existentes. Solo se añade una tercera migración (`add_email_to_usuarios`) y se actualiza el flujo de arranque Railway para ejecutar `alembic upgrade head` antes de levantar uvicorn.

**Tech Stack:** Python 3.12, Alembic 1.13.1, SQLAlchemy 2.0, SQLite (tests), PostgreSQL (prod Railway)

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `tests/test_migrations.py` | Crear | Test de integridad: verifica que las 3 migraciones aplican y que `usuarios.email` existe |
| `pipeline/db/migrations/versions/<rev>_add_email_to_usuarios.py` | Crear | Migración: `op.add_column('usuarios', email VARCHAR(200) NULL)` |
| `Procfile` | Modificar | Correr `alembic upgrade head` antes de `uvicorn` |
| `nixpacks.toml` | Modificar | Ídem para Railway nixpacks |

---

## Task 1: Test de integridad de migraciones (TDD — falla primero)

**Files:**
- Create: `tests/test_migrations.py`

- [ ] **Paso 1: Crear el archivo de test**

```python
# tests/test_migrations.py
import os
import pytest
from sqlalchemy import create_engine, inspect
from alembic.config import Config
from alembic import command


def test_migration_applies_cleanly(tmp_path):
    """Verifica que alembic upgrade head aplica las 3 migraciones sin errores."""
    db_url = f"sqlite:///{tmp_path}/migration_test.db"
    os.environ["DATABASE_URL"] = db_url
    try:
        cfg = Config("pipeline/alembic.ini")
        command.upgrade(cfg, "head")

        engine = create_engine(db_url)
        insp = inspect(engine)
        tables = insp.get_table_names()

        for table in ["ies", "carreras", "usuarios", "noticias", "kpi_historico", "escenarios"]:
            assert table in tables, f"tabla '{table}' no encontrada tras migración"

        col_names = [c["name"] for c in insp.get_columns("usuarios")]
        assert "email" in col_names, "columna 'email' no encontrada en tabla usuarios"
        assert "username" in col_names
        assert "hashed_password" in col_names
    finally:
        os.environ.pop("DATABASE_URL", None)
```

- [ ] **Paso 2: Correr el test — debe FALLAR**

```bash
cd ~/Documents/OIA-EE
source pipeline/.venv/bin/activate
python -m pytest tests/test_migrations.py -v
```

Salida esperada:
```
FAILED tests/test_migrations.py::test_migration_applies_cleanly
AssertionError: columna 'email' no encontrada en tabla usuarios
```

> Si falla con `ModuleNotFoundError: alembic`, verifica que el venv está activo.  
> Si falla con `Can't locate revision identified by '32b4d297eab5'`, el archivo de migración tiene un problema de path — el `Config` debe apuntar a `pipeline/alembic.ini`.

- [ ] **Paso 3: Commit del test en rojo**

```bash
git add tests/test_migrations.py
git commit -m "test: test_migration_applies_cleanly (rojo — falta migración email)"
```

---

## Task 2: Crear migración add_email_to_usuarios

**Files:**
- Create: `pipeline/db/migrations/versions/<rev>_add_email_to_usuarios.py`

- [ ] **Paso 1: Generar el archivo de migración**

```bash
cd ~/Documents/OIA-EE/pipeline
source .venv/bin/activate
alembic revision -m "add_email_to_usuarios"
```

Esto crea un archivo en `pipeline/db/migrations/versions/<hash>_add_email_to_usuarios.py`.  
Anota el hash generado (ej: `a3f9c21b8d40`).

- [ ] **Paso 2: Editar el archivo generado**

Abre el archivo creado. Reemplaza las funciones `upgrade` y `downgrade` vacías con:

```python
import sqlalchemy as sa
from alembic import op


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("email", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "email")
```

Verifica que `down_revision` apunte a `'32b4d297eab5'` (la migración de usuarios).

Ejemplo de encabezado correcto:
```python
revision: str = '<hash_generado>'
down_revision: str = '32b4d297eab5'
branch_labels = None
depends_on = None
```

- [ ] **Paso 3: Verificar cadena de migraciones**

```bash
cd ~/Documents/OIA-EE/pipeline
alembic history
```

Salida esperada (3 migraciones en cadena):
```
<hash> -> head: add_email_to_usuarios
32b4d297eab5 -> <hash>: add tabla usuarios
59b6941e44fd -> 32b4d297eab5: initial schema
<base> -> 59b6941e44fd: initial schema
```

- [ ] **Paso 4: Correr el test — debe PASAR**

```bash
cd ~/Documents/OIA-EE
python -m pytest tests/test_migrations.py -v
```

Salida esperada:
```
PASSED tests/test_migrations.py::test_migration_applies_cleanly
1 passed in X.XXs
```

- [ ] **Paso 5: Correr suite completa — sin regresiones**

```bash
python -m pytest tests/ -q
```

Salida esperada: `170 passed` (169 anteriores + 1 nuevo).

- [ ] **Paso 6: Commit**

```bash
git add pipeline/db/migrations/versions/*add_email_to_usuarios.py
git commit -m "feat: migración add_email_to_usuarios (Sprint 22)"
```

---

## Task 3: Integrar alembic upgrade head en arranque Railway

**Files:**
- Modify: `Procfile`
- Modify: `nixpacks.toml`

**Contexto:** `alembic.ini` está en `pipeline/`, así que alembic debe correrse desde ese directorio. Usamos un subshell `(cd pipeline && alembic upgrade head)` para no cambiar el directorio de trabajo del proceso principal.

- [ ] **Paso 1: Actualizar Procfile**

Contenido actual:
```
web: uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

Reemplazar con:
```
web: (cd pipeline && alembic upgrade head) && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

- [ ] **Paso 2: Actualizar nixpacks.toml**

Contenido actual de `[start]`:
```toml
[start]
cmd = "uvicorn api.main:app --host 0.0.0.0 --port $PORT"
```

Reemplazar con:
```toml
[start]
cmd = "(cd pipeline && alembic upgrade head) && uvicorn api.main:app --host 0.0.0.0 --port $PORT"
```

- [ ] **Paso 3: Verificar que el Procfile es válido localmente**

```bash
cd ~/Documents/OIA-EE
source pipeline/.venv/bin/activate
(cd pipeline && alembic --help) && echo "alembic OK"
```

Salida esperada: `alembic OK`

- [ ] **Paso 4: Correr suite completa una vez más**

```bash
python -m pytest tests/ -q
```

Salida esperada: `170 passed, 0 failed`

- [ ] **Paso 5: TypeScript check (sin regresiones frontend)**

```bash
cd ~/Documents/OIA-EE/frontend
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Salida esperada: sin errores.

- [ ] **Paso 6: Commit final**

```bash
cd ~/Documents/OIA-EE
git add Procfile nixpacks.toml
git commit -m "feat(deploy): alembic upgrade head en Procfile y nixpacks — Sprint 22 completo"
```

---

## Criterios de éxito finales

- [ ] `python -m pytest tests/ -q` → 170 passed, 0 failed
- [ ] `frontend/tsc --noEmit` → 0 errores
- [ ] `alembic history` desde `pipeline/` muestra 3 migraciones en cadena
- [ ] `Procfile` contiene `alembic upgrade head` antes de `uvicorn`
- [ ] `nixpacks.toml [start].cmd` ídem
