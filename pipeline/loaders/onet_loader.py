import logging
from dataclasses import dataclass
from typing import Optional
import httpx
from pipeline.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)
ONET_BASE = "https://services.onetcenter.org/ws/online"


@dataclass
class OnetOccupation:
    onet_code: str
    nombre: str
    p_automatizacion: Optional[float]
    p_augmentacion: Optional[float]
    skills: list[str]
    tareas: list[str]
    sector: Optional[str]
    salario_mediana_usd: Optional[int]


class OnetLoader(BaseScraper):
    def __init__(self, username: str, password: str):
        super().__init__(rate_per_sec=1.0)
        self._auth = (username, password)

    def fetch_occupation(self, onet_code: str) -> Optional[OnetOccupation]:
        self._wait()
        url = f"{ONET_BASE}/occupations/{onet_code}"
        try:
            with httpx.Client(timeout=20, auth=self._auth) as client:
                resp = client.get(url, params={"display": "full"})
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            data = resp.json()
            skills = [
                e["name"]["value"]
                for e in data.get("skills", {}).get("element", [])
            ]
            tareas = [
                e["statement"]["value"]
                for e in data.get("tasks", {}).get("element", [])
            ]
            p_aut = data.get("automation", {}).get("value")
            return OnetOccupation(
                onet_code=data["code"],
                nombre=data["title"],
                p_automatizacion=float(p_aut) if p_aut is not None else None,
                p_augmentacion=None,
                skills=skills,
                tareas=tareas,
                sector=None,
                salario_mediana_usd=None,
            )
        except httpx.HTTPStatusError as e:
            logger.error("ONET HTTP error %s: %s", onet_code, e)
            return None
        except Exception as e:
            logger.error("ONET fetch error %s: %s", onet_code, e)
            return None

    def scrape(self):
        raise NotImplementedError("Use fetch_occupation() directly")
