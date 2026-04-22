#!/usr/bin/env python3
"""
Seed 50 IES reales con carreras y un usuario rector por IES.
Uso: python -m pipeline.seeds.seed_ies
"""
import os
import json
import random
from pathlib import Path
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, IES, Carrera, CarreraIES, Usuario


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

CARRERAS_CATALOGO = [
    "Derecho", "Medicina", "Administración de Empresas", "Contaduría Pública",
    "Ingeniería en Sistemas Computacionales", "Ingeniería Industrial",
    "Psicología", "Arquitectura", "Comunicación", "Enfermería",
    "Educación", "Economía", "Marketing", "Turismo",
    "Ingeniería Civil", "Ingeniería Mecánica", "Nutrición", "Diseño Gráfico",
]

CICLO_ACTUAL = "2025-2"


def seed(db_url: str) -> None:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)

    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    fixture_path = Path(__file__).parent / "ies_fixture.json"
    ies_data = json.loads(fixture_path.read_text(encoding="utf-8"))

    # Crear carreras del catálogo (si no existen)
    carreras_map: dict[str, Carrera] = {}
    for nombre in CARRERAS_CATALOGO:
        nombre_norm = nombre.lower().strip()
        existing = db.query(Carrera).filter_by(nombre_norm=nombre_norm).first()
        if not existing:
            c = Carrera(nombre_norm=nombre_norm, nombre_variantes=nombre, nivel="licenciatura", duracion_anios=4)
            db.add(c)
            db.flush()
            carreras_map[nombre_norm] = c
        else:
            carreras_map[nombre_norm] = existing

    created_ies = 0
    for idx, row in enumerate(ies_data):
        existing_ies = db.query(IES).filter_by(clave_sep=row["clave_sep"]).first()
        if existing_ies:
            continue

        ies = IES(
            clave_sep=row["clave_sep"],
            nombre=row["nombre"],
            nombre_corto=row["nombre_corto"],
            tipo=row["tipo"],
            estado=row["estado"],
            matricula_total=random.randint(3000, 80000),
        )
        db.add(ies)
        db.flush()

        # Asignar 5-8 carreras aleatorias
        num_carreras = random.randint(5, 8)
        sample = random.sample(CARRERAS_CATALOGO, num_carreras)
        for carrera_nombre in sample:
            carrera = carreras_map[carrera_nombre.lower().strip()]
            ci = CarreraIES(
                carrera_id=carrera.id,
                ies_id=ies.id,
                ciclo=CICLO_ACTUAL,
                matricula=random.randint(100, 2000),
                egresados=random.randint(20, 300),
            )
            db.add(ci)

        # Crear usuario rector
        username = row["nombre_corto"].lower().replace(" ", "_").replace("-", "_")
        existing_user = db.query(Usuario).filter_by(username=username).first()
        if not existing_user:
            user = Usuario(
                username=username,
                hashed_password=_hash_password("temporal123"),
                ies_id=ies.id,
            )
            db.add(user)

        created_ies += 1

    db.commit()
    print(f"✅ Seed completado: {created_ies} IES nuevas creadas.")
    print("   Credenciales: username = nombre_corto en minúsculas/guiones, password = temporal123")
    db.close()


if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL", "sqlite+pysqlite:///./oia_ee_dev.db")
    seed(db_url)
