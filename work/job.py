import uuid
from typing import Any, Dict
from dataclasses import dataclass, asdict

@dataclass
class Job:
    guid: str
    task_number: int
    payload: Dict[str, Any]
    
    @classmethod
    def create(cls, task_number: int, payload: Dict[str, Any]) -> 'Job':
        """Create a new job with a generated GUID"""
        return cls(
            guid=str(uuid.uuid4()),
            task_number=task_number,
            payload=payload
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary"""
        return asdict(self)
