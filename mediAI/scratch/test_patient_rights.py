import urllib.request
import json

def test_patient_rights():
    print("Logging in as patient...")
    login_url = "http://127.0.0.1:8002/login"
    login_payload = {
        "email": "patient@mediai.com",
        "password": "patient123"
    }
    
    try:
        req = urllib.request.Request(
            login_url,
            data=json.dumps(login_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            patient_token = res_data["token"]
            print("Patient login successful! Token acquired.")
    except Exception as e:
        print(f"Error during patient login: {e}")
        return

    # Attempt PUT (Update Appointment)
    print("\nAttempting to UPDATE appointment as a patient...")
    update_url = "http://127.0.0.1:8002/appointments/1"
    update_payload = {
        "patient_name": "Test Patient",
        "gender": "Male",
        "doctor_id": 1,
        "appointment_date": "2026-06-25",
        "status": "Booked"
    }
    update_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {patient_token}"
    }
    
    try:
        req_put = urllib.request.Request(
            update_url,
            data=json.dumps(update_payload).encode("utf-8"),
            headers=update_headers,
            method="PUT"
        )
        with urllib.request.urlopen(req_put, timeout=5) as resp:
            print(f"Failure: Update succeeded with code {resp.status} (should have been blocked!)")
    except urllib.error.HTTPError as e:
        print(f"Success (Blocked): Got expected HTTP Error {e.code} - {e.reason}")
        body = e.read().decode("utf-8")
        print(f"Response body: {body}")
        assert e.code == 403, f"Expected 403, got {e.code}"
    except Exception as e:
        print(f"Error: {e}")

    # Attempt DELETE (Delete Appointment)
    print("\nAttempting to DELETE appointment as a patient...")
    try:
        req_del = urllib.request.Request(
            update_url,
            headers=update_headers,
            method="DELETE"
        )
        with urllib.request.urlopen(req_del, timeout=5) as resp:
            print(f"Failure: Delete succeeded with code {resp.status} (should have been blocked!)")
    except urllib.error.HTTPError as e:
        print(f"Success (Blocked): Got expected HTTP Error {e.code} - {e.reason}")
        body = e.read().decode("utf-8")
        print(f"Response body: {body}")
        assert e.code == 403, f"Expected 403, got {e.code}"
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_patient_rights()
