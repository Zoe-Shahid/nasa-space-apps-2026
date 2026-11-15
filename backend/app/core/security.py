from __future__ import annotations

import hashlib
import hmac
import secrets
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.models.users import User, UserSession

SESSION_COOKIE = "astroorbitx_session"
CSRF_COOKIE = "astroorbitx_csrf"
SESSION_LIFETIME = timedelta(hours=12)
_LOGIN_ATTEMPTS: dict[str, deque[datetime]] = defaultdict(deque)
_LOGIN_ATTEMPTS_LOCK = Lock()
LOGIN_WINDOW = timedelta(minutes=15)
LOGIN_ATTEMPT_LIMIT = 5


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=64)
    return f"scrypt$16384$8$1${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode(),
            salt=bytes.fromhex(salt_hex),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(bytes.fromhex(digest_hex)),
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError, MemoryError):
        return False


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def csrf_for_session(token: str) -> str:
    return hmac.new(token.encode(), b"astroorbitx-csrf-v1", hashlib.sha256).hexdigest()


@dataclass(frozen=True)
class Principal:
    user: User
    session: UserSession
    token: str


def get_principal(request: Request, session: Session = Depends(get_session)) -> Principal:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401)
    now = utc_now()
    user_session = session.scalar(
        select(UserSession).where(
            UserSession.token_hash == hash_session_token(token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    )
    if user_session is None:
        raise HTTPException(status_code=401)
    user = session.scalar(select(User).where(User.id == user_session.user_id, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=401)
    return Principal(user=user, session=user_session, token=token)


def require_same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if not origin:
        raise HTTPException(status_code=403)
    try:
        parsed = urlsplit(origin)
        origin_value = f"{parsed.scheme}://{parsed.netloc}"
        expected = f"{request.url.scheme}://{request.url.netloc}"
        allowed = {expected}
        allowed.update(request.app.state.settings.effective_cors_origins)
        if parsed.scheme not in {"http", "https"} or origin_value not in allowed:
            raise HTTPException(status_code=403)
        if parsed.path or parsed.query or parsed.fragment or origin.rstrip("/") != origin_value:
            raise HTTPException(status_code=403)
    except ValueError as error:
        raise HTTPException(status_code=403) from error


def require_csrf(request: Request, principal: Principal) -> None:
    require_same_origin(request)
    cookie_token = request.cookies.get(CSRF_COOKIE, "")
    submitted_token = request.headers.get("X-CSRF-Token", "")
    expected = csrf_for_session(principal.token)
    if not cookie_token or not submitted_token:
        raise HTTPException(status_code=403)
    if not hmac.compare_digest(cookie_token, expected) or not hmac.compare_digest(submitted_token, expected):
        raise HTTPException(status_code=403)


def set_session_cookies(request: Request, response, token: str) -> None:
    settings = request.app.state.settings
    host = request.url.hostname
    loopback_development = settings.app_environment == "development" and host in {"localhost", "127.0.0.1", "::1"}
    secure = settings.app_environment == "production" or not loopback_development and settings.app_environment != "test"
    csrf_token = csrf_for_session(token)
    origin = request.headers.get("origin")
    is_cross_origin_https = bool(origin and origin.startswith("https://") and not origin.startswith(f"{request.url.scheme}://{request.url.netloc}"))
    samesite = "none" if is_cross_origin_https else "lax"
    cookie_secure = secure or (samesite == "none")
    response.headers["X-CSRF-Token"] = csrf_token
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        secure=cookie_secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=False,
        secure=cookie_secure,
        samesite=samesite,
        path="/",
    )


def clear_session_cookies(request: Request, response) -> None:
    settings = request.app.state.settings
    host = request.url.hostname
    loopback_development = settings.app_environment == "development" and host in {"localhost", "127.0.0.1", "::1"}
    secure = settings.app_environment == "production" or not loopback_development and settings.app_environment != "test"
    origin = request.headers.get("origin")
    is_cross_origin_https = bool(origin and origin.startswith("https://") and not origin.startswith(f"{request.url.scheme}://{request.url.netloc}"))
    samesite = "none" if is_cross_origin_https else "lax"
    cookie_secure = secure or (samesite == "none")
    response.delete_cookie(SESSION_COOKIE, path="/", secure=cookie_secure, httponly=True, samesite=samesite)
    response.delete_cookie(CSRF_COOKIE, path="/", secure=cookie_secure, httponly=False, samesite=samesite)


def login_rate_limited(key: str, now: datetime | None = None) -> bool:
    current = now or utc_now()
    with _LOGIN_ATTEMPTS_LOCK:
        attempts = _LOGIN_ATTEMPTS[key]
        while attempts and attempts[0] <= current - LOGIN_WINDOW:
            attempts.popleft()
        if not attempts:
            _LOGIN_ATTEMPTS.pop(key, None)
            return False
        return len(attempts) >= LOGIN_ATTEMPT_LIMIT


def record_login_failure(key: str, now: datetime | None = None) -> None:
    current = now or utc_now()
    with _LOGIN_ATTEMPTS_LOCK:
        attempts = _LOGIN_ATTEMPTS[key]
        while attempts and attempts[0] <= current - LOGIN_WINDOW:
            attempts.popleft()
        attempts.append(current)


def clear_login_failures(key: str) -> None:
    with _LOGIN_ATTEMPTS_LOCK:
        _LOGIN_ATTEMPTS.pop(key, None)