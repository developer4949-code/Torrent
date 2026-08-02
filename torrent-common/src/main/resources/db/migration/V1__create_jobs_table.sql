CREATE TYPE job_status AS ENUM (
    'PENDING', 'SCHEDULED', 'PICKED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD', 'CANCELLED', 'TIMED_OUT'
);

CREATE TYPE job_priority AS ENUM (
    'LOW', 'STANDARD', 'HIGH'
);

CREATE TABLE jobs (
    id UUID DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status job_status NOT NULL DEFAULT 'PENDING',
    priority job_priority NOT NULL DEFAULT 'STANDARD',
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    worker_id VARCHAR(100),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    error_message TEXT,
    correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, scheduled_at),
    UNIQUE (idempotency_key, scheduled_at)
) PARTITION BY RANGE (scheduled_at);

-- Create default partition for testing and safety
CREATE TABLE jobs_default PARTITION OF jobs DEFAULT;

-- Specific partitions for the near future
CREATE TABLE jobs_y2026m07 PARTITION OF jobs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE jobs_y2026m08 PARTITION OF jobs FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Indexes
CREATE INDEX idx_jobs_scheduler ON jobs (status, scheduled_at, priority);
CREATE INDEX idx_jobs_idempotency ON jobs (idempotency_key);
