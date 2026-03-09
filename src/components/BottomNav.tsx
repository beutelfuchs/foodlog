import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Log', icon: (active: boolean) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? '#22d3ee' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  )},
  { to: '/stats', label: 'Stats', icon: (active: boolean) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? '#22d3ee' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
    </svg>
  )},
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-700 flex justify-around items-center h-16 z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
              isActive ? 'text-cyan-400' : 'text-neutral-500 active:text-neutral-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="mb-1">{tab.icon(isActive)}</span>
              <span>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
