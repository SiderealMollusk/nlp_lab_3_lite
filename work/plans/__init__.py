"""
Base utilities for plan modules.
"""
import json


def load_jsonl(filepath):
    """Load a JSONL file and return list of dicts."""
    with open(filepath) as f:
        return [json.loads(line) for line in f]


def save_jsonl(filepath, items):
    """Save list of dicts to JSONL file."""
    with open(filepath, 'w') as f:
        for item in items:
            f.write(json.dumps(item) + '\n')
