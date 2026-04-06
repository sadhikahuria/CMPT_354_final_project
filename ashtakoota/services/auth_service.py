from dataclasses import dataclass
from datetime import date, time

from werkzeug.security import check_password_hash, generate_password_hash

from ..database import create_connection
from ..repositories.user_repository import (
    email_exists,
    find_user_by_email,
    insert_user,
    username_exists,
)


@dataclass(frozen=True)
class RegistrationRequest:
    username: str
    email: str
    password: str
    date_of_birth: date
    time_of_birth: time
    birth_location: str
    rashi_id: int
    nakshatra_id: int


@dataclass(frozen=True)
class RegisteredUser:
    user_id: int
    username: str
    email: str
    rashi_id: int
    nakshatra_id: int


@dataclass(frozen=True)
class LoginRequest:
    email: str
    password: str


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: int
    username: str
    email: str
    rashi_id: int
    nakshatra_id: int


@dataclass(frozen=True)
class _PersistedRegistration:
    username: str
    email: str
    password_hash: str
    date_of_birth: date
    time_of_birth: time
    birth_location: str
    rashi_id: int
    nakshatra_id: int


class RegistrationValidationError(ValueError):
    pass


class RegistrationConflictError(ValueError):
    pass


class LoginValidationError(ValueError):
    pass


class AuthenticationError(ValueError):
    pass


def register_user(payload):
    registration = _validate_registration_payload(payload)
    password_hash = generate_password_hash(registration.password)

    with create_connection() as connection:
        with connection.cursor() as cursor:
            if username_exists(cursor, registration.username):
                raise RegistrationConflictError("Username is already taken.")

            if email_exists(cursor, registration.email):
                raise RegistrationConflictError("Email is already registered.")

            user_id = insert_user(
                cursor,
                registration=_PersistedRegistration(
                    username=registration.username,
                    email=registration.email,
                    password_hash=password_hash,
                    date_of_birth=registration.date_of_birth,
                    time_of_birth=registration.time_of_birth,
                    birth_location=registration.birth_location,
                    rashi_id=registration.rashi_id,
                    nakshatra_id=registration.nakshatra_id,
                ),
            )
        connection.commit()

    return RegisteredUser(
        user_id=user_id,
        username=registration.username,
        email=registration.email,
        rashi_id=registration.rashi_id,
        nakshatra_id=registration.nakshatra_id,
    )


def authenticate_user(payload):
    login_request = _validate_login_payload(payload)

    with create_connection() as connection:
        with connection.cursor(dictionary=True) as cursor:
            stored_user = find_user_by_email(cursor, login_request.email)

    if stored_user is None:
        raise AuthenticationError("Invalid email or password.")

    if not check_password_hash(stored_user["PasswordHash"], login_request.password):
        raise AuthenticationError("Invalid email or password.")

    return AuthenticatedUser(
        user_id=stored_user["UserID"],
        username=stored_user["Username"],
        email=stored_user["Email"],
        rashi_id=stored_user["RashiID"],
        nakshatra_id=stored_user["NakshatraID"],
    )


def _validate_registration_payload(payload):
    if not isinstance(payload, dict):
        raise RegistrationValidationError("Request body must be a JSON object.")

    username = _require_non_empty_string(
        payload,
        "username",
        RegistrationValidationError,
    )
    email = _require_non_empty_string(
        payload,
        "email",
        RegistrationValidationError,
    )
    password = _require_non_empty_string(
        payload,
        "password",
        RegistrationValidationError,
    )
    birth_location = _require_non_empty_string(
        payload,
        "birth_location",
        RegistrationValidationError,
    )
    date_of_birth = _parse_date(payload.get("date_of_birth"))
    time_of_birth = _parse_time(payload.get("time_of_birth"))
    rashi_id = _parse_positive_int(payload.get("rashi_id"), "rashi_id")
    nakshatra_id = _parse_positive_int(payload.get("nakshatra_id"), "nakshatra_id")

    if "@" not in email:
        raise RegistrationValidationError("email must look like a valid email address.")

    if len(password) < 8:
        raise RegistrationValidationError("password must be at least 8 characters long.")

    return RegistrationRequest(
        username=username,
        email=email,
        password=password,
        date_of_birth=date_of_birth,
        time_of_birth=time_of_birth,
        birth_location=birth_location,
        rashi_id=rashi_id,
        nakshatra_id=nakshatra_id,
    )


def _validate_login_payload(payload):
    if not isinstance(payload, dict):
        raise LoginValidationError("Request body must be a JSON object.")

    email = _require_non_empty_string(payload, "email", LoginValidationError)
    password = _require_non_empty_string(payload, "password", LoginValidationError)

    if "@" not in email:
        raise LoginValidationError("email must look like a valid email address.")

    return LoginRequest(
        email=email,
        password=password,
    )


def _require_non_empty_string(payload, field_name, error_type):
    value = payload.get(field_name)
    if not isinstance(value, str) or not value.strip():
        raise error_type(f"{field_name} is required.")
    return value.strip()


def _parse_date(value):
    if not isinstance(value, str):
        raise RegistrationValidationError("date_of_birth must use YYYY-MM-DD format.")

    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise RegistrationValidationError(
            "date_of_birth must use YYYY-MM-DD format."
        ) from exc


def _parse_time(value):
    if not isinstance(value, str):
        raise RegistrationValidationError("time_of_birth must use HH:MM[:SS] format.")

    try:
        return time.fromisoformat(value)
    except ValueError as exc:
        raise RegistrationValidationError(
            "time_of_birth must use HH:MM[:SS] format."
        ) from exc


def _parse_positive_int(value, field_name):
    try:
        parsed_value = int(value)
    except (TypeError, ValueError) as exc:
        raise RegistrationValidationError(
            f"{field_name} must be a positive integer."
        ) from exc

    if parsed_value <= 0:
        raise RegistrationValidationError(f"{field_name} must be a positive integer.")

    return parsed_value
