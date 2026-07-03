import sys
import os
import urllib.request
import json
import time

backend_dir = r"d:\PROJEC T\mediAI\backend"
sys.path.append(backend_dir)

from auth import encode_jwt

def test_endpoints():
    print("Waiting 3 seconds for server to initialize...")
    time.sleep(3)
    
    print("Testing admin endpoints against http://127.0.0.1:8002 ...")
    
    # Create an admin token
    token_payload = {
        "user_id": 1,
        "name": "Admin User",
        "email": "admin@mediai.com",
        "role": "Admin"
    }
    token = encode_jwt(token_payload)
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        "/admin/analytics",
        "/admin/logs/activity",
        "/medicines"
    ]
    
    for ep in endpoints:
        print(f"Testing {ep} ...")
        req = urllib.request.Request(
            f"http://127.0.0.1:8002{ep}",
            headers=headers
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.status
                data = json.loads(response.read().decode("utf-8"))
                print(f"Status: {status} - Success!")
        except Exception as e:
            print(f"FAILED on {ep}: {e}")

if __name__ == "__main__":
    test_endpoints()
