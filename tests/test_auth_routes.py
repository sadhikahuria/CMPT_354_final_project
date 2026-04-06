import uuid

from ashtakoota.database import create_connection
from tests.base import AppIntegrationTestCase
from werkzeug.security import check_password_hash


class AuthRoutesTestCase(AppIntegrationTestCase):
    def tearDown(self):
        self._delete_test_users()
        super().tearDown()

    def test_register_creates_user_with_hashed_password(self):
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

        response = self.client.post("/auth/register", json=payload)
        response_payload = response.get_json()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response_payload["status"], "created")
        self.assertEqual(response_payload["user"]["username"], payload["username"])
        self.assertEqual(response_payload["user"]["email"], payload["email"])

        stored_user = self._fetch_user_by_email(payload["email"])

        self.assertIsNotNone(stored_user)
        self.assertNotEqual(stored_user["PasswordHash"], payload["password"])
        self.assertTrue(check_password_hash(stored_user["PasswordHash"], payload["password"]))

    def test_register_rejects_invalid_payload(self):
        payload = {
            "username": "bad_user",
            "email": "not-an-email",
            "password": "short",
            "date_of_birth": "2000-01-02",
            "time_of_birth": "08:30:00",
            "birth_location": "Surrey, BC",
            "rashi_id": 1,
            "nakshatra_id": 1,
        }

        response = self.client.post("/auth/register", json=payload)
        response_payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response_payload["status"], "error")
        self.assertIn("email", response_payload["message"])

    def _fetch_user_by_email(self, email):
        with create_connection() as connection:
            with connection.cursor(dictionary=True) as cursor:
                cursor.execute(
                    """
                    SELECT UserID, Username, Email, PasswordHash
                    FROM USER
                    WHERE Email = %s
                    """,
                    (email,),
                )
                return cursor.fetchone()

    def _delete_test_users(self):
        with create_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM USER WHERE Email LIKE 'test_%@example.com'"
                )
            connection.commit()


if __name__ == "__main__":
    import unittest

    unittest.main()
