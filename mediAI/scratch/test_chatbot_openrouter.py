import urllib.request
import json
import time

def test_chatbot():
    print("Waiting for server to initialize...")
    time.sleep(3)
    
    print("Logging in to get authentication token...")
    login_url = "http://127.0.0.1:8002/login"
    login_payload = {
        "email": "patient@mediai.com",
        "password": "patient123"
    }
    
    try:
        req = urllib.request.Request(
            login_url,
            data=json.dumps(login_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            token = res_data["token"]
            print("Login successful! Token acquired.")
            
        print("Sending message to chatbot...")
        chatbot_url = "http://127.0.0.1:8002/chatbot"
        chatbot_payload = {
            "message": "Hello, I have a slight headache. What should I do?"
        }
        chatbot_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        req_chat = urllib.request.Request(
            chatbot_url,
            data=json.dumps(chatbot_payload).encode("utf-8"),
            headers=chatbot_headers,
            method="POST"
        )
        with urllib.request.urlopen(req_chat, timeout=15) as response_chat:
            chat_data = json.loads(response_chat.read().decode("utf-8"))
            print("\nChatbot Response:")
            print("-" * 50)
            print(chat_data)
            print("-" * 50)
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    test_chatbot()
