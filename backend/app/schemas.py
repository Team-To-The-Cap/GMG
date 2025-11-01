from pydantic import BaseModel

# 1. 생성 시 클라이언트 -> 서버 (입력 모델)
class ParticipantCreate(BaseModel):
    name: str 
    avatarUrl: str | None = None

# 2. 조회/응답 시 서버 -> 클라이언트 (출력 모델)
class ParticipantResponse(BaseModel):
    id: int
    name: str
    avatarUrl: str | None = None

    class Config:
        # DB 객체를 JSON으로 변환 가능하게 하는 설정
        orm_mode = True 
        # (또는 Pydantic V2에서는 from_attributes = True)