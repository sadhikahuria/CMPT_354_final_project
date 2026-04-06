import mysql.connector
from flask import current_app


DATABASE_SETTINGS_KEY = "database_settings"


def register_database_settings(app, database_settings):
    app.extensions[DATABASE_SETTINGS_KEY] = database_settings


def get_database_settings():
    return current_app.extensions[DATABASE_SETTINGS_KEY]


def create_connection():
    settings = get_database_settings()
    return mysql.connector.connect(
        host=settings.host,
        port=settings.port,
        user=settings.user,
        password=settings.password,
        database=settings.database,
        connection_timeout=5,
    )
