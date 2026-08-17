import { useState } from 'react';
import { X, Bot, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import './index.css';

interface JobDetailsModalProps {
  job: any;
  onClose: () => void;
  groqApiKey: string;
}

export function JobDetailsModal({ job, onClose, groqApiKey }: JobDetailsModalProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!groqApiKey) {
      setAiError("Please set your Groq API Key in Settings first.");
      return;
    }
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const prompt = `You are an expert distributed systems debugger. A background job just failed. 
Here are the details:
Job Type: ${job.jobType}
Error Message: ${job.errorMessage}
Priority: ${job.priority}

Please provide a short, concise, and helpful diagnosis of why this failed and how the developer can fix it.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      setAiAnalysis(data.choices[0].message.content);
    } catch (err: any) {
      setAiError(err.message || "Failed to analyze error.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!job) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Job Inspector</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>
        
        <div className="modal-body">
          <div className="job-meta-grid">
            <div className="meta-item">
              <span className="k">Job ID</span>
              <span className="v mono">{job.id}</span>
            </div>
            <div className="meta-item">
              <span className="k">Type</span>
              <span className="v">{job.jobType}</span>
            </div>
            <div className="meta-item">
              <span className="k">Status</span>
              <span className={`job-status-badge status-${job.status}`}>{job.status}</span>
            </div>
            <div className="meta-item">
              <span className="k">Priority</span>
              <span className={`prio-chip prio-${job.priority}`}>{job.priority}</span>
            </div>
            <div className="meta-item">
              <span className="k">Worker Node</span>
              <span className="v mono">{job.workerId || 'Unassigned'}</span>
            </div>
            <div className="meta-item">
              <span className="k">Attempts</span>
              <span className="v">{job.attemptCount} / {job.maxAttempts}</span>
            </div>
            <div className="meta-item">
              <span className="k">Created At</span>
              <span className="v">{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            {job.updatedAt && (
              <div className="meta-item">
                <span className="k">Updated At</span>
                <span className="v">{new Date(job.updatedAt).toLocaleString()}</span>
              </div>
            )}
            {job.dependencies && job.dependencies.length > 0 && (
              <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
                <span className="k">Dependencies (DAG)</span>
                <span className="v mono" style={{ color: 'var(--blue)' }}>
                  {job.dependencies.join(', ')}
                </span>
              </div>
            )}
          </div>

          {job.errorMessage && (
            <div className="error-section">
              <h3 className="error-title"><AlertCircle size={16} /> Error Trace</h3>
              <pre className="error-pre">{job.errorMessage}</pre>
              
              <div className="ai-debugger">
                {!aiAnalysis ? (
                  <button className="btn btn-primary btn-ai" onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze with OpenRouter AI'}
                  </button>
                ) : (
                  <div className="ai-result">
                    <h4><Bot size={16} /> AI Diagnosis</h4>
                    <p>{aiAnalysis}</p>
                  </div>
                )}
                {aiError && <div className="error-text">{aiError}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
