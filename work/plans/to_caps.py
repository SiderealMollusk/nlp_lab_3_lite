"""
To Caps Plan
Converts each line of text to uppercase.
"""
from plans import load_jsonl


def get_signature():
    return {
        "name": "To Caps",
        "description": "Convert text to uppercase",
        "output_file": "to_caps",
        "output_dir": "analysis/caps",
        "inputs": [
            {"name": "corpus", "type": "jsonl", "required": True}
        ]
    }


def execute(corpus):
    """Load corpus and create uppercase jobs."""
    lines = load_jsonl(corpus)
    
    jobs = []
    for item in lines:
        # Extract text field (adjust based on your corpus structure)
        text = item.get('text', str(item))
        jobs.append({
            "task": "to_caps",
            "text": text
        })
    
    return jobs
