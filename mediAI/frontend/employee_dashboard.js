const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/api/employees/dashboard/stats`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to load dashboard statistics");
        }
        const data = await response.json();

        // Update metric widgets
        document.getElementById("widgetTotal").innerText = data.total_employees;
        document.getElementById("widgetActive").innerText = data.active_employees;
        document.getElementById("widgetLeave").innerText = data.employees_on_leave;
        document.getElementById("widgetAttendance").innerText = data.attendance_today;

        // Render department distribution
        const deptList = document.getElementById("deptList");
        deptList.innerHTML = "";
        if (data.department_distribution && data.department_distribution.length > 0) {
            const maxCount = Math.max(...data.department_distribution.map(d => d.count), 1);
            data.department_distribution.forEach(d => {
                const pct = (d.count / maxCount) * 100;
                const item = document.createElement("div");
                item.style.display = "flex";
                item.style.flexDirection = "column";
                item.style.gap = "5px";
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-size:13px;">
                        <span>${d.department}</span>
                        <span style="color:#ff007f; font-weight:600;">${d.count} staff</span>
                    </div>
                    <div style="width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:#ff007f; box-shadow:0 0 10px #ff007f; border-radius:4px;"></div>
                    </div>
                `;
                deptList.appendChild(item);
            });
        } else {
            deptList.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:15px;">No active departments recorded.</p>`;
        }

        // Render recent activities
        const activitiesList = document.getElementById("activitiesList");
        activitiesList.innerHTML = "";
        if (data.recent_activities && data.recent_activities.length > 0) {
            data.recent_activities.forEach(act => {
                const item = document.createElement("div");
                item.style.display = "flex";
                item.style.gap = "10px";
                item.style.alignItems = "flex-start";
                item.style.padding = "10px";
                item.style.background = "rgba(255, 255, 255, 0.02)";
                item.style.border = "1px solid rgba(255, 255, 255, 0.05)";
                item.style.borderRadius = "8px";
                
                const timeStr = new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                item.innerHTML = `
                    <i class="fa-solid fa-clock-rotate-left" style="color:#ff007f; margin-top:3px; font-size:14px;"></i>
                    <div style="flex:1;">
                        <p style="font-size:13px; color:rgba(255,255,255,0.9); line-height:1.4;">${act.message}</p>
                        <span style="font-size:11px; color:rgba(255,255,255,0.4);">${timeStr}</span>
                    </div>
                `;
                activitiesList.appendChild(item);
            });
        } else {
            activitiesList.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:15px;">No recent system activities.</p>`;
        }

    } catch (err) {
        console.error("Error loading dashboard stats:", err);
    }
}
