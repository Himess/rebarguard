from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    nous_portal_api_key: str = Field(default="", alias="NOUS_PORTAL_API_KEY")
    nous_portal_base_url: str = Field(
        default="https://api.portal.nousresearch.com/v1", alias="NOUS_PORTAL_BASE_URL"
    )
    hermes_model: str = Field(default="Hermes-4-70B", alias="HERMES_MODEL")

    moonshot_api_key: str = Field(default="", alias="MOONSHOT_API_KEY")
    moonshot_base_url: str = Field(default="https://api.moonshot.ai/v1", alias="MOONSHOT_BASE_URL")
    kimi_vision_model: str = Field(default="kimi-k2.5", alias="KIMI_VISION_MODEL")

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_db_url: str = Field(default="", alias="SUPABASE_DB_URL")

    afad_api_base: str = Field(default="https://tdth.afad.gov.tr", alias="AFAD_API_BASE")

    app_env: str = Field(default="development", alias="APP_ENV")
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_cors_origins: str = Field(default="http://localhost:3000", alias="APP_CORS_ORIGINS")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.app_cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
