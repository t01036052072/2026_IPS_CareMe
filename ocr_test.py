import os
os.environ['FLAGS_use_onednn'] = '0'
from paddleocr import PaddleOCR

# 1. 모델 초기화
ocr = PaddleOCR(
    lang='korean', 
    enable_mkldnn=False, 
    use_textline_orientation=True,
    text_det_thresh=0.1,
    text_det_box_thresh=0.1,
    text_det_unclip_ratio=2.5
) 

img_path = '진단서3.png'

if os.path.exists(img_path):
    print(f"\n--- ✅ '{img_path}' 데이터 추출 시작 ---")
    # 2. 분석 실행 (v5 버전은 결과가 리스트 형태의 객체로 반환됨)
    result = ocr.ocr(img_path)

    print("\n=== [추출된 글자 목록] ===")
    
    # PaddleOCRv5의 새로운 데이터 구조(Dict 형태) 대응
    if result:
        for res in result:
            # 방금 가현님 터미널에 뜬 'rec_texts'가 있는지 확인
            if isinstance(res, dict) and 'rec_texts' in res:
                text_list = res['rec_texts']
                score_list = res.get('rec_scores', [])
                
                for i, text in enumerate(text_list):
                    # 신뢰도가 함께 있다면 표시
                    score = score_list[i] if i < len(score_list) else 0.0
                    if len(text.strip()) > 0: # 빈 문자열 제외
                        print(f"▶ {text} (확신도: {score:.2f})")
            
            # 혹은 이전 버전 형태 [[박스, [글자, 점수]], ...] 대응
            elif isinstance(res, list):
                for line in res:
                    try:
                        print(f"▶ {line[1][0]} (확신도: {line[1][1]:.2f})")
                    except:
                        continue
    else:
        print("인식된 데이터가 없습니다.")
else:
    print(f"❌ 파일을 찾을 수 없습니다: {img_path}")