LABEL_TO_DRUG_NAME = {
    "K-000034": "\ud398\ub2c8\ub77c\ubbfc\uc815 2mg",
    "K-000117": "\uc561\ud2f0\ud53c\ub4dc\uc815 60mg/PTP",
}

LABEL_TO_DB_KEYWORDS = {
    "K-000034": ["\ud398\ub2c8\ub77c\ubbfc", "\ud398\ub2c8\ub77c\ubbfc\uc815"],
    "K-000117": ["\uc561\ud2f0\ud53c\ub4dc", "\uc561\ud2f0\ud53c\ub4dc\uc815"],
}


def drug_name_for_label(label: str) -> str:
    return LABEL_TO_DRUG_NAME.get(label, label)


def db_keywords_for_label(label: str) -> list[str]:
    return LABEL_TO_DB_KEYWORDS.get(label, [])
