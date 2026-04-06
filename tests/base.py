import unittest

from ashtakoota import create_app


class AppIntegrationTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.app = create_app()
        cls.database_settings = cls.app.extensions["database_settings"]

    def setUp(self):
        super().setUp()
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

    def tearDown(self):
        self.app_context.pop()
        super().tearDown()
