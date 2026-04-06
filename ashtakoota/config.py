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
    uses_legacy_host_format: bool

    @property
    def config_warning(self):
        if self.uses_legacy_host_format:
            return (
                "DB_HOST used a legacy combined value. Prefer separate DB_HOST "
                "and DB_PORT values in .env."
            )
        return None


def load_database_settings():
    load_dotenv()

    raw_host = (os.getenv("DB_HOST") or "localhost").strip()
    host, inferred_port, uses_legacy_host_format = _split_host_and_port(raw_host)
    port = _read_port(default_port=inferred_port)

    return DatabaseSettings(
        raw_host=raw_host,
        host=host or "localhost",
        port=port,
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        uses_legacy_host_format=uses_legacy_host_format,
    )


def _split_host_and_port(raw_host):
    uses_legacy_host_format = "@" in raw_host
    host_value = raw_host.split("@", 1)[-1]
    port = 3306

    if ":" in host_value:
        possible_host, possible_port = host_value.rsplit(":", 1)
        if possible_port.isdigit():
            return possible_host, int(possible_port), uses_legacy_host_format

    return host_value, port, uses_legacy_host_format


def _read_port(default_port):
    raw_port = (os.getenv("DB_PORT") or "").strip()
    if raw_port.isdigit():
        return int(raw_port)
    return default_port
