import urllib.request
import json

api_key = "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"
url = "https://openrouter.ai/api/v1/auth/key"

headers = {
    "Authorization": f"Bearer {api_key}"
}

print(f"Checking status for key: {api_key[:12]}...")
req = urllib.request.Request(
    url,
    headers=headers,
    method="GET"
)

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        print("Success! Response:")
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
