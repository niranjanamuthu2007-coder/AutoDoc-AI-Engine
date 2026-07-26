# ==========================================
# AutoDoc AI Engine - Backend Dockerfile
# ==========================================

FROM python:3.13-slim

# Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Working Directory
WORKDIR /app

# Install System Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Requirements File
COPY requirements.txt .

# Install Python Dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy Project Files
COPY . .

# Create Required Directories
RUN mkdir -p uploads reports temporary

# Expose FastAPI Port
EXPOSE 8000

# Default Environment Variables
ENV DATABASE_URL=sqlite:///./autodoc.db

# Start FastAPI Application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]