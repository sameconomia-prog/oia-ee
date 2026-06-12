# Diseño — Versionado de skill taxonomy contra capability frontier

**Fecha:** 2026-06-12 · **Origen:** alerta #7 del análisis del panel
(`analisis_panel_research_brief_2026-05.md`) · **Estado:** v1 implementada

## Problema

La taxonomía `pipeline/data/skill_ia_taxonomy.yaml` (~200 skills →
automated/augmented/resilient) se clasificó una sola vez (2026-04-29) y no
registra **contra qué frontera de capacidades de modelos** se juzgó cada
etiqueta. Cada release mayor (p. ej. Claude 4.x → siguiente generación)
puede mover skills de `augmented` a `automated` sin que nada lo detecte:
*"sin esto la taxonomía decae silenciosamente"* (panel, alerta #7).

## Alcance v1 (esta implementación)

1. **Bloque `meta` en el YAML** con `{version, modelo_referencia,
   fecha_evaluacion}` + política de revisión + historial de evaluaciones.
   El loader ignora `meta` al construir el mapping (solo claves cuyo valor
   es lista son niveles de clasificación).
2. **Exposición en API**: endpoint público `GET /capability-frontier`
   (paralelo a `/skills/global` en `api/routers/skill_graph.py`) que
   devuelve los metadatos + conteo de skills por nivel + `dias_desde_evaluacion`
   + `revision_recomendada` (true si han pasado ≥ 90 días — cadencia
   trimestral sugerida por el panel).
3. **Procedencia en respuestas existentes**: `build_skill_graph` y
   `build_global_skill_graph` añaden la clave `taxonomy_meta`
   (`{version, modelo_referencia, fecha_evaluacion}`) para que todo
   consumidor del treemap/grafo sepa qué versión de taxonomía leyó.

Compatibilidad: claves nuevas en respuestas existentes (no rompe consumers);
si el YAML no tuviera `meta`, el loader y el endpoint degradan con defaults
(`version: "unversioned"`).

## Esquema del bloque `meta`

```yaml
meta:
  version: "2026-06.1"            # AAAA-MM.secuencia — sube en cada re-evaluación
  capability_frontier:
    modelo_referencia: claude-sonnet-4.6   # frontera contra la que se juzgó
    fecha_evaluacion: "2026-04-29"         # cuándo se clasificó por última vez
  politica_revision: "re-evaluar trimestralmente o ante release mayor de modelo frontier"
  fuentes:
    - Frey-Osborne (2013)
    - Eloundou et al. / OpenAI (2023)
    - O*NET Task Importance
  historial:
    - version: "2026-06.1"
      modelo_referencia: claude-sonnet-4.6
      fecha: "2026-06-12"
      cambios: "versionado inicial (alerta #7); clasificación heredada de 2026-04-29 sin cambios"
```

`modelo_referencia: claude-sonnet-4.6` es consistente con el resto del repo
(M3 coste usa pricing de Sonnet 4.6 como referencia).

## Fuera de alcance (fase 2, diseño solamente)

- **Re-scoring disparado por release**: job trimestral que compara
  `modelo_referencia` contra la frontera vigente y, si difieren, corre una
  re-evaluación LLM-as-judge skill por skill ("¿el modelo X ya hace esta
  skill de punta a punta?") y propone un diff del YAML para revisión humana
  (nunca auto-aplica: las etiquetas mueven KPIs publicados, misma regla que
  FA sectorial). El endpoint v1 ya expone `revision_recomendada` para que el
  workflow de monitoreo pueda alertarlo.
- Versionado por skill individual (fecha por ítem): innecesario mientras las
  re-evaluaciones sean lotes completos.
