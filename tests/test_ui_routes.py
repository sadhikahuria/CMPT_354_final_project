from tests.base import AppIntegrationTestCase


class UiRoutesTestCase(AppIntegrationTestCase):
    def test_ui_index_renders_html(self):
        response = self.client.get("/ui/")
        page = response.get_data(as_text=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn("Ashtakoota Matchmaking", page)
        self.assertIn("Create Account", page)
        self.assertIn("Discover Users", page)


if __name__ == "__main__":
    import unittest

    unittest.main()
