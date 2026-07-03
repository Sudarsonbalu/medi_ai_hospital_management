import os
import sqlite3

workspace_dir = r"d:\PROJEC T\mediAI"
backend_dir = os.path.join(workspace_dir, "backend")
env_path = os.path.join(backend_dir, ".env")
db_path = os.path.join(backend_dir, "mediai.db")

openrouter_key = "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"

# 1. Update .env
if os.path.exists(env_path):
    print("Writing key to backend/.env...")
    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.strip().startswith("GEMINI_API_KEY="):
            new_lines.append(f"GEMINI_API_KEY={openrouter_key}\n")
        else:
            new_lines.append(line)
            
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print(".env updated.")

# 2. Update SQLite database settings table
if os.path.exists(db_path):
    print("Updating SQLite settings table with OpenRouter key...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE settings SET setting_value = ? WHERE setting_key = 'gemini_api_key'",
            (openrouter_key,)
        )
        conn.commit()
        print(f"Database settings updated. Rows affected: {cursor.rowcount}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error updating SQLite: {e}")

# 3. Update environment in current process
os.environ["GEMINI_API_KEY"] = openrouter_key
print("Environment variable set.")

print("OpenRouter API key configuration complete!")
