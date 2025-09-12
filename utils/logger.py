"""
Event Logger
Logging system for C2 server events
"""

from datetime import datetime
from typing import List

class EventLogger:
    def __init__(self):
        self.events = []
    
    def log_event(self, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        formatted_event = f"[{timestamp}] {message}"
        self.events.append(formatted_event)
    
    def get_recent_events(self, count: int = 100) -> List[str]:
        return self.events[-count:]
    
    def get_events_count(self) -> int:
        return len(self.events)

        print("[LOG] Event log cleared")

