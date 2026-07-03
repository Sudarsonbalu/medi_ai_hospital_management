let allUsers = [];

document.addEventListener("DOMContentLoaded", () => {
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userStr || !token) {
        window.location.href = "index.html";
        return;
    }
    try {
        const currentUser = JSON.parse(userStr);
        if (!currentUser.role || currentUser.role.toLowerCase() !== "admin") {
            if (currentUser.role && currentUser.role.toLowerCase() === "patient") {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "doctor_dashboard.html";
            }
            return;
        }
    } catch (e) {
        console.error("Session parse error:", e);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "index.html";
        return;
    }

    fetchUsers();
});

async function fetchUsers() {
    try {
        const response = await apiFetch(`/admin/users`);
        if (!response.ok) {
            throw new Error("Failed to fetch users");
        }
        allUsers = await response.json();
        renderUsers(allUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        showToast("Failed to load user accounts.", true);
    }
}

function renderUsers(usersList) {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";
    
    if (usersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: rgba(255,255,255,0.4);">No user accounts found.</td></tr>`;
        return;
    }
    
    usersList.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${u.user_id}</code></td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><span class="role-badge role-${u.role.toLowerCase()}">${u.role}</span></td>
            <td>
                <button class="action-btn btn-edit" onclick="openEditModal(${u.user_id}, '${u.name.replace(/'/g, "\\'")}', '${u.email.replace(/'/g, "\\'")}', '${u.role}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button class="action-btn btn-delete" onclick="deleteUser(${u.user_id})"><i class="fa-solid fa-trash"></i> Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addUser() {
    const name = document.getElementById("addName").value.trim();
    const email = document.getElementById("addEmail").value.trim();
    const password = document.getElementById("addPassword").value;
    const role = document.getElementById("addRole").value;

    if (!name || !email || !password || !role) {
        showToast("Please fill all account details", true);
        return;
    }

    try {
        const response = await apiFetch(`/admin/users`, {
            method: "POST",
            body: JSON.stringify({ name, email, password, role })
        });

        if (response.ok) {
            showToast("Account Created Successfully!", false);
            document.getElementById("addName").value = "";
            document.getElementById("addEmail").value = "";
            document.getElementById("addPassword").value = "";
            fetchUsers();
        } else {
            const err = await response.json();
            showToast(err.detail || "Account creation failed.", true);
        }
    } catch (error) {
        console.error("Error adding user:", error);
        showToast("Error connecting to backend.", true);
    }
}

function openEditModal(id, name, email, role) {
    document.getElementById("editUserId").value = id;
    document.getElementById("editName").value = name;
    document.getElementById("editEmail").value = email;
    document.getElementById("editRole").value = role;
    document.getElementById("editPassword").value = "";
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function saveUserEdit() {
    const id = document.getElementById("editUserId").value;
    const name = document.getElementById("editName").value.trim();
    const email = document.getElementById("editEmail").value.trim();
    const role = document.getElementById("editRole").value;
    const password = document.getElementById("editPassword").value;

    if (!name || !email || !role) {
        showToast("Name, Email and Role are required.", true);
        return;
    }

    const payload = { name, email, role };
    if (password) {
        payload.password = password;
    }

    try {
        const response = await apiFetch(`/admin/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast("User details updated successfully!", false);
            closeEditModal();
            fetchUsers();
        } else {
            const err = await response.json();
            showToast(err.detail || "Failed to update user.", true);
        }
    } catch (error) {
        console.error("Error editing user:", error);
        showToast("Error connecting to backend.", true);
    }
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to permanently delete this user login account?")) {
        return;
    }

    try {
        const response = await apiFetch(`/admin/users/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("User login account deleted.", false);
            fetchUsers();
        } else {
            const err = await response.json();
            showToast(err.detail || "Failed to delete account.", true);
        }
    } catch (error) {
        console.error("Error deleting user:", error);
        showToast("Error connecting to backend.", true);
    }
}

function filterUsers() {
    const query = document.getElementById("searchFilter").value.toLowerCase();
    const filtered = allUsers.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query) || 
        u.role.toLowerCase().includes(query)
    );
    renderUsers(filtered);
}

function showToast(message, isError = false) {
    let toast = document.createElement("div");
    toast.innerText = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.padding = "12px 24px";
    toast.style.background = isError ? "#ff4d4d" : "#2ecc71";
    toast.style.color = "white";
    toast.style.borderRadius = "4px";
    toast.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
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
