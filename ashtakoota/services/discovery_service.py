from dataclasses import dataclass
from datetime import date

from ..database import create_connection
from ..repositories.user_repository import list_discoverable_users


@dataclass(frozen=True)
class DiscoverableUser:
    user_id: int
    username: str
    birth_location: str
    rashi_id: int
    rashi_name: str
    nakshatra_id: int
    nakshatra_name: str
    age: int


def get_discoverable_users(current_user_id, reference_date=None):
    today = reference_date or date.today()

    with create_connection() as connection:
        with connection.cursor(dictionary=True) as cursor:
            rows = list_discoverable_users(cursor, current_user_id)

    return [
        DiscoverableUser(
            user_id=row["UserID"],
            username=row["Username"],
            birth_location=row["BirthLocation"],
            rashi_id=row["RashiID"],
            rashi_name=row["RashiName"],
            nakshatra_id=row["NakshatraID"],
            nakshatra_name=row["NakshatraName"],
            age=_calculate_age(row["DateOfBirth"], today),
        )
        for row in rows
    ]


def _calculate_age(date_of_birth, reference_date):
    years = reference_date.year - date_of_birth.year
    had_birthday = (reference_date.month, reference_date.day) >= (
        date_of_birth.month,
        date_of_birth.day,
    )
    return years if had_birthday else years - 1
