const API_URL = window.API_URL || "http://127.0.0.1:8002";

const userStr = localStorage.getItem("user");
const user = userStr ? JSON.parse(userStr) : null;
const isAdmin = user && user.role && user.role.toLowerCase() === "admin";

document.addEventListener("DOMContentLoaded", () => {
    fetchDoctors();
    
    if (!isAdmin) {
        const formBox = document.querySelector(".form-box");
        if (formBox) formBox.style.display = "none";
        
        // Hide Actions header
        const table = document.getElementById("doctorTable");
        if (table && table.rows[0]) {
            const headerRow = table.rows[0];
            if (headerRow.cells[4]) {
                headerRow.cells[4].style.display = "none";
            }
        }
    }
});

async function fetchDoctors() {
    try {
        const response = await apiFetch(`/doctors`);
        const doctors = await response.json();
        
        const table = document.getElementById("doctorTable");
        
        // Clear all rows except the header
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
        
        doctors.forEach(doctor => {
            const row = table.insertRow();
            row.insertCell(0).innerHTML = doctor.name;
            row.insertCell(1).innerHTML = doctor.specialization;
            row.insertCell(2).innerHTML = doctor.department;
            row.insertCell(3).innerHTML = doctor.availability;
            
            // Actions (only for Admin)
            if (isAdmin) {
                const actionsCell = row.insertCell(4);
                actionsCell.innerHTML = `
                    <button class="action-btn btn-edit" onclick="openEditModal(${doctor.doctor_id}, '${doctor.name.replace(/'/g, "\\'")}', '${doctor.specialization.replace(/'/g, "\\'")}', '${doctor.department.replace(/'/g, "\\'")}', '${doctor.availability}')">Edit</button>
                    <button class="action-btn btn-delete" onclick="deleteDoctor(${doctor.doctor_id})">Delete</button>
                `;
            }
        });
    } catch (error) {
        console.error("Error fetching doctors:", error);
    }
}

function openEditModal(id, name, specialization, department, availability) {
    document.getElementById("editDoctorId").value = id;
    document.getElementById("editDoctorName").value = name;
    document.getElementById("editSpecialization").value = specialization;
    document.getElementById("editDepartment").value = department;
    document.getElementById("editAvailability").value = availability;
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function saveDoctorEdit() {
    const id = document.getElementById("editDoctorId").value;
    const name = document.getElementById("editDoctorName").value.trim();
    const specialization = document.getElementById("editSpecialization").value.trim();
    const department = document.getElementById("editDepartment").value.trim();
    const availability = document.getElementById("editAvailability").value;

    if (!name || !specialization || !department) {
        showToast("Please fill all fields", true);
        return;
    }

    try {
        const response = await apiFetch(`/doctors/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name, specialization, department, availability })
        });

        if (response.ok) {
            showToast("Doctor Profile Updated Successfully", false);
            closeEditModal();
            fetchDoctors();
        } else {
            showToast("Error updating doctor profile", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function deleteDoctor(id) {
    if (!confirm("Are you sure you want to delete this doctor profile?")) return;

    try {
        const response = await apiFetch(`/doctors/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Doctor Profile Deleted Successfully", false);
            fetchDoctors();
        } else {
            showToast("Error deleting doctor profile", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function addDoctor() {
    const name = document.getElementById("doctorName").value;
    const specialization = document.getElementById("specialization").value;
    const department = document.getElementById("department").value;
    const availability = document.getElementById("availability").value;
    
    if (name === "" || specialization === "" || department === "") {
        showToast("Please fill all fields", true);
        return;
    }
    
    try {
        const response = await apiFetch(`/doctors`, {
            method: "POST",
            body: JSON.stringify({ name, specialization, department, availability })
        });
        
        if (response.ok) {
            showToast("Doctor Added Successfully", false);
            document.getElementById("doctorName").value = "";
            document.getElementById("specialization").value = "";
            document.getElementById("department").value = "";
            fetchDoctors();
        } else {
            const errData = await response.json();
            showToast("Error adding doctor: " + (errData.detail || "Unknown error"), true);
        }
    } catch (error) {
        console.error("Error adding doctor:", error);
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
