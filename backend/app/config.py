from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./ticket_system.db"
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    TELEGRAM_BOT_TOKEN: str = ""
    VK_API_TOKEN: str = ""

    OPENAI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4"

    PRINT_SERVER_URL: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
