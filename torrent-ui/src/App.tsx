import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { BackendTerminal } from './BackendTerminal';
import type { LucideIcon } from 'lucide-react';
import {
  Zap,
  Clock,
  RefreshCw,
  Database,
  Server,
  Cpu,
  Layers,
  Info,
  Code,
  User,
  Mail,
  Play,
  Plus,
  X,
  Trash2,
  Activity,
  TrendingUp,
  Timer,
  Send,
  CheckCircle2,
  XCircle,
  ListChecks,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  Loader2,
  Ban,
  Skull,
  CircleAlert,
  Settings,
  Hourglass,
} from 'lucide-react';
import './index.css';
import { JobDetailsModal } from './JobDetailsModal';
import { WorkerHealthModal } from './WorkerHealthModal';
import { ProjectDocumentation } from './ProjectDocumentation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1/jobs';

type JobStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PICKED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'DEPENDENCY_WAIT';

type JobPriority = 'LOW' | 'STANDARD' | 'HIGH';

interface Job {
  id?: string;
  jobType?: string;
  status: JobStatus;
  priority?: JobPriority;
  attemptCount?: number;
  maxAttempts?: number;
  createdAt?: string;
  updatedAt?: string;
  errorMessage?: string | null;
  workerId?: string | null;
}

interface StagedJob {
  id: string;
  jobType: string;
  priority: JobPriority;
  schedule: { type: string; expression: string };
  retryPolicy?: { maxAttempts: number; backoffMultiplier: number; maxBackoffSeconds: number };
  timeoutSeconds?: number;
  payload: Record<string, unknown>;
  dependencies?: string[];
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  msg?: string;
  leaving?: boolean;
}

interface FeedEvent {
  key: string;
  jobType: string;
  from: JobStatus | null;
  to: JobStatus;
  priority: JobPriority;
  ts: number;
}

type FilterKey = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

const ACTIVE_STATUSES: JobStatus[] = ['PENDING', 'SCHEDULED', 'PICKED', 'RUNNING', 'DEPENDENCY_WAIT'];
const FAILED_STATUSES: JobStatus[] = ['FAILED', 'DEAD', 'TIMED_OUT'];

const STATUS_ICONS: Record<JobStatus, LucideIcon> = {
  PENDING: Timer,
  SCHEDULED: CalendarClock,
  PICKED: Activity,
  RUNNING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  DEAD: Skull,
  CANCELLED: Ban,
  TIMED_OUT: Clock,
  DEPENDENCY_WAIT: Hourglass,
};

const FEATURES = [
  { icon: Layers, label: 'Apache Kafka Event Streaming' },
  { icon: Zap, label: 'gRPC Fast-Track (Low Latency)' },
  { icon: Clock, label: 'Distributed Cron (ShedLock)' },
  { icon: RefreshCw, label: 'Resilient Retries & Backoff' },
  { icon: Database, label: 'PostgreSQL Persistence' },
];

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function feedTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function useCountUp(value: number, duration = 650): number {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prevRef.current = to;
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

function StepBadge({ n }: { n: number }) {
  return <span className="step-badge">{n}</span>;
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connStatus, setConnStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [stagedJobs, setStagedJobs] = useState<StagedJob[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'docs'>('dashboard');
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [grpcPulse, setGrpcPulse] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Cluster Metrics
  const [activeWorkers, setActiveWorkers] = useState<number>(0);
  const [kafkaLag, setKafkaLag] = useState<number>(0);

  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [recentCount, setRecentCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
  const [torrentApiKey, setTorrentApiKey] = useState(() => localStorage.getItem('torrentApiKey') || 'torrent_secret_123');
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkerHealth, setShowWorkerHealth] = useState(false);

  const [customJob, setCustomJob] = useState({
    jobType: 'CUSTOM_TASK',
    priority: 'STANDARD' as JobPriority,
    cronExpression: '* * * * *',
    maxAttempts: '3',
    timeoutSeconds: '60',
    dependencies: '',
  });

  const lastIdsRef = useRef<Set<string>>(new Set());
  const prevStatusesRef = useRef<Record<string, JobStatus>>({});
  const seenAtRef = useRef<Record<string, number>>({});
  const toastIdRef = useRef(0);

  const pushToast = useCallback((type: Toast['type'], title: string, msg?: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, title, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 260);
    }, 3400);
  }, []);

  const fetchJobs = useCallback(async (): Promise<boolean> => {
    try {
      const [jobsRes, metricsRes] = await Promise.all([
        fetch(`${API_URL}?_t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${torrentApiKey}` } }),
        fetch(`${import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}/api/cluster/metrics`, { headers: { 'Authorization': `Bearer ${torrentApiKey}` } }).catch(() => null)
      ]);
      
      if (jobsRes.ok) {
        const data = (await jobsRes.json()) as Job[];
        setJobs(Array.isArray(data) ? data : []);
        setConnStatus('live');
        setLoading(false);
      } else {
        throw new Error(`HTTP ${jobsRes.status}`);
      }
      
      if (metricsRes && metricsRes.ok) {
        const metrics = await metricsRes.json();
        setActiveWorkers(metrics.activeWorkers || 0);
        setKafkaLag(metrics.kafkaLag || 0);
      }
      return true;
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setConnStatus('offline');
      setLoading(false);
      return false;
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => {
      void fetchJobs();
    }, 1500);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Navbar shadow once scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const ok = await fetchJobs();
    setRefreshing(false);
    if (!ok) pushToast('error', 'Connection lost', 'Could not reach the API. Is the backend running?');
  }, [fetchJobs, pushToast]);

  // gRPC pulse detection for high-priority arrivals
  useEffect(() => {
    if (lastIdsRef.current.size > 0 && jobs.length > 0) {
      const newHigh = jobs.filter((j) => j.priority === 'HIGH' && !lastIdsRef.current.has(j.id ?? ''));
      if (newHigh.length > 0) {
        setGrpcPulse(true);
        const t = setTimeout(() => setGrpcPulse(false), 1600);
        return () => clearTimeout(t);
      }
    }
    lastIdsRef.current = new Set(jobs.map((j) => j.id ?? ''));
  }, [jobs]);

  // Live activity feed + arrival metric via diffing polls
  useEffect(() => {
    const now = Date.now();
    const newEvents: FeedEvent[] = [];
    const freshSeen: Record<string, number> = {};

    jobs.forEach((job, index) => {
      const id = job.id ?? '';
      const prev = prevStatusesRef.current[id];
      const firstSeen = seenAtRef.current[id] ?? now;
      freshSeen[id] = firstSeen;

      if (prev === undefined) {
        newEvents.push({
          key: `submit-${id}-${now}-${index}`,
          jobType: job.jobType ?? 'JOB',
          from: null,
          to: job.status,
          priority: job.priority ?? 'STANDARD',
          ts: now,
        });
      } else if (prev !== job.status) {
        newEvents.push({
          key: `tran-${id}-${prev}-${job.status}-${now}-${index}`,
          jobType: job.jobType ?? 'JOB',
          from: prev,
          to: job.status,
          priority: job.priority ?? 'STANDARD',
          ts: now,
        });
      }
    });

    prevStatusesRef.current = jobs.reduce<Record<string, JobStatus>>((acc, job) => {
      if (job.id) acc[job.id] = job.status;
      return acc;
    }, {});
    seenAtRef.current = freshSeen;

    setRecentCount(Object.values(freshSeen).filter((t) => now - t < 60000).length);

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents.reverse(), ...prev].slice(0, 40));
    }
  }, [jobs]);

  // Scroll reveal animations (re-bind when view changes)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('animate-reveal');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [currentView]);

  // Derived stats
  const stats = useMemo(() => {
    const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failed = jobs.filter((j) => FAILED_STATUSES.includes(j.status)).length;
    return { total: jobs.length, active, completed, failed };
  }, [jobs]);

  // Filtered + sorted job list
  const filteredJobs = useMemo(() => {
    const list = jobs.filter((j) => {
      if (filter === 'ACTIVE') return ACTIVE_STATUSES.includes(j.status);
      if (filter === 'COMPLETED') return j.status === 'COMPLETED';
      if (filter === 'FAILED') return FAILED_STATUSES.includes(j.status);
      return true;
    });
    return [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [jobs, filter]);

  // Architecture activity states
  const activeStates = useMemo(() => {
    const hasPendingStandard = jobs.some(
      (j) => (j.status === 'PENDING' || j.status === 'SCHEDULED') && j.priority !== 'HIGH'
    );
    const hasPendingHigh = jobs.some((j) => j.status === 'PENDING' && j.priority === 'HIGH');
    const recentActivity = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));

    return {
      apiGateway: recentActivity || grpcPulse,
      kafka: hasPendingStandard,
      grpc: hasPendingHigh || grpcPulse,
      worker: recentActivity || grpcPulse,
      db: true,
    };
  }, [jobs, grpcPulse]);

  // --- Actions ---

  const queueJob = useCallback(
    (payload: Omit<StagedJob, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 11);
      setStagedJobs((prev) => [...prev, { ...payload, id }]);
      pushToast('info', 'Job staged', `${payload.jobType} added to the simulation batch.`);
    },
    [pushToast]
  );

  const removeStagedJob = useCallback((id: string) => {
    setStagedJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const clearStaged = useCallback(() => {
    setStagedJobs([]);
  }, []);

  const queueKafka = () =>
    queueJob({
      jobType: 'DATA_PROCESS',
      payload: { test: 'Standard Kafka Queue' },
      priority: 'STANDARD',
      schedule: { type: 'CRON', expression: '* * * * *' },
    });

  const queueGrpc = () =>
    queueJob({
      jobType: 'URGENT_TASK',
      payload: { test: 'gRPC Fast-Track' },
      priority: 'HIGH',
      schedule: { type: 'CRON', expression: '* * * * *' },
    });

  const queueCron = () =>
    queueJob({
      jobType: 'RECURRING_TASK',
      payload: { test: 'Distributed Cron' },
      priority: 'LOW',
      schedule: { type: 'CRON', expression: '*/10 * * * * *' },
    });

  const queueRetry = () =>
    queueJob({
      jobType: 'FLAKY_TASK',
      payload: { test: 'Retry and Backoff' },
      priority: 'STANDARD',
      schedule: { type: 'CRON', expression: '* * * * *' },
      retryPolicy: { maxAttempts: 3, backoffMultiplier: 2.0, maxBackoffSeconds: 30 },
    });

  const queueCustomJob = (e: FormEvent) => {
    e.preventDefault();
    if (!customJob.jobType.trim()) {
      pushToast('error', 'Missing job type', 'Enter a job type before staging.');
      return;
    }
    const attempts = Math.max(1, Math.floor(Number(customJob.maxAttempts) || 3));
    const priority = customJob.priority;
    const timeout = parseInt(customJob.timeoutSeconds, 10) || 60;
    const deps = customJob.dependencies
      ? customJob.dependencies.split(',').map(d => d.trim()).filter(Boolean)
      : undefined;

    queueJob({
      jobType: customJob.jobType,
      priority,
      payload: { customData: 'User submitted task' },
      schedule: { type: 'CRON', expression: customJob.cronExpression || '* * * * *' },
      retryPolicy: { maxAttempts: attempts, backoffMultiplier: 2.0, maxBackoffSeconds: 30 },
      timeoutSeconds: timeout,
      dependencies: deps,
    });
  };

  const executeSimulation = async () => {
    if (stagedJobs.length === 0 || running) return;
    setRunning(true);
    let ok = 0;
    let fail = 0;

    for (const job of stagedJobs) {
      await new Promise((r) => setTimeout(r, 250));
      const { id: _id, ...rest } = job;
      try {
        const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${torrentApiKey}`,
        },
        body: JSON.stringify({
            ...rest,
            idempotencyKey: `job-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }),
        });
        if (res.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }

    setStagedJobs([]);
    setRunning(false);
    await fetchJobs();

    if (fail === 0) {
      pushToast('success', 'Batch submitted', `${ok} job${ok === 1 ? '' : 's'} pushed through the pipeline.`);
    } else {
      pushToast('error', 'Submission issues', `${ok} succeeded, ${fail} failed to submit.`);
    }
  };

  const connLabel =
    connStatus === 'live' ? 'API Connected' : connStatus === 'offline' ? 'API Offline' : 'Connecting…';

  const total = useCountUp(stats.total);
  const active = useCountUp(stats.active);
  const completed = useCountUp(stats.completed);
  const failed = useCountUp(stats.failed);
  const kafkaLagCount = useCountUp(kafkaLag);
  const stagedCount = useCountUp(stagedJobs.length);

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: stats.total },
    { key: 'ACTIVE', label: 'Active', count: stats.active },
    { key: 'COMPLETED', label: 'Completed', count: stats.completed },
    { key: 'FAILED', label: 'Failed', count: stats.failed },
  ];

  return (
    <>
      <div className="ambient-bg">
      </div>

      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-logo">
              <Zap size={20} />
            </div>
            <div>
              <div className="brand-name">Torrent</div>
              <div className="brand-tag">Distributed Job Engine</div>
            </div>
          </div>

          <div className="navbar-tabs">
            <button 
              type="button"
              className={`nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </button>
            <button 
              type="button"
              className={`nav-tab ${currentView === 'docs' ? 'active' : ''}`}
              onClick={() => setCurrentView('docs')}
            >
              Documentation
            </button>
          </div>

          <div className="navbar-actions">
            <span className={`conn-pill ${connStatus === 'live' ? 'is-live' : connStatus === 'offline' ? 'is-offline' : ''}`}>
              <span className="conn-dot" />
              {connLabel}
            </span>
            <button
              type="button"
              className="icon-btn"
              title="Settings"
              aria-label="Settings"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Refresh now"
              aria-label="Refresh now"
              onClick={() => void handleRefresh()}
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </nav>

      {currentView === 'dashboard' ? (
      <div className="app-container">
        {/* Hero */}
        <header className="hero reveal-on-scroll">
          <h1>Torrent Distributed Engine</h1>
          <p>
            Real-time visualization of a highly scalable, event-driven job execution engine.
            Queue jobs and watch them route through Kafka and gRPC to resilient worker nodes.
          </p>
          <div className="feature-chips">
            {FEATURES.map((f) => (
              <span key={f.label} className="feature-chip">
                <f.icon size={13} />
                {f.label}
              </span>
            ))}
          </div>
        </header>

        {connStatus === 'offline' && (
          <div className="offline-banner" role="alert">
            <XCircle size={18} />
            <div>
              <strong>API unreachable.</strong> The dashboard is polling{' '}
              <code className="mono">{import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}</code> but cannot connect. Start the
              Spring Boot cluster with <code className="mono">.\run-torrent.ps1</code> to resume the
              live feed.
            </div>
          </div>
        )}

        {/* Stats */}
        <section className="stats-grid reveal-on-scroll">
          <div className="stat-card">
            <div className="stat-icon si-blue">
              <Activity size={20} />
            </div>
            <div>
              <div className="stat-value">{total}</div>
              <div className="stat-label">Total Jobs</div>
              <div className="stat-trend">
                <TrendingUp size={12} />
                {recentCount} in the last 60s
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon si-violet">
              <Timer size={20} />
            </div>
            <div>
              <div className="stat-value">{active}</div>
              <div className="stat-label">Active</div>
              <div className="stat-trend">pending · running</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon si-green">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="stat-value">{completed}</div>
              <div className="stat-label">Completed</div>
              <div className="stat-trend">successfully executed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon si-red">
              <XCircle size={20} />
            </div>
            <div>
              <div className="stat-value">{failed}</div>
              <div className="stat-label">Failed</div>
              <div className="stat-trend">dead · timed out</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon si-teal">
              <Layers size={20} />
            </div>
            <div>
              <div className="stat-value">{kafkaLagCount}</div>
              <div className="stat-label">Kafka Lag</div>
              <div className="stat-trend">messages waiting</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon si-amber">
              <ListChecks size={20} />
            </div>
            <div>
              <div className="stat-value">{stagedCount}</div>
              <div className="stat-label">Staged</div>
              <div className="stat-trend">awaiting submission</div>
            </div>
          </div>
        </section>

        {/* Main: controls + workflow */}
        <div className="top-section">
          <div className="sidebar">
            <aside className="glass-panel reveal-on-scroll">
              <h2 className="section-title">
                <span className="title-icon">
                  <Zap size={17} />
                </span>
                <StepBadge n={1} />
                Queue Demo Jobs
              </h2>
              <div className="demo-stack">
                <button type="button" className="demo-btn btn-kafka" onClick={queueKafka}>
                  <span className="btn-emoji">
                    <Layers size={17} />
                  </span>
                  <span className="btn-text">
                    Standard Kafka Queue
                    <span className="btn-desc">Guaranteed order &amp; batching</span>
                  </span>
                  <ArrowUpRight size={16} className="btn-chev" />
                </button>
                <button type="button" className="demo-btn btn-grpc" onClick={queueGrpc}>
                  <span className="btn-emoji">
                    <Zap size={17} />
                  </span>
                  <span className="btn-text">
                    gRPC Fast-Track
                    <span className="btn-desc">High priority · low latency</span>
                  </span>
                  <ArrowUpRight size={16} className="btn-chev" />
                </button>
                <button type="button" className="demo-btn btn-cron" onClick={queueCron}>
                  <span className="btn-emoji">
                    <Clock size={17} />
                  </span>
                  <span className="btn-text">
                    Distributed Cron
                    <span className="btn-desc">ShedLock every 10s</span>
                  </span>
                  <ArrowUpRight size={16} className="btn-chev" />
                </button>
                <button type="button" className="demo-btn btn-retry" onClick={queueRetry}>
                  <span className="btn-emoji">
                    <RefreshCw size={17} />
                  </span>
                  <span className="btn-text">
                    Retry &amp; Backoff
                    <span className="btn-desc">Exponential retry policy</span>
                  </span>
                  <ArrowUpRight size={16} className="btn-chev" />
                </button>
              </div>
            </aside>

            <aside className="glass-panel reveal-on-scroll">
              <h2 className="section-title">
                <span className="title-icon">
                  <Plus size={17} />
                </span>
                <StepBadge n={2} />
                Custom Job Builder
              </h2>
              <form onSubmit={queueCustomJob}>
                <div className="form-group">
                  <label className="form-label" htmlFor="job-type">
                    Job Type
                    <span className="form-hint">e.g. EMAIL_SENDER</span>
                  </label>
                  <input
                    id="job-type"
                    className="form-input"
                    value={customJob.jobType}
                    onChange={(e) => setCustomJob({ ...customJob, jobType: e.target.value })}
                    placeholder="CUSTOM_TASK"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="job-priority">
                    Priority
                  </label>
                  <select
                    id="job-priority"
                    className="form-select"
                    value={customJob.priority}
                    onChange={(e) =>
                      setCustomJob({ ...customJob, priority: e.target.value as JobPriority })
                    }
                  >
                    <option value="LOW">LOW</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="HIGH">HIGH (gRPC Fast-Track)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="job-cron">
                    Cron Schedule
                    <span className="form-hint">5-field UNIX</span>
                  </label>
                  <input
                    id="job-cron"
                    className="form-input"
                    value={customJob.cronExpression}
                    onChange={(e) => setCustomJob({ ...customJob, cronExpression: e.target.value })}
                    placeholder="* * * * *"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="job-attempts">
                      Max Attempts
                    </label>
                    <input
                      id="job-attempts"
                      type="number"
                      min={1}
                      className="form-input"
                      value={customJob.maxAttempts}
                      onChange={(e) => setCustomJob({ ...customJob, maxAttempts: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="job-timeout">
                      Timeout (s)
                    </label>
                    <input
                      id="job-timeout"
                      type="number"
                      min={1}
                      className="form-input"
                      value={customJob.timeoutSeconds}
                      onChange={(e) =>
                        setCustomJob({ ...customJob, timeoutSeconds: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="job-deps">
                    Dependencies
                    <span className="form-hint">Comma-separated parent Job UUIDs</span>
                  </label>
                  <input
                    id="job-deps"
                    className="form-input"
                    value={customJob.dependencies}
                    onChange={(e) => setCustomJob({ ...customJob, dependencies: e.target.value })}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  Add to Queue
                </button>
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => {
                      queueJob({
                        jobType: 'FAILING_JOB',
                        priority: 'HIGH',
                        payload: { simulateCrash: true },
                        schedule: { type: 'CRON', expression: '* * * * *' },
                        retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.0, maxBackoffSeconds: 10 },
                        timeoutSeconds: 30,
                      });
                    }}
                  >
                    <Skull size={16} />
                    Test AI Debugger (Trigger Crash)
                  </button>
                </div>
              </form>
            </aside>

            <aside className="glass-panel reveal-on-scroll">
              <h2 className="section-title">
                <span className="title-icon">
                  <ListChecks size={17} />
                </span>
                <StepBadge n={3} />
                Staged Jobs
                <span className="tab-count">{stagedJobs.length}</span>
              </h2>

              {stagedJobs.length === 0 ? (
                <div className="staged-empty">
                  <Send size={22} />
                  <div>Nothing staged yet.</div>
                  <div>Use the buttons above to build your batch.</div>
                </div>
              ) : (
                <>
                  <div className="staged-list">
                    {stagedJobs.map((job) => (
                      <div key={job.id} className="staged-job-item">
                        <div className="staged-job-meta">
                          <strong>{job.jobType}</strong>
                          <span>
                            <span className={`prio-chip prio-${job.priority}`}>{job.priority}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="staged-remove"
                          aria-label={`Remove ${job.jobType}`}
                          onClick={() => removeStagedJob(job.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="staged-footer">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearStaged}>
                      <Trash2 size={14} />
                      Clear all
                    </button>
                    <span className="form-hint">
                      {stagedJobs.length} job{stagedJobs.length === 1 ? '' : 's'} ready
                    </span>
                  </div>
                </>
              )}

              <button
                type="button"
                className="btn btn-accent"
                onClick={() => void executeSimulation()}
                disabled={stagedJobs.length === 0 || running}
                style={{ marginTop: 16 }}
              >
                <Play size={17} />
                {running ? 'Submitting…' : 'Test the Architecture'}
              </button>
            </aside>
          </div>

          {/* Workflow grid */}
          <div className="workflow-wrapper">
            <main className="glass-panel workflow-panel reveal-on-scroll" style={{ transitionDelay: '0.15s' }}>
            <div className="workflow-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                <span className="title-icon">
                  <Activity size={17} />
                </span>
                Execution Workflow
                <span className="arch-live-chip">
                  <span className="conn-dot" />
                  Live
                </span>
              </h2>
              <div className="filter-tabs">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`filter-tab ${filter === tab.key ? 'is-active' : ''}`}
                    onClick={() => setFilter(tab.key)}
                  >
                    {tab.label}
                    <span className="tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="job-grid-container">
              {loading ? (
                <div className="loading-wrap">
                  <div className="loading-spinner" />
                  <div className="form-hint">Connecting to the API…</div>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Boxes size={30} />
                  </div>
                  <h3>{filter === 'ALL' ? 'No jobs executed yet' : 'No jobs in this view'}</h3>
                  <p>
                    Build a batch on the left and click “Test the Architecture” to push jobs through
                    the pipeline.
                  </p>
                </div>
              ) : (
                <div className="job-grid">
                  {filteredJobs.map((job) => (
                    <div key={job.id ?? ''} onClick={() => setSelectedJob(job)} style={{cursor: 'pointer'}}>
                      <JobCard job={job} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
          </div>
        </div>

        {/* Backend Terminal Stream */}
        <BackendTerminal />

        {/* Live activity feed */}
        <section className="glass-panel activity-panel reveal-on-scroll">
          <h2 className="section-title">
            <span className="title-icon">
              <Activity size={17} />
            </span>
            Live Activity Feed
            <span className="arch-live-chip">
              <span className="conn-dot" />
              Streaming
            </span>
          </h2>
          {events.length === 0 ? (
            <div className="feed-empty">
              <Info size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Job lifecycle events will appear here in real time.
            </div>
          ) : (
            <div className="feed-list">
              {events.map((ev) => {
                const Icon = ev.from === null ? Send : STATUS_ICONS[ev.to];
                const spinning = ev.to === 'RUNNING';
                return (
                  <div key={ev.key} className="feed-item">
                    <div className={`feed-icon status-${ev.to}`}>
                      <Icon size={14} className={spinning ? 'spin' : ''} />
                    </div>
                    <div className="feed-main">
                      {ev.from === null ? (
                        <div className="feed-text">
                          <strong>{ev.jobType}</strong> submitted as{' '}
                          <span className={`job-status-badge status-${ev.to}`}>
                            <span className="status-dot" />
                            {ev.to}
                          </span>
                        </div>
                      ) : (
                        <div className="feed-text feed-arrow">
                          <span className="mono">{ev.jobType}</span>
                          <span className={`job-status-badge status-${ev.from}`}>
                            <span className="status-dot" />
                            {ev.from}
                          </span>
                          <span className="form-hint">→</span>
                          <span className={`job-status-badge status-${ev.to}`}>
                            <span className="status-dot" />
                            {ev.to}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="feed-time">{feedTime(ev.ts)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Architecture diagram */}
        <section className="glass-panel architecture-section reveal-on-scroll" style={{ transitionDelay: '0.1s' }}>
          <h2 className="section-title" style={{ justifyContent: 'center', marginBottom: 32 }}>
            <span className="title-icon">
              <Info size={17} />
            </span>
            Real-Time System Architecture
          </h2>

          <div className="arch-flow">
            <div className={`arch-node ${activeStates.apiGateway ? 'active-gateway' : ''}`}>
              <div className="arch-icon">
                <Server size={26} />
              </div>
              <h3>Spring Boot API</h3>
              <p>Job submission &amp; routing</p>
            </div>

            <svg width="400" height="50" viewBox="0 0 400 50" role="img" aria-label="Routing from API to queues">
              <path
                d="M 200 0 L 200 25 L 90 25 L 90 50"
                fill="none"
                strokeWidth="3"
                strokeDasharray="8"
                className={`arch-path ${activeStates.kafka ? 'active' : 'inactive'}`}
              />
              <path
                d="M 200 0 L 200 25 L 310 25 L 310 50"
                fill="none"
                strokeWidth="3"
                strokeDasharray="8"
                className={`arch-path grpc ${activeStates.grpc ? 'active' : 'inactive'}`}
              />
            </svg>

            <div className="arch-parallel">
              <div className={`arch-node ${activeStates.kafka ? 'active-kafka' : ''}`}>
                <div className="arch-icon">
                  <Layers size={26} />
                </div>
                <span className="route-label">Standard</span>
                <h3>Apache Kafka</h3>
                <p>Event stream · ordered</p>
              </div>
              <div className={`arch-node ${activeStates.grpc ? 'active-grpc' : ''}`}>
                <div className="arch-icon">
                  <Zap size={26} />
                </div>
                <span className="route-label">High Priority</span>
                <h3>gRPC Stream</h3>
                <p>Low-latency fast-track</p>
              </div>
            </div>

            <svg width="400" height="50" viewBox="0 0 400 50" role="img" aria-label="Queues merging into workers">
              <path
                d="M 90 0 L 90 25 L 200 25 L 200 50"
                fill="none"
                strokeWidth="3"
                strokeDasharray="8"
                className={`arch-path ${activeStates.kafka && activeStates.worker ? 'active' : 'inactive'}`}
              />
              <path
                d="M 310 0 L 310 25 L 200 25 L 200 50"
                fill="none"
                strokeWidth="3"
                strokeDasharray="8"
                className={`arch-path grpc ${activeStates.grpc && activeStates.worker ? 'active' : 'inactive'}`}
              />
            </svg>

            <div 
              className={`arch-node ${activeStates.worker ? 'active-worker' : ''}`}
              onClick={() => setShowWorkerHealth(true)}
              style={{ cursor: 'pointer' }}
              title="Click to view Live Cluster Health"
            >
              <div className="arch-icon">
                <Server size={26} />
              </div>
              <h3>Worker Nodes</h3>
              <p>{activeWorkers} Active Node{activeWorkers === 1 ? '' : 's'}</p>
            </div>

            <svg width="400" height="30" viewBox="0 0 400 30" role="img" aria-label="Workers writing to database">
              <path
                d="M 200 0 L 200 30"
                fill="none"
                strokeWidth="3"
                strokeDasharray="8"
                className="arch-path active-db"
              />
            </svg>

            <div className="arch-node active-db">
              <div className="arch-icon">
                <Database size={26} />
              </div>
              <h3>PostgreSQL</h3>
              <p>Persistent job state</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer reveal-on-scroll">
          <div className="footer-content">
            <div className="footer-about">
              <h3>Debi Prasad Das</h3>
              <p>
                Software engineer passionate about building scalable, distributed backend
                architectures and high-performance microservices.
              </p>
              <p>
                Torrent was built to handle massive workloads. I would love to extend this project
                and collaborate with you!
              </p>
            </div>
            <div className="footer-links">
              <a href="mailto:dddebiprasaddas2004@gmail.com" className="footer-link">
                <Mail size={17} />
                dddebiprasaddas2004@gmail.com
              </a>
              <a
                href="https://github.com/developer4949-code/Torrent"
                target="_blank"
                rel="noreferrer"
                className="footer-link"
              >
                <Code size={17} />
                View this project on GitHub (PRs welcome!)
              </a>
              <a
                href="https://www.linkedin.com/in/debi-prasad-das-458878292/"
                target="_blank"
                rel="noreferrer"
                className="footer-link"
              >
                <User size={17} />
                Connect with me on LinkedIn
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Debi Prasad Das. All rights reserved.
            </span>
            <span className="form-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={12} />
              React · Spring Boot · Kafka · gRPC
            </span>
          </div>
        </footer>
      </div>
      ) : (
        <ProjectDocumentation />
      )}

      {/* Toasts */}
      <div className="toast-region">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? 'toast-leaving' : ''}`}>
            <span className="toast-icon">
              {t.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : t.type === 'error' ? (
                <XCircle size={18} />
              ) : (
                <Info size={18} />
              )}
            </span>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.msg && <div className="toast-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>

      {showWorkerHealth && (
        <WorkerHealthModal onClose={() => setShowWorkerHealth(false)} />
      )}

      {selectedJob && (
        <JobDetailsModal 
          job={selectedJob} 
          onClose={() => setSelectedJob(null)} 
          groqApiKey={groqApiKey} 
        />
      )}

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Settings</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </header>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Torrent Master API Key</label>
                <input 
                  type="password" 
                  className="form-input" 
                  autoComplete="new-password"
                  spellCheck="false"
                  value={torrentApiKey}
                  onChange={(e) => {
                    setTorrentApiKey(e.target.value);
                    localStorage.setItem('torrentApiKey', e.target.value);
                  }}
                  placeholder="Enter your cluster key..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Groq API Key (For AI Debugger)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  autoComplete="new-password"
                  spellCheck="false"
                  value={groqApiKey}
                  onChange={(e) => {
                    setGroqApiKey(e.target.value);
                    localStorage.setItem('groqApiKey', e.target.value);
                  }}
                  placeholder="gsk_..."
                />
                <p className="form-hint" style={{marginTop: 8}}>Your key is stored locally in your browser.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

function JobCard({ job }: { job: Job }) {
  const attempts = job.attemptCount ?? 0;
  const maxAttempts = job.maxAttempts ?? 3;
  const pct = maxAttempts > 0 ? Math.min(100, Math.round((attempts / maxAttempts) * 100)) : 0;
  const running = ['RUNNING', 'PENDING', 'PICKED'].includes(job.status);

  return (
    <article className="job-card">
      <div className="job-top">
        <div>
          <div className="job-type">{job.jobType ?? 'JOB'}</div>
          <div className="job-id">{job.id ? `${job.id.slice(0, 8)}…` : '—'}</div>
        </div>
        <span className={`job-status-badge status-${job.status}`}>
          <span className={`status-dot ${running ? 'pulse' : ''}`} />
          {job.status}
        </span>
      </div>

      <div className="job-body">
        {job.priority && (
          <div className="job-meta-row">
            <span className="k">Priority</span>
            <span className={`prio-chip prio-${job.priority}`}>{job.priority}</span>
          </div>
        )}
        <div className="job-meta-row">
          <span className="k">Attempts</span>
          <span className="v">
            {attempts} / {maxAttempts}
          </span>
        </div>
        <div className="attempts">
          <div className="progress-track">
            <div className={`progress-fill ${pct >= 100 ? 'is-full' : ''}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="attempt-label">{pct}%</span>
        </div>
        {job.workerId && (
          <div className="job-meta-row">
            <span className="k">Worker</span>
            <span className="v">{job.workerId}</span>
          </div>
        )}
        <div className="job-meta-row">
          <span className="k">Created</span>
          <span className="job-time">
            <Clock size={11} />
            {timeAgo(job.createdAt)}
          </span>
        </div>
        {job.errorMessage && (
          <div className="job-error">
            <CircleAlert size={14} />
            {job.errorMessage}
          </div>
        )}
      </div>
    </article>
  );
}

export default App;
