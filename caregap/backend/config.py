from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenEMR
    openemr_base_url: str = "https://openemr:443/apis/default/api"
    openemr_fhir_url: str = "https://openemr:443/apis/default/fhir"
    openemr_client_id: str = ""
    openemr_client_secret: str = ""

    # MySQL
    mysql_host: str = "mysql"
    mysql_port: int = 3306
    mysql_user: str = "openemr"
    mysql_password: str = "openemr"
    mysql_database: str = "openemr"

    # Anthropic
    anthropic_api_key: str = ""

    # Braintrust Observability
    braintrust_api_key: str = ""
    braintrust_project: str = "CareGap"

    # Blue Button
    bluebutton_client_id: str = ""
    bluebutton_client_secret: str = ""
    bluebutton_base_url: str = "https://sandbox.bluebutton.cms.gov/v2/fhir"
    bluebutton_auth_url: str = "https://sandbox.bluebutton.cms.gov/v2/o/authorize"
    bluebutton_token_url: str = "https://sandbox.bluebutton.cms.gov/v2/o/token"

    # App
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def database_url(self) -> str:
        return (
            f"mysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
        )

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
