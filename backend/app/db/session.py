from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker
from starlette.requests import Request

from app.core.config import Settings


def build_engine(settings: Settings) -> Engine:
    url = make_url(settings.database_url)
    connect_args = {}
    if url.get_backend_name() == "sqlite":
        connect_args["check_same_thread"] = False
        if url.database and url.database != ":memory:" and not url.database.startswith("file:"):
            database_path = Path(url.database).expanduser()
            database_path.resolve().parent.mkdir(parents=True, exist_ok=True)
            database_path.touch(mode=0o600, exist_ok=True)
            try:
                database_path.chmod(0o600)
            except OSError:
                pass
    elif url.get_backend_name() == "postgresql":
        connect_args["connect_timeout"] = 10
        if url.host and "neon.tech" in url.host and "sslmode" not in url.query:
            connect_args["sslmode"] = "require"

    engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    if url.get_backend_name() == "sqlite":
        event.listen(engine, "connect", _enable_sqlite_foreign_keys)
        event.listen(engine, "begin", _begin_sqlite_transaction)
    return engine


def _enable_sqlite_foreign_keys(connection, _) -> None:
    connection.isolation_level = None
    cursor = connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


def _begin_sqlite_transaction(connection) -> None:
    connection.exec_driver_sql("BEGIN")


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def upgrade_database(engine: Engine, settings: Settings) -> None:
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect
    from app.core.config import BACKEND_ROOT

    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    config.set_main_option("sqlalchemy.url", settings.database_url)

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if "alembic_version" not in existing_tables:
        if "users" in existing_tables and "user_sessions" in existing_tables:
            command.stamp(config, "head")
        else:
            command.upgrade(config, "head")
    else:
        command.upgrade(config, "head")


def get_session(request: Request) -> Iterator[Session]:
    with request.app.state.session_factory() as session:
        yield session
