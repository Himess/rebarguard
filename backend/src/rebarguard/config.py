from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---- LLM runtime selection ----
    # "direct": direct API (paid per token) — default during research.
    # "cli":    subprocess bridge to `hermes` CLI (subscription-backed).
    # "sdk":    import Python SDK from hermes_agent package (if available).
    hermes_runtime: Literal["direct", "cli", "sdk"] = Field(
        default="cli", alias="HERMES_RUNTIME"
    )
    hermes_cli_via_wsl: bool = Field(default=True, alias="HERMES_CLI_VIA_WSL")
    hermes_wsl_distro: str = Field(default="Ubuntu-22.04", alias="HERMES_WSL_DISTRO")
    # Kimi K2.6 vision turnaround on Nous Portal (subscription tier) measured at
    # ~230-400 s for a real construction-site photo with the inspection prompt.
    # 480 s gives the Kimi roundtrip a safe ceiling without leaving the user
    # hanging forever — combined with the streaming /quick wrapper's 8 s
    # whitespace heartbeat, the proxy stays alive for the whole window.
    hermes_cli_timeout_s: int = Field(default=480, alias="HERMES_CLI_TIMEOUT_S")
    hermes_cli_max_turns: int = Field(default=3, alias="HERMES_CLI_MAX_TURNS")

    # ---- Nous Portal (used in `direct` mode) ----
    nous_portal_api_key: str = Field(default="", alias="NOUS_PORTAL_API_KEY")
    nous_portal_base_url: str = Field(
        default="https://api.portal.nousresearch.com/v1", alias="NOUS_PORTAL_BASE_URL"
    )
    hermes_agentic_model: str = Field(
        default="moonshotai/kimi-k2.6", alias="HERMES_AGENTIC_MODEL"
    )
    hermes_reasoning_model: str = Field(default="Hermes-4-70B", alias="HERMES_REASONING_MODEL")

    # ---- Moonshot (direct vision + video) ----
    # Vision falls back to Hermes CLI by default ($0). Video is Moonshot direct
    # only — Hermes CLI's --image flag is single-image; the Nous Portal proxy
    # doesn't relay video. So MOONSHOT_API_KEY is required for /api/video/*
    # endpoints, optional for /api/quick.
    moonshot_api_key: str = Field(default="", alias="MOONSHOT_API_KEY")
    moonshot_base_url: str = Field(
        default="https://api.moonshot.ai/v1", alias="MOONSHOT_BASE_URL"
    )
    kimi_vision_model: str = Field(default="kimi-k2.6", alias="KIMI_VISION_MODEL")
    kimi_video_model: str = Field(default="kimi-k2.6", alias="KIMI_VIDEO_MODEL")
    vision_backend: Literal["nous_portal", "moonshot", "hermes_cli"] = Field(
        default="nous_portal", alias="VISION_BACKEND"
    )

    # ---- Supabase (Day 11+) ----
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_db_url: str = Field(default="", alias="SUPABASE_DB_URL")

    # ---- External APIs ----
    afad_api_base: str = Field(default="https://tdth.afad.gov.tr", alias="AFAD_API_BASE")

    # ---- App ----
    app_env: str = Field(default="development", alias="APP_ENV")
    app_port: int = Field(default=8000, alias="APP_PORT")
    app_cors_origins: str = Field(default="http://localhost:3000", alias="APP_CORS_ORIGINS")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.app_cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
