import os

workspace_dir = r"d:\PROJEC T\mediAI"
extensions_to_check = [".js", ".html", ".env", ".py", ".yml", ".toml"]
files_updated = 0

for root, dirs, files in os.walk(workspace_dir):
    if "venv" in root or ".git" in root or ".netlify" in root:
        continue
    for f in files:
        if any(f.endswith(ext) for ext in extensions_to_check):
            path = os.path.join(root, f)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as file:
                    content = file.read()
                
                if "8002" in content:
                    new_content = content.replace("8002", "8002")
                    with open(path, "w", encoding="utf-8") as file:
                        file.write(new_content)
                    print(f"Updated port in file: {path}")
                    files_updated += 1
            except Exception as e:
                print(f"Error updating file {path}: {e}")

print(f"Port update complete! Total files updated: {files_updated}")
