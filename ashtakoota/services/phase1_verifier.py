from ..database import create_connection, get_database_settings


REQUIRED_TABLES = [
    "PLANET",
    "RASHI",
    "NAKSHATRA",
    "USER",
    "MATCH_RECORD",
    "LIKES",
    "INVOLVES",
    "COMPATIBILITY_EVAL",
    "KOOTA_SCORE",
]

REQUIRED_TRIGGERS = [
    "trg_likes_no_self",
    "trg_involves_no_self",
    "trg_eval_no_self",
]

REFERENCE_DATA_EXPECTATIONS = {
    "PLANET": 9,
    "RASHI": 12,
    "NAKSHATRA": 27,
}


def get_database_health_report():
    settings = get_database_settings()

    with create_connection() as connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT DATABASE() AS active_database")
            active_database = cursor.fetchone()["active_database"]

    return {
        "status": "ok",
        "database": active_database,
        "host": settings.host,
        "port": settings.port,
        "config_warning": settings.config_warning,
    }


def get_schema_report():
    settings = get_database_settings()

    with create_connection() as connection:
        with connection.cursor(dictionary=True) as cursor:
            existing_tables = _fetch_existing_tables(cursor, settings.database)
            table_counts = _fetch_table_counts(cursor, existing_tables)
            trigger_names = _fetch_trigger_names(cursor, settings.database)

    return {
        "status": "ok",
        "database": settings.database,
        "table_counts": table_counts,
        "missing_tables": _find_missing_tables(existing_tables),
        "reference_data_checks": _build_reference_data_checks(table_counts),
        "triggers_found": trigger_names,
        "missing_triggers": _find_missing_triggers(trigger_names),
    }


def _fetch_existing_tables(cursor, database_name):
    cursor.execute(
        """
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s
        """,
        (database_name,),
    )
    return {row["TABLE_NAME"].upper() for row in cursor.fetchall()}


def _fetch_table_counts(cursor, existing_tables):
    return {
        table_name: _fetch_table_count(cursor, table_name)
        for table_name in REQUIRED_TABLES
        if table_name in existing_tables
    }


def _fetch_table_count(cursor, table_name):
    cursor.execute(f"SELECT COUNT(*) AS row_count FROM {table_name}")
    row = cursor.fetchone()
    return row["row_count"]


def _fetch_trigger_names(cursor, database_name):
    cursor.execute(
        """
        SELECT TRIGGER_NAME
        FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = %s
        ORDER BY TRIGGER_NAME
        """,
        (database_name,),
    )
    return [row["TRIGGER_NAME"] for row in cursor.fetchall()]


def _find_missing_tables(existing_tables):
    return [table_name for table_name in REQUIRED_TABLES if table_name not in existing_tables]


def _build_reference_data_checks(table_counts):
    return {
        f"{table_name.lower()}_seed_complete": table_counts.get(table_name) == expected_count
        for table_name, expected_count in REFERENCE_DATA_EXPECTATIONS.items()
    }


def _find_missing_triggers(trigger_names):
    return [
        trigger_name
        for trigger_name in REQUIRED_TRIGGERS
        if trigger_name not in trigger_names
    ]
