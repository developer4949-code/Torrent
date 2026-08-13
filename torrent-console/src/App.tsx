import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Activity, ListTree, Settings, KeySquare, LogOut, Sparkles } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import JobExplorer from './pages/JobExplorer';
import SettingsPage from './pages/Settings';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('torrent_api_key');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('torrent_api_key');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="flex items-center gap-4">
          <div style={{ padding: '8px' }}>
            <Sparkles size={24} color="var(--text-primary)" strokeWidth={1.5} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 0, fontFamily: 'var(--font-serif)' }}>Torrent</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Developer Console</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <button 
            className={`btn nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
            style={{ width: '100%', justifyContent: 'flex-start', background: location.pathname === '/' ? '' : 'transparent', border: 'none' }}
          >
            <Activity size={20} /> Overview
          </button>
          <button 
            className={`btn nav-link ${location.pathname === '/jobs' ? 'active' : ''}`}
            onClick={() => navigate('/jobs')}
            style={{ width: '100%', justifyContent: 'flex-start', background: location.pathname === '/jobs' ? '' : 'transparent', border: 'none' }}
          >
            <ListTree size={20} /> Job Explorer
          </button>
          <button 
            className={`btn nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
            style={{ width: '100%', justifyContent: 'flex-start', background: location.pathname === '/settings' ? '' : 'transparent', border: 'none' }}
          >
            <Settings size={20} /> Settings
          </button>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button className="btn btn-outline w-full" onClick={handleLogout}>
            <LogOut size={16} /> Disconnect
          </button>
        </div>
      </div>
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute>
            <AppLayout><JobExplorer /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout><SettingsPage /></AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
