# Torrent Python SDK

A lightweight Python client for interacting with the Torrent Job Engine.

## Installation
```bash
pip install requests
```

## Usage
```python
from torrent_client import TorrentClient

client = TorrentClient(api_key="torrent_secret_123", base_url="http://localhost:8080")

# Submit a simple job
response = client.submit_job(
    job_type="EMAIL_SENDER",
    payload={"to": "user@example.com", "template": "welcome"},
    priority="HIGH"
)
print("Job submitted:", response["id"])

# Submit a job with dependencies (DAG)
client.submit_job(
    job_type="DATA_PROCESSOR",
    payload={"dataset": "Q4_metrics"},
    dependencies=[response["id"]],
    webhook_url="https://your-server.com/webhooks/torrent"
)
```
