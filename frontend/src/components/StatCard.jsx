export function StatCard({ title, value, icon, color = 'blue', subtitle }) {
  const colorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    orange: 'text-amber-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
  };
  return (
    <div className="bg-[#0d1526] border border-[#1a2744] rounded-xl p-5 flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        {icon && <span className={`text-2xl ${colorMap[color]}`}>{icon}</span>}
      </div>
      <div className={`text-3xl font-bold ${colorMap[color]}`}>{value ?? '—'}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}
