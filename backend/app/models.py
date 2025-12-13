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
    purpose = Column(String(50), nullable=True)         # meal / drinks / cafe / activity / meeting ...
    vibe = Column(String(50), nullable=True)            # comma-separated : noisy-fun,calm,mood,cheap ...
    budget = Column(String(50), nullable=True)          # 1,2,3,4
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

    meeting_id = Column(
        Integer,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)

    # ⭐ 코스에 실제로 포함시키기 위해 좌표도 저장 (선택)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

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

    meeting_time = Column(DateTime(timezone=True), nullable=True)
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


class MeetingPlace(Base):
    __tablename__ = "meeting_places"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"))

    name = Column(String, nullable=False)
    poi_name = Column(String, nullable=True)
    address = Column(String, nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # restaurant / cafe / activity / shopping / culture / nature ...
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
    fav_subcategories = Column(String(1000), nullable=True)  # JSON 문자열로 서브 카테고리 저장

    meeting = relationship("Meeting", back_populates="participants")
    available_times = relationship(
        "ParticipantTime",
        back_populates="participant",
        cascade="all, delete-orphan",
    )


class ParticipantTime(Base):
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

    participant = relationship("Participant", back_populates="available_times")
    meeting = relationship("Meeting", back_populates="participant_times")


class MeetingPlanAvailableDate(Base):
    __tablename__ = "meeting_plan_available_dates"

    id = Column(Integer, primary_key=True, index=True)

    meeting_plan_id = Column(
        Integer,
        ForeignKey("Meeting_Plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    date = Column(Date, nullable=False)
    meeting_plan = relationship("MeetingPlan", back_populates="available_dates")