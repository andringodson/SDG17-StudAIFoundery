'use client';

/**
 * The mark: two thin rings interlocking, with their shared overlap picked out
 * in the SDG accent. It is the oldest, plainest visual idea for partnership —
 * two independent parties and the ground they hold in common — drawn in a
 * single hairline weight so it reads as a wordmark's companion rather than an
 * app-store icon.
 *
 * Deliberately no rounded-square container plate: that device is what made the
 * previous mark read as generic product chrome. Two open rings on the page
 * are quieter, scale down to a favicon without turning to mud, and stay
 * legible in one colour if it ever has to print.
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
        {/* The lens where the two rings overlap — the "shared ground". */}
        <clipPath id="logo-lens">
          <circle cx="15.4" cy="20" r="9.4" />
        </clipPath>
      </defs>

      <circle cx="24.6" cy="20" r="9.4" fill="#43d6f2" fillOpacity="0.18" clipPath="url(#logo-lens)" />

      <g className="logo-mark__glyph" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="15.4" cy="20" r="9.4" stroke="#dff9ff" />
        <circle cx="24.6" cy="20" r="9.4" stroke="#43d6f2" />
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
