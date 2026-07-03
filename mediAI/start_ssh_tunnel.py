import subprocess
import os
import time
import re

url_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tunnel_url.txt")
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tunnel.log")

# Clean old files
for f in [url_file, log_file]:
    if os.path.exists(f):
        try:
            os.remove(f)
        except Exception:
            pass

def get_latest_url(log_path, is_serveo=False):
    if not os.path.exists(log_path):
        return None
    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if is_serveo:
            matches = re.findall(r'https?://[a-zA-Z0-9.-]+\.(?:serveo\.net|serveousercontent\.com)', content)
            valid_urls = [m for m in matches if "console" not in m and "settings" not in m]
            return valid_urls[-1] if valid_urls else None
        else:
            matches = re.findall(r'https?://[a-zA-Z0-9.-]+\.(?:localhost\.run|lhr\.life)', content)
            valid_urls = [m for m in matches if "admin" not in m]
            return valid_urls[-1] if valid_urls else None
    except Exception as e:
        print("Error reading log:", e)
        return None

def update_url_files(new_url):
    # Update tunnel_url.txt
    try:
        with open(url_file, "w", encoding="utf-8") as f_url:
            f_url.write(new_url)
    except Exception as e:
        print("Error writing url file:", e)
        
    # Update config.js
    config_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "config.js")
    if os.path.exists(config_file):
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                config_content = f.read()
            
            pattern = r'window\.API_URL\s*=\s*"https?://[a-zA-Z0-9.-]+\.(?:localhost\.run|lhr\.life|serveo\.net|serveousercontent\.com)"'
            replacement = f'window.API_URL = "{new_url}"'
            new_content = re.sub(pattern, replacement, config_content)
            
            with open(config_file, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Successfully updated frontend/config.js with: {new_url}")
        except Exception as e:
            print("Error updating config.js:", e)

url_found = False
is_serveo_tunnel = False
current_url = None

# Try localhost.run first
print("Trying localhost.run...")
try:
    with open(log_file, "w") as out:
        process = subprocess.Popen(
            ["ssh", "-o", "StrictHostKeyChecking=no", "-R", "80:127.0.0.1:8002", "nokey@localhost.run"],
            stdout=out,
            stderr=out,
            text=True
        )
    
    start_time = time.time()
    while time.time() - start_time < 12:
        if process.poll() is not None:
            break
        
        url = get_latest_url(log_file, is_serveo=False)
        if url:
            current_url = url
            update_url_files(url)
            print(f"localhost.run URL found: {url}")
            url_found = True
            break
        time.sleep(1)

    if not url_found:
        print("localhost.run failed or timed out. Terminating...")
        try:
            process.terminate()
            process.wait(timeout=2)
        except Exception:
            pass
except Exception as e:
    print("localhost.run exception:", e)

# Fallback to serveo.net
if not url_found:
    print("Trying serveo.net...")
    is_serveo_tunnel = True
    if os.path.exists(log_file):
        try:
            os.remove(log_file)
        except Exception:
            pass

    try:
        with open(log_file, "w") as out:
            process = subprocess.Popen(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-R", "80:127.0.0.1:8002", "serveo.net"],
                stdout=out,
                stderr=out,
                text=True
            )
        
        start_time = time.time()
        while time.time() - start_time < 15:
            if process.poll() is not None:
                break
            
            url = get_latest_url(log_file, is_serveo=True)
            if url:
                current_url = url
                update_url_files(url)
                print(f"serveo.net URL found: {url}")
                url_found = True
                break
            time.sleep(1)
            
        if not url_found:
            print("serveo.net failed or timed out. Terminating...")
            try:
                process.terminate()
            except Exception:
                pass
    except Exception as e:
        print("serveo.net exception:", e)

if url_found:
    print("Tunnel active. Monitoring process status...")
    try:
        while True:
            time.sleep(3)
            if process.poll() is not None:
                print("Tunnel process exited.")
                break
            
            # Check for URL updates
            url = get_latest_url(log_file, is_serveo=is_serveo_tunnel)
            if url and url != current_url:
                print(f"Detected URL change: {current_url} -> {url}")
                current_url = url
                update_url_files(url)
    except KeyboardInterrupt:
        print("Terminating tunnel...")
        try:
            process.terminate()
        except Exception:
            pass
