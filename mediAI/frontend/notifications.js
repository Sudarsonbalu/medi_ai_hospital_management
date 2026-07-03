const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    loadNotifications();
});

async function loadNotifications() {
    const container = document.getElementById("notificationsLogContainer");
    container.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:20px;">Fetching workforce activity logs...</p>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/notifications`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load notifications");
        const data = await response.json();

        container.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const item = document.createElement("div");
                item.style.display = "flex";
                item.style.gap = "15px";
                item.style.alignItems = "center";
                item.style.padding = "15px";
                item.style.background = "rgba(255,255,255,0.02)";
                item.style.border = "1px solid rgba(255,255,255,0.05)";
                item.style.borderRadius = "10px";
                
                // Formatted timestamp
                const dateObj = new Date(log.created_at);
                const dateString = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                item.innerHTML = `
                    <div style="width:40px; height:40px; border-radius:50%; background:rgba(255,0,127,0.1); border:1px solid rgba(255,0,127,0.3); display:flex; justify-content:center; align-items:center;">
                        <i class="fa-solid fa-bell" style="color:#ff007f;"></i>
                    </div>
                    <div style="flex:1;">
                        <p style="font-size:14px; font-weight:500; color:white; line-height:1.4;">${log.message}</p>
                        <span style="font-size:11px; color:rgba(255,255,255,0.4);">${dateString} at ${timeString}</span>
                    </div>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; padding:20px;">No workforce system notifications found.</p>`;
        }
    } catch (err) {
        container.innerHTML = `<p style="color:#ff4d4d; text-align:center; padding:20px;">${err.message}</p>`;
    }
}
