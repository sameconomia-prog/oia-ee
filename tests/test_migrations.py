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
