import sys
import os

backend_dir = r"d:\PROJEC T\mediAI\backend"
sys.path.append(backend_dir)

from database import get_db_connection
from auth import verify_password

def test_verify():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        
        credentials = {
            "admin@mediai.com": "admin123",
            "patient@mediai.com": "patient123",
            "doctor@mediai.com": "doctor123"
        }
        
        for u in users:
            email = u["email"]
            plain_pwd = credentials.get(email)
            if plain_pwd:
                ok = verify_password(plain_pwd, u["password"])
                print(f"User: {email}, Password: {plain_pwd}, Verifies: {ok}")
            else:
                print(f"User: {email} has no test credentials mapping.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_verify()
