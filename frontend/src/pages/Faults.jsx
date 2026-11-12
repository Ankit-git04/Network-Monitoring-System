import { useState, useCallback } from 'react';
import { faultAPI } from '../services/api';
import { FaultTable } from '../components/FaultTable';
import { usePolling } from '../hooks/usePolling';

export function Faults() {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history' | 'all'
  const [activeFaults, setActiveFaults] = useState([]);
  const [faultHistory, setFaultHistory] = useState([]);
  const [allFaults, setAllFaults] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFaults = useCallback(async () => {
    try {
      const [actRes, histRes, allRes] = await Promise.all([
        faultAPI.getActive().catch(() => ({ data: [] })),
        faultAPI.getHistory().catch(() => ({ data: [] })),
        faultAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setActiveFaults(actRes.data || []);
      setFaultHistory(histRes.data || []);
      setAllFaults(allRes.data || []);
    } catch (err) {
      console.error('Error fetching faults:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchFaults, 5000);

  const criticalCount = activeFaults.filter(f => f.severity === 'CRITICAL').length;
  const highCount = activeFaults.filter(f => f.severity === 'HIGH').length;
  const mediumCount = activeFaults.filter(f => f.severity === 'MEDIUM').length;

  const currentList = activeTab === 'active'
    ? activeFaults
    : activeTab === 'history'
      ? faultHistory
      : allFaults;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Fault Management</h2>
          <p className="text-sm text-gray-400">Automated fault detection, severity triage, and recovery tracking</p>
        </div>
        <button
          onClick={fetchFaults}
          className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-gray-300 rounded-lg text-xs border border-navy-600 transition-colors"
        >
          ↻ Refresh Now
        </button>
      </div>

      {/* Fault Summary Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-navy-800 border border-navy-600 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Active Incidents</span>
            <div className="text-2xl font-bold text-red-400 mt-1">{activeFaults.length}</div>
          </div>
          <span className="text-2xl text-red-400">⚠</span>
        </div>

        <div className="bg-navy-800 border border-navy-600 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Critical Severity</span>
            <div className="text-2xl font-bold text-red-500 mt-1">{criticalCount}</div>
          </div>
          <span className="text-2xl text-red-500">⚡</span>
        </div>

        <div className="bg-navy-800 border border-navy-600 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">High / Medium</span>
            <div className="text-2xl font-bold text-orange-400 mt-1">{highCount + mediumCount}</div>
          </div>
          <span className="text-2xl text-orange-400">🔥</span>
        </div>

        <div className="bg-navy-800 border border-navy-600 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Recovered Faults</span>
            <div className="text-2xl font-bold text-green-400 mt-1">{faultHistory.length}</div>
          </div>
          <span className="text-2xl text-green-400">✔</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-navy-600 gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'active'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          Active Faults ({activeFaults.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history'
              ? 'border-green-500 text-green-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          Recovery History ({faultHistory.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'all'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
          All Events ({allFaults.length})
        </button>
      </div>

      {/* Faults Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading fault telemetry...</div>
      ) : (
        <FaultTable faults={currentList} />
      )}
    </div>
  );
}

