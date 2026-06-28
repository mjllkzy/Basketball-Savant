import type { CSSProperties } from "react";

type ShotClockMarkProps = {
  className?: string;
  idPrefix?: string;
  style?: CSSProperties;
  title?: string;
};

export function ShotClockMark({ className = "", idPrefix = "shotclock-mark", style, title }: ShotClockMarkProps) {
  const ballId = `${idPrefix}-ball`;
  const signalId = `${idPrefix}-signal`;
  const shadowId = `${idPrefix}-shadow`;
  const titleId = title ? `${idPrefix}-title` : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-labelledby={titleId}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={style}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={ballId} x1="14" x2="50" y1="12" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FDBA74" />
          <stop offset="0.48" stopColor="#F97316" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id={signalId} x1="13" x2="52" y1="41" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#99F6E4" />
          <stop offset="0.55" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#A7F3D0" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#020617" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="16" fill="#101820" />
      <circle cx="32" cy="32" r="23" fill={`url(#${ballId})`} filter={`url(#${shadowId})`} />
      <path d="M12 32h40" stroke="#7C2D12" strokeWidth="2.6" strokeLinecap="round" opacity="0.72" />
      <path d="M32 9c-6.8 7.4-9.8 15.1-9.8 23S25.2 47.6 32 55" stroke="#7C2D12" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.72" />
      <path d="M32 9c6.8 7.4 9.8 15.1 9.8 23S38.8 47.6 32 55" stroke="#7C2D12" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.72" />
      <path d="M15 21c4.8 3.9 10.5 5.9 17 5.9s12.2-2 17-5.9" stroke="#7C2D12" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.62" />
      <path d="M15 43c4.8-3.9 10.5-5.9 17-5.9s12.2 2 17 5.9" stroke="#7C2D12" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.62" />
      <path d="M13.5 38.5l8.1-5.9 7.2 3.6 8.3-11.9 6.3 5 7.4-9.4" stroke="#052E2B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.52" />
      <path d="M13.5 38.5l8.1-5.9 7.2 3.6 8.3-11.9 6.3 5 7.4-9.4" stroke={`url(#${signalId})`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <g fill="#ECFEFF" stroke="#0F766E" strokeWidth="1.7">
        <circle cx="21.6" cy="32.6" r="2.7" />
        <circle cx="28.8" cy="36.2" r="2.7" />
        <circle cx="37.1" cy="24.3" r="2.7" />
        <circle cx="43.4" cy="29.3" r="2.7" />
      </g>
      <circle cx="50.8" cy="19.9" r="3.2" fill="#ECFEFF" stroke="#0F766E" strokeWidth="1.9" />
      <path d="M18 15.8c3.8-3 8.4-4.7 13.8-4.7 6.1 0 11.4 2.2 15.4 5.8" stroke="#FED7AA" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}
