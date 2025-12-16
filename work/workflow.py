"""
Workflow management for job planning, dispatching, and completion.
"""
import os
import json
import logging

logger = logging.getLogger(__name__)

MANIFEST_PATH = '/app/data/work_manifest.jsonl'


def count_planned_jobs():
    """Count jobs in manifest file."""
    if not os.path.exists(MANIFEST_PATH):
        return 0
    with open(MANIFEST_PATH) as f:
        return sum(1 for _ in f)


def make_plan(planning_fn):
    """
    Create a work plan (manifest file).
    Fails if manifest already exists or queue not empty.
    """
    # Check no existing manifest
    if os.path.exists(MANIFEST_PATH):
        raise RuntimeError(f"Plan already exists at {MANIFEST_PATH}. Flush it first.")
    
    logger.info(f"Making plan using {planning_fn.__name__}")
    
    # Call planning function
    job_dicts = planning_fn()
    
    # Write manifest
    with open(MANIFEST_PATH, 'w') as f:
        for job_dict in job_dicts:
            f.write(json.dumps(job_dict) + '\n')
    
    count = len(job_dicts)
    logger.info(f"✓ Created plan with {count} jobs")
    return count


def dispatch_plan(job_queue, jobs, task_counter, Job):
    """
    Dispatch planned jobs to queue.
    Fails if no manifest or queue not empty.
    """
    # Check manifest exists
    if not os.path.exists(MANIFEST_PATH):
        raise RuntimeError("No plan to dispatch. Make a plan first.")
    
    # Check queue is empty
    if not job_queue.empty():
        raise RuntimeError(f"Queue has {job_queue.qsize()} jobs. Wait or flush first.")
    
    # Read manifest
    with open(MANIFEST_PATH) as f:
        job_dicts = [json.loads(line) for line in f]
    
    # Create and queue jobs
    for job_dict in job_dicts:
        task_counter += 1
        job = Job.create(task_counter, job_dict)
        jobs[job.guid] = job
        job_queue.put(job)
    
    # Delete manifest
    os.remove(MANIFEST_PATH)
    
    count = len(job_dicts)
    logger.info(f"✓ Dispatched {count} jobs to queue")
    return count, task_counter


def flush_plan():
    """Delete the manifest file."""
    if os.path.exists(MANIFEST_PATH):
        os.remove(MANIFEST_PATH)
        logger.info("✓ Flushed plan")
        return True
    return False


def flush_queue(job_queue, jobs):
    """Clear the job queue and jobs dict."""
    count = 0
    while not job_queue.empty():
        job = job_queue.get()
        if job.guid in jobs:
            del jobs[job.guid]
        count += 1
    logger.info(f"✓ Flushed {count} queued jobs")
    return count
