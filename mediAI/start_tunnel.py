import subprocess
import time
import sys
import os

url_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tunnel_url.txt")

# Start localtunnel
print("Launching localtunnel subprocess...")
try:
    process = subprocess.Popen(
        ["npx", "-y", "localtunnel", "--port", "8002"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=True
    )
    
    # Wait for the first line of output
    for line in iter(process.stdout.readline, ""):
        print("URL Line Captured:", line.strip())
        with open(url_file, "w", encoding="utf-8") as f:
            f.write(line.strip())
        break
except Exception as e:
    print("Error:", e)
    with open(url_file, "w", encoding="utf-8") as f:
        f.write(f"Error starting tunnel: {e}")
