const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Doctor Dashboard Loaded");
    await loadDoctorStats();
});

async function loadDoctorStats() {
    // 1. Fetch Patients Count
    try {
        const response = await apiFetch(`/patients`);
        if (response.ok) {
            const patients = await response.json();
            document.getElementById("statPatients").innerText = patients.length;
        }
    } catch (e) {
        console.error("Error loading patients count:", e);
    }

    // 2. Fetch Laboratory Tests & Pending Reports Count
    try {
        const response = await apiFetch(`/tests`);
        if (response.ok) {
            const tests = await response.json();
            document.getElementById("statLaboratory").innerText = tests.length;
            
            const pendingCount = tests.filter(t => t.status.toLowerCase() === "pending").length;
            document.getElementById("statPendingReports").innerText = pendingCount;
        }
    } catch (e) {
        console.error("Error loading laboratory tests count:", e);
    }

    // 3. Fetch Appointments Count
    try {
        const response = await apiFetch(`/appointments`);
        if (response.ok) {
            const appointments = await response.json();
            document.getElementById("statAppointments").innerText = appointments.length;
        }
    } catch (e) {
        console.error("Error loading appointments count:", e);
    }

    // 4. Fetch Pharmacy Inventory Count (Prescriptions/Medicines card)
    try {
        const response = await apiFetch(`/medicines`);
        if (response.ok) {
            const medicines = await response.json();
            document.getElementById("statPrescriptions").innerText = medicines.length;
        }
    } catch (e) {
        console.error("Error loading medicines count:", e);
    }
}