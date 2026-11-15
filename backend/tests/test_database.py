from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import Column, Integer, String, select
from sqlalchemy.engine import Engine

from app.core.config import Settings
from app.db.base import Base
from app.db.session import build_engine, build_session_factory, get_session


class SessionTestRecord(Base):
    __tablename__ = "session_test_records"

    id = Column(Integer, primary_key=True)
    value = Column(String, nullable=False)


@pytest.fixture
def engine(tmp_path: Path) -> Iterator[Engine]:
    database_url = f"sqlite:///{(tmp_path / 'session-test.db').as_posix()}"
    test_engine = build_engine(Settings(database_url=database_url, _env_file=None))
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


def test_session_dependency_closes_session(engine: Engine, monkeypatch) -> None:
    factory = build_session_factory(engine)
    closed: list[bool] = []
    session = factory()
    original_close = session.close

    def close() -> None:
        closed.append(True)
        original_close()

    session.close = close
    request = SimpleNamespace(
        app=SimpleNamespace(
            state=SimpleNamespace(session_factory=lambda: session),
        ),
    )

    dependency = get_session(request)
    assert next(dependency) is session
    with pytest.raises(StopIteration):
        next(dependency)

    assert closed == [True]


def test_transaction_commits_on_success(engine: Engine) -> None:
    factory = build_session_factory(engine)

    with factory.begin() as session:
        session.add(SessionTestRecord(value="committed"))

    with factory() as session:
        values = session.scalars(select(SessionTestRecord.value)).all()

    assert values == ["committed"]


def test_transaction_rolls_back_on_error(engine: Engine) -> None:
    factory = build_session_factory(engine)

    with pytest.raises(RuntimeError, match="abort transaction"):
        with factory.begin() as session:
            session.add(SessionTestRecord(value="rolled back"))
            raise RuntimeError("abort transaction")

    with factory() as session:
        values = session.scalars(select(SessionTestRecord.value)).all()

    assert values == []


def test_sqlite_foreign_keys_are_enabled(engine: Engine) -> None:
    with engine.connect() as connection:
        enabled = connection.exec_driver_sql("PRAGMA foreign_keys").scalar_one()

    assert enabled == 1


def test_postgresql_database_url_builds_engine_without_connecting() -> None:
    settings = Settings(
        database_url="postgresql://astroorbitx:placeholder@localhost/astroorbitx",
        _env_file=None,
    )
    postgresql_engine = build_engine(settings)
    try:
        assert postgresql_engine.dialect.name == "postgresql"
        assert postgresql_engine.dialect.driver == "psycopg2"
    finally:
        postgresql_engine.dispose()
