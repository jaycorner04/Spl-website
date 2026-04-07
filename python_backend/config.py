from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "server-data"
MEDIA_DIR = ROOT_DIR / "server-media"
MIGRATIONS_DIR = ROOT_DIR / "database" / "migrations"
FRONTEND_DIST_DIR = ROOT_DIR / "spl-frontend" / "dist"
ENV_FILE = ROOT_DIR / ".env"


def _load_env_file(env_path: Path, *, override: bool = False) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()

        if not key or (not override and key in os.environ):
            continue

        value = value.strip().strip("'").strip('"')
        os.environ[key] = value

def _load_environment() -> None:
    node_env = str(os.getenv("NODE_ENV", "development")).strip().lower() or "development"
    base_files = [ROOT_DIR / ".env", ROOT_DIR / ".env.local"]
    env_specific_files = [
        ROOT_DIR / f".env.{node_env}",
        ROOT_DIR / f".env.{node_env}.local",
    ]

    for env_path in base_files:
        _load_env_file(env_path)

    for env_path in env_specific_files:
        _load_env_file(env_path, override=True)


_load_environment()


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default

    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []

    return [item.strip() for item in str(value).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "4000"))
    node_env: str = os.getenv("NODE_ENV", "development").strip().lower()
    db_server: str = os.getenv("DB_SERVER", os.getenv("DB_HOST", "localhost"))
    db_port: int = int(os.getenv("DB_PORT", "1433"))
    db_name: str = os.getenv("DB_NAME", "SPLSqlServer")
    db_bootstrap_database: str = os.getenv("DB_BOOTSTRAP_DATABASE", "master")
    db_user: str = os.getenv("DB_USER", "")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_encrypt: bool = _parse_bool(os.getenv("DB_ENCRYPT"), False)
    db_trust_server_certificate: bool = _parse_bool(
        os.getenv("DB_TRUST_SERVER_CERTIFICATE"),
        True,
    )
    cors_allowed_origins: list[str] = None  # type: ignore[assignment]
    api_version: str = "1.12.0-py"
    max_upload_size: int = 5 * 1024 * 1024
    max_body_size: int = 10 * 1024 * 1024
    rate_limit_enabled: bool = _parse_bool(
        os.getenv("RATE_LIMIT_ENABLED"),
        os.getenv("NODE_ENV", "development").strip().lower() == "production",
    )
    auth_secret: str = os.getenv("SPL_AUTH_SECRET", "") or os.getenv("DB_PASSWORD", "") or "spl-local-dev-secret-change-me"

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "cors_allowed_origins",
            _parse_csv(os.getenv("CORS_ALLOWED_ORIGINS")),
        )


settings = Settings()
