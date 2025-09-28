# quick_check.py
import os
from sqlalchemy import create_engine, text
engine = create_engine(os.getenv("DATABASE_URL", "postgresql://gmg:gmg@localhost:5432/gmg"))
with engine.connect() as c:
    print(c.execute(text("SELECT indexname FROM pg_indexes WHERE tablename='places';")).all())
