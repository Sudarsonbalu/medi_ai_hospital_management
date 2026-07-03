const API_URL = window.API_URL || "http://127.0.0.1:8002";

async function saveEmployee(event) {
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
        const response = await fetch(`${API_URL}/api/employees`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to register employee");
        }

        alert("Employee registered successfully!");
        window.location.href = "employee_list.html";
    } catch (err) {
        alert(err.message);
    }
}
