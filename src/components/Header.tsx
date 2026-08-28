'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';

const LINKS = [
  { href: '#map', label: 'Map' },
  { href: '#finance', label: 'Finance' },
  { href: '#trade', label: 'Trade' },
  { href: '#capacity', label: 'Capacity' },
  { href: '#builder', label: 'Build' },
  { href: '#action', label: 'Take action' }
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setSignedIn(Boolean(d.user))).catch(() => {});
  }, []);

  // The divider only appears once the page has moved. At rest the header
  // sits on the hero with nothing separating it; a permanent line there
  // reads as chrome bolted on top of the design.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-[90] backdrop-blur-md transition-colors duration-300 ${
        scrolled ? 'border-b border-line bg-bg/85' : 'border-b border-transparent bg-bg/60'
      }`}
    >
      <div className="mx-auto flex h-16 w-[min(100%-2.5rem,72rem)] items-center gap-4">
        {/* The Error404 credit belongs in the footer, not repeated in the
            masthead — two lines of type in a 4rem bar crowds the wordmark. */}
        <a href="#top" className="tap mr-auto">
          <Logo />
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label="Toggle navigation menu"
          className="tap grid h-11 w-11 place-items-center rounded-lg border border-line sm:hidden"
        >
          {/* Bars morph into an X rather than swapping icons, so the control
              reads as one thing changing state. */}
          <span className="grid gap-1">
            <span className={`block h-0.5 w-4 bg-text transition-transform duration-200 ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
            <span className={`block h-0.5 w-4 bg-text transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-4 bg-text transition-transform duration-200 ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
          </span>
        </button>

        <nav
          id="primary-nav"
          className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-16 z-[95] flex-col gap-1 border-b border-line p-4 shadow-2xl sm:static sm:z-auto sm:flex sm:flex-row sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
          style={open ? { backgroundColor: '#000000' } : undefined}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="tap rounded-lg px-3 py-2 text-sm font-medium text-text-2 hover:bg-white/8 hover:text-text"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/support"
            onClick={() => setOpen(false)}
            className="tap rounded-lg px-3 py-2 text-sm font-medium text-text-2 hover:bg-white/8 hover:text-text"
          >
            Report issue
          </Link>
          {signedIn && (
            <Link
              href="/connect"
              onClick={() => setOpen(false)}
              className="tap rounded-lg px-3 py-2 text-sm font-medium text-text-2 hover:bg-white/8 hover:text-text"
            >
              Connect
            </Link>
          )}
          <Link
            href={signedIn ? '/dashboard' : '/auth'}
            onClick={() => setOpen(false)}
            className="tap ml-1 rounded-lg border border-line-strong px-3.5 py-2 text-sm font-semibold text-text hover:bg-white/10"
          >
            {signedIn ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
