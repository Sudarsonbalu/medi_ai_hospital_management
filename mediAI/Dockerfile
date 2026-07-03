FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files and buffering output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy all source files
COPY backend /app/backend
COPY frontend /app/frontend
COPY ai_models /app/ai_models
COPY database /app/database

# Expose server port
EXPOSE 8000

# Run migrations and start uvicorn
CMD ["sh", "-c", "python /app/backend/migrate.py && uvicorn backend.app:app --host 0.0.0.0 --port 8000"]
