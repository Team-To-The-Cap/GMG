from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime









# ================================
# ParticipantTime (참가 가능 시간) 스키마
# ================================

class ParticipantTimeCreate(BaseModel):
    start_time: datetime
    end_time: datetime

class ParticipantTimeResponse(ParticipantTimeCreate):
    id: int
    participant_id: int # 이 시간이 어떤 참가자의 것인지
    
    class Config:
        from_attributes = True


class ParticipantCreate(BaseModel):
    name: str
    meeting_id: int # Pydantic이 "123"(문자열)을 123(숫자)으로 자동 변환합니다.
    start_latitude: float
    start_longitude: float
    start_address: str
    transportation: str
    
    available_times: List[ParticipantTimeCreate]

class ParticipantResponse(ParticipantCreate):
    id: int
    available_times: List[ParticipantTimeResponse] = [] 
    
    class Config:
        from_attributes = True


# ==========================
# Meeting (약속) 스키마
# ==========================

class MeetingBase(BaseModel):
    name: str

class MeetingCreate(MeetingBase):
    # 'name' 필드를 MeetingBase로부터 상속받으므로 추가 내용 없음
    pass

class MeetingResponse(MeetingBase):
    id: int
    name: str # (MeetingBase에서 상속받았지만 명시적으로 다시 작성)
    
    participants: List[ParticipantResponse] = [] 
    
    class Config:
        # SQLAlchemy 모델 객체를 Pydantic 모델로 자동 변환
        from_attributes = True

# ==========================
# Meeting_Plan 스키마
# ==========================

# 1. MeetingPlan 생성(POST) 시 받을 입력 데이터
class MeetingPlanCreate(BaseModel):
    meeting_time: datetime
    address: str
    total_time: Optional[int] = None # 선택 사항


class MeetingPlanResponse(BaseModel):
    id: int
    meeting_id: int
    meeting_time: datetime
    address: str
    total_time: Optional[int] = None
    
    class Config:
        from_attributes = True # Pydantic V2




    
# ================================
# [신규] MeetingPlace (약속 코스/장소) 스키마
# ================================

# 1. MeetingPlace 생성(POST) 시 받을 입력 데이터
#    (meeting_id는 URL에서 받으므로 여기서는 제외)
class MeetingPlaceCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    address: str
    category: Optional[str] = None
    duration: Optional[int] = None

# 2. API가 반환할 출력 데이터 (ID 포함)
class MeetingPlaceResponse(MeetingPlaceCreate):
    id: int
    meeting_id: int # 어떤 약속에 속했는지
    
    class Config:
        from_attributes = True # Pydantic V2