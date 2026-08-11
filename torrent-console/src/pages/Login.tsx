import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, TerminalSquare } from 'lucide-react';

export default function Login() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL_BASE || 'http://localhost:8080'}/api/v1/admin/jobs/workers`, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      
      if (res.ok) {
        localStorage.setItem('torrent_api_key', key);
        navigate('/');
      } else {
        setError('Invalid API Key. Connection refused.');
      }
    } catch (err) {
      setError('Failed to reach cluster. Is it running?');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '16px', borderRadius: '12px', boxShadow: '0 0 30px var(--accent-glow)' }}>
            <TerminalSquare size={40} color="white" />
          </div>
        </div>
        
        <h2>Torrent Console</h2>
        <p style={{ marginBottom: '32px' }}>Enter your cluster API Key to access the engine</p>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div style={{ position: 'relative' }}>
            <KeyRound size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              placeholder="API Key (e.g. torrent_secret_123)" 
              className="input-field"
              style={{ paddingLeft: '44px' }}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}
          
          <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px', fontSize: '1rem' }}>
            Connect to Cluster
          </button>
        </form>
      </div>
    </div>
  );
}
