import os

frontend_dir = "frontend"
for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith((".js", ".html")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "function showToast" in content:
                print(f"showToast defined in: {path}")
