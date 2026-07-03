const API_URL = window.API_URL || "http://127.0.0.1:8002";

const userStr = localStorage.getItem("user");
const user = userStr ? JSON.parse(userStr) : null;
const isPatient = user && user.role && user.role.toLowerCase() === "patient";

document.addEventListener("DOMContentLoaded", async () => {
    // If patient, pre-fill name field but keep it enabled for manual text entry
    const patientNameInput = document.getElementById("patientName");
    if (patientNameInput && isPatient && user.name) {
        patientNameInput.value = user.name;
        patientNameInput.disabled = false;
    }
    
    await Promise.all([loadDoctors(), fetchAppointments()]);
});

async function loadDoctors() {
    try {
        const response = await apiFetch(`/doctors`);
        const doctors = await response.json();
        
        const bookingSelect = document.getElementById("doctorSelect");
        const editSelect = document.getElementById("editDoctorSelect");
        
        // Clear except first option on booking select
        bookingSelect.innerHTML = '<option value="">Select Doctor</option>';
        editSelect.innerHTML = '';

        doctors.forEach(doctor => {
            const opt = document.createElement("option");
            opt.value = doctor.doctor_id;
            opt.textContent = `${doctor.name} - ${doctor.specialization} (${doctor.availability})`;
            bookingSelect.appendChild(opt);
            
            // Clone option for editing select
            const editOpt = opt.cloneNode(true);
            editSelect.appendChild(editOpt);
        });
    } catch (error) {
        console.error("Error loading doctors:", error);
    }
}

async function fetchAppointments() {
    try {
        const response = await apiFetch(`/appointments`);
        let appts = await response.json();
        const tbody = document.getElementById("appointmentsTableBody");
        tbody.innerHTML = "";

        // Backend already handles authorization and returns relevant appointments

        if (appts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: rgba(255,255,255,0.4); padding: 15px;">No scheduled appointments found.</td></tr>';
            return;
        }

        appts.forEach(appt => {
            const tr = document.createElement("tr");
            
            // Format Date cleanly
            const dateStr = new Date(appt.appointment_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            const isEditable = appt.status.toLowerCase() !== "cancelled" && appt.status.toLowerCase() !== "completed";
            const actionsHtml = `
                <td>
                    ${isEditable ? `<button class="action-btn btn-edit" onclick="openEditModal(${appt.appointment_id}, '${appt.patient_name.replace(/'/g, "\\'")}', '${(appt.patient_gender || 'Other').replace(/'/g, "\\'")}', ${appt.doctor_id || 0}, '${appt.appointment_date}', '${appt.status}')">${isPatient ? 'Reschedule' : 'Edit'}</button>` : ''}
                    ${appt.status.toLowerCase() !== 'cancelled' ? `<button class="action-btn btn-delete" onclick="deleteAppointment(${appt.appointment_id})">Cancel</button>` : ''}
                </td>
            `;

            tr.innerHTML = `
                <td><strong>${appt.patient_name}</strong></td>
                <td>${appt.patient_gender || 'Other'}</td>
                <td>${appt.doctor_name}</td>
                <td>${dateStr}</td>
                <td><span style="font-weight: 600; color: ${appt.status === 'Cancelled' ? '#ef4444' : appt.status === 'Completed' ? '#22c55e' : '#ff007f'}">${appt.status}</span></td>
                ${actionsHtml}
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error fetching appointments:", err);
    }
}

function openEditModal(id, patientName, gender, doctorId, date, status) {
    document.getElementById("editAppointmentId").value = id;
    
    const patientNameField = document.getElementById("editPatientName");
    patientNameField.value = patientName;
    patientNameField.disabled = false;
    
    const genderField = document.getElementById("editPatientGender");
    genderField.value = gender || 'Other';
    genderField.disabled = false;
    
    document.getElementById("editDoctorSelect").value = doctorId;
    
    // Format date value correctly to YYYY-MM-DD
    const dateFormatted = date.split('T')[0];
    document.getElementById("editAppointmentDate").value = dateFormatted;
    
    const statusField = document.getElementById("editStatus");
    statusField.value = status;
    statusField.disabled = isPatient;
    
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function saveAppointmentEdit() {
    const id = document.getElementById("editAppointmentId").value;
    const patientName = document.getElementById("editPatientName").value.trim();
    const gender = document.getElementById("editPatientGender").value;
    const doctorId = document.getElementById("editDoctorSelect").value;
    const date = document.getElementById("editAppointmentDate").value;
    const status = document.getElementById("editStatus").value;

    if (!patientName || !doctorId || !date) {
        showToast("Please fill all fields", true);
        return;
    }

    try {
        const response = await apiFetch(`/appointments/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patient_name: patientName,
                doctor_id: parseInt(doctorId),
                appointment_date: date,
                status: status,
                gender: gender
            })
        });

        if (response.ok) {
            showToast("Appointment Updated Successfully", false);
            closeEditModal();
            fetchAppointments();
        } else {
            showToast("Error updating appointment details", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function deleteAppointment(id) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
        const response = await apiFetch(`/appointments/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Appointment Cancelled Successfully", false);
            fetchAppointments();
        } else {
            showToast("Error cancelling appointment", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function bookAppointment() {
    const patientName = document.getElementById("patientName").value.trim();
    const gender = document.getElementById("patientGender").value;
    const doctorId = document.getElementById("doctorSelect").value;
    const date = document.getElementById("appointmentDate").value;
    const resultDiv = document.getElementById("bookingResult");
    
    if (!patientName || !doctorId || !date) {
        showToast("Please fill all fields", true);
        return;
    }
    
    try {
        const response = await apiFetch(`/appointments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                patient_name: patientName,
                doctor_id: parseInt(doctorId),
                appointment_date: date,
                status: "Booked",
                gender: gender
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            resultDiv.innerHTML = `
                <h3>Appointment Confirmed</h3>
                <p>Status: Booked</p>
                <p>Reference ID: ${data.appointment_id}</p>
            `;
            showToast("Appointment Booked Successfully", false);
            document.getElementById("patientName").value = "";
            document.getElementById("appointmentDate").value = "";
            fetchAppointments();
        } else {
            const err = await response.json();
            showToast("Error booking appointment: " + (err.detail || "Unknown error"), true);
        }
    } catch (error) {
        console.error("Error booking appointment:", error);
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