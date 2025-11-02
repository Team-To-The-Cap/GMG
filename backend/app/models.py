from pydantic import BaseModel
from .database import Base
from sqlalchemy import Column, Integer, String, Float, VARCHAR, ForeignKey, DateTime
from sqlalchemy.orm import relationship



# 약속 식별 Database
class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(VARCHAR(255), nullable=False)

    # 2. [추가] Meeting이 participants 목록을 가질 수 있도록 관계 설정
    #    "Participant"는 클래스 이름
    #    back_populates="meeting"은 Participant 모델의 'meeting' 속성과 연결
    participants = relationship("Participant", back_populates="meeting")
    # 2. [수정] Meeting -> ParticipantTime (1:N)
    #    이 약속에 등록된 모든 참가 시간 목록
    participant_times = relationship("ParticipantTime", back_populates="meeting")

class Participant(Base):
    # PostgreSQL에 생성될 테이블 이름
    __tablename__ = "participants" 
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)
    # 참가자 이름
    name = Column(String(255), nullable=False)
    # 회원 고유 id (비회원인 경우 NULL 허용)
    member_id = Column(Integer, nullable=True)
    # 시작 주소 위도
    start_latitude = Column(Float, nullable=False)
    # 시작 주소 경도
    start_longitude = Column(Float, nullable=False)
    # [추가] 시작 주소 이름
    start_address = Column(String(255), nullable=True)
    # [추가] 이동수단
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
