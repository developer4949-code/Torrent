import React, { useEffect, useState } from 'react';
import { Search, Bot, RotateCcw, AlertTriangle } from 'lucide-react';

interface Job {
  id: string;
  idempotencyKey: string;
  jobType: string;
  status: string;
  payload: any;
  priority: string;
  errorMessage: string;
  attemptCount: number;
}

export default function JobExplorer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const fetchJobs = async () => {
    const key = localStorage.getItem('torrent_api_key');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}/api/v1/admin/jobs?size=100`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
    const int = setInterval(fetchJobs, 3000);
    return () => clearInterval(int);
  }, []);

  const handleDiagnose = async (job: Job) => {
    const groqKey = localStorage.getItem('groqApiKey');
    if (!groqKey) {
      setAiDiagnosis("Please set your Groq API Key in Settings first.");
      return;
    }
    
    setIsDiagnosing(true);
    setAiDiagnosis('');
    
    try {
      const prompt = `Diagnose this background job failure:
Job Type: ${job.jobType}
Payload: ${job.payload}
Error: ${job.errorMessage}
Please explain what might have caused this and how to fix it briefly.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setAiDiagnosis(data.choices[0].message.content);
      } else {
        setAiDiagnosis(`Groq Error: ${res.statusText}`);
      }
    } catch (err) {
      setAiDiagnosis("Failed to reach Groq API.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRetry = async (job: Job) => {
    const key = localStorage.getItem('torrent_api_key');
    try {
      await fetch(`${import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}/api/v1/admin/jobs/${job.id}/retry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}` }
      });
      setSelectedJob(null);
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Job Explorer</h1>
      
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Job Type</th>
              <th>Idempotency Key</th>
              <th>Attempts</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id} onClick={() => setSelectedJob(job)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className={`badge badge-${job.status.toLowerCase()}`}>
                    {job.status}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{job.jobType}</td>
                <td>{job.idempotencyKey}</td>
                <td>{job.attemptCount}</td>
                <td>{job.priority}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>No jobs found in the system.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
              <h2>Job Details</h2>
              <span className={`badge badge-${selectedJob.status.toLowerCase()}`}>
                {selectedJob.status}
              </span>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p><strong>ID:</strong> {selectedJob.id}</p>
              <p><strong>Type:</strong> {selectedJob.jobType}</p>
              <p><strong>Key:</strong> {selectedJob.idempotencyKey}</p>
            </div>

            <h3 style={{ marginBottom: '12px' }}>Payload</h3>
            <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', overflowX: 'auto', marginBottom: '24px' }}>
              {JSON.stringify(selectedJob.payload, null, 2)}
            </pre>

            {selectedJob.status === 'DEAD' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--danger)', marginBottom: '8px' }}>
                  <AlertTriangle size={20} />
                  <h3 style={{ margin: 0, color: 'var(--danger)' }}>Fatal Error</h3>
                </div>
                <p style={{ color: '#fca5a5' }}>{selectedJob.errorMessage}</p>
                
                <div className="flex gap-4" style={{ marginTop: '16px' }}>
                  <button className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleRetry(selectedJob)}>
                    <RotateCcw size={16} /> Force Retry
                  </button>
                  <button className="btn btn-primary" onClick={() => handleDiagnose(selectedJob)} disabled={isDiagnosing}>
                    <Bot size={16} /> {isDiagnosing ? 'Analyzing Stack Trace...' : 'Analyze with Groq LLaMA-3'}
                  </button>
                </div>
                
                {aiDiagnosis && (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                    <h4 style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>AI Diagnosis</h4>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                      {aiDiagnosis}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
