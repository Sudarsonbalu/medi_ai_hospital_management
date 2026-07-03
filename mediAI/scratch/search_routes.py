import re

with open("backend/app.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find all lines starting with @app.post, @app.put, @app.delete, @app.patch, @app.get
lines = content.split("\n")
route_pattern = re.compile(r'@app\.(post|put|delete|patch|get)\("([^"]+)"')

for i, line in enumerate(lines):
    match = route_pattern.search(line)
    if match:
        method = match.group(1).upper()
        path = match.group(2)
        # Search forward for the function definition
        func_def = ""
        for j in range(i + 1, min(i + 10, len(lines))):
            if "def " in lines[j]:
                func_def = lines[j].strip()
                break
        print(f"Line {i+1:4d}: {method:6s} {path:40s} -> {func_def}")
