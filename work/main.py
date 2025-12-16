from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

# Configure standard library logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()


# Allow all origins for development ease, or specify ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Hello from Work API", "work_dir": os.getcwd()}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/start-work")
def start_work():
    logger.info("Work started triggered via API")
    return {"message": "Work started", "status": "active"}

@app.post("/play")
def play_work():
    logger.info("Work resumed/play triggered")
    return {"message": "Work resumed", "status": "active"}

@app.post("/pause")
def pause_work():
    logger.info("Work paused triggered")
    return {"message": "Work paused", "status": "paused"}

@app.post("/flush")
def flush_work():
    logger.info("Work flushed triggered")
    return {"message": "Work flushed", "status": "cleared"}



