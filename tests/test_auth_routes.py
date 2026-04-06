from ashtakoota.database import create_connection
from tests.base import AppIntegrationTestCase
from tests.support import create_test_user, delete_test_users, login_test_user
from werkzeug.security import check_password_hash


class AuthRoutesTestCase(AppIntegrationTestCase):
    def tearDown(self):
        delete_test_users()
        super().tearDown()

    def test_register_creates_user_with_hashed_password(self):
        payload = create_test_user(self.client)

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

    def test_login_accepts_valid_credentials(self):
        user = create_test_user(self.client)
        payload = {
            "email": user["email"],
            "password": user["password"],
        }

        response = self.client.post("/auth/login", json=payload)
        response_payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_payload["status"], "ok")
        self.assertEqual(response_payload["user"]["email"], user["email"])
        self.assertEqual(response_payload["user"]["username"], user["username"])
        self.assertIn("signed Flask session", response_payload["note"])

    def test_login_rejects_wrong_password(self):
        user = create_test_user(self.client)
        payload = {
            "email": user["email"],
            "password": "wrong-password",
        }

        response = self.client.post("/auth/login", json=payload)
        response_payload = response.get_json()

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response_payload["status"], "error")
        self.assertEqual(response_payload["message"], "Invalid email or password.")

    def test_me_requires_login(self):
        response = self.client.get("/auth/me")
        response_payload = response.get_json()

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response_payload["status"], "error")
        self.assertEqual(response_payload["message"], "Authentication required.")

    def test_login_sets_session_and_logout_clears_it(self):
        user = create_test_user(self.client)
        login_response = login_test_user(self.client, user)
        self.assertEqual(login_response.status_code, 200)

        me_response = self.client.get("/auth/me")
        me_payload = me_response.get_json()
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_payload["user"]["email"], user["email"])

        logout_response = self.client.post("/auth/logout")
        logout_payload = logout_response.get_json()
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_payload["message"], "Logged out successfully.")

        me_after_logout_response = self.client.get("/auth/me")
        me_after_logout_payload = me_after_logout_response.get_json()
        self.assertEqual(me_after_logout_response.status_code, 401)
        self.assertEqual(me_after_logout_payload["message"], "Authentication required.")

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


if __name__ == "__main__":
    import unittest

    unittest.main()
