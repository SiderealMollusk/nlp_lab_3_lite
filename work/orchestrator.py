"""
Orchestrator - The central brain for the Work API.
Encapsulates business logic, plan management, and coordinates the WorkManager.
"""
import os
import logging
import requests
import json
import importlib
import re
from datetime import datetime
from queue import Queue
from typing import Dict, Any, List

# Local imports
from job import Job
from work_manager import WorkManager
import workflow

logger = logging.getLogger(__name__)

# Constants
GIT_SERVICE_URL = os.getenv("GIT_SERVICE_URL", "http://git_service:8001")


class Orchestrator:
    """
    The High-Level Controller.
    - Manages the WorkManager (queues, threads).
    - Handles Plan loading/creation/dispatching.
    - Handles Result collection.
    - Interfaces with Git Service.
    """

    def __init__(self):
        # The Engine
        self.work_manager = WorkManager(worker_count=1)
        self.task_counter = 0
        self.current_plan_metadata = None

    # --- Git Helpers ---

    def check_git_clean(self):
        """
        Check if git repo is clean.
        Returns: commit_info dict
        Raises: EnvironmentError if dirty or unreachable (to be caught by API)
        """
        try:
            response = requests.get(f"{GIT_SERVICE_URL}/git/status", timeout=2)
            response.raise_for_status()
            status = response.json()

            if not status["is_clean"]:
                raise EnvironmentError(json.dumps({
                    "error": "Repository has uncommitted changes",
                    "uncommitted_files": status["uncommitted_files"],
                    "message": "Commit your changes before running work"
                }))
            
            return status["current_commit"]
        except requests.RequestException as e:
            logger.warning(f"Could not reach git service: {e}")
            # In dev, we might allow this, but for now we won't block strictly 
            # unless the logic above specifically raised EnvironmentError
            return None

    # --- Plan Management ---

    def list_plans(self) -> List[Dict[str, Any]]:
        """List available plan modules with their signatures."""
        plans_dir = '/app/plans'
        available_plans = []

        if not os.path.exists(plans_dir):
            return []

        for filename in os.listdir(plans_dir):
            if filename.endswith('.py') and not filename.startswith('__'):
                plan_id = filename[:-3]
                try:
                    plan_module = importlib.import_module(f'plans.{plan_id}')
                    if hasattr(plan_module, 'get_signature'):
                        sig = plan_module.get_signature()
                        sig['id'] = plan_id
                        available_plans.append(sig)
                except Exception as e:
                    logger.error(f"Error loading plan {plan_id}: {e}")
        return available_plans

    def create_plan_stub(self, name: str) -> Dict[str, Any]:
        """Create a new plan stub."""
        # Sanitize
        clean_name = re.sub(r'[^a-zA-Z0-9]', '_', name).lower()
        while '__' in clean_name:
            clean_name = clean_name.replace('__', '_')
        clean_name = clean_name.strip('_')

        if not clean_name:
            raise ValueError("Invalid plan name")

        filename = f"{clean_name}.py"
        filepath = os.path.join("/app/plans", filename)

        if os.path.exists(filepath):
            raise FileExistsError(f"Plan '{filename}' already exists")

        # Template
        content = f'''import time

def get_signature():
    return {{
        "name": "{clean_name.replace('_', ' ').title()}",
        "description": "New plan created via UI.",
        "inputs": {{"corpus": "file"}},
        "output_dir": "analysis/{clean_name}"
    }}

def execute(corpus: str):
    """
    Execute the plan.
    """
    # Example logic
    results = []
    # with open(corpus, 'r') as f: ...
    
    return {{"status": "processed", "data": "TODO"}}
'''
        with open(filepath, 'w') as f:
            f.write(content)

        return {
            "path": filepath,
            "name": clean_name
        }

    def make_plan(self, plan_id: str, inputs: dict) -> int:
        """Load and execute the planning phase."""
        self.check_git_clean()  # Enforce clean repo
        commit_info = self.check_git_clean()

        plan_module = importlib.import_module(f'plans.{plan_id}')
        importlib.reload(plan_module)

        if not hasattr(plan_module, 'execute'):
             raise RuntimeError(f"Plan {plan_id} missing execute() function")

        sig = plan_module.get_signature() if hasattr(plan_module, 'get_signature') else {}

        # Store metadata
        self.current_plan_metadata = {
            "plan_id": plan_id,
            "output_file": sig.get("output_file", "results"),
            "output_dir": sig.get("output_dir", "analysis/default"),
            "source_commit": commit_info
        }

        # Wrapper
        def planning_fn():
            return plan_module.execute(**inputs)

        # Use workflow lib
        count = workflow.make_plan(planning_fn)
        return count

    # --- Execution Control ---

    def dispatch_plan(self) -> int:
        """Dispatch planned jobs to the WorkManager."""
        self.check_git_clean()
        
        # Read manifest
        count, new_counter = workflow.dispatch_plan(
            self.work_manager.pending, 
            {}, 
            self.task_counter, 
            Job
        )
        self.task_counter = new_counter

        logger.info(f"Dispatched {count} jobs to WorkManager")
        self.work_manager._try_assign_work()
        return count

    def play(self):
        return self.work_manager.play()

    def pause(self):
        return self.work_manager.pause()

    def flush_plan(self):
        return workflow.flush_plan()

    def flush_queue(self):
        return self.work_manager.flush_pending()

    def reset(self):
        """Flush results and reset state."""
        return self.work_manager.flush_results()

    def get_status(self):
        """Aggregate status from Manager and Workflow."""
        wm_status = self.work_manager.get_status()
        
        return {
            "work_state": "playing" if wm_status["is_playing"] else "paused",
            "planned_jobs": workflow.count_planned_jobs(),
            "queued_jobs": wm_status["pending_jobs"],
            "outstanding_jobs": wm_status["outstanding_jobs"],
            "completed_jobs": wm_status["completed_jobs"],
            "idle_workers": wm_status["idle_workers"],
            "tasked_workers": wm_status["tasked_workers"],
            "task_counter": self.task_counter,
            "current_plan": self.current_plan_metadata
        }

    # --- Collection ---

    def list_files(self) -> Dict[str, List[Dict]]:
        files = {"corpus": [], "analysis_dirs": []}
        
        # Corpora
        corpus_dir = '/app/data/corpora'
        if os.path.exists(corpus_dir):
            for filename in os.listdir(corpus_dir):
                if filename.endswith('.jsonl'):
                    files["corpus"].append({
                        "name": filename,
                        "path": f"/app/data/corpora/{filename}"
                    })

        # Analysis
        analysis_base = '/app/data/analysis'
        if os.path.exists(analysis_base):
            for dirname in os.listdir(analysis_base):
                if os.path.isdir(os.path.join(analysis_base, dirname)):
                    files["analysis_dirs"].append({
                        "name": dirname,
                        "path": f"analysis/{dirname}"
                    })
        return files

    def collect_results(self, label: str = "", force: bool = False):
        """Collect results from WorkManager to disk."""
        if not force:
            self.check_git_clean()

        if not self.work_manager.results:
            raise ValueError("No results to collect")

        plan_meta = self.current_plan_metadata or {}
        output_file = plan_meta.get("output_file", "results")
        output_dir = plan_meta.get("output_dir", "analysis/default")

        # Sort
        sorted_results = sorted(self.work_manager.results.values(), key=lambda x: x.get('task_number', 0))
        first_guid = sorted_results[0]['job_guid'][:8] if sorted_results else "00000000"

        # Filename
        finish_time = datetime.now().strftime("%H-%M")
        base_dir = f"/app/data/{output_dir}"
        os.makedirs(base_dir, exist_ok=True)

        seq_num = 1
        while True:
            parts = [output_file, finish_time, f"{seq_num:03d}", first_guid]
            if label:
                parts.append(label)
            if force:
                parts.append("DIRTY")
            
            filename = "_".join(parts) + ".jsonl"
            filepath = os.path.join(base_dir, filename)
            
            if not os.path.exists(filepath):
                break
            seq_num += 1

        # Write
        with open(filepath, 'w') as f:
            for result in sorted_results:
                f.write(json.dumps(result) + '\n')

        # Clear memory
        count = len(self.work_manager.results)
        self.work_manager.results.clear()

        return {
            "message": f"{'Force ' if force else ''}Collected {count} results",
            "filename": filename,
            "path": filepath,
            "count": count
        }

    def collect_with_stash(self, label: str = ""):
        """Stash changes, collect results, then pop stash."""
        try:
            # Stash
            stash_resp = requests.post(f"{GIT_SERVICE_URL}/git/stash", timeout=5)
            stash_resp.raise_for_status()
            stash_data = stash_resp.json()

            if not stash_data.get("stashed"):
                return self.collect_results(label)
            
            logger.info("Stashed changes for collection")
            
            try:
                # Collect (repo is clean)
                result = self.collect_results(label)
                
                # Pop
                requests.post(f"{GIT_SERVICE_URL}/git/stash-pop", timeout=5).raise_for_status()
                
                if isinstance(result, dict):
                    result["stash_info"] = "Changes were stashed and restored"
                return result

            except Exception as e:
                logger.error(f"Collection failed, attempting to restore stash: {e}")
                try: 
                    requests.post(f"{GIT_SERVICE_URL}/git/stash-pop", timeout=5)
                except:
                    logger.error("Failed to restore stash!")
                raise
        except Exception as e:
            raise RuntimeError(f"Stash-collect failed: {e}")
