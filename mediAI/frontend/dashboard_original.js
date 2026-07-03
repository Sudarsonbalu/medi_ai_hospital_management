Created At: 2026-06-19T11:07:05Z
Completed At: 2026-06-19T11:07:06Z
File Path: `file:///d:/PROJEC%20T/mediAI/frontend/dashboard.js`
Total Lines: 43
Total Bytes: 1649
Showing lines 1 to 43
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: const API_URL = window.API_URL || "http://127.0.0.1:8000";
2: 
3: document.addEventListener("DOMContentLoaded", async () => {
4:     const userStr = localStorage.getItem("user");
5:     if (!userStr) return;
6:     const user = JSON.parse(userStr);
7:     
8:     // Fetch and populate Appointments count (filtered by user.name)
9:     try {
10:         const response = await apiFetch(`/appointments`);
11:         if (response.ok) {
12:             const appointments = await response.json();
13:             const count = appointments.filter(appt => appt.patient_name.toLowerCase() === user.name.toLowerCase()).length;
14:             document.getElementById("statAppointments").innerText = count;
15:         }
16:     } catch (e) {
17:         console.error("Error loading patient appointments count:", e);
18:     }
19: 
20:     // Fetch and populate Medical Reports count (filtered by user.name)
21:     try {
22:         const response = await apiFetch(`/tests`);
23:         if (response.ok) {
24:             const tests = await response.json();
25:             const count = tests.filter(test => test.patient_name.toLowerCase() === user.name.toLowerCase()).length;
26:             document.getElementById("statReports").innerText = count;
27:         }
28:     } catch (e) {
29:         console.error("Error loading patient reports count:", e);
30:     }
31: 
32:     // Fetch and populate Consult Doctors count (total doctors available)
33:     try {
34:         const response = await apiFetch(`/doctors`);
35:         if (response.ok) {
36:             const doctors = await response.json();
37:             document.getElementById("statDoctors").innerText = doctors.length;
38:         }
39:     } catch (e) {
40:         console.error("Error loading doctors count:", e);
41:     }
42: });
43: 
The above content shows the entire, complete file contents of the requested file.
