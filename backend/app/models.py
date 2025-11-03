from pydantic import BaseModel
from .database import Base
from sqlalchemy import Column, Integer, String, Float, VARCHAR, ForeignKey, DateTime
from sqlalchemy.orm import relationship



# 약속 식별 Database
class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(VARCHAR(255), nullable=False)
    
    participants = relationship("Participant", back_populates="meeting")
    participant_times = relationship("ParticipantTime", back_populates="meeting")
    
    
    # Meeting -> MeetingPlan (1:N)
    # 이 약속에 확정된 세부 계획(들)
    plans = relationship("MeetingPlan", back_populates="meeting")

    # Meeting -> MeetingPlace (1:N)
    # 이 약속에 포함된 장소(경유지) 목록
    places = relationship("MeetingPlace", back_populates="meeting")



class MeetingPlan(Base):
    """
    Meeting_Plan 테이블 모델
    - 확정된 약속의 최종 계획(시간, 장소)을 저장합니다.
    """
    
    # 이미지에 명시된 테이블 이름 사용
    __tablename__ = "Meeting_Plans"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    meeting_time = Column(DateTime(timezone=True), nullable=False)
    address = Column(VARCHAR(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_time = Column(Integer, nullable=True)


    # --- 관계 설정 ---    
    # 이 Plan이 어떤 Meeting에 속했는지 역참조
    meeting = relationship("Meeting", back_populates="plans")


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
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
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
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    member_id = Column(Integer, nullable=True)
    start_latitude = Column(Float, nullable=False)
    start_longitude = Column(Float, nullable=False)
    start_address = Column(String(255), nullable=True)
    transportation = Column(String(255), nullable=True)
  
  
    # 3. [추가] Participant가 어떤 Meeting에 속했는지 역참조 설정
    meeting = relationship("Meeting", back_populates="participants")
    # 2. [수정] Participant -> ParticipantTime (1:N)
    #    이 참가자가 입력한 시간 목록
    available_times = relationship("ParticipantTime", back_populates="participant")


# 2. [신규] Participant_Time 테이블 모델
class ParticipantTime(Base):
    """
    Participant_Time 테이블 모델
    - 참가자가 가능한 시간대를 저장합니다.
    """
    
    # DB 테이블 이름 (복수형 권장: participant_times)
    __tablename__ = "participant_times"

    # 참가자 고유 id (Primary Key)
    # 이미지에는 "참가자 고유 id"라고 되어 있지만, 
    # 이 테이블의 고유 ID로 사용하는 것이 좋습니다.
    id = Column(Integer, primary_key=True, index=True)
    
    # 약속 고유 id (Foreign Key)
    # 'meetings' 테이블의 'id'를 참조
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    
    # [수정] 참가자 id (Foreign Key)
    # 이미지에는 "참가자 고유 id"가 id로 되어 있지만,
    # 'participants' 테이블의 'id'를 참조하는 'participant_id'가 더 명확합니다.
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    
    # 가능한 시작 시간 (time stamp -> DateTime)
    # timezone=True를 사용하여 시간대 정보까지 저장하는 것을 권장합니다.
    start_time = Column(DateTime(timezone=True), nullable=False)
    
    # 가능한 끝 시간 (time stamp -> DateTime)
    end_time = Column(DateTime(timezone=True), nullable=False)


    # --- 관계 설정 (선택 사항이지만 권장) ---
    
    # 이 시간대가 어떤 참가자의 것인지 역참조
    participant = relationship("Participant", back_populates="available_times")
    
    # 이 시간대가 어떤 약속에 속했는지 역참조
    meeting = relationship("Meeting", back_populates="participant_times")



