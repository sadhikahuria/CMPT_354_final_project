import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class DatabaseSettings:
    raw_host: str
    host: str
    port: int
    user: str | None
    password: str | None
    database: str | None

    @property
    def config_warning(self):
        normalized_host = f"{self.host}:{self.port}"
        if self.raw_host not in {self.host, normalized_host}:
            return (
                "DB_HOST was parsed from a combined value. Prefer localhost "
                "or host:port in .env."
            )
        return None


def load_database_settings():
    load_dotenv()

    raw_host = (os.getenv("DB_HOST") or "localhost").strip()
    host, port = _split_host_and_port(raw_host)

    return DatabaseSettings(
        raw_host=raw_host,
        host=host or "localhost",
        port=port,
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
    )


def _split_host_and_port(raw_host):
    host_value = raw_host.split("@", 1)[-1]
    port = 3306

    if ":" in host_value:
        possible_host, possible_port = host_value.rsplit(":", 1)
        if possible_port.isdigit():
            return possible_host, int(possible_port)

    return host_value, port
