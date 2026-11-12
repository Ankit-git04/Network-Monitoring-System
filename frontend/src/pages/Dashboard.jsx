import { useState, useCallback } from 'react';
import { StatCard } from '../components/StatCard';
import { DeviceTable } from '../components/DeviceTable';
import { LatencyChart } from '../components/LatencyChart';
import { PacketLossChart } from '../components/PacketLossChart';
import { monitoringAPI, deviceAPI, faultAPI } from '../services/api';
import { usePolling } from '../hooks/usePolling';

export function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [latestMonitoring, setLatestMonitoring] = useState([]);
  const [allMonitoring, setAllMonitoring] = useState([]);
  const [activeFaults, setActiveFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [devRes, latestRes, historyRes, faultsRes] = await Promise.all([
        deviceAPI.getAll().catch(() => ({ data: [] })),
        monitoringAPI.getLatest().catch(() => ({ data: [] })),
        monitoringAPI.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        faultAPI.getActive().catch(() => ({ data: [] })),
      ]);

      setDevices(devRes.data || []);
      setLatestMonitoring(latestRes.data || []);
      setAllMonitoring(historyRes.data || []);
      setActiveFaults(faultsRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to connect to backend server. Ensure backend and MongoDB are running.');
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchData, 5000);

  // Calculate statistics from real data
  const totalDevices = devices.length;
  const devicesUp = latestMonitoring.filter(m => m.status === 'UP').length;
  const devicesDown = latestMonitoring.filter(m => m.status === 'DOWN' || m.status === 'TIMEOUT').length;
  const activeFaultsCount = activeFaults.length;

  const validLatencies = latestMonitoring
    .map(m => m.latency)
    .filter(l => l !== null && l !== undefined);
  const avgLatency = validLatencies.length > 0
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
    : null;

  const availability = totalDevices > 0
    ? ((devicesUp / totalDevices) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Network Operations Center</h2>
          <p className="text-sm text-gray-400">Real-time network health, telemetry, and fault telemetry</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-navy-800 px-3 py-1.5 rounded-lg border border-navy-600 text-gray-400">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Auto-refreshing every 5s
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/60 text-red-300 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={fetchData} className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-xs text-white">Retry</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Devices"
          value={loading ? '...' : totalDevices}
          icon="🖥"
          color="blue"
          subtitle="Monitored targets"
        />
        <StatCard
          title="Devices UP"
          value={loading ? '...' : devicesUp}
          icon="▲"
          color="green"
          subtitle="Active & responding"
        />
        <StatCard
          title="Devices DOWN"
          value={loading ? '...' : devicesDown}
          icon="▼"
          color="red"
          subtitle="Unreachable"
        />
        <StatCard
          title="Active Faults"
          value={loading ? '...' : activeFaultsCount}
          icon="⚠"
          color={activeFaultsCount > 0 ? 'red' : 'green'}
          subtitle={activeFaultsCount > 0 ? 'Attention needed' : 'All clear'}
        />
        <StatCard
          title="Average Latency"
          value={loading ? '...' : (avgLatency != null ? `${avgLatency} ms` : '—')}
          icon="⏱"
          color="cyan"
          subtitle="Active endpoints"
        />
        <StatCard
          title="Availability"
          value={loading ? '...' : (availability != null ? `${availability}%` : '—')}
          icon="🌐"
          color="purple"
          subtitle="Current cycle"
        />
      </div>

      {/* Real-Time Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyChart data={allMonitoring} title="Network Latency History (Recent Checks)" />
        <PacketLossChart data={allMonitoring} title="Packet Loss History (%)" />
      </div>

      {/* Device Monitoring Table */}
      <div className="rounded-xl p-5 border border-navy-600" style={{ backgroundColor: '#0d1526' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-200">Configured Devices & Real-Time Status</h3>
          <span className="text-xs text-gray-400">{devices.length} devices configured</span>
        </div>
        <DeviceTable devices={devices} monitoringData={latestMonitoring} />
      </div>
    </div>
  );
}

