print("app_navigation 로드됨")

APP_COMMANDS = {

    "마이페이지": {
        "reply": "홈 화면 상단의 마이페이지 탭에서 확인할 수 있어요.",
        "route": "/mypage"
    },

    "약 검색": {
        "reply": "검색 탭에서 약 정보를 검색할 수 있어요.",
        "route": "/pill"
    },

    "채팅": {
        "reply": "하단 챗봇 메뉴에서 이용할 수 있어요.",
        "route": "/chat"
    },

    "일정 관리": {
        "reply": "일정관리 탭에서 병원 예약 일정을 확인할 수 있어요.",
        "route": "/calendar"
    }
}


def find_app_command(message: str):

    for keyword, value in APP_COMMANDS.items():

        if keyword in message:
            return value

    return None