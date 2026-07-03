def predict_disease_risk(age: int, bp: int, glucose: int, chol: int, symptom: str):
    risks = []
    
    # Diabetes risk
    if glucose > 140:
        risks.append(("Diabetes", 85, "High glucose detected. Please perform an HbA1c test and consult an endocrinologist."))
    elif glucose > 100:
        risks.append(("Pre-Diabetes", 55, "Borderline glucose level. Maintain a balanced diet, reduce sugar, and check glucose levels regularly."))
        
    # Hypertension risk
    if bp > 140:
        risks.append(("Hypertension (High Blood Pressure)", 80, "Elevated blood pressure. Reduce sodium intake, manage stress, and consult a cardiologist."))
    elif bp > 120:
        risks.append(("Pre-Hypertension", 50, "Slightly elevated blood pressure. Monitor regularly and maintain a healthy lifestyle."))
        
    # Hypercholesterolemia risk
    if chol > 240:
        risks.append(("Hypercholesterolemia (High Cholesterol)", 75, "High cholesterol levels detected. Avoid saturated fats, perform a lipid profile, and consult a physician."))
    elif chol > 200:
        risks.append(("Borderline High Cholesterol", 45, "Cholesterol is slightly elevated. Incorporate more fiber and exercise into your routine."))

    # Symptom based risk
    symptom_lower = symptom.lower()
    if "chest pain" in symptom_lower:
        risks.append(("Angina / Heart Disease Risk", 70, "Chest pain reported. This requires immediate medical attention from a cardiologist."))
    elif "cough" in symptom_lower or "fever" in symptom_lower:
        risks.append(("Respiratory Infection", 60, "Fever or cough indicated. Rest, stay hydrated, and take fever reducers if necessary."))
        
    # If no high risk detected
    if not risks:
        return {
            "disease": "No immediate disease risk detected",
            "score": "Normal range",
            "recommendation": "Maintain a healthy lifestyle and schedule regular annual checkups.",
            "specialist": "General Physician"
        }
        
    # Pick the one with the highest risk score
    risks.sort(key=lambda x: x[1], reverse=True)
    highest_risk = risks[0]
    disease_name = highest_risk[0]
    
    # Map specialist
    specialist = "General Physician"
    if "diabetes" in disease_name.lower():
        specialist = "Endocrinologist"
    elif "hypertension" in disease_name.lower() or "angina" in disease_name.lower() or "heart" in disease_name.lower():
        specialist = "Cardiologist"
    elif "respiratory" in disease_name.lower() or "infection" in disease_name.lower():
        specialist = "Pulmonologist"
    elif "cholesterol" in disease_name.lower():
        specialist = "Cardiologist / General Physician"
        
    return {
        "disease": disease_name,
        "score": f"{highest_risk[1]}%",
        "recommendation": highest_risk[2],
        "specialist": specialist
    }
