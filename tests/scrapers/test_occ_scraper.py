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
