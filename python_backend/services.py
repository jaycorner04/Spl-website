from __future__ import annotations

import copy
import threading
import time
from datetime import datetime
from typing import Any

from .db_layer import get_cache_version, get_project_data, list_collection, list_collections


TOP_PERFORMER_ACCENTS = [
    "from-yellow-500/35 via-orange-400/10 to-transparent",
    "from-cyan-500/35 via-sky-400/10 to-transparent",
    "from-emerald-500/35 via-teal-400/10 to-transparent",
    "from-rose-500/35 via-red-400/10 to-transparent",
    "from-violet-500/35 via-fuchsia-400/10 to-transparent",
]
AVATAR_COLORS = ["gold", "blue", "green", "purple", "orange"]
ROLE_LABELS = {
    "super_admin": "Super Admin",
    "ops_manager": "Ops Manager",
    "franchise_admin": "Franchise Admin",
    "scorer": "Scorer",
    "finance_admin": "Finance Admin",
    "fan_user": "Fan User",
}
ROLE_SUMMARIES = {
    "super_admin": "League control and governance",
    "ops_manager": "Match operations and logistics",
    "franchise_admin": "Franchise operations",
    "scorer": "Live scoring control",
    "finance_admin": "Finance and settlements",
    "fan_user": "Fan access",
}
ROLE_ALLOWED_PATHS = {
    "super_admin": [
        "/admin",
        "/admin/analytics",
        "/admin/announcements",
        "/admin/franchises",
        "/admin/matches",
        "/admin/players",
        "/admin/teams",
        "/admin/auction",
        "/admin/live-match",
        "/admin/finance",
        "/admin/approvals",
        "/franchise",
    ],
    "ops_manager": ["/admin/matches", "/admin/live-match"],
    "scorer": ["/admin/live-match"],
    "finance_admin": ["/admin/finance"],
    "franchise_admin": ["/franchise"],
}
HOME_PAYLOAD_CACHE_TTL_SECONDS = 120.0
_home_payload_cache_lock = threading.Lock()
_home_payload_cache: dict[str, Any] = {
    "value": None,
    "version": -1,
    "expires_at": 0.0,
}


def safe_number(value: Any) -> float:
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def normalize_status(value: Any) -> str:
    return str(value or "").strip().lower()


def is_approved_status(value: Any) -> bool:
    normalized = normalize_status(value)
    return normalized in {"", "approved"}


def normalize_maintenance_notice(notice: Any) -> dict[str, Any]:
    source = notice if isinstance(notice, dict) else {}
    return {
        "title": str(source.get("title") or "").strip(),
        "message": str(source.get("message") or "").strip(),
        "status": normalize_status(source.get("status") or "draft") or "draft",
        "updatedAt": str(source.get("updatedAt") or "").strip(),
        "updatedBy": str(source.get("updatedBy") or "").strip(),
        "approvedAt": str(source.get("approvedAt") or "").strip(),
        "approvedBy": str(source.get("approvedBy") or "").strip(),
        "rejectedAt": str(source.get("rejectedAt") or "").strip(),
        "rejectedBy": str(source.get("rejectedBy") or "").strip(),
    }


def format_notice_timestamp(value: Any) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        return ""

    try:
        normalized = raw_value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).strftime("%b %d, %Y · %I:%M %p")
    except Exception:
        return raw_value


def get_public_maintenance_notice(home: dict[str, Any]) -> dict[str, Any] | None:
    notice = normalize_maintenance_notice(home.get("maintenanceNotice"))
    has_visible_copy = bool(notice["message"] or notice["title"])

    if notice["status"] != "approved" or not has_visible_copy:
        return None

    if not notice["title"]:
        notice["title"] = "Website Maintenance"

    return notice


def build_maintenance_announcement_item(notice: dict[str, Any]) -> dict[str, Any]:
    title = notice.get("title") or "Website Maintenance"
    message = str(notice.get("message") or "").strip()
    approved_at = format_notice_timestamp(notice.get("approvedAt"))
    updated_at = format_notice_timestamp(notice.get("updatedAt"))
    approved_by = str(notice.get("approvedBy") or notice.get("updatedBy") or "").strip()
    meta_parts = []

    if approved_at:
        meta_parts.append(f"Approved {approved_at}")
    elif updated_at:
        meta_parts.append(f"Updated {updated_at}")

    if approved_by:
        meta_parts.append(f"By {approved_by}")

    return {
        "label": "Maintenance Notice",
        "accent": "bg-sky-600 text-white",
        "title": title,
        "detail": message if len(message) <= 120 else f"{message[:117].rstrip()}...",
        "meta": " | ".join(meta_parts) or "Website maintenance notice",
        "matchDetails": [
            {"label": "Notice", "value": message or "Maintenance notice is active."},
            {"label": "Status", "value": "Approved"},
            *(
                [{"label": "Approved At", "value": approved_at}]
                if approved_at
                else []
            ),
            *(
                [{"label": "Approved By", "value": approved_by}]
                if approved_by
                else []
            ),
        ],
    }


def format_lakhs(amount: Any, digits: int = 1) -> str:
    lakhs = safe_number(amount) / 100000
    formatted = f"{lakhs:.{digits}f}".rstrip("0").rstrip(".")
    return f"Rs {formatted}L"


def format_decimal(value: Any, digits: int = 1) -> str:
    return f"{safe_number(value):.{digits}f}".rstrip("0").rstrip(".")


def get_initials(name: str = "") -> str:
    parts = [part for part in str(name).split() if part][:2]
    return "".join(part[0].upper() for part in parts) or "SP"


def get_role_badge_color(role: str) -> str:
    normalized = str(role or "").lower()
    if "all" in normalized:
        return "orange"
    if "bowl" in normalized:
        return "blue"
    if "wicket" in normalized or "keeper" in normalized:
        return "purple"
    return "green"


def calculate_performance_points(record: dict[str, Any]) -> int:
    return round(
        safe_number(record.get("runs"))
        + safe_number(record.get("wickets")) * 40
        + safe_number(record.get("catches")) * 10
        + safe_number(record.get("stumpings")) * 12
    )


def build_performer_stats(player: dict[str, Any], performance: dict[str, Any]) -> dict[str, Any]:
    role = str(player.get("role") or performance.get("role") or "Player")
    matches = str(int(safe_number(performance.get("matches"))))
    runs = int(safe_number(performance.get("runs")))
    wickets = int(safe_number(performance.get("wickets")))
    batting_average = format_decimal(performance.get("batting_average"), 2)
    strike_rate = format_decimal(performance.get("strike_rate"), 1)
    economy = format_decimal(performance.get("economy"), 2)
    fours = int(safe_number(performance.get("fours")))
    sixes = int(safe_number(performance.get("sixes")))
    catches = int(safe_number(performance.get("catches")))
    stumpings = int(safe_number(performance.get("stumpings")))
    best_bowling = str(performance.get("best_bowling") or "").strip() or f"{wickets}/{max(0, round(safe_number(performance.get('economy')) * 4))}"
    dot_ball_percentage = str(round(safe_number(performance.get("dot_ball_percentage"))))
    points = calculate_performance_points(performance)

    if "all" in role.lower():
        return {
            "statLine": f"{points} PTS",
            "statLabel": "Top All-Rounder",
            "tableHeaders": ["M", "Runs", "Wkts", "SR", "Eco"],
            "tableValues": [matches, str(runs), str(wickets), strike_rate, economy],
        }
    if "bowl" in role.lower():
        return {
            "statLine": best_bowling,
            "statLabel": "Top Bowler",
            "tableHeaders": ["M", "Wkts", "Eco", "BBI", "Dot%"],
            "tableValues": [matches, str(wickets), economy, best_bowling, dot_ball_percentage],
        }
    if "wicket" in role.lower() or "keeper" in role.lower():
        return {
            "statLine": f"{runs} RUNS",
            "statLabel": "Top Wicketkeeper",
            "tableHeaders": ["M", "Runs", "Avg", "SR", "C/S"],
            "tableValues": [matches, str(runs), batting_average, strike_rate, f"{catches}/{stumpings}"],
        }
    return {
        "statLine": f"{runs} RUNS",
        "statLabel": "Top Batter",
        "tableHeaders": ["M", "Runs", "Avg", "SR", "4/6"],
        "tableValues": [matches, str(runs), batting_average, strike_rate, f"{fours}/{sixes}"],
    }


def get_top_performers(
    limit: int = 5,
    *,
    players: list[dict[str, Any]] | None = None,
    performances: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    players = list(players if players is not None else list_collection("players"))
    performances = list(
        performances if performances is not None else list_collection("performances")
    )
    players_by_id = {int(player.get("id") or 0): player for player in players}
    performers: list[dict[str, Any]] = []

    for performance in performances:
        player = players_by_id.get(int(performance.get("player_id") or 0), {})
        name = player.get("full_name") or performance.get("player_name") or "SPL Player"
        role = player.get("role") or "Player"
        team = player.get("team_name") or performance.get("team_name") or "SPL Franchise"
        points = calculate_performance_points(performance)
        performers.append(
            {
                "playerId": int(player.get("id") or performance.get("player_id") or 0),
                "name": name,
                "role": role,
                "team": team,
                "points": points,
                "image": player.get("photo") or "",
                "href": f"/players/{int(player.get('id'))}" if player.get("id") else "/players",
                **build_performer_stats(player, performance),
            }
        )

    performers.sort(key=lambda performer: (-performer["points"], -performer["playerId"]))
    return [
        {
            **performer,
            "accent": TOP_PERFORMER_ACCENTS[index % len(TOP_PERFORMER_ACCENTS)],
        }
        for index, performer in enumerate(performers[:limit])
    ]


def get_compact_top_performers(limit: int = 5) -> list[dict[str, Any]]:
    return [
        {
            "initials": get_initials(item["name"]),
            "name": item["name"],
            "role": item["role"],
            "roleColor": get_role_badge_color(item["role"]),
            "team": item["team"],
            "points": item["points"],
            "avatarColor": AVATAR_COLORS[index % len(AVATAR_COLORS)],
        }
        for index, item in enumerate(get_top_performers(limit))
    ]


def build_home_hero_stats(
    public_franchises: list[dict[str, Any]],
    public_teams: list[dict[str, Any]],
    public_players: list[dict[str, Any]],
    public_matches: list[dict[str, Any]],
) -> list[dict[str, str]]:
    franchise_total = len(public_franchises) if public_franchises else len(public_teams)
    return [
        {"value": str(franchise_total), "label": "Franchises"},
        {"value": str(len(public_players)), "label": "Players"},
        {"value": str(len(public_matches)), "label": "Matches"},
    ]


def build_home_season_stats(
    public_matches: list[dict[str, Any]],
    public_players: list[dict[str, Any]],
    public_performances: list[dict[str, Any]],
) -> list[dict[str, str]]:
    totals = {
        "runs": 0,
        "wickets": 0,
        "sixes": 0,
        "fours": 0,
    }

    for performance in public_performances:
        totals["runs"] += int(safe_number(performance.get("runs")))
        totals["wickets"] += int(safe_number(performance.get("wickets")))
        totals["sixes"] += int(safe_number(performance.get("sixes")))
        totals["fours"] += int(safe_number(performance.get("fours")))

    fans_engaged = max(len(public_players), 0) * 80

    def format_metric(value: Any) -> str:
        return f"{int(safe_number(value)):,}"

    if fans_engaged >= 1000:
        fans_label = f"{round(fans_engaged / 1000, 1):g}K+"
    else:
        fans_label = format_metric(fans_engaged)

    return [
        {"label": "Total Matches", "value": format_metric(len(public_matches))},
        {"label": "Total Runs", "value": format_metric(totals["runs"])},
        {"label": "Total Wickets", "value": format_metric(totals["wickets"])},
        {"label": "Sixes", "value": format_metric(totals["sixes"])},
        {"label": "Fours", "value": format_metric(totals["fours"])},
        {"label": "Fans Engaged", "value": fans_label},
    ]


def build_public_home_entities(
    teams: list[dict[str, Any]],
    franchises: list[dict[str, Any]],
    players: list[dict[str, Any]],
    performances: list[dict[str, Any]],
    matches: list[dict[str, Any]],
) -> dict[str, Any]:
    public_franchises = [
        franchise for franchise in franchises if is_approved_status(franchise.get("status"))
    ]
    approved_franchise_ids = {
        str(int(safe_number(franchise.get("id"))))
        for franchise in public_franchises
        if int(safe_number(franchise.get("id"))) > 0
    }
    public_teams = [
        team
        for team in teams
        if not str(team.get("franchise_id") or "").strip()
        or str(team.get("franchise_id")) in approved_franchise_ids
    ]
    public_team_ids = {
        int(safe_number(team.get("id")))
        for team in public_teams
        if int(safe_number(team.get("id"))) > 0
    }
    public_team_names = {
        str(team.get("team_name") or "").strip().lower()
        for team in public_teams
        if str(team.get("team_name") or "").strip()
    }
    public_players = [
        player
        for player in players
        if (
            int(safe_number(player.get("team_id"))) in public_team_ids
            or str(player.get("team_name") or "").strip().lower() in public_team_names
            or (
                not int(safe_number(player.get("team_id")))
                and not str(player.get("team_name") or "").strip()
            )
        )
    ]
    public_performances = [
        performance
        for performance in performances
        if (
            int(safe_number(performance.get("team_id"))) in public_team_ids
            or str(performance.get("team_name") or "").strip().lower() in public_team_names
        )
    ]
    public_matches = [
        match
        for match in matches
        if (
            not str(match.get("teamA") or "").strip()
            or str(match.get("teamA") or "").strip().lower() in public_team_names
        )
        and (
            not str(match.get("teamB") or "").strip()
            or str(match.get("teamB") or "").strip().lower() in public_team_names
        )
    ]

    return {
        "franchises": public_franchises,
        "teams": public_teams,
        "players": public_players,
        "performances": public_performances,
        "matches": public_matches,
    }


def build_home_standings_rows(source_rows: list[dict[str, Any]] | None, teams: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_rows = list(source_rows or [])
    known_names = {str(row.get("team") or "").lower() for row in normalized_rows}
    appended = [
        {
            "pos": len(normalized_rows) + index + 1,
            "team": team.get("team_name"),
            "played": 0,
            "won": 0,
            "lost": 0,
            "nrr": "0.000",
            "pts": 0,
        }
        for index, team in enumerate(
            sorted(
                [team for team in teams if str(team.get("team_name") or "").lower() not in known_names],
                key=lambda item: str(item.get("team_name") or ""),
            )
        )
    ]
    final_rows = normalized_rows + appended
    for index, row in enumerate(final_rows):
        row["pos"] = index + 1
    return final_rows


def get_home_payload() -> dict[str, Any]:
    current_version = get_cache_version()
    now = time.monotonic()

    with _home_payload_cache_lock:
        if (
            _home_payload_cache["value"] is not None
            and _home_payload_cache["version"] == current_version
            and float(_home_payload_cache["expires_at"]) > now
        ):
            return copy.deepcopy(_home_payload_cache["value"])

    home = get_project_data("home") or {}
    collections = list_collections(
        ["teams", "franchises", "players", "performances", "matches"]
    )
    teams = collections.get("teams", [])
    franchises = collections.get("franchises", [])
    players = collections.get("players", [])
    performances = collections.get("performances", [])
    matches = collections.get("matches", [])
    public_entities = build_public_home_entities(
        teams,
        franchises,
        players,
        performances,
        matches,
    )
    public_teams = public_entities["teams"]
    public_franchises = public_entities["franchises"]
    public_players = public_entities["players"]
    public_performances = public_entities["performances"]
    public_matches = public_entities["matches"]
    public_maintenance_notice = get_public_maintenance_notice(home)
    home_announcements = list(home.get("announcements") or [])
    if public_maintenance_notice:
        home_announcements = [
            build_maintenance_announcement_item(public_maintenance_notice),
            *home_announcements,
        ]
    payload = {
        **home,
        "maintenanceNotice": public_maintenance_notice,
        "announcements": home_announcements,
        "teams": public_teams,
        "franchises": public_franchises,
        "standings": {
            **(home.get("standings") or {}),
            "season": build_home_standings_rows(
                (home.get("standings") or {}).get("season"),
                public_teams,
            ),
        },
        "heroStats": build_home_hero_stats(
            public_franchises,
            public_teams,
            public_players,
            public_matches,
        ),
        "seasonStats": build_home_season_stats(
            public_matches,
            public_players,
            public_performances,
        ),
        "topPerformers": get_top_performers(
            players=public_players,
            performances=public_performances,
        ),
    }

    with _home_payload_cache_lock:
        _home_payload_cache["value"] = copy.deepcopy(payload)
        _home_payload_cache["version"] = current_version
        _home_payload_cache["expires_at"] = time.monotonic() + HOME_PAYLOAD_CACHE_TTL_SECONDS

    return payload


def build_admin_analytics_payload() -> dict[str, Any]:
    teams = list_collection("teams")
    players = list_collection("players")
    matches = list_collection("matches")
    performances = list_collection("performances")
    approvals = list_collection("approvals")
    invoices = list_collection("invoices")
    total_runs = sum(int(safe_number(record.get("runs"))) for record in performances)
    total_wickets = sum(int(safe_number(record.get("wickets"))) for record in performances)
    completed_matches = sum(1 for match in matches if normalize_status(match.get("status")) == "completed")
    active_teams = sum(1 for team in teams if normalize_status(team.get("status")) == "active")
    pending_approvals = sum(1 for approval in approvals if normalize_status(approval.get("status")) in {"pending", "escalated"})
    income_invoices = [invoice for invoice in invoices if normalize_status(invoice.get("flow")) == "income"]
    total_income = sum(safe_number(invoice.get("amount")) for invoice in income_invoices)
    runs_by_team: dict[str, int] = {}
    for performance in performances:
        name = str(performance.get("team_name") or "")
        if not name:
            continue
        runs_by_team[name] = runs_by_team.get(name, 0) + int(safe_number(performance.get("runs")))
    role_distribution: dict[str, int] = {}
    for player in players:
        role = str(player.get("role") or "Unknown")
        role_distribution[role] = role_distribution.get(role, 0) + 1
    budget_by_team = sorted(
        [{"name": team.get("team_name") or "Team", "amount": int(safe_number(team.get("budget_left")))} for team in teams],
        key=lambda item: item["amount"],
        reverse=True,
    )[:8]
    status_labels = ["Upcoming", "Live", "Completed", "Draft"]
    status_counts = {label: 0 for label in status_labels}
    for match in matches:
        label = next((candidate for candidate in status_labels if normalize_status(candidate) == normalize_status(match.get("status"))), str(match.get("status") or "Unknown"))
        status_counts[label] = status_counts.get(label, 0) + 1
    overdue_invoices = [invoice for invoice in invoices if normalize_status(invoice.get("status")) == "overdue"]
    escalated_approvals = [approval for approval in approvals if normalize_status(approval.get("status")) == "escalated"]
    highest_budget_team = budget_by_team[0] if budget_by_team else None
    leading_team = max(runs_by_team.items(), key=lambda item: item[1], default=None)
    return {
        "kpis": [
            {"label": "League Runs", "value": f"{total_runs:,}", "subtext": f"{len(players)} players contributing this season", "color": "blue", "icon": "Runs"},
            {"label": "League Wickets", "value": f"{total_wickets:,}", "subtext": "Captured from live performance records", "color": "green", "icon": "Wkts"},
            {"label": "Completed Matches", "value": str(completed_matches), "subtext": f"{len(matches)} fixtures currently tracked", "color": "purple", "icon": "Fix"},
            {"label": "Active Teams", "value": str(active_teams), "subtext": f"{pending_approvals} approvals still need action", "color": "gold", "icon": "Team"},
            {"label": "Revenue Tracked", "value": format_lakhs(total_income), "subtext": f"{len(income_invoices)} income invoices recorded", "color": "orange", "icon": "Rev"},
        ],
        "runsByTeam": [{"name": name, "runs": value} for name, value in sorted(runs_by_team.items(), key=lambda item: item[1], reverse=True)[:7]],
        "roleDistribution": [{"name": name, "value": value} for name, value in sorted(role_distribution.items(), key=lambda item: item[1], reverse=True)],
        "budgetByTeam": budget_by_team,
        "matchStatusOverview": [{"name": name, "fans": value} for name, value in status_counts.items()],
        "insights": [
            {"tone": "blue", "title": "Top scoring squad is visible", "body": f"{leading_team[0]} currently lead the league with {leading_team[1]:,} recorded runs." if leading_team else "Team run totals will appear here once performance data is available."},
            {"tone": "emerald", "title": "League participation is healthy", "body": f"{active_teams} active teams and {len(players)} registered players are now coming directly from the backend."},
            {"tone": "yellow" if overdue_invoices or escalated_approvals else "blue", "title": "Operations need attention", "body": f"{len(overdue_invoices)} overdue invoice(s) and {len(escalated_approvals)} escalated approval(s) still need follow-up." if overdue_invoices or escalated_approvals else "No overdue invoices or escalated approvals are open right now."},
            {"tone": "purple", "title": "Budget headroom is visible", "body": f"{highest_budget_team['name']} currently retain the highest remaining team budget at {format_lakhs(highest_budget_team['amount'])}." if highest_budget_team else "Budget distribution will appear here once team budgets are available."},
        ],
    }


def build_admin_dashboard_payload() -> dict[str, Any]:
    teams = list_collection("teams")
    players = list_collection("players")
    franchises = list_collection("franchises")
    matches = list_collection("matches")
    approvals = list_collection("approvals")
    invoices = list_collection("invoices")
    live_match = get_project_data("live-match") or {}
    home = get_project_data("home") or {}
    points_table_rows = []
    teams_by_name = {str(team.get("team_name") or "").lower(): team for team in teams}
    for index, row in enumerate(build_home_standings_rows((home.get("standings") or {}).get("season"), teams)):
        team = teams_by_name.get(str(row.get("team") or "").lower(), {})
        points_table_rows.append(
            {
                "rank": index + 1,
                "team": row.get("team"),
                "played": int(safe_number(row.get("played"))),
                "won": int(safe_number(row.get("won"))),
                "lost": int(safe_number(row.get("lost"))),
                "nrr": str(row.get("nrr") or "0.000"),
                "points": int(safe_number(row.get("pts"))),
                "dot": "#3b82f6" if str(team.get("primary_color") or "").lower() != "gold" else "#f59e0b",
            }
        )
    completed_matches = [match for match in matches if normalize_status(match.get("status")) == "completed"]
    active_teams = [team for team in teams if normalize_status(team.get("status")) == "active"]
    total_budget_capacity = max(len(teams), 1) * 1200000
    total_salary = sum(safe_number(player.get("salary")) for player in players)
    franchise_overview = []
    for franchise in sorted(franchises, key=lambda item: str(item.get("company_name") or "")):
        linked_teams = sorted([team for team in teams if int(safe_number(team.get("franchise_id"))) == int(safe_number(franchise.get("id")))], key=lambda item: str(item.get("team_name") or ""))
        featured_team = linked_teams[0] if linked_teams else None
        linked_names = ", ".join(team.get("team_name") or "" for team in linked_teams if team.get("team_name")) or "No linked teams yet"
        franchise_overview.append(
            {
                "id": int(safe_number(franchise.get("id"))),
                "companyName": franchise.get("company_name") or "Unnamed Franchise",
                "ownerName": franchise.get("owner_name") or "Owner not set",
                "address": franchise.get("address") or "",
                "logo": franchise.get("logo") or (featured_team or {}).get("logo") or "",
                "brandSourceName": (featured_team or {}).get("team_name") or franchise.get("company_name") or "Unnamed Franchise",
                "featuredTeamName": (featured_team or {}).get("team_name") or "",
                "linkedTeamsCount": len(linked_teams),
                "teamCapacityLabel": f"{len(linked_teams)}/3",
                "slotsLeft": max(3 - len(linked_teams), 0),
                "ownershipStatus": "Full" if len(linked_teams) >= 3 else f"{max(3 - len(linked_teams), 0)} Slot{'s' if max(3 - len(linked_teams), 0) != 1 else ''} Left",
                "linkedTeamsLabel": linked_names,
                "website": franchise.get("website") or "",
                "hasLogo": bool(franchise.get("logo") or (featured_team or {}).get("logo")),
            }
        )
    next_upcoming = next((match for match in matches if normalize_status(match.get("status")) == "upcoming"), None)
    recent_activities = []
    if live_match.get("matchTitle"):
        recent_activities.append({"icon": "LV", "color": "red", "text": f"Live scoring active for {live_match.get('matchTitle')}", "time": "just now"})
    if next_upcoming:
        recent_activities.append({"icon": "NX", "color": "blue", "text": f"Next fixture: {next_upcoming.get('teamA')} vs {next_upcoming.get('teamB')}", "time": f"{next_upcoming.get('date')} at {next_upcoming.get('time')}"})
    pending_teams = [team for team in teams if normalize_status(team.get("status")) == "pending"]
    if pending_teams:
        recent_activities.append({"icon": "RV", "color": "purple", "text": f"{len(pending_teams)} teams need status review", "time": ", ".join((team.get('team_name') or '') for team in pending_teams[:2])})
    compact_performers = get_compact_top_performers()
    if compact_performers:
        recent_activities.append({"icon": "TP", "color": "gold", "text": f"{compact_performers[0]['name']} leads the performer board", "time": f"{compact_performers[0]['points']} points"})
    live_now = None
    if live_match.get("matchTitle"):
        live_now = {
            "venue": live_match.get("venue") or "Live venue",
            "matchLabel": live_match.get("matchTitle"),
            "statusLabel": "Live",
            "teamA": live_match.get("battingTeam"),
            "teamB": live_match.get("bowlingTeam"),
            "score": f"{int(safe_number(live_match.get('score')))}/{int(safe_number(live_match.get('wickets')))}",
            "overs": f"{int(safe_number(live_match.get('overs')))}.{int(safe_number(live_match.get('balls')))} Ov",
            "summary": f"{live_match.get('battingTeam')} need {max(int(safe_number(live_match.get('target'))) - int(safe_number(live_match.get('score'))), 0)} off {max(120 - (int(safe_number(live_match.get('overs'))) * 6 + int(safe_number(live_match.get('balls')))), 0)} balls" if safe_number(live_match.get("target")) > 0 else f"{live_match.get('battingTeam')} are {int(safe_number(live_match.get('score')))}/{int(safe_number(live_match.get('wickets')))}",
            "updatedAtLabel": "just now",
        }
    return {
        "stats": [
            {"label": "Total Teams", "value": str(len(teams)), "subtext": "Live SQL-backed franchises in the league", "icon": "Tm", "color": "blue"},
            {"label": "Registered Players", "value": str(len(players)), "subtext": "Live player records across all squads", "icon": "Pl", "color": "green"},
            {"label": "Fixtures", "value": str(len(matches)), "subtext": f"{len(completed_matches)} completed and {len(matches) - len(completed_matches)} upcoming/live", "icon": "Fx", "color": "purple"},
            {"label": "Pending Approvals", "value": str(sum(1 for approval in approvals if normalize_status(approval.get('status')) in {'pending', 'escalated'})), "subtext": "Requests waiting on super admin review", "icon": "Ap", "color": "orange"},
            {"label": "Finance Entries", "value": str(len(invoices)), "subtext": "Invoices tracked in the finance dashboard", "icon": "Fn", "color": "gold"},
            {"label": "Total Franchises", "value": str(len(franchises)), "subtext": "Managed via the franchise registry", "icon": "Fr", "color": "purple"},
        ],
        "pointsTableRows": points_table_rows,
        "seasonProgress": [
            {"label": "Matches Played", "value": f"{len(completed_matches)} / {max(len(matches), 1)}", "width": f"{max(min(round((len(completed_matches) / max(len(matches), 1)) * 100), 100), 0)}%", "color": "blue"},
            {"label": "Teams Activated", "value": f"{len(active_teams)} / {max(len(teams), 1)}", "width": f"{max(min(round((len(active_teams) / max(len(teams), 1)) * 100), 100), 0)}%", "color": "green"},
            {"label": "Budget Utilized", "value": f"{format_lakhs(total_salary)} / {format_lakhs(total_budget_capacity)}", "width": f"{max(min(round((total_salary / max(total_budget_capacity, 1)) * 100), 100), 0)}%", "color": "gold"},
        ],
        "liveNow": live_now,
        "franchiseOverview": franchise_overview,
        "recentActivities": recent_activities[:5],
        "topPerformers": compact_performers,
    }


def get_admin_dashboard_section(section: str | None) -> Any:
    payload = build_admin_dashboard_payload()
    section_map = {
        None: payload,
        "stats": payload["stats"],
        "points-table": payload["pointsTableRows"],
        "season-progress": payload["seasonProgress"],
        "live-now": payload["liveNow"],
        "recent-activity": payload["recentActivities"],
        "recent-activities": payload["recentActivities"],
        "top-performers": payload["topPerformers"],
    }
    return section_map.get(section)


def _is_path_allowed_for_role(role: str, path: str) -> bool:
    if not path:
        return True
    return any(path == allowed or path.startswith(f"{allowed}/") for allowed in ROLE_ALLOWED_PATHS.get(role, []))


def get_admin_shell_payload(user: dict[str, Any]) -> dict[str, Any]:
    matches = list_collection("matches")
    players = list_collection("players")
    teams = list_collection("teams")
    franchises = list_collection("franchises")
    approvals = list_collection("approvals")
    invoices = list_collection("invoices")
    auctions = list_collection("auctions")
    live_match = get_project_data("live-match") or {}
    scoped_teams = teams
    scoped_players = players
    scoped_approvals = approvals
    scoped_invoices = invoices
    scoped_auctions = auctions
    if user.get("role") == "franchise_admin":
        franchise_id = str(user.get("franchiseId") or "")
        scoped_teams = [team for team in teams if str(team.get("franchise_id") or "") == franchise_id]
        team_ids = {str(team.get("id") or "") for team in scoped_teams}
        scoped_players = [player for player in players if str(player.get("team_id") or "") in team_ids]
        context_terms = {str(item.get("team_name") or "").lower() for item in scoped_teams}
        context_terms.add(str(next((franchise.get("company_name") for franchise in franchises if str(franchise.get("id") or "") == franchise_id), "")).lower())
        scoped_approvals = [approval for approval in approvals if any(term and term in f"{approval.get('requested_by','')} {approval.get('subject','')} {approval.get('notes','')}".lower() for term in context_terms)]
        scoped_invoices = [invoice for invoice in invoices if any(term and term in f"{invoice.get('party','')} {invoice.get('category','')} {invoice.get('notes','')}".lower() for term in context_terms)]
        scoped_auctions = [auction for auction in auctions if str(auction.get("team_id") or "") in team_ids]
    live_matches_count = sum(1 for match in matches if normalize_status(match.get("status")) == "live")
    pending_approvals_count = sum(1 for approval in scoped_approvals if normalize_status(approval.get("status")) == "pending")
    raw_badges = {
        "/franchise": str(len(scoped_teams)) if user.get("role") == "franchise_admin" else None,
        "/admin/matches": str(len(matches)),
        "/admin/players": str(len(scoped_players)),
        "/admin/franchises": str(len(franchises)),
        "/admin/approvals": str(pending_approvals_count),
        "/admin/live-match": "LIVE" if live_matches_count > 0 else None,
    }
    notifications = []
    if live_matches_count > 0 or live_match.get("updatedAt"):
        notifications.append({"id": "live-match-sync", "title": "Live match feed is active", "detail": live_match.get("matchTitle") and f"{live_match.get('matchTitle')} is syncing from the scorer controls." or "Live fixtures are active right now.", "time": "Just now", "unread": True, "path": "/admin/live-match"})
    if pending_approvals_count:
        notifications.append({"id": "approval-queue", "title": "Approval queue needs attention", "detail": f"{pending_approvals_count} pending request(s) are waiting.", "time": "Today", "unread": True, "path": "/admin/approvals"})
    overdue_invoices = [invoice for invoice in scoped_invoices if normalize_status(invoice.get("status")) == "overdue"]
    if overdue_invoices:
        notifications.append({"id": "overdue-invoices", "title": "Overdue invoices detected", "detail": f"{len(overdue_invoices)} invoice(s) need finance follow-up immediately.", "time": overdue_invoices[0].get("due_date") or "Today", "unread": True, "path": "/admin/finance"})
    pending_lots = [auction for auction in scoped_auctions if normalize_status(auction.get("status")) == "pending"]
    if pending_lots:
        notifications.append({"id": "pending-auctions", "title": "Auction lots are still pending", "detail": f"{len(pending_lots)} auction lot(s) are waiting for the next bid decision.", "time": "Auction window", "unread": True, "path": "/admin/auction"})
    next_fixture = next((match for match in matches if normalize_status(match.get("status")) in {"upcoming", "draft"}), None)
    if next_fixture:
        notifications.append({"id": "next-fixture", "title": "Next fixture is lined up", "detail": f"{next_fixture.get('teamA')} vs {next_fixture.get('teamB')} is scheduled at {next_fixture.get('venue')}", "time": next_fixture.get("date") or "Upcoming", "unread": False, "path": "/admin/matches"})
    if not notifications:
        notifications.append({"id": "system-healthy", "title": "League operations are clear", "detail": "No urgent admin alerts are active right now.", "time": "Live status", "unread": False, "path": ""})
    context_label = ROLE_SUMMARIES.get(user.get("role"), user.get("email") or "League dashboard")
    if user.get("franchiseId"):
        matching_team = next((team for team in teams if str(team.get("franchise_id") or "") == str(user.get("franchiseId"))), None)
        matching_franchise = next((franchise for franchise in franchises if str(franchise.get("id") or "") == str(user.get("franchiseId"))), None)
        context_label = (matching_team or {}).get("team_name") or (matching_franchise or {}).get("company_name") or context_label
    return {
        "profile": {
            "fullName": user.get("fullName") or user.get("email") or "Admin User",
            "contextLabel": context_label,
            "roleLabel": ROLE_LABELS.get(user.get("role"), "User"),
            "status": user.get("status") or "Active",
            "initials": get_initials(user.get("fullName") or user.get("email") or ""),
            "email": user.get("email") or "",
            "avatar": user.get("avatar") or "",
        },
        "badges": {path: value for path, value in raw_badges.items() if value is not None and _is_path_allowed_for_role(str(user.get("role") or ""), path)},
        "notifications": [item for item in notifications if _is_path_allowed_for_role(str(user.get("role") or ""), item.get("path") or "")][:5],
    }


def resolve_franchise_context(user: dict[str, Any], query_params: dict[str, Any]) -> dict[str, Any]:
    franchises = list_collection("franchises")
    teams = list_collection("teams")
    franchise_id = int(safe_number(query_params.get("franchiseId") or user.get("franchiseId") or 0))
    team_id = int(safe_number(query_params.get("teamId") or 0))
    requested_team_name = str(query_params.get("team") or "").strip().lower()
    team = next((entry for entry in teams if int(safe_number(entry.get("id"))) == team_id), None)
    if not team and requested_team_name:
        team = next((entry for entry in teams if str(entry.get("team_name") or "").strip().lower() == requested_team_name), None)
    if not team and franchise_id:
        team = next((entry for entry in teams if int(safe_number(entry.get("franchise_id"))) == franchise_id), None)
    if user.get("role") == "franchise_admin" and not team and user.get("franchiseId"):
        team = next((entry for entry in teams if int(safe_number(entry.get("franchise_id"))) == int(safe_number(user.get("franchiseId")))), None)
    franchise = next((entry for entry in franchises if int(safe_number(entry.get("id"))) == franchise_id), None)
    if not franchise and team:
        franchise = next((entry for entry in franchises if int(safe_number(entry.get("id"))) == int(safe_number(team.get("franchise_id")))), None)
    if user.get("role") == "franchise_admin" and not franchise and user.get("franchiseId"):
        franchise = next((entry for entry in franchises if int(safe_number(entry.get("id"))) == int(safe_number(user.get("franchiseId")))), None)
    context = {
        "teamId": int(safe_number((team or {}).get("id"))),
        "teamName": (team or {}).get("team_name") or "",
        "franchiseId": int(safe_number((franchise or {}).get("id") or (team or {}).get("franchise_id"))),
        "franchiseName": (franchise or {}).get("company_name") or (team or {}).get("team_name") or "",
        "ownerName": (franchise or {}).get("owner_name") or (team or {}).get("owner") or "",
        "city": (team or {}).get("city") or "",
        "venue": (team or {}).get("venue") or "",
        "status": (team or {}).get("status") or "",
        "website": (franchise or {}).get("website") or "",
    }
    return {"team": team, "franchise": franchise, "context": context}


def _get_team_players(players: list[dict[str, Any]], team: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not team:
        return []
    return [player for player in players if int(safe_number(player.get("team_id"))) == int(safe_number(team.get("id"))) or str(player.get("team_name") or "").lower() == str(team.get("team_name") or "").lower()]


def _get_team_performances(performances: list[dict[str, Any]], team: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not team:
        return []
    return [record for record in performances if int(safe_number(record.get("team_id"))) == int(safe_number(team.get("id"))) or str(record.get("team_name") or "").lower() == str(team.get("team_name") or "").lower()]


def _get_team_matches(matches: list[dict[str, Any]], team: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not team:
        return []
    team_name = str(team.get("team_name") or "").lower()
    return [match for match in matches if str(match.get("teamA") or "").lower() == team_name or str(match.get("teamB") or "").lower() == team_name]


def get_franchise_dashboard_section(section: str | None, user: dict[str, Any], query_params: dict[str, Any]) -> Any:
    players = list_collection("players")
    matches = list_collection("matches")
    performances = list_collection("performances")
    dashboard_content = get_project_data("franchise-dashboard") or {}
    resolved = resolve_franchise_context(user, query_params)
    team = resolved["team"]
    franchise = resolved["franchise"]
    context = resolved["context"]
    if not team and not franchise:
        return None
    team_players = _get_team_players(players, team)
    team_performances = _get_team_performances(performances, team)
    team_matches = _get_team_matches(matches, team)
    completed_matches = [match for match in team_matches if normalize_status(match.get("status")) == "completed"]
    wins = sum(1 for match in completed_matches if str(match.get("result") or "").lower().startswith(str(team.get("team_name") or "").lower())) if team else 0
    notices = []
    if team:
        notices.append({"id": "team-status", "type": "Operations", "title": f"{team.get('team_name')} status is {team.get('status') or 'Active'}", "date": context.get("status") or "Active"})
    if team_matches:
        next_match = next((match for match in team_matches if normalize_status(match.get("status")) in {"live", "upcoming"}), None)
    else:
        next_match = None
    if next_match:
        notices.append({"id": "next-match", "type": "Match", "title": f"Prepare for {next_match.get('teamA')} vs {next_match.get('teamB')}", "date": next_match.get("date") or "TBD"})
    if team_performances:
        top_performance = max(team_performances, key=calculate_performance_points)
        notices.append({"id": "top-performer", "type": "Performance", "title": f"{top_performance.get('player_name') or 'Player'} leads your performer chart", "date": top_performance.get("updated_at") or "Recently"})
    budget_spent = sum(safe_number(player.get("salary")) for player in team_players)
    budget_left = safe_number((team or {}).get("budget_left"))
    summary = {
        "heroTitle": dashboard_content.get("heroTitle") or "Franchise Dashboard",
        "context": context,
        "cards": [
            {"label": (dashboard_content.get("summaryCards") or {}).get("squadStrength") or "Squad Strength", "value": f"{len(team_players)}/15", "subtext": f"{sum(1 for player in team_players if normalize_status(player.get('status')) == 'active')} active players registered", "color": "blue", "icon": "Sq"},
            {"label": (dashboard_content.get("summaryCards") or {}).get("availableBudget") or "Available Budget", "value": format_lakhs(budget_left), "subtext": f"{(franchise or {}).get('company_name') or (team or {}).get('team_name') or 'Franchise'} purse remaining", "color": "green", "icon": "Rs"},
            {"label": (dashboard_content.get("summaryCards") or {}).get("winsThisSeason") or "Wins This Season", "value": str(wins), "subtext": f"{len(completed_matches)} completed matches tracked", "color": "gold", "icon": "Wn"},
            {"label": (dashboard_content.get("summaryCards") or {}).get("pendingNotices") or "Pending Notices", "value": str(len(notices)), "subtext": f"{(team or {}).get('status') or 'Active'} franchise updates", "color": "red", "icon": "Nt"},
        ],
    }
    next_match_payload = {
        "title": ((dashboard_content.get("sectionTitles") or {}).get("nextMatch") or "Next Match"),
        "context": context,
        "match": {
            "fixture": f"{(team or {}).get('team_name') or 'Franchise'} vs {next_match and (next_match.get('teamB') if str(next_match.get('teamA') or '').lower() == str((team or {}).get('team_name') or '').lower() else next_match.get('teamA')) or 'Schedule pending'}",
            "venue": next_match and next_match.get("venue") or (team or {}).get("venue") or "Venue to be announced",
            "date": next_match and next_match.get("date") or "TBD",
            "time": next_match and next_match.get("time") or "TBD",
            "note": next_match and ("Live scoring is active for this franchise." if normalize_status(next_match.get("status")) == "live" else "Next fixture is locked in for your franchise.") or "No upcoming fixture is available for this franchise yet.",
            "status": next_match and next_match.get("status") or "Idle",
        },
    }
    squad_counts: dict[str, int] = {}
    for player in team_players:
        role = str(player.get("role") or "Player")
        key = "All-Rounders" if "all" in role.lower() else "Wicket Keepers" if "wicket" in role.lower() or "keeper" in role.lower() else "Bowlers" if "bowl" in role.lower() else "Batsmen"
        squad_counts[key] = squad_counts.get(key, 0) + 1
    budget_items = [
        {"name": "Purse Remaining", "amount": round(budget_left / 100000, 1)},
        {"name": "Squad Spend", "amount": round(budget_spent / 100000, 1)},
    ]
    payload = {
        "summary": summary,
        "next-match": next_match_payload,
        "notices": {"title": ((dashboard_content.get("sectionTitles") or {}).get("notices") or "Notices"), "context": context, "items": notices},
        "squad-summary": {"title": ((dashboard_content.get("sectionTitles") or {}).get("squadSummary") or "Squad Summary"), "context": context, "items": [{"name": name, "value": value} for name, value in squad_counts.items()]},
        "budget-trend": {"title": ((dashboard_content.get("sectionTitles") or {}).get("budgetTrend") or "Budget Trend (Rs Lakh)"), "context": context, "items": budget_items, "totalPurse": round((budget_left + budget_spent) / 100000, 1), "spent": round(budget_spent / 100000, 1), "remaining": round(budget_left / 100000, 1)},
    }
    return payload if section is None else payload.get(section)


def get_admin_search_payload(user: dict[str, Any], query_params: dict[str, Any]) -> dict[str, Any]:
    query = str(query_params.get("q") or query_params.get("search") or "").strip()
    try:
        limit = min(max(int(query_params.get("limit") or 10), 1), 20)
    except Exception:
        limit = 10
    if len(query) < 2:
        return {"query": query, "total": 0, "groups": []}

    resources = {
        "players": {"label": "Players", "path": "/admin/players", "build_title": lambda r: r.get("full_name"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("team_name"), r.get("role")])), "build_meta": lambda r: r.get("status") or "Player"},
        "performances": {"label": "Performances", "path": "/admin/analytics", "build_title": lambda r: r.get("player_name"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("team_name"), f"{int(safe_number(r.get('matches')))} matches", f"{int(safe_number(r.get('runs')))} runs", f"{int(safe_number(r.get('wickets')))} wickets"])), "build_meta": lambda _r: "Performance"},
        "teams": {"label": "Teams", "path": "/admin/teams", "build_title": lambda r: r.get("team_name"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("city"), r.get("coach") or r.get("owner")])), "build_meta": lambda r: r.get("status") or "Team"},
        "franchises": {"label": "Franchises", "path": "/admin/franchises", "build_title": lambda r: r.get("company_name"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("owner_name"), r.get("website")])), "build_meta": lambda _r: "Franchise"},
        "matches": {"label": "Matches", "path": "/admin/matches", "build_title": lambda r: f"{r.get('teamA')} vs {r.get('teamB')}", "build_subtitle": lambda r: " | ".join(filter(None, [r.get("date"), r.get("venue")])), "build_meta": lambda r: r.get("status") or "Match"},
        "venues": {"label": "Venues", "path": "/admin/matches", "build_title": lambda r: r.get("ground_name"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("city"), r.get("location"), r.get("contact_person")])), "build_meta": lambda _r: "Venue"},
        "approvals": {"label": "Approvals", "path": "/admin/approvals", "build_title": lambda r: r.get("subject"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("requested_by"), r.get("priority"), r.get("status")])), "build_meta": lambda r: r.get("request_type") or "Approval"},
        "invoices": {"label": "Invoices", "path": "/admin/finance", "build_title": lambda r: r.get("invoice_code"), "build_subtitle": lambda r: " | ".join(filter(None, [r.get("party"), r.get("category"), r.get("status")])), "build_meta": lambda r: r.get("flow") or "Invoice"},
    }
    allowed_by_role = {
        "super_admin": list(resources.keys()),
        "ops_manager": ["matches", "venues"],
        "scorer": [],
        "finance_admin": ["invoices"],
        "franchise_admin": ["players", "teams", "franchises", "matches", "performances"],
    }
    groups = []
    total = 0
    if user.get("role") == "franchise_admin":
        resolved = resolve_franchise_context(user, query_params)
        team = resolved["team"]
        franchise = resolved["franchise"]
        team_players = _get_team_players(list_collection("players"), team)
        team_matches = _get_team_matches(list_collection("matches"), team)
        team_performances = _get_team_performances(list_collection("performances"), team)
        scoped_resources = {
            "players": team_players,
            "teams": [team] if team else [],
            "franchises": [franchise] if franchise else [],
            "matches": team_matches,
            "performances": team_performances,
        }
    else:
        scoped_resources = {name: list_collection(name) for name in resources if name in allowed_by_role.get(user.get("role"), [])}
    for resource_name in allowed_by_role.get(user.get("role"), []):
        config = resources[resource_name]
        items = []
        for record in scoped_resources.get(resource_name, []):
            haystack = " ".join(str(value or "") for value in record.values()).lower()
            if query.lower() not in haystack:
                continue
            items.append({"id": record.get("id"), "title": config["build_title"](record), "subtitle": config["build_subtitle"](record), "meta": config["build_meta"](record), "path": config["path"]})
            if len(items) >= limit:
                break
        if items:
            groups.append({"key": resource_name, "label": config["label"], "items": items})
            total += len(items)
    return {"query": query, "total": total, "groups": groups}
