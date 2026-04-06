from dataclasses import asdict

from flask import Blueprint, jsonify, request, session

from ..services.auth_service import AuthenticationError, get_authenticated_user_by_id
from ..services.discovery_service import (
    DiscoveryValidationError,
    build_discovery_filters,
    get_discoverable_users,
)


users_blueprint = Blueprint("users", __name__, url_prefix="/users")


@users_blueprint.get("/discover")
def discover_users():
    try:
        current_user = get_authenticated_user_by_id(session.get("user_id"))
    except AuthenticationError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 401

    try:
        filters = build_discovery_filters(
            min_age_raw=request.args.get("min_age"),
            max_age_raw=request.args.get("max_age"),
        )
    except DiscoveryValidationError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400

    users = get_discoverable_users(current_user.user_id, filters=filters)

    return jsonify(
        {
            "status": "ok",
            "filters": asdict(filters),
            "users": [asdict(user) for user in users],
        }
    )
