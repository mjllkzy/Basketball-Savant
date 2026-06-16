export function BasketballCourt({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 500 470" className={className} role="img" aria-label="Basketball half court">
      <rect x="1" y="1" width="498" height="468" rx="10" fill="#fbf7ef" stroke="#334155" strokeWidth="2" />
      <line x1="0" y1="50" x2="500" y2="50" stroke="#334155" strokeWidth="2" />
      <rect x="190" y="50" width="120" height="190" fill="none" stroke="#334155" strokeWidth="2" />
      <rect x="170" y="50" width="160" height="190" fill="none" stroke="#334155" strokeWidth="2" opacity="0.45" />
      <circle cx="250" cy="94" r="7" fill="none" stroke="#334155" strokeWidth="2" />
      <path d="M190 240a60 60 0 0 0 120 0" fill="none" stroke="#334155" strokeWidth="2" />
      <path d="M190 240a60 60 0 0 1 120 0" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="8 6" />
      <path d="M30 50v92M470 50v92" stroke="#334155" strokeWidth="2" />
      <path d="M30 142a220 220 0 0 0 440 0" fill="none" stroke="#334155" strokeWidth="2" />
      <path d="M70 50h360" stroke="#334155" strokeWidth="2" opacity="0.35" />
      {children}
    </svg>
  );
}

export function courtPoint(x: number, y: number) {
  return {
    cx: 250 + x * 9,
    cy: 50 + y * 8.4
  };
}
