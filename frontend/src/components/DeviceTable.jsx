import { StatusBadge } from './StatusBadge';

export function DeviceTable({ devices, monitoringData, onSelectDevice }) {
  // Create a map of host -> latest monitoring record
  const monMap = {};
  (monitoringData || []).forEach(r => { monMap[r.host] = r; });

  if (!devices || !devices.length) {
    return <div className="text-center text-gray-500 py-8">No devices configured</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid #1a2744' }}>
            {['Device', 'IP Address', 'Type', 'Status', 'Latency', 'Packet Loss', 'TCP Status'].map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devices.map(device => {
            const mon = monMap[device.host];
            return (
              <tr
                key={device._id || device.host}
                onClick={() => onSelectDevice && onSelectDevice(device)}
                className="hover:bg-white/5 cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid #111c35' }}
              >
                <td className="py-3 px-4 font-medium text-gray-100">{device.name}</td>
                <td className="py-3 px-4 text-gray-400 font-mono text-xs">{device.host}</td>
                <td className="py-3 px-4 text-gray-400">{device.type}</td>
                <td className="py-3 px-4">
                  {mon ? <StatusBadge status={mon.status} /> : <span className="text-gray-600 text-xs">No data</span>}
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {mon?.latency != null ? `${mon.latency} ms` : '—'}
                </td>
                <td className="py-3 px-4 text-gray-300">
                  {mon?.packet_loss != null ? `${mon.packet_loss}%` : '—'}
                </td>
                <td className="py-3 px-4">
                  {mon?.tcp_status ? <StatusBadge status={mon.tcp_status} /> : <span className="text-gray-600 text-xs">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
