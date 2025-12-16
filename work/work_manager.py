"""
WorkManager - Manages job queue, workers, and results.
"""
import logging
from queue import Queue, Empty
from typing import Dict, Set
import threading
import time

logger = logging.getLogger(__name__)


class WorkManager:
    """Manages job assignment, worker pool, and results collection."""
    
    def __init__(self, worker_count=1):
        # Job queues
        self.pending = Queue()                    # Jobs waiting to be assigned
        self.outstanding: Dict[str, any] = {}     # Jobs currently being worked on {job_id: Job}
        self.results: Dict[str, dict] = {}        # Completed results {job_id: result}
        
        # Worker pools
        self.idle_workers = Queue()
        self.tasked_workers: Set[str] = set()
        
        # State
        self.is_playing = False
        
        # Worker threads
        self.worker_threads = []
        self._init_workers(worker_count)
        
        logger.info(f"WorkManager initialized with {worker_count} workers")
    
    def _init_workers(self, count):
        """Initialize worker threads."""
        for i in range(count):
            worker_id = f"worker_{i+1}"
            self.idle_workers.put(worker_id)
            
            # Start worker thread
            thread = threading.Thread(
                target=self._worker_loop,
                args=(worker_id,),
                daemon=True
            )
            thread.start()
            self.worker_threads.append(thread)
    
    def _worker_loop(self, worker_id):
        """Worker thread main loop - waits for jobs."""
        logger.info(f"{worker_id} started")
        
        while True:
            try:
                # Check if this worker has a job assigned
                if worker_id in self.tasked_workers:
                    # Worker is busy, sleep briefly
                    time.sleep(0.1)
                    continue
                
                # Worker is idle, sleep
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"{worker_id} error: {e}")
                time.sleep(1)
    
    def dispatch(self, jobs):
        """Add jobs to pending queue and try to assign work."""
        for job in jobs:
            self.pending.put(job)
        
        logger.info(f"Dispatched {len(jobs)} jobs to pending queue")
        self._try_assign_work()
    
    def _try_assign_work(self):
        """Assign pending jobs to idle workers if playing."""
        assigned = 0
        
        while (self.is_playing and 
               not self.pending.empty() and 
               not self.idle_workers.empty()):
            
            try:
                job = self.pending.get_nowait()
                worker_id = self.idle_workers.get_nowait()
                
                # Mark job as outstanding
                self.outstanding[job.guid] = job
                
                # Mark worker as tasked
                self.tasked_workers.add(worker_id)
                
                # Process job in separate thread
                threading.Thread(
                    target=self._process_job,
                    args=(worker_id, job),
                    daemon=True
                ).start()
                
                assigned += 1
                
            except Empty:
                break
        
        if assigned > 0:
            logger.info(f"Assigned {assigned} jobs to workers")
    
    def _process_job(self, worker_id, job):
        """Process a job (runs in separate thread)."""
        try:
            # Import worker module and process
            import worker
            import importlib
            importlib.reload(worker)
            
            logger.info(f"{worker_id} processing job {job.guid} (task #{job.task_number})")
            
            # Do the work
            result_data = worker.do_work(job, worker_id)
            
            # Create result
            result = {
                "job_guid": job.guid,
                "task_number": job.task_number,
                "status": "completed",
                "worker_id": worker_id,
                "result_data": result_data
            }
            
            logger.info(f"{worker_id} finished job {job.guid}")
            
            # Deliver result
            self.deliver(job.guid, result, worker_id)
            
        except Exception as e:
            logger.error(f"{worker_id} failed processing job {job.guid}: {e}")
            # Still deliver worker back
            self.deliver(job.guid, {"error": str(e)}, worker_id)
    
    def deliver(self, job_id, result, worker_id):
        """Called when worker completes a job."""
        # Store result
        self.results[job_id] = result
        
        # Remove from outstanding
        if job_id in self.outstanding:
            del self.outstanding[job_id]
        
        # Return worker to idle pool
        if worker_id in self.tasked_workers:
            self.tasked_workers.remove(worker_id)
        self.idle_workers.put(worker_id)
        
        logger.info(f"{worker_id} returned to idle pool")
        
        # Try to assign more work
        self._try_assign_work()
    
    def play(self):
        """Start processing jobs."""
        was_playing = self.is_playing
        self.is_playing = True
        
        if not was_playing:
            logger.info("WorkManager playing - starting job assignment")
            self._try_assign_work()
        
        return not was_playing  # Return True if state changed
    
    def pause(self):
        """Pause processing (outstanding jobs continue)."""
        was_playing = self.is_playing
        self.is_playing = False
        
        if was_playing:
            logger.info("WorkManager paused - no new job assignments")
        
        return was_playing  # Return True if state changed
    
    def flush_pending(self):
        """Clear pending queue."""
        count = 0
        while not self.pending.empty():
            try:
                self.pending.get_nowait()
                count += 1
            except Empty:
                break
        
        logger.info(f"Flushed {count} pending jobs")
        return count
    
    def flush_results(self):
        """Clear results."""
        count = len(self.results)
        self.results.clear()
        logger.info(f"Flushed {count} results")
        return count
    
    def get_status(self):
        """Get current status."""
        return {
            "pending_jobs": self.pending.qsize(),
            "outstanding_jobs": len(self.outstanding),
            "completed_jobs": len(self.results),
            "idle_workers": self.idle_workers.qsize(),
            "tasked_workers": len(self.tasked_workers),
            "is_playing": self.is_playing
        }
