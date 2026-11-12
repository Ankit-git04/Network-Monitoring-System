import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function LatencyChart({ data = [], title = 'Latency Over Time' }) {
  const formatted = data
    .filter(d => d.latency != null)
    .slice(-50)
    .map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      latency: d.latency,
      host: d.host,
    }));

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0d1526', border: '1px solid #1a2744' }}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {formatted.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">No latency data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
            <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit=" ms" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d1526', border: '1px solid #1a2744', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#60a5fa' }}
            />
            <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
