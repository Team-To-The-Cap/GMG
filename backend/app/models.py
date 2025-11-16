from pydantic import BaseModel
from .database import Base
from sqlalchemy import Column, Integer, String, Float, VARCHAR, ForeignKey, DateTime
from sqlalchemy.orm import relationship



# 약속 식별 Database
class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(VARCHAR(255), nullable=True)
    
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")
    participant_times = relationship("ParticipantTime", back_populates="meeting", cascade="all, delete-orphan")
    plan = relationship("MeetingPlan", back_populates="meeting", cascade="all, delete-orphan", uselist=False)
    places = relationship("MeetingPlace", back_populates="meeting", cascade="all, delete-orphan")



class MeetingPlan(Base):
    """
    Meeting_Plan 테이블 모델
    - 확정된 약속의 최종 계획(시간, 장소)을 저장합니다.
    """
    
    # 이미지에 명시된 테이블 이름 사용
    __tablename__ = "Meeting_Plans"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    meeting_time = Column(DateTime(timezone=True), nullable=False)
    available_time = Column
    address = Column(VARCHAR(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_time = Column(Integer, nullable=True)


    # --- 관계 설정 ---    
    # 이 Plan이 어떤 Meeting에 속했는지 역참조
    meeting = relationship("Meeting", back_populates="plan")

class MeetingPlanTime(Base):
    

# -------------------------------------------------
class MeetingPlace(Base):
    """
    Meeting_Place 테이블 모델
    - 약속 장소(들)의 상세 정보를 저장합니다.
    - (e.g., 코스의 각 경유지)
    """
    
    # 이미지의 '테이블명' 컬럼 기준
    __tablename__ = "Meeting_Places"

    # id (Primary Key)
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(VARCHAR(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(VARCHAR(255), nullable=False)
    category = Column(VARCHAR(255), nullable=True)
    duration = Column(Integer, nullable=True)

    # --- 관계 설정 ---
    
    # MeetingPlace -> Meeting (N:1)
    # 이 장소가 어떤 약속(Meeting)에 속하는지
    meeting = relationship("Meeting", back_populates="places")



class Participant(Base):
    __tablename__ = "participants" 
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    member_id = Column(Integer, nullable=True)
    start_latitude = Column(Float, nullable=False)
    start_longitude = Column(Float, nullable=False)
    start_address = Column(String(255), nullable=True)
    transportation = Column(String(255), nullable=True)

    fav_activity = Column(String(255), nullable=True)
  
    # 3. [추가] Participant가 어떤 Meeting에 속했는지 역참조 설정
    meeting = relationship("Meeting", back_populates="participants")
    # 2. [수정] Participant -> ParticipantTime (1:N)
    #    이 참가자가 입력한 시간 목록
    available_times = relationship("ParticipantTime", back_populates="participant", cascade="all, delete-orphan")


# 2. [신규] Participant_Time 테이블 모델
class ParticipantTime(Base):
    """
    Participant_Time 테이블 모델
    - 참가자가 가능한 시간대를 저장합니다.
    """
    
    # DB 테이블 이름 (복수형 권장: participant_times)
    __tablename__ = "participant_times"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)    
    end_time = Column(DateTime(timezone=True), nullable=False)


    # --- 관계 설정 (선택 사항이지만 권장) ---
    
    # 이 시간대가 어떤 참가자의 것인지 역참조
    participant = relationship("Participant", back_populates="available_times")
    
    # 이 시간대가 어떤 약속에 속했는지 역참조
    meeting = relationship("Meeting", back_populates="participant_times")

