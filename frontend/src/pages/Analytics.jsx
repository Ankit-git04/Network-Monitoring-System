import { useState, useEffect, useCallback } from 'react';
import { deviceAPI, monitoringAPI } from '../services/api';
import { LatencyChart } from '../components/LatencyChart';
import { PacketLossChart } from '../components/PacketLossChart';

export function Analytics() {
  const [devices, setDevices] = useState([]);
  const [selectedHost, setSelectedHost] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await deviceAPI.getAll();
        const list = res.data || [];
        setDevices(list);
        if (list.length > 0) {
          setSelectedHost(list[0].host);
        }
      } catch (err) {
        console.error('Failed to load devices for analytics:', err);
      }
    }
    loadDevices();
  }, []);

  const fetchHostAnalytics = useCallback(async (host) => {
    if (!host) return;
    setLoading(true);
    try {
      const [analRes, histRes] = await Promise.all([
        monitoringAPI.getAnalytics(host).catch(() => ({ data: null })),
        monitoringAPI.getHistory(host).catch(() => ({ data: [] })),
      ]);
      setAnalytics(analRes.data || null);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHost) {
      fetchHostAnalytics(selectedHost);
    }
  }, [selectedHost, fetchHostAnalytics]);

  const selectedDevice = devices.find(d => d.host === selectedHost);

  return (
    <div className="space-y-6">
      {/* Header with Device Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Performance Analytics</h2>
          <p className="text-sm text-gray-400">Deep telemetry analysis, availability metrics, and historical performance</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400">Target Device:</label>
          <select
            value={selectedHost}
            onChange={(e) => setSelectedHost(e.target.value)}
            className="px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            {devices.map(d => (
              <option key={d.host} value={d.host}>
                {d.name} ({d.host})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Calculating network telemetry metrics...</div>
      ) : !analytics ? (
        <div className="text-center py-16 text-gray-500 bg-navy-800 rounded-xl border border-navy-600">
          No monitoring telemetry recorded for this device yet.
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-navy-800 border border-navy-600 rounded-xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase">Availability</span>
              <div className="text-3xl font-bold text-purple-400 mt-2">
                {analytics.availability_percent != null ? `${analytics.availability_percent}%` : '—'}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">Uptime ratio</span>
            </div>

            <div className="bg-navy-800 border border-navy-600 rounded-xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase">Average Latency</span>
              <div className="text-3xl font-bold text-cyan-400 mt-2">
                {analytics.avg_latency != null ? `${analytics.avg_latency} ms` : '—'}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">Mean RTT roundtrip</span>
            </div>

            <div className="bg-navy-800 border border-navy-600 rounded-xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase">Avg Packet Loss</span>
              <div className="text-3xl font-bold text-amber-400 mt-2">
                {analytics.avg_packet_loss != null ? `${analytics.avg_packet_loss}%` : '0%'}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">Transmitted packets lost</span>
            </div>

            <div className="bg-navy-800 border border-navy-600 rounded-xl p-5">
              <span className="text-xs text-gray-400 font-medium uppercase">Total Samples</span>
              <div className="text-3xl font-bold text-blue-400 mt-2">
                {analytics.total_checks ?? history.length}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                UP: {analytics.up_count || 0} | DOWN: {analytics.down_count || 0}
              </span>
            </div>
          </div>

          {/* Historical Trend Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LatencyChart
              data={history}
              title={`Latency Analytics Trend — ${selectedDevice?.name || selectedHost}`}
            />
            <PacketLossChart
              data={history}
              title={`Packet Loss Analytics Trend — ${selectedDevice?.name || selectedHost}`}
            />
          </div>

          {/* Fault Breakdown Breakdown */}
          <div className="bg-navy-800 rounded-xl border border-navy-600 p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Detected Fault Categorization</h3>
            {analytics.fault_counts && Object.keys(analytics.fault_counts).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(analytics.fault_counts).map(([faultType, count]) => (
                  <div key={faultType} className="bg-navy-900/60 p-3.5 rounded-lg border border-navy-700">
                    <span className="text-xs text-gray-400 block truncate">{faultType}</span>
                    <span className="text-xl font-bold text-red-400 mt-1 block">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center">
                ✔ Zero fault incidents detected on this device.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

