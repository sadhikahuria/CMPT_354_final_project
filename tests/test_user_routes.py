from tests.base import AppIntegrationTestCase
from tests.support import create_test_user, delete_test_users, expected_age, login_test_user


class UserRoutesTestCase(AppIntegrationTestCase):
    def tearDown(self):
        delete_test_users()
        super().tearDown()

    def test_discover_requires_login(self):
        response = self.client.get("/users/discover")
        payload = response.get_json()

        self.assertEqual(response.status_code, 401)
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["message"], "Authentication required.")

    def test_discover_excludes_current_user_and_derives_age(self):
        current_user = create_test_user(
            self.client,
            username="test_current_user",
            email="test_current_user@example.com",
            date_of_birth="2001-06-15",
            rashi_id=2,
            nakshatra_id=2,
        )
        other_user = create_test_user(
            self.client,
            username="test_other_user",
            email="test_other_user@example.com",
            date_of_birth="1999-12-31",
            rashi_id=3,
            nakshatra_id=3,
            birth_location="Burnaby, BC",
        )

        login_test_user(self.client, current_user)

        response = self.client.get("/users/discover")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")

        usernames = [user["username"] for user in payload["users"]]
        self.assertNotIn(current_user["username"], usernames)
        self.assertIn(other_user["username"], usernames)

        discovered_user = next(
            user for user in payload["users"] if user["username"] == other_user["username"]
        )
        self.assertEqual(discovered_user["birth_location"], other_user["birth_location"])
        self.assertEqual(discovered_user["rashi_id"], other_user["rashi_id"])
        self.assertEqual(discovered_user["nakshatra_id"], other_user["nakshatra_id"])
        self.assertEqual(
            discovered_user["age"],
            expected_age(other_user["date_of_birth"]),
        )

    def test_discover_filters_by_age_range(self):
        current_user = create_test_user(
            self.client,
            username="test_filter_current_user",
            email="test_filter_current_user@example.com",
            date_of_birth="2001-06-15",
        )
        younger_user = create_test_user(
            self.client,
            username="test_younger_user",
            email="test_younger_user@example.com",
            date_of_birth="2004-01-01",
        )
        matching_user = create_test_user(
            self.client,
            username="test_matching_user",
            email="test_matching_user@example.com",
            date_of_birth="1999-01-01",
        )

        login_test_user(self.client, current_user)

        response = self.client.get("/users/discover?min_age=25&max_age=28")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["filters"]["min_age"], 25)
        self.assertEqual(payload["filters"]["max_age"], 28)

        usernames = [user["username"] for user in payload["users"]]
        self.assertNotIn(younger_user["username"], usernames)
        self.assertIn(matching_user["username"], usernames)

    def test_discover_rejects_invalid_age_filters(self):
        current_user = create_test_user(
            self.client,
            username="test_invalid_filter_user",
            email="test_invalid_filter_user@example.com",
        )
        login_test_user(self.client, current_user)

        response = self.client.get("/users/discover?min_age=abc")
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["message"], "min_age must be a non-negative integer.")


if __name__ == "__main__":
    import unittest

    unittest.main()
