from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./butir.db"
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_EXPIRE_MINUTES: int = 1440
    GROQ_API_KEY: str = ""
    GROQ_MODEL_PENYUSUN: str = "openai/gpt-oss-120b"
    GROQ_MODEL_KRITIKUS: str = "qwen/qwen3.8-27b"
    GROQ_MODEL_PENJAWAB_BUTA: str = "openai/gpt-oss-20b"
    GROQ_MODEL_ARBITER: str = "qwen/qwen3.8-27b"
    DEFAULT_PROVIDER: str = "groq"

    SAMBANOVA_API_KEY: str = ""
    SAMBANOVA_BASE_URL: str = "https://api.sambanova.ai/v1"
    SAMBANOVA_MODEL_PENYUSUN: str = "Meta-Llama-3.3-70B-Instruct"
    SAMBANOVA_MODEL_ARBITER: str = "DeepSeek-V3.1"
    FRONTEND_URL: str = "http://localhost:3000"
    MAX_RONDE_DEBAT: int = 3

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()

