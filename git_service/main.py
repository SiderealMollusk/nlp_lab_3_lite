from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPO_PATH = "/repo"


def run_git_command(cmd):
    """Run git command in repo directory."""
    try:
        result = subprocess.run(
            cmd,
            cwd=REPO_PATH,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        logger.error(f"Git command failed: {e.stderr}")
        raise HTTPException(status_code=500, detail=e.stderr)


@app.get("/")
def read_root():
    return {"service": "Git Service", "version": "1.0"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/git/status")
def get_git_status():
    """Check if working tree is clean (ignoring submodules)."""
    try:
        # Get status, ignoring submodules
        status_output = run_git_command(["git", "status", "--porcelain", "--ignore-submodules"])
        
        # Get current commit
        current_hash = run_git_command(["git", "rev-parse", "HEAD"])
        current_msg = run_git_command(["git", "log", "-1", "--pretty=%B"])
        
        # Check if detached HEAD
        try:
            branch = run_git_command(["git", "rev-parse", "--abbrev-ref", "HEAD"])
            is_detached = branch == "HEAD"
        except:
            is_detached = False
        
        is_clean = len(status_output) == 0
        uncommitted_files = []
        
        if not is_clean:
            uncommitted_files = [
                line.strip() for line in status_output.split('\n') if line.strip()
            ]
        
        return {
            "is_clean": is_clean,
            "is_detached": is_detached,
            "uncommitted_files": uncommitted_files,
            "current_commit": {
                "hash": current_hash,
                "message": current_msg
            }
        }
    except Exception as e:
        logger.error(f"Error checking git status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/git/current-commit")
def get_current_commit():
    """Get current commit info."""
    try:
        commit_hash = run_git_command(["git", "rev-parse", "HEAD"])
        commit_msg = run_git_command(["git", "log", "-1", "--pretty=%B"])
        commit_author = run_git_command(["git", "log", "-1", "--pretty=%an"])
        commit_date = run_git_command(["git", "log", "-1", "--pretty=%ai"])
        
        return {
            "hash": commit_hash,
            "short_hash": commit_hash[:8],
            "message": commit_msg,
            "author": commit_author,
            "date": commit_date
        }
    except Exception as e:
        logger.error(f"Error getting commit info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/git/branch")
def get_current_branch():
    """Get current branch name."""
    try:
        branch = run_git_command(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        return {"branch": branch}
    except Exception as e:
        logger.error(f"Error getting branch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/git/stash")
def stash_changes():
    """Stash current changes."""
    try:
        # Check if there are changes to stash
        status_output = run_git_command(["git", "status", "--porcelain"])
        if not status_output:
            return {"message": "No changes to stash", "stashed": False}
        
        # Stash with message
        stash_msg = run_git_command(["git", "stash", "push", "-m", "Auto-stash for collection"])
        
        return {
            "message": "Changes stashed",
            "stashed": True,
            "stash_message": stash_msg
        }
    except Exception as e:
        logger.error(f"Error stashing changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/git/stash-pop")
def stash_pop():
    """Pop most recent stash."""
    try:
        # Check if there's a stash
        stash_list = run_git_command(["git", "stash", "list"])
        if not stash_list:
            return {"message": "No stash to pop", "popped": False}
        
        # Pop stash
        pop_msg = run_git_command(["git", "stash", "pop"])
        
        return {
            "message": "Stash popped",
            "popped": True,
            "pop_message": pop_msg
        }
    except Exception as e:
        logger.error(f"Error popping stash: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# PROJECT MANAGEMENT
# ============================================================

import docker
import json
import time
from datetime import datetime

PROJECTS_FILE = "/repo/projects.json"  # In source repo, not data
ALLOWED_CONTAINERS = [
    "nlp_lab_3_lite-work_api-1",
    "nlp_lab_3_lite-ui-1"
]

try:
    docker_client = docker.from_env()
except Exception as e:
    logger.warning(f"Docker client not available: {e}")
    docker_client = None


def load_projects():
    """Load projects.json"""
    try:
        with open(PROJECTS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"current_project": "default", "projects": []}


def save_projects(data):
    """Save projects.json"""
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def restart_containers():
    """Restart work_api and ui containers"""
    if not docker_client:
        raise HTTPException(503, "Docker not available")
    
    for container_name in ALLOWED_CONTAINERS:
        try:
            container = docker_client.containers.get(container_name)
            logger.info(f"Restarting {container_name}...")
            container.restart()
        except docker.errors.NotFound:
            logger.warning(f"Container {container_name} not found")
        except Exception as e:
            logger.error(f"Failed to restart {container_name}: {e}")
            raise HTTPException(500, f"Failed to restart {container_name}")


def wait_for_health(url: str, timeout: int = 30):
    """Wait for service to be healthy"""
    import requests
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(url, timeout=1)
            if response.status_code == 200:
                return True
        except:
            pass
        time.sleep(0.5)
    return False


@app.get("/projects")
def list_projects():
    """List all projects"""
    try:
        data = load_projects()
        return data
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects/create")
def create_project(name: str, description: str = ""):
    """Create a new project branch"""
    try:
        # Check if repo is clean
        status_output = run_git_command(["git", "-C", "/repo", "status", "--porcelain", "--ignore-submodules"])
        if len(status_output) > 0:
            raise HTTPException(400, "Repository must be clean to create project. Commit your changes first.")
        
        # Validate name
        if not name or not name.replace("_", "").replace("-", "").isalnum():
            raise HTTPException(400, "Invalid project name")
        
        # Load projects
        data = load_projects()
        
        # Check if exists
        if any(p['name'] == name for p in data['projects']):
            raise HTTPException(400, "Project already exists")
        
        # Create branch
        branch_name = f"project-{name}"
        run_git_command(["git", "-C", "/repo/data", "checkout", "-b", branch_name])
        
        # Add project to registry (in source repo)
        project = {
            "name": name,
            "branch": branch_name,
            "description": description,
            "created": datetime.utcnow().isoformat() + "Z",
            "commits": []
        }
        data['projects'].append(project)
        
        # Save projects.json (in source repo, not data)
        save_projects(data)
        
        # Auto-commit projects.json to keep repo clean
        run_git_command(["git", "-C", "/repo", "add", "projects.json"])
        run_git_command(["git", "-C", "/repo", "commit", "-m", f"Create project: {name}"])
        
        # Switch back to current project
        current_branch = next(p['branch'] for p in data['projects'] if p['name'] == data['current_project'])
        run_git_command(["git", "-C", "/repo/data", "checkout", current_branch])
        
        logger.info(f"Created project: {name} on branch {branch_name}")
        return {"status": "created", "project": project}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects/switch")
def switch_project(project: str):
    """Switch to a different project"""
    try:
        # Check if repo is clean
        status_output = run_git_command(["git", "-C", "/repo", "status", "--porcelain", "--ignore-submodules"])
        if len(status_output) > 0:
            raise HTTPException(400, "Repository must be clean to switch projects. Commit your changes first.")
        
        # Load projects
        data = load_projects()
        
        # Find project
        proj = next((p for p in data['projects'] if p['name'] == project), None)
        if not proj:
            raise HTTPException(404, "Project not found")
        
        # Check if already on this project
        if data['current_project'] == project:
            return {"status": "already_active", "project": project}
        
        # Check work_api status
        import requests
        try:
            status_response = requests.get("http://work_api:8000/status", timeout=2)
            status_data = status_response.json()
            if status_data.get('outstanding_jobs', 0) > 0:
                raise HTTPException(400, "Cannot switch: jobs in progress. Pause work first.")
        except requests.RequestException:
            logger.warning("Could not check work_api status")
        
        # Set to "--" immediately for UI feedback
        data['current_project'] = "--"
        save_projects(data)
        run_git_command(["git", "-C", "/repo", "add", "projects.json"])
        run_git_command(["git", "-C", "/repo", "commit", "-m", "Switching projects..."])
        
        # Checkout branch
        run_git_command(["git", "-C", "/repo/data", "checkout", proj['branch']])
        
        # Update to actual project
        data['current_project'] = project
        save_projects(data)
        
        # Auto-commit projects.json to keep repo clean
        run_git_command(["git", "-C", "/repo", "add", "projects.json"])
        run_git_command(["git", "-C", "/repo", "commit", "-m", f"Switch to project: {project}"])
        
        # Restart containers
        restart_containers()
        
        # Wait for health
        if not wait_for_health("http://work_api:8000/health", timeout=30):
            logger.warning("work_api did not become healthy in time")
        
        logger.info(f"Switched to project: {project}")
        return {"status": "switched", "project": project, "branch": proj['branch']}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error switching project: {e}")
        raise HTTPException(status_code=500, detail=str(e))
