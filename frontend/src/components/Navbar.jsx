import { useState, useEffect } from 'react';
import { healthAPI } from '../services/api';

export function Navbar({ onRefresh }) {
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        await healthAPI.check();
        setConnected(true);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        setConnected(false);
      }
    };
    check();
    const timer = setInterval(check, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-6" style={{ backgroundColor: '#0d1526', borderBottom: '1px solid #1a2744' }}>
      <h1 className="text-base font-semibold text-gray-100">Network Monitoring System</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {lastUpdated && <span className="text-xs text-gray-500">Updated: {lastUpdated}</span>}
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          ↻ Refresh
        </button>
      </div>
    </header>
  );
}
