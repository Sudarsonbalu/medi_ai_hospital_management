const API_URL = window.API_URL || "http://127.0.0.1:8002";

// --- AUTHENTICATION & SECURE SESSION CHECKS ---
let token = localStorage.getItem("token") || "";
let currentUser = null;

try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
        currentUser = JSON.parse(userStr);
    }
} catch (e) {
    console.error("Session parse error:", e);
}

// Redirect if not logged in or not Admin
if (!currentUser || currentUser.role !== "Admin" || !token) {
    alert("Administrative Session Required. Redirecting to Login.");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// --- CLOCK WIDGET & PAGE INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    if (!currentUser) return;
    // Populate admin profile widget
    document.getElementById("adminName").innerText = currentUser.name;
    document.getElementById("adminEmail").innerText = currentUser.email;

    // Start Live Clock
    setInterval(updateClock, 1000);
    updateClock();

    // Initial Data Load
    loadDashboardAnalytics();
    
    // Periodically poll for emergency alerts (every 10 seconds)
    setInterval(pollEmergenciesAlerts, 10000);
    pollEmergenciesAlerts();
});

function updateClock() {
    const timeSpan = document.getElementById("liveTime");
    if (timeSpan) {
        timeSpan.innerText = new Date().toLocaleTimeString();
    }
}

// Toggle widgets
function toggleNotifications() {
    const dropdown = document.getElementById("notificationDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function toggleProfileMenu() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// Close dropdowns if clicked outside
window.addEventListener("click", (e) => {
    if (!e.target.closest(".notification-trigger")) {
        document.getElementById("notificationDropdown").style.display = "none";
    }
    if (!e.target.closest(".user-profile")) {
        document.getElementById("profileDropdown").style.display = "none";
    }
});

// --- TAB ROUTING CONTROLLER ---
function switchTab(tabId) {
    // 1. Toggle active classes on Sidebar Link
    const navItems = document.querySelectorAll(".sidebar ul li");
    navItems.forEach(item => item.classList.remove("active"));
    
    // Find active element
    const normalizedTab = tabId.toLowerCase().replace("-", " ");
    const matchingLink = Array.from(navItems).find(item => {
        const text = item.textContent.trim().toLowerCase();
        return text.includes(normalizedTab) || 
               (normalizedTab === "users" && text.includes("user")) ||
               (normalizedTab === "doctors" && text.includes("doctor")) ||
               (normalizedTab === "patients" && text.includes("patient")) ||
               (normalizedTab === "ai assistant" && text.includes("ai"));
    });
    if (matchingLink) {
        matchingLink.classList.add("active");
    }

    // Update Header Title dynamically based on active Tab
    const headerTitle = document.getElementById("headerTitle");
    const headerSubtitle = document.getElementById("headerSubtitle");
    
    // 2. Hide all tab views and show target tab
    const tabs = document.querySelectorAll(".tab-view");
    tabs.forEach(tab => tab.classList.remove("active"));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) {
        targetTab.classList.add("active");
    }

    // 3. Load tab specific resources
    if (tabId === "dashboard") {
        headerTitle.innerText = "Dashboard Overview";
        headerSubtitle.innerText = "Clinical Operations Command & Infrastructure Control";
        loadDashboardAnalytics();
    } else if (tabId === "users") {
        headerTitle.innerText = "User Security & Accounts";
        headerSubtitle.innerText = "Authorize, toggle access status, and reset passwords";
        loadUsers();
    } else if (tabId === "doctors") {
        headerTitle.innerText = "Doctor Staff Panel";
        headerSubtitle.innerText = "Assign departments, manage availability schedules, and view shifts";
        loadDoctors();
    } else if (tabId === "patients") {
        headerTitle.innerText = "Patient Health Records";
        headerSubtitle.innerText = "Inspect patient histories, diagnoses, and details";
        loadPatients();
    } else if (tabId === "appointments") {
        headerTitle.innerText = "Appointment Scheduler";
        headerSubtitle.innerText = "Reschedule, approve, or cancel client sessions";
        loadAppointments();
    } else if (tabId === "emergency") {
        headerTitle.innerText = "Emergency Command Hub";
        headerSubtitle.innerText = "Real-time dispatch and critical emergency response";
        loadEmergencies();
    } else if (tabId === "laboratory") {
        headerTitle.innerText = "Laboratory Management";
        headerSubtitle.innerText = "Schedule lab tests and upload diagnostics PDF reports";
        loadLaboratory();
    } else if (tabId === "pharmacy") {
        headerTitle.innerText = "Pharmacy Medicine Inventory";
        headerSubtitle.innerText = "Add stocks, adjust pricing, and track inventory value";
        loadPharmacy();
    } else if (tabId === "ai-assistant") {
        headerTitle.innerText = "AI Diagnostic Assistant Settings";
        headerSubtitle.innerText = "Configure Gemini Model, toggle features, and audit query logs";
        loadAiAssistantSettings();
    } else if (tabId === "reports") {
        headerTitle.innerText = "Hospital Records Reports Hub";
        headerSubtitle.innerText = "Download spreadhseets (CSV) or trigger printable PDF reports";
    } else if (tabId === "settings") {
        headerTitle.innerText = "Infrastructure System Settings";
        headerSubtitle.innerText = "Hospital details, activity logs auditing, and DB backup/restore";
        loadSystemSettings();
    } else if (tabId === "employees") {
        headerTitle.innerText = "Employee Management Hub";
        headerSubtitle.innerText = "Monitor workforce attendance, assign shifts, manage payroll and logs";
        const frame = document.getElementById("employeesFrame");
        if (frame) {
            frame.src = "employee_dashboard.html";
        }
    }
}

// --- MODAL HELPERS ---
function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

// --- MODULE 1: DASHBOARD OVERVIEW ---
async function loadDashboardAnalytics() {
    try {
        const response = await apiFetch(`/admin/analytics`, {
        });
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();

        // Populate metrics cards
        document.getElementById("statPatients").innerText = data.total_patients;
        document.getElementById("statDoctors").innerText = data.total_doctors;
        document.getElementById("statAppointments").innerText = data.appointments.total;
        document.getElementById("statEmergencies").innerText = data.emergencies.total;
        document.getElementById("statLabTests").innerText = data.total_lab_tests;
        document.getElementById("statPrescriptions").innerText = data.total_prescriptions;
        document.getElementById("statRevenue").innerText = `₹${data.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Calculate progress bars for appointments
        let booked = 0, completed = 0, cancelled = 0;
        data.appointments.breakdown.forEach(item => {
            const status = item.status.toLowerCase();
            if (status === "booked") booked = item.count;
            else if (status === "completed" || status === "approved") completed = item.count;
            else if (status === "cancelled") cancelled = item.count;
        });

        const total = booked + completed + cancelled || 1;
        document.getElementById("valBooked").innerText = booked;
        document.getElementById("valCompleted").innerText = completed;
        document.getElementById("valCancelled").innerText = cancelled;
        
        document.getElementById("chartBooked").style.width = `${(booked / total) * 100}%`;
        document.getElementById("chartCompleted").style.width = `${(completed / total) * 100}%`;
        document.getElementById("chartCancelled").style.width = `${(cancelled / total) * 100}%`;

        // Check alerts
        loadDashboardCriticalAlerts(data);

        // Fetch and populate live dashboard activity logs
        try {
            const logsRes = await apiFetch(`/admin/logs/activity`);
            const logs = await logsRes.json();
            const dashboardViewer = document.getElementById("dashboardActivityLogViewer");
            if (dashboardViewer) {
                dashboardViewer.innerHTML = "";
                if (logs.length === 0) {
                    dashboardViewer.innerHTML = '<div style="color: rgba(255, 255, 255, 0.4); text-align: center; padding: 15px;">No recent registration or system events found.</div>';
                } else {
                    logs.forEach(log => {
                        dashboardViewer.innerHTML += `
                            <div class="log-entry">
                                [${new Date(log.timestamp).toLocaleString()}] (ID:${log.user_id}) <strong>${log.username}</strong> [${log.role}]: <span>${log.action}</span> IP: ${log.ip_address || 'Local'}
                            </div>
                        `;
                    });
                }
            }
        } catch (err) {
            console.error("Dashboard activity logs error:", err);
        }
    } catch (e) {
        console.error("Dashboard analytics error:", e);
    }
}

function loadDashboardCriticalAlerts(data) {
    const alertList = document.getElementById("resourceAlertList");
    alertList.innerHTML = "";
    
    let alertCount = 0;
    
    // Check active emergencies
    let activeEmergencies = 0;
    if (data.emergencies && data.emergencies.status_breakdown) {
        data.emergencies.status_breakdown.forEach(item => {
            if (item.status.toLowerCase() === "active") {
                activeEmergencies = item.count;
            }
        });
    }

    if (activeEmergencies > 0) {
        alertList.innerHTML += `
            <li class="danger">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>There are <strong>${activeEmergencies}</strong> active emergency cases needing immediate attention!</span>
            </li>
        `;
        alertCount++;
    }

    // Fetch medicines low stock
    apiFetch(`/medicines`)
        .then(res => res.json())
        .then(medicines => {
            const lowStock = medicines.filter(m => m.quantity < 10);
            if (lowStock.length > 0) {
                lowStock.forEach(m => {
                    alertList.innerHTML += `
                        <li class="warn">
                            <i class="fa-solid fa-cubes-stacked"></i>
                            <span>Low stock warning: Medicine <strong>${m.name}</strong> only has ${m.quantity} units left.</span>
                        </li>
                    `;
                    alertCount++;
                });
            }

            if (alertCount === 0) {
                alertList.innerHTML = `<li class="empty"><i class="fa-regular fa-circle-check" style="color:#39ff20;"></i> All hospital operations are running smoothly.</li>`;
            }
        })
        .catch(err => console.error("Error loading medicines for dashboard alerts:", err));
}

// --- MODULE 2: USER MANAGEMENT ---
async function loadUsers() {
    const search = document.getElementById("userSearch").value;
    const role = document.getElementById("userRoleFilter").value;
    
    let url = `${API_URL}/admin/users?`;
    if (role) url += `role=${role}&`;
    if (search) url += `search=${search}&`;

    try {
        const response = await apiFetch(url);
        if (!response.ok) throw new Error("Failed to load users");
        const users = await response.json();
        
        const tbody = document.getElementById("userTableBody");
        tbody.innerHTML = "";
        
        users.forEach(u => {
            const lastLogin = u.last_login ? new Date(u.last_login).toLocaleString() : "Never";
            const registered = new Date(u.created_at).toLocaleDateString();
            const roleBadge = u.role.toLowerCase() === "admin" ? "admin" : (u.role.toLowerCase() === "doctor" ? "doctor" : "patient");
            const statusClass = u.status === "Active" ? "status-active" : "status-inactive";
            const toggleIcon = u.status === "Active" ? "fa-user-slash" : "fa-user-check";
            
            tbody.innerHTML += `
                <tr>
                    <td>${u.user_id}</td>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge-role ${roleBadge}">${u.role}</span></td>
                    <td><span class="${statusClass}">${u.status}</span></td>
                    <td>${registered}</td>
                    <td>${lastLogin}</td>
                    <td class="action-buttons">
                        <button class="btn-action" title="Edit Profile" onclick="openEditUserModal(${u.user_id}, '${u.name}', '${u.email}', '${u.role}', '${u.status}')"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-action" title="Toggle Access" onclick="toggleUserStatus(${u.user_id}, '${u.status}')"><i class="fa-solid ${toggleIcon}"></i></button>
                        <button class="btn-action" title="Delete User" onclick="deleteUser(${u.user_id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Users list load error:", e);
    }
}

function openAddUserModal() {
    document.getElementById("addUserName").value = "";
    document.getElementById("addUserEmail").value = "";
    document.getElementById("addUserPassword").value = "";
    openModal("addUserModal");
}

async function submitAddUser() {
    const name = document.getElementById("addUserName").value;
    const email = document.getElementById("addUserEmail").value;
    const role = document.getElementById("addUserRole").value;
    const password = document.getElementById("addUserPassword").value;

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await apiFetch(`/admin/users`, {
            method: "POST",
            body: JSON.stringify({ name, email, password, role })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Failed to create user");
        
        alert("User account registered successfully.");
        closeModal("addUserModal");
        loadUsers();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

function openEditUserModal(userId, name, email, role, status) {
    document.getElementById("editUserId").value = userId;
    document.getElementById("editUserName").value = name;
    document.getElementById("editUserEmail").value = email;
    document.getElementById("editUserRole").value = role;
    document.getElementById("editUserStatus").value = status;
    document.getElementById("editUserPassword").value = "";
    openModal("editUserModal");
}

async function submitEditUser() {
    const userId = document.getElementById("editUserId").value;
    const name = document.getElementById("editUserName").value;
    const email = document.getElementById("editUserEmail").value;
    const role = document.getElementById("editUserRole").value;
    const status = document.getElementById("editUserStatus").value;
    const password = document.getElementById("editUserPassword").value;

    try {
        const response = await apiFetch(`/admin/users/${userId}?status=${status}`, {
            method: "PUT",
            body: JSON.stringify({ name, email, role, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Failed to update user");

        alert("User details updated successfully.");
        closeModal("editUserModal");
        loadUsers();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    if (!confirm(`Are you sure you want to set this account status to ${newStatus}?`)) return;

    try {
        const response = await apiFetch(`/admin/users/${userId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error("Failed to toggle user status");
        loadUsers();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to permanently delete this user account?")) return;
    try {
        const response = await apiFetch(`/admin/users/${userId}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete user account");
        alert("User account deleted.");
        loadUsers();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 3: DOCTOR MANAGEMENT ---
async function loadDoctors() {
    try {
        const response = await apiFetch(`/doctors`);
        const doctors = await response.json();
        const tbody = document.getElementById("doctorTableBody");
        tbody.innerHTML = "";

        doctors.forEach(d => {
            const availClass = d.availability === "Available" ? "status-active" : "status-inactive";
            tbody.innerHTML += `
                <tr>
                    <td>${d.doctor_id}</td>
                    <td>Dr. <strong>${d.name}</strong></td>
                    <td>${d.specialization}</td>
                    <td>${d.department}</td>
                    <td><span class="${availClass}">${d.availability}</span></td>
                    <td>${d.schedule || 'Mon-Fri 9:00 AM - 5:00 PM'}</td>
                    <td class="action-buttons">
                        <button class="btn-action" title="Edit Profile" onclick="openEditDoctorModal(${d.doctor_id}, '${d.name}', '${d.specialization}', '${d.department}', '${d.availability}', '${d.schedule || ''}')"><i class="fa-solid fa-user-pen"></i></button>
                        <button class="btn-action" title="Delete Profile" onclick="deleteDoctor(${d.doctor_id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Doctors load error:", e);
    }
}

function openAddDoctorModal() {
    document.getElementById("addDocName").value = "";
    document.getElementById("addDocSpec").value = "";
    document.getElementById("addDocDept").value = "";
    document.getElementById("addDocSched").value = "Mon-Fri 9:00 AM - 5:00 PM";
    openModal("addDoctorModal");
}

async function submitAddDoctor() {
    const name = document.getElementById("addDocName").value;
    const specialization = document.getElementById("addDocSpec").value;
    const department = document.getElementById("addDocDept").value;
    const availability = document.getElementById("addDocAvail").value;
    const schedule = document.getElementById("addDocSched").value;

    if (!name || !specialization || !department) {
        alert("All fields are required.");
        return;
    }

    try {
        const response = await apiFetch(`/doctors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, specialization, department, availability })
        });
        const result = await response.json();
        if (!response.ok) throw new Error("Failed to create doctor profile");

        // Save schedule
        await apiFetch(`/admin/doctors/${result.doctor_id}/schedule?schedule=${encodeURIComponent(schedule)}`, {
            method: "PUT",
        });

        alert("Doctor profile created successfully.");
        closeModal("addDoctorModal");
        loadDoctors();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

function openEditDoctorModal(doctor_id, name, specialization, department, availability, schedule) {
    document.getElementById("editDocId").value = doctor_id;
    document.getElementById("editDocName").value = name;
    document.getElementById("editDocSpec").value = specialization;
    document.getElementById("editDocDept").value = department;
    document.getElementById("editDocAvail").value = availability;
    document.getElementById("editDocSched").value = schedule;
    openModal("editDoctorModal");
}

async function submitEditDoctor() {
    const doctor_id = document.getElementById("editDocId").value;
    const name = document.getElementById("editDocName").value;
    const specialization = document.getElementById("editDocSpec").value;
    const department = document.getElementById("editDocDept").value;
    const availability = document.getElementById("editDocAvail").value;
    const schedule = document.getElementById("editDocSched").value;

    try {
        const response = await apiFetch(`/doctors/${doctor_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, specialization, department, availability })
        });
        if (!response.ok) throw new Error("Failed to update profile");

        // Save schedule
        await apiFetch(`/admin/doctors/${doctor_id}/schedule?schedule=${encodeURIComponent(schedule)}`, {
            method: "PUT",
        });

        alert("Doctor profile updated successfully.");
        closeModal("editDoctorModal");
        loadDoctors();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteDoctor(doctor_id) {
    if (!confirm("Are you sure you want to delete this doctor?")) return;
    try {
        const response = await apiFetch(`/doctors/${doctor_id}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Failed to delete doctor");
        alert("Doctor profile removed.");
        loadDoctors();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 4: PATIENT RECORDS ---
async function loadPatients() {
    try {
        const response = await apiFetch(`/patients`);
        const patients = await response.json();
        const tbody = document.getElementById("patientTableBody");
        tbody.innerHTML = "";

        patients.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.patient_id}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.age}</td>
                    <td>${p.gender}</td>
                    <td><span class="badge-role patient">${p.disease || 'None'}</span></td>
                    <td>${p.medical_history || 'No recorded history.'}</td>
                    <td class="action-buttons">
                        <button class="btn-action" title="Edit Record" onclick="openEditPatientModal(${p.patient_id}, '${p.name}', ${p.age}, '${p.gender}', '${p.disease || ''}', '${p.medical_history || ''}')"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-action" title="Delete Patient" onclick="deletePatient(${p.patient_id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Patients load error:", e);
    }
}

function openEditPatientModal(patientId, name, age, gender, disease, medicalHistory) {
    document.getElementById("editPatientId").value = patientId;
    document.getElementById("editPatName").value = name;
    document.getElementById("editPatAge").value = age;
    document.getElementById("editPatGender").value = gender;
    document.getElementById("editPatDisease").value = disease;
    document.getElementById("editPatHistory").value = medicalHistory;
    openModal("editPatientModal");
}

async function submitEditPatient() {
    const patientId = document.getElementById("editPatientId").value;
    const name = document.getElementById("editPatName").value;
    const age = document.getElementById("editPatAge").value;
    const gender = document.getElementById("editPatGender").value;
    const disease = document.getElementById("editPatDisease").value;
    const history = document.getElementById("editPatHistory").value;

    try {
        // Update general details
        const response = await apiFetch(`/patients/${patientId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, age: parseInt(age), gender, disease })
        });
        if (!response.ok) throw new Error("Failed to save patient details");

        // Update medical history
        await apiFetch(`/admin/patients/${patientId}/history?history=${encodeURIComponent(history)}`, {
            method: "PUT",
        });

        alert("Patient record updated successfully.");
        closeModal("editPatientModal");
        loadPatients();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

async function deletePatient(patientId) {
    if (!confirm("Are you sure you want to delete this patient record?")) return;
    try {
        const response = await apiFetch(`/patients/${patientId}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Failed to delete patient");
        alert("Patient record deleted.");
        loadPatients();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 5: APPOINTMENTS ---
async function loadAppointments() {
    try {
        const response = await apiFetch(`/appointments`);
        const appts = await response.json();
        const tbody = document.getElementById("appointmentTableBody");
        tbody.innerHTML = "";

        appts.forEach(a => {
            const statusClass = a.status.toLowerCase() === "approved" || a.status.toLowerCase() === "completed" ? "status-active" : (a.status.toLowerCase() === "booked" ? "severity-moderate" : "status-inactive");
            
            tbody.innerHTML += `
                <tr>
                    <td>${a.appointment_id}</td>
                    <td><strong>${a.patient_name}</strong></td>
                    <td>${a.patient_gender || 'Other'}</td>
                    <td>Dr. ${a.doctor_name}</td>
                    <td>${new Date(a.appointment_date).toLocaleDateString()}</td>
                    <td><span class="${statusClass}">${a.status}</span></td>
                    <td class="action-buttons">
                        ${a.status.toLowerCase() === 'booked' ? `<button class="btn-action" title="Approve" onclick="approveAppointment(${a.appointment_id})"><i class="fa-regular fa-square-check" style="color:#39ff20;"></i></button>` : ''}
                        <button class="btn-action" title="Reschedule" onclick="openRescheduleModal(${a.appointment_id}, '${a.patient_name}')"><i class="fa-regular fa-calendar-days"></i></button>
                        <button class="btn-action" title="Cancel/Delete" onclick="cancelAppointment(${a.appointment_id})"><i class="fa-solid fa-ban"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Appointments load error:", e);
    }
}

async function approveAppointment(apptId) {
    try {
        const response = await apiFetch(`/admin/appointments/${apptId}/approve`, {
            method: "PUT",
        });
        if (!response.ok) throw new Error("Failed to approve");
        loadAppointments();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

async function cancelAppointment(apptId) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
        const response = await apiFetch(`/admin/appointments/${apptId}/cancel`, {
            method: "PUT",
        });
        if (!response.ok) throw new Error("Failed to cancel");
        loadAppointments();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

function openRescheduleModal(apptId, patientName) {
    document.getElementById("rescheduleApptId").value = apptId;
    document.getElementById("reschedulePatName").value = patientName;
    document.getElementById("rescheduleNewDate").value = "";
    openModal("rescheduleModal");
}

async function submitReschedule() {
    const apptId = document.getElementById("rescheduleApptId").value;
    const newDate = document.getElementById("rescheduleNewDate").value;

    if (!newDate) {
        alert("Please select a date.");
        return;
    }

    try {
        const response = await apiFetch(`/admin/appointments/${apptId}/reschedule?new_date=${newDate}`, {
            method: "PUT",
        });
        if (!response.ok) throw new Error("Failed to reschedule");
        
        alert("Appointment rescheduled successfully.");
        closeModal("rescheduleModal");
        loadAppointments();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 6: EMERGENCY COMMAND HUB ---
async function loadEmergencies() {
    try {
        const response = await apiFetch(`/emergencies`);
        const emergencies = await response.json();
        const tbody = document.getElementById("emergencyTableBody");
        tbody.innerHTML = "";

        // Fetch doctors list to assign
        const doctorsRes = await apiFetch(`/doctors`);
        const doctors = await doctorsRes.json();
        let doctorOptions = `<option value="">Auto-Assign Doctor</option>`;
        doctors.forEach(d => {
            if (d.availability === "Available") {
                doctorOptions += `<option value="${d.doctor_id}">Dr. ${d.name} (${d.specialization})</option>`;
            }
        });

        emergencies.forEach(e => {
            const severityClass = e.severity.toLowerCase() === "critical" ? "severity-critical" : (e.severity.toLowerCase() === "moderate" ? "severity-moderate" : "severity-mild");
            const statusClass = e.status.toLowerCase() === "active" ? "status-active" : "status-inactive";
            
            let mapLinkHtml = "";
            if (e.latitude && e.longitude) {
                mapLinkHtml = `<a href="https://www.google.com/maps?q=${e.latitude},${e.longitude}" target="_blank" class="btn-action" title="View Location on Google Maps" style="color: #2ecc71; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; padding: 6px; border-radius: 4px; background: rgba(46, 204, 113, 0.15); margin-right: 5px;"><i class="fa-solid fa-map-location-dot"></i></a>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td>${e.emergency_id}</td>
                    <td><strong>${e.patient_name}</strong></td>
                    <td><span class="${severityClass}">${e.severity}</span></td>
                    <td>${e.contact_phone}</td>
                    <td>${e.symptoms || 'None'}</td>
                    <td>${e.doctor_name ? `Dr. ${e.doctor_name}` : '<span style="color:#ff007f;">UNASSIGNED</span>'}</td>
                    <td><span class="${statusClass}">${e.status}</span></td>
                    <td>${new Date(e.created_at).toLocaleString()}</td>
                    <td>
                        <div class="action-buttons" style="display: flex; align-items: center; gap: 5px;">
                            ${mapLinkHtml}
                            <select style="padding: 4px 8px; font-size:12px; background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1);" onchange="assignDoctor(${e.emergency_id}, this.value)">
                                ${doctorOptions}
                            </select>
                            <button class="btn-action" title="Mark Resolved" onclick="toggleEmergencyStatus(${e.emergency_id}, 'Resolved')"><i class="fa-regular fa-circle-check"></i></button>
                            <button class="btn-action" title="Delete Case" onclick="deleteEmergency(${e.emergency_id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Emergencies load error:", e);
    }
}

async function assignDoctor(emergencyId, doctorId) {
    if (!doctorId) return;
    try {
        const response = await apiFetch(`/admin/emergencies/${emergencyId}/assign?doctor_id=${doctorId}`, {
            method: "PUT",
        });
        if (!response.ok) throw new Error("Failed to assign doctor");
        alert("Doctor assigned to emergency case.");
        loadEmergencies();
    } catch (e) {
        alert(e.message);
    }
}

async function toggleEmergencyStatus(emergencyId, status) {
    try {
        const response = await apiFetch(`/emergencies/${emergencyId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error("Failed to resolve emergency case");
        alert("Emergency case updated successfully.");
        loadEmergencies();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteEmergency(emergencyId) {
    if (!confirm("Are you sure you want to delete this emergency case?")) return;
    try {
        const response = await apiFetch(`/admin/emergencies/${emergencyId}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete case");
        alert("Emergency case deleted.");
        loadEmergencies();
    } catch (e) {
        alert(e.message);
    }
}

async function pollEmergenciesAlerts() {
    try {
        const res = await apiFetch(`/emergencies`);
        const emergencies = await res.json();
        
        const activeCount = emergencies.filter(e => e.status.toLowerCase() === "active").length;
        const alertBar = document.getElementById("emergencyAlertBar");
        const alertBadge = document.getElementById("alertCount");
        
        if (activeCount > 0) {
            alertBar.style.display = "flex";
            alertBadge.innerText = activeCount;
            alertBadge.style.display = "block";
            
            // Populate drop down
            const notificationList = document.getElementById("notificationList");
            notificationList.innerHTML = "";
            emergencies.filter(e => e.status.toLowerCase() === "active").forEach(e => {
                notificationList.innerHTML += `<li>⚠️ Active Emergency: <strong>${e.patient_name}</strong> (${e.severity})</li>`;
            });
        } else {
            alertBar.style.display = "none";
            alertBadge.style.display = "none";
            document.getElementById("notificationList").innerHTML = `<li class="empty-list">No active system alerts.</li>`;
        }
    } catch (e) {
        console.error("Poller error:", e);
    }
}

// --- MODULE 7: LABORATORY ---
async function loadLaboratory() {
    try {
        const response = await apiFetch(`/tests`);
        const tests = await response.json();
        const tbody = document.getElementById("labTableBody");
        tbody.innerHTML = "";

        tests.forEach(t => {
            const statusClass = t.status.toLowerCase() === "completed" ? "status-active" : "status-inactive";
            
            tbody.innerHTML += `
                <tr>
                    <td>${t.test_id}</td>
                    <td><strong>${t.patient_name}</strong></td>
                    <td>${t.test_type}</td>
                    <td>${new Date(t.test_date).toLocaleDateString()}</td>
                    <td><span class="${statusClass}">${t.status}</span></td>
                    <td>
                        ${t.report_file ? `<a href="${API_URL}/uploads/${t.report_file}" target="_blank" style="color:#00f2fe; text-decoration:none;"><i class="fa-solid fa-file-pdf"></i> Download Report</a>` : '<span style="color:rgba(255,255,255,0.4);">No File Uploaded</span>'}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action" title="Upload Report File" onclick="openUploadReportModal(${t.test_id})"><i class="fa-solid fa-cloud-arrow-up"></i></button>
                            <button class="btn-action" title="Delete Test" onclick="deleteLabTest(${t.test_id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Lab test load error:", e);
    }
}

function openAddTestModal() {
    document.getElementById("addTestPatName").value = "";
    document.getElementById("addTestDate").value = "";
    openModal("addTestModal");
}

async function submitAddTest() {
    const patient_name = document.getElementById("addTestPatName").value;
    const test_type = document.getElementById("addTestCategory").value;
    const test_date = document.getElementById("addTestDate").value;

    if (!patient_name || !test_date) {
        alert("Please fill in patient name and test date.");
        return;
    }

    try {
        const response = await apiFetch(`/tests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patient_name, test_type, test_date })
        });
        if (!response.ok) throw new Error("Failed to schedule test");
        
        alert("Laboratory test scheduled successfully.");
        closeModal("addTestModal");
        loadLaboratory();
    } catch (e) {
        alert(e.message);
    }
}

function openUploadReportModal(testId) {
    document.getElementById("uploadReportTestId").value = testId;
    document.getElementById("labReportFile").value = "";
    openModal("uploadReportModal");
}

async function submitReportUpload() {
    const testId = document.getElementById("uploadReportTestId").value;
    const fileSelector = document.getElementById("labReportFile");
    
    if (fileSelector.files.length === 0) {
        alert("Please select a file to upload.");
        return;
    }

    const file = fileSelector.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await apiFetch(`/admin/laboratory/upload/${testId}`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Failed to upload report");

        alert("Lab Report uploaded successfully.");
        closeModal("uploadReportModal");
        loadLaboratory();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteLabTest(testId) {
    if (!confirm("Are you sure you want to delete this lab test booking?")) return;
    try {
        const response = await apiFetch(`/tests/${testId}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Failed to delete test");
        alert("Laboratory test booking removed.");
        loadLaboratory();
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 8: PHARMACY INVENTORY ---
async function loadPharmacy() {
    try {
        const response = await apiFetch(`/medicines`);
        const medicines = await response.json();
        const tbody = document.getElementById("pharmacyTableBody");
        tbody.innerHTML = "";

        medicines.forEach(m => {
            const statusClass = m.quantity < 10 ? "severity-critical" : "status-active";
            const statusText = m.quantity < 10 ? "⚠️ LOW STOCK" : "In Stock";
            const totalVal = m.quantity * m.price;
            
            tbody.innerHTML += `
                <tr>
                    <td>${m.medicine_id}</td>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.quantity}</td>
                    <td>₹${m.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>₹${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action" title="Edit Stock" onclick="openEditMedicineModal(${m.medicine_id}, '${m.name}', ${m.quantity}, ${m.price})"><i class="fa-solid fa-box-open"></i></button>
                            <button class="btn-action" title="Delete Medicine" onclick="deleteMedicine(${m.medicine_id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Pharmacy load error:", e);
    }
}

function openAddMedicineModal() {
    document.getElementById("addMedName").value = "";
    document.getElementById("addMedQty").value = "";
    document.getElementById("addMedPrice").value = "";
    openModal("addMedicineModal");
}

async function submitAddMedicine() {
    const name = document.getElementById("addMedName").value;
    const quantity = document.getElementById("addMedQty").value;
    const price = document.getElementById("addMedPrice").value;

    if (!name || !quantity || !price) {
        alert("Please fill in all inventory details.");
        return;
    }

    try {
        const response = await apiFetch(`/medicines`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, quantity: parseInt(quantity), price: parseFloat(price) })
        });
        if (!response.ok) throw new Error("Failed to add medicine");

        alert("Medicine stock added successfully.");
        closeModal("addMedicineModal");
        loadPharmacy();
    } catch (e) {
        alert(e.message);
    }
}

function openEditMedicineModal(id, name, qty, price) {
    document.getElementById("editMedId").value = id;
    document.getElementById("editMedName").value = name;
    document.getElementById("editMedQty").value = qty;
    document.getElementById("editMedPrice").value = price;
    openModal("editMedicineModal");
}

async function submitEditMedicine() {
    const id = document.getElementById("editMedId").value;
    const name = document.getElementById("editMedName").value;
    const quantity = document.getElementById("editMedQty").value;
    const price = document.getElementById("editMedPrice").value;

    try {
        const response = await apiFetch(`/medicines/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, quantity: parseInt(quantity), price: parseFloat(price) })
        });
        if (!response.ok) throw new Error("Failed to update medicine");

        alert("Medicine stock adjusted.");
        closeModal("editMedicineModal");
        loadPharmacy();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteMedicine(id) {
    if (!confirm("Are you sure you want to remove this medicine?")) return;
    try {
        const response = await apiFetch(`/medicines/${id}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Failed to delete medicine");
        alert("Medicine deleted.");
        loadPharmacy();
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 9: AI ASSISTANT MODULE ---
async function loadAiAssistantSettings() {
    try {
        const response = await apiFetch(`/admin/ai/stats`);
        if (!response.ok) throw new Error("Failed to load AI stats");
        const stats = await response.json();

        // Populate controls
        document.getElementById("aiEnabledToggle").checked = stats.ai_enabled;
        document.getElementById("geminiApiKey").value = stats.gemini_api_key;
        document.getElementById("aiTotalConversations").innerText = stats.chatbot_logs_count;

        // Render Chat logs table
        const tbody = document.getElementById("aiLogsTableBody");
        tbody.innerHTML = "";
        stats.recent_chat_logs.forEach(log => {
            tbody.innerHTML += `
                <tr>
                    <td>${log.log_id}</td>
                    <td>${log.user_message}</td>
                    <td>${log.bot_response}</td>
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("AI Settings load error:", e);
    }
}

async function toggleAiAssistant() {
    const isChecked = document.getElementById("aiEnabledToggle").checked;
    try {
        const response = await apiFetch(`/admin/ai/toggle?enabled=${isChecked}`, {
            method: "POST",
        });
        if (!response.ok) throw new Error("Failed to toggle AI settings");
        alert(`AI Assistant toggled to ${isChecked ? 'Enabled' : 'Disabled'}`);
    } catch (e) {
        alert(e.message);
    }
}

async function saveApiKey() {
    const key = document.getElementById("geminiApiKey").value;
    try {
        const response = await apiFetch(`/admin/ai/apikey?apikey=${encodeURIComponent(key)}`, {
            method: "POST",
        });
        if (!response.ok) throw new Error("Failed to update API key");
        alert("Gemini Pro API Key Saved.");
    } catch (e) {
        alert(e.message);
    }
}

// --- MODULE 10: REPORTS GENERATION ---
function exportData(module) {
    window.open(`${API_URL}/admin/reports/export?module=${module}&authorization=Bearer ${token}`);
}

function generatePDFReport() {
    window.open(`${API_URL}/admin/reports/pdf?authorization=Bearer ${token}`);
}

// --- MODULE 11: INFRASTRUCTURE & SETTINGS ---
async function loadSystemSettings() {
    try {
        // Load settings
        const response = await apiFetch(`/admin/settings`);
        const settings = await response.json();
        
        document.getElementById("hospitalName").value = settings.hospital_name || "";
        document.getElementById("systemEmail").value = settings.system_email || "";
        document.getElementById("backupFreq").value = settings.backup_frequency || "Daily";

        // Load activity logs
        const logsRes = await apiFetch(`/admin/logs/activity`);
        const logs = await logsRes.json();
        
        const viewer = document.getElementById("activityLogViewer");
        viewer.innerHTML = "";
        logs.forEach(log => {
            viewer.innerHTML += `
                <div class="log-entry">
                    [${new Date(log.timestamp).toLocaleString()}] (ID:${log.user_id}) <strong>${log.username}</strong> [${log.role}]: <span>${log.action}</span> IP: ${log.ip_address || 'Local'}
                </div>
            `;
        });
    } catch (e) {
        console.error("System settings load error:", e);
    }
}

async function saveSettings() {
    const hospital_name = document.getElementById("hospitalName").value;
    const system_email = document.getElementById("systemEmail").value;
    const backup_frequency = document.getElementById("backupFreq").value;

    try {
        const response = await apiFetch(`/admin/settings`, {
            method: "POST",
            body: JSON.stringify({ hospital_name, system_email, backup_frequency })
        });
        if (!response.ok) throw new Error("Failed to save settings");
        alert("Hospital settings saved successfully.");
        loadSystemSettings();
        loadDashboardAnalytics();
    } catch (e) {
        alert(e.message);
    }
}

// --- DATABASE BACKUP AND RESTORE ---
async function backupDatabase() {
    try {
        const response = await apiFetch(`/admin/db/backup`);
        if (!response.ok) throw new Error("Failed to generate database backup");
        const data = await response.json();

        // Convert JSON to Blob for download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mediAI_db_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert(e.message);
    }
}

function restoreDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (!confirm("Are you sure you want to restore? This will overwrite ALL current database table records!")) return;

            const response = await apiFetch(`/admin/db/restore`, {
                method: "POST",
                body: JSON.stringify({ data: parsedData })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Failed to restore database");

            alert("Database restored successfully! Reloading stats.");
            loadSystemSettings();
            loadDashboardAnalytics();
        } catch (err) {
            alert("Error parsing or sending backup file: " + err.message);
        }
    };
    reader.readAsText(file);
}
