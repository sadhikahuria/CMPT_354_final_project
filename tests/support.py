from datetime import date
import uuid

from ashtakoota.database import create_connection


def create_test_user(client, **overrides):
    unique_suffix = uuid.uuid4().hex[:8]
    payload = {
        "username": f"test_user_{unique_suffix}",
        "email": f"test_{unique_suffix}@example.com",
        "password": "securepass123",
        "date_of_birth": "2000-01-02",
        "time_of_birth": "08:30:00",
        "birth_location": "Surrey, BC",
        "rashi_id": 1,
        "nakshatra_id": 1,
    }
    payload.update(overrides)

    response = client.post("/auth/register", json=payload)
    if response.status_code != 201:
        raise AssertionError(
            f"Expected test user creation to succeed, got {response.status_code}: {response.get_data(as_text=True)}"
        )

    return payload


def login_test_user(client, user):
    response = client.post(
        "/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )
    if response.status_code != 200:
        raise AssertionError(
            f"Expected test login to succeed, got {response.status_code}: {response.get_data(as_text=True)}"
        )
    return response


def delete_test_users():
    with create_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM USER WHERE Email LIKE 'test_%@example.com'")
        connection.commit()


def expected_age(date_of_birth_iso, reference_date=None):
    date_of_birth = date.fromisoformat(date_of_birth_iso)
    today = reference_date or date.today()
    years = today.year - date_of_birth.year
    had_birthday = (today.month, today.day) >= (date_of_birth.month, date_of_birth.day)
    return years if had_birthday else years - 1
