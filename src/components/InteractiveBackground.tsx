'use client';

import { useEffect, useRef } from 'react';

/**
 * A page-wide, cursor-reactive particle network on true OLED black. Fixed
 * behind everything (pointer-events: none, so it never intercepts a click),
 * it reads as ambient texture rather than decoration competing with content
 * — particle and line opacity are kept low on purpose.
 *
 * Interaction model: particles drift on their own slow velocities; the
 * cursor acts as an extra node that gently pushes nearby particles away and
 * draws a brighter line to them, so moving the mouse visibly disturbs the
 * field. Nearby particles also link to each other at low opacity, giving
 * the whole thing a constellation/network feel — a deliberate echo of the
 * "partnership" theme rather than generic noise.
 */
export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    interface Particle {
      x: number; y: number; vx: number; vy: number; r: number; color: readonly [number, number, number];
    }

    const PALETTE = [
      [82, 205, 255],
      [139, 130, 246],
      [57, 220, 185],
      [244, 139, 190]
    ] as const;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = width + 'px';
      canvas!.style.height = height + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(28, Math.min(90, Math.round((width * height) / 22000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.4 + 0.6,
        color: PALETTE[index % PALETTE.length]!
      }));
    }

    const LINK_DIST = 130;
    const POINTER_DIST = 160;

    function step() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width; else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; else if (p.y > height) p.y = 0;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < POINTER_DIST && dist > 0.01) {
            const force = (1 - dist / POINTER_DIST) * 0.6;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }
      }

      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i]!, b = particles[j]!;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DIST) {
            const strength = 1 - dist / LINK_DIST;
            const gradient = ctx!.createLinearGradient(a.x, a.y, b.x, b.y);
            gradient.addColorStop(0, `rgba(${a.color.join(',')},${0.22 * strength})`);
            gradient.addColorStop(1, `rgba(${b.color.join(',')},${0.22 * strength})`);
            ctx!.strokeStyle = gradient;
            ctx!.shadowBlur = 7 * strength;
            ctx!.shadowColor = `rgba(${a.color.join(',')},${0.28 * strength})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
        if (pointer.active) {
          const dx = particles[i]!.x - pointer.x;
          const dy = particles[i]!.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < POINTER_DIST) {
            const strength = 1 - dist / POINTER_DIST;
            const [r, g, b] = particles[i]!.color;
            ctx!.strokeStyle = `rgba(${r},${g},${b},${0.42 * strength})`;
            ctx!.shadowBlur = 12 * strength;
            ctx!.shadowColor = `rgba(${r},${g},${b},${0.5 * strength})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i]!.x, particles[i]!.y);
            ctx!.lineTo(pointer.x, pointer.y);
            ctx!.stroke();
          }
        }
      }

      for (const p of particles) {
        const [r, g, b] = p.color;
        ctx!.fillStyle = `rgba(${r},${g},${b},0.82)`;
        ctx!.shadowBlur = 8;
        ctx!.shadowColor = `rgba(${r},${g},${b},0.5)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;

      if (!reduceMotion) raf = requestAnimationFrame(step);
    }

    function onMove(ev: PointerEvent) {
      pointer.x = ev.clientX;
      pointer.y = ev.clientY;
      pointer.active = true;
    }
    function onLeave() {
      pointer.active = false;
    }

    resize();
    step();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
