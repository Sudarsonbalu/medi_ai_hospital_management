import urllib.request
import json

api_key = "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"
url = "https://openrouter.ai/api/v1/chat/completions"

payload = {
    "model": "google/gemini-2.5-flash",
    "messages": [
        {"role": "user", "content": "Say hello!"}
    ],
    "max_tokens": 1000
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

print("Querying OpenRouter directly...")
req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers=headers,
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        print("Success! Response from OpenRouter:")
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
