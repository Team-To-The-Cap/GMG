# run_schema.py
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://gmg:gmg@localhost:5432/gmg")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

with engine.begin() as conn:
    with open("db/schema.sql", "r", encoding="utf-8") as f:
        conn.execute(text(f.read()))

print("schema applied ✅")
