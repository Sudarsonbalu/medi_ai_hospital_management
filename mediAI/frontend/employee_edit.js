const API_URL = window.API_URL || "http://127.0.0.1:8002";
let currentEmployeeId = null;

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEmployeeId = urlParams.get('id');
    if (!currentEmployeeId) {
        alert("No employee ID provided. Returning to list.");
        window.location.href = "employee_list.html";
        return;
    }
    fetchEmployeeDetails();
});

async function fetchEmployeeDetails() {
    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to load employee details");
        }
        const emp = await response.json();

        // Populate fields
        document.getElementById("fullName").value = emp.full_name || "";
        document.getElementById("email").value = emp.email || "";
        document.getElementById("phone").value = emp.phone || "";
        document.getElementById("dob").value = emp.dob || "";
        document.getElementById("gender").value = emp.gender || "";
        document.getElementById("bloodGroup").value = emp.blood_group || "";
        document.getElementById("address").value = emp.address || "";
        document.getElementById("profilePhoto").value = emp.profile_photo || "";
        document.getElementById("department").value = emp.department || "";
        document.getElementById("designation").value = emp.designation || "";
        document.getElementById("role").value = emp.role || "";
        document.getElementById("joiningDate").value = emp.joining_date || "";
        document.getElementById("qualification").value = emp.qualification || "";
        document.getElementById("experience").value = emp.experience || "";
        document.getElementById("salary").value = emp.salary || 0.0;
        document.getElementById("emergencyContact").value = emp.emergency_contact || "";
        document.getElementById("status").value = emp.status || "Active";

    } catch (err) {
        alert(err.message);
        window.location.href = "employee_list.html";
    }
}

async function updateEmployee(event) {
    event.preventDefault();

    const employeeData = {
        full_name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value || null,
        dob: document.getElementById("dob").value || null,
        gender: document.getElementById("gender").value || null,
        blood_group: document.getElementById("bloodGroup").value || null,
        address: document.getElementById("address").value || null,
        profile_photo: document.getElementById("profilePhoto").value || null,
        department: document.getElementById("department").value,
        designation: document.getElementById("designation").value,
        role: document.getElementById("role").value,
        joining_date: document.getElementById("joiningDate").value || null,
        qualification: document.getElementById("qualification").value || null,
        experience: document.getElementById("experience").value || null,
        salary: parseFloat(document.getElementById("salary").value) || 0.0,
        emergency_contact: document.getElementById("emergencyContact").value,
        status: document.getElementById("status").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${currentEmployeeId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to update employee details");
        }

        alert("Employee details updated successfully!");
        window.location.href = "employee_list.html";
    } catch (err) {
        alert(err.message);
    }
}
