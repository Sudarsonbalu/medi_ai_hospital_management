const API_URL = window.API_URL || "http://127.0.0.1:8002";

// If loaded inside an iframe (e.g. nested in Super Admin Panel), override layouts to merge seamlessly
if (window.self !== window.top) {
    const iframeStyle = document.createElement("style");
    iframeStyle.textContent = `
        .sidebar { display: none !important; }
        .main { margin-left: 0 !important; width: 100% !important; padding: 20px !important; }
        .ai-fab { display: none !important; }
        .back-btn { display: none !important; }
    `;
    document.head.appendChild(iframeStyle);
}

document.addEventListener("DOMContentLoaded", () => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    const currentPage = window.location.pathname.split("/").pop();

    // Pages that do not require authentication
    const publicPages = ["login.html", "index.html", "home.html", "admin_login.html", ""];

    if ((!userStr || !token) && !publicPages.includes(currentPage)) {
        window.location.href = "index.html";
        return;
    }

    let user = null;
    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error("Error parsing user session:", e);
            localStorage.removeItem("user");
            window.location.href = "index.html";
            return;
        }
    }

    // Role protection checks
    if (user && user.role) {
        const role = user.role.toLowerCase();
        const restrictedToStaff = ["patient_management.html", "pharmacy_management.html", "laboratory_management.html"];
        if (role === "patient" && restrictedToStaff.includes(currentPage)) {
            window.location.href = "dashboard.html";
            return;
        }
    }

    // Inject "Back to Dashboard" button on sub-pages
    const subPages = [
        "disease_prediction.html",
        "medical_reports.html",
        "doctor_management.html",
        "appointment.html",
        "chatbot.html",
        "patient_management.html",
        "pharmacy_management.html",
        "laboratory_management.html",
        "emergency.html",
        "employee_dashboard.html",
        "employee_list.html",
        "employee_add.html",
        "employee_edit.html",
        "employee_profile.html",
        "attendance_management.html",
        "leave_management.html",
        "shift_management.html",
        "payroll_management.html",
        "performance_management.html",
        "notifications.html"
    ];

    if (subPages.includes(currentPage) && user && window.self === window.top) {
        const backBtn = document.createElement("button");
        backBtn.innerText = "← Back to Dashboard";
        backBtn.style.position = "fixed";
        backBtn.style.top = "15px";
        backBtn.style.left = "15px";
        backBtn.style.padding = "8px 16px";
        backBtn.style.background = "#ff007f";
        backBtn.style.color = "black";
        backBtn.style.border = "none";
        backBtn.style.borderRadius = "4px";
        backBtn.style.cursor = "pointer";
        backBtn.style.zIndex = "1000";
        backBtn.style.fontWeight = "bold";
        backBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";

        backBtn.style.fontFamily = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        backBtn.addEventListener("click", () => {
            if (user && user.role && user.role.toLowerCase() === "patient") {
                window.location.href = "dashboard.html";
            } else if (user && user.role && user.role.toLowerCase() === "admin") {
                window.location.href = "super_admin.html";
            } else {
                window.location.href = "doctor_dashboard.html";
            }
        });

        document.body.appendChild(backBtn);
        // Add padding to body to prevent button overlap
        document.body.style.paddingTop = "50px";
    }

    // Dynamic Sidebar & Brand Overhaul based on User Role
    const sidebarList = document.querySelector(".sidebar ul");
    if (sidebarList && user && user.role) {
        const role = user.role.toLowerCase();
        
        // Brand Title Update
        const brandTitle = document.querySelector(".sidebar .brand h2");
        if (brandTitle) {
            if (role === "patient") {
                brandTitle.textContent = "MediAI";
            } else if (role === "admin") {
                brandTitle.textContent = "MediAI Admin";
            } else {
                brandTitle.textContent = "MediAI Doctor";
            }
        }

        const patientMenu = [
            { text: "Dashboard", icon: "fa-solid fa-house" },
            { text: "Emergency Booking", icon: "fa-solid fa-truck-medical" },
            { text: "Disease Prediction", icon: "fa-solid fa-heart-pulse" },
            { text: "Medical Reports", icon: "fa-solid fa-file-medical" },
            { text: "Doctors", icon: "fa-solid fa-user-doctor" },
            { text: "Appointments", icon: "fa-solid fa-calendar-check" },
            { text: "AI Assistant", icon: "fa-solid fa-robot" },
            { text: "Logout", icon: "fa-solid fa-right-from-bracket" }
        ];

        const doctorMenu = [
            { text: "Dashboard", icon: "fa-solid fa-house" },
            { text: "Emergency Booking", icon: "fa-solid fa-truck-medical" },
            { text: "Appointments", icon: "fa-solid fa-calendar-check" },
            { text: "Patients", icon: "fa-solid fa-hospital-user" },
            { text: "Reports", icon: "fa-solid fa-file-medical" },
            { text: "Prescriptions", icon: "fa-solid fa-prescription-bottle-medical" },
            { text: "Laboratory", icon: "fa-solid fa-flask" },
            { text: "AI Assistant", icon: "fa-solid fa-robot" },
            { text: "Logout", icon: "fa-solid fa-right-from-bracket" }
        ];

        const adminMenu = [
            { text: "Dashboard", icon: "fa-solid fa-house" },
            { text: "Employees", icon: "fa-solid fa-user-tie" },
            { text: "Admin Analytics", icon: "fa-solid fa-chart-line" },
            { text: "Emergency Booking", icon: "fa-solid fa-truck-medical" },
            { text: "Appointments", icon: "fa-solid fa-calendar-check" },
            { text: "Patients", icon: "fa-solid fa-hospital-user" },
            { text: "Doctors", icon: "fa-solid fa-user-doctor" },
            { text: "Reports", icon: "fa-solid fa-file-medical" },
            { text: "Prescriptions", icon: "fa-solid fa-prescription-bottle-medical" },
            { text: "Laboratory", icon: "fa-solid fa-flask" },
            { text: "AI Assistant", icon: "fa-solid fa-robot" },
            { text: "Logout", icon: "fa-solid fa-right-from-bracket" }
        ];

        let menuItems = [];
        if (role === "patient") {
            menuItems = patientMenu;
        } else if (role === "admin") {
            menuItems = adminMenu;
        } else {
            menuItems = doctorMenu;
        }

        sidebarList.innerHTML = "";
        menuItems.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `<i class="${item.icon}"></i> ${item.text}`;
            
            const textLower = item.text.toLowerCase();
            let isActive = false;
            if (textLower === "dashboard") {
                isActive = (currentPage === "dashboard.html" || currentPage === "doctor_dashboard.html");
            } else if (textLower === "employees") {
                isActive = (currentPage.startsWith("employee_") || currentPage === "attendance_management.html" || currentPage === "leave_management.html" || currentPage === "shift_management.html" || currentPage === "payroll_management.html" || currentPage === "performance_management.html" || currentPage === "notifications.html");
            } else if (textLower === "admin analytics") {
                isActive = (currentPage === "admin_analytics.html");
            } else if (textLower === "emergency booking") {
                isActive = (currentPage === "emergency.html");
            } else if (textLower === "disease prediction") {
                isActive = (currentPage === "disease_prediction.html");
            } else if (textLower === "medical reports" || textLower === "reports") {
                isActive = (currentPage === "medical_reports.html");
            } else if (textLower === "doctors") {
                isActive = (currentPage === "doctor_management.html");
            } else if (textLower === "appointments") {
                isActive = (currentPage === "appointment.html");
            } else if (textLower === "patients") {
                isActive = (currentPage === "patient_management.html");
            } else if (textLower === "prescriptions") {
                isActive = (currentPage === "pharmacy_management.html");
            } else if (textLower === "laboratory") {
                isActive = (currentPage === "laboratory_management.html");
            } else if (textLower === "ai assistant") {
                isActive = (currentPage === "chatbot.html");
            }

            if (isActive) {
                li.classList.add("active");
            }
            sidebarList.appendChild(li);
        });

        // Inject Developer Credit at the bottom of the sidebar
        const sidebar = document.querySelector(".sidebar");
        if (sidebar && !sidebar.querySelector(".sidebar-credit")) {
            const creditDiv = document.createElement("div");
            creditDiv.className = "sidebar-credit";
            creditDiv.style.marginTop = "auto";
            creditDiv.style.paddingTop = "15px";
            creditDiv.style.borderTop = "1px solid rgba(255, 255, 255, 0.05)";
            creditDiv.style.textAlign = "center";
            creditDiv.style.fontSize = "12px";
            creditDiv.style.color = "rgba(255, 255, 255, 0.45)";
            creditDiv.style.fontFamily = "'Poppins', sans-serif";
            creditDiv.innerHTML = `
                Developed by <br><span style="color: #ff007f; font-weight: 600; text-shadow: 0 0 5px rgba(255, 0, 127, 0.3);">Sudarson, B.Tech AI & DS</span>
                <div style="margin-top: 8px; display: flex; justify-content: center; gap: 12px; font-size: 14px;">
                    <a href="mailto:sudarsonbalu@gmail.com" title="sudarsonbalu@gmail.com" style="color: rgba(255, 255, 255, 0.5); text-decoration: none; transition: 0.3s;"><i class="fa-solid fa-envelope"></i></a>
                    <a href="tel:9361138890" title="+91 9361138890" style="color: rgba(255, 255, 255, 0.5); text-decoration: none; transition: 0.3s;"><i class="fa-solid fa-phone"></i></a>
                    <a href="https://www.linkedin.com/in/sudarson-balu-8110a1308" target="_blank" title="LinkedIn" style="color: rgba(255, 255, 255, 0.5); text-decoration: none; transition: 0.3s;"><i class="fa-brands fa-linkedin"></i></a>
                    <a href="https://github.com/Sudarsonbalu" target="_blank" title="GitHub" style="color: rgba(255, 255, 255, 0.5); text-decoration: none; transition: 0.3s;"><i class="fa-brands fa-github"></i></a>
                </div>
            `;
            sidebar.appendChild(creditDiv);
        }
    }

    // Wire up sidebar navigation click handlers
    const sidebarItems = document.querySelectorAll(".sidebar ul li");
    sidebarItems.forEach(item => {

        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
            const itemText = item.textContent.trim().toLowerCase();
            
            if (user && user.role && user.role.toLowerCase() === "admin") {
                if (itemText.includes("logout")) {
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    window.location.href = "index.html";
                    return;
                } else if (itemText.includes("employees") || itemText.includes("dashboard")) {
                    // Allow navigation for employees and dashboard
                } else {
                    return;
                }
            }
            
            if (itemText.includes("dashboard")) {
                if (user && user.role && user.role.toLowerCase() === "patient") {
                    window.location.href = "dashboard.html";
                } else if (user && user.role && user.role.toLowerCase() === "admin") {
                    window.location.href = "super_admin.html";
                } else {
                    window.location.href = "doctor_dashboard.html";
                }
            } else if (itemText.includes("employees")) {
                window.location.href = "employee_dashboard.html";
            } else if (itemText.includes("disease prediction")) {
                window.location.href = "disease_prediction.html";
            } else if (itemText.includes("medical reports") || itemText.includes("reports")) {
                window.location.href = "medical_reports.html";
            } else if (itemText.includes("doctors")) {
                window.location.href = "doctor_management.html";
            } else if (itemText.includes("appointments")) {
                window.location.href = "appointment.html";
            } else if (itemText.includes("admin analytics") || itemText.includes("analytics")) {
                window.location.href = "super_admin.html";
            } else if (itemText.includes("emergency")) {
                window.location.href = "emergency.html";
            } else if (itemText.includes("ai assistant") || itemText.includes("assistant")) {
                window.location.href = "chatbot.html";
            } else if (itemText.includes("patients")) {
                window.location.href = "patient_management.html";
            } else if (itemText.includes("prescriptions") || itemText.includes("pharmacy")) {
                window.location.href = "pharmacy_management.html";
            } else if (itemText.includes("laboratory") || itemText.includes("lab")) {
                window.location.href = "laboratory_management.html";
            } else if (itemText.includes("logout")) {
                localStorage.removeItem("user");
                window.location.href = "index.html";
            }
        });
    });

    // Initialize custom dropdown select components
    injectCustomSelectStyles();
    initCustomSelects();

    // Auto-decorate any selects created dynamically in the future
    const bodyObserver = new MutationObserver(() => {
        initCustomSelects();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
});

// --- CUSTOM SELECT DECORATOR MODULE ---
function initCustomSelects() {
    const selects = document.querySelectorAll("select");
    selects.forEach(select => {
        if (select.dataset.customized || select.style.display === "none") return;
        select.dataset.customized = "true";

        // Create container and hide original select
        const container = document.createElement("div");
        container.className = "custom-select-container";
        select.parentNode.insertBefore(container, select);
        container.appendChild(select);
        select.style.display = "none"; // Hide original select

        // Create trigger (header)
        const trigger = document.createElement("div");
        trigger.className = "custom-select-trigger";
        trigger.innerHTML = `<span>Select Option</span><i class="fa-solid fa-chevron-down" style="color:#ff007f; transition: transform 0.3s; font-size:12px;"></i>`;
        container.appendChild(trigger);

        // Create options list
        const optionsContainer = document.createElement("div");
        optionsContainer.className = "custom-select-options";
        container.appendChild(optionsContainer);

        // Toggle dropdown open state
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close other open custom select dropdowns
            document.querySelectorAll(".custom-select-container").forEach(c => {
                if (c !== container) c.classList.remove("open");
            });
            container.classList.toggle("open");
            const icon = trigger.querySelector("i");
            if (container.classList.contains("open")) {
                icon.style.transform = "rotate(180deg)";
            } else {
                icon.style.transform = "rotate(0deg)";
            }
        });

        // Rebuild options list based on native select's options
        const rebuildOptions = () => {
            optionsContainer.innerHTML = "";
            const nativeOptions = select.options;
            
            // Sync trigger text
            const selectedOpt = select.options[select.selectedIndex];
            trigger.querySelector("span").innerText = selectedOpt ? selectedOpt.text : "Select Option";

            Array.from(nativeOptions).forEach((opt, idx) => {
                const customOpt = document.createElement("div");
                customOpt.className = "custom-option";
                if (opt.selected) {
                    customOpt.classList.add("selected");
                }
                customOpt.innerText = opt.text;
                customOpt.dataset.value = opt.value;
                customOpt.dataset.index = idx;

                customOpt.addEventListener("click", (e) => {
                    e.stopPropagation();
                    
                    // Update native select
                    select.selectedIndex = idx;
                    
                    // Dispatch change & input events
                    select.dispatchEvent(new Event("change", { bubbles: true }));
                    select.dispatchEvent(new Event("input", { bubbles: true }));

                    // Update UI
                    trigger.querySelector("span").innerText = opt.text;
                    container.classList.remove("open");
                    trigger.querySelector("i").style.transform = "rotate(0deg)";

                    optionsContainer.querySelectorAll(".custom-option").forEach(o => o.classList.remove("selected"));
                    customOpt.classList.add("selected");
                });

                optionsContainer.appendChild(customOpt);
            });
        };

        // Run initial build
        rebuildOptions();

        // Listen to programmatic changes using Object.defineProperty on the select instance
        const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        Object.defineProperty(select, 'value', {
            set: function(val) {
                originalValueSetter.call(this, val);
                // Re-sync selection state
                const selectedOpt = select.options[select.selectedIndex];
                trigger.querySelector("span").innerText = selectedOpt ? selectedOpt.text : "Select Option";
                optionsContainer.querySelectorAll(".custom-option").forEach(o => {
                    if (o.dataset.value === String(val)) {
                        o.classList.add("selected");
                    } else {
                        o.classList.remove("selected");
                    }
                });
            },
            get: function() {
                return Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').get.call(this);
            },
            configurable: true
        });

        // Also define property setter on selectedIndex
        const originalIndexSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex').set;
        Object.defineProperty(select, 'selectedIndex', {
            set: function(idx) {
                originalIndexSetter.call(this, idx);
                const selectedOpt = select.options[idx];
                trigger.querySelector("span").innerText = selectedOpt ? selectedOpt.text : "Select Option";
                optionsContainer.querySelectorAll(".custom-option").forEach(o => {
                    if (parseInt(o.dataset.index) === idx) {
                        o.classList.add("selected");
                    } else {
                        o.classList.remove("selected");
                    }
                });
            },
            get: function() {
                return Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex').get.call(this);
            },
            configurable: true
        });

        // Observe options changes (MutationObserver)
        const observer = new MutationObserver(() => {
            rebuildOptions();
        });
        observer.observe(select, { childList: true, subtree: true });
    });
}

function injectCustomSelectStyles() {
    if (document.getElementById("custom-select-styles")) return;
    const style = document.createElement("style");
    style.id = "custom-select-styles";
    style.textContent = `
        .custom-select-container {
            position: relative;
            width: 100%;
            cursor: pointer;
            user-select: none;
            margin-bottom: 2px;
        }
        .custom-select-trigger {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
            min-height: 45px;
        }
        .custom-select-container:hover .custom-select-trigger {
            border-color: rgba(255, 0, 127, 0.4);
            box-shadow: 0 0 8px rgba(255, 0, 127, 0.15);
        }
        .custom-select-container.open .custom-select-trigger {
            border-color: #ff007f;
            box-shadow: 0 0 10px rgba(255, 0, 127, 0.2);
        }
        .custom-select-options {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            width: 100%;
            background: #1a0f16;
            border: 1px solid rgba(255, 0, 127, 0.3);
            border-radius: 8px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 0, 127, 0.15);
            z-index: 9999;
            max-height: 220px;
            overflow-y: auto;
            display: none;
            animation: customSelectFadeIn 0.2s ease;
        }
        .custom-select-container.open .custom-select-options {
            display: block;
        }
        .custom-option {
            padding: 11px 16px;
            color: rgba(255, 255, 255, 0.85);
            font-size: 14px;
            transition: all 0.2s ease;
            text-align: left;
        }
        .custom-option:hover {
            background: rgba(255, 0, 127, 0.15);
            color: white;
        }
        .custom-option.selected {
            background: #ff007f;
            color: black;
            font-weight: 600;
        }
        @keyframes customSelectFadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// Global click listener to close dropdowns when clicking outside
document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select-container").forEach(c => {
        c.classList.remove("open");
        const icon = c.querySelector(".custom-select-trigger i");
        if (icon) icon.style.transform = "rotate(0deg)";
    });
});
