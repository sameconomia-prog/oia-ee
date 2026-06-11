import os

# Env vars requeridas por api.deps y api.routers.auth antes del import
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key-for-pytest-only")
os.environ.setdefault("LOGIN_RATE_LIMIT_TIMES", "10000")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pipeline.db.models import Base
from pipeline.db import models_imss  # noqa: F401 — registers tables with Base
from pipeline.db import models_enoe  # noqa: F401 — registers tables with Base
from pipeline.db import models_apikey  # noqa: F401 — registers tables with Base


@pytest.fixture(scope="session")
def engine():
    eng = create_engine("sqlite+pysqlite:///:memory:", echo=False)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture
def session(engine):
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.rollback()
    s.close()


