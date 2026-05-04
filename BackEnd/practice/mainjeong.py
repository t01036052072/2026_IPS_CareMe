
from fastapi import FastAPI, HTTPException, File, UploadFile
from signin import UserCreate, LoginRequest
import os
from pills import router as pill_router
app = FastAPI(title="CareMe Medication Service")
app.include_router(pill_router)



# --- 설정 및 초기화 ---
UPLOAD_DIR = "./uploads"

# 업로드 폴더가 없으면 생성
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
#이게 폴더 만드는 부분인데 모든 사용자의 이미지가 한 번에 저장된느거라 
#개인용으로 DB 분리하는 작업 필요

db_users = [] #가입된 유저들을 저장할 임시 명단 (서버 끄면 초기화됨) 
""" 지금은 서버 끄면 초기화지만 나중에 DB에 저장 필요"""


 # --- 데이터 구조 정의 ---

# 1. 기본 경로(Root) 설정
@app.get("/")
def read_root():
    return {"message": "안녕"}

# 2. 테스트용 API 경로 추가
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "query": q}


#----------------API----------------------
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



