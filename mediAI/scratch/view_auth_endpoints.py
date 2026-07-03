with open("backend/app.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "def register" in line or "def login" in line:
        # Print 40 lines around it
        start = max(0, i - 5)
        end = min(len(lines), i + 40)
        print(f"--- Lines {start+1} to {end} ---")
        for idx in range(start, end):
            print(f"{idx+1}: {lines[idx].strip()}")
