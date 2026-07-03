import sys
import os
import sqlite3

workspace_dir = r"d:\PROJEC T\mediAI"
backend_dir = os.path.join(workspace_dir, "backend")
env_path = os.path.join(backend_dir, ".env")
db_path = os.path.join(backend_dir, "mediai.db")

# 1. Clear .env file
if os.path.exists(env_path):
    print("Clearing GEMINI_API_KEY in backend/.env...")
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.strip().startswith("GEMINI_API_KEY="):
            new_lines.append("GEMINI_API_KEY=\n")
        else:
            new_lines.append(line)
            
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print(".env updated.")

# 2. Clear SQLite settings table
if os.path.exists(db_path):
    print("Clearing gemini_api_key in SQLite database...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE settings SET setting_value = '' WHERE setting_key = 'gemini_api_key'"
        )
        conn.commit()
        print(f"Database settings updated. Rows affected: {cursor.rowcount}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error updating SQLite: {e}")

# 3. Clear environment variable in current process (if any)
if "GEMINI_API_KEY" in os.environ:
    del os.environ["GEMINI_API_KEY"]
    print("Deleted GEMINI_API_KEY from environment variables.")

print("Gemini API key successfully deleted!")
