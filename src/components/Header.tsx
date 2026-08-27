'use client';

import { useState } from 'react';
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

  return (
    <header className="sticky top-0 z-[90] border-b border-transparent bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-[min(100%-2.5rem,72rem)] items-center gap-4">
        <a href="#top" className="mr-auto">
          <Logo withCaption />
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label="Toggle navigation menu"
          className="grid h-11 w-11 place-items-center rounded-lg border border-line sm:hidden"
        >
          <span className="grid gap-1">
            <span className="block h-0.5 w-4 bg-text" />
            <span className="block h-0.5 w-4 bg-text" />
            <span className="block h-0.5 w-4 bg-text" />
          </span>
        </button>

        <nav
          id="primary-nav"
          className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-16 z-[95] flex-col gap-1 border-b border-line p-4 shadow-2xl sm:static sm:z-auto sm:flex sm:flex-row sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
          style={open ? { backgroundColor: '#051524' } : undefined}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-text-2 transition hover:bg-white/10 hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
