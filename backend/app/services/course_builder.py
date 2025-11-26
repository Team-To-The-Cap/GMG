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
    """
    이미 calc_func 쪽에 get_common_available_dates_for_meeting가 있지만,
    여기선 그냥 필요하면 간단 버전만 써도 OK.
    (지금 당장은 코스 추천에는 크게 안 쓰여서, 최소 구현으로 둠)
    """
    dates: set[date] = set()

    for p in meeting.participants:
        for t in p.available_times:
            d = t.start_time.date()
            dates.add(d)

    return sorted(dates)


def load_meeting_context(db: Session, meeting_id: int) -> MeetingContext:
    """
    Meeting + participants + plan + must_visit 를 한 번에 로딩.
    """
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


def build_steps_from_meeting(meeting: models.Meeting) -> List[StepInput]:
    """
    Meeting.with_whom / purpose / vibe / budget 을 보고
    3단계 코스를 대략 설계하는 함수.
    """
    purposes = (meeting.purpose or "").split(",") if meeting.purpose else []
    vibes = (meeting.vibe or "").split(",") if meeting.vibe else []

    steps: List[StepInput] = []

    # 1단계: 활동(있으면)
    if any(p in purposes for p in ["activity", "play", "game"]):
        steps.append(StepInput(query="놀거리", type="tourist_attraction"))
    else:
        # 활동이 없으면 가벼운 식사로 시작
        steps.append(StepInput(query="가벼운 식사", type="restaurant"))

    # 2단계: 메인 식사
    steps.append(StepInput(query="맛집", type="restaurant"))

    # 3단계: 카페 or 술집
    if any(v in vibes for v in ["noisy-fun", "party"]):
        steps.append(StepInput(query="술집", type="bar"))
    else:
        steps.append(StepInput(query="카페", type="cafe"))

    # 정확히 3개만 사용
    return steps[:3]


def _category_for_step_index(idx: int) -> str:
    """
    (fallback) step 인덱스만으로 대략적인 카테고리 추정.
    """
    mapping: Dict[int, str] = {
        0: "activity",    # 1코스: 활동/가벼운 시작
        1: "restaurant",  # 2코스: 식사
        2: "cafe",        # 3코스: 카페/술집
    }
    return mapping.get(idx, "activity")


def _category_for_step(step: StepInput, idx: int) -> str:
    """
    StepInput.type / query 를 보고 MeetingPlace.category 를 결정.
    - 프론트의 getCategoryIcon 이 인식할 수 있는 값 위주로 사용:
      restaurant / cafe / shop / activity ...
    """
    t = (step.type or "").lower()
    q = (step.query or "").lower()

    # type 기반 우선
    if t == "restaurant":
        return "restaurant"
    if t in ("cafe", "bar"):
        # bar 는 UI 상에서는 카페/술집 아이콘 하나로 처리
        return "cafe"
    if t in ("tourist_attraction", "movie_theater", "amusement_park"):
        return "activity"

    # query 안에 힌트가 있는 경우
    if "카페" in q or "cafe" in q or "커피" in q:
        return "cafe"
    if "맛집" in q or "식당" in q or "레스토랑" in q:
        return "restaurant"

    # 그래도 모르겠으면 인덱스 기반 대략 값
    return _category_for_step_index(idx)


def build_and_save_courses_for_meeting(
    db: Session,
    meeting_id: int,
) -> CourseResponse:
    """
    1) MeetingContext 로드 (중간 위치 포함)
    2) profile 기반 step 생성
    3) course.py 내부 로직으로 코스 후보 생성
    4) 베스트 코스를 MeetingPlace 테이블에 저장
    5) CourseResponse 그대로 반환
    """
    context = load_meeting_context(db, meeting_id)

    # 중간 위치가 아직 계산 안 되어 있으면, 먼저 /plans/calculate 호출 필요
    if context.center_lat is None or context.center_lng is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Meeting plan (중간 위치)가 설정되어 있지 않습니다. "
                "먼저 시간/장소 자동 계산을 실행해 주세요."
            ),
        )

    steps = build_steps_from_meeting(context.meeting)

    req = CourseRequest(
        center_lat=context.center_lat,
        center_lng=context.center_lng,
        radius=1000,
        steps=steps,
        per_step_limit=5,
    )

    course_response = plan_courses_internal(req)

    # 베스트 코스 하나를 MeetingPlace에 저장
    best_course = course_response.courses[0]

    candidates: list[dict] = []
    for idx, p in enumerate(best_course.places):
        # PlaceCandidate.step_index 를 쓰고, 없으면 idx 사용
        step_idx = getattr(p, "step_index", idx)
        step_def: Optional[StepInput] = (
            steps[step_idx] if 0 <= step_idx < len(steps) else None
        )
        category = (
            _category_for_step(step_def, step_idx)
            if step_def
            else _category_for_step_index(step_idx)
        )

        candidates.append(
            {
                # ✅ "코스 #1 - " 프리픽스 제거 → POI 이름만 저장
                "name": p.name,
                "poi_name": p.name,
                "address": p.address or "",
                "lat": p.lat,
                "lng": p.lng,
                "category": category,
                "duration": None,
            }
        )

    # calc_func.save_calculated_places 재사용
    save_calculated_places(db, meeting_id, candidates)

    return course_response