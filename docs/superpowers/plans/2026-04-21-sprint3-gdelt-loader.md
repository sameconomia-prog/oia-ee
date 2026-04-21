# OIA-EE Sprint 3 — GDELT Loader + Enriquecimiento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scraper de GDELT DOC API con pipeline completo fetch→store→classify→embed, disparado manualmente vía CLI o endpoint `POST /admin/ingest/gdelt`.

**Architecture:** `GdeltScraper` extiende `BaseScraper` y fetcha 6 queries bilingüe contra la API pública de GDELT. `run_gdelt_pipeline()` orquesta: fetch → dedup por URL → store `Noticia` → classify con `ClaudeClient` → embed con Voyage AI. El endpoint de admin protege la operación con `ADMIN_API_KEY` de header.

**Tech Stack:** Python 3.12 · httpx · respx (mocks) · unittest.mock.patch (Claude mock) · FastAPI · SQLAlchemy 2 · pytest

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `pipeline/scrapers/gdelt_scraper.py` | `GdeltScraper` + `DEFAULT_QUERIES` + bloque `__main__` CLI |
| `pipeline/ingest_gdelt.py` | `IngestResult` dataclass + `run_gdelt_pipeline()` |
| `api/routers/admin.py` | `POST /admin/ingest/gdelt` con auth por header |
| Modify: `api/main.py` | Registrar router de admin |
| Modify: `.env.example` | Añadir `VOYAGE_API_KEY` y `ADMIN_API_KEY` |
| `tests/scrapers/test_gdelt_scraper.py` | 4 tests GdeltScraper |
| `tests/test_ingest_gdelt.py` | 4 tests pipeline completo |
| `tests/api/test_admin.py` | 2 tests endpoint admin |

---

## Task 1: GdeltScraper

**Files:**
- Create: `pipeline/scrapers/gdelt_scraper.py`
- Create: `tests/scrapers/test_gdelt_scraper.py`

- [ ] **Step 1: Crear `tests/scrapers/test_gdelt_scraper.py`**

```python
# tests/scrapers/test_gdelt_scraper.py
import pytest
import respx
import httpx
from pipeline.scrapers.gdelt_scraper import GdeltScraper, DEFAULT_QUERIES

SAMPLE_RESPONSE = {
    "articles": [
        {
            "title": "IA elimina empleos en México",
            "url": "https://example.com/art1",
            "seendate": "20240415T120000Z",
            "sourcecountry": "Mexico",
        },
        {
            "title": "AI jobs growing in US",
            "url": "https://example.com/art2",
            "seendate": "20240415T130000Z",
            "sourcecountry": "United States",
        },
    ]
}


@respx.mock
def test_fetch_retorna_articulos():
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=SAMPLE_RESPONSE)
    )
    scraper = GdeltScraper(queries=["inteligencia artificial empleo"])
    articles = scraper.fetch()
    assert len(articles) == 2
    assert articles[0].fuente == "gdelt"
    assert articles[0].titulo == "IA elimina empleos en México"
    assert articles[0].pais == "Mexico"


@respx.mock
def test_fetch_deduplica_por_url():
    same_url_response = {
        "articles": [
            {"title": "Artículo duplicado", "url": "https://example.com/dup", "seendate": "20240415T120000Z"}
        ]
    }
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=same_url_response)
    )
    scraper = GdeltScraper(queries=["query uno", "query dos"])
    articles = scraper.fetch()
    assert len(articles) == 1


@respx.mock
def test_fetch_maneja_respuesta_vacia():
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json={"articles": []})
    )
    scraper = GdeltScraper(queries=["test query"])
    articles = scraper.fetch()
    assert articles == []


@respx.mock
def test_fetch_maneja_error_http():
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(500)
    )
    scraper = GdeltScraper(queries=["test query"])
    articles = scraper.fetch()
    assert articles == []
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/scrapers/test_gdelt_scraper.py -v 2>&1 | head -15
```

Salida esperada: `FAILED` con `ModuleNotFoundError: No module named 'pipeline.scrapers.gdelt_scraper'`

- [ ] **Step 3: Crear `pipeline/scrapers/gdelt_scraper.py`**

```python
# pipeline/scrapers/gdelt_scraper.py
import logging
from datetime import datetime
from typing import Optional
import httpx
from pipeline.scrapers.base_scraper import BaseScraper
from pipeline.scrapers.news_scraper import RawArticle

logger = logging.getLogger(__name__)

GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
MAX_RECORDS = 250

DEFAULT_QUERIES = [
    "inteligencia artificial empleo",
    "AI jobs education",
    "automatización trabajo",
    "machine learning workforce",
    "IA educación México",
    "artificial intelligence employment",
]


class GdeltScraper(BaseScraper):
    def __init__(self, queries: list[str] = None):
        super().__init__(rate_per_sec=1.0)
        self._queries = queries or DEFAULT_QUERIES

    def scrape(self) -> list[RawArticle]:
        return self.fetch()

    def fetch(self) -> list[RawArticle]:
        seen_urls: set[str] = set()
        results: list[RawArticle] = []
        for query in self._queries:
            self._wait()
            articles = self._fetch_query(query)
            for a in articles:
                if a.url not in seen_urls:
                    seen_urls.add(a.url)
                    results.append(a)
        return results

    def _fetch_query(self, query: str) -> list[RawArticle]:
        params = {
            "query": query,
            "mode": "ArtList",
            "maxrecords": str(MAX_RECORDS),
            "format": "json",
        }
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(GDELT_DOC_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
            return [self._parse(a) for a in (data.get("articles") or []) if a.get("url")]
        except Exception as e:
            logger.error("GDELT query '%s' failed: %s", query, e)
            return []

    def _parse(self, a: dict) -> RawArticle:
        fecha_pub: Optional[datetime] = None
        raw_date = a.get("seendate", "")
        if raw_date:
            try:
                fecha_pub = datetime.strptime(raw_date, "%Y%m%dT%H%M%SZ")
            except ValueError:
                pass
        return RawArticle(
            titulo=a.get("title", ""),
            url=a["url"],
            fuente="gdelt",
            contenido="",
            fecha_pub=fecha_pub,
            pais=a.get("sourcecountry", "global"),
        )
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/scrapers/test_gdelt_scraper.py -v
```

Salida esperada:
```
tests/scrapers/test_gdelt_scraper.py::test_fetch_retorna_articulos PASSED
tests/scrapers/test_gdelt_scraper.py::test_fetch_deduplica_por_url PASSED
tests/scrapers/test_gdelt_scraper.py::test_fetch_maneja_respuesta_vacia PASSED
tests/scrapers/test_gdelt_scraper.py::test_fetch_maneja_error_http PASSED
4 passed
```

- [ ] **Step 5: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && git add pipeline/scrapers/gdelt_scraper.py tests/scrapers/test_gdelt_scraper.py && git commit -m "feat(scraper): GdeltScraper — fetch 6 queries + dedup + tests"
```

---

## Task 2: Ingest Pipeline

**Files:**
- Create: `pipeline/ingest_gdelt.py`
- Create: `tests/test_ingest_gdelt.py`
- Modify: `pipeline/scrapers/gdelt_scraper.py` (añadir bloque `__main__`)

- [ ] **Step 1: Crear `tests/test_ingest_gdelt.py`**

```python
# tests/test_ingest_gdelt.py
import pytest
import respx
import httpx
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base, Noticia
from pipeline.ingest_gdelt import run_gdelt_pipeline, IngestResult
from pipeline.utils.claude_client import NoticiasClassification

FAKE_VECTOR = [0.1] * 1024

GDELT_RESPONSE = {
    "articles": [
        {
            "title": "IA y empleo en México",
            "url": "https://t.co/gdelt1",
            "seendate": "20240415T120000Z",
            "sourcecountry": "Mexico",
        },
        {
            "title": "AI education worldwide",
            "url": "https://t.co/gdelt2",
            "seendate": "20240415T130000Z",
            "sourcecountry": "United States",
        },
    ]
}

FAKE_CLASSIFICATION = NoticiasClassification(
    sector="tecnologia",
    tipo_impacto="despido_masivo",
    n_empleados_afectados=100,
    empresa="Tech Corp",
    causa_ia="LLM automation",
    resumen="Resumen de prueba para test automatizado.",
)


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


@respx.mock
def test_pipeline_completo(session):
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=GDELT_RESPONSE)
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = FAKE_CLASSIFICATION
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["inteligencia artificial empleo"],
        )
    assert result.fetched == 2
    assert result.stored == 2
    assert result.classified == 2
    assert result.embedded == 2


@respx.mock
def test_pipeline_salta_duplicados(session):
    existing = Noticia(titulo="Ya existe", url="https://t.co/gdelt1", fuente="rss")
    session.add(existing)
    session.flush()

    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json=GDELT_RESPONSE)
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = FAKE_CLASSIFICATION
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["inteligencia artificial empleo"],
        )
    assert result.fetched == 2
    assert result.stored == 1


@respx.mock
def test_pipeline_classify_falla_continua(session):
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json={
            "articles": [{"title": "IA test", "url": "https://t.co/fail1", "seendate": "20240415T120000Z"}]
        })
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(200, json={"data": [{"embedding": FAKE_VECTOR}]})
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = None
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["test"],
        )
    assert result.stored == 1
    assert result.classified == 0
    assert result.embedded == 1


@respx.mock
def test_pipeline_embed_falla_continua(session):
    respx.get("https://api.gdeltproject.org/api/v2/doc/doc").mock(
        return_value=httpx.Response(200, json={
            "articles": [{"title": "IA embed test", "url": "https://t.co/efail1", "seendate": "20240415T120000Z"}]
        })
    )
    respx.post("https://api.voyageai.com/v1/embeddings").mock(
        return_value=httpx.Response(500)
    )
    with patch("pipeline.ingest_gdelt.ClaudeClient") as MockClaude:
        MockClaude.return_value.clasificar_noticia.return_value = FAKE_CLASSIFICATION
        result = run_gdelt_pipeline(
            session,
            api_key_claude="test-claude",
            api_key_voyage="test-voyage",
            queries=["test"],
        )
    assert result.stored == 1
    assert result.classified == 1
    assert result.embedded == 0
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/test_ingest_gdelt.py -v 2>&1 | head -10
```

Salida esperada: `FAILED` con `ModuleNotFoundError: No module named 'pipeline.ingest_gdelt'`

- [ ] **Step 3: Crear `pipeline/ingest_gdelt.py`**

```python
# pipeline/ingest_gdelt.py
import logging
from dataclasses import dataclass
from sqlalchemy.orm import Session
from pipeline.db.models import Noticia
from pipeline.scrapers.gdelt_scraper import GdeltScraper, DEFAULT_QUERIES
from pipeline.utils.claude_client import ClaudeClient
from pipeline.utils.embeddings import embed_text, store_embedding

logger = logging.getLogger(__name__)


@dataclass
class IngestResult:
    fetched: int
    stored: int
    classified: int
    embedded: int


def run_gdelt_pipeline(
    session: Session,
    api_key_claude: str,
    api_key_voyage: str,
    queries: list[str] = None,
) -> IngestResult:
    """Fetch GDELT articles, store new ones, classify with Claude, embed with Voyage AI."""
    queries = queries or DEFAULT_QUERIES
    articles = GdeltScraper(queries=queries).fetch()
    fetched = len(articles)

    claude = ClaudeClient(api_key=api_key_claude)
    stored = classified = embedded = 0

    for article in articles:
        if session.query(Noticia).filter_by(url=article.url).first():
            continue

        noticia = Noticia(
            titulo=article.titulo,
            url=article.url,
            fuente=article.fuente,
            pais=article.pais,
            fecha_pub=article.fecha_pub,
            raw_content=article.contenido,
        )
        session.add(noticia)
        session.flush()
        stored += 1

        try:
            result = claude.clasificar_noticia(noticia.titulo, noticia.raw_content or "")
            if result:
                noticia.sector = result.sector
                noticia.tipo_impacto = result.tipo_impacto
                noticia.n_empleados = result.n_empleados_afectados
                noticia.empresa = result.empresa
                noticia.causa_ia = result.causa_ia
                noticia.resumen_claude = result.resumen
                classified += 1
        except Exception as e:
            logger.error("Classify error for %s: %s", noticia.url, e)

        try:
            vector = embed_text(noticia.titulo, api_key=api_key_voyage)
            if vector:
                store_embedding(noticia.id, vector, session)
                embedded += 1
        except Exception as e:
            logger.error("Embed error for %s: %s", noticia.url, e)

    return IngestResult(fetched=fetched, stored=stored, classified=classified, embedded=embedded)
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/test_ingest_gdelt.py -v
```

Salida esperada: `4 passed`

- [ ] **Step 5: Añadir bloque `__main__` a `pipeline/scrapers/gdelt_scraper.py`**

Añadir al **final** de `pipeline/scrapers/gdelt_scraper.py`:

```python
if __name__ == "__main__":
    import os
    from pipeline.db import get_session
    from pipeline.ingest_gdelt import run_gdelt_pipeline

    api_key_claude = os.getenv("ANTHROPIC_API_KEY", "")
    api_key_voyage = os.getenv("VOYAGE_API_KEY", "")

    with get_session() as session:
        result = run_gdelt_pipeline(session, api_key_claude, api_key_voyage)

    print(f"GDELT Ingest complete:")
    print(f"  fetched:    {result.fetched}")
    print(f"  stored:     {result.stored}")
    print(f"  classified: {result.classified}")
    print(f"  embedded:   {result.embedded}")
```

- [ ] **Step 6: Verificar suite completa sin regresiones**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/ -q --tb=short
```

Salida esperada: `42 passed` (38 Sprint1+2 + 4 nuevos)

- [ ] **Step 7: Commit**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && git add pipeline/ingest_gdelt.py pipeline/scrapers/gdelt_scraper.py tests/test_ingest_gdelt.py && git commit -m "feat(pipeline): run_gdelt_pipeline — store + classify + embed + tests"
```

---

## Task 3: Admin API Endpoint

**Files:**
- Create: `api/routers/admin.py`
- Create: `tests/api/test_admin.py`
- Modify: `api/main.py` (registrar router)
- Modify: `.env.example` (añadir VOYAGE_API_KEY y ADMIN_API_KEY)

- [ ] **Step 1: Crear `tests/api/test_admin.py`**

```python
# tests/api/test_admin.py
import pytest
from unittest.mock import patch
from pipeline.ingest_gdelt import IngestResult

FAKE_RESULT = IngestResult(fetched=10, stored=8, classified=7, embedded=6)


def test_ingest_gdelt_sin_key_devuelve_401(client):
    resp = client.post("/admin/ingest/gdelt")
    assert resp.status_code == 401


def test_ingest_gdelt_con_key_valida_devuelve_resultado(client, monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "secret-test-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-claude")
    monkeypatch.setenv("VOYAGE_API_KEY", "test-voyage")
    with patch("api.routers.admin.run_gdelt_pipeline", return_value=FAKE_RESULT):
        resp = client.post(
            "/admin/ingest/gdelt",
            headers={"X-Admin-Key": "secret-test-key"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["fetched"] == 10
    assert data["stored"] == 8
    assert data["classified"] == 7
    assert data["embedded"] == 6
```

- [ ] **Step 2: Verificar que los tests fallan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/api/test_admin.py -v 2>&1 | head -15
```

Salida esperada: `FAILED` con `ModuleNotFoundError` o 404

- [ ] **Step 3: Crear `api/routers/admin.py`**

```python
# api/routers/admin.py
import os
import logging
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from api.deps import get_db
from pipeline.ingest_gdelt import run_gdelt_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


class IngestResultOut(BaseModel):
    fetched: int
    stored: int
    classified: int
    embedded: int


@router.post("/ingest/gdelt", response_model=IngestResultOut)
def ingest_gdelt(
    x_admin_key: str = Header(None),
    db: Session = Depends(get_db),
):
    admin_key = os.getenv("ADMIN_API_KEY", "")
    if not admin_key or x_admin_key != admin_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    result = run_gdelt_pipeline(
        session=db,
        api_key_claude=os.getenv("ANTHROPIC_API_KEY", ""),
        api_key_voyage=os.getenv("VOYAGE_API_KEY", ""),
    )
    return IngestResultOut(**vars(result))
```

- [ ] **Step 4: Registrar router en `api/main.py`**

El archivo actual `api/main.py` tiene este contenido:

```python
from fastapi import FastAPI
from api.routers import noticias, kpis

app = FastAPI(title="OIA-EE API", version="0.2.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

Reemplazarlo con:

```python
from fastapi import FastAPI
from api.routers import noticias, kpis, admin

app = FastAPI(title="OIA-EE API", version="0.3.0")
app.include_router(noticias.router, prefix="/noticias", tags=["noticias"])
app.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Actualizar `.env.example`**

Añadir al final de `.env.example`:

```
VOYAGE_API_KEY=
ADMIN_API_KEY=
```

- [ ] **Step 6: Verificar que los tests pasan**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/api/test_admin.py -v
```

Salida esperada: `2 passed`

- [ ] **Step 7: Verificar suite completa**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && PYTHONPATH=. pipeline/.venv/bin/pytest tests/ -q --tb=short
```

Salida esperada: `48 passed` (38 Sprint1+2 + 10 Sprint3)

- [ ] **Step 8: Commit y tag**

```bash
cd /Users/arturoaguilar/Documents/OIA-EE/.worktrees/sprint3 && git add api/routers/admin.py api/main.py tests/api/test_admin.py .env.example && git commit -m "feat(api): POST /admin/ingest/gdelt + auth por header + tests"
git tag sprint3-gdelt-loader
```

---

## Self-Review — Cobertura del Spec

| Requisito del spec | Cubierto | Task |
|---------------------|----------|------|
| GdeltScraper extiende BaseScraper | ✅ | Task 1 |
| 6 queries DEFAULT_QUERIES | ✅ | Task 1 |
| GDELT DOC API URL correcta | ✅ | Task 1 |
| Deduplicación por URL | ✅ | Task 1 |
| Rate limiting 1 req/seg | ✅ | Task 1 (`super().__init__(rate_per_sec=1.0)`) |
| RawArticle con campos correctos (titulo, url, fuente, contenido, fecha_pub, pais) | ✅ | Task 1 |
| IngestResult dataclass (fetched, stored, classified, embedded) | ✅ | Task 2 |
| Store salta duplicados por URL | ✅ | Task 2 |
| Classify con ClaudeClient — falla silenciosa | ✅ | Task 2 |
| Embed con Voyage AI — falla silenciosa | ✅ | Task 2 |
| CLI `python -m pipeline.scrapers.gdelt_scraper` | ✅ | Task 2 |
| POST /admin/ingest/gdelt | ✅ | Task 3 |
| Auth por header X-Admin-Key | ✅ | Task 3 |
| 401 sin key | ✅ | Task 3 |
| .env.example con VOYAGE_API_KEY y ADMIN_API_KEY | ✅ | Task 3 |
| ≥48 tests totales | ✅ | 38 + 4 + 4 + 2 = 48 |
