import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

/**
 * PacketLossChart
 *
 * Displays packet loss (%) over time, one area per host.
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
export function PacketLossChart({ data = [], title = 'Packet Loss (%) — Last 10 min' }) {
  const hostSet = [...new Set(data.map(d => d.host))].filter(Boolean);

  const timeMap = new Map();
  data.forEach(d => {
    if (d.packet_loss == null || !d.timestamp) return;
    const timeKey = new Date(d.timestamp).toLocaleTimeString();
    if (!timeMap.has(timeKey)) timeMap.set(timeKey, { time: timeKey });
    timeMap.get(timeKey)[d.host] = d.packet_loss;
  });

  const formatted = Array.from(timeMap.values());

  const COLORS    = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
  const GRADIENTS = hostSet.map((host, i) => `grad-${i}`);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0d1526', border: '1px solid #1a2744' }}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {formatted.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">
          No packet loss data in the last 10 minutes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formatted}>
            <defs>
              {hostSet.map((host, i) => (
                <linearGradient key={host} id={GRADIENTS[i]} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}   />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
            <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d1526', border: '1px solid #1a2744', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
            />
            {hostSet.length > 1 && <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 11 }} />}
            {hostSet.map((host, i) => (
              <Area
                key={host}
                type="monotone"
                dataKey={host}
                name={host}
                stroke={COLORS[i % COLORS.length]}
                fill={`url(#${GRADIENTS[i]})`}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
