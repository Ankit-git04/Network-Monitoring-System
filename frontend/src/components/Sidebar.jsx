import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview', icon: '⊞' },
  { to: '/devices', label: 'Devices', icon: '⬡' },
  { to: '/monitoring', label: 'Live Monitoring', icon: '◎' },
  { to: '/faults', label: 'Fault Management', icon: '⚠' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#0d1526', borderRight: '1px solid #1a2744' }}>
      <div className="p-6" style={{ borderBottom: '1px solid #1a2744' }}>
        <h1 className="text-lg font-bold text-blue-400 leading-tight">Network Monitoring System</h1>
        <p className="text-xs text-gray-500 mt-1">NMS v1.0</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
            style={({ isActive }) => isActive ? {} : {}}
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-gray-600 text-center" style={{ borderTop: '1px solid #1a2744' }}>
        NMS © 2024
      </div>
    </aside>
  );
}
