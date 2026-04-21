import time
import threading
from dataclasses import dataclass, field


@dataclass
class TokenBucket:
    """Token bucket rate limiter. Thread-safe."""
    rate: float
    capacity: float
    _tokens: float = field(init=False)
    _last_check: float = field(init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)

    def __post_init__(self):
        self._tokens = self.capacity
        self._last_check = time.monotonic()

    def acquire(self, tokens: float = 1.0) -> None:
        """Blocks until enough tokens are available."""
        while True:
            with self._lock:
                now = time.monotonic()
                elapsed = now - self._last_check
                self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
                self._last_check = now
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return
                sleep_for = (tokens - self._tokens) / self.rate
            time.sleep(sleep_for)
