from flask import Blueprint, jsonify, redirect, url_for


core_blueprint = Blueprint("core", __name__)


@core_blueprint.get("/")
def home():
    return redirect(url_for("ui.index"))


@core_blueprint.get("/api")
def api_home():
    return jsonify(
        {
            "message": "Ashtakoota app is running.",
            "phase": "Phase 2 - auth, discovery, and first UI",
            "next_routes": [
                "/",
                "/ui/",
                "/api",
                "/health/db",
                "/phase1/schema-check",
                "/auth/register",
                "/auth/login",
                "/users/discover",
            ],
        }
    )
