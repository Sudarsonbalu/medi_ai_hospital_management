// Authenticated API helper — load after config.js
(function () {
    const DEFAULT_API = "http://127.0.0.1:8002";

    function getApiUrl() {
        return window.API_URL || DEFAULT_API;
    }

    window.getAuthHeaders = function (extraHeaders = {}, includeJson = true) {
        const headers = { ...extraHeaders };
        if (includeJson && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }
        const token = localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    };

    window.apiFetch = async function (path, options = {}) {
        const url = path.startsWith("http") ? path : `${getApiUrl()}${path}`;
        const isFormData = options.body instanceof FormData;
        const headers = getAuthHeaders(options.headers || {}, !isFormData);
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            const page = window.location.pathname.split("/").pop();
            const publicPages = ["index.html", "login.html", "home.html", "admin_login.html", ""];
            if (!publicPages.includes(page)) {
                window.location.href = "index.html";
            }
        } else if (response.status === 403) {
            try {
                const data = await response.clone().json();
                const msg = data.detail || "Permission Denied: You do not have rights to perform this operation.";
                if (typeof window.showToast === "function") {
                    window.showToast(msg, true);
                } else {
                    alert(msg);
                }
            } catch (e) {
                if (typeof window.showToast === "function") {
                    window.showToast("Permission Denied: You do not have rights to perform this operation.", true);
                } else {
                    alert("Permission Denied: You do not have rights to perform this operation.");
                }
            }
        }
        return response;
    };
})();
