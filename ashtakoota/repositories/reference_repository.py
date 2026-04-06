def list_rashis(cursor):
    cursor.execute(
        """
        SELECT RashiID, RashiName
        FROM RASHI
        ORDER BY RashiID
        """
    )
    return cursor.fetchall()


def list_nakshatras(cursor):
    cursor.execute(
        """
        SELECT NakshatraID, NakshatraName
        FROM NAKSHATRA
        ORDER BY NakshatraID
        """
    )
    return cursor.fetchall()
