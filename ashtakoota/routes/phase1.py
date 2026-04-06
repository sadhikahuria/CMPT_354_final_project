from flask import Blueprint, jsonify
import mysql.connector

from ..services.phase1_verifier import get_database_health_report, get_schema_report


phase1_blueprint = Blueprint("phase1", __name__)


@phase1_blueprint.get("/health/db")
def db_health():
    try:
        return jsonify(get_database_health_report())
    except mysql.connector.Error as exc:
        return jsonify(_build_error_response(exc)), 500


@phase1_blueprint.get("/phase1/schema-check")
def schema_check():
    try:
        return jsonify(get_schema_report())
    except mysql.connector.Error as exc:
        return jsonify(_build_error_response(exc)), 500


def _build_error_response(exc):
    return {
        "status": "error",
        "error_type": type(exc).__name__,
        "message": str(exc),
    }
