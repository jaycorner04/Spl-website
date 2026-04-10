from __future__ import annotations

import base64
import json
import os
import re
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .auth_layer import (
    AuthError,
    can_access_franchise_dashboard,
    create_session_token,
    get_user_from_authorization_header,
    is_privileged_user,
    change_password,
    list_admin_users,
    login_user,
    update_admin_user_access,
    register_user,
    request_password_reset,
    reset_password,
    sync_franchise_registration_approval,
    update_user_avatar,
)
from .config import FRONTEND_DIST_DIR, MEDIA_DIR, settings
from .db_layer import (
    PROJECT_DATA_CONFIG,
    RESOURCE_CONFIG,
    apply_list_filters,
    create_audit_log,
    create_item,
    delete_item,
    get_connection,
    get_database_health,
    get_item,
    get_project_data,
    initialize_database,
    list_audit_logs,
    list_collection,
    replace_item,
    sanitize_payload,
    set_project_data,
    utc_now_iso,
)
from .services import (
    build_admin_analytics_payload,
    get_admin_dashboard_section,
    get_admin_search_payload,
    get_admin_shell_payload,
    get_franchise_dashboard_section,
    get_home_payload,
    get_participating_franchises,
    normalize_maintenance_notice,
    resolve_franchise_context,
)


PLAYER_APPROVAL_META_PREFIX = '__SPL_PLAYER_REG__'
FRANCHISE_APPROVAL_META_PREFIX = '__SPL_FRANCHISE_REG__'
IMAGE_EXTENSION_MAP = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}
DOWNLOAD_EXTENSION_MAP = {
    '.apk': 'application/vnd.android.package-archive',
    '.aab': 'application/octet-stream',
}
RATE_LIMIT_RULES = [
    {
        'key': 'auth',
        'window_ms': 15 * 60 * 1000,
        'max': 25,
        'match': lambda path, method: method == 'POST' and path in {
            '/api/auth/login', '/api/auth/login/',
            '/api/auth/register', '/api/auth/register/',
            '/api/auth/forgot-password', '/api/auth/forgot-password/',
            '/api/auth/reset-password', '/api/auth/reset-password/',
            '/api/auth/change-password', '/api/auth/change-password/',
        },
    },
    {
        'key': 'admin-search',
        'window_ms': 60 * 1000,
        'max': 120,
        'match': lambda path, method: method == 'GET' and path.rstrip('/') == '/api/admin/search',
    },
    {
        'key': 'uploads',
        'window_ms': 60 * 1000,
        'max': 20,
        'match': lambda path, method: method == 'POST' and path.startswith('/api/uploads/'),
    },
]
rate_limit_store: dict[str, dict[str, float | int]] = {}
request_metrics = {
    'totalRequests': 0,
    'totalErrors': 0,
    'rateLimitedRequests': 0,
    'methodCounts': {},
    'routeCounts': {},
    'statusCounts': {},
    'totalResponseTimeMs': 0.0,
}

app = FastAPI(title='SPL Python API', version=settings.api_version)
allowed_origins = settings.cors_allowed_origins or ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount('/media', StaticFiles(directory=str(MEDIA_DIR)), name='media')


@app.on_event('startup')
def on_startup() -> None:
    initialize_database()
    try:
        get_home_payload()
    except Exception as error:
        print(f'Home payload warmup skipped: {error}')


@app.middleware('http')
async def metrics_and_rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    method = request.method.upper()
    request_metrics['totalRequests'] += 1
    request_metrics['methodCounts'][method] = request_metrics['methodCounts'].get(method, 0) + 1
    request_metrics['routeCounts'][path] = request_metrics['routeCounts'].get(path, 0) + 1

    if settings.rate_limit_enabled:
        client_host = request.client.host if request.client else 'local'
        now_ms = int(time.time() * 1000)
        for rule in RATE_LIMIT_RULES:
            if not rule['match'](path, method):
                continue
            bucket_key = f"{rule['key']}:{client_host}"
            bucket = rate_limit_store.get(bucket_key)
            if not bucket or now_ms - int(bucket['started_at']) >= int(rule['window_ms']):
                bucket = {'count': 0, 'started_at': now_ms}
            if int(bucket['count']) >= int(rule['max']):
                request_metrics['rateLimitedRequests'] += 1
                request_metrics['totalErrors'] += 1
                return JSONResponse({'detail': 'Too many requests. Please try again shortly.'}, status_code=429, headers={'Retry-After': str(max(int(rule['window_ms']) // 1000, 1))})
            bucket['count'] = int(bucket['count']) + 1
            rate_limit_store[bucket_key] = bucket
            break

    started_at = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started_at) * 1000
    request_metrics['totalResponseTimeMs'] += duration_ms
    status_key = str(response.status_code)
    request_metrics['statusCounts'][status_key] = request_metrics['statusCounts'].get(status_key, 0) + 1
    if response.status_code >= 400:
        request_metrics['totalErrors'] += 1
    return response


def api_error(status_code: int, detail: str) -> None:
    raise HTTPException(status_code=status_code, detail=detail)


def get_error_status(error: Exception) -> int:
    if isinstance(error, AuthError):
        return error.status_code
    if isinstance(error, HTTPException):
        return int(error.status_code)
    return 500


def parse_identifier(identifier: str) -> int:
    try:
        value = int(identifier)
    except Exception:
        api_error(400, 'Resource id must be a positive integer.')
    if value < 1:
        api_error(400, 'Resource id must be a positive integer.')
    return value


def _serialize_audit_detail(detail: Any) -> str:
    if detail in (None, ''):
        return ''
    if isinstance(detail, str):
        return detail
    try:
        return json.dumps(detail)
    except Exception:
        return str(detail)


def append_audit_log_safe(request: Request, *, user: dict[str, Any] | None = None, action: str, resource_name: str, resource_id: int | None = None, status: str = 'success', detail: Any = '') -> None:
    try:
        create_audit_log(
            {
                'actorUserId': user.get('id') if user else None,
                'actorEmail': user.get('email') if user else '',
                'actorRole': user.get('role') if user else '',
                'action': action,
                'resourceName': resource_name,
                'resourceId': resource_id,
                'method': request.method,
                'status': status,
                'detail': _serialize_audit_detail(detail),
                'ipAddress': request.client.host if request.client else '',
                'createdAt': utc_now_iso(),
            }
        )
    except Exception:
        return


def parse_upload_payload(payload: dict[str, Any]) -> tuple[bytes, str, str]:
    data_url = str(payload.get('dataUrl') or '')
    file_name = str(payload.get('fileName') or 'upload')
    content_type = str(payload.get('contentType') or '').lower()
    if data_url.startswith('data:') and ';base64,' in data_url:
        header, encoded = data_url.split(',', 1)
        content_type = header.split(';', 1)[0].replace('data:', '').lower()
    else:
        encoded = data_url
    extension = IMAGE_EXTENSION_MAP.get(content_type)
    if not extension:
        api_error(400, 'Only JPG, PNG, and WEBP images are supported.')
    try:
        binary = base64.b64decode(encoded)
    except Exception:
        api_error(400, 'Unable to decode the uploaded image.')
    if not binary:
        api_error(400, 'Uploaded image is empty.')
    if len(binary) > settings.max_upload_size:
        api_error(413, 'Image must be 5 MB or smaller.')
    safe_base = re.sub(r'[^a-zA-Z0-9_-]+', '-', Path(file_name).stem).strip('-') or 'upload'
    return binary, extension, safe_base


def save_image_upload(payload: dict[str, Any], folder_name: str, default_base_name: str) -> dict[str, Any]:
    binary, extension, base_name = parse_upload_payload(payload)
    target_dir = MEDIA_DIR / folder_name
    target_dir.mkdir(parents=True, exist_ok=True)
    unique_suffix = f"{int(time.time() * 1000)}-{os.urandom(3).hex()}"
    file_name = f"{base_name or default_base_name}-{unique_suffix}{extension}"
    target_path = target_dir / file_name
    target_path.write_bytes(binary)
    return {'fileName': file_name, 'path': f'/media/{folder_name}/{file_name}'}


def build_player_registration_approval_notes(player_record: dict[str, Any], actor: dict[str, Any] | None) -> str:
    meta = json.dumps(
        {
            'playerId': int(player_record.get('id') or 0),
            'teamId': int(player_record.get('team_id') or 0),
            'teamName': player_record.get('team_name') or '',
            'playerName': player_record.get('full_name') or '',
            'requestedBy': actor.get('email') if actor else '',
        },
        separators=(',', ':'),
    )
    return f"{PLAYER_APPROVAL_META_PREFIX}{meta}\nPlayer registration submitted for {player_record.get('full_name')}."


def parse_player_registration_approval_notes(notes: str) -> dict[str, Any] | None:
    first_line = str(notes or '').splitlines()[0] if notes else ''
    if not first_line.startswith(PLAYER_APPROVAL_META_PREFIX):
        return None
    try:
        return json.loads(first_line[len(PLAYER_APPROVAL_META_PREFIX):])
    except Exception:
        return None


def parse_franchise_registration_approval_notes(notes: str) -> dict[str, Any] | None:
    first_line = str(notes or '').splitlines()[0] if notes else ''
    if not first_line.startswith(FRANCHISE_APPROVAL_META_PREFIX):
        return None
    try:
        return json.loads(first_line[len(FRANCHISE_APPROVAL_META_PREFIX):])
    except Exception:
        return None


def create_player_registration_approval(player_record: dict[str, Any], actor: dict[str, Any] | None) -> dict[str, Any]:
    created_at = str(player_record.get('created_at') or utc_now_iso())
    team_name = str(player_record.get('team_name') or '').strip()
    fallback_team_label = f"Team {player_record.get('team_id')}" if player_record.get('team_id') else 'Unassigned Team'
    subject_team = team_name or fallback_team_label
    return create_item(
        'approvals',
        {
            'request_type': 'Player Registration',
            'requested_by': team_name or (actor.get('fullName') if actor else 'Franchise'),
            'subject': f"Approve {player_record.get('full_name')} for {subject_team}",
            'date': created_at[:10],
            'priority': 'High',
            'status': 'Pending',
            'notes': build_player_registration_approval_notes(player_record, actor),
        },
    )


def sync_player_registration_approval(approval_record: dict[str, Any]) -> None:
    if str(approval_record.get('request_type') or '').lower() != 'player registration':
        return
    meta = parse_player_registration_approval_notes(str(approval_record.get('notes') or ''))
    if not meta or not meta.get('playerId'):
        return
    player_record = get_item('players', int(meta['playerId']))
    if not player_record:
        return
    next_status = 'Active' if str(approval_record.get('status') or '').lower() == 'approved' else 'Pending'
    if str(player_record.get('status') or '') != next_status:
        replace_item('players', int(player_record['id']), {**player_record, 'status': next_status})


def sync_approval_side_effects(approval_record: dict[str, Any]) -> None:
    sync_franchise_registration_approval(approval_record)
    sync_player_registration_approval(approval_record)


def cleanup_rejected_franchise_registration(approval_record: dict[str, Any]) -> dict[str, Any]:
    if str(approval_record.get('status') or '').lower() != 'rejected':
        api_error(400, 'Reject this franchise registration before deleting it.')

    if str(approval_record.get('request_type') or '').lower() != 'franchise registration':
        api_error(400, 'Only rejected franchise registration approvals can delete a franchise.')

    meta = parse_franchise_registration_approval_notes(str(approval_record.get('notes') or ''))
    try:
        franchise_id = int((meta or {}).get('franchiseId') or 0)
        user_id = int((meta or {}).get('userId') or 0)
    except Exception:
        franchise_id = 0
        user_id = 0

    if not meta or franchise_id < 1:
        api_error(400, 'This approval does not include a linked franchise registration.')

    with get_connection() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute('DELETE FROM dbo.password_reset_tokens WHERE user_id = ?;', (user_id,))
            cursor.execute(
                "DELETE FROM dbo.auth_users WHERE id = ? AND role = N'franchise_admin';",
                (user_id,),
            )
        cursor.execute(
            "DELETE FROM dbo.auth_users WHERE franchise_id = ? AND role = N'franchise_admin';",
            (franchise_id,),
        )
        conn.commit()

    delete_item('franchises', franchise_id)
    delete_item('approvals', int(approval_record.get('id') or 0))

    return {
        'approvalId': int(approval_record.get('id') or 0),
        'franchiseId': franchise_id,
        'userId': user_id,
    }


def validate_team_franchise_assignment(team_id: int | None, team_record: dict[str, Any]) -> str | None:
    franchise_id = int(team_record.get('franchise_id') or 0)
    if franchise_id < 1:
        return None
    franchises = list_collection('franchises')
    teams = list_collection('teams')
    if not any(int(item.get('id') or 0) == franchise_id for item in franchises):
        return 'Selected franchise was not found.'
    assigned_teams = [team for team in teams if int(team.get('franchise_id') or 0) == franchise_id and int(team.get('id') or 0) != int(team_id or 0)]
    if len(assigned_teams) >= 3:
        return 'A franchise can only own up to 3 teams.'
    return None


def validate_resource_relationships(resource_name: str, record: dict[str, Any]) -> str | None:
    if resource_name == 'teams':
        return validate_team_franchise_assignment(int(record.get('id') or 0) or None, record)
    if resource_name == 'players':
        team_id = int(record.get('team_id') or 0)
        if not team_id:
            return None
        team = get_item('teams', team_id)
        if not team:
            return 'Selected team was not found for this player.'
        if record.get('team_name') and str(record.get('team_name')).strip().lower() != str(team.get('team_name') or '').strip().lower():
            return 'Player team name must match the selected team.'
        record['team_name'] = team.get('team_name') or ''
        return None
    if resource_name == 'performances':
        player = get_item('players', int(record.get('player_id') or 0))
        if not player:
            return 'Selected player was not found for this performance.'
        record['player_name'] = player.get('full_name') or record.get('player_name')
        record['team_id'] = player.get('team_id') if player.get('team_id') is not None else record.get('team_id')
        record['team_name'] = player.get('team_name') or record.get('team_name')
        return None
    if resource_name == 'matches':
        if str(record.get('teamA') or '').strip().lower() == str(record.get('teamB') or '').strip().lower() and str(record.get('teamA') or '').strip():
            return 'A match cannot contain the same team on both sides.'
        team_a_id = int(record.get('team_a_id') or 0)
        team_b_id = int(record.get('team_b_id') or 0)
        team_a = get_item('teams', team_a_id) if team_a_id else None
        team_b = get_item('teams', team_b_id) if team_b_id else None
        if team_a_id and not team_a:
            return 'Team A was not found for this match.'
        if team_b_id and not team_b:
            return 'Team B was not found for this match.'
        if team_a and team_b and int(team_a.get('id') or 0) == int(team_b.get('id') or 0):
            return 'A match cannot contain the same team on both sides.'
        if team_a:
            record['teamA'] = team_a.get('team_name') or record.get('teamA')
        if team_b:
            record['teamB'] = team_b.get('team_name') or record.get('teamB')
        return None
    if resource_name == 'auctions':
        team_id = int(record.get('team_id') or 0)
        if not team_id:
            return None
        team = get_item('teams', team_id)
        if not team:
            return 'Selected team was not found for this auction record.'
        record['team_name'] = team.get('team_name') or record.get('team_name')
        return None
    return None


def require_user(request: Request) -> dict[str, Any]:
    user = get_user_from_authorization_header(request.headers.get('Authorization'))
    if not user:
        api_error(401, 'Authentication is required for this action.')
    return user


def require_privileged_access(request: Request) -> dict[str, Any]:
    user = require_user(request)
    if not is_privileged_user(user):
        api_error(403, 'You do not have permission for this action.')
    return user


def require_role_access(request: Request, roles: list[str], message: str) -> dict[str, Any]:
    user = require_privileged_access(request)
    if user.get('role') not in roles:
        api_error(403, message)
    return user


def require_super_admin_access(request: Request, message: str = 'Only the super admin can access this action.') -> dict[str, Any]:
    return require_role_access(request, ['super_admin'], message)


def get_admin_maintenance_notice() -> dict[str, Any]:
    home_content = get_project_data('home') or {}
    return normalize_maintenance_notice(home_content.get('maintenanceNotice'))


def persist_admin_maintenance_notice(
    current_notice: dict[str, Any],
    payload: dict[str, Any],
    actor: dict[str, Any],
) -> dict[str, Any]:
    next_notice = normalize_maintenance_notice({**current_notice, **payload})
    next_status = str(next_notice.get('status') or 'draft').strip().lower()

    if next_status not in {'draft', 'approved', 'rejected'}:
        api_error(400, 'Maintenance notice status must be Draft, Approved, or Rejected.')

    next_notice['status'] = next_status
    next_notice['updatedAt'] = utc_now_iso()
    next_notice['updatedBy'] = actor.get('email') or actor.get('fullName') or ''

    if next_status == 'approved':
        next_notice['approvedAt'] = utc_now_iso()
        next_notice['approvedBy'] = actor.get('email') or actor.get('fullName') or ''
        next_notice['rejectedAt'] = ''
        next_notice['rejectedBy'] = ''
    elif next_status == 'rejected':
        next_notice['rejectedAt'] = utc_now_iso()
        next_notice['rejectedBy'] = actor.get('email') or actor.get('fullName') or ''

    home_content = get_project_data('home') or {}
    set_project_data('home', {**home_content, 'maintenanceNotice': next_notice})
    return next_notice


def require_match_operations_access(request: Request) -> dict[str, Any]:
    return require_role_access(request, ['super_admin', 'ops_manager'], 'Only the super admin or ops manager can access match operations.')


def require_live_match_control_access(request: Request) -> dict[str, Any]:
    return require_role_access(request, ['super_admin', 'ops_manager', 'scorer'], 'Only the super admin, ops manager, or scorer can control live match data.')


def require_finance_access(request: Request) -> dict[str, Any]:
    return require_role_access(request, ['super_admin', 'finance_admin'], 'Only the super admin or finance admin can access finance data.')


def require_franchise_scoped_access(request: Request) -> dict[str, Any]:
    return require_role_access(request, ['super_admin', 'franchise_admin'], 'Only the super admin or franchise admin can access franchise management.')


def require_franchise_dashboard_access(request: Request) -> dict[str, Any]:
    user = require_privileged_access(request)
    if not can_access_franchise_dashboard(user):
        api_error(403, 'Only super admins and franchise admins can access this dashboard.')
    return user


def ensure_franchise_scoped_team_access(team_id: int, user: dict[str, Any]) -> dict[str, Any]:
    team = get_item('teams', int(team_id))
    if not team:
        api_error(404, 'Team not found.')
    if user.get('role') != 'super_admin' and str(team.get('franchise_id') or '') != str(user.get('franchiseId') or ''):
        api_error(403, 'You can only manage teams that belong to your own franchise.')
    return team


def require_resource_read_access(resource_name: str, request: Request) -> dict[str, Any] | None:
    if resource_name == 'approvals':
        return require_super_admin_access(request, 'Only the super admin can review approvals.')
    if resource_name == 'invoices':
        return require_finance_access(request)
    if resource_name in {'auctions', 'performances'}:
        return require_super_admin_access(request, f'Only the super admin can access {resource_name}.')
    return None


def require_collection_write_access(resource_name: str, request: Request, payload: dict[str, Any]) -> dict[str, Any]:
    if resource_name in {'approvals', 'auctions', 'performances'}:
        return require_super_admin_access(request, f'Only the super admin can create {resource_name}.')
    if resource_name == 'invoices':
        return require_super_admin_access(request, 'Only the super admin can create new finance records.')
    if resource_name == 'matches':
        return require_match_operations_access(request)
    if resource_name == 'teams':
        user = require_franchise_scoped_access(request)
        if user.get('role') == 'franchise_admin' and str(payload.get('franchise_id') or '') != str(user.get('franchiseId') or ''):
            api_error(403, 'You can only create teams under your own franchise.')
        return user
    if resource_name == 'players':
        user = require_franchise_scoped_access(request)
        if user.get('role') == 'franchise_admin':
            ensure_franchise_scoped_team_access(int(payload.get('team_id') or 0), user)
        return user
    if resource_name in {'franchises', 'venues'}:
        return require_super_admin_access(request, f'Only the super admin can create {resource_name}.')
    return require_privileged_access(request)


def require_item_write_access(resource_name: str, request: Request, existing_record: dict[str, Any], next_record: dict[str, Any], method: str) -> dict[str, Any]:
    if resource_name in {'approvals', 'auctions', 'performances'}:
        return require_super_admin_access(request, f'Only the super admin can modify {resource_name}.')
    if resource_name == 'invoices':
        if method == 'DELETE':
            return require_super_admin_access(request, 'Only the super admin can delete finance records.')
        return require_finance_access(request)
    if resource_name == 'matches':
        return require_match_operations_access(request)
    if resource_name == 'franchises':
        user = require_franchise_scoped_access(request)
        if user.get('role') == 'franchise_admin':
            if method == 'DELETE':
                api_error(403, 'Only the super admin can delete franchise records.')
            if str(existing_record.get('id') or '') != str(user.get('franchiseId') or ''):
                api_error(403, 'You can only update your own franchise.')
        return user
    if resource_name == 'teams':
        user = require_franchise_scoped_access(request)
        if user.get('role') == 'franchise_admin':
            if method == 'DELETE':
                api_error(403, 'Only the super admin can delete team records.')
            if str(existing_record.get('franchise_id') or '') != str(user.get('franchiseId') or ''):
                api_error(403, 'You can only update teams that belong to your own franchise.')
            if str(next_record.get('franchise_id') or existing_record.get('franchise_id') or '') != str(user.get('franchiseId') or ''):
                api_error(403, 'You cannot move a team outside your own franchise.')
        return user
    if resource_name == 'players':
        user = require_franchise_scoped_access(request)
        if user.get('role') == 'franchise_admin':
            if method == 'DELETE':
                api_error(403, 'Only the super admin can delete player records.')
            ensure_franchise_scoped_team_access(int(next_record.get('team_id') or existing_record.get('team_id') or 0), user)
        return user
    if resource_name == 'venues':
        return require_super_admin_access(request, f"Only the super admin can {'delete' if method == 'DELETE' else 'update'} venues.")
    return require_privileged_access(request)


def serve_frontend_index():
    index_path = FRONTEND_DIST_DIR / 'index.html'
    if index_path.exists():
        return FileResponse(index_path)
    return None


@app.get('/')
def root():
    frontend_index = serve_frontend_index()
    if frontend_index is not None:
        return frontend_index
    return {'message': 'SPL Python API server is running.', 'api': '/api/', 'health': '/api/health/'}


@app.get('/api')
@app.get('/api/')
def api_index() -> dict[str, Any]:
    return {
        'name': 'SPL SQL API',
        'version': settings.api_version,
        'resources': [
            *[
                {'resource': resource, 'collection': f'/api/{resource}/', 'item': f'/api/{resource}/:id/'}
                for resource in RESOURCE_CONFIG.keys()
            ],
            {'resource': 'home', 'collection': '/api/home/', 'sections': [f'/api/home/{section}/' for section in PROJECT_DATA_CONFIG['home']['sections']]},
            {'resource': 'live-match', 'collection': '/api/live-match/'},
            {'resource': 'admin-dashboard', 'collection': '/api/admin/dashboard/', 'sections': ['/api/admin/dashboard/stats/', '/api/admin/dashboard/points-table/', '/api/admin/dashboard/season-progress/', '/api/admin/dashboard/live-now/', '/api/admin/dashboard/recent-activity/', '/api/admin/dashboard/top-performers/']},
            {'resource': 'admin-search', 'collection': '/api/admin/search/'},
            {'resource': 'admin-analytics', 'collection': '/api/admin/analytics/'},
            {'resource': 'admin-announcements', 'routes': ['/api/admin/announcements/maintenance/']},
            {'resource': 'admin-shell', 'collection': '/api/admin/shell/'},
            {'resource': 'audit-logs', 'collection': '/api/admin/audit-logs/'},
            {'resource': 'auth', 'routes': ['/api/auth/register/', '/api/auth/login/', '/api/auth/me/', '/api/auth/forgot-password/', '/api/auth/reset-password/', '/api/auth/change-password/', '/api/auth/logout/']},
            {'resource': 'franchise-dashboard', 'routes': ['/api/franchise/summary/', '/api/franchise/next-match/', '/api/franchise/notices/', '/api/franchise/squad-summary/', '/api/franchise/budget-trend/']},
            {'resource': 'uploads', 'routes': ['/api/uploads/player-photo/', '/api/uploads/team-logo/', '/api/uploads/franchise-logo/', '/api/uploads/sponsor-logo/', '/api/uploads/admin-avatar/']},
            {'resource': 'metrics', 'collection': '/api/metrics/'},
        ],
        'health': '/api/health/',
    }


@app.get('/api/health')
@app.get('/api/health/')
def api_health() -> dict[str, Any]:
    return {'status': 'ok', 'timestamp': utc_now_iso(), 'version': settings.api_version, **get_database_health()}


@app.get('/api/metrics')
@app.get('/api/metrics/')
def api_metrics() -> dict[str, Any]:
    average_response_time = request_metrics['totalResponseTimeMs'] / max(request_metrics['totalRequests'], 1)
    return {**request_metrics, 'averageResponseTimeMs': round(average_response_time, 2)}


@app.get('/api/auth/me/')
def auth_me(request: Request) -> dict[str, Any]:
    user = get_user_from_authorization_header(request.headers.get('Authorization'))
    if not user:
        api_error(401, 'Authentication token is missing or invalid.')
    return {'user': user}


@app.post('/api/auth/logout/')
def auth_logout(request: Request) -> dict[str, Any]:
    append_audit_log_safe(request, action='auth.logout', resource_name='auth_users')
    return {'message': 'Logged out successfully. Clear the client session token.'}


@app.post('/api/auth/register/')
async def auth_register(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
        response = register_user(payload)
        append_audit_log_safe(request, user=response.get('user'), action='auth.register', resource_name='auth_users', resource_id=response.get('user', {}).get('id'), detail={'email': response.get('user', {}).get('email'), 'role': response.get('user', {}).get('role')})
        return response
    except Exception as error:
        api_error(get_error_status(error), str(error))


@app.post('/api/auth/login/')
async def auth_login(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
        response = login_user(payload)
        append_audit_log_safe(request, user=response.get('user'), action='auth.login', resource_name='auth_users', resource_id=response.get('user', {}).get('id'))
        return response
    except Exception as error:
        api_error(get_error_status(error), str(error))

@app.post('/api/auth/forgot-password/')
async def auth_forgot_password(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
        response = request_password_reset(payload.get('email'))
        append_audit_log_safe(request, action='auth.password_reset_request', resource_name='auth_users', detail={'email': payload.get('email')})
        return response
    except Exception as error:
        api_error(get_error_status(error), str(error))


@app.post('/api/auth/reset-password/')
async def auth_reset_password(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
        response = reset_password(payload)
        append_audit_log_safe(request, action='auth.password_reset_complete', resource_name='auth_users')
        return response
    except Exception as error:
        api_error(get_error_status(error), str(error))


@app.post('/api/auth/change-password/')
async def auth_change_password(request: Request) -> dict[str, Any]:
    try:
        user = require_super_admin_access(request, 'Only the super admin can change their password.')
        payload = await request.json()
        if not isinstance(payload, dict):
            api_error(400, 'Request body must be a JSON object.')
        response = change_password(user, payload)
        append_audit_log_safe(request, user=user, action='auth.password_change', resource_name='auth_users', resource_id=int(user.get('id') or 0))
        return response
    except Exception as error:
        api_error(get_error_status(error), str(error))


@app.get('/api/admin/dashboard/')
def admin_dashboard_root(request: Request) -> Any:
    require_super_admin_access(request, 'Only the super admin can access the main admin dashboard.')
    return get_admin_dashboard_section(None)


@app.get('/api/admin/dashboard/{section}/')
def admin_dashboard_section(section: str, request: Request) -> Any:
    require_super_admin_access(request, 'Only the super admin can access the main admin dashboard.')
    payload = get_admin_dashboard_section(section)
    if payload is None:
        api_error(404, 'Admin dashboard section not found.')
    return payload


@app.get('/api/admin/analytics/')
def admin_analytics(request: Request) -> dict[str, Any]:
    require_super_admin_access(request, 'Only the super admin can access admin analytics.')
    return build_admin_analytics_payload()


@app.get('/api/admin/users/')
def admin_users(request: Request) -> dict[str, Any]:
    require_super_admin_access(request, 'Only the super admin can manage user access.')
    items = list_admin_users()
    return {'items': items, 'total': len(items)}


@app.patch('/api/admin/users/{user_id}/')
@app.put('/api/admin/users/{user_id}/')
async def admin_user_update(user_id: int, request: Request) -> dict[str, Any]:
    user = require_super_admin_access(request, 'Only the super admin can manage user access.')
    payload = await request.json()
    if not isinstance(payload, dict):
        api_error(400, 'Request body must be a JSON object.')

    updated_user = update_admin_user_access(user, user_id, payload)
    append_audit_log_safe(
        request,
        user=user,
        action=f'admin.users.{request.method.lower()}',
        resource_name='auth_users',
        resource_id=int(updated_user.get('id') or user_id),
        detail={
            'role': updated_user.get('role'),
            'status': updated_user.get('status'),
            'franchiseId': updated_user.get('franchiseId'),
        },
    )
    return updated_user


@app.get('/api/admin/announcements/maintenance/')
def admin_maintenance_notice(request: Request) -> dict[str, Any]:
    require_super_admin_access(request, 'Only the super admin can manage maintenance announcements.')
    return get_admin_maintenance_notice()


@app.patch('/api/admin/announcements/maintenance/')
@app.put('/api/admin/announcements/maintenance/')
async def admin_maintenance_notice_update(request: Request) -> dict[str, Any]:
    user = require_super_admin_access(request, 'Only the super admin can manage maintenance announcements.')
    payload = await request.json()
    if not isinstance(payload, dict):
        api_error(400, 'Request body must be a JSON object.')
    current_notice = get_admin_maintenance_notice()
    saved_notice = persist_admin_maintenance_notice(current_notice, payload, user)
    append_audit_log_safe(
        request,
        user=user,
        action=f"admin.announcements.maintenance.{request.method.lower()}",
        resource_name='project_content',
        detail=saved_notice,
    )
    return saved_notice


@app.get('/api/admin/shell/')
def admin_shell(request: Request) -> dict[str, Any]:
    user = require_privileged_access(request)
    return get_admin_shell_payload(user)


@app.patch('/api/admin/shell/profile/')
async def admin_shell_profile_patch(request: Request) -> dict[str, Any]:
    user = require_privileged_access(request)
    payload = await request.json()
    next_full_name = str(payload.get('fullName') or user.get('fullName') or '').strip()
    next_avatar = str(payload.get('avatar') or user.get('avatar') or '').strip()
    if next_avatar != str(user.get('avatar') or ''):
        update_user_avatar(int(user.get('id') or 0), next_avatar)
    if next_full_name and next_full_name != str(user.get('fullName') or ''):
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE dbo.auth_users SET full_name = ?, updated_at = ? WHERE id = ?;', (next_full_name, utc_now_iso(), int(user.get('id') or 0)))
            conn.commit()
    refreshed_user = get_user_from_authorization_header(f"Bearer {create_session_token({**user, 'fullName': next_full_name, 'avatar': next_avatar})}") or {**user, 'fullName': next_full_name, 'avatar': next_avatar}
    append_audit_log_safe(request, user=user, action='admin-shell.profile.patch', resource_name='auth_users', resource_id=int(user.get('id') or 0), detail={'fullName': next_full_name, 'avatar': next_avatar})
    return {'user': refreshed_user, 'shell': get_admin_shell_payload(refreshed_user)}


@app.get('/api/admin/audit-logs/')
def admin_audit_logs(request: Request, limit: int = 100) -> list[dict[str, Any]]:
    require_super_admin_access(request, 'Only the super admin can access audit logs.')
    return list_audit_logs(limit)


@app.get('/api/admin/search/')
def admin_search(request: Request) -> dict[str, Any]:
    user = require_privileged_access(request)
    return get_admin_search_payload(user, dict(request.query_params))


@app.get('/api/franchise/summary/')
def franchise_summary(request: Request) -> Any:
    user = require_franchise_dashboard_access(request)
    payload = get_franchise_dashboard_section('summary', user, dict(request.query_params))
    if payload is None:
        api_error(404, 'Franchise dashboard context not found.')
    return payload


@app.get('/api/franchise/next-match/')
def franchise_next_match(request: Request) -> Any:
    user = require_franchise_dashboard_access(request)
    payload = get_franchise_dashboard_section('next-match', user, dict(request.query_params))
    if payload is None:
        api_error(404, 'Franchise dashboard context not found.')
    return payload


@app.get('/api/franchise/notices/')
def franchise_notices(request: Request) -> Any:
    user = require_franchise_dashboard_access(request)
    payload = get_franchise_dashboard_section('notices', user, dict(request.query_params))
    if payload is None:
        api_error(404, 'Franchise dashboard context not found.')
    return payload


@app.get('/api/franchise/squad-summary/')
def franchise_squad_summary(request: Request) -> Any:
    user = require_franchise_dashboard_access(request)
    payload = get_franchise_dashboard_section('squad-summary', user, dict(request.query_params))
    if payload is None:
        api_error(404, 'Franchise dashboard context not found.')
    return payload


@app.get('/api/franchise/budget-trend/')
def franchise_budget_trend(request: Request) -> Any:
    user = require_franchise_dashboard_access(request)
    payload = get_franchise_dashboard_section('budget-trend', user, dict(request.query_params))
    if payload is None:
        api_error(404, 'Franchise dashboard context not found.')
    return payload


@app.get('/api/home/')
def home_root() -> dict[str, Any]:
    return get_home_payload()


@app.get('/api/home/{section}/')
def home_section(section: str) -> Any:
    payload = get_home_payload()
    key = PROJECT_DATA_CONFIG['home']['sections'].get(section)
    if not key:
        api_error(404, 'Project API section not found.')
    return payload.get(key)


@app.patch('/api/home/{section}/')
@app.put('/api/home/{section}/')
async def home_section_update(section: str, request: Request) -> Any:
    user = require_super_admin_access(request, 'Only the super admin can update website content.')
    payload = await request.json()
    if not isinstance(payload, dict):
        api_error(400, 'Request body must be a JSON object.')
    resource = get_project_data('home') or {}
    key = PROJECT_DATA_CONFIG['home']['sections'].get(section)
    if not key:
        api_error(404, 'Project API section not found.')
    next_data = {**resource, key: {**resource.get(key, {}), **payload} if request.method == 'PATCH' and isinstance(resource.get(key), dict) and isinstance(payload, dict) else payload}
    set_project_data('home', next_data)
    append_audit_log_safe(request, user=user, action=f"home.content.{request.method.lower()}", resource_name='project_content', detail={'section': section, 'keys': list(payload.keys())})
    return get_home_payload().get(key)


@app.get('/api/live-match/')
def live_match_root() -> Any:
    return get_project_data('live-match') or {}


@app.put('/api/live-match/')
@app.patch('/api/live-match/')
async def live_match_update(request: Request) -> Any:
    user = require_live_match_control_access(request)
    payload = await request.json()
    if not isinstance(payload, dict):
        api_error(400, 'Request body must be a JSON object.')
    current = get_project_data('live-match') or {}
    next_state = {**current, **payload} if request.method == 'PATCH' else payload
    saved = set_project_data('live-match', next_state)
    append_audit_log_safe(request, user=user, action='live-match.update', resource_name='live-match', detail={'keys': list(payload.keys())})
    return saved


@app.post('/api/uploads/player-photo/')
@app.post('/api/uploads/team-logo/')
@app.post('/api/uploads/franchise-logo/')
@app.post('/api/uploads/sponsor-logo/')
@app.post('/api/uploads/admin-avatar/')
async def upload_asset(request: Request) -> dict[str, Any]:
    path = request.url.path
    payload = await request.json()
    if path.rstrip('/') == '/api/uploads/sponsor-logo':
        user = require_super_admin_access(request, 'Only the super admin can upload sponsor assets.')
        result = save_image_upload(payload, 'sponsors', 'sponsor-logo')
    elif path.rstrip('/') == '/api/uploads/admin-avatar':
        user = require_privileged_access(request)
        result = save_image_upload(payload, 'avatars', 'admin-avatar')
    else:
        user = require_franchise_scoped_access(request)
        folder_name = 'players' if 'player-photo' in path else 'teams' if 'team-logo' in path else 'franchises'
        default_base_name = 'player-photo' if folder_name == 'players' else 'team-logo' if folder_name == 'teams' else 'franchise-logo'
        result = save_image_upload(payload, folder_name, default_base_name)
    append_audit_log_safe(request, user=user, action='upload.asset', resource_name='project_content' if 'sponsor' in path else 'auth_users' if 'admin-avatar' in path else 'players' if 'player' in path else 'teams' if 'team' in path else 'franchises', detail=result)
    return result

@app.get('/api/{resource_name}/')
def collection_get(resource_name: str, request: Request) -> Any:
    if resource_name not in RESOURCE_CONFIG:
        api_error(404, 'API resource not found.')
    require_resource_read_access(resource_name, request)
    records = list_collection(resource_name)
    if resource_name == 'franchises':
        include_all = str(request.query_params.get('includeAll') or request.query_params.get('include_all') or '').strip().lower() in {'1', 'true', 'yes', 'all'}
        user = get_user_from_authorization_header(request.headers.get('Authorization'))
        if include_all:
            if not user or user.get('role') != 'super_admin':
                api_error(403, 'Only the super admin can include inactive franchise records.')
        elif user and user.get('role') == 'franchise_admin':
            resolved = resolve_franchise_context(user, dict(request.query_params))
            records = [resolved['franchise']] if resolved.get('franchise') else []
        else:
            records = get_participating_franchises(records, list_collection('teams'))
    return apply_list_filters(resource_name, records, dict(request.query_params))


@app.post('/api/{resource_name}/')
async def collection_post(resource_name: str, request: Request) -> Any:
    if resource_name not in RESOURCE_CONFIG:
        api_error(404, 'API resource not found.')
    payload = await request.json()
    error, sanitized = sanitize_payload(resource_name, payload)
    if error or sanitized is None:
        api_error(400, error or 'Invalid request body.')
    RESOURCE_CONFIG[resource_name].get('on_create', lambda _record: None)(sanitized)
    relationship_error = validate_resource_relationships(resource_name, sanitized)
    if relationship_error:
        api_error(400, relationship_error)
    user = require_collection_write_access(resource_name, request, sanitized)
    if resource_name == 'players' and user.get('role') == 'franchise_admin':
        sanitized['status'] = 'Pending'
    saved = create_item(resource_name, sanitized)
    if resource_name == 'players' and user.get('role') == 'franchise_admin':
        create_player_registration_approval(saved, user)
    append_audit_log_safe(request, user=user, action=f'{resource_name}.create', resource_name=resource_name, resource_id=int(saved.get('id') or 0), detail=saved)
    return saved


@app.get('/api/{resource_name}/{identifier}/')
def item_get(resource_name: str, identifier: str, request: Request) -> Any:
    if resource_name not in RESOURCE_CONFIG:
        api_error(404, 'API resource not found.')
    require_resource_read_access(resource_name, request)
    record = get_item(resource_name, parse_identifier(identifier))
    if not record:
        api_error(404, f'{resource_name[:-1]} not found.')
    return record


@app.put('/api/{resource_name}/{identifier}/')
@app.patch('/api/{resource_name}/{identifier}/')
async def item_update(resource_name: str, identifier: str, request: Request) -> Any:
    if resource_name not in RESOURCE_CONFIG:
        api_error(404, 'API resource not found.')
    record_id = parse_identifier(identifier)
    existing = get_item(resource_name, record_id)
    if not existing:
        api_error(404, f'{resource_name[:-1]} not found.')
    payload = await request.json()
    error, sanitized = sanitize_payload(resource_name, payload, partial=request.method == 'PATCH')
    if error or sanitized is None:
        api_error(400, error or 'Invalid request body.')
    updated = {**existing, **sanitized, 'id': record_id} if request.method == 'PATCH' else {'id': record_id, **sanitized}
    RESOURCE_CONFIG[resource_name].get('on_create', lambda _record: None)(updated)
    relationship_error = validate_resource_relationships(resource_name, updated)
    if relationship_error:
        api_error(400, relationship_error)
    user = require_item_write_access(resource_name, request, existing, updated, request.method)
    saved = replace_item(resource_name, record_id, updated)
    if not saved:
        api_error(404, f'{resource_name[:-1]} not found.')
    if resource_name == 'approvals':
        sync_approval_side_effects(saved)
    append_audit_log_safe(request, user=user, action=f"{resource_name}.{'patch' if request.method == 'PATCH' else 'update'}", resource_name=resource_name, resource_id=record_id, detail={'before': existing, 'after': saved})
    return saved


@app.delete('/api/approvals/{identifier}/rejected-franchise-registration/')
def rejected_franchise_registration_delete(identifier: str, request: Request) -> Response:
    record_id = parse_identifier(identifier)
    existing = get_item('approvals', record_id)
    if not existing:
        api_error(404, 'approval not found.')
    user = require_super_admin_access(request, 'Only the super admin can delete rejected franchise registrations.')
    deleted = cleanup_rejected_franchise_registration(existing)
    append_audit_log_safe(
        request,
        user=user,
        action='approvals.delete_rejected_franchise_registration',
        resource_name='approvals',
        resource_id=record_id,
        detail={**deleted, 'approval': existing},
    )
    return Response(status_code=204)


@app.delete('/api/{resource_name}/{identifier}/')
def item_delete(resource_name: str, identifier: str, request: Request) -> Response:
    if resource_name not in RESOURCE_CONFIG:
        api_error(404, 'API resource not found.')
    record_id = parse_identifier(identifier)
    existing = get_item(resource_name, record_id)
    if not existing:
        api_error(404, f'{resource_name[:-1]} not found.')
    user = require_item_write_access(resource_name, request, existing, existing, 'DELETE')
    delete_item(resource_name, record_id)
    append_audit_log_safe(request, user=user, action=f'{resource_name}.delete', resource_name=resource_name, resource_id=record_id, detail=existing)
    return Response(status_code=204)


@app.get('/{full_path:path}')
def serve_frontend(full_path: str):
    requested_path = (FRONTEND_DIST_DIR / full_path).resolve()
    if str(requested_path).startswith(str(FRONTEND_DIST_DIR.resolve())) and requested_path.is_file():
        download_media_type = DOWNLOAD_EXTENSION_MAP.get(requested_path.suffix.lower())
        if download_media_type:
            return FileResponse(
                requested_path,
                media_type=download_media_type,
                filename=requested_path.name,
            )
        return FileResponse(requested_path)
    frontend_index = serve_frontend_index()
    if frontend_index is not None:
        return frontend_index
    api_error(404, 'Route not found.')
