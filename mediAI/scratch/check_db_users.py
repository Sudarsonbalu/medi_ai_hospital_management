import sys
import os

backend_dir = r"d:\PROJEC T\mediAI\backend"
sys.path.append(backend_dir)

from database import get_db_connection

def check_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        print(f"Total users in DB: {len(users)}")
        for u in users:
            print(f"ID: {u['user_id']}, Name: {u['name']}, Email: {u['email']}, Role: {u['role']}, Status: {u.get('status', 'N/A')}")
    except Exception as e:
        print(f"Error querying users: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    check_users()
