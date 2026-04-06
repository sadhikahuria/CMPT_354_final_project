from dataclasses import asdict

from flask import Blueprint, jsonify, request

from ..services.auth_service import (
    RegistrationConflictError,
    RegistrationValidationError,
    register_user,
)


auth_blueprint = Blueprint("auth", __name__, url_prefix="/auth")


@auth_blueprint.post("/register")
def register():
    try:
        registered_user = register_user(request.get_json(silent=True))
    except RegistrationValidationError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
    except RegistrationConflictError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 409

    return (
        jsonify(
            {
                "status": "created",
                "user": asdict(registered_user),
                "note": (
                    "This Phase 2 slice accepts pre-derived rashi_id and "
                    "nakshatra_id. Birth-data derivation will be added later."
                ),
            }
        ),
        201,
    )
