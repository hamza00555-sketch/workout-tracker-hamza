import { useApp } from '../context/AppContext.jsx';

const TABS = [
  { id: 'dashboard',   label: 'الرئيسية',  icon: '/assets/icons/nav-home.png' },
  { id: 'commitments', label: 'التزاماتي', icon: '/assets/icons/nav-commitments.png' },
  { id: 'banks',       label: 'بنوكي',     icon: '/assets/icons/nav-banks.png' },
  { id: 'goals',       label: 'أهدافي',    icon: '/assets/icons/nav-goals.png' },
  { id: 'settings',    label: 'الإعدادات', icon: '/assets/icons/nav-settings.png' },
];

export default function BottomNav() {
  const { page, setPage } = useApp();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, right: 0, left: 0, maxWidth: 430, margin: '0 auto',
      background: '#13103A', borderTop: '1px solid #2A2660',
      display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {TABS.map(tab => {
        const active = page === tab.id;
        return (
          <button key={tab.id} onClick={() => setPage(tab.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 2px 8px', gap: 3, fontFamily: 'Cairo, sans-serif',
            color: active ? '#00C9A7' : '#5C5A8A', transition: 'color .15s',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: active ? 'rgba(0,201,167,0.15)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
            }}>
              <img
                src={tab.icon}
                width={22} height={22}
                style={{
                  objectFit: 'contain',
                  filter: active ? 'none' : 'saturate(0) brightness(0.55)',
                  transition: 'filter .15s',
                }}
              />
            </div>
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
