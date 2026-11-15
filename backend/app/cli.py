import argparse
import uuid

from app.core.config import Settings, get_settings
from app.db.session import build_engine, build_session_factory
from app.models.profiles import Profile


def provision_profile(settings: Settings, display_name: str, profile_id: uuid.UUID | None = None) -> uuid.UUID:
    if settings.app_environment == "production":
        raise ValueError("profile provisioning is disabled in production")
    name = display_name.strip()
    if not 1 <= len(name) <= 120:
        raise ValueError("display name must contain 1 to 120 characters")

    engine = build_engine(settings)
    try:
        factory = build_session_factory(engine)
        with factory.begin() as session:
            deterministic_id = uuid.uuid5(uuid.NAMESPACE_URL, f"astroorbitx:synthetic-profile:{name}")
            profile = Profile(id=profile_id or deterministic_id, display_name=name, is_synthetic=True)
            session.add(profile)
            session.flush()
            return profile.id
    finally:
        engine.dispose()


def provision_user(settings: Settings, email: str, password: str, display_name: str) -> uuid.UUID:
    clean_email = email.strip().lower()
    clean_name = display_name.strip()
    if not 3 <= len(clean_email) <= 254 or "@" not in clean_email:
        raise ValueError("invalid email address")
    if len(password) < 12:
        raise ValueError("password must be at least 12 characters")
    if not 1 <= len(clean_name) <= 120:
        raise ValueError("display name must contain 1 to 120 characters")

    from app.core.security import hash_password, utc_now
    from app.models.users import User
    from app.models.profiles import Profile
    from sqlalchemy.exc import IntegrityError

    engine = build_engine(settings)
    try:
        factory = build_session_factory(engine)
        now = utc_now()
        with factory.begin() as session:
            user = User(
                id=uuid.uuid4(),
                email=clean_email,
                password_hash=hash_password(password),
                created_at=now,
                updated_at=now,
            )
            profile = Profile(
                id=uuid.uuid4(),
                user_id=user.id,
                display_name=clean_name,
                is_synthetic=False,
                created_at=now,
                updated_at=now,
            )
            try:
                session.add_all([user, profile])
                session.flush()
            except IntegrityError as error:
                raise ValueError("an account with that email already exists") from error
            return user.id
    finally:
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Explicit local-only prototype provisioning.")
    commands = parser.add_subparsers(dest="command", required=True)
    provision = commands.add_parser("provision-profile", help="Create one synthetic profile and no records.")
    provision.add_argument("--display-name", required=True)
    provision.add_argument("--id", type=uuid.UUID)

    user_provision = commands.add_parser("provision-user", help="Provision a user account.")
    user_provision.add_argument("--email", required=True)
    user_provision.add_argument("--password", required=True)
    user_provision.add_argument("--display-name", required=True)
    args = parser.parse_args()

    try:
        if args.command == "provision-profile":
            result_id = provision_profile(get_settings(), args.display_name, args.id)
        elif args.command == "provision-user":
            result_id = provision_user(get_settings(), args.email, args.password, args.display_name)
        else:
            parser.error("unknown command")
    except ValueError as error:
        parser.error(str(error))
    print(result_id)


if __name__ == "__main__":
    main()
