import { StatusBadge } from './StatusBadge';

export function FaultTable({ faults = [] }) {
  const severityColors = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  };

  if (!faults || faults.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10 bg-navy-800 rounded-xl border border-navy-600">
        No faults recorded
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-navy-800 rounded-xl border border-navy-600">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-600 bg-navy-900/50">
            {['Host / Device', 'Fault Type', 'Severity', 'Description', 'Status', 'First Detected', 'Recovery Time'].map(h => (
              <th key={h} className="text-left py-3.5 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700">
          {faults.map((fault) => (
            <tr key={fault._id || `${fault.host}-${fault.first_detected}`} className="hover:bg-navy-700/40 transition-colors">
              <td className="py-3 px-4 font-mono text-xs text-gray-200">
                <div>{fault.name || fault.host}</div>
                {fault.name && <div className="text-gray-500 text-[11px]">{fault.host}</div>}
              </td>
              <td className="py-3 px-4 font-medium text-gray-100">
                {fault.fault_type}
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${severityColors[fault.severity] || 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                  {fault.severity}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-300 text-xs">
                {fault.description || fault.fault_type}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={fault.status} />
              </td>
              <td className="py-3 px-4 text-xs text-gray-400">
                {fault.first_detected ? new Date(fault.first_detected).toLocaleString() : '—'}
              </td>
              <td className="py-3 px-4 text-xs text-gray-400">
                {fault.recovery_time ? new Date(fault.recovery_time).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

