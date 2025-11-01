from pydantic import BaseModel
from .database import Base
from sqlalchemy import Column, Integer, String

# --- Item ---

# API를 통해 받을 데이터 (생성용)
class ItemBase(BaseModel):
    name: str
    description: str | None = None

class ItemCreate(ItemBase):
    pass

# API를 통해 보낼 데이터 (조회용)
class Item(ItemBase):
    id: int

    class Config:
        orm_mode = True # SQLAlchemy 모델을 Pydantic 모델로 변환


class Participant(Base):
    # PostgreSQL에 생성될 테이블 이름
    __tablename__ = "participants" 

    # TypeScript type: { id: string; name: string; avatarUrl: string } 에 대응
    
    # id: string 에 대응 (PostgreSQL 관례에 따라 Integer로 설정)
    id = Column(Integer, primary_key=True, index=True)
    
    # name: string 에 대응
    name = Column(String, index=True, nullable=False)
    
    # avatarUrl: string 에 대응
    avatarUrl = Column(String)