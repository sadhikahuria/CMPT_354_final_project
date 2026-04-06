import mysql.connector

from ashtakoota.database import create_connection
from tests.base import AppIntegrationTestCase


class Phase1ConstraintsTestCase(AppIntegrationTestCase):
    def test_likes_trigger_rejects_self_like(self):
        connection = create_connection()
        cursor = connection.cursor()

        try:
            with self.assertRaises(mysql.connector.Error) as context:
                cursor.execute(
                    "INSERT INTO LIKES (UserA, UserB) VALUES (%s, %s)",
                    (1, 1),
                )

            error_message = str(context.exception).lower()

            self.assertIn("cannot like themselves", error_message)
        finally:
            connection.rollback()
            cursor.close()
            connection.close()


if __name__ == "__main__":
    import unittest

    unittest.main()
