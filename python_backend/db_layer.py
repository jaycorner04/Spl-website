from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Callable

from .config import DATA_DIR, MIGRATIONS_DIR, settings


RESOURCE_CONFIG: dict[str, dict[str, Any]] = {
    "teams": {
        "file_name": "teams.json",
        "table_name": "teams",
        "search_fields": [
            "team_name",
            "city",
            "owner",
            "coach",
            "vice_coach",
            "venue",
            "status",
        ],
        "filters": {
            "franchiseId": lambda rows, value: [
                row for row in rows if str(row.get("franchise_id", "")) == str(value)
            ],
        },
        "fields": {
            "team_name": {"type": "string", "required": True},
            "city": {"type": "string"},
            "owner": {"type": "string"},
            "coach": {"type": "string"},
            "vice_coach": {"type": "string"},
            "primary_color": {"type": "string"},
            "logo": {"type": "string"},
            "venue": {"type": "string"},
            "franchise_id": {"type": "number"},
            "status": {"type": "string"},
            "budget_left": {"type": "number"},
        },
        "on_create": lambda record: record.update(
            {
                "status": record.get("status") or "Active",
                "budget_left": 0 if record.get("budget_left") is None else record.get("budget_left"),
            }
        ),
    },
    "players": {
        "file_name": "players.json",
        "table_name": "players",
        "search_fields": [
            "full_name",
            "team_name",
            "role",
            "squad_role",
            "batting_style",
            "bowling_style",
            "email",
            "mobile",
            "status",
        ],
        "filters": {
            "teamId": lambda rows, value: [
                row for row in rows if str(row.get("team_id", "")) == str(value)
            ],
            "status": lambda rows, value: [
                row
                for row in rows
                if str(row.get("status", "")).lower() == str(value).lower()
            ],
            "role": lambda rows, value: [
                row for row in rows if str(row.get("role", "")).lower() == str(value).lower()
            ],
            "squadRole": lambda rows, value: [
                row
                for row in rows
                if str(row.get("squad_role", "")).lower() == str(value).lower()
            ],
        },
        "fields": {
            "full_name": {"type": "string", "required": True},
            "role": {"type": "string"},
            "squad_role": {"type": "string", "allowed_values": ["Playing XI", "Reserve"]},
            "team_id": {"type": "number"},
            "team_name": {"type": "string"},
            "batting_style": {"type": "string"},
            "bowling_style": {"type": "string"},
            "photo": {"type": "string"},
            "created_at": {"type": "string"},
            "date_of_birth": {"type": "string"},
            "mobile": {"type": "string"},
            "email": {"type": "string"},
            "status": {"type": "string"},
            "salary": {"type": "number"},
        },
        "on_create": lambda record: record.update(
            {
                "created_at": record.get("created_at") or utc_now_iso(),
                "status": record.get("status") or "Active",
                "squad_role": record.get("squad_role") or "Reserve",
                "salary": 0 if record.get("salary") is None else record.get("salary"),
            }
        ),
    },
    "performances": {
        "file_name": "performances.json",
        "table_name": "performances",
        "search_fields": ["player_name", "team_name", "best_bowling", "updated_at"],
        "filters": {
            "playerId": lambda rows, value: [
                row for row in rows if str(row.get("player_id", "")) == str(value)
            ],
            "teamId": lambda rows, value: [
                row for row in rows if str(row.get("team_id", "")) == str(value)
            ],
        },
        "fields": {
            "player_id": {"type": "number", "required": True},
            "player_name": {"type": "string"},
            "team_id": {"type": "number"},
            "team_name": {"type": "string"},
            "matches": {"type": "number"},
            "runs": {"type": "number"},
            "wickets": {"type": "number"},
            "batting_average": {"type": "float"},
            "strike_rate": {"type": "float"},
            "economy": {"type": "float"},
            "fours": {"type": "number"},
            "sixes": {"type": "number"},
            "best_bowling": {"type": "string"},
            "dot_ball_percentage": {"type": "float"},
            "catches": {"type": "number"},
            "stumpings": {"type": "number"},
            "updated_at": {"type": "string"},
        },
        "on_create": lambda record: record.update(
            {
                "matches": 0 if record.get("matches") is None else record.get("matches"),
                "runs": 0 if record.get("runs") is None else record.get("runs"),
                "wickets": 0 if record.get("wickets") is None else record.get("wickets"),
                "batting_average": 0 if record.get("batting_average") is None else record.get("batting_average"),
                "strike_rate": 0 if record.get("strike_rate") is None else record.get("strike_rate"),
                "economy": 0 if record.get("economy") is None else record.get("economy"),
                "fours": 0 if record.get("fours") is None else record.get("fours"),
                "sixes": 0 if record.get("sixes") is None else record.get("sixes"),
                "dot_ball_percentage": 0 if record.get("dot_ball_percentage") is None else record.get("dot_ball_percentage"),
                "catches": 0 if record.get("catches") is None else record.get("catches"),
                "stumpings": 0 if record.get("stumpings") is None else record.get("stumpings"),
                "updated_at": record.get("updated_at") or utc_now_iso(),
            }
        ),
    },
    "matches": {
        "file_name": "matches.json",
        "table_name": "matches",
        "search_fields": ["teamA", "teamB", "venue", "result", "umpire", "status"],
        "filters": {
            "status": lambda rows, value: [
                row for row in rows if str(row.get("status", "")).lower() == str(value).lower()
            ],
            "team": lambda rows, value: [
                row
                for row in rows
                if str(value).lower() in str(row.get("teamA", "")).lower()
                or str(value).lower() in str(row.get("teamB", "")).lower()
            ],
        },
        "fields": {
            "team_a_id": {"type": "number"},
            "team_b_id": {"type": "number"},
            "teamA": {"type": "string", "required": True},
            "teamB": {"type": "string", "required": True},
            "date": {"type": "string", "required": True},
            "time": {"type": "string", "required": True},
            "venue": {"type": "string", "required": True},
            "status": {
                "type": "string",
                "required": True,
                "allowed_values": ["Upcoming", "Live", "Completed", "Draft"],
            },
            "teamAScore": {"type": "string"},
            "teamBScore": {"type": "string"},
            "result": {"type": "string"},
            "umpire": {"type": "string"},
        },
    },
    "venues": {
        "file_name": "venues.json",
        "table_name": "venues",
        "search_fields": ["ground_name", "location", "city", "contact_person"],
        "filters": {
            "city": lambda rows, value: [
                row for row in rows if str(value).lower() in str(row.get("city", "")).lower()
            ],
        },
        "fields": {
            "ground_name": {"type": "string", "required": True},
            "location": {"type": "string", "required": True},
            "city": {"type": "string", "required": True},
            "capacity": {"type": "number"},
            "contact_person": {"type": "string"},
            "contact_phone": {"type": "string"},
        },
    },
    "franchises": {
        "file_name": "franchises.json",
        "table_name": "franchises",
        "search_fields": ["company_name", "owner_name", "address", "website", "status"],
        "filters": {
            "status": lambda rows, value: [
                row for row in rows if str(row.get("status", "")).lower() == str(value).lower()
            ],
        },
        "fields": {
            "company_name": {"type": "string", "required": True},
            "owner_name": {"type": "string"},
            "address": {"type": "string"},
            "website": {"type": "string"},
            "logo": {"type": "string"},
            "status": {"type": "string", "allowed_values": ["Approved", "Pending", "Rejected"]},
        },
        "on_create": lambda record: record.update({"status": record.get("status") or "Approved"}),
    },
    "approvals": {
        "file_name": "approvals.json",
        "table_name": "approvals",
        "search_fields": ["request_type", "requested_by", "subject", "priority", "status", "notes"],
        "filters": {
            "status": lambda rows, value: [
                row for row in rows if str(row.get("status", "")).lower() == str(value).lower()
            ],
            "priority": lambda rows, value: [
                row for row in rows if str(row.get("priority", "")).lower() == str(value).lower()
            ],
        },
        "fields": {
            "request_type": {"type": "string", "required": True},
            "requested_by": {"type": "string", "required": True},
            "subject": {"type": "string", "required": True},
            "date": {"type": "string", "required": True},
            "priority": {"type": "string", "required": True, "allowed_values": ["High", "Medium", "Low"]},
            "status": {"type": "string", "required": True, "allowed_values": ["Pending", "Approved", "Rejected", "Escalated"]},
            "notes": {"type": "string"},
        },
        "on_create": lambda record: record.update({"status": record.get("status") or "Pending", "priority": record.get("priority") or "Medium"}),
    },
    "invoices": {
        "file_name": "invoices.json",
        "table_name": "invoices",
        "search_fields": ["invoice_code", "party", "category", "status", "flow", "notes"],
        "filters": {
            "status": lambda rows, value: [
                row for row in rows if str(row.get("status", "")).lower() == str(value).lower()
            ],
            "category": lambda rows, value: [
                row for row in rows if str(row.get("category", "")).lower() == str(value).lower()
            ],
            "flow": lambda rows, value: [
                row for row in rows if str(row.get("flow", "")).lower() == str(value).lower()
            ],
        },
        "fields": {
            "invoice_code": {"type": "string", "required": True},
            "party": {"type": "string", "required": True},
            "category": {"type": "string", "required": True},
            "amount": {"type": "number", "required": True},
            "due_date": {"type": "string", "required": True},
            "status": {"type": "string", "required": True, "allowed_values": ["Paid", "Pending", "Overdue"]},
            "flow": {"type": "string", "required": True, "allowed_values": ["Income", "Expense"]},
            "issued_date": {"type": "string"},
            "notes": {"type": "string"},
        },
        "on_create": lambda record: record.update(
            {
                "status": record.get("status") or "Pending",
                "flow": record.get("flow") or "Income",
                "issued_date": record.get("issued_date") or utc_now_iso(),
            }
        ),
    },
    "auctions": {
        "file_name": "auctions.json",
        "table_name": "auctions",
        "search_fields": ["player_name", "player_role", "team_name", "status", "paddle_number", "notes"],
        "filters": {
            "status": lambda rows, value: [
                row for row in rows if str(row.get("status", "")).lower() == str(value).lower()
            ],
            "teamId": lambda rows, value: [
                row for row in rows if str(row.get("team_id", "")) == str(value)
            ],
            "team": lambda rows, value: [
                row for row in rows if str(value).lower() in str(row.get("team_name", "")).lower()
            ],
        },
        "fields": {
            "player_name": {"type": "string", "required": True},
            "player_role": {"type": "string"},
            "team_id": {"type": "number"},
            "team_name": {"type": "string"},
            "base_price": {"type": "number", "required": True},
            "sold_price": {"type": "number"},
            "status": {"type": "string", "required": True, "allowed_values": ["Sold", "Unsold", "Pending"]},
            "bid_round": {"type": "number"},
            "paddle_number": {"type": "string"},
            "notes": {"type": "string"},
        },
        "on_create": lambda record: record.update(
            {
                "status": record.get("status") or "Pending",
                "base_price": 0 if record.get("base_price") is None else record.get("base_price"),
                "sold_price": 0 if record.get("sold_price") is None else record.get("sold_price"),
                "bid_round": 1 if record.get("bid_round") is None else record.get("bid_round"),
            }
        ),
    },
}

PROJECT_DATA_CONFIG = {
    "home": {
        "file_name": "home-content.json",
        "sections": {
            "announcements": "announcements",
            "standings": "standings",
            "top-performers": "topPerformers",
            "latest-news": "latestNews",
            "sponsors": "sponsors",
        },
    },
    "live-match": {
        "file_name": "live-match.json",
        "sections": {},
    },
    "franchise-dashboard": {
        "file_name": "franchise-dashboard.json",
        "sections": {},
    },
}

AUTH_SEED_FILES = {
    "auth_users": "auth-users.json",
    "password_reset_tokens": "password-reset-tokens.json",
}

NON_NEGATIVE_NUMBER_FIELDS = {
    "budget_left",
    "salary",
    "matches",
    "runs",
    "wickets",
    "batting_average",
    "strike_rate",
    "economy",
    "fours",
    "sixes",
    "dot_ball_percentage",
    "catches",
    "stumpings",
    "capacity",
    "amount",
    "base_price",
    "sold_price",
    "bid_round",
}

EMAIL_FIELDS = {"email"}
PHONE_FIELDS = {"mobile", "contact_phone"}
URL_FIELDS = {"website"}
DEMO_AUTH_PASSWORDS = {
    "admin@spl.local": "Spl@12345",
    "ops@spl.local": "Spl@12345",
    "franchise@spl.local": "Spl@12345",
    "scorer@spl.local": "Spl@12345",
    "finance@spl.local": "Spl@12345",
    "fan@spl.local": "Spl@12345",
    "fans@spl.com": "Spl@12345",
}
BOOTSTRAP_LOGIC_VERSION = "2026-04-06"
BOOTSTRAP_MIGRATIONS_TABLE = "bootstrap_migrations"
BOOTSTRAP_STATE_TABLE = "bootstrap_state"
SEED_FINGERPRINT_STATE_KEY = "seed_fingerprint"
DEMO_AUTH_SYNC_STATE_KEY = "demo_auth_sync_fingerprint"

_init_lock = threading.Lock()
_initialized = False
SQLCLIENT_RUNNER = Path(__file__).with_name("sqlclient_runner.ps1")
READ_CACHE_TTL_SECONDS = 20.0
READ_CACHE_WAIT_SECONDS = 30.0
_read_cache_lock = threading.Lock()
_read_cache: dict[str, dict[str, Any]] = {}
_read_cache_inflight: dict[str, threading.Event] = {}
_read_cache_version = 0


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_cached_read_value(cache_key: str) -> Any | None:
    now = time.monotonic()
    with _read_cache_lock:
        cached = _read_cache.get(cache_key)
        if not cached:
            return None
        if float(cached.get("expires_at") or 0) <= now:
            _read_cache.pop(cache_key, None)
            return None
        return copy.deepcopy(cached.get("value"))


def _store_cached_read_value(cache_key: str, value: Any) -> None:
    with _read_cache_lock:
        _read_cache[cache_key] = {
            "value": copy.deepcopy(value),
            "expires_at": time.monotonic() + READ_CACHE_TTL_SECONDS,
        }


def _finish_cached_read(cache_key: str) -> None:
    with _read_cache_lock:
        event = _read_cache_inflight.pop(cache_key, None)
        if event:
            event.set()


def _read_through_cache(cache_key: str, loader: Callable[[], Any]) -> Any:
    cached = _get_cached_read_value(cache_key)
    if cached is not None:
        return cached

    while True:
        with _read_cache_lock:
            cached = _read_cache.get(cache_key)
            if cached and float(cached.get("expires_at") or 0) > time.monotonic():
                return copy.deepcopy(cached.get("value"))

            inflight_event = _read_cache_inflight.get(cache_key)
            if inflight_event is None:
                inflight_event = threading.Event()
                _read_cache_inflight[cache_key] = inflight_event
                is_loader = True
            else:
                is_loader = False

        if is_loader:
            try:
                value = loader()
                _store_cached_read_value(cache_key, value)
                return copy.deepcopy(value)
            finally:
                _finish_cached_read(cache_key)

        inflight_event.wait(timeout=READ_CACHE_WAIT_SECONDS)
        cached = _get_cached_read_value(cache_key)
        if cached is not None:
            return cached


def clear_read_cache() -> None:
    global _read_cache_version

    with _read_cache_lock:
        _read_cache.clear()
        _read_cache_version += 1


def get_cache_version() -> int:
    with _read_cache_lock:
        return _read_cache_version


def _connection_string(database: str | None = None) -> str:
    database_name = database or settings.db_name
    server_value = settings.db_server

    if "\\" not in server_value and settings.db_port:
        server_value = f"{server_value},{settings.db_port}"

    return (
        f"Server={server_value};"
        f"Database={database_name};"
        f"User ID={settings.db_user};"
        f"Password={settings.db_password};"
        f"Encrypt={'True' if settings.db_encrypt else 'False'};"
        f"TrustServerCertificate={'True' if settings.db_trust_server_certificate else 'False'};"
        "Application Name=SPLPythonBackend;"
    )


def _prepare_query(query: str, params: tuple[Any, ...] = ()) -> tuple[str, list[dict[str, Any]]]:
    pieces: list[str] = []
    parameters: list[dict[str, Any]] = []
    index = 0

    for character in str(query):
        if character == "?":
            name = f"@p{index}"
            pieces.append(name)
            parameters.append({"name": name, "value": params[index] if index < len(params) else None})
            index += 1
        else:
            pieces.append(character)

    if index != len(params):
        raise ValueError("SQL parameter count does not match placeholder count.")

    return "".join(pieces), parameters


def _query_returns_rows(query: str) -> bool:
    normalized = str(query or "").lstrip().upper()
    return normalized.startswith("SELECT") or normalized.startswith("WITH")


def _resolve_powershell_command() -> list[str]:
    configured = str(os.environ.get("POWERSHELL_EXECUTABLE") or "").strip()
    if configured:
        return [configured]

    if os.name == "nt":
        return ["powershell"]

    return ["pwsh"]


def _run_sql(query: str, params: tuple[Any, ...] = (), database: str | None = None, expect_rows: bool | None = None) -> dict[str, Any]:
    prepared_query, parameters = _prepare_query(query, params)
    payload = {
        "connectionString": _connection_string(database),
        "query": prepared_query,
        "parameters": parameters,
        "expectRows": _query_returns_rows(prepared_query) if expect_rows is None else bool(expect_rows),
        "commandTimeoutSeconds": 120,
    }

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False)
        temp_path = handle.name

    try:
        completed = subprocess.run(
            [
                *_resolve_powershell_command(),
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(SQLCLIENT_RUNNER),
                "-PayloadPath",
                temp_path,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=str(Path(__file__).resolve().parents[1]),
            check=False,
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)

    if completed.returncode != 0:
        error_text = (completed.stderr or completed.stdout or "").strip()
        raise RuntimeError(f"SQL execution failed: {error_text}")

    output = (completed.stdout or "").strip()
    if not output:
        return {"columns": [], "rows": [], "rowcount": 0}
    return json.loads(output)


class PowerShellCursor:
    def __init__(self, database: str | None = None):
        self.database = database
        self.description: list[tuple[Any, ...]] | None = None
        self.rowcount = -1
        self._rows: list[tuple[Any, ...]] = []

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> "PowerShellCursor":
        result = _run_sql(query, params, database=self.database)
        columns = result.get("columns") or []
        self.description = [(column, None, None, None, None, None, None) for column in columns] if columns else None
        self._rows = [tuple(row) for row in (result.get("rows") or [])]
        self.rowcount = int(result.get("rowcount") or len(self._rows))
        return self

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._rows)

    def fetchone(self) -> tuple[Any, ...] | None:
        return self._rows[0] if self._rows else None


class PowerShellConnection:
    def __init__(self, database: str | None = None, autocommit: bool = False):
        self.database = database
        self.autocommit = autocommit

    def cursor(self) -> PowerShellCursor:
        return PowerShellCursor(self.database)

    def commit(self) -> None:
        return None

    def close(self) -> None:
        return None

    def __enter__(self) -> "PowerShellConnection":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()


def get_connection(database: str | None = None, autocommit: bool = False) -> PowerShellConnection:
    return PowerShellConnection(database, autocommit=autocommit)


def row_to_dict(cursor: Any, row: Any) -> dict[str, Any]:
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def fetch_all(query: str, params: tuple[Any, ...] = (), database: str | None = None) -> list[dict[str, Any]]:
    result = _run_sql(query, params, database=database, expect_rows=True)
    columns = result.get("columns") or []
    rows = result.get("rows") or []
    return [dict(zip(columns, row)) for row in rows]


def fetch_one(query: str, params: tuple[Any, ...] = (), database: str | None = None) -> dict[str, Any] | None:
    rows = fetch_all(query, params, database=database)
    return rows[0] if rows else None


def execute(query: str, params: tuple[Any, ...] = (), database: str | None = None) -> None:
    _run_sql(query, params, database=database, expect_rows=False)


def scalar(query: str, params: tuple[Any, ...] = (), database: str | None = None) -> Any:
    row = fetch_one(query, params, database=database)
    if not row:
        return None
    return next(iter(row.values()))


def split_sql_batches(text: str) -> list[str]:
    return [batch.strip() for batch in re.split(r"^\s*GO\s*$", text, flags=re.MULTILINE | re.IGNORECASE) if batch.strip()]


def _quote_identifier(name: str) -> str:
    return "[" + str(name).replace("]", "]]" ) + "]"


def _escape_literal(value: str) -> str:
    return str(value).replace("'", "''")


def _read_seed_file(file_name: str) -> Any:
    return json.loads((DATA_DIR / file_name).read_text(encoding="utf-8"))


def _iter_seed_file_paths() -> list[Path]:
    seen_paths: dict[str, Path] = {}

    for file_name in [
        *(config["file_name"] for config in RESOURCE_CONFIG.values()),
        *(config["file_name"] for config in PROJECT_DATA_CONFIG.values()),
        *AUTH_SEED_FILES.values(),
    ]:
        path = DATA_DIR / file_name
        seen_paths[str(path)] = path

    return [seen_paths[key] for key in sorted(seen_paths)]


def _compute_seed_fingerprint() -> str:
    digest = hashlib.sha256()
    digest.update(f"seed:{BOOTSTRAP_LOGIC_VERSION}".encode("utf-8"))

    for file_path in _iter_seed_file_paths():
        digest.update(b"\0")
        digest.update(file_path.name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_path.read_bytes())

    return digest.hexdigest()


def _compute_demo_auth_sync_fingerprint() -> str:
    digest = hashlib.sha256()
    digest.update(f"demo-auth-sync:{BOOTSTRAP_LOGIC_VERSION}".encode("utf-8"))
    digest.update(
        json.dumps(DEMO_AUTH_PASSWORDS, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    return digest.hexdigest()


def _ensure_bootstrap_tables() -> None:
    execute(
        f"""
IF OBJECT_ID(N'dbo.{BOOTSTRAP_MIGRATIONS_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.{BOOTSTRAP_MIGRATIONS_TABLE} (
    migration_name NVARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.{BOOTSTRAP_STATE_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.{BOOTSTRAP_STATE_TABLE} (
    state_key NVARCHAR(120) NOT NULL PRIMARY KEY,
    state_value NVARCHAR(255) NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
""",
        database=settings.db_name,
    )


def _list_applied_migrations() -> set[str]:
    rows = fetch_all(
        f"SELECT migration_name FROM dbo.{_quote_identifier(BOOTSTRAP_MIGRATIONS_TABLE)};",
        database=settings.db_name,
    )
    return {
        str(row.get("migration_name") or "")
        for row in rows
        if str(row.get("migration_name") or "").strip()
    }


def _mark_migration_applied(migration_name: str) -> None:
    execute(
        f"""
MERGE dbo.{_quote_identifier(BOOTSTRAP_MIGRATIONS_TABLE)} AS target
USING (SELECT ? AS migration_name) AS source
ON target.migration_name = source.migration_name
WHEN NOT MATCHED THEN
  INSERT (migration_name)
  VALUES (source.migration_name);
""",
        (migration_name,),
        database=settings.db_name,
    )


def _mark_migrations_applied(migration_names: list[str]) -> None:
    if not migration_names:
        return

    values_clause = ", ".join("(?)" for _ in migration_names)
    execute(
        f"""
MERGE dbo.{_quote_identifier(BOOTSTRAP_MIGRATIONS_TABLE)} AS target
USING (VALUES {values_clause}) AS source (migration_name)
ON target.migration_name = source.migration_name
WHEN NOT MATCHED THEN
  INSERT (migration_name)
  VALUES (source.migration_name);
""",
        tuple(migration_names),
        database=settings.db_name,
    )


def _list_bootstrap_state() -> dict[str, str]:
    rows = fetch_all(
        f"SELECT state_key, state_value FROM dbo.{_quote_identifier(BOOTSTRAP_STATE_TABLE)};",
        database=settings.db_name,
    )
    return {
        str(row.get("state_key") or ""): str(row.get("state_value") or "")
        for row in rows
        if str(row.get("state_key") or "").strip()
    }


def _set_bootstrap_state(state_key: str, state_value: str) -> None:
    execute(
        f"""
MERGE dbo.{_quote_identifier(BOOTSTRAP_STATE_TABLE)} AS target
USING (SELECT ? AS state_key, ? AS state_value) AS source
ON target.state_key = source.state_key
WHEN MATCHED THEN
  UPDATE SET state_value = source.state_value, updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (state_key, state_value)
  VALUES (source.state_key, source.state_value);
""",
        (state_key, state_value),
        database=settings.db_name,
    )


def _set_bootstrap_state_entries(entries: dict[str, str]) -> None:
    if not entries:
        return

    values_clause = ", ".join("(?, ?)" for _ in entries)
    params = tuple(value for entry in entries.items() for value in entry)
    execute(
        f"""
MERGE dbo.{_quote_identifier(BOOTSTRAP_STATE_TABLE)} AS target
USING (VALUES {values_clause}) AS source (state_key, state_value)
ON target.state_key = source.state_key
WHEN MATCHED THEN
  UPDATE SET state_value = source.state_value, updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (state_key, state_value)
  VALUES (source.state_key, source.state_value);
""",
        params,
        database=settings.db_name,
    )


def _existing_schema_is_current() -> bool:
    required_tables = [
        *(config["table_name"] for config in RESOURCE_CONFIG.values()),
        "project_content",
        "auth_users",
        "password_reset_tokens",
        "audit_logs",
    ]
    table_checks = [
        f"CASE WHEN OBJECT_ID(N'dbo.{table_name}', N'U') IS NULL THEN 0 ELSE 1 END AS has_{table_name}"
        for table_name in required_tables
    ]
    column_checks = [
        "CASE WHEN COL_LENGTH(N'dbo.auth_users', N'franchise_id') IS NULL THEN 0 ELSE 1 END AS has_auth_users_franchise_id",
        "CASE WHEN COL_LENGTH(N'dbo.auth_users', N'avatar') IS NULL THEN 0 ELSE 1 END AS has_auth_users_avatar",
        "CASE WHEN COL_LENGTH(N'dbo.franchises', N'status') IS NULL THEN 0 ELSE 1 END AS has_franchises_status",
        "CASE WHEN COL_LENGTH(N'dbo.players', N'squad_role') IS NULL THEN 0 ELSE 1 END AS has_players_squad_role",
    ]
    row = fetch_one(
        "SELECT\n  " + ",\n  ".join([*table_checks, *column_checks]) + ";",
        database=settings.db_name,
    )

    return bool(row) and all(int(value or 0) == 1 for value in row.values())


def _existing_seed_state_looks_current() -> bool:
    seeded_resources = [
        (resource_name, config["table_name"])
        for resource_name, config in RESOURCE_CONFIG.items()
        if isinstance(_read_seed_file(config["file_name"]), list)
        and len(_read_seed_file(config["file_name"])) > 0
    ]

    if seeded_resources:
        count_query = "\nUNION ALL\n".join(
            f"SELECT N'{resource_name}' AS resource_name, COUNT_BIG(1) AS total FROM dbo.{_quote_identifier(table_name)}"
            for resource_name, table_name in seeded_resources
        )
        resource_counts = {
            str(row.get("resource_name") or ""): int(row.get("total") or 0)
            for row in fetch_all(count_query + ";", database=settings.db_name)
        }

        if any(resource_counts.get(resource_name, 0) < 1 for resource_name, _ in seeded_resources):
            return False

    project_resources = tuple(PROJECT_DATA_CONFIG.keys())
    if project_resources:
        placeholders = ", ".join("?" for _ in project_resources)
        existing_project_rows = fetch_all(
            f"SELECT resource_name FROM dbo.project_content WHERE resource_name IN ({placeholders});",
            project_resources,
            database=settings.db_name,
        )
        if {str(row.get("resource_name") or "") for row in existing_project_rows} != set(project_resources):
            return False

    auth_records = _read_seed_file(AUTH_SEED_FILES["auth_users"])
    auth_emails = tuple(
        str(record.get("email") or "").strip()
        for record in auth_records
        if str(record.get("email") or "").strip()
    )
    if auth_emails:
        auth_placeholders = ", ".join("?" for _ in auth_emails)
        auth_total = scalar(
            f"SELECT COUNT_BIG(1) AS total FROM dbo.auth_users WHERE email IN ({auth_placeholders});",
            auth_emails,
            database=settings.db_name,
        )
        if int(auth_total or 0) < len(auth_emails):
            return False

    password_reset_records = _read_seed_file(AUTH_SEED_FILES["password_reset_tokens"])
    if isinstance(password_reset_records, list) and password_reset_records:
        password_reset_total = scalar(
            "SELECT COUNT_BIG(1) AS total FROM dbo.password_reset_tokens;",
            database=settings.db_name,
        )
        if int(password_reset_total or 0) < len(password_reset_records):
            return False

    return True

def _ensure_database_exists() -> None:
    quoted_name = _quote_identifier(settings.db_name)
    escaped_name = _escape_literal(settings.db_name)

    with get_connection(settings.db_bootstrap_database, autocommit=True) as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
IF DB_ID(N'{escaped_name}') IS NULL
BEGIN
  EXEC(N'CREATE DATABASE {quoted_name}');
END;
"""
        )


def _run_migrations() -> None:
    migration_files = sorted(path for path in MIGRATIONS_DIR.glob("*.sql") if path.is_file())

    if not migration_files:
        return

    _ensure_bootstrap_tables()
    applied_migrations = _list_applied_migrations()

    # Existing developer databases predate migration tracking. If the latest
    # schema shape is already present, mark the historical migrations as applied
    # instead of replaying every batch on each startup.
    if not applied_migrations and _existing_schema_is_current():
        _mark_migrations_applied([file_path.name for file_path in migration_files])
        return

    with get_connection(settings.db_name) as conn:
        cursor = conn.cursor()
        for file_path in migration_files:
            if file_path.name in applied_migrations:
                continue
            for batch in split_sql_batches(file_path.read_text(encoding="utf-8")):
                cursor.execute(batch)
            conn.commit()
            _mark_migration_applied(file_path.name)


def _table_is_empty(table_name: str) -> bool:
    total = scalar(f"SELECT COUNT_BIG(1) AS total FROM dbo.{_quote_identifier(table_name)};")
    return int(total or 0) == 0


def normalize_resource_record(resource_name: str, record: dict[str, Any] | Any) -> dict[str, Any]:
    config = RESOURCE_CONFIG[resource_name]
    source = dict(record or {})
    normalized: dict[str, Any] = {"id": int(source.get("id", 0))}

    for field_name, rule in config["fields"].items():
        value = source.get(field_name)

        if value is None:
            normalized[field_name] = "" if rule["type"] == "string" else None
            continue

        if rule["type"] == "string":
            normalized[field_name] = str(value)
        elif rule["type"] == "float":
            normalized[field_name] = float(value)
        else:
            normalized[field_name] = int(float(value))

    return normalized


def _seed_resource_table(resource_name: str) -> None:
    config = RESOURCE_CONFIG[resource_name]
    table_name = config["table_name"]

    if not _table_is_empty(table_name):
        return

    records = _read_seed_file(config["file_name"])
    if not isinstance(records, list):
        return

    with get_connection() as conn:
        cursor = conn.cursor()
        for record in records:
            normalized = normalize_resource_record(resource_name, record)
            field_names = ["id", *config["fields"].keys()]
            values = [normalized.get(field_name) for field_name in field_names]
            placeholders = ", ".join("?" for _ in field_names)
            columns = ", ".join(_quote_identifier(field_name) for field_name in field_names)
            cursor.execute(
                f"INSERT INTO dbo.{_quote_identifier(table_name)} ({columns}) VALUES ({placeholders});",
                tuple(values),
            )
        conn.commit()


def _seed_project_content(resource_name: str) -> None:
    existing = fetch_one(
        "SELECT resource_name FROM dbo.project_content WHERE resource_name = ?;",
        (resource_name,),
    )
    if existing:
        return

    payload = _read_seed_file(PROJECT_DATA_CONFIG[resource_name]["file_name"])
    execute(
        "INSERT INTO dbo.project_content (resource_name, content_json) VALUES (?, ?);",
        (resource_name, json.dumps(payload)),
    )


def _seed_auth_users() -> None:
    records = _read_seed_file(AUTH_SEED_FILES["auth_users"])
    if not isinstance(records, list):
        return

    with get_connection() as conn:
        cursor = conn.cursor()
        for record in records:
            _upsert_auth_seed_record(cursor, record)
        conn.commit()


def _upsert_auth_seed_record(cursor: Any, record: dict[str, Any]) -> None:
    existing = cursor.execute(
        "SELECT TOP 1 id FROM dbo.auth_users WHERE email = ?;",
        (record["email"],),
    ).fetchone()
    target_id = int(existing[0]) if existing else int(record["id"])
    cursor.execute(
        """
IF EXISTS (SELECT 1 FROM dbo.auth_users WHERE email = ?)
BEGIN
  UPDATE dbo.auth_users
  SET
    full_name = ?,
    employee_id = ?,
    franchise_id = ?,
    role = ?,
    status = ?,
    salt = ?,
    iterations = ?,
    key_length = ?,
    digest = ?,
    password_hash = ?,
    avatar = COALESCE(?, avatar),
    created_at = ?,
    updated_at = ?
  WHERE email = ?;
END
ELSE
BEGIN
  INSERT INTO dbo.auth_users (
    id, full_name, email, employee_id, franchise_id, role, status, salt, iterations,
    key_length, digest, password_hash, avatar, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
END;
""",
        (
            record["email"],
            record["fullName"],
            record["employeeId"],
            record.get("franchiseId"),
            record["role"],
            record["status"],
            record["salt"],
            int(record["iterations"]),
            int(record["keyLength"]),
            record["digest"],
            record["passwordHash"],
            record.get("avatar"),
            record["createdAt"],
            record.get("updatedAt"),
            record["email"],
            target_id,
            record["fullName"],
            record["email"],
            record["employeeId"],
            record.get("franchiseId"),
            record["role"],
            record["status"],
            record["salt"],
            int(record["iterations"]),
            int(record["keyLength"]),
            record["digest"],
            record["passwordHash"],
            record.get("avatar"),
            record["createdAt"],
            record.get("updatedAt"),
        ),
    )


def ensure_demo_auth_account(email: str) -> bool:
    normalized_email = str(email or "").strip().lower()
    if normalized_email not in DEMO_AUTH_PASSWORDS:
        return False

    records = _read_seed_file(AUTH_SEED_FILES["auth_users"])
    if not isinstance(records, list):
        return False

    target_record = next(
        (
            record
            for record in records
            if str(record.get("email") or "").strip().lower() == normalized_email
        ),
        None,
    )
    if not target_record:
        return False

    with get_connection() as conn:
        cursor = conn.cursor()
        _upsert_auth_seed_record(cursor, target_record)
        conn.commit()

    _sync_demo_auth_passwords()
    return True


def _seed_password_reset_tokens() -> None:
    if not _table_is_empty("password_reset_tokens"):
        return

    records = _read_seed_file(AUTH_SEED_FILES["password_reset_tokens"])
    if not isinstance(records, list):
        return

    with get_connection() as conn:
        cursor = conn.cursor()
        for record in records:
            cursor.execute(
                """
INSERT INTO dbo.password_reset_tokens (
  id, user_id, token_hash, expires_at, created_at, used_at
)
VALUES (?, ?, ?, ?, ?, ?);
""",
                (
                    int(record["id"]),
                    int(record["userId"]),
                    record["tokenHash"],
                    record["expiresAt"],
                    record["createdAt"],
                    record.get("usedAt"),
                ),
            )
        conn.commit()


def _seed_database() -> None:
    seed_fingerprint = _compute_seed_fingerprint()
    demo_auth_sync_fingerprint = _compute_demo_auth_sync_fingerprint()
    bootstrap_state = _list_bootstrap_state()

    seed_current = bootstrap_state.get(SEED_FINGERPRINT_STATE_KEY) == seed_fingerprint
    demo_auth_sync_current = (
        bootstrap_state.get(DEMO_AUTH_SYNC_STATE_KEY) == demo_auth_sync_fingerprint
    )

    if (
        not seed_current
        and bootstrap_state.get(SEED_FINGERPRINT_STATE_KEY) is None
        and _existing_seed_state_looks_current()
    ):
        _set_bootstrap_state_entries(
            {
                SEED_FINGERPRINT_STATE_KEY: seed_fingerprint,
                DEMO_AUTH_SYNC_STATE_KEY: demo_auth_sync_fingerprint,
            }
        )
        seed_current = True
        demo_auth_sync_current = True

    if not seed_current:
        for resource_name in RESOURCE_CONFIG:
            _seed_resource_table(resource_name)

        for resource_name in PROJECT_DATA_CONFIG:
            _seed_project_content(resource_name)

        _seed_auth_users()
        _seed_password_reset_tokens()
        execute("UPDATE dbo.franchises SET status = N'Approved' WHERE status IS NULL OR LTRIM(RTRIM(status)) = N'';")
        execute("UPDATE dbo.auth_users SET status = N'Active' WHERE role = N'franchise_admin' AND status = N'Pending';")
        _set_bootstrap_state(SEED_FINGERPRINT_STATE_KEY, seed_fingerprint)
        seed_current = True

    if not demo_auth_sync_current:
        _sync_demo_auth_passwords()
        _set_bootstrap_state(DEMO_AUTH_SYNC_STATE_KEY, demo_auth_sync_fingerprint)


def _sync_demo_auth_passwords() -> None:
    rows = fetch_all(
        """
SELECT id, email, salt, iterations, key_length, digest, password_hash
FROM dbo.auth_users
WHERE email IN (?, ?, ?, ?, ?, ?, ?);
""",
        tuple(DEMO_AUTH_PASSWORDS.keys()),
    )

    with get_connection() as conn:
        cursor = conn.cursor()
        for row in rows:
            email = str(row.get("email") or "").lower()
            password = DEMO_AUTH_PASSWORDS.get(email)
            if not password:
                continue
            expected_hash = hashlib.pbkdf2_hmac(
                str(row.get("digest") or "sha512"),
                password.encode("utf-8"),
                bytes.fromhex(str(row.get("salt") or "")),
                int(row.get("iterations") or 120000),
                int(row.get("key_length") or 64),
            ).hex()
            if str(row.get("password_hash") or "") == expected_hash:
                continue
            cursor.execute(
                "UPDATE dbo.auth_users SET password_hash = ?, updated_at = ? WHERE id = ?;",
                (expected_hash, utc_now_iso(), int(row.get("id") or 0)),
            )
        conn.commit()


def initialize_database() -> None:
    global _initialized

    if _initialized:
        return

    with _init_lock:
        if _initialized:
            return
        _ensure_database_exists()
        _run_migrations()
        _seed_database()
        _initialized = True


def get_database_health() -> dict[str, Any]:
    initialize_database()
    return _read_through_cache(
        "health",
        lambda: {
            "storage": "sqlserver",
            "database": settings.db_name,
            "connected": True,
            "teamsTracked": int(scalar("SELECT COUNT_BIG(1) AS total FROM dbo.teams;") or 0),
        },
    )


def list_collection(resource_name: str) -> list[dict[str, Any]]:
    initialize_database()
    def _load_collection() -> list[dict[str, Any]]:
        config = RESOURCE_CONFIG[resource_name]
        field_names = ", ".join(_quote_identifier(name) for name in ["id", *config["fields"].keys()])
        rows = fetch_all(
            f"SELECT {field_names} FROM dbo.{_quote_identifier(config['table_name'])} ORDER BY [id] ASC;"
        )
        return [normalize_resource_record(resource_name, row) for row in rows]

    return _read_through_cache(f"collection:{resource_name}", _load_collection)


def list_collections(resource_names: list[str]) -> dict[str, list[dict[str, Any]]]:
    initialize_database()
    normalized_names = [
        str(resource_name)
        for resource_name in resource_names
        if str(resource_name) in RESOURCE_CONFIG
    ]
    if not normalized_names:
        return {}

    unique_names = list(dict.fromkeys(normalized_names))

    def _load_collections() -> dict[str, list[dict[str, Any]]]:
        select_clauses: list[str] = []

        for resource_name in unique_names:
            config = RESOURCE_CONFIG[resource_name]
            field_names = ", ".join(
                _quote_identifier(name)
                for name in ["id", *config["fields"].keys()]
            )
            select_clauses.append(
                f"""(
SELECT {field_names}
FROM dbo.{_quote_identifier(config['table_name'])}
ORDER BY [id] ASC
FOR JSON PATH, INCLUDE_NULL_VALUES
) AS {_quote_identifier(f'{resource_name}_json')}"""
            )

        row = fetch_one("SELECT\n  " + ",\n  ".join(select_clauses) + ";") or {}
        collections: dict[str, list[dict[str, Any]]] = {}

        for resource_name in unique_names:
            raw_rows = json.loads(row.get(f"{resource_name}_json") or "[]")
            collections[resource_name] = [
                normalize_resource_record(resource_name, record)
                for record in raw_rows
            ]

        return collections

    cached_result = _read_through_cache(
        f"collections:{'|'.join(unique_names)}",
        _load_collections,
    )
    return {
        resource_name: list(cached_result.get(resource_name, []))
        for resource_name in unique_names
    }


def get_item(resource_name: str, record_id: int) -> dict[str, Any] | None:
    initialize_database()
    def _load_item() -> dict[str, Any] | None:
        config = RESOURCE_CONFIG[resource_name]
        field_names = ", ".join(_quote_identifier(name) for name in ["id", *config["fields"].keys()])
        row = fetch_one(
            f"SELECT {field_names} FROM dbo.{_quote_identifier(config['table_name'])} WHERE [id] = ?;",
            (int(record_id),),
        )
        return normalize_resource_record(resource_name, row) if row else None

    return _read_through_cache(f"item:{resource_name}:{int(record_id)}", _load_item)


def get_next_id(table_name: str) -> int:
    initialize_database()
    value = scalar(f"SELECT ISNULL(MAX([id]), 0) + 1 AS next_id FROM dbo.{_quote_identifier(table_name)};")
    return int(value or 1)


def create_item(resource_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    initialize_database()
    config = RESOURCE_CONFIG[resource_name]
    table_name = config["table_name"]
    next_id = get_next_id(table_name)
    record = {"id": next_id, **payload}
    field_names = list(config["fields"].keys())
    values = [record.get(field) for field in field_names]
    placeholders = ", ".join("?" for _ in ["id", *field_names])
    columns = ", ".join(_quote_identifier(name) for name in ["id", *field_names])

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"INSERT INTO dbo.{_quote_identifier(table_name)} ({columns}) VALUES ({placeholders});",
            (next_id, *values),
        )
        conn.commit()

    clear_read_cache()
    return get_item(resource_name, next_id) or normalize_resource_record(resource_name, record)


def replace_item(resource_name: str, record_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    initialize_database()
    config = RESOURCE_CONFIG[resource_name]
    table_name = config["table_name"]
    field_names = list(config["fields"].keys())
    assignments = ", ".join(f"{_quote_identifier(field)} = ?" for field in field_names)
    values = [payload.get(field) for field in field_names]

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE dbo.{_quote_identifier(table_name)} SET {assignments} WHERE [id] = ?;",
            (*values, int(record_id)),
        )
        conn.commit()

    clear_read_cache()
    return get_item(resource_name, record_id)


def delete_item(resource_name: str, record_id: int) -> bool:
    initialize_database()
    config = RESOURCE_CONFIG[resource_name]
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"DELETE FROM dbo.{_quote_identifier(config['table_name'])} WHERE [id] = ?;",
            (int(record_id),),
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        if deleted:
            clear_read_cache()
        return deleted

def get_project_data(resource_name: str) -> dict[str, Any] | list[Any] | None:
    initialize_database()
    def _load_project_data() -> dict[str, Any] | list[Any] | None:
        row = fetch_one(
            "SELECT content_json FROM dbo.project_content WHERE resource_name = ?;",
            (resource_name,),
        )
        return json.loads(row["content_json"]) if row else None

    return _read_through_cache(f"project:{resource_name}", _load_project_data)


def set_project_data(resource_name: str, payload: Any) -> Any:
    initialize_database()
    content_json = json.dumps(payload)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
MERGE dbo.project_content AS target
USING (SELECT ? AS resource_name, ? AS content_json) AS source
ON target.resource_name = source.resource_name
WHEN MATCHED THEN
  UPDATE SET content_json = source.content_json, updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (resource_name, content_json)
  VALUES (source.resource_name, source.content_json);
""",
            (resource_name, content_json),
        )
        conn.commit()

    clear_read_cache()
    return get_project_data(resource_name)


def normalize_audit_log_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(record.get("id") or 0),
        "actorUserId": int(record["actor_user_id"]) if record.get("actor_user_id") is not None else None,
        "actorEmail": str(record.get("actor_email") or ""),
        "actorRole": str(record.get("actor_role") or ""),
        "action": str(record.get("action") or ""),
        "resourceName": str(record.get("resource_name") or ""),
        "resourceId": int(record["resource_id"]) if record.get("resource_id") is not None else None,
        "method": str(record.get("method") or ""),
        "status": str(record.get("status") or ""),
        "detail": str(record.get("detail") or ""),
        "ipAddress": str(record.get("ip_address") or ""),
        "createdAt": str(record.get("created_at") or ""),
    }


def create_audit_log(entry: dict[str, Any]) -> dict[str, Any]:
    initialize_database()
    next_id = get_next_id("audit_logs")
    created_at = entry.get("createdAt") or utc_now_iso()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
INSERT INTO dbo.audit_logs (
  id, actor_user_id, actor_email, actor_role, action, resource_name,
  resource_id, method, status, detail, ip_address, created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
""",
            (
                next_id,
                entry.get("actorUserId"),
                entry.get("actorEmail", ""),
                entry.get("actorRole", ""),
                entry.get("action", ""),
                entry.get("resourceName", ""),
                entry.get("resourceId"),
                entry.get("method", ""),
                entry.get("status", ""),
                entry.get("detail", ""),
                entry.get("ipAddress", ""),
                created_at,
            ),
        )
        conn.commit()

    return normalize_audit_log_record(
        {
            "id": next_id,
            "actor_user_id": entry.get("actorUserId"),
            "actor_email": entry.get("actorEmail", ""),
            "actor_role": entry.get("actorRole", ""),
            "action": entry.get("action", ""),
            "resource_name": entry.get("resourceName", ""),
            "resource_id": entry.get("resourceId"),
            "method": entry.get("method", ""),
            "status": entry.get("status", ""),
            "detail": entry.get("detail", ""),
            "ip_address": entry.get("ipAddress", ""),
            "created_at": created_at,
        }
    )


def list_audit_logs(limit: int = 100) -> list[dict[str, Any]]:
    initialize_database()
    rows = fetch_all(
        """
SELECT TOP (?) id, actor_user_id, actor_email, actor_role, action, resource_name,
resource_id, method, status, detail, ip_address, created_at
FROM dbo.audit_logs
ORDER BY [id] DESC;
""",
        (int(limit),),
    )
    return [normalize_audit_log_record(row) for row in rows]


def is_valid_email_address(value: Any) -> bool:
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", str(value or "")))


def is_valid_phone_number(value: Any) -> bool:
    return bool(re.fullmatch(r"[0-9+\-\s()]{10,18}", str(value or "")))


def is_valid_website_url(value: Any) -> bool:
    return str(value or "").startswith(("http://", "https://"))


def validate_field_semantics(key: str, value: Any, rule: dict[str, Any]) -> str | None:
    if rule["type"] in {"number", "float"}:
        if key in NON_NEGATIVE_NUMBER_FIELDS and float(value) < 0:
            return f'"{key}" cannot be negative.'
        return None

    if not value:
        return None

    if key in EMAIL_FIELDS and not is_valid_email_address(value):
        return f'"{key}" must be a valid email address.'

    if key in PHONE_FIELDS and not is_valid_phone_number(value):
        return f'"{key}" must be a valid phone number.'

    if key in URL_FIELDS and not is_valid_website_url(value):
        return f'"{key}" must be a valid website URL starting with http:// or https://.'

    return None


def sanitize_payload(resource_name: str, payload: Any, partial: bool = False) -> tuple[str | None, dict[str, Any] | None]:
    config = RESOURCE_CONFIG[resource_name]

    if not isinstance(payload, dict):
        return "Request body must be a JSON object.", None

    sanitized: dict[str, Any] = {}
    errors: list[str] = []

    for key, value in payload.items():
        rule = config["fields"].get(key)
        if not rule:
            errors.append(f'Unknown field "{key}".')
            continue

        if value is None or value == "":
            sanitized[key] = "" if rule["type"] == "string" else None
            continue

        try:
            if rule["type"] == "string":
                normalized = str(value).strip()
            elif rule["type"] == "float":
                normalized = float(value)
            else:
                normalized = int(float(value))
        except Exception:
            errors.append(f'"{key}" must be a {"number" if rule["type"] != "string" else "string"} value.')
            continue

        if rule.get("allowed_values") and normalized not in rule["allowed_values"]:
            allowed_values = ", ".join(str(item) for item in rule["allowed_values"])
            errors.append(f'"{key}" must be one of: {allowed_values}.')
            continue

        semantic_error = validate_field_semantics(key, normalized, rule)
        if semantic_error:
            errors.append(semantic_error)
            continue

        sanitized[key] = normalized

    if not partial:
        for field_name, rule in config["fields"].items():
            if rule.get("required") and not str(sanitized.get(field_name, "")).strip():
                errors.append(f'"{field_name}" is required.')

    if errors:
        return " ".join(dict.fromkeys(errors)), None

    return None, sanitized


def apply_list_filters(resource_name: str, records: list[dict[str, Any]], query_params: dict[str, Any]) -> list[dict[str, Any]]:
    config = RESOURCE_CONFIG[resource_name]
    filtered = list(records)

    search = str(query_params.get("search") or query_params.get("q") or "").strip().lower()
    if search:
        filtered = [
            record
            for record in filtered
            if any(search in str(record.get(field_name, "")).lower() for field_name in config["search_fields"])
        ]

    for query_name, filter_fn in config.get("filters", {}).items():
        value = query_params.get(query_name)
        if value not in (None, ""):
            filtered = filter_fn(filtered, value)

    try:
        limit = int(query_params.get("limit") or 0)
    except Exception:
        limit = 0

    if limit > 0:
        filtered = filtered[:limit]

    return filtered
