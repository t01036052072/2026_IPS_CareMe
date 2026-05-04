import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from paddleocr import PaddleOCR
from BackEnd.my_project.database import get_db
from BackEnd.my_project.models import DocumentTable

router = APIRouter(prefix="/documents", tags=["Documents"])

# OCR 모델 지연 로딩
ocr_model = None
UPLOAD_DIR = "./static/uploads"

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

    new_doc = DocumentTable(
        doc_type=doc_type, hospital_name=detected_hospital,
        upload_date=upload_date, image_url=f"/static/uploads/{unique_filename}",
        user_id=1, ocr_count=len(extracted_texts),
        raw_text="\n".join(extracted_texts) 
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return {"status": "success", "data": {"id": new_doc.id, "hospital": new_doc.hospital_name}}

@router.get("/list")
def get_document_list(db: Session = Depends(get_db)):
    documents = db.query(DocumentTable).order_by(DocumentTable.upload_date.desc()).all()
    return {"status": "success", "results": [{"id": d.id, "hospital": d.hospital_name, "date": d.upload_date} for d in documents]}

@router.get("/{document_id}")
def get_document_detail(document_id: int, db: Session = Depends(get_db)):
    document = db.query(DocumentTable).filter(DocumentTable.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    return {
        "status": "success",
        "data": {
            "id": document.id, "hospital": document.hospital_name,
            "date": document.upload_date, "type": document.doc_type,
            "ocr_count": document.ocr_count, "raw_text": document.raw_text,
            "image_url": document.image_url
        }
    }