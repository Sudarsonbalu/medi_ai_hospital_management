const API_URL = window.API_URL || "http://127.0.0.1:8002";

let isRegisterMode = false;

document.addEventListener("DOMContentLoaded", () => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (userStr && token) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.role && user.role.toLowerCase() === "patient") {
                window.location.href = "dashboard.html";
            } else if (user && user.role && user.role.toLowerCase() === "admin") {
                window.location.href = "super_admin.html";
            } else {
                window.location.href = "doctor_dashboard.html";
            }
            return;
        } catch (e) {
            console.error("Error parsing existing user session:", e);
        }
    }

    const authForm = document.getElementById("authForm");
    const authToggle = document.getElementById("authToggle");
    const nameInput = document.getElementById("name");
    const roleSelect = document.getElementById("role");
    const patientFields = document.getElementById("patientFields");
    const submitBtn = document.getElementById("submitBtn");
    const formTitle = document.getElementById("formTitle");
    const toggleText = document.getElementById("toggleText");

    roleSelect.addEventListener("change", () => {
        if (isRegisterMode && roleSelect.value === "Patient") {
            patientFields.style.display = "block";
        } else {
            patientFields.style.display = "none";
        }
    });

    // Check if we are in Admin mode via query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminMode = urlParams.get("mode") === "admin";

    if (isAdminMode) {
        // Customize text for Admin Portal
        formTitle.textContent = "Healthcare Management System - Admin Portal";
        const mainTitle = document.getElementById("mainTitle");
        if (mainTitle) {
            mainTitle.textContent = "MediAI Admin";
            mainTitle.style.color = "#ef4444";
            mainTitle.style.textShadow = "0 0 10px rgba(239,68,68,0.5)";
        }

        // Hide registration options for Admin
        if (toggleText) {
            toggleText.style.display = "none";
        }

        // Apply Crimson Admin branding styles
        const loginBox = document.querySelector(".login-box");
        if (loginBox) {
            loginBox.style.borderColor = "rgba(239, 68, 68, 0.25)";
            loginBox.style.boxShadow = "0 0 25px rgba(239, 68, 68, 0.5)";
        }

        if (submitBtn) {
            submitBtn.style.background = "#ef4444";
            submitBtn.addEventListener("mouseenter", () => {
                submitBtn.style.boxShadow = "0 0 20px #ef4444";
            });
            submitBtn.addEventListener("mouseleave", () => {
                submitBtn.style.boxShadow = "none";
            });
        }
    }


    const showMessage = (msg, isError = false) => {
        formTitle.innerHTML = `<span style="color: ${isError ? '#ff4d4d' : '#2ecc71'}; font-weight: 500;">${msg}</span>`;
    };

    const toggleAuthMode = (register = null) => {
        isRegisterMode = (register !== null) ? register : !isRegisterMode;

        if (isRegisterMode) {
            nameInput.style.display = "block";
            nameInput.required = true;
            roleSelect.style.display = "block";
            submitBtn.textContent = "Register";
            formTitle.textContent = "Healthcare Management System - Register";
            authToggle.textContent = "Login";
            toggleText.firstChild.textContent = "Already have an account? ";
            
            if (roleSelect.value === "Patient") {
                patientFields.style.display = "block";
            } else {
                patientFields.style.display = "none";
            }
        } else {
            nameInput.style.display = "none";
            nameInput.required = false;
            roleSelect.style.display = "none";
            patientFields.style.display = "none";
            submitBtn.textContent = "Login";
            formTitle.textContent = "Healthcare Management System - Login";
            authToggle.textContent = "Register";
            toggleText.firstChild.textContent = "Don't have an account? ";
        }
    };

    // Toggle between Login and Register modes
    authToggle.addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    // Handle Form Submit
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (isRegisterMode) {
            const name = nameInput.value;
            const role = roleSelect.value;
            
            const payload = { name, email, password, role };
            if (role === "Patient") {
                const ageVal = document.getElementById("age").value;
                payload.age = ageVal ? parseInt(ageVal) : null;
                payload.gender = document.getElementById("gender").value || null;
                payload.phone_number = document.getElementById("phone").value || null;
                payload.address = document.getElementById("address").value || null;
                payload.emergency_contact = document.getElementById("emergencyContact").value || null;
            }
            
            try {
                showMessage("Registering account...", false);
                const response = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    showMessage("Registration successful! Please login.", false);
                    toggleAuthMode(false);
                } else {
                    const err = await response.json();
                    showMessage("Registration failed: " + (err.detail || "Unknown error"), true);
                }
            } catch (err) {
                console.error("Register error:", err);
                showMessage("Failed to connect to backend server.", true);
            }
        } else {
            // Login Mode
            try {
                showMessage("Authenticating...", false);
                const response = await fetch(`${API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Store user details and token in localStorage
                    localStorage.setItem("user", JSON.stringify(data.user));
                    if (data.token) {
                        localStorage.setItem("token", data.token);
                    }
                    
                    showMessage("Login successful! Redirecting...", false);
                    setTimeout(() => {
                        if (data.user && data.user.role && data.user.role.toLowerCase() === "patient") {
                            window.location.href = "dashboard.html";
                        } else if (data.user && data.user.role && data.user.role.toLowerCase() === "admin") {
                            window.location.href = "super_admin.html";
                        } else {
                            window.location.href = "doctor_dashboard.html";
                        }
                    }, 500);
                } else {
                    const err = await response.json();
                    showMessage("Login failed: " + (err.detail || "Invalid credentials"), true);
                }
            } catch (err) {
                console.error("Login error:", err);
                showMessage("Failed to connect to backend server.", true);
            }
        }
    });
});
