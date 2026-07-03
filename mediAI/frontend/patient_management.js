const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", fetchPatients);

async function fetchPatients() {
    try {
        const response = await apiFetch(`/patients`);
        const patients = await response.json();
        
        const table = document.getElementById("patientTable");
        
        // Clear all rows except the header
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
        
        patients.forEach(patient => {
            const row = table.insertRow();
            row.insertCell(0).innerHTML = patient.name;
            row.insertCell(1).innerHTML = patient.age;
            row.insertCell(2).innerHTML = patient.disease;
            
            // Actions
            const actionsCell = row.insertCell(3);
            actionsCell.innerHTML = `
                <button class="action-btn btn-edit" onclick="openEditModal(${patient.patient_id}, '${patient.name.replace(/'/g, "\\'")}', ${patient.age}, '${patient.disease.replace(/'/g, "\\'")}')">Edit</button>
                <button class="action-btn btn-delete" onclick="deletePatient(${patient.patient_id})">Delete</button>
            `;
        });
    } catch (error) {
        console.error("Error fetching patients:", error);
    }
}

function openEditModal(id, name, age, disease) {
    document.getElementById("editPatientId").value = id;
    document.getElementById("editPatientName").value = name;
    document.getElementById("editPatientAge").value = age;
    document.getElementById("editPatientDisease").value = disease;
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function savePatientEdit() {
    const id = document.getElementById("editPatientId").value;
    const name = document.getElementById("editPatientName").value.trim();
    const age = parseInt(document.getElementById("editPatientAge").value);
    const disease = document.getElementById("editPatientDisease").value.trim();

    if (!name || isNaN(age) || !disease) {
        showToast("Please fill all fields", true);
        return;
    }

    try {
        const response = await apiFetch(`/patients/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name, age, gender: "Other", disease })
        });

        if (response.ok) {
            showToast("Patient Updated Successfully", false);
            closeEditModal();
            fetchPatients();
        } else {
            showToast("Error updating patient profile", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function deletePatient(id) {
    if (!confirm("Are you sure you want to delete this patient record?")) return;

    try {
        const response = await apiFetch(`/patients/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Patient Deleted Successfully", false);
            fetchPatients();
        } else {
            showToast("Error deleting patient profile", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function addPatient() {
    const name = document.getElementById("patientName").value;
    const age = parseInt(document.getElementById("patientAge").value);
    const disease = document.getElementById("patientDisease").value;
    
    if (!name || isNaN(age) || !disease) {
        showToast("Please fill all fields", true);
        return;
    }
    
    try {
        const response = await apiFetch(`/patients`, {
            method: "POST",
            body: JSON.stringify({ name, age, gender: "Other", disease })
        });
        
        if (response.ok) {
            showToast("Patient Added Successfully", false);
            document.getElementById("patientName").value = "";
            document.getElementById("patientAge").value = "";
            document.getElementById("patientDisease").value = "";
            fetchPatients();
        } else {
            const errData = await response.json();
            showToast("Error adding patient: " + (errData.detail || "Unknown error"), true);
        }
    } catch (error) {
        console.error("Error adding patient:", error);
        showToast("Failed to connect to backend server.", true);
    }
}

function showToast(message, isError = false) {
    let toast = document.createElement("div");
    toast.innerText = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.padding = "12px 24px";
    toast.style.background = isError ? "#ff4d4d" : "#2ecc71";
    toast.style.color = "white";
    toast.style.borderRadius = "4px";
    toast.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
    toast.style.zIndex = "10000";
    toast.style.fontWeight = "bold";
    toast.style.fontFamily = "system-ui, sans-serif";
    toast.style.transition = "opacity 0.5s ease";
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}
