import { useState, useCallback } from 'react';
import { StatCard } from '../components/StatCard';
import { DeviceTable } from '../components/DeviceTable';
import { CombinedChart } from '../components/CombinedChart';
import { LatencyChart } from '../components/LatencyChart';
import { PacketLossChart } from '../components/PacketLossChart';
import { monitoringAPI, deviceAPI, faultAPI } from '../services/api';
import { usePolling } from '../hooks/usePolling';

export function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [latestMonitoring, setLatestMonitoring] = useState([]);
  /**
   * chartData: records from GET /api/monitoring/chart
   * - Returns latest 20 records per host, within the last 10 minutes
   * - Sorted oldest→newest so Recharts plots left→right chronologically
   *
   * Root cause of old 5-minute graph delay:
   *   Old code called GET /api/monitoring?limit=100 (sorted newest→oldest across
   *   ALL hosts mixed together). With 5 devices × 5s polling, each device appeared
   *   only ~20 times in the 100 records, covering ~100 seconds. The charts then
   *   called .slice(-50) on the array, picking the OLDEST 50 of those 100 — which
   *   could be 5+ minutes stale. As DB history grew (734+ total records) the chart
   *   window drifted further back in time without refreshing properly.
   *
   * Fix: /api/monitoring/chart aggregates the last N records per host within a
   * configurable time window (default: last 10 minutes, 20 records per host),
   * and returns them sorted chronologically. This ensures charts always show
   * real-time data regardless of total DB history size.
   */
  const [chartData, setChartData] = useState([]);
  const [activeFaults, setActiveFaults] = useState([]);
  /**
   * stats: authoritative KPI data from GET /api/devices/stats
   * Shape: { total, up, down, pending, availability, avg_latency }
   *
   * Using this endpoint guarantees the invariant:
   *   total === up + down + pending
   *
   * Root cause of old bug: the dashboard previously calculated UP/DOWN
   * directly from /api/monitoring/latest, which returns records for EVERY
   * host ever monitored — including deleted devices. When stale records
   * existed (e.g. 2 deleted devices with UP status), the UI showed
   * UP > Total (e.g. 6 UP with 5 Total Devices).
   *
   * Fix: the backend /api/devices/stats joins the Device collection
   * (the authoritative population) against the latest monitoring record
   * per host, so only registered devices are counted.
   */
  const [stats, setStats] = useState(null);
  const [chartLayout, setChartLayout] = useState('combined');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [devRes, latestRes, chartRes, faultsRes, statsRes] = await Promise.all([
        deviceAPI.getAll().catch(() => ({ data: [] })),
        monitoringAPI.getLatest().catch(() => ({ data: [] })),
        // chart endpoint: last 20 records per host within last 10 minutes,
        // returned oldest→newest so Recharts plots left→right correctly
        monitoringAPI.getChart({ perHost: 20, minutes: 10 }).catch(() => ({ data: [] })),
        faultAPI.getActive().catch(() => ({ data: [] })),
        deviceAPI.getStats().catch(() => ({ data: null })),
      ]);

      setDevices(devRes.data || []);
      setLatestMonitoring(latestRes.data || []);
      setChartData(chartRes.data || []);
      setActiveFaults(faultsRes.data || []);
      setStats(statsRes.data || null);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to connect to backend server. Ensure backend and MongoDB are running.');
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchData, 5000);

  /**
   * KPI values — always sourced from the authoritative /api/devices/stats
   * response. This ensures total === up + down + pending even when stale
   * monitoring records exist for deleted devices.
   */
  const totalDevices  = stats?.total    ?? devices.length;
  const devicesUp     = stats?.up       ?? 0;
  const devicesDown   = stats?.down     ?? 0;
  const devicesPending = stats?.pending ?? 0;
  const activeFaultsCount = activeFaults.length;

  const avgLatency    = stats?.avg_latency ?? null;
  const availability  = stats?.availability ?? (totalDevices > 0 ? parseFloat(((devicesUp / totalDevices) * 100).toFixed(1)) : 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Network Operations Center</h2>
          <p className="text-sm text-gray-400">Real-time network health, telemetry, and fault monitoring</p>
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

      {/* Statistics Cards — invariant: Total = UP + DOWN + PENDING */}
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
          title="Pending"
          value={loading ? '...' : devicesPending}
          icon="⏳"
          color="orange"
          subtitle="Awaiting first check"
        />
        <StatCard
          title="Active Faults"
          value={loading ? '...' : activeFaultsCount}
          icon="⚠"
          color={activeFaultsCount > 0 ? 'red' : 'green'}
          subtitle={activeFaultsCount > 0 ? 'Attention needed' : 'All clear'}
        />
        <StatCard
          title="Availability"
          value={loading ? '...' : (availability != null ? `${availability}%` : '—')}
          icon="🌐"
          color="purple"
          subtitle="Current cycle"
        />
      </div>

      {/* Avg Latency banner (optional second row) */}
      <div className="grid grid-cols-1 gap-4">
        <StatCard
          title="Average Latency"
          value={loading ? '...' : (avgLatency != null ? `${avgLatency} ms` : '—')}
          icon="⏱"
          color="cyan"
          subtitle="UP devices only"
        />
      </div>

      {/* Performance Charts Layout Toggle & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-200">Network Telemetry Overview</h3>
          <span className="text-xs text-gray-500 font-mono">
            {chartLayout === 'combined' ? 'Combined View' : 'Split View'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-navy-800 p-1 rounded-lg border border-navy-700 text-xs">
          <button
            type="button"
            onClick={() => setChartLayout('combined')}
            className={`px-3 py-1 rounded transition-colors ${
              chartLayout === 'combined'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Combined Layout
          </button>
          <button
            type="button"
            onClick={() => setChartLayout('split')}
            className={`px-3 py-1 rounded transition-colors ${
              chartLayout === 'split'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Split Layout
          </button>
        </div>
      </div>

      {/* Real-Time Performance Chart(s) */}
      {chartLayout === 'combined' ? (
        <CombinedChart
          data={chartData}
          devices={devices}
          title="Network Performance Telemetry (Combined Latency & Packet Loss)"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LatencyChart data={chartData} title="Network Latency — Last 10 Minutes" />
          <PacketLossChart data={chartData} title="Packet Loss (%) — Last 10 Minutes" />
        </div>
      )}

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
