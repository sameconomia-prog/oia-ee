# tests/radar/test_sources.py
from unittest.mock import patch, MagicMock
from pipeline.radar.sources.grok_source import fetch_grok_news, GrokArticle
from pipeline.radar.sources.newsapi_source import fetch_newsapi_articles


def test_fetch_grok_news_returns_articles():
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="""[
            {"titulo": "Samsung lays off 2000 workers due to AI",
             "url": "https://reuters.com/test1",
             "fecha": "2025-04-20",
             "fuente": "Reuters",
             "resumen": "Samsung replaces quality control workers with Vision AI"},
            {"titulo": "IBM AI cuts 1000 accounting jobs",
             "url": "https://bloomberg.com/test2",
             "fecha": "2025-04-19",
             "fuente": "Bloomberg",
             "resumen": "IBM deploys watsonx to automate financial reporting"}
        ]"""))
    ]

    with patch("pipeline.radar.sources.grok_source.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = mock_response

        articles = fetch_grok_news(tipo="despidos", api_key="test-key")

    assert len(articles) == 2
    assert all(isinstance(a, GrokArticle) for a in articles)
    assert articles[0].url == "https://reuters.com/test1"


def test_fetch_grok_news_tipo_empleos():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="[]"))]

    with patch("pipeline.radar.sources.grok_source.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = mock_response
        articles = fetch_grok_news(tipo="empleos", api_key="test-key")

    assert isinstance(articles, list)
