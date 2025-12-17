from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from orchestrator import Orchestrator

# Configure standard library logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Request models
class MakePlanRequest(BaseModel):
    plan: str
    inputs: dict

# Initialize Orchestrator
orchestrator = Orchestrator()

# Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Work Orchestration API"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "work_api"}

@app.get("/config")
def get_config():
    return {
        "project_root": os.getenv("PROJECT_ROOT", ""),
        "ide_scheme": os.getenv("IDE_SCHEME", "vscode")
    }

# --- Plan Endpoints ---

@app.get("/plans")
def list_plans():
    return {"plans": orchestrator.list_plans()}

@app.post("/plans/create")
def create_plan(name: str):
    try:
        result = orchestrator.create_plan_stub(name)
        return {"status": "success", "message": f"Created plan: {result['name']}", **result}
    except ValueError as e:
         return {"status": "error", "message": str(e)}
    except FileExistsError as e:
         return {"status": "error", "message": str(e)}
    except Exception as e:
         logger.error(f"Plan create failed: {e}")
         return {"status": "error", "message": str(e)}

@app.post("/make-plan")
def make_plan_endpoint(request: MakePlanRequest):
    try:
        count = orchestrator.make_plan(request.plan, request.inputs)
        return {"message": f"Plan '{request.plan}' created", "planned_jobs": count, "status": "success"}
    except EnvironmentError as e:
        # Check if it is JSON error from check_git_clean
        try:
             import json
             detail = json.loads(str(e))
             raise HTTPException(status_code=400, detail=detail)
        except:
             raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Make plan failed: {e}")
        return {"message": str(e), "status": "error"}

@app.post("/flush-plan")
def flush_plan_endpoint():
    flushed = orchestrator.flush_plan()
    return {"message": "Plan flushed" if flushed else "No plan to flush", "status": "success"}

# --- Execution Endpoints ---

@app.post("/dispatch")
def dispatch_endpoint():
    try:
        count = orchestrator.dispatch_plan()
        return {"message": "Jobs dispatched", "queued_jobs": count, "status": "success"}
    except EnvironmentError as e:
        # Check if it is JSON error from check_git_clean
        try:
             import json
             detail = json.loads(str(e))
             raise HTTPException(status_code=400, detail=detail)
        except:
             raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Dispatch failed: {e}")
        return {"message": str(e), "status": "error"}

@app.get("/status")
def get_status():
    return orchestrator.get_status()

@app.post("/play")
def play_work():
    changed = orchestrator.play()
    return {
        "message": "Already playing" if not changed else "Work resumed",
        "status": "playing",
        "work_state": "playing",
        "changed": changed
    }

@app.post("/pause")
def pause_work():
    changed = orchestrator.pause()
    return {
        "message": "Already paused" if not changed else "Work paused",
        "status": "paused",
        "work_state": "paused",
        "changed": changed
    }

@app.post("/flush-queue")
def flush_queue_endpoint():
    count = orchestrator.flush_queue()
    return {"message": f"Flushed {count} jobs", "status": "success"}

# --- Results Endpoints ---

@app.get("/files")
def list_files():
    return orchestrator.list_files()

@app.post("/collect")
def collect_results(label: str = ""):
    try:
        result = orchestrator.collect_results(label, force=False)
        return {"status": "success", **result}
    except EnvironmentError:
         raise HTTPException(status_code=400, detail="Repository dirty")
    except Exception as e:
        return {"message": str(e), "status": "error"}

@app.post("/collect-force")
def collect_results_force(label: str = ""):
    try:
        result = orchestrator.collect_results(label, force=True)
        return {"status": "success", **result}
    except Exception as e:
        return {"message": str(e), "status": "error"}

@app.post("/collect-with-stash")
def collect_with_stash(label: str = ""):
    try:
        result = orchestrator.collect_with_stash(label)
        return {"status": "success", **result}
    except Exception as e:
        return {"message": str(e), "status": "error"}

@app.post("/reset")
def reset_endpoint():
    count = orchestrator.reset()
    return {"message": f"Reset {count} completed jobs", "status": "success"}
