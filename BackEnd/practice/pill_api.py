import requests

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

    return response.text