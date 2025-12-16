FROM python:3.11-slim

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
RUN pip install fastapi uvicorn docker

# Copy service code
COPY main.py .

# Configure git
RUN git config --global user.email "git-service@nlp-lab.local" && \
    git config --global user.name "Git Service"

# Expose port
EXPOSE 8001

# Run service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
