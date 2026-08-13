import { Book, Cpu, Database, Server, Zap, Layers, Activity, GitBranch } from 'lucide-react';
import './ProjectDocumentation.css';

export function ProjectDocumentation() {
  return (
    <div className="docs-container reveal-on-scroll">
      <div className="docs-sidebar">
        <nav className="docs-nav">
          <div className="docs-nav-section">
            <div className="docs-nav-title">Overview</div>
            <a href="#introduction" className="docs-nav-item active">Introduction</a>
            <a href="#architecture" className="docs-nav-item">Architecture</a>
          </div>
          <div className="docs-nav-section">
            <div className="docs-nav-title">Core Components</div>
            <a href="#api" className="docs-nav-item">API Gateway</a>
            <a href="#scheduler" className="docs-nav-item">Distributed Scheduler</a>
            <a href="#worker" className="docs-nav-item">Worker Nodes</a>
          </div>
          <div className="docs-nav-section">
            <div className="docs-nav-title">Infrastructure</div>
            <a href="#kafka" className="docs-nav-item">Kafka Event Streaming</a>
            <a href="#grpc" className="docs-nav-item">gRPC Fast-Track</a>
            <a href="#database" className="docs-nav-item">Postgres & Redis</a>
          </div>
        </nav>
      </div>

      <div className="docs-content">
        <header className="docs-header">
          <span className="hero-badge">
            <Book size={12} />
            Documentation
          </span>
          <h1 id="introduction">Project Documentation</h1>
          <p className="docs-lead">
            Torrent is a high-performance, horizontally scalable, and distributed job execution engine.
            It is designed to handle millions of jobs with resilient retries, priority queues, and microsecond latency.
          </p>
        </header>

        <section id="architecture" className="docs-section">
          <h2><Layers size={20} /> System Architecture</h2>
          <p>
            The engine is built on a modern microservices architecture using Spring Boot 3. 
            All components are entirely stateless, allowing them to scale horizontally. State is managed entirely through 
            <strong> PostgreSQL</strong> (persistence) and <strong>Apache Kafka</strong> (event streaming).
          </p>
          
          <div className="docs-grid">
            <div className="docs-card">
              <div className="docs-card-icon"><Database size={24} /></div>
              <h3>Persistent State</h3>
              <p>PostgreSQL acts as the ultimate source of truth. ShedLock guarantees that scheduled crons only run on a single leader node at a time.</p>
            </div>
            <div className="docs-card">
              <div className="docs-card-icon"><Activity size={24} /></div>
              <h3>Event-Driven</h3>
              <p>Kafka decouple the API from the Workers. Jobs are durably streamed through topics guaranteeing at-least-once delivery.</p>
            </div>
            <div className="docs-card">
              <div className="docs-card-icon"><Zap size={24} /></div>
              <h3>Low Latency</h3>
              <p>For high-priority tasks, a gRPC Fast-Track bypasses Kafka entirely, achieving microsecond end-to-end execution.</p>
            </div>
          </div>
        </section>

        <section id="api" className="docs-section">
          <h2><Server size={20} /> API Gateway</h2>
          <p>
            The <code>torrent-api</code> service exposes a RESTful JSON API for job submission and status tracking.
            It utilizes Spring WebMVC and validates incoming payloads. It immediately persists jobs to Postgres and publishes a <code>JobCreatedEvent</code> to Kafka.
          </p>
          <pre className="docs-code-block">
            <code>
{`POST /api/v1/jobs
{
  "jobType": "EMAIL_SEND",
  "priority": "HIGH",
  "payload": { "to": "user@example.com" }
}`}
            </code>
          </pre>
        </section>

        <section id="scheduler" className="docs-section">
          <h2><GitBranch size={20} /> Distributed Scheduler</h2>
          <p>
            The <code>torrent-scheduler</code> service monitors the database for timed-out jobs or scheduled crons.
            By leveraging <code>@SchedulerLock</code>, multiple instances can run in parallel without triggering duplicate jobs. 
            When a job times out, it is automatically re-queued for execution up to its maximum retry policy.
          </p>
        </section>

        <section id="worker" className="docs-section">
          <h2><Cpu size={20} /> Worker Nodes</h2>
          <p>
            The <code>torrent-worker</code> processes execute the actual job logic. They listen to the Kafka <code>jobs-topic</code>. 
            Upon receiving a job, they optimistically lock the job in the database. Workers continuously emit heartbeat signals to Redis. 
            If a worker dies, the scheduler detects the missed heartbeats and marks the worker's jobs as orphaned for reassignment.
          </p>
        </section>
      </div>
    </div>
  );
}
