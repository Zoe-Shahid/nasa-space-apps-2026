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


def main() -> None:
    parser = argparse.ArgumentParser(description="Explicit local-only prototype provisioning.")
    commands = parser.add_subparsers(dest="command", required=True)
    provision = commands.add_parser("provision-profile", help="Create one synthetic profile and no records.")
    provision.add_argument("--display-name", required=True)
    provision.add_argument("--id", type=uuid.UUID)
    args = parser.parse_args()

    try:
        profile_id = provision_profile(get_settings(), args.display_name, args.id)
    except ValueError as error:
        parser.error(str(error))
    print(profile_id)


if __name__ == "__main__":
    main()
