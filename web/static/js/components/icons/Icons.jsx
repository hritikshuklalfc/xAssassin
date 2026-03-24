/* SVG Icons - Matching Editorial Design */

function PassIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17 C6 7, 11 6, 14 11 C17 16, 19 10, 21 7" />
      <path d="M18.5 5.5 L21 7 L19.5 9.5" />
      <circle cx="3.8" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SCAIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M13 2.5 L6.5 12.5 H11 L11 21.5 L17.5 11.5 H13 Z" />
    </svg>
  );
}

function XTIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 22 22"
      fill="currentColor"
      stroke="none"
    >
      <rect x="1" y="1" width="5" height="5" rx="1" opacity="0.20" />
      <rect x="8" y="1" width="5" height="5" rx="1" opacity="0.42" />
      <rect x="15" y="1" width="5" height="5" rx="1" opacity="0.65" />
      <rect x="1" y="8" width="5" height="5" rx="1" opacity="0.45" />
      <rect x="8" y="8" width="5" height="5" rx="1" opacity="0.72" />
      <rect x="15" y="8" width="5" height="5" rx="1" opacity="0.88" />
      <rect x="1" y="15" width="5" height="5" rx="1" opacity="0.68" />
      <rect x="8" y="15" width="5" height="5" rx="1" opacity="0.90" />
      <rect x="15" y="15" width="5" height="5" rx="1" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <rect x="3" y="15" width="4.5" height="7" rx="1" />
      <rect x="9.5" y="9" width="4.5" height="13" rx="1" opacity="0.82" />
      <rect x="16" y="4" width="4.5" height="18" rx="1" opacity="0.65" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg
      className="tool-card-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
    >
      <circle cx="8.5" cy="12" r="5.5" opacity="0.88" />
      <circle cx="15.5" cy="12" r="5.5" opacity="0.88" />
    </svg>
  );
}

// Export to window
window.PassIcon = PassIcon;
window.SCAIcon = SCAIcon;
window.XTIcon = XTIcon;
window.StatsIcon = StatsIcon;
window.CompareIcon = CompareIcon;
