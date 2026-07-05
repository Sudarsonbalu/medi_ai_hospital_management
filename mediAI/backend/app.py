from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import mysql.connector
import sys
import os
import time
import csv
import io

# Ensure the parent directory or workspace is in sys.path so we can import database and ai_models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection
from auth import (
    hash_password,
    verify_password,
    needs_rehash,
    encode_jwt,
    verify_token,
    verify_write_token,
    verify_admin_token,
)

def log_activity(user_id: Optional[int], username: str, role: str, action: str, ip_address: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO activity_logs (user_id, username, role, action, ip_address) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(sql, (user_id, username, role, action, ip_address))
        conn.commit()
    except Exception:
        pass
    finally:
        cursor.close()
        conn.close()

app = FastAPI(title="MediAI Backend API")

def init_db_and_settings():
    # Run migrations automatically on startup if tables do not exist yet
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM settings LIMIT 1")
        cursor.close()
        conn.close()
        print("Database tables already exist. Skipping startup migrations.")
    except Exception:
        print("Database tables not found or inaccessible. Attempting database migrations...")
        try:
            try:
                from migrate import run_migrations
            except ImportError:
                from backend.migrate import run_migrations
            run_migrations()
            print("Database migrations completed successfully.")
        except Exception as migration_err:
            print(f"Failed to run database migrations: {migration_err}")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT setting_key, setting_value FROM settings")
        db_settings = cursor.fetchall()
        for s in db_settings:
            key = s["setting_key"]
            val = s["setting_value"]
            if key == "gemini_api_key" and val:
                from ai_models.chatbot import check_and_exchange_management_key
                val = check_and_exchange_management_key(val)
                os.environ["GEMINI_API_KEY"] = val
                print("Loaded GEMINI_API_KEY from database settings.")
            elif key == "ai_enabled":
                os.environ["AI_ENABLED"] = val
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error loading settings: {e}")

import threading

_db_settings_initialized = False
_db_settings_lock = threading.Lock()

@app.middleware("http")
async def db_settings_init_middleware(request, call_next):
    global _db_settings_initialized
    if not _db_settings_initialized:
        with _db_settings_lock:
            if not _db_settings_initialized:
                try:
                    init_db_and_settings()
                    _db_settings_initialized = True
                except Exception as e:
                    print(f"Error in lazy database initialization: {e}")
                    # Leave _db_settings_initialized as False so next request will retry
    return await call_next(request)



_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:8002,http://localhost:8002,http://127.0.0.1:5500,http://localhost:5500",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for Requests
class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    disease: str

class DoctorCreate(BaseModel):
    name: str
    specialization: str
    department: str
    availability: Optional[str] = "Available"

class AppointmentCreate(BaseModel):
    patient_name: str
    doctor_id: int
    appointment_date: str
    status: Optional[str] = "Booked"
    gender: Optional[str] = "Other"

class MedicineCreate(BaseModel):
    name: str
    quantity: int
    price: float

class LabTestCreate(BaseModel):
    patient_name: str
    test_type: str
    test_date: str
    status: Optional[str] = "Pending"

class ChatRequest(BaseModel):
    message: str

class PredictRequest(BaseModel):
    age: int
    blood_pressure: int
    glucose_level: int
    cholesterol: int
    symptom: str

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "Patient"
    age: Optional[int] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: str
    email: str
    role: str
    password: Optional[str] = None

class EmergencyCreate(BaseModel):
    patient_name: str
    severity: str
    contact_phone: str
    symptoms: Optional[str] = None
    assigned_doctor_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserForgotPassword(BaseModel):
    email: str

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str

class PatientProfileUpdate(BaseModel):
    name: str
    age: int
    gender: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

# Endpoints


@app.post("/register")
def register(user: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(%s)", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pwd = hash_password(user.password)
        sql = "INSERT INTO users(name, email, password, role) VALUES(%s, %s, %s, %s)"
        cursor.execute(sql, (user.name, user.email, hashed_pwd, user.role))
        conn.commit()
        
        user_id = cursor.lastrowid
        
        # If user is registered as Patient, insert into patients table
        if user.role.lower() == "patient":
            sql_patient = """
            INSERT INTO patients (name, age, gender, disease, phone_number, address, emergency_contact, user_id) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql_patient, (
                user.name,
                user.age if user.age is not None else 0,
                user.gender if user.gender else "Other",
                "None",
                user.phone_number if user.phone_number else "",
                user.address if user.address else "",
                user.emergency_contact if user.emergency_contact else "",
                user_id
            ))
            conn.commit()
            
        # If user is registered as Doctor, insert into doctors table
        elif user.role.lower() == "doctor":
            sql_doctor = "INSERT INTO doctors(name, specialization, department, availability, user_id) VALUES(%s, %s, %s, %s, %s)"
            cursor.execute(sql_doctor, (user.name, "General Medicine", "Outpatient", "Available", user_id))
            conn.commit()
            
        return {"message": "User registered successfully", "user_id": user_id}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/login")
def login(user: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)
    try:
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(%s)", (user.email,))
        db_user = cursor.fetchone()
        if not db_user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        if not verify_password(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if needs_rehash(db_user["password"]):
            new_hash = hash_password(user.password)
            cursor.execute("UPDATE users SET password = %s WHERE user_id = %s", (new_hash, db_user["user_id"]))
            conn.commit()
            
        # Check if the user status is active
        if db_user.get("status", "Active") == "Inactive":
            raise HTTPException(status_code=403, detail="Account is deactivated. Please contact the administrator.")

        # Update last_login
        cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = %s", (db_user["user_id"],))
        conn.commit()

        # If patient, find patient_id by user_id
        patient_id = None
        if db_user["role"].lower() == "patient":
            cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (db_user["user_id"],))
            p_res = cursor.fetchone()
            if p_res:
                patient_id = p_res["patient_id"]
                
        # If doctor, find doctor_id by user_id
        doctor_id = None
        if db_user["role"].lower() == "doctor":
            cursor.execute("SELECT doctor_id FROM doctors WHERE user_id = %s", (db_user["user_id"],))
            d_res = cursor.fetchone()
            if d_res:
                doctor_id = d_res["doctor_id"]

        # Generate JWT Token
        token_payload = {
            "user_id": db_user["user_id"],
            "name": db_user["name"],
            "email": db_user["email"],
            "role": db_user["role"]
        }
        token = encode_jwt(token_payload)

        # Log active login
        log_activity(db_user["user_id"], db_user["name"], db_user["role"], "User Logged In")

        return {
            "message": "Login successful",
            "token": token,
            "user": {
                "user_id": db_user["user_id"],
                "name": db_user["name"],
                "email": db_user["email"],
                "role": db_user["role"],
                "patient_id": patient_id,
                "doctor_id": doctor_id
            }
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# Patients Management
@app.get("/patients")
def get_patients(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM patients")
        data = cursor.fetchall()
        return data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/patients")
def add_patient(patient: PatientCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO patients(name, age, gender, disease) VALUES(%s, %s, %s, %s)"
        cursor.execute(sql, (patient.name, patient.age, patient.gender, patient.disease))
        conn.commit()
        return {"message": "Patient Added Successfully", "patient_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/patients/me")
def get_patient_profile(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.*, u.email, u.status 
            FROM patients p
            INNER JOIN users u ON p.user_id = u.user_id
            WHERE p.user_id = %s
        """, (current_user["user_id"],))
        patient = cursor.fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        return patient
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/patients/me")
def update_patient_profile(profile: PatientProfileUpdate, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = res[0]
        
        cursor.execute("""
            UPDATE patients 
            SET name = %s, age = %s, gender = %s, phone_number = %s, address = %s, emergency_contact = %s 
            WHERE patient_id = %s
        """, (profile.name, profile.age, profile.gender, profile.phone_number, profile.address, profile.emergency_contact, patient_id))
        
        cursor.execute("UPDATE users SET name = %s WHERE user_id = %s", (profile.name, current_user["user_id"]))
        conn.commit()
        
        return {"message": "Profile updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, patient: PatientCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "UPDATE patients SET name = %s, age = %s, gender = %s, disease = %s WHERE patient_id = %s"
        cursor.execute(sql, (patient.name, patient.age, patient.gender, patient.disease, patient_id))
        conn.commit()
        return {"message": "Patient Updated Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "DELETE FROM patients WHERE patient_id = %s"
        cursor.execute(sql, (patient_id,))
        conn.commit()
        return {"message": "Patient Deleted Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/forgot-password")
def forgot_password(req: UserForgotPassword):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(%s)", (req.email,))
        db_user = cursor.fetchone()
        if not db_user:
            raise HTTPException(status_code=404, detail="Email not found")
        
        import random
        import string
        temp_pwd = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        hashed_pwd = hash_password(temp_pwd)
        
        cursor.execute("UPDATE users SET password = %s WHERE user_id = %s", (hashed_pwd, db_user["user_id"]))
        conn.commit()
        
        return {
            "message": "Temporary password generated successfully. Simulating email delivery.",
            "temporary_password": temp_pwd
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/patients/me/change-password")
def change_patient_password(req: UserChangePassword, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE user_id = %s", (current_user["user_id"],))
        db_user = cursor.fetchone()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if not verify_password(req.old_password, db_user["password"]):
            raise HTTPException(status_code=400, detail="Invalid current password")
            
        hashed_pwd = hash_password(req.new_password)
        cursor.execute("UPDATE users SET password = %s WHERE user_id = %s", (hashed_pwd, current_user["user_id"]))
        conn.commit()
        return {"message": "Password changed successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/patients/me/profile-picture")
def upload_profile_picture(file: UploadFile = File(...), current_user: dict = Depends(verify_token)):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "gif"]:
        raise HTTPException(status_code=400, detail="Only images are allowed (jpg, jpeg, png, gif)")
        
    os.makedirs("uploads/profile_pics", exist_ok=True)
    filename = f"profile_{current_user['user_id']}_{int(time.time())}.{ext}"
    filepath = os.path.join("uploads", "profile_pics", filename)
    
    try:
        with open(filepath, "wb") as buffer:
            buffer.write(file.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        web_path = f"/uploads/profile_pics/{filename}"
        cursor.execute("UPDATE patients SET profile_pic = %s WHERE user_id = %s", (web_path, current_user["user_id"]))
        conn.commit()
        return {"message": "Profile picture updated successfully", "profile_pic": web_path}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/patients/me/location")
def update_patient_location(loc: LocationUpdate, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE patients SET latitude = %s, longitude = %s WHERE user_id = %s", (loc.latitude, loc.longitude, current_user["user_id"]))
        conn.commit()
        return {"message": "Location updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/patients/me/records")
def get_patient_records(query: Optional[str] = None, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = res["patient_id"]
        
        if query:
            sql = """
                SELECT * FROM medical_records 
                WHERE patient_id = %s AND (LOWER(record_type) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s))
                ORDER BY uploaded_at DESC
            """
            like_val = f"%{query}%"
            cursor.execute(sql, (patient_id, like_val, like_val))
        else:
            cursor.execute("SELECT * FROM medical_records WHERE patient_id = %s ORDER BY uploaded_at DESC", (patient_id,))
            
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/patients/me/records")
def upload_patient_record(
    file: UploadFile = File(...),
    record_type: str = Form(...),
    description: str = Form(...),
    current_user: dict = Depends(verify_token)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "jpg", "jpeg", "png"]:
        raise HTTPException(status_code=400, detail="Only PDF and images (jpg, jpeg, png) are allowed")
        
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = res["patient_id"]
        
        os.makedirs("uploads/medical_records", exist_ok=True)
        filename = f"record_{patient_id}_{int(time.time())}_{file.filename}"
        filename = "".join(c for c in filename if c.isalnum() or c in "._-")
        filepath = os.path.join("uploads", "medical_records", filename)
        
        with open(filepath, "wb") as buffer:
            buffer.write(file.file.read())
            
        web_path = f"/uploads/medical_records/{filename}"
        
        cursor.execute("""
            INSERT INTO medical_records (patient_id, record_type, description, file_path)
            VALUES (%s, %s, %s, %s)
        """, (patient_id, record_type, description, web_path))
        conn.commit()
        
        return {"message": "Medical record uploaded successfully", "record_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/patients/me/records/{record_id}/download")
def download_patient_record(record_id: int, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = res["patient_id"]
        
        cursor.execute("SELECT * FROM medical_records WHERE record_id = %s", (record_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Medical record not found")
            
        if record["patient_id"] != patient_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this medical record")
            
        relative_path = record["file_path"].lstrip("/")
        filepath = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), relative_path)
        if not os.path.exists(filepath):
            filepath = os.path.join("d:\\PROJEC T\\mediAI", relative_path)
            if not os.path.exists(filepath):
                filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)
                if not os.path.exists(filepath):
                    raise HTTPException(status_code=404, detail="Physical file not found on server")
                
        orig_filename = record["file_path"].split("_", 3)[-1]
        return FileResponse(filepath, filename=orig_filename)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/patients/me/records/{record_id}")
def delete_patient_record(record_id: int, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = res["patient_id"]
        
        cursor.execute("SELECT * FROM medical_records WHERE record_id = %s", (record_id,))
        record = cursor.fetchone()
        if not record:
            raise HTTPException(status_code=404, detail="Medical record not found")
            
        if record["patient_id"] != patient_id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this medical record")
            
        relative_path = record["file_path"].lstrip("/")
        filepath = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), relative_path)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
                
        cursor.execute("DELETE FROM medical_records WHERE record_id = %s", (record_id,))
        conn.commit()
        return {"message": "Medical record deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# Doctors Management
@app.get("/doctors")
def get_doctors(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM doctors")
        data = cursor.fetchall()
        return data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/doctors")
def add_doctor(doctor: DoctorCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO doctors(name, specialization, department, availability) VALUES(%s, %s, %s, %s)"
        cursor.execute(sql, (doctor.name, doctor.specialization, doctor.department, doctor.availability))
        conn.commit()
        return {"message": "Doctor Added Successfully", "doctor_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/doctors/{doctor_id}")
def update_doctor(doctor_id: int, doctor: DoctorCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "UPDATE doctors SET name = %s, specialization = %s, department = %s, availability = %s WHERE doctor_id = %s"
        cursor.execute(sql, (doctor.name, doctor.specialization, doctor.department, doctor.availability, doctor_id))
        conn.commit()
        return {"message": "Doctor Updated Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: int, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "DELETE FROM doctors WHERE doctor_id = %s"
        cursor.execute(sql, (doctor_id,))
        conn.commit()
        return {"message": "Doctor Deleted Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# Appointments Management
@app.get("/appointments")
def get_appointments(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        role = current_user.get("role", "").lower()
        if role == "patient":
            cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
            res = cursor.fetchone()
            if not res:
                return []
            patient_id = res["patient_id"]
            sql = """
            SELECT 
                a.appointment_id, 
                a.appointment_date, 
                a.status,
                p.name as patient_name,
                p.gender as patient_gender,
                d.name as doctor_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
            WHERE a.patient_id = %s OR a.created_by_user_id = %s
            """
            cursor.execute(sql, (patient_id, current_user["user_id"]))
        else:
            sql = """
            SELECT 
                a.appointment_id, 
                a.appointment_date, 
                a.status,
                p.name as patient_name,
                p.gender as patient_gender,
                d.name as doctor_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
            """
            cursor.execute(sql)
        data = cursor.fetchall()
        return data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/appointments")
def add_appointment(appt: AppointmentCreate, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        role = current_user.get("role", "").lower()
        if role == "patient":
            cursor.execute("SELECT patient_id, name FROM patients WHERE user_id = %s", (current_user["user_id"],))
            p_res = cursor.fetchone()
            if not p_res:
                raise HTTPException(status_code=400, detail="Patient profile not found. Please update profile details first.")
            logged_patient_id = p_res[0]
            logged_patient_name = p_res[1]
            
            provided_name = appt.patient_name.strip() if appt.patient_name else ""
            if not provided_name or provided_name.lower() == logged_patient_name.lower():
                patient_id = logged_patient_id
                patient_name = logged_patient_name
            else:
                cursor.execute("SELECT patient_id FROM patients WHERE LOWER(name) = %s", (provided_name.lower(),))
                res = cursor.fetchone()
                if res:
                    patient_id = res[0]
                    cursor.execute("UPDATE patients SET gender = %s WHERE patient_id = %s", (appt.gender, patient_id))
                    conn.commit()
                else:
                    sql_patient = "INSERT INTO patients(name, age, gender, disease) VALUES(%s, %s, %s, %s)"
                    cursor.execute(sql_patient, (provided_name, 30, appt.gender, "None"))
                    conn.commit()
                    patient_id = cursor.lastrowid
                patient_name = provided_name
        else:
            cursor.execute("SELECT patient_id FROM patients WHERE LOWER(name) = %s", (appt.patient_name.strip().lower(),))
            res = cursor.fetchone()
            if res:
                patient_id = res[0]
                cursor.execute("UPDATE patients SET gender = %s WHERE patient_id = %s", (appt.gender, patient_id))
                conn.commit()
            else:
                sql_patient = "INSERT INTO patients(name, age, gender, disease) VALUES(%s, %s, %s, %s)"
                cursor.execute(sql_patient, (appt.patient_name.strip(), 30, appt.gender, "None"))
                conn.commit()
                patient_id = cursor.lastrowid
            patient_name = appt.patient_name

        sql = "INSERT INTO appointments(patient_id, doctor_id, appointment_date, status, created_by_user_id) VALUES(%s, %s, %s, %s, %s)"
        cursor.execute(sql, (patient_id, appt.doctor_id, appt.appointment_date, appt.status, current_user["user_id"]))
        conn.commit()
        appt_id = cursor.lastrowid

        # Notification
        cursor.execute("SELECT name FROM doctors WHERE doctor_id = %s", (appt.doctor_id,))
        doc_res = cursor.fetchone()
        doc_name = doc_res[0] if doc_res else "Doctor"
        
        patient_uid = current_user["user_id"] if role == "patient" else None
        if not patient_uid:
            cursor.execute("SELECT user_id FROM patients WHERE patient_id = %s", (patient_id,))
            uid_res = cursor.fetchone()
            if uid_res:
                patient_uid = uid_res[0]
                
        if patient_uid:
            msg = f"Your appointment with {doc_name} on {appt.appointment_date} has been booked."
            cursor.execute("INSERT INTO notifications (user_id, message, type) VALUES (%s, %s, 'Reminder')", (patient_uid, msg))
            conn.commit()

        return {"message": "Appointment Booked Successfully", "appointment_id": appt_id}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/appointments/{appointment_id}")
def update_appointment(appointment_id: int, appt: AppointmentCreate, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        role = current_user.get("role", "").lower()
        if role == "patient":
            cursor.execute("SELECT patient_id, name FROM patients WHERE user_id = %s", (current_user["user_id"],))
            p_res = cursor.fetchone()
            if not p_res:
                raise HTTPException(status_code=403, detail="Unauthorized access")
            logged_patient_id = p_res[0]
            logged_patient_name = p_res[1]
            
            cursor.execute("SELECT patient_id, created_by_user_id FROM appointments WHERE appointment_id = %s", (appointment_id,))
            appt_res = cursor.fetchone()
            if not appt_res or (appt_res[0] != logged_patient_id and appt_res[1] != current_user["user_id"]):
                raise HTTPException(status_code=403, detail="You do not have permission to modify this appointment")
            
            provided_name = appt.patient_name.strip() if appt.patient_name else ""
            if not provided_name or provided_name.lower() == logged_patient_name.lower():
                patient_id = logged_patient_id
            else:
                cursor.execute("SELECT patient_id FROM patients WHERE LOWER(name) = %s", (provided_name.lower(),))
                res = cursor.fetchone()
                if res:
                    patient_id = res[0]
                    cursor.execute("UPDATE patients SET gender = %s WHERE patient_id = %s", (appt.gender, patient_id))
                    conn.commit()
                else:
                    sql_patient = "INSERT INTO patients(name, age, gender, disease) VALUES(%s, %s, %s, %s)"
                    cursor.execute(sql_patient, (provided_name, 30, appt.gender, "None"))
                    conn.commit()
                    patient_id = cursor.lastrowid
        else:
            cursor.execute("SELECT patient_id FROM patients WHERE LOWER(name) = %s", (appt.patient_name.strip().lower(),))
            res = cursor.fetchone()
            if res:
                patient_id = res[0]
                cursor.execute("UPDATE patients SET gender = %s WHERE patient_id = %s", (appt.gender, patient_id))
                conn.commit()
            else:
                sql_patient = "INSERT INTO patients(name, age, gender, disease) VALUES(%s, %s, %s, %s)"
                cursor.execute(sql_patient, (appt.patient_name.strip(), 30, appt.gender, "None"))
                conn.commit()
                patient_id = cursor.lastrowid

        sql = "UPDATE appointments SET patient_id = %s, doctor_id = %s, appointment_date = %s, status = %s WHERE appointment_id = %s"
        cursor.execute(sql, (patient_id, appt.doctor_id, appt.appointment_date, appt.status, appointment_id))
        conn.commit()

        # Notification
        cursor.execute("SELECT name FROM doctors WHERE doctor_id = %s", (appt.doctor_id,))
        doc_res = cursor.fetchone()
        doc_name = doc_res[0] if doc_res else "Doctor"

        patient_uid = current_user["user_id"] if role == "patient" else None
        if not patient_uid:
            cursor.execute("SELECT user_id FROM patients WHERE patient_id = %s", (patient_id,))
            uid_res = cursor.fetchone()
            if uid_res:
                patient_uid = uid_res[0]
                
        if patient_uid:
            msg = f"Your appointment with {doc_name} has been updated to {appt.appointment_date} (Status: {appt.status})."
            cursor.execute("INSERT INTO notifications (user_id, message, type) VALUES (%s, %s, 'Reminder')", (patient_uid, msg))
            conn.commit()

        return {"message": "Appointment Updated Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        role = current_user.get("role", "").lower()
        if role == "patient":
            cursor.execute("SELECT patient_id FROM patients WHERE user_id = %s", (current_user["user_id"],))
            p_res = cursor.fetchone()
            if not p_res:
                raise HTTPException(status_code=403, detail="Unauthorized access")
            patient_id = p_res["patient_id"]
            
            cursor.execute("SELECT patient_id, doctor_id, appointment_date, created_by_user_id FROM appointments WHERE appointment_id = %s", (appointment_id,))
            appt_res = cursor.fetchone()
            if not appt_res or (appt_res["patient_id"] != patient_id and appt_res["created_by_user_id"] != current_user["user_id"]):
                raise HTTPException(status_code=403, detail="You do not have permission to cancel this appointment")
            doctor_id = appt_res["doctor_id"]
            appt_date = str(appt_res["appointment_date"])
        else:
            cursor.execute("SELECT patient_id, doctor_id, appointment_date FROM appointments WHERE appointment_id = %s", (appointment_id,))
            appt_res = cursor.fetchone()
            if appt_res:
                patient_id = appt_res["patient_id"]
                doctor_id = appt_res["doctor_id"]
                appt_date = str(appt_res["appointment_date"])
            else:
                patient_id = None
                doctor_id = None
                appt_date = ""

        # Close dictionary cursor and open regular cursor for compatibility
        cursor.close()
        cursor = conn.cursor()
        sql = "DELETE FROM appointments WHERE appointment_id = %s"
        cursor.execute(sql, (appointment_id,))
        conn.commit()

        # Notification
        if patient_id:
            cursor.execute("SELECT name FROM doctors WHERE doctor_id = %s", (doctor_id,))
            doc_res = cursor.fetchone()
            doc_name = doc_res[0] if doc_res else "Doctor"

            patient_uid = current_user["user_id"] if role == "patient" else None
            if not patient_uid:
                cursor.execute("SELECT user_id FROM patients WHERE patient_id = %s", (patient_id,))
                uid_res = cursor.fetchone()
                if uid_res:
                    patient_uid = uid_res[0]
                    
            if patient_uid:
                msg = f"Your appointment with {doc_name} on {appt_date} has been cancelled."
                cursor.execute("INSERT INTO notifications (user_id, message, type) VALUES (%s, %s, 'Reminder')", (patient_uid, msg))
                conn.commit()

        return {"message": "Appointment Cancelled/Deleted Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# Pharmacy Inventory Management
@app.get("/medicines")
def get_medicines(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM pharmacy_inventory")
        data = cursor.fetchall()
        return data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/medicines")
def add_medicine(med: MedicineCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO pharmacy_inventory(name, quantity, price) VALUES(%s, %s, %s)"
        cursor.execute(sql, (med.name, med.quantity, med.price))
        conn.commit()
        return {"message": "Medicine Added Successfully", "medicine_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/medicines/{medicine_id}")
def update_medicine(medicine_id: int, med: MedicineCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "UPDATE pharmacy_inventory SET name = %s, quantity = %s, price = %s WHERE medicine_id = %s"
        cursor.execute(sql, (med.name, med.quantity, med.price, medicine_id))
        conn.commit()
        return {"message": "Medicine Updated Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/medicines/{medicine_id}")
def delete_medicine(medicine_id: int, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "DELETE FROM pharmacy_inventory WHERE medicine_id = %s"
        cursor.execute(sql, (medicine_id,))
        conn.commit()
        return {"message": "Medicine Deleted Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# Laboratory Management
@app.get("/tests")
def get_tests(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM laboratory_tests")
        data = cursor.fetchall()
        return data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/tests")
def add_test(test: LabTestCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO laboratory_tests(patient_name, test_type, test_date, status) VALUES(%s, %s, %s, %s)"
        cursor.execute(sql, (test.patient_name, test.test_type, test.test_date, test.status))
        conn.commit()
        return {"message": "Laboratory Test Scheduled Successfully", "test_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/tests/{test_id}")
def update_test(test_id: int, test: LabTestCreate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "UPDATE laboratory_tests SET patient_name = %s, test_type = %s, test_date = %s, status = %s WHERE test_id = %s"
        cursor.execute(sql, (test.patient_name, test.test_type, test.test_date, test.status, test_id))
        conn.commit()
        return {"message": "Laboratory Test Updated Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/tests/{test_id}")
def delete_test(test_id: int, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "DELETE FROM laboratory_tests WHERE test_id = %s"
        cursor.execute(sql, (test_id,))
        conn.commit()
        return {"message": "Laboratory Test Deleted Successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# AI Models Integration Import Check
try:
    from ai_models.chatbot import get_chatbot_response
    from ai_models.disease_prediction import predict_disease_risk
    from ai_models.report_analysis import analyze_medical_report
except ImportError:
    # Fallback to dummy inline implementations if import fails
    def get_chatbot_response(msg: str):
        return "I am standard chatbot response. The chatbot service model is being initialized."
    def predict_disease_risk(age: int, bp: int, glucose: int, chol: int, symptom: str):
        return {"disease": "General Assessment Required", "score": "50%", "recommendation": "Consult Doctor"}
    def analyze_medical_report(filename: str):
        return {"findings": "Basic scan", "details": "Normal readings."}

@app.post("/chatbot")
def chatbot_endpoint(req: ChatRequest, current_user: dict = Depends(verify_token)):
    bot_res = get_chatbot_response(req.message)
    
    # Log to DB
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO chatbot_logs(user_message, bot_response, user_id) VALUES(%s, %s, %s)"
        cursor.execute(sql, (req.message, bot_res, current_user["user_id"]))
        conn.commit()
    except mysql.connector.Error:
        pass # Fail silently for logs database if connection issues
    finally:
        cursor.close()
        conn.close()
        
    return {"response": bot_res}

@app.get("/chatbot/history")
def get_chatbot_history(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM chatbot_logs WHERE user_id = %s ORDER BY timestamp ASC", (current_user["user_id"],))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/predict")
def predict_endpoint(req: PredictRequest, current_user: dict = Depends(verify_token)):
    result = predict_disease_risk(req.age, req.blood_pressure, req.glucose_level, req.cholesterol, req.symptom)
    
    # If a high risk is detected, create a health alert notification
    if "Normal range" not in result["score"] and current_user:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            msg = f"AI Health Alert: High risk of {result['disease']} ({result['score']}) predicted. Recommended specialist: {result['specialist']}."
            cursor.execute("INSERT INTO notifications (user_id, message, type) VALUES (%s, %s, 'Alert')", (current_user["user_id"], msg))
            conn.commit()
        except Exception:
            pass
        finally:
            cursor.close()
            conn.close()
            
    return result

@app.post("/analyze-report")
def analyze_report_endpoint(filename: str, current_user: dict = Depends(verify_token)):
    result = analyze_medical_report(filename)
    return result

@app.get("/notifications")
def get_user_notifications(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC", (current_user["user_id"],))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE notification_id = %s AND user_id = %s", (notification_id, current_user["user_id"]))
        conn.commit()
        return {"message": "Notification marked as read"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/patients/me/analytics")
def get_patient_analytics(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT patient_id, name FROM patients WHERE user_id = %s", (current_user["user_id"],))
        res = cursor.fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = res["patient_id"]
        patient_name = res["name"]
        
        cursor.execute("SELECT COUNT(*) as count FROM appointments WHERE patient_id = %s", (patient_id,))
        appt_count = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM chatbot_logs WHERE user_id = %s", (current_user["user_id"],))
        chat_count = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM medical_records WHERE patient_id = %s", (patient_id,))
        records_count = cursor.fetchone()["count"]
        
        cursor.execute("SELECT COUNT(*) as count FROM laboratory_tests WHERE LOWER(patient_name) = LOWER(%s)", (patient_name,))
        tests_count = cursor.fetchone()["count"]
        
        return {
            "total_appointments": appt_count,
            "chatbot_messages": chat_count,
            "medical_records": records_count,
            "lab_tests": tests_count,
            "health_trends": {
                "health_score": 95,
                "blood_pressure": "120/80 mmHg",
                "glucose_level": "90 mg/dL",
                "cholesterol": "180 mg/dL"
            }
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

class StatusUpdate(BaseModel):
    status: str

# Emergency Cases Endpoints
@app.get("/emergencies")
def get_emergencies(current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
        SELECT 
            e.emergency_id, 
            e.patient_name, 
            e.severity, 
            e.contact_phone, 
            e.symptoms, 
            e.status, 
            e.created_at,
            e.latitude,
            e.longitude,
            d.name as doctor_name
        FROM emergency_cases e
        LEFT JOIN doctors d ON e.assigned_doctor_id = d.doctor_id
        ORDER BY e.created_at DESC
        """
        cursor.execute(sql)
        data = cursor.fetchall()
        return data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/emergencies")
def create_emergency(case: EmergencyCreate, current_user: dict = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assigned_doc = case.assigned_doctor_id
        
        # If no doctor assigned, automatically pick the first available doctor
        if not assigned_doc:
            cursor.execute("SELECT doctor_id FROM doctors WHERE availability = 'Available' LIMIT 1")
            doc = cursor.fetchone()
            if doc:
                assigned_doc = doc["doctor_id"]
        
        sql = """
        INSERT INTO emergency_cases (patient_name, severity, contact_phone, symptoms, assigned_doctor_id, status, latitude, longitude)
        VALUES (%s, %s, %s, %s, %s, 'Active', %s, %s)
        """
        cursor.execute(sql, (case.patient_name, case.severity, case.contact_phone, case.symptoms, assigned_doc, case.latitude, case.longitude))
        conn.commit()
        return {"message": "Emergency booked successfully", "emergency_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/emergencies/{emergency_id}/status")
def update_emergency_status(emergency_id: int, req: StatusUpdate, current_user: dict = Depends(verify_write_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "UPDATE emergency_cases SET status = %s WHERE emergency_id = %s"
        cursor.execute(sql, (req.status, emergency_id))
        conn.commit()
        return {"message": "Emergency status updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# --- SUPER ADMIN PORTAL APIS (Admin Only) ---

# User Management APIs
@app.get("/admin/users")
def admin_get_users(role: Optional[str] = None, search: Optional[str] = None, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "SELECT user_id, name, email, role, status, created_at, last_login FROM users WHERE 1=1"
        params = []
        if role:
            sql += " AND role = %s"
            params.append(role)
        if search:
            sql += " AND (name LIKE %s OR email LIKE %s)"
            params.extend([f"%{search}%", f"%{search}%"])
        sql += " ORDER BY created_at DESC"
        cursor.execute(sql, tuple(params))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/users")
def admin_create_user(user: UserRegister, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_pwd = hash_password(user.password)
        sql = "INSERT INTO users (name, email, password, role, status) VALUES (%s, %s, %s, %s, 'Active')"
        cursor.execute(sql, (user.name, user.email, hashed_pwd, user.role))
        conn.commit()
        user_id = cursor.lastrowid

        # Insert placeholder record into doctors/patients linked by user_id
        if user.role.lower() == "patient":
            cursor.execute(
                "INSERT INTO patients (name, age, gender, disease, user_id) VALUES (%s, %s, %s, %s, %s)",
                (user.name, 30, "Other", "None", user_id),
            )
            conn.commit()
        elif user.role.lower() == "doctor":
            cursor.execute(
                "INSERT INTO doctors (name, specialization, department, availability, user_id) VALUES (%s, %s, %s, %s, %s)",
                (user.name, "General Medicine", "Outpatient", "Available", user_id),
            )
            conn.commit()

        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Created User account: {user.email} ({user.role})")
        return {"message": "User Account Created Successfully", "user_id": user_id}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/users/{user_id}")
def admin_update_user(user_id: int, user: UserUpdate, status: Optional[str] = "Active", current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if user.password:
            hashed_pwd = hash_password(user.password)
            sql = "UPDATE users SET name = %s, email = %s, role = %s, password = %s, status = %s WHERE user_id = %s"
            cursor.execute(sql, (user.name, user.email, user.role, hashed_pwd, status, user_id))
        else:
            sql = "UPDATE users SET name = %s, email = %s, role = %s, status = %s WHERE user_id = %s"
            cursor.execute(sql, (user.name, user.email, user.role, status, user_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Updated User details for ID: {user_id}")
        return {"message": "User updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/users/{user_id}/status")
def admin_toggle_user_status(user_id: int, req: StatusUpdate, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET status = %s WHERE user_id = %s", (req.status, user_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Toggled user status of ID {user_id} to {req.status}")
        return {"message": f"User status set to {req.status}"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Deleted User ID: {user_id}")
        return {"message": "User Deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Doctor Management Extensions
@app.put("/admin/doctors/{doctor_id}/schedule")
def admin_update_doctor_schedule(doctor_id: int, schedule: str, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE doctors SET schedule = %s WHERE doctor_id = %s", (schedule, doctor_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Updated Doctor ID {doctor_id} schedule to: {schedule}")
        return {"message": "Doctor schedule updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Patient Management Extensions
@app.put("/admin/patients/{patient_id}/history")
def admin_update_patient_history(patient_id: int, history: str, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE patients SET medical_history = %s WHERE patient_id = %s", (history, patient_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Updated Medical History for Patient ID: {patient_id}")
        return {"message": "Medical history updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Appointment Management Extensions
@app.put("/admin/appointments/{appointment_id}/approve")
def admin_approve_appointment(appointment_id: int, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE appointments SET status = 'Approved' WHERE appointment_id = %s", (appointment_id,))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Approved Appointment ID: {appointment_id}")
        return {"message": "Appointment approved successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/appointments/{appointment_id}/cancel")
def admin_cancel_appointment(appointment_id: int, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = %s", (appointment_id,))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Cancelled Appointment ID: {appointment_id}")
        return {"message": "Appointment cancelled successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/admin/appointments/{appointment_id}/reschedule")
def admin_reschedule_appointment(appointment_id: int, new_date: str, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE appointments SET appointment_date = %s WHERE appointment_id = %s", (new_date, appointment_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Rescheduled Appointment ID {appointment_id} to: {new_date}")
        return {"message": "Appointment rescheduled successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Emergency Management Extensions
@app.put("/admin/emergencies/{emergency_id}/assign")
def admin_assign_emergency_doctor(emergency_id: int, doctor_id: int, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE emergency_cases SET assigned_doctor_id = %s WHERE emergency_id = %s", (doctor_id, emergency_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Assigned Doctor ID {doctor_id} to Emergency ID {emergency_id}")
        return {"message": "Doctor assigned to emergency case successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Laboratory Management Extensions (with upload support)
@app.post("/admin/laboratory/upload/{test_id}")
async def admin_upload_lab_report(test_id: int, file: UploadFile = File(...), current_user: dict = Depends(verify_admin_token)):
    # Save the file to uploads directory
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
    
    file_ext = os.path.splitext(file.filename)[1]
    saved_filename = f"report_{test_id}_{int(time.time())}{file_ext}"
    dest_path = os.path.join(uploads_dir, saved_filename)
    
    try:
        contents = await file.read()
        with open(dest_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE laboratory_tests SET report_file = %s, status = 'Completed' WHERE test_id = %s", (saved_filename, test_id))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Uploaded Lab Report for Test ID: {test_id}")
        return {"message": "Laboratory report uploaded successfully", "filename": saved_filename}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Prescriptions Management CRUD
class PrescriptionCreate(BaseModel):
    patient_name: str
    doctor_name: str
    medicine_name: str
    dosage: str
    frequency: str
    prescribed_date: str

@app.get("/admin/prescriptions")
def admin_get_prescriptions(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM prescriptions ORDER BY prescribed_date DESC")
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/prescriptions")
def admin_create_prescription(pres: PrescriptionCreate, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO prescriptions (patient_name, doctor_name, medicine_name, dosage, frequency, prescribed_date) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(sql, (pres.patient_name, pres.doctor_name, pres.medicine_name, pres.dosage, pres.frequency, pres.prescribed_date))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Created Prescription for: {pres.patient_name}")
        return {"message": "Prescription created successfully", "prescription_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/admin/prescriptions/{prescription_id}")
def admin_delete_prescription(prescription_id: int, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM prescriptions WHERE prescription_id = %s", (prescription_id,))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Deleted Prescription ID: {prescription_id}")
        return {"message": "Prescription deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# AI Assistant Management
@app.get("/admin/ai/stats")
def admin_get_ai_stats(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) as count FROM chatbot_logs")
        logs_count = cursor.fetchone()["count"]

        # Retrieve AI settings
        cursor.execute("SELECT setting_value FROM settings WHERE setting_key = 'ai_enabled'")
        ai_val = cursor.fetchone()
        ai_enabled = ai_val["setting_value"] == "true" if ai_val else True

        cursor.execute("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'")
        key_val = cursor.fetchone()
        api_key = key_val["setting_value"] if key_val else ""

        # Fetch last 50 chatbot logs
        cursor.execute("SELECT * FROM chatbot_logs ORDER BY timestamp DESC LIMIT 50")
        logs = cursor.fetchall()

        return {
            "chatbot_logs_count": logs_count,
            "ai_enabled": ai_enabled,
            "gemini_api_key": api_key,
            "recent_chat_logs": logs
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/ai/toggle")
def admin_toggle_ai(enabled: bool, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        val = "true" if enabled else "false"
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('ai_enabled', %s) ON DUPLICATE KEY UPDATE setting_value = %s", (val, val))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Toggled AI Assistant to: {val}")
        return {"message": f"AI Assistant toggled to {val}"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/admin/ai/apikey")
def admin_update_apikey(apikey: str, current_user: dict = Depends(verify_admin_token)):
    from ai_models.chatbot import check_and_exchange_management_key
    apikey = check_and_exchange_management_key(apikey)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('gemini_api_key', %s) ON DUPLICATE KEY UPDATE setting_value = %s", (apikey, apikey))
        conn.commit()
        # Override key in environment
        os.environ["GEMINI_API_KEY"] = apikey
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], "Updated Gemini AI API Key")
        return {"message": "Gemini API Key updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Settings APIs
@app.get("/admin/settings")
def admin_get_settings(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM settings")
        rows = cursor.fetchall()
        settings_dict = {r["setting_key"]: r["setting_value"] for r in rows}
        return settings_dict
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

class SettingsUpdate(BaseModel):
    hospital_name: str
    system_email: str
    backup_frequency: str

@app.post("/admin/settings")
def admin_save_settings(settings: SettingsUpdate, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('hospital_name', %s) ON DUPLICATE KEY UPDATE setting_value = %s", (settings.hospital_name, settings.hospital_name))
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('system_email', %s) ON DUPLICATE KEY UPDATE setting_value = %s", (settings.system_email, settings.system_email))
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('backup_frequency', %s) ON DUPLICATE KEY UPDATE setting_value = %s", (settings.backup_frequency, settings.backup_frequency))
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], "Updated Hospital General Settings")
        return {"message": "General settings saved successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Security Logs APIs
@app.get("/admin/logs/activity")
def admin_get_activity_logs(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200")
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Database Backup & Restore Utilities (Self-contained JSON Dump)
@app.get("/admin/db/backup")
def admin_db_backup(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        tables = [
            "patients", "doctors", "appointments", "laboratory_tests", 
            "pharmacy_inventory", "users", "emergency_cases", "prescriptions", "settings"
        ]
        backup_data = {}
        for table in tables:
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            
            # Format row values like dates/decimals/timestamps into strings for JSON safety
            for r in rows:
                for key, val in r.items():
                    if val is not None and not isinstance(val, (int, float, str, bool)):
                        r[key] = str(val)
            backup_data[table] = rows
            
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], "Generated complete Database Backup File")
        return backup_data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

class RestoreRequest(BaseModel):
    data: dict

@app.post("/admin/db/restore")
def admin_db_restore(req: RestoreRequest, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Turn off foreign key constraints during restore
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        for table, rows in req.data.items():
            # Truncate Table
            cursor.execute(f"TRUNCATE TABLE {table}")
            if not rows:
                continue
            
            # Formulate bulk insert
            columns = rows[0].keys()
            col_list = ", ".join(columns)
            val_placeholders = ", ".join(["%s"] * len(columns))
            sql = f"INSERT INTO {table} ({col_list}) VALUES ({val_placeholders})"
            
            val_tuples = []
            for r in rows:
                val_tuples.append(tuple(r[c] for c in columns))
                
            cursor.executemany(sql, val_tuples)
            
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], "Restored Database state from backup file")
        return {"message": "Database restored successfully"}
    except mysql.connector.Error as err:
        try:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Report Management Export (CSV format for Excel compatibility)
@app.get("/admin/reports/export")
def admin_export_csv(module: str, current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        tables_mapping = {
            "users": "SELECT user_id, name, email, role, status, created_at FROM users",
            "doctors": "SELECT doctor_id, name, specialization, department, availability, schedule FROM doctors",
            "patients": "SELECT patient_id, name, age, gender, disease, medical_history FROM patients",
            "appointments": "SELECT a.appointment_id, p.name as patient, d.name as doctor, a.appointment_date, a.status FROM appointments a LEFT JOIN patients p ON a.patient_id = p.patient_id LEFT JOIN doctors d ON a.doctor_id = d.doctor_id",
            "pharmacy": "SELECT medicine_id, name, quantity, price FROM pharmacy_inventory",
            "emergencies": "SELECT e.emergency_id, e.patient_name, e.severity, e.contact_phone, e.status, e.created_at FROM emergency_cases e"
        }
        
        if module not in tables_mapping:
            raise HTTPException(status_code=400, detail="Invalid module specified for export")
            
        cursor.execute(tables_mapping[module])
        rows = cursor.fetchall()
        
        # Build CSV file
        output = io.StringIO()
        writer = csv.writer(output)
        
        if rows:
            headers = rows[0].keys()
            writer.writerow(headers)
            for r in rows:
                writer.writerow(r.values())
                
        csv_data = output.getvalue()
        output.close()
        
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], f"Exported {module} list to CSV")
        
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=export_{module}_{int(time.time())}.csv"}
        )
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# Printable PDF Report Generator (Triggers print() on browser load)
@app.get("/admin/reports/pdf")
def admin_generate_pdf_report(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch stats
        cursor.execute("SELECT COUNT(*) as count FROM patients")
        total_patients = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM doctors")
        total_doctors = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM appointments")
        total_appointments = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM emergency_cases")
        total_emergencies = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM laboratory_tests")
        total_lab_tests = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM prescriptions")
        total_prescriptions = cursor.fetchone()["count"]

        cursor.execute("SELECT SUM(quantity * price) as val FROM pharmacy_inventory")
        res = cursor.fetchone()["val"]
        pharmacy_val = float(res) if res else 0.0

        # Generate printable report HTML
        html_report = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MediAI - Clinical Operations PDF Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; margin: 0; background: #fff; }}
        .report-header {{ border-bottom: 3px double #004080; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }}
        .report-header h1 {{ margin: 0 0 10px 0; color: #004080; text-transform: uppercase; font-size: 28px; }}
        .report-header p {{ margin: 0; font-size: 14px; color: #666; }}
        .meta-info {{ display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px; color: #555; background: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px solid #eee; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }}
        .stat-box {{ border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff; text-align: center; }}
        .stat-box h3 {{ margin: 0 0 10px 0; font-size: 32px; color: #004080; }}
        .stat-box p {{ margin: 0; font-size: 14px; font-weight: bold; color: #666; }}
        .section-title {{ font-size: 18px; color: #004080; border-bottom: 2px solid #004080; padding-bottom: 8px; margin-bottom: 20px; margin-top: 30px; }}
        .signature-section {{ margin-top: 80px; display: flex; justify-content: space-between; }}
        .sig-block {{ width: 200px; border-top: 1px solid #333; text-align: center; font-size: 13px; padding-top: 5px; }}
        @media print {{
            body {{ padding: 20px; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="report-header">
        <h1>MediAI Healthcare System</h1>
        <h3>Clinical Operations & Administrative Audit Summary</h3>
        <p>Comprehensive monthly operational status metrics summary report</p>
    </div>

    <div class="meta-info">
        <div><strong>Generated By:</strong> Super Admin ({current_user['name']})</div>
        <div><strong>Generation Date:</strong> {time.strftime('%Y-%m-%d %H:%M:%S')}</div>
        <div><strong>Security Protocol:</strong> Audited / Authenticated Session</div>
    </div>

    <h2 class="section-title">Core Operations Summary Metrics</h2>
    <div class="stats-grid">
        <div class="stat-box">
            <h3>{total_patients}</h3>
            <p>Total Registered Patients</p>
        </div>
        <div class="stat-box">
            <h3>{total_doctors}</h3>
            <p>On-Duty Hospital Staff Doctors</p>
        </div>
        <div class="stat-box">
            <h3>{total_appointments}</h3>
            <p>Scheduled Patient Appointments</p>
        </div>
        <div class="stat-box">
            <h3>{total_emergencies}</h3>
            <p>Reported Active Emergencies</p>
        </div>
        <div class="stat-box">
            <h3>{total_lab_tests}</h3>
            <p>Total Laboratory Bookings</p>
        </div>
        <div class="stat-box">
            <h3>{total_prescriptions}</h3>
            <p>Doctor Prescriptions Generated</p>
        </div>
    </div>

    <h2 class="section-title">Financial & Asset Valuations</h2>
    <table style="width:100%; border-collapse: collapse; margin-top:15px; font-size:14px;">
        <tr style="background:#f2f2f2; border-bottom:2px solid #ddd; font-weight:bold; text-align:left;">
            <th style="padding:12px;">Operational Division</th>
            <th style="padding:12px;">Unit Asset Value</th>
            <th style="padding:12px;">Operational Valuation Estimations</th>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px;">Pharmacy Stock Valuation</td>
            <td style="padding:12px;">Active Medicines Stock Valuation</td>
            <td style="padding:12px;">₹${pharmacy_val:,.2f} INR</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px;">Clinic Appointments Revenue</td>
            <td style="padding:12px;">Est. ₹20,000 INR per completed session</td>
            <td style="padding:12px;">₹${(total_appointments * 20000):,.2f} INR</td>
        </tr>
        <tr style="background:#f9f9f9; font-weight:bold; border-top:2px solid #004080;">
            <td style="padding:12px;">Total Administrative Valuation Summary</td>
            <td style="padding:12px;">-</td>
            <td style="padding:12px;">₹${((total_appointments * 20000) + pharmacy_val):,.2f} INR</td>
        </tr>
    </table>

    <div class="signature-section">
        <div class="sig-block">
            Clinical Operations Supervisor
        </div>
        <div class="sig-block">
            Administrative Audit Director
        </div>
    </div>

    <script>
        window.onload = function() {{
            window.print();
        }}
    </script>
</body>
</html>"""
        log_activity(current_user["user_id"], current_user["name"], current_user["role"], "Generated Printable HTML Operations Report")
        return Response(content=html_report, media_type="text/html")
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Admin Analytics Endpoint
@app.get("/admin/analytics")
def get_admin_analytics(current_user: dict = Depends(verify_admin_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. User/Staff counts
        cursor.execute("SELECT COUNT(*) as count FROM patients")
        total_patients = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM doctors")
        total_doctors = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM users")
        total_users = cursor.fetchone()["count"]

        # 2. Appointments counts and breakdown
        cursor.execute("SELECT COUNT(*) as count FROM appointments")
        total_appointments = cursor.fetchone()["count"]

        cursor.execute("SELECT status, COUNT(*) as count FROM appointments GROUP BY status")
        appointments_breakdown = cursor.fetchall()

        # 3. Lab tests
        cursor.execute("SELECT COUNT(*) as count FROM laboratory_tests")
        total_lab_tests = cursor.fetchone()["count"]

        # 4. Pharmacy details
        cursor.execute("SELECT COUNT(*) as count, SUM(quantity * price) as total_value FROM pharmacy_inventory")
        pharm_res = cursor.fetchone()
        total_medicines = pharm_res["count"] if pharm_res["count"] else 0
        total_pharmacy_value = float(pharm_res["total_value"]) if pharm_res["total_value"] else 0.0

        # 5. Emergencies counts and breakdown
        cursor.execute("SELECT COUNT(*) as count FROM emergency_cases")
        total_emergencies = cursor.fetchone()["count"]

        cursor.execute("SELECT status, COUNT(*) as count FROM emergency_cases GROUP BY status")
        emergencies_status = cursor.fetchall()

        cursor.execute("SELECT severity, COUNT(*) as count FROM emergency_cases GROUP BY severity")
        emergencies_severity = cursor.fetchall()

        # 6. Prescriptions count
        cursor.execute("SELECT COUNT(*) as count FROM prescriptions")
        total_prescriptions = cursor.fetchone()["count"]

        # 7. Revenue summary calculation
        total_revenue = (total_appointments * 20000.0) + total_pharmacy_value

        return {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_users": total_users,
            "total_prescriptions": total_prescriptions,
            "total_revenue": total_revenue,
            "appointments": {
                "total": total_appointments,
                "breakdown": appointments_breakdown
            },
            "total_lab_tests": total_lab_tests,
            "pharmacy": {
                "total_items": total_medicines,
                "total_value": total_pharmacy_value
            },
            "emergencies": {
                "total": total_emergencies,
                "status_breakdown": emergencies_status,
                "severity_breakdown": emergencies_severity
            }
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()



# =====================================================================
# EMPLOYEE MANAGEMENT API MODULE
# =====================================================================

class EmployeeCreate(BaseModel):
    full_name: str
    profile_photo: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    joining_date: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    salary: Optional[float] = 0.0
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = "Active"

class EmployeeUpdate(BaseModel):
    full_name: str
    profile_photo: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    joining_date: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    salary: Optional[float] = 0.0
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = "Active"

class AttendanceLog(BaseModel):
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: Optional[str] = "Present"

class LeaveRequest(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class LeaveStatusUpdate(BaseModel):
    status: str

class ShiftAssignment(BaseModel):
    shift_name: str
    start_time: str
    end_time: str
    day_of_week: str

class PayrollGenerate(BaseModel):
    month: str
    year: int
    basic_salary: float
    allowances: float
    deductions: float
    status: Optional[str] = "Unpaid"

class PerformanceEvaluation(BaseModel):
    rating: int
    feedback: str
    evaluation_date: str
    evaluator: str

class TaskCreate(BaseModel):
    title: str
    description: str
    due_date: str

class TaskStatusUpdate(BaseModel):
    status: str

@app.get("/api/employees/dashboard/stats")
def get_employee_dashboard_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Total Employees
        cursor.execute("SELECT COUNT(*) as count FROM employees")
        total = cursor.fetchone()["count"]

        # Active Employees
        cursor.execute("SELECT COUNT(*) as count FROM employees WHERE LOWER(status) = 'active'")
        active = cursor.fetchone()["count"]

        # Today's date
        from datetime import date
        today_str = date.today().isoformat()

        # Employees on Leave today
        cursor.execute("""
            SELECT COUNT(DISTINCT employee_id) as count FROM employee_leaves 
            WHERE LOWER(status) = 'approved' AND %s BETWEEN start_date AND end_date
        """, (today_str,))
        on_leave = cursor.fetchone()["count"]

        # Attendance Today
        cursor.execute("SELECT COUNT(*) as count FROM employee_attendance WHERE date = %s", (today_str,))
        attendance_today = cursor.fetchone()["count"]

        # Department Distribution
        cursor.execute("SELECT department, COUNT(*) as count FROM employees GROUP BY department")
        dept_dist = cursor.fetchall()

        # Recent activities (last 5 employee notifications)
        cursor.execute("SELECT * FROM employee_notifications ORDER BY notification_id DESC LIMIT 5")
        recent_activities = cursor.fetchall()

        return {
            "total_employees": total,
            "active_employees": active,
            "employees_on_leave": on_leave,
            "attendance_today": attendance_today,
            "department_distribution": dept_dist,
            "recent_activities": recent_activities
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees")
def get_employees(search: Optional[str] = None, department: Optional[str] = None, role: Optional[str] = None, status: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM employees WHERE 1=1"
        params = []
        if search:
            query += " AND (LOWER(full_name) LIKE LOWER(%s) OR LOWER(email) LIKE LOWER(%s) OR LOWER(designation) LIKE LOWER(%s))"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if department:
            query += " AND LOWER(department) = LOWER(%s)"
            params.append(department)
        if role:
            query += " AND LOWER(role) = LOWER(%s)"
            params.append(role)
        if status:
            query += " AND LOWER(status) = LOWER(%s)"
            params.append(status)
        query += " ORDER BY employee_id DESC"
        cursor.execute(query, tuple(params))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees")
def create_employee(employee: EmployeeCreate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check email uniqueness
        if employee.email:
            cursor.execute("SELECT * FROM employees WHERE LOWER(email) = LOWER(%s)", (employee.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered for an employee")
        
        sql = """
        INSERT INTO employees (
            full_name, profile_photo, gender, dob, phone, email, address, department, designation, role,
            joining_date, qualification, experience, salary, blood_group, emergency_contact, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            employee.full_name, employee.profile_photo, employee.gender, employee.dob, employee.phone,
            employee.email, employee.address, employee.department, employee.designation, employee.role,
            employee.joining_date, employee.qualification, employee.experience, employee.salary,
            employee.blood_group, employee.emergency_contact, employee.status
        ))
        conn.commit()
        emp_id = cursor.lastrowid
        
        # Log notification
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (emp_id, f"New employee registered: {employee.full_name} ({employee.role})"))
        conn.commit()
        
        return {"message": "Employee created successfully", "employee_id": emp_id}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()
@app.get("/api/employees/notifications")
def get_employee_notifications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_notifications ORDER BY notification_id DESC LIMIT 100")
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}")
def get_employee(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        return emp
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/employees/{employee_id}")
def update_employee(employee_id: int, employee: EmployeeUpdate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if employee exists
        cursor.execute("SELECT * FROM employees WHERE employee_id = %s", (employee_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check email uniqueness
        if employee.email:
            cursor.execute("SELECT * FROM employees WHERE LOWER(email) = LOWER(%s) AND employee_id != %s", (employee.email, employee_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered for another employee")

        sql = """
        UPDATE employees SET
            full_name=%s, profile_photo=%s, gender=%s, dob=%s, phone=%s, email=%s, address=%s, department=%s,
            designation=%s, role=%s, joining_date=%s, qualification=%s, experience=%s, salary=%s, blood_group=%s,
            emergency_contact=%s, status=%s
        WHERE employee_id=%s
        """
        cursor.execute(sql, (
            employee.full_name, employee.profile_photo, employee.gender, employee.dob, employee.phone,
            employee.email, employee.address, employee.department, employee.designation, employee.role,
            employee.joining_date, employee.qualification, employee.experience, employee.salary,
            employee.blood_group, employee.emergency_contact, employee.status, employee_id
        ))
        conn.commit()
        
        # Log notification
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Employee profile updated: {employee.full_name}"))
        conn.commit()

        return {"message": "Employee updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch name before deletion for logging
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        cursor.execute("DELETE FROM employees WHERE employee_id = %s", (employee_id,))
        conn.commit()

        # Log notification
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (NULL, %s)
        """, (f"Employee profile deleted: {emp['full_name']}",))
        conn.commit()

        return {"message": "Employee deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}/attendance")
def get_employee_attendance(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_attendance WHERE employee_id = %s ORDER BY date DESC", (employee_id,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees/{employee_id}/attendance")
def log_attendance(employee_id: int, log: AttendanceLog):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if record for today/date already exists
        cursor.execute("SELECT * FROM employee_attendance WHERE employee_id = %s AND date = %s", (employee_id, log.date))
        existing = cursor.fetchone()
        if existing:
            # Update check_out and status
            sql = "UPDATE employee_attendance SET check_out=%s, status=%s WHERE attendance_id=%s"
            cursor.execute(sql, (log.check_out, log.status, existing["attendance_id"]))
        else:
            # Create new entry
            sql = "INSERT INTO employee_attendance (employee_id, date, check_in, check_out, status) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (employee_id, log.date, log.check_in, log.check_out, log.status))
        conn.commit()
        
        # Log notification
        action = "clocked out" if log.check_out else "clocked in"
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Employee {emp_name} {action} on {log.date}"))
        conn.commit()

        return {"message": "Attendance logged successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/attendance/today")
def get_today_attendance():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        from datetime import date
        today_str = date.today().isoformat()
        cursor.execute("""
            SELECT a.*, e.full_name, e.department, e.role 
            FROM employee_attendance a
            JOIN employees e ON a.employee_id = e.employee_id
            WHERE a.date = %s
        """, (today_str,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}/leaves")
def get_employee_leaves(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_leaves WHERE employee_id = %s ORDER BY start_date DESC", (employee_id,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees/{employee_id}/leaves")
def request_leave(employee_id: int, leave: LeaveRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "INSERT INTO employee_leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES (%s, %s, %s, %s, %s, 'Pending')"
        cursor.execute(sql, (employee_id, leave.leave_type, leave.start_date, leave.end_date, leave.reason))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Leave requested by {emp_name}: {leave.leave_type} ({leave.start_date} to {leave.end_date})"))
        conn.commit()

        return {"message": "Leave request submitted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/leaves/pending")
def get_pending_leaves():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.*, e.full_name, e.department, e.role 
            FROM employee_leaves l
            JOIN employees e ON l.employee_id = e.employee_id
            WHERE LOWER(l.status) = 'pending'
            ORDER BY l.start_date ASC
        """)
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/leaves/all")
def get_all_leaves():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.*, e.full_name, e.department, e.role 
            FROM employee_leaves l
            JOIN employees e ON l.employee_id = e.employee_id
            ORDER BY l.start_date DESC
        """)
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/employees/leaves/{leave_id}")
def update_leave_status(leave_id: int, update: LeaveStatusUpdate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check leave request
        cursor.execute("SELECT * FROM employee_leaves WHERE leave_id = %s", (leave_id,))
        leave = cursor.fetchone()
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")

        cursor.execute("UPDATE employee_leaves SET status = %s WHERE leave_id = %s", (update.status, leave_id))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (leave["employee_id"],))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (leave["employee_id"], f"Leave request for {emp_name} has been {update.status}"))
        conn.commit()

        return {"message": f"Leave request marked as {update.status}"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}/shifts")
def get_employee_shifts(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_shifts WHERE employee_id = %s", (employee_id,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees/{employee_id}/shifts")
def assign_shift(employee_id: int, shift: ShiftAssignment):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Delete duplicate shift for the same day if any
        cursor.execute("DELETE FROM employee_shifts WHERE employee_id = %s AND day_of_week = %s", (employee_id, shift.day_of_week))
        
        sql = "INSERT INTO employee_shifts (employee_id, shift_name, start_time, end_time, day_of_week) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(sql, (employee_id, shift.shift_name, shift.start_time, shift.end_time, shift.day_of_week))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Shift assigned to {emp_name}: {shift.shift_name} on {shift.day_of_week}"))
        conn.commit()

        return {"message": "Shift assigned successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}/payroll")
def get_employee_payroll(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_payroll WHERE employee_id = %s ORDER BY year DESC, month DESC", (employee_id,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees/{employee_id}/payroll")
def generate_payroll(employee_id: int, payroll: PayrollGenerate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if payroll already exists for the month/year
        cursor.execute("SELECT * FROM employee_payroll WHERE employee_id = %s AND month = %s AND year = %s", (employee_id, payroll.month, payroll.year))
        existing = cursor.fetchone()
        net_salary = payroll.basic_salary + payroll.allowances - payroll.deductions
        
        if existing:
            sql = """
            UPDATE employee_payroll SET basic_salary=%s, allowances=%s, deductions=%s, net_salary=%s, status=%s
            WHERE payroll_id=%s
            """
            cursor.execute(sql, (payroll.basic_salary, payroll.allowances, payroll.deductions, net_salary, payroll.status, existing["payroll_id"]))
        else:
            sql = """
            INSERT INTO employee_payroll (employee_id, month, year, basic_salary, allowances, deductions, net_salary, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (employee_id, payroll.month, payroll.year, payroll.basic_salary, payroll.allowances, payroll.deductions, net_salary, payroll.status))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Payroll generated for {emp_name} for {payroll.month} {payroll.year} ({payroll.status})"))
        conn.commit()

        return {"message": "Payroll details saved successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/employees/payroll/{payroll_id}/pay")
def pay_payroll(payroll_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        from datetime import date
        today_str = date.today().isoformat()
        cursor.execute("SELECT * FROM employee_payroll WHERE payroll_id = %s", (payroll_id,))
        p = cursor.fetchone()
        if not p:
            raise HTTPException(status_code=404, detail="Payroll record not found")
        
        cursor.execute("UPDATE employee_payroll SET status = 'Paid', payment_date = %s WHERE payroll_id = %s", (today_str, payroll_id))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (p["employee_id"],))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (p["employee_id"], f"Payroll paid to {emp_name} for {p['month']} {p['year']}"))
        conn.commit()

        return {"message": "Payroll status marked as Paid"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}/performance")
def get_employee_performance(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_performance WHERE employee_id = %s ORDER BY evaluation_date DESC", (employee_id,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees/{employee_id}/performance")
def create_performance_evaluation(employee_id: int, eval: PerformanceEvaluation):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "INSERT INTO employee_performance (employee_id, rating, feedback, evaluation_date, evaluator) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(sql, (employee_id, eval.rating, eval.feedback, eval.evaluation_date, eval.evaluator))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Performance review completed for {emp_name}: Rating {eval.rating}/5"))
        conn.commit()

        return {"message": "Performance review submitted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/employees/{employee_id}/tasks")
def get_employee_tasks(employee_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_tasks WHERE employee_id = %s ORDER BY due_date ASC", (employee_id,))
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/employees/{employee_id}/tasks")
def assign_task(employee_id: int, task: TaskCreate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "INSERT INTO employee_tasks (employee_id, title, description, due_date, status) VALUES (%s, %s, %s, %s, 'Pending')"
        cursor.execute(sql, (employee_id, task.title, task.description, task.due_date))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (employee_id,))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (employee_id, f"Task '{task.title}' assigned to {emp_name}"))
        conn.commit()

        return {"message": "Task assigned successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/employees/tasks/{task_id}")
def update_task_status(task_id: int, update: TaskStatusUpdate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM employee_tasks WHERE task_id = %s", (task_id,))
        task = cursor.fetchone()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        cursor.execute("UPDATE employee_tasks SET status = %s WHERE task_id = %s", (update.status, task_id))
        conn.commit()

        # Log notification
        cursor.execute("SELECT full_name FROM employees WHERE employee_id = %s", (task["employee_id"],))
        emp = cursor.fetchone()
        emp_name = emp["full_name"] if emp else "Unknown"
        cursor.execute("""
            INSERT INTO employee_notifications (employee_id, message)
            VALUES (%s, %s)
        """, (task["employee_id"], f"Task '{task['title']}' for {emp_name} is now {update.status}"))
        conn.commit()

        return {"message": "Task status updated successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()


# Mount static files for the frontend
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

