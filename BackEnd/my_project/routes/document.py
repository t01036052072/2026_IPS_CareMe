import os
import uuid
import shutil
import re
os.environ['PADDLE_USE_ONEDNN'] = '0' 
os.environ['FLAGS_use_onednn'] = '0'
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from paddleocr import PaddleOCR
from typing import Optional, List
from datetime import datetime, timedelta

# 프로젝트 구조에 맞춘 임포트
from database import get_db
from models import DocumentTable
import schemas

router = APIRouter(prefix="/documents", tags=["Documents"])

# OCR 모델 지연 로딩
ocr_model = None
UPLOAD_DIR = "./static/uploads"

# --- [NLP] 어려운 의학 용어 순화 함수 ---
def simplify_medical_terms(raw_text: str) -> str:
    simplified = raw_text
    replacements = {
        "인후염": "목이 부어오르고 아픈 목감기 증상",
        "비염": "코점막이 부어 콧물이 나는 증상",
        "위염": "위 점막에 염증이 생겨 속이 쓰린 증상"
    }
    for technical, easy in replacements.items():
        simplified = simplified.replace(technical, easy)
    
    return "분석 결과: " + simplified if simplified else "분석된 내용이 없습니다."

# 1. 문서 업로드 (OCR 및 순화 포함)
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    doc_type: str = Form(...), 
    upload_date: str = Form(...), 
    db: Session = Depends(get_db)
):
    global ocr_model
    if ocr_model is None:
        ocr_model = PaddleOCR(lang='korean', ocr_version='PP-OCRv3', use_angle_cls=True)

    extension = file.filename.split(".")[-1].lower()
    if extension not in ["jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    unique_filename = f"{doc_type}_{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_texts = []
    detected_hospital = "알 수 없는 병원" 
    
    try:
        ocr_result = ocr_model.ocr(file_path)
        if ocr_result and ocr_result[0]:
            for line in ocr_result[0]:
                text = line[1][0].strip()
                if text: extracted_texts.append(text)

            keywords = ["병원", "의원", "내과", "외과", "소아과", "이비인후과", "피부과", "정형외과", "의료원", "치과"]
            for text in extracted_texts:
                if any(kw in text.replace(" ", "") for kw in keywords):
                    detected_hospital = text
                    break
    except Exception as e:
        print(f"OCR 에러: {e}")

    full_raw_text = "\n".join(extracted_texts)
    easy_description = simplify_medical_terms(full_raw_text)

    new_doc = DocumentTable(
        doc_type=doc_type, 
        hospital_name=detected_hospital,
        upload_date=upload_date, 
        image_url=f"/static/uploads/{unique_filename}",
        user_id=1, 
        ocr_count=len(extracted_texts),
        raw_text=full_raw_text,
        simplified_text=easy_description,
        medication_info="처방된 약 정보를 확인 중입니다."
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return {"status": "success", "data": {"id": new_doc.id, "hospital": new_doc.hospital_name}}

# 2. 문서 목록 조회 (스케치 기반 기간 설정 및 최신순 정렬 추가)
@router.get("/list")
def get_document_list(
    months: Optional[int] = None,  # 스케치: 1, 3, 6개월 필터
    sort: str = "desc",            # 스케치: 최신순(desc), 오래된순(asc)
    db: Session = Depends(get_db)
):
    query = db.query(DocumentTable)

    # 기간 필터링 로직
    if months:
        # 가현님의 upload_date 형식(YYYY.MM.DD)에 맞춰 필터링
        limit_date = (datetime.now() - timedelta(days=30 * months)).strftime("%Y.%m.%d")
        query = query.filter(DocumentTable.upload_date >= limit_date)

    # 정렬 로직 (최신순 기본)
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
                "hospital": d.hospital_name, 
                "date": d.upload_date,
                "type": d.doc_type
            } for d in documents
        ]
    }

# 3. 문서 상세 조회
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

# 4. 문서 수정 (이미지 재업로드 및 재분석 전용)
@router.put("/{document_id}")
async def update_document_image(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1) 기존 문서 확인
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="수정할 문서를 찾을 수 없습니다.")

    # 2) 기존 이미지 파일 삭제 (서버 용량 관리)
    old_file_path = f".{document.image_url}"
    if os.path.exists(old_file_path):
        try:
            os.remove(old_file_path)
        except Exception as e:
            print(f"기존 파일 삭제 실패: {e}")

    # 3) 새 이미지 저장
    extension = file.filename.split(".")[-1].lower()
    unique_filename = f"updated_{uuid.uuid4()}.{extension}"
    new_file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(new_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4) 새 이미지 OCR 및 언어 순화 재실행
    extracted_texts = []
    try:
        # OCR 모델이 로드되지 않았을 경우를 대비
        global ocr_model
        if ocr_model is None:
            ocr_model = PaddleOCR(lang='korean', ocr_version='PP-OCRv3', use_angle_cls=True)
            
        ocr_result = ocr_model.ocr(new_file_path)
        if ocr_result and ocr_result[0]:
            extracted_texts = [line[1][0].strip() for line in ocr_result[0] if line[1][0].strip()]
    except Exception as e:
        print(f"재분석 OCR 에러: {e}")

    full_raw_text = "\n".join(extracted_texts)
    easy_description = simplify_medical_terms(full_raw_text)

    # 5) DB 정보 업데이트 (날짜와 타입은 기존 값 유지)
    document.image_url = f"/static/uploads/{unique_filename}"
    document.raw_text = full_raw_text
    document.simplified_text = easy_description
    document.ocr_count = len(extracted_texts)

    db.commit()
    db.refresh(document)
    
    return {
        "status": "success", 
        "message": "이미지가 교체되어 분석 결과가 업데이트되었습니다.",
        "data": {"id": document.id, "hospital": document.hospital_name}
    }
# 5. 문서 삭제 (파일 및 데이터 완전 삭제)
@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="삭제할 문서를 찾을 수 없습니다.")

    # 1) 실제 이미지 파일 삭제
    file_path = f".{document.image_url}"
    if os.path.exists(file_path):
        os.remove(file_path)

    # 2) DB 데이터 삭제
    db.delete(document)
    db.commit()

    return {"status": "success", "message": f"{document_id}번 문서와 분석 결과가 삭제되었습니다."}