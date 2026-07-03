# MediAI

MediAI is an AI-powered healthcare assistant designed to support symptom checking, medical report analysis, patient/doctor management, pharmacy inventory, and lab booking.

## Project Structure

- `frontend/` - Static HTML, CSS, and JS files for client dashboards and forms.
- `backend/` - FastAPI backend application serving REST APIs and managing database access.
- `database/` - MySQL schema definition (`schema.sql`).
- `ai_models/` - Medical classification, analysis, and conversational AI services.

## Installation

### Prerequisites
- Python 3.8+
- MySQL Server

### Setup
1. Set up the database by running `database/schema.sql` in your MySQL server.
2. Configure credentials in `backend/.env`.
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Start the backend:
   ```bash
   cd backend
   uvicorn app:app --reload
   ```
5. Open any frontend HTML file in a web browser.
