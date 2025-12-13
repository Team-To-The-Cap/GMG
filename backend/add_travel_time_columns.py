#!/usr/bin/env python3
"""
MeetingPlace 테이블에 이동시간 관련 컬럼 추가 스크립트

실행 방법:
    python3 add_travel_time_columns.py
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# 환경 변수에서 DB 정보 가져오기
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "gmg")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def add_travel_time_columns():
    conn = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )
        cursor = conn.cursor()

        # travel_time_from_prev 컬럼 추가
        print("Adding travel_time_from_prev column...")
        cursor.execute("""
            ALTER TABLE meeting_places 
            ADD COLUMN IF NOT EXISTS travel_time_from_prev INTEGER NULL;
        """)

        # travel_mode_from_prev 컬럼 추가
        print("Adding travel_mode_from_prev column...")
        cursor.execute("""
            ALTER TABLE meeting_places 
            ADD COLUMN IF NOT EXISTS travel_mode_from_prev VARCHAR(20) NULL;
        """)

        conn.commit()
        print("✅ Successfully added travel_time_from_prev and travel_mode_from_prev columns to meeting_places table")

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    add_travel_time_columns()

