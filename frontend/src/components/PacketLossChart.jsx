import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PacketLossChart({ data = [], title = 'Packet Loss Over Time' }) {
  const formatted = data
    .filter(d => d.packet_loss != null)
    .slice(-50)
    .map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      packet_loss: d.packet_loss,
    }));

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0d1526', border: '1px solid #1a2744' }}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {formatted.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">No packet loss data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="packetLossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
            <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d1526', border: '1px solid #1a2744', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#f59e0b' }}
            />
            <Area type="monotone" dataKey="packet_loss" stroke="#f59e0b" fill="url(#packetLossGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
