from pathlib import Path
from sqlalchemy import create_engine, inspect
from alembic.config import Config
from alembic import command

_INI = Path(__file__).resolve().parent.parent / "pipeline" / "alembic.ini"


def test_migration_applies_cleanly(tmp_path, monkeypatch):
    """Verifica que alembic upgrade head aplica las 3 migraciones sin errores."""
    db_url = f"sqlite:///{tmp_path}/migration_test.db"
    monkeypatch.setenv("DATABASE_URL", db_url)

    cfg = Config(str(_INI))
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
