-- MediAI Database Dump --
SET FOREIGN_KEY_CHECKS=0;

-- Drop and Create Table: appointments --
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `appointment_id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_id` int(11) DEFAULT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `appointment_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Booked',
  PRIMARY KEY (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Drop and Create Table: chatbot_logs --
DROP TABLE IF EXISTS `chatbot_logs`;
CREATE TABLE `chatbot_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_message` text DEFAULT NULL,
  `bot_response` text DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for Table: chatbot_logs --
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (1, 'hi', 'I am standard chatbot response. The chatbot service model is being initialized.', '2026-06-15 12:59:39');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (2, 'fever', 'I am standard chatbot response. The chatbot service model is being initialized.', '2026-06-15 12:59:51');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (3, 'fever,headache', 'I am standard chatbot response. The chatbot service model is being initialized.', '2026-06-15 13:40:03');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (4, 'hii', 'I am standard chatbot response. The chatbot service model is being initialized.', '2026-06-15 14:00:23');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (5, 'fever', 'I am standard chatbot response. The chatbot service model is being initialized.', '2026-06-15 16:42:07');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (6, 'iam fever', 'I am standard chatbot response. The chatbot service model is being initialized.', '2026-06-15 16:42:28');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (7, 'cough', 'It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.

(Note: Gemini API key is not configured. Falling back to rule-based answers. Set GEMINI_API_KEY in the backend/.env file to activate Gemini AI Assistant.)', '2026-06-15 16:45:26');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (8, 'cough', 'It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.

(Note: Gemini API key is not configured. Falling back to rule-based answers. Set GEMINI_API_KEY in the backend/.env file to activate Gemini AI Assistant.)', '2026-06-15 17:01:42');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (9, 'fever', 'It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.

(Note: Gemini API key is not configured. Falling back to rule-based answers. Set GEMINI_API_KEY in the backend/.env file to activate Gemini AI Assistant.)', '2026-06-15 17:02:14');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (10, 'chest pain', 'Chest pain can be a sign of a serious medical emergency. Please seek immediate emergency medical care.

(Note: Gemini API key is not configured. Falling back to rule-based answers. Set GEMINI_API_KEY in the backend/.env file to activate Gemini AI Assistant.)', '2026-06-15 17:04:39');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (11, 'cough', 'Error contacting Gemini API: HTTP Error 404: Not Found

(Fallback to offline system): It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.', '2026-06-15 22:48:43');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (12, 'hi', 'Error contacting Gemini API: HTTP Error 404: Not Found

(Fallback to offline system): Thank you for describing your symptoms. I recommend using the Disease Prediction module or scheduling an appointment with one of our specialized doctors for a professional diagnosis.', '2026-06-15 22:51:44');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (13, 'fever', 'Error contacting Gemini API: HTTP Error 404: Not Found

(Fallback to offline system): It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.', '2026-06-15 22:52:00');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (14, 'cough', 'Error contacting Gemini API: HTTP Error 404: Not Found

(Fallback to offline system): It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.', '2026-06-15 22:52:17');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (15, 'cough', 'Error contacting Gemini API: HTTP Error 404: Not Found

(Fallback to offline system): It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.', '2026-06-15 22:53:50');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (16, 'cough', 'Error contacting Gemini API: HTTP Error 404: Not Found

(Fallback to offline system): It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist.', '2026-06-15 22:55:37');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (17, 'cough', 'Hello! A cough can be a symptom of many different conditions. To help me understand better, could you please tell me:

*   How long have you had the cough?
*   Is it dry or do you bring up phlegm? If phlegm, what color is it?
*   Are you experiencing any other symptoms, such as fever, sore throat, shortness of breath, or chest pain?

Knowing a little more will help me provide more relevant information.

***

*Please remember, this guidance is for informational purposes only and does not replace a professional clinical diagnosis.*', '2026-06-15 23:00:26');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (18, 'hi', 'Hello! I\'m MediAI Assistant, and I\'m here to help you. How can I assist you today?

*Please remember, my guidance is for informational purposes only and does not replace a professional clinical diagnosis.*', '2026-06-15 23:01:34');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (19, 'i have heavy fever', 'I\'m sorry to hear you\'re experiencing a heavy fever. It\'s important to monitor your temperature and any other symptoms you might have.

Here are a few general recommendations:
*   **Rest:** Get plenty of rest to help your body recover.
*   **Hydrate:** Drink plenty of fluids like water, clear broths, or electrolyte solutions to prevent dehydration.
*   **Over-the-counter medication:** If appropriate, you could consider fever-reducing medications like paracetamol or ibuprofen, following dosage instructions carefully.

If your fever is very high, persistent, or accompanied by other concerning symptoms such as severe headache, difficulty breathing, rash, or confusion, please seek immediate medical attention. A healthcare professional can accurately diagnose the cause and recommend the best course of action.

Please remember, this guidance is for informational purposes only and does not replace a professional clinical diagnosis.', '2026-06-15 23:02:08');
INSERT INTO `chatbot_logs` (`log_id`, `user_message`, `bot_response`, `timestamp`) VALUES (20, 'cough', 'A cough can be quite bothersome and is a common symptom with various potential causes. To help me understand better, could you please tell me more about it?

*   How long have you had the cough?
*   Is it dry or productive (with phlegm)? If productive, what color is the phlegm?
*   Are you experiencing any other symptoms, such as fever, sore throat, shortness of breath, or chest pain?
*   Are there any specific times or situations when it gets worse?

Knowing these details will help me provide more relevant information.

***

*Disclaimer: This guidance is for informational purposes only and does not replace a professional clinical diagnosis.*', '2026-06-15 23:12:39');

-- Drop and Create Table: doctors --
DROP TABLE IF EXISTS `doctors`;
CREATE TABLE `doctors` (
  `doctor_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `availability` varchar(50) DEFAULT 'Available',
  PRIMARY KEY (`doctor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for Table: doctors --
INSERT INTO `doctors` (`doctor_id`, `name`, `specialization`, `department`, `availability`) VALUES (1, 'Sudarson B', 'General Medicine', 'Outpatient', 'Available');

-- Drop and Create Table: emergency_cases --
DROP TABLE IF EXISTS `emergency_cases`;
CREATE TABLE `emergency_cases` (
  `emergency_id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_name` varchar(100) NOT NULL,
  `severity` varchar(50) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `symptoms` text DEFAULT NULL,
  `assigned_doctor_id` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`emergency_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for Table: emergency_cases --
INSERT INTO `emergency_cases` (`emergency_id`, `patient_name`, `severity`, `contact_phone`, `symptoms`, `assigned_doctor_id`, `status`, `created_at`) VALUES (1, 'sukesh', 'High', '9597846004', 'heart attack', 1, 'Resolved', '2026-06-15 15:26:06');
INSERT INTO `emergency_cases` (`emergency_id`, `patient_name`, `severity`, `contact_phone`, `symptoms`, `assigned_doctor_id`, `status`, `created_at`) VALUES (2, 'sudhan', 'Moderate', '9500184541', 'fever', 1, 'Resolved', '2026-06-15 15:29:51');

-- Drop and Create Table: laboratory_tests --
DROP TABLE IF EXISTS `laboratory_tests`;
CREATE TABLE `laboratory_tests` (
  `test_id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_name` varchar(100) DEFAULT NULL,
  `test_type` varchar(100) DEFAULT NULL,
  `test_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  PRIMARY KEY (`test_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for Table: laboratory_tests --
INSERT INTO `laboratory_tests` (`test_id`, `patient_name`, `test_type`, `test_date`, `status`) VALUES (1, 'priyaa', 'CT Scan', '2026-06-15', 'Pending');

-- Drop and Create Table: patients --
DROP TABLE IF EXISTS `patients`;
CREATE TABLE `patients` (
  `patient_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `age` int(3) NOT NULL,
  `disease` varchar(100) NOT NULL,
  PRIMARY KEY (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Drop and Create Table: pharmacy_inventory --
DROP TABLE IF EXISTS `pharmacy_inventory`;
CREATE TABLE `pharmacy_inventory` (
  `medicine_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`medicine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Drop and Create Table: users --
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT 'Patient',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for Table: users --
INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `role`) VALUES (1, 'Sudarson B', 'sudarsonbalu@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Doctor');
INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `role`) VALUES (2, 'System Admin', 'admin@mediai.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin');
INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `role`) VALUES (3, 'babloo', 'sudarsonvsb@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Patient');
INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `role`) VALUES (4, 'sukesh', 'babloo1204@gmail.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'Patient');
INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `role`) VALUES (5, 'sukesh', 'sukeshvsb@gmail.com', 'd76d8f0c3e9b7cecbd37eaf0581879e2c11aa1f7cd81edc7e830705af1991991', 'Patient');

SET FOREIGN_KEY_CHECKS=1;
