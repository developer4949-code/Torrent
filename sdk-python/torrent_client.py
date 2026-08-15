import requests
import json
import uuid
from typing import List, Optional, Dict, Any

class TorrentClient:
    """
    Python SDK for Torrent Distributed Job Engine.
    """
    def __init__(self, api_key: str, base_url: str = "http://localhost:8080"):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        
    def submit_job(self, 
                   job_type: str, 
                   payload: Dict[str, Any], 
                   priority: str = "STANDARD",
                   cron_expression: Optional[str] = None,
                   max_attempts: int = 3,
                   timeout_seconds: int = 60,
                   webhook_url: Optional[str] = None,
                   dependencies: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Submits a background job to the Torrent cluster.
        """
        url = f"{self.base_url}/api/v1/jobs"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "idempotencyKey": str(uuid.uuid4()),
            "jobType": job_type,
            "payload": payload,
            "priority": priority,
            "timeoutSeconds": timeout_seconds,
            "retryPolicy": {
                "maxAttempts": max_attempts,
                "backoffMultiplier": 2.0,
                "maxBackoffSeconds": 300
            }
        }
        
        if cron_expression:
            data["schedule"] = {
                "type": "CRON",
                "expression": cron_expression
            }
            
        if webhook_url:
            data["webhookUrl"] = webhook_url
            
        if dependencies:
            data["dependencies"] = dependencies
            
        response = requests.post(url, headers=headers, json=data)
        if response.status_code >= 400:
            print(f"Error {response.status_code}: {response.text}")
        response.raise_for_status()
        return response.json()
