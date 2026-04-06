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


@dataclass(frozen=True)
class DiscoveryFilters:
    min_age: int | None = None
    max_age: int | None = None


class DiscoveryValidationError(ValueError):
    pass


def build_discovery_filters(min_age_raw=None, max_age_raw=None):
    min_age = _parse_optional_age(min_age_raw, "min_age")
    max_age = _parse_optional_age(max_age_raw, "max_age")

    if min_age is not None and max_age is not None and min_age > max_age:
        raise DiscoveryValidationError("min_age cannot be greater than max_age.")

    return DiscoveryFilters(
        min_age=min_age,
        max_age=max_age,
    )


def get_discoverable_users(current_user_id, filters=None, reference_date=None):
    today = reference_date or date.today()
    discovery_filters = filters or DiscoveryFilters()

    with create_connection() as connection:
        with connection.cursor(dictionary=True) as cursor:
            rows = list_discoverable_users(cursor, current_user_id)

    discovered_users = [
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

    return [
        user for user in discovered_users if _matches_age_filters(user, discovery_filters)
    ]


def _matches_age_filters(user, filters):
    if filters.min_age is not None and user.age < filters.min_age:
        return False

    if filters.max_age is not None and user.age > filters.max_age:
        return False

    return True


def _calculate_age(date_of_birth, reference_date):
    years = reference_date.year - date_of_birth.year
    had_birthday = (reference_date.month, reference_date.day) >= (
        date_of_birth.month,
        date_of_birth.day,
    )
    return years if had_birthday else years - 1


def _parse_optional_age(raw_value, field_name):
    if raw_value is None or raw_value == "":
        return None

    try:
        parsed_value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise DiscoveryValidationError(f"{field_name} must be a non-negative integer.") from exc

    if parsed_value < 0:
        raise DiscoveryValidationError(f"{field_name} must be a non-negative integer.")

    return parsed_value
