const API_URL = window.API_URL || "http://127.0.0.1:8002";

document.addEventListener("DOMContentLoaded", async () => {
    // Session Auth Check
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        window.location.href = "index.html";
        return;
    }

    // Load past chat history
    await loadChatHistory();

    // Bind Enter key to user input
    const userInput = document.getElementById("userInput");
    if (userInput) {
        userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                sendMessage();
            }
        });
    }
});

// Load chatbot history from API
async function loadChatHistory() {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    try {
        const response = await apiFetch("/chatbot/history");
        if (response.ok) {
            const history = await response.json();
            
            // Keep greeting message but clear others
            chatBox.innerHTML = `
                <div class="bot-message">
                    Hello! I am MediAI. How can I help you today?
                </div>
            `;

            history.forEach(log => {
                if (log.user_message) {
                    chatBox.innerHTML += `<div class="user-message">${escapeHtml(log.user_message)}</div>`;
                }
                if (log.bot_response) {
                    chatBox.innerHTML += `<div class="bot-message">${escapeHtml(log.bot_response)}</div>`;
                }
            });

            // Scroll to bottom
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    } catch (e) {
        console.error("Failed to load chat history:", e);
    }
}

// Send message to chatbot API
async function sendMessage() {
    let input = document.getElementById("userInput");
    let message = input.value.trim();
    
    if (message === "") return;
    
    let chatBox = document.getElementById("chatBox");
    
    // Append user message
    chatBox.innerHTML += `<div class="user-message">${escapeHtml(message)}</div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Add temporary loading message
    let loadingId = "msg-" + Date.now();
    chatBox.innerHTML += `<div class="bot-message" id="${loadingId}">Typing...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    
    try {
        const response = await apiFetch(`/chatbot`, {
            method: "POST",
            body: JSON.stringify({ message: message })
        });
        
        let botText = "Error getting response from assistant.";
        if (response.ok) {
            const data = await response.json();
            botText = data.response;
        }
        
        // Replace loading message with actual response
        document.getElementById(loadingId).innerHTML = escapeHtml(botText);
    } catch (error) {
        console.error("Error communicating with chatbot API:", error);
        document.getElementById(loadingId).innerText = "Failed to connect to backend assistant.";
    }
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper to escape HTML tags to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
