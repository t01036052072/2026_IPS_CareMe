import os
import uuid
import shutil
import re
import requests
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from my_project.database import get_db
try:
    from paddleocr import PaddleOCR
except ModuleNotFoundError:

    PaddleOCR = None
from typing import Optional, List
from datetime import datetime, timedelta
from dotenv import load_dotenv

# 프로젝트 구조에 맞춘 임포트
from my_project.models import DocumentTable, UserTable
# 프로젝트 구조에 맞춘 모델 임포트입니다.
# DocumentTable은 진단서 DB 저장/조회에 사용하고, UserTable은 토큰에서 꺼낸 현재 사용자 타입 표시에 사용합니다.
from my_project.models import DocumentTable, UserTable
from my_project import schemas
from my_project.routes.user import get_current_user

# [교정 1] 시스템 환경 변수 설정: PaddleOCR 로드 전 최상단에 배치하여 에러를 원천 차단합니다..
os.environ['PADDLE_USE_ONEDNN'] = '0' 
os.environ['FLAGS_use_onednn'] = '0'
os.environ['FLAGS_allocator_strategy'] = 'naive_best_fit'

router = APIRouter(prefix="/documents")

# OCR 모델은 서버 시작 시 바로 로딩하지 않고 최초 업로드 요청 때 한 번만 로딩합니다.
# PaddleOCR 로딩 비용이 커서, 지연 로딩으로 서버 시작 속도와 메모리 부담을 줄입니다.

# OCR 모델 지연 로딩
ocr_model = None
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"

# =====================================================================
# 🔑 OpenAI API Key 설정 (환경 변수 또는 직접 입력)
# =====================================================================
load_dotenv()
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# --- [LLM] OpenAI 기반 의학 용어 순화 함수 ---

def ensure_paddleocr_available():
    if PaddleOCR is None:
        raise HTTPException(
            status_code=503,
            detail="OCR 기능을 사용하려면 paddleocr 패키지를 설치해야 합니다.",
        )


def get_upload_path_from_url(image_url: str) -> Path:
    relative_path = image_url.removeprefix("/static/").lstrip("/")
    return STATIC_DIR / relative_path

# OCR 결과에 포함된 어려운 의학 용어를 사용자에게 쉬운 표현으로 보여주기 위한 변환 함수입니다.
# 현재는 하드코딩 치환 방식이며, 추후 의학 용어 사전 또는 AI 요약 결과로 확장할 수 있습니다.
# --- [NLP] 어려운 의학 용어 순화 함수 ---
def simplify_medical_terms(raw_text: str) -> str:
    """
    OCR로 추출한 진단서 원문을 OpenAI API를 통해
    초등학생도 이해할 수 있는 쉬운 우리말로 순화합니다.
    """
    if not raw_text or not raw_text.strip():
        return "분석된 내용이 없습니다."

    # API 키가 설정되지 않은 경우 폴백 처리
    if not OPENAI_API_KEY or not OPENAI_API_KEY.startswith("sk-"):
        return f"분석 결과: {raw_text} (API 키 미설정으로 원문 반환)"

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "너는 환자를 위해 의학 전문 용어를 쉽게 번역해주는 다정한 의사 선생님이야. "
                    "의학 진단서 문장이 들어오면 어려운 한자어나 영어 코드를 싹 걷어내고, "
                    "초등학생 눈높이에서 이해할 수 있는 친절하고 따뜻한 한 문장의 쉬운 우리말로만 순화해줘. "
                    "군더더기 설명이나 다른 안내 글은 절대로 생략하고 오직 결과 문장만 리턴해."
                )
            },
            {
                "role": "user",
                "content": f"진단서 원문: {raw_text}"
            }
        ],
        "temperature": 0.2,
        "max_tokens": 150
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            result = response.json()['choices'][0]['message']['content'].strip()
            return "분석 결과: " + result
        elif response.status_code == 401:
            print("🚨 [OpenAI 인증 오류] API 키를 확인해주세요.")
            return f"분석 결과: {raw_text} (인증 오류로 원문 반환)"
        else:
            print(f"⚠️ OpenAI 응답 오류 (코드: {response.status_code})")
            return f"분석 결과: {raw_text} (서버 오류로 원문 반환)"
    except Exception as e:
        print(f"❌ OpenAI API 통신 오류: {e}")
        return f"분석 결과: {raw_text} (통신 오류로 원문 반환)"


# 1. 문서 업로드 (OCR 및 순화 포함)
# 진단서 업로드 API
# - 프론트는 multipart/form-data로 file, doc_type, upload_date를 보냅니다.
# - Authorization 헤더의 JWT 토큰으로 현재 로그인한 사용자를 확인합니다.
# - 업로드 이미지는 static/uploads 폴더에 저장하고 PaddleOCR로 텍스트를 추출합니다.
# - 추출 텍스트에서 병원명 후보를 찾고, 쉬운 설명(simplified_text)을 만든 뒤 documents 테이블에 저장합니다.
# - user_id는 고정값이 아니라 current_user.id로 저장하므로 사용자별 진단서 관리가 가능합니다.
# - 통합 서버에서는 /friend/doc/documents/upload 경로로 호출됩니다.
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    doc_type: str = Form(...), 
    upload_date: str = Form(...), 
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    global ocr_model
    ensure_paddleocr_available()
    if ocr_model is None:
        # [교정 2] ocr_test.py에서 성공했던 안정적인 설정값으로 초기화합니다.
        ocr_model = PaddleOCR(
            lang='korean',
            use_gpu=False,        # GPU 사용 안 함 (에러 방지)
            enable_mkldnn=False,  # oneDNN 가속 해제 (가장 중요!)
            cpu_threads=1,        # CPU 스레드 제한으로 안정성 확보
            show_log=False
        )

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{doc_type}_{uuid.uuid4()}.{extension}"
    file_path = UPLOAD_DIR / unique_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_texts = []
    detected_hospital = hospital_name.strip() if 'hospital_name' in locals() and hospital_name else "알 수 없는 병원"
    
    try:
        # [교정 3] OCR 실행 및 텍스트 추출 로직 개선
        ocr_result = ocr_model.ocr(str(file_path))
        # ... ocr_result 처리 부분 ...
        if ocr_result:
            for res in ocr_result:
                if res is None: continue
                for i, line in enumerate(res):
                    text = line[1][0].strip()
                    if text: extracted_texts.append(text)

            keywords = ["병원", "의원", "내과", "외과", "소아과", "이비인후과", "피부과", "정형외과", "의료원", "치과", "보건소"]
            exclude_keywords = ["병의원명", "기관명", "소재지"]

            for idx, text in enumerate(extracted_texts):
                clean_text = text.replace(" ", "")
                
                if any(kw in clean_text for kw in keywords):
                    if any(ex in clean_text for ex in exclude_keywords) and len(clean_text) < 8:
                        continue
                    
                    if idx > 0:
                        prev_text = extracted_texts[idx-1]
                        if not any(ex in prev_text for ex in exclude_keywords) and len(prev_text) < 10:
                            detected_hospital = f"{prev_text} {text}"
                        else:
                            detected_hospital = text
                    else:
                        detected_hospital = text
                        
                    print(f"✅ 병원 이름 결합 성공: {detected_hospital}")
                    break
                    
    except Exception as e:
        print(f"OCR 에러 상세: {e}")

    full_raw_text = "\n".join(extracted_texts)
    easy_description = simplify_medical_terms(full_raw_text)  # 🔄 LLM 순화 호출

    new_doc = DocumentTable(
        doc_type=doc_type, 
        hospital_name=detected_hospital,
        upload_date=upload_date, 
        image_url=f"/static/uploads/{unique_filename}",
        user_id=current_user.id,
        ocr_count=len(extracted_texts),
        raw_text=full_raw_text,
        simplified_text=easy_description,
        medication_info="처방된 약 정보를 확인 중입니다."
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return {"status": "success", "data": {"document_id": new_doc.id, "hospital": new_doc.hospital_name}}

# 2. 문서 목록 조회
# 진단서 목록 조회 API
# - documents 테이블의 진단서 목록을 조회합니다.
# - months 값을 주면 최근 N개월 데이터만 필터링합니다.
# - sort=asc 또는 sort=desc로 업로드 날짜 기준 정렬 방향을 선택합니다.
# - 현재 이 API는 전체 문서 목록 조회용이며, 마이페이지 개인별 문서 조회는 /friend/user/me 또는 /friend/mypage/documents를 사용합니다.
# - 통합 서버에서는 /friend/doc/documents/list 경로로 호출됩니다.
@router.get("/list")
def get_document_list(
    months: Optional[int] = None,
    sort: str = "desc",
    db: Session = Depends(get_db),
    current_user: UserTable = Depends(get_current_user),
):
    query = db.query(DocumentTable).filter(DocumentTable.user_id == current_user.id)
    if months:
        limit_date = (datetime.now() - timedelta(days=30 * months)).strftime("%Y.%m.%d")
        query = query.filter(DocumentTable.upload_date >= limit_date)

    if sort == "asc":
        query = query.order_by(asc(DocumentTable.upload_date))
    else:
        query = query.order_by(desc(DocumentTable.upload_date))

    documents = query.all()
    return {
        "status": "success", 
        "results": [
            {
                "id": d.id, 
                "hospital_name": d.hospital_name, 
                "upload_date": d.upload_date,
                "doc_type": d.doc_type
            } for d in documents
        ]
    }

# 3. 문서 상세 조회
# 진단서 상세 조회 API
# - document_id에 해당하는 진단서 1건의 상세 정보를 반환합니다.
# - 병원명, 업로드 날짜, 원문 OCR 텍스트, 쉬운 설명, 이미지 URL 등을 포함합니다.
# - 문서를 찾지 못하면 404를 반환합니다.
# - 통합 서버에서는 /friend/doc/documents/{document_id} 경로로 호출됩니다.
@router.get("/{document_id}", response_model=schemas.DocumentDetail)
def get_document_detail(document_id: int, db: Session = Depends(get_db)):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    
    return {
        "id": document.id,
        "owner_id": document.user_id,
        "created_at": datetime.now(),
        "title": f"{document.hospital_name} {document.doc_type}",
        "hospital_name": document.hospital_name,
        "upload_date": document.upload_date,
        "simplified_text": document.simplified_text,
        "medication_info": document.medication_info,
        "image_url": document.image_url,
        "content": document.raw_text
    }

# 4. 문서 수정 (재분석 시에도 동일한 안정적 설정 적용)
# 진단서 이미지 수정 API
# - 기존 document_id의 이미지 파일을 새 파일로 교체합니다.
# - 기존 파일이 서버에 남아 있으면 삭제하고, 새 이미지를 uploads 폴더에 저장합니다.
# - 새 이미지에 대해 OCR을 다시 실행하고 병원명/원문 텍스트/쉬운 설명/ocr_count를 갱신합니다.
# - 통합 서버에서는 /friend/doc/documents/{document_id} 경로에 PUT으로 호출됩니다.
@router.put("/{document_id}")
async def update_document_image(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="수정할 문서를 찾을 수 없습니다.")

    old_file_path = get_upload_path_from_url(document.image_url)
    if os.path.exists(old_file_path):
        try: os.remove(old_file_path)
        except: pass

    extension = file.filename.split(".")[-1].lower()
    unique_filename = f"updated_{uuid.uuid4()}.{extension}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    new_file_path = UPLOAD_DIR / unique_filename

    with open(new_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_texts = []
    detected_hospital = document.hospital_name

    try:
        global ocr_model
        ensure_paddleocr_available()
        if ocr_model is None:
            ocr_model = PaddleOCR(lang='korean', use_gpu=False, enable_mkldnn=False, show_log=False)
            
        ocr_result = ocr_model.ocr(str(new_file_path))
        if ocr_result:
            for res in ocr_result:
                if res is None: continue
                for line in res:
                    text = line[1][0].strip()
                    if text: extracted_texts.append(text)
            
            keywords = ["병원", "의원", "내과", "외과", "소아과", "이비인후과", "피부과", "정형외과", "의료원", "치과", "보건소"]
            for text in extracted_texts:
                if any(kw in text.replace(" ", "") for kw in keywords):
                    detected_hospital = text
                    break
    except Exception as e:
        print(f"재분석 OCR 에러: {e}")

    document.image_url = f"/static/uploads/{unique_filename}"
    document.hospital_name = detected_hospital
    document.raw_text = "\n".join(extracted_texts)
    document.simplified_text = simplify_medical_terms(document.raw_text)  # 🔄 LLM 순화 호출
    document.ocr_count = len(extracted_texts)

    db.commit()
    db.refresh(document)
    return {"status": "success", "data": {"id": document.id, "hospital": document.hospital_name}}

# 5. 문서 삭제
# 진단서 삭제 API
# - document_id에 해당하는 DB 레코드와 서버에 저장된 이미지 파일을 함께 삭제합니다.
# - 문서를 찾지 못하면 404를 반환합니다.
# - 통합 서버에서는 /friend/doc/documents/{document_id} 경로에 DELETE로 호출됩니다.
@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="삭제할 문서를 찾을 수 없습니다.")

    file_path = get_upload_path_from_url(document.image_url)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(document)
    db.commit()
    return {"status": "success", "message": f"{document_id}번 문서가 삭제되었습니다."}
