const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", fetchTests);

async function fetchTests() {
    try {
        const response = await apiFetch(`/tests`);
        const tests = await response.json();
        
        const table = document.getElementById("labTable");
        
        // Clear all rows except the header
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
        
        tests.forEach(test => {
            const row = table.insertRow();
            row.insertCell(0).innerHTML = test.patient_name;
            row.insertCell(1).innerHTML = test.test_type;
            
            // Format Date cleanly
            const dateStr = new Date(test.test_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            row.insertCell(2).innerHTML = dateStr;
            row.insertCell(3).innerHTML = test.status;
            
            // Actions
            const actionsCell = row.insertCell(4);
            actionsCell.innerHTML = `
                <button class="action-btn btn-edit" onclick="openEditModal(${test.test_id}, '${test.patient_name.replace(/'/g, "\\'")}', '${test.test_type}', '${test.test_date}', '${test.status}')">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteTest(${test.test_id})">Delete</button>
            `;
        });
    } catch (error) {
        console.error("Error fetching tests:", error);
    }
}

function openEditModal(id, patientName, testType, testDate, status) {
    document.getElementById("editTestId").value = id;
    document.getElementById("editPatientName").value = patientName;
    document.getElementById("editTestType").value = testType;
    
    // Format date value correctly to YYYY-MM-DD
    const dateFormatted = testDate.split('T')[0];
    document.getElementById("editTestDate").value = dateFormatted;
    
    document.getElementById("editTestStatus").value = status;
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function saveTestEdit() {
    const id = document.getElementById("editTestId").value;
    const patientName = document.getElementById("editPatientName").value.trim();
    const testType = document.getElementById("editTestType").value;
    const testDate = document.getElementById("editTestDate").value;
    const status = document.getElementById("editTestStatus").value;

    if (!patientName || !testDate) {
        showToast("Please fill all fields", true);
        return;
    }

    try {
        const response = await apiFetch(`/tests/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ patient_name: patientName, test_type: testType, test_date: testDate, status })
        });

        if (response.ok) {
            showToast("Lab Test Record Updated Successfully", false);
            closeEditModal();
            fetchTests();
        } else {
            showToast("Error updating lab test record", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function deleteTest(id) {
    if (!confirm("Are you sure you want to delete this test?")) return;

    try {
        const response = await apiFetch(`/tests/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Lab Test Record Deleted Successfully", false);
            fetchTests();
        } else {
            showToast("Error deleting lab test record", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function addTest() {
    const patientName = document.getElementById("patientName").value;
    const testType = document.getElementById("testType").value;
    const date = document.getElementById("testDate").value;
    
    if (patientName === "" || date === "") {
        showToast("Please fill all fields", true);
        return;
    }
    
    try {
        const response = await apiFetch(`/tests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ patient_name: patientName, test_type: testType, test_date: date, status: "Pending" })
        });
        
        if (response.ok) {
            showToast("Laboratory Test Scheduled Successfully", false);
            document.getElementById("patientName").value = "";
            document.getElementById("testDate").value = "";
            fetchTests();
        } else {
            const errData = await response.json();
            showToast("Error scheduling test: " + (errData.detail || "Unknown error"), true);
        }
    } catch (error) {
        console.error("Error scheduling test:", error);
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
