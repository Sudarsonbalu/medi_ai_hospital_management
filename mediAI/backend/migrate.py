import mysql.connector
import sys
import os

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection
from auth import hash_password

import time

def run_migrations():
    print("Connecting to database...")
    max_retries = 15
    retry_delay = 3
    conn = None
    for i in range(max_retries):
        try:
            conn = get_db_connection()
            break
        except mysql.connector.Error as err:
            print(f"Database connection attempt {i+1}/{max_retries} failed: {err}")
            if i < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Could not connect to database after maximum retries. Exiting.")
                sys.exit(1)
                
    cursor = conn.cursor()
    
    # Create patients table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        patient_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100),
        age INT,
        gender VARCHAR(10),
        disease VARCHAR(100)
    );
    """)
    print("Patients table checked/created.")

    # Create doctors table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        doctor_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100),
        specialization VARCHAR(100),
        department VARCHAR(100),
        availability VARCHAR(50) DEFAULT 'Available'
    );
    """)
    print("Doctors table checked/created.")

    # Create appointments table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        appointment_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_id INT,
        doctor_id INT,
        appointment_date DATE,
        status VARCHAR(50) DEFAULT 'Booked'
    );
    """)
    print("Appointments table checked/created.")

    # Create users table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        role VARCHAR(50) DEFAULT 'Patient'
    );
    """)
    print("Users table checked/created.")
    
    # Create laboratory_tests table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS laboratory_tests (
        test_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_name VARCHAR(100),
        test_type VARCHAR(100),
        test_date DATE,
        status VARCHAR(50) DEFAULT 'Pending'
    );
    """)
    print("Laboratory tests table checked/created.")

    # Create pharmacy_inventory table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pharmacy_inventory (
        medicine_id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100),
        quantity INT,
        price DECIMAL(10, 2)
    );
    """)
    print("Pharmacy inventory table checked/created.")

    # Create chatbot_logs table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chatbot_logs (
        log_id INT PRIMARY KEY AUTO_INCREMENT,
        user_message TEXT,
        bot_response TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Chatbot logs table checked/created.")

    # Create emergency_cases table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emergency_cases (
        emergency_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_name VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        symptoms TEXT,
        assigned_doctor_id INT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Emergency cases table checked/created.")

    # Apply column upgrades for admin panel
    print("Upgrading database schema for Super Admin features...")
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'Active'")
        print("users status column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        print("users created_at column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL")
        print("users last_login column added.")
    except mysql.connector.Error:
        pass

    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN medical_history TEXT NULL")
        print("patients medical_history column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        print("patients created_at column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN gender VARCHAR(10) DEFAULT 'Other'")
        print("patients gender column added.")
    except mysql.connector.Error:
        pass

    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN schedule VARCHAR(255) DEFAULT 'Mon-Fri 9:00 AM - 5:00 PM'")
        print("doctors schedule column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        print("doctors created_at column added.")
    except mysql.connector.Error:
        pass

    try:
        cursor.execute("ALTER TABLE laboratory_tests ADD COLUMN report_file VARCHAR(255) NULL")
        print("laboratory_tests report_file column added.")
    except mysql.connector.Error:
        pass

    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN user_id INT NULL UNIQUE")
        print("patients user_id column added.")
    except mysql.connector.Error:
        pass

    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN user_id INT NULL UNIQUE")
        print("doctors user_id column added.")
    except mysql.connector.Error:
        pass

    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN phone_number VARCHAR(20) NULL")
        print("patients phone_number column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN address TEXT NULL")
        print("patients address column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN emergency_contact VARCHAR(100) NULL")
        print("patients emergency_contact column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN profile_pic VARCHAR(255) NULL")
        print("patients profile_pic column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN latitude DECIMAL(10, 8) NULL")
        print("patients latitude column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN longitude DECIMAL(11, 8) NULL")
        print("patients longitude column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE emergency_cases ADD COLUMN latitude DECIMAL(10, 8) NULL")
        print("emergency_cases latitude column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE emergency_cases ADD COLUMN longitude DECIMAL(11, 8) NULL")
        print("emergency_cases longitude column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE chatbot_logs ADD COLUMN user_id INT NULL")
        print("chatbot_logs user_id column added.")
    except mysql.connector.Error:
        pass
    try:
        cursor.execute("ALTER TABLE appointments ADD COLUMN created_by_user_id INT NULL")
        print("appointments created_by_user_id column added.")
    except mysql.connector.Error:
        pass

    # Link existing patient/doctor records to users when name is unique per role
    try:
        cursor.execute("""
            UPDATE patients p
            INNER JOIN (
                SELECT u.user_id, u.name
                FROM users u
                WHERE LOWER(u.role) = 'patient'
                GROUP BY u.name
                HAVING COUNT(*) = 1
            ) u ON u.name = p.name
            SET p.user_id = u.user_id
            WHERE p.user_id IS NULL
        """)
        cursor.execute("""
            UPDATE doctors d
            INNER JOIN (
                SELECT u.user_id, u.name
                FROM users u
                WHERE LOWER(u.role) = 'doctor'
                GROUP BY u.name
                HAVING COUNT(*) = 1
            ) u ON u.name = d.name
            SET d.user_id = u.user_id
            WHERE d.user_id IS NULL
        """)
        print("Backfilled user_id links for patients/doctors.")
    except mysql.connector.Error as err:
        print(f"user_id backfill skipped: {err}")

    # Create new tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_name VARCHAR(100),
        doctor_name VARCHAR(100),
        medicine_name VARCHAR(100),
        dosage VARCHAR(100),
        frequency VARCHAR(100),
        prescribed_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Prescriptions table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medical_records (
        record_id INT PRIMARY KEY AUTO_INCREMENT,
        patient_id INT,
        record_type VARCHAR(100),
        description VARCHAR(255),
        file_path VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Medical records table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        message TEXT,
        type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Notifications table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        log_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NULL,
        username VARCHAR(100),
        role VARCHAR(50),
        action VARCHAR(255),
        ip_address VARCHAR(50) NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Activity logs table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        setting_id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) UNIQUE,
        setting_value TEXT
    );
    """)
    print("Settings table checked/created.")

    # Seed default settings if empty
    cursor.execute("SELECT COUNT(*) FROM settings")
    default_key = os.getenv("GEMINI_API_KEY", "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")
    if cursor.fetchone()[0] == 0:
        default_settings = [
            ("hospital_name", "MediAI General Hospital"),
            ("system_email", "admin@mediai.org"),
            ("ai_enabled", "true"),
            ("gemini_api_key", default_key),
            ("backup_frequency", "Daily")
        ]
        cursor.executemany(
            "INSERT INTO settings (setting_key, setting_value) VALUES (%s, %s)",
            default_settings
        )
        print("Seeded default settings.")
    else:
        # If settings table exists but gemini_api_key is empty/missing, update/insert it
        cursor.execute("SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key'")
        row = cursor.fetchone()
        if not row:
            cursor.execute(
                "INSERT INTO settings (setting_key, setting_value) VALUES ('gemini_api_key', %s)",
                (default_key,)
            )
            print("Inserted default gemini_api_key.")
        elif not row[0]:
            cursor.execute(
                "UPDATE settings SET setting_value = %s WHERE setting_key = 'gemini_api_key'",
                (default_key,)
            )
            print("Updated empty gemini_api_key with default key.")

    # Make sure we have an Admin account by default
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'Admin'")
    if cursor.fetchone()[0] == 0:
        admin_pwd = hash_password("admin123")
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            ("Admin User", "admin@mediai.com", admin_pwd, "Admin")
        )
        print("Created default Admin user (admin@mediai.com / admin123).")

    # Make sure we have a Patient account by default
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'Patient'")
    if cursor.fetchone()[0] == 0:
        patient_pwd = hash_password("patient123")
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            ("John Doe", "patient@mediai.com", patient_pwd, "Patient")
        )
        patient_uid = cursor.lastrowid
        cursor.execute(
            "INSERT INTO patients (name, age, gender, disease, user_id) VALUES (%s, %s, %s, %s, %s)",
            ("John Doe", 35, "Male", "None", patient_uid)
        )
        print("Created default Patient user (patient@mediai.com / patient123).")

    # Make sure we have a Doctor account by default
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'Doctor'")
    if cursor.fetchone()[0] == 0:
        doctor_pwd = hash_password("doctor123")
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            ("Dr. Jane Smith", "doctor@mediai.com", doctor_pwd, "Doctor")
        )
        doctor_uid = cursor.lastrowid
        cursor.execute(
            "INSERT INTO doctors (name, specialization, department, availability, schedule, user_id) VALUES (%s, %s, %s, %s, %s, %s)",
            ("Dr. Jane Smith", "Cardiology", "Cardiology Clinic", "Available", "Mon-Fri 9:00 AM - 5:00 PM", doctor_uid)
        )
        print("Created default Doctor user (doctor@mediai.com / doctor123).")

    # Create employee module tables
    print("Creating employee module tables...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        employee_id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        profile_photo VARCHAR(255) NULL,
        gender VARCHAR(10) NULL,
        dob DATE NULL,
        phone VARCHAR(20) NULL,
        email VARCHAR(100) UNIQUE NULL,
        address TEXT NULL,
        department VARCHAR(100) NULL,
        designation VARCHAR(100) NULL,
        role VARCHAR(100) NULL,
        joining_date DATE NULL,
        qualification VARCHAR(100) NULL,
        experience VARCHAR(100) NULL,
        salary DECIMAL(10, 2) DEFAULT 0.0,
        blood_group VARCHAR(10) NULL,
        emergency_contact VARCHAR(100) NULL,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Employees table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_attendance (
        attendance_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        date DATE NOT NULL,
        check_in VARCHAR(20) NULL,
        check_out VARCHAR(20) NULL,
        status VARCHAR(20) DEFAULT 'Present'
    );
    """)
    print("Employee attendance table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_leaves (
        leave_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NULL,
        status VARCHAR(20) DEFAULT 'Pending'
    );
    """)
    print("Employee leaves table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_shifts (
        shift_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        shift_name VARCHAR(50) NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        day_of_week VARCHAR(50) NOT NULL
    );
    """)
    print("Employee shifts table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_payroll (
        payroll_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        month VARCHAR(20) NOT NULL,
        year INT NOT NULL,
        basic_salary DECIMAL(10,2) DEFAULT 0.0,
        allowances DECIMAL(10,2) DEFAULT 0.0,
        deductions DECIMAL(10,2) DEFAULT 0.0,
        net_salary DECIMAL(10,2) DEFAULT 0.0,
        status VARCHAR(20) DEFAULT 'Unpaid',
        payment_date DATE NULL
    );
    """)
    print("Employee payroll table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_performance (
        performance_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        rating INT DEFAULT 5,
        feedback TEXT NULL,
        evaluation_date DATE NOT NULL,
        evaluator VARCHAR(100) NULL
    );
    """)
    print("Employee performance table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_tasks (
        task_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Pending'
    );
    """)
    print("Employee tasks table checked/created.")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employee_notifications (
        notification_id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    print("Employee notifications table checked/created.")

    # Seed default employees if empty
    cursor.execute("SELECT COUNT(*) FROM employees")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO employees (full_name, email, department, designation, role, salary, status)
        VALUES ('Sarah Connor', 'sarah@mediai.com', 'Nursing', 'Head Nurse', 'Nurse', 45000.0, 'Active')
        """)
        cursor.execute("""
        INSERT INTO employees (full_name, email, department, designation, role, salary, status)
        VALUES ('Michael Scott', 'michael@mediai.com', 'Administration', 'HR Manager', 'HR Manager', 55000.0, 'Active')
        """)
        print("Seeded default employees.")

    conn.commit()
    cursor.close()
    conn.close()
    print("All migrations completed successfully!")

if __name__ == "__main__":
    run_migrations()
