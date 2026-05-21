import os
import requests
from dotenv import load_dotenv

load_dotenv()

SERVICE_KEY = os.getenv("PUBLIC_DATA_SERVICE_KEY")

ENDPOINT = os.getenv("PUBLIC_DATA_ENDPOINT")

def _get_value(item: dict, *keys):
    for key in keys:
        value = item.get(key)

        if value:
            return value

    return None


def _extract_items(data: dict):

    body = (
        data.get("body")
        or data.get("response", {}).get("body", {})
    )

    items = body.get("items", [])

    if isinstance(items, dict):
        item = items.get("item", [])

        if isinstance(item, list):
            return item

        if isinstance(item, dict):
            return [item]

    if isinstance(items, list):
        return items

    return []


def search_pill_by_name(name: str):

    params = {
        "serviceKey": SERVICE_KEY,
        "itemName": name,
        "type": "json",
        "pageNo": 1,
        "numOfRows": 30,
    }

    response = requests.get(
        ENDPOINT,
        params=params,
        timeout=10,
    )

    response.raise_for_status()

    data = response.json()

    items = _extract_items(data)

    return [
        {
            "pill_code": _get_value(item, "itemSeq"),
            "pill_name": _get_value(item, "itemName"),
            "enterprise": _get_value(item, "entpName"),

            # 이미지
            "image_url": _get_value(item, "itemImage"),

            # 효능효과
            "effect": _get_value(item, "efcyQesitm"),

            # 복용법
            "use_method": _get_value(item, "useMethodQesitm"),

            # 경고
            "warning": _get_value(item, "atpnWarnQesitm"),

            # 상호작용
            "interaction": _get_value(item, "intrcQesitm"),

            # 부작용
            "side_effect": _get_value(item, "seQesitm"),
        }
        for item in items
    ]