import secrets
import uuid
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    SESSION_COOKIE,
    SESSION_LIFETIME,
    Principal,
    clear_session_cookies,
    get_principal,
    hash_password,
    hash_session_token,
    clear_login_failures,
    login_rate_limited,
    record_login_failure,
    require_csrf,
    require_same_origin,
    set_session_cookies,
    utc_now,
    verify_password,
)
from app.db.session import get_session
from app.models.profiles import Profile
from app.models.users import User, UserSession
from app.schemas.auth import AuthResponse, LoginRequest, MeProfileResponse, ProfilePatch, RegisterRequest, UserResponse

auth_router = APIRouter(prefix="/auth", tags=["authentication"])
me_router = APIRouter(prefix="/me", tags=["authenticated user"])


def _profile_response(user: User, profile: Profile) -> MeProfileResponse:
    return MeProfileResponse(
        id=profile.id,
        email=user.email,
        display_name=profile.display_name,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _new_session(session: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    now = utc_now()
    session.add(
        UserSession(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_session_token(token),
            created_at=now,
            expires_at=now + SESSION_LIFETIME,
        )
    )
    return token


@auth_router.post("/register", response_model=AuthResponse, status_code=201, operation_id="registerUser")
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
) -> AuthResponse:
    require_same_origin(request)
    now = utc_now()
    user = User(id=uuid.uuid4(), email=payload.email, password_hash=hash_password(payload.password), created_at=now, updated_at=now)
    profile = Profile(
        id=uuid.uuid4(),
        user_id=user.id,
        display_name=payload.display_name.strip(),
        is_synthetic=False,
        created_at=now,
        updated_at=now,
    )
    try:
        with session.begin():
            session.add_all([user, profile])
            token = _new_session(session, user)
            session.flush()
    except IntegrityError as error:
        raise HTTPException(status_code=409) from error
    set_session_cookies(request, response, token)
    return AuthResponse(user=UserResponse.model_validate(user), profile=_profile_response(user, profile))


@auth_router.post("/login", response_model=AuthResponse, operation_id="loginUser")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
) -> AuthResponse:
    require_same_origin(request)
    client_address = request.client.host if request.client is not None else "unknown"
    attempt_key = hashlib.sha256(f"{payload.email}|{client_address}".encode()).hexdigest()
    if login_rate_limited(attempt_key):
        raise HTTPException(status_code=429)
    with session.begin():
        user = session.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
        if user is None or not verify_password(payload.password, user.password_hash):
            record_login_failure(attempt_key)
            raise HTTPException(status_code=401)
        profile = session.scalar(select(Profile).where(Profile.user_id == user.id, Profile.is_synthetic.is_(False)))
        if profile is None:
            raise HTTPException(status_code=401)
        old_token = request.cookies.get(SESSION_COOKIE)
        now = utc_now()
        if old_token:
            old_session = session.scalar(select(UserSession).where(UserSession.token_hash == hash_session_token(old_token)))
            if old_session is not None and old_session.revoked_at is None:
                old_session.revoked_at = now
        token = _new_session(session, user)
        session.flush()
    clear_login_failures(attempt_key)
    set_session_cookies(request, response, token)
    return AuthResponse(user=UserResponse.model_validate(user), profile=_profile_response(user, profile))


@auth_router.post("/logout", status_code=204, operation_id="logoutUser")
def logout(
    request: Request,
    response: Response,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> Response:
    require_csrf(request, principal)
    principal.session.revoked_at = utc_now()
    session.commit()
    clear_session_cookies(request, response)
    response.status_code = 204
    return response


@me_router.get("", response_model=AuthResponse, operation_id="getCurrentUser")
def get_me(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> AuthResponse:
    profile = session.scalar(select(Profile).where(Profile.user_id == principal.user.id, Profile.is_synthetic.is_(False)))
    if profile is None:
        raise HTTPException(status_code=401)
    return AuthResponse(user=UserResponse.model_validate(principal.user), profile=_profile_response(principal.user, profile))


@me_router.get("/profile", response_model=MeProfileResponse, operation_id="getMyProfile")
def get_my_profile(
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeProfileResponse:
    profile = session.scalar(select(Profile).where(Profile.user_id == principal.user.id, Profile.is_synthetic.is_(False)))
    if profile is None:
        raise HTTPException(status_code=404)
    return _profile_response(principal.user, profile)


@me_router.patch("/profile", response_model=MeProfileResponse, operation_id="patchMyProfile")
def patch_my_profile(
    payload: ProfilePatch,
    request: Request,
    principal: Principal = Depends(get_principal),
    session: Session = Depends(get_session),
) -> MeProfileResponse:
    require_csrf(request, principal)
    profile = session.scalar(select(Profile).where(Profile.user_id == principal.user.id, Profile.is_synthetic.is_(False)))
    if profile is None:
        raise HTTPException(status_code=404)
    profile.display_name = payload.display_name.strip()
    profile.updated_at = utc_now()
    session.commit()
    return _profile_response(principal.user, profile)