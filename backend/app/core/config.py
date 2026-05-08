from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    secret_key: str
    anthropic_api_key: str = ""
    algorithm: str = "HS256"

    # Email (optional — set email_enabled=true and configure SMTP to send real emails)
    email_enabled: bool = False
    email_host: str = "localhost"
    email_port: int = 25
    email_user: str = ""
    email_password: str = ""
    email_from: str = "noreply@tprmhub.local"

    # Frontend base URL (used in email links)
    frontend_url: str = "http://localhost:3000"

    # Security Intelligence
    nvd_api_key: str = ""
    hibp_api_key: str = ""


settings = Settings()
