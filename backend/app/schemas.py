# app/schemas.py
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel


# ================================
# MeetingPlanAvailableDate 스키마
# ================================

class MeetingPlanAvailableDateBase(BaseModel):
    date: date


class MeetingPlanAvailableDateCreate(MeetingPlanAvailableDateBase):
    pass


class MeetingPlanAvailableDateResponse(MeetingPlanAvailableDateBase):
    id: int
    meeting_plan_id: int
    available_participant: List[int] = []
    available_participant_number: int = 0

    class Config:
        from_attributes = True


# ================================
# ParticipantTime (참가 가능 시간) 스키마
# ================================

class ParticipantTimeCreate(BaseModel):
    start_time: datetime
    end_time: datetime


class ParticipantTimeResponse(ParticipantTimeCreate):
    id: int

    class Config:
        from_attributes = True


# ================================
# Participant (참가자) 스키마
# ================================

class ParticipantCreate(BaseModel):
    name: str
    member_id: Optional[int] = None

    # 🔹 출발 장소 / 좌표 / 교통수단 / 선호
    start_address: Optional[str] = None

    # ⭐ 옵션 A: 프론트에서 이미 받은 좌표를 직접 넣을 수 있게 허용
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None

    transportation: Optional[str] = None
    fav_activity: Optional[str] = None
    fav_subcategories: Optional[str] = None  # JSON 문자열로 서브 카테고리 저장

    # 🔹 일정도 선택 (없으면 빈 리스트)
    available_times: List[ParticipantTimeCreate] = []


class ParticipantResponse(BaseModel):
    id: int
    name: str
    member_id: Optional[int] = None

    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None
    start_address: Optional[str] = None
    transportation: Optional[str] = None

    fav_activity: Optional[str] = None
    fav_subcategories: Optional[str] = None  # JSON 문자열로 서브 카테고리 저장

    available_times: List[ParticipantTimeResponse] = []

    class Config:
        from_attributes = True


class ParticipantUpdate(BaseModel):
    name: Optional[str] = None
    member_id: Optional[int] = None

    # 🔹 주소/좌표 모두 부분 업데이트 가능
    start_address: Optional[str] = None
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None

    transportation: Optional[str] = None
    fav_activity: Optional[str] = None
    fav_subcategories: Optional[str] = None  # JSON 문자열로 서브 카테고리 저장

    # [추가] 참가 가능 시간 목록도 (덮어쓰기용으로) 선택적 입력
    available_times: Optional[List[ParticipantTimeCreate]] = None


# ==========================
# Meeting (약속) 스키마
# ==========================

class MeetingBase(BaseModel):
    name: Optional[str] = None

    with_whom: Optional[str] = None
    purpose: Optional[str] = None
    vibe: Optional[str] = None
    budget: Optional[str] = None
    meeting_duration: Optional[str] = None  # 60, 120, 180, 240, 360, 480 (분 단위)
    profile_memo: Optional[str] = None


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    name: Optional[str] = None
    with_whom: Optional[str] = None
    purpose: Optional[str] = None
    vibe: Optional[str] = None
    budget: Optional[str] = None
    meeting_duration: Optional[str] = None  # 60, 120, 180, 240, 360, 480 (분 단위)
    profile_memo: Optional[str] = None


# ==========================
# Meeting_Plan 스키마
# ==========================

class MeetingPlanCreate(BaseModel):
    meeting_time: Optional[datetime] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_time: Optional[int] = None


class MeetingPlanResponse(BaseModel):
    id: int
    meeting_id: int

    meeting_time: Optional[datetime] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_time: Optional[int] = None

    available_dates: List[MeetingPlanAvailableDateResponse] = []

    class Config:
        from_attributes = True


class MeetingPlanUpdate(BaseModel):
    meeting_time: Optional[datetime] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_time: Optional[int] = None


# ================================
# MeetingPlace (약속 코스/장소) 스키마
# ================================

class MeetingPlaceCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    address: str
    category: Optional[str] = None
    duration: Optional[int] = None

    poi_name: Optional[str] = None


class MeetingPlaceResponse(MeetingPlaceCreate):
    id: int
    meeting_id: int

    class Config:
        from_attributes = True


class MeetingPlaceUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[int] = None
    poi_name: Optional[str] = None


# ================================
# MeetingMustVisitPlace 스키마
# ================================

class MeetingMustVisitPlaceBase(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MeetingMustVisitPlaceCreate(MeetingMustVisitPlaceBase):
    meeting_id: int


class MeetingMustVisitPlaceResponse(MeetingMustVisitPlaceBase):
    id: int
    meeting_id: int

    class Config:
        from_attributes = True


class MeetingMustVisitPlaceRead(MeetingMustVisitPlaceResponse):
    pass


# ================================
# 최종 Meeting 응답 스키마
# ================================

class MeetingResponse(MeetingBase):
    id: int
    name: Optional[str] = None

    participants: List[ParticipantResponse] = []
    plan: Optional[MeetingPlanResponse] = None
    places: List[MeetingPlaceResponse] = []

    must_visit_places: List[MeetingMustVisitPlaceResponse] = []

    class Config:
        from_attributes = True