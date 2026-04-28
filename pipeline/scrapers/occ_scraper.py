# pipeline/scrapers/occ_scraper.py
import logging
import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

import httpx

from pipeline.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)

OCC_SEARCH_URL = (
    "https://www.occ.com.mx/empleos/oferta-laboral/"
    "en-tecnologia-informatica-telecomunicaciones/"
)
OCC_BASE_URL = "https://www.occ.com.mx"
_MAX_PAGES = 10
_PAGE_SIZE = 50

TIER1_KEYWORDS = [
    "data scientist", "machine learning engineer", "ai engineer",
    "mlops", "nlp engineer", "computer vision engineer", "llm engineer",
    "científico de datos", "ingeniero de machine learning",
    "machine learning", "deep learning", "inteligencia artificial",
    "aprendizaje automático", "redes neuronales", "visión computacional",
    "procesamiento de lenguaje natural", "nlp", "pln",
    "tensorflow", "pytorch", "scikit-learn", "hugging face", "langchain",
    "llm", "rag", "ia generativa", "generative ai", "genai",
    "embeddings", "transformers", "bert", "gpt", "mlflow",
    "prompt engineer", "ciencia de datos",
]

TIER2_KEYWORDS = [
    "rpa", "uipath", "automation anywhere", "power automate",
    "data engineer", "data analyst", "ingeniero de datos",
    "analista de datos", "big data", "databricks", "spark",
    "modelado predictivo", "analítica avanzada", "business intelligence",
]

EXCLUDE_KEYWORDS = [
    "plc", "scada", "hmi", "allen bradley", "automatización industrial",
    "control automático", "instrumentación", "mecatrónica",
    "soporte técnico", "help desk",
    "selenium", "cypress", "automatización de pruebas", "qa automation",
]

_HEADERS = {
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": (
        "Mozilla/5.0 (compatible; OIA-EE/1.0; +mailto:sam.economia@gmail.com)"
    ),
}


_SHORT_KWS = frozenset({"bert", "rag", "llm", "rpa", "nlp", "pln", "gpt", "hmi"})


def _kw_match(kw: str, text: str) -> bool:
    if kw in _SHORT_KWS:
        return bool(re.search(rf"\b{re.escape(kw)}\b", text))
    return kw in text


def _is_ia_related(text: str) -> bool:
    """EXCLUDE → False. TIER1 any match → True. TIER2 ≥2 matches → True."""
    t = text.lower()
    if any(_kw_match(kw, t) for kw in EXCLUDE_KEYWORDS):
        return False
    if any(_kw_match(kw, t) for kw in TIER1_KEYWORDS):
        return True
    return sum(1 for kw in TIER2_KEYWORDS if _kw_match(kw, t)) >= 2


def _parse_salary(raw: str) -> tuple[Optional[int], Optional[int]]:
    """Extrae (salario_min, salario_max) de texto libre OCC."""
    nums = sorted([
        int(m.replace(",", ""))
        for m in re.findall(r"[\d,]+", raw)
        if m.replace(",", "").isdigit() and len(m.replace(",", "")) >= 3
    ])
    if len(nums) >= 2:
        return nums[0], nums[1]
    if len(nums) == 1:
        return nums[0], None
    return None, None


@dataclass
class OccVacante:
    titulo: str
    empresa: Optional[str]
    url: str
    descripcion: str
    skills: list[str]
    salario_min: Optional[int]
    salario_max: Optional[int]
    estado: Optional[str]
    nivel_educativo: Optional[str]
    fecha_pub: Optional[date]


class OccScraper(BaseScraper):
    def __init__(self):
        super().__init__(rate_per_sec=1.0)

    def scrape(self) -> list[OccVacante]:
        results: list[OccVacante] = []
        seen_urls: set[str] = set()
        for page in range(1, _MAX_PAGES + 1):
            self._wait()
            page_results = self._fetch_page(page)
            if page_results is None:
                break
            for v in page_results:
                if v.url not in seen_urls:
                    seen_urls.add(v.url)
                    results.append(v)
        logger.info("occ_scraper: total_ia_related=%d", len(results))
        return results

    def _fetch_page(self, page: int) -> list[OccVacante] | None:
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(
                    OCC_SEARCH_URL,
                    headers=_HEADERS,
                    params={"p": page, "ps": _PAGE_SIZE},
                )
                resp.raise_for_status()
                if "application/json" not in resp.headers.get("content-type", ""):
                    logger.warning("occ_scraper: page %d returned non-JSON", page)
                    return None
                data = resp.json()
            raw_vacantes = data.get("vacantes") or []
            if not raw_vacantes:
                return None  # server has no more results — stop pagination
            results = []
            for item in raw_vacantes:
                titulo = item.get("titulo") or ""
                descripcion = item.get("descripcion") or ""
                if not _is_ia_related(titulo + " " + descripcion):
                    continue
                raw_url = item.get("url") or ""
                abs_url = (
                    OCC_BASE_URL + raw_url if raw_url.startswith("/") else raw_url
                )
                raw_skills = item.get("skills", [])
                if isinstance(raw_skills, str):
                    raw_skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
                sal_min, sal_max = _parse_salary(item.get("salario", ""))
                fecha_pub: Optional[date] = None
                raw_date = item.get("fechaPublicacion") or ""
                if raw_date:
                    try:
                        fecha_pub = date.fromisoformat(raw_date[:10])
                    except ValueError:
                        pass
                results.append(OccVacante(
                    titulo=titulo,
                    empresa=item.get("empresa") or None,
                    url=abs_url,
                    descripcion=descripcion,
                    skills=raw_skills,
                    salario_min=sal_min,
                    salario_max=sal_max,
                    estado=item.get("estado") or None,
                    nivel_educativo=item.get("nivelEstudio") or None,
                    fecha_pub=fecha_pub,
                ))
            return results
        except httpx.HTTPError as e:
            logger.error("occ_scraper: HTTP error page %d: %s", page, e)
            return None
        except Exception as e:
            logger.error("occ_scraper: unexpected error page %d: %s", page, e)
            return None
