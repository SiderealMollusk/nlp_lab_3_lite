"""
Reverse Text Plan
Reverses each line of text in the corpus.
"""
from plans import load_jsonl


def get_signature():
    return {
        "name": "Reverse Text",
        "description": "Reverse each line of text",
        "output_file": "reversed_text",
        "output_dir": "analysis/reversed",
        "inputs": [
            {"name": "corpus", "type": "jsonl", "required": True}
        ]
    }


def execute(corpus):
    """Load corpus and create reverse text jobs."""
    lines = load_jsonl(corpus)
    
    jobs = []
    for item in lines:
        # Extract text field (adjust based on your corpus structure)
        text = item.get('text', str(item))
        jobs.append({
            "task": "reverse_text",
            "text": text
        })
    
    return jobs
