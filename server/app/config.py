from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "dev_secret_change_me"
    database_url: str = "sqlite:///./task_manager.db"
    access_token_expire_minutes: int = 10080
    frontend_origin: str = "http://localhost:5173"
    ollama_api_url: str = "https://ollama.com/api/generate"
    ollama_model: str = "gemma4:31b-cloud"

    class Config:
        env_file = ".env"


settings = Settings()
