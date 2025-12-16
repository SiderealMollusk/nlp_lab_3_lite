from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import logging
import requests
from job import Job
import handlers
from work_manager import WorkManager

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

# Initialize WorkManager
work_manager = WorkManager(worker_count=1)

# Task counter for sequential task numbers
task_counter = 0

# ============================================================
# CONFIGURATION: Select active handler
# ============================================================
ACTIVE_HANDLER = "plan"  # Options: "plan" or "handler2"
# ============================================================

# Git service URL
GIT_SERVICE_URL = os.getenv("GIT_SERVICE_URL", "http://git_service:8001")


def check_git_clean():
    """Check if git repo is clean. Raises HTTPException if dirty."""
    try:
        response = requests.get(f"{GIT_SERVICE_URL}/git/status", timeout=2)
        response.raise_for_status()
        status = response.json()
        
        if not status["is_clean"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Repository has uncommitted changes",
                    "uncommitted_files": status["uncommitted_files"],
                    "message": "Commit your changes before running work"
                }
            )
        
        return status["current_commit"]
    except requests.RequestException as e:
        logger.warning(f"Could not reach git service: {e}")
        # Don't block if git service is down (development mode)
        return None



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


@app.get("/plans")
def list_plans():
    """List available plan modules with their signatures."""
    import os
    import importlib
    
    plans_dir = '/app/plans'
    available_plans = []
    
    # Find all .py files in plans directory
    for filename in os.listdir(plans_dir):
        if filename.endswith('.py') and not filename.startswith('__'):
            plan_id = filename[:-3]  # Remove .py
            
            try:
                # Import the plan module
                plan_module = importlib.import_module(f'plans.{plan_id}')
                
                # Get signature
                if hasattr(plan_module, 'get_signature'):
                    sig = plan_module.get_signature()
                    sig['id'] = plan_id
                    available_plans.append(sig)
            except Exception as e:
                logger.error(f"Error loading plan {plan_id}: {e}")
    
    return {"plans": available_plans}


@app.get("/files")
def list_files():
    """List available corpus files and analysis directories."""
    import os
    
    files = {
        "corpus": [],
        "analysis_dirs": []
    }
    
    # List corpus files
    corpus_dir = '/app/data/corpora'
    if os.path.exists(corpus_dir):
        for filename in os.listdir(corpus_dir):
            if filename.endswith('.jsonl'):
                files["corpus"].append({
                    "name": filename,
                    "path": f"/app/data/corpora/{filename}"
                })
    
    # List analysis directories
    analysis_base = '/app/data/analysis'
    if os.path.exists(analysis_base):
        for dirname in os.listdir(analysis_base):
            dir_path = os.path.join(analysis_base, dirname)
            if os.path.isdir(dir_path):
                files["analysis_dirs"].append({
                    "name": dirname,
                    "path": f"analysis/{dirname}"
                })
    
    return files


@app.get("/status")
def get_status():
    import workflow
    status = work_manager.get_status()
    
    # Get current plan metadata if exists
    current_plan = getattr(work_manager, 'current_plan_metadata', None)
    
    return {
        "work_state": "playing" if status["is_playing"] else "paused",
        "planned_jobs": workflow.count_planned_jobs(),
        "queued_jobs": status["pending_jobs"],
        "outstanding_jobs": status["outstanding_jobs"],
        "completed_jobs": status["completed_jobs"],
        "idle_workers": status["idle_workers"],
        "tasked_workers": status["tasked_workers"],
        "task_counter": task_counter,
        "current_plan": current_plan
    }


@app.post("/make-plan")
def make_plan_endpoint(request: MakePlanRequest):
    """
    Create a work plan using specified plan module.
    Requires clean git repository.
    
    Args:
        request: MakePlanRequest with plan ID and inputs dict
    """
    import workflow
    import importlib
    
    # Check git is clean
    commit_info = check_git_clean()
    
    try:
        # Load the plan module
        plan_module = importlib.import_module(f'plans.{request.plan}')
        importlib.reload(plan_module)  # Hot-reload for development
        
        # Get the execute function and signature
        if not hasattr(plan_module, 'execute'):
            raise RuntimeError(f"Plan {request.plan} missing execute() function")
        
        # Get signature for metadata
        sig = plan_module.get_signature() if hasattr(plan_module, 'get_signature') else {}
        
        # Store plan metadata on work_manager
        work_manager.current_plan_metadata = {
            "plan_id": request.plan,
            "output_file": sig.get("output_file", "results"),
            "output_dir": sig.get("output_dir", "analysis/default"),
            "source_commit": commit_info  # Store commit info
        }
        
        # Create a wrapper that calls execute with the inputs
        def planning_fn():
            return plan_module.execute(**request.inputs)
        
        count = workflow.make_plan(planning_fn)
        return {"message": f"Plan '{request.plan}' created", "planned_jobs": count, "status": "success"}
    except Exception as e:
        logger.error(f"Make plan failed: {e}")
        return {"message": str(e), "status": "error"}


@app.post("/collect")
def collect_results(label: str = ""):
    """Collect results and write to file. Requires clean repo."""
    import os
    import json
    from datetime import datetime
    
    # Check git is clean
    check_git_clean()
    
    try:
        # Get results from work manager
        if not work_manager.results:
            return {"message": "No results to collect", "status": "error"}
        
        # Get plan metadata
        plan_meta = getattr(work_manager, 'current_plan_metadata', {})
        output_file = plan_meta.get("output_file", "results")
        output_dir = plan_meta.get("output_dir", "analysis/default")
        
        # Sort results by task_number
        sorted_results = sorted(work_manager.results.values(), key=lambda x: x.get('task_number', 0))
        
        # Get first job GUID (first 8 chars)
        first_guid = sorted_results[0]['job_guid'][:8] if sorted_results else "00000000"
        
        # Generate filename components
        finish_time = datetime.now().strftime("%H-%M")
        
        # Find next available sequence number
        base_dir = f"/app/data/{output_dir}"
        os.makedirs(base_dir, exist_ok=True)
        
        seq_num = 1
        while True:
            # Build filename
            parts = [output_file, finish_time, f"{seq_num:03d}", first_guid]
            if label:
                parts.append(label)
            filename = "_".join(parts) + ".jsonl"
            filepath = os.path.join(base_dir, filename)
            
            if not os.path.exists(filepath):
                break
            seq_num += 1
        
        # Write results
        with open(filepath, 'w') as f:
            for result in sorted_results:
                f.write(json.dumps(result) + '\n')
        
        # Clear results
        count = len(work_manager.results)
        work_manager.results.clear()
        
        logger.info(f"Collected {count} results to {filepath}")
        
        return {
            "message": f"Collected {count} results",
            "filename": filename,
            "path": filepath,
            "count": count,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Collect failed: {e}")
        return {"message": str(e), "status": "error"}


@app.post("/dispatch")
def dispatch_endpoint():
    """Dispatch planned jobs to work manager. Requires clean repo."""
    global task_counter
    import workflow
    
    # Check git is clean
    check_git_clean()
    
    try:
        # Read manifest and create jobs
        count, task_counter = workflow.dispatch_plan(work_manager.pending, {}, task_counter, Job)
        
        # Trigger work assignment
        logger.info(f"Dispatched {count} jobs to WorkManager")
        work_manager._try_assign_work()
        
        return {"message": "Jobs dispatched", "queued_jobs": count, "status": "success"}
    except Exception as e:
        logger.error(f"Dispatch failed: {e}")
        return {"message": str(e), "status": "error"}


@app.post("/flush-plan")
def flush_plan_endpoint():
    """Delete the work plan."""
    import workflow
    flushed = workflow.flush_plan()
    return {"message": "Plan flushed" if flushed else "No plan to flush", "status": "success"}


@app.post("/flush-queue")
def flush_queue_endpoint():
    """Clear the pending job queue."""
    count = work_manager.flush_pending()
    return {"message": f"Flushed {count} jobs", "status": "success"}


@app.post("/reset")
def reset_endpoint():
    """Reset completed jobs and results."""
    count = work_manager.flush_results()
    return {"message": f"Reset {count} completed jobs", "status": "success"}


@app.post("/play")
def play_work():
    changed = work_manager.play()
    return {
        "message": "Already playing" if not changed else "Work resumed",
        "status": "playing",
        "work_state": "playing",
        "changed": changed
    }

@app.post("/pause")
def pause_work():
    changed = work_manager.pause()
    return {
        "message": "Already paused" if not changed else "Work paused",
        "status": "paused",
        "work_state": "paused",
        "changed": changed
    }
