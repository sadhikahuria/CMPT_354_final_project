from flask import Blueprint, jsonify


core_blueprint = Blueprint("core", __name__)


@core_blueprint.get("/")
def home():
    return jsonify(
        {
            "message": "Ashtakoota app is running.",
            "phase": "Phase 2 - auth and discovery foundation",
            "next_routes": [
                "/health/db",
                "/phase1/schema-check",
                "/auth/register",
                "/auth/login",
                "/users/discover",
            ],
        }
    )
