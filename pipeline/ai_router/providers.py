import os

# Orden estratégico: Groq primero (más rápido para clasificación corta),
# luego chinos sin restricciones de red, luego resto.
PROVIDERS = [
    {
        "name": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key": os.getenv("GROQ_API_KEY", ""),
        "model": "llama-3.1-8b-instant",
        "extra_headers": {},
    },
    {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com",
        "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
        "model": "deepseek-chat",
        "extra_headers": {},
    },
    {
        "name": "Qwen",
        "base_url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        "api_key": os.getenv("QWEN_API_KEY", ""),
        "model": "qwen-plus",
        "extra_headers": {},
    },
    {
        "name": "ZAI",
        "base_url": "https://open.bigmodel.cn/api/paas/v4/",
        "api_key": os.getenv("ZAI_API_KEY", ""),
        "model": "glm-4-flash",
        "extra_headers": {},
    },
    {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": os.getenv("OPENROUTER_API_KEY", ""),
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "extra_headers": {
            "HTTP-Referer": "https://github.com/sameconomia-prog/oia-ee",
            "X-Title": "OIA-EE Radar",
        },
    },
    {
        "name": "Cerebras",
        "base_url": "https://api.cerebras.ai/v1",
        "api_key": os.getenv("CEREBRAS_API_KEY", ""),
        "model": "llama-3.3-70b",
        "extra_headers": {},
    },
    {
        "name": "Cohere",
        "base_url": "https://api.cohere.ai/compatibility/v1",
        "api_key": os.getenv("COHERE_API_KEY", ""),
        "model": "command-r",
        "extra_headers": {},
    },
    {
        "name": "Mistral",
        "base_url": "https://api.mistral.ai/v1",
        "api_key": os.getenv("MISTRAL_API_KEY", ""),
        "model": "mistral-small-latest",
        "extra_headers": {},
    },
]


def active_providers() -> list[dict]:
    return [p for p in PROVIDERS if p["api_key"]]
