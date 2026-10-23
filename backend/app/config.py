from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./butir.db"
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_EXPIRE_MINUTES: int = 1440

    # Groq API
    GROQ_API_KEY: str = ""
    GROQ_MODEL_PENYUSUN: str = "openai/gpt-oss-120b"
    GROQ_MODEL_KRITIKUS: str = "qwen/qwen3.8-27b"
    GROQ_MODEL_PENJAWAB_BUTA: str = "openai/gpt-oss-20b"
    GROQ_MODEL_ARBITER: str = "qwen/qwen3.8-27b"

    # SambaNova API
    SAMBANOVA_API_KEY: str = ""
    SAMBANOVA_BASE_URL: str = "https://api.sambanova.ai/v1"
    SAMBANOVA_MODEL_PENYUSUN: str = "Meta-Llama-3.3-70B-Instruct"
    SAMBANOVA_MODEL_ARBITER: str = "DeepSeek-V3.1"

    # OpenAI API (opsional untuk masa mendatang jika ingin diaktifkan kembali)
    OPENAI_API_KEY_1: str = ""
    OPENAI_API_KEY_2: str = ""
    OPENAI_API_KEY_3: str = ""
    OPENAI_API_KEY_4: str = ""
    OPENAI_API_KEY_5: str = ""
    OPENAI_API_KEY_6: str = ""
    OPENAI_MODEL_PENYUSUN: str = "gpt-6-luna"
    OPENAI_MODEL_KRITIKUS: str = "gpt-6-luna"
    OPENAI_MODEL_PENJAWAB_BUTA: str = "gpt-6-luna"
    OPENAI_MODEL_ARBITER: str = "gpt-6-luna"

    DEFAULT_PROVIDER: str = "groq"
    FRONTEND_URL: str = "http://localhost:3000"
    MAX_RONDE_DEBAT: int = 3

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_openai_keys(self) -> list[str]:
        keys = [
            self.OPENAI_API_KEY_1,
            self.OPENAI_API_KEY_2,
            self.OPENAI_API_KEY_3,
            self.OPENAI_API_KEY_4,
            self.OPENAI_API_KEY_5,
            self.OPENAI_API_KEY_6,
        ]
        return [k for k in keys if k]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
