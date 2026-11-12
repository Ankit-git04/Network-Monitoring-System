import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

/**
 * LatencyChart
 *
 * Displays network latency (ms) over time, one line per host.
 *
 * Data is sourced from GET /api/monitoring/chart which returns:
 *   - Latest N records per host within the last M minutes
 *   - Sorted oldest→newest (chronological) for correct left→right rendering
 *
 * Root cause of old 5-minute delay (fixed):
 *   Old code called .slice(-50) on the array from GET /api/monitoring?limit=100.
 *   That API returns records sorted newest→oldest across all hosts. .slice(-50)
 *   picked the OLDEST 50 of those 100 records — displaying stale historical
 *   data 5+ minutes in the past, not the current monitoring window.
 */
export function LatencyChart({ data = [], title = 'Network Latency (Last 10 min)' }) {
  // Group records by host to draw one line per device
  const hostSet = [...new Set(data.map(d => d.host))].filter(Boolean);

  // Build a flat chronological list with per-host columns for Recharts
  // Key: timestamp string; value: { time, host1_latency, host2_latency, ... }
  const timeMap = new Map();
  data.forEach(d => {
    if (d.latency == null || !d.timestamp) return;
    const timeKey = new Date(d.timestamp).toLocaleTimeString();
    if (!timeMap.has(timeKey)) timeMap.set(timeKey, { time: timeKey });
    timeMap.get(timeKey)[d.host] = d.latency;
  });

  const formatted = Array.from(timeMap.values());

  // Distinct colors for up to 8 hosts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0d1526', border: '1px solid #1a2744' }}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {formatted.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">
          No latency data in the last 10 minutes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
            <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit=" ms" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d1526', border: '1px solid #1a2744', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
            />
            {hostSet.length > 1 && <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />}
            {hostSet.map((host, i) => (
              <Line
                key={host}
                type="monotone"
                dataKey={host}
                name={host}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
