import logging
from abc import ABC, abstractmethod
from pipeline.utils.rate_limiter import TokenBucket

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Base class: rate limiting + URL deduplication."""

    def __init__(self, rate_per_sec: float = 2.0):
        self._limiter = TokenBucket(rate=rate_per_sec, capacity=rate_per_sec * 5)

    def _wait(self):
        self._limiter.acquire()

    @abstractmethod
    def scrape(self):
        ...
