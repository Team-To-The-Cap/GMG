# app/models.py

from pydantic import BaseModel  # (지금은 안 쓰지만 두어도 에러는 안 남)
from .database import Base
from sqlalchemy import Column, Date, Integer, String, Float, VARCHAR, ForeignKey, DateTime
from sqlalchemy.orm import relationship


# ===================== Meeting =====================
class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(VARCHAR(255), nullable=True)

    # ✨ 약속의 분위기 / 목적 컬럼들 (전부 nullable)
    with_whom = Column(String(50), nullable=True)       # friends / coworkers / ...
    purpose = Column(String(50), nullable=True)         # casual_talk / meeting / ...
    vibe = Column(String(50), nullable=True)            # quiet / relaxed / ...
    budget = Column(String(50), nullable=True)          # under_10 / 10_20 / ...
    profile_memo = Column(String(1000), nullable=True)  # 자유 텍스트 메모

    participants = relationship(
        "Participant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    participant_times = relationship(
        "ParticipantTime",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    plan = relationship(
        "MeetingPlan",
        back_populates="meeting",
        cascade="all, delete-orphan",
        uselist=False,
    )
    places = relationship(
        "MeetingPlace",
        back_populates="meeting",
        cascade="all, delete-orphan",
        # ✅ PK 기준 오름차순 → 코스 1,2,3 순서 고정
        order_by="MeetingPlace.id",
    )

    must_visit_places = relationship(
        "MeetingMustVisitPlace",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )


# ===================== MUST VISIT PLACE =====================
class MeetingMustVisitPlace(Base):
    """
    Meeting별 '반드시 가고 싶은 장소' 목록
    """
    __tablename__ = "meeting_must_visit_places"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Meeting.__tablename__ 이 "meetings" 이므로 "meetings.id"
    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)

    meeting = relationship("Meeting", back_populates="must_visit_places")


class MeetingPlan(Base):
    """
    Meeting_Plan 테이블 모델
    - 확정된 약속의 최종 계획(시간, 장소)을 저장합니다.
    """

    __tablename__ = "Meeting_Plans"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ★ 일정 미정 허용: nullable=True
    meeting_time = Column(DateTime(timezone=True), nullable=True)

    # (이 줄은 지금 오타라서 사실 의미 없음… 필요 없다면 삭제해도 됨)
    available_time = Column           # <- 사용 안 하면 나중에 지워도 OK

    address = Column(VARCHAR(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_time = Column(Integer, nullable=True)

    meeting = relationship("Meeting", back_populates="plan")
    available_dates = relationship(
        "MeetingPlanAvailableDate",
        back_populates="meeting_plan",
        cascade="all, delete-orphan",
    )


# -------------------------------------------------
class MeetingPlace(Base):
    __tablename__ = "meeting_places"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"))

    # 카드 타이틀에 그대로 나가는 이름
    name = Column(String, nullable=False)
    # 포이 이름(같은 값 유지해도 되고, 나중에 따로 쓰고 싶으면 분리)
    poi_name = Column(String, nullable=True)
    address = Column(String, nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # restaurant / cafe / activity 등
    category = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)

    meeting = relationship("Meeting", back_populates="places")


class Participant(Base):
    __tablename__ = "participants"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    member_id = Column(Integer, nullable=True)

    start_latitude = Column(Float, nullable=True)
    start_longitude = Column(Float, nullable=True)
    start_address = Column(String(255), nullable=True)
    transportation = Column(String(255), nullable=True)
    fav_activity = Column(String(255), nullable=True)

    # Participant가 어떤 Meeting에 속했는지 역참조
    meeting = relationship("Meeting", back_populates="participants")
    # 이 참가자가 입력한 시간 목록 (1:N)
    available_times = relationship(
        "ParticipantTime",
        back_populates="participant",
        cascade="all, delete-orphan",
    )


# 2. Participant_Time 테이블 모델
class ParticipantTime(Base):
    """
    Participant_Time 테이블 모델
    - 참가자가 가능한 시간대를 저장합니다.
    """

    __tablename__ = "participant_times"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participant_id = Column(
        Integer,
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)

    # 이 시간대가 어떤 참가자의 것인지
    participant = relationship("Participant", back_populates="available_times")
    # 이 시간대가 어떤 약속에 속했는지
    meeting = relationship("Meeting", back_populates="participant_times")


class MeetingPlanAvailableDate(Base):
    """
    MeetingPlan 에 연결된 '가능한 날짜'를 한 줄씩 저장하는 테이블.
    - 예: 2025-11-20, 2025-11-23 ...
    """
    __tablename__ = "meeting_plan_available_dates"

    id = Column(Integer, primary_key=True, index=True)

    meeting_plan_id = Column(
        Integer,
        ForeignKey("Meeting_Plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 날짜만 저장 (시간 X)
    date = Column(Date, nullable=False)

    # 역참조: 어느 Plan에 속하는지
    meeting_plan = relationship("MeetingPlan", back_populates="available_dates")