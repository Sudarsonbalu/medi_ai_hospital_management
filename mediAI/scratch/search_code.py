import re

with open("backend/app.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "gemini_api" in line.lower() or "settings" in line.lower() or "chatbot" in line.lower():
        print(f"Line {i+1}: {line.strip()}")
