with open("frontend/patient_management.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if "function showToast" in line:
        found = True
    if found:
        print(f"Line {i+1}: {line.strip()}")
        if "}" in line and i > 120:  # print a few lines after
            break
