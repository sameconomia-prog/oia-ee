# Groq Classifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar Groq Free Tier como clasificador primario en P8 Radar IA, antes de Claude Haiku y RuleClassifier.

**Architecture:** Crear `pipeline/radar/groq_classifier.py` con función `call_groq()`, luego modificar `extractor.py` para intentar Groq → Claude → `None` (RuleClassifier ya existe en el ingestor). Los tests usan mocks para aislar las llamadas HTTP.

**Tech Stack:** `groq>=0.9.0` (openai-compatible SDK), `llama-3.1-8b-instant`, pytest + unittest.mock

---

### Task 1: Agregar dependencia groq

**Files:**
- Modify: `pipeline/requirements.txt`

- [ ] **Step 1: Agregar groq al requirements**

Abrir `pipeline/requirements.txt` y agregar al final:

```
groq>=0.9.0
```

- [ ] **Step 2: Instalar en el venv**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && pip install "groq>=0.9.0"
```

Expected: `Successfully installed groq-X.X.X`

- [ ] **Step 3: Verificar import**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -c "from groq import Groq; print('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/requirements.txt && git commit -m "deps: add groq>=0.9.0 for free-tier LLM classifier"
```

---

### Task 2: Crear groq_classifier.py con TDD

**Files:**
- Create: `tests/radar/test_groq_classifier.py`
- Create: `pipeline/radar/groq_classifier.py`

- [ ] **Step 1: Escribir tests que fallan**

Crear `tests/radar/test_groq_classifier.py`:

```python
# tests/radar/test_groq_classifier.py
import pytest
import json
from unittest.mock import patch, MagicMock
from pipeline.radar.groq_classifier import call_groq


def _mock_groq_response(text: str) -> MagicMock:
    choice = MagicMock()
    choice.message.content = text
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def test_call_groq_returns_text_on_success():
    with patch("pipeline.radar.groq_classifier.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.return_value = _mock_groq_response('{"empresa": "Acme"}')

        result = call_groq("prompt de prueba", api_key="test-key")

    assert result == '{"empresa": "Acme"}'


def test_call_groq_returns_none_on_exception():
    with patch("pipeline.radar.groq_classifier.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.side_effect = Exception("connection error")

        result = call_groq("prompt de prueba", api_key="test-key")

    assert result is None


def test_call_groq_uses_correct_model():
    with patch("pipeline.radar.groq_classifier.Groq") as MockGroq:
        instance = MockGroq.return_value
        instance.chat.completions.create.return_value = _mock_groq_response("null")

        call_groq("prompt", api_key="test-key")

        call_kwargs = instance.chat.completions.create.call_args
        assert call_kwargs.kwargs["model"] == "llama-3.1-8b-instant"
        assert call_kwargs.kwargs["max_tokens"] == 512
```

- [ ] **Step 2: Correr tests — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/radar/test_groq_classifier.py -v
```

Expected: `ERROR` (ModuleNotFoundError — `groq_classifier` no existe aún)

- [ ] **Step 3: Implementar groq_classifier.py**

Crear `pipeline/radar/groq_classifier.py`:

```python
# pipeline/radar/groq_classifier.py
"""LLM call via Groq Free Tier (llama-3.1-8b-instant)."""
from typing import Optional
import structlog
from groq import Groq

logger = structlog.get_logger()

_GROQ_MODEL = "llama-3.1-8b-instant"


def call_groq(prompt: str, api_key: str) -> Optional[str]:
    """Llama a Groq API. Retorna texto crudo o None en error."""
    try:
        client = Groq(api_key=api_key, timeout=10.0)
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.error("groq_call_failed", error=str(e))
        return None
```

- [ ] **Step 4: Correr tests — verificar que pasan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/radar/test_groq_classifier.py -v
```

Expected:
```
tests/radar/test_groq_classifier.py::test_call_groq_returns_text_on_success PASSED
tests/radar/test_groq_classifier.py::test_call_groq_returns_none_on_exception PASSED
tests/radar/test_groq_classifier.py::test_call_groq_uses_correct_model PASSED
3 passed
```

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/radar/groq_classifier.py tests/radar/test_groq_classifier.py && git commit -m "feat(p8): add Groq Free Tier LLM caller (llama-3.1-8b-instant)"
```

---

### Task 3: Refactorizar extractor.py — cadena Groq → Claude → None

**Files:**
- Modify: `pipeline/radar/extractor.py`
- Modify: `tests/radar/test_extractor.py`

- [ ] **Step 1: Agregar tests de la cadena de fallback**

Agregar al final de `tests/radar/test_extractor.py`:

```python
def test_extract_despido_uses_groq_when_groq_key_present():
    """Groq se usa primero cuando GROQ_API_KEY está disponible."""
    groq_resp = json.dumps({
        "empresa": "TechCorp", "pais": "US", "sector": "tech",
        "fecha_anuncio": "2025-01-01", "numero_despidos": 500,
        "rango_min_despidos": None, "rango_max_despidos": None,
        "salario_promedio_usd": None, "ia_tecnologia": "GPT-4",
        "area_reemplazada": "support", "porcentaje_fuerza_laboral": None,
        "es_reemplazo_total": False, "confiabilidad": "media",
    })

    with patch("pipeline.radar.extractor.call_groq", return_value=groq_resp) as mock_groq, \
         patch("pipeline.radar.extractor._call_haiku") as mock_haiku:

        result = extract_despido_event(NOTICIA_DESPIDO, groq_api_key="groq-test-key")

    assert isinstance(result, ExtractedDespido)
    assert result.empresa == "TechCorp"
    mock_groq.assert_called_once()
    mock_haiku.assert_not_called()


def test_extract_despido_falls_back_to_claude_when_groq_fails():
    """Si Groq retorna None, se intenta Claude Haiku."""
    haiku_resp = MagicMock()
    haiku_resp.content = [MagicMock(text=json.dumps({
        "empresa": "AcmeCorp", "pais": "MX", "sector": "retail",
        "fecha_anuncio": "2025-02-01", "numero_despidos": 100,
        "rango_min_despidos": None, "rango_max_despidos": None,
        "salario_promedio_usd": None, "ia_tecnologia": None,
        "area_reemplazada": None, "porcentaje_fuerza_laboral": None,
        "es_reemplazo_total": None, "confiabilidad": "baja",
    }))]

    with patch("pipeline.radar.extractor.call_groq", return_value=None), \
         patch("anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = haiku_resp

        result = extract_despido_event(
            NOTICIA_DESPIDO,
            api_key="anthropic-test-key",
            groq_api_key="groq-test-key",
        )

    assert isinstance(result, ExtractedDespido)
    assert result.empresa == "AcmeCorp"


def test_extract_despido_returns_none_when_both_keys_absent():
    """Sin keys, retorna None (no hay LLM disponible)."""
    with patch("pipeline.radar.extractor.call_groq") as mock_groq, \
         patch("pipeline.radar.extractor._call_haiku") as mock_haiku:

        result = extract_despido_event(NOTICIA_DESPIDO, api_key="", groq_api_key="")

    assert result is None
    mock_groq.assert_not_called()
    mock_haiku.assert_not_called()
```

- [ ] **Step 2: Correr tests nuevos — verificar que fallan**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/radar/test_extractor.py::test_extract_despido_uses_groq_when_groq_key_present tests/radar/test_extractor.py::test_extract_despido_falls_back_to_claude_when_groq_fails tests/radar/test_extractor.py::test_extract_despido_returns_none_when_both_keys_absent -v
```

Expected: `FAILED` (los nuevos parámetros no existen aún)

- [ ] **Step 3: Modificar extractor.py**

Reemplazar el contenido completo de `pipeline/radar/extractor.py` con:

```python
# pipeline/radar/extractor.py
"""Extrae datos estructurados de noticias. Cadena: Groq → Claude Haiku → None."""
import json
import os
import structlog
from dataclasses import dataclass, field
from typing import Optional
import anthropic
from pipeline.radar.groq_classifier import call_groq

logger = structlog.get_logger()

_HAIKU_MODEL = "claude-haiku-4-5-20251001"

_DESPIDO_SCHEMA = {
    "empresa": "string",
    "pais": "string (ISO 3166 2-char)",
    "sector": "string",
    "fecha_anuncio": "string YYYY-MM-DD",
    "numero_despidos": "integer or null",
    "rango_min_despidos": "integer or null",
    "rango_max_despidos": "integer or null",
    "salario_promedio_usd": "float or null",
    "ia_tecnologia": "string (nombre específico) or null",
    "area_reemplazada": "string or null",
    "porcentaje_fuerza_laboral": "float 0-1 or null",
    "es_reemplazo_total": "boolean or null",
    "confiabilidad": "alta | media | baja",
}

_EMPLEO_SCHEMA = {
    "empresa": "string",
    "pais": "string (ISO 3166 2-char)",
    "sector": "string",
    "fecha_anuncio": "string YYYY-MM-DD",
    "numero_empleos": "integer or null",
    "tipo_contrato": "permanente | temporal | freelance | null",
    "titulo_puesto": "string or null",
    "habilidades_requeridas": "array of strings",
    "salario_min_usd": "float or null",
    "salario_max_usd": "float or null",
    "ia_tecnologia_usada": "string or null",
    "confiabilidad": "alta | media | baja",
}


@dataclass
class ExtractedDespido:
    empresa: str
    pais: str
    sector: Optional[str]
    fecha_anuncio: str
    numero_despidos: Optional[int] = None
    rango_min_despidos: Optional[int] = None
    rango_max_despidos: Optional[int] = None
    salario_promedio_usd: Optional[float] = None
    ia_tecnologia: Optional[str] = None
    area_reemplazada: Optional[str] = None
    porcentaje_fuerza_laboral: Optional[float] = None
    es_reemplazo_total: Optional[bool] = None
    confiabilidad: str = "baja"


@dataclass
class ExtractedEmpleo:
    empresa: str
    pais: str
    sector: Optional[str]
    fecha_anuncio: str
    numero_empleos: Optional[int] = None
    tipo_contrato: Optional[str] = None
    titulo_puesto: Optional[str] = None
    habilidades_requeridas: list = field(default_factory=list)
    salario_min_usd: Optional[float] = None
    salario_max_usd: Optional[float] = None
    ia_tecnologia_usada: Optional[str] = None
    confiabilidad: str = "baja"


def _call_haiku(prompt: str, api_key: str) -> Optional[str]:
    client = anthropic.Anthropic(api_key=api_key)
    try:
        resp = client.messages.create(
            model=_HAIKU_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text
    except Exception as e:
        logger.error("haiku_call_failed", error=str(e))
        return None


def _resolve_raw(prompt: str, groq_key: Optional[str], anthropic_key: Optional[str]) -> Optional[str]:
    """Intenta Groq primero, luego Claude Haiku. Retorna texto crudo o None."""
    if groq_key:
        raw = call_groq(prompt, groq_key)
        if raw is not None:
            return raw
    if anthropic_key:
        return _call_haiku(prompt, anthropic_key)
    return None


def _parse_json_response(raw: Optional[str]) -> Optional[dict]:
    if not raw or raw.strip() == "null":
        return None
    try:
        data = json.loads(raw.strip())
        if not data or not isinstance(data, dict):
            return None
        return data
    except (json.JSONDecodeError, TypeError):
        return None


def extract_despido_event(
    article_text: str,
    api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
) -> Optional[ExtractedDespido]:
    """Extrae evento de despido por IA. Usa Groq → Claude → None."""
    groq_key = groq_api_key if groq_api_key is not None else os.getenv("GROQ_API_KEY", "") or None
    anthropic_key = api_key if api_key is not None else os.getenv("ANTHROPIC_API_KEY", "") or None

    schema_str = json.dumps(_DESPIDO_SCHEMA, ensure_ascii=False, indent=2)
    prompt = f"""Extrae de este artículo datos sobre despidos causados por implementación de IA.
Devuelve SOLO un objeto JSON con este schema (usa null si no está disponible):
{schema_str}

Artículo:
{article_text[:3000]}

IMPORTANTE: Si el artículo NO describe despidos por IA, devuelve: null
Responde SOLO con el JSON o null, sin explicación."""

    raw = _resolve_raw(prompt, groq_key, anthropic_key)
    data = _parse_json_response(raw)
    if data is None:
        return None
    try:
        return ExtractedDespido(**{k: data.get(k) for k in ExtractedDespido.__dataclass_fields__})
    except TypeError as e:
        logger.warning("despido_extract_parse_error", error=str(e))
        return None


def extract_empleo_event(
    article_text: str,
    api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
) -> Optional[ExtractedEmpleo]:
    """Extrae evento de empleo por IA. Usa Groq → Claude → None."""
    groq_key = groq_api_key if groq_api_key is not None else os.getenv("GROQ_API_KEY", "") or None
    anthropic_key = api_key if api_key is not None else os.getenv("ANTHROPIC_API_KEY", "") or None

    schema_str = json.dumps(_EMPLEO_SCHEMA, ensure_ascii=False, indent=2)
    prompt = f"""Extrae de este artículo datos sobre empleos NUEVOS creados por empresas que usan IA.
Devuelve SOLO un objeto JSON con este schema (usa null si no está disponible):
{schema_str}

Artículo:
{article_text[:3000]}

IMPORTANTE: Si el artículo NO describe creación de empleos relacionados con IA, devuelve: null
Responde SOLO con el JSON o null, sin explicación."""

    raw = _resolve_raw(prompt, groq_key, anthropic_key)
    data = _parse_json_response(raw)
    if data is None:
        return None
    try:
        return ExtractedEmpleo(**{k: data.get(k) for k in ExtractedEmpleo.__dataclass_fields__})
    except TypeError as e:
        logger.warning("empleo_extract_parse_error", error=str(e))
        return None
```

- [ ] **Step 4: Correr todos los tests del radar**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/radar/ -v
```

Expected: todos PASS (incluyendo los 3 tests nuevos + los 3 anteriores)

- [ ] **Step 5: Correr suite completa**

```bash
cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate && python -m pytest tests/ -q
```

Expected: 267+ passed, 0 failed

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/OIA-EE && git add pipeline/radar/extractor.py tests/radar/test_extractor.py && git commit -m "feat(p8): Groq-first classifier chain — Groq → Claude → None"
```

---

### Task 4: Actualizar docs/deploy y nota Obsidian

**Files:**
- Modify: `docs/deploy/railway-env-vars.md`

- [ ] **Step 1: Agregar GROQ_API_KEY al doc de Railway**

En `docs/deploy/railway-env-vars.md`, agregar fila a la tabla de variables:

```markdown
| `GROQ_API_KEY` | API key Groq Free Tier (clasificador primario P8) | gsk_... (obtener en console.groq.com) |
```

- [ ] **Step 2: Guardar nota en Obsidian**

Crear `/Users/arturoaguilar/Documents/Obsidian Vault/01 - Proyectos/OIA-EE/groq-classifier-completado.md`:

```markdown
# Groq Classifier — Completado 2026-04-26

## Resumen
P8 Radar ahora usa Groq Free Tier (`llama-3.1-8b-instant`) como clasificador primario.
Cadena: Groq → Claude Haiku → None.

## Qué se implementó
- `pipeline/radar/groq_classifier.py` — función `call_groq()`
- `pipeline/radar/extractor.py` — refactorizado con `_resolve_raw()` y fallback chain
- 3 tests nuevos de fallback en `tests/radar/test_extractor.py`
- 3 tests unitarios en `tests/radar/test_groq_classifier.py`

## Para activar en producción
1. Crear cuenta en https://console.groq.com
2. Generar API key (gsk_...)
3. Agregar `GROQ_API_KEY` en Railway → Project → Variables
4. Railway redeploy automático (sin cambios de código necesarios)

#OIA-EE #groq #clasificador #p8 #completado
```

- [ ] **Step 3: Commit final**

```bash
cd ~/Documents/OIA-EE && git add docs/deploy/railway-env-vars.md && git commit -m "docs: add GROQ_API_KEY to Railway env vars guide"
```
