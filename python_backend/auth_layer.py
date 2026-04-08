from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from typing import Any

from .config import settings
from .db_layer import (
    create_item,
    ensure_demo_auth_account,
    fetch_one,
    get_connection,
    get_item,
    get_next_id,
    is_valid_email_address,
    replace_item,
    utc_now_iso,
)


SESSION_TTL_MS = 1000 * 60 * 60 * 12
RESET_TOKEN_TTL_MS = 1000 * 60 * 15
PUBLIC_REGISTRATION_ROLES = {"fan_user", "franchise_admin"}
ADMIN_ROLES = {
    "super_admin",
    "ops_manager",
    "franchise_admin",
    "scorer",
    "finance_admin",
}
PLATFORM_ADMIN_ROLES = {"super_admin", "ops_manager", "scorer", "finance_admin"}
FRANCHISE_DASHBOARD_ROLES = {"super_admin", "franchise_admin"}
FRANCHISE_APPROVAL_META_PREFIX = "__SPL_FRANCHISE_REG__"
DEMO_RECOVERY_PASSWORDS = {
    "admin@spl.local": "Spl@12345",
    "ops@spl.local": "Spl@12345",
    "franchise@spl.local": "Spl@12345",
    "scorer@spl.local": "Spl@12345",
    "finance@spl.local": "Spl@12345",
    "fan@spl.local": "Spl@12345",
    "fans@spl.com": "Spl@12345",
}


@dataclass
class AuthError(Exception):
    message: str
    status_code: int = 400

    def __str__(self) -> str:
        return self.message


def normalize_email(email: Any = "") -> str:
    return str(email or "").strip().lower()


def validate_password_strength(password: str = "") -> bool:
    return (
        len(password) >= 8
        and any(char.isupper() for char in password)
        and any(char.islower() for char in password)
        and any(char.isdigit() for char in password)
        and any(not char.isalnum() for char in password)
    )


def hash_password(password: str, salt: str | None = None) -> dict[str, Any]:
    salt_value = salt or secrets.token_hex(16)
    iterations = 120000
    key_length = 64
    digest = "sha512"
    password_hash = hashlib.pbkdf2_hmac(
        digest,
        password.encode("utf-8"),
        bytes.fromhex(salt_value),
        iterations,
        key_length,
    ).hex()
    return {
        "salt": salt_value,
        "iterations": iterations,
        "keyLength": key_length,
        "digest": digest,
        "passwordHash": password_hash,
    }


def verify_password(password: str, user_record: dict[str, Any]) -> bool:
    derived_hash = hashlib.pbkdf2_hmac(
        str(user_record.get("digest") or "sha512"),
        password.encode("utf-8"),
        bytes.fromhex(str(user_record.get("salt") or "")),
        int(user_record.get("iterations") or 120000),
        int(user_record.get("keyLength") or 64),
    ).hex()
    return hmac.compare_digest(derived_hash, str(user_record.get("passwordHash") or ""))


def sanitize_auth_user(user_record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user_record.get("id"),
        "fullName": user_record.get("fullName"),
        "email": user_record.get("email"),
        "employeeId": user_record.get("employeeId"),
        "franchiseId": user_record.get("franchiseId"),
        "role": user_record.get("role"),
        "status": user_record.get("status"),
        "avatar": user_record.get("avatar") or "",
        "createdAt": user_record.get("createdAt"),
    }


def _to_base64_url(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("utf-8").rstrip("=")


def _from_base64_url(value: str) -> str:
    padded = value + ("=" * ((4 - len(value) % 4) % 4))
    return base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")


def sign_token(user: dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(__import__("time").time() * 1000)
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "franchiseId": user.get("franchiseId"),
        "iat": now,
        "exp": now + SESSION_TTL_MS,
    }
    encoded_header = _to_base64_url(json.dumps(header, separators=(",", ":")))
    encoded_payload = _to_base64_url(json.dumps(payload, separators=(",", ":")))
    unsigned = f"{encoded_header}.{encoded_payload}"
    signature = base64.urlsafe_b64encode(
        hmac.new(settings.auth_secret.encode("utf-8"), unsigned.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8").rstrip("=")
    return f"{unsigned}.{signature}"


def verify_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    parts = str(token).split(".")
    if len(parts) != 3:
        return None
    encoded_header, encoded_payload, signature = parts
    unsigned = f"{encoded_header}.{encoded_payload}"
    expected = base64.urlsafe_b64encode(
        hmac.new(settings.auth_secret.encode("utf-8"), unsigned.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8").rstrip("=")
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = json.loads(_from_base64_url(encoded_payload))
    except Exception:
        return None
    if int(payload.get("exp") or 0) <= int(__import__("time").time() * 1000):
        return None
    return payload


def map_auth_user_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(record.get("id") or 0),
        "fullName": record.get("full_name") or "",
        "email": record.get("email") or "",
        "employeeId": record.get("employee_id") or "",
        "franchiseId": record.get("franchise_id"),
        "role": record.get("role") or "",
        "status": record.get("status") or "",
        "salt": record.get("salt") or "",
        "iterations": int(record.get("iterations") or 120000),
        "keyLength": int(record.get("key_length") or 64),
        "digest": record.get("digest") or "sha512",
        "passwordHash": record.get("password_hash") or "",
        "avatar": record.get("avatar") or "",
        "createdAt": record.get("created_at") or "",
        "updatedAt": record.get("updated_at") or "",
    }


def find_user_by_email(email: str) -> dict[str, Any] | None:
    row = fetch_one(
        """
SELECT TOP 1 id, full_name, email, employee_id, franchise_id, role, status,
  salt, iterations, key_length, digest, password_hash, avatar, created_at, updated_at
FROM dbo.auth_users
WHERE email = ?;
""",
        (normalize_email(email),),
    )
    return map_auth_user_record(row) if row else None


def find_user_by_id(user_id: int) -> dict[str, Any] | None:
    row = fetch_one(
        """
SELECT TOP 1 id, full_name, email, employee_id, franchise_id, role, status,
  salt, iterations, key_length, digest, password_hash, avatar, created_at, updated_at
FROM dbo.auth_users
WHERE id = ?;
""",
        (int(user_id),),
    )
    return map_auth_user_record(row) if row else None


def create_auth_response(user: dict[str, Any]) -> dict[str, Any]:
    return {"token": sign_token(user), "user": sanitize_auth_user(user)}


def create_session_token(user: dict[str, Any]) -> str:
    return sign_token(user)


def build_franchise_approval_notes(*, franchise_id: int, user_id: int, franchise_name: str, full_name: str, email: str, employee_id: str, address: str, website: str) -> str:
    meta = json.dumps(
        {
            "franchiseId": franchise_id,
            "userId": user_id,
            "franchiseName": franchise_name,
            "fullName": full_name,
            "email": email,
            "employeeId": employee_id,
            "address": address,
            "website": website,
        },
        separators=(",", ":"),
    )
    return "\n".join(
        [
            f"{FRANCHISE_APPROVAL_META_PREFIX}{meta}",
            f"Franchise registration submitted for {franchise_name}.",
        ]
    )


def parse_franchise_approval_notes(notes: str = "") -> dict[str, Any] | None:
    first_line = str(notes or "").splitlines()[0] if notes else ""
    if not first_line.startswith(FRANCHISE_APPROVAL_META_PREFIX):
        return None
    try:
        return json.loads(first_line[len(FRANCHISE_APPROVAL_META_PREFIX) :])
    except Exception:
        return None

def create_franchise_admin_registration(payload: dict[str, Any]) -> dict[str, Any]:
    full_name = str(payload.get("fullName") or "").strip()
    email = normalize_email(payload.get("email"))
    employee_id = str(payload.get("employeeId") or "").strip().upper()
    password = str(payload.get("password") or "")
    franchise_name = str(payload.get("franchiseName") or "").strip()
    address = str(payload.get("address") or "").strip()
    website = str(payload.get("website") or "").strip()

    if not franchise_name:
        raise AuthError("Franchise name is required.", 400)

    existing_franchise = fetch_one(
        "SELECT TOP 1 id FROM dbo.franchises WHERE LOWER(LTRIM(RTRIM(company_name))) = LOWER(LTRIM(RTRIM(?)));",
        (franchise_name,),
    )
    if existing_franchise:
        raise AuthError("Franchise name is already registered.", 409)

    next_franchise_id = get_next_id("franchises")
    next_user_id = get_next_id("auth_users")
    next_approval_id = get_next_id("approvals")
    password_data = hash_password(password)
    created_at = utc_now_iso()
    approval_date = created_at[:10]

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO dbo.franchises (id, company_name, owner_name, address, website, logo, status) VALUES (?, ?, ?, ?, ?, ?, ?);",
            (next_franchise_id, franchise_name, full_name, address or None, website or None, None, "Pending"),
        )
        cursor.execute(
            """
INSERT INTO dbo.auth_users (
  id, full_name, email, employee_id, franchise_id, role, status, salt, iterations,
  key_length, digest, password_hash, avatar, created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
""",
            (
                next_user_id,
                full_name,
                email,
                employee_id,
                next_franchise_id,
                "franchise_admin",
                "Active",
                password_data["salt"],
                password_data["iterations"],
                password_data["keyLength"],
                password_data["digest"],
                password_data["passwordHash"],
                None,
                created_at,
            ),
        )
        cursor.execute(
            """
INSERT INTO dbo.approvals (
  id, request_type, requested_by, subject, [date], priority, status, notes
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
""",
            (
                next_approval_id,
                "Franchise Registration",
                franchise_name,
                f"Approve {franchise_name} franchise admin access",
                approval_date,
                "High",
                "Pending",
                build_franchise_approval_notes(
                    franchise_id=next_franchise_id,
                    user_id=next_user_id,
                    franchise_name=franchise_name,
                    full_name=full_name,
                    email=email,
                    employee_id=employee_id,
                    address=address,
                    website=website,
                ),
            ),
        )
        conn.commit()

    user = {
        "id": next_user_id,
        "fullName": full_name,
        "email": email,
        "employeeId": employee_id,
        "franchiseId": next_franchise_id,
        "role": "franchise_admin",
        "status": "Active",
        "avatar": "",
        "createdAt": created_at,
    }
    response = create_auth_response(user)
    response["message"] = "Franchise account created. You can manage your franchise now. It will appear on the home page only after super admin approval."
    response["listingApprovalPending"] = True
    return response


def register_user(payload: dict[str, Any]) -> dict[str, Any]:
    full_name = str(payload.get("fullName") or "").strip()
    email = normalize_email(payload.get("email"))
    employee_id = str(payload.get("employeeId") or "").strip().upper()
    password = str(payload.get("password") or "")
    role = "franchise_admin" if payload.get("role") == "franchise_admin" else "fan_user"

    if not full_name:
        raise AuthError("Full name is required.", 400)
    if not email:
        raise AuthError("Email is required.", 400)
    if not is_valid_email_address(email):
        raise AuthError("Please enter a valid email address.", 400)
    if not employee_id:
        raise AuthError("Employee ID is required.", 400)
    if not validate_password_strength(password):
        raise AuthError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.", 400)
    if payload.get("role") and payload.get("role") not in PUBLIC_REGISTRATION_ROLES:
        raise AuthError("Public registration only supports fan user and franchise admin accounts. Staff and admin accounts are created internally.", 403)
    if find_user_by_email(email):
        raise AuthError("Email is already registered.", 409)

    employee_conflict = fetch_one("SELECT TOP 1 id FROM dbo.auth_users WHERE employee_id = ?;", (employee_id,))
    if employee_conflict:
        raise AuthError("Employee ID is already registered.", 409)

    if role == "franchise_admin":
        return create_franchise_admin_registration(payload)

    next_id = get_next_id("auth_users")
    password_data = hash_password(password)
    created_at = utc_now_iso()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
INSERT INTO dbo.auth_users (
  id, full_name, email, employee_id, franchise_id, role, status, salt, iterations,
  key_length, digest, password_hash, avatar, created_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
""",
            (
                next_id,
                full_name,
                email,
                employee_id,
                None,
                "fan_user",
                "Active",
                password_data["salt"],
                password_data["iterations"],
                password_data["keyLength"],
                password_data["digest"],
                password_data["passwordHash"],
                None,
                created_at,
            ),
        )
        conn.commit()

    return create_auth_response(
        {
            "id": next_id,
            "fullName": full_name,
            "email": email,
            "employeeId": employee_id,
            "franchiseId": None,
            "role": "fan_user",
            "status": "Active",
            "avatar": "",
            "createdAt": created_at,
        }
    )


def login_user(payload: dict[str, Any]) -> dict[str, Any]:
    email = normalize_email(payload.get("email"))
    password = str(payload.get("password") or "")
    role = str(payload.get("role") or "").strip()

    if not email:
        raise AuthError("Email is required.", 400)
    if not password:
        raise AuthError("Password is required.", 400)

    user = find_user_by_email(email)
    if (
        (not user or not verify_password(password, user))
        and DEMO_RECOVERY_PASSWORDS.get(email) == password
    ):
        if ensure_demo_auth_account(email):
            user = find_user_by_email(email)

    if not user or not verify_password(password, user):
        raise AuthError("Invalid email or password.", 401)
    if str(user.get("status") or "").lower() != "active":
        raise AuthError("This account is not active.", 403)
    if role and user.get("role") != role:
        raise AuthError("Selected role does not match your account.", 403)

    return create_auth_response(user)


def get_user_from_authorization_header(authorization_header: str | None) -> dict[str, Any] | None:
    token = str(authorization_header or "").replace("Bearer ", "").replace("bearer ", "").strip()
    payload = verify_token(token)
    if not payload:
        return None
    user = find_user_by_id(int(payload.get("sub") or 0))
    if not user or str(user.get("status") or "").lower() != "active":
        return None
    return sanitize_auth_user(user)


def is_privileged_user(user: dict[str, Any] | None) -> bool:
    return bool(user and user.get("role") in ADMIN_ROLES)


def is_platform_admin(user: dict[str, Any] | None) -> bool:
    return bool(user and user.get("role") in PLATFORM_ADMIN_ROLES)


def can_access_franchise_dashboard(user: dict[str, Any] | None) -> bool:
    return bool(user and user.get("role") in FRANCHISE_DASHBOARD_ROLES)

def request_password_reset(email: str) -> dict[str, Any]:
    normalized_email = normalize_email(email)
    if not normalized_email:
        raise AuthError("Email is required.", 400)

    user = find_user_by_email(normalized_email)
    if not user:
        return {"message": "If the email exists, password reset instructions have been generated."}

    raw_token = secrets.token_hex(24)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    next_reset_token_id = get_next_id("password_reset_tokens")
    expires_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc) + __import__("datetime").timedelta(milliseconds=RESET_TOKEN_TTL_MS)
    created_at = utc_now_iso()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.password_reset_tokens WHERE user_id = ? AND used_at IS NULL;", (user["id"],))
        cursor.execute(
            "INSERT INTO dbo.password_reset_tokens (id, user_id, token_hash, expires_at, created_at, used_at) VALUES (?, ?, ?, ?, ?, NULL);",
            (next_reset_token_id, user["id"], token_hash, expires_at.isoformat().replace("+00:00", "Z"), created_at),
        )
        conn.commit()

    return {
        "message": "Password reset instructions have been generated for this account.",
        "resetToken": raw_token,
    }


def reset_password(payload: dict[str, Any]) -> dict[str, Any]:
    token = str(payload.get("token") or "").strip()
    password = str(payload.get("password") or "")
    if not token:
        raise AuthError("Reset token is required.", 400)
    if not validate_password_strength(password):
        raise AuthError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.", 400)

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    reset_token = fetch_one(
        "SELECT TOP 1 id, user_id, expires_at, used_at FROM dbo.password_reset_tokens WHERE token_hash = ? ORDER BY id DESC;",
        (token_hash,),
    )
    if not reset_token or reset_token.get("used_at") or __import__("datetime").datetime.fromisoformat(str(reset_token["expires_at"]).replace("Z", "+00:00")) <= __import__("datetime").datetime.now(__import__("datetime").timezone.utc):
        raise AuthError("Reset token is invalid or expired.", 400)

    user = find_user_by_id(int(reset_token["user_id"]))
    if not user:
        raise AuthError("Account not found for the reset token.", 404)

    password_data = hash_password(password)
    updated_at = utc_now_iso()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dbo.auth_users SET salt = ?, iterations = ?, key_length = ?, digest = ?, password_hash = ?, updated_at = ? WHERE id = ?;",
            (
                password_data["salt"],
                password_data["iterations"],
                password_data["keyLength"],
                password_data["digest"],
                password_data["passwordHash"],
                updated_at,
                user["id"],
            ),
        )
        cursor.execute("UPDATE dbo.password_reset_tokens SET used_at = ? WHERE id = ?;", (updated_at, int(reset_token["id"])))
        conn.commit()

    return {"message": "Password updated successfully."}


def update_user_avatar(user_id: int, avatar: str) -> dict[str, Any] | None:
    updated_at = utc_now_iso()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dbo.auth_users SET avatar = ?, updated_at = ? WHERE id = ?;",
            (str(avatar or "").strip() or None, updated_at, int(user_id)),
        )
        conn.commit()
    return find_user_by_id(int(user_id))


def sync_franchise_registration_approval(approval_record: dict[str, Any]) -> None:
    if str(approval_record.get("request_type") or "").lower() != "franchise registration":
        return

    meta = parse_franchise_approval_notes(str(approval_record.get("notes") or ""))
    if not meta or not meta.get("franchiseId"):
        return

    normalized_status = str(approval_record.get("status") or "").lower()
    next_status = "Approved" if normalized_status == "approved" else "Rejected" if normalized_status == "rejected" else "Pending"

    franchise = get_item("franchises", int(meta["franchiseId"]))
    if franchise and str(franchise.get("status") or "") != next_status:
        replace_item("franchises", int(meta["franchiseId"]), {**franchise, "status": next_status})
