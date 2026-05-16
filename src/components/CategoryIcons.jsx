const STROKE = { fill: 'none', stroke: 'white', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const S = (p) => ({ ...STROKE, ...p });

export function IconRent() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect x="3" y="9" width="18" height="13" rx="1.5" {...STROKE} />
      <path d="M9 22v-6h6v6" {...STROKE} />
      <path d="M2 9l10-7 10 7" {...STROKE} />
      <rect x="9" y="12" width="2.5" height="2.5" rx=".5" {...S({ strokeWidth: 1.4 })} />
      <rect x="12.5" y="12" width="2.5" height="2.5" rx=".5" {...S({ strokeWidth: 1.4 })} />
    </svg>
  );
}

export function IconBills() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...STROKE} />
      <polyline points="14 2 14 8 20 8" {...STROKE} />
      <line x1="9" y1="13" x2="15" y2="13" {...STROKE} />
      <line x1="12" y1="10.5" x2="12" y2="15.5" {...STROKE} />
    </svg>
  );
}

export function IconElectricity() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...STROKE} />
    </svg>
  );
}

export function IconInternet() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect x="4" y="13" width="16" height="8" rx="2" {...STROKE} />
      <path d="M12 13v-2" {...STROKE} />
      <path d="M8.5 11C9.5 9.5 10.7 8.5 12 8.5s2.5 1 3.5 2.5" {...STROKE} />
      <path d="M5.5 8.5C7.2 6.2 9.5 5 12 5s4.8 1.2 6.5 3.5" {...STROKE} />
      <circle cx="12" cy="17" r="1" fill="white" stroke="none" />
      <line x1="8" y1="17" x2="9.5" y2="17" {...STROKE} />
      <line x1="14.5" y1="17" x2="16" y2="17" {...STROKE} />
    </svg>
  );
}

export function IconSubscription() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <circle cx="12" cy="12" r="10" {...STROKE} />
      <polygon points="10 8 16 12 10 16 10 8" fill="white" stroke="none" />
    </svg>
  );
}

export function IconGym() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M6 8.5v7M18 8.5v7" {...STROKE} />
      <path d="M3 10.5v3M21 10.5v3" {...STROKE} />
      <line x1="6" y1="12" x2="18" y2="12" {...STROKE} />
      <rect x="3" y="10" width="3" height="4" rx="1" {...STROKE} />
      <rect x="18" y="10" width="3" height="4" rx="1" {...STROKE} />
      <rect x="5.5" y="8" width="2" height="8" rx="1" {...STROKE} />
      <rect x="16.5" y="8" width="2" height="8" rx="1" {...STROKE} />
    </svg>
  );
}

export function IconInstallment() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect x="2" y="5" width="20" height="14" rx="2" {...STROKE} />
      <line x1="2" y1="10" x2="22" y2="10" {...STROKE} />
      <line x1="6" y1="15" x2="10" y2="15" {...STROKE} />
    </svg>
  );
}

export function IconInvestment() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" {...STROKE} />
      <polyline points="16 7 22 7 22 13" {...STROKE} />
    </svg>
  );
}

export function IconSavings() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M20 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v1" {...STROKE} />
      <path d="M4 9h16a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a1 1 0 011-1z" {...STROKE} />
      <circle cx="12" cy="14" r="2" {...STROKE} />
    </svg>
  );
}

export function IconFamily() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...STROKE} />
      <circle cx="9" cy="7" r="4" {...STROKE} />
      <path d="M23 21v-2a4 4 0 00-3-3.87" {...STROKE} />
      <path d="M16 3.13a4 4 0 010 7.75" {...STROKE} />
    </svg>
  );
}

export function IconOther() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <circle cx="6" cy="12" r="1.5" fill="white" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="white" stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill="white" stroke="none" />
    </svg>
  );
}

/* ── Goal Icons ── */

export function IconTravel() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" {...STROKE} />
    </svg>
  );
}

export function IconCar() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h16l3 5v5a2 2 0 01-2 2h-2" {...STROKE} />
      <path d="M3 7l2-4h14l2 4" {...STROKE} />
      <circle cx="7.5" cy="17.5" r="2.5" {...STROKE} />
      <circle cx="16.5" cy="17.5" r="2.5" {...STROKE} />
    </svg>
  );
}

export function IconElectronics() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect x="3" y="4" width="18" height="13" rx="2" {...STROKE} />
      <line x1="3" y1="20" x2="21" y2="20" {...STROKE} />
      <line x1="8" y1="17" x2="8" y2="20" {...STROKE} />
      <line x1="16" y1="17" x2="16" y2="20" {...STROKE} />
    </svg>
  );
}

export function IconEmergency() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.5C17.25 22.15 21 17.25 21 12V7l-9-5z" {...STROKE} />
      <polyline points="9 12 11 14 15 10" {...STROKE} />
    </svg>
  );
}

export function IconEducation() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" {...STROKE} />
      <polyline points="6 11.5 6 18 12 21.5 18 18 18 11.5" {...STROKE} />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" {...STROKE} />
      <polyline points="9 22 9 12 15 12 15 22" {...STROKE} />
    </svg>
  );
}

export function IconDebt() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M16 3h5v5" {...STROKE} />
      <path d="M8 3H3v5" {...STROKE} />
      <path d="M12 22v-9" {...STROKE} />
      <path d="M15 13l-3-3-3 3" {...STROKE} />
      <path d="M21 3L3 21" {...STROKE} />
    </svg>
  );
}

const ICON_MAP = {
  rent: IconRent, bills: IconBills, electricity: IconElectricity,
  internet: IconInternet, subscription: IconSubscription, gym: IconGym,
  installment: IconInstallment, investment: IconInvestment, savings: IconSavings,
  family: IconFamily,
  travel: IconTravel, car: IconCar, electronics: IconElectronics,
  emergency: IconEmergency, education: IconEducation, home: IconHome, debt: IconDebt,
  other: IconOther,
};

export default function CatIcon({ id, size = 22 }) {
  const Icon = ICON_MAP[id] || IconOther;
  return <Icon size={size} />;
}
