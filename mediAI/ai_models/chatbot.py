import os
import json
import urllib.request
from dotenv import load_dotenv

def get_rule_based_response(message: str) -> str:
    message = message.lower()
    if "fever" in message or "cold" in message or "cough" in message:
        return "It sounds like you might have a common cold or respiratory infection. Rest, stay hydrated, and consult a doctor if symptoms persist."
    elif "chest pain" in message or "heart" in message:
        return "Chest pain can be a sign of a serious medical emergency. Please seek immediate emergency medical care."
    elif "headache" in message:
        return "Headaches can be caused by tension, dehydration, or stress. Make sure you drink water and rest. See a physician if the pain is severe or constant."
    elif "diabetes" in message or "sugar" in message:
        return "To manage blood sugar levels, monitor your carbohydrate intake, exercise regularly, and consult with an endocrinologist."
    else:
        return "Thank you for describing your symptoms. I recommend using the Disease Prediction module or scheduling an appointment with one of our specialized doctors for a professional diagnosis."

def check_and_exchange_management_key(api_key: str) -> str:
    if not api_key or not api_key.startswith("sk-or-v1-"):
        return api_key

    # Check key details
    url = "https://openrouter.ai/api/v1/auth/key"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            data = res_data.get("data", {})
            if data.get("is_management_key") or data.get("is_provisioning_key"):
                # Exchange management key for standard key
                print("Management key detected. Exchanging for a standard API key...")
                create_url = "https://openrouter.ai/api/v1/keys"
                create_headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                }
                payload = {
                    "name": "MediAI Chat Auto-Key"
                }
                create_req = urllib.request.Request(
                    create_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=create_headers,
                    method="POST"
                )
                with urllib.request.urlopen(create_req, timeout=5) as create_response:
                    create_data = json.loads(create_response.read().decode("utf-8"))
                    new_key = create_data.get("key")
                    if new_key:
                        print(f"Successfully generated new standard API key: {new_key[:12]}...")
                        # Save new key to DB settings
                        try:
                            from backend.database import get_db_connection
                        except ImportError:
                            import sys
                            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                            from backend.database import get_db_connection
                        
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        try:
                            cursor.execute(
                                "INSERT INTO settings (setting_key, setting_value) VALUES ('gemini_api_key', %s) ON DUPLICATE KEY UPDATE setting_value = %s",
                                (new_key, new_key)
                            )
                            conn.commit()
                            os.environ["GEMINI_API_KEY"] = new_key
                            print("Updated database settings with the new standard key.")
                        except Exception as db_err:
                            print(f"Error saving exchanged key to DB: {db_err}")
                        finally:
                            cursor.close()
                            conn.close()
                        return new_key
    except Exception as e:
        print(f"Could not verify or exchange management key: {e}")
    return api_key

def get_chatbot_response(message: str) -> str:
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and api_key.startswith("sk-or-v1-"):
        api_key = check_and_exchange_management_key(api_key)
        
    if not api_key:
        return get_rule_based_response(message) + "\n\n(Note: Gemini API key is not configured. Falling back to rule-based answers. Set GEMINI_API_KEY in the backend/.env file to activate Gemini AI Assistant.)"
        
    system_instruction = (
        "You are MediAI Assistant, a friendly and highly professional clinical AI assistant for MediAI Hospital. "
        "Your task is to help patients and doctors with medical queries, symptom analysis, and general health advice. "
        "Keep your response concise, clear, and reassuring. "
        "At the end of every response, you MUST include a short disclaimer that your guidance is for informational "
        "purposes only and does not replace a professional clinical diagnosis."
    )
    
    if api_key.startswith("sk-or-v1-"):
        url = "https://openrouter.ai/api/v1/chat/completions"
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": message}
            ],
            "max_tokens": 1000
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                choices = res_data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    if content:
                        return content
                return "Unexpected response format from OpenRouter API."
        except Exception as e:
            return f"Error contacting OpenRouter API: {str(e)}\n\n(Fallback to offline system): {get_rule_based_response(message)}"
            
    else:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": message}
                    ]
                }
            ],
            "systemInstruction": {
                "parts": [
                    {"text": system_instruction}
                ]
            }
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "I'm sorry, I could not generate a response.")
                return "Unexpected response format from Gemini API."
        except Exception as e:
            return f"Error contacting Gemini API: {str(e)}\n\n(Fallback to offline system): {get_rule_based_response(message)}"
