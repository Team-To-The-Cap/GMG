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
    # participant_id: int  # 이 시간이 어떤 참가자의 것인지 (필요하면 사용)

    class Config:
        from_attributes = True


# ================================
# Participant (참가자) 스키마
# ================================

class ParticipantCreate(BaseModel):
    name: str
    member_id: Optional[int] = None

    # 🔹 출발 장소 / 교통수단 / 선호는 선택
    start_address: Optional[str] = None
    transportation: Optional[str] = None
    fav_activity: Optional[str] = None

    # 🔹 일정도 선택 (없으면 빈 리스트)
    available_times: List[ParticipantTimeCreate] = []


class ParticipantResponse(BaseModel):
    id: int
    name: str
    member_id: Optional[int] = None

    # 🔹 전부 Optional + 기본값 None
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None
    start_address: Optional[str] = None
    transportation: Optional[str] = None

    fav_activity: Optional[str] = None

    available_times: List[ParticipantTimeResponse] = []

    class Config:
        from_attributes = True


class ParticipantUpdate(BaseModel):
    name: Optional[str] = None
    member_id: Optional[int] = None
    # start_latitude: Optional[float] = None
    # start_longitude: Optional[float] = None
    start_address: Optional[str] = None
    transportation: Optional[str] = None
    fav_activity: Optional[str] = None

    # [추가] 참가 가능 시간 목록도 (덮어쓰기용으로) 선택적 입력
    available_times: Optional[List[ParticipantTimeCreate]] = None


# ==========================
# Meeting (약속) 스키마
# ==========================

class MeetingBase(BaseModel):
    name: Optional[str] = None


class MeetingCreate(MeetingBase):
    # 'name' 필드를 MeetingBase로부터 상속받으므로 추가 내용 없음
    pass


class MeetingUpdate(BaseModel):
    name: Optional[str] = None


# ==========================
# Meeting_Plan 스키마
# ==========================

class MeetingPlanCreate(BaseModel):
    # ★ Optional 로 변경 (자동 계산에서 일정/장소 미정일 수 있음)
    meeting_time: Optional[datetime] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_time: Optional[int] = None  # 선택 사항


class MeetingPlanResponse(BaseModel):
    id: int
    meeting_id: int

    # ★ 일정 미정 허용
    meeting_time: Optional[datetime] = None

    # ★ 장소 / 좌표도 미정 허용
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    total_time: Optional[int] = None

    available_dates: List[MeetingPlanAvailableDateResponse] = []

    class Config:
        from_attributes = True


class MeetingPlanUpdate(BaseModel):
    # 부분 업데이트용: 전부 Optional
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


class MeetingPlaceResponse(MeetingPlaceCreate):
    id: int
    meeting_id: int  # 어떤 약속에 속했는지

    class Config:
        from_attributes = True  # Pydantic V2 호환


class MeetingPlaceUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[int] = None


# ================================
# 최종 Meeting 응답 스키마
# ================================

class MeetingResponse(MeetingBase):
    id: int
    name: Optional[str] = None  # (MeetingBase에서 상속받았지만 명시적으로 다시 작성)

    participants: List[ParticipantResponse] = []

    plan: Optional[MeetingPlanResponse] = None

    places: List[MeetingPlaceResponse] = []

    class Config:
        # SQLAlchemy 모델 객체를 Pydantic 모델로 자동 변환
        from_attributes = True