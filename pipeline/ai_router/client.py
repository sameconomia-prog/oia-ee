import openai
from openai import AuthenticationError
import structlog

logger = structlog.get_logger()


class FallbackClient:
    def __init__(self, providers: list[dict] | None = None):
        if providers is None:
            from pipeline.ai_router.providers import active_providers
            providers = active_providers()
        self._providers = providers
        self._dead_providers: set[str] = set()

    def chat(self, message: str, system: str = "Eres un asistente útil.") -> str:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": message},
        ]
        return self.chat_with_history(messages)

    def chat_with_history(self, messages: list[dict]) -> str:
        errors = []
        for provider in self._providers:
            if provider["name"] in self._dead_providers:
                continue
            try:
                client = openai.OpenAI(
                    base_url=provider["base_url"],
                    api_key=provider["api_key"],
                    timeout=30.0,
                    default_headers=provider.get("extra_headers", {}),
                )
                response = client.chat.completions.create(
                    model=provider["model"],
                    messages=messages,
                )
                return response.choices[0].message.content
            except AuthenticationError as e:
                self._dead_providers.add(provider["name"])
                errors.append(f"{provider['name']} [401]: {e}")
                logger.warning("ai_provider_dead", provider=provider["name"])
            except Exception as e:
                errors.append(f"{provider['name']}: {e}")
                logger.warning("ai_provider_failed", provider=provider["name"], error=str(e))
        raise RuntimeError("Todos los proveedores fallaron.\n" + "\n".join(errors))
