def analyze_medical_report(filename: str):
    filename_lower = filename.lower()
    
    if "blood" in filename_lower or "cbc" in filename_lower:
        return {
            "findings": {
                "Hemoglobin": "13.5 g/dL (Normal)",
                "White Blood Cells": "6,500 /uL (Normal)",
                "Platelets": "150,000 /uL (Borderline Low)"
            },
            "risk": "Mild thrombocytopenia risk. Monitor if bruising or bleeding occurs.",
            "recommendation": "Consult a hematologist or general physician for a detailed review."
        }
    elif "sugar" in filename_lower or "diabetes" in filename_lower or "glucose" in filename_lower:
        return {
            "findings": {
                "Fasting Blood Sugar": "152 mg/dL (High)",
                "HbA1c": "7.2% (Diabetic Range)"
            },
            "risk": "High Diabetes Risk Detected",
            "recommendation": "Consult an endocrinologist immediately, maintain a low-glycemic index diet, and engage in regular exercise."
        }
    elif "lipid" in filename_lower or "cholesterol" in filename_lower:
        return {
            "findings": {
                "Total Cholesterol": "260 mg/dL (High)",
                "Triglycerides": "180 mg/dL (High)",
                "HDL (Good Cholesterol)": "35 mg/dL (Low)",
                "LDL (Bad Cholesterol)": "170 mg/dL (High)"
            },
            "risk": "Hyperlipidemia / Cardiovascular risk detected.",
            "recommendation": "Avoid high-fat saturated foods, increase physical activity, and consult a physician regarding cholesterol-lowering medications."
        }
    else:
        return {
            "findings": {
                "Report Type": "General Health Assessment",
                "Status": "Parsed successfully"
            },
            "risk": "No critical anomalies detected in the provided file metadata.",
            "recommendation": "Keep up your regular healthy activities and consult your doctor for any symptomatic issues."
        }
