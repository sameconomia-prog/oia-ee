"""Tools live para agentes IA — llaman API real (Railway) o RAG local."""
from pipeline.agents.tools.kpi import kpi_lookup, benchmark_lookup, list_benchmark_slugs
from pipeline.agents.tools.source import source_lookup, list_sources
from pipeline.agents.tools.corpus import corpus_search

__all__ = [
    "kpi_lookup", "benchmark_lookup", "list_benchmark_slugs",
    "source_lookup", "list_sources",
    "corpus_search",
]
