# app/services/course_builder.py

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models
from ..routers.calc_func import save_calculated_places
from ..routers.course import (
    StepInput,
    CourseRequest,
    CourseResponse,
    plan_courses_internal,
)


@dataclass
class MeetingContext:
    meeting: models.Meeting
    plan: Optional[models.MeetingPlan]
    must_visit_places: List[models.MeetingMustVisitPlace]
    participants: List[models.Participant]
    common_dates: List[date]
    center_lat: Optional[float]
    center_lng: Optional[float]


def _build_common_dates(meeting: models.Meeting) -> List[date]:
    dates: set[date] = set()

    for p in meeting.participants:
        for t in p.available_times:
            d = t.start_time.date()
            dates.add(d)

    return sorted(dates)


def load_meeting_context(db: Session, meeting_id: int) -> MeetingContext:
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants)
            .joinedload(models.Participant.available_times),
            joinedload(models.Meeting.plan)
            .joinedload(models.MeetingPlan.available_dates),
            joinedload(models.Meeting.must_visit_places),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    plan = meeting.plan
    common_dates = _build_common_dates(meeting)
    center_lat = plan.latitude if plan else None
    center_lng = plan.longitude if plan else None

    return MeetingContext(
        meeting=meeting,
        plan=plan,
        must_visit_places=meeting.must_visit_places,
        participants=meeting.participants,
        common_dates=common_dates,
        center_lat=center_lat,
        center_lng=center_lng,
    )


# ----------------------------------------
# 1) 프로필 → Step(1/2/3 코스) 설계
# ----------------------------------------

def _normalize_list_field(value: Optional[str]) -> List[str]:
    """
    Meeting.vibe / Meeting.purpose 처럼 comma-separated 로 들어올 수 있는 필드를
    소문자 리스트로 변환.
    """
    if not value:
        return []
    return [v.strip().lower() for v in value.split(",") if v.strip()]


def _pick_activity_query(fav_activities: List[str]) -> str:
    """
    참가자 fav_activity 들을 보고 1코스 '놀거리' 검색어를 선택.
    """
    fav_text = " ".join(fav_activities).lower()

    if any(k in fav_text for k in ["보드게임", "board", "보드"]):
        return "보드게임 카페"
    if any(k in fav_text for k in ["방탈출", "escape"]):
        return "방탈출 카페"
    if any(k in fav_text for k in ["노래방", "karaoke"]):
        return "코인 노래방"
    if any(k in fav_text for k in ["pc방", "pc bang", "pc방"]):
        return "피시방"
    if any(k in fav_text for k in ["전시", "museum", "미술관"]):
        return "전시회"

    return "놀거리"


def build_steps_from_meeting(
    meeting: models.Meeting,
    participants: List[models.Participant],
) -> List[StepInput]:
    """
    Meeting.with_whom / purpose / vibe / budget + 참가자 fav_activity 를 보고
    길이 3 코스를 설계하는 함수.

    대략적인 규칙:
      - purpose=activity / fav_activity 있으면 1코스는 놀거리/체험
      - purpose=meal/drinks 이면 2코스는 식사 위주
      - vibe, budget 에 따라 '가성비 맛집', '고급 한정식', '분위기 좋은 바' 등 검색어 변경
    """
    purposes = _normalize_list_field(meeting.purpose)
    vibes = _normalize_list_field(meeting.vibe)
    with_whom = (meeting.with_whom or "").lower()
    budget = (meeting.budget or "").strip()  # "1","2","3","4" 중 하나라고 가정

    fav_activities = [
        p.fav_activity for p in participants
        if p.fav_activity
    ]

    steps: List[StepInput] = []

    # ---------- 1코스: 가볍게 / 활동 ----------
    wants_activity = any(p in purposes for p in ["activity", "play", "game"])
    has_fav_activity = len(fav_activities) > 0

    if wants_activity or has_fav_activity:
        query = _pick_activity_query(fav_activities)
        steps.append(StepInput(query=query, type="tourist_attraction"))
    else:
        # 회의/미팅이면 조용한 카페부터
        if "meeting" in purposes:
            steps.append(
                StepInput(query="회의하기 좋은 카페", type="cafe")
            )
        # 술자리가 메인인 약속
        elif "drinks" in purposes:
            steps.append(
                StepInput(query="가볍게 한잔하기 좋은 술집", type="bar")
            )
        else:
            # 기본: 가벼운 식사
            steps.append(
                StepInput(query="가볍게 먹기 좋은 식당", type="restaurant")
            )

    # ---------- 2코스: 메인 식사 ----------
    # budget, vibe, with_whom 에 따라 검색어 변경
    if "meal" in purposes or "drinks" in purposes:
        # 가성비 위주
        if "cheap" in vibes or budget == "1":
            query = "가성비 좋은 맛집"
        # 커플 + 분위기 좋은
        elif with_whom == "couple" and ("mood" in vibes or "calm" in vibes):
            query = "분위기 좋은 레스토랑"
        # 직장동료 + 조용/미팅
        elif with_whom == "coworkers" and ("calm" in vibes or "meeting" in purposes):
            query = "조용한 식당"
        # 가족
        elif with_whom == "family":
            query = "가족 모임 하기 좋은 한식당"
        else:
            query = "맛집"
    else:
        # 식사가 주목적이 아니면, 그래도 하나는 식사 넣어둔다.
        query = "근처 맛집"

    steps.append(StepInput(query=query, type="restaurant"))

    # ---------- 3코스: 카페 or 술 ----------
    noisy = any(v in vibes for v in ["noisy-fun", "party"])
    calm = any(v in vibes for v in ["calm"])
    mood = any(v in vibes for v in ["mood"])

    if "drinks" in purposes and noisy:
        # 시끄럽게 놀기 좋은 술집
        steps.append(
            StepInput(query="시끄럽게 놀기 좋은 술집", type="bar")
        )
    elif "drinks" in purposes:
        # 비교적 조용/분위기
        if mood:
            steps.append(
                StepInput(query="분위기 좋은 와인바", type="bar")
            )
        else:
            steps.append(
                StepInput(query="깔끔한 주점", type="bar")
            )
    else:
        # 카페 방향
        if calm or "meeting" in purposes:
            steps.append(
                StepInput(query="조용한 카페", type="cafe")
            )
        elif mood:
            steps.append(
                StepInput(query="분위기 좋은 디저트 카페", type="cafe")
            )
        else:
            steps.append(
                StepInput(query="수다 떨기 좋은 카페", type="cafe")
            )

    # 정확히 3개만 사용
    return steps[:3]


# ----------------------------------------
# 2) 카테고리 매핑 (UI용)
# ----------------------------------------

def _category_for_step_index(idx: int) -> str:
    mapping: Dict[int, str] = {
        0: "activity",    # 1코스: 활동/가벼운 시작
        1: "restaurant",  # 2코스: 식사
        2: "cafe",        # 3코스: 카페/술집
    }
    return mapping.get(idx, "activity")


def _category_for_step(step: StepInput, idx: int) -> str:
    t = (step.type or "").lower()
    q = (step.query or "").lower()

    if t == "restaurant":
        return "restaurant"
    if t in ("cafe", "bar"):
        return "cafe"
    if t in ("tourist_attraction", "movie_theater", "amusement_park"):
        return "activity"

    if "카페" in q or "cafe" in q or "커피" in q:
        return "cafe"
    if "맛집" in q or "식당" in q or "레스토랑" in q:
        return "restaurant"

    return _category_for_step_index(idx)


# ----------------------------------------
# 3) Meeting 기준 코스 생성 + 저장
# ----------------------------------------

def build_and_save_courses_for_meeting(
    db: Session,
    meeting_id: int,
) -> CourseResponse:
    """
    1) MeetingContext 로드 (중간 위치 포함)
    2) profile 기반 step 생성
    3) course.py 내부 로직으로 코스 후보 생성
    4) must-visit 장소를 Course 앞쪽에 포함시켜 MeetingPlace 테이블에 저장
    5) CourseResponse 그대로 반환
    """
    context = load_meeting_context(db, meeting_id)

    if context.center_lat is None or context.center_lng is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Meeting plan (중간 위치)가 설정되어 있지 않습니다. "
                "먼저 시간/장소 자동 계산을 실행해 주세요."
            ),
        )

    # 1) 프로필 + 참가자 선호 기반 step 설계
    steps = build_steps_from_meeting(context.meeting, context.participants)

    # 2) 중심 좌표 기준 코스 요청
    req = CourseRequest(
        center_lat=context.center_lat,
        center_lng=context.center_lng,
        radius=1000,
        steps=steps,
        per_step_limit=5,
    )

    course_response = plan_courses_internal(req)

    # 3) 베스트 코스 하나를 MeetingPlace 후보 리스트로 변환
    best_course = course_response.courses[0]

    auto_candidates: list[dict] = []
    for idx, p in enumerate(best_course.places):
        step_idx = getattr(p, "step_index", idx)
        step_def: Optional[StepInput] = (
            steps[step_idx] if 0 <= step_idx < len(steps) else None
        )
        category = (
            _category_for_step(step_def, step_idx)
            if step_def
            else _category_for_step_index(step_idx)
        )

        auto_candidates.append(
            {
                "name": p.name,
                "poi_name": p.name,
                "address": p.address or "",
                "lat": p.lat,
                "lng": p.lng,
                "category": category,
                "duration": None,
            }
        )

    # 4) must-visit 장소를 코스에 포함
    #    - 좌표(lat,lng)가 있는 것만 MeetingPlace에 넣을 수 있음
    must_visit_candidates: list[dict] = []
    for mv in context.must_visit_places:
        if mv.latitude is None or mv.longitude is None:
            # 좌표 없는 MustVisit은 Meeting.must_visit_places로만 유지 (코스에는 표시 X)
            continue

        # UI에서 티 나도록 [필수] prefix
        label = f"[필수] {mv.name}"

        must_visit_candidates.append(
            {
                "name": label,
                "poi_name": mv.name,
                "address": mv.address or "",
                "lat": mv.latitude,
                "lng": mv.longitude,
                # 카테고리를 따로 모르면 activity 정도로 두거나 None 으로 두어도 OK
                "category": "must_visit",
                "duration": None,
            }
        )

    # 5) 최종 MeetingPlace 후보 순서 구성
    #    - 1차 버전: 필수 장소들 → 자동 추천 3코스
    #    - (원하면 나중에 [필수]를 2코스로 끼워 넣는 로직으로 바꿀 수 있음)
    final_candidates = must_visit_candidates + auto_candidates

    # 6) calc_func.save_calculated_places 재사용
    save_calculated_places(db, meeting_id, final_candidates)

    return course_response