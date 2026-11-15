import uuid

from sqlalchemy.orm import Session

from app.models.profiles import Profile
from app.repositories.profiles import get_profile as repository_get_profile
from app.repositories.profiles import list_profiles as repository_list_profiles
from app.schemas.profiles import PaginationQuery, ProfileCollection, ProfileResponse


class ProfileNotFound(Exception):
    pass


def _profile_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(id=profile.id, display_name=profile.display_name, is_synthetic=True)


def list_profiles(session: Session, pagination: PaginationQuery) -> ProfileCollection:
    profiles = repository_list_profiles(session, limit=pagination.limit, offset=pagination.offset)
    return ProfileCollection(
        items=[_profile_response(profile) for profile in profiles],
        limit=pagination.limit,
        offset=pagination.offset,
    )


def get_profile(session: Session, profile_id: uuid.UUID) -> ProfileResponse:
    profile = repository_get_profile(session, profile_id)
    if profile is None:
        raise ProfileNotFound
    return _profile_response(profile)
