import React, { useEffect, useState } from 'react';
import { Server, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface Overview {
  totalJobs: number;
  activeWorkers: number;
  jobsByStatus: Record<string, number>;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      const key = localStorage.getItem('torrent_api_key');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}/api/v1/admin/jobs/analytics/overview`, {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (res.status === 401) {
          localStorage.removeItem('torrent_api_key');
          window.location.href = '/login';
          return;
        }
        if (res.ok) setOverview(await res.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchOverview();
    const int = setInterval(fetchOverview, 2000);
    return () => clearInterval(int);
  }, []);

  if (!overview) return <div>Loading cluster data...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '32px' }}>Cluster Overview</h1>
      
      <div className="grid-stats">
        <div className="glass-card flex items-center gap-4">
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '50%' }}>
            <Activity size={32} color="var(--accent-primary)" />
          </div>
          <div>
            <p>Total Jobs Processed</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{overview.totalJobs}</h2>
          </div>
        </div>
        
        <div className="glass-card flex items-center gap-4">
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '50%' }}>
            <Server size={32} color="var(--success)" />
          </div>
          <div>
            <p>Active Workers</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{overview.activeWorkers}</h2>
          </div>
        </div>
        
        <div className="glass-card flex items-center gap-4">
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '50%' }}>
            <AlertCircle size={32} color="var(--danger)" />
          </div>
          <div>
            <p>Dead-Letter Queue</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{overview.jobsByStatus['DEAD'] || 0}</h2>
          </div>
        </div>
      </div>
      
      <h2 style={{ marginTop: '48px', marginBottom: '24px' }}>Queue Metrics</h2>
      <div className="glass-panel">
        <div className="flex gap-6">
          <div style={{ flex: 1 }}>
            <p style={{ marginBottom: '8px' }}>Pending</p>
            <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((((overview.jobsByStatus['PENDING'] || 0) + (overview.jobsByStatus['SCHEDULED'] || 0)) / overview.totalJobs) * 100, 100)}%`, background: '#60a5fa' }} />
            </div>
            <p style={{ marginTop: '4px', textAlign: 'right', fontSize: '0.9rem' }}>{(overview.jobsByStatus['PENDING'] || 0) + (overview.jobsByStatus['SCHEDULED'] || 0)}</p>
          </div>
          
          <div style={{ flex: 1 }}>
            <p style={{ marginBottom: '8px' }}>Running</p>
            <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(((overview.jobsByStatus['RUNNING'] || 0) / overview.totalJobs) * 100, 100)}%`, background: '#fbbf24' }} />
            </div>
            <p style={{ marginTop: '4px', textAlign: 'right', fontSize: '0.9rem' }}>{overview.jobsByStatus['RUNNING'] || 0}</p>
          </div>
          
          <div style={{ flex: 1 }}>
            <p style={{ marginBottom: '8px' }}>Success</p>
            <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(((overview.jobsByStatus['COMPLETED'] || 0) / overview.totalJobs) * 100, 100)}%`, background: '#34d399' }} />
            </div>
            <p style={{ marginTop: '4px', textAlign: 'right', fontSize: '0.9rem' }}>{overview.jobsByStatus['COMPLETED'] || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
