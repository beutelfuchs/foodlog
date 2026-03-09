import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Log', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#22d3ee' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  )},
  { to: '/stats', label: 'Stats', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#22d3ee' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
    </svg>
  )},
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex justify-around items-center h-14 z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium tracking-wider uppercase transition-all duration-200 ${
              isActive ? 'text-cyan-400' : 'text-neutral-500 active:text-neutral-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="mb-0.5">{tab.icon(isActive)}</span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-400" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
