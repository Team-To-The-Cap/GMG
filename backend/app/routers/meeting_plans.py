# app/routers/meetings.py

# 1. [추가] HTTPException과 Eager Loading을 위한 joinedload 임포트
from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session, joinedload 
from typing import List

from ..database import get_db
from .. import schemas
from .. import models

router = APIRouter(
    prefix="/meetings",
    tags=["Meeting-Plans"]
)


@router.post("/{meeting_id}/plans", response_model=schemas.MeetingPlanResponse)
def create_plan_for_meeting(
    meeting_id: int,  # 1. URL 경로에서 meeting_id를 받음
    plan_in: schemas.MeetingPlanCreate, # 2. Request Body에서 상세 일정 정보를 받음
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 새로운 Meeting_Plan (상세 일정)을 생성합니다.
    """
    
    # 1. (권장) 부모인 Meeting이 존재하는지 확인
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 2. Pydantic 모델을 SQLAlchemy 모델로 변환
    #    plan_in.model_dump()로 딕셔너리를 만들고,
    #    URL에서 받은 meeting_id를 추가합니다.
    db_plan = models.MeetingPlan(
        **plan_in.model_dump(), 
        meeting_id=meeting_id 
    )
    
    # 3. DB에 추가, 커밋, 새로고침 (INSERT 실행)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    # 4. 생성된 객체 반환 (ID 포함)
    return db_plan

@router.get("/{meeting_id}/plans", response_model=schemas.MeetingPlanResponse) 
def get_plans_for_meeting(
    meeting_id: int, 
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 연결된 모든 Meeting_Plans (상세 일정) 목록을 조회합니다.
    """
    
    plan = db.query(models.MeetingPlan).filter(
        models.MeetingPlan.meeting_id == meeting_id
    ).first()
    
    # 3. [추가] Plan이 없는 경우 404 에러 반환
    if plan is None:
        raise HTTPException(status_code=404, detail="Meeting plan not found for this meeting")
        
    # 4. [수정] 조회된 단일 plan 객체 반환
    return plan


@router.patch(
    "/{meeting_id}/plans", # [수정] {plan_id} 제거
    response_model=schemas.MeetingPlanResponse
)
def update_meeting_plan(
    meeting_id: int, # [수정] {plan_id} 제거
    plan_in: schemas.MeetingPlanUpdate,
    db: Session = Depends(get_db)
):
    """
    특정 meeting_id에 속한 "유일한" 상세 일정을 수정합니다.
    """
    # [수정] 쿼리 변경 (meeting_id로만 조회)
    db_plan = db.query(models.MeetingPlan).filter(
        models.MeetingPlan.meeting_id == meeting_id
    ).first()

    if db_plan is None:
        raise HTTPException(status_code=404, detail="Meeting plan not found for this meeting")
    
    update_data = plan_in.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_plan, key, value)
            
    db.commit()
    db.refresh(db_plan)
    return db_plan




@router.post(
    "/{meeting_id}/plans/auto-center-and-times",
    response_model=schemas.MeetingCenterAndTimesResponse,
)
def create_auto_center_and_times_for_meeting(
    meeting_id: int,
    weight: str = Query("length", pattern="^(length|travel_time)$"),
    db: Session = Depends(get_db),
):
    """
    특정 meeting_id에 대해:

    1) 참가자들의 출발 좌표(start_latitude, start_longitude)를 이용해
       도로 그래프 상 '공정한 중간 지점'을 계산하고,
    2) 참가자들의 available_times에서 '모든 참가자가 공통으로 가능한 날짜들'을 추출해
    3) 두 정보를 한 번에 반환하는 엔드포인트.
    """

    # 1. Meeting + Participants + 각 참가자의 available_times를 한 번에 로딩
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.participants)
            .joinedload(models.Participant.available_times)
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    participants = meeting.participants
    if not participants:
        raise HTTPException(status_code=400, detail="No participants in this meeting")

    # 2. 참가자 출발 좌표 수집 (위/경도 없는 사람은 제외)
    coords: List[Tuple[float, float]] = []
    for p in participants:
        if p.start_latitude is None or p.start_longitude is None:
            continue
        # find_road_center_node는 (lon, lat) 순서이므로 주의
        coords.append((p.start_longitude, p.start_latitude))

    if not coords:
        raise HTTPException(
            status_code=400,
            detail="No participants with valid start_latitude/start_longitude",
        )

    # 3. 도로 그래프 위 중간 지점 계산
    center_result = find_road_center_node(
        G,
        coords_lonlat=coords,
        weight=weight,
        return_paths=False,  # 여기서는 요약만 필요하므로 경로는 안 돌려줘도 됨
    )

    center_summary = schemas.RoadCenterSummary(
        node=center_result["node"],
        lon=center_result["lon"],
        lat=center_result["lat"],
        max_distance_m=center_result.get("max_distance_m"),
        max_travel_time_s=center_result.get("max_travel_time_s"),
        n_reached=center_result["n_reached"],
        n_sources=center_result["n_sources"],
        worst_source_node=center_result.get("worst_source_node"),
        worst_cost=center_result["worst_cost"],
    )

    # 4. 참가자 공통 가능 날짜 계산
    common_dates = get_common_available_dates(participants)

    # TODO: 여기에서 MeetingPlan을 자동으로 생성/저장하고 싶다면
    #       center_summary.lon/lat + common_dates 중 첫 날짜 등을 사용해서
    #       models.MeetingPlan(...) 만들어서 INSERT 하는 로직을 추가하면 됨.

    # 5. 최종 응답
    return schemas.MeetingCenterAndTimesResponse(
        meeting_id=meeting_id,
        weight=weight,
        center=center_summary,
        common_dates=common_dates,
    )


