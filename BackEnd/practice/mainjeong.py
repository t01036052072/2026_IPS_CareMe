# practice/mainjeong.py
from fastapi import FastAPI, HTTPException, File, UploadFile
import os

# DB 및 모델 
from practice.database import engine, Base
from my_project import models

# 내 기능들 가져오기
from practice import notifications 
from practice.pills import router as pill_router
from practice.pill_alarm import router as pill_alarm_router
from practice.hospital_appointment import router as appointment_router

# 친구(my_project) 기능 및 데이터 구조 가져오기
from my_project.schemas import UserCreate, LoginRequest
from my_project.routes.user import router as friend_user_router
from my_project.routes.document import router as friend_doc_router
# 기존 import들 아래에 추가
from my_project.models import Base
import firebase_admin
from firebase_admin import credentials


def initialize_firebase_if_available():
    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json"),
    ]

    cred_path = next((path for path in candidate_paths if os.path.exists(path)), None)
    if not cred_path:
        print("[Firebase] serviceAccountKey.json 파일이 없어 푸시 알림 초기화를 건너뜁니다.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)


initialize_firebase_if_available()

# --- 1. 앱 객체 생성 ---
app = FastAPI(title="CareMe Medication Service")

# --- 2. 라우터 등록 (기능 합치기) ---
# 내 기능
app.include_router(pill_router)
app.include_router(pill_alarm_router)
app.include_router(appointment_router)

# 친구 기능 (경로가 겹치지 않게 /friend를 붙였습니다)
app.include_router(friend_user_router, prefix="/friend/user", tags=["친구 회원가입 기능"])
app.include_router(friend_doc_router, prefix="/friend/doc", tags=["친구 진단서 기능"])

# 앱 시작 시 실제 MySQL에 테이블 생성
Base.metadata.create_all(bind=engine)


# --- 3. 설정 및 초기화 --- 
UPLOAD_DIR = "./uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

db_users = [] # 임시 유저 저장소 (테스트용)

# --- 4. API 경로 설정 ---

@app.get("/")
def root():
    return {"message": "나와 친구의 모든 기능이 합쳐진 통합 서버입니다!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}

# 회원가입 API (내 파일에 있던 로직)
@app.post("/signup")
def signup(user: UserCreate):
    for u in db_users:
        if u["email"] == user.email:
            raise HTTPException(status_code=400, detail="이미 존재하는 이메일입니다.")
    
    db_users.append(user.dict())
    return {"message": "회원가입 완료!", "user_name": user.name}

# 로그인 API (내 파일에 있던 로직)
@app.post("/login")
def login(request: LoginRequest):
    for u in db_users:
        if u["email"] == request.email:
            if u["password"] == request.password:
                return {"message": f"환영합니다, {u['name']}님!", "status": "success"}
            else:
                raise HTTPException(status_code=401, detail="비밀번호가 틀렸습니다.")
                
    raise HTTPException(status_code=404, detail="존재하지 않는 아이디입니다.")
