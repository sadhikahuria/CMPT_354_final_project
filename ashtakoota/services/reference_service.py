from dataclasses import dataclass

from ..database import create_connection
from ..repositories.reference_repository import list_nakshatras, list_rashis


@dataclass(frozen=True)
class ReferenceOption:
    id: int
    name: str


def get_registration_reference_options():
    with create_connection() as connection:
        with connection.cursor(dictionary=True) as cursor:
            rashi_rows = list_rashis(cursor)
            nakshatra_rows = list_nakshatras(cursor)

    return {
        "rashis": [
            ReferenceOption(id=row["RashiID"], name=row["RashiName"])
            for row in rashi_rows
        ],
        "nakshatras": [
            ReferenceOption(id=row["NakshatraID"], name=row["NakshatraName"])
            for row in nakshatra_rows
        ],
    }
