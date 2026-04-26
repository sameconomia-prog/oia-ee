# Groq Classifier — Diseño

**Fecha:** 2026-04-26  
**Estado:** Aprobado  
**Scope:** Reemplazar RuleClassifier como clasificador primario en P8 Radar IA usando Groq Free Tier

---

## Contexto

El extractor de P8 (`pipeline/radar/extractor.py`) actualmente prioriza Claude Haiku si `ANTHROPIC_API_KEY` está disponible, y cae a `RuleClassifier` (regex básico) si no. En producción Railway no tiene `ANTHROPIC_API_KEY` configurada, por lo que todo el volumen cae al RuleClassifier que no puede extraer `empresa`, `numero_despidos` ni `sector` de texto libre.

Groq ofrece `llama-3.1-8b-instant` gratis (6,000 req/día, 30 req/min) con calidad de extracción JSON comparable a Claude Haiku.

---

## Cadena de clasificadores (nueva)

```
texto noticia → GroqClassifier  (si GROQ_API_KEY)      ← PRIMERO (gratis)
              → ClaudeClient    (si ANTHROPIC_API_KEY)  ← fallback de pago
              → RuleClassifier  (último recurso)
```

---

## Componentes

### 1. `pipeline/radar/groq_classifier.py` (nuevo)

Clase `GroqClassifier` con método `extract_event(texto: str, tipo: str) -> dict`.

- Usa la librería `groq` (openai-compatible SDK)
- Modelo: `llama-3.1-8b-instant`
- Mismo prompt JSON que usa `ClaudeClient` hoy
- Retorna dict con campos: `empresa`, `pais`, `sector`, `fecha_anuncio`, `numero_despidos`, `rango_min_despidos`, `rango_max_despidos`, `salario_promedio_usd`, `ia_tecnologia`, `area_reemplazada`, `porcentaje_fuerza_laboral`, `es_reemplazo_total`, `confiabilidad`
- Si Groq retorna JSON inválido: lanza `ValueError` para que el caller haga fallback
- Timeout: 10s

### 2. `pipeline/radar/extractor.py` (modificar)

Cambiar lógica de selección de clasificador:

```python
groq_key = os.getenv("GROQ_API_KEY")
anthropic_key = os.getenv("ANTHROPIC_API_KEY")

if groq_key:
    classifier = GroqClassifier(groq_key)
elif anthropic_key:
    classifier = ClaudeClient(anthropic_key)
else:
    classifier = RuleClassifier()
```

### 3. `requirements.txt` (modificar)

Agregar: `groq>=0.9.0`

### 4. `tests/test_groq_classifier.py` (nuevo)

- Test extracción correcta con mock de respuesta Groq
- Test fallback a `ClaudeClient` cuando `GROQ_API_KEY` ausente
- Test fallback a `RuleClassifier` cuando ambas keys ausentes
- Test manejo de JSON inválido desde Groq

---

## Variables de entorno

| Variable | Dónde | Valor |
|----------|-------|-------|
| `GROQ_API_KEY` | Railway → Variables | Obtener en console.groq.com |

---

## Pasos para activar en producción

1. Crear cuenta gratuita en https://console.groq.com
2. Generar API key
3. Agregar `GROQ_API_KEY` en Railway → Project → Variables
4. Railway redeploy automático

---

## Fuera de scope

- No se modifica el modelo de base de datos
- No se cambia el prompt de extracción (se reutiliza el existente)
- No se implementa rate limiting propio (Groq maneja 30 req/min internamente)
