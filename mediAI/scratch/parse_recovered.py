import re

input_path = r"d:\PROJEC T\mediAI\frontend\dashboard_original.js"
output_path = r"d:\PROJEC T\mediAI\frontend\dashboard_original_clean.js"

cleaned_lines = []
with open(input_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    for line in lines[7:]:
        line = line.strip("\r\n")
        match = re.match(r'^(\d+):\s?(.*)$', line)
        if match:
            cleaned_lines.append(match.group(2))

with open(output_path, "w", encoding="utf-8", newline="\n") as f_out:
    f_out.write("\n".join(cleaned_lines) + "\n")

print("Cleaned JS file saved to", output_path)
