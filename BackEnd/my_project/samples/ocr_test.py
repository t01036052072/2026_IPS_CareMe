import os
os.environ['PADDLE_USE_ONEDNN'] = '0'
os.environ['FLAGS_use_onednn'] = '0'

from paddleocr import PaddleOCR

# 1. 가현님이 말씀하신 바로 그 "배열"입니다! 
# 이 단어들이 포함된 줄만 출력하도록 필터를 걸 거예요.
hospital_keywords = ["병원", "의원", "의료원", "내과", "외과", "소아과", "보건소"]

print("OCR 엔진 초기화 중...")
try:
    # 에러를 일으켰던 use_gpu, use_angle_cls 등을 모두 뺐습니다.
    ocr = PaddleOCR(lang='korean')
    
    img_path = 'samples/진단서2.png'
    print(f"[{img_path}] 분석 시작...")

    result = ocr.ocr(img_path)

    print("\n" + "="*30)
    print("🏥 병원 키워드 필터링 결과")
    print("="*30)

    found_any = False
    if result:
        for res in result:
            for line in res:
                text = line[1][0]  # OCR이 읽은 전체 문장
                
                # 2. 가현님이 만든 배열(hospital_keywords)의 단어가 문장에 포함되어 있는지 확인!
                if any(kw in text for kw in hospital_keywords):
                    print(f"✅ 일치하는 텍스트 발견: {text}")
                    found_any = True
        
        if not found_any:
            print("지정한 키워드(병원, 의원 등)가 포함된 문장을 찾지 못했습니다.")
            
except Exception as e:
    print(f"\n❌ 에러 발생: {e}")