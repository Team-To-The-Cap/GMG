# app/routers/meeting_courses.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.course_builder import build_and_save_courses_for_meeting
from .course import CourseResponse  # 동일 DTO 재사용

router = APIRouter(
    prefix="/meetings",
    tags=["Meeting-Courses"],
)


@router.post("/{meeting_id}/courses/auto", response_model=CourseResponse)
def build_auto_course_for_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    """
    - meeting_id 기준으로:
      1) Meeting + participants + plan + must_visit 로드
      2) profile(with_whom/purpose/vibe/budget) 기반으로 코스 step 구성
      3) Google Places + 코스 조합
      4) 베스트 코스를 meeting_places 테이블에 저장
      5) Top K 코스 후보들을 그대로 응답
    """
    return build_and_save_courses_for_meeting(db, meeting_id)