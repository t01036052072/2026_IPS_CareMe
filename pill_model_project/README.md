# Pill Model Project

PyTorch 기반 알약 이미지 분류 프로젝트입니다.  
폴더명 `K-000027` 같은 값을 class label로 사용해 학습하고, 촬영한 알약 이미지의 Top-5 후보를 예측합니다.

## 의료 안전 문구

본 모델의 결과는 참고용이며, 최종 복약 판단은 반드시 의사 또는 약사에게 확인해야 합니다.

## 폴더 구조

```text
pill_model_project/
  train.py
  predict.py
  dataset.py
  utils.py
  requirements.txt
  checkpoints/
  README.md
```

기본 데이터 경로:

```text
H:\내 드라이브\pill_project\data_100_per_pill_matched
```

지원하는 기본 데이터 구조:

```text
data_100_per_pill_matched/
  images/
    K-000027/
      image1.png
      ...
    K-000030/
      ...
  labels/
    K-000027_json/
      image1.json
      ...
```

학습에는 `images` 폴더를 우선 사용합니다.

## 설치

Windows VS Code 터미널에서:

```powershell
cd C:\Users\grmar\IPS\IPS_backend\pill_model_project
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

CUDA가 잡히는지 확인:

```powershell
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

노트북 GPU VRAM이 2GB라면 `batch_size`는 `4` 또는 `8`부터 시작하는 것을 권장합니다.

## 학습

먼저 label과 약 이름을 연결하는 메타데이터를 만듭니다.

```powershell
python build_metadata.py --data_dir "H:\내 드라이브\pill_project\data_100_per_pill_matched"
```

이 명령은 `data_100_per_pill_matched\metadata.csv`를 생성합니다.
라벨 JSON에서 약 이름, 회사명, 학습 원본 이미지 경로를 채웁니다.

실제 촬영 사진에 더 잘 맞추려면 bbox 기준 crop 학습셋을 먼저 만드세요.

```powershell
python build_cropped_dataset.py `
  --data_dir "H:\내 드라이브\pill_project\data_100_per_pill_matched" `
  --output_dir "H:\내 드라이브\pill_project\data_100_per_pill_cropped"
```

이후 학습은 cropped 데이터셋으로 돌리는 것을 권장합니다.

효능/부작용까지 자동으로 채우려면 DB나 공공데이터에서 export한 CSV를 같이 넘길 수 있습니다.
CSV에 `pill_name`, `effect`, `side_effect`, `use_method`, `warning`, `precaution`, `interaction`, `image_url` 같은 컬럼이 있으면 병합됩니다.

```powershell
python build_metadata.py --pill_info_csv "C:\path\to\pills_export.csv"
```

기본값으로 학습:

```powershell
python train.py
```

명시적으로 실행:

```powershell
python train.py --data_dir "H:\내 드라이브\pill_project\data_100_per_pill_matched" --epochs 20 --batch_size 8
```

crop 데이터셋으로 새로 학습:

```powershell
python train.py --data_dir "H:\내 드라이브\pill_project\data_100_per_pill_cropped" --epochs 25 --batch_size 4 --fresh
```

모델 선택:

```powershell
python train.py --model_name efficientnet_b0
python train.py --model_name resnet18
```

## 이어 학습

`checkpoints/checkpoint.pth`가 있으면 자동으로 마지막 epoch 다음부터 이어서 학습합니다.

```powershell
python train.py --epochs 30 --batch_size 8
```

예를 들어 이전에 20 epoch까지 끝났고 위 명령을 실행하면 21 epoch부터 30 epoch까지 학습합니다.

## 저장 파일

매 epoch 종료:

```text
checkpoints/checkpoint.pth
```

validation accuracy가 가장 좋을 때:

```text
checkpoints/final_model.pth
```

체크포인트에는 다음이 저장됩니다:

- 모델 가중치
- optimizer 상태
- epoch 번호
- class_names
- best validation accuracy

## 추론

```powershell
python predict.py --image_path "C:\Users\user\Desktop\test_pill.jpg"
```

결과:

- Top-5 후보와 확률
- 예측 라벨
- 약 이름
- 효능
- 부작용
- 신뢰도
- 업로드 이미지 표시
- 같은 label의 학습 원본 이미지 1장 표시

최고 확률이 95% 미만이면 다음 문구를 출력합니다:

```text
정확도가 낮습니다. 다시 촬영해 주세요.
```

## CSV 데이터 확장

처음 구현은 ImageFolder 방식을 우선 사용합니다.  
추후 한 폴더에 이미지가 몰려 있는 경우를 위해 `labels.csv` 기반 스캔 함수도 준비되어 있습니다.

CSV 형식:

```csv
image_path,label
images/sample1.png,K-000027
```

학습 시:

```powershell
python train.py --csv
```
