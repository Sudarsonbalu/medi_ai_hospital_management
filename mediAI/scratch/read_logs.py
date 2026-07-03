import os

logs = {
    "uvicorn": r"C:\Users\SUDARSON\.gemini\antigravity\brain\3a117e4a-3459-4409-ad48-e57e27ba815c\.system_generated\tasks\task-1615.log",
    "tests": r"C:\Users\SUDARSON\.gemini\antigravity\brain\3a117e4a-3459-4409-ad48-e57e27ba815c\.system_generated\tasks\task-1797.log"
}

for name, path in logs.items():
    print(f"=== LOG: {name} ===")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            lines = content.splitlines()
            for line in lines[-50:]:
                print(line)
    else:
        print("Log file does not exist yet.")
    print()
