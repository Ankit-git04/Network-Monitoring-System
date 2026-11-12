import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * CombinedChart
 *
 * Unified Network Monitoring Chart combining Network Latency (ms) and
 * Packet Loss (%) into a single unified presentation with dual Y-axes,
 * live chronological time axis, legends, and device selection.
 */
export function CombinedChart({ data = [], devices = [], title = 'Network Performance Telemetry (Unified Metrics)' }) {
  const [selectedHost, setSelectedHost] = useState('ALL');

  // Extract unique hosts present in data
  const availableHosts = useMemo(() => {
    const hosts = [...new Set(data.map(d => d.host))].filter(Boolean);
    return hosts;
  }, [data]);

  // Aggregate and format data for the unified chart
  const chartPoints = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (selectedHost !== 'ALL') {
      // Filter for specific host
      return data
        .filter(d => d.host === selectedHost && d.timestamp)
        .map(d => ({
          time: new Date(d.timestamp).toLocaleTimeString(),
          timestamp: d.timestamp,
          host: d.host,
          latency: d.latency != null ? Number(d.latency) : null,
          packet_loss: d.packet_loss != null ? Number(d.packet_loss) : 0,
        }));
    }

    // "ALL" Devices mode: group by time window (or timestamp) and calculate average
    // Group records by unique timeKey (second-level resolution)
    const timeGroups = new Map();

    data.forEach(d => {
      if (!d.timestamp) return;
      const timeKey = new Date(d.timestamp).toLocaleTimeString();
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, {
          time: timeKey,
          timestamp: d.timestamp,
          latencies: [],
          losses: [],
          hosts: [],
        });
      }
      const group = timeGroups.get(timeKey);
      if (d.latency != null) group.latencies.push(Number(d.latency));
      if (d.packet_loss != null) group.losses.push(Number(d.packet_loss));
      group.hosts.push(d.host);
    });

    return Array.from(timeGroups.values()).map(g => {
      const avgLatency = g.latencies.length > 0
        ? Math.round((g.latencies.reduce((a, b) => a + b, 0) / g.latencies.length) * 10) / 10
        : null;
      const avgLoss = g.losses.length > 0
        ? Math.round((g.losses.reduce((a, b) => a + b, 0) / g.losses.length) * 10) / 10
        : 0;

      return {
        time: g.time,
        timestamp: g.timestamp,
        host: 'All Monitored Devices',
        latency: avgLatency,
        packet_loss: avgLoss,
        sampleCount: g.hosts.length,
      };
    });
  }, [data, selectedHost]);

  // Compute latest stats for quick header overview
  const latestPoint = chartPoints[chartPoints.length - 1];

  // Helper to get device label
  const getDeviceLabel = (host) => {
    const dev = devices.find(d => d.host === host);
    return dev ? `${dev.name} (${host})` : host;
  };

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0d1526', border: '1px solid #1a2744' }}>
      {/* Header with Title, Stats Badges, and Device Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-navy-700/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-200">{title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-900/40 text-blue-300 border border-blue-700/50">
              Dual-Axis Telemetry
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time combined timeline of Round-Trip Latency (ms) and Packet Loss (%)
          </p>
        </div>

        {/* Controls: Target Device Selector & Latest Readout */}
        <div className="flex items-center gap-3">
          {latestPoint && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-navy-900/80 border border-navy-700 text-blue-400 font-mono">
                RTT: <strong className="text-gray-100">{latestPoint.latency != null ? `${latestPoint.latency}ms` : '—'}</strong>
              </span>
              <span className="px-2 py-1 rounded bg-navy-900/80 border border-navy-700 text-amber-400 font-mono">
                Loss: <strong className="text-gray-100">{latestPoint.packet_loss != null ? `${latestPoint.packet_loss}%` : '0%'}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="device-select" className="text-xs text-gray-400 whitespace-nowrap">
              Target:
            </label>
            <select
              id="device-select"
              value={selectedHost}
              onChange={(e) => setSelectedHost(e.target.value)}
              className="bg-navy-900 border border-navy-600 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Devices (Aggregate Average)</option>
              {availableHosts.map((host) => (
                <option key={host} value={host}>
                  {getDeviceLabel(host)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Unified Chart Presentation */}
      {chartPoints.length === 0 ? (
        <div className="text-center text-gray-500 py-12 text-sm">
          No monitoring telemetry available in the current window.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {/* Packet Loss gradient */}
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              {/* Latency glow gradient */}
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />

            {/* Shared Time Axis */}
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              interval="preserveStartEnd"
              stroke="#1a2744"
            />

            {/* Primary Left Y-Axis: Network Latency (ms) */}
            <YAxis
              yAxisId="latencyAxis"
              orientation="left"
              stroke="#3b82f6"
              tick={{ fill: '#60a5fa', fontSize: 10 }}
              unit=" ms"
              label={{
                value: 'Latency (ms)',
                angle: -90,
                position: 'insideLeft',
                fill: '#60a5fa',
                fontSize: 10,
                offset: 10,
              }}
            />

            {/* Secondary Right Y-Axis: Packet Loss (%) */}
            <YAxis
              yAxisId="lossAxis"
              orientation="right"
              stroke="#f59e0b"
              tick={{ fill: '#fbbf24', fontSize: 10 }}
              unit="%"
              domain={[0, 100]}
              label={{
                value: 'Packet Loss (%)',
                angle: 90,
                position: 'insideRight',
                fill: '#fbbf24',
                fontSize: 10,
                offset: 10,
              }}
            />

            {/* Custom Unified Dark Tooltip */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0]?.payload;
                return (
                  <div
                    className="p-3 rounded-lg shadow-xl text-xs space-y-1.5"
                    style={{ backgroundColor: '#090e1a', border: '1px solid #1f2e4d' }}
                  >
                    <div className="font-semibold text-gray-300 border-b border-navy-700/80 pb-1 flex justify-between gap-4">
                      <span>{point?.host || 'Endpoint'}</span>
                      <span className="font-mono text-gray-400">{label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-blue-400">
                      <span>Network Latency:</span>
                      <span className="font-bold font-mono">
                        {point?.latency != null ? `${point.latency} ms` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-amber-400">
                      <span>Packet Loss:</span>
                      <span className="font-bold font-mono">
                        {point?.packet_loss != null ? `${point.packet_loss}%` : '0%'}
                      </span>
                    </div>
                    {point?.sampleCount && (
                      <div className="text-[10px] text-gray-500 pt-1 border-t border-navy-800">
                        Averaged across {point.sampleCount} device telemetry reports
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Unified Legend */}
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#9ca3af' }}
            />

            {/* Metric 1: Packet Loss Area (Right Axis) */}
            <Area
              yAxisId="lossAxis"
              type="monotone"
              dataKey="packet_loss"
              name="Packet Loss (%)"
              stroke="#f59e0b"
              fill="url(#lossGradient)"
              strokeWidth={2}
              connectNulls
            />

            {/* Metric 2: Network Latency Line (Left Axis) */}
            <Line
              yAxisId="latencyAxis"
              type="monotone"
              dataKey="latency"
              name="Network Latency (ms)"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#3b82f6' }}
              activeDot={{ r: 5, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 1 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
