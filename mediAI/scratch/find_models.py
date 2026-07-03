with open("backend/app.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "class " in line and "BaseModel" in line:
        # Print 15 lines of the class definition
        print(f"--- Line {i+1}: {line.strip()} ---")
        for idx in range(i, min(len(lines), i + 15)):
            if idx > i and "class " in lines[idx]:
                break
            print(lines[idx].strip())
