'use client';

/**
 * The mark is the numeral itself — "17" drawn as a single confident geometric
 * line-glyph, not a network/globe/handshake icon. Those are the three most
 * over-used shorthand for "partnership," and none of them say "17" the way
 * this does. One stroke weight, one colour, no gradient — it has to work at
 * 20px in a browser tab as well as it does at 200px.
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
      <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill="#000000" stroke="rgb(255 255 255 / 0.16)" />
      <g
        className="logo-mark__glyph"
        stroke="#ececee"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* "1" */}
        <path d="M9 13.5 L14.5 9.5 L14.5 30.5" />
        <path d="M9 30.5 L20 30.5" />
        {/* "7" */}
        <path d="M22 9.5 L33 9.5 L23.5 30.5" />
      </g>
    </svg>
  );
}

export function Logo({ withCaption = false }: { withCaption?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-1.5">
          <strong className="text-base font-semibold tracking-tight">SDG 17</strong>
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-text-3">Partnership Platform</span>
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
