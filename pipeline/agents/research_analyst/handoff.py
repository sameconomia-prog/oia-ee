"""Handoff B → A: convierte ResearchOutput.brief_for_writer en argumentos
de write_mdx() del Agente A.

Uso:
    from pipeline.agents.research_analyst.handoff import brief_to_writer_args
    from pipeline.agents.editorial_writer.agent import write_mdx

    research = analyze("paper.pdf", focus="contaduría")
    if research.brief_for_writer:
        args = brief_to_writer_args(research, audiencia="rectores")
        mdx, fm = write_mdx(**args)
"""
from __future__ import annotations
from datetime import date

from pipeline.agents.common.schemas import ResearchOutput


def brief_to_writer_args(
    research: ResearchOutput,
    *,
    audiencia: str = "directores académicos",
    fecha: str | None = None,
    backend: str = "router",
) -> dict:
    """Construye los kwargs para Editorial.write_mdx desde el brief del researcher.

    Si no hay brief_for_writer, lanza ValueError.
    """
    brief = research.brief_for_writer
    if not brief:
        raise ValueError(
            f"ResearchOutput.brief_for_writer es null para source_id={research.source_id!r}. "
            "El analista decidió que el documento no amerita un MDX nuevo."
        )

    # Construir extra_context con findings clave y citas verificadas
    findings_block_lines = ["## Findings verificados (con cita textual del documento)"]
    for i, f in enumerate(research.findings[:8], 1):
        cita = f"\n  > {f.source_quote[:200]}{'…' if len(f.source_quote) > 200 else ''}"
        page = f" — {f.page}" if f.page else ""
        metric = f" [valor: {f.metric_value}]" if f.metric_value else ""
        findings_block_lines.append(
            f"{i}. **{f.enunciado}**{metric}{page} (confianza: {f.confidence.value})"
            f"{cita}"
        )

    if research.skills_emergentes:
        findings_block_lines.append("\n## Skills emergentes detectadas")
        for s in research.skills_emergentes[:6]:
            findings_block_lines.append(
                f"- {s.nombre} → {s.direccion} ({s.horizonte}). Evidencia: {s.evidencia[:140]}"
            )

    extra_context = "\n".join(findings_block_lines)

    return {
        "brief": f"{brief.angulo_principal} — {brief.titulo_propuesto}",
        "tipo": brief.tipo,
        "fecha": fecha or date.today().isoformat(),
        "audiencia": audiencia,
        "carrera_benchmark": brief.benchmark,
        "tags_sugeridos": brief.tags_sugeridos,
        "palabras_objetivo": brief.palabras_objetivo,
        "backend": backend,
        "extra_context": extra_context,
    }


__all__ = ["brief_to_writer_args"]
