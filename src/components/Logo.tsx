'use client';

/**
 * The Foundery Mark: two open forms lock into a third shared centre. It is a
 * compact original symbol for independent partners making something together.
 * The mark holds up at favicon size and has no reliance on stock SDG imagery.
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
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill="#07151d" stroke="#43d6f2" strokeOpacity="0.6" />
      <g
        className="logo-mark__glyph"
        stroke="#dff9ff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 13.5 L15.4 9.5 L21.8 13.5 L21.8 20.8 L15.4 24.7 L9 20.8 Z" />
        <path d="M18.2 19.2 L24.6 15.3 L31 19.2 L31 26.5 L24.6 30.5 L18.2 26.5 Z" />
        <path d="M18.2 20 L21.8 20" stroke="#43d6f2" />
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
