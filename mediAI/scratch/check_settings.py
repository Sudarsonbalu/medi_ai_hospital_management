import sys
import os

backend_dir = r"d:\PROJEC T\mediAI\backend"
sys.path.append(backend_dir)

from database import get_db_connection

def check_settings():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM settings")
        settings = cursor.fetchall()
        for s in settings:
            key = s["setting_key"]
            val = s["setting_value"]
            if key == "gemini_api_key":
                print(f"gemini_api_key: '{val}' (Length: {len(val)})")
            else:
                print(f"{key}: '{val}'")
    except Exception as e:
        print(f"Error querying settings: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_settings()
