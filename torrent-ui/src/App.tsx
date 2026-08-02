import React, { useState, useEffect, useMemo } from 'react';
import { Play, Zap, Clock, RefreshCw, AlertCircle, Database, Server, Cpu, Layers, X, Info, Code, User, Mail } from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:8080/api/v1/jobs';

function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stagedJobs, setStagedJobs] = useState([]);
  
  // Real-time animation pulses
  const [grpcPulse, setGrpcPulse] = useState(false);
  const [lastJobsRef, setLastJobsRef] = useState([]);

  // Custom Form State
  const [customJob, setCustomJob] = useState({
    jobType: 'CUSTOM_TASK',
    priority: 'STANDARD',
    cronExpression: '* * * * *',
    maxAttempts: 3
  });

  const fetchJobs = async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 1000); // Poll every second
    return () => clearInterval(interval);
  }, []);

  // Detect new gRPC jobs and pulse the UI for 1.5 seconds
  useEffect(() => {
    if (lastJobsRef.length > 0 && jobs.length > 0) {
      const newHighJobs = jobs.filter(j => j.priority === 'HIGH' && !lastJobsRef.some(old => old.id === j.id));
      if (newHighJobs.length > 0) {
        setGrpcPulse(true);
        const t = setTimeout(() => setGrpcPulse(false), 1500);
        return () => clearTimeout(t);
      }
    }
    setLastJobsRef(jobs);
  }, [jobs]);

  // Scroll Animation Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-reveal');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [jobs, stagedJobs]); // Re-bind if elements change (though mostly static layout)

  const queueJob = (payload) => {
    setStagedJobs([...stagedJobs, { ...payload, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const removeStagedJob = (id) => {
    setStagedJobs(stagedJobs.filter(j => j.id !== id));
  };

  const executeSimulation = async () => {
    for (const job of stagedJobs) {
      // Small artificial delay to show staggered submission
      await new Promise(r => setTimeout(r, 200)); 
      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...job, idempotencyKey: `job-${Date.now()}-${Math.random()}` }),
        });
      } catch (err) {
        console.error('Submission failed', err);
      }
    }
    setStagedJobs([]); // Clear queue after execution
    fetchJobs(); // instant visual update
  };

  const queueCustomJob = (e) => {
    e.preventDefault();
    queueJob({
      jobType: customJob.jobType,
      payload: { customData: 'User submitted task' },
      priority: customJob.priority,
      schedule: { type: 'CRON', expression: customJob.cronExpression },
      retryPolicy: { maxAttempts: parseInt(customJob.maxAttempts, 10), backoffMultiplier: 2.0, maxBackoffSeconds: 30 }
    });
  };

  const testKafka = () => queueJob({
    jobType: 'DATA_PROCESS', payload: { test: 'Standard Kafka Queue' }, priority: 'STANDARD',
    schedule: { type: 'CRON', expression: '* * * * *' }
  });

  const testGrpc = () => queueJob({
    jobType: 'URGENT_TASK', payload: { test: 'gRPC Fast-Track' }, priority: 'HIGH',
    schedule: { type: 'CRON', expression: '* * * * *' }
  });

  const testCron = () => queueJob({
    jobType: 'RECURRING_TASK', payload: { test: 'Distributed Cron' }, priority: 'LOW',
    schedule: { type: 'CRON', expression: '*/10 * * * * *' }
  });

  const testRetry = () => queueJob({
    jobType: 'FLAKY_TASK', payload: { test: 'Retry and Backoff' }, priority: 'STANDARD',
    schedule: { type: 'CRON', expression: '* * * * *' },
    retryPolicy: { maxAttempts: 3, backoffMultiplier: 2.0, maxBackoffSeconds: 30 }
  });

  // Derived Architecture Node Activity States
  const activeStates = useMemo(() => {
    const hasPendingStandard = jobs.some(j => j.status === 'PENDING' && (j.priority === 'STANDARD' || j.priority === 'LOW'));
    const hasPendingHigh = jobs.some(j => j.status === 'PENDING' && j.priority === 'HIGH');
    const hasScheduled = jobs.some(j => j.status === 'SCHEDULED');
    const recentActivity = jobs.some(j => j.status === 'PENDING' || j.status === 'SCHEDULED');

    return {
      apiGateway: recentActivity || grpcPulse,
      kafka: hasPendingStandard || hasScheduled,
      grpc: hasPendingHigh || grpcPulse,
      worker: recentActivity || grpcPulse,
      db: true
    };
  }, [jobs, grpcPulse]);

  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
        <div className="ambient-orb orb-3"></div>
      </div>
      <div className="app-container">
        
        <header className="header reveal-on-scroll">
          <h1>Torrent Distributed Engine</h1>
          <p>Real-time visualization of highly scalable job execution</p>
        </header>

        {/* About Section */}
        <div className="about-section reveal-on-scroll">
          <h2><Info size={20} style={{display: 'inline', verticalAlign: 'middle', marginRight: 8}}/> About the Architecture</h2>
          <p style={{color: 'var(--text-secondary)'}}>
            This dashboard connects to a robust Java Spring Boot microservices cluster designed for massive scale.
          </p>
          <div className="about-features">
            <div className="feature-item"><Layers className="icon" size={18}/> Apache Kafka Event Streaming</div>
            <div className="feature-item"><Zap className="icon" size={18}/> gRPC Fast-Track (Low Latency)</div>
            <div className="feature-item"><Clock className="icon" size={18}/> Distributed Cron (ShedLock)</div>
            <div className="feature-item"><RefreshCw className="icon" size={18}/> Resilient Retries & Backoff</div>
            <div className="feature-item"><Database className="icon" size={18}/> PostgreSQL Persistence</div>
          </div>
        </div>

        <div className="top-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="reveal-on-scroll">
            <aside className="glass-panel">
              <h2 className="controls-title">1. Queue Demo Jobs</h2>
              
              <button className="submit-btn btn-kafka" onClick={testKafka}>
                <div className="btn-icon"><Play size={20} /></div>
                Standard Kafka Queue
              </button>
              <button className="submit-btn btn-grpc" onClick={testGrpc}>
                <div className="btn-icon"><Zap size={20} /></div>
                gRPC Fast-Track (High Priority)
              </button>
              <button className="submit-btn btn-cron" onClick={testCron}>
                <div className="btn-icon"><Clock size={20} /></div>
                Distributed Cron (10s interval)
              </button>
              <button className="submit-btn btn-retry" onClick={testRetry}>
                <div className="btn-icon"><RefreshCw size={20} /></div>
                Retry Strategy & Backoff
              </button>
            </aside>

            <aside className="glass-panel">
              <h2 className="controls-title">2. Custom Job Builder</h2>
              <form onSubmit={queueCustomJob}>
                <div className="form-group">
                  <label className="form-label">Job Type</label>
                  <input className="form-input" value={customJob.jobType} onChange={e => setCustomJob({...customJob, jobType: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={customJob.priority} onChange={e => setCustomJob({...customJob, priority: e.target.value})}>
                    <option value="LOW">LOW</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="HIGH">HIGH (gRPC Fast-Track)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cron Schedule</label>
                  <input className="form-input" value={customJob.cronExpression} onChange={e => setCustomJob({...customJob, cronExpression: e.target.value})} placeholder="* * * * *" />
                </div>
                <button type="submit" className="custom-submit">Add to Queue</button>
              </form>
            </aside>
            
            <aside className="glass-panel">
               <h2 className="controls-title">3. Staged Jobs ({stagedJobs.length})</h2>
               
               {stagedJobs.length === 0 ? (
                 <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0'}}>
                   Add jobs above to build your simulation batch.
                 </p>
               ) : (
                 <div style={{maxHeight: '200px', overflowY: 'auto', marginBottom: '16px'}}>
                   {stagedJobs.map(job => (
                     <div key={job.id} className="staged-job-item">
                       <div>
                         <strong style={{display: 'block'}}>{job.jobType}</strong>
                         <span style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>{job.priority} Priority</span>
                       </div>
                       <button onClick={() => removeStagedJob(job.id)}><X size={16}/></button>
                     </div>
                   ))}
                 </div>
               )}
               
               <button 
                  className="execute-sim-btn" 
                  onClick={executeSimulation} 
                  disabled={stagedJobs.length === 0}
                >
                 <Play size={18} style={{display: 'inline', verticalAlign: 'middle', marginRight: 8}} />
                 Test the Architecture
               </button>
            </aside>
          </div>

          <main className="glass-panel reveal-on-scroll" style={{ display: 'flex', flexDirection: 'column', transitionDelay: '0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 className="controls-title" style={{ margin: 0 }}>Execution Workflow</h2>
              {loading && <div className="loading-spinner"></div>}
            </div>

            <div className="job-grid-container">
              <div className="job-grid">
                {jobs.length === 0 && !loading && (
                  <div className="empty-state">
                    <AlertCircle size={48} />
                    <h3>No jobs executed yet</h3>
                    <p>Build a batch on the left and click 'Test the Architecture'.</p>
                  </div>
                )}
                
                {jobs.map((job, index) => (
                  <div 
                    key={job.id} 
                    className="job-card reveal-on-scroll"
                    style={{ animationDelay: `${(index % 20) * 0.05}s` }}
                  >
                    <div className="job-header">
                      <div>
                        <div className="job-type">{job.jobType}</div>
                        <div className="job-id">{job.id.substring(0, 8)}...</div>
                      </div>
                      <span className={`job-status-badge status-${job.status}`}>{job.status}</span>
                    </div>
                    <div className="job-details">
                      <div className="detail-row"><strong>Priority:</strong> {job.priority}</div>
                      <div className="detail-row"><strong>Attempts:</strong> {job.attempts} / {job.maxAttempts}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        {/* Dynamic Architecture Diagram */}
        <div className="glass-panel architecture-section reveal-on-scroll" style={{ transitionDelay: '0.1s' }}>
          <h2 className="controls-title" style={{ textAlign: 'center', marginBottom: '40px' }}>Real-Time System Architecture</h2>
          
          <div className="arch-flow">
            
            {/* Level 1: API Gateway */}
            <div className={`arch-node ${activeStates.apiGateway ? 'active-gateway' : ''}`}>
              <div className="arch-icon"><Server size={28} /></div>
              <h3>Spring Boot API</h3>
              <p>Job Submission & Routing</p>
            </div>

            {/* Splitter Arrow */}
            <svg width="400" height="50" viewBox="0 0 400 50" style={{ display: 'block', margin: '0 auto' }}>
              <path d="M 200 0 L 200 25 L 90 25 L 90 50" fill="none" stroke="var(--text-secondary)" strokeWidth="3" strokeDasharray="8" className={`arch-path ${activeStates.kafka ? 'active' : ''}`} />
              <path d="M 200 0 L 200 25 L 310 25 L 310 50" fill="none" stroke="var(--text-secondary)" strokeWidth="3" strokeDasharray="8" className={`arch-path grpc ${activeStates.grpc ? 'active' : ''}`} />
            </svg>

            {/* Level 2: Queues */}
            <div className="arch-parallel">
              <div className={`arch-node ${activeStates.kafka ? 'active-kafka' : ''}`}>
                <div className="arch-icon"><Layers size={28} /></div>
                <h3>Apache Kafka</h3>
                <p>Standard Event Stream</p>
              </div>
              <div className={`arch-node ${activeStates.grpc ? 'active-grpc' : ''}`}>
                <div className="arch-icon"><Zap size={28} /></div>
                <h3>gRPC Stream</h3>
                <p>Low-Latency Fast-Track</p>
              </div>
            </div>

            {/* Merger Arrow */}
            <svg width="400" height="50" viewBox="0 0 400 50" style={{ display: 'block', margin: '0 auto' }}>
              <path d="M 90 0 L 90 25 L 200 25 L 200 50" fill="none" stroke="var(--text-secondary)" strokeWidth="3" strokeDasharray="8" className={`arch-path ${activeStates.worker && activeStates.kafka ? 'active' : ''}`} />
              <path d="M 310 0 L 310 25 L 200 25 L 200 50" fill="none" stroke="var(--text-secondary)" strokeWidth="3" strokeDasharray="8" className={`arch-path grpc ${activeStates.worker && activeStates.grpc ? 'active' : ''}`} />
            </svg>

            {/* Level 3: Workers */}
            <div className={`arch-node ${activeStates.worker ? 'active-worker' : ''}`}>
              <div className="arch-icon"><Cpu size={28} /></div>
              <h3>Worker Nodes</h3>
              <p>Distributed Job Execution</p>
            </div>
            
            {/* Straight Arrow */}
            <svg width="400" height="30" viewBox="0 0 400 30" style={{ display: 'block', margin: '0 auto' }}>
              <path d="M 200 0 L 200 30" fill="none" stroke="var(--text-secondary)" strokeWidth="3" strokeDasharray="8" className={`arch-path active-db`} />
            </svg>

            {/* Level 4: Database */}
            <div className={`arch-node active-db`}>
              <div className="arch-icon"><Database size={28} /></div>
              <h3>PostgreSQL</h3>
              <p>Persistent State</p>
            </div>

          </div>
        </div>

        {/* Footer Section */}
        <footer className="footer reveal-on-scroll">
          <div className="footer-content">
            <div className="footer-about">
              <h3>Debi Prasad Das</h3>
              <p>Software Engineer passionate about building scalable, distributed backend architectures and high-performance microservices.</p>
              <p>I built this engine to handle massive scale. I would love to extend this project and collaborate with you!</p>
            </div>
            
            <div className="footer-links">
              <a href="mailto:dddebiprasaddas2004@gmail.com" className="footer-link">
                <Mail size={18} /> dddebiprasaddas2004@gmail.com
              </a>
              <a href="https://github.com/developer4949-code/Torrent" target="_blank" rel="noreferrer" className="footer-link">
                <Code size={18} /> View this project on GitHub (Free for Pull Requests!)
              </a>
              <a href="https://www.linkedin.com/in/debi-prasad-das-458878292/" target="_blank" rel="noreferrer" className="footer-link">
                <User size={18} /> Connect with me on LinkedIn (Please add a note regarding this project!)
              </a>
            </div>
          </div>
          
          <div className="footer-bottom">
            &copy; {new Date().getFullYear()} All rights reserved. Debi Prasad Das.
          </div>
        </footer>

      </div>
    </>
  );
}

export default App;
