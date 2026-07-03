// Centralized configuration for MediAI Frontend
// Dynamically resolve backend API URL based on how the frontend is loaded
(function() {
    const DEFAULT_API = "http://127.0.0.1:8002";

    // 1. Check if an API override is passed via query parameter (e.g., ?api=https://my-backend.onrender.com)
    const urlParams = new URLSearchParams(window.location.search);
    const paramApi = urlParams.get('api');
    if (paramApi) {
        localStorage.setItem("API_URL_OVERRIDE", paramApi);
    }

    // 2. Check if there is an override in localStorage
    const savedApi = localStorage.getItem("API_URL_OVERRIDE");
    if (savedApi) {
        window.API_URL = savedApi;
        console.log("MediAI API URL (Override from Storage):", window.API_URL);
        return;
    }

    // 3. Dynamic Host Detection
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    const protocol = window.location.protocol;

    if (protocol === "file:") {
        window.API_URL = DEFAULT_API;
    } else if (hostname === "localhost" || hostname === "127.0.0.1") {
        if (window.location.port === "8002") {
            window.API_URL = origin;
        } else {
            window.API_URL = DEFAULT_API;
        }
    } else if (hostname.endsWith(".netlify.app")) {
        window.API_URL = "https://1ff931c13bfe51.lhr.life";
    } else {
        // If we are on Vercel (even with a custom domain), the backend is ALWAYS mounted at /api
        window.API_URL = "/api";
    }
    
    console.log("MediAI API URL dynamically configured to:", window.API_URL);
})();
