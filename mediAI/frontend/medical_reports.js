const API_URL = window.API_URL || "http://127.0.0.1:8002";

// Tab Switching Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabId === 'analyzer') {
        document.querySelector('button[onclick*="analyzer"]').classList.add('active');
        document.getElementById('tab-analyzer').classList.add('active');
    } else if (tabId === 'vault') {
        document.querySelector('button[onclick*="vault"]').classList.add('active');
        document.getElementById('tab-vault').classList.add('active');
        loadRecords(); // Reload records when switching to Vault tab
    }
}

// Show selected file name in upload boxes
function updateFileInfo(inputId, infoId) {
    const fileInput = document.getElementById(inputId);
    const infoDiv = document.getElementById(infoId);
    if (fileInput.files.length > 0) {
        infoDiv.textContent = `Selected: ${fileInput.files[0].name}`;
    } else {
        infoDiv.textContent = '';
    }
}

// AI Report Analysis function (updated aesthetics)
async function analyzeReport() {
    const fileInput = document.getElementById("reportFile");
    const resultDiv = document.getElementById("analysisResult");
    const contentDiv = document.getElementById("analysisContent");
    
    if (fileInput.files.length === 0) {
        showToast("Please select a report file to analyze", true);
        return;
    }
    
    const file = fileInput.files[0];
    resultDiv.style.display = "block";
    contentDiv.innerHTML = `<p style="color: #ff007f;"><i class="fa-solid fa-spinner fa-spin"></i> Status: AI is analyzing ${file.name}...</p>`;
    
    try {
        const response = await apiFetch(`/analyze-report?filename=${encodeURIComponent(file.name)}`, {
            method: "POST"
        });
        
        if (response.ok) {
            const data = await response.json();
            
            let findingsHtml = "<h3>Detected Findings:</h3>";
            for (const [key, value] of Object.entries(data.findings)) {
                findingsHtml += `<p><strong>${key}:</strong> ${value}</p>`;
            }
            
            contentDiv.innerHTML = `
                ${findingsHtml}
                <br>
                <h3>AI Risk Assessment:</h3>
                <p style="background: rgba(255,0,0,0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #ff4d4d;">
                    ${data.risk}
                </p>
                <br>
                <h3>Clinical Recommendations:</h3>
                <p>${data.recommendation}</p>
            `;
        } else {
            const err = await response.json();
            contentDiv.innerHTML = `<p style="color: #ff4d4d;">Error: ${err.detail || "Unable to analyze report"}</p>`;
        }
    } catch (error) {
        console.error("Error calling report analysis endpoint:", error);
        contentDiv.innerHTML = `<p style="color: #ff4d4d;">Failed to connect to the backend AI analysis engine.</p>`;
    }
}

// Load Medical Records Vault items
async function loadRecords() {
    const searchVal = document.getElementById("vaultSearch").value.trim();
    const table = document.getElementById("recordsTable");
    const list = document.getElementById("recordsList");
    const emptyState = document.getElementById("recordsEmptyState");

    let url = `/patients/me/records`;
    if (searchVal) {
        url += `?query=${encodeURIComponent(searchVal)}`;
    }

    try {
        const response = await apiFetch(url);
        if (response.ok) {
            const records = await response.json();
            list.innerHTML = "";

            if (records.length === 0) {
                table.style.display = "none";
                emptyState.style.display = "block";
                return;
            }

            table.style.display = "table";
            emptyState.style.display = "none";

            records.forEach(rec => {
                const tr = document.createElement("tr");
                
                // Format upload date
                let dateStr = "N/A";
                if (rec.uploaded_at) {
                    const d = new Date(rec.uploaded_at);
                    dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }

                // Extract filename for download
                const origFilename = rec.file_path.split("_").slice(3).join("_") || "record";

                tr.innerHTML = `
                    <td><span class="record-type-badge">${rec.record_type}</span></td>
                    <td>${rec.description}</td>
                    <td>${dateStr}</td>
                    <td class="actions-cell">
                        <button class="btn-icon download" onclick="downloadRecord(${rec.record_id}, '${origFilename}')" title="Download File">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteRecord(${rec.record_id})" title="Delete Record">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                `;
                list.appendChild(tr);
            });
        } else {
            showToast("Failed to fetch medical archive.", true);
        }
    } catch (e) {
        console.error("Error loading records:", e);
        showToast("Error connecting to records archive.", true);
    }
}

// Upload file to medical archive
async function uploadRecord(event) {
    event.preventDefault();

    const fileInput = document.getElementById("vaultFile");
    const typeSelect = document.getElementById("recordType");
    const descInput = document.getElementById("recordDescription");

    if (fileInput.files.length === 0) {
        showToast("Please choose a file to upload.", true);
        return;
    }

    const file = fileInput.files[0];
    const record_type = typeSelect.value;
    const description = descInput.value;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("record_type", record_type);
    formData.append("description", description);

    try {
        showToast("Uploading medical record...", false);
        const response = await apiFetch(`/patients/me/records`, {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            showToast("Medical record uploaded successfully!", false);
            // Clear inputs
            fileInput.value = "";
            typeSelect.value = "";
            descInput.value = "";
            // Reload archive list
            loadRecords();
        } else {
            const err = await response.json();
            showToast("Upload failed: " + (err.detail || "Unknown error"), true);
        }
    } catch (e) {
        console.error("Upload error:", e);
        showToast("Failed to upload record.", true);
    }
}

// Download file helper
async function downloadRecord(recordId, filename) {
    try {
        showToast("Starting download...", false);
        const response = await apiFetch(`/patients/me/records/${recordId}/download`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'medical_record';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast("Download complete!", false);
        } else {
            const err = await response.json();
            showToast("Download failed: " + (err.detail || "Unknown error"), true);
        }
    } catch (e) {
        console.error("Download error:", e);
        showToast("Failed to download file.", true);
    }
}

// Delete file helper
async function deleteRecord(recordId) {
    if (!confirm("Are you sure you want to permanently delete this medical record?")) {
        return;
    }

    try {
        showToast("Deleting record...", false);
        const response = await apiFetch(`/patients/me/records/${recordId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            showToast("Medical record deleted successfully!", false);
            loadRecords();
        } else {
            const err = await response.json();
            showToast("Delete failed: " + (err.detail || "Unknown error"), true);
        }
    } catch (e) {
        console.error("Delete error:", e);
        showToast("Failed to delete record.", true);
    }
}

// Self-contained Toast Notification function
function showToast(message, isError = false) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-msg ${isError ? 'error' : ''}`;
    toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${message}`;
    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s ease reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initial setup
document.addEventListener("DOMContentLoaded", () => {
    // If we are currently on the page, load records
    if (document.getElementById("vaultSearch")) {
        loadRecords();
    }
});
