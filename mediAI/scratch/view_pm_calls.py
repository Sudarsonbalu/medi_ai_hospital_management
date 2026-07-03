with open("frontend/patient_management.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "fetch(" in line or "delete" in line.lower() or "alert(" in line:
        print(f"Line {i+1}: {line.strip()}")
