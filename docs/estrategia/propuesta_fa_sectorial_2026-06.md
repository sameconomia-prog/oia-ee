# Propuesta — FA (fricción de adopción) sectorial para el IVA v2

**Fecha:** 2026-06-11 · **Estado:** PROPUESTA para aprobación del usuario. Hoy el IVA v2 usa FA = 0.25 constante; cambiar a FA sectorial **modifica números publicados**, por eso no se implementó sin visto bueno.

## Por qué importa
El brief (concepto "capacidad ≠ despliegue", Yampolskiy) y el panel (§2.5) coinciden: la automatización técnicamente posible no se adopta uniforme. Una FA constante subestima la protección regulatoria de salud/legal y sobreestima la fricción en sectores digitales puros.

## Diseño propuesto

**Tabla `fa_sectorial`** (additive, editable por superadmin como el crosswalk):

| Columna | Detalle |
|---|---|
| grupo_soc | 2 dígitos SOC ('29', '23', '43'…) |
| fa | 0–1 |
| componentes | JSON: regulacion, sindicacion, concentracion |
| fuente, fecha, es_aproximacion | procedencia y flag de seed |

**Fórmula:** `FA = 0.5·regulación + 0.3·sindicación + 0.2·(1−HHI_norm)` — pesos iniciales a calibrar.

**Fuentes operacionales (todas públicas):**
1. **Regulación**: catálogo CONAMER de trámites/licencias por actividad + existencia de cédula profesional obligatoria (DGP-SEP) para el ejercicio.
2. **Sindicación**: ENOE, % de asalariados sindicalizados por SINCO (vía crosswalk sinco_soc que ya existe en tesis.db).
3. **Concentración (HHI)**: Censos Económicos INEGI por SCIAN; mercados concentrados adoptan más rápido (decisión centralizada) → baja la fricción.

## Valores seed sugeridos para los grupos del piloto (a validar por ti)

| Grupo SOC | FA propuesta | Justificación corta |
|---|---|---|
| 29 (salud) | 0.55 | Cédula obligatoria + responsabilidad civil + plazas públicas |
| 25 (educación) | 0.50 | USICAMM/plazas + sindicación alta |
| 23 (legal) | 0.45 | Colegiación + responsabilidad procesal |
| 13 (finanzas/negocio) | 0.30 | Cumplimiento regulado pero adopción corporativa rápida |
| 15 (TI) | 0.10 | Sin barrera de ejercicio; adopción nativa |
| 27 (creativos/medios) | 0.15 | Mercado fragmentado pero sin regulación de ejercicio |
| 41/43 (ventas/oficina) | 0.20 | Decisión empresarial directa, poca barrera |
| 35/33/47/51/53 (servicios/oficios/operación) | 0.35 | Frontera física (bits-átomos ~4-5 años, Gawdat) + capital físico |

**Efecto esperado:** sube el IVA v2 de TI/oficina (FA hoy 0.25 los protege de más) y baja el de salud/educación/legal — refuerza la corrección anti-falso-positivo en la misma dirección que FES, con fundamento independiente.

## Plan de implementación (1 sesión, cuando apruebes)
1. Migración p34 + modelo `FASectorial` + seed con la tabla de arriba (es_aproximacion=True).
2. `d1_iva_v2.calcular_iva_v2`: FA por ocupación = lookup grupo SOC (los 2 primeros dígitos del soc_code), fallback FA_DEFAULT. Versionar: el resultado ya expone `fa` por respuesta — añadir `fa_fuente`.
3. Endpoints admin GET/PUT (patrón soc-map) + tests + actualización del explainer en la card.
4. Re-correr snapshot para que kpi_historico capture el quiebre con fecha (queda auditado).

## Decisión que te pido
- [ ] Aprobar valores seed (o ajustarlos en la tabla de arriba)
- [ ] Aprobar que FA sectorial sustituya a la constante en el IVA v2 publicado
