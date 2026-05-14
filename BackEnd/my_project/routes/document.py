import os
import uuid
import shutil
import re
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

# [교정 1] 시스템 환경 변수 설정: PaddleOCR 로드 전 최상단에 배치하여 에러를 원천 차단합니다.
os.environ['PADDLE_USE_ONEDNN'] = '0' 
os.environ['FLAGS_use_onednn'] = '0'
os.environ['FLAGS_allocator_strategy'] = 'naive_best_fit'

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

    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    unique_filename = f"{doc_type}_{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_texts = []
    detected_hospital = "알 수 없는 병원" 
    
    try:
        # [교정 3] OCR 실행 및 텍스트 추출 로직 개선
        ocr_result = ocr_model.ocr(file_path)
        # ... ocr_result 처리 부분 ...
        if ocr_result:
            for res in ocr_result:
                if res is None: continue
                for i, line in enumerate(res): # 줄 번호(i)를 함께 가져옵니다.
                    text = line[1][0].strip()
                    if text: extracted_texts.append(text)

            keywords = ["병원", "의원", "내과", "외과", "소아과", "이비인후과", "피부과", "정형외과", "의료원", "치과", "보건소"]
            exclude_keywords = ["병의원명", "기관명", "소재지"]

            for idx, text in enumerate(extracted_texts):
                clean_text = text.replace(" ", "")
                
                # 1. '의원', '병원' 등의 키워드가 포함된 줄을 찾으면
                if any(kw in clean_text for kw in keywords):
                    # 2. '병의원명:' 같은 단순 항목명이면 패스
                    if any(ex in clean_text for ex in exclude_keywords) and len(clean_text) < 8:
                        continue
                    
                    # 3. 핵심: 만약 현재 줄이 '정형외과의원'처럼 이름의 일부라면, 
                    #    바로 앞 줄(idx-1)에 '규린' 같은 이름이 있는지 확인해서 합칩니다.
                    if idx > 0:
                        prev_text = extracted_texts[idx-1]
                        # 앞 줄이 항목명(병의원명:)이 아니고, 너무 길지 않다면 이름으로 간주
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

# 2. 문서 목록 조회
@router.get("/list")
def get_document_list(
    months: Optional[int] = None,
    sort: str = "desc",
    db: Session = Depends(get_db)
):
    query = db.query(DocumentTable)
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

# 4. 문서 수정 (재분석 시에도 동일한 안정적 설정 적용)
@router.put("/{document_id}")
async def update_document_image(
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="수정할 문서를 찾을 수 없습니다.")

    old_file_path = f".{document.image_url}"
    if os.path.exists(old_file_path):
        try: os.remove(old_file_path)
        except: pass

    extension = file.filename.split(".")[-1].lower()
    unique_filename = f"updated_{uuid.uuid4()}.{extension}"
    new_file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(new_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_texts = []
    detected_hospital = document.hospital_name # 기본은 기존 값 유지

    try:
        global ocr_model
        if ocr_model is None:
            ocr_model = PaddleOCR(lang='korean', use_gpu=False, enable_mkldnn=False, show_log=False)
            
        ocr_result = ocr_model.ocr(new_file_path)
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
    document.hospital_name = detected_hospital # 수정 시 병원 이름도 새로 업데이트
    document.raw_text = "\n".join(extracted_texts)
    document.simplified_text = simplify_medical_terms(document.raw_text)
    document.ocr_count = len(extracted_texts)

    db.commit()
    db.refresh(document)
    return {"status": "success", "data": {"id": document.id, "hospital": document.hospital_name}}

# 5. 문서 삭제
@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="삭제할 문서를 찾을 수 없습니다.")

    file_path = f".{document.image_url}"
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(document)
    db.commit()
    return {"status": "success", "message": f"{document_id}번 문서가 삭제되었습니다."}