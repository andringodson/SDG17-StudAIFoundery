'use client';

/**
 * The SDG 17 partnership mark: three nodes in a closed triangle, reading as
 * a minimal network diagram rather than a generic badge. Each node carries
 * one of the brand accent colours so the mark itself demonstrates the
 * "three (or more) parties, one connected structure" idea the platform is
 * about. `animated` adds the slow pulse used on the loading screen; the
 * static version (nav/footer) stays still.
 */
export function LogoMark({ size = 34, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={animated ? 'logo-mark logo-mark--animated' : 'logo-mark'}
    >
      <defs>
        <linearGradient id="logoGradA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00AED6" />
          <stop offset="100%" stopColor="#1F69B3" />
        </linearGradient>
        <linearGradient id="logoGradB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2EC4B6" />
          <stop offset="100%" stopColor="#00AED6" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="38" height="38" rx="10" fill="#0A3A60" />

      {/* connecting lines drawn first so the nodes sit on top */}
      <path
        d="M14 15 L26 15 L20 27 Z"
        fill="none"
        stroke="url(#logoGradA)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
        className="logo-mark__web"
      />

      <circle cx="14" cy="15" r="4.4" fill="url(#logoGradA)" className="logo-mark__node logo-mark__node--1" />
      <circle cx="26" cy="15" r="4.4" fill="url(#logoGradB)" className="logo-mark__node logo-mark__node--2" />
      <circle cx="20" cy="27" r="4.4" fill="#1F69B3" className="logo-mark__node logo-mark__node--3" />
    </svg>
  );
}

export function Logo({ withCaption = false }: { withCaption?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-1.5">
          <strong className="text-base font-extrabold tracking-tight">SDG 17</strong>
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-text-3">Partnership Platform</span>
        </span>
        {withCaption && (
          <span className="mt-0.5 text-[0.68rem] font-medium tracking-wide text-text-3/80">
            A Project by Error404
          </span>
        )}
      </span>
    </span>
  );
}
