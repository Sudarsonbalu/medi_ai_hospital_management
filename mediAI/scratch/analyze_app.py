with open(r"d:\PROJEC T\mediAI\frontend\super_admin.js", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "/admin/ai/" in line or "/admin/settings" in line:
            print(f"Line {idx+1}: {line.strip()}")
