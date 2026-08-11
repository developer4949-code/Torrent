import { useState, useEffect } from 'react';
import { X, Server, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import './index.css';

interface WorkerStatus {
  workerId: string;
  hostname: string;
  registeredAt: string;
  alive: boolean;
}

export function WorkerHealthModal({ onClose }: { onClose: () => void }) {
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}/api/v1/admin/jobs/workers`);
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const int = setInterval(fetchWorkers, 3000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            <Server size={18} style={{ marginRight: 8 }} />
            Cluster Node Health
          </h2>
          <div style={{display: 'flex', gap: 10}}>
            <button className="icon-btn" onClick={fetchWorkers}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </header>
        
        <div className="modal-body">
          {workers.length === 0 && !loading ? (
            <div className="feed-empty">No worker nodes registered.</div>
          ) : (
            <div className="worker-list" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {workers.map(w => (
                <div key={w.workerId} className="worker-card" style={{
                  padding: 16, 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8}}>
                      {w.hostname}
                      {w.alive ? 
                        <span style={{color: 'var(--green)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4}}><CheckCircle2 size={14}/> ALIVE</span> : 
                        <span style={{color: 'var(--red)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4}}><XCircle size={14}/> DEAD (No Heartbeat)</span>
                      }
                    </div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)'}}>
                      ID: {w.workerId}
                    </div>
                  </div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end'}}><Clock size={12}/> Registered</div>
                    <div>{new Date(w.registeredAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
