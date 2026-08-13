import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Sparkles, ArrowRight } from 'lucide-react';

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
      <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: 'transparent', padding: '12px' }}>
            <Sparkles size={46} color="var(--text-primary)" strokeWidth={1} />
          </div>
        </div>
        
        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Good morning.</h2>
        <p style={{ marginBottom: '36px', fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
          Enter your cluster API key to access the engine.
        </p>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="API Key (e.g. torrent_secret_123)" 
              className="input-field"
              style={{ 
                padding: '16px 20px', 
                borderRadius: '16px', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)',
                fontSize: '1.05rem'
              }}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button 
              type="submit" 
              style={{ 
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                background: 'var(--text-primary)', 
                color: 'var(--bg-primary)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: '8px' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
