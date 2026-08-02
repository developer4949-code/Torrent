CREATE TABLE worker_registry (
    worker_id VARCHAR(100) PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
