import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Log', icon: '📋' },
  { to: '/stats', label: 'Stats', icon: '📊' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-14 z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors ${
              isActive ? 'text-green-600 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <span className="text-xl mb-0.5">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
