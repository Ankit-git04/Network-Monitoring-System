export function StatusBadge({ status }) {
  const configs = {
    UP: 'bg-green-900/40 text-green-400 border border-green-700',
    DOWN: 'bg-red-900/40 text-red-400 border border-red-700',
    TIMEOUT: 'bg-amber-900/40 text-amber-400 border border-amber-700',
    OPEN: 'bg-green-900/40 text-green-400 border border-green-700',
    CLOSED: 'bg-red-900/40 text-red-400 border border-red-700',
    UNREACHABLE: 'bg-gray-800 text-gray-400 border border-gray-600',
    active: 'bg-red-900/40 text-red-400 border border-red-700',
    recovered: 'bg-green-900/40 text-green-400 border border-green-700',
  };
  const cls = configs[status] || 'bg-gray-800 text-gray-400 border border-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      ● {status}
    </span>
  );
}
