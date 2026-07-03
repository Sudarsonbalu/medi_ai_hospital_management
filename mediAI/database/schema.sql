CREATE TABLE patients (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL UNIQUE,
    name VARCHAR(100),
    age INT,
    gender VARCHAR(10),
    disease VARCHAR(100),
    medical_history TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    doctor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL UNIQUE,
    name VARCHAR(100),
    specialization VARCHAR(100),
    department VARCHAR(100),
    availability VARCHAR(50) DEFAULT 'Available',
    schedule VARCHAR(255) DEFAULT 'Mon-Fri 9:00 AM - 5:00 PM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    appointment_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT,
    doctor_id INT,
    appointment_date DATE,
    status VARCHAR(50) DEFAULT 'Booked'
);

CREATE TABLE laboratory_tests (
    test_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_name VARCHAR(100),
    test_type VARCHAR(100),
    test_date DATE,
    status VARCHAR(50) DEFAULT 'Pending',
    report_file VARCHAR(255) NULL
);

CREATE TABLE pharmacy_inventory (
    medicine_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    quantity INT,
    price DECIMAL(10, 2)
);

CREATE TABLE chatbot_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_message TEXT,
    bot_response TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Patient',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

CREATE TABLE emergency_cases (
    emergency_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_name VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    symptoms TEXT,
    assigned_doctor_id INT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescriptions (
    prescription_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_name VARCHAR(100),
    doctor_name VARCHAR(100),
    medicine_name VARCHAR(100),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    prescribed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    username VARCHAR(100),
    role VARCHAR(50),
    action VARCHAR(255),
    ip_address VARCHAR(50) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE,
    setting_value TEXT
);