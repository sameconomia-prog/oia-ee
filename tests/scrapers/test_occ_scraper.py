# tests/scrapers/test_occ_scraper.py
import pytest
from pipeline.scrapers.occ_scraper import _is_ia_related, _parse_salary


# --- _is_ia_related ---

def test_is_ia_related_tier1_match():
    assert _is_ia_related("Machine Learning Engineer senior") is True


def test_is_ia_related_tier1_match_spanish():
    assert _is_ia_related("Ingeniero de inteligencia artificial") is True


def test_is_ia_related_tier2_single_miss():
    assert _is_ia_related("Analista de datos con experiencia en SQL") is False


def test_is_ia_related_tier2_double_match():
    assert _is_ia_related("Data engineer con Databricks y spark para big data") is True


def test_is_ia_related_exclude_overrides_tier1():
    # EXCLUDE keyword anula TIER1
    assert _is_ia_related("machine learning para automatización industrial PLC") is False


def test_is_ia_related_empty_string():
    assert _is_ia_related("") is False


def test_is_ia_related_case_insensitive():
    assert _is_ia_related("PYTORCH DEEP LEARNING") is True


def test_is_ia_related_qa_automation_excluded():
    assert _is_ia_related("automatización de pruebas QA selenium") is False


# --- _parse_salary ---

def test_parse_salary_range():
    assert _parse_salary("20,000 - 40,000") == (20000, 40000)


def test_parse_salary_single():
    assert _parse_salary("$30,000 mensual") == (30000, None)


def test_parse_salary_empty():
    assert _parse_salary("") == (None, None)


def test_parse_salary_non_numeric():
    assert _parse_salary("A convenir") == (None, None)


# --- word-boundary matching for short keywords ---

def test_is_ia_related_bert_in_name_is_false():
    # "bert" alone in a name should NOT match
    assert _is_ia_related("Contador Roberto Bernal buscado") is False


def test_is_ia_related_bert_standalone_is_true():
    # "bert" as a standalone word (model name) should match
    assert _is_ia_related("experiencia con BERT y transformers") is True


# --- _fetch_page ---

from unittest.mock import MagicMock, patch
from pipeline.scrapers.occ_scraper import OccScraper


def _mock_response(json_data=None, content_type="application/json", raise_exc=None):
    mock = MagicMock()
    mock.headers = {"content-type": content_type}
    if json_data is not None:
        mock.json.return_value = json_data
    if raise_exc:
        mock.raise_for_status.side_effect = raise_exc
    else:
        mock.raise_for_status.return_value = None
    return mock


def _ia_vacante_item():
    return {
        "titulo": "Machine Learning Engineer",
        "empresa": "TechCorp",
        "url": "/empleos/ml-engineer/1234/",
        "descripcion": "Experiencia con PyTorch y TensorFlow requerida.",
        "skills": ["Python", "PyTorch"],
        "salario": "40,000 - 70,000",
        "estado": "Jalisco",
        "nivelEstudio": "licenciatura",
        "fechaPublicacion": "2026-04-15",
    }


def test_fetch_page_returns_ia_vacantes():
    scraper = OccScraper()
    payload = {"vacantes": [_ia_vacante_item()], "totalVacantes": 1}
    with patch("pipeline.scrapers.occ_scraper.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_client.get.return_value = _mock_response(json_data=payload)
        result = scraper._fetch_page(1)
    assert len(result) == 1
    assert result[0].titulo == "Machine Learning Engineer"
    assert result[0].url == "https://www.occ.com.mx/empleos/ml-engineer/1234/"
    assert result[0].salario_min == 40000
    assert result[0].salario_max == 70000


def test_fetch_page_filters_non_ia():
    scraper = OccScraper()
    non_ia = dict(_ia_vacante_item())
    non_ia["titulo"] = "Vendedor de seguros"
    non_ia["descripcion"] = "Atención a clientes."
    payload = {"vacantes": [non_ia], "totalVacantes": 1}
    with patch("pipeline.scrapers.occ_scraper.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_client.get.return_value = _mock_response(json_data=payload)
        result = scraper._fetch_page(1)
    assert result == []


def test_fetch_page_on_http_error_returns_empty():
    import httpx as _httpx
    scraper = OccScraper()
    with patch("pipeline.scrapers.occ_scraper.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_client.get.return_value = _mock_response(
            raise_exc=_httpx.HTTPError("timeout")
        )
        result = scraper._fetch_page(1)
    assert result is None


def test_fetch_page_on_non_json_content_type_returns_empty():
    scraper = OccScraper()
    with patch("pipeline.scrapers.occ_scraper.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_client.get.return_value = _mock_response(
            json_data=None, content_type="text/html"
        )
        result = scraper._fetch_page(1)
    assert result is None


def test_fetch_page_empty_raw_server_returns_none():
    """Empty server response signals end of pagination — returns None."""
    scraper = OccScraper()
    payload = {"vacantes": [], "totalVacantes": 0}
    with patch("pipeline.scrapers.occ_scraper.httpx.Client") as mock_cls:
        mock_client = mock_cls.return_value.__enter__.return_value
        mock_client.get.return_value = _mock_response(json_data=payload)
        result = scraper._fetch_page(1)
    assert result is None
