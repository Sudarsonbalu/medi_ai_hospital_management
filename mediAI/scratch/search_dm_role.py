with open("frontend/doctor_management.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "role" in line.lower() or "edit" in line.lower() or "delete" in line.lower() or "btn-add" in line.lower() or "style.display" in line.lower():
        print(f"doctor_management.js Line {i+1}: {line.strip()}")

print("\n" + "="*50 + "\n")

with open("frontend/appointments.js", "r", encoding="utf-8") as f:
    lines_appt = f.readlines()

for i, line in enumerate(lines_appt):
    if "role" in line.lower() or "edit" in line.lower() or "delete" in line.lower() or "btn-add" in line.lower() or "style.display" in line.lower():
        print(f"appointments.js Line {i+1}: {line.strip()}")
