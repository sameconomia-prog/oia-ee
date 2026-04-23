#!/usr/bin/env python3
"""
Aplica migraciones Alembic en producción (Railway).
Reemplaza el antiguo create_all — ejecutar en cada deploy o al inicializar.
Uso: DATABASE_URL=... python -m pipeline.seeds.init_db
"""
import os
import subprocess
import sys


def main() -> None:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    os.environ["DATABASE_URL"] = url

    alembic_ini = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", alembic_ini, "upgrade", "head"],
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)
    print("✅ Migraciones aplicadas correctamente.")


if __name__ == "__main__":
    main()
