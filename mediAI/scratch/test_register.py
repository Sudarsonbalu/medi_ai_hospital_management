import sys
import os

# Set paths
backend_dir = r"d:\PROJEC T\mediAI\backend"
sys.path.append(backend_dir)

from database import get_db_connection
from auth import hash_password

def test_register():
    print("Testing registration database insertion...")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        name = "Test User"
        email = "test@example.com"
        password = "testpassword"
        role = "Patient"
        
        # Check if already exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            print("User already exists, deleting first...")
            cursor.execute("DELETE FROM users WHERE email = %s", (email,))
            conn.commit()
            
        hashed_pwd = hash_password(password)
        sql = "INSERT INTO users(name, email, password, role) VALUES(%s, %s, %s, %s)"
        cursor.execute(sql, (name, email, hashed_pwd, role))
        conn.commit()
        
        user_id = cursor.lastrowid
        print(f"Inserted user ID: {user_id}")
        
        # Insert into patients
        sql_patient = "INSERT INTO patients(name, age, gender, disease, user_id) VALUES(%s, %s, %s, %s, %s)"
        cursor.execute(sql_patient, (name, 0, "Other", "None", user_id))
        conn.commit()
        print("Successfully inserted patient record!")
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_register()
