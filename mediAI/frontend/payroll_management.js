const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", () => {
    // Set default year
    document.getElementById("payrollYear").value = new Date().getFullYear();
    
    // Set default month
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = months[new Date().getMonth()];
    document.getElementById("payrollMonth").value = currentMonth;

    loadEmployeesDropdown();
});

async function loadEmployeesDropdown() {
    try {
        const response = await fetch(`${API_URL}/api/employees?status=Active`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const data = await response.json();

        const select = document.getElementById("selectEmployee");
        select.innerHTML = '<option value="">Select Staff Member</option>';
        data.forEach(emp => {
            const opt = document.createElement("option");
            opt.value = emp.employee_id;
            opt.innerText = `${emp.full_name} (${emp.designation})`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load employees for payroll dropdown");
    }
}

async function onEmployeeSelect() {
    const empId = document.getElementById("selectEmployee").value;
    const placeholder = document.getElementById("historyPlaceholder");
    const tableContainer = document.getElementById("historyTableContainer");

    if (!empId) {
        placeholder.style.display = "block";
        tableContainer.style.display = "none";
        document.getElementById("basicSalary").value = "0.00";
        calculateNetSalary();
        return;
    }

    placeholder.style.display = "none";
    tableContainer.style.display = "block";

    try {
        // Fetch employee to get basic salary
        const response = await fetch(`${API_URL}/api/employees/${empId}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error();
        const emp = await response.json();
        
        document.getElementById("basicSalary").value = emp.salary || 0.0;
        calculateNetSalary();
        
        loadPayrollHistory(empId);
    } catch (e) {
        console.error("Failed to load employee basic salary");
    }
}

function calculateNetSalary() {
    const basic = parseFloat(document.getElementById("basicSalary").value) || 0.0;
    const allowances = parseFloat(document.getElementById("allowances").value) || 0.0;
    const deductions = parseFloat(document.getElementById("deductions").value) || 0.0;

    const net = basic + allowances - deductions;
    document.getElementById("netSalaryText").innerText = `₹${net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function loadPayrollHistory(empId) {
    const tbody = document.getElementById("historyTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:rgba(255,255,255,0.4);">Loading payslips...</td></tr>`;

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/payroll`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to load payroll history");
        const data = await response.json();

        tbody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(log => {
                const tr = document.createElement("tr");
                const badgeClass = log.status.toLowerCase() === 'paid' ? 'badge-paid' : 'badge-unpaid';
                
                const actionButton = log.status.toLowerCase() === 'unpaid' 
                    ? `<button onclick="releasePayment(${log.payroll_id})" class="btn btn-secondary btn-small" style="color:#2ecc71;" title="Release Payment"><i class="fa-solid fa-credit-card"></i> Pay Now</button>`
                    : `<span style="font-size:11px; color:rgba(255,255,255,0.45);">${log.payment_date || '-'}</span>`;

                tr.innerHTML = `
                    <td style="font-weight:500;">${log.month} ${log.year}</td>
                    <td>₹${parseFloat(log.basic_salary).toLocaleString('en-IN')}</td>
                    <td>₹${parseFloat(log.allowances).toLocaleString('en-IN')}</td>
                    <td>₹${parseFloat(log.deductions).toLocaleString('en-IN')}</td>
                    <td style="font-weight:600; color:#ff007f;">₹${parseFloat(log.net_salary).toLocaleString('en-IN')}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                    <td>${actionButton}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:rgba(255,255,255,0.4);">No historical payslips.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ff4d4d;">${err.message}</td></tr>`;
    }
}

async function releasePayment(payrollId) {
    if (!confirm("Are you sure you want to release salary and mark this payslip as Paid?")) {
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/employees/payroll/${payrollId}/pay`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            }
        });
        if (!response.ok) throw new Error("Failed to release salary");
        
        alert("Salary payment marked as released!");
        const empId = document.getElementById("selectEmployee").value;
        loadPayrollHistory(empId);
    } catch (e) {
        alert(e.message);
    }
}

async function submitPayroll(event) {
    event.preventDefault();
    const empId = document.getElementById("selectEmployee").value;

    const payrollData = {
        month: document.getElementById("payrollMonth").value,
        year: parseInt(document.getElementById("payrollYear").value),
        basic_salary: parseFloat(document.getElementById("basicSalary").value) || 0.0,
        allowances: parseFloat(document.getElementById("allowances").value) || 0.0,
        deductions: parseFloat(document.getElementById("deductions").value) || 0.0,
        status: document.getElementById("payrollStatus").value
    };

    try {
        const response = await fetch(`${API_URL}/api/employees/${empId}/payroll`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify(payrollData)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to save payroll details");
        }

        alert("Monthly payroll record saved successfully!");
        loadPayrollHistory(empId);

        // Reset inputs
        document.getElementById("allowances").value = "0.00";
        document.getElementById("deductions").value = "0.00";
        calculateNetSalary();

    } catch (err) {
        alert(err.message);
    }
}
