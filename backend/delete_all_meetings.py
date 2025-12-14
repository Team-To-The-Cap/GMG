#!/usr/bin/env python3
"""
모든 약속(Meeting)을 삭제하는 스크립트
cascade 설정으로 관련된 모든 데이터(participants, plans, places 등)도 함께 삭제됩니다.
"""
import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def delete_all_meetings():
    """모든 약속을 삭제합니다."""
    db = SessionLocal()
    try:
        # 모든 Meeting 조회
        meetings = db.query(models.Meeting).all()
        count = len(meetings)
        
        if count == 0:
            print("삭제할 약속이 없습니다.")
            return
        
        print(f"총 {count}개의 약속을 삭제합니다...")
        
        # 각 Meeting 삭제 (cascade로 관련 데이터도 자동 삭제됨)
        for meeting in meetings:
            db.delete(meeting)
            print(f"  - Meeting ID {meeting.id} 삭제 중...")
        
        db.commit()
        print(f"\n✅ 성공적으로 {count}개의 약속을 삭제했습니다.")
        
        # 확인: 남은 Meeting 수 확인
        remaining = db.query(models.Meeting).count()
        print(f"현재 남은 약속 수: {remaining}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # 확인 메시지
    response = input("⚠️  모든 약속을 삭제하시겠습니까? (yes/no): ")
    if response.lower() != "yes":
        print("취소되었습니다.")
        sys.exit(0)
    
    delete_all_meetings()

