const API_URL = window.API_URL || "http://127.0.0.1:8002";

async function predictDisease() {
    const age = parseInt(document.getElementById("age").value);
    const bp = parseInt(document.getElementById("bloodPressure").value);
    const glucose = parseInt(document.getElementById("glucoseLevel").value);
    const chol = parseInt(document.getElementById("cholesterol").value);
    const symptom = document.getElementById("symptom").value;
    const resultDiv = document.getElementById("result");
    
    if (isNaN(age) || isNaN(bp) || isNaN(glucose) || isNaN(chol) || symptom === "") {
        resultDiv.innerHTML = "<span style='color: #ff4d4d; font-weight: 500;'>Please fill all fields with valid numbers</span>";
        return;
    }
    
    resultDiv.innerHTML = "<h4>Analyzing parameters...</h4>";
    
    try {
        const response = await apiFetch(`/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                age: age,
                blood_pressure: bp,
                glucose_level: glucose,
                cholesterol: chol,
                symptom: symptom
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            resultDiv.innerHTML = `
                <h3>Prediction Result</h3>
                <p><strong>Possible Condition:</strong> ${data.disease}</p>
                <p><strong>Risk Score:</strong> ${data.score}</p>
                <p><strong>Recommendation:</strong> ${data.recommendation}</p>
            `;
        } else {
            const err = await response.json();
            resultDiv.innerHTML = `Error: ${err.detail || "Unable to retrieve prediction"}`;
        }
    } catch (error) {
        console.error("Error calling predict endpoint:", error);
        resultDiv.innerHTML = "Failed to connect to AI engine.";
    }
}
