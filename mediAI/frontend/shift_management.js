const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    loadEmployeesDropdown();
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
        console.error("Failed to load employees for shift dropdown");
    }
}

function presetTimes() {
    const shift = document.getElementById("shiftName").value;
    const start = document.getElementById("startTime");
    const end = document.getElementById("endTime");

    if (shift === "General Shift") {
        start.value = "09:00 AM";
        end.value = "05:00 PM";
    } else if (shift === "Morning Shift") {
        start.value = "06:00 AM";
        end.value = "02:00 PM";
    } else if (shift === "Evening Shift") {
        start.value = "02:00 PM";
        end.value = "10:00 PM";
    } else if (shift === "Night Shift") {
        start.value = "10:00 PM";
        end.value = "06:00 AM";
    }
}

async function onEmployeeSelect() {
    const empId = document.getElementById("selectEmployee").value;
    const placeholder = document.getElementById("rosterPlaceholder");
    const tableContainer = document.getElementById("rosterTableContainer");

    if (!empId) {
        placeholder.style.display = "block";
        tableContainer.style.display = "none";
        return;
    }

    placeholder.style.display = "none";
    tableContainer.style.display = "block";

    loadEmployeeRoster(empId);
}

async function loadEmployeeRoster(empId) {
    const tbody = document.getElementById("rosterTableBody");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.4);">Loading schedule...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/shifts`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load shifts");
        const data = await response.json();

        tbody.innerHTML = "";
        
        // Define standard weekday order for display sorting
        const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        
        if (data && data.length > 0) {
            // Sort data by weekday order
            data.sort((a, b) => daysOrder.indexOf(a.day_of_week) - daysOrder.indexOf(b.day_of_week));
            
            data.forEach(log => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="font-weight:500;">${log.day_of_week}</td>
                    <td style="font-weight:600; color:#ff007f;">${log.shift_name}</td>
                    <td>${log.start_time}</td>
                    <td>${log.end_time}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.4);">No shifts scheduled for this staff member.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ff4d4d;">${err.message}</td></tr>`;
    }
}

async function submitShift(event) {
    event.preventDefault();
    const empId = document.getElementById("selectEmployee").value;

    const shiftData = {
        shift_name: document.getElementById("shiftName").value,
        start_time: document.getElementById("startTime").value,
        end_time: document.getElementById("endTime").value,
        day_of_week: document.getElementById("dayOfWeek").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/shifts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(shiftData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to assign shift");
        }

        alert("Shift assigned successfully!");
        loadEmployeeRoster(empId);

    } catch (err) {
        alert(err.message);
    }
}
