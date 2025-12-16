"""
Handler functions for work endpoints.
This file is hot-reloaded - changes take effect immediately.
"""
import logging
from job import Job

logger = logging.getLogger(__name__)

def plan_handler(jobs, task_counter):
    """Plan handler for start-work"""
    print("plan_handler")
    task_counter += 1
    job = Job.create(task_counter, {"handler": "plan", "action": "started"})
    jobs[job.guid] = job
    logger.info(f"Plan handler executed - Created job {job.guid} (task #{job.task_number})")
    return job, task_counter

def start_handler2(jobs, task_counter):
    """Second handler for start-work"""
    print("start_handler2")
    task_counter += 1
    job = Job.create(task_counter, {"handler": "handler2", "action": "started"})
    jobs[job.guid] = job
    logger.info(f"Handler 2 executed - Created job {job.guid} (task #{job.task_number})")
    return job, task_counter
