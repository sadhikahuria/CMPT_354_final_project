from tests.base import AppIntegrationTestCase


class Phase1RoutesTestCase(AppIntegrationTestCase):

    def test_home_route(self):
        response = self.client.get("/")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["phase"], "Phase 2 - auth and discovery foundation")
        self.assertIn("/health/db", payload["next_routes"])
        self.assertIn("/auth/register", payload["next_routes"])
        self.assertIn("/auth/login", payload["next_routes"])
        self.assertIn("/users/discover", payload["next_routes"])

    def test_database_health_route(self):
        response = self.client.get("/health/db")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["database"], self.database_settings.database)

    def test_schema_check_route(self):
        response = self.client.get("/phase1/schema-check")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["missing_tables"], [])
        self.assertEqual(payload["missing_triggers"], [])
        self.assertTrue(payload["reference_data_checks"]["planet_seed_complete"])
        self.assertTrue(payload["reference_data_checks"]["rashi_seed_complete"])
        self.assertTrue(payload["reference_data_checks"]["nakshatra_seed_complete"])


if __name__ == "__main__":
    import unittest

    unittest.main()
