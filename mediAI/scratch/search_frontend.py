import os
import re

frontend_dir = "frontend"
js_files = []

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(".js"):
            js_files.append(os.path.join(root, file))

pattern = re.compile(r'(fetch|axios|\.delete|\.put|method:\s*[\'"](PUT|DELETE|POST)[\'"])', re.IGNORECASE)

for js_file in js_files:
    with open(js_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    matches = pattern.findall(content)
    if matches:
        print(f"File: {js_file} has {len(matches)} potential API mutation/fetch calls.")
