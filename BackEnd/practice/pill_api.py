"""import requests

SERVICE_KEY = "cbecf173a8fa70bf4831f332995dd981ae4c71d6523805ff0953c4e26928b7f2"

ENDPOINT = "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03"

def search_pill_by_name(name: str):

    params = {
        "serviceKey": SERVICE_KEY,
        "itemName": name,
        "type": "json"
    }

    response = requests.get(ENDPOINT, params=params)

    print("===== URL =====")
    print(response.url)

    print("===== RESPONSE =====")
    print(response.text)

    return response.text"""

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


"""def _extract_items(data: dict):
    body = data.get("body", {})
    items = body.get("items", [])

    if isinstance(items, dict):
        item = items.get("item", [])
        if isinstance(item, list):
            return item
        if isinstance(item, dict):
            return [item]

    if isinstance(items, list):
        return items

    return []"""

def _extract_items(data: dict):
    body = data.get("response", {}).get("body", {})

    if not body:
        body = data.get("body", {})

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
    if not SERVICE_KEY or not ENDPOINT:
        raise RuntimeError("공공데이터 API 설정이 없습니다.")

    params = {
        "serviceKey": SERVICE_KEY,
        "itemName": name,
        "type": "json",
        "pageNo": 1,
        "numOfRows": 50,
    }

    response = requests.get(ENDPOINT, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()
    items = _extract_items(data)

    return [
        {
            "pill_code": _get_value(item, "ITEM_SEQ", "itemSeq", "item_seq"),
            "pill_name": _get_value(item, "ITEM_NAME", "itemName", "item_name"),
            "enterprise": _get_value(item, "ENTP_NAME", "entpName", "entp_name"),
            "image_url": _get_value(item, "ITEM_IMAGE", "itemImage", "item_image"),
            "effect": _get_value(item, "EE_DOC_DATA", "efcyQesitm", "effect"),
            "side_effect": _get_value(item, "UD_DOC_DATA", "atpnQesitm", "side_effect"),
        }
        for item in items
        if _get_value(item, "ITEM_NAME", "itemName", "item_name")
    ]