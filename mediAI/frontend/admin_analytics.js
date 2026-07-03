const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    // Session Auth & Role check
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userStr || !token) {
        window.location.href = "index.html";
        return;
    }
    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        console.error("Error parsing user session:", e);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "index.html";
        return;
    }
    const isAdmin = user && user.role && user.role.toLowerCase() === "admin";
    
    // Non-admin redirection check
    if (!isAdmin) {
        if (user && user.role && user.role.toLowerCase() === "doctor") {
            window.location.href = "doctor_dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
        return;
    }

    // Load metrics
    loadAnalytics();
});

async function loadAnalytics() {
    try {
        const response = await apiFetch(`/admin/analytics`);
        if (!response.ok) {
            console.error("Failed to load administrative analytics.");
            return;
        }

        const data = await response.json();

        // 1. Set overview summary stats
        document.getElementById("statPatients").innerText = data.total_patients;
        document.getElementById("statDoctors").innerText = data.total_doctors;
        document.getElementById("statLabTests").innerText = data.total_lab_tests;
        document.getElementById("statPharmacyItems").innerText = data.pharmacy.total_items;

        // 2. Set financial values
        document.getElementById("pharmacyTotalValue").innerText = data.pharmacy.total_value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.getElementById("statStockItems").innerText = data.pharmacy.total_items;
        document.getElementById("statEmergencies").innerText = data.emergencies.total;

        // 3. Appointments progress metrics
        const apptTotal = data.appointments.total;
        let booked = 0, completed = 0, cancelled = 0;

        data.appointments.breakdown.forEach(item => {
            const status = item.status.toLowerCase();
            if (status === "booked") booked = item.count;
            else if (status === "completed") completed = item.count;
            else if (status === "cancelled") cancelled = item.count;
        });

        document.getElementById("valBooked").innerText = booked;
        document.getElementById("valCompleted").innerText = completed;
        document.getElementById("valCancelled").innerText = cancelled;

        if (apptTotal > 0) {
            document.getElementById("barBooked").style.width = `${(booked / apptTotal) * 100}%`;
            document.getElementById("barCompleted").style.width = `${(completed / apptTotal) * 100}%`;
            document.getElementById("barCancelled").style.width = `${(cancelled / apptTotal) * 100}%`;
        }

        // 4. Emergency dial gauge metrics
        const emgTotal = data.emergencies.total;
        let critical = 0, high = 0, moderate = 0;

        data.emergencies.severity_breakdown.forEach(item => {
            const severity = item.severity.toLowerCase();
            if (severity === "critical") critical = item.count;
            else if (severity === "high") high = item.count;
            else if (severity === "moderate") moderate = item.count;
        });

        document.getElementById("lblCritical").innerText = critical;
        document.getElementById("lblHigh").innerText = high;
        document.getElementById("lblModerate").innerText = moderate;

        if (emgTotal > 0) {
            // Circumference of circles:
            // Critical: r=80, c=2*pi*r ≈ 502
            const criticalOffset = 502 - (critical / emgTotal) * 502;
            document.getElementById("dialCritical").style.strokeDashoffset = criticalOffset;

            // High: r=65, c=2*pi*r ≈ 408
            const highOffset = 408 - (high / emgTotal) * 408;
            document.getElementById("dialHigh").style.strokeDashoffset = highOffset;

            // Moderate: r=50, c=2*pi*r ≈ 314
            const moderateOffset = 314 - (moderate / emgTotal) * 314;
            document.getElementById("dialModerate").style.strokeDashoffset = moderateOffset;
        }

    } catch (err) {
        console.error("Error drawing analytics:", err);
    }
}
