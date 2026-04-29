import re
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

# 1. database.py에서 설정값들을 가져옵니다
from database import SessionLocal, engine, UserTable, Base

# 서버 시작 시 테이블 생성 (이미 있으면 통과함)
Base.metadata.create_all(bind=engine)
app = FastAPI()

# 2. DB 연결 세션을 관리하는 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 데이터 양식
class UserCreate(BaseModel):
    email: str
    name: str
    age: int
    gender: str
    password: str = Field(..., min_length=8, max_length=20)

@app.get("/")
def read_root():
    return {"message": "의료 AI 백엔드 서버가 작동 중입니다!"}

# 3. [핵심] 회원가입 및 DB 저장 기능
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # [검사] 비밀번호 규칙 확인 (어제 했던 것)
    if not re.search(r"[A-Za-z]", user.password) or not re.search(r"\d", user.password):
        raise HTTPException(status_code=400, detail="비밀번호는 영문+숫자 조합이어야 합니다.")

    # [검사] 중복 이메일 확인
    existing_user = db.query(UserTable).filter(UserTable.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")

    # [생성] DB에 넣을 유저 객체 만들기
    new_user = UserTable(
        email=user.email,
        name=user.name,
        age=user.age,
        gender=user.gender,
        password=user.password 
    )

    # [저장] DB 장부에 기록하고 확정짓기
    db.add(new_user)     # 장부에 올리기
    db.commit()          # 도장 찍기 (저장 확정)
    db.refresh(new_user) # 저장된 데이터 다시 확인

    return {"message": f"{new_user.name}님, DB에 안전하게 저장되었습니다!", "id": new_user.id}

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator # field_validator 추가
import re # 정규표현식 사용을 위해 추가
from enum import Enum #리스트를 정해두어 그 중에서 고르도록 함

app = FastAPI()

# --- 데이터 구조 정의 ---

# 1. 기본 경로(Root) 설정
@app.get("/")
def read_root():
    return {"message": "안녕"}

# 2. 테스트용 API 경로 추가
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}

#성별 선택지 정의
class Gender(str, Enum):
    male = "남자"
    female = "여자"

#3. 회원가입 데이터구조
class UserCreate(BaseModel):
    email: str
    name: str
    age: int
    gender: Gender 
    password: str

    # 비밀번호 검증 함수 추가
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str):
        # 1. 길이 체크 (8~20자)
        if not (8 <= len(v) <= 20):
            raise ValueError('비밀번호는 8자 이상 20자 이하로 설정해주세요.')
        
        # 2. 영문자 포함 여부 체크
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('비밀번호에 최소 하나의 영문자가 포함되어야 합니다.')
            
        # 3. 숫자 포함 여부 체크
        if not re.search(r'\d', v):
            raise ValueError('비밀번호에 최소 하나의 숫자가 포함되어야 합니다.')
            
        # 4. 허용된 문자만 있는지 체크 (영문+숫자만)
        if not re.fullmatch(r'[A-Za-z\d]+', v):
            raise ValueError('비밀번호는 영문자와 숫자만 사용할 수 있습니다.')
            
        return v

#4. 로그인 시 받을 데이터 규칙
class LoginRequest(BaseModel):
    email: str
    password: str

# 가입된 유저들을 저장할 임시 명단 (서버 끄면 초기화됨)
db_users = [] 
""" 지금은 서버 끄면 초기화지만 나중에 DB에 저장 필요"""



#API
#회원가입 API
@app.post("/signup")
def signup(user: UserCreate):
    # 이미 가입된 이메일인지 확인
    for u in db_users:
        if u["email"] == user.email:
            raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")
    
    # 명단에 추가
    db_users.append(user.dict())
    return {"message": "회원가입 완료!", "user_name": user.name}


#로그인 API
@app.post("/login")
def login(request: LoginRequest):
    for u in db_users:
        if u["email"] == request.email:
            if u["password"] == request.password:
                return {"message": f"환영합니다, {u['name']}님!", "status": "success"}
            else:
                raise HTTPException(status_code=401, detail="비밀번호가 틀렸습니다.")
                
    raise HTTPException(status_code=404, detail="존재하지 않는 아이디입니다.")

