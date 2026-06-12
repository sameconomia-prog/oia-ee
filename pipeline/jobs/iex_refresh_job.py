"""Job/CLI: refresca exposicion_iex desde el repo hermano oia-ee-research.

Se corre cuando el repo de investigación publica una nueva versión del dataset:

    DATABASE_URL=... python -m pipeline.jobs.iex_refresh_job [--data-dir RUTA]

Hace upsert idempotente de exposicion_iex y re-siembra el crosswalk
carrera_soc_map (solo añade pares faltantes; nunca pisa ediciones manuales).
"""
import argparse

import structlog
from sqlalchemy.orm import Session

from pipeline.loaders.iex_loader import (
    load_contexto_mx, load_exposicion_iex, seed_carrera_soc_map,
    seed_fa_sectorial)
from pipeline.services.costo_ia import calcular_costos_ia

logger = structlog.get_logger()


def run_iex_refresh(session: Session, data_dir: str | None = None) -> dict:
    """Carga datasets IEX + crosswalk + FA + costos IA + contexto MX."""
    carga = load_exposicion_iex(session, data_dir=data_dir)
    crosswalk = seed_carrera_soc_map(session)
    fa = seed_fa_sectorial(session)
    costos = calcular_costos_ia(session, data_dir=data_dir)
    contexto = load_contexto_mx(session, data_dir=data_dir)
    result = {
        **carga,
        "crosswalk_carreras": crosswalk["carreras_mapeadas"],
        "crosswalk_insertados": crosswalk["insertados"],
        "fa_insertados": fa["fa_insertados"],
        "costos_procesados": costos["costos_procesados"],
        "contexto_procesados": contexto["contexto_procesados"],
    }
    logger.info("iex_refresh_complete", **result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Refresca exposicion_iex desde oia-ee-research")
    parser.add_argument("--data-dir", default=None,
                        help="Ruta al repo hermano (default: env IEX_DATA_DIR "
                             "o ~/Documents/oia-ee-research)")
    args = parser.parse_args()

    from pipeline.db import get_session
    with get_session() as session:
        result = run_iex_refresh(session, data_dir=args.data_dir)
    print(f"IEX refresh completado: {result}")


if __name__ == "__main__":
    main()
