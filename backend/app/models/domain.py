from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CANONICAL_DOMAINS = (
    "cardiovascular",
    "sleep_fatigue",
    "psychological",
    "musculoskeletal",
    "immune",
    "radiation",
)


class DomainCatalogEntry(Base):
    __tablename__ = "domain_catalog"
    __table_args__ = (
        CheckConstraint(
            "domain_id IN ('cardiovascular', 'sleep_fatigue', 'psychological', "
            "'musculoskeletal', 'immune', 'radiation')",
            name="canonical_domain_id",
        ),
    )

    domain_id: Mapped[str] = mapped_column(String(32), primary_key=True)
