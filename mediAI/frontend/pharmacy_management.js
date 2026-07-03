const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", fetchMedicines);

async function fetchMedicines() {
    try {
        const response = await apiFetch(`/medicines`);
        const medicines = await response.json();
        
        const table = document.getElementById("medicineTable");
        
        // Clear all rows except the header
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
        
        medicines.forEach(med => {
            const row = table.insertRow();
            row.insertCell(0).innerHTML = med.name;
            row.insertCell(1).innerHTML = med.quantity;
            row.insertCell(2).innerHTML = `₹${parseFloat(med.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            
            // Actions
            const actionsCell = row.insertCell(3);
            actionsCell.innerHTML = `
                <button class="action-btn btn-edit" onclick="openEditModal(${med.medicine_id}, '${med.name.replace(/'/g, "\\'")}', ${med.quantity}, ${med.price})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteMedicine(${med.medicine_id})">Delete</button>
            `;
        });
    } catch (error) {
        console.error("Error fetching medicines:", error);
    }
}

function openEditModal(id, name, qty, price) {
    document.getElementById("editMedicineId").value = id;
    document.getElementById("editMedicineName").value = name;
    document.getElementById("editMedicineQty").value = qty;
    document.getElementById("editMedicinePrice").value = price;
    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function saveMedicineEdit() {
    const id = document.getElementById("editMedicineId").value;
    const name = document.getElementById("editMedicineName").value.trim();
    const qty = parseInt(document.getElementById("editMedicineQty").value);
    const price = parseFloat(document.getElementById("editMedicinePrice").value);

    if (!name || isNaN(qty) || isNaN(price)) {
        showToast("Please fill all fields with valid numbers", true);
        return;
    }

    try {
        const response = await apiFetch(`/medicines/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, quantity: qty, price })
        });

        if (response.ok) {
            showToast("Medicine Updated Successfully", false);
            closeEditModal();
            fetchMedicines();
        } else {
            showToast("Error updating medicine details", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function deleteMedicine(id) {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    try {
        const response = await apiFetch(`/medicines/${id}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Medicine Deleted Successfully", false);
            fetchMedicines();
        } else {
            showToast("Error deleting medicine", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to connect to backend", true);
    }
}

async function addMedicine() {
    const name = document.getElementById("medicineName").value;
    const qty = parseInt(document.getElementById("medicineQty").value);
    const price = parseFloat(document.getElementById("medicinePrice").value);
    
    if (name === "" || isNaN(qty) || isNaN(price)) {
        showToast("Please fill all fields with valid numbers", true);
        return;
    }
    
    try {
        const response = await apiFetch(`/medicines`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, quantity: qty, price })
        });
        
        if (response.ok) {
            showToast("Medicine Added Successfully", false);
            document.getElementById("medicineName").value = "";
            document.getElementById("medicineQty").value = "";
            document.getElementById("medicinePrice").value = "";
            fetchMedicines();
        } else {
            const errData = await response.json();
            showToast("Error adding medicine: " + (errData.detail || "Unknown error"), true);
        }
    } catch (error) {
        console.error("Error adding medicine:", error);
        showToast("Failed to connect to backend server.", true);
    }
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
    toast.style.fontFamily = "system-ui, sans-serif";
    toast.style.transition = "opacity 0.5s ease";
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}
