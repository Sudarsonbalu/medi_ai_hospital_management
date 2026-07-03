const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("evaluationDate").value = today;
    document.getElementById("taskDueDate").value = today;

    // Preset evaluator name to logged-in user if available
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.name) {
            document.getElementById("evaluatorName").value = user.name;
        }
    } catch (e) {}

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
        console.error("Failed to load employees for performance dropdown");
    }
}

function onEmployeeSelect() {
    const empId = document.getElementById("selectEmployee").value;
    const alertBox = document.getElementById("noEmployeeSelectedAlert");
    const panels = document.getElementById("mainDashboardPanels");

    if (!empId) {
        alertBox.style.display = "block";
        panels.style.display = "none";
        return;
    }

    alertBox.style.display = "none";
    panels.style.display = "block";

    loadReviews(empId);
    loadTasks(empId);
}

async function loadReviews(empId) {
    const list = document.getElementById("reviewsList");
    list.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:15px;">Loading reviews...</p>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/performance`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load evaluations");
        const data = await response.json();

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
            list.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:15px;">No performance reviews logged.</p>`;
        }
    } catch (err) {
        list.innerHTML = `<p style="color:#ff4d4d; text-align:center; padding:15px;">${err.message}</p>`;
    }
}

async function loadTasks(empId) {
    const tbody = document.getElementById("tasksTableBody");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.4);">Loading tasks...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/tasks`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load tasks");
        const data = await response.json();

        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'completed' ? 'badge-present' : (log.status.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-late');
                
                let actions = "";
                if (log.status.toLowerCase() === 'pending') {
                    actions = `
                        <button onclick="updateTask(${log.task_id}, 'In Progress')" class="btn btn-secondary btn-small" style="color:#00f2fe;" title="Start Task"><i class="fa-solid fa-play"></i> Start</button>
                        <button onclick="updateTask(${log.task_id}, 'Completed')" class="btn btn-secondary btn-small" style="color:#2ecc71;" title="Complete Task"><i class="fa-solid fa-check"></i> Complete</button>
                    `;
                } else if (log.status.toLowerCase() === 'in progress') {
                    actions = `
                        <button onclick="updateTask(${log.task_id}, 'Completed')" class="btn btn-secondary btn-small" style="color:#2ecc71;" title="Complete Task"><i class="fa-solid fa-check"></i> Complete</button>
                    `;
                } else {
                    actions = `<span style="font-size:11px; color:rgba(255,255,255,0.4);">Completed</span>`;
                }

                tr.innerHTML = `
                    <td>
                        <div style="font-weight:500;">${log.title}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.5);">${log.description || '-'}</div>
                    </td>
                    <td>${log.due_date}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                    <td><div style="display:flex; gap:8px;">${actions}</div></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.4);">No tasks assigned.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ff4d4d;">${err.message}</td></tr>`;
    }
}

async function updateTask(taskId, status) {
    try {
        const response = await fetch(`${API_URL}/api/employees/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify({ status: status })
        });
        if (!response.ok) throw new Error("Failed to update task status");
        
        alert(`Task marked as ${status}!`);
        const empId = document.getElementById("selectEmployee").value;
        loadTasks(empId);
    } catch (e) {
        alert(e.message);
    }
}

async function submitPerformance(event) {
    event.preventDefault();
    const empId = document.getElementById("selectEmployee").value;

    const evalData = {
        rating: parseInt(document.getElementById("evaluationRating").value),
        feedback: document.getElementById("evaluationFeedback").value,
        evaluation_date: document.getElementById("evaluationDate").value,
        evaluator: document.getElementById("evaluatorName").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/performance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(evalData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to submit performance review");
        }

        alert("Performance review submitted successfully!");
        loadReviews(empId);

        // Reset inputs
        document.getElementById("evaluationRating").value = "5";
        document.getElementById("evaluationFeedback").value = "";

    } catch (err) {
        alert(err.message);
    }
}

async function submitTask(event) {
    event.preventDefault();
    const empId = document.getElementById("selectEmployee").value;

    const taskData = {
        title: document.getElementById("taskTitle").value,
        description: document.getElementById("taskDescription").value,
        due_date: document.getElementById("taskDueDate").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to assign task");
        }

        alert("Task assigned successfully!");
        loadTasks(empId);

        // Reset inputs
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDescription").value = "";

    } catch (err) {
        alert(err.message);
    }
}
