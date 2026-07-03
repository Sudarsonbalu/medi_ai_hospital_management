import requests
import time
import os

# Try reading from tunnel_url.txt first to test the external tunnel, fallback to localhost
tunnel_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tunnel_url.txt")
if os.path.exists(tunnel_file):
    with open(tunnel_file, "r", encoding="utf-8") as f:
        API_URL = f.read().strip()
else:
    API_URL = "http://127.0.0.1:8002"

print(f"Testing against API_URL: {API_URL}")

def test_patient_workflow():
    print("=== STARTING AUTOMATED PATIENT MODULE INTEGRATION TESTS ===")
    
    unique_id = int(time.time())
    email = f"patient_{unique_id}@example.com"
    password = "password123"
    name = f"Test Patient {unique_id}"
    
    # 1. Registration
    print("\n1. Testing Patient Registration with Profile Details...")
    reg_payload = {
        "name": name,
        "email": email,
        "password": password,
        "role": "Patient",
        "age": 28,
        "gender": "Female",
        "phone_number": "555-0199",
        "address": "123 Healthcare Way, Boston MA",
        "emergency_contact": "Jane Doe - 555-0100"
    }
    
    reg_res = requests.post(f"{API_URL}/register", json=reg_payload)
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    print("[OK] Patient registration successful.")
    
    # 2. Login
    print("\n2. Testing Patient Login & Authentication...")
    login_payload = {
        "email": email,
        "password": password
    }
    login_res = requests.post(f"{API_URL}/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()
    token = token_data.get("token")
    assert token is not None, "Login token not returned"
    print("[OK] Login successful. JWT token obtained.")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # 3. Retrieve Profile
    print("\n3. Testing GET /patients/me (Retrieve Profile)...")
    profile_res = requests.get(f"{API_URL}/patients/me", headers=headers)
    assert profile_res.status_code == 200, f"Profile fetch failed: {profile_res.text}"
    profile = profile_res.json()
    assert profile["age"] == 28, "Age mismatch"
    assert profile["gender"] == "Female", "Gender mismatch"
    assert profile["phone_number"] == "555-0199", "Phone number mismatch"
    assert profile["address"] == "123 Healthcare Way, Boston MA", "Address mismatch"
    assert profile["emergency_contact"] == "Jane Doe - 555-0100", "Emergency contact mismatch"
    print("[OK] Profile fields fetched successfully.")
    
    # 4. Update Profile
    print("\n4. Testing PUT /patients/me (Update Profile)...")
    update_payload = {
        "name": name + " Updated",
        "age": 29,
        "gender": "Female",
        "phone_number": "555-9999",
        "address": "456 Wellness Boulevard, Boston MA",
        "emergency_contact": "Jane Doe - 555-0200"
    }
    update_res = requests.put(f"{API_URL}/patients/me", json=update_payload, headers=headers)
    assert update_res.status_code == 200, f"Update profile failed: {update_res.text}"
    
    # Verify update
    verify_res = requests.get(f"{API_URL}/patients/me", headers=headers)
    verify_data = verify_res.json()
    assert verify_data["name"] == name + " Updated", "Name update failed"
    assert verify_data["age"] == 29, "Age update failed"
    assert verify_data["phone_number"] == "555-9999", "Phone update failed"
    print("[OK] Profile update successful and verified.")
    
    # 5. Live Location Sharing
    print("\n5. Testing POST /patients/me/location (Live Tracking)...")
    loc_payload = {
        "latitude": 42.3601,
        "longitude": -71.0589
    }
    loc_res = requests.post(f"{API_URL}/patients/me/location", json=loc_payload, headers=headers)
    assert loc_res.status_code == 200, f"Location sharing failed: {loc_res.text}"
    print("[OK] Live location shared successfully.")
    
    # 6. Emergency Request with GPS
    print("\n6. Testing POST /emergencies with GPS Coordinates...")
    er_payload = {
        "patient_name": name,
        "severity": "Critical",
        "contact_phone": "555-9999",
        "symptoms": "Severe chest pains, shortness of breath",
        "latitude": 42.3601,
        "longitude": -71.0589
    }
    er_res = requests.post(f"{API_URL}/emergencies", json=er_payload, headers=headers)
    assert er_res.status_code == 200, f"Emergency report failed: {er_res.text}"
    print("[OK] Emergency reported successfully.")
    
    # 7. List Emergencies & Verify GPS
    print("\n7. Testing GET /emergencies (Verification of GPS coordinates)...")
    list_er_res = requests.get(f"{API_URL}/emergencies", headers=headers)
    assert list_er_res.status_code == 200, f"Emergency list failed: {list_er_res.text}"
    emergencies = list_er_res.json()
    
    found_case = False
    for case in emergencies:
        if case["patient_name"] == name:
            assert abs(case["latitude"] - 42.3601) < 0.0001, "Latitude mismatch in emergency"
            assert abs(case["longitude"] - (-71.0589)) < 0.0001, "Longitude mismatch in emergency"
            found_case = True
            break
    assert found_case, "Reported emergency case not found in triage monitor"
    print("[OK] GPS coordinates verify successfully in triage cases.")
    
    # 8. Upload Medical Record
    print("\n8. Testing POST /patients/me/records (File Upload)...")
    dummy_filepath = "test_dummy_report.pdf"
    with open(dummy_filepath, "w") as f:
        f.write("%PDF-1.4 dummy content")
        
    try:
        with open(dummy_filepath, "rb") as upload_file:
            files = {"file": (dummy_filepath, upload_file, "application/pdf")}
            data = {"record_type": "Lab Report", "description": "June Annual Blood Screen"}
            
            upload_res = requests.post(f"{API_URL}/patients/me/records", files=files, data=data, headers={
                "Authorization": f"Bearer {token}"
            })
            
        assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
        upload_data = upload_res.json()
        record_id = upload_data["record_id"]
        assert record_id is not None, "Record ID not returned on upload"
        print(f"[OK] Medical report uploaded successfully (ID: {record_id}).")
        
        # 9. Download Medical Record
        print("\n9. Testing GET /patients/me/records/{id}/download (File Download)...")
        download_res = requests.get(f"{API_URL}/patients/me/records/{record_id}/download", headers=headers)
        assert download_res.status_code == 200, f"Download failed: {download_res.text}"
        assert b"%PDF" in download_res.content, "Downloaded file content invalid"
        print("[OK] Medical record downloaded successfully (verified file signature).")
        
        # 10. List & Search Medical Records
        print("\n10. Testing GET /patients/me/records (Retrieve Archive & Search)...")
        list_rec_res = requests.get(f"{API_URL}/patients/me/records", headers=headers)
        assert list_rec_res.status_code == 200, f"Fetch records failed: {list_rec_res.text}"
        records = list_rec_res.json()
        assert len(records) > 0, "No records found in archive"
        
        search_res = requests.get(f"{API_URL}/patients/me/records?query=Annual", headers=headers)
        assert search_res.status_code == 200, f"Search failed: {search_res.text}"
        searched_records = search_res.json()
        assert len(searched_records) > 0, "Search query returned zero results"
        print("[OK] Records listed and searched successfully.")
        
        # 11. Delete Medical Record
        print("\n11. Testing DELETE /patients/me/records/{id} (Delete File)...")
        del_res = requests.delete(f"{API_URL}/patients/me/records/{record_id}", headers=headers)
        assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
        
        # Verify deletion
        list_after_del = requests.get(f"{API_URL}/patients/me/records", headers=headers).json()
        assert not any(r["record_id"] == record_id for r in list_after_del), "Record still exists after deletion"
        print("[OK] Medical record deleted successfully.")
        
    finally:
        if os.path.exists(dummy_filepath):
            os.remove(dummy_filepath)
            
    # 12. Chatbot & History logs
    print("\n12. Testing Chatbot Interactivity and User History Persistence...")
    chat_res = requests.post(f"{API_URL}/chatbot", json={"message": "I have a mild fever and cough"}, headers=headers)
    assert chat_res.status_code == 200, f"Chatbot call failed: {chat_res.text}"
    
    # Check history logs
    hist_res = requests.get(f"{API_URL}/chatbot/history", headers=headers)
    assert hist_res.status_code == 200, f"Chat history fetch failed: {hist_res.text}"
    history = hist_res.json()
    assert len(history) > 0, "No chat history logged"
    assert history[-1]["user_message"] == "I have a mild fever and cough", "Last message mismatch in log"
    print("[OK] Chatbot conversation persisted to user-tied history.")
    
    # 12.5 Book an appointment to trigger a notification
    print("\n12.5 Testing Appointment Booking to trigger Notification...")
    appt_payload = {
        "patient_name": name,
        "doctor_id": 1,
        "appointment_date": "2026-06-25 10:00:00",
        "status": "Booked",
        "gender": "Female"
    }
    appt_res = requests.post(f"{API_URL}/appointments", json=appt_payload, headers=headers)
    assert appt_res.status_code == 200, f"Appointment booking failed: {appt_res.text}"
    print("[OK] Appointment booked successfully to trigger notification.")
    
    # 13. Notifications
    print("\n13. Testing System Notifications and Read Status updates...")
    note_res = requests.get(f"{API_URL}/notifications", headers=headers)
    assert note_res.status_code == 200, f"Notifications fetch failed: {note_res.text}"
    notifications = note_res.json()
    assert len(notifications) > 0, "No notifications found"
    
    unread_note = notifications[0]
    note_id = unread_note["notification_id"]
    
    read_res = requests.put(f"{API_URL}/notifications/{note_id}/read", headers=headers)
    assert read_res.status_code == 200, f"Marking notification read failed: {read_res.text}"
    
    # Verify read status
    verify_notes = requests.get(f"{API_URL}/notifications", headers=headers).json()
    for n in verify_notes:
        if n["notification_id"] == note_id:
            assert n["is_read"] == 1 or n["is_read"] is True, "Notification is_read flag not set to true"
            break
    print("[OK] System notifications retrieved and marked read successfully.")
    
    # 14. Patient Analytics
    print("\n14. Testing Patient Analytics dashboard payload...")
    analytics_res = requests.get(f"{API_URL}/patients/me/analytics", headers=headers)
    assert analytics_res.status_code == 200, f"Analytics failed: {analytics_res.text}"
    analytics = analytics_res.json()
    assert "total_appointments" in analytics, "Appointments missing from analytics"
    assert "health_trends" in analytics, "Health trends missing from analytics"
    print("[OK] Patient analytics data verified.")
    
    print("\n=== ALL PATIENT MODULE INTEGRATION TESTS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_patient_workflow()
