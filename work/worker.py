"""
Worker job processing logic.
This file is hot-reloaded - changes take effect on the next job.
"""
import logging
import time

logger = logging.getLogger(__name__)


def do_work(job, worker_id):
    """
    This is where you implement your actual job processing logic.
    
    Args:
        job: Job object with guid, task_number, and payload
        worker_id: ID of the worker processing this job
    
    Returns:
        dict: Result data to be stored
    """
    logger.info(f"Worker {worker_id} doing work for job {job.guid}")
    
    # Get task type from payload
    task = job.payload.get("task")
    text = job.payload.get("text", "")
    
    # Process based on task type
    if task == "reverse_text":
        result_text = text[::-1]
        result_data = {
            "task": task,
            "original": text,
            "result": result_text
        }
    elif task == "to_caps":
        result_text = text.upper()
        result_data = {
            "task": task,
            "original": text,
            "result": result_text
        }
    else:
        # Default/unknown task
        result_data = {
            "task": task or "unknown",
            "payload": job.payload
        }
    
    logger.info(f"Worker {worker_id} completed {task} for job {job.guid}")
    return result_data
