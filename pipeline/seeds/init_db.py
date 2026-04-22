#!/usr/bin/env python3
"""
Inicializa tablas en producción (Railway).
Ejecutar solo en primer deploy: python -m pipeline.seeds.init_db
"""
import os
from sqlalchemy import create_engine
from pipeline.db.models import Base


def main() -> None:
    url = os.environ["DATABASE_URL"]
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    engine = create_engine(url)
    Base.metadata.create_all(engine)
    print("✅ Tablas creadas en producción.")


if __name__ == "__main__":
    main()
