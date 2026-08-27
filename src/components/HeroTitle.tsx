'use client';

import { useEffect, useState } from 'react';

const TITLE = 'Global challenges require global partnerships.';

export function HeroTitle() {
  const [visible, setVisible] = useState('');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(TITLE); return; }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(TITLE.slice(0, index));
      if (index === TITLE.length) window.clearInterval(timer);
    }, 34);
    return () => window.clearInterval(timer);
  }, []);

  return <h1 aria-label={TITLE} className="hero-title max-w-[19ch] text-5xl font-medium leading-[1.02] tracking-[-0.045em] text-text sm:text-7xl">
    <span aria-hidden="true">{visible}<i className={visible.length < TITLE.length ? 'hero-cursor' : 'hero-cursor hero-cursor--done'} /></span>
  </h1>;
}
