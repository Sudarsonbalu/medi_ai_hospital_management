const API_URL = window.API_URL || "http://127.0.0.1:8002";

let watchId = null; // Stores live watchPosition ID

document.addEventListener("DOMContentLoaded", () => {
    // Session Auth Check
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        window.location.href = "index.html";
        return;
    }
    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        console.error("Error parsing user session:", e);
        localStorage.removeItem("user");
        window.location.href = "index.html";
        return;
    }
    
    // Wire Form Submit
    const emergencyForm = document.getElementById("emergencyForm");
    if (emergencyForm) {
        emergencyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await registerEmergency();
        });
    }

    // Initial load
    loadEmergencies(user.role);

    // Auto-refresh triage table every 8 seconds
    setInterval(() => {
        loadEmergencies(user.role);
    }, 8002);
});

// HTML5 Geolocation: Fetch Current Coordinates
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", true);
        return;
    }

    showToast("Retrieving GPS coordinates...", false);

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            document.getElementById("latitude").value = lat.toFixed(6);
            document.getElementById("longitude").value = lng.toFixed(6);

            showToast("GPS Coordinates loaded successfully!", false);
        },
        (error) => {
            console.error("Geolocation error:", error);
            showToast("Failed to fetch location. Please check GPS permissions.", true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// HTML5 Geolocation: Toggle Live Location Sharing
function toggleLiveTracking(checked) {
    if (!checked) {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
            showToast("Live location sharing stopped.", false);
        }
        return;
    }

    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", true);
        document.getElementById("liveTrackingToggle").checked = false;
        return;
    }

    showToast("Initializing live GPS tracking...", false);

    watchId = navigator.geolocation.watchPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Update UI fields
            document.getElementById("latitude").value = lat.toFixed(6);
            document.getElementById("longitude").value = lng.toFixed(6);

            // POST to backend API /patients/me/location
            try {
                const response = await apiFetch("/patients/me/location", {
                    method: "POST",
                    body: JSON.stringify({ latitude: lat, longitude: lng })
                });
                
                if (response.ok) {
                    console.log(`Live location shared: ${lat}, ${lng}`);
                } else {
                    console.warn("Failed to update live location on server.");
                }
            } catch (err) {
                console.error("Error updating live location:", err);
            }
        },
        (error) => {
            console.error("WatchPosition error:", error);
            showToast("Live GPS tracking failed. Check permissions.", true);
            document.getElementById("liveTrackingToggle").checked = false;
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Load active emergencies
async function loadEmergencies(userRole) {
    try {
        const response = await apiFetch(`/emergencies`);
        const cases = await response.json();
        const tbody = document.getElementById("emergencyTriageBody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const isStaff = userRole && (userRole.toLowerCase() === "doctor" || userRole.toLowerCase() === "admin");
        
        // Toggle action header visibility
        const actionHeaders = document.querySelectorAll(".action-column");
        actionHeaders.forEach(hdr => {
            hdr.style.display = isStaff ? "" : "none";
        });

        if (cases.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${isStaff ? 6 : 5}" style="text-align: center; color: rgba(255,255,255,0.4);">No active emergency cases.</td></tr>`;
            return;
        }

        cases.forEach(item => {
            const tr = document.createElement("tr");
            
            // Severity color class mapping
            let severityClass = "severity-moderate";
            if (item.severity.toLowerCase() === "critical") severityClass = "severity-critical";
            else if (item.severity.toLowerCase() === "high") severityClass = "severity-high";

            // Status color class mapping
            let statusClass = "status-active";
            if (item.status.toLowerCase() === "dispatched") statusClass = "status-dispatched";
            else if (item.status.toLowerCase() === "resolved") statusClass = "status-resolved";

            const doctorName = item.doctor_name || "<span style='color: rgba(255,255,255,0.3)'>Assigning ER...</span>";

            // Render Google Maps pin icon if coordinates are available
            let mapsLinkHtml = "";
            if (item.latitude && item.longitude) {
                mapsLinkHtml = `
                    <a href="https://www.google.com/maps?q=${item.latitude},${item.longitude}" target="_blank" 
                       style="color: #2ecc71; margin-left: 8px; font-size: 14px; text-decoration: none;" 
                       title="View GPS Location on Google Maps">
                        <i class="fa-solid fa-map-location-dot"></i>
                    </a>
                `;
            }

            // Action buttons row template (only for Doctors/Staff)
            let actionHtml = "";
            if (isStaff) {
                actionHtml = `
                    <td class="action-column">
                        ${item.status.toLowerCase() === 'active' ? `<button class="action-btn btn-dispatch" onclick="updateStatus(${item.emergency_id}, 'Dispatched')">Dispatch</button>` : ''}
                        ${item.status.toLowerCase() !== 'resolved' ? `<button class="action-btn btn-resolve" onclick="updateStatus(${item.emergency_id}, 'Resolved')">Resolve</button>` : `<span style="color: #22c55e;">Done ✓</span>`}
                    </td>
                `;
            }

            tr.innerHTML = `
                <td><strong>${item.patient_name}</strong>${mapsLinkHtml}</td>
                <td>${item.contact_phone}</td>
                <td><span class="badge-severity ${severityClass}">${item.severity}</span></td>
                <td>${doctorName}</td>
                <td><span class="badge-status ${statusClass}">${item.status}</span></td>
                ${actionHtml}
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading emergencies:", error);
    }
}

// Register emergency case with coordinates
async function registerEmergency() {
    const patientName = document.getElementById("patientName").value.trim();
    const contactPhone = document.getElementById("contactPhone").value.trim();
    const severity = document.getElementById("severity").value;
    const symptoms = document.getElementById("symptoms").value.trim();

    const latVal = document.getElementById("latitude").value;
    const lngVal = document.getElementById("longitude").value;

    const payload = {
        patient_name: patientName,
        severity: severity,
        contact_phone: contactPhone,
        symptoms: symptoms
    };

    if (latVal && lngVal) {
        payload.latitude = parseFloat(latVal);
        payload.longitude = parseFloat(lngVal);
    }

    try {
        const response = await apiFetch(`/emergencies`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast("Emergency Request Dispatched Successfully!", false);
            document.getElementById("emergencyForm").reset();
            
            // Clear location fields
            document.getElementById("latitude").value = "";
            document.getElementById("longitude").value = "";
            
            // Disable live location check if it was checked
            const toggle = document.getElementById("liveTrackingToggle");
            if (toggle && toggle.checked) {
                toggle.checked = false;
                toggleLiveTracking(false);
            }

            // Refresh table
            const user = JSON.parse(localStorage.getItem("user"));
            await loadEmergencies(user.role);
        } else {
            const err = await response.json();
            showToast("Failed to book emergency: " + (err.detail || "Server error"), true);
        }
    } catch (error) {
        console.error("Error booking emergency:", error);
        showToast("Error connecting to backend.", true);
    }
}

// Update triage status
async function updateStatus(emergencyId, newStatus) {
    try {
        const response = await apiFetch(`/emergencies/${emergencyId}/status`, {
            method: "PUT",
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showToast(`Triage status updated to ${newStatus}`, false);
            const user = JSON.parse(localStorage.getItem("user"));
            await loadEmergencies(user.role);
        } else {
            showToast("Failed to update status", true);
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

// Toast notification helper
function showToast(message, isError = false) {
    let toast = document.createElement("div");
    toast.innerText = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.padding = "12px 24px";
    toast.style.background = isError ? "#dc2626" : "#10b981";
    toast.style.color = "white";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.3)";
    toast.style.zIndex = "10000";
    toast.style.fontWeight = "bold";
    toast.style.fontFamily = "'Poppins', sans-serif";
    toast.style.transition = "opacity 0.5s ease";
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}
