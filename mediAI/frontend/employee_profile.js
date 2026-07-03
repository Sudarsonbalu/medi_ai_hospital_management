const API_URL = window.API_URL || "http://127.0.0.1:8002";
let currentEmployeeId = null;

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEmployeeId = urlParams.get('id');
    if (!currentEmployeeId) {
        alert("No employee ID provided. Returning to directory.");
        window.location.href = "employee_list.html";
        return;
    }
    loadProfileDetails();
    loadAttendanceLogs();
    loadLeaveLogs();
    loadShiftLogs();
    loadPayrollLogs();
    loadPerformanceLogs();
    loadTaskLogs();
});

function switchProfileTab(tabId) {
    const tabs = document.querySelectorAll(".profile-tab");
    tabs.forEach(tab => tab.classList.remove("active"));
    
    const clickedTab = Array.from(tabs).find(t => t.outerHTML.includes(`switchProfileTab('${tabId}')`));
    if (clickedTab) clickedTab.classList.add("active");

    const panels = document.querySelectorAll(".tab-panel");
    panels.forEach(p => p.classList.remove("active"));

    const targetPanel = document.getElementById(`panel-${tabId}`);
    if (targetPanel) targetPanel.classList.add("active");
}

function editCurrentProfile() {
    window.location.href = `employee_edit.html?id=${currentEmployeeId}`;
}

async function loadProfileDetails() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to load profile details");
        }
        const emp = await response.json();

        // Populate Header Info
        document.getElementById("employeeName").innerText = emp.full_name;
        document.getElementById("employeeDesignation").innerText = emp.designation || "No Designation";
        document.getElementById("employeeDepartment").innerText = emp.department || "No Department";
        if (emp.profile_photo) {
            document.getElementById("profilePhoto").src = emp.profile_photo;
        }

        const statusBadge = document.getElementById("employeeStatus");
        statusBadge.innerText = emp.status;
        statusBadge.className = "badge " + (emp.status.toLowerCase() === 'active' ? 'badge-active' : 'badge-inactive');

        // Populate Info Panel details
        document.getElementById("detailGender").innerText = emp.gender || "Unspecified";
        document.getElementById("detailDob").innerText = emp.dob || "Unspecified";
        document.getElementById("detailBloodGroup").innerText = emp.blood_group || "Unspecified";
        document.getElementById("detailEmail").innerText = emp.email || "Unspecified";
        document.getElementById("detailPhone").innerText = emp.phone || "Unspecified";
        document.getElementById("detailEmergency").innerText = emp.emergency_contact || "Unspecified";
        document.getElementById("detailAddress").innerText = emp.address || "Unspecified";

        document.getElementById("detailDept").innerText = emp.department || "Unspecified";
        document.getElementById("detailDesignation").innerText = emp.designation || "Unspecified";
        document.getElementById("detailRole").innerText = emp.role || "Unspecified";
        document.getElementById("detailJoining").innerText = emp.joining_date || "Unspecified";
        document.getElementById("detailQualification").innerText = emp.qualification || "Unspecified";
        document.getElementById("detailExperience").innerText = emp.experience || "Unspecified";
        document.getElementById("detailSalary").innerText = emp.salary ? `₹${parseFloat(emp.salary).toLocaleString('en-IN')}` : "Unspecified";

    } catch (err) {
        alert(err.message);
        window.location.href = "employee_list.html";
    }
}

async function loadAttendanceLogs() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}/attendance`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        const tbody = document.getElementById("attendanceTableBody");
        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'present' ? 'badge-present' : (log.status.toLowerCase() === 'late' ? 'badge-late' : 'badge-absent');
                tr.innerHTML = `
                    <td>${log.date}</td>
                    <td>${log.check_in || '-'}</td>
                    <td>${log.check_out || '-'}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.4);">No attendance logs recorded.</td></tr>`;
        }
    } catch (e) {
        console.error("Failed to load attendance logs");
    }
}

async function loadLeaveLogs() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}/leaves`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const tbody = document.getElementById("leavesTableBody");
        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'approved' ? 'badge-approved' : (log.status.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-rejected');
                tr.innerHTML = `
                    <td>${log.leave_type}</td>
                    <td>${log.start_date}</td>
                    <td>${log.end_date}</td>
                    <td>${log.reason || '-'}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4);">No leave logs recorded.</td></tr>`;
        }
    } catch (e) {
        console.error("Failed to load leave logs");
    }
}

async function loadShiftLogs() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}/shifts`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const tbody = document.getElementById("shiftsTableBody");
        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${log.day_of_week}</td>
                    <td style="font-weight:600; color:#ff007f;">${log.shift_name}</td>
                    <td>${log.start_time}</td>
                    <td>${log.end_time}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.4);">No shifts scheduled.</td></tr>`;
        }
    } catch (e) {
        console.error("Failed to load shift logs");
    }
}

async function loadPayrollLogs() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}/payroll`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const tbody = document.getElementById("payrollTableBody");
        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'paid' ? 'badge-paid' : 'badge-unpaid';
                tr.innerHTML = `
                    <td>${log.month} ${log.year}</td>
                    <td>₹${parseFloat(log.basic_salary).toLocaleString('en-IN')}</td>
                    <td>₹${parseFloat(log.allowances).toLocaleString('en-IN')}</td>
                    <td>₹${parseFloat(log.deductions).toLocaleString('en-IN')}</td>
                    <td style="font-weight:600; color:#ff007f;">₹${parseFloat(log.net_salary).toLocaleString('en-IN')}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                    <td>${log.payment_date || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:rgba(255,255,255,0.4);">No payroll history recorded.</td></tr>`;
        }
    } catch (e) {
        console.error("Failed to load payroll logs");
    }
}

async function loadPerformanceLogs() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}/performance`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const list = document.getElementById("performanceList");
        list.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const item = document.createElement("div");
                item.style.padding = "15px";
                item.style.background = "rgba(255,255,255,0.02)";
                item.style.border = "1px solid rgba(255,255,255,0.05)";
                item.style.borderRadius = "10px";
                
                let stars = "";
                for (let i = 1; i <= 5; i++) {
                    if (i <= log.rating) {
                        stars += `<i class="fa-solid fa-star" style="color:#f1c40f;"></i>`;
                    } else {
                        stars += `<i class="fa-regular fa-star" style="color:rgba(255,255,255,0.2);"></i>`;
                    }
                }

                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div>${stars}</div>
                        <span style="font-size:12px; color:rgba(255,255,255,0.45);">${log.evaluation_date}</span>
                    </div>
                    <p style="font-size:13px; font-style:italic; color:rgba(255,255,255,0.8); line-height:1.4;">"${log.feedback || 'No comments.'}"</p>
                    <div style="font-size:11px; color:#ff007f; margin-top:8px; text-align:right;">Evaluated by: ${log.evaluator || 'System'}</div>
                `;
                list.appendChild(item);
            });
        } else {
            list.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:15px;">No evaluations recorded.</p>`;
        }
    } catch (e) {
        console.error("Failed to load performance evaluations");
    }
}

async function loadTaskLogs() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}/tasks`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const tbody = document.getElementById("tasksTableBody");
        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'completed' ? 'badge-present' : (log.status.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-late');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:500;">${log.title}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.5);">${log.description || '-'}</div>
                    </td>
                    <td>${log.due_date}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:rgba(255,255,255,0.4);">No tasks assigned.</td></tr>`;
        }
    } catch (e) {
        console.error("Failed to load tasks");
    }
}
