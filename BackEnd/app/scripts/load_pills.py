import os
import requests
from dotenv import load_dotenv

from app.database import SessionLocal
from core.models import Pill

load_dotenv()

SERVICE_KEY = os.getenv("PUBLIC_DATA_SERVICE_KEY")

ENDPOINT = (
    "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"
)


db = SessionLocal()

page = 1

while True:

    print(f"page={page} 수집중...")

    params = {
        "serviceKey": SERVICE_KEY,
        "pageNo": page,
        "numOfRows": 100,
        "type": "json",
    }

    response = requests.get(
        ENDPOINT,
        params=params,
        timeout=20,
    )

    data = response.json()

    body = data.get("body") or data.get("response", {}).get("body", {})

    items = body.get("items", [])

    if isinstance(items, dict):
        items = items.get("item", [])

    if not items:
        print("수집 완료")
        break

    for item in items:

        pill_code = item.get("itemSeq")

        exists = (
            db.query(Pill)
            .filter(Pill.pill_code == pill_code)
            .first()
        )

        if exists:
            continue

        pill = Pill(
            pill_code=pill_code,
            pill_name=item.get("itemName"),
            enterprise=item.get("entpName"),
            image_url=item.get("itemImage"),

            effect=item.get("efcyQesitm"),
            use_method=item.get("useMethodQesitm"),
            warning=item.get("atpnWarnQesitm"),
            interaction=item.get("intrcQesitm"),
            side_effect=item.get("seQesitm"),
        )

        db.add(pill)

    db.commit()

    page += 1

print("전체 저장 완료")
