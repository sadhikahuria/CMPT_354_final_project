from tests.base import AppIntegrationTestCase


class Phase1RoutesTestCase(AppIntegrationTestCase):

    def test_root_route_redirects_to_ui(self):
        response = self.client.get("/", follow_redirects=False)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/ui/")

    def test_api_home_route(self):
        response = self.client.get("/api")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["phase"], "Phase 2 - auth, discovery, and first UI")
        self.assertIn("/", payload["next_routes"])
        self.assertIn("/ui/", payload["next_routes"])
        self.assertIn("/api", payload["next_routes"])
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
