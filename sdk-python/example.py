from torrent_client import TorrentClient

def main():
    # 1. Initialize the SDK with the secret API Key
    # In a real project, this would be loaded from environment variables (e.g., os.getenv("TORRENT_API_KEY"))
    # For our local environment, we configured it as "torrent_secret_123" in docker-compose.yml
    print("Connecting to Torrent Cluster...")
    client = TorrentClient(
        api_key="torrent_4949_codes", 
        base_url="http://localhost:8080"
    )

    print("\n[1] Submitting a STANDARD background job (routes through Kafka)...")
    job1 = client.submit_job(
        job_type="DATA_PROCESS",
        payload={
            "s3_bucket": "enterprise-logs-2026", 
            "analyze_sentiment": True
        },
        priority="STANDARD",
        cron_expression="* * * * *"
    )
    print(f"Success! Job ID: {job1['id']}")

    print("\n[2] Submitting a HIGH priority job (bypasses Kafka via gRPC Fast-Track)...")
    job2 = client.submit_job(
        job_type="URGENT_TASK",
        payload={
            "action": "reboot_instance", 
            "target": "us-east-1-server"
        },
        priority="HIGH",
        timeout_seconds=30,
        cron_expression="* * * * *"
    )
    print(f"Success! Job ID: {job2['id']}")

    print("\nJobs have been durably persisted in Postgres and are executing in the background!")
    print("Check your Developer Console to watch them execute live.")

if __name__ == "__main__":
    main()
