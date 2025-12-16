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
    """Check if working tree is clean."""
    try:
        # Get status
        status_output = run_git_command(["git", "status", "--porcelain"])
        
        # Get current commit
        current_hash = run_git_command(["git", "rev-parse", "HEAD"])
        current_msg = run_git_command(["git", "log", "-1", "--pretty=%B"])
        
        is_clean = len(status_output) == 0
        uncommitted_files = []
        
        if not is_clean:
            uncommitted_files = [
                line.strip() for line in status_output.split('\n') if line.strip()
            ]
        
        return {
            "is_clean": is_clean,
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
