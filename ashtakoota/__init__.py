from flask import Flask

from .config import load_app_security_settings, load_database_settings
from .database import register_database_settings
from .routes.auth import auth_blueprint
from .routes.core import core_blueprint
from .routes.phase1 import phase1_blueprint
from .routes.ui import ui_blueprint
from .routes.users import users_blueprint


def create_app(database_settings=None):
    app = Flask(__name__)

    settings = database_settings or load_database_settings()
    security_settings = load_app_security_settings()

    app.config["SECRET_KEY"] = security_settings.secret_key

    register_database_settings(app, settings)

    app.register_blueprint(core_blueprint)
    app.register_blueprint(phase1_blueprint)
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(users_blueprint)
    app.register_blueprint(ui_blueprint)

    return app
