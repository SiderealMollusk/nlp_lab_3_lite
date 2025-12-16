from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from job import Job
import handlers

# Configure standard library logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# In-memory jobs dictionary
jobs = {}
# Task counter for sequential task numbers
task_counter = 0

# ============================================================
# CONFIGURATION: Select active handler
# ============================================================
ACTIVE_HANDLER = "plan"  # Options: "plan" or "handler2"
# ============================================================



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

@app.get("/jobs")
def get_jobs():
    return {"jobs": {guid: job.to_dict() for guid, job in jobs.items()}}


@app.post("/start-work")
def start_work():
    global task_counter
    logger.info("Work started triggered via API")
    
    # Hot-reload handlers module
    import importlib
    importlib.reload(handlers)
    
    # Select handler based on configuration
    handler_map = {
        "plan": handlers.plan_handler,
        "handler2": handlers.start_handler2
    }
    handler_func = handler_map.get(ACTIVE_HANDLER, handlers.plan_handler)
    job, task_counter = handler_func(jobs, task_counter)
    
    return {"message": "Work started", "status": "active", "job_guid": job.guid, "task_number": job.task_number}


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



