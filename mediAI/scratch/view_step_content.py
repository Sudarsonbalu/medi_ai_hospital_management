import json
import os

steps = []
log_path = r"C:\Users\SUDARSON\.gemini\antigravity\brain\3a117e4a-3459-4409-ad48-e57e27ba815c\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f):
        try:
            data = json.loads(line)
            step_idx = data.get("step_index", idx)
            if step_idx < 880:
                if "dashboard.js" in line.lower() and data.get("type") == "PLANNER_RESPONSE":
                    for tc in data.get("tool_calls", []):
                        if tc.get("name") == "view_file" and "dashboard.js" in tc.get("args", tc.get("arguments", {}))['AbsolutePath']:
                            steps.append(step_idx + 1)
        except Exception:
            pass

print("Steps to search for dashboard.js content:", steps)

found = False
for file_type in ["transcript_full.jsonl", "transcript.jsonl"]:
    full_path = os.path.join(r"C:\Users\SUDARSON\.gemini\antigravity\brain\3a117e4a-3459-4409-ad48-e57e27ba815c\.system_generated\logs", file_type)
    if not os.path.exists(full_path):
        continue
    print("Checking", full_path)
    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                data = json.loads(line)
                step_idx = data.get("step_index")
                if step_idx in steps:
                    content = data.get("content", "")
                    if "fetch" in content or "localStorage" in content:
                        print(f"=== Found dashboard.js content in {file_type} Step {step_idx} ===")
                        with open(r"d:\PROJEC T\mediAI\frontend\dashboard_original.js", "w", encoding="utf-8") as f_out:
                            f_out.write(content)
                        print("Saved to frontend/dashboard_original.js")
                        found = True
                        break
            except Exception:
                pass
        if found:
            break
