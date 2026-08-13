import { Book, Cpu, Database, Server, Zap, Layers, Activity, GitBranch, Target, ShieldCheck, Rocket, Info, Key, Globe } from 'lucide-react';
import './ProjectDocumentation.css';

export function ProjectDocumentation() {
  return (
    <div className="docs-container animate-in">
      <div className="docs-sidebar">
        <nav className="docs-nav">
          <div className="docs-nav-section">
            <div className="docs-nav-title">I. The Vision</div>
            <a href="#the-what" className="docs-nav-item active">The "What": Executive Summary</a>
            <a href="#the-why" className="docs-nav-item">The "Why": Core Philosophy</a>
          </div>
          <div className="docs-nav-section">
            <div className="docs-nav-title">II. Deep Architecture</div>
            <a href="#the-how" className="docs-nav-item">The "How": System Design</a>
            <a href="#execution-flow" className="docs-nav-item">Job Execution Lifecycle</a>
            <a href="#grpc-fast-track" className="docs-nav-item">gRPC Fast-Track</a>
          </div>
          <div className="docs-nav-section">
            <div className="docs-nav-title">III. Resiliency & Scale</div>
            <a href="#fault-tolerance" className="docs-nav-item">Fault Tolerance & Recovery</a>
            <a href="#horizontal-scaling" className="docs-nav-item">Horizontal Scaling</a>
          </div>
          <div className="docs-nav-section">
            <div className="docs-nav-title">IV. Developer Guide</div>
            <a href="#api-reference" className="docs-nav-item">API Reference</a>
            <a href="#tech-stack" className="docs-nav-item">Technology Stack</a>
          </div>
        </nav>
      </div>

      <div className="docs-content">
        <header className="docs-header">
          <span className="hero-badge">
            <Book size={12} />
            Torrent Engineering Specification
          </span>
          <h1 id="the-what">Torrent Distributed Engine</h1>
          <p className="docs-lead">
            A production-grade, highly resilient distributed job execution engine engineered to process millions of critical background tasks with microsecond precision, guaranteed at-least-once delivery, and zero single points of failure.
          </p>
        </header>

        <section id="the-why" className="docs-section">
          <h2><Target size={20} /> The "Why": Core Philosophy & Problem Statement</h2>
          <p>
            In modern distributed systems, background processing is rarely just "fire and forget." Enterprise applications require strict guarantees. Traditional monolithic schedulers (like Quartz or simple Spring <code>@Scheduled</code>) create massive bottlenecks and single points of failure. Conversely, raw message brokers (like RabbitMQ or Kafka) lack the inherent state management required for complex retries, dynamic prioritization, and distributed locks.
          </p>
          <p>
            <strong>Torrent was built to bridge this gap.</strong> We needed a system that answered the following engineering challenges:
          </p>
          <ul>
            <li><strong>How do we guarantee a job runs exactly once across 1,000 servers without race conditions?</strong></li>
            <li><strong>How do we dynamically prioritize critical user-facing tasks over background analytics?</strong></li>
            <li><strong>How do we recover instantly if an executing server's power cable is pulled mid-computation?</strong></li>
          </ul>
          <p>
            The philosophy behind Torrent is <em>Aggressive Decoupling</em>. By isolating the API Gateway, the Scheduler, and the Worker Nodes, Torrent can dynamically auto-scale specific bottlenecks without dragging down the rest of the cluster.
          </p>
        </section>

        <section id="the-how" className="docs-section">
          <h2><Layers size={20} /> The "How": System Design & Topography</h2>
          <p>
            Torrent is not a monolithic application; it is an orchestra of highly specialized microservices, coordinated through state-of-the-art infrastructure.
          </p>
          
          <div className="docs-grid">
            <div className="docs-card">
              <div className="docs-card-icon"><Database size={24} /></div>
              <h3>PostgreSQL (The Source of Truth)</h3>
              <p>Every job, state transition, and audit log is atomically persisted. Postgres guarantees ACID compliance so that no job is ever lost, dropped, or duplicated, even during total cluster outages.</p>
            </div>
            <div className="docs-card">
              <div className="docs-card-icon"><Activity size={24} /></div>
              <h3>Apache Kafka (The Nervous System)</h3>
              <p>Used as an ultra-high-throughput event streaming platform. Kafka acts as a shock absorber. If you suddenly inject 5 million jobs, Kafka queues them durably without overwhelming the Postgres database or the Worker nodes.</p>
            </div>
            <div className="docs-card">
              <div className="docs-card-icon"><Server size={24} /></div>
              <h3>Redis (The Pulse Monitor)</h3>
              <p>Workers emit sub-second heartbeats to Redis. Because Redis operates entirely in memory, it provides lightning-fast health checks, allowing the Scheduler to instantly detect dead nodes and reassign their orphaned jobs.</p>
            </div>
          </div>
        </section>

        <section id="execution-flow" className="docs-section">
          <h2><GitBranch size={20} /> The Job Execution Lifecycle</h2>
          <p>
            Understanding the lifecycle of a standard asynchronous job is key to understanding Torrent's resiliency.
          </p>
          <div className="execution-steps">
            <div className="step-card">
              <span className="step-number">1</span>
              <h4>Ingestion (API Node)</h4>
              <p>A client submits a payload to the <code>torrent-api</code>. The API synchronously saves the job to Postgres in a <code>PENDING</code> state, and asynchronously fires a <code>JobCreatedEvent</code> into Kafka.</p>
            </div>
            <div className="step-card">
              <span className="step-number">2</span>
              <h4>Routing & Locking (Worker Node)</h4>
              <p>A <code>torrent-worker</code> consumes the Kafka event. Before executing, it attempts an optimistic lock on the database row. If another worker already locked it, it safely ignores the event. If successful, the job enters <code>RUNNING</code>.</p>
            </div>
            <div className="step-card">
              <span className="step-number">3</span>
              <h4>Execution & Telemetry</h4>
              <p>The worker spins up a Java 21 Virtual Thread to execute the heavy lifting. Throughout execution, the worker maintains a Redis heartbeat.</p>
            </div>
            <div className="step-card">
              <span className="step-number">4</span>
              <h4>Resolution</h4>
              <p>Upon success, the job is marked <code>COMPLETED</code>. Upon failure, the retry policy is evaluated, and the job may be sent back to <code>PENDING</code> with an exponential backoff.</p>
            </div>
          </div>
        </section>

        <section id="grpc-fast-track" className="docs-section">
          <h2><Zap size={20} /> The gRPC Fast-Track (Priority Inversion)</h2>
          <p>
            While Kafka is incredibly scalable, it introduces a slight latency overhead (a few milliseconds) and is subject to queue buildup. 
            What happens when a CEO clicks a button and needs a job executed <em>immediately</em>, even if there are 2 million background analytics jobs ahead of it in Kafka?
          </p>
          <p>
            Torrent solves this via the <strong>gRPC Fast-Track</strong>. When a job is submitted with <code>PRIORITY = HIGH</code>, the API Node completely bypasses Kafka. It establishes a persistent HTTP/2 gRPC tunnel directly to a Worker Node and streams the execution binary instantly. This drops P99 latency from milliseconds to microseconds.
          </p>
        </section>

        <section id="fault-tolerance" className="docs-section">
          <h2><ShieldCheck size={20} /> Fault Tolerance & Disaster Recovery</h2>
          <p>
            Torrent operates under the assumption that hardware <strong>will</strong> fail. It handles extreme edge cases through active sweeping mechanisms.
          </p>
          <ul>
            <li><strong>The Orphan Sweeper:</strong> The <code>torrent-scheduler</code> runs a continuous distributed cron (secured by ShedLock). It cross-references jobs stuck in <code>RUNNING</code> against the Redis heartbeat registry. If a worker hasn't pulsed in 5 seconds, the scheduler ruthlessly assassinates the worker's session and re-queues all its jobs to other nodes.</li>
            <li><strong>Exponential Backoff:</strong> Jobs that fail due to external API timeouts aren't just retried instantly. They use a jittered exponential backoff algorithm to prevent thundering-herd DDoS attacks on downstream services.</li>
          </ul>
        </section>

        <section id="horizontal-scaling" className="docs-section">
          <h2><Rocket size={20} /> Horizontal Scaling Profile</h2>
          <p>
            The system is entirely containerized using Docker and is built to run on Kubernetes natively.
          </p>
          <ul>
            <li><strong>Scale API Nodes:</strong> When HTTP ingest traffic spikes.</li>
            <li><strong>Scale Worker Nodes:</strong> When the CPU/Memory intensive execution backlog grows (Kafka Lag metric increases).</li>
            <li><strong>Scale Scheduler Nodes:</strong> Active-Passive high availability. Only one Scheduler holds the ShedLock token at any given millisecond.</li>
          </ul>
        </section>

        <section id="api-reference" className="docs-section">
          <h2><Globe size={20} /> API Reference</h2>
          <p>
            The REST Gateway is secured via API Keys and provides comprehensive endpoints for integration.
          </p>
          <pre className="docs-code-block">
            <code>
{`POST /api/v1/jobs
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json

{
  "jobType": "DATA_AGGREGATION",
  "priority": "STANDARD",          // LOW, STANDARD, HIGH (gRPC Fast-Track)
  "payload": {
    "target_cluster": "us-east-1",
    "dry_run": false
  },
  "idempotencyKey": "unique-uuid-1234"
}`}
            </code>
          </pre>
        </section>

        <section id="tech-stack" className="docs-section">
          <h2><Cpu size={20} /> Engineering Tech Stack</h2>
          <div className="tech-stack-tags">
            <span className="tech-tag">Java 21 (Virtual Threads)</span>
            <span className="tech-tag">Spring Boot 3.3</span>
            <span className="tech-tag">PostgreSQL 16</span>
            <span className="tech-tag">Apache Kafka</span>
            <span className="tech-tag">Redis 7</span>
            <span className="tech-tag">gRPC / Protocol Buffers</span>
            <span className="tech-tag">React 19 + TypeScript</span>
            <span className="tech-tag">Docker Compose</span>
          </div>
        </section>
      </div>
    </div>
  );
}
