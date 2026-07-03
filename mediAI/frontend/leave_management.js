const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    loadEmployeesDropdown();
    loadPendingLeaves();
    loadAllLeaves();
});

function switchLeaveTab(tabId) {
    const tabs = document.querySelectorAll(".leave-tab");
    tabs.forEach(tab => tab.classList.remove("active"));
    
    const clickedTab = Array.from(tabs).find(t => t.outerHTML.includes(`switchLeaveTab('${tabId}')`));
    if (clickedTab) clickedTab.classList.add("active");

    const panels = document.querySelectorAll(".tab-panel");
    panels.forEach(p => p.classList.remove("active"));

    const targetPanel = document.getElementById(`panel-${tabId}`);
    if (targetPanel) targetPanel.classList.add("active");
}

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
        console.error("Failed to load employees for leave dropdown");
    }
}

async function loadPendingLeaves() {
    const tbody = document.getElementById("pendingLeavesTableBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4);">Loading pending requests...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/leaves/pending`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load pending leaves");
        const data = await response.json();

        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:600;">${log.full_name}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.5);">${log.department} (${log.role})</div>
                    </td>
                    <td style="font-weight:600; color:#ff007f;">${log.leave_type}</td>
                    <td>
                        <div style="font-size:13px;">${log.start_date} to ${log.end_date}</div>
                    </td>
                    <td>${log.reason || '-'}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button onclick="updateLeave(${log.leave_id}, 'Approved')" class="btn btn-secondary btn-small" style="color:#2ecc71;" title="Approve"><i class="fa-solid fa-check"></i> Approve</button>
                            <button onclick="updateLeave(${log.leave_id}, 'Rejected')" class="btn btn-danger btn-small" title="Reject"><i class="fa-solid fa-xmark"></i> Reject</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4);">No pending leave requests.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4d4d;">${err.message}</td></tr>`;
    }
}

async function loadAllLeaves() {
    const tbody = document.getElementById("allLeavesTableBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4);">Loading leave logs...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/leaves/all`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load leave history");
        const data = await response.json();

        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'approved' ? 'badge-approved' : (log.status.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-rejected');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:600;">${log.full_name}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.5);">${log.department} (${log.role})</div>
                    </td>
                    <td style="font-weight:500; color:#ff007f;">${log.leave_type}</td>
                    <td>
                        <div style="font-size:13px;">${log.start_date} to ${log.end_date}</div>
                    </td>
                    <td>${log.reason || '-'}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:rgba(255,255,255,0.4);">No historical leave logs.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4d4d;">${err.message}</td></tr>`;
    }
}

async function updateLeave(leaveId, status) {
    if (!confirm(`Are you sure you want to mark this request as ${status}?`)) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/employees/leaves/${leaveId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify({ status: status })
        });
        if (!response.ok) throw new Error("Failed to update request");
        
        alert(`Leave request has been ${status.toLowerCase()}!`);
        loadPendingLeaves();
        loadAllLeaves();
    } catch (e) {
        alert(e.message);
    }
}

async function submitLeave(event) {
    event.preventDefault();
    const empId = document.getElementById("selectEmployee").value;

    const leaveData = {
        leave_type: document.getElementById("leaveType").value,
        start_date: document.getElementById("startDate").value,
        end_date: document.getElementById("endDate").value,
        reason: document.getElementById("leaveReason").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/leaves`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(leaveData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to submit leave request");
        }

        alert("Leave request submitted successfully!");
        loadPendingLeaves();
        loadAllLeaves();

        // Reset inputs
        document.getElementById("selectEmployee").value = "";
        document.getElementById("leaveType").value = "Sick Leave";
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value = "";
        document.getElementById("leaveReason").value = "";

    } catch (err) {
        alert(err.message);
    }
}
