# pipeline/radar/obsidian_sync.py
"""Sincroniza eventos del Radar IA al Obsidian vault como notas Markdown."""
import os
import structlog
from datetime import datetime, UTC
from pathlib import Path
import yaml
from pipeline.db.models_radar import EventoIADespido, EventoIAEmpleo

logger = structlog.get_logger()

_DEFAULT_VAULT = os.getenv(
    "OBSIDIAN_VAULT_PATH",
    "/Users/arturoaguilar/Documents/Obsidian Vault/01 - Proyectos/OIA-EE"
)


def generate_despido_note(evento: EventoIADespido) -> str:
    """Genera el contenido Markdown de una nota Obsidian para un evento de despido."""
    frontmatter = {
        "tipo": "despido_ia",
        "empresa": evento.empresa,
        "sector": evento.sector or "",
        "pais": evento.pais or "",
        "fecha_anuncio": str(evento.fecha_anuncio) if evento.fecha_anuncio else "",
        "fecha_captura": str(evento.fecha_captura) if evento.fecha_captura else str(datetime.now(UTC).date()),
        "fuente_url": evento.fuente_url,
        "fuente_nombre": evento.fuente_nombre or "",
        "confiabilidad": evento.confiabilidad,
        "numero_despidos": evento.numero_despidos,
        "salario_promedio_usd": evento.salario_promedio_usd,
        "ahorro_anual_usd": evento.ahorro_anual_usd,
        "ia_tecnologia": evento.ia_tecnologia or "",
        "area_reemplazada": evento.area_reemplazada or "",
        "tags": [
            "despidos",
            (evento.sector or "sin-sector").lower().replace(" ", "-"),
            (evento.ia_tecnologia or "ia-generica").lower().replace(" ", "-"),
            (evento.pais or "xx").lower(),
        ],
    }
    frontmatter_str = yaml.dump(frontmatter, allow_unicode=True, default_flow_style=False)

    body = f"""## Resumen
{evento.resumen_haiku or 'Sin resumen disponible.'}

## Datos clave
- **Empresa:** {evento.empresa}
- **Sector:** {evento.sector or 'N/A'}
- **País:** {evento.pais or 'N/A'}
- **Despidos:** {evento.numero_despidos or 'N/A'}
- **IA utilizada:** {evento.ia_tecnologia or 'N/A'}
- **Área reemplazada:** {evento.area_reemplazada or 'N/A'}
- **Ahorro anual estimado (USD):** {f"${evento.ahorro_anual_usd:,.0f}" if evento.ahorro_anual_usd else 'N/A'}
- **Confiabilidad:** {evento.confiabilidad}

## Evidencia
- [Artículo original]({evento.fuente_url}) — {evento.fuente_nombre}
- Fecha del anuncio: {evento.fecha_anuncio}
- Fecha de captura OIA-EE: {evento.fecha_captura}

## Implicaciones para México
<!-- Agregar análisis manual si aplica -->
"""

    return f"---\n{frontmatter_str}---\n\n{body}"


def sync_despido_to_obsidian(evento: EventoIADespido, vault_base: str = _DEFAULT_VAULT) -> str:
    """Escribe la nota Obsidian para un evento de despido. Retorna el path del archivo."""
    folder = Path(vault_base) / "radar-despidos"
    folder.mkdir(parents=True, exist_ok=True)

    fecha_str = str(evento.fecha_anuncio) if evento.fecha_anuncio else "sin-fecha"
    empresa_slug = (evento.empresa or "empresa").lower()[:30].replace(" ", "-")
    filename = f"{fecha_str}-{empresa_slug}.md"
    filepath = folder / filename

    note_content = generate_despido_note(evento)
    filepath.write_text(note_content, encoding="utf-8")

    logger.info("obsidian_note_written", path=str(filepath), empresa=evento.empresa)
    return str(filepath)


def sync_all_unsynced_despidos(db, vault_base: str = _DEFAULT_VAULT, limit: int = 100) -> int:
    """Sincroniza eventos de despido recientes que no tienen nota Obsidian aún."""
    from datetime import timedelta
    cutoff = datetime.now(UTC).date() - timedelta(days=7)
    from sqlalchemy import desc
    eventos = (
        db.query(EventoIADespido)
        .filter(EventoIADespido.fecha_captura >= cutoff)
        .filter(EventoIADespido.confiabilidad.in_(["alta", "media"]))
        .order_by(desc(EventoIADespido.fecha_anuncio))
        .limit(limit)
        .all()
    )
    written = 0
    for ev in eventos:
        try:
            sync_despido_to_obsidian(ev, vault_base=vault_base)
            written += 1
        except Exception as e:
            logger.error("obsidian_sync_error", empresa=ev.empresa, error=str(e))
    return written
