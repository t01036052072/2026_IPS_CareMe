# CARE ME

> AI 기반 개인 건강관리 서비스

CARE ME는 사용자의 진단서와 처방전, 알약 사진을 분석하고 복약 일정과 병원 일정을 한곳에서 관리할 수 있도록 돕는 모바일 헬스케어 프로젝트입니다. 어려운 의료 정보를 이해하기 쉽게 전달하고, 사용자의 건강 상태에 맞춘 관리 경험을 제공하는 것을 목표로 합니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 진단서·처방전 분석 | 업로드한 문서에서 텍스트를 추출하고 의료 용어를 이해하기 쉽게 정리합니다. |
| 알약 사진 분석 | 촬영하거나 선택한 알약 이미지를 AI 모델로 분석해 유사한 의약품 후보와 상세 정보를 제공합니다. |
| 의약품 검색 | 의약품명으로 약을 검색하고 효능, 복용법, 주의사항 등의 정보를 확인합니다. |
| 복약 일정 관리 | 복용 기간과 횟수를 등록하고 일정 및 알림을 관리합니다. |
| 병원 일정 관리 | 병원 예약 일정을 등록·조회·수정·삭제합니다. |
| 맞춤 건강관리 | 사용자 건강 정보와 저장된 기록을 바탕으로 건강관리 내용을 생성합니다. |
| 의료 AI 챗봇 | 앱 사용과 건강 정보에 관한 질문에 대화형으로 답변합니다. |
| 마이페이지 | 기본 정보, 건강 정보, 생활 습관과 저장된 문서를 관리합니다. |

## 기술 스택

### Frontend

- React Native 0.81, React 19
- Expo 54, Expo Router 6
- TypeScript
- Axios
- Expo Notifications, Image Picker, Image Manipulator

### Backend

- Python, FastAPI, Uvicorn
- SQLAlchemy, MySQL
- Firebase Admin
- OpenAI API
- PaddleOCR, OpenCV

### AI

- PyTorch 기반 알약 이미지 분류
- EfficientNet/ResNet 계열 모델 학습 및 추론
- 진단서·처방전 OCR 및 의료 용어 순화

## 프로젝트 구조

```text
2026_IPS_CareMe/
├── FrontEnd/                   # Expo 기반 모바일 애플리케이션
│   ├── app/                    # 화면 및 파일 기반 라우팅
│   ├── components/             # 공통 UI 컴포넌트
│   └── services/               # API 연동 로직
├── BackEnd/
│   ├── practice/               # 통합 FastAPI 서버 및 일정·의약품 API
│   ├── my_project/             # 회원, 문서, 마이페이지 API
│   ├── chatbot/                # 의료 AI 챗봇
│   └── pill_model_project/     # 알약 이미지 모델 학습·추론
├── AI/                         # AI 관련 실험 및 자료
├── Data/                       # 데이터 관련 파일
├── docs/                       # 프로젝트 문서
├── requirements.txt            # Python 통합 의존성
└── run_backend.ps1             # Windows 백엔드 실행 스크립트
```

## 시작하기

### 1. 저장소 복제

```bash
git clone https://github.com/t01036052072/2026_IPS_CareMe.git
cd 2026_IPS_CareMe
```

### 2. 백엔드 실행

Python 가상환경을 만들고 의존성을 설치합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

프로젝트 루트에 `.env` 파일을 준비합니다.

```dotenv
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=careme

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_openai_model

PUBLIC_DATA_SERVICE_KEY=your_public_data_service_key
PUBLIC_DATA_ENDPOINT=your_public_data_endpoint

# 선택 사항
FRONTEND_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
PILL_MODEL_DATA_DIR=BackEnd/pill_model_project
```

통합 API 서버를 실행합니다.

```powershell
Set-Location BackEnd
python -m uvicorn practice.mainjeong:app --host 0.0.0.0 --port 8000 --reload
```

서버 실행 후 다음 주소에서 API 명세를 확인할 수 있습니다.

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Firebase 푸시 알림을 사용하려면 별도의 `serviceAccountKey.json` 인증 파일이 필요합니다. 인증 파일과 `.env`는 저장소에 커밋하지 마세요.

### 3. 프런트엔드 실행

새 터미널에서 다음 명령을 실행합니다.

```powershell
Set-Location FrontEnd
npm install
npx expo start
```

실행 화면의 안내에 따라 Expo Go, Android 에뮬레이터, iOS 시뮬레이터 또는 웹에서 앱을 확인할 수 있습니다.

백엔드 주소가 다른 경우 프런트엔드 환경 변수에 API 주소를 지정합니다.

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP:8000
```

실제 모바일 기기에서는 `localhost`가 개발 PC를 가리키지 않으므로, 같은 네트워크에 연결된 개발 PC의 IP 주소를 사용해야 합니다.

## 주요 API 영역

| 경로 | 기능 |
| --- | --- |
| `/friend/user` | 회원가입, 로그인 및 사용자 관리 |
| `/friend/doc/documents` | 진단서·처방전 등록 및 관리 |
| `/friend/mypage` | 프로필과 건강 정보 관리 |
| `/pills` | 의약품 검색 및 상세 조회 |
| `/pill-photo` | 알약 사진 분석 |
| `/medications` | 복약 일정 관리 |
| `/appointments` | 병원 일정 관리 |
| `/healthcare` | 맞춤 건강관리 정보 생성 |
| `/chat` | 의료 AI 챗봇 |

## 브랜치 전략

```text
feature/* → develop → main
```

- `feature/*`: 기능 단위 개발 브랜치
- `develop`: 기능 통합 및 검증 브랜치
- `main`: 배포 가능한 안정 버전

기능 작업은 `develop`에서 새 `feature/*` 브랜치를 만든 뒤 Pull Request를 통해 `develop`에 병합합니다. 검증이 끝난 변경사항만 `main`으로 반영합니다.

## 의료정보 이용 안내

CARE ME가 제공하는 문서 분석, 알약 이미지 분류 및 챗봇 답변은 건강관리를 돕기 위한 참고 정보입니다. 의료진의 진단이나 처방을 대신하지 않으며, 실제 복약과 치료에 관한 결정은 반드시 의사 또는 약사와 상담해야 합니다. 알약 사진 분석 결과는 촬영 환경과 모델 정확도에 따라 달라질 수 있습니다.

## License

별도의 라이선스가 명시되기 전까지 이 프로젝트의 소스 코드와 자료에 대한 권리는 프로젝트 참여자에게 있습니다.
