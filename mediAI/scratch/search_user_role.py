with open("frontend/login.js", "r", encoding="utf-8") as f:
    login_lines = f.readlines()

for i, line in enumerate(login_lines):
    if "localStorage" in line or "role" in line.lower():
        print(f"login.js Line {i+1}: {line.strip()}")

print("\n" + "="*50 + "\n")

with open("frontend/dashboard.js", "r", encoding="utf-8") as f:
    dash_lines = f.readlines()

for i, line in enumerate(dash_lines):
    if "localStorage" in line or "role" in line.lower():
        print(f"dashboard.js Line {i+1}: {line.strip()}")
