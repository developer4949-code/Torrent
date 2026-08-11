import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';

export default function Settings() {
  const [torrentKey, setTorrentKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTorrentKey(localStorage.getItem('torrent_api_key') || '');
    setGroqKey(localStorage.getItem('groqApiKey') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('torrent_api_key', torrentKey);
    localStorage.setItem('groqApiKey', groqKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Settings</h1>
      
      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '24px' }}>API Configuration</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Torrent API Key</label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              className="input-field"
              style={{ paddingLeft: '44px' }}
              value={torrentKey}
              onChange={(e) => setTorrentKey(e.target.value)}
            />
          </div>
          <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Used to connect to your Torrent backend API.</p>
        </div>
        
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Groq API Key (AI Debugger)</label>
          <div style={{ position: 'relative' }}>
            <KeyRound size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              className="input-field"
              style={{ paddingLeft: '44px' }}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
            />
          </div>
          <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Used to power the LLaMA-3 stack trace analyzer.</p>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? 'Saved Successfully!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
