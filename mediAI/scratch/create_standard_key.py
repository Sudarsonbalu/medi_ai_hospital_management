import urllib.request
import json

management_key = "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"
url = "https://openrouter.ai/api/v1/keys"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {management_key}"
}

payload = {
    "name": "MediAI Chat Key"
}

print("Attempting to create standard key using management key...")
req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers=headers,
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        print("Success! Created key:")
        print(json.dumps(res_data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    try:
        body = e.read().decode("utf-8")
        print("Response body:")
        print(body)
    except Exception:
        pass
except Exception as e:
    print(f"General Error: {e}")
