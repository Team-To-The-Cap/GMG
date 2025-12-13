#!/usr/bin/env python3
"""
meetings 테이블에 meeting_duration 컬럼을 추가하는 마이그레이션 스크립트
"""
import psycopg2
from psycopg2 import sql

# 데이터베이스 연결 정보 (database.py와 동일)
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "mydatabase",
    "user": "duram",
    "password": "duram",
}

def add_meeting_duration_column():
    """meetings 테이블에 meeting_duration 컬럼 추가"""
    conn = None
    try:
        # 데이터베이스 연결
        print(f"데이터베이스에 연결 중... ({DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']})")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 컬럼이 이미 있는지 확인
        check_column_query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='meetings' AND column_name='meeting_duration';
        """
        cursor.execute(check_column_query)
        exists = cursor.fetchone()
        
        if exists:
            print("⚠️  meeting_duration 컬럼이 이미 존재합니다.")
            return
        
        # 컬럼 추가
        alter_table_query = """
        ALTER TABLE meetings 
        ADD COLUMN meeting_duration VARCHAR(20) NULL;
        """
        
        print("meeting_duration 컬럼을 추가 중...")
        cursor.execute(alter_table_query)
        conn.commit()
        
        print("✅ meeting_duration 컬럼이 성공적으로 추가되었습니다!")
        
    except psycopg2.Error as e:
        print(f"❌ 데이터베이스 오류 발생: {e}")
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("데이터베이스 연결 종료")

if __name__ == "__main__":
    add_meeting_duration_column()

