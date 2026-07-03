import json

log_path = r"C:\Users\SUDARSON\.gemini\antigravity\brain\3a117e4a-3459-4409-ad48-e57e27ba815c\.system_generated\logs\transcript.jsonl"

steps_to_find = {1488, 1489, 1490, 1491, 1492}

with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
    for idx, line in enumerate(f):
        try:
            data = json.loads(line)
            step_idx = data.get('step_index', idx)
            if step_idx in steps_to_find:
                print(f"=== Step {step_idx}: {data.get('type')} / {data.get('source')} ===")
                content = data.get("content", "")
                if content:
                    print(content[:1500])
                print("-" * 50)
        except Exception as e:
            pass
