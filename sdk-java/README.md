# Torrent Java SDK

A lightweight, dependency-free Java 11+ client for interacting with the Torrent Job Engine.

## Usage

```java
import dev.torrent.sdk.TorrentClient;

public class Main {
    public static void main(String[] args) throws Exception {
        TorrentClient client = new TorrentClient("torrent_secret_123", "http://localhost:8080");
        
        String jobJson = """
        {
            "idempotencyKey": "unique-123",
            "jobType": "VIDEO_RENDER",
            "payload": {"fileId": "vid_999"},
            "priority": "HIGH",
            "timeoutSeconds": 300,
            "retryPolicy": {
                "maxAttempts": 3,
                "backoffMultiplier": 2.0,
                "maxBackoffSeconds": 60
            },
            "webhookUrl": "https://your-server.com/api/webhooks/torrent"
        }
        """;
        
        String response = client.submitJob(jobJson);
        System.out.println("Job Submitted: " + response);
    }
}
```
