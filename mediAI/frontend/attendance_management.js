const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    // Set date input to today
    const dateInput = document.getElementById("attendanceDate");
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    loadEmployeesDropdown();
    loadTodayRoster();
});

async function loadEmployeesDropdown() {
    try {
        const response = await fetch(`${API_URL}/api/employees?status=Active`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const select = document.getElementById("selectEmployee");
        select.innerHTML = '<option value="">Select Staff Member</option>';
        data.forEach(emp => {
            const opt = document.createElement("option");
            opt.value = emp.employee_id;
            opt.innerText = `${emp.full_name} (${emp.designation})`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load employees for attendance dropdown");
    }
}

async function loadTodayRoster() {
    const tbody = document.getElementById("todayAttendanceTableBody");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:rgba(255,255,255,0.4);">Loading today's roster...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/attendance/today`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load today's attendance");
        const data = await response.json();

        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'present' ? 'badge-present' : (log.status.toLowerCase() === 'late' ? 'badge-late' : 'badge-absent');
                tr.innerHTML = `
                    <td style="font-weight:500;">${log.full_name}</td>
                    <td>${log.department || '-'}</td>
                    <td>${log.role || '-'}</td>
                    <td>${log.check_in || '-'}</td>
                    <td>${log.check_out || '-'}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:rgba(255,255,255,0.4);">No staff clocked in today yet.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ff4d4d;">${err.message}</td></tr>`;
    }
}

async function submitAttendance(event) {
    event.preventDefault();
    const empId = document.getElementById("selectEmployee").value;
    
    const logData = {
        date: document.getElementById("attendanceDate").value,
        check_in: document.getElementById("checkInTime").value || null,
        check_out: document.getElementById("checkOutTime").value || null,
        status: document.getElementById("attendanceStatus").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/attendance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(logData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to log attendance");
        }

        alert("Attendance logged successfully!");
        loadTodayRoster();
        
        // Reset form except date
        document.getElementById("selectEmployee").value = "";
        document.getElementById("checkInTime").value = "";
        document.getElementById("checkOutTime").value = "";
        document.getElementById("attendanceStatus").value = "Present";

    } catch (err) {
        alert(err.message);
    }
}
