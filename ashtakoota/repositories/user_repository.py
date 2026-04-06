def username_exists(cursor, username):
    cursor.execute(
        "SELECT 1 FROM USER WHERE Username = %s LIMIT 1",
        (username,),
    )
    return cursor.fetchone() is not None


def email_exists(cursor, email):
    cursor.execute(
        "SELECT 1 FROM USER WHERE Email = %s LIMIT 1",
        (email,),
    )
    return cursor.fetchone() is not None


def find_user_by_email(cursor, email):
    cursor.execute(
        """
        SELECT
            UserID,
            Username,
            Email,
            PasswordHash,
            RashiID,
            NakshatraID
        FROM USER
        WHERE Email = %s
        LIMIT 1
        """,
        (email,),
    )
    return cursor.fetchone()


def find_user_by_id(cursor, user_id):
    cursor.execute(
        """
        SELECT
            UserID,
            Username,
            Email,
            PasswordHash,
            RashiID,
            NakshatraID
        FROM USER
        WHERE UserID = %s
        LIMIT 1
        """,
        (user_id,),
    )
    return cursor.fetchone()


def list_discoverable_users(cursor, current_user_id):
    cursor.execute(
        """
        SELECT
            u.UserID,
            u.Username,
            u.DateOfBirth,
            u.BirthLocation,
            u.RashiID,
            r.RashiName,
            u.NakshatraID,
            n.NakshatraName
        FROM USER u
        JOIN RASHI r ON r.RashiID = u.RashiID
        JOIN NAKSHATRA n ON n.NakshatraID = u.NakshatraID
        WHERE u.UserID <> %s
        ORDER BY u.UserID
        """,
        (current_user_id,),
    )
    return cursor.fetchall()


def insert_user(cursor, registration):
    cursor.execute(
        """
        INSERT INTO USER (
            Username,
            Email,
            PasswordHash,
            DateOfBirth,
            TimeOfBirth,
            BirthLocation,
            RashiID,
            NakshatraID
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            registration.username,
            registration.email,
            registration.password_hash,
            registration.date_of_birth.isoformat(),
            registration.time_of_birth.isoformat(),
            registration.birth_location,
            registration.rashi_id,
            registration.nakshatra_id,
        ),
    )
    return cursor.lastrowid
