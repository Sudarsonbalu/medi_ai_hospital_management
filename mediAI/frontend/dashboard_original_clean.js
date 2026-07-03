const API_URL = window.API_URL || "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    // Fetch and populate Appointments count (filtered by user.name)
    try {
        const response = await apiFetch(`/appointments`);
        if (response.ok) {
            const appointments = await response.json();
            const count = appointments.filter(appt => appt.patient_name.toLowerCase() === user.name.toLowerCase()).length;
            document.getElementById("statAppointments").innerText = count;
        }
    } catch (e) {
        console.error("Error loading patient appointments count:", e);
    }

    // Fetch and populate Medical Reports count (filtered by user.name)
    try {
        const response = await apiFetch(`/tests`);
        if (response.ok) {
            const tests = await response.json();
            const count = tests.filter(test => test.patient_name.toLowerCase() === user.name.toLowerCase()).length;
            document.getElementById("statReports").innerText = count;
        }
    } catch (e) {
        console.error("Error loading patient reports count:", e);
    }

    // Fetch and populate Consult Doctors count (total doctors available)
    try {
        const response = await apiFetch(`/doctors`);
        if (response.ok) {
            const doctors = await response.json();
            document.getElementById("statDoctors").innerText = doctors.length;
        }
    } catch (e) {
        console.error("Error loading doctors count:", e);
    }
});

