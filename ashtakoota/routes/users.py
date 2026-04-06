from dataclasses import asdict

from flask import Blueprint, jsonify, session

from ..services.auth_service import AuthenticationError, get_authenticated_user_by_id
from ..services.discovery_service import get_discoverable_users


users_blueprint = Blueprint("users", __name__, url_prefix="/users")


@users_blueprint.get("/discover")
def discover_users():
    try:
        current_user = get_authenticated_user_by_id(session.get("user_id"))
    except AuthenticationError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 401

    users = get_discoverable_users(current_user.user_id)

    return jsonify(
        {
            "status": "ok",
            "users": [asdict(user) for user in users],
        }
    )
