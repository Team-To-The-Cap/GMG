#!/usr/bin/env python3
"""
MeetingPlace 테이블에 이동시간 관련 컬럼 추가 스크립트

실행 방법:
    python3 add_travel_time_columns.py
"""

import sys
import os
from sqlalchemy import create_engine, text, inspect

# 현재 스크립트의 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

# 데이터베이스 URL 설정 (database.py와 동일한 설정 사용)
SQLALCHEMY_DATABASE_URL = "postgresql://duram:duram@localhost:5432/mydatabase"

def add_travel_time_columns():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    conn = None
    try:
        conn = engine.connect()
        inspector = inspect(engine)
        table_names = inspector.get_table_names()

        if "meeting_places" not in table_names:
            print("❌ Table 'meeting_places' does not exist. Skipping column addition.")
            return

        columns = inspector.get_columns("meeting_places")
        column_names = [col["name"] for col in columns]

        if "travel_time_from_prev" not in column_names:
            print("Adding column 'travel_time_from_prev' to 'meeting_places' table...")
            conn.execute(text("ALTER TABLE meeting_places ADD COLUMN travel_time_from_prev INTEGER NULL;"))
            print("✅ Column 'travel_time_from_prev' added successfully.")
        else:
            print("⚠️  Column 'travel_time_from_prev' already exists.")

        if "travel_mode_from_prev" not in column_names:
            print("Adding column 'travel_mode_from_prev' to 'meeting_places' table...")
            conn.execute(text("ALTER TABLE meeting_places ADD COLUMN travel_mode_from_prev VARCHAR(50) NULL;"))
            print("✅ Column 'travel_mode_from_prev' added successfully.")
        else:
            print("⚠️  Column 'travel_mode_from_prev' already exists.")

        conn.commit()
        print("\n✅ Successfully completed column addition process")

    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_travel_time_columns()

