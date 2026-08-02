import React, { useEffect, useState, useRef } from 'react';
import { Terminal, ShieldCheck } from 'lucide-react';
import './BackendTerminal.css';

interface LogMessage {
  id: number;
  text: string;
}

export const BackendTerminal: React.FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8080/api/stream/logs');

    eventSource.addEventListener('log', (event) => {
      const newLog = { id: ++logId.current, text: event.data };
      setLogs((prev) => {
        const next = [...prev, newLog];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });
    });

    eventSource.onerror = () => {
      console.error('SSE connection lost');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="terminal-container reveal-on-scroll" style={{ transitionDelay: '0.2s' }}>
      <div className="terminal-header">
        <div className="term-left">
          <Terminal size={15} />
          <span>Live Cluster Logs</span>
        </div>
        <div className="term-right">
          <ShieldCheck size={14} className="safe-icon" />
          <span className="term-status">SSE Connected</span>
        </div>
      </div>
      <div className="terminal-body" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="term-placeholder">Awaiting backend cluster logs...</div>
        ) : (
          logs.map((log) => {
            const isGrpc = log.text.includes('[gRPC]');
            const isKafka = log.text.includes('[KAFKA]');
            const isDb = log.text.includes('[API-GATEWAY]');
            
            let highlightClass = '';
            if (isGrpc) highlightClass = 'log-grpc';
            if (isKafka) highlightClass = 'log-kafka';
            if (isDb) highlightClass = 'log-db';

            return (
              <div key={log.id} className="term-line">
                <span className="term-prompt">&gt;</span>{' '}
                <span className={highlightClass}>{log.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
