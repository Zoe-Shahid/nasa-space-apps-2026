import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import DateTime, String
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator[datetime]):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include an explicit UTC offset")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class DecimalText(TypeDecorator[str]):
    impl = String(64)
    cache_ok = True

    _pattern = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$")

    def process_bind_param(self, value: str | Decimal | int | float | None, dialect: Dialect) -> str | None:
        if value is None:
            return None
        if isinstance(value, bool):
            raise ValueError("measurement value must be a positive finite decimal")
        raw = str(value)
        if len(raw) > 64 or not self._pattern.fullmatch(raw):
            raise ValueError("measurement value must be a positive finite decimal")
        try:
            decimal_value = Decimal(raw)
        except InvalidOperation as error:
            raise ValueError("measurement value must be a positive finite decimal") from error
        if not decimal_value.is_finite() or decimal_value <= 0:
            raise ValueError("measurement value must be a positive finite decimal")
        return raw

    def process_result_value(self, value: str | None, dialect: Dialect) -> str | None:
        return value
