import uuid

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.profiles import Profile


def list_profiles(session: Session, *, limit: int, offset: int) -> list[Profile]:
    return list(
        session.scalars(
            select(Profile)
            .where(Profile.is_synthetic.is_(True))
            .order_by(desc(Profile.created_at), desc(Profile.id))
            .limit(limit)
            .offset(offset)
        ).all()
    )


def get_profile(session: Session, profile_id: uuid.UUID) -> Profile | None:
    return session.scalar(
        select(Profile).where(Profile.id == profile_id, Profile.is_synthetic.is_(True))
    )
