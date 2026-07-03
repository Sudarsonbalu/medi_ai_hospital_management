const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    // Check if status filter is in URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam) {
        document.getElementById("filterStatus").value = statusParam;
    }
    loadEmployees();
});

async function loadEmployees() {
    const searchVal = document.getElementById("searchBar").value;
    const deptVal = document.getElementById("filterDept").value;
    const roleVal = document.getElementById("filterRole").value;
    const statusVal = document.getElementById("filterStatus").value;

    const tbody = document.getElementById("employeeTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: rgba(255,255,255,0.4);">Loading employee records...</td></tr>`;

    try {
        let url = `${API_URL}/api/employees?`;
        if (searchVal) url += `search=${encodeURIComponent(searchVal)}&`;
        if (deptVal) url += `department=${encodeURIComponent(deptVal)}&`;
        if (roleVal) url += `role=${encodeURIComponent(roleVal)}&`;
        if (statusVal) url += `status=${encodeURIComponent(statusVal)}&`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to retrieve employee directory");
        }
        const data = await response.json();

        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(emp => {
                const tr = document.createElement("tr");
                const badgeClass = emp.status.toLowerCase() === 'active' ? 'badge-active' : 'badge-inactive';
                
                tr.innerHTML = `
                    <td style="font-weight:600; color:#ff007f;">EMP-${String(emp.employee_id).padStart(4, '0')}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${emp.profile_photo || 'https://via.placeholder.com/40'}" style="width:36px; height:36px; border-radius:50%; border:1px solid #ff007f; object-fit:cover;">
                            <span style="font-weight:500;">${emp.full_name}</span>
                        </div>
                    </td>
                    <td>${emp.department || '-'}</td>
                    <td>
                        <div style="font-size:13px; font-weight:500;">${emp.designation || '-'}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.5);">${emp.role || '-'}</div>
                    </td>
                    <td>
                        <div style="font-size:13px;">${emp.email || '-'}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.5);">${emp.phone || '-'}</div>
                    </td>
                    <td><span class="badge ${badgeClass}">${emp.status}</span></td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button onclick="viewEmployee(${emp.employee_id})" class="btn btn-secondary btn-small" title="View Profile"><i class="fa-solid fa-eye"></i></button>
                            <button onclick="editEmployee(${emp.employee_id})" class="btn btn-secondary btn-small" style="color:#00f2fe;" title="Edit Details"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteEmployee(${emp.employee_id})" class="btn btn-danger btn-small" title="Delete Profile"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: rgba(255,255,255,0.4);">No employee records found matching current criteria.</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ff4d4d;">Failed to load employee records.</td></tr>`;
    }
}

function filterEmployees() {
    loadEmployees();
}

function viewEmployee(id) {
    window.location.href = `employee_profile.html?id=${id}`;
}

function editEmployee(id) {
    window.location.href = `employee_edit.html?id=${id}`;
}

async function deleteEmployee(id) {
    if (!confirm("Are you sure you want to delete this employee profile? This action is irreversible.")) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/employees/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to delete employee profile");
        }
        alert("Employee profile deleted successfully.");
        loadEmployees();
    } catch (err) {
        alert(err.message);
    }
}
